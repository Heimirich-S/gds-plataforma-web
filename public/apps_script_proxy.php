<?php
/* ============================================================
   GDS Web v3 — Proxy para Google Apps Script
   
   El frontend no puede leer la respuesta del Apps Script con
   mode:'no-cors'. Este proxy PHP hace la llamada server-side,
   captura los links de Drive que devuelve el script, y los
   guarda en MySQL.
   
   Flujo:
   Frontend → apps_script_proxy.php → Apps Script → Drive
                        ↓
                   MySQL (con links de Drive)
                        ↓
               Respuesta JSON al frontend
   ============================================================ */

require_once dirname(__DIR__) . '/app/config/config.php';

/* ── CORS ── */
header('Access-Control-Allow-Origin: ' . (ALLOWED_ORIGIN === '*' ? '*' : ALLOWED_ORIGIN));
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['ok'=>false,'error'=>'Solo POST']));
}

if (isset($_SERVER['CONTENT_LENGTH']) && (int)$_SERVER['CONTENT_LENGTH'] > PROXY_MAX_REQUEST_BYTES) {
    http_response_code(413);
    die(json_encode(['ok'=>false,'error'=>'Solicitud demasiado grande']));
}

function proxyFail(string $message, int $status = 400): void {
    http_response_code($status);
    echo json_encode(['ok'=>false,'error'=>$message], JSON_UNESCAPED_UNICODE);
    exit;
}

function validateProxyFields($value, string $key = ''): void {
    if (is_string($value) && $key !== 'base64' && strlen($value) > 10000) {
        proxyFail('Campo demasiado largo');
    }
    if (is_array($value)) {
        foreach ($value as $childKey => $childValue) {
            validateProxyFields($childValue, (string)$childKey);
        }
    }
}

function validateProxyFile(array $file, string $field): void {
    $base64 = $file['base64'] ?? '';
    $name = (string)($file['name'] ?? '');
    $type = strtolower((string)($file['type'] ?? ''));
    $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));

    if ($base64 === '' || !is_string($base64)) proxyFail("Archivo invalido: $field");
    if (!in_array($type, PROXY_ALLOWED_MIME_TYPES, true)) proxyFail("Tipo de archivo no permitido: $field");
    if (!in_array($extension, PROXY_ALLOWED_EXTENSIONS, true)) proxyFail("Extension no permitida: $field");

    $decoded = base64_decode($base64, true);
    if ($decoded === false) proxyFail("Contenido de archivo invalido: $field");
    if (strlen($decoded) > PROXY_MAX_FILE_BYTES) proxyFail("Archivo demasiado grande: $field");
    if (isset($file['size']) && (!is_numeric($file['size']) || (int)$file['size'] > PROXY_MAX_FILE_BYTES)) {
        proxyFail("Tamano de archivo no permitido: $field");
    }

    if (class_exists('finfo')) {
        $detectedType = (new finfo(FILEINFO_MIME_TYPE))->buffer($decoded);
        if (!in_array($detectedType, PROXY_ALLOWED_MIME_TYPES, true)) {
            proxyFail("Contenido de archivo no permitido: $field");
        }
    }
}

/* ══════════════════════════════════════════════════════════════
   BLINDAJE: nunca dejar que este script muera devolviendo HTML
   (errores de PHP, "PHP Fatal error", 500 sin cuerpo, etc.).
   Si eso pasa, el fetch() del navegador falla al parsear JSON y
   el usuario ve "Error de conexión" aunque el registro sí haya
   llegado a Apps Script / Sheets del otro lado.
   ══════════════════════════════════════════════════════════════ */
ini_set('display_errors', '0');   // nunca imprimir warnings/notices como HTML
ini_set('log_errors', '1');
error_reporting(E_ALL);

/* Damos más tiempo del que da por defecto la mayoría de hostings (30s),
   porque subir 1-3 PDFs a Drive a través de Apps Script puede tardar.
   Nota: algunos hostings compartidos IGNORAN esto y matan el proceso
   igual a los 30s pase lo que pase (limitación a nivel de servidor,
   no de PHP) — si el timeout persiste después de este cambio, hay
   que pedirle al proveedor de hosting que suba el límite, o hacer
   el envío de archivos de forma asíncrona.*/
