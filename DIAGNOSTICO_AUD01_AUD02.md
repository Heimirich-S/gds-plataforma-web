# Diagnóstico de persistencia y popup (AUD-01 y AUD-02)

| Campo | Valor |
|---|---|
| Fecha | 30/10/2026 |
| Tipo | Diagnóstico de solo lectura. **No se ha modificado ningún archivo del proyecto** |
| Referencia | `AUDITORIA_MIGRACION_FRONTEND_GDS.md` |
| Estado | Pendiente de aprobación del alcance y de los archivos afectados |

---

## 1. Resumen

- **AUD-01 es real y afecta a los cinco editores.** Ninguno de los guardados llama a la API. Todos escriben en `localStorage` del navegador de quien administra. Además, en tres de los cinco casos el público tampoco lee la API, así que aunque se corrigiera el guardado, el cambio no llegaría al visitante sin un cambio de lectura.
- **AUD-02 tiene dos defectos independientes.** `renderPopupCarouselAPI` no existe, y aunque existiera, la rama que la llama nunca se ejecuta: `gds-api.js` busca el overlay del popup en el DOM al cargar la página, pero el overlay se crea 800 ms después, dentro de `abrirPopupCarousel()`.
- **Las funciones de API no están listas para usarse tal cual.** Hay contratos incompatibles en nombres de campo, nombres de cursos y materias, claves de descuentos y tipos de datos. Algunas funciones solo actualizan filas existentes, y una de ellas **borra campos si el cliente no los envía**.
- **Hay decisiones de producto que no pueden resolverse solo en código**: qué hacer con las imágenes subidas como archivo, con los festivos del horario, con los costos (que ya no tienen tabla) y con la política cuando la API falla o devuelve datos vacíos.
- **Ninguna persistencia real se ha probado.** No existe la base `gds_web` en este equipo. Las conclusiones sobre MySQL son por lectura del esquema y del código.

---

## 2. AUD-01: diagnóstico por editor

### 2.1 Convenios (`index.html`)

| Aspecto | Situación actual |
|---|---|
| Datos que administra | Nombre, URL de destino, logo (URL o archivo), orden |
| Carga actual | `getConveniosData()` lee `localStorage` (`gds_convenios`), con valores por defecto `CONVENIOS_DEFAULT` (líneas 2555-2569) |
| Guardado actual | `guardarConvenio()` (línea 2667) hace `saveConveniosData()` → `localStorage`. Mensaje de éxito sin persistencia real |
| Función de API | `GDS.admin.guardarConvenio(d)` → `admin_convenios_save` (`gds-api.js:132`). **Sin llamador** |
| Eliminación | `eliminarConvenio(idx)` borra por índice de `localStorage` (línea 2659). API: `admin_convenios_delete` (soft delete, `activo=0`). **Sin llamador** |
| Contrato de la API | Espera `id`, `nombre`, `url`, `img`, `orden` (`api.php:385-397`). `nombre` obligatorio. El ID nuevo es `cv_`+tiempo |
| Lectura pública | `gds-api.js:200` renderiza desde la API al cargar (`renderConveniosAPI`). El render síncrono de `index.html:2349` usa `localStorage`, pero la API responde después y sobrescribe |
| Esquema | `convenios`: `id VARCHAR(20)`, `nombre VARCHAR(200)`, `url VARCHAR(500)`, `img VARCHAR(500)`, `orden TINYINT` |
| Bloqueos | (a) El logo subido como archivo es un base64 (`imgB64`) que la API no recibe y que no cabe en `VARCHAR(500)`. (b) El nombre por defecto contiene `<br>`, que `s()` elimina al guardar. (c) La edición debe identificar el registro por `id`, no por índice |
| Actualización de la UI tras guardar | Debe releer `GET convenios` y redibujar la lista. Hoy se redibuja desde `localStorage` |

**Decisión necesaria:** logo solo por URL o por archivo. El archivo requiere un endpoint de subida y almacenamiento en el servidor (ver D1).

### 2.2 Popup (`index.html`)

