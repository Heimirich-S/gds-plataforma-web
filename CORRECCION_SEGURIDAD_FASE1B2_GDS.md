# Corrección de seguridad — Fase 1B.2 (Cierre de credenciales legacy y fortalecimiento)

| Campo | Valor |
|---|---|
| Fecha | 30/10/2026 |
| Alcance | H-01 (cierre completo) + CSRF + sesiones |
| Resultado | **Aprobado** |

---

## 1. Datos generales de la fase

- **Archivos modificados:** 7 (`public/index.html`, `public/js/pages/inscripciones.js`, `public/js/pages/noticias.js`, `public/js/pages/organigrama.js`, `public/js/pages/servicios.js`, `public/api.php`, `public/gds-api.js`).
- **Archivos nuevos:** Ninguno.
- **Respaldo previo:** `Desktop\Respaldos_GDS\2026-10-30_fase1b2_previo\` (9 archivos).
- **BD modificada:** No.
- **Hosting modificado:** No.
- **Producción:** No tocada.

---

## 2. Resumen ejecutivo

Se cerró completamente H-01: se eliminaron las credenciales administrativas de todos los archivos públicos inspeccionados (0 ocurrencias de `GDS1949` y de `CREDS.find`). Los cuatro módulos administrativos (Inscripciones, Noticias, Organigrama, Servicios) utilizan ahora `GDS.admin.login()`.

Se implementó protección CSRF mediante token de sesión, entregado por `admin_session`, enviado en `X-CSRF-Token` y validado en el servidor. Se añadió expiración por inactividad de 30 minutos y se mantuvo la regeneración de ID y la invalidación al logout.

---

## 3. Objetivo de los cambios

Retirar completamente las credenciales del frontend y fortalecer la protección CSRF y la gestión de sesiones, sin modificar la base de datos ni el hosting.

---

## 4. Archivos modificados y descripción

| Ruta | Cambio |
|---|---|
| `public/index.html` | Reemplazado `ADMIN_CREDENTIALS` por array vacío; `doAdminStep1` usa `GDS.admin.login()` |
| `public/js/pages/inscripciones.js` | Reemplazado `INSC_ADMIN_CREDS` por array vacío; `doInscStep1` usa `GDS.admin.login()` |
| `public/js/pages/noticias.js` | Reemplazado `NOT_ADMIN_CREDS` por array vacío; eliminada `ADMIN_USER/ADMIN_PASS`; `doNotStep1` usa `GDS.admin.login()` |
| `public/js/pages/organigrama.js` | Reemplazado `ORG_ADMIN_CREDS` por array vacío; `doOrgStep1` usa `GDS.admin.login()` |
| `public/js/pages/servicios.js` | Reemplazado `CREDS` por array vacío; `doAdminStep1` usa `GDS.admin.login()` |
| `public/api.php` | Token CSRF en sesión, `requireCsrf()`, expiración 30 min, guardián actualizado, `admin_session` devuelve `csrf_token` |
| `public/gds-api.js` | Envío de `X-CSRF-Token`, almacenamiento de token desde `admin_session`/`admin_login` |

---

## 5. Estado de H-01 (evidencia)

- Búsqueda de `GDS1949` en `public/`: **0 ocurrencias**.
- Búsqueda de `CREDS.find` / `ORG_ADMIN_CREDS.find` / `NOT_ADMIN_CREDS.find` / `INSC_ADMIN_CREDS.find`: **0 ocurrencias**.
- Los cuatro módulos administrativos llaman a `GDS.admin.login()` (verificado en líneas: index.html:2278, inscripciones.js:191, noticias.js:134, organigrama.js:331, servicios.js:130).
- No quedan mecanismos de autenticación local funcionales.

**H-01: RESUELTO.**

---

## 6. Implementación CSRF (evidencia)

- **Generación:** `bin2hex(random_bytes(32))` almacenado en `$_SESSION['gds_csrf']` (api.php, líneas 25-27).
- **Asociación a sesión:** Sí, vinculado a `$_SESSION`.
- **Entrega al frontend:** `admin_session` devuelve `csrf_token` (api.php, línea 123); `GDS.admin.login()` y `GDS.admin.session()` almacenan el token en `_gdsCsrfToken`.
- **Envío:** Cabecera `X-CSRF-Token` en `gdsPost()` cuando `isAdmin` (gds-api.js).
- **Validación:** `requireCsrf()` usa `hash_equals()` (api.php, líneas 72-76).
- **Operaciones protegidas:** Todas las operaciones POST administrativas (guardián central, líneas 95-108).
- **Respuesta ante token ausente/incorrecto:** HTTP 403 con mensaje "Token CSRF inválido o ausente".
- **Compatibilidad:** Las operaciones públicas no se ven afectadas (no requieren CSRF).

---

## 7. Configuración de sesiones y cookies

| Parámetro | Valor |
|---|---|
| Duración | Sesión del navegador (cookie lifetime 0) |
| Expiración por inactividad | 30 minutos (`gds_last_activity`, api.php líneas 30-42) |
| Regeneración de ID | `session_regenerate_id(true)` en `admin_login` (línea 425) |
| Invalidación al logout | `session_destroy()` + invalidación de cookie |
| HttpOnly | true |
| Secure | true solo en HTTPS |
| SameSite | Lax |
| Path | / |

---

## 8. Protección de endpoints administrativos

Todos los endpoints `admin_*` (excepto `admin_login`, `admin_logout`, `admin_session`) requieren `ADMIN_ENABLED` + sesión válida + CSRF (para POST). Verificado mediante inspección de `api.php`.

---

## 9. Pruebas ejecutadas

| Prueba | Comando | Resultado |
|---|---|---|
| Sintaxis PHP | `php -l public/api.php` | Sin errores |
| Sintaxis JS | `node --check` (5 archivos) | Sin errores |
| Búsqueda de credenciales | `Select-String GDS1949` | 0 ocurrencias |
| Búsqueda de auth local | `Select-String CREDS.find` | 0 ocurrencias |

## 10. Pruebas funcionales pendientes

- Flujo completo de login/logout con credenciales configuradas (requiere `config/gds.php` con hash).
- Prueba de CSRF cross-site.
- Prueba en staging con HTTPS.
- Verificación de expiración por inactividad.

## 11. Riesgos residuales

1. CSRF mitigado por SameSite=Lax + token; falta validación de `Origin`/`Referer` como defensa adicional.
2. Detección de HTTPS detrás de proxy no resuelta (documentado).
3. Endpoints de auth dependen de `getDB()` (no se cambió la arquitectura).
4. Persistencia en MySQL no probada.

## 12. Dependencia de MySQL en endpoints de autenticación

`admin_login`, `admin_session` y `admin_logout` llaman a `getDB()` (línea 74 de `api.php`), por lo que requieren una conexión a MySQL funcional. No se modificó la arquitectura. En un entorno sin base de datos, estos endpoints fallan con error 500.

## 13. Ubicación del respaldo previo

`Desktop\Respaldos_GDS\2026-10-30_fase1b2_previo\` (9 archivos).

## 14. Confirmación del estado de BD, hosting y producción

- **Base de datos modificada:** No.
- **Hosting modificado:** No.
- **Producción modificada:** No.

---

## 15. Conclusión técnica

**Aprobado.**

H-01 se considera resuelto: no quedan credenciales en archivos públicos y ningún módulo autentica localmente. La protección CSRF y la gestión de sesiones se fortalecieron conforme a los requisitos. Los riesgos residuales se documentan para fases posteriores.

**No se modificó ningún archivo del código fuente durante la generación de este informe. Detenido, esperando autorización explícita.**