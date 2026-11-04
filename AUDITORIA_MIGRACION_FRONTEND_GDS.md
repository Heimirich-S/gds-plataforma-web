# Auditoría de migración CSS y JavaScript — Plataforma Web GDS

| Campo | Valor |
|---|---|
| Fecha | 30/10/2026 |
| Tipo | Auditoría de solo lectura. No se modificó ningún archivo del proyecto ni del servidor |
| Alcance | Migración de CSS y JavaScript de `index`, `noticias`, `organigrama`, `servicios` e `inscripciones` |
| Entorno de pruebas | Servidor PHP 8.4.27 integrado (`php -S`) sobre `public/`, en `127.0.0.1:8080`. Sin base de datos `gds_web` (la API responde 500 por diseño de la prueba) |
| Entorno de navegador | Chromium del escritorio, mediante la herramienta de navegador |

---

## 1. Resumen ejecutivo

- **La extracción de CSS y JavaScript está completa en cuatro páginas** (`noticias`, `servicios`, `inscripciones`, y `organigrama` en JavaScript). **`index.html` sigue con 4 bloques `<script>` inline** (unas 1 843 líneas) y **`organigrama.html` conserva un bloque `<style>` de 112 líneas**.
- **No hay errores de sintaxis.** Los 8 archivos JavaScript externos y los 4 bloques inline de `index.html` pasan `node --check`. Los 4 archivos PHP pasan `php -l` en PHP 8.4.27.
- **Las pruebas de navegador no encontraron errores de JavaScript** en las cinco páginas. La consola solo muestra errores 500 de la API, porque no existe la base de datos local, y el sitio sigue funcionando con su contenido por defecto.
- **Se encontraron fallos funcionales reales**, que la validación sintáctica no detecta:
  1. Los editores de administración de convenios, popup, horarios, servicios y costos guardan solo en `localStorage` del navegador. Las funciones de la API que deberían persistir esos cambios no tienen ningún llamador. **Los cambios administrativos no llegan a la base de datos ni al público.** Es el hallazgo de mayor gravedad de esta auditoría.
  2. La integración del popup con la base de datos nunca se ejecuta: `renderPopupCarouselAPI` no está definida en ningún archivo.
  3. Hay recursos rotos: cinco iconos `.svg` inexistentes en `inscripciones.html`, rutas `.jpg` antiguas en `inscripciones.js` y una imagen externa no disponible en `servicios.html`.
- **Lo que no se ha probado:** el panel administrativo, los envíos de formularios, las integraciones con Google/EmailJS, la base de datos y el diseño móvil. Son pruebas que requieren base de datos, servicios externos o cambios de viewport que no están disponibles en esta auditoría.

---

## 2. Estado de migración por página

| Página | CSS externo | CSS inline | JS externo | JS inline | `style=` | `on*=` | Estado |
|---|---|---|---|---|---|---|---|
| `index.html` | `style.css`, `css/pages/index.css` | No | `js/modules/avatar.js`, `gds-api.js`, `js/common.js` | **4 bloques, 1 843 líneas** | 136 | 129 | **Migración parcial** (JavaScript pendiente) |
| `noticias.html` | `style.css`, `css/pages/noticias.css` | No | `gds-api.js`, `js/pages/noticias.js` | No | 32 | 34 | **Extracción completa**; atributos inline pendientes |
| `organigrama.html` | `style.css` | **Sí, 112 líneas** | `gds-api.js`, `js/pages/organigrama.js` | No | 31 | 54 | **Migración parcial** (CSS pendiente). `css/pages/organigrama.css` existe pero no está enlazado |
| `servicios.html` | `style.css`, `css/pages/servicios.css` | No | `gds-api.js`, `js/pages/servicios.js` | No | 33 | 38 | **Extracción completa**; atributos inline pendientes |
| `inscripciones.html` | `style.css`, `css/pages/inscripciones.css` | No | `gds-api.js`, `js/common.js`, `js/pages/inscripciones.js` | No | 46 | 59 | **Extracción completa**; atributos inline pendientes |

