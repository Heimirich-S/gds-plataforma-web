# Arquitectura y hoja de ruta: Plataforma Web GDS

| Campo | Valor |
|---|---|
| Proyecto | Plataforma Web GDS (Gimnasio Domingo Savio) |
| Versión del documento | 1.0 |
| Fecha | 30/10/2026 |
| Fase | 0: auditoría y diagnóstico |
| Estado | Pendiente de aprobación. No se ha modificado ningún archivo del proyecto. |
| Documento complementario | `ARQUITECTURA_Y_OPERACION.md` (reglas operativas vigentes) |

Este documento es la referencia técnica para las siguientes fases. Donde describe algo que no coincide con `ARQUITECTURA_Y_OPERACION.md`, se indica explícitamente como discrepancia.

## ͍ndice

0. Resumen ejecutivo
1. Alcance, método y estado de verificación
2. Tecnologías detectadas (A)
3. Compatibilidad PHP 8.2 / 8.4 (B)
4. Arquitectura actual (C)
5. Estado de la refactorización anterior
6. Estructura futura recomendada (D)
7. Seguridad (E.1)
8. Errores funcionales e integridad de datos (E.2)
9. Deuda técnica (F)
10. Plan de trabajo por prioridad (G)
11. Evaluación de las recomendaciones tecnológicas (H)
12. Hosting y despliegue en cPanel (I)
13. Riesgos de los cambios y cómo evitarlos (J)
14. Decisiones pendientes
15. Historial del documento

---

## 0. Resumen ejecutivo

La plataforma es un sitio institucional sin build (HTML, CSS y JavaScript vanilla), con una API en PHP y PDO, un esquema MySQL/MariaDB razonable y un proxy hacia Google Apps Script. La base es aprovechable y no conviene reconstruirla. Antes de añadir funciones hay tres problemas que deben resolverse:

1. **El acceso administrativo no es seguro.** El login del panel se hace en el navegador: credenciales en JavaScript, código OTP generado en el cliente y estado de sesión en `sessionStorage`. La única barrera real de escritura es un token compartido, que existe en varias copias del código, incluida una carpeta pública.
2. **Hay pérdida silenciosa de datos.** Según el código, las inscripciones no llegan a MySQL (el género se envía como `M`/`F`/`O` y el ENUM espera `masculino`/`femenino`/`otro`; además el checkbox "¿cómo se enteró?" provoca un error de tipo en PHP). El formulario muestra éxito igualmente, de modo que la copia de Google Sheets sí existe pero la de la base de datos no.
3. **La instalación del SQL es destructiva.** `storage/database/gds_database_final.sql` ejecuta `DROP TABLE IF EXISTS` antes de crear cada tabla. Reimportarlo en producción borra inscripciones, postulaciones y cualquier cambio hecho en el panel.

Además, según el código, el organigrama que lee la base de datos dejaría vacías tres de sus cuatro secciones, y los documentos de estudiantes se suben a Drive con acceso por enlace público.

**Lo que se debe conservar:** identidad visual, páginas y navegación, el contrato JSON de `api.php` y `gds-api.js`, y la decisión de no usar frameworks.

**Recomendación:** no migrar a un framework. Atender primero la contención urgente (sección 10, paso 0), luego las fases 1 a 6 en orden, con autorización explícita en cada una.

---

## 1. Alcance, método y estado de verificación

**Método:** lectura de los archivos de `public/`, `app/`, `storage/database/`, `README.md`, `ARQUITECTURA_Y_OPERACION.md`, `LEEME_CAMBIOS.md` y `app/services/Code.gs`; búsquedas de patrones en todo el proyecto; validación de sintaxis y reproducción de tres comportamientos con PHP 8.4.27 (CLI local, XAMPP), sin tocar el proyecto.

| Tipo de verificación | Resultado |
|---|---|
| Lectura y búsqueda de código | Completa para los archivos listados |
| Sintaxis PHP (`php -l`) con PHP 8.4.27 | Sin errores en `api.php`, `apps_script_proxy.php`, `app/config/config.php` y `public/config.php` |
| Reproducción de lógica con PHP 8.4.27 | Confirmados: mapeo de `tipo` del organigrama (BUG-03), `trim()` con array (BUG-02) y valores de género frente al ENUM (BUG-01) |
| Sintaxis JavaScript | No ejecutada en esta fase |
| Navegador (carga, consola, formularios) | **No realizada** |
| MySQL/MariaDB real (inserciones, `sql_mode`) | **No realizada** |
| Hosting cPanel real (versión PHP, extensiones, SSH, Composer, archivos subidos) | **No verificable desde este entorno** |
| Ejecución en PHP 8.2 | **No realizada**: no hay binario 8.2 local |
| Accesibilidad y rendimiento medidos (Lighthouse, axe) | **No realizados** |

Los hallazgos marcados como "probable" dependen de una prueba en una copia local con la base de datos instalada. No se han inventado resultados de pruebas.

---

## 2. Tecnologías detectadas (A)

### 2.1 Frontend

| Elemento | Detalle |
|---|---|
| HTML5 | 5 páginas: `index.html` (3 067 líneas), `inscripciones.html` (845), `organigrama.html` (522), `servicios.html` (494), `noticias.html` (384) |
| CSS | `style.css` global (148 KB); `css/pages/{index,noticias,servicios,inscripciones}.css` enlazados; `css/home.css` y `css/pages/organigrama.css` **sin ninguna referencia**; bloque `<style>` inline de 112 líneas en `organigrama.html` |
| JavaScript | ES6+ vanilla. Sin npm, sin bundler, sin build. `gds-api.js` se carga en las 5 páginas; `js/common.js` solo en `index.html` e `inscripciones.html`; `js/modules/avatar.js` solo en `index.html`; `js/pages/*.js` en 4 páginas |
| Dependencias externas | Google Fonts; twemoji 14.1.0 (jsDelivr) con imágenes desde cdnjs 14.0.2; SDK de EmailJS v4 cargado en las 5 páginas; iframe de Google Maps en `index.html`; enlace y formulario hacia Gnosoft (externo) |
| Estilos inline | 279 atributos `style=` en el HTML |

### 2.2 Backend

| Elemento | Detalle |
|---|---|
| Lenguaje | PHP. Requisito mínimo 8.2, objetivo 8.4. Local: 8.4.27 |
| Endpoints | `public/api.php` (GET público, POST con token para administración); `public/apps_script_proxy.php` (POST de inscripciones y postulaciones) |
| Acceso a datos | PDO con consultas preparadas y emulación desactivada |
| Configuración | `app/config/config.php` (fuera del document root, ruta relativa `dirname(__DIR__)`); `public/config.php` (copia que no debería existir, ver SEG-01) |
| Gestor de dependencias | Ninguno. No hay `composer.json` |
| Extensiones usadas (según código) | `pdo`, `pdo_mysql`, `curl`, `json`; `fileinfo` opcional (con comprobación `class_exists`) |

