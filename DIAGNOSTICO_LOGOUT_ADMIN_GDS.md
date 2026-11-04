# Diagnóstico crítico: cierre de sesión administrativo no invalida la autenticación — GDS

| Campo | Valor |
|---|---|
| Fecha | 31/10/2026 |
| Tipo | Inspección de solo lectura |

---

## 1. Causa raíz demostrada

**El endpoint `admin_logout` requiere un token CSRF, pero el frontend no lo envía.**

Flujo real:

1. El usuario pulsa "Cerrar sesión".
2. Se ejecuta `adminLogout()` (o equivalente), que llama a `GDS.admin.logout()`.
3. `GDS.admin.logout()` invoca `gdsPost('admin_logout', {}, false)` con `isAdmin = false`.
4. Como `isAdmin` es `false`, **no se envía la cabecera `X-CSRF-Token`**.
5. En el servidor, `admin_logout` (líneas 105-109 de `api.php`) ejecuta `requireAdmin()` (pasa, hay sesión) y luego `requireCsrf()`.
6. `requireCsrf()` (líneas 72-76) no encuentra el token → responde **HTTP 403** "Token CSRF inválido o ausente".
7. El código PHP de `admin_logout` (líneas 430-437) **nunca se ejecuta**: no se limpia `$_SESSION`, no se destruye la sesión, no se invalida la cookie.
8. El frontend captura el error en `try { ... } catch(e) {}` y continúa: oculta el panel y limpia `sessionStorage`.
9. La sesión PHP permanece activa en el servidor. Al pulsar "Administrador", `admin_session` devuelve `authenticated: true` → el panel se reabre sin credenciales.

**Causa raíz confirmada:** Mismatch entre el requisito del backend (CSRF obligatorio para `admin_logout`) y el cliente (que no envía el token porque `isAdmin=false`).

---

## 2. Archivos y funciones implicados

| Archivo | Función | Rol |
|---|---|---|
| `public/api.php` | `admin_logout` (líneas 430-437) | Endpoint de cierre (nunca se ejecuta por 403) |
| `public/api.php` | `requireCsrf()` (líneas 72-76) | Bloquea por falta de token |
| `public/api.php` | Guardián central (líneas 105-109) | Aplica CSRF a `admin_logout` |
| `public/gds-api.js` | `GDS.admin.logout()` (línea 136) | Llama con `isAdmin=false` → sin CSRF |
| `public/index.html` | `adminLogout()` (líneas 2395-2400) | Captura error silenciosamente |
| `public/js/pages/inscripciones.js` | `adminLogoutInsc()` (líneas 274-281) | Idem |
| `public/js/pages/noticias.js` | `adminLogoutNoticias()` (líneas 167-178) | Idem |
| `public/js/pages/organigrama.js` | `adminLogoutOrg()` | Idem |
| `public/js/pages/servicios.js` | `window.adminLogout` | Idem |

---

## 3. Flujo real del logout

```
Botón "Cerrar sesión"
  → adminLogout() [JS]
    → await GDS.admin.logout()
      → gdsPost('admin_logout', {}, false)  [isAdmin=false → sin X-CSRF-Token]
        → POST api.php?action=admin_logout
          → Guardián central: requireAdmin() ✓ (hay sesión)
          → requireCsrf() ✗ (sin token) → HTTP 403
          → admin_logout case NUNCA se ejecuta
    → catch(e) {}  [error ignorado]
    → sessionStorage.removeItem('gds_admin')
    → cerrarAdminPanel()  [solo oculta]
```

**Resultado:** La sesión PHP nunca se destruye. El panel se oculta visualmente pero el servidor sigue considerando al usuario autenticado.

---

## 4. Configuración efectiva de cookies y sesiones

| Parámetro | Valor | Observación |
|---|---|---|
| `session_start()` | Líneas 10-22 de `api.php` | Correcto, antes de headers |
| `session_name()` | Default (`PHPSESSID`) | Sin nombre personalizado |
| Cookie path | `/` | Correcto |
| Cookie domain | '' (vacío) | Correcto (host actual) |
| Cookie secure | true solo en HTTPS | Correcto |
| Cookie httponly | true | Correcto |
| Cookie samesite | Lax | Correcto |
| `session_regenerate_id` | En login (true) | Correcto |
| Expiración inactividad | 30 min (`gds_last_activity`) | Correcto |

La configuración de cookies es correcta. El problema no está en las cookies.

---

## 5. Explicación de por qué el usuario continúa autenticado

1. `admin_logout` nunca se ejecuta porque `requireCsrf()` devuelve 403 antes de llegar al case.
2. La sesión PHP permanece intacta en el servidor.
3. `admin_session` sigue devolviendo `authenticated: true`.
4. `adminCheckAuth()` consulta `admin_session` → true → abre el panel sin credenciales.
5. El frontend ignora el error 403 (catch vacío) y solo oculta el panel, creando la ilusión de cierre.

---

## 6. Diferencia entre comportamiento esperado y observado

| Esperado | Observado |
|---|---|
| Logout destruye sesión en servidor | Logout falla silenciosamente (403) |
| Re-pulsar "Administrador" pide credenciales | Re-pulsar abre el panel sin credenciales |
| `admin_session` devuelve false tras logout | Devuelve true (sesión intacta) |
| Endpoints admin rechazan post-logout | Aceptan (sesión válida) |

---

## 7. Solución mínima recomendada

**Opción A (recomendada):** Hacer que `GDS.admin.logout()` envíe el token CSRF. En `gds-api.js`, línea 136:

```js
async logout() { 
  if (_gdsCsrfToken) headers['X-CSRF-Token'] = _gdsCsrfToken; // enviar token
  return gdsPost('admin_logout', {}, false); 
}
```

Y modificar `gdsPost` para incluir el token CSRF cuando esté disponible, incluso si `isAdmin=false`.

**Opción B:** Eximir `admin_logout` de la validación CSRF (menos seguro, no recomendada).

La causa raíz es la desincronización entre el requisito del backend (CSRF obligatorio) y el cliente (que no envía el token).

---

## 8. Archivos que sería necesario modificar

- `public/gds-api.js` — incluir token CSRF en la solicitud de logout.
- Opcionalmente: los archivos JS de los módulos para manejar errores de logout (no ocultar el panel si el logout falla).

---

## 9. Pruebas concretas para demostrar que la solución funciona

1. Iniciar sesión → verificar `admin_session` = `authenticated: true`.
2. Ejecutar logout → verificar respuesta HTTP 200 y `authenticated: false`.
3. Consultar `admin_session` → debe devolver `authenticated: false`.
4. Pulsar "Administrador" → debe mostrar el modal de login (no abrir el panel).
5. Intentar acceder a un endpoint admin (ej. `admin_noticias_save`) sin sesión → HTTP 401.
6. Verificar en la consola del navegador que no haya errores 403 en el logout.

---

## Conclusión

**Causa raíz demostrada:** El endpoint `admin_logout` requiere CSRF, pero `GDS.admin.logout()` no envía el token (porque `isAdmin=false`), resultando en HTTP 403 silencioso. La sesión nunca se destruye.

**No se modificó ningún archivo. Diagnóstico completado. Esperando autorización para implementar la solución.**