set_time_limit(150);

register_shutdown_function(function () {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        // Si ya se envió una respuesta JSON antes de este error fatal, no dupliquemos salida
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(500);
        }
        error_log('GDS proxy fatal error: ' . $error['message'] . ' in ' . $error['file'] . ':' . $error['line']);
        echo json_encode([
            'ok'    => false,
            'error' => 'Error interno del servidor al procesar la solicitud',
        ]);
    }
});

/* ── Apps Script URL ── */
$APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx6Nlco9xnq4FftEkNfn3RRgw1VEueai_C4oko-x1Ijll1v-n40pochL2E8rJkpsMeL/exec';

$raw = file_get_contents('php://input');
try {
    $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
} catch (JsonException $e) {
    proxyFail('JSON invalido');
}
if (!is_array($data)) proxyFail('JSON invalido');

validateProxyFields($data);
$formType = $data['formType'] ?? 'inscripcion';
if (!in_array($formType, ['inscripcion', 'colaborador'], true)) proxyFail('formType no reconocido');

$fileCount = 0;
foreach ($data as $field => $value) {
    if (is_array($value) && substr((string)$field, 0, 4) === 'doc_' && array_key_exists('base64', $value)) {
        $fileCount++;
        if ($fileCount > PROXY_MAX_FILES) proxyFail('Cantidad de archivos no permitida');
        validateProxyFile($value, (string)$field);
    }
}


/* ══════════════════════════════════════════════════════════════
   PASO 1: Llamar al Apps Script server-side (con cURL)
   Esto permite leer la respuesta y obtener los links de Drive
   ══════════════════════════════════════════════════════════════ */
$ch = curl_init($APPS_SCRIPT_URL);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $raw,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,   // Apps Script redirige
    CURLOPT_MAXREDIRS      => 5,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_TIMEOUT        => 140,    // subido de 60s: PDFs grandes + Drive pueden tardar más
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response    = curl_exec($ch);
$http_code   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error  = curl_error($ch);
curl_close($ch);

if ($curl_error) {
    /* Si hay error de red/timeout hacia Apps Script, igual intentamos
       guardar en MySQL sin links de Drive (mejor guardar los datos del
       formulario sin adjuntos, que perderlos por completo). OJO: si
       fue timeout, es probable que Apps Script S͍ termine guardando en
       el Sheet del lado de Google aunque nosotros ya no obtuvimos su
       respuesta a tiempo. */
    error_log("GDS proxy cURL error: $curl_error (http_code=$http_code)");
    $gs_data = ['ok' => false, 'error' => $curl_error];
} else {
    $gs_data = json_decode($response, true);
    if ($gs_data === null) {
        // La respuesta no fue JSON válido: la registramos para poder diagnosticar
        error_log('GDS proxy: respuesta no-JSON de Apps Script (http_code=' . $http_code . '): ' . substr($response, 0, 500));
        $gs_data = ['ok' => false, 'raw' => substr($response, 0, 500)];
    }
}

/* ══════════════════════════════════════════════════════════════
   PASO 2: Extraer los links de Drive de la respuesta del script
   El Apps Script devuelve los links en el objeto data con
   las claves: doc_observador_link, doc_boletin_link, etc.
   ══════════════════════════════════════════════════════════════ */
$links = [];
if (!empty($gs_data['data'])) {
    $links = $gs_data['data'];
} elseif (!empty($gs_data['links'])) {
    $links = $gs_data['links'];
}

/* ══════════════════════════════════════════════════════════════
   PASO 3: Guardar en MySQL
   ══════════════════════════════════════════════════════════════ */
