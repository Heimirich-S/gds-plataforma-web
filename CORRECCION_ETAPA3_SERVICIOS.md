# Corrección de persistencia del módulo de servicios (Etapa 3)

| Campo | Valor |
|---|---|
| Fecha | 30/10/2026 |
| Archivos modificados | `public/js/pages/servicios.js`, `public/api.php` |
| Archivos NO modificados | `public/index.html`, `public/gds-api.js`, `public/apps_script_proxy.php`, `app/config/config.php`, `storage/database/`, `archive/`, `public/inscripciones.html`, `public/style.css`, `public/css/` |
| Copias de seguridad | `Desktop\Respaldos_GDS\2026-10-30_previo_etapa3_servicios\` |

---

## A. Resumen

Se corrigió el backend (`admin_servicio_save`) para que solo actualice los campos que se envían explícitamente, evitando que campos omitidos se sobrescriban con `NULL` o cadena vacía. Se conectó la lectura pública de servicios con la API (con fallback al objeto estático). Se conectó el guardado administrativo con `GDS.admin.guardarServicio()`. Se eliminó la dependencia de `localStorage` para servicios.

---

## B. Archivos modificados

| Ruta | Tipo | Descripción |
|---|---|---|
| `public/api.php` | MODIFICADO | `admin_servicio_save`: actualización dinámica solo de campos presentes |
| `public/js/pages/servicios.js` | MODIFICADO | Lectura desde API con fallback; guardado mediante API; eliminación de localStorage |

---

## C. Correcciones realizadas

### Backend: `admin_servicio_save` (api.php)

**Comportamiento anterior:**
- Actualizaba todos los campos (`titulo`, `tag`, `img_card`, `descripcion_corta`, `chips`, `cuerpo_html`) en cada guardado.
- Campos omitidos se sobrescribían con `NULL` (chips) o cadena vacía (img_card, descripcion_corta, cuerpo_html).
- Solo aceptaba `img_card` y `cuerpo_html` (no los alias `img` y `cuerpo`).

**Comportamiento nuevo:**
- Solo actualiza los campos que se envían explícitamente en la solicitud.
- Campos omitidos conservan su valor actual en la base de datos.
- Acepta `img` como alias de `img_card` y `cuerpo` como alias de `cuerpo_html`.
- `chips`: si se envía como `null` explícito, se guarda `null`; si se omite, se conserva.
- Si no se envía ningún campo, responde "Servicio sin cambios".
- Distingue entre campo omitido (`array_key_exists` = false) y campo enviado vacío (`array_key_exists` = true, valor = '').

### Frontend: `servicios.js`

**Lectura pública:**
- Se agregó `loadFromAPI()` que llama a `GDS.getServicios()` al cargar la página.
- Los datos de la API se mezclan con el objeto estático `window.servicios` (actualizando `titulo`, `tag`, `img`, `cuerpo`, `chips`).
- Si la API falla, se conserva el objeto estático.
- El fallback es exclusivamente de lectura pública.

**Guardado administrativo:**
- `guardarServicio()` ahora es `async` y llama a `GDS.admin.guardarServicio(payload)`.
- Envía el registro completo (`id`, `titulo`, `tag`, `img`, `cuerpo`, `chips`) para evitar sobrescribir campos omitidos.
- Si la API devuelve error, muestra un aviso rojo y **no** muestra mensaje de éxito.
- El mensaje de éxito solo aparece si la API confirma la operación.

**Eliminación de localStorage:**
- Se eliminó `loadSavedEdits()` que leía `gds_servicios_edits` de `localStorage`.
- Los datos de `localStorage` ya no se cargan ni se usan.

**Preservación de contenido HTML:**
- `cargarDatosServicio()` ya no elimina etiquetas HTML del cuerpo (anteriormente usaba `.replace(/<[^>]+>/g,'')`).
- `guardarServicio()` ya no reenvuelve el contenido en párrafos (`<p>...</p>`).
- El contenido se envía tal cual al servidor y se preserva su formato.

---

## D. Pruebas

### Pruebas ejecutadas

| ID | Prueba | Resultado |
|---|---|---|
| T01 | `node --check` en `servicios.js` | **Aprobada** |
| T02 | `php -l` en `api.php` | **Aprobada** |
| T03 | Carga de `servicios.html` en navegador (sin BD) | **Aprobada.** 10 tarjetas, sin errores de JS |
| T04 | Carga de `index.html` en navegador (sin BD) | **Aprobada.** Sin errores de JS. Track vacío. Popup no aparece |
| T05 | Verificación de que `GDS.getServicios` y `GDS.admin.guardarServicio` existen | **Aprobada** |

### Pruebas pendientes (requieren base de datos o mock)

| ID | Prueba | Requisito |
|---|---|---|
| T06 | Lectura pública desde API con datos | Base de datos de prueba |
| T07 | Lectura pública con API caída (fallback al objeto estático) | Mock server |
| T08 | Guardado exitoso simulado | Mock server |
| T09 | Guardado fallido simulado (401, 403, 500) | Mock server |
| T10 | Actualización parcial sin enviar `chips` | Mock server |
| T11 | Actualización parcial sin enviar `descripcion_corta` | Mock server |
| T12 | Actualización parcial sin enviar `img_card` | Mock server |
| T13 | Envío explícito de un campo vacío | Mock server |
| T14 | Conservación de `cuerpo_html` y su formato | Mock server |
| T15 | Compatibilidad de campos entre frontend, `gds-api.js` y `api.php` | Mock server |

---

## E. Riesgos pendientes

| Riesgo | Estado | Notas |
|---|---|---|
| Persistencia real no verificada | **Pendiente** | Requiere base de datos de prueba |
| Lectura pública desde API no probada con datos reales | **Pendiente** | Requiere base de datos de prueba |
| `descripcion_corta` no se envía desde el frontend | **Por diseño** | El editor no tiene campo para `descripcion_corta`. El API la preserva al omitirla |
| XSS en `cuerpo_html` | **Pendiente** | El contenido se guarda crudo y se renderiza como HTML. Ver AUD-09. Se abordará en la fase de seguridad |
| `renderServicios` no existe como función | **Por diseño** | La página renderiza estáticamente. El modal lee de `window.servicios` |

---

## F. Protección de datos

- **Base de datos modificada:** No.
- **SQL ejecutado:** No.
- **Credenciales modificadas:** No.
- **Configuración de hosting modificada:** No.
- **Archivos fuera del alcance modificados:** No. Solo `public/js/pages/servicios.js` y `public/api.php`.
- **Archivos de `archive/` o `storage/database/` modificados:** No.

---

## G. Estado final

| Módulo | Estado |
|---|---|
| Servicios (backend: actualización parcial) | **CORREGIDO, PERO SIN PRUEBA REAL** |
| Servicios (frontend: lectura desde API) | **CORREGIDO, PERO SIN PRUEBA REAL** |
| Servicios (frontend: guardado mediante API) | **CORREGIDO, PERO SIN PRUEBA REAL** |
| Servicios (frontend: eliminación de localStorage) | **CORREGIDO** |
| Convenios | **CORREGIDO, PERO SIN PRUEBA REAL** |
| Popup | **CORREGIDO, PERO SIN PRUEBA REAL** |

---

## H. Archivos creados/modificados

| Ruta | Tipo | Descripción |
|---|---|---|
| `public/api.php` | MODIFICADO | `admin_servicio_save`: actualización dinámica solo de campos presentes |
| `public/js/pages/servicios.js` | MODIFICADO | Lectura desde API, guardado mediante API, eliminación de localStorage |
| `CORRECCION_ETAPA3_SERVICIOS.md` | NUEVO | Este informe |

---

## I. Próximos pasos

Espero tu revisión antes de continuar con la etapa 4 (horarios). Los cambios de horarios requieren el mapeo de cursos (`1°A` → `1A`, `Jardín` → `Jardin`) y la corrección de la búsqueda de materias por nivel.