Se trata en la sección 3, porque comparte el problema de lectura.

Guardado actual: `guardarPopupSlide()` (línea 3008) → `savePopupSlides()` → `localStorage` (`gds_popup_slides`). Eliminación por índice (línea 3001). API: `GDS.admin.guardarSlide` → `admin_popup_save`, `GDS.admin.eliminarSlide` → `admin_popup_delete`. **Sin llamadores.**

| Aspecto | Situación actual |
|---|---|
| Datos que administra | Imagen, título, subtítulo, tipo de acción, URL de acción, orden |
| Contrato de la API | `admin_popup_save` espera `id`, `img`, `titulo`, `subtitulo`, `tipoAccion`, `accionUrl`, `isPdf`, `orden` (`api.php:434-447`) |
| Esquema | `popup_slides.img VARCHAR(500)`. `tipo_accion ENUM('link','pdf_drive','pdf_descarga','none')`, que coincide con los valores del editor |
| Bloqueos | (a) Las imágenes subidas son base64 (`imgB64`); no caben en `VARCHAR(500)` (`api.php:445` solo toma `img`). Con modo estricto, el INSERT falla y el error es una `PDOException` sin capturar (BUG-06). (b) `isPdf` no existe en el modelo local; hay que derivarlo de `tipoAccion` |

### 2.3 Horarios (`index.html`)

| Aspecto | Situación actual |
|---|---|
| Datos que administra | Horas de inicio y fin, granularidad, celdas por día y franja, descansos, festivos (por día de la semana) |
| Carga actual | `getHorarioData()` (línea 1885) → `localStorage` (`gds_horarios`). El render del modal público también lee `localStorage` (`renderHorario`, línea 1941) |
| Guardado actual | `setCellVal()` y funciones de descanso y festivos → `saveHorarioData()`. Sin API |
| Funciones de API | `GDS.admin.configurarHorario` → `admin_horario_save`; `GDS.admin.guardarCelda` → `admin_horario_celda`. **Sin llamadores**. `GET horario` existe, pero **ningún código lo llama** |

Incompatibilidades entre el modelo de la interfaz y la API:

| Concepto | Interfaz | API y esquema | Consecuencia |
|---|---|---|---|
| Nombre del curso | `1°A`, `6°A`, `Jardín` (18 cursos) | `1A`, `6A`, `Jardin` (`cursos.nombre`, colación `unicode_ci`) | 17 de 18 cursos no coinciden. `admin_horario_save` responde «Curso no encontrado» |
| Nombre de materia | `Matemáticas`, `Ed. Física`, `Inglés` | `Matematicas`, `Ed. Fisica`, `Ingles` | Con `unicode_ci` la comparación ignora tildes, así que **probablemente coincide**. Verificar en prueba |
| Materia en dos niveles | `Matemáticas` aparece en primaria y secundaria | `materias` tiene `UNIQUE(nombre, nivel)`, pero la API busca `WHERE nombre = ?` sin nivel | Se toma la primera fila (primaria). **Error silencioso** en secundaria |
| Festivos | Por día de la semana (`Lunes`…`Viernes`) | `horario_festivos` por **fecha** (`DATE`). Sin endpoint de API | **No persistible con la API actual** |
| Descansos | Por posición de franja, con nombre | `es_descanso` y `nombre_descanso` por celda | Persistible celda a celda |
| Docente por celda | No existe en la interfaz | `docente_id`, `docente_suplente_id` | Se envían nulos. Sin pérdida de datos, pero sin funcionalidad |
| Orden de guardado | Libre | `admin_horario_celda` exige que exista `horario_config` del curso | Hay que guardar primero la configuración |
| Lectura pública | `localStorage` del visitante | `GET horario` no se usa | Un visitante nunca ve horarios guardados por el administrador |

Nota: la colación `utf8mb4_unicode_ci` hace que `WHERE nombre = ?` ignore tildes, pero **no** ignora el símbolo `°`. Por eso el fallo de cursos es real y el de materias, probablemente no.

