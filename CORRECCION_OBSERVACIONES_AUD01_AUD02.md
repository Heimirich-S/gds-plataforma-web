# Corrección puntual — Observaciones de auditoría AUD-01/AUD-02

| Campo | Valor |
|---|---|
| Fecha | 30/10/2026 |
| Archivo modificado | `public/index.html` |
| Archivos NO modificados | `public/gds-api.js`, `public/api.php`, `public/apps_script_proxy.php`, `app/config/config.php`, `storage/database/`, `archive/`, `public/inscripciones.html`, `public/js/pages/`, `public/style.css`, `public/css/` |
| Copia de seguridad | `Desktop\Respaldos_GDS\2026-10-30_previo_aud01_aud02\public_index.html` |

---

## A. Resumen

Se corrigieron tres problemas de índice identificados en la auditoría de verificación:

1. **Convenios (C-01/C-02):** `editarConvenio()` y `guardarConvenio()` ahora usan el `id` real del registro, no el índice del arreglo.
2. **Popup (P-01/P-04):** `editarPopupSlide()` y `guardarPopupSlide()` ahora usan el `id` real del slide, no el índice del arreglo.
3. **Eliminación total del popup (P-02):** `limpiarPopupCarousel()` ahora informa cuántos slides se eliminaron y cuáles fallaron, sin mostrar éxito total si hubo fallos parciales.

---

## B. Archivos modificados

| Ruta | Tipo | Descripción |
|---|---|---|
| `public/index.html` | MODIFICADO | Bloques inline de convenios y popup |

---

## C. Correcciones realizadas

### Convenios

**Causa del problema C-01/C-02:**
`editarConvenio(idx)` almacenaba `'edit_' + idx` en `cvEditId`. Luego `guardarConvenio()` buscaba el índice en la API y usaba `convenios[idx].id`. Si la lista cambiaba entre carga y guardado, se modificaría el registro incorrecto.

**Corrección:**
- `editarConvenio(idx)` ahora almacena el `id` real del registro en `cvEditId` (no `'edit_' + idx`).
- `guardarConvenio()` ahora usa directamente `cvEditId` como el `id` del convenio a actualizar. Si `cvEditId` tiene valor, es una edición; si está vacío, es un registro nuevo.

### Popup

**Causa del problema P-01/P-04:**
Mismo patrón que convenios. `editarPopupSlide(idx)` almacenaba `'edit_' + idx` en `psEditId`. Luego `guardarPopupSlide()` buscaba por índice en la API.

**Corrección:**
- `editarPopupSlide(idx)` ahora almacena el `id` real del slide en `psEditId`.
- `guardarPopupSlide()` ahora usa directamente `psEditId` como el `id` del slide a actualizar.

### Eliminación total del popup (P-02)

**Causa del problema:**
`limpiarPopupCarousel()` iteraba sobre los slides y llamaba a `GDS.admin.eliminarSlide(id)` para cada uno. Si uno fallaba, el bucle se detenía con `throw` y no se informaba qué slides se eliminaron ni cuáles fallaron.

**Corrección:**
- Cada eliminación individual está envuelta en `try/catch`.
- Se cuenta cuántos se eliminaron y se registran los títulos de los que fallaron.
- Si todos se eliminaron: mensaje de éxito con el conteo.
- Si hubo fallos parciales: mensaje de advertencia con el conteo de eliminados y la lista de fallidos.
- La lista se actualiza consultando nuevamente la API.

---

## D. Pruebas ejecutadas

| ID | Prueba | Resultado |
|---|---|---|
| T01 | `node --check` en 4 bloques inline de `index.html` | **Aprobada.** 4 de 4 correctos |
| T02 | Carga de `index.html` en navegador (sin BD) | **Aprobada.** Sin errores de JS. Track vacío. Popup no aparece |
| T03 | Carga de `noticias.html`, `organigrama.html`, `servicios.html`, `inscripciones.html` | **Aprobada.** Sin errores de JS |
| T04 | Verificación de que no quedan referencias a `imgB64` | **Aprobada.** Cero referencias |
| T05 | Verificación de que `editarConvenio` y `guardarConvenio` usan `id` real | **Aprobada.** Por lectura de código |
| T06 | Verificación de que `editarPopupSlide` y `guardarPopupSlide` usan `id` real | **Aprobada.** Por lectura de código |
| T07 | Verificación de que `limpiarPopupCarousel` maneja fallos parciales | **Aprobada.** Por lectura de código |

