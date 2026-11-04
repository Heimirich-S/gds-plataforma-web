<?php
/* ============================================================
   GDS Web v3 — Configuración de base de datos
   
   ██████████████████████████████████████████████████████████
   VERSI͓N XAMPP (desarrollo local)
   Cambia a la versión PRODUCCI͓N antes de subir al hosting
   ██████████████████████████████████████████████████████████
   
   XAMPP: usuario root, sin contraseña, localhost
   PRODUCCI͓N: usuario y contraseña de cPanel
   ============================================================ */

/* ── Detectar automáticamente si estamos en local o producción ── */
$es_local = (
    $_SERVER['SERVER_NAME'] === 'localhost' ||
    $_SERVER['SERVER_NAME'] === '127.0.0.1' ||
    strpos($_SERVER['SERVER_NAME'], '.local') !== false
);

if ($es_local) {
    /* ════════════════════════════════
       CONFIGURACI͓N XAMPP (local)
       ════════════════════════════════ */
    define('DB_HOST',    'localhost');
    define('DB_NAME',    'gds_web');   // La BD que creaste en phpMyAdmin de XAMPP
    define('DB_USER',    'root');       // Usuario por defecto de XAMPP
    define('DB_PASS',    '');           // Sin contraseña por defecto en XAMPP
    define('DEBUG_MODE', true);         // Mostrar errores en local
} else {
    /* ════════════════════════════════
       CONFIGURACI͓N HOSTING (producción)
       Cambia estos valores con los de tu cPanel
       ════════════════════════════════ */
    define('DB_HOST',    'localhost');
    define('DB_NAME',    'tuCuenta_gds_web');    // ← prefijo de cPanel + _gds_web
    define('DB_USER',    'tuCuenta_gds_admin');  // ← prefijo de cPanel + _gds_admin
    define('DB_PASS',    '');           // Secretos retirados de este archivo (ver app/config/config.php)
    define('DEBUG_MODE', false);

    /* ── ⚠️ VALIDACI͓N DE SEGURIDAD ──
       Si esto se está ejecutando en el hosting real y DB_NAME/DB_USER
       todavía tienen el texto de plantilla "tuCuenta_...", significa que
       nunca se reemplazaron por los datos reales de cPanel. Sin esto,
       getDB() intenta conectar con credenciales que no existen, PDO
       lanza una excepción, y el usuario ve "error al guardar" aunque
       todo el resto del sistema esté bien configurado. */
    if (strpos(DB_NAME, 'tuCuenta') === 0 || strpos(DB_USER, 'tuCuenta') === 0) {
        http_response_code(500);
        error_log('GDS config.php: credenciales de producción sin configurar (siguen con el valor de plantilla "tuCuenta_...")');
        die(json_encode([
            'ok'    => false,
            'error' => 'Configuración del servidor incompleta: faltan las credenciales reales de la base de datos en config.php (DB_NAME/DB_USER/DB_PASS).'
        ]));
    }
}

define('DB_CHARSET', 'utf8mb4');

/* Token que protege las acciones de admin.
   Debe ser ID͉NTICO al ADMIN_API_TOKEN en gds-api.js */
define('ADMIN_TOKEN', '');  // Secretos retirados de este archivo (ver app/config/config.php)

/* CORS: en local permite todo, en producción solo el dominio real */
define('ALLOWED_ORIGIN', $es_local ? '*' : 'https://www.gimnasiodomingosavio.edu.co');

/* ── Conexión PDO (singleton) ── */
function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $dsn = 'mysql:host=' . DB_HOST
         . ';dbname=' . DB_NAME
         . ';charset=' . DB_CHARSET;

    $opts = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $opts);
    } catch (PDOException $e) {
        http_response_code(500);
        $msg = DEBUG_MODE ? $e->getMessage() : 'Error de conexión a la base de datos';
        die(json_encode(['ok' => false, 'error' => $msg]));
    }
    return $pdo;
}
