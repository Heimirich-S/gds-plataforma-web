# Fase 1: Seguridad y contención. Procedimiento técnico (S1 a S5)

| Campo | Valor |
|---|---|
| Estado | **Preparado. No ejecutado.** Bloqueado por la compuerta G0 (respaldo de base de datos verificado) |
| Fecha de preparación | 30/10/2026 |
| Aprobación | Fase 1 aprobada con las condiciones indicadas por el responsable del proyecto |
| Alcance | S1 secretos, S2 protección en PHP, S3 interfaz de administración, S4 cabeceras en modo Report-Only, S5 documentación |
| Fuera de alcance | Autenticación con sesiones en servidor (fase posterior). Formulario de Gnosoft. OTP de EmailJS. Correcciones BUG-01 y BUG-02 (fase 1.1). Cambios de base de datos. Cambios en `archive/` sin autorización expresa. Cambios en el sitio Joomla |

---

## 0. Compuertas de control

Ningún paso de modificación se ejecuta hasta que cada compuerta esté cumplida y registrada.

| Compuerta | Condición | Responsable | Estado |
|---|---|---|---|
| **G0** | Respaldo completo de la base de datos real exportado desde cPanel, sin `DROP`, y verificado con restauración en una base independiente (criterios en `PASO_0_RESPALDO_E_INVENTARIO.md`, sección 2) | Responsable en cPanel | **Pendiente** |
| **G1** | Subdominio de staging creado, con docroot propio y base de datos propia restaurada desde el respaldo verificado en G0 | Responsable en cPanel | Pendiente de G0 |
| **G2** | Decisión sobre el Apps Script de staging (ver sección 7, riesgo R1) | Responsable | Pendiente |
| **G3** | Aprobación explícita de este procedimiento | Responsable | Pendiente |

**Regla de seguridad para G1:** la base de staging **no es** la base de producción. Nunca se conecta staging a la base real.

---

## 1. Entornos

| Entorno | Qué es | Qué se prueba | Versión PHP |
|---|---|---|---|
| **Local** | Proyecto en el equipo, con XAMPP (Apache + MySQL) y base de prueba `gds_pruebas_fase1` | Sintaxis, contratos de API, lógica de seguridad, navegador | 8.4.27 (XAMPP). Prueba de compatibilidad 8.2 con un PHP 8.2 portable en una carpeta temporal |
| **Staging** | Subdominio de cPanel con docroot propio (`/home/CUENTA/gds-staging/public`) y base propia | Pruebas de integración en el hosting real | La versión general de la cuenta. **No se cambia** (ver R5) |
| **Producción actual** | `www.gimnasiodomingosavio.edu.co`, sitio Joomla | **No se toca** | No aplica |

Diseño de carpetas en el hosting para staging. Mismo contrato que producción (`api.php` resuelve `dirname(__DIR__)`):

```text
/home/CUENTA/gds-staging/
├── public/      ← docroot del subdominio (contenido de public/ del proyecto)
├── app/         ← código PHP (app/config/config.php)
├── config/      ← gds.php con secretos de staging (permisos 600). Fuera de public
└── storage/     ← logs (no accesible por web)
```

En producción, cuando llegue el momento, el mismo diseño sería `/home/CUENTA/public_html/` y `/home/CUENTA/app/`, `/home/CUENTA/config/`.

---

## 2. Inventario de archivos afectados

Los hashes SHA-256 originales están en `Desktop\Respaldos_GDS\2026-10-30_previo_fase1\SHA256_origen.txt`. Antes de editar cada archivo se verifica que coincide con ese manifiesto.

