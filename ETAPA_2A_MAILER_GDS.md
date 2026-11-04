# Etapa 2A — Servicio independiente de correo (Mailer) GDS

| Campo | Valor |
|---|---|
| Fecha | 31/10/2026 |
| Archivo creado | `app/services/Mailer.php` |
| Archivos modificados | Ninguno |
| Resultado | **Completado** |

---

## 1. Responsabilidad del componente

`Mailer` encapsula PHPMailer y la configuración SMTP. Expone:
- `__construct(array $config)` — configura SMTP si hay datos válidos.
- `fromConfig()` — fabrica desde `gds_secreto()` (sin secretos en código).
- `isConfigured()` — indica si SMTP está configurado.
- `prepareMessage($to, $subject, $htmlBody, $textBody)` — prepara un mensaje (sin red).
- `send()` — disponible para etapa posterior; lanza excepción genérica sin exponer detalles SMTP.

## 2. Forma prevista de cargar el servicio

```php
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../services/Mailer.php';
$mailer = Mailer::fromConfig();
```

No se modificó `app/config/config.php` (autoload se carga explícitamente en el servicio).

## 3. Cómo obtiene la configuración privada

`fromConfig()` llama a `gds_secreto()` para las claves SMTP (si la función existe). Si faltan, el servicio queda no configurado (sin error fatal).

## 4. Medidas de seguridad aplicadas

- No se desactiva la verificación TLS.
- `SMTPAutoTLS` no se degrada.
- No se permite autenticación sin cifrado (solo ssl/tls/starttls).
- Validación de email del remitente y destinatario.
- Errores SMTP no se exponen (excepción genérica).
- No se aceptan credenciales desde el navegador.
- No hay credenciales en código.
- No se realiza ninguna conexión de red en esta etapa.

## 5. Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| `php -l app/services/Mailer.php` | Sin errores |
| Carga del autoload + clase Mailer | OK |
| `fromConfig()` sin SMTP configurado | `isConfigured() = false` (controlado) |
| `prepareMessage()` sin config | Lanza excepción (esperado) |
| Constructor vacío | `isConfigured() = false` |
| Conexión SMTP | No ejecutada (sin red) |

## 6. Confirmación

- **No hubo conexiones SMTP.** ✓
- **No se enviaron correos.** ✓
- **Login y OTP actuales intactos.** ✓
- **No se modificaron archivos fuera del alcance.** ✓

## 7. Riesgos o pendientes

- Las claves SMTP (`SMTP_HOST`, etc.) aún no se han añadido a `config/gds.php` (pendiente de autorización).
- `send()` está implementado pero no se invocará hasta la etapa de integración OTP.

---

**No se implementó OTP ni se modificó la autenticación. Esperando autorización para la siguiente etapa.**