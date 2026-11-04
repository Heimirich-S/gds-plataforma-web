# Reorganización de imágenes — Gimnasio Domingo Savio (v2)

Esta es la misma reorganización de imágenes que hice antes, **reaplicada sobre tu código actualizado** (el que ya incluye `api.php`, `gds-api.js`, `config.php`, `.htaccess`, `Code.gs`, `apps_script_proxy.php` y `README.md` para el backend MySQL + Apps Script). Las imágenes en sí no cambiaron respecto a la vez anterior (mismo `img.rar`), así que reutilicé la misma carpeta `img/` ya organizada y convertida a WebP, y solo volví a aplicar las rutas nuevas sobre tus archivos actualizados.

## Qué toqué en esta pasada

Apliqué el mismo mapa de rutas de antes a los 5 HTML y al SQL, y de paso revisé los archivos nuevos del backend (`api.php`, `gds-api.js`, `config.php`, `.htaccess`, `README.md`, `Code.gs`, `apps_script_proxy.php`): **ninguno de ellos hace referencia directa a archivos de imagen** (solo el README menciona la carpeta `img/` en general), así que no necesitaron cambios de rutas.

Total de reemplazos por archivo:
- `index.html`: 43
- `noticias.html`: 11
- `organigrama.html`: 52
- `servicios.html`: 10
- `inscripciones.html`: 13
- `gds_database_final.sql`: 58

Verifiqué de nuevo al final que **todas** las referencias `img/...` en el código apuntan a un archivo real dentro de la nueva estructura. Cero rutas rotas.

## Recordatorio de lo que quedó organizado (igual que la vez pasada)

- `img/personal/`, `img/noticias/`, `img/noticias/periodicos/`, `img/convenios/`, `img/popup/`, `img/institucional/`, `img/iconos/`, `img/servicios/`, `img/matriculas/`, `img/promociones/`, `img/documentos/` — 145 imágenes en WebP, kebab-case, sin tildes/ñ/espacios.
- `img/escudo-gds.png` se mantiene en la raíz sin tocar (es el favicon).
- Los mismos bugs de nombres/extensión que corregí antes (fotos de personal en `inscripciones.html` que apuntaban a `.jpg` inexistentes, el logo "Aquí Entre Niños" con 3 nombres distintos, imágenes sin convertir a WebP) siguen corregidos aquí también.

## Lo pendiente sigue igual

- `img/paneles-solares.webp` y `paneles-solares-popup.webp` no tienen archivo de origen — sigue sin poderse resolver hasta que subas esa foto.
- `gds_database_final.sql` es el dump editado, no tu base de datos en vivo — si ya la tienes cargada, necesitas reimportarlo o correr los `UPDATE` de las columnas de imagen. Sigo disponible para generarte ese script de `UPDATE` si lo prefieres en vez de reimportar todo.

## ⚠️ Por qué las noticias no cargaban (y cómo se soluciona)

`noticias.html` y la sección de noticias en `index.html` ya tenían las rutas correctas en su código (`NOTICIAS_DEFAULT`, `PERIODICOS_DEFAULT`, etc.). El problema es que ahora el sitio carga ese contenido **dinámicamente desde tu base de datos MySQL** vía `gds-api.js` → `api.php`, y esa llamada sobrescribe los datos por defecto del HTML. Como tu base de datos en vivo (la que ya tienes cargada en el hosting o en XAMPP) todavía tiene las rutas **viejas** de antes de la reorganización, las imágenes de noticias, periódicos, convenios, popup y personal seguían rotas — aunque el código estuviera perfecto.

**La solución es `UPDATE_rutas_imagenes.sql`** (incluido en este ZIP): actualiza únicamente las columnas de imagen (`img`, `img_card`, `foto`) de las 58 filas afectadas en las tablas `noticias`, `periodicos`, `convenios`, `popup_slides`, `servicios` y `personal` — sin tocar ningún otro dato ni borrar nada.

**Cómo aplicarlo:**
1. Entra a phpMyAdmin → selecciona tu base de datos.
2. Ve a la pestaña **SQL**.
3. Pega el contenido completo de `UPDATE_rutas_imagenes.sql` → **Continuar/Go**.
4. Listo — recarga el sitio y las imágenes de noticias, periódicos, convenios, popup y del directorio de personal deberían cargar.

(La primera vez había generado esto mal — un fallo mío al parsear la tabla `personal`, que en tu SQL tiene dos bloques `INSERT` distintos, uno para directivos/administrativos y otro para los 27 docentes. Solo tomé el primero y me faltaron 27 filas. Ya está corregido: son 58 `UPDATE` en total, incluidos los 40 de `personal`.)

## Contenido del ZIP

- `site/` → los 15 archivos de tu proyecto (5 HTML, CSS, JS, SQL, y los 7 archivos del backend nuevo) con las rutas de imagen ya corregidas.
- `img/` → carpeta de imágenes organizada en WebP, lista para subir reemplazando tu `img/` actual.
- `img_originales_respaldo/` → tus imágenes originales sin tocar, solo de respaldo (no subir al servidor).
- `UPDATE_rutas_imagenes.sql` → corre esto en tu base de datos en vivo para que las noticias, periódicos, convenios, popup y personal carguen las imágenes correctas.