| Archivo | Acción | Bloque | Motivo |
|---|---|---|---|
| `app/config/config.php` | Modificar | S1, S2 | Quitar token de respaldo literal. Leer secretos de entorno o archivo privado. Definir `ADMIN_ENABLED` |
| `public/config.php` | **Mover** a respaldo (fuera del proyecto) | S1 | Contiene secretos en la carpeta pública |
| `public/api.php` | Modificar | S2 | Guardián de acciones `admin_*`. Comparación con `hash_equals`. Quitar token por POST. Campo `admin_habilitado` en `ping` |
| `public/gds-api.js` | Modificar | S3 | Detectar modo admin desde `ping`. Bloquear obtención de token si está desactivado |
| `public/style.css` | Modificar (una regla) | S3 | Ocultar entradas de admin por defecto |
| `public/index.html` | Modificar | S3 | Clase `gds-admin-entry` en el botón de admin y en `#adminFab`. Guardas en `adminCheckAuth()` y `doAdminStep1()` (bloque inline). Actualizar `?v=` de `gds-api.js` y `style.css` |
| `public/noticias.html` | Modificar | S3 | Igual. El disparador de admin debe localizarse antes (ver sección 5.4) |
| `public/organigrama.html` | Modificar | S3 | Igual |
| `public/servicios.html` | Modificar | S3 | Igual |
| `public/inscripciones.html` | Modificar | S3 | Igual |
| `public/js/pages/noticias.js` | Modificar | S3 | Guardas en `adminCheckAuth` (línea 96) y `doNotStep1` |
| `public/js/pages/organigrama.js` | Modificar | S3 | Guardas en `adminCheckAuthOrg` (línea 333) y `doOrgStep1` (línea 335) |
| `public/js/pages/inscripciones.js` | Modificar | S3 | Guardas en `adminCheckAuthInsc` (línea 32) y `doInscStep1` |
| `public/js/pages/servicios.js` | Modificar | S3 | Guardas en la función de entrada y en el paso 1 del login (bloque 86-170) |
| `public/.htaccess` | Modificar | S4 | Cabecera `Content-Security-Policy-Report-Only` |
| `README.md` | Modificar | S5 | Quitar instrucción de poner el token en `gds-api.js`. Documentar configuración privada |
| `ARQUITECTURA_Y_OPERACION.md` | Modificar | S5 | Sección 6 y discrepancias registradas |
| `CHANGELOG.md` | **Crear** | S5 | Registro de cambios de la fase |
| `FASE_1_PROCEDIMIENTO.md` | Crear (este documento) | S5 | Procedimiento y resultados |

**Archivos que no se tocan:** toda la base de datos, `storage/database/gds_database_final.sql`, `app/services/Code.gs`, `apps_script_proxy.php`, `js/common.js`, hojas de estilo de páginas, imágenes, documentos, `archive/`, `img_originales_respaldo/`.

**Nota sobre `archive/`:** contiene `archive/legacy/GDSavio/config.php` (mismo tamaño que `public/config.php`, probablemente idéntico) y `archive/legacy/gdsavio.rar` (no inspeccionado). No están en la carpeta pública, pero sí dentro del proyecto. Mover ambos a la carpeta de respaldo requiere autorización expresa (decisión D1).

---

## 3. Bloque S1: secretos

### S1.1 Generación de los nuevos secretos (lo hace el responsable, no el asistente)

- El token administrativo se genera en el equipo del responsable con un generador criptográfico:

```powershell
$b = New-Object byte[] 48
(New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes($b)
[Convert]::ToBase64String($b)
```

- Resultado: 64 caracteres. Mínimo exigido por el código: 32.
- **Ningún secreto se escribe en el chat, en documentos ni en capturas.**
- La contraseña de la base de datos se crea en cPanel para un usuario MySQL nuevo y exclusivo de la aplicación (sin tocar el usuario que usa Joomla, si lo hay).

### S1.2 Archivo privado de configuración (fuera de `public`)

Ruta en el servidor: `dirname(__DIR__, 2) . '/config/gds.php'`. Desde `app/config/` equivale a `/home/CUENTA/config/gds.php`. En staging equivale a `/home/CUENTA/gds-staging/config/gds.php`.

Contenido esperado (lo crea el responsable en cPanel, permisos 600):

