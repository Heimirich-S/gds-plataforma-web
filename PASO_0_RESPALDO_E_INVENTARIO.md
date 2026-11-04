# Paso 0: respaldo, inventario y verificación

| Campo | Valor |
|---|---|
| Fecha | 30/10/2026 |
| Autorización | Paso 0 autorizado por el responsable del proyecto, con las condiciones de no modificar el servidor, no eliminar archivos ni tablas, no ejecutar SQL destructivo y no desplegar |
| Alcance | Respaldo del proyecto local, verificación del respaldo, inventario de lo publicado (solo lectura) |
| Modificaciones al servidor | **Ninguna** |
| Modificaciones al proyecto | Ninguna. Este documento es el único archivo nuevo dentro del proyecto |

---

## 1. Respaldo del proyecto local: completado y verificado

| Elemento | Resultado |
|---|---|
| Origen | `Proyecto Plataforma Web GDS` (proyecto completo) |
| Destino | `Desktop\Respaldos_GDS\2026-10-30_previo_fase1\proyecto\` (fuera del proyecto) |
| Método | `robocopy /E /COPY:DAT` (copia sin borrar ni sobrescribir; el destino no existía) |
| Tamaño | 453 archivos, 615,25 MB |
| Verificación | SHA-256 de los 453 archivos del origen comparado con la copia: **453 coincidentes, 0 discrepancias** |
| Manifiesto | `Desktop\Respaldos_GDS\2026-10-30_previo_fase1\SHA256_origen.txt` |

**¿Es utilizable?** Sí como copia de archivos: cada archivo es idéntico byte a byte al original. Una restauración completa se comprobará al preparar la fase 1, copiando el respaldo a una carpeta de prueba y ejecutando la sintaxis PHP.

---

## 2. Respaldo de la base de datos: pendiente (acción en cPanel)

**Situación comprobada:**
- En el equipo local, el MySQL de XAMPP tiene las bases `mysql`, `performance_schema`, `phpmyadmin`, `sistema_admisiones`, `test`. **No existe `gds_web`.** `sistema_admisiones` pertenece a otro proyecto y no se ha tocado.
- La base real del colegio solo puede estar en el hosting. No es accesible desde este entorno y no se han usado credenciales.

**Procedimiento para el responsable (cPanel, sin ejecutar SQL):**

1. cPanel → **Copias de seguridad** → **Descargar una copia completa** (archivos y bases de datos). Guardar el archivo en `Desktop\Respaldos_GDS\2026-10-30_previo_fase1\cpanel\`.
2. Como respaldo adicional de la base, cPanel → **phpMyAdmin** → seleccionar cada base → **Exportar** → método *Personalizado*, formato *SQL*, con "Estructura y datos", **sin** opciones que añadan `DROP`. Guardar en `...\bd\`. Repetir para cada base que aparezca en la lista (incluida la de la web antigua, si está en la misma cuenta).
3. Verificar cada archivo de base de datos:
   - Tamaño mayor que cero y abre en un editor de texto.
   - Al final aparece `-- Dump completed`.
   - Contar las sentencias `CREATE TABLE` y anotar el número.
   - Anotar el número de filas de `inscripciones`, `colaboradores`, `noticias` y `personal` (solo si la base es la de GDS).
4. Prueba de restauración: crear en cPanel una base de prueba (por ejemplo `gds_restore_prueba`), importar el archivo y comparar el número de tablas y filas. La base de prueba puede conservarse o eliminarse, a decisión del responsable.

**Criterio para dar el respaldo por válido:** la restauración de prueba termina sin errores y el número de tablas y filas coincide con la base original.

---

## 3. Inventario de lo publicado (solo lectura)

**Método:** peticiones `GET` y `HEAD` al dominio público, sin credenciales, sin escritura y sin descargar archivos sensibles. Script: `Respaldos_GDS\2026-10-30_previo_fase1\herramientas\probe_gds.ps1`.

### 3.1 Qué sirve el dominio

| Dominio | Resultado |
|---|---|
| `https://www.gimnasiodomingosavio.edu.co/` | HTTP 200. **Sitio Joomla** (`generator: Joomla!`, título "Gimnasio Domingo Savio"). No contiene `gds-api.js` |
| `https://gimnasiodomingosavio.edu.co/` | HTTP 200. Mismo sitio Joomla |
| `http://www.gimnasiodomingosavio.edu.co/` | Redirige a `https://www…`, mismo sitio |

**Conclusión:** lo que está publicado hoy es la web institucional antigua. **La plataforma nueva no está publicada** en el dominio principal.

