# Validación de conexión y configuración de seguridad — Fase 1C GDS

| Campo | Valor |
|---|---|
| Fecha | 31/10/2026 |
| Entorno | Local (XAMPP, Windows, PHP 8.4.27, MariaDB) |
| Base de datos | gds_web (22 tablas + 5 vistas) |
| Tipo | Auditoría de solo lectura |

---

## 1. Estado de conexión PHP–MariaDB

**APROBADO.**

- Configuración en `app/config/config.php` (rama local): DB_HOST=localhost, DB_NAME=gds_web, DB_USER=root, DB_PASS=''.
- Función `getDB()` devuelve conexión PDO a `gds_web`.
- Prueba ejecutada: `SELECT DATABASE()` → `gds_web`; `SELECT 1` → `1`.
- Conexión funcional y estable.

## 2. Base de datos detectada y estructura visible

**APROBADO.**

- 22 tablas + 5 vistas visibles (27 objetos en `SHOW TABLES`).
- Coincide con el esquema `storage/database/gds_database_final.sql`.

## 3. Estado de configuración de autenticación

**OBSERVACI͓N.**

- `config/gds.php`: `GDS_ADMIN_USER` y `GDS_ADMIN_PASSWORD_HASH` están vacíos.
- `ADMIN_ENABLED` = true (token de 64 caracteres configurado).
- `ADMIN_USER` y `ADMIN_PASSWORD_HASH` definidos como cadenas vacías.
- El endpoint `admin_login` devuelve HTTP 503 "Autenticación no configurada" mientras las variables estén vacías.
- Validación de contraseña mediante `password_verify()` implementada correctamente en el código.
- Autenticación protegida por sesiones PHP.

**Pendiente:** El administrador debe configurar `GDS_ADMIN_USER` y `GDS_ADMIN_PASSWORD_HASH` (generando el hash con `password_hash()`).

## 4. Estado de protecciones de sesión y CSRF

| Control | Estado | Evidencia |
|---|---|---|
| Sesiones PHP | APROBADO | `session_start()` con cookie HttpOnly, Secure (HTTPS), SameSite=Lax |
| Regeneración de ID | APROBADO | `session_regenerate_id(true)` en `admin_login` |
| Invalidación al logout | APROBADO | `session_destroy()` + invalidación de cookie |
| Expiración por inactividad (30 min) | APROBADO | `gds_last_activity` con cálculo `> 1800` |
| Token CSRF | APROBADO | `bin2hex(random_bytes(32))` en sesión, validado con `hash_equals()` |
| Envío CSRF | APROBADO | Cabecera `X-CSRF-Token` en `gdsPost()` |
| Cookies Secure en HTTPS | OBSERVACI͓N | Depende de `$_SERVER['HTTPS']`; puede fallar detrás de proxy |

## 5. Estado de protección de API

**APROBADO.**

- Guardián central por prefijo `admin_` (excluye `admin_login`, `admin_logout`, `admin_session`).
- `requireAdmin()` verifica `$_SESSION['gds_admin'] === true`.
- `requireCsrf()` valida token para operaciones POST administrativas.
- 23 endpoints administrativos protegidos.
- Errores HTTP distinguen 401 (no autenticado) y 403 (no autorizado / panel deshabilitado).

## 6. Pruebas ejecutadas y resultados reales

| Prueba | Resultado |
|---|---|
| Conexión PHP–MariaDB | APROBADO (DB: gds_web, SELECT 1 = 1) |
| Estructura (tablas/vistas) | APROBADO (22 tablas + 5 vistas) |
| Sintaxis PHP (api.php, config.php) | APROBADO (sin errores) |
| Sintaxis JS (gds-api.js) | APROBADO (sin errores) |
| Credenciales admin configuradas | PENDIENTE (vacías) |
| Login funcional | PENDIENTE (sin credenciales) |
| CSRF funcional | PENDIENTE (sin sesión) |
| Expiración funcional | PENDIENTE (no se manipuló el tiempo) |

## 7. Problemas encontrados

1. **Credenciales admin no configuradas** (OBSERVACI͓N): `GDS_ADMIN_USER` y `GDS_ADMIN_PASSWORD_HASH` vacíos. El panel admin no puede usarse hasta configurarlos.
2. **Dependencia de MySQL en endpoints de auth** (OBSERVACI͓N): `admin_login`, `admin_session`, `admin_logout` llaman a `getDB()`. Sin BD, fallan con 500.
3. **Detección HTTPS detrás de proxy** (OBSERVACI͓N): Depende de `$_SERVER['HTTPS']`, puede fallar en cPanel con proxy.

## 8. Acciones recomendadas para la siguiente fase

1. Configurar credenciales admin en `config/gds.php` (generar hash con `password_hash()`).
2. Realizar pruebas funcionales de login/logout/CSRF con credenciales configuradas.
3. Verificar cookies en staging con HTTPS.
4. Evaluar validación de `Origin`/`Referer` como defensa adicional CSRF.

---

## Resumen

- **Conexión PHP–MariaDB:** APROBADO.
- **Base de datos:** APROBADO (22 tablas + 5 vistas).
- **Autenticación:** OBSERVACI͓N (credenciales no configuradas).
- **Sesiones/CSRF:** APROBADO (implementación correcta).
- **API:** APROBADO (endpoints protegidos).

**¿Estamos preparados para comenzar las pruebas reales de autenticación?**

**Sí, parcialmente.** La conexión a la base de datos funciona y la implementación de seguridad es correcta por inspección. Sin embargo, es necesario configurar `GDS_ADMIN_USER` y `GDS_ADMIN_PASSWORD_HASH` en `config/gds.php` antes de poder probar el flujo de login.

**No se modificó ningún archivo. Detenido, esperando autorización explícita.**