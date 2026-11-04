# Diagnóstico de arquitectura OTP (2FA) — GDS

| Campo | Valor |
|---|---|
| Fecha | 31/10/2026 |
| Tipo | Inspección de solo lectura |

---

## 1. Arquitectura OTP actual

### Generación del código
- **Dónde:** En el navegador (JavaScript), mediante `Math.floor(100000 + Math.random() * 900000)` (6 dígitos).
- **Quién lo conoce:** El navegador (variable en memoria `_otp`, `_inscOtp`, `_notOtp`, `_orgOtp`, `otp`).
- **Almacenamiento:** Solo en memoria del navegador (variable JS). No se envía al servidor.

### Envío por correo
- **Mecanismo:** EmailJS SDK v4 (client-side), llamado desde el navegador.
- **Claves expuestas en JS:** Service ID (`service_dapdvr6`), Template ID (`template_0rtnkuc`), Public Key (`A8_-VTv06yO5YWU7-`).
- **Destinatario:** Fijo (`gimnasiodomingosavio3@gmail.com`).
- **El código se envía al EmailJS como parámetro `otp_code`** en la plantilla.

### Comparación del código
- **Dónde:** Exclusivamente en el navegador (`input !== _otp`).
- **El servidor no participa** en la verificación del OTP.

### Respuesta de PHP
- `admin_login` devuelve `{ authenticated: true }` **antes** del OTP.
- El servidor no sabe que existe un OTP ni lo verifica.

### ¿Se puede completar el login sin OTP?
**Sí.** Llamando directamente a `api.php?action=admin_login` con credenciales válidas, se obtiene una sesión administrativa completa sin pasar por el OTP.

---

## 2. Vulnerabilidad demostrada

**El OTP no es un segundo factor de autenticación real.** Es un control de interfaz del lado del cliente:

- El código se genera en el navegador (con `Math.random()`, no criptográficamente seguro).
- La verificación es client-side (comparación de strings).
- El servidor concede la sesión completa (`$_SESSION['gds_admin'] = true`) en el paso de contraseña, antes del OTP.
- Un atacante con las credenciales puede llamar a la API directamente y obtener acceso total sin OTP.
- Las claves de EmailJS (service ID, template ID, public key) están expuestas en el código público, lo que permite abuso del servicio de correo (spam).

---

## 3. Arquitectura segura recomendada

### Flujo propuesto (sin base de datos)

1. **Paso 1 — Validación de contraseña:**
   - Frontend envía `{ user, pass }` a `admin_login`.
   - Servidor valida con `password_verify()`.
   - Si es correcto, el servidor genera un OTP criptográfico (`random_bytes(3)`, 6 dígitos) y lo almacena **hasheado** en la sesión (`$_SESSION['gds_otp_hash']`, `$_SESSION['gds_otp_expiry']`, `$_SESSION['gds_otp_attempts'] = 0`).
   - **No** se establece `$_SESSION['gds_admin'] = true`.
   - Se regenera el ID de sesión.
   - Respuesta: `{ authenticated: false, otp_required: true }`.

2. **Paso 2 — Envío del OTP:**
   - El servidor envía el código por correo usando un servicio de backend (PHP `mail()` o SMTP con PHPMailer), **no** EmailJS.
   - El código **nunca** se envía al frontend.

3. **Paso 3 — Verificación del OTP:**
   - Frontend envía el código introducido a `admin_verify_otp`.
   - Servidor verifica: `hash_equals($_SESSION['gds_otp_hash'], hash('sha256', $codigo))`, expiración (ej. 10 min), intentos (< 5).
   - Si es correcto: `$_SESSION['gds_admin'] = true`, limpiar datos OTP, regenerar ID de sesión, devolver `{ authenticated: true }`.
   - Si falla: incrementar intentos, devolver 401.

### Almacenamiento temporal (sin BD)
- Todo en `$_SESSION`: hash del OTP, expiración, contador de intentos, bloqueo temporal.

---

## 4. EmailJS

**EmailJS no permite enviar un código generado por PHP de forma segura con la arquitectura actual.**

- EmailJS es un SDK **client-side**. El código se genera en el navegador y se envía como parámetro a la plantilla. Las claves (service ID, template ID, public key) son públicas por diseño.
- No hay forma de que el servidor genere el código y lo envíe por EmailJS sin exponerlo al navegador primero (porque el navegador es quien llama a `emailjs.send()`).
- **Conclusión:** Para un OTP real, el envío del correo debe hacerse desde el backend.

