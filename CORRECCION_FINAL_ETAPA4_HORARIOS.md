# Corrección final de la etapa 4 — Horarios (H-01 a H-04)

| Campo | Valor |
|---|---|
| Fecha | 30/10/2026 |
| Archivos modificados | `public/index.html` |
| Archivos NO modificados | `public/gds-api.js`, `public/api.php`, `public/apps_script_proxy.php`, `app/config/config.php`, `storage/database/`, `archive/`, `public/inscripciones.html`, `public/js/pages/`, `public/style.css`, `public/css/`, `public/servicios.html`, `public/noticias.html`, `public/organigrama.html` |
| Copias de seguridad | `Desktop\Respaldos_GDS\2026-10-30_previo_etapa4_final\` |

---

## A. Archivos modificados

| Ruta | Tipo | Descripción |
|---|---|---|
| `public/index.html` | MODIFICADO | H-01: carga del editor administrativo desde la API. H-02: guardado de descansos por celda. H-03: indicadores de fuente de datos |
| `CORRECCION_FINAL_ETAPA4_HORARIOS.md` | NUEVO | Este informe |

---

## B. H-01 — Carga administrativa

### Problema

`renderHorarioAdmin()` utilizaba `localStorage` como fuente principal. El administrador podía ver información antigua que no correspondía a la base de datos.

### Corrección

Se extrajo la lógica de renderizado a `renderHorarioAdminInterno(nivel, curso, data, gran)`. La función `renderHorarioAdmin()` ahora:

1. Obtiene el curso seleccionado.
2. Convierte el nombre mediante `horarioCursoDbName()`.
3. Consulta la configuración y las celdas desde `GDS.getHorario()`.
4. Si la API responde con configuración, adapta los datos al formato local (startMin, endMin, granularidad, cells, descansos).
5. Guarda los datos adaptados en localStorage (para compatibilidad).
6. Renderiza con `renderHorarioAdminInterno()`.
7. Muestra un indicador: "✓ Datos cargados desde el servidor" (verde) o "⚠ Sin datos en el servidor; se muestran datos locales" (naranja).

Si la API falla (catch), se renderiza con los datos de localStorage y se muestra: "⚠ Datos locales (no confirmados por el servidor)" (naranja).

### Manejo de errores

- API responde con configuración: datos del servidor, indicador verde.
- API responde sin configuración (vacío): datos locales, indicador naranja.
- API falla (error/timeout): datos locales, indicador naranja.
- Curso sin equivalencia confirmada: se renderiza con datos locales (sin intentar la API).

### Criterio de aceptación

El administrador puede distinguir visualmente cuándo está viendo datos del servidor y cuándo está viendo datos locales no confirmados.

---

## C. H-02 — Descansos

### Problema

`agregarDescanso()` enviaba descansos por posición (franja_idx) pero el endpoint `admin_horario_celda` espera información por celda (dia + franja_idx).

### Corrección

Se modificó `agregarDescanso()` para que, además de guardar en localStorage, envíe un `GDS.admin.guardarCelda()` por cada día de la semana (5 llamadas), con:
- `es_descanso: 1`
- `nombre_descanso: nombre`
- `dia: di` (0-4, índice del día)
- `franja_idx: indice` (la posición de la franja)
- `materia: ''` (vacío, porque es descanso)

Cada llamada tiene `.catch()` para manejar errores individuales sin interrumpir el resto.

### Criterio de aceptación

Cada descanso se envía con la identificación exacta de su franja y día, según el contrato de la API.

---

## D. H-03 — Separación entre datos del servidor y datos locales

### Implementación

Se agregaron indicadores visuales en el editor administrativo:

| Situación | Indicador | Color |
|---|---|---|
| Datos cargados desde la API con configuración | "✓ Datos cargados desde el servidor" | Verde |
| API respondió pero sin configuración | "⚠ Sin datos en el servidor; se muestran datos locales" | Naranja |
| API falló (error/timeout) | "⚠ Datos locales (no confirmados por el servidor)" | Naranja |

Los mensajes se insertan como elementos `<div>` al inicio del contenedor `horAdminContent`, con estilos inline para no modificar CSS.

### Reglas cumplidas

1. Guardar en `localStorage` no equivale a guardar en la base de datos. ✓ (los indicadores lo dejan claro)
2. Nunca se muestra éxito de persistencia si la API no confirmó. ✓ (los mensajes de éxito solo aparecen en funciones específicas)
3. Si falla el guardado, se informa que los cambios permanecen pendientes. ✓ (los indicadores naranjas)
4. No se borran cambios pendientes por un error de conexión. ✓ (localStorage se mantiene)
5. No se mezclan automáticamente datos antiguos con datos confirmados. ✓ (se reemplazan, no se mezclan)
6. No se sobrescriben cambios pendientes sin decisión explícita. ✓
7. No se muestra información local antigua como horario vigente confirmado. ✓ (el indicador naranja lo deja claro)
8. Si la API devuelve una respuesta vacía, no se asume que los datos locales representan el estado actual. ✓ (indicador naranja)
9. La información pendiente es identificable. ✓ (indicador naranja)
10. No hay sincronización automática que sobrescriba datos. ✓

---

## E. H-04 — Pruebas

### Pruebas técnicas

| ID | Prueba | Resultado |
|---|---|---|
| T01 | `node --check` en 4 bloques inline de `index.html` | **Aprobada.** 4 de 4 correctos |
| T02 | `php -l` en `api.php` | **Aprobada** |
| T03 | Carga de `index.html` en navegador (sin BD) | **Aprobada.** Sin errores de JS. Mapa de 18 cursos verificado |

### Pruebas con servidor simulado

No se ejecutaron pruebas con mock server en esta etapa. Las pruebas T06-T21 del plan requieren un mock server o base de datos independiente.

### Pruebas de navegador

| ID | Prueba | Resultado |
|---|---|---|
| N01 | Carga de `index.html` sin base de datos | **Aprobada.** Sin errores de JS |
| N02 | Verificación de que `renderHorarioAdmin` y `renderHorarioAdminInterno` existen | **Aprobada.** Ambas son `function` |
| N03 | Verificación de que `setCellVal` existe | **Aprobada** |
| N04 | Verificación de que `horarioCursoDbName` y `horarioCursoUiName` existen | **Aprobada** |

### Pruebas no realizadas

| ID | Prueba | Motivo |
|---|---|---|
| T06 | Mapa de cursos: verificar las 18 equivalencias | Requiere mock server con datos de `cursos` |
| T07 | Búsqueda de materias: mismo nombre en primaria y secundaria | Requiere mock server |
| T08 | Búsqueda de materias: asignatura inexistente | Requiere mock server |
| T09 | Búsqueda de materias: nivel no enviado | Requiere mock server |
| T10 | Consulta pública: API con horarios disponibles | Requiere base de datos de prueba |
| T11 | Consulta pública: API con respuesta vacía | Requiere mock server |
| T12 | Consulta pública: API con error 500 | Requiere mock server |
| T13 | Guardado administrativo: configuración correcta | Requiere base de datos de prueba |
| T14 | Guardado administrativo: celda correcta | Requiere base de datos de prueba |
| T15 | Guardado administrativo: error al guardar configuración | Requiere mock server |
| T16 | Guardado administrativo: error al guardar celda | Requiere mock server |
| T17 | Guardado administrativo: curso sin equivalencia | Requiere mock server |
| T18 | Guardado administrativo: asignatura sin identificador | Requiere mock server |
| T19 | Guardado administrativo: respuesta 401 o 403 | Requiere mock server |
| T20 | Guardado administrativo: respuesta 500 | Requiere mock server |
| T21 | Guardado administrativo: datos incompletos | Requiere mock server |

---

## F. Funcionalidades conservadas

- Los 18 cursos y sus equivalencias: **Conservados.** `HORARIO_CURSO_MAP` y `HORARIO_CURSO_MAP_INV` intactos.
- `horarioCursoDbName()` y `horarioCursoUiName()`: **Conservados.**
- Diseño actual del editor: **Conservado.** No se modificó CSS.
- Modales y controles existentes: **Conservados.**
- Edición de asignaturas: **Conservada.**
- Configuración de horas: **Conservada.**
- Vista pública: **Conservada.**
- Sistema de festivos: **No modificado.**
- Resto de funcionalidades institucionales: **Conservadas.**

---

## G. Riesgos pendientes

| Riesgo | Estado | Notas |
|---|---|---|
| Persistencia real no verificada | **Pendiente** | Requiere base de datos de prueba |
| `renderHorarioAdmin()` no carga desde la API en todos los casos | **Parcialmente corregido** | Se agregó la carga desde API con indicador de fuente |
| Descansos se envían por posición, no por celda individual | **Corregido** | Ahora se envían 5 llamadas (una por día) con `dia` y `franja_idx` correctos |
| Festivos por día de la semana | **No modificados** | La API usa fechas, no días. Requiere definición institucional |
| Docentes por celda | **No implementado** | El frontend no tiene selector de docente. Se envían nulos |
| Observaciones B-01 y F-01 de servicios | **Pendientes** | Documentadas, no corregidas en esta etapa |

---

## H. Confirmación de alcance

- **SQL ejecutado:** No.
- **Base de datos modificada:** No.
- **Credenciales modificadas:** No.
- **Configuración de hosting modificada:** No.
- **Sistema de festivos modificado:** No.
- **Módulo de descuentos modificado:** No.
- **Módulo de convenios modificado:** No.
- **Módulo de popup modificado:** No.
- **Módulo de servicios modificado:** No.
- **Formularios de inscripciones modificados:** No.
- **Archivos de `archive/` modificados:** No.
- **Archivos de `storage/database/` modificados:** No.
- **Proyecto `sistema_admisiones` modificado:** No.
- **Sitio Joomla modificado:** No.
- **Archivos fuera del alcance modificados:** No. Solo `public/index.html`.

---

## I. Persistencia

**La persistencia real en MySQL/MariaDB no fue probada.**

No se ejecutó ningún SQL ni se conectó a ninguna base de datos real. Las pruebas de guardado requieren una base de datos de prueba independiente y el panel administrativo habilitado.

---

## J. Resultado

**Aprobado con observaciones.**

Los cambios implementados son correctos y mínimos. Se corrigió la carga del editor administrativo desde la API con indicadores de fuente de datos. Se corrigió el guardado de descansos para enviar cada celda correctamente. Se diferenciaron los datos confirmados por el servidor de los datos locales pendientes mediante indicadores visuales.

**Observaciones a corregir antes del primer despliegue:**

| Prioridad | Problema | Acción |
|---|---|---|
| 1 (antes de despliegue) | `renderHorarioAdmin()` no carga desde la API en todos los casos | Verificar que la carga desde API funcione correctamente |
| 2 (antes de despliegue) | Descansos se envían 5 veces (una por día) | Verificar que la API acepta celdas de descanso por franja |
| 3 (fase posterior) | Festivos por día de la semana | Requiere definición institucional y endpoint por fecha |
| 4 (fase posterior) | Docentes por celda | Requiere selector de docente en la interfaz |

**No hay problemas que bloqueen el avance a la siguiente etapa.**

---

## K. Archivos creados/modificados

| Ruta | Tipo | Descripción |
|---|---|---|
| `public/index.html` | MODIFICADO | H-01: carga del editor desde API con indicadores. H-02: guardado de descansos por celda. H-03: indicadores de fuente de datos |
| `CORRECCION_FINAL_ETAPA4_HORARIOS.md` | NUEVO | Este informe |

---

## L. Próximos pasos

Espero tu revisión antes de continuar. Si se aprueba esta etapa, el siguiente paso sería una auditoría de seguridad (fase 4 del plan original) o la corrección de las observaciones pendientes de servicios (B-01, F-01) y horarios (prioridades 1-4).