### 2.4 Servicios (`js/pages/servicios.js`)

| Aspecto | Situación actual |
|---|---|
| Datos que administra | Título, etiqueta, imagen, descripción |
| Fuente de la página pública | Objeto literal `const servicios` en `servicios.js:2` (`window.servicios` en línea 14). **No consulta la API** |
| Carga actual | `loadSavedEdits()` (línea 213) aplica `localStorage` (`gds_servicios_edits`) al cargar la página pública |
| Guardado actual | `guardarServicio()` (línea 193) → `localStorage`. Mensaje «Servicio actualizado» sin persistencia |
| Función de API | `GDS.admin.guardarServicio` → `admin_servicio_save`. **Sin llamador** |
| Contrato de la API | `UPDATE servicios SET titulo, tag, img_card, descripcion_corta, chips, cuerpo_html WHERE id=?`. **Solo actualiza, no inserta** |

Riesgos del contrato:

- **Guardado parcial destruye datos.** `chips` se escribe como `NULL` si no se envía (`api.php:550`). `descripcion_corta` e `img_card` se escriben como cadena vacía si no se envían. El editor actual solo edita cuatro campos. **Enviar solo esos cuatro campos borraría chips y descripciones.** Hay que enviar el registro completo.
- **Nombres de campo distintos.** El editor usa `img`; la API espera `img_card`. El editor usa `cuerpo`; la API espera `cuerpo_html`.
- **Formato perdido.** `cargarDatosServicio()` elimina las etiquetas HTML del cuerpo (línea 190) y `guardarServicio()` lo reenvuelve en párrafos (línea 203). Un cuerpo con listas u otro marcado se pierde al guardar.
- **HTML sin sanear.** `cuerpo_html` se guarda crudo y, según la lectura de la página, se renderiza como HTML. Ver AUD-09 (riesgo de XSS si se compromete una cuenta administrativa).
- **Identificadores coincidentes.** Las diez claves de `servicios.js` coinciden con los `id` de la tabla `servicios`. Esto simplifica el mapeo.

### 2.5 Costos y descuentos (`inscripciones.html`, `js/pages/inscripciones.js`)

| Aspecto | Situación actual |
|---|---|
| Qué existe hoy | Los costos ya no están en la página: fueron reemplazados por útiles escolares (`utiles_escolares`, con API y ya integrado). **No hay elementos `data-cost-key` en el HTML**, así que `saveCostosData()` guarda un objeto vacío |
| Editor | `abrirEditorCostos()` solo activa `toggleEditMode()`, que hace editables los `.editable-cell`. En la práctica es un editor de **descuentos** |
| Guardado actual | `saveCostosData()` (línea 627) → `localStorage` (`gds_costos_data`, `gds_descuentos_data`) |
| Lectura pública | `loadCostosData()` (línea 636), llamada en la línea 1013, lee `localStorage`. El visitante ve los valores por defecto del HTML |
| Función de API | `GDS.admin.guardarDescuento` → `admin_descuento_save` (`clave_storage`, `porcentaje`). Solo actualiza. **Sin llamador** |
| Esquema | `descuentos`: `clave_storage UNIQUE`, `porcentaje VARCHAR(10)`, `nombre`, `descripcion`, `activo` |

**Incompatibilidad de claves de descuentos:**

| Clave en la página pública | Significado en la página | Clave en la base | Significado en la base |
|---|---|---|---|
| `desc_pct_0a`, `desc_pct_0b`, `desc_pct_0c` | Becas 1.er, 2.º y 3.er puesto (20%, 15%, 10%) | `desc_pct_0` | Pronto pago 10% |
| `desc_pct_1` | Beca «Hasta 50%» | `desc_pct_1` | Hermanos 15% |
| `desc_pct_2` | Beca «Hasta 50%» | `desc_pct_2` | Ex-estudiantes 5% |
| `desc_pct_3` | 10% | `desc_pct_3` | Colaboradores 20% |
| `desc_pct_4` | 5% | `desc_pct_4` | Preescolar 2026 |
| — | — | `desc_pct_5` | Necesidad (sin elemento público) |

