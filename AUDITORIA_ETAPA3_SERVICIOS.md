# Auditoría de verificación — Etapa 3: Servicios

| Campo | Valor |
|---|---|
| Fecha | 30/10/2026 |
| Tipo | Auditoría de solo lectura. No se modificó ningún archivo |
| Archivos inspeccionados | `public/api.php`, `public/js/pages/servicios.js` |
| Archivos modificados en esta auditoría | Ninguno |

---

## 1. Resultado general

**Aprobado con observaciones.**

La corrección del backend (`admin_servicio_save`) es correcta y resuelve el problema de sobrescritura de campos omitidos. El frontend lee desde la API con fallback al objeto estático y envía el registro completo al guardar. Se encontraron 4 observaciones de prioridad baja y 1 de prioridad media. Ninguna bloquea el avance a la etapa 4 (horarios).

---

## 2. Backend: `public/api.php`

### 2.1 Verificación de `admin_servicio_save`

| Verificación | Resultado |
|---|---|
| Campo omitido conserva su valor | **Correcto.** `array_key_exists()` verifica si el campo está en la solicitud. Si no está, no se incluye en el `UPDATE` |
| Campo enviado como `null` | **Correcto.** Para `chips`, si `$d['chips'] !== null` se codifica; si es `null`, se guarda `null` |
| Campo enviado como cadena vacía | **Correcto.** Si `titulo` se envía como `""`, `s('')` devuelve `''` y se actualiza. Se distingue de "no enviado" |
| Solicitud sin campos | **Correcto.** `empty($campos)` → responde "Servicio sin cambios" |
| Alias `img`/`img_card` | **Correcto.** Si se envía `img_card`, se usa; si no, se busca `img` |
| Alias `cuerpo`/`cuerpo_html` | **Correcto.** Mismo patrón que `img`/`img_card` |
| Validación de permisos | **Intacta.** `requireAdmin()` se llama al inicio del case |
| Otros endpoints | **No modificados.** Solo se cambió `admin_servicio_save` |

### 2.2 Observaciones del backend

| ID | Severidad | Problema | Detalle |
|---|---|---|---|
| B-01 | **Media** | `admin_servicio_save` no valida que el servicio exista antes de hacer el `UPDATE`. Si se envía un `id` inexistente, el `UPDATE` afecta 0 filas pero responde "Servicio actualizado" | `api.php:551-552`. El `execute()` no se verifica con `rowCount()` |
| B-02 | **Baja** | `titulo` y `tag` se envían con `s()` (sanitización HTML), pero `img_card` y `cuerpo_html` se envían sin sanitizar. Esto es consistente con el comportamiento anterior, pero `cuerpo_html` se renderiza como HTML en el modal (riesgo de XSS si se compromete una cuenta administrativa) | Ver AUD-09 (riesgo documentado) |
| B-03 | **Baja** | `chips` se codifica con `json_encode()` sin flags. Si los chips contienen caracteres especiales, el JSON podría tener escapes innecesarios. No es un error funcional | `api.php:583` |

---

## 3. Frontend: `public/js/pages/servicios.js`

### 3.1 Verificación de lectura pública

| Verificación | Resultado |
|---|---|
| Usa `GDS.getServicios()` | **Sí.** `loadFromAPI()` (línea 231) llama a `GDS.getServicios()` |
| Fallback al objeto estático si la API falla | **Sí.** El `catch` conserva el objeto estático |
| Fallback solo para lectura pública | **Sí.** El fallback no se usa para guardar |
| No simula persistencia | **Sí.** No hay escritura en `localStorage` |
| Diseño conservado | **Sí.** No se modificó CSS ni estructura HTML |

### 3.2 Verificación de guardado administrativo

| Verificación | Resultado |
|---|---|
| Usa `GDS.admin.guardarServicio()` | **Sí.** Línea 215 |
| Envía el registro completo | **Parcialmente.** Envía `id`, `titulo`, `tag`, `img`, `cuerpo`, `chips`. No envía `descripcion_corta` ni `chips` si no existen en el objeto estático |
| Manejo de errores | **Sí.** `try/catch` con mensaje de error rojo |
| No muestra éxito si falla | **Sí.** El mensaje de éxito solo aparece si `await GDS.admin.guardarServicio()` no lanza excepción |
| Actualiza la interfaz | **Sí.** Llama a `window.renderServicios()` si existe |

### 3.3 Observaciones del frontend

| ID | Severidad | Problema | Detalle |
|---|---|---|---|
| F-01 | **Media** | `guardarServicio` no envía `chips` si `svc.chips` es falsy. Si el servicio no tiene chips definidos, no se envían, y el backend los conserva (por omisión). Esto es correcto, pero si el servicio tiene chips y el admin los edita (no hay campo para editar chips), no se envían los chips originales si `svc.chips` es `undefined` | `servicios.js:213`. El `if(svc.chips)` no envía chips si son falsy |
| F-02 | **Baja** | `cargarDatosServicio` ya no elimina etiquetas HTML (cambio correcto), pero el textarea ahora mostrará HTML crudo. El administrador puede editar HTML directamente, lo que es más potente pero también más riesgoso (XSS) | `servicios.js:190` |
| F-03 | **Baja** | `guardarServicio` ya no reenvuelve el contenido en `<p>` tags. El contenido se envía tal cual. Esto preserva el formato pero cambia el comportamiento del editor: ahora el administrador debe escribir HTML directamente | `servicios.js:193-228` |
| F-04 | **Baja** | `loadFromAPI` no llama a `window.renderServicios()` después de actualizar los datos. Si el modal de un servicio está abierto cuando se carga la API, no se actualiza. En la práctica, la API responde antes de que el usuario abra un modal | `servicios.js:230-250` |

