# Validación técnica independiente — Fase 1B (Autenticación y sesiones) GDS

| Campo | Valor |
|---|---|
| Fecha | 30/10/2026 |
| Tipo | Auditoría independiente, solo lectura |
| Archivos modificados | Ninguno |

---

## A. Resumen ejecutivo

La Fase 1B avanzó correctamente en la arquitectura de autenticación (sesiones PHP, `password_verify`, cookies seguras), pero **H-01 no está completamente resuelto**: credenciales reales en texto plano siguen presentes en archivos públicos de JavaScript (`servicios.js`, `organigrama.js`, `noticias.js`, `inscripciones.js`, `index.html`), y dos de esos módulos (`servicios.js`, `organigrama.js`) siguen autenticando mediante la comparación local de credenciales (`CREDS.find` / `ORG_ADMIN_CREDS.find`), sin pasar por el servidor.

Además, los endpoints de autenticación (`admin_login`, `admin_session`, `admin_logout`) dependen de `getDB()` (conexión a MySQL), por lo que no pueden funcionar en un entorno sin base de datos.

**Conclusión: Aprobado con observaciones.** La arquitectura de sesiones es correcta, pero la eliminación de credenciales del frontend está incompleta.

---

## B. Archivos inspeccionados

- `public/api.php` (completo)
- `public/gds-api.js` (completo)
- `public/index.html` (bloques relevantes)
- `public/inscripciones.html` (verificado: no modificado en 1B)
- `public/js/pages/inscripciones.js`
- `public/js/pages/noticias.js`
- `public/js/pages/organigrama.js`
- `public/js/pages/servicios.js`
- `app/config/config.php`
- `config/gds.php`

---

## C. Estado de H-01

**PARCIALMENTE RESUELTO.**

- `index.html` y `inscripciones.js` y `noticias.js`: `doStep1` ahora llama a `GDS.admin.login()` (servidor). ✓
- `servicios.js`: `doAdminStep1` todavía usa `CREDS.find(...)` (cliente). ✗
- `organigrama.js`: `doOrgStep1` todavía usa `ORG_ADMIN_CREDS.find(...)` (cliente). ✗
- Todos los archivos listados contienen arrays con credenciales reales en texto plano (`GDS1949`). ✗

**H-01 no puede considerarse resuelto mientras existan credenciales reales en archivos públicos**, incluso si ya no son la fuente principal de autenticación.

---

## D. Estado de H-02

**RESUELTO.**

- `app/config/config.php`: sin valor por defecto para `ADMIN_TOKEN`. ✓
- `requireAdmin()`: usa `$_SESSION['gds_admin']` y `hash_equals` no aplica (sesión). ✓
- Token ya no se acepta por POST body. ✓
- `public/config.php`: secretos neutralizados. ✓
- `config/gds.php`: fuera de `public/`. ✓

---

## E. Validación de autenticación

| Aspecto | Estado | Evidencia |
|---|---|---|
| Validación en servidor | ✓ | `admin_login` usa `password_verify()` contra `ADMIN_PASSWORD_HASH` |
| Sin credenciales en texto plano en servidor | ✓ | Hash en `config/gds.php` |
| Credenciales aún en JS público | ✗ | `INSC_ADMIN_CREDS`, `NOT_ADMIN_CREDS`, `ORG_ADMIN_CREDS`, `CREDS` |
| `sessionStorage` como autoridad | Parcial | Se usa como indicador visual, pero `adminCheckAuth` consulta servidor |
| Mecanismos antiguos funcionales | Parcial | `servicios.js` y `organigrama.js` siguen validando localmente |

---

## F. Validación de sesiones

| Aspecto | Estado | Evidencia |
|---|---|---|
| `session_start()` | ✓ | Líneas 10-22 de `api.php`, antes de headers |
| Cookie HttpOnly | ✓ | `httponly => true` |
| Cookie Secure | ✓ condicionado | Solo si HTTPS detectado |
| Cookie SameSite | ✓ | `Lax` |
| Regeneración de ID | ✓ | `session_regenerate_id(true)` en `admin_login` |
| Destrucción al logout | ✓ | `session_destroy()` + invalidación de cookie |
| Validación en endpoints | ✓ | `requireAdmin()` verifica `$_SESSION['gds_admin']` |
| Expiración | No configurada explícitamente | `session.gc_maxlifetime` por defecto del servidor |

---

## G. Validación de cookies

| Parámetro | Valor | Observación |
|---|---|---|
| HttpOnly | true | ✓ |
| Secure | true solo en HTTPS | Correcto; en desarrollo (HTTP) la cookie se envía sin Secure |
| SameSite | Lax | Mitiga CSRF cross-site en POST, pero no es suficiente solo |
| Path | / | Aceptable |
| Domain | '' (vacío) | Correcto (host actual) |
| Lifetime | 0 (sesión) | ✓ |

**Riesgo:** Detección de HTTPS mediante `$_SERVER['HTTPS']` puede fallar detrás de un proxy reverso (cPanel). En ese caso, `Secure` se desactiva y la cookie viaja sin cifrado. Recomendación: verificar `X-Forwarded-Proto` si el hosting usa proxy.

