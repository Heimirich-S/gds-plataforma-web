# Preparación segura de autenticación administrativa — Fase 1D GDS

| Campo | Valor |
|---|---|
| Fecha | 31/10/2026 |
| Tipo | Inspección de solo lectura |
| Archivos modificados | Ninguno |

---

## 1. Variables vigentes

| Variable | Origen | Estado |
|---|---|---|
| `GDS_DB_PASS` | `config/gds.php` | Vacía (local usa root sin contraseña) |
| `GDS_ADMIN_TOKEN` | `config/gds.php` | Configurada (64 chars) |
| `GDS_ADMIN_ENABLED` | `config/gds.php` | `true` |
| `GDS_ADMIN_USER` | `config/gds.php` | **Vacía** |
| `GDS_ADMIN_PASSWORD_HASH` | `config/gds.php` | **Vacía** |

Variables definidas en `app/config/config.php`:
- `ADMIN_TOKEN` (desde `GDS_ADMIN_TOKEN`)
- `ADMIN_ENABLED` (`GDS_ADMIN_ENABLED` && token ≥32)
- `ADMIN_USER` (desde `GDS_ADMIN_USER`)
- `ADMIN_PASSWORD_HASH` (desde `GDS_ADMIN_PASSWORD_HASH`)

## 2. Variables heredadas o sin uso

- `ADMIN_TOKEN` / `GDS_ADMIN_TOKEN`: heredado de la protección anterior por token compartido. Ya no se usa para autenticar (la auth es por sesión), pero `ADMIN_ENABLED` sigue dependiendo de su longitud. **Conflicto potencial:** el panel se considera "habilitado" si el token tiene ≥32 chars, aunque las credenciales admin estén vacías.
- No se encontraron otros tokens o credenciales heredadas en el código activo.

## 3. Posibles conflictos de configuración

1. `ADMIN_ENABLED` es `true` (por token + flag), pero `ADMIN_USER`/`ADMIN_PASSWORD_HASH` están vacíos → `admin_login` devuelve 503. El panel queda "habilitado" visualmente pero no funcional.
2. `config/gds.php` está fuera de `public/` (correcto), pero no está claro si está excluido de distribución (no hay `.gitignore` verificado).
3. La rama de producción de `app/config/config.php` usa `gds_secreto()` que cae a vacío si no hay env ni archivo privado → fail-closed (correcto).

## 4. Archivos implicados

- `app/config/config.php` — carga config privada, define constantes.
- `config/gds.php` — archivo privado de secretos (fuera de public/).
- `public/api.php` — endpoints `admin_login`, `admin_logout`, `admin_session`; guardián central.
- `public/gds-api.js` — cliente HTTP con `credentials: 'same-origin'`.

## 5. Flujo de inicio de sesión (inspeccionado)

1. Frontend envía `{ user, pass }` a `admin_login` (POST).
2. Servidor verifica `ADMIN_ENABLED`; si no, 403.
3. Valida que `user` y `pass` no estén vacíos (400).
4. Si `ADMIN_USER` o `ADMIN_PASSWORD_HASH` están vacíos → 503.
5. Verifica `hash_equals(ADMIN_USER, $user)` y `password_verify($pass, ADMIN_PASSWORD_HASH)`.
6. Si falla → 401 "Credenciales incorrectas".
7. Si éxito: `session_regenerate_id(true)`, `$_SESSION['gds_admin'] = true`, genera CSRF token, devuelve `{ authenticated: true }`.

## 6. Dependencia de base de datos

- `admin_login`, `admin_session` y `admin_logout` se ejecutan **después** de `$db = getDB()` (línea 111 de `api.php`), que se llama para todas las acciones (incluidas las admin).
- Por tanto, los tres endpoints dependen de MySQL. Si MariaDB no está disponible, devuelven 500.
- `getDB()` falla con mensaje genérico en producción (DEBUG_MODE false) → no expone credenciales.
- **No se cambió esta arquitectura** (fuera de alcance).

## 7. Procedimiento recomendado para configurar el administrador (sin ejecutar)

1. Generar el hash de la contraseña (en CLI, sin mostrarla en archivos):
   ```php
   php -r "echo password_hash('CONTRASE͑A_SEGURA', PASSWORD_DEFAULT);"
   ```
2. Editar `config/gds.php` (fuera de `public/`) y establecer:
   - `'GDS_ADMIN_USER' => 'usuario_admin'`
   - `'GDS_ADMIN_PASSWORD_HASH' => '<hash generado>'`
3. Verificar que `config/gds.php` tenga permisos restrictivos (600 en Linux/cPanel).
4. No almacenar la contraseña en texto plano en ningún archivo.
5. No incluir el hash en informes ni en control de versiones.
6. Probar el login en un entorno local con MariaDB encendido.

## 8. Riesgos identificados

1. `ADMIN_ENABLED` verdadero con credenciales vacías genera confusión (panel "habilitado" pero no funcional).
2. Dependencia de MySQL en endpoints de auth (sin BD → 500).
3. `config/gds.php` no verificado como excluido de distribución (sin `.gitignore` confirmado).
4. Detección HTTPS detrás de proxy no resuelta.

## 9. Pruebas que podremos ejecutar después

1. Login con credenciales válidas → sesión creada, CSRF token entregado.
2. Login con credenciales incorrectas → 401.
3. Consulta de sesión sin autenticación → `authenticated: false`.
4. Logout → sesión destruida, cookie invalidada.
5. Acceso a endpoint admin sin sesión → 401.
6. POST admin sin CSRF → 403.
7. POST admin con CSRF válido → aceptado.
8. Verificación de cookies en navegador (HttpOnly, SameSite).

---

**Esta fase es exclusivamente de inspección. No se implementaron cambios ni se configuraron credenciales. Detenido, esperando autorización explícita.**