Totales en HTML: 278 atributos `style=` y 314 atributos `on*=` (manejadores inline). Según la decisión tomada en la fase anterior, los manejadores inline se conservan de forma temporal para no romper funciones globales.

### 2.1 Elementos que permanecen inline

| Tipo | Ubicación | Motivo declarado | Estado |
|---|---|---|---|
| Bloques `<script>` (4) | `index.html`, líneas 20-41, 1242-2693, 2695-2702 y 2704-3064 | Pendiente de extracción | **Pendiente** |
| Bloque `<style>` (112 líneas) | `organigrama.html`, líneas 15-127 | Pendiente de extracción | **Pendiente** |
| Atributos `style=` (278) | Todas las páginas | Valores dinámicos o estilos de componente | Intencional en su mayoría; sin inventario de cuáles son permanentes |
| Atributos `on*=` (314) | Todas las páginas | Compatibilidad con funciones globales | Intencional; eliminación en fase 2 |
| Cadenas de plantilla con `onclick` en JavaScript | `js/pages/noticias.js` (líneas 290-359), `gds-api.js`, `js/pages/organigrama.js` | Render dinámico | Pendiente. Ver AUD-09 |

### 2.2 Archivos CSS y JS identificados

**CSS**

| Archivo | Referenciado por | Estado |
|---|---|---|
| `style.css` | Todas las páginas | En uso |
| `css/pages/index.css` | `index.html` | En uso |
| `css/pages/noticias.css` | `noticias.html` | En uso |
| `css/pages/servicios.css` | `servicios.html` | En uso |
| `css/pages/inscripciones.css` | `inscripciones.html` | En uso |
| `css/pages/organigrama.css` | Ninguna | **Sin referencias**. Probable migración incompleta |
| `css/home.css` | Ninguna | **Sin referencias**. Candidato a eliminación (no se elimina sin autorización) |

**JavaScript**

| Archivo | Referenciado por | Observaciones |
|---|---|---|
| `gds-api.js` | Todas las páginas | Cliente de API. Redefine funciones globales (ver sección 5) |
| `js/common.js` | `index.html`, `inscripciones.html` | No se carga en `noticias`, `organigrama` ni `servicios` |
| `js/modules/avatar.js` | `index.html` | Su `gdsAvatar` queda **sobrescrita** por la versión inline de `index.html`. Código inactivo |
| `js/pages/noticias.js` | `noticias.html` | 639 líneas. Incluye navegación propia |
| `js/pages/organigrama.js` | `organigrama.html` | 354 líneas. Define su propio `gdsAvatar` |
| `js/pages/servicios.js` | `servicios.html` | 227 líneas. Incluye el bloque de administración |
| `js/pages/inscripciones.js` | `inscripciones.html` | 1 058 líneas. Incluye el bloque de administración |
| `script.js` | Ninguna | Archivo de compatibilidad sin uso (6 líneas) |

---

## 3. Verificación de integridad

**Método:** comparación entre el código actual y los bloques originales. Las versiones originales se encuentran en `archive/legacy/GDSavio/` y en el respaldo verificado del 30/10/2026. **Como esas versiones pueden ser anteriores a la última extracción, las equivalencias marcadas como "no comprobado" no se han inferido.**

