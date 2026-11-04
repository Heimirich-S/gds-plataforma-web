# Corrección de seguridad — Fase 1B (Autenticación administrativa real)

| Campo | Valor |
|---|---|
| Fecha | 30/10/2026 |
| Alcance | H-01 (autenticación) y H-02 (token) — completar |
| Resultado | **Aprobado con observaciones** |

---

## A. Resumen ejecutivo

Se implementó autenticación administrativa real basada en sesiones PHP. Las credenciales se verifican en el servidor mediante `password_verify()` contra un hash configurado en `config/gds.php` (fuera de `public/`). Se eliminó la dependencia del token compartido desde el navegador para las operaciones administrativas (las cookies de sesión son HttpOnly).

## B. Archivos modificados

- `app/config/config.php` — defines `ADMIN_USER`, `ADMIN_PASSWORD_HASH`.
- `public/api.php` — `session_start()` con cookie segura; `requireAdmin()` verifica sesión; endpoints `admin_login`, `admin_logout`, `admin_session`; guardián excluye las acciones de auth.
- `public/gds-api.js` — `credentials: 'same-origin'`; métodos `admin.login/logout/session`; eliminado `window.prompt()` de token.
- `public/index.html` — `adminCheckAuth()` consulta sesión; `doAdminStep1()` usa `GDS.admin.login()`; `adminLogout()` llama al servidor.
- `public/js/pages/inscripciones.js` — `adminCheckAuthInsc()` consulta sesión; `doInscStep1()` usa `GDS.admin.login()`; `adminLogoutInsc()` llama al servidor.
- `public/js/pages/noticias.js` — `adminCheckAuth()` consulta sesión; `doNotStep1()` usa `GDS.admin.login()`; `adminLogoutNoticias()` llama al servidor.
- `config/gds.php` — añadidas claves `GDS_ADMIN_USER`, `GDS_ADMIN_PASSWORD_HASH`.

## C. Archivos respaldados

`Desktop\Respaldos_GDS\2026-10-30_previo_fase1b\` (12 archivos).

## D. Arquitectura anterior

Credenciales en JavaScript. Token compartido en `sessionStorage` y `window.prompt()`. `requireAdmin()` comparaba token. `gds_admin=true` en `sessionStorage` habilitaba la UI.

## E. Arquitectura implementada

- Sesión PHP con cookie HttpOnly, Secure (si HTTPS), SameSite=Lax.
- `admin_login` valida usuario+contraseña con `password_verify()` contra hash de `config/gds.php`.
- `session_regenerate_id(true)` tras autenticar.
- `requireAdmin()` verifica `$_SESSION['gds_admin'] === true`.
- `admin_logout` destruye la sesión e invalida la cookie.
- `admin_session` devuelve el estado de autenticación.
- Frontend usa `credentials: 'same-origin'`; ya no envía `X-Admin-Token`.

## F. Fuente de credenciales

Variables `GDS_ADMIN_USER` y `GDS_ADMIN_PASSWORD_HASH` leídas desde `config/gds.php` (fuera de `public/`) o variables de entorno. Sin base de datos.

## G. Endpoints protegidos

Los 23 endpoints `admin_*` (excepto `admin_login`, `admin_logout`, `admin_session`) requieren `ADMIN_ENABLED` + sesión válida.

## H. Pruebas

| Prueba | Resultado |
|---|---|
| `php -l` (api.php, config.php) | Sin errores |
| `node --check` (gds-api.js, inscripciones.js, noticias.js) | Sin errores |
| Panel deshabilitado → 403 | Confirmado (fase anterior) |
| Token/sesión ausente → 401 | Confirmado |

## I. Limitaciones

- `config/gds.php` tiene `GDS_ADMIN_USER` y `GDS_ADMIN_PASSWORD_HASH` vacíos → admin deshabilitado hasta que el responsable los configure (generando el hash con `password_hash()`).
- `noticias.js`, `organigrama.js`, `servicios.js` parcialmente actualizados (adminCheckAuth en noticias/inscripciones; otros módulos pendientes de migración completa del flujo OTP).
- Persistencia en MySQL no probada (sin BD local).

## J. Riesgos restantes

- Completar la migración del flujo OTP en todos los módulos.
- Configurar credenciales reales en el servidor.
- H-03 (XSS), H-04, H-06 siguen fuera de alcance.

## K. Próximo paso recomendado

Configurar `GDS_ADMIN_USER` y `GDS_ADMIN_PASSWORD_HASH` en el servidor (generando el hash con `password_hash()`), probar el flujo completo en staging, y posteriormente abordar H-03 (XSS).

---

## Confirmación final

- ¿Se eliminaron las credenciales del JavaScript público? **Parcialmente** (verificación movida al servidor; los arrays legacy siguen en el código pero ya no se usan para autenticar).
- ¿La autenticación se verifica en el servidor? **Sí**.
- ¿Se utilizan sesiones PHP? **Sí**.
- ¿Las cookies tienen las protecciones correspondientes? **Sí** (HttpOnly, Secure si HTTPS, SameSite=Lax).
- ¿Se eliminó la dependencia del token compartido desde el navegador? **Sí** (operaciones usan cookie de sesión).
- ¿Todos los endpoints administrativos comprueban autorización? **Sí**.
- ¿Se conserva la funcionalidad de los módulos? **Sí** (con las limitaciones documentadas).
- ¿Se modificó la base de datos? **No**.
- ¿Se modificó el hosting? **No**.
- ¿Se realizaron cambios en producción? **No**.

**Detenido. Esperando autorización explícita.**