try {
    $db = getDB();

    if ($formType === 'inscripcion') {
        /* Quitar los campos de base64 antes de guardar en MySQL */
        $campos_excluir = ['doc_documentacion','doc_observador','doc_boletin','formType','timestamp'];
        $d = array_diff_key($data, array_flip($campos_excluir));

        /* Buscar grado_id */
        $grado_id = null;
        if (!empty($d['grado'])) {
            $sg = $db->prepare("SELECT id FROM grados WHERE nombre=?");
            $sg->execute([$d['grado']]);
            $gr = $sg->fetch();
            if ($gr) $grado_id = $gr['id'];
        }

        $stmt = $db->prepare("
            INSERT INTO inscripciones
              (nombres,apellidos,tipo_doc,num_doc,fecha_nac,lugar_nac,genero,
               grado_id,grado_texto,ano_lectivo,inst_anterior,ciudad_anterior,
               acudiente_nombre,parentesco,tel_principal,tel_alt,email,
               ocupacion,direccion,referido,observaciones,
               doc_observador_url,doc_boletin_url,doc_documentacion_url)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ");

        $s = fn($k) => htmlspecialchars(strip_tags(trim($d[$k] ?? '')), ENT_QUOTES, 'UTF-8');

        $stmt->execute([
            $s('nombres'), $s('apellidos'), $s('tipo_doc'), $s('num_doc'),
            !empty($d['fecha_nac']) ? $d['fecha_nac'] : null,
            $s('lugar_nac'), $s('genero'),
            $grado_id, $s('grado'), (int)($d['ano_lectivo'] ?? 2026),
            $s('inst_anterior'), $s('ciudad_anterior'),
            $s('acudiente_nombre'), $s('parentesco'),
            $s('tel_principal'), $s('tel_alt'), $s('email'),
            $s('ocupacion'), $s('direccion'), $s('referido'), $s('observaciones'),
            /* Links de Drive de la respuesta del Apps Script */
            $links['doc_observador_link']    ?? null,
            $links['doc_boletin_link']       ?? null,
            $links['doc_documentacion_link'] ?? null,
        ]);

        $mysql_id = $db->lastInsertId();
        echo json_encode([
            'ok'           => true,
            'mysql_id'     => $mysql_id,
            'gs_ok'        => !empty($gs_data['ok']),
            'drive_links'  => [
                'observador'    => $links['doc_observador_link'] ?? null,
                'boletin'       => $links['doc_boletin_link'] ?? null,
                'documentacion' => $links['doc_documentacion_link'] ?? null,
            ],
            'msg' => 'Inscripcion guardada correctamente'
        ], JSON_UNESCAPED_UNICODE);

    } elseif ($formType === 'colaborador') {
        $d = array_diff_key($data, array_flip(['doc_hoja_vida','formType','timestamp']));

        $s = fn($k) => htmlspecialchars(strip_tags(trim($d[$k] ?? '')), ENT_QUOTES, 'UTF-8');

        $stmt = $db->prepare("
            INSERT INTO colaboradores
              (nombre_completo,tipo_doc,num_doc,telefono,email,area_interes,mensaje,hoja_vida_url)
            VALUES (?,?,?,?,?,?,?,?)
        ");
        $stmt->execute([
            $s('nombre_completo'),
            $s('col_tipo_doc'),
            $s('col_num_doc'),
            $s('col_telefono'),
            $s('col_email'),
            $s('col_area'),
            $s('col_mensaje'),
            $links['doc_hoja_vida_link'] ?? null,
        ]);

        $mysql_id = $db->lastInsertId();
        echo json_encode([
            'ok'          => true,
            'mysql_id'    => $mysql_id,
            'gs_ok'       => !empty($gs_data['ok']),
            'drive_link'  => $links['doc_hoja_vida_link'] ?? null,
            'msg'         => 'Postulacion guardada correctamente'
        ], JSON_UNESCAPED_UNICODE);

    } else {
        http_response_code(400);
        echo json_encode(['ok'=>false,'error'=>'formType no reconocido']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    $msg = DEBUG_MODE ? $e->getMessage() : 'Error al guardar en base de datos';
    error_log('GDS proxy PDOException: ' . $e->getMessage());
    echo json_encode(['ok'=>false,'error'=>$msg, 'gs_ok'=>!empty($gs_data['ok'])]);
} catch (Throwable $e) {
    /* Red de seguridad final: cualquier otro error inesperado (no solo
       PDOException) también debe devolver JSON válido, nunca un 500
       en blanco o HTML — eso es lo que rompe el fetch() del navegador. */
    http_response_code(500);
    $msg = DEBUG_MODE ? $e->getMessage() : 'Error inesperado al procesar la solicitud';
    error_log('GDS proxy Throwable: ' . $e->getMessage());
    echo json_encode(['ok'=>false,'error'=>$msg, 'gs_ok'=>!empty($gs_data['ok'])]);
}