| Elemento | Resultado | Evidencia |
|---|---|---|
| Funciones del bloque inline de `index.html` | Presentes en el navegador (`abrirFAQ`, `abrirHorario`, `renderHorario`, `abrirModalColaborador`, `toggleFaq`, `gdsAlert`, `gdsConfirm`, `gdsPrompt`, `adminCheckAuth`, `doAdminStep1`, entre otras) | Ejecución en navegador |
| Funciones de `noticias.js` | Presentes: `renderNoticias`, `renderPeriodicos`, `renderDocumentos`, `renderAll`, `gdsRevealInit`, `gdsAttachTiltAll`, `adminCheckAuth` | Ejecución en navegador |
| Funciones de `organigrama.js` | Presentes: `adminCheckAuthOrg`, `enviarOrgOTP`, `renderPromocionesGrid`, `renderDirectivosFromStorage`, `gdsAvatar` | Ejecución en navegador |
| Funciones de `servicios.js` | Presentes: `adminCheckAuth`, `renderOrganigramaAPI` (de `gds-api.js`) | Ejecución en navegador |
| Funciones de `inscripciones.js` | Presentes: `adminCheckAuthInsc`, `renderUtilesEscolares`, `renderUtilesInscList`, `renderOrganigramaAPI` | Ejecución en navegador |
| Event listeners y manejadores | Verificados los visibles en la portada (FAQ, horario, modal de postulación, carrusel). Resto solo por lectura | Ejecución parcial |
| Validaciones de formularios | Validación nativa verificada en inscripciones (15 campos inválidos). Validación JavaScript **no ejecutada** | Ver sección 4 |
| Modales | Abren y cierran en index (FAQ, horario, colaborador) y servicios (`svModalBackdrop`) | Ejecución en navegador |
| Menús responsive | Elementos presentes (`navbar`, `hamburger`, `navLinks`). **Comportamiento móvil no probado** | Solo presencia |
| Animaciones | Carrusel verificado (cambia de slide cada 5 s). Reveal y tilt no verificados visualmente | Parcial |
| Integraciones API | Llamadas presentes y con fallback a contenido por defecto. Respuestas reales **no probadas** (sin base de datos) | Ejecución con API no disponible |
| Almacenamiento local | Lectura y escritura en `localStorage` verificadas por lectura de código | Solo lectura |
| Funciones administrativas | Login, editores y guardados **no ejecutados** (el login envía un código real por correo) | Solo lectura |

**Resultado de integridad:** no se han detectado funciones perdidas en el código extraído. La pérdida de funcionalidad real está en la integración con la base de datos, sección 6, AUD-01 y AUD-02.

---

## 4. Verificación técnica

### 4.1 Sintaxis

| Comprobación | Archivos | Resultado |
|---|---|---|
| `node --check` | `gds-api.js`, `script.js`, `js/common.js`, `js/modules/avatar.js`, `js/pages/noticias.js`, `js/pages/organigrama.js`, `js/pages/servicios.js`, `js/pages/inscripciones.js` | **8 de 8 correctos** |
| `node --check` (bloques inline extraídos) | `index.html`, bloques 1 a 4 | **4 de 4 correctos** |
| `php -l` (PHP 8.4.27) | `app/config/config.php`, `public/api.php`, `public/apps_script_proxy.php`, `public/config.php` | **4 de 4 correctos** |

### 4.2 Referencias

| Comprobación | Resultado |
|---|---|
| Archivos `src`/`href` locales inexistentes | `inscripciones.html`: 5 referencias `img/iconos/*.svg` (ver AUD-05). Las demás páginas: ninguna |
| Rutas de imagen en JavaScript inexistentes | `inscripciones.js`: 6 referencias `img/*.jpg` a archivos que no existen (ver AUD-06) |
| Orden de carga de scripts | Correcto en las cinco páginas: `gds-api.js` antes de los scripts de página y de `common.js`. En `index.html`, `avatar.js` carga antes que `gds-api.js` y su `gdsAvatar` se sobrescribe después (ver AUD-07) |
| Hojas de estilo | Todas las referenciadas existen. `css/home.css` y `css/pages/organigrama.css` no se referencian |

**Falsos positivos descartados:** el análisis automático marcó `rgba()`, `gradient()` y `${n.img}` como referencias rotas. Son texto de plantillas o de CSS dentro de cadenas, no referencias reales.

### 4.3 Funciones duplicadas

**Duplicados dentro de la misma página (con efecto real):**