```php
<?php
return [
    'GDS_DB_PASS'        => '...',   // no se escribe aquí
    'GDS_ADMIN_TOKEN'    => '...',   // no se escribe aquí
    'GDS_ADMIN_ENABLED'  => 'false', // 'true' solo si se decide activar el panel
];
```

Prioridad de lectura: variable de entorno y, si no existe, el archivo privado. Así el comportamiento actual con `getenv()` se mantiene.

### S1.3 Cambio propuesto en `app/config/config.php`

Propuesta, sin aplicar. Sustituye la línea `define('ADMIN_TOKEN', getenv('GDS_ADMIN_TOKEN') ?: '…literal…')` y añade el interruptor:

```php
$gds_privado = [];
$gds_archivo_privado = dirname(__DIR__, 2) . '/config/gds.php';
if (is_file($gds_archivo_privado)) {
    $gds_privado = require $gds_archivo_privado;
}

function gds_secreto(string $clave, array $privado): string {
    $valor = getenv($clave);
    if ($valor === false || $valor === '') {
        $valor = $privado[$clave] ?? '';
    }
    return (string)$valor;
}

$adminToken   = gds_secreto('GDS_ADMIN_TOKEN', $gds_privado);
$adminFlag    = filter_var(gds_secreto('GDS_ADMIN_ENABLED', $gds_privado) ?: 'false', FILTER_VALIDATE_BOOLEAN);

define('ADMIN_TOKEN', $adminToken);
define('ADMIN_ENABLED', $adminFlag && strlen($adminToken) >= 32);
```

Reglas que cumple:
- Sin valor por defecto: si no hay token, `ADMIN_TOKEN` es cadena vacía.
- `ADMIN_ENABLED` solo es `true` si el interruptor está activado **y** el token tiene al menos 32 caracteres.
- Sin cambios en `DEBUG_MODE` ni en las credenciales de base de datos de la rama local.

**Revisión de compatibilidad PHP 8.2:** `require` que devuelve array, `dirname` con nivel, `filter_var` con `FILTER_VALIDATE_BOOLEAN`, tipos escalares declarados. Todo disponible desde PHP 7.x; no hay funciones exclusivas de 8.3 ni 8.4.

**Nota:** `GDS_DB_PASS` se seguirá leyendo como hoy en la rama de producción. Se puede unificar con `gds_secreto()` en el mismo cambio, sin cambiar su comportamiento.

### S1.4 Retirada de `public/config.php`

1. Copiar el archivo a `Desktop\Respaldos_GDS\2026-10-30_previo_fase1\retirados\public-config.php` (fuera del proyecto).
2. Verificar que la copia tiene el mismo SHA-256 que el original.
3. Eliminar de `public/` **solo** después de verificar la copia. Como excepción a la regla general de no eliminar, es la misma operación que un movimiento a respaldo y queda reversible.
4. Comprobar en local y en staging: `GET /config.php` → 404.
5. En producción, el responsable confirma en cPanel que no existe `public_html/config.php`. Si existe, se retira con el mismo procedimiento, previa copia.

### S1.5 Copias de secretos en `archive/` (pendiente de decisión D1)

