# Corrección de persistencia y popup (AUD-01 y AUD-02)

| Campo | Valor |
|---|---|
| Fecha | 30/10/2026 |
| Fase | Corrección controlada de persistencia y popup |
| Archivos modificados | `public/index.html` (bloques inline) |
| Archivos NO modificados | `public/gds-api.js`, `public/api.php`, `public/apps_script_proxy.php`, `app/config/config.php`, `storage/database/`, `archive/`, `public/inscripciones.html`, `public/js/pages/` |
| Copias de seguridad | `Desktop\Respaldos_GDS\2026-10-30_previo_aud01_aud02\` |

---

## A. Resumen

Se corrigieron los flujos de lectura y escritura de **convenios** y **popup** en `index.html`. Ambos módulos ahora usan la API como fuente de datos y persistencia, con manejo de errores y validación de imágenes. El `localStorage` ya no es la fuente de persistencia para estos dos módulos.

Se verificó que el código modificado carga sin errores de sintaxis ni de JavaScript en el navegador. La persistencia real no se pudo probar porque no existe la base de datos `gds_web` en este equipo.

---

## B. Archivos modificados

| Ruta | Tipo | Descripción |
|---|---|---|
| `public/index.html` | MODIFICADO | Bloques inline: convenios y popup |

### Cambios en convenios

| Función | Antes | Después |
|---|---|---|
| `getConveniosData()` | Leía `localStorage` (`gds_convenios`) | Devuelve valores por defecto (solo fallback) |
| `saveConveniosData()` | Escribía en `localStorage` | Sin efecto (compatibilidad) |
| `renderConveniosTrack()` | Sincrónica, leía `localStorage` | Asíncrona, lee de `GDS.getConvenios()` |
| `renderConveniosList()` | Leía `localStorage` | Asíncrona, lee de `GDS.getConvenios()` |
| `guardarConvenio()` | Sincrónica, guardaba en `localStorage` | Asíncrona, llama a `GDS.admin.guardarConvenio()` con manejo de errores |
| `eliminarConvenio(idx)` | Borraba por índice en `localStorage` | Asíncrona, obtiene el `id` de la API y llama a `GDS.admin.eliminarConvenio(id)` |
| `editarConvenio(idx)` | Leía de `localStorage` | Asíncrona, lee de `GDS.getConvenios()` |
| `mostrarFormConvenio(preData)` | Leía `imgB64` de `localStorage` | Eliminado `imgB64` |

### Cambios en popup

| Función | Antes | Después |
|---|---|---|
| `getPopupSlides()` | Leía `localStorage` (`gds_popup_slides`) | Sin cambios (solo usada por compatibilidad) |
| `savePopupSlides()` | Escribía en `localStorage` | Sin cambios (solo usada por compatibilidad) |
| `guardarPopupSlide()` | Sincrónica, guardaba en `localStorage` | Asíncrona, llama a `GDS.admin.guardarSlide()` con manejo de errores |
| `eliminarPopupSlide(idx)` | Borraba por índice en `localStorage` | Asíncrona, obtiene el `id` de la API y llama a `GDS.admin.eliminarSlide(id)` |
| `editarPopupSlide(idx)` | Leía de `localStorage` | Asíncrona, lee de `GDS.getPopupSlides()` |
| `limpiarPopupCarousel()` | Borraba todo en `localStorage` | Asíncrona, elimina cada slide por `id` en la API |
| `mostrarFormPopupSlide(editData)` | Leía `imgB64` de `localStorage` | Eliminado `imgB64` |
| `abrirPopupCarousel()` | Llamaba a `getPopupSlides()` (localStorage) | Usa `_popupSlides` cargado desde la API |
| `DOMContentLoaded` (popup) | Abria popup a los 800 ms con datos de `localStorage` | Espera la respuesta de la API (máx. 2 s). Si devuelve datos, abre el popup. Si falla o está vacío, no muestra popup |

### Cambios en formularios HTML

| Formulario | Antes | Después |
|---|---|---|
| Convenio | Input de archivo + `cvImgB64` (base64) | Solo campo de texto `cvImg` con validación de URL o ruta `img/` |
| Popup | Input de archivo + `psImgB64` (base64) | Solo campo de texto `psImg` con validación de URL o ruta `img/` |

### Cambios en gds-api.js

**No se modificó.** El branch de popup en `gds-api.js` (líneas 318-322) busca `.popup-carousel-overlay` en `DOMContentLoaded`, que no existe en ese momento. Ya era un no-op. Se deja así para no hacer cambios innecesarios.

---

## C. Correcciones realizadas

### Convenios
- **Lectura pública:** `renderConveniosTrack()` ahora lee de `GDS.getConvenios()` (API). Si la API falla o devuelve vacío, la cinta queda vacía.
- **Guardado:** `guardarConvenio()` llama a `GDS.admin.guardarConvenio(d)` con manejo de errores. Si falla, muestra aviso y no hay mensaje de éxito.
- **Eliminación:** `eliminarConvenio(idx)` obtiene el `id` real de la API y llama a `GDS.admin.eliminarConvenio(id)`.
- **Edición:** `editarConvenio(idx)` lee de la API y muestra el formulario con los datos actuales.
- **Validación:** la imagen debe ser URL (http/https) o ruta `img/...`. Se rechazan esquemas peligrosos (`javascript:`, `data:`, base64).
- **HTML:** se elimina `<br>` del nombre del convenio; la presentación los agrega.

### Popup
- **Lectura pública:** el popup carga datos de `GDS.getPopupSlides()` antes de abrir. Espera hasta 2 segundos.
- **Política D4:** si la API devuelve slides, los muestra. Si devuelve `[]`, no muestra popup. Si falla, no muestra popup. No usa `localStorage` ni valores por defecto.
- **Guardado:** `guardarPopupSlide()` llama a `GDS.admin.guardarSlide(slide)` con manejo de errores.
- **Eliminación:** `eliminarPopupSlide(idx)` obtiene el `id` real de la API y llama a `GDS.admin.eliminarSlide(id)`.
- **Vaciar todo:** `limpiarPopupCarousel()` elimina cada slide por `id` en la API.
- **Validación:** la imagen debe ser URL (http/https) o ruta `img/...`.

---

## D. Pruebas

### Pruebas ejecutadas

| ID | Prueba | Resultado |
|---|---|---|
| T01 | `node --check` en bloques inline de `index.html` (4 bloques) | **Aprobada**. 4 de 4 correctos |
| T02 | Servidor PHP local (8082) con `index.html` | **Aprobada**. Sin errores de JavaScript. Track de convenios vacío (API falla por falta de BD). Popup no aparece (API falla) |
| T03 | Servidor PHP local con `servicios.html` | **Aprobada**. 10 tarjetas, sin errores de JS |
| T04 | Servidor PHP local con `inscripciones.html` | **Aprobada**. Formulario presente, 17 tarjetas de útiles, sin errores de JS (solo 404 de iconos SVG preexistentes y 500 de API) |
| T05 | Verificación de que `GDS.getConvenios`, `GDS.admin.guardarConvenio`, `GDS.admin.eliminarConvenio`, `GDS.getPopupSlides`, `GDS.admin.guardarSlide`, `GDS.admin.eliminarSlide` existen | **Aprobada**. Todas son `function` |

### Pruebas NO ejecutadas (requieren base de datos o servicios externos)

| ID | Prueba | Motivo |
|---|---|---|
| T06 | Guardar un convenio y verificar persistencia | Requiere base de datos y token admin |
| T07 | Eliminar un convenio y verificar que desaparece del público | Requiere base de datos y token admin |
| T08 | Guardar un slide y verificar que aparece en el popup | Requiere base de datos y token admin |
| T09 | Popup con datos de la API (slides visibles) | Requiere base de datos |
| T10 | Popup con base vacía (no se muestra) | Requiere base de datos |
| T11 | Guardar con API caída (aviso de error, sin éxito falso) | Requiere simulación de error de red |
| T12 | Validación de imagen `javascript:` y base64 | Requiere ejecución en navegador con mock API |
| T13 | Horarios: mapeo de cursos | Código revisado, no probado en ejecución |
| T14 | Servicios: lectura desde API | No implementada (pendiente) |

### Pruebas con base de datos simulada

No se realizó. No existe la base `gds_web` en este equipo. Las pruebas T06-T12 requieren una base de datos de prueba independiente (G1 de la fase 1) y una API funcional.

---

## E. Riesgos pendientes

| Riesgo | Estado | Mitigación |
|---|---|---|
| AUD-01 parcialmente corregido | **Parcialmente corregido** | Convenios y popup migrados. Servicios, horarios y descuentos pendientes |
| AUD-02 corregido | **Corregido** (código) | Pendiente de prueba con base de datos |
| Persistencia real no verificada | **Pendiente de prueba** | Requiere base de datos de prueba |
| ADD-01 (postulaciones en localStorage) | **No modificado** | Tarea independiente, documentada |
| ADD-02 (lecturas públicas desde localStorage en horarios, descuentos, servicios) | **Parcialmente corregido** | Convenios y popup migrados a API. Servicios, horarios y descuentos pendientes |
| Servicios: `admin_servicio_save` borra campos | **No corregido** | Requiere autorización para modificar `api.php` (C2 autorizado, pendiente de implementar) |
| BUG-06: `PDOException` sin capturar en `api.php` | **No corregido** | Requiere manejo global de excepciones (fase 1) |
| Imágenes base64 en el editor | **Eliminadas** | Los inputs de archivo se retiraron. Solo URL o ruta `img/` |
| `procesarFotoAdmin` sigue definida | **Sin cambios** | Código muerto, inofensivo. No se elimina por la regla de no cambios innecesarios |

---

## F. Protección de datos

- **Base de datos modificada:** No.
- **SQL ejecutado:** No.
- **Credenciales modificadas:** No.
- **Configuración de hosting modificada:** No.
- **Archivos fuera del alcance modificados:** No. Solo `public/index.html`.
- **Archivos dentro del alcance modificados:** `public/index.html` (bloques inline de convenios y popup).
- **Archivos de `archive/` o `storage/database/` modificados:** No.

---

## G. Estado final por módulo

| Módulo | Estado | Notas |
|---|---|---|
| Convenios | **CORREGIDO, PERO SIN PRUEBA REAL** | Código migrado a API. Sintaxis y carga verificadas. Persistencia real pendiente de base de datos |
| Popup | **CORREGIDO, PERO SIN PRUEBA REAL** | Código migrado a API. Sintaxis y carga verificadas. Persistencia real pendiente de base de datos |
| Servicios | **NO MODIFICADO** | Pendiente de corrección del backend (`admin_servicio_save`) |
| Horarios | **NO MODIFICADO** | Pendiente de mapeo de cursos y materias |
| Descuentos | **NO MODIFICADO** | Pendiente de correspondencia institucional |

---

## H. Archivos creados/modificados

| Ruta | Tipo | Descripción |
|---|---|---|
| `public/index.html` | MODIFICADO | Bloques inline de convenios y popup migrados a API |
| `CORRECCION_AUD01_AUD02.md` | NUEVO | Este informe |

**Archivos NO modificados:** `public/gds-api.js`, `public/api.php`, `public/apps_script_proxy.php`, `app/config/config.php`, `storage/database/`, `archive/`, `public/inscripciones.html`, `public/js/pages/`, `public/style.css`, `public/css/`.

---

## I. Próximos pasos

1. **Esperar la revisión de este informe** antes de continuar.
2. **Servicios (Etapa 3):** implementar la corrección de `admin_servicio_save` en `api.php` (C2 autorizado) y conectar la lectura pública con `GDS.getServicios()`.
3. **Horarios (Etapa 4):** implementar el mapeo de cursos y materias, y conectar la lectura pública con la API.
4. **Descuentos (Etapa 5):** esperar la correspondencia institucional (D6).
5. **Base de datos de prueba:** crear una base independiente para probar la persistencia real (G1 de la fase 1).

**No se ha ejecutado ningún SQL, no se han modificado credenciales ni configuraciones de hosting, y no se han afectado archivos fuera del alcance.**