| Página | Función | Origen | Efecto |
|---|---|---|---|
| `index.html` | `gdsAvatar` | `js/modules/avatar.js` y bloque inline 1 | La versión inline, cargada después, es la activa. `avatar.js` no tiene efecto |

**Duplicados entre páginas (sin conflicto, porque cada página carga solo sus scripts):**

| Función | Archivos | Comentario |
|---|---|---|
| `gdsRevealInit`, `gdsAttachTilt`, `gdsAttachTiltAll`, `_gdsRevealIO` | `noticias.js` y `organigrama.js` | Implementaciones distintas, con firmas distintas |
| `gdsAvatar` | `avatar.js` y `organigrama.js` | Implementaciones distintas |
| `navbar`, `navLinks`, `hamburger` | `common.js` y `noticias.js` | `noticias.html` no carga `common.js` |
| `isAdminLogged`, `adminCheckAuth` | `inscripciones.js`, `noticias.js`, `servicios.js` | Cada página tiene su propia lógica |

**Sobrescrituras intencionales de `gds-api.js`:** `window.getNoticias`, `getPeriodicos`, `getDocumentos`, `getUtiles`, `getDirectivos`, `getDocentes`, `getPromociones`, `renderNoticias`, `renderDocumentos`, `renderUtilesEscolares` y funciones `eliminar*` / `guardar*` de administración. Son el mecanismo de integración y no duplicados accidentales. Dependen del orden de carga.

### 4.4 Riesgo de dos renderizadores en `index.html`

El bloque inline de `index.html` (línea 2348) llama a `renderConveniosTrack()` y `renderNoticiasIndex()` en su propio `DOMContentLoaded`. `gds-api.js` dibuja los mismos contenedores con datos de la API. En carga, gana la API porque responde después del render síncrono. Pero las funciones de administración de la portada vuelven a renderizar desde `localStorage`, por lo que un evento administrativo puede sustituir datos de la base de datos por datos locales (ver AUD-03).

---

## 5. Pruebas ejecutadas y resultados

### 5.1 Pruebas de navegador ejecutadas

| ID | Página | Prueba | Resultado |
|---|---|---|---|
| N-01 | `index.html` | Carga sin errores de JavaScript | **Aprobada.** Solo errores 500 de `api.php` (sin base de datos) |
| N-02 | `index.html` | Carrusel: cambio de slide cada 5 segundos | **Aprobada.** Slide 1 → 2 en 5 s |
| N-03 | `index.html` | Modal FAQ: apertura, `toggleFaq` y cierre | **Aprobada** |
| N-04 | `index.html` | Modal de horario de primaria: apertura, selección de curso y tabla | **Aprobada.** Tabla de 8 filas y 6 columnas |
| N-05 | `index.html` | Modal de postulación: apertura y cierre **sin enviar** | **Aprobada** (9 campos) |
| N-06 | `index.html` | Función `gdsAvatar` activa | **Verificada.** Es la versión inline, no la de `avatar.js` |
| N-07 | `noticias.html` | Carga, tarjetas y filtros | **Aprobada.** 8 tarjetas por defecto, 7 botones de filtro, filtro `all` |
| N-08 | `noticias.html` | Clic en tarjeta | **Parcial.** Aparece un elemento de detalle; no se comprobó visibilidad |
| N-09 | `organigrama.html` | Carga y render por defecto | **Aprobada.** 3 directivos, 3 docentes directivos, 7 administrativos, 27 docentes, 1 promoción. Sin imágenes rotas |
| N-10 | `servicios.html` | Carga y clic en tarjeta | **Aprobada.** 10 tarjetas. El clic abre `svModalBackdrop` |
| N-11 | `inscripciones.html` | Validación nativa del formulario **sin enviarlo** | **Aprobada.** 15 campos inválidos. **Ninguna petición a `apps_script_proxy.php`** |
| N-12 | Todas | Errores de consola en las cinco páginas | **Sin errores de JavaScript.** Solo 500 de API y 404 de recursos (ver AUD-04, AUD-05) |
| N-13 | Servidor de pruebas | Registro de PHP (advertencias, avisos, errores fatales) | **Aprobada.** Sin advertencias ni fatales |