Si se aprueba, mover `archive/legacy/GDSavio/config.php` y `archive/legacy/gdsavio.rar` a `retirados\` con verificación de hash. El `.rar` no se abre sin inspección previa.

### S1.6 Rotación de credenciales

Orden seguro:

1. Crear el usuario MySQL nuevo (exclusivo, privilegios solo sobre su base) y verificar la conexión desde staging.
2. Generar el token nuevo y guardarlo en `gds.php` de staging.
3. Probar staging con los secretos nuevos.
4. En producción, cuando exista el despliegue, repetir con los valores nuevos.
5. **Desactivar** el usuario MySQL antiguo y considerar comprometido el token antiguo. El valor antiguo aparece en `public/config.php` y en el código, por lo que se da por expuesto.
6. Confirmar antes del paso 5 que ninguna otra aplicación usa el usuario antiguo.

---

## 4. Bloque S2: protección en PHP

### S2.1 Inventario de acciones de `api.php` (estado antes del cambio)

| Tipo | Cantidad | Acciones | Protección actual | Protección tras S2 |
|---|---|---|---|---|
| GET público | 17 | ping, noticias, noticia, convenios, popup_slides, organigrama, horario, servicios, servicio, utiles_todos, utiles, descuentos, periodicos, documentos, promociones, grados, config | Ninguna (lectura) | Sin cambios. `ping` añade `admin_habilitado` |
| GET administrativo | 2 | admin_inscripciones, admin_colaboradores | `requireAdmin()` | Guardián central + `requireAdmin()` |
| POST público | 2 | inscripcion, colaborador | Ninguna. Escriben datos personales | Sin cambios en esta fase (ver R7) |
| POST administrativo | 21 | admin_noticias_save/delete, admin_convenios_save/delete, admin_organigrama_save/delete, admin_popup_save/delete, admin_horario_save/celda, admin_utiles_save, admin_servicio_save, admin_descuento_save, admin_periodico_save/delete, admin_documento_save/delete, admin_promocion_save/delete, admin_inscripcion_estado, admin_colaborador_estado | `requireAdmin()` en cada caso | Guardián central + `requireAdmin()` |

Total: 42 acciones. Las 23 administrativas quedan protegidas por el guardián central, que actúa por prefijo `admin_`. **Cualquier acción nueva con ese prefijo queda protegida sin depender de que su código recuerde llamar a `requireAdmin()`.**

### S2.2 Cambio propuesto en `public/api.php`

Propuesta, sin aplicar.

**a) Reordenar la conexión a base de datos.** Hoy `getDB()` se llama antes de leer la acción. Así, una petición administrativa bloqueada no toca la base.

```php
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? (body()['action'] ?? '');
if (!$action) err('Accion requerida');

if (str_starts_with((string)$action, 'admin_')) {
    if (!ADMIN_ENABLED) {
        error_log('GDS admin: acción bloqueada (panel deshabilitado): ' . $action . ' desde ' . ($_SERVER['REMOTE_ADDR'] ?? '-'));
        err('Panel administrativo no disponible', 403);
    }
    requireAdmin();
}

$db = getDB();
```

**b) Reescribir `requireAdmin()`.** Solo cabecera, comparación de tiempo constante y el interruptor:

```php
function requireAdmin(): void {
    if (!ADMIN_ENABLED) err('Panel administrativo no disponible', 403);
    $provided = (string)($_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '');
    if ($provided === '' || !hash_equals(ADMIN_TOKEN, $provided)) err('No autorizado', 401);
}
```

Cambios de seguridad respecto al original:
- Se elimina `$_POST['admin_token']`. El token solo se acepta por cabecera `X-Admin-Token`. No se acepta por URL.
- `hash_equals` evita la comparación que depende del tiempo de respuesta.
- Si no hay token configurado, `ADMIN_ENABLED` es falso y se responde 403 antes de comparar.
- El registro de denegaciones no incluye el token ni su longitud.

**c) Campo `admin_habilitado` en `ping`.** Cambio aditivo.

```php
case 'ping':
    ok(['status' => 'ok', 'env' => DEBUG_MODE ? 'local' : 'produccion', 'admin_habilitado' => ADMIN_ENABLED]);