**Las claves tienen el mismo nombre pero significados distintos.** Un mapeo por clave guardaría valores en la fila equivocada. Hace falta una tabla de correspondencia que defina el responsable del colegio.

Además, `GDS.getDescuentos()` no tiene llamador: la página pública nunca lee la base.

---

## 3. AUD-02: diagnóstico del popup

### 3.1 Flujo actual

1. `index.html` registra un `DOMContentLoaded` (línea 2934). Si no existe `sessionStorage.gds_popup_shown`, programa `abrirPopupCarousel()` a los **800 ms**.
2. `abrirPopupCarousel()` (línea 2819) llama a `getPopupSlides()` (línea 2775): `localStorage` o `POPUP_DEFAULT_SLIDES`.
3. Construye el overlay `#popupCarouselOverlay` (líneas 2851-2853) y lo añade al DOM.

### 3.2 Por qué no se carga desde la base de datos

Son **dos defectos independientes**:

| Defecto | Ubicación | Efecto |
|---|---|---|
| D-a. `renderPopupCarouselAPI` no está definida | No existe en ningún archivo | Aunque el código de `gds-api.js` se ejecutara, llamaría a una función inexistente |
| D-b. La comprobación previa falla siempre | `gds-api.js:318` busca `.popup-carousel-overlay` en `DOMContentLoaded`. El overlay solo existe desde `abrirPopupCarousel()`, a los 800 ms | La rama `if (popupEl && ...)` nunca se cumple, aunque D-a estuviera resuelto |

Si solo se definiera `renderPopupCarouselAPI`, el popup seguiría sin cargar datos de la base. **Las dos correcciones son necesarias.**

### 3.3 Contrato correcto

- **Entrada:** `GET popup_slides` devuelve `id`, `img`, `titulo`, `subtitulo`, `tipoAccion`, `accionUrl`, `isPdf` (alias de `es_pdf`), en el orden `orden`. Los nombres coinciden con el modelo local, así que **no hace falta mapeo de campos**.
- **Salida:** `abrirPopupCarousel()` ya construye el carrusel a partir de un arreglo de slides. El diseño existente se conserva si `renderPopupCarouselAPI` reutiliza esa función en lugar de duplicarla.
- **Vacío:** `GET` devuelve `[]` si no hay slides activos. Hoy, con `localStorage` vacío, el popup muestra los valores por defecto. Con la base vacía, la política debe decidirse (ver D4).
- **Error:** si la API falla, hoy se usan `localStorage` y los valores por defecto. Política por decidir (D4).

### 3.4 Problema de sincronización

El popup se abre a los 800 ms, sin esperar a la red. Si la respuesta de `popup_slides` tarda más, el visitante ve los valores por defecto y el popup no se actualiza. Hace falta **esperar la respuesta con un tiempo máximo** antes de abrir el popup.

### 3.5 Ordenamiento de scripts

`gds-api.js` se carga antes que los bloques inline de `index.html`. `getPopupSlides` se declara en un bloque inline, así que una reasignación desde `gds-api.js` funciona solo si se hace después de que se evalúen los bloques. La solución más limpia es no reasignar funciones globales y pasar los datos explícitamente.

---

## 4. Hallazgos adicionales relacionados

Estos hallazgos no están en el alcance de AUD-01 y AUD-02, pero dependen del mismo patrón. Se listan para decidir si entran en el alcance.

