# Validación funcional de seguridad — Fase 1B.3 GDS

| Campo | Valor |
|---|---|
| Fecha | 31/10/2026 |
| Tipo | Validación funcional controlada (solo lectura) |
| Entorno | Local (Windows, PHP 8.4.27, sin MySQL) |
| Resultado general | **Aprobado con observaciones** |

---

## 1. Datos generales

- Proyecto: Gimnasio Domingo Savio (GDS) — Plataforma Web.
- Entorno: Local, Windows, PHP 8.4.27, sin servicio MySQL disponible.
- Archivos inspeccionados: `public/api.php`, `public/gds-api.js`, `public/index.html`, `public/js/pages/inscripciones.js`, `public/js/pages/noticias.js`, `public/js/pages/organigrama.js`, `public/js/pages/servicios.js`, `app/config/config.php`, `config/gds.php`.

---

## 2. Entorno utilizado

- **PHP:** 8.4.27 (XAMPP/local).
- **MySQL/MariaDB:** No disponible (sin servicio activo).
- **Credenciales admin configuradas:** No (`GDS_ADMIN_USER` y `GDS_ADMIN_PASSWORD_HASH` vacíos en `config/gds.php`).
- **ADMIN_ENABLED:** true (token de 64 caracteres configurado).

---

## 3. Archivos inspeccionados

Los 9 archivos listados en la sección 1, más `VALIDACION_SEGURIDAD_FASE1B_GDS.md` y `CORRECCION_SEGURIDAD_FASE1B2_GDS.md`.

---

## 4. Herramientas y comandos

| Comando | Resultado |
|---|---|
| `php -l public/api.php` | Sin errores |
| `php -l app/config/config.php` | Sin errores |
| `node --check` (5 archivos JS) | Sin errores |
| `Select-String GDS1949` (public/) | 0 ocurrencias |
| `Select-String CREDS.find` (public/) | 0 ocurrencias |
| Inspección de `config/gds.php` | `GDS_ADMIN_USER` y `GDS_ADMIN_PASSWORD_HASH` vacíos |

---

## 5. Resultado de login

**NO EJECUTADA.**

Motivo: No existen credenciales administrativas configuradas (`GDS_ADMIN_USER` y `GDS_ADMIN_PASSWORD_HASH` vacíos). El endpoint `admin_login` devuelve HTTP 503 "Autenticación no configurada". No se inventaron credenciales.

---

## 6. Resultado de logout

**NO EJECUTADA.**

Motivo: Requiere sesión válida previa, que no puede crearse sin credenciales configuradas.

---

## 7. Resultado de validación de sesión

**PARCIAL.**

Verificado por inspección: `admin_session` devuelve `{ authenticated, csrf_token }`. Sin una sesión activa, devuelve `authenticated: false`. No se pudo verificar funcionalmente con una sesión real.

---

## 8. Resultado de protección de endpoints

**PARCIAL.**

Verificado por inspección: el guardián central protege todos los endpoints `admin_*` (excepto `admin_login`, `admin_logout`, `admin_session`) mediante `requireAdmin()` + `requireCsrf()` (POST). No se pudo probar con solicitudes reales por falta de sesión.

---

## 9. Resultado de pruebas CSRF

**NO EJECUTADA.**

Motivo: Requiere sesión válida y token CSRF, que no pueden obtenerse sin credenciales configuradas. La implementación se verificó por inspección (token en sesión, `X-CSRF-Token`, `hash_equals`).

---

## 10. Resultado de expiración de sesión

**PARCIAL.**

Verificado por inspección: expiración por inactividad de 30 minutos (`gds_last_activity`, cálculo `> 1800`). No se pudo verificar funcionalmente (no se manipuló el tiempo ni se esperaron 30 minutos).

---

## 11. Resultado de cookies y HTTPS

**PARCIAL.**

Verificado por inspección:
- `HttpOnly`: true.
- `Secure`: true solo si HTTPS detectado.
- `SameSite`: Lax.
- `Path`: /.
- `Domain`: ''.

No se pudo verificar con cabeceras HTTP reales (sin servidor de pruebas con HTTPS disponible).

---

## 12. Resultado de dependencia MySQL

**PARCIAL.**

Verificado por inspección: `admin_login`, `admin_session` y `admin_logout` llaman a `getDB()` (línea 74 de `api.php`), por lo que dependen de MySQL. Sin MySQL, fallan con error 500. No se desconectó MySQL para provocar el error (no disponible).

---

## 13. Integridad de los cuatro módulos administrativos

**PARCIAL.**

Verificado por inspección estática:
- Los cuatro módulos llaman a `GDS.admin.login()` (index.html:2278, inscripciones.js:191, noticias.js:134, organigrama.js:331, servicios.js:130).
- No quedan comparaciones locales de credenciales (`CREDS.find` = 0).
- No se pudieron probar formularios ni flujos en navegador (sin servidor con BD).

---

## 14. Pruebas ejecutadas y evidencias

| Prueba | Estado | Evidencia |
|---|---|---|
| Sintaxis PHP | SUPERADA | `php -l` sin errores |
| Sintaxis JS | SUPERADA | `node --check` sin errores |
| Ausencia de credenciales | SUPERADA | 0 ocurrencias de `GDS1949` |
| Ausencia de auth local | SUPERADA | 0 ocurrencias de `CREDS.find` |
| Login funcional | NO EJECUTADA | Sin credenciales configuradas |
| Logout funcional | NO EJECUTADA | Requiere sesión válida |
| CSRF funcional | NO EJECUTADA | Requiere sesión válida |
| Expiración funcional | NO EJECUTADA | No se manipuló el tiempo |
| Cookies HTTPS | NO EJECUTADA | Sin staging HTTPS |
| Dependencia MySQL | NO EJECUTADA | Sin MySQL disponible |

---

## 15. Pruebas pendientes y motivos

| Prueba | Motivo |
|---|---|
| Login/logout/CSRF funcional | Sin credenciales admin configuradas y sin BD |
| Expiración por inactividad | No se manipuló el tiempo |
| Cookies en HTTPS | Sin staging HTTPS |
| Dependencia MySQL | Sin MySQL disponible |
| Flujo OTP completo | Requiere EmailJS y credenciales |

---

## 16. Riesgos residuales

1. Credenciales admin no configuradas → panel deshabilitado funcionalmente.
2. Endpoints de auth dependen de MySQL.
3. CSRF sin validación de `Origin`/`Referer`.
4. Detección HTTPS detrás de proxy no verificada.
5. Persistencia en MySQL no probada.

---

## 17. Recomendaciones priorizadas

1. Configurar `GDS_ADMIN_USER` y `GDS_ADMIN_PASSWORD_HASH` en `config/gds.php` (generando el hash con `password_hash()`).
2. Disponer de un entorno de pruebas con MySQL para validar login/CSRF/sesiones.
3. Verificar cookies en staging con HTTPS.
4. Implementar validación de `Origin`/`Referer` como defensa adicional CSRF.

---

## 18. Conclusión técnica

**Aprobado con observaciones.**

La implementación de seguridad es correcta por inspección estática (sesiones, CSRF, H-01 cerrado). Sin embargo, las pruebas funcionales críticas no pudieron ejecutarse por falta de credenciales configuradas y de base de datos MySQL en el entorno local. Se requiere un entorno de pruebas con MySQL y credenciales configuradas para validar el flujo completo.

**No se modificó ningún archivo del código fuente. Detenido, esperando autorización explícita.**