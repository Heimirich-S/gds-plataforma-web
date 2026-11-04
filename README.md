# GDS Web v3 — Guía de Instalación con MySQL + PHP

## Archivos que debes subir al servidor

```
tu-sitio/
├── index.html
├── inscripciones.html
├── noticias.html
├── organigrama.html
├── servicios.html
├── style.css
├── script.js
├── gds-api.js          ← NUEVO
├── api.php             ← NUEVO
├── app/config/config.php ← Configuración privada, fuera de public_html
├── .htaccess           ← NUEVO
├── gds_database_final.sql  ← Solo para importar en phpMyAdmin, no subir al servidor
└── img/
    └── (todas las imágenes)
```

---

## PASO 1 — Crear la base de datos en cPanel

1. Entra a **cPanel → MySQL Databases**
2. En "Create New Database" escribe `gds_web` → **Create Database**
3. En "MySQL Users → Add New User":
   - Usuario: `gds_admin`
   - Contraseña: crea una segura (guárdala)
4. En "Add User to Database": elige `gds_admin` y `gds_web` → **Add** → **All Privileges**

> **Importante:** cPanel agrega el prefijo de tu cuenta automáticamente.
> Si tu cuenta es `abc123`, la base quedará como `abc123_gds_web`
> y el usuario como `abc123_gds_admin`. Usa esos nombres en el paso 2.

---

## PASO 2 — Importar los datos iniciales

1. En cPanel → **phpMyAdmin**
2. Click en la base `abc123_gds_web` en el panel izquierdo
3. Pestaña **SQL** (o **Importar** si el archivo es grande)
4. Pega o sube el contenido de `gds_database_final.sql`
5. Click en **Go / Ejecutar**
6. Deberías ver "22 tablas creadas" sin errores

---

## PASO 3 — Configurar la configuración privada

Configura `app/config/config.php` fuera de `public_html`. En producción, define `GDS_DB_PASS` y `GDS_ADMIN_TOKEN` como variables de entorno del servidor.

```php
define('DB_HOST', 'localhost');           // NO cambiar en cPanel
define('DB_NAME', 'abc123_gds_web');      // ← TU prefijo_gds_web
define('DB_USER', 'abc123_gds_admin');    // ← TU prefijo_gds_admin
define('DB_PASS', 'TU_PASSWORD_AQUI');    // ← La contraseña del paso 1
```

Luego genera un token aleatorio en https://www.uuidgenerator.net/ y ponlo aquí:

```php
define('ADMIN_TOKEN', 'abc123xyz789...');  // ← Token de 32+ caracteres
```

Y en `gds-api.js` pon el MISMO token:

```js
const ADMIN_API_TOKEN = 'abc123xyz789...'; // ← Mismo token
```

> **Seguridad:** la configuración activa no está dentro de `public_html`; `.htaccess` solo es una defensa adicional contra copias accidentales.

---

## PASO 4 — Agregar gds-api.js a cada HTML

En **cada archivo HTML**, agrega esta línea ANTES del cierre de `</body>`:

```html
<script src="gds-api.js"></script>
```

Colócala antes de `<script src="script.js"></script>` si existe.

Ejemplo en index.html:
```html
  ...
  <script src="gds-api.js"></script>
  <script src="script.js"></script>
</body>
```

---

## PASO 5 — Subir todo al servidor

Sube al servidor (por FTP o administrador de archivos de cPanel):
- `api.php`
- `app/config/config.php` fuera del document root
- `gds-api.js`
- `.htaccess`
- Todos los HTML actualizados

**NO subas** `gds_database_final.sql` al servidor web (ya lo importaste en phpMyAdmin).

---

## PASO 6 — Verificar que funciona

Abre en el navegador:
```
https://tu-dominio.com/api.php?action=noticias
```

Deberías ver un JSON como:
```json
{"ok":true,"data":[{"id":"n1","cat":"Academico","featured":1,...}]}
```

Si ves ese JSON, ¡todo funciona! Si ves un error, revisa las credenciales en config.php.

---

## Qué cambia visualmente

**Nada para los visitantes.** El sitio se ve exactamente igual.

**Para ti como admin:**
- Los cambios que hagas en el panel admin (agregar noticias, modificar convenios, etc.) ahora se guardan en MySQL y **todos los visitantes los ven inmediatamente**.
- Ya no depende del navegador donde hagas los cambios.
- Las inscripciones y postulaciones de colaboradores se guardan tanto en MySQL como en Google Sheets (el Apps Script sigue funcionando igual).

---

## Qué pasa con el localStorage

El `gds-api.js` se carga primero y reemplaza automáticamente las funciones
que antes leían de localStorage. El localStorage ya no se usa para contenido
dinámico. Puede quedar con datos viejos pero no afecta nada.

---

## Solución de problemas frecuentes

| Error | Causa | Solución |
|-------|-------|----------|
| `Error de conexión a la base de datos` | Credenciales incorrectas | Revisa DB_NAME, DB_USER y `GDS_DB_PASS` en el entorno del servidor |
| `No autorizado` en acciones admin | Credencial incorrecta | Introduce la credencial privada cuando el panel la solicite |
| El contenido no se actualiza | gds-api.js no cargado | Verifica que `<script src="gds-api.js">` esté en el HTML |
| Imágenes no aparecen | Ruta incorrecta | Las imágenes siguen siendo archivos en la carpeta `img/`, asegúrate de subirlas |

---

## Seguridad importante

1. **No compartas `app/config/config.php`** ni las variables privadas del servidor.
2. **Rota `GDS_ADMIN_TOKEN`** si existe sospecha de exposición.
3. El archivo `.htaccess` bloquea copias accidentales, pero la protección principal es mantener la configuración fuera de `public_html`.
4. Activa HTTPS en tu dominio (cPanel → SSL/TLS).
