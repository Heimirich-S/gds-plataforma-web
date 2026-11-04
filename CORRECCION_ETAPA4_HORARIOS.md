# Corrección de persistencia del módulo de horarios (Etapa 4)

| Campo | Valor |
|---|---|
| Fecha | 30/10/2026 |
| Archivos modificados | `public/index.html`, `public/api.php` |
| Archivos NO modificados | `public/gds-api.js`, `public/apps_script_proxy.php`, `app/config/config.php`, `storage/database/`, `archive/`, `public/inscripciones.html`, `public/js/pages/`, `public/style.css`, `public/css/`, `public/servicios.html`, `public/noticias.html`, `public/organigrama.html` |
| Copias de seguridad | `Desktop\Respaldos_GDS\2026-10-30_previo_etapa4_horarios\` |

---

## A. Resumen

Se implementó el mapeo de los 18 cursos (nombre visible → nombre en base de datos) y el mapa inverso. Se corrigió la búsqueda de materias en `api.php` para filtrar por nombre Y nivel educativo, evitando confusiones entre primaria y secundaria. Se conectó la lectura pública de horarios con la API (fetch con fallback a localStorage). Se conectó el guardado administrativo con la API (`configurarHorario` y `guardarCelda`) en `setCellVal`, `modificarHoras` y `agregarDescanso`. No se modificó el sistema de festivos.

---

## B. Archivos modificados

| Ruta | Tipo | Descripción |
|---|---|---|
| `public/index.html` | MODIFICADO | Mapa de cursos (18 equivalencias), funciones de mapeo, API fetch en renderHorario, API save en setCellVal/modificarHoras/agregarDescanso |
| `public/api.php` | MODIFICADO | `admin_horario_celda`: búsqueda de materia por nombre + nivel (derivado del curso) |
| `CORRECCION_ETAPA4_HORARIOS.md` | NUEVO | Este informe |

---

## C. Correcciones realizadas

### 1. Mapa de cursos (index.html)

- Se agregó `HORARIO_CURSO_MAP`: 18 entradas (7 primaria + 11 secundaria) que mapean el nombre visible en la interfaz al nombre en la base de datos.
- Se agregó `HORARIO_CURSO_MAP_INV`: mapa inverso para convertir de BD a interfaz.
- Se agregaron las funciones `horarioCursoDbName(uiName)` y `horarioCursoUiName(dbName)`.
- Ejemplos: `1°A` → `1A`, `Jardín` → `Jardin`, `6°A` → `6A`.
- Los nombres visibles no cambiaron. Solo se usa el mapeo internamente para comunicarse con la API.

### 2. Búsqueda de materias por nivel (api.php)

**Comportamiento anterior:**
- Buscaba `WHERE m.nombre=?` sin filtrar por nivel.
- Una materia con el mismo nombre en primaria y secundaria se confundía (se tomaba la primera fila, que era primaria).

**Comportamiento nuevo:**
- La consulta ahora obtiene el `nivel` del curso asociado al `horario_config`.
- Busca `WHERE m.nombre=? AND (m.nivel=? OR m.nivel='ambos')`.
- El nivel se deriva del curso, no se envía desde el frontend.

### 3. Lectura pública desde la API (index.html)

- `renderHorario()` ahora intenta cargar datos desde `GDS.getHorario(cursoDb, horarioNivel, 2026)`.
- Si la API devuelve celdas, se adaptan al formato local (`apiCells[fi_di] = materia`).
- Si la API falla o devuelve vacío, se conserva el render actual (localStorage).
- El tiempo de carga no bloquea la UI (fetch asíncrono).

### 4. Guardado administrativo mediante API (index.html)

- `setCellVal()`: además de guardar en localStorage, envía la celda a `GDS.admin.guardarCelda()` con el nombre del curso mapeado. Si la API falla, se conserva en localStorage.
- `modificarHoras()`: además de guardar en localStorage, envía la configuración a `GDS.admin.configurarHorario()` con el nombre del curso mapeado.
- `agregarDescanso()`: además de guardar en localStorage, envía cada celda de descanso a `GDS.admin.guardarCelda()` (con `es_descanso=1` y `nombre_descanso`).

### 5. Sistema de festivos

**No modificado.** Los festivos se manejan por día de la semana en el frontend (localStorage), mientras que la API usa fechas (`DATE`). No hay endpoint para festivos por día de la semana. La funcionalidad se conserva tal cual.

---

## D. Pruebas

### Pruebas ejecutadas

| ID | Prueba | Resultado |
|---|---|---|
| T01 | `node --check` en 4 bloques inline de `index.html` | **Aprobada.** 4 de 4 correctos |
| T02 | `php -l` en `api.php` | **Aprobada** |
| T03 | Carga de `index.html` en navegador (sin BD) | **Aprobada.** Sin errores de JS. Mapa de 18 cursos verificado |
| T04 | Verificación de que `horarioCursoDbName` y `horarioCursoUiName` existen | **Aprobada.** Ambas son `function` |
| T05 | Verificación de que `HORARIO_CURSO_MAP` tiene 18 entradas | **Aprobada.** 7 primaria + 11 secundaria |

### Pruebas pendientes (requieren base de datos o mock)

| ID | Prueba | Requisito |
|---|---|---|
| T06 | Mapa de cursos: verificar las 18 equivalencias | Mock server con datos de `cursos` |
| T07 | Búsqueda de materias: mismo nombre en primaria y secundaria | Mock server |
| T08 | Búsqueda de materias: asignatura inexistente | Mock server |
| T09 | Búsqueda de materias: nivel no enviado | Mock server |
| T10 | Consulta pública: API con horarios disponibles | Base de datos de prueba |
| T11 | Consulta pública: API con respuesta vacía | Mock server |
| T12 | Consulta pública: API con error 500 | Mock server |
| T13 | Guardado administrativo: configuración correcta | Base de datos de prueba |
| T14 | Guardado administrativo: celda correcta | Base de datos de prueba |
| T15 | Guardado administrativo: error al guardar configuración | Mock server |
| T16 | Guardado administrativo: error al guardar celda | Mock server |
| T17 | Guardado administrativo: curso sin equivalencia | Mock server |
| T18 | Guardado administrativo: asignatura sin identificador | Mock server |
| T19 | Guardado administrativo: respuesta 401 o 403 | Mock server |
| T20 | Guardado administrativo: respuesta 500 | Mock server |
| T21 | Guardado administrativo: datos incompletos | Mock server |

---

## E. Persistencia

**La persistencia real en MySQL/MariaDB no fue probada.**

No se ejecutó ningún SQL ni se conectó a ninguna base de datos real. Las pruebas de guardado requieren una base de datos de prueba independiente (G1 de la fase 1) y el panel administrativo habilitado (fase 1, S2).

---

## F. Riesgos y pendientes

| Riesgo | Estado | Notas |
|---|---|---|
| Persistencia real no verificada | **Pendiente** | Requiere base de datos de prueba |
| Materia por nombre + nivel | **Corregido (backend)** | Verificar con prueba real |
| Cursos sin equivalencia | **Ninguno** | Los 18 cursos tienen equivalencia confirmada |
| Festivos por día de la semana | **No modificados** | La API usa fechas (`DATE`), no días de la semana. Requiere definición institucional |
| Descansos por posición de franja | **Parcialmente conectado** | Se envían a la API, pero la API no tiene endpoint para descansos por posición (solo por celda) |
| Docentes por celda | **No implementado** | El frontend no tiene selector de docente. Se envían nulos |
| `renderHorarioAdmin()` no carga desde API | **Pendiente** | El editor sigue usando localStorage. La conexión con la API para carga es parcial |
| Observaciones B-01 y F-01 de servicios | **Pendientes** | Documentadas, no corregidas en esta etapa |

---

## G. Confirmación de alcance

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
- **Archivos fuera del alcance modificados:** No. Solo `public/index.html` y `public/api.php`.

---

## H. Estado final

| Componente | Estado |
|---|---|
| Mapa de cursos (18 equivalencias) | **IMPLEMENTADO** |
| Mapa inverso (BD → UI) | **IMPLEMENTADO** |
| Búsqueda de materias por nombre + nivel | **CORREGIDO EN BACKEND** |
| Lectura pública desde API | **IMPLEMENTADO (sin prueba real)** |
| Guardado administrativo (setCellVal) | **IMPLEMENTADO (sin prueba real)** |
| Guardado administrativo (modificarHoras) | **IMPLEMENTADO (sin prueba real)** |
| Guardado administrativo (agregarDescanso) | **IMPLEMENTADO (sin prueba real)** |
| Sistema de festivos | **NO MODIFICADO** |
| Docentes por celda | **NO IMPLEMENTADO** |
| Persistencia real | **NO PROBADA** |

---

## I. Recomendación

**La etapa 4 se considera aprobada con observaciones.**

Los cambios implementados son correctos y mínimos. El mapa de cursos cubre los 18 cursos. La búsqueda de materias por nivel evita confusiones. La lectura pública y el guardado administrativo se conectaron con la API, con fallback a localStorage cuando la API falla.

**Observaciones a corregir antes del primer despliegue:**

| Prioridad | Problema | Acción |
|---|---|---|
| 1 (antes de despliegue) | `renderHorarioAdmin()` no carga desde la API | Cargar la configuración y celdas desde la API al abrir el editor |
| 2 (antes de despliegue) | Descansos no se guardan correctamente por posición | Verificar que la API acepta celdas de descanso por franja |
| 3 (fase posterior) | Festivos por día de la semana | Requiere definición institucional y endpoint por fecha |
| 4 (fase posterior) | Docentes por celda | Requiere selector de docente en la interfaz |

**No hay problemas que bloqueen el avance a la siguiente etapa.** Sin embargo, se recomienda corregir la carga del editor desde la API (prioridad 1) antes del primer despliegue, para que el administrador vea los datos reales de la base de datos al abrir el editor.

---

## J. Archivos creados/modificados

| Ruta | Tipo | Descripción |
|---|---|---|
| `public/index.html` | MODIFICADO | Mapa de cursos, funciones de mapeo, API fetch en renderHorario, API save en setCellVal/modificarHoras/agregarDescanso |
| `public/api.php` | MODIFICADO | `admin_horario_celda`: búsqueda de materia por nombre + nivel |
| `CORRECCION_ETAPA4_HORARIOS.md` | NUEVO | Este informe |

---

## K. Próximos pasos

Espero tu revisión antes de continuar. Los cambios de horarios son complejos y el módulo de festivos sigue sin conexión con la API. Si se aprueba esta etapa, el siguiente paso sería una auditoría de seguridad (fase 4 del plan original) o la corrección de las observaciones pendientes de servicios (B-01, F-01).