### 5.2 Validaciones estáticas ejecutadas

| ID | Prueba | Resultado |
|---|---|---|
| S-01 | Sintaxis JavaScript (12 bloques) | **Aprobada** |
| S-02 | Sintaxis PHP (4 archivos) | **Aprobada** |
| S-03 | Referencias locales | **Fallida**: 5 SVG y 6 JPG (AUD-05, AUD-06) |
| S-04 | Funciones duplicadas | **Clasificadas** (sección 4.3) |
| S-05 | Manejadores inline con funciones inexistentes | **Aprobada**, tras descartar falsos positivos |
| S-06 | Dependencias de carga | **Aprobada** |

### 5.3 Pruebas pendientes

| ID | Prueba | Motivo de no ejecución | Requisito |
|---|---|---|---|
| P-01 | Respuestas reales de la API en las cinco páginas | No existe la base `gds_web` en este equipo | Base de datos de prueba (staging, G1) |
| P-02 | Guardado de convenios, popup, horarios, servicios y costos desde el panel | Requiere login, que envía un código real por correo | Entorno de prueba con correo de prueba |
| P-03 | Envío completo de inscripción y postulación | Escribiría en el Apps Script y en Drive de producción | Apps Script de prueba (G2) |
| P-04 | Validación JavaScript del formulario (los campos vacíos ya bloquean en nativo) | Inseparable del envío en la prueba disponible | Entorno de prueba |
| P-05 | Menús y modales en móvil (390 px) y tableta | La herramienta no permite cambiar el viewport | Emulación de dispositivo o pruebas manuales |
| P-06 | Visual: comparación de capturas antes y después | Requiere línea base de capturas (no tomada) | Línea base en la fase 2 |
| P-07 | Integraciones Google (Drive, Sheets), EmailJS, Gnosoft | Servicios externos | Pruebas en staging con cuentas de prueba |
| P-08 | Accesibilidad, rendimiento y buenas prácticas (Lighthouse) | No ejecutada en esta auditoría | Fase 6 |
| P-09 | Ejecución en PHP 8.2 | No hay binario 8.2 local | Portable 8.2 o staging |
| P-10 | Comportamiento de `gds-api.js` ante respuestas no JSON | Requiere simular un fallo de red | Prueba controlada |
| P-11 | Comprobación de `index.html` con el botón de admin oculto | No ejecutada | Fase 1 (S3) |

---

## 6. Errores encontrados

Clasificación: **CR͍TICO** (pérdida de información o seguridad), **ALTO** (rompe una funcionalidad importante), **MEDIO** (errores parciales o inconsistencias), **BAJO** (limpieza o mejora).

