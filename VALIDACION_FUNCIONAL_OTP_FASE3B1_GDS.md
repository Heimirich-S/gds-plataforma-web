# Validación funcional del backend OTP — Fase 3B.1 GDS

| Campo | Valor |
|---|---|
| Fecha | 03/11/2026 |
| Tipo | Validación (solo lectura, sin modificar código) |
| Entorno | Local (XAMPP, PHP 8.4.27, MariaDB) |
| Resultado general | **Bloqueado** (no se pudieron ejecutar pruebas funcionales) |

---

## A. Resumen ejecutivo

La implementación del backend OTP (Etapa 3B) es **correcta por inspección estática**: el flujo de pre-autenticación, generación de OTP hasheado, verificación con `password_verify()`, límites de intentos y reenvíos, y la separación de sesión administrativa están bien implementados.

Sin embargo, **no fue posible ejecutar las pruebas funcionales** porque:
1. No existen credenciales de prueba configuradas (y no se inventaron).
2. El envío de correo real está prohibido sin autorización.
3. No existe un mecanismo de inyección de dependencias para sustituir `Mailer` sin modificar `api.php`.
4. No hay framework de pruebas (PHPUnit) instalado.

**Recomendación:** Aprobar la implementación por inspección estática, pero marcar las pruebas funcionales como bloqueadas hasta disponer de un entorno de pruebas con credenciales y un mecanismo de mock.

---

## B. Archivos inspeccionados

- `public/api.php` (completo, 785 líneas)
- `app/services/Mailer.php`
- `app/config/config.php`
- `config/gds.php`
- `public/gds-api.js`
- `composer.json`, `composer.lock`

---

## C. Archivos modificados

**Ninguno.** Esta etapa fue exclusivamente de inspección y validación.

---

## D. Matriz de pruebas

| Caso | Resultado | Evidencia | Observaciones |
|---|---|---|---|
| Login incorrecto | **NOT RUN** | Código inspeccionado | Requiere credenciales de prueba |
| Preautenticación | **NOT RUN** | Código inspeccionado | Requiere login funcional |
| OTP correcto | **NOT RUN** | Código inspeccionado | Requiere pre-auth + código |
| OTP incorrecto | **NOT RUN** | Código inspeccionado | Requiere pre-auth |
| OTP vencido | **NOT RUN** | Código inspeccionado | Requiere pre-auth + manipulación de tiempo |
| Reutilización OTP | **NOT RUN** | Código inspeccionado | Requiere pre-auth + código correcto |
| Límite de intentos | **NOT RUN** | Código inspeccionado | Requiere pre-auth + 5 intentos fallidos |
| Reenvío (< 60s) | **NOT RUN** | Código inspeccionado | Requiere pre-auth |
| Reenvío (>= 60s) | **NOT RUN** | Código inspeccionado | Requiere pre-auth + tiempo |
| Máximo reenvíos (3) | **NOT RUN** | Código inspeccionado | Requiere pre-auth |
| CSRF ausente/inválido | **BLOCKED** | Inspección estática | Sin sesión activa no se puede probar |
| Fallo de correo | **BLOCKED** | Inspección estática | Requiere sustituir Mailer (no disponible sin modificar código) |
| Protección endpoints | **BLOCKED** | Inspección estática | Requiere sesión pre-auth o admin |
| Logout | **NOT RUN** | Código inspeccionado | Requiere sesión activa |
| Regeneración de ID | **NOT RUN** | Código inspeccionado | Requiere sesión activa |
| OTP no en respuestas | **PASS** (estático) | Inspección de `admin_login` | El código OTP no se incluye en la respuesta JSON |
| OTP no en logs | **PASS** (estático) | Inspección de `error_log` | Solo se registra el mensaje de error, no el código |
| Hash no devuelto | **PASS** (estático) | Inspección de `admin_login` | Solo se almacena en sesión, no se devuelve |

---

## E. Riesgos pendientes

1. **Límites de intentos por sesión (Medio):** Los contadores están en `$_SESSION`, lo que permite bypass al crear una nueva sesión. Para protección robusta se necesita almacenamiento persistente.
2. **Dependencia de MySQL (Medio):** Los endpoints de auth requieren `getDB()`. Sin BD, fallan con 500.
3. **OTP no verificado funcionalmente (Alto):** No se pudo probar el flujo completo por falta de credenciales y SMTP autorizado.
4. **No hay framework de pruebas (Bajo):** Sin PHPUnit, las pruebas deben hacerse manualmente.

---

## F. Compatibilidad y regresiones

- **Comprobado por inspección:** El flujo de login existente (password → OTP → session) se mantiene compatible con el frontend actual (que aún usa el flujo antiguo). El backend devuelve `otp_required: true` en lugar de `authenticated: true`, lo que requiere adaptación del frontend (Etapa 3C).
- **No comprobado:** Funcionamiento real con credenciales y SMTP.

---

## G. Recomendación

**Se puede continuar a la Etapa 3C (frontend) solo después de:**

1. Configurar credenciales admin (ya hecho: `admin_gds` + hash bcrypt).
2. Disponer de un entorno de pruebas con MariaDB encendido.
3. Autorizar el envío de correos de prueba (o implementar un mock de Mailer mediante inyección de dependencias).

**Problema de diseño identificado:** `admin_login` instancia `Mailer::fromConfig()` directamente (acoplamiento). Para permitir pruebas aisladas sin modificar código productivo, se recomienda (en una etapa futura) inyectar el Mailer como dependencia o usar una interfaz. Esto requiere autorización.

**No se implementaron correcciones. No se modificó ningún archivo. Detenido, esperando autorización explícita.**