```

Compatibilidad:
- Los consumidores actuales de `ping` solo leen `status` y `env` (verificado: no hay otros consumidores en el proyecto).
- El cliente trata la ausencia del campo como `false` (ver S3).

### S2.3 Compatibilidad PHP

- `str_starts_with`: disponible desde PHP 8.0. Compatible con 8.2 y 8.4.
- `hash_equals`, `filter_var`, `error_log`: funciones estables desde hace años.
- No se introduce sintaxis nueva.
- Se ejecutará `php -l` con 8.4.27 y con un PHP 8.2 portable en local.

### S2.4 Hallazgo que afecta a las acciones administrativas de lectura

`gdsGet()` (en `gds-api.js`, línea 27) no envía la cabecera `X-Admin-Token`. Por tanto, `GDS.admin.getInscripciones()` y `GDS.admin.getColaboradores()` siempre responden 401 hoy. Búsqueda confirmada: **ninguna página las llama**. No hay regresión visible.

Decisión para S2: se documenta y no se corrige en esta fase, porque no hay consumidores. Si en el futuro se necesitan, el cliente deberá enviar la cabecera con el mismo mecanismo que las escrituras, dentro de la fase de autenticación.

---

## 5. Bloque S3: interfaz de administración

### 5.1 Principio

La interfaz solo oculta y bloquea. **La protección real es S2.** Si S3 se revirtiera por completo, el sistema seguiría protegido.

### 5.2 Cambios en `public/gds-api.js` (propuesta)

Al inicio del bloque de `DOMContentLoaded`, detectar el modo:

```js
let _gdsAdminHabilitado = false;
function gdsAdminHabilitado() { return _gdsAdminHabilitado === true; }

async function gdsDetectarModoAdmin() {
  try {
    const url = new URL('api.php?action=ping', window.location.href);
    const res = await fetch(url.toString());
    const json = await res.json();
    _gdsAdminHabilitado = !!(json.ok && json.data && json.data.admin_habilitado === true);
  } catch (e) {
    _gdsAdminHabilitado = false;
  }
  document.documentElement.dataset.gdsAdmin = _gdsAdminHabilitado ? 'on' : 'off';
}
```

Y en `getAdminApiToken()`, antes de pedir el token:

```js
if (!_gdsAdminHabilitado) throw new Error('Panel administrativo no disponible');
```

Criterio de fallo cerrado: si `ping` falla, el modo queda en `off`.

**Orden de carga:** en las cinco páginas, `gds-api.js` se carga antes que los scripts de página (verificado). La detección se ejecuta sin esperar a los clics del usuario, y si el usuario hace clic antes de que termine, el valor por defecto `false` bloquea la acción.

### 5.3 Cambios en `public/style.css` (una regla)

```css
html:not([data-gds-admin="on"]) .gds-admin-entry { display: none !important; }
```

Por defecto las entradas quedan ocultas. Solo se muestran si el servidor confirma que el panel está habilitado.

**Cambio visual que debe aprobarse:** en producción, mientras el panel esté deshabilitado, desaparecen de las páginas públicos los botones de administración (en `index.html`, `servicios.html`, `inscripciones.html`, `organigrama.html` y el botón flotante de `index.html`). Es el resultado esperado de la decisión 2. No altera ningún otro elemento de diseño.

### 5.4 Marcado de entradas en HTML

Agregar la clase `gds-admin-entry` a los botones de entrada, sin cambiar otros atributos:

| Página | Elemento | Línea de referencia (antes del cambio) |
|---|---|---|
| `index.html` | Botón de panel en la barra superior (`onclick="adminCheckAuth()"`) | 995 |
| `index.html` | Botón flotante `#adminFab` | 1058 |
| `servicios.html` | Botón (`adminCheckAuth()`) | 374 |
| `inscripciones.html` | Botón (`adminCheckAuthInsc()`) | 640 |
| `organigrama.html` | Botón (`adminCheckAuthOrg()`) | 474 |
| `noticias.html` | **Pendiente de localizar.** No encontré el disparador con búsqueda directa de `adminCheckAuth()` en el HTML. Se localizará con una lectura del archivo completo antes de editar | — |

Actualizar también el parámetro `?v=` de `gds-api.js` y `style.css` en cada página. Sin ese cambio, los navegadores pueden seguir usando la versión anterior en caché (riesgo R4).

### 5.5 Guardas en las funciones de entrada y de envío de OTP