### 3.2 Rutas de la plataforma nueva (todas inexistentes)

| Ruta | Respuesta |
|---|---|
| `/index.html`, `/gds-api.js`, `/api.php`, `/apps_script_proxy.php`, `/style.css`, `/js/…`, `/css/…` (20 archivos del proyecto) | **404** |
| `/api.php?action=ping`, `/api.php?action=noticias` | **404** |
| `/gds/api.php`, `/plataforma/api.php`, `/web/api.php`, `/nueva/api.php` | **404** |
| `plataforma.` y `gds.` como subdominios | No resuelven |

### 3.3 Archivos sensibles en la raíz del dominio

| Ruta | Respuesta | Interpretación |
|---|---|---|
| `/config.php`, `/public/config.php` | 404 | No existen en la raíz del dominio (si la raíz es `public_html`, como indica la documentación) |
| `/app/config/config.php` | 404 | No accesible por URL |
| `/storage/database/gds_database_final.sql` | 404 | No accesible por URL |
| `/.htaccess` | 403 | Apache bloquea los archivos `.ht*` por defecto. **No es una prueba concluyente** de que exista |
| `/README.md`, `/LEEME_CAMBIOS.md`, `/ARQUITECTURA_Y_OPERACION.md`, `/script.js`, `/documento/` | 404 | No publicados |

### 3.4 Qué implica para la decisión 2 (panel administrativo)

Como la plataforma nueva no está publicada, **no hay panel administrativo accesible en producción hoy**. La decisión de deshabilitarlo se aplica en el **primer despliegue** de la plataforma, no sobre el sitio actual. El sitio Joomla no se ha evaluado en esta fase.

---

## 4. Verificación de coincidencia de archivos publicados

**No aplicable:** no hay archivos de la plataforma publicados que comparar. Se han comprobado 20 rutas del proyecto y las 20 responden 404.

---

## 5. Lo que no se ha podido verificar y necesita revisión en cPanel

Solo lectura. No se necesita ninguna modificación.

| Elemento | Qué revisar | Cómo |
|---|---|---|
| Contenido de `public_html` | Nombres, tamaños y fechas de los archivos (sin abrir `config`) | Administrador de archivos → lista |
| Carpeta de la cuenta, fuera de `public_html` | ¿Existe `app/`, `config/` o `storage/`? Solo nombres | Administrador de archivos → carpeta raíz de la cuenta |
| Bases de datos | ¿Existe alguna base de GDS (`…_gds_web`) y de qué tamaño es? | phpMyAdmin → lista de bases (sin ejecutar SQL) |
| Versión PHP | Versión que usa actualmente el dominio | Selector PHP (sin cambiarla) |
| Variables privadas | ¿Están definidas `GDS_DB_PASS` y `GDS_ADMIN_TOKEN`? (no es posible ver sus valores) | Confirmación del responsable del hosting |
| Usuarios de MySQL | ¿Hay un usuario exclusivo para la aplicación? | MySQL Databases (sin cambiar permisos) |

**Dato útil para continuar:** el responsable puede enviar solo los nombres y tamaños de los archivos de `public_html` y de la carpeta raíz de la cuenta. No enviar contenido de configuración ni contraseñas.

---

## 6. Inventario de cambios de este paso

| Acción | Elemento | Ubicación |
|---|---|---|
| Creado | Carpeta de respaldo del proyecto (453 archivos) | `Desktop\Respaldos_GDS\2026-10-30_previo_fase1\proyecto\` (fuera del proyecto) |
| Creado | Manifiesto SHA-256 del respaldo | `Desktop\Respaldos_GDS\2026-10-30_previo_fase1\SHA256_origen.txt` |
| Creado | Script de inventario de solo lectura | `Desktop\Respaldos_GDS\2026-10-30_previo_fase1\herramientas\probe_gds.ps1` |
| Creado | Este informe | `PASO_0_RESPALDO_E_INVENTARIO.md` (en el proyecto) |
| Eliminado | Archivos temporales de inventario (descargas de prueba de la web Joomla) | `%LOCALAPPDATA%\Temp\opencode\probe` (fuera del proyecto) |
| Modificado | Ningún archivo del proyecto | — |
| Modificado | Ningún archivo ni base de datos del servidor | — |

---

## 7. Pendiente antes de la fase 1

1. Respaldo de la base de datos en cPanel y prueba de restauración (sección 2).
2. Revisión en cPanel de los elementos de la sección 5.
3. Confirmación de dónde se publicará la plataforma nueva (subdominio, carpeta o dominio principal).
4. Aprobación del plan de la fase 1.