### 2.3 Base de datos

| Elemento | Detalle |
|---|---|
| Motor | MySQL o MariaDB (sin versión fijada). `utf8mb4_unicode_ci`, InnoDB |
| Esquema | 22 tablas, 11 claves foráneas, vistas `v_noticias` y `v_horarios` |
| ͍ndices | Presentes en las consultas principales (noticias, inscripciones, personal, utiles) |
| Usuarios y roles | No existen. La tabla `login_intentos` está definida pero no la usa ningún código |
| Configuración en BD | Tabla `config_sistema` con URL de Apps Script, identificadores de EmailJS y correos de administración. La mayoría de estas claves no las lee el código |

### 2.4 Integraciones

| Integración | Situación |
|---|---|
| Google Apps Script | URL de despliegue repetida en `apps_script_proxy.php` (línea 115), en `config_sistema` (SQL) y en una constante sin uso en `index.html` (línea 1678). Desplegado con acceso "Cualquier persona" (`app/services/Code.gs`, línea 12) |
| Google Sheets | Hojas "Inscripciones" y "Colaboradores" |
| Google Drive | Carpeta "GDS - Documentos Web" con archivos de acceso "cualquiera con el enlace" (`Code.gs`, línea 134) |
| EmailJS | Envío de códigos OTP al administrador. Identificadores escritos en 4 archivos JS y en `config_sistema` |
| Gnosoft | Formulario que recoge usuario y contraseña de Gnosoft y los reenvía a su dominio (SEG-06) |

---

## 3. Compatibilidad PHP 8.2 / 8.4 (B)

### 3.1 Resultados

- **Sintaxis:** sin errores en PHP 8.4.27 para los cuatro archivos PHP revisados.
- **Funciones o sintaxis exclusivas de PHP 8.3 o posterior** (`json_validate`, `mb_str_pad`, `array_find`, `array_any`, `array_all`, `#[\Override]`, constantes de clase tipadas, `Pdo\Mysql`): no encontradas en `public/*.php` ni en `app/config/config.php`.
- **Deprecaciones de 8.2 y 8.4 buscadas** (interpolación `"${var}"`, `utf8_encode`/`utf8_decode`, parámetros con tipo implícitamente nulable): no encontradas.
- **Constante `PDO::MYSQL_ATTR_INIT_COMMAND`** (deprecada en 8.4): no se usa.
- **`curl_close()`** en `apps_script_proxy.php`: innecesaria desde PHP 8.0, no es un problema para 8.2 ni 8.4.

### 3.2 Requisitos del código

| Requisito | Estado |
|---|---|
| PHP 8.2 (mínimo) | Compatible por inspección. **Pendiente de ejecutar en PHP 8.2 real** |
| PHP 8.4 (objetivo) | Sintaxis verificada |
| `pdo_mysql` | Imprescindible |
| `curl` | Imprescindible (proxy hacia Apps Script) |
| `json` | Imprescindible (incluida en PHP) |
| `fileinfo` | Recomendada. Hoy, si falta, la verificación del contenido real del PDF se omite en silencio (SEG-13) |

### 3.3 Configuración de errores

- `api.php` no fija `display_errors` ni tiene manejador global de excepciones (BUG-06).
- `apps_script_proxy.php` fija `display_errors=0`, `log_errors=1` y devuelve JSON ante errores fatales. Es la referencia a reutilizar.
- `config.php` decide el modo depuración según el nombre del host, lo que es manipulable (SEG-09).
- `set_time_limit(150)`: el propio código indica que muchos hostings compartidos lo ignoran.

### 3.4 Dependencias

No se usa Composer y no hace falta para el funcionamiento actual. Si se añade PHPUnit, debe ser solo `require-dev`, nunca requerido en producción.

---

## 4. Arquitectura actual (C)

### 4.1 Diagrama real

```text
Navegador
 ├── Páginas HTML + CSS + JS de página
 │     └── gds-api.js ──fetch GET/POST──► public/api.php ──PDO──► MySQL
 │                                          (lectura pública; escritura con X-Admin-Token)
 │
 ├── Formularios de inscripción y colaboradores
 │     └── public/apps_script_proxy.php
 │            ├── cURL ──► Google Apps Script ──► Drive (PDF) + Sheets
 │            └── PDO  ──► MySQL (inscripciones / colaboradores)
 │
 └── Login de administración (5 implementaciones en JS)
       credenciales en JS + OTP por EmailJS + sessionStorage "gds_admin"

Gnosoft: formulario en index.html que envía usuario y contraseña
         por POST a gds.gnosoft.com.co (no es una integración por API)
```

### 4.2 Flujos

**Lectura de contenido.** Al cargar, `gds-api.js` (evento `DOMContentLoaded`) pide datos con `GDS.get*()`, que llaman a `GET api.php?action=…`. El resultado se dibuja con `innerHTML`. Varias páginas conservan además datos por defecto en el JavaScript y lecturas de `localStorage`; `gds-api.js` reemplaza después funciones globales como `window.getNoticias` o `window.getUtiles`. El orden de carga de los scripts es, por tanto, parte del funcionamiento.

**Inscripción y postulación de colaboradores.**
1. El formulario envía JSON con los PDF en base64 a `apps_script_proxy.php`.
2. El proxy valida campos, tipo y tamaño, y llama a Apps Script con cURL (hasta 140 s).
3. Apps Script sube los archivos a Drive, escribe una fila en Sheets y devuelve los enlaces.
4. El proxy inserta el registro en MySQL.
5. El frontend muestra **éxito en cualquier caso**. Si la respuesta es `ok: false`, solo guarda una copia en `localStorage` (`inscripciones.js`, líneas 969 a 981).

**Administración (escritura).**
1. El login visual se valida en el navegador (credenciales en JS, OTP y `sessionStorage`).
2. Al guardar, `gds-api.js` pide el token con `window.prompt` y lo envía en la cabecera `X-Admin-Token`.
3. `api.php` compara el token con `ADMIN_TOKEN` y ejecuta la acción.

En el estado actual el panel no tiene identidad de usuario, no hay expiración ni registro de quién hizo cada cambio.

### 4.3 Responsabilidades: previsto frente a real

| Capa | Previsto en `ARQUITECTURA_Y_OPERACION.md` | Real hoy |
|---|---|---|
| Autenticación administrativa | Sesión PHP en servidor | Login en el navegador + token compartido |
| Validación | En servidor, siempre | Parcial. Solo presencia de campos; sin límites de longitud, formato ni tipo |
| Persistencia | MySQL para contenido y registros | MySQL + Sheets (duplicado); contenido por defecto en JS y `localStorage` |
| Secretos | Fuera de `public` | Fuera de `public`, pero con una copia dentro y un valor de respaldo literal (SEG-01 a SEG-03) |
| Integraciones | Apps Script solo para Sheets y Drive | Igual, sin autenticación entre el proxy y Apps Script |
| Auditoría y registros | Registro de acciones administrativas | Solo `error_log` en el proxy; sin auditoría de acciones |