| ID | Severidad | Página | Descripción | Evidencia | Verificación |
|---|---|---|---|---|---|
| AUD-01 | **CR͍TICO** | `index.html`, `servicios.html`, `inscripciones.html` | Los editores de convenios, popup, horarios, servicios, costos y descuentos guardan **solo en `localStorage`**. Las funciones de la API para persistirlos (`GDS.admin.guardarConvenio`, `guardarSlide`, `configurarHorario`, `guardarCelda`, `guardarServicio`, `guardarDescuento`) **no tienen llamadores**. Un administrador cree haber guardado, pero el cambio no llega a la base de datos ni al público, y se pierde al borrar el navegador | `index.html:2667` (`guardarConvenio`, `localStorage`), `index.html:2777-2787` (popup), `servicios.js:204` (`gds_servicios_edits`), `inscripciones.js:630-633` (costos y descuentos). Búsqueda de `GDS.admin.*` sin llamadores para estos métodos | Por lectura de código. **Prueba funcional pendiente** (P-02) |
| AUD-02 | ALTO | `index.html` | La integración del popup con la API nunca se ejecuta. `gds-api.js` solo llama a `renderPopupCarouselAPI` si existe, y esa función **no está definida**. El popup usa `localStorage` y datos por defecto | `gds-api.js:319-322`. Búsqueda en todo `public/` sin definición | Ejecución: `typeof renderPopupCarouselAPI` = `undefined` |
| AUD-03 | MEDIO | `index.html` | Dos renderizadores de noticias y convenios sobre los mismos contenedores (inline desde `localStorage` y `gds-api.js` desde la API). Un evento administrativo local puede sustituir datos de la base por datos del navegador | `index.html:2348-2350` frente a `gds-api.js:197-212` | Por lectura. Carrera benigna en carga; pendiente de prueba con datos |
| AUD-04 | MEDIO | `inscripciones.html` | Cinco iconos `img/iconos/*.svg` inexistentes (existen como `.webp`). El `onerror` los reemplaza por emoji, así que visualmente funcionan, pero generan 404 y revelan una migración de assets incompleta | `inscripciones.html:32, 36, 40, 44, 48`. Ejecución: 5 respuestas 404 | Ejecución |
| AUD-05 | MEDIO | `inscripciones.js` | Seis rutas `img/*.jpg` en datos por defecto, a nombres que no existen (formato anterior a la conversión a WebP) | Búsqueda de rutas en JavaScript | Por lectura y comprobación de existencia. Visualización sin datos de API no comprobada |
| AUD-06 | MEDIO | `index.html`, `servicios.html`, `noticias.html`, `inscripciones.html` | Imágenes externas de terceros (Unsplash, `fucsalud.edu.co`, `gstatic`). Una de Unsplash devuelve 404 en `servicios.html`. El contenido depende de la disponibilidad de otros dominios | Registro de red: 404 de `photo-1597392582469…` en `servicios`; `fucsalud.edu.co/…/scanner.png` en `index` | Ejecución |
| AUD-07 | MEDIO | `index.html` | `gdsAvatar` definida dos veces (`avatar.js` y bloque inline 1). La versión inline sobrescribe a la del módulo, que queda sin efecto | Ejecución: la función activa es la inline | Ejecución |
| AUD-08 | MEDIO | `js/pages/noticias.js` | Cadenas de plantilla con datos de la base dentro de atributos `onclick` (p. ej. `window.open('${p.url}', …)`, línea 325). Una URL con comillas rompe el atributo o ejecuta código. Los datos vienen del panel, así que el riesgo depende de la integridad de la administración | `noticias.js:325` y otras plantillas de las líneas 290-359 | Por lectura |
| AUD-09 | MEDIO | `gds-api.js` | Las plantillas de render mezclan datos de la API con HTML sin escapar (`${n.titulo}`, `${p.nombre}`…). Mismo patrón que SEG-11 | `gds-api.js` líneas 400-530 | Por lectura |
| AUD-10 | MEDIO | `organigrama.html` | Bloque `<style>` de 112 líneas y `css/pages/organigrama.css` sin enlazar. Migración de CSS incompleta | `organigrama.html:15-127` | Por lectura |
| AUD-11 | MEDIO | `index.html` | Bloques `<script>` inline sin extraer (4 bloques, ~1 843 líneas). Es la página más grande y con más lógica sin modularizar | `index.html` | Por lectura |
| AUD-12 | BAJO | `noticias.html`, `organigrama.html`, `servicios.html` | No cargan `js/common.js`. Tienen navegación propia o duplicada | Scripts de cada página | Por lectura |
| AUD-13 | BAJO | `index.html`, `common.js`, `organigrama.js`, `servicios.js` | Varias llamadas a `twemoji.parse` (en `common.js`, en el `window.onload` de `index.html`, en `organigrama.js` y en `servicios.js`) | Búsqueda de `twemoji` | Por lectura |
| AUD-14 | BAJO | `common.js` | Versión de twemoji inconsistente: el script es 14.1.0 y las imágenes se piden a `cdnjs` 14.0.2. Algunas peticiones de emojis quedaron en estado pendiente en el registro | `common.js:17`; registro de red | Por lectura y ejecución |
| AUD-15 | BAJO | Proyecto | Archivos sin referencias: `css/home.css`, `css/pages/organigrama.css` (sin enlazar) y `script.js` | Búsqueda de referencias | Por lectura |
| AUD-16 | BAJO | `gds-api.js` | `GDS.admin.getInscripciones()` y `getColaboradores()` no envían el token, así que responden 401. Ninguna página las usa | `gds-api.js:27-35` y `173-181` | Por lectura |
| AUD-17 | BAJO | `gds-api.js` | `gdsGet` y `gdsPost` no comprueban `res.ok` antes de `res.json()`, y una respuesta no JSON produce un error poco claro | `gds-api.js:27-52` | Por lectura |