Añadir al inicio de cada función una comprobación que impida abrir el login y, sobre todo, impida enviar el código por correo:

```js
if (!gdsAdminHabilitado()) return;
```

| Página | Funciones de entrada | Función que envía el OTP |
|---|---|---|
| `index.html` (bloque inline) | `adminCheckAuth()` (línea 2261) | `doAdminStep1()` |
| `noticias.js` | `adminCheckAuth()` (línea 96) | `doNotStep1()` |
| `organigrama.js` | `adminCheckAuthOrg()` (línea 333) | `doOrgStep1()` (línea 335) |
| `inscripciones.js` | `adminCheckAuthInsc()` (línea 32) | `doInscStep1()` |
| `servicios.js` | función de entrada del bloque 86-170 | paso 1 del login |

Las guardas bloquean también el envío de correos de EmailJS. Eso evita abuso del correo institucional mientras el panel esté deshabilitado.

**Limitación honesta:** la lógica de login sigue en el navegador. Esta fase no corrige eso; lo corrige la fase de autenticación.

---

## 6. Bloque S4: cabeceras en modo Report-Only

Cambio propuesto en `public/.htaccess`, dentro de `<IfModule mod_headers.c>`:

```apache
Header always set Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; media-src 'self'; frame-src https://www.google.com; connect-src 'self' https://api.emailjs.com; form-action 'self' https://gds.gnosoft.com.co; object-src 'none'; base-uri 'self'"
```

Motivos del diseño:
- `unsafe-inline` se permite porque el proyecto aún tiene manejadores inline y bloques `<script>` (deuda documentada en la fase 2). Una política sin `unsafe-inline` rompería la página.
- Solo informa. No bloquea nada. Las infracciones aparecen en la consola del navegador.
- No hay endpoint de informes (`report-uri`). Los datos se recogen a mano durante las pruebas.
- `form-action` incluye Gnosoft porque el formulario actual envía allí. Se retirará cuando se elimine ese formulario.

**Pruebas de S4:** en staging, abrir las cinco páginas con la consola abierta y anotar las infracciones. Esa lista es la línea base para la fase 2. La política no se pasa a modo bloqueante en esta fase.

**HTTPS y HSTS quedan fuera.** Se activarán cuando se verifique el certificado del subdominio.

---

## 7. Riesgos

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | **Staging escribe en el Google Sheets y la carpeta de Drive de producción.** El proxy llama al Apps Script real. Las pruebas de inscripción crearían registros y archivos reales de menores | Alta si no se separa | Alto | **G2:** crear un Apps Script de prueba con su propia hoja y carpeta, o desactivar el proxy en staging (respuesta 503 controlada). No probar inscripciones con la URL de producción |
| R2 | Quedarse sin acceso al panel por error de configuración | Media | Medio | El interruptor vive en `gds.php` del servidor. Procedimiento de reactivación documentado. Copia del archivo antes de cambiarlo |
| R3 | Datos personales reales en staging (copia de base de producción) | Alta | Alto | Staging protegido con **Directorio privado** de cPanel (usuario y contraseña). Cabecera o `robots.txt` que impida indexación. Eliminación de la copia de staging al terminar las pruebas, con decisión del responsable |
| R4 | Caché de navegador sirve JavaScript antiguo | Media | Medio | Actualizar `?v=` en las cinco páginas y en las referencias de CSS. Probar con caché deshabilitada |
| R5 | Staging ejecuta la versión PHP general de la cuenta, no necesariamente 8.4 | Alta | Medio | No se cambia la versión general (decisión del responsable). La compatibilidad 8.4 se verifica en local. La compatibilidad 8.2 se verifica en local con PHP 8.2 portable. Staging confirma integración con la versión vigente |
| R6 | El token de 32 caracteres no es suficiente frente a fuerza bruta | Baja | Medio | Se generan 64 caracteres (384 bits). Limitación de intentos llega en la fase de autenticación (ver R7) |
| R7 | Sin límite de uso en escrituras públicas (`inscripcion`, `colaborador`) ni en el envío de OTP | Media | Medio | No se resuelve en fase 1. Queda en la fase de autenticación y formularios, con limitación por IP usando la tabla `login_intentos` existente |
| R8 | El cambio de `ping` afecta a un consumidor no identificado | Baja | Bajo | Cambio aditivo. Verificado que solo `gds-api.js` lo usa |
| R9 | Los cambios en `archive/` (D1) se mueven sin verificar | Baja | Medio | Solo con autorización. Verificación de hash antes y después |
| R10 | Ocultar botones da falsa sensación de seguridad | Media | Medio | Documentado. La prueba de S2 es obligatoria y separada de la visual |