**Discrepancias con `ARQUITECTURA_Y_OPERACION.md`:**
- Dice que `config.php` "no debe existir en public". Existe: `public/config.php`, con la misma estructura que la copia de `app/config/`, pero con valores reales.
- Dice que el token "ya no está embebido en `gds-api.js`". Es cierto para ese archivo, pero el token sigue en `public/config.php` y como respaldo en `app/config/config.php`.

---

## 5. Estado de la refactorización anterior

| Página | CSS | JavaScript | Estado |
|---|---|---|---|
| `index.html` | Enlaza `css/pages/index.css`; sin bloque `<style>`; 137 `style=` | **4 bloques `<script>` inline** (líneas 20-41, 1242-2693, 2695-2702 y 2704-3064, unas 1 850 líneas). No existe `js/pages/index.js` | JS pendiente |
| `noticias.html` | Enlaza `css/pages/noticias.css` | `js/pages/noticias.js`, sin inline | Extraída |
| `organigrama.html` | **Bloque `<style>` inline de 112 líneas**. `css/pages/organigrama.css` existe pero no se enlaza | `js/pages/organigrama.js`, sin inline | CSS pendiente |
| `servicios.html` | Enlaza `css/pages/servicios.css` | `js/pages/servicios.js`, sin inline. Contiene el bloque de administración que antes estaba inline | Extraída |
| `inscripciones.html` | Enlaza `css/pages/inscripciones.css` | `js/pages/inscripciones.js`, sin inline | Extraída |

Notas:
- Los atributos `on*` inline (unos 314 en el HTML) se conservaron a propósito para no romper funciones globales. Es una decisión temporal; su eliminación está en la fase 2.
- Solo hay comprobación de sintaxis; no hay pruebas funcionales de las cinco páginas. Por tanto, la condición de la fase 1 ("confirmar que las cinco páginas funcionan") **no está cumplida** todavía.
- `organigrama.js` usa `gdsAvatar` y define su propia copia, porque `avatar.js` no se carga en esa página.

---

## 6. Estructura futura recomendada (D)

### 6.1 Principios

- Solo las carpetas que el proyecto necesita hoy. Cada carpeta tiene un único responsable.
- Mantener los contratos (`public/api.php`, `public/apps_script_proxy.php`, `public/gds-api.js`) hasta que los clientes migren.
- Nada privado dentro del document root.
- Sin framework y sin build. Sin dependencias de Composer en ejecución.

### 6.2 ́rbol propuesto

```text
Proyecto Plataforma Web GDS/
│
├── public/                              → public_html/  (document root)
│   ├── index.html
│   ├── noticias.html
│   ├── organigrama.html
│   ├── servicios.html
│   ├── inscripciones.html
│   ├── api.php                          contrato estable; fachada hacia app/
│   ├── apps_script_proxy.php            contrato estable; fachada hacia app/
│   ├── gds-api.js                       cliente HTTP (se mantiene)
│   ├── .htaccess
│   ├── style.css, css/, js/, img/, documento/   (estructura actual)
│   └── assets/                          (fase 6, opcional; no antes)
│
├── app/                                 → /home/CUENTA/app/   (fuera de public_html)
│   ├── bootstrap.php                    autoload propio, errores, manejador JSON
│   ├── Support/                         Response, Validator, Env
│   ├── Auth/                            AdminAuth, Session, Csrf, RateLimiter   (fase 4)
│   ├── Repositories/                    consultas PDO
│   ├── Services/                        reglas de negocio
│   ├── Integrations/                    AppsScriptClient, Mailer
│   └── Controllers/                     (fase 3; solo si el api.php crece)
│
├── config/                              → /home/CUENTA/config/   (solo en servidor)
│   └── gds.example.php                  plantilla sin secretos
│
├── storage/                             → /home/CUENTA/storage/  (no accesible por web)
│   └── logs/
│
├── database/
│   ├── install/gds_install.sql          instalación limpia, sin DROP, sin datos privados
│   └── migrations/                      0001_..., 0002_... (versionadas, sin DROP)
│
├── integrations/
│   └── google/apps-script/Code.gs       movido desde app/services/
│
├── tests/                               (fase 7)
│   ├── Unit/
│   └── Integration/
│
├── docs/                                (solo al aprobar)
├── README.md
├── CHANGELOG.md                         (fase 7)
├── ARQUITECTURA_Y_OPERACION.md
├── ARQUITECTURA_Y_HOJA_DE_RUTA.md
│
└── archive/, img_originales_respaldo/   fuera del despliegue; nunca se suben al servidor
```

### 6.3 Correspondencia con cPanel

| Origen en el proyecto | Destino en el hosting | Nota |
|---|---|---|
| `public/*` | `/home/CUENTA/public_html/` | Document root |
| `app/` | `/home/CUENTA/app/` | Obligatorio: `api.php` resuelve `dirname(__DIR__) . '/app/config/config.php'`, que apunta a `/home/CUENTA/` |
| `config/gds.php` (solo servidor) | `/home/CUENTA/config/` | Permisos restrictivos; no está en el repositorio |
| `storage/` | `/home/CUENTA/storage/` | Logs; no accesible por web |
| `database/install/` | No se sube | Se ejecuta una vez desde phpMyAdmin |
| `integrations/` | No se sube | Apps Script se pega en el editor de Google |
| `archive/`, `img_originales_respaldo/`, `docs/`, `tests/` | No se suben | |

### 6.4 Diferencias respecto a la propuesta original

| Propuesta inicial | Decisión | Motivo |
|---|---|---|
| `app/Models/` | No crear | Sin ORM. Los repositorios son suficientes |
| `app/Middleware/` | Diferir | Con dos comprobaciones de autorización basta una función |
| `app/Helpers/` | Sustituir por `app/Support/` | Evita un cajón de sastre |
| `app/Validators/` | Dentro de `app/Support/Validator.php` | Hasta tener varios validadores |
| `app/Config/` | Solo código; los secretos van en `config/` | Separar código de secretos |
| `public/index.php` | No crear | No hay router. `api.php` es el contrato |
| `public/api/endpoints/` | Diferir | Duplicaría el contrato actual. Migrar con alias |
| `public/assets/` | Diferir a la fase 6 | Hay más de 300 referencias a rutas; riesgo alto sin beneficio inmediato |
| `storage/uploads/`, `storage/temporary/` | No crear | Los archivos van a Drive por Apps Script. Guardar PDF de menores en el servidor requiere decisión previa |
| `database/seeders/` | No crear | La instalación ya contiene los datos iniciales |
| `database/backups/` dentro del proyecto | No | Los respaldos contienen datos personales. Guardarlos fuera del proyecto, con acceso restringido |
| `tests/Security/` | Integrar en `tests/Integration/` | Hasta tener una suite real |
| `docs/*` | Crear al aprobar | Evitar carpetas vacías |
| `integrations/google/` | Sí, con `Code.gs` movido | `Code.gs` no es PHP |