### Alternativas para el envío de correo desde PHP

1. **`mail()` nativo de PHP** — disponible en XAMPP y cPanel. Limitado en deliverability (puede ir a spam).
2. **PHPMailer + SMTP** — más robusto, pero requiere instalar una dependencia (composer). Fuera del alcance actual sin autorización.
3. **Servicio de correo vía API REST** (SendGrid, Mailgun, etc.) — requiere cuenta y clave API. Fuera del alcance actual.

**Recomendación:** Usar `mail()` nativo para la implementación inicial (sin dependencias), y migrar a SMTP/API si la deliverability es insuficiente.

---

## 5. Compatibilidad y alcance

### ¿Se puede implementar sin modificar la base de datos?

**Sí.** Todo el estado temporal (OTP hash, expiración, intentos, bloqueo) se almacena en `$_SESSION`. No se requieren tablas nuevas.

### Cambios necesarios

| Componente | Cambio |
|---|---|
| `public/api.php` | Modificar `admin_login` para generar OTP y devolver `otp_required`. Crear nuevo endpoint `admin_verify_otp`. Establecer `$_SESSION['gds_admin']` solo tras verificar OTP. |
| `public/gds-api.js` | Agregar `GDS.admin.verifyOtp(code)`. Modificar flujo de login para manejar `otp_required`. |
| `public/index.html`, `inscripciones.js`, `noticias.js`, `organigrama.js`, `servicios.js` | Adaptar el flujo de login: paso 1 (password) → paso 2 (OTP server-side) → verificación. Eliminar generación client-side de OTP. Eliminar EmailJS. |
| `app/config/config.php` | Opcional: añadir configuración de correo (remitente, etc.) si se usa `mail()`. |
| Plantillas EmailJS | Ya no se usarían (el correo se envía desde PHP). |

---

## 6. Riesgos de compatibilidad

1. **EmailJS dejaría de usarse** para el OTP. Las claves expuestas en JS quedarían inertes (no son un riesgo de seguridad, pero sí de spam si alguien las usa).
2. **Deliverability de `mail()`** puede ser baja en hosting compartido (spam). Requiere prueba en staging.
3. **El flujo de login cambia**: dos pasos en el servidor en lugar de uno. El frontend debe manejar el estado intermedio (`otp_required`).
4. **Compatibilidad con PHP 8.2/8.4:** `random_bytes()`, `password_hash()`, `hash_equals()` disponibles en ambas versiones. Sin problemas.

---

## 7. Plan de implementación por etapas

### Etapa 1 — Backend (sin frontend)
- Modificar `admin_login` para generar OTP y devolver `otp_required`.
- Crear endpoint `admin_verify_otp`.
- Probar con `curl`/Postman.

### Etapa 2 — Frontend
- Adaptar los 5 módulos de login para manejar `otp_required`.
- Eliminar generación client-side de OTP.
- Eliminar llamadas a EmailJS.
- Mostrar campo de OTP y enviarlo a `admin_verify_otp`.

### Etapa 3 — Envío de correo
- Implementar envío con `mail()` nativo de PHP.
- Probar deliverability en local y staging.

### Etapa 4 — Pruebas
- Login con password correcta → OTP requerido → sin sesión admin.
- Login con OTP correcto → sesión creada.
- Login con OTP incorrecto → rechazado.
- Intentos excesivos → bloqueo.
- Expiración → rechazado.

---

## 8. Pruebas de seguridad necesarias

1. Llamar a `admin_login` con credenciales válidas → verificar que `$_SESSION['gds_admin']` NO está establecido.
2. Llamar a `admin_verify_otp` sin OTP previo → rechazado.
3. Llamar a `admin_verify_otp` con OTP incorrecto 5 veces → bloqueo.
4. Llamar a `admin_verify_otp` con OTP expirado → rechazado.
5. Llamar a `admin_verify_otp` con OTP de otra sesión → rechazado.
6. Verificar que el código OTP nunca aparece en respuestas HTTP ni en el frontend.
7. Verificar que `session_regenerate_id(true)` se ejecuta tras ambos factores.

---

**No se implementó nada. Esperando autorización explícita.**