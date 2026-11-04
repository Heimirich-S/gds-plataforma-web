# Diagnóstico de acceso administrativo — GDS

| Campo | Valor |
|---|---|
| Fecha | 31/10/2026 |
| Tipo | Inspección de solo lectura |

---

## 1. ¿Existe pantalla de inicio de sesión?

**Sí.** Existen formularios de login administrativo embebidos como modales (overlays) en varias páginas:

| Página | Overlay ID | Función de entrada |
|---|---|---|
| `public/index.html` | `adminLoginOverlay` | `adminCheckAuth()` |
| `public/inscripciones.html` | `adminLoginInsc` | `adminCheckAuthInsc()` |
| `public/servicios.html` | `adminLoginOverlay` | `adminCheckAuth()` |
| `public/organigrama.html` | `orgAdminLoginOverlay` | `adminCheckAuthOrg()` |
| `public/noticias.html` | `notAdminLoginOverlay` | `adminCheckAuth()` |

Cada formulario solicita email y contraseña, luego envía un código OTP por EmailJS.

## 2. ¿En qué archivo se encuentra?

No existe una página dedicada (ej. `login.html` o `admin.html`). El login es un **modal overlay** dentro de cada página pública. Se activa mediante un botón en la barra de navegación o un botón flotante.

## 3. ¿Existe conexión con `admin_login`?

**Sí.** El frontend llama a `GDS.admin.login(user, pass)` (definido en `public/gds-api.js`, línea 135), que envía una solicitud POST a `api.php?action=admin_login`. El backend valida con `password_verify()` contra `ADMIN_PASSWORD_HASH`.

Módulos que ya usan `GDS.admin.login()`:
- `index.html` (línea 2278)
- `inscripciones.js` (línea 191)
- `noticias.js` (línea 134)
- `organigrama.js` (línea 331)
- `servicios.js` (línea 130)

## 4. ¿Cómo se accede actualmente al panel?

1. El usuario visita una página pública (ej. `index.html`).
2. El script `gds-api.js` ejecuta `gdsDetectarModoAdmin()` al cargar la página, que consulta `api.php?action=ping` para verificar si `admin_habilitado` es `true`.
3. Si el panel está habilitado, aparece un botón en la barra de navegación (clase `gds-admin-entry`, visible solo si `data-gds-admin="on"` en `<html>`).
4. Al hacer clic, se ejecuta `adminCheckAuth()`, que consulta `GDS.admin.session()`:
   - Si hay sesión válida → abre el panel admin.
   - Si no → muestra el modal de login.
5. El usuario ingresa email y contraseña → se llama a `GDS.admin.login()`.
6. Si es correcto → se envía OTP por EmailJS → se verifica el código → se abre el panel.

## 5. ¿Qué componente falta para completar el flujo?

**Ninguno falta en el código.** El flujo está implementado. El motivo por el que no se encuentra la pantalla es probablemente uno de estos:

- El botón de acceso admin está oculto por CSS (`html:not([data-gds-admin="on"]) .gds-admin-entry { display: none !important; }`) cuando el panel está deshabilitado. Aunque `ADMIN_ENABLED` es `true` ahora, la detección se hace en `DOMContentLoaded` y puede haber un retraso.
- El usuario puede estar buscando una URL dedicada (ej. `/admin` o `/login`), pero no existe; el acceso es por botón en la navbar.
- Si `gdsDetectarModoAdmin()` falla (ej. sin conexión a la API), el modo queda en `off` y los botones no aparecen.

## 6. Archivos que habría que crear o modificar

**No es necesario crear ni modificar archivos.** El acceso ya existe. Para encontrarlo:

1. Abre `http://localhost/.../public/index.html` (o la URL de tu servidor).
2. Busca en la barra de navegación superior un botón con ícono de engranaje (⚙️) o texto "Panel de Administración".
3. Si no aparece, abre la consola del navegador (F12) y verifica:
   - Que `gdsDetectarModoAdmin()` haya ejecutado correctamente.
   - Que `document.documentElement.dataset.gdsAdmin` sea `"on"`.
   - Que no haya errores de red hacia `api.php?action=ping`.

### Solución alternativa: acceso directo por URL
Si el botón no aparece, puedes forzar la apertura del modal ejecutando en la consola del navegador:

```js
adminCheckAuth()
```

O en `inscripciones.html`:

```js
adminCheckAuthInsc()
```

### Si el problema persiste
Verifica que:
- `config/gds.php` tenga `GDS_ADMIN_ENABLED` en `'true'` y un token de ≥32 caracteres.
- El servidor PHP pueda leer `config/gds.php` (estructura de carpetas correcta).
- No haya errores en la consola del navegador.

---

**No se modificó ningún archivo. Diagnóstico completado. Esperando autorización.**