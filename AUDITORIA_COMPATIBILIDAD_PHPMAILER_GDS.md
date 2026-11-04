# Auditoría de compatibilidad: PHPMailer + SMTP — GDS

| Campo | Valor |
|---|---|
| Fecha | 31/10/2026 |
| Tipo | Auditoría de solo lectura |
| Archivos modificados | Ninguno |

---

## 1. Entorno PHP detectado

- **Versión PHP:** 8.4.27 (CLI, XAMPP).
- **Ruta del ejecutable:** `C:\xampp\php\php.exe`.
- **Extensiones requeridas:**
  - `openssl`: OK
  - `mbstring`: OK
  - `filter`: OK
  - `json`: OK
- **Composer:** Disponible (versión 2.10.3, instalado en `C:\ProgramData\ComposerSetup\bin\composer`).

## 2. Estado de Composer

- **`composer.json`:** No existe en el proyecto.
- **`composer.lock`:** No existe.
- **`vendor/`:** No existe.
- **Dependencias actuales:** Ninguna gestionada por Composer (el proyecto no usa Composer).

## 3. Estado de PHPMailer

- **PHPMailer:** No instalado (no se encontró en el proyecto).
- **Conflictos de versiones:** No aplicable (no hay dependencias existentes).

## 4. Arquitectura actual relevante

- **Configuración privada:** `app/config/config.php` (fuera de `public/`), carga `config/gds.php`.
- **Inicialización PHP:** `public/api.php` requiere `app/config/config.php`, inicia sesión, ejecuta guardián central.
- **Sesiones:** `session_start()` con cookie HttpOnly/Secure/SameSite=Lax.
- **CSRF:** Token en sesión, validado con `hash_equals()`.
- **Organización de `api.php`:** Endpoints por `switch($action)` con guardián por prefijo `admin_`.
- **Gestión de errores:** Respuestas JSON con `ok()`/`err()`.

## 5. Ubicación recomendada para la integración

- Crear `composer.json` en la raíz del proyecto.
- Instalar PHPMailer en `vendor/` (fuera de `public/`).
- Añadir carga de autoload en `app/config/config.php` (`require __DIR__ . '/../../vendor/autoload.php'`).
- Almacenar credenciales SMTP en `config/gds.php` (fuera de `public/`), siguiendo el patrón existente de `gds_secreto()`.
- Crear un servicio de correo en `app/services/` (nuevo directorio) para encapsular PHPMailer.

## 6. Riesgos y posibles incompatibilidades

1. **No hay Composer actualmente:** Introducir Composer cambia el flujo de despliegue (hay que subir `vendor/` o ejecutar `composer install` en el hosting).
2. **Hosting compartido:** cPanel puede tener restricciones de `exec()` para Composer. Verificar si el hosting permite ejecutar Composer o si se debe subir `vendor/` manualmente.
3. **Límite de 100 correos/hora:** El OTP se envía solo en login admin (bajo volumen), así que no es un problema.
4. **PHP `mail()` habilitado pero no recomendado:** PHPMailer con SMTP es la opción correcta.

## 7. Plan de implementación recomendado por etapas

### Etapa 1 — Preparación (sin código)
- Verificar que el hosting permite subir `vendor/` o ejecutar Composer.
- Obtener credenciales SMTP del hosting.

### Etapa 2 — Instalación local
- Crear `composer.json` con `phpmailer/phpmailer`.
- Ejecutar `composer install` en local.
- Verificar autoload.

### Etapa 3 — Configuración
- Añadir claves SMTP a `config/gds.php`.
- Actualizar `app/config/config.php` para leerlas con `gds_secreto()`.

### Etapa 4 — Servicio de correo
- Crear `app/services/Mailer.php` encapsulando PHPMailer.
- Implementar envío de OTP.

### Etapa 5 — Integración con auth
- Modificar `admin_login` para generar OTP y enviar correo.
- Crear endpoint `admin_verify_otp`.
- Adaptar frontend.

### Etapa 6 — Pruebas
- Probar envío en local (con SMTP real o Mailtrap).
- Probar en staging.
- Verificar deliverability.

## 8. Archivos que probablemente necesitarían modificarse

- `composer.json` (nuevo)
- `app/config/config.php` (cargar autoload + leer SMTP)
- `config/gds.php` (añadir claves SMTP)
- `public/api.php` (integrar envío de OTP y nuevo endpoint)
- `public/gds-api.js` (agregar `verifyOtp`)
- Archivos JS de login (5 módulos)
- `app/services/Mailer.php` (nuevo)

---

## Conclusión

El entorno local está **preparado** para PHPMailer (PHP 8.4, extensiones OK, Composer disponible). El proyecto actualmente **no usa Composer ni PHPMailer**. La integración es viable pero requiere introducir Composer al flujo de despliegue.

**No se modificó ningún archivo ni se instaló ninguna dependencia. Esperando autorización explícita.**