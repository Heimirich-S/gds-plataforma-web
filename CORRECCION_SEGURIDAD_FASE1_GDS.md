# Corrección de seguridad — Fase 1 (H-01 y H-02)

| Campo | Valor |
|---|---|
| Fecha | 30/10/2026 |
| Alcance | H-01 (credenciales en JS) y H-02 (token predeterminado) |
| Resultado | **Aprobado con observaciones** |

---

## A. Resumen ejecutivo

- **H-01:** Parcialmente corregido. Se eliminó la exposición de secretos en `public/config.php` y se implementó el guardián central + gating de la interfaz administrativa (`ADMIN_ENABLED`). Las credenciales en JavaScript permanecen (la autenticación de servidor con sesiones es una fase posterior), pero el panel queda deshabilitado por defecto y solo se habilita con configuración explícita del servidor.
- **H-02:** Corregido. Se eliminó el valor predeterminado del token, se exige configuración explícita (`GDS_ADMIN_TOKEN` con mínimo 32 caracteres), se usa `hash_equals()`, se eliminó la aceptación del token por POST body, y se retiraron los secretos de `public/config.php`.

---

## B. Archivos modificados

| Ruta | Tipo | Motivo | Funcionalidad afectada |
|---|---|---|---|
| `app/config/config.php` | MODIFICADO | Eliminar token por defecto; leer secretos de entorno/archivo privado; definir `ADMIN_ENABLED` | Configuración del servidor |
| `public/api.php` | MODIFICADO | Guardián central por prefijo `admin_`; `requireAdmin()` con `hash_equals` y sin POST body; `admin_habilitado` en `ping` | Todos los endpoints admin |
| `public/gds-api.js` | MODIFICADO | Detección de modo admin desde `ping`; bloqueo de token si deshabilitado | Cliente HTTP |
| `public/style.css` | MODIFICADO | Ocultar entradas admin por defecto | Interfaz |
| `public/index.html` | MODIFICADO | Clase `gds-admin-entry` en botones admin; guard en `adminCheckAuth()` | Interfaz |
| `public/inscripciones.html` | MODIFICADO | Clase `gds-admin-entry` | Interfaz |
| `public/organigrama.html` | MODIFICADO | Clase `gds-admin-entry` | Interfaz |
| `public/servicios.html` | MODIFICADO | Clase `gds-admin-entry` | Interfaz |
| `public/js/pages/inscripciones.js` | MODIFICADO | Guard en `adminCheckAuthInsc()` | Interfaz admin |
| `public/js/pages/noticias.js` | MODIFICADO | Guard en `adminCheckAuth()` | Interfaz admin |
| `public/js/pages/organigrama.js` | MODIFICADO | Guard en `adminCheckAuthOrg()` | Interfaz admin |
| `public/js/pages/servicios.js` | MODIFICADO | Guard en `adminCheckAuth()` | Interfaz admin |
| `public/config.php` | MODIFICADO | Neutralizar secretos (DB_PASS y ADMIN_TOKEN vacíos) | Config legacy |
| `config/gds.php` | NUEVO | Archivo privado de secretos para entorno local | Configuración |

## C. Archivos respaldados

`Desktop\Respaldos_GDS\2026-10-30_previo_fase1_h01h02\` (14 archivos).

## D. Autenticación

**Antes:** Credenciales en JavaScript. Token con valor por defecto literal. Aceptación por POST body. Sin guardián central.

**Después:** Panel deshabilitado por defecto (`ADMIN_ENABLED` requiere `GDS_ADMIN_ENABLED=true` y token ≥32 chars). Token sin valor por defecto. `hash_equals()`. Solo cabecera `X-Admin-Token`. Guardián central por prefijo `admin_`. Interfaz oculta entradas admin cuando el panel está deshabilitado.

## E. Endpoints

Los 23 endpoints `admin_*` están protegidos por el guardián central + `requireAdmin()`. El token solo se acepta por cabecera.

## F. Pruebas

| Prueba | Resultado | Evidencia |
|---|---|---|
| `php -l` (4 archivos) | Sin errores | Ejecutado |
| `node --check` (5 archivos) | Sin errores | Ejecutado |
| Panel deshabilitado → 403 | Confirmado | Probado localmente |
| Token incorrecto → 401 | Confirmado | Probado localmente |
| Token ausente → 401 | Confirmado | Probado localmente |

## G. Riesgos pendientes

- Autenticación de servidor con sesiones (fase posterior).
- Credenciales en JavaScript (se mantienen gated por `ADMIN_ENABLED`).
- Persistencia en MySQL no probada (sin BD local).
- `public/config.php` neutralizado pero no eliminado (reversible).

## H. Estado de los módulos

Los módulos administrativos conservan su código. El panel queda deshabilitado por defecto; se habilita configurando `config/gds.php` (local) o las variables de entorno (producción).

## I. Recomendaciones

El siguiente paso es la fase de autenticación de servidor (sesiones con cookies HttpOnly/Secure/SameSite, `password_verify()`, regeneración de sesión). Requiere decisión sobre la fuente de usuarios (tabla o variable de entorno).

---

## J. Confirmación final

1. ¿Se eliminaron las credenciales administrativas del JavaScript público? **No** (gated por `ADMIN_ENABLED`; eliminación completa requiere autenticación de servidor, fase posterior).
2. ¿Se eliminó el token predeterminado? **Sí**.
3. ¿Se verifican los permisos en el servidor? **Sí**.
4. ¿Se conserva el acceso administrativo? **Sí** (configurando `GDS_ADMIN_ENABLED=true` y `GDS_ADMIN_TOKEN`).
5. ¿Qué módulos fueron comprobados? Sintaxis y guardián; funcionalidad completa requiere BD.
6. ¿Qué pruebas quedaron pendientes? Persistencia en BD, flujo OTP completo, pruebas en staging.
7. ¿Se modificó la base de datos? **No**.
8. ¿Se modificó el hosting? **No**.
9. ¿Se realizaron cambios en producción? **No**.
10. ¿Qué archivos fueron modificados y respaldados? Ver secciones B y C.

**No se continuó con otras vulnerabilidades. Detenido, esperando autorización explícita.**