# Etapa 3A — Auditoría y diseño de autenticación OTP segura — GDS

| Campo | Valor |
|---|---|
| Fecha | 31/10/2026 |
| Tipo | Auditoría y diseño (solo lectura) |
| Archivos modificados | Ninguno |

---

## 1. Arquitectura actual de autenticación

- **Fuente de credenciales:** `config/gds.php` (fuera de `public/`), leída por `app/config/config.php` mediante `gds_secreto()`. Constantes: `ADMIN_USER`, `ADMIN_PASSWORD_HASH`.
- **Validación:** `password_verify()` en `admin_login` (api.php).
- **Sesión:** `$_SESSION['gds_admin']` establecida en `admin_login` (línea 426), **antes** del OTP.
- **CSRF:** Token en sesión, validado con `hash_equals()`.
- **OTP actual:** Generado en JS con `Math.random()`, enviado por EmailJS (client-side), verificado en JS. No interviene el servidor.
- **Endpoints admin:** Protegidos por `requireAdmin()` (verifica `$_SESSION['gds_admin']`).

## 2. Archivos y funciones responsables

| Componente | Archivo | Función/Sección |
|---|---|---|
| Validación de credenciales | `public/api.php` | `admin_login` (líneas 416-428) |
| Verificación de sesión | `public/api.php` | `requireAdmin()` (líneas 68-71) |
| Estado de sesión | `public/api.php` | `admin_session` (línea 122) |
| Cierre de sesión | `public/api.php` | `admin_logout` (líneas 430-437) |
| Cliente HTTP | `public/gds-api.js` | `GDS.admin.login/logout/session` |
| Flujo de login (5 módulos) | `index.html`, `inscripciones.js`, `noticias.js`, `organigrama.js`, `servicios.js` | `doXStep1()`, `doXStep2()` |
| Configuración privada | `app/config/config.php`, `config/gds.php` | `gds_secreto()` |
| Servicio de correo | `app/services/Mailer.php` | `Mailer::fromConfig()`, `prepareMessage()`, `send()` |

## 3. Flujo actual de login (paso a paso)

1. Usuario ingresa email + contraseña en el modal.
2. Frontend llama a `GDS.admin.login(user, pass)` → POST `admin_login`.
3. Servidor valida con `password_verify()`.
4. **Servidor establece `$_SESSION['gds_admin'] = true`** (sin OTP).
5. Servidor devuelve `{ authenticated: true }`.
6. Frontend genera OTP con `Math.random()` y lo envía por EmailJS (client-side).
7. Usuario ingresa OTP en el navegador.
8. Frontend compara `input !== _otp` (client-side).
9. Si coincide, abre el panel.

## 4. Vulnerabilidades y riesgos (clasificados)

| # | Hallazgo | Gravedad | Estado |
|---|---|---|---|
| 1 | OTP solo client-side; servidor concede sesión antes del OTP | **Crítico** | Confirmado |
| 2 | OTP generado con `Math.random()` (no criptográfico) | **Alto** | Confirmado |
| 3 | Claves EmailJS expuestas en JS público | **Medio** | Confirmado (spam abuse) |
| 4 | No hay límite de intentos en el servidor | **Medio** | Confirmado |
| 5 | No hay expiración del OTP en el servidor | **Medio** | Confirmado |

## 5. Endpoints que conceden/comprueban permisos

| Endpoint | Método | Protección actual |
|---|---|---|
| `admin_login` | POST | Credenciales + `session_regenerate_id` |
| `admin_session` | GET | Devuelve estado de sesión |
| `admin_logout` | POST | Sesión + CSRF |
| `admin_*` (23 endpoints) | Varios | `requireAdmin()` + CSRF (POST) |

## 6. Obtención segura del correo del administrador

Actualmente el correo OTP está hardcodeado en JS (`gimnasiodomingosavio3@gmail.com`). Para un OTP seguro:

- **Opción A (recomendada):** Añadir `ADMIN_EMAIL` a `config/gds.php` (fuera de `public/`), leído con `gds_secreto()`.
- **Opción B:** Leer de `config_sistema.admin_emails` en la BD (solo lectura, requiere conexión a MySQL).

Recomendación: Opción A (consistente con el patrón existente, sin dependencia de BD).

## 7. Integración de `Mailer.php` sin acoplar al frontend

El servicio `Mailer` ya existe y es independiente. Para el OTP:

1. `admin_login` valida credenciales → genera OTP en el servidor → llama a `Mailer::fromConfig()` → `prepareMessage()` → `send()`.
2. El frontend nunca conoce el código.
3. `admin_verify_otp` valida el código y concede la sesión.

