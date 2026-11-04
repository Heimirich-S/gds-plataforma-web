# Etapa 3B — Backend de autenticación OTP segura — GDS

| Campo | Valor |
|---|---|
| Fecha | 31/10/2026 |
| Archivo modificado | `public/api.php` |
| Archivos no modificados | Frontend, CSS, BD, config, Mailer |
| Resultado | **Implementado (backend)** |

---

## 1. Archivos inspeccionados

- `public/api.php` (completo)
- `app/config/config.php`
- `config/gds.php`
- `app/services/Mailer.php`
- `storage/database/gds_database_final.sql` (estructura de `config_sistema`)

## 2. Archivos modificados

- `public/api.php` — `admin_login` reescrito; nuevos endpoints `admin_verify_otp` y `admin_resend_otp`; `admin_session` actualizado con `otp_pending`.

## 3. Descripción del nuevo flujo

### Paso 1 — Contraseña (`admin_login`)
1. Valida credenciales con `password_verify()`.
2. Si incorrectas → 401.
3. Si correctas: limpia pre-auth anterior, regenera ID de sesión.
4. Obtiene el correo del administrador desde `config_sistema.admin_emails` (primer email).
5. Genera OTP con `random_int(100000, 999999)`.
6. Almacena en sesión: `gds_otp_hash` (password_hash), `gds_otp_expiry` (5 min), `gds_otp_attempts` (0), `gds_otp_resends` (1), `gds_otp_last_send`, `gds_otp_blocked_until` (0), `gds_preauth` (true).
7. **No** establece `$_SESSION['gds_admin']`.
8. Envía el OTP por correo mediante `Mailer::fromConfig()`.
9. Si el envío falla → limpia pre-auth → 500.
10. Respuesta: `{ authenticated: false, otp_required: true }`.

### Paso 2 — Verificación OTP (`admin_verify_otp`)
1. Exige CSRF.
2. Verifica pre-auth válida, no expirada, no bloqueada.
3. Verifica intentos < 5.
4. Valida código con `password_verify()`.
5. Si incorrecto → incrementa intentos; si ≥5 → bloqueo 10 min; 401.
6. Si correcto → consume OTP (unset), regenera ID, establece `$_SESSION['gds_admin'] = true`, `gds_last_activity`.

### Reenvío (`admin_resend_otp`)
- Máximo 3 envíos por pre-auth.
- Espera mínima 60 segundos entre envíos.
- Cada reenvío invalida el código anterior.
- Bloqueo por intentos excesivos.

## 4. Separación pre-auth / auth completa

- `requireAdmin()` verifica `$_SESSION['gds_admin'] === true` → pre-auth no puede acceder a endpoints admin.
- `admin_session` devuelve `authenticated` (solo true si admin) y `otp_pending` (true durante pre-auth).

## 5. Obtención del destinatario

Se lee de `config_sistema.admin_emails` (primer email de la lista separada por comas). No se acepta del navegador.

## 6. Generación y protección del OTP

- `random_int(100000, 999999)` (6 dígitos).
- Almacenado con `password_hash()` en sesión.
- Verificado con `password_verify()`.
- Expiración: 5 minutos.
- Un solo uso (consumido tras verificación).
- Nunca se devuelve en respuestas API ni se registra en logs.

## 7. Expiración, intentos y reenvíos

- Expiración: 5 min.
- Intentos: máximo 5; bloqueo 10 min tras agotar.
- Reenvíos: máximo 3; espera mínima 60 s.

## 8. Endpoints protegidos

Todos los endpoints `admin_*` (excepto `admin_login`, `admin_logout`, `admin_session`, `admin_verify_otp`, `admin_resend_otp`) requieren `requireAdmin()` + CSRF (POST). La pre-auth no puede acceder.

## 9. Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| `php -l public/api.php` | Sin errores |
| `admin_login` con credenciales incorrectas | HTTP 401 (correcto) |
| `admin_session` sin auth | `authenticated: false`, `otp_pending: false` |
| `admin_verify_otp` sin pre-auth | HTTP 403 (CSRF/sesión) |
| `admin_session` devuelve `csrf_token` | ✓ |

## 10. Pruebas no ejecutadas

- Login con credenciales correctas (requiere enviar correo real → no autorizado en esta etapa).
- Verificación de OTP correcto/incorrecto (requiere pre-auth activa).
- Prueba de expiración, intentos y reenvíos.
- Regeneración de ID tras ambos factores.

## 11. Riesgos pendientes

1. **Almacenamiento en sesión:** Los límites de intentos/reenvíos están en `$_SESSION`, lo que permite bypass entre sesiones (nueva sesión = nuevos intentos). Para protección robusta se necesitaría almacenamiento persistente (tabla o archivo), que requiere autorización.
2. **Dependencia de MySQL:** Los endpoints de auth requieren `getDB()`.
3. **Entrega del correo:** Se usa `Mailer.php` con SMTP (probado en Etapa 2B.2).

## 12. Confirmación

- **Frontend no modificado.** ✓
- **Base de datos no modificada.** ✓
- **No se enviaron correos reales.** ✓
- **No se modificó `Mailer.php`.** ✓

---

**No se avanzó a la Etapa 3C. Detenido, esperando autorización explícita.**