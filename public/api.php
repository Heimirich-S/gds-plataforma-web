<?php
/* ============================================================
   GDS Web v3 — API Backend Central
   Funciona tanto en XAMPP (local) como en hosting cPanel.
   config.php detecta automáticamente el entorno.
   ============================================================ */

require_once dirname(__DIR__) . '/app/config/config.php';

/* ── Sesión administrativa ── */
if (session_status() === PHP_SESSION_NONE) {
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

/* Token CSRF asociado a la sesión */
if (empty($_SESSION['gds_csrf'])) {
    $_SESSION['gds_csrf'] = bin2hex(random_bytes(32));
}

/* Expiración por inactividad (30 min) */
if (!empty($_SESSION['gds_admin'])) {
    $now = time();
    if (!empty($_SESSION['gds_last_activity']) && ($now - $_SESSION['gds_last_activity']) > 1800) {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();
        session_start();
        if (empty($_SESSION['gds_csrf'])) $_SESSION['gds_csrf'] = bin2hex(random_bytes(32));
    } else {
        $_SESSION['gds_last_activity'] = $now;
    }
}

/* ── CORS ── */
if (ALLOWED_ORIGIN === '*') {
    header('Access-Control-Allow-Origin: *');
} else {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    header('Access-Control-Allow-Origin: ' . (($origin === ALLOWED_ORIGIN) ? $origin : ALLOWED_ORIGIN));
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Token');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

/* ── Helpers ── */
function ok($data = null, string $msg = ''): void {
    echo json_encode(['ok' => true, 'data' => $data, 'msg' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}
function err(string $msg, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}
function requireAdmin(): void {
    if (!ADMIN_ENABLED) err('Panel administrativo no disponible', 403);
    if (empty($_SESSION['gds_admin']) || $_SESSION['gds_admin'] !== true) err('No autorizado', 401);
}
function requireCsrf(): void {
    $provided = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if ($provided === '' || empty($_SESSION['gds_csrf']) || !hash_equals($_SESSION['gds_csrf'], $provided)) {
        err('Token CSRF inválido o ausente', 403);
    }
}
function body(): array {
    static $b = null;
    if ($b !== null) return $b;
    $raw = file_get_contents('php://input');
    $b = json_decode($raw, true) ?? [];
    return $b;
}
function s(string $v): string {
    return htmlspecialchars(strip_tags(trim($v)), ENT_QUOTES, 'UTF-8');
}

/* ── Audit log: registra acciones del admin en config_sistema ── */
function gds_audit(string $action, string $details = ''): void {
    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT valor FROM config_sistema WHERE clave='audit_log' LIMIT 1");
        $stmt->execute();
        $row = $stmt->fetch();
        $logs = [];
        if ($row && !empty($row['valor'])) {
            $logs = json_decode($row['valor'], true) ?: [];
        }
        $logs[] = [
            'ts'      => date('Y-m-d H:i:s'),
            'user'    => $_SESSION['gds_admin_user'] ?? 'admin',
            'action'  => $action,
            'details' => $details,
            'ip'      => $_SERVER['REMOTE_ADDR'] ?? '-',
        ];
        // Mantener solo los últimos 200 registros
        if (count($logs) > 200) {
            $logs = array_slice($logs, -200);
        }
        $json = json_encode($logs, JSON_UNESCAPED_UNICODE);
        $stmt2 = $db->prepare("
            INSERT INTO config_sistema (clave, valor, descripcion, es_privado)
            VALUES ('audit_log', ?, 'Log de auditoría de acciones administrativas', 1)
            ON DUPLICATE KEY UPDATE valor=VALUES(valor), actualizado_en=CURRENT_TIMESTAMP
        ");
        $stmt2->execute([$json]);
    } catch (Exception $e) {
        error_log('GDS audit error: ' . $e->getMessage());
    }
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? (body()['action'] ?? '');
if (!$action) err('Accion requerida');

/* Guardián central para acciones administrativas */
$adminAuthActions = ['admin_login', 'admin_logout', 'admin_session', 'admin_verify_otp', 'admin_resend_otp'];
if (str_starts_with((string)$action, 'admin_') && !in_array($action, $adminAuthActions, true)) {
    if (!ADMIN_ENABLED) {
        error_log('GDS admin: accion bloqueada (panel deshabilitado): ' . $action . ' desde ' . ($_SERVER['REMOTE_ADDR'] ?? '-'));
        err('Panel administrativo no disponible', 403);
    }
    requireAdmin();
    if ($method === 'POST') {
        requireCsrf();
    }
}
/* CSRF para admin_logout (POST) */
if ($action === 'admin_logout' && $method === 'POST') {
    requireAdmin();
    requireCsrf();
}

$db = getDB();

/* ================================================================
   GET — lectura pública
   ================================================================ */
if ($method === 'GET') {
    switch ($action) {

    case 'ping':
        ok(['status' => 'ok', 'env' => DEBUG_MODE ? 'local' : 'produccion', 'admin_habilitado' => ADMIN_ENABLED]);

    case 'costos':
        $stmt = $db->prepare("SELECT valor FROM config_sistema WHERE clave='costos_inscripcion' LIMIT 1");
        $stmt->execute();
        $row = $stmt->fetch();
        $costos = [];
        if ($row && !empty($row['valor'])) {
            $costos = json_decode($row['valor'], true) ?: [];
        }
        ok($costos);

    case 'admin_session':
        $otpPending = !empty($_SESSION['gds_preauth']) && $_SESSION['gds_preauth'] === true;
        // Expirar pre-auth si vencio
        if ($otpPending && !empty($_SESSION['gds_otp_expiry']) && time() > $_SESSION['gds_otp_expiry']) {
            unset($_SESSION['gds_preauth'], $_SESSION['gds_preauth_user'], $_SESSION['gds_otp_hash'], $_SESSION['gds_otp_expiry'], $_SESSION['gds_otp_attempts'], $_SESSION['gds_otp_resends'], $_SESSION['gds_otp_last_send'], $_SESSION['gds_otp_blocked_until']);
            $otpPending = false;
        }
        ok(['authenticated' => !empty($_SESSION['gds_admin']) && $_SESSION['gds_admin'] === true, 'otp_pending' => $otpPending, 'csrf_token' => $_SESSION['gds_csrf'] ?? '']);

    case 'noticias':
        $stmt = $db->prepare("
            SELECT n.id, c.nombre AS cat, n.featured, n.titulo,
                   n.extracto, n.img, n.fecha, n.cuerpo, n.creado_en
            FROM noticias n
            JOIN categorias_noticia c ON c.id = n.categoria_id
            WHERE n.publicado = 1
            ORDER BY n.featured DESC, n.creado_en DESC
        ");
        $stmt->execute();
        ok($stmt->fetchAll());

    case 'noticia':
        $id = s($_GET['id'] ?? '');
        if (!$id) err('ID requerido');
        $stmt = $db->prepare("
            SELECT n.*, c.nombre AS cat
            FROM noticias n
            JOIN categorias_noticia c ON c.id = n.categoria_id
            WHERE n.id = ? AND n.publicado = 1
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) err('Noticia no encontrada', 404);
        ok($row);

    case 'convenios':
        $stmt = $db->query("SELECT id, nombre, url, img FROM convenios WHERE activo=1 ORDER BY orden");
        ok($stmt->fetchAll());

    case 'popup_slides':
        $stmt = $db->query("SELECT id, img, titulo, subtitulo, tipo_accion AS tipoAccion,
                                   accion_url AS accionUrl, es_pdf AS isPdf
                            FROM popup_slides WHERE activo=1 ORDER BY orden");
        ok($stmt->fetchAll());

    case 'organigrama':
        $stmt = $db->query("SELECT id, tipo, nombre, cargo, rol, nivel_docente, foto, orden
                            FROM personal WHERE activo=1 ORDER BY tipo, orden");
        $rows = $stmt->fetchAll();
        $r = ['directivos'=>[],'docentes_directivos'=>[],'administrativos'=>[],'docentes'=>[]];
        foreach ($rows as $p) {
            $key = $p['tipo'] === 'docente_directivo' ? 'docentes_directivos' : $p['tipo'];
            $r[$key][] = $p;
        }
        ok($r);

    case 'horario':
        $curso = s($_GET['curso'] ?? '');
        $ano   = (int)($_GET['ano'] ?? 2026);
        if (!$curso) err('curso requerido');
        $stmt = $db->prepare("
            SELECT hc.id, hc.hora_inicio_min, hc.hora_fin_min, hc.granularidad_min
            FROM horario_config hc
            JOIN cursos cu ON cu.id = hc.curso_id
            WHERE cu.nombre = ? AND hc.ano_lectivo = ?
        ");
        $stmt->execute([$curso, $ano]);
        $config = $stmt->fetch();
        if (!$config) { ok(['config'=>null,'celdas'=>[],'festivos'=>[]]); }
        $stmt2 = $db->prepare("
            SELECT cel.dia, cel.franja_idx, cel.es_descanso, cel.nombre_descanso,
                   m.nombre AS materia,
                   p.nombre AS docente, p.id AS docente_id,
                   ps.nombre AS docente_suplente
            FROM horario_celdas cel
            LEFT JOIN materias m  ON m.id  = cel.materia_id
            LEFT JOIN personal p  ON p.id  = cel.docente_id
            LEFT JOIN personal ps ON ps.id = cel.docente_suplente_id
            WHERE cel.horario_config_id = ?
            ORDER BY cel.dia, cel.franja_idx
        ");
        $stmt2->execute([$config['id']]);
        $stmt3 = $db->prepare("SELECT fecha, descripcion FROM horario_festivos WHERE horario_config_id=?");
        $stmt3->execute([$config['id']]);
        ok(['config'=>$config, 'celdas'=>$stmt2->fetchAll(), 'festivos'=>$stmt3->fetchAll()]);

    case 'servicios':
        $stmt = $db->query("SELECT id, titulo, tag, icono, img_card, descripcion_corta, chips, cuerpo_html, es_destacado, orden
                            FROM servicios WHERE activo=1 ORDER BY es_destacado DESC, orden");
        ok($stmt->fetchAll());

    case 'servicio':
        $id = s($_GET['id'] ?? '');
        if (!$id) err('ID requerido');
        $stmt = $db->prepare("SELECT * FROM servicios WHERE id=? AND activo=1");
        $stmt->execute([$id]);
        $srv = $stmt->fetch();
        if (!$srv) err('Servicio no encontrado', 404);
        $stmt2 = $db->prepare("SELECT label, subtitulo, url FROM servicios_videos WHERE servicio_id=? ORDER BY orden");
        $stmt2->execute([$id]);
        $srv['videos'] = $stmt2->fetchAll();
        if ($srv['chips']) $srv['chips'] = json_decode($srv['chips'], true);
        ok($srv);

    case 'utiles_todos':
        $ano = (int)($_GET['ano'] ?? 2026);
        $stmt = $db->prepare("
            SELECT g.id AS grado_id, g.nivel, g.nombre AS grado, g.slug,
                   u.item, u.cantidad, u.observacion, u.orden
            FROM utiles_escolares u
            JOIN grados g ON g.id = u.grado_id
            WHERE u.ano_lectivo=? AND u.activo=1
            ORDER BY g.id, u.orden
        ");
        $stmt->execute([$ano]);
        $rows = $stmt->fetchAll();
        $agrupado = [];
        foreach ($rows as $r) {
            $k = $r['grado_id'];
            if (!isset($agrupado[$k])) {
                $agrupado[$k] = [
                    'grado_id'=>$r['grado_id'],'nivel'=>$r['nivel'],
                    'grado'=>$r['grado'],'slug'=>$r['slug'],'items'=>[]
                ];
            }
            $agrupado[$k]['items'][] = [
                'item'=>$r['item'],'cantidad'=>$r['cantidad'],
                'observacion'=>$r['observacion'],'orden'=>$r['orden']
            ];
        }
        ok(array_values($agrupado));

    case 'utiles':
        $grado_id = (int)($_GET['grado_id'] ?? 0);
        $ano      = (int)($_GET['ano'] ?? 2026);
        if (!$grado_id) err('grado_id requerido');
        $stmt = $db->prepare("
            SELECT item, cantidad, precio, observacion, orden
            FROM utiles_escolares
            WHERE grado_id=? AND ano_lectivo=? AND activo=1 ORDER BY orden
        ");
        $stmt->execute([$grado_id, $ano]);
        ok($stmt->fetchAll());

    case 'descuentos':
        $stmt = $db->query("SELECT nombre, porcentaje, descripcion, clave_storage FROM descuentos WHERE activo=1 ORDER BY id");
        ok($stmt->fetchAll());

    case 'periodicos':
        $stmt = $db->query("SELECT id, nombre, anio, img, url FROM periodicos WHERE activo=1 ORDER BY anio DESC");
        ok($stmt->fetchAll());

    case 'documentos':
        $stmt = $db->query("SELECT id, nombre, descripcion, tipo, url, tamano_kb FROM documentos WHERE publicado=1 ORDER BY id");
        ok($stmt->fetchAll());

    case 'promociones':
        $stmt = $db->query("SELECT id, anio, nombre_grupo AS nombreGrupo, foto FROM promociones_grado11 ORDER BY anio DESC");
        ok($stmt->fetchAll());

    case 'grados':
        $stmt = $db->query("SELECT id, nivel, nombre, slug FROM grados ORDER BY id");
        ok($stmt->fetchAll());

    case 'config':
        $stmt = $db->query("SELECT clave, valor FROM config_sistema WHERE es_privado=0");
        $rows = $stmt->fetchAll();
        $cfg = [];
        foreach ($rows as $r) $cfg[$r['clave']] = $r['valor'];
        ok($cfg);

    /* ── Admin: listar inscripciones ── */
    case 'admin_inscripciones':
        requireAdmin();
        $estado = s($_GET['estado'] ?? '');
        $ano    = (int)($_GET['ano'] ?? 0);
        $sql = "SELECT i.id, i.nombres, i.apellidos, i.num_doc,
                       g.nombre AS grado, i.ano_lectivo,
                       i.acudiente_nombre, i.tel_principal, i.email,
                       i.estado, i.creado_en,
                       IF(i.doc_observador_url IS NOT NULL,1,0) AS tiene_observador,
                       IF(i.doc_boletin_url IS NOT NULL,1,0) AS tiene_boletin,
                       IF(i.doc_documentacion_url IS NOT NULL,1,0) AS tiene_documentacion
                FROM inscripciones i LEFT JOIN grados g ON g.id=i.grado_id WHERE 1=1";
        $p = [];
        if ($estado) { $sql .= " AND i.estado=?"; $p[] = $estado; }
        if ($ano)    { $sql .= " AND i.ano_lectivo=?"; $p[] = $ano; }
        $sql .= " ORDER BY i.creado_en DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($p);
        ok($stmt->fetchAll());

    /* ── Admin: listar colaboradores ── */
    case 'admin_colaboradores':
        requireAdmin();
        $estado = s($_GET['estado'] ?? '');
        $sql = "SELECT * FROM colaboradores WHERE 1=1";
        $p = [];
        if ($estado) { $sql .= " AND estado=?"; $p[] = $estado; }
        $sql .= " ORDER BY creado_en DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($p);
        ok($stmt->fetchAll());

    default:
        err('Accion GET no reconocida: ' . $action);
    }
}

/* ================================================================
   POST
   ================================================================ */
if ($method === 'POST') {
    $d = body();

    switch ($action) {

    /* ── Guardar Inscripción ──
       El frontend envía dos peticiones simultáneas:
       1) A Google Apps Script (sube PDFs a Drive, escribe en Sheets)
       2) A esta API (guarda copia en MySQL con los links de Drive)
       Los links de Drive llegan en doc_observador_url, doc_boletin_url,
       doc_documentacion_url (ya procesados por Apps Script).
       ── */
    case 'inscripcion':
        $req = ['nombres','apellidos','tipo_doc','num_doc','acudiente_nombre','tel_principal','email'];
        foreach ($req as $f) {
            if (empty($d[$f])) err("Campo requerido: $f");
        }
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
        $stmt->execute([
            s($d['nombres']??''),
            s($d['apellidos']??''),
            s($d['tipo_doc']??''),
            s($d['num_doc']??''),
            !empty($d['fecha_nac']) ? $d['fecha_nac'] : null,
            s($d['lugar_nac']??''),
            s($d['genero']??'otro'),
            $grado_id,
            s($d['grado']??''),
            (int)($d['ano_lectivo']??2026),
            s($d['inst_anterior']??''),
            s($d['ciudad_anterior']??''),
            s($d['acudiente_nombre']??''),
            s($d['parentesco']??'Otro'),
            s($d['tel_principal']??''),
            s($d['tel_alt']??''),
            s($d['email']??''),
            s($d['ocupacion']??''),
            s($d['direccion']??''),
            s($d['referido']??'otro'),
            s($d['observaciones']??''),
            /* Links de Drive (llegan como strings URL desde el frontend
               después de que Apps Script procesa los PDFs) */
            $d['doc_observador_url'] ?? null,
            $d['doc_boletin_url']    ?? null,
            $d['doc_documentacion_url'] ?? null,
        ]);
        ok(['id' => $db->lastInsertId()], 'Inscripcion guardada en MySQL');

    /* ── Guardar Colaborador ── */
    case 'colaborador':
        $req = ['nombre_completo','col_tipo_doc','col_num_doc','col_telefono','col_email','col_area'];
        foreach ($req as $f) {
            if (empty($d[$f])) err("Campo requerido: $f");
        }
        $stmt = $db->prepare("
            INSERT INTO colaboradores
              (nombre_completo,tipo_doc,num_doc,telefono,email,area_interes,mensaje,hoja_vida_url)
            VALUES (?,?,?,?,?,?,?,?)
        ");
        $stmt->execute([
            s($d['nombre_completo']??''),
            s($d['col_tipo_doc']??'CC'),
            s($d['col_num_doc']??''),
            s($d['col_telefono']??''),
            s($d['col_email']??''),
            s($d['col_area']??''),
            s($d['col_mensaje']??''),
            $d['hoja_vida_url'] ?? null,
        ]);
        ok(['id' => $db->lastInsertId()], 'Postulacion guardada en MySQL');

    /* ── ADMIN: Autenticación por sesión (paso 1: contraseña) ── */
    case 'admin_login':
        if (!ADMIN_ENABLED) err('Panel administrativo no disponible', 403);
        $user = (string)($d['user'] ?? '');
        $pass = (string)($d['pass'] ?? '');
        if ($user === '' || $pass === '') err('Credenciales requeridas', 400);
        if (ADMIN_USER === '' || ADMIN_PASSWORD_HASH === '') err('Autenticación no configurada', 503);
        if (!hash_equals(ADMIN_USER, $user) || !password_verify($pass, ADMIN_PASSWORD_HASH)) {
            err('Credenciales incorrectas', 401);
        }
        gds_audit('admin_login_step1', 'user=' . $user);
        // Limpiar cualquier pre-auth anterior
        unset($_SESSION['gds_preauth'], $_SESSION['gds_preauth_user'], $_SESSION['gds_otp_hash'], $_SESSION['gds_otp_expiry'], $_SESSION['gds_otp_attempts'], $_SESSION['gds_otp_resends'], $_SESSION['gds_otp_last_send'], $_SESSION['gds_otp_blocked_until']);
        // NO establecer gds_admin todavía
        session_regenerate_id(true);
        // Obtener correo del administrador desde config_sistema (solo lectura)
        $emailAdmin = '';
        try {
            $stmtE = $db->prepare("SELECT valor FROM config_sistema WHERE clave='admin_emails' LIMIT 1");
            $stmtE->execute();
            $rowE = $stmtE->fetch();
            if ($rowE && !empty($rowE['valor'])) {
                $parts = explode(',', $rowE['valor']);
                $emailAdmin = trim($parts[0]);
            }
        } catch (Exception $e) {
            $emailAdmin = '';
        }
        if ($emailAdmin === '' || !filter_var($emailAdmin, FILTER_VALIDATE_EMAIL)) {
            err('No se pudo determinar el correo del administrador', 500);
        }
        // Generar OTP criptográfico
        $otp = (string) random_int(100000, 999999);
        $_SESSION['gds_preauth'] = true;
        $_SESSION['gds_preauth_user'] = $user;
        $_SESSION['gds_otp_hash'] = password_hash($otp, PASSWORD_DEFAULT);
        $_SESSION['gds_otp_expiry'] = time() + 300;
        $_SESSION['gds_otp_attempts'] = 0;
        $_SESSION['gds_otp_resends'] = 1;
        $_SESSION['gds_otp_last_send'] = time();
        $_SESSION['gds_otp_blocked_until'] = 0;
        // Enviar correo mediante Mailer.php
        try {
            require_once dirname(__DIR__) . '/app/services/Mailer.php';
            $mailer = Mailer::fromConfig();
            if (!$mailer->isConfigured()) {
                throw new Exception('Mailer no configurado');
            }
            $html = '<p>Su codigo de verificacion es: <strong>' . $otp . '</strong></p><p>Valido por 5 minutos.</p>';
            $mailer->prepareMessage($emailAdmin, 'Codigo de verificacion GDS', $html);
            $mailer->send();
        } catch (Exception $e) {
            // Limpiar pre-auth si el correo falla
            unset($_SESSION['gds_preauth'], $_SESSION['gds_preauth_user'], $_SESSION['gds_otp_hash'], $_SESSION['gds_otp_expiry'], $_SESSION['gds_otp_attempts'], $_SESSION['gds_otp_resends'], $_SESSION['gds_otp_last_send'], $_SESSION['gds_otp_blocked_until']);
            error_log('GDS OTP mail error: ' . $e->getMessage());
            err('No se pudo enviar el codigo de verificacion', 500);
        }
        ok(['authenticated' => false, 'otp_required' => true], 'Codigo de verificacion enviado');

    /* ── ADMIN: Verificación OTP (paso 2) ── */
    case 'admin_verify_otp':
        if (!ADMIN_ENABLED) err('Panel administrativo no disponible', 403);
        requireCsrf();
        if (empty($_SESSION['gds_preauth']) || $_SESSION['gds_preauth'] !== true) {
            err('No hay pre-autenticacion pendiente', 401);
        }
        if (empty($_SESSION['gds_otp_expiry']) || time() > $_SESSION['gds_otp_expiry']) {
            unset($_SESSION['gds_preauth'], $_SESSION['gds_preauth_user'], $_SESSION['gds_otp_hash'], $_SESSION['gds_otp_expiry'], $_SESSION['gds_otp_attempts'], $_SESSION['gds_otp_resends'], $_SESSION['gds_otp_last_send'], $_SESSION['gds_otp_blocked_until']);
            err('El codigo ha expirado', 401);
        }
        if (!empty($_SESSION['gds_otp_blocked_until']) && time() < $_SESSION['gds_otp_blocked_until']) {
            err('Demasiados intentos. Intenta mas tarde', 429);
        }
        $code = (string)($d['code'] ?? '');
        if ($code === '' || strlen($code) !== 6) err('Codigo invalido', 400);
        if (empty($_SESSION['gds_otp_hash']) || !password_verify($code, $_SESSION['gds_otp_hash'])) {
            $_SESSION['gds_otp_attempts'] = ($_SESSION['gds_otp_attempts'] ?? 0) + 1;
            if ($_SESSION['gds_otp_attempts'] >= 5) {
                $_SESSION['gds_otp_blocked_until'] = time() + 600;
            }
            err('Codigo incorrecto', 401);
        }
        // OTP correcto: consumir y conceder sesión
        unset($_SESSION['gds_preauth'], $_SESSION['gds_preauth_user'], $_SESSION['gds_otp_hash'], $_SESSION['gds_otp_expiry'], $_SESSION['gds_otp_attempts'], $_SESSION['gds_otp_resends'], $_SESSION['gds_otp_last_send'], $_SESSION['gds_otp_blocked_until']);
        session_regenerate_id(true);
        $_SESSION['gds_admin'] = true;
        $_SESSION['gds_admin_user'] = $_SESSION['gds_admin_user'] ?? '';
        $_SESSION['gds_last_activity'] = time();
        gds_audit('admin_login_success', 'OTP verificado');
        ok(['authenticated' => true], 'Acceso concedido');

    /* ── ADMIN: Reenvío de OTP ── */
    case 'admin_resend_otp':
        if (!ADMIN_ENABLED) err('Panel administrativo no disponible', 403);
        requireCsrf();
        if (empty($_SESSION['gds_preauth']) || $_SESSION['gds_preauth'] !== true) {
            err('No hay pre-autenticacion pendiente', 401);
        }
        if (!empty($_SESSION['gds_otp_blocked_until']) && time() < $_SESSION['gds_otp_blocked_until']) {
            err('Demasiados intentos. Intenta mas tarde', 429);
        }
        $resends = $_SESSION['gds_otp_resends'] ?? 1;
        if ($resends >= 3) err('Maximo de reenvios alcanzado', 429);
        $lastSend = $_SESSION['gds_otp_last_send'] ?? 0;
        if (time() - $lastSend < 60) err('Espera antes de solicitar un nuevo codigo', 429);
        if (!empty($_SESSION['gds_otp_expiry']) && time() > $_SESSION['gds_otp_expiry']) {
            unset($_SESSION['gds_preauth'], $_SESSION['gds_preauth_user'], $_SESSION['gds_otp_hash'], $_SESSION['gds_otp_expiry'], $_SESSION['gds_otp_attempts'], $_SESSION['gds_otp_resends'], $_SESSION['gds_otp_last_send'], $_SESSION['gds_otp_blocked_until']);
            err('La pre-autenticacion ha expirado', 401);
        }
        // Obtener email
        $emailAdmin = '';
        try {
            $stmtE = $db->prepare("SELECT valor FROM config_sistema WHERE clave='admin_emails' LIMIT 1");
            $stmtE->execute();
            $rowE = $stmtE->fetch();
            if ($rowE && !empty($rowE['valor'])) {
                $parts = explode(',', $rowE['valor']);
                $emailAdmin = trim($parts[0]);
            }
        } catch (Exception $e) {
            $emailAdmin = '';
        }
        if ($emailAdmin === '' || !filter_var($emailAdmin, FILTER_VALIDATE_EMAIL)) {
            err('No se pudo determinar el correo del administrador', 500);
        }
        $otp = (string) random_int(100000, 999999);
        $_SESSION['gds_otp_hash'] = password_hash($otp, PASSWORD_DEFAULT);
        $_SESSION['gds_otp_expiry'] = time() + 300;
        $_SESSION['gds_otp_attempts'] = 0;
        $_SESSION['gds_otp_resends'] = $resends + 1;
        $_SESSION['gds_otp_last_send'] = time();
        try {
            require_once dirname(__DIR__) . '/app/services/Mailer.php';
            $mailer = Mailer::fromConfig();
            if (!$mailer->isConfigured()) throw new Exception('Mailer no configurado');
            $html = '<p>Su codigo de verificacion es: <strong>' . $otp . '</strong></p><p>Valido por 5 minutos.</p>';
            $mailer->prepareMessage($emailAdmin, 'Codigo de verificacion GDS', $html);
            $mailer->send();
        } catch (Exception $e) {
            error_log('GDS OTP resend mail error: ' . $e->getMessage());
            err('No se pudo enviar el codigo de verificacion', 500);
        }
        ok(['otp_required' => true], 'Codigo de verificacion reenviado');

    case 'admin_audit_log':
        requireAdmin();
        $stmt = $db->prepare("SELECT valor FROM config_sistema WHERE clave='audit_log' LIMIT 1");
        $stmt->execute();
        $row = $stmt->fetch();
        $logs = [];
        if ($row && !empty($row['valor'])) {
            $logs = json_decode($row['valor'], true) ?: [];
        }
        ok(array_reverse($logs), 'Log de auditoría');

    case 'admin_upload':
        requireAdmin();
        requireCsrf();
        $filename = s($d['filename'] ?? '');
        $data = $d['data'] ?? '';
        if ($filename === '' || $data === '') err('filename y data requeridos', 400);
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        if (!in_array($ext, PROXY_ALLOWED_EXTENSIONS)) {
            err('Extension no permitida: ' . $ext, 400);
        }
        $decoded = base64_decode($data, true);
        if ($decoded === false) err('Datos base64 invalidos', 400);
        if (strlen($decoded) > PROXY_MAX_FILE_BYTES) {
            err('Archivo demasiado grande (max ' . (PROXY_MAX_FILE_BYTES / 1024 / 1024) . 'MB)', 400);
        }
        $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($filename, PATHINFO_FILENAME));
        $uniqueName = $safeName . '_' . time() . '.' . $ext;
        $uploadDir = dirname(__DIR__) . '/public/img/uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        $filePath = $uploadDir . $uniqueName;
        if (file_put_contents($filePath, $decoded) === false) {
            err('Error al guardar archivo', 500);
        }
        gds_audit('file_upload', 'file=' . $uniqueName . ' size=' . strlen($decoded));
        ok(['url' => 'img/uploads/' . $uniqueName, 'filename' => $uniqueName], 'Archivo subido');

    case 'admin_logout':
        gds_audit('logout', 'Cierre de sesión');
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();
        ok(['authenticated' => false], 'Sesion cerrada');

    /* ── ADMIN: Noticias ── */
    case 'admin_noticias_save':
        requireAdmin();
        $id    = s($d['id']??'');
        $cat   = s($d['cat']??'');
        $titulo= s($d['titulo']??'');
        if (!$id || !$cat || !$titulo) err('id, cat y titulo son requeridos');
        $sc = $db->prepare("SELECT id FROM categorias_noticia WHERE nombre=?");
        $sc->execute([$cat]);
        $catRow = $sc->fetch();
        if (!$catRow) {
            $db->prepare("INSERT INTO categorias_noticia (nombre) VALUES (?)")->execute([$cat]);
            $cat_id = $db->lastInsertId();
        } else { $cat_id = $catRow['id']; }
        $stmt = $db->prepare("
            INSERT INTO noticias (id,categoria_id,featured,titulo,extracto,img,fecha,cuerpo,publicado)
            VALUES (?,?,?,?,?,?,?,?,1)
            ON DUPLICATE KEY UPDATE
              categoria_id=VALUES(categoria_id),featured=VALUES(featured),
              titulo=VALUES(titulo),extracto=VALUES(extracto),
              img=VALUES(img),fecha=VALUES(fecha),cuerpo=VALUES(cuerpo)
        ");
        $stmt->execute([$id,$cat_id,(int)($d['featured']??0),$titulo,
            $d['extracto']??'',$d['img']??'',s($d['fecha']??''),$d['cuerpo']??'']);
        gds_audit('noticia_save', 'id=' . ($d['id'] ?? 'new'));
        ok(null, 'Noticia guardada');

    case 'admin_noticias_delete':
        requireAdmin();
        $id = s($d['id']??'');
        if (!$id) err('id requerido');
        $db->prepare("DELETE FROM noticias WHERE id=?")->execute([$id]);
        gds_audit('noticia_delete', 'id=' . $id);
        ok(null, 'Noticia eliminada');

    /* ── ADMIN: Convenios ── */
    case 'admin_convenios_save':
        requireAdmin();
        $id = s($d['id']??'cv_'.time());
        $nombre = s($d['nombre']??'');
        if (!$nombre) err('nombre requerido');
        $stmt = $db->prepare("
            INSERT INTO convenios (id,nombre,url,img,orden,activo)
            VALUES (?,?,?,?,?,1)
            ON DUPLICATE KEY UPDATE
              nombre=VALUES(nombre),url=VALUES(url),img=VALUES(img),orden=VALUES(orden),activo=1
        ");
        $stmt->execute([$id,$nombre,$d['url']??'',$d['img']??'',(int)($d['orden']??0)]);
        gds_audit('convenio_save', 'id=' . ($d['id'] ?? 'new'));
        ok(null, 'Convenio guardado');

    case 'admin_convenios_delete':
        requireAdmin();
        $id = s($d['id']??'');
        if (!$id) err('id requerido');
        $db->prepare("UPDATE convenios SET activo=0 WHERE id=?")->execute([$id]);
        gds_audit('convenio_delete', 'id=' . $id);
        ok(null, 'Convenio eliminado');

    /* ── ADMIN: Organigrama ── */
    case 'admin_organigrama_save':
        requireAdmin();
        $id  = s($d['id']??'');
        $tipo= s($d['tipo']??'');
        $nom = s($d['nombre']??'');
        $car = s($d['cargo']??'');
        if (!$id||!$tipo||!$nom||!$car) err('id, tipo, nombre y cargo son requeridos');
        $stmt = $db->prepare("
            INSERT INTO personal (id,tipo,nombre,cargo,rol,nivel_docente,foto,orden,activo)
            VALUES (?,?,?,?,?,?,?,?,1)
            ON DUPLICATE KEY UPDATE
              tipo=VALUES(tipo),nombre=VALUES(nombre),cargo=VALUES(cargo),
              rol=VALUES(rol),nivel_docente=VALUES(nivel_docente),
              foto=VALUES(foto),orden=VALUES(orden),activo=1
        ");
        $stmt->execute([$id,$tipo,$nom,$car,s($d['rol']??''),s($d['nivel']??''),
            $d['foto']??'',(int)($d['orden']??0)]);
        gds_audit('personal_save', 'tipo=' . ($d['tipo'] ?? '') . ' id=' . ($d['id'] ?? 'new'));
        ok(null, 'Personal guardado');

    case 'admin_organigrama_delete':
        requireAdmin();
        $id = s($d['id']??'');
        if (!$id) err('id requerido');
        $db->prepare("UPDATE personal SET activo=0 WHERE id=?")->execute([$id]);
        gds_audit('personal_delete', 'id=' . $id);
        ok(null, 'Personal eliminado');

    /* ── ADMIN: Popup ── */
    case 'admin_popup_save':
        requireAdmin();
        $id = s($d['id']??'slide_'.time());
        $stmt = $db->prepare("
            INSERT INTO popup_slides (id,img,titulo,subtitulo,tipo_accion,accion_url,es_pdf,orden,activo)
            VALUES (?,?,?,?,?,?,?,?,1)
            ON DUPLICATE KEY UPDATE
              img=VALUES(img),titulo=VALUES(titulo),subtitulo=VALUES(subtitulo),
              tipo_accion=VALUES(tipo_accion),accion_url=VALUES(accion_url),
              es_pdf=VALUES(es_pdf),orden=VALUES(orden),activo=1
        ");
        $stmt->execute([$id,$d['img']??'',s($d['titulo']??''),s($d['subtitulo']??''),
            s($d['tipoAccion']??'none'),$d['accionUrl']??'',(int)($d['isPdf']??0),(int)($d['orden']??0)]);
        gds_audit('popup_save', 'id=' . ($d['id'] ?? 'new'));
        ok(null, 'Slide guardado');

    case 'admin_popup_delete':
        requireAdmin();
        $id = s($d['id']??'');
        if (!$id) err('id requerido');
        $db->prepare("UPDATE popup_slides SET activo=0 WHERE id=?")->execute([$id]);
        gds_audit('popup_delete', 'id=' . $id);
        ok(null, 'Slide eliminado');

    /* ── ADMIN: Horario — configurar curso ── */
    case 'admin_horario_save':
        requireAdmin();
        $curso = s($d['curso']??'');
        $ano   = (int)($d['ano']??2026);
        if (!$curso) err('curso requerido');
        $sc = $db->prepare("SELECT id FROM cursos WHERE nombre=?");
        $sc->execute([$curso]);
        $cRow = $sc->fetch();
        if (!$cRow) err("Curso '$curso' no encontrado");
        $stmt = $db->prepare("
            INSERT INTO horario_config (curso_id,ano_lectivo,hora_inicio_min,hora_fin_min,granularidad_min)
            VALUES (?,?,?,?,?)
            ON DUPLICATE KEY UPDATE
              hora_inicio_min=VALUES(hora_inicio_min),
              hora_fin_min=VALUES(hora_fin_min),
              granularidad_min=VALUES(granularidad_min)
        ");
        $stmt->execute([$cRow['id'],$ano,(int)($d['hora_inicio_min']??360),
            (int)($d['hora_fin_min']??795),(int)($d['granularidad_min']??60)]);
        gds_audit('horario_save', 'curso=' . ($d['curso'] ?? ''));
        ok(null, 'Horario configurado');

    /* ── ADMIN: Horario — guardar celda ── */
    case 'admin_horario_celda':
        requireAdmin();
        $curso  = s($d['curso']??'');
        $ano    = (int)($d['ano']??2026);
        $dia    = (int)($d['dia']??0);
        $franja = (int)($d['franja_idx']??0);
        if (!$curso) err('curso requerido');
        $sc = $db->prepare("
            SELECT hc.id, cu.nivel FROM horario_config hc
            JOIN cursos cu ON cu.id=hc.curso_id
            WHERE cu.nombre=? AND hc.ano_lectivo=?
        ");
        $sc->execute([$curso,$ano]);
        $hc = $sc->fetch();
        if (!$hc) err('Primero configura el horario del curso');
        $nivel_curso = $hc['nivel']; // 'primaria' o 'secundaria'
        $materia_id = null;
        if (!empty($d['materia'])) {
            // Buscar materia por nombre Y nivel para evitar confusión primaria/secundaria
            $sm = $db->prepare("SELECT m.id FROM materias m WHERE m.nombre=? AND (m.nivel=? OR m.nivel='ambos')");
            $sm->execute([$d['materia'], $nivel_curso]);
            $mr = $sm->fetch();
            if ($mr) $materia_id = $mr['id'];
        }
        $stmt = $db->prepare("
            INSERT INTO horario_celdas
              (horario_config_id,dia,franja_idx,materia_id,docente_id,
               docente_suplente_id,es_descanso,nombre_descanso)
            VALUES (?,?,?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE
              materia_id=VALUES(materia_id),docente_id=VALUES(docente_id),
              docente_suplente_id=VALUES(docente_suplente_id),
              es_descanso=VALUES(es_descanso),nombre_descanso=VALUES(nombre_descanso)
        ");
        $docente_id  = !empty($d['docente_id']) ? s($d['docente_id']) : null;
        $suplente_id = !empty($d['docente_suplente_id']) ? s($d['docente_suplente_id']) : null;
        $stmt->execute([$hc['id'],$dia,$franja,$materia_id,$docente_id,$suplente_id,
            (int)($d['es_descanso']??0),!empty($d['nombre_descanso'])?s($d['nombre_descanso']):null]);
        gds_audit('horario_celda', 'curso=' . ($d['curso'] ?? '') . ' dia=' . ($d['dia'] ?? ''));
        ok(null, 'Celda guardada');

    /* ── ADMIN: Utiles Escolares ── */
    case 'admin_utiles_save':
        requireAdmin();
        $grado_id = (int)($d['grado_id']??0);
        $ano      = (int)($d['ano']??2026);
        $items    = $d['items']??[];
        if (!$grado_id) err('grado_id requerido');
        if (!is_array($items)) err('items debe ser array');
        $db->beginTransaction();
        try {
            $db->prepare("DELETE FROM utiles_escolares WHERE grado_id=? AND ano_lectivo=?")
               ->execute([$grado_id,$ano]);
            $ins = $db->prepare("
                INSERT INTO utiles_escolares (grado_id,item,cantidad,observacion,orden,ano_lectivo)
                VALUES (?,?,?,?,?,?)
            ");
            foreach ($items as $i => $item) {
                $ins->execute([$grado_id,s($item['item']??''),s($item['cantidad']??'1'),
                    s($item['observacion']??''),$i,$ano]);
            }
            $db->commit();
        } catch (Exception $e) {
            $db->rollBack();
            err('Error al guardar utiles: ' . ($e->getMessage()));
        }
        gds_audit('utiles_save', 'grado_id=' . ($d['grado_id'] ?? ''));
        ok(null, 'Utiles guardados');

    /* ── ADMIN: Servicios ──
       Solo actualiza los campos que se envían explícitamente.
       Campos omitidos conservan su valor actual en la base de datos.
       Alias aceptados: img → img_card, cuerpo → cuerpo_html */
    case 'admin_servicio_save':
        requireAdmin();
        $id = s($d['id']??'');
        if (!$id) err('id requerido');

        $campos = [];
        $valores = [];

        // titulo
        if (array_key_exists('titulo', $d)) {
            $campos[] = 'titulo=?';
            $valores[] = s((string)$d['titulo']);
        }
        // tag
        if (array_key_exists('tag', $d)) {
            $campos[] = 'tag=?';
            $valores[] = s((string)$d['tag']);
        }
        // img → img_card (alias)
        if (array_key_exists('img_card', $d)) {
            $campos[] = 'img_card=?';
            $valores[] = (string)$d['img_card'];
        } elseif (array_key_exists('img', $d)) {
            $campos[] = 'img_card=?';
            $valores[] = (string)$d['img'];
        }
        // descripcion_corta
        if (array_key_exists('descripcion_corta', $d)) {
            $campos[] = 'descripcion_corta=?';
            $valores[] = s((string)$d['descripcion_corta']);
        }
        // chips (solo si se envía; si es null explícito, se guarda null)
        if (array_key_exists('chips', $d)) {
            $campos[] = 'chips=?';
            $valores[] = ($d['chips'] !== null) ? json_encode($d['chips']) : null;
        }
        // cuerpo → cuerpo_html (alias)
        if (array_key_exists('cuerpo_html', $d)) {
            $campos[] = 'cuerpo_html=?';
            $valores[] = (string)$d['cuerpo_html'];
        } elseif (array_key_exists('cuerpo', $d)) {
            $campos[] = 'cuerpo_html=?';
            $valores[] = (string)$d['cuerpo'];
        }

        if (empty($campos)) {
            ok(null, 'Servicio sin cambios');
            break;
        }

        $valores[] = $id;
        $sql = "UPDATE servicios SET " . implode(',', $campos) . " WHERE id=?";
        $stmt = $db->prepare($sql);
        $stmt->execute($valores);
        gds_audit('servicio_save', 'id=' . ($d['id'] ?? 'new'));
        ok(null, 'Servicio actualizado');

    case 'admin_servicio_delete':
        requireAdmin();
        $id = s($d['id'] ?? '');
        if (!$id) err('id requerido');
        $db->prepare("UPDATE servicios SET activo=0 WHERE id=?")->execute([$id]);
        gds_audit('servicio_delete', 'id=' . $id);
        ok(null, 'Servicio eliminado');

    /* ── ADMIN: Descuentos ── */
    case 'admin_descuento_save':
        requireAdmin();
        $clave = s($d['clave_storage']??'');
        $pct   = s($d['porcentaje']??'');
        if (!$clave || !$pct) err('clave_storage y porcentaje requeridos');
        $db->prepare("UPDATE descuentos SET porcentaje=? WHERE clave_storage=?")
           ->execute([$pct,$clave]);
        gds_audit('descuento_save', 'clave=' . ($d['clave_storage'] ?? ''));
        ok(null, 'Descuento actualizado');

    case 'admin_costos_save':
        requireAdmin();
        $costos = $d['costos'] ?? [];
        if (!is_array($costos)) err('costos debe ser un objeto');
        $json = json_encode($costos, JSON_UNESCAPED_UNICODE);
        $stmt = $db->prepare("
            INSERT INTO config_sistema (clave, valor, descripcion, es_privado)
            VALUES ('costos_inscripcion', ?, 'Costos de inscripcion (matricula, pension, etc.)', 1)
            ON DUPLICATE KEY UPDATE valor=VALUES(valor), actualizado_en=CURRENT_TIMESTAMP
        ");
        $stmt->execute([$json]);
        ok(null, 'Costos actualizados');

    /* ── ADMIN: Periodicos ── */
    case 'admin_periodico_save':
        requireAdmin();
        $id = s($d['id']??'p_'.time());
        $db->prepare("
            INSERT INTO periodicos (id,nombre,anio,img,url,activo) VALUES (?,?,?,?,?,1)
            ON DUPLICATE KEY UPDATE
              nombre=VALUES(nombre),anio=VALUES(anio),img=VALUES(img),url=VALUES(url),activo=1
        ")->execute([$id,s($d['nombre']??''),(int)($d['anio']??date('Y')),$d['img']??'',$d['url']??'#']);
        gds_audit('periodico_save', 'id=' . ($d['id'] ?? 'new'));
        ok(null, 'Periodico guardado');

    case 'admin_periodico_delete':
        requireAdmin();
        $id = s($d['id']??'');
        if (!$id) err('id requerido');
        $db->prepare("UPDATE periodicos SET activo=0 WHERE id=?")->execute([$id]);
        gds_audit('periodico_delete', 'id=' . $id);
        ok(null, 'Periodico eliminado');

    /* ── ADMIN: Documentos ── */
    case 'admin_documento_save':
        requireAdmin();
        $id = s($d['id']??'doc_'.time());
        $db->prepare("
            INSERT INTO documentos (id,nombre,descripcion,tipo,url,tamano_kb,publicado)
            VALUES (?,?,?,?,?,?,1)
            ON DUPLICATE KEY UPDATE
              nombre=VALUES(nombre),descripcion=VALUES(descripcion),
              url=VALUES(url),tamano_kb=VALUES(tamano_kb),publicado=1
        ")->execute([$id,s($d['nombre']??''),s($d['descripcion']??''),
            s($d['tipo']??'PDF'),$d['url']??'',(int)($d['tamano_kb']??0)?:(null)]);
        gds_audit('documento_save', 'id=' . ($d['id'] ?? 'new'));
        ok(null, 'Documento guardado');

    case 'admin_documento_delete':
        requireAdmin();
        $id = s($d['id']??'');
        if (!$id) err('id requerido');
        $db->prepare("UPDATE documentos SET publicado=0 WHERE id=?")->execute([$id]);
        gds_audit('documento_delete', 'id=' . $id);
        ok(null, 'Documento eliminado');

    /* ── ADMIN: Promociones Grado 11 ── */
    case 'admin_promocion_save':
        requireAdmin();
        $id = s($d['id']??'promo_'.time());
        $db->prepare("
            INSERT INTO promociones_grado11 (id,anio,nombre_grupo,foto)
            VALUES (?,?,?,?)
            ON DUPLICATE KEY UPDATE
              anio=VALUES(anio),nombre_grupo=VALUES(nombre_grupo),foto=VALUES(foto)
        ")->execute([$id,(int)($d['anio']??date('Y')),s($d['nombreGrupo']??''),$d['foto']??'']);
        gds_audit('promocion_save', 'id=' . ($d['id'] ?? 'new'));
        ok(null, 'Promocion guardada');

    case 'admin_promocion_delete':
        requireAdmin();
        $id = s($d['id']??'');
        if (!$id) err('id requerido');
        $db->prepare("DELETE FROM promociones_grado11 WHERE id=?")->execute([$id]);
        gds_audit('promocion_delete', 'id=' . $id);
        ok(null, 'Promocion eliminada');

    /* ── ADMIN: Estados ── */
    case 'admin_inscripcion_estado':
        requireAdmin();
        $id     = (int)($d['id']??0);
        $estado = s($d['estado']??'');
        if (!$id || !in_array($estado,['pendiente','revisado','aprobado','rechazado'])) err('id y estado valido requeridos');
        $db->prepare("UPDATE inscripciones SET estado=? WHERE id=?")->execute([$estado,$id]);
        ok(null, 'Estado actualizado');

    case 'admin_colaborador_estado':
        requireAdmin();
        $id     = (int)($d['id']??0);
        $estado = s($d['estado']??'');
        if (!$id || !in_array($estado,['pendiente','revisado','contactado','descartado'])) err('id y estado valido requeridos');
        $db->prepare("UPDATE colaboradores SET estado=? WHERE id=?")->execute([$estado,$id]);
        ok(null, 'Estado actualizado');

    default:
        err('Accion POST no reconocida: ' . $action);
    }
}

err('Metodo no permitido', 405);