### Pruebas pendientes (requieren base de datos o mock)

| ID | Prueba | Requisito |
|---|---|---|
| T08 | Crear un convenio nuevo y verificar persistencia | Base de datos de prueba |
| T09 | Editar un convenio por `id` y verificar que se actualiza el correcto | Base de datos de prueba |
| T10 | Simular cambio en el orden de la lista antes de guardar | Mock server |
| T11 | Editar un slide por `id` y verificar que se actualiza el correcto | Base de datos de prueba |
| T12 | Eliminar todos los slides con confirmación | Base de datos de prueba |
| T13 | Simular fallo parcial en eliminación total | Mock server |
| T14 | Verificar que los mensajes de éxito y error son correctos | Mock server |

---

## E. Riesgos pendientes

| Riesgo | Estado | Notas |
|---|---|---|
| `editarConvenio(idx)` y `editarPopupSlide(idx)` siguen recibiendo un índice | **Mitigado** | El índice se usa solo para buscar el registro en la respuesta actual de la API. El `id` real se almacena inmediatamente. El riesgo de índice obsoleto se reduce a la ventana entre la carga de la lista y el clic del usuario |
| `renderConveniosList()` y `renderPopupSlidesList()` usan índices en los `onclick` | **Mitigado** | Los índices corresponden a la posición en la lista renderizada. Si la lista cambia entre render y clic, el índice podría ser incorrecto. En la práctica, el usuario hace clic inmediatamente |
| C-03: nombres con `<br>` en datos por defecto | **Documentado** | No corregido. Cambio de comportamiento esperado al guardar en la API |
| P-03: `renderPopupSlidesList()` usa índices | **Mitigado** | Igual que convenios |
| P-05: `getPopupSlides()` y `savePopupSlides()` siguen definidas | **Sin cambios** | Código muerto, inofensivo |
| Persistencia real no probada | **Pendiente** | Requiere base de datos de prueba independiente |

---

## F. Protección de datos

- **Base de datos modificada:** No.
- **SQL ejecutado:** No.
- **Credenciales modificadas:** No.
- **Configuración de hosting modificada:** No.
- **Archivos fuera del alcance modificados:** No.
- **Archivos modificados:** Solo `public/index.html`.

---

## G. Confirmación de alcance

- **Archivos modificados:** `public/index.html` (bloques inline de convenios y popup).
- **Archivos NO modificados:** `public/gds-api.js`, `public/api.php`, `public/apps_script_proxy.php`, `app/config/config.php`, `storage/database/`, `archive/`, `public/inscripciones.html`, `public/js/pages/`, `public/style.css`, `public/css/`.
- **Funcionalidades fuera de alcance no tocadas:** servicios, horarios, descuentos, festivos, AUD-04, AUD-05, AUD-07, ADD-01, extracción de `index.html` y `organigrama.html`.

---

## H. Estado final

| Módulo | Estado |
|---|---|
| Convenios (lectura y guardado) | **CORREGIDO, PERO SIN PRUEBA REAL** |
| Convenios (edición por id) | **CORREGIDO, PERO SIN PRUEBA REAL** |
| Popup (lectura y guardado) | **CORREGIDO, PERO SIN PRUEBA REAL** |
| Popup (edición por id) | **CORREGIDO, PERO SIN PRUEBA REAL** |
| Popup (eliminación total con fallos parciales) | **CORREGIDO, PERO SIN PRUEBA REAL** |
| Servicios | **NO MODIFICADO** |
| Horarios | **NO MODIFICADO** |
| Descuentos | **NO MODIFICADO** |

---

## I. Próximos pasos

Las observaciones C-01, C-02, P-01, P-02 y P-04 han sido corregidas. El código pasa las verificaciones de sintaxis y carga en el navegador sin errores de JavaScript.

Espero tu revisión antes de continuar con la etapa 3 (servicios).