**Errores heredados de auditorías anteriores, no reproducidos en esta prueba por falta de base de datos:**

| ID | Descripción | Estado |
|---|---|---|
| BUG-01 | Género `M`/`F`/`O` frente al ENUM de la base | Reproducido por lógica en PHP. Pendiente de prueba con base de datos |
| BUG-02 | Checkbox "¿cómo se enteró?" llega como array y provoca `TypeError` | Reproducido por lógica en PHP. Pendiente de prueba con base de datos |
| BUG-03 | Organigrama de la API vacía tres secciones | Reproducido por lógica en PHP. Pendiente de prueba con base de datos |
| BUG-04 | Tipos plurales del panel frente al ENUM singular | Por comparación de cadenas. Pendiente de prueba |

---

## 7. Riesgos de continuar desarrollando sin corregir

| Riesgo | Hallazgos | Consecuencia si se continúa |
|---|---|---|
| Administradores que creen haber publicado cambios que nunca llegan al público | AUD-01 | Pérdida de contenido editado y decisiones tomadas con información que no es la pública |
| Migrar la autenticación o las escrituras sin conocer los puntos que no usan la API | AUD-01, AUD-16 | Refactorizar rutas que no se usan y dejar sin cambiar las que sí persisten datos |
| Correcciones de datos sin saber qué renderizador gana | AUD-03, AUD-07 | Diagnósticos erróneos: el resultado depende del orden de carga |
| Cambios de CSS o HTML en `index.html` sin extraer | AUD-11 | Cualquier cambio afecta a 1 843 líneas sin pruebas unitarias ni separación |
| Inyección o rotura de atributos con datos de la base | AUD-08, AUD-09 | Vulnerabilidad si se compromete una cuenta administrativa o si los datos contienen comillas |
| Dependencia de imágenes de terceros | AUD-06 | Páginas con imágenes rotas cuando otro sitio no responde |
| Pruebas basadas solo en sintaxis | Toda la auditoría | Dar por buenas funcionalidades que fallan en ejecución (AUD-01 y AUD-02 pasan `node --check`) |

---

## 8. Recomendación del siguiente paso

1. **No avanzar a la extracción de `index.html` antes de corregir AUD-01 y AUD-02**, porque la extracción tocaría las funciones que hoy no persisten datos.
2. **Preparar la línea base de pruebas en staging** (G1) con una base restaurada desde el respaldo verificado. Con esa base se pueden ejecutar P-01, P-02 y P-06.
3. **Corregir los recursos rotos** (AUD-04, AUD-05) como tarea aislada y de bajo riesgo. Son cambios de rutas, sin efecto de comportamiento.
4. **Mantener la extracción pendiente de `index.html` y de `organigrama.css`** según la hoja de ruta, después de la fase de seguridad y de la corrección de datos.
5. **Decidir el tratamiento de `renderPopupCarouselAPI`** (AUD-02): implementarla o retirar la rama inactiva. Es una decisión de producto, no solo técnica.