---

## 8. Pruebas

### 8.1 Línea base (antes de cualquier cambio)

Se ejecuta en local **antes** de editar nada:

- Capturar la respuesta JSON de cada GET público (17 acciones, con parámetros de ejemplo). Guardar con SHA-256 en `Respaldos_GDS\…\pruebas\base\`.
- Capturar la consola de las cinco páginas en escritorio (1366͗768) y móvil (390͗844).
- Capturar pantallazos de las cinco páginas para comparación visual.

### 8.2 Tabla de pruebas

| ID | Prueba | Resultado esperado | Entorno |
|---|---|---|---|
| T01 | `php -l` en los archivos PHP modificados | Sin errores | Local, PHP 8.4.27 |
| T02 | Igual que T01 | Sin errores | Local, PHP 8.2 portable |
| T03 | Repetir las 17 lecturas públicas y comparar con la línea base | Idénticas, excepto `ping` (nuevo campo) | Local y staging |
| T04 | Panel deshabilitado: POST `admin_*` sin token y con token | 403 en ambos casos | Local y staging |
| T05 | Panel deshabilitado: GET `admin_inscripciones` | 403 | Local y staging |
| T06 | Panel habilitado, sin cabecera | 401 | Local (base de prueba) |
| T07 | Panel habilitado, token incorrecto | 401 | Local (base de prueba) |
| T08 | Panel habilitado, token correcto, lectura `admin_inscripciones` | 200 con datos | Local (base de prueba) |
| T09 | Panel habilitado, token correcto, escritura en registro de prueba creado para la prueba, y eliminación del registro | Escritura y borrado correctos | Local (base de prueba) |
| T10 | Token enviado en el cuerpo POST (`admin_token`) o en la URL | Rechazado (401 o 403). Nunca 200 | Local |
| T11 | Token de menos de 32 caracteres con `GDS_ADMIN_ENABLED=true` | Panel deshabilitado (403) | Local |
| T12 | Sin token configurado | 403. Lecturas públicas siguen funcionando | Local |
| T13 | Registro de denegaciones | Aparece la acción denegada. No aparece el token ni su longitud | Local, revisar log |
| T14 | `GET /config.php`, `/app/config/config.php`, `/config/gds.php` por URL | 404 o 403. Nunca código fuente ni secretos | Local y staging |
| T15 | Navegador, cinco páginas, escritorio y móvil, con panel deshabilitado | Sin errores nuevos en consola. Botones admin ocultos. Diseño igual a la línea base salvo los botones | Local y staging |
| T16 | Clic en la entrada de admin con panel deshabilitado | No se abre login y no hay petición a EmailJS (revisar pestaña de red) | Local y staging |
| T17 | Navegador con panel habilitado (solo local) | Botones visibles. Login visual sigue funcionando (sin cambio de comportamiento) | Local |
| T18 | CSP Report-Only | Lista de infracciones registrada como línea base para fase 2 | Staging |
| T19 | Comparación de pantallazos antes y después | Sin diferencias, excepto los botones de admin | Local |
| T20 | Inscripción y colaborador de prueba | **No se ejecuta en esta fase** salvo con G2 cumplida (R1) | Staging con Apps Script de prueba |

### 8.3 Criterios de aceptación

La fase 1 se considera cumplida cuando:
- T01 a T19 pasan. T20 queda fuera hasta cumplir G2, y se documenta como pendiente.
- Ningún GET público cambia de respuesta, excepto por el campo nuevo en `ping`.
- No hay cambios en la base de datos.
- Staging funciona con la configuración de staging y la base restaurada.
- El responsable aprueba el resultado por escrito.

---

## 9. Procedimiento de reversión

**Principio:** nada se borra sin copia verificada previamente.

| Nivel | Qué hacer | Cuándo |
|---|---|---|
| Por archivo, en local | Copiar desde `Respaldos_GDS\…\proyecto\` y comprobar SHA-256 contra `SHA256_origen.txt` | Si una prueba local falla y no se corrige |
| Por archivo, en staging | Restaurar el archivo original desde la copia de respaldo completa de cPanel | Si staging falla |
| Solo panel | Poner `GDS_ADMIN_ENABLED` en `false` en `gds.php`. No hace falta revertir código | Si el panel queda inaccesible o hay un problema de seguridad |
| Base de datos | No aplica: fase 1 no cambia la base | — |
| Secretos | Restaurar el valor anterior **solo si** el nuevo impide el funcionamiento. El valor antiguo se considera comprometido, por lo que no se reutiliza en producción | Excepcional |

Cada copia de reversión se verifica antes de usarla. Los pasos quedan registrados en `CHANGELOG.md`.

---

## 10. Secuencia de ejecución

Cada paso con revisión. No se avanza sin el visto bueno del responsable.

| Paso | Qué | Requiere |
|---|---|---|
| 0 | Confirmar G0 (respaldo de base verificado) | Responsable |
| 1 | Crear staging (G1): subdominio, docroot, base y usuario propios, Directorio privado | Responsable |
| 2 | Decidir G2 (Apps Script de prueba o proxy desactivado en staging) | Responsable |
| 3 | Línea base: ejecutar 8.1 en local | Asistente |
| 4 | Ejecutar S1 en local (copia de `config.php`, cambio, pruebas T01-T03, T11-T12, T14) | Revisión del cambio |
| 5 | Ejecutar S2 en local (pruebas T01-T10, T13) | Revisión del cambio |
| 6 | Ejecutar S3 en local (pruebas T15-T17, T19) | Revisión del cambio |
| 7 | Ejecutar S4 y S5 (documentación y CSP) | Revisión |
| 8 | Subir a staging. Generar secretos de staging. Ejecutar pruebas en el hosting | Responsable |
| 9 | Informe de resultados con evidencias y pruebas pendientes | Responsable |
| 10 | Aprobación para cualquier paso posterior | Responsable |

**Nada se sube a producción en esta fase.** Producción no existe todavía como plataforma; cualquier despliegue en el dominio principal necesita aprobación separada.

---

## 11. Decisiones que requiere el responsable

| ID | Decisión |
|---|---|
| D1 | ¿Se mueven `archive/legacy/GDSavio/config.php` y `archive/legacy/gdsavio.rar` a la carpeta de respaldo? |
| D2 | G2: ¿Apps Script de prueba (con hoja y carpeta propias) o proxy desactivado en staging? |
| D3 | ¿Se crea el Directorio privado en staging y se aprueba la eliminación de la copia de datos al terminar las pruebas? |
| D4 | ¿Se confirma que ninguna otra aplicación usa el usuario MySQL que se va a rotar? |
| D5 | ¿Se aprueba el cambio visual de ocultar los botones de administración mientras el panel esté deshabilitado? |
| D6 | ¿Se aprueba que `GET admin_inscripciones` y `admin_colaboradores` queden sin consumidor y se documenten, en lugar de corregir `gdsGet()` en esta fase? |

---

## 12. Registro de este documento

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 30/10/2026 | Procedimiento preparado. Sin ejecución. Sin cambios en código, servidor ni base de datos |