### 6.5 Capas del backend (sin framework)

```text
HTTP → api.php / apps_script_proxy.php   (fachadas: leen la petición, llaman al servicio, devuelven JSON)
     → Services                           (reglas: validar, decidir, coordinar)
     → Repositories                       (SQL con PDO y consultas preparadas)
     → MySQL

Services → Integrations/AppsScriptClient, Integrations/Mailer
Manejo de errores: manejador global; registra en storage/logs; responde JSON genérico
```

---

## 7. Seguridad (E.1)

Las contraseñas y tokens reales **no se reproducen en este documento**. Las ubicaciones se citan para poder corregirlas.

| ID | Severidad | Hallazgo | Evidencia | Mitigación | Fase |
|---|---|---|---|---|---|
| SEG-01 | **Crítica** | `public/config.php` está en la carpeta pública y contiene la contraseña de la base de datos y el token administrativo en texto plano. Lo protege solo una regla de `.htaccess` por nombre de archivo | `public/config.php`, líneas 38 y 62. La protección en `public/.htaccess`, líneas 6-10. La documentación dice que el archivo "fue retirado" | Confirmar qué hay en el servidor. Respaldar. Retirar el archivo. Rotar contraseña y token | Paso 0 |
| SEG-02 | **Crítica** | Hay copias de configuración en `archive/legacy/GDSavio/`. `config.php` tiene el mismo tamaño que `public/config.php` (4 294 bytes), probablemente idéntico. También hay `archive/legacy/gdsavio.rar`, que no se ha inspeccionado | `archive/legacy/GDSavio/config.php`; `archive/legacy/gdsavio.rar` | Tratar esos valores como comprometidos. Rotar. Excluir `archive/` de cualquier copia al servidor | Paso 0 |
| SEG-03 | **Crítica** | Si no existe la variable `GDS_ADMIN_TOKEN`, el token administrativo toma un **valor literal** del código. Ese valor, conocido por quien tenga acceso al repositorio, sirve como token de escritura | `app/config/config.php`, línea 36 | Eliminar el valor de respaldo. Fallar de forma cerrada si falta la variable | Paso 0 / Fase 3 |
| SEG-04 | **Crítica** | El login del panel se valida solo en el navegador. Hay credenciales en JS; el OTP se genera con `Math.random()` y se compara en el cliente; la sesión es `sessionStorage.gds_admin = 'true'`, que cualquiera puede crear en las herramientas del navegador; los contadores de bloqueo están en `localStorage` | `index.html` (credenciales ~2036, OTP ~2090-2250); `js/pages/noticias.js` (62-66); `js/pages/organigrama.js` (318-336); `js/pages/inscripciones.js` (76-270); `js/pages/servicios.js` (86-170). Cinco implementaciones distintas | Autenticación en servidor (fase 3). Mientras tanto, decidir si el panel queda oculto en producción (sección 14) | Fase 3 |
| SEG-05 | **Alta** | Un solo token compartido, sin usuarios ni expiración. Se guarda en `sessionStorage` y viaja en cada petición. Se compara con `!==` (no de tiempo constante). `requireAdmin()` acepta además el token por `$_POST` | `public/api.php`, líneas 32-35; `public/gds-api.js`, líneas 17-24 | Usuarios personales con `password_hash`, sesión PHP, `hash_equals`, registro de auditoría | Fase 3 y 4 |
| SEG-06 | **Alta** | La página recoge usuario y contraseña de Gnosoft (un tercero) y construye un formulario oculto que los envía por POST a `gds.gnosoft.com.co`. Es un patrón de phishing: el visitante aprende a introducir credenciales en el sitio del colegio | `public/index.html`, líneas 350-355 (campo `contrasena`) y 1254-1273 (`handleGnosoftLogin`) | Sustituir por un enlace directo al login de Gnosoft, sin campos | Fase 4 |
| SEG-07 | **Alta** | Sin límites de uso en los endpoints públicos de escritura (inscripciones, postulaciones) ni en el envío de OTP por correo. Se puede generar spam y agotar la cuota de EmailJS y de Apps Script | `apps_script_proxy.php`; `api.php` (POST `inscripcion`, `colaborador`); envío de OTP en las páginas. La tabla `login_intentos` existe sin uso | Rate limiting en servidor (la tabla ya existe), límites de tamaño y, si hace falta, CAPTCHA | Fase 4 |
| SEG-08 | **Alta** | Documentos de menores (observador, boletín, documentación) se guardan en Drive con acceso "cualquiera con el enlace". El Apps Script está desplegado para "Cualquier persona" y `doPost` no verifica ningún secreto. Cualquiera puede subir archivos a la cuenta institucional y escribir filas en Sheets | `integrations/` (hoy `app/services/Code.gs`), líneas 12, 70-109 y 134 | Secreto compartido proxy-Apps Script con verificación; carpetas privadas; revisar con el responsable de datos (Ley 1581 de 2012) | Fase 4 |
| SEG-09 | Media | El modo local (`DEBUG_MODE=true`, CORS `*`) se activa si el nombre de servidor termina en `.local` o es `localhost`. Ese nombre viene de la cabecera `Host`, que puede manipularse | `app/config/config.php`, líneas 4-16 y 37 | Definir el entorno de forma explícita (archivo o variable del servidor), no por nombre de host | Fase 3 |
| SEG-10 | Media | `api.php` no tiene manejador global de excepciones. Un error de base de datos produce una respuesta no JSON. En `admin_utiles_save`, el mensaje interno de la excepción se devuelve al cliente | `api.php`, línea 541 (`$e->getMessage()`) | Manejador global que registre y responda JSON genérico | Fase 3 |
| SEG-11 | Media | Escapado inconsistente. Algunos campos pasan por `htmlspecialchars` al guardar y otros se guardan crudos (`extracto`, `cuerpo`, `img`, `url`, `cuerpo_html`). El render usa plantillas con `innerHTML`. Riesgo de XSS almacenado si se compromete una cuenta administrativa. Las URL no se validan (un `javascript:` sería aceptado) | `api.php`, líneas 374, 396, 423, 446, 555, 576, 597, 616; `gds-api.js` (plantillas, p. ej. 401-433) | Validar esquemas de URL (`https:`); escapar al mostrar; CSP (fase 6) | Fase 2 |
| SEG-12 | Media | Enlaces de Drive de formularios públicos guardados sin validar. Apps Script puede devolver texto de error (`ERROR AL SUBIR: …`) en un campo de enlace, y el proxy lo guarda como URL | `api.php`, líneas 322-324; `apps_script_proxy.php`, líneas 233-235; `Code.gs`, línea 118 | Validar que los enlaces sean de `drive.google.com` y que la longitud no supere la columna | Fase 2 / 4 |
| SEG-13 | Media | La verificación del contenido real del PDF depende de `fileinfo` y se omite si la extensión no existe. El límite de 20 MB se comprueba con la cabecera `CONTENT_LENGTH`, no con los bytes leídos | `apps_script_proxy.php`, líneas 31-33 y 70-75 | Exigir `fileinfo`. Comprobar la firma `%PDF`. Medir los bytes recibidos | Fase 3 |
| SEG-14 | Media | Scripts de terceros sin SRI (twemoji, EmailJS desde jsDelivr). El SDK de EmailJS se carga en las 5 páginas aunque solo lo usa el login. No hay Content-Security-Policy | Etiquetas `<script src="https://cdn…">` en las 5 páginas | Subresource Integrity; cargar EmailJS solo donde se usa; CSP | Fase 6 |
| SEG-15 | Media | `.htaccess` sin redirección a HTTPS, sin HSTS y con `X-XSS-Protection` (obsoleta). La regla `Order allow,deny` usa sintaxis de Apache 2.2 (funciona en 2.4 con `mod_access_compat`; hay que comprobarlo en el hosting) | `public/.htaccess` | Redirección a HTTPS; HSTS tras comprobar el certificado; CSP | Fase 6 |
| SEG-16 | Baja | Identificadores de EmailJS y correos de administradores escritos en JS y en `config_sistema`. Pueden ser públicos por diseño, pero solo si EmailJS restringe el dominio de envío | `index.html`, `js/pages/*.js`, `storage/database/gds_database_final.sql` (líneas 127-131) | Verificar la restricción de dominio en EmailJS | Fase 4 |
| SEG-17 | Baja | Existen tablas y claves que aparentan una autenticación en servidor que no existe: `login_intentos`, `config_sistema.admin_password_hash` (valor `CONFIGURE_IN_ENVIRONMENT`), `admin_emails`, `admin_max_intentos` | `storage/database/gds_database_final.sql`, líneas 130-134 y 704-715 | Eliminar o implementar en la fase 3 | Fase 3 |

