# Verificación de regeneración de identificador de sesión — GDS

| Campo | Valor |
|---|---|
| Fecha | 31/10/2026 |
| Tipo | Auditoría de solo lectura |

---

## 1. Dónde se ejecuta `session_regenerate_id()`

**Archivo:** `public/api.php`, línea 425, dentro del case `admin_login`.

## 2. Momento exacto de ejecución

Se ejecuta **después** de validar el usuario y la contraseña (`hash_equals` + `password_verify`), pero **antes** de verificar el OTP (que es un proceso exclusivamente del lado del cliente, vía EmailJS).

Flujo real:
1. Frontend envía `{ user, pass }` a `admin_login`.
2. Servidor valida credenciales.
3. **`session_regenerate_id(true)`** se ejecuta.
4. `$_SESSION['gds_admin'] = true` se establece.
5. Se devuelve `{ authenticated: true }`.
6. El frontend genera un OTP y lo envía por EmailJS.
7. El usuario ingresa el OTP en el navegador (verificación client-side).
8. Si coincide, se abre el panel.

## 3. ¿Antes o después del OTP?

**Antes del OTP.** La sesión administrativa se crea y regenera en el servidor en el momento de la validación de la contraseña, sin esperar la verificación del código OTP. El OTP es un mecanismo exclusivamente del lado del cliente que no interviene en la creación ni en la regeneración de la sesión del servidor.

## 4. ¿Utiliza `session_regenerate_id(true)`?

**Sí.** Se llama con el parámetro `true`, lo que elimina el archivo de sesión anterior (prevención de session fixation).

## 5. ¿La implementación es correcta para el flujo actual?

**Parcialmente correcta, con una observación de seguridad.**

- La regeneración en sí (`session_regenerate_id(true)`) se ejecuta correctamente después de validar las credenciales, lo cual previene session fixation.
- **Sin embargo**, el estado de autenticación (`$_SESSION['gds_admin'] = true`) se establece en el servidor **antes** de verificar el OTP. Esto significa que el OTP no protege el servidor: cualquier persona con las credenciales puede llamar a `admin_login` directamente y obtener una sesión administrativa válida sin pasar por el OTP.
- El OTP es un segundo factor de autenticación únicamente en la interfaz del navegador, no en el servidor.

## 6. Otros puntos de regeneración

No se encontraron otras llamadas a `session_regenerate_id()` en el proyecto. Solo en `admin_login` (línea 425 de `api.php`).

---

## Cómo comprobarlo manualmente desde el navegador

1. Abrir las herramientas de desarrollador (F12 → Application → Cookies).
2. Anotar el valor de la cookie `PHPSESSID` antes del login.
3. Iniciar sesión con credenciales válidas.
4. Verificar que el valor de `PHPSESSID` cambió después del login (regeneración).
5. **No** compartir ni registrar el valor completo de la cookie.

**Nota:** La verificación funcional real requiere credenciales configuradas y un entorno con MariaDB disponible. La regeneración se confirmó por inspección estática del código; la prueba funcional real no se ejecutó en esta sesión.

---

## Conclusión

- **Regeneración por inspección:** Presente y correcta (`session_regenerate_id(true)` después de validar credenciales).
- **Problema identificado:** La sesión se crea y regenera **antes** de verificar el OTP. El OTP no protege el servidor.
- **Recomendación (fase posterior):** Mover la creación de la sesión administrativa al punto posterior a la verificación del OTP, o implementar el OTP como un segundo factor en el servidor.

**No se modificó ningún archivo. Detenido, esperando autorización.**