| ID | Hallazgo | Ubicación | Severidad |
|---|---|---|---|
| ADD-01 | Las **postulaciones recibidas** se muestran en el panel administrativo desde `localStorage`, y `descargarPostulados()` exporta solo lo guardado en ese navegador. El administrador no ve las inscripciones reales de la base ni de Sheets | `inscripciones.js:313-324`, `648-660` | **Crítico** para la operación |
| ADD-02 | Lecturas públicas desde `localStorage` en horarios, descuentos y servicios. Un visitante ve datos de su propio navegador | `index.html:1886`, `inscripciones.js:636-645`, `servicios.js:213-225` | Alto |
| ADD-03 | `GDS.admin.getInscripciones()` y `getColaboradores()` no envían el token (AUD-16). Son el único camino para leer las postulaciones desde la API | `gds-api.js:27-35`, `173-181` | Alto (depende de ADD-01) |
| ADD-04 | `admin_servicio_save` borra campos si no se envían (sección 2.4) | `api.php:546-556` | Alto (riesgo de pérdida de datos) |
| ADD-05 | Datos HTML sin sanear en `cuerpo_html` y otros campos de la API | `api.php:555`, `gds-api.js` | Medio (AUD-09) |
| ADD-06 | BUG-06: textos largos que exceden la columna producen `PDOException` sin capturar en `api.php` | `api.php` (sin manejador global) | Medio. Afecta a todos los guardados |

---

## 5. Archivos que se modificarían (propuesta)

Todos los cambios son dentro del alcance de AUD-01 y AUD-02. Ningún archivo de `archive/` ni de `storage/database/` se modifica.

| Archivo | Cambio propuesto | Motivo |
|---|---|---|
| `public/gds-api.js` | Añadir funciones de guardado con confirmación del servidor y helper de lectura para popup, horarios y descuentos. Corregir la comprobación de `DOMContentLoaded` del popup | AUD-02 (D-b) y base común de AUD-01 |
| `public/index.html` (bloques inline) | Convenios, popup, horarios: reemplazar `localStorage` por API. Implementar `renderPopupCarouselAPI` reutilizando `abrirPopupCarousel`. Esperar la respuesta del popup con tiempo máximo | AUD-01 y AUD-02 |
| `public/js/pages/servicios.js` | Guardar mediante API enviando el registro completo. Leer la fuente pública desde la API con mezcla sobre el objeto estático | AUD-01 y ADD-04 |
| `public/js/pages/inscripciones.js` | Descuentos: guardar mediante API con tabla de correspondencia de claves. Eliminar la dependencia de costos en `localStorage` | AUD-01 (descuentos) |
| `public/inscripciones.html` | Solo si cambian los identificadores de los descuentos editables | AUD-01 |
| `public/api.php` | Solo si se aprueba D5 (endpoint de horario festivos) o si el contrato de `servicios` requiere campos adicionales. Sin cambios de contrato existentes | AUD-01 |
| `public/style.css` | Sin cambios previstos | — |
| Base de datos | **Sin cambios de esquema previstos.** Si se aprueba D5, se añadiría un endpoint, no una tabla nueva | — |

**Dependencias de otras fases:**

- Los guardados administrativos usan `admin_*`, que la **fase 1 (S2)** protegerá con `ADMIN_ENABLED`. Sin esa fase, o sin habilitar el panel en un entorno de prueba, la persistencia no puede probarse.
- Las pruebas de persistencia requieren una base de datos de prueba independiente (G1 de la fase 1).

---

## 6. Decisiones necesarias antes de editar

| ID | Decisión | Opciones | Recomendación |
|---|---|---|---|
| D1 | Imágenes subidas como archivo (convenios y popup) | (a) Solo URL o ruta existente. (b) Endpoint de subida que escriba en el servidor | (a) por ahora. (b) requiere carpeta de almacenamiento, validación de tipo y tamaño, y aprobación de seguridad |
| D2 | Festivos del horario | (a) Retirar la función de la interfaz. (b) Añadir endpoint por fecha. (c) Dejarla solo local | (a) o (c) hasta definir el requisito real |
| D3 | Costos (sin tabla) | (a) Retirar el editor de costos y dejar solo descuentos. (b) Crear tabla `costos` (requiere aprobación) | (a). Los costos ya viven en útiles, que sí está en la base |
| D4 | Política del popup y de otros contenidos públicos | Base vacía: (a) no mostrar nada, (b) valores por defecto. API caída: (a) valores por defecto del código, (b) no mostrar | Base vacía: no mostrar. API caída: valores por defecto del código, sin usar `localStorage` |
| D5 | Nombres de curso en horarios | (a) Mapa de nombres en código (`1°A` → `1A`). (b) Cambiar los datos de `cursos` (requiere aprobación porque modifica datos) | (a), sin modificar datos |
| D6 | Tabla de correspondencia de descuentos | Definida por el responsable del colegio | Requiere confirmación escrita; no se puede deducir del código |
| D7 | Alcance de ADD-01 (postulaciones en `localStorage`) | Dentro o fuera de esta corrección | Fuera de AUD-01 y AUD-02, pero es el hallazgo de mayor impacto operativo. Recomiendo tratarlo como corrección propia |
| D8 | Mensaje cuando la API no está disponible | Bloquear el guardado con aviso, o permitir borrador local marcado como «no guardado» | Bloquear. Nunca mostrar éxito. Un borrador local, si se aprueba, debe mostrarse como «no guardado en el servidor» |

---

## 7. Pruebas propuestas

**Entorno:** base de prueba independiente con datos ficticios. Opción preferida: copia del script de instalación con otro nombre de base, en una base vacía creada para la prueba. El script contiene `DROP TABLE IF EXISTS` sobre tablas que en una base vacía no existen, pero **requiere aprobación** por la regla de no ejecutar SQL destructivo. Nunca se conecta a `sistema_admisiones` ni a producción.

| ID | Prueba | Resultado esperado |
|---|---|---|
| T01 | Guardar un convenio nuevo | Aparece en `GET convenios` tras recargar |
| T02 | Editar un convenio existente | Cambia en la base; el registro se identifica por `id` |
| T03 | Eliminar un convenio | `activo=0`; desaparece del público, no de la base |
| T04 | Guardar con la API caída | Aviso de error; no hay mensaje de éxito; no hay escritura en `localStorage` |
| T05 | Guardar con datos vacíos o demasiado largos | Error mostrado; no hay `PDOException` sin capturar |
| T06 | Guardar un servicio sin enviar `chips` | **Debe fallar la prueba si chips se borra**; el cliente debe enviar el registro completo |
| T07 | Guardar un horario con `1°A` | Mapeo a `1A`; la celda se guarda |
| T08 | Popup con base vacía | Según D4 |
| T09 | Popup con API caída | Según D4; sin error visible al visitante |
| T10 | Popup con respuesta lenta | Espera hasta el tiempo máximo; sin doble apertura |
| T11 | Recargar tras guardar | El cambio persiste y el público lo recibe |
| T12 | Sin token o token incorrecto | Rechazo 401 o 403; el cliente lo muestra |

---

## 8. Riesgos que permanecen

| Riesgo | Mitigación |
|---|---|
| Un guardado parcial de servicios borra chips y descripciones (ADD-04) | Enviar el registro completo; prueba T06 |
| Un mapeo de descuentos por clave guarda en la fila equivocada | Tabla de correspondencia aprobada (D6) |
| Imágenes base64 rompen el INSERT | D1: no enviar base64 |
| Sin fase 1, el panel administrativo no tiene protección de servidor | Dependencia: fase 1 antes de habilitar guardados en cualquier entorno accesible |
| Las postulaciones siguen sin llegar al administrador (ADD-01) | D7 |
| Un cambio en `index.html` sin extraer amplía el riesgo (AUD-11) | Cambios mínimos en los bloques afectados; sin extracción en esta corrección |
| La API de admin devuelve errores en formato no JSON ante `PDOException` (BUG-06) | Manejador global en la fase 1 o en esta corrección si se aprueba |

---

## 9. Alcance excluido

- AUD-04, AUD-05 y AUD-07 (iconos, rutas y `gdsAvatar`).
- Extracción de `index.html` y de `organigrama.html`.
- Corrección de BUG-01 y BUG-02 (fase 1.1).
- Autenticación de servidor (fase posterior).
- Cualquier cambio en `archive/` o en `storage/database/`.

---

## 10. Registro

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 30/10/2026 | Diagnóstico inicial de AUD-01 y AUD-02. Sin cambios en código |