**Lo que ya está bien y debe mantenerse:**
- Consultas con PDO y parámetros; no se encontró SQL concatenado con datos del usuario.
- Validación del tipo, la extensión y el tamaño de los archivos en el proxy.
- `DEBUG_MODE` desactivado en la rama de producción.
- El token ya no está en `gds-api.js`.
- Las acciones administrativas usan una cabecera personalizada. Esto dificulta el CSRF clásico porque el navegador no la envía sola en peticiones de otro origen, y CORS está restringido. **Este equilibrio deja de valer si se pasa a cookies de sesión**: la fase 3 debe incluir un token CSRF.

---

## 8. Errores funcionales e integridad de datos (E.2)

| ID | Severidad | Problema | Evidencia | Consecuencia | Verificación |
|---|---|---|---|---|---|
| BUG-01 | **Crítica** | El género llega como `M`, `F` u `O`, pero la columna es `ENUM('masculino','femenino','otro')`. Si no se marca género, llega `''`, que tampoco es válido | `inscripciones.html`, líneas 213-215; `storage/database/gds_database_final.sql`, línea 652; `apps_script_proxy.php`, línea 226; `api.php`, línea 305 | Con `sql_mode` estricto (valor por defecto en MySQL 8 y MariaDB 10.2.4 o posterior), el INSERT falla y la inscripción queda solo en Sheets. El formulario muestra éxito | **Reproducido** con PHP 8.4.27: los tres valores no están en el ENUM. Falta confirmar el INSERT real en una copia local |
| BUG-02 | **Crítica** | "¿Cómo se enteró?" son checkboxes con el mismo `name`, por lo que llegan como **array**. `trim()` no acepta arrays | `inscripciones.html`, líneas 320-325; `apps_script_proxy.php`, línea 231 (`$s('referido')`); `api.php`, línea 318 | En el proxy: `TypeError`, capturado por el manejador final, responde 500 y **no se inserta en MySQL**. En `api.php`: `TypeError` sin capturar | **Reproducido** con PHP 8.4.27 (`TypeError: trim(): Argument #1 ($string) must be of type string, array given`) |
| BUG-03 | **Alta** | El organigrama agrupa por claves que no existen. Los tipos de la base son `directivo`, `administrativo` y `docente`, pero el código solo mapea `docente_directivo`. Resultado: `directivos`, `administrativos` y `docentes` salen vacíos | `api.php`, líneas 97-106; datos de ejemplo en `gds_database_final.sql`, líneas 164-206 | `organigrama.html` vacía esas tres secciones tras cargar desde la API (`gds-api.js`, líneas 459-499). Solo se ve "docentes directivos" | **Reproducido** con PHP 8.4.27 usando la misma lógica. Falta confirmar en el navegador |
| BUG-04 | **Alta** | El panel guarda el organigrama con `tipo` en plural (`directivos`, `docentes`, `administrativos`, `docentes_directivos`), pero el ENUM usa singular | `gds-api.js`, líneas 736, 763, 790 y 818; `api.php`, línea 411 y siguientes; ENUM en `gds_database_final.sql`, línea 149 | Los cuatro guardados del organigrama fallan en modo estricto. El usuario ve "No se pudo guardar en la base de datos" | Por comparación de cadenas contra la definición del ENUM. Falta confirmar con una prueba |
| BUG-05 | **Alta** | Hay dos rutas de escritura de inscripciones con reglas distintas: `api.php` (POST `inscripcion`) y el proxy. El frontend solo usa el proxy, pero `api.php` sigue aceptando peticiones públicas de inscripción | `api.php`, líneas 276-326; `apps_script_proxy.php`, líneas 197-249; `gds-api.js`, líneas 112-118 (`enviarInscripcion` no tiene llamadas) | Lógica duplicada que diverge, y una superficie pública innecesaria | Lectura de código |
| BUG-06 | Media | Los textos no se validan contra la longitud de las columnas (p. ej. `personal.nombre` admite 200). Un valor largo lanza `PDOException` en `api.php`, que no la captura, y el cliente recibe una respuesta no JSON. `gds-api.js` no comprueba `res.ok` antes de `res.json()` | `api.php`, sin try global; `gds-api.js`, líneas 27-52 | Mensajes de error poco claros y fallos silenciosos | Lectura de código |
| BUG-07 | Media | Sin idempotencia. Si Apps Script tarda más de 140 s, el proxy guarda en MySQL sin enlaces y el usuario puede reenviar. `num_doc` tiene un índice no único, así que se generan duplicados | `apps_script_proxy.php`, líneas 143-177; `gds_database_final.sql`, línea 677 | Registros duplicados en la base de datos | Lectura de código |
| BUG-08 | Media | Si el proxy devuelve `ok: false`, el frontend muestra la confirmación de todos modos | `js/pages/inscripciones.js`, líneas 969-981; `index.html` (postulaciones) | El usuario cree que se envió cuando puede no haberse guardado | Lectura de código |