**Ninguna de estas acciones se ha ejecutado.** Espero autorización para cada una.

---

## 9. Estados finales

| Elemento | Estado |
|---|---|
| Migración completa | `noticias.html` (CSS y JS externos), `servicios.html` (CSS y JS externos), `inscripciones.html` (CSS y JS externos) |
| Migración parcial | `index.html` (CSS completo; JS pendiente en 4 bloques), `organigrama.html` (JS completo; CSS pendiente) |
| Migración pendiente | Bloques inline de `index.html`; `<style>` de `organigrama.html`; atributos `style=` y `on*=` en todas las páginas |
| Verificación aprobada | Sintaxis de JavaScript (12 bloques) y PHP (4 archivos); carga sin errores de JavaScript en las cinco páginas; carrusel, FAQ, horario, modales de postulación y servicios; validación nativa de inscripciones; ausencia de peticiones al proxy sin envío; registro de PHP sin advertencias |
| Verificación pendiente | Respuestas de la API; guardado administrativo; envíos de formularios; integraciones Google, EmailJS y Gnosoft; diseño móvil; accesibilidad y rendimiento; PHP 8.2; validación JavaScript de formularios |
| Verificación fallida | Referencias de imágenes e iconos (AUD-04, AUD-05, AUD-06); integración del popup con la API (AUD-02); persistencia de los editores administrativos (AUD-01) |

---

## 10. Informe final

**Páginas completamente migradas (CSS y JavaScript extraídos):** `noticias.html`, `servicios.html` e `inscripciones.html`. Conservan atributos inline de forma intencional.

**Páginas con código pendiente de migrar:** `index.html` (4 bloques JavaScript) y `organigrama.html` (bloque CSS de 112 líneas, con su archivo `organigrama.css` sin enlazar).

**Páginas que funcionan según pruebas reales de navegador** (sin base de datos, con contenido por defecto): `index.html`, `noticias.html`, `organigrama.html`, `servicios.html` e `inscripciones.html`. Las funciones probadas están detalladas en la sección 5.1.

**Páginas con solo validación estática:** los botones y formularios de administración de las cinco páginas, las integraciones con la API con datos reales, los envíos de formularios y el diseño móvil. Ninguno de estos puntos debe darse por aprobado.

**Problemas que necesitan corrección:** AUD-01 (crítico), AUD-02 (alto), y AUD-03 a AUD-17 según su severidad.

**Archivos inspeccionados:**
- Páginas: `public/index.html`, `public/noticias.html`, `public/organigrama.html`, `public/servicios.html`, `public/inscripciones.html`.
- JavaScript: `public/gds-api.js`, `public/script.js`, `public/js/common.js`, `public/js/modules/avatar.js`, `public/js/pages/noticias.js`, `public/js/pages/organigrama.js`, `public/js/pages/servicios.js`, `public/js/pages/inscripciones.js`.
- CSS: `public/style.css`, `public/css/home.css`, `public/css/pages/index.css`, `public/css/pages/noticias.css`, `public/css/pages/organigrama.css`, `public/css/pages/servicios.css`, `public/css/pages/inscripciones.css`.
- PHP (solo sintaxis): `public/api.php`, `public/apps_script_proxy.php`, `public/config.php`, `app/config/config.php`.
- Referencia: `archive/legacy/GDSavio/` (solo para comparación de nombres de funciones).

**Archivos modificados en esta auditoría:** ninguno. **Archivos creados:** únicamente este documento.

**Archivos temporales:** los resultados de la auditoría estática se generaron en `%LOCALAPPDATA%\Temp\opencode` y se eliminan al cerrar la auditoría. El servidor de pruebas (`php -S`, puerto 8080) se detuvo al terminar.

---

## 11. Registro de este documento

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 30/10/2026 | Auditoría inicial de migración CSS y JavaScript |