---

## H. Evaluación CSRF

**RIESGO REINTRODUCIDO (parcialmente mitigado).**

- La autenticación ahora usa cookies de sesión → CSRF clásico es posible.
- `SameSite=Lax` bloquea POST cross-site en navegadores modernos, pero no protege contra ataques same-site o navegadores antiguos.
- No existe token CSRF.
- Los endpoints administrativos son POST y modifican datos.

**Mitigación actual:** SameSite=Lax + origen CORS restringido en producción.

**Recomendación (fase posterior):** Implementar tokens CSRF o validar `Origin`/`Referer` en el servidor.

---

## I. Tabla de endpoints administrativos

| Endpoint | Método | Requiere auth | Validación | Resultado |
|---|---|---|---|---|
| admin_login | POST | No (es login) | Credenciales + hash | ✓ |
| admin_logout | POST | No (destruye) | Destruye sesión | ✓ |
| admin_session | GET | No (status) | Devuelve estado | ✓ |
| admin_noticias_save/delete | POST | Sí | `requireAdmin()` | ✓ |
| admin_convenios_save/delete | POST | Sí | `requireAdmin()` | ✓ |
| admin_organigrama_save/delete | POST | Sí | `requireAdmin()` | ✓ |
| admin_popup_save/delete | POST | Sí | `requireAdmin()` | ✓ |
| admin_horario_save/celda | POST | Sí | `requireAdmin()` | ✓ |
| admin_utiles_save | POST | Sí | `requireAdmin()` | ✓ |
| admin_servicio_save | POST | Sí | `requireAdmin()` | ✓ |
| admin_descuento_save | POST | Sí | `requireAdmin()` | ✓ |
| admin_periodico_save/delete | POST | Sí | `requireAdmin()` | ✓ |
| admin_documento_save/delete | POST | Sí | `requireAdmin()` | ✓ |
| admin_promocion_save/delete | POST | Sí | `requireAdmin()` | ✓ |
| admin_inscripcion_estado | POST | Sí | `requireAdmin()` | ✓ |
| admin_colaborador_estado | POST | Sí | `requireAdmin()` | ✓ |
| admin_inscripciones | GET | Sí | `requireAdmin()` | ✓ |
| admin_colaboradores | GET | Sí | `requireAdmin()` | ✓ |

Todos los endpoints administrativos de escritura y lectura están protegidos. ✓

---

## J. Credenciales o datos sensibles aún expuestos

| Archivo | Dato expuesto | Estado |
|---|---|---|
| `public/js/pages/servicios.js` | `CREDS` array con email+pass | **Expuesto (usado)** |
| `public/js/pages/organigrama.js` | `ORG_ADMIN_CREDS` array | **Expuesto (usado)** |
| `public/js/pages/noticias.js` | `NOT_ADMIN_CREDS` array | Expuesto (no usado en auth actual) |
| `public/js/pages/inscripciones.js` | `INSC_ADMIN_CREDS` array | Expuesto (no usado en auth actual) |
| `public/index.html` | `ADMIN_CREDENTIALS` array | Expuesto (no usado en auth actual) |

---

## K. Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| `php -l public/api.php` | Sin errores |
| `node --check` (gds-api.js, inscripciones.js, noticias.js) | Sin errores |
| Inspección de credenciales en JS | Confirmado: 5 archivos con credenciales |
| Inspección de session_start y cookies | Correcto |
| Verificación de guardián central | Correcto (excluye admin_login/logout/session) |

## L. Riesgos encontrados

1. **H-01 incompleto:** Credenciales en texto plano en 5 archivos públicos; 2 módulos siguen autenticando localmente.
2. **Dependencia de BD:** Endpoints de auth requieren `getDB()` (sin BD, fallan).
3. **CSRF:** Sin token CSRF; mitigado parcialmente por SameSite=Lax.
4. **Detección de HTTPS:** Puede fallar detrás de proxy.
5. **Expiración de sesión:** No configurada explícitamente (default del servidor).

## M. Correcciones recomendadas (prioridad)

1. Eliminar arrays de credenciales de todos los archivos JS públicos.
2. Migrar `servicios.js` y `organigrama.js` a `GDS.admin.login()`.
3. Hacer que los endpoints de auth no dependan de `getDB()` (o manejar la conexión de forma lazy).
4. Implementar tokens CSRF o validación de `Origin`.
5. Configurar expiración de sesión explícita.

## N. Pruebas pendientes

- Flujo completo de login/logout con credenciales configuradas (requiere `config/gds.php` con hash).
- Prueba de session fixation y reutilización.
- Prueba de CSRF cross-site.
- Prueba en staging con HTTPS.

---

## O. Conclusión

**Aprobado con observaciones.**

La arquitectura de sesiones PHP es correcta y los endpoints administrativos están protegidos. Sin embargo, H-01 no puede considerarse resuelto mientras existan credenciales reales en archivos públicos de JavaScript y dos módulos sigan autenticando en el cliente.

**No se modificó ningún archivo. Detenido, esperando autorización explícita.**