---

## 9. Deuda técnica (F)

| ID | Tema | Evidencia | Impacto | Acción |
|---|---|---|---|---|
| DT-01 | Helpers duplicados entre páginas | `gdsAvatar` en 3 sitios (`index.html` inline, `js/modules/avatar.js`, `js/pages/organigrama.js`); `gdsRevealInit` con firmas distintas (`noticias.js` línea 19 con 3 parámetros; `organigrama.js` línea 12 con 4); `gdsAttachTiltAll` en ambas; diálogos `gdsAlert`/`gdsConfirm` en `index.html` frente a `gdsAlertOrg`/`gdsConfirmOrg` en `organigrama.js` | Cambios que hay que repetir; comportamiento distinto según la página | Módulo único en `js/common.js` o `js/core/` |
| DT-02 | Espacio global | `gds-api.js` reemplaza al menos 10 funciones globales (`window.getNoticias`, `getPeriodicos`, `getDocumentos`, `getUtiles`, `getDirectivos`, `getPromociones`…) | El orden de carga es parte de la lógica; errores difíciles de rastrear | Pasar a módulos con exportaciones explícitas |
| DT-03 | Handlers inline | ~314 atributos `on*` en el HTML. `gds-api.js` construye `onclick="abrirNoticia('${n.id}')"` con datos de la base | Acoplamiento; riesgo de inyección si un identificador contiene comillas | Eliminar por páginas, con prueba en cada una |
| DT-04 | Estilos dispersos | 279 `style=` en HTML; `<style>` de 112 líneas en `organigrama.html`; `style.css` de 148 KB; `css/home.css` y `css/pages/organigrama.css` sin referencias | Mantenimiento difícil; CSS muerto | Mover a `css/pages/`; decidir sobre los archivos sin uso |
| DT-05 | Extracción incompleta de `index.html` | 4 bloques inline, ~1 850 líneas de JS, sin `js/pages/index.js` | Es la página más grande y la más expuesta | Completar la fase 1 por bloques |
| DT-06 | Lógica de negocio duplicada | Inscripción en `api.php` y en el proxy; búsqueda de grados, cursos y materias **por nombre** (`WHERE nombre = ?`) | Renombrar un grado rompe las inscripciones | Un único servicio de inscripción; usar identificadores |
| DT-07 | Nombres de campo inconsistentes | `ano`/`anio`, `nombreGrupo`/`nombre_grupo`, `desc`/`descripcion`, `tamano_kb`; normalización en tiempo de ejecución en `gds-api.js` (líneas 253-256, 615-617, 847-848) | Errores difíciles de rastrear | Contrato JSON único documentado |
| DT-08 | Doble fuente de datos | Cada página tiene datos por defecto en JS y lecturas de `localStorage` (`gds_*`), y después la API sobrescribe | No se sabe qué se está mostrando; datos antiguos persisten en el navegador | Una sola fuente (la API); `localStorage` solo para preferencias |
| DT-09 | `common.js` no es común | Solo lo cargan `index.html` e `inscripciones.html`. `noticias`, `organigrama` y `servicios` no lo cargan | Comportamiento de navegación posiblemente distinto por página | Revisar y unificar en la fase 2 |
| DT-10 | Versionado de assets desigual | `?v=` en algunas referencias y en otras no (`style.css` en `organigrama.html` y `servicios.html`) | Caché del navegador: cambios que no se ven | Versionado uniforme |
| DT-11 | Versiones inconsistentes de twemoji | Script 14.1.0 frente a imágenes desde 14.0.2 (`js/common.js`, línea 17) | Emojis con versiones mezcladas | Fijar una versión |
| DT-12 | Esquema con valores no alineados | ENUM de género, `personal.tipo` y estados no coinciden con formularios ni con la API (BUG-01, BUG-03, BUG-04). Tablas y vistas sin uso (`login_intentos`, `v_noticias`, `v_horarios`) | Errores de inserción | Migración para alinear; retirar lo que no se use |
| DT-13 | Archivos legacy dentro del proyecto | `archive/legacy/` (incluye copias de configuración con secretos); `img_originales_respaldo/` (muy grande); `public/script.js` (6 líneas, sin referencias en HTML); `img_originales_respaldo/Aquientreni` sin extensión | Riesgo de copias accidentales; ruido | Aislar fuera del proyecto, previa autorización |
| DT-14 | Documentación desalineada | `README.md` (pasos 3 y 4) indica poner `ADMIN_API_TOKEN` en `gds-api.js`, lo que contradice la seguridad. Lista `script.js` como archivo a subir. `LEEME_CAMBIOS.md` describe un ZIP ya obsoleto | Instalaciones con secretos en el cliente | Actualizar `README.md` en la fase 1 |
| DT-15 | Infraestructura de desarrollo ausente | Sin control de versiones (no es un repositorio git), sin pruebas, sin `CHANGELOG.md`, sin migraciones versionadas, sin `.env.example` ni entorno de pruebas documentado | Cambios sin trazabilidad y sin red de seguridad | Git en la fase 1; pruebas y migraciones en fases 5 y 7 |
| DT-16 | Datos pesados dentro de `public/` | `documento/PERIODICO_GDS_2022.pdf` (157,6 MB), `documento/PERIODICO_GDS_2021.pdf` (22,6 MB), `img/servicios/biblioteca.mp4` (5,0 MB). Algunos nombres tienen espacios y tildes (`PE-GD-M01 _MANUAL…`, `ACTA DE APROBACI͓N…`) | Consumo de ancho de banda y cuota del hosting; enlaces frágiles | Comprimir o alojar fuera; nombres en kebab-case (fase 6) |
| DT-17 | Gestión de contenido en `gds-api.js` | Funciones de presentación (`renderNoticiasIndexAPI`, `renderOrganigramaAPI`…) mezcladas con la lógica de datos y los puentes de administración | Cambiar el diseño exige tocar el cliente de datos | Separar render, datos y puentes al pasar a módulos |
| DT-18 | Slide sin imagen | `index.html`, línea 201: comentario "pendiente: agregar imagen real en img/paneles-solares.webp" | Contenido incompleto | Decidir si se publica o se retira |

---

## 10. Plan de trabajo por prioridad (G)

### 10.1 Paso 0: contención urgente (antes de cualquier cambio de código)

Estas acciones no dependen de la arquitectura y las ejecuta el responsable del hosting o del proyecto:

1. **Respaldo completo** de archivos y de la base de datos, guardado fuera del servidor y del proyecto.
2. **Inventario del servidor real:** qué archivos hay en `public_html` (sobre todo `config.php`, `api.php` y `.htaccess`), qué variables de entorno existen (`GDS_DB_PASS`, `GDS_ADMIN_TOKEN`) y qué versión de PHP está activa.
3. **Rotar** la contraseña de la base de datos y el token administrativo. Tratar como comprometidos todos los valores que aparecen en el código (SEG-01 a SEG-03).
4. **No reimportar** `gds_database_final.sql` sobre producción. Si hace falta reinstalar, usar una copia vacía.
5. **Decidir** si el panel de administración queda oculto en producción hasta que exista autenticación en servidor (sección 14).

### 10.2 Fases

Se mantiene la numeración de la hoja de ruta original. Los hallazgos de las secciones 7 y 8 se reparten entre ellas; los que son críticos se adelantan.

| Fase | Prioridad | Contenido principal | Depende de | Requiere autorización |
|---|---|---|---|---|
| **1. Consolidación de la refactorización** | Alta | Completar la extracción de `index.html` (`js/pages/index.js`) por bloques. Mover el `<style>` de `organigrama.html` a `css/pages/organigrama.css` y decidir sobre `home.css`. Actualizar `README.md` (DT-14). Poner el proyecto bajo control de versiones. Pruebas funcionales de las cinco páginas (sin cambios de comportamiento) | Paso 0 | Sí |
| **2. Arquitectura frontend** | Media | Módulo común para helpers (DT-01). Eliminar `on*` inline página a página. Escapado de salida con una sola función (SEG-11). Validar URL (SEG-11, SEG-12). Unificar `common.js` (DT-09). Contrato JSON documentado | Fase 1 | Sí, por página |
| **3. Arquitectura backend** | **Crítica (BUG-01, BUG-02)** y Alta (BUG-03, BUG-04) | Corregir el género y el checkbox de referido (BUG-01, BUG-02). Corregir el mapeo y los tipos del organigrama (BUG-03, BUG-04). Manejador global de excepciones (SEG-10, BUG-06). Un único servicio de inscripciones (BUG-05, BUG-07, BUG-08). Entorno explícito (SEG-09). Validación de longitudes y tipos. Eliminar secretos de respaldo (SEG-03) | Fase 1 y copia local de prueba | Sí |
| **4. Seguridad y autenticación** | **Crítica (SEG-04)** y Alta (SEG-05 a SEG-08) | Login en servidor con usuarios, `password_hash`, sesión con cookies `HttpOnly`/`Secure`/`SameSite`, regeneración de sesión, token CSRF, rate limiting con `login_intentos`, auditoría de acciones. Sustituir las cinco implementaciones de JS por una. Eliminar el reenvío de credenciales de Gnosoft (SEG-06). Secreto entre proxy y Apps Script y restricción de Drive (SEG-08). Límites de uso (SEG-07). Retirar el OTP de EmailJS o reservarlo como segundo factor | Fases 1 y 3. Decisión sobre usuarios y roles | Sí |
| **5. Datos y persistencia** | Alta | Migraciones versionadas en `database/migrations/` sin `DROP`. Instalación limpia en `database/install/` (DT-12). Alinear ENUM y valores con formularios. Decidir el destino de los PDF pesados y de los documentos de menores (DT-16). Política de respaldos y prueba de restauración | Fase 3 | Sí, para cambios de esquema |
| **6. Optimización y despliegue** | Media | Rendimiento (DT-16, SEG-14), carga diferida de EmailJS, SRI y CSP (SEG-14, SEG-15), HTTPS y HSTS, accesibilidad medida con una herramienta, responsive revisado en móvil y escritorio, nombres de archivo en kebab-case, `assets/` (solo si compensa), runbook de despliegue | Fases 2 a 5 | Sí |
| **7. Pruebas y staging** | Media | Script de humo (`ping`, lecturas, validación de formularios sin escribir en producción). Pruebas PHP en `tests/` (PHPUnit solo en desarrollo). Entorno de staging en subdominio o carpeta privada con HTTPS. `CHANGELOG.md` | Continua; se completa tras la fase 3 | No |

**Dependencias:** Paso 0 → 1 → 3 → 4 → 5. La fase 2 puede avanzar en paralelo con la 3 siempre que no cambie contratos JSON. La fase 6 necesita las anteriores. La fase 7 acompaña a todas.

**Adelantar:** BUG-01 y BUG-02 no esperan a la fase 3 si se confirman con la prueba local. Son pérdida de datos.

---

## 11. Evaluación de las recomendaciones tecnológicas (H)

| Propuesta | Valoración | Matiz |
|---|---|---|
| **Frontend:** mantener HTML5, CSS3 y JavaScript | **De acuerdo.** No hay motivo técnico para introducir un framework: el sitio es principalmente contenido, con pocos componentes interactivos | Modularizar con ES modules nativos (`<script type="module">`) al tocar cada página, sin bundler. Eliminar globales poco a poco |
| **Backend:** PHP 8.4, compatible con 8.2 o superior | **De acuerdo** | Solo se ha verificado la sintaxis con 8.4.27. Falta ejecutar las pruebas en 8.2 real. No introducir Composer en ejecución |
| **Base de datos:** MySQL o MariaDB según el hosting | **De acuerdo** | El esquema es válido para ambos. Usar solo SQL estándar. Alinear ENUM con formularios. Nunca `DROP` en la instalación de producción |
| **Arquitectura:** separación progresiva entre presentación, lógica de negocio y persistencia | **De acuerdo, con orden** | Empezar por seguridad (secretos, autenticación) y contratos (validación, errores), no por mover carpetas. Las carpetas de `assets/` llegan al final |

**Recomendaciones adicionales:**

- **No migrar a Laravel, React ni similares ahora.** Motivos: el hosting compartido no está verificado (SSH y Composer son desconocidos); el problema actual es de autenticación, secretos y datos, que un framework no resuelve por sí solo; y el backend actual es pequeño (unas 650 líneas en `api.php` y 300 en el proxy). Una capa propia mínima basta. Volver a evaluarlo si el panel necesita roles complejos, flujos de aprobación o si trabajan varios desarrolladores.
- **Google Apps Script:** mantenerlo mientras Sheets sea un requisito. A medio plazo, la base de datos debería ser la fuente de verdad y Sheets una exportación.
- **EmailJS:** sustituirlo por correo del servidor (o eliminar el OTP) cuando exista autenticación en servidor. Mantenerlo como segundo factor solo si se justifica.
- **Git:** inicializar un repositorio antes de la fase 1, con `.gitignore` para `config/`, `storage/`, `archive/` y `img_originales_respaldo/`.

---

## 12. Hosting y despliegue en cPanel (I)

### 12.1 Lo que exige el código

- PHP 8.2 como mínimo; 8.4 como objetivo.
- Extensiones `pdo_mysql` y `curl` obligatorias; `fileinfo` recomendada.
- Apache con `.htaccess` activo. Las directivas `IfModule` de `mod_headers`, `mod_expires` y `mod_deflate` se ignoran si el módulo no existe, sin error.
- La carpeta `app/` debe estar **junto a** `public_html`, no dentro (ver sección 6.3).
- Las variables `GDS_DB_PASS` y `GDS_ADMIN_TOKEN` deben estar disponibles para PHP. Sin ellas la aplicación falla de forma cerrada (correcto), pero el proyecto no documenta cómo definirlas en el hosting.