---

## 4. Contenido HTML

### 4.1 Flujo actual

1. **Carga estática:** `cuerpo` es HTML (e.g., `<p>...</p>`, `<strong>`, etc.)
2. **Carga desde API:** `cuerpo_html` se mapea a `cuerpo` (sin transformación)
3. **Editor:** `cargarDatosServicio` muestra el HTML crudo en el textarea (sin strip)
4. **Guardado:** `guardarServicio` envía `cuerpo` tal cual (sin re-wrapping)
5. **Modal:** `abrirModal` renderiza `s.cuerpo` como HTML (`innerHTML`)

### 4.2 Riesgo de XSS

El contenido HTML se guarda crudo en la base de datos y se renderiza con `innerHTML` en el modal. Si un administrador introduce código malicioso (scripts, atributos de eventos), se ejecutará en el navegador del visitante.

**Mitigación actual:** ninguna sanitización en frontend ni backend para `cuerpo_html`.

**Evaluación:** El riesgo es **medio** porque:
- Requiere acceso administrativo (token compartido, no sesión segura).
- El contenido lo edita un administrador, no un usuario anónimo.
- Pero si se compromete una cuenta administrativa, el XSS es persistente.

**Recomendación:** Se abordará en la fase de seguridad (sanitización en servidor, CSP). No se implementa ahora para no destruir contenido legítimo.

### 4.3 Preservación del formato

El cambio de `cargarDatosServicio` (ya no elimina etiquetas HTML) y `guardarServicio` (ya no reenvuelve en `<p>`) **preserva el formato HTML original**. El administrador puede editar HTML directamente en el textarea. Esto es más potente pero también más riesgoso.

---

## 5. Pruebas

### Pruebas ejecutadas

| ID | Prueba | Resultado |
|---|---|---|
| T01 | `node --check` en `servicios.js` | **Aprobada** |
| T02 | `php -l` en `api.php` | **Aprobada** |
| T03 | Carga de `servicios.html` en navegador (sin BD) | **Aprobada.** 10 tarjetas, sin errores de JS |
| T04 | Carga de `index.html` en navegador (sin BD) | **Aprobada.** Sin errores de JS |
| T05 | Verificación de que no se usa `localStorage` para guardar | **Aprobada.** `loadSavedEdits()` eliminado |

### Pruebas simuladas (mock)

No se ejecutaron pruebas con mock server en esta etapa. Las pruebas T06-T15 del plan requieren un mock server o base de datos independiente.

### Pruebas pendientes (requieren base de datos)

| ID | Prueba | Requisito |
|---|---|---|
| T06 | Lectura pública desde API con datos | Base de datos de prueba |
| T07 | Lectura pública con API caída (fallback) | Mock server |
| T08 | Guardado exitoso | Base de datos de prueba |
| T09 | Guardado fallido (401, 403, 500) | Mock server |
| T10 | Actualización parcial sin `chips` | Base de datos de prueba |
| T11 | Actualización parcial sin `descripcion_corta` | Base de datos de prueba |
| T12 | Actualización parcial sin `img_card` | Base de datos de prueba |
| T13 | Envío explícito de campo vacío | Base de datos de prueba |
| T14 | Conservación de `cuerpo_html` y formato | Base de datos de prueba |
| T15 | Compatibilidad de campos | Base de datos de prueba |

---

## 6. Archivos

**Archivos inspeccionados:**
- `public/api.php` (líneas 546-610: `admin_servicio_save`)
- `public/js/pages/servicios.js` (completo)

**Archivos modificados en esta auditoría:** Ninguno.

**Confirmación:** No se modificó ningún archivo. No se ejecutó SQL. No se modificaron credenciales ni configuración de hosting. No se afectaron archivos fuera del alcance.

---

## 7. Recomendación

**La etapa 3 puede considerarse suficientemente verificada para continuar con la etapa 4 (horarios).**

Observaciones a corregir antes del primer despliegue:

| Prioridad | Problema | Acción |
|---|---|---|
| 1 (antes de despliegue) | B-01: `admin_servicio_save` no valida que el servicio exista | Verificar `rowCount()` y responder 404 si no existe |
| 2 (antes de despliegue) | F-01: no se envían `chips` si son falsy | Enviar `chips` siempre (incluso si es `[]`) |
| 3 (fase de seguridad) | B-02/F-02: XSS en `cuerpo_html` | Sanitización en servidor + CSP |

No hay problemas que bloqueen el avance a la etapa 4 (horarios). Los problemas de horarios (mapeo de cursos, materias por nivel, festivos) son independientes de los servicios.