El frontend solo envía `{ user, pass }` y luego `{ code }`. No necesita saber cómo se envía el correo.

## 8. Diseño propuesto del nuevo flujo OTP

### Flujo (sin base de datos, todo en `$_SESSION`)

1. **Paso 1 — Validación de contraseña:**
   - Frontend envía `{ user, pass }` a `admin_login`.
   - Servidor valida con `password_verify()`.
   - Si correcto: genera OTP con `random_int(100000, 999999)`, almacena `hash('sha256', $otp)` en `$_SESSION['gds_otp_hash']`, expiración (`$_SESSION['gds_otp_expiry'] = time() + 600`), intentos (`$_SESSION['gds_otp_attempts'] = 0`), bloqueo (`$_SESSION['gds_otp_blocked_until'] = 0`).
   - **No** establece `$_SESSION['gds_admin']`.
   - Regenera ID de sesión.
   - Envía el OTP por correo (Mailer).
   - Respuesta: `{ authenticated: false, otp_required: true }`.

2. **Paso 2 — Verificación del OTP:**
   - Frontend envía `{ code }` a `admin_verify_otp`.
   - Servidor verifica:
     - Existe `$_SESSION['gds_otp_hash']` (hay pre-auth pendiente).
     - No ha expirado (`time() < $_SESSION['gds_otp_expiry']`).
     - No está bloqueado (`time() > $_SESSION['gds_otp_blocked_until']`).
     - Intentos < 5.
     - `hash_equals($_SESSION['gds_otp_hash'], hash('sha256', $code))`.
   - Si correcto: `$_SESSION['gds_admin'] = true`, limpiar datos OTP, regenerar ID, devolver `{ authenticated: true }`.
   - Si incorrecto: incrementar intentos; si ≥5, bloquear 10 min; devolver 401.

3. **Logout:** destruir sesión (ya implementado).

### Endpoints nuevos
- `admin_verify_otp` (POST) — valida el OTP.

### Endpoints modificados
- `admin_login` — generar OTP, enviar correo, devolver `otp_required`.
- `admin_session` — devolver `authenticated` y `otp_pending` (si hay pre-auth sin completar).

---

## 9. Archivos que probablemente necesitarían modificarse

| Etapa | Archivos |
|---|---|
| Backend | `public/api.php` (admin_login, admin_verify_otp, admin_session) |
| Frontend | `public/gds-api.js` (agregar `verifyOtp`) |
| Frontend | `public/index.html`, `inscripciones.js`, `noticias.js`, `organigrama.js`, `servicios.js` (adaptar flujo) |
| Config | `config/gds.php` (añadir `ADMIN_EMAIL` o usar existente) |
| Servicio | `app/services/Mailer.php` (ya listo, no requiere cambios) |

## 10. Pruebas necesarias

1. `admin_login` con credenciales válidas → `otp_required: true`, sin `gds_admin` en sesión.
2. Llamar a endpoint admin sin verificar OTP → 401.
3. `admin_verify_otp` con código correcto → `authenticated: true`.
4. `admin_verify_otp` con código incorrecto → 401, intentos incrementados.
5. 5 intentos fallidos → bloqueo 10 min.
6. OTP expirado → 401.
7. OTP de otra sesión → rechazado.
8. Verificar que el código OTP nunca aparece en respuestas HTTP ni en el frontend.
9. Verificar regeneración de ID tras ambos factores.

---

## 11. Riesgos de compatibilidad

1. **Flujo de login cambia:** El frontend debe manejar `otp_required` y mostrar campo de OTP antes de conceder acceso.
2. **EmailJS deja de usarse para OTP:** Las claves expuestas quedan inertes (no es un riesgo de seguridad).
3. **Deliverability de `mail()`:** Se usa `Mailer.php` con SMTP (ya probado), así que no hay riesgo.
4. **Compatibilidad PHP 8.2/8.4:** `random_int()`, `password_hash()`, `hash_equals()` disponibles en ambas versiones.

---

## 12. Plan de implementación por etapas (propuesta)

### Etapa 3B — Backend (sin frontend)
- Modificar `admin_login` para generar OTP y devolver `otp_required`.
- Crear endpoint `admin_verify_otp`.
- Modificar `admin_session` para devolver `otp_pending`.
- Probar con curl/Postman.

### Etapa 3C — Frontend
- Adaptar los 5 módulos de login para manejar `otp_required`.
- Eliminar generación client-side de OTP y EmailJS.
- Mostrar campo de OTP y enviarlo a `admin_verify_otp`.

### Etapa 3D — Pruebas
- Ejecutar las 9 pruebas listadas en la sección 10.

---

**No se implementó nada. Esperando autorización explícita para proceder con la Etapa 3B.**