### 12.2 Cómo definir secretos en el hosting

| Opción | Valoración |
|---|---|
| Archivo privado fuera de `public_html` (p. ej. `/home/CUENTA/config/gds.php`) con permisos restrictivos, cargado por ruta absoluta | **Recomendada.** Verificar que el hosting permite ese archivo y sus permisos |
| `SetEnv` en `.htaccess` | No recomendada: `.htaccess` está dentro del document root |
| Variables de entorno del panel de PHP | Depende del plan; no asumir disponibilidad |

### 12.3 Lo que no se puede asumir (verificar en el hosting)

| Elemento | Por qué importa |
|---|---|
| Versión PHP 8.4 seleccionable (MultiPHP Manager) | Objetivo de producción |
| Extensiones `pdo_mysql`, `curl`, `fileinfo` | Proxy y seguridad de archivos |
| `upload_max_filesize`, `post_max_size`, `max_execution_time` | El proxy recibe hasta 20 MB en JSON y necesita hasta 140 s |
| Reglas del hosting (p. ej. ModSecurity) | Pueden bloquear peticiones POST de varios MB con base64 |
| SSH, Composer, Node.js | Desconocidos. Node solo existe en el equipo de desarrollo y sirve para comprobar sintaxis |
| Zona horaria | Apps Script usa `America/Bogota` |
| Ubicación de `error_log` | Necesaria para diagnosticar sin exponer errores |
| Certificado SSL | Necesario para el panel; AutoSSL o Let's Encrypt |

### 12.4 Lista de despliegue (cuando se apruebe)

1. Respaldo de archivos y base de datos, verificado con una restauración en otra base.
2. Crear base y usuario de MySQL con privilegios solo sobre esa base. Respetar el prefijo de cPanel.
3. Subir `app/`, `config/gds.php` y `storage/` **fuera** de `public_html`.
4. Subir el contenido de `public/` a `public_html/`.
5. Comprobar `https://DOMINIO/api.php?action=ping` y que `https://DOMINIO/config.php` devuelve 404 o 403, nunca código.
6. Comprobar que `app/`, `config/` y `storage/` no son accesibles por URL.
7. Probar las cinco páginas en escritorio y móvil, con la consola abierta.
8. Probar un formulario de prueba en staging, no en producción.
9. Registrar versión, fecha y responsable.

---

## 13. Riesgos de los cambios y cómo evitarlos (J)

| Cambio | Qué puede romperse | Cómo evitarlo |
|---|---|---|
| Rotar el token administrativo | El panel deja de guardar | Actualizar el secreto del servidor y comprobar una escritura de prueba en staging |
| Quitar `public/config.php` | Si algo lo carga, la aplicación falla | Buscar referencias (ninguna en el código actual, según búsqueda) y probar antes |
| Cambiar la autenticación | Las cinco páginas de login dejan de funcionar a la vez | Un solo componente de login; mantener temporalmente el token como alternativa de emergencia |
| Cambiar valores del ENUM de género | Datos existentes con valores antiguos | Migración que convierta los valores antes de cambiar el tipo |
| Cambiar el mapeo del organigrama | Las cuatro secciones dejan de mostrarse | Probar `organigrama.html` con datos reales de la base de prueba |
| Mover carpetas de `assets/` | Más de 300 referencias rotas | No hacerlo hasta la fase 6, con redirecciones y búsqueda automatizada |
| Eliminar `on*` inline | Funciones globales dejan de existir | Eliminar por página, probando cada una; mantener los nombres de funciones |
| Cambiar la URL de Apps Script | Inscripciones dejan de llegar a Sheets | Cambiarla en un solo lugar de configuración y probar un envío |
| Cambiar el contrato JSON de `api.php` | Las páginas dejan de dibujar datos | Documentar el contrato antes; cambios con migración y nueva versión |
| Quitar el OTP de EmailJS | Se pierde el segundo factor actual | Sustituirlo por autenticación en servidor antes de retirarlo |
| Retirar `api.php` POST de inscripción | Un cliente externo que lo use deja de funcionar | Confirmar que nadie lo usa (registros de acceso) antes de retirarlo |
| Migrar de Sheets a solo MySQL | Pérdida de la vista de Sheets que usa el colegio | Mantener la exportación hasta que el colegio lo apruebe |

---

## 14. Decisiones pendientes

Necesito respuestas para avanzar. Ordenadas por urgencia:

1. **¿Qué hay subido hoy al servidor?** En particular, si existe `public_html/config.php`, si `GDS_ADMIN_TOKEN` y `GDS_DB_PASS` están definidas y si el sitio funciona actualmente. Esto determina la urgencia del paso 0.
2. **¿Ocultar el panel de administración en producción** mientras se implementa el login en servidor? Es la medida más rápida para reducir SEG-04, a costa de no poder editar contenido durante ese tiempo.
3. **¿Autorizas el paso 0 y la fase 1?** La fase 1 modifica archivos del proyecto (sin cambiar el comportamiento visible).
4. **¿Quién es el responsable de los datos personales del colegio?** Hace falta para decidir sobre los documentos de menores en Drive (SEG-08) y para revisar `documento/TRATAMIENTO_DE_DATOS.pdf` frente a lo que hace el sistema. No he revisado el contenido de ese PDF.
5. **Datos del hosting:** ¿hay SSH, Composer y PHP 8.4 seleccionable? Si me indicas los datos, puedo preparar un script de verificación que puedas ejecutar sin tocar producción.
6. **Usuarios del panel:** ¿cuántas personas administran el sitio, y necesitan roles distintos (por ejemplo, editar noticias frente a gestionar inscripciones)?

---

## 15. Historial del documento

| Versión | Fecha | Cambio | Archivos |
|---|---|---|---|
| 1.0 | 30/10/2026 | Auditoría inicial (fase 0): tecnologías, compatibilidad PHP, arquitectura, seguridad, errores de datos, deuda técnica y hoja de ruta | Creado: `ARQUITECTURA_Y_HOJA_DE_RUTA.md`. Modificados: ninguno. Eliminados: ninguno |

**Pruebas realizadas en esta versión:** sintaxis PHP con 8.4.27 (4 archivos); reproducción de tres comportamientos con PHP 8.4.27 usando una copia temporal fuera del proyecto. **Pruebas no realizadas:** navegador, MySQL/MariaDB, hosting real, PHP 8.2.

**Riesgos de esta versión:** las conclusiones de los hallazgos marcados como "probable" dependen de la configuración real de la base de datos y del hosting, que no se han podido comprobar desde este entorno.
