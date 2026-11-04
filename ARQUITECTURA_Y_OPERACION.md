# Plataforma Web GDS - Arquitectura y operación

Documento de referencia para desarrollar, modificar, probar y publicar el sitio del Gimnasio Domingo Savio. Debe consultarse antes de cambiar la estructura, la base de datos, la autenticación o el despliegue.

## 1. Objetivo del software

La plataforma es un sitio institucional web con:

- Páginas públicas informativas.
- Contenido dinámico administrado desde MySQL.
- Formularios de inscripción y colaboración.
- Integración con Google Apps Script y Google Drive.
- Paneles administrativos embebidos en algunas páginas.
- Imágenes y documentos servidos desde la carpeta pública.

La prioridad del proyecto es mantener una web sencilla de desplegar en cPanel, fácil de administrar y preparada para crecer sin convertir cada cambio en una reescritura completa.

## 2. Arquitectura vigente

```text
Navegador
   |
   | HTML + CSS + JavaScript
   v
gds-api.js
   |
   | fetch HTTP
   v
api.php -------------------- apps_script_proxy.php
   |                                  |
   | PDO                              | cURL
   v                                  v
MySQL                         Google Apps Script
                                      |
                                      v
                               Google Sheets / Drive
```

### Responsabilidades

| Capa | Responsabilidad | No debe hacer |
|---|---|---|
| HTML | Estructura, contenido inicial y puntos de montaje | Consultar MySQL directamente |
| CSS | Presentación, responsive y animaciones visuales | Contener lógica de negocio |
| JavaScript de página | Interacción propia de una página | Repetir el cliente HTTP |
| `js/common.js` | Navegación, slider, tabs, animaciones comunes y comportamiento compartido | Guardar credenciales o hablar con MySQL |
| `js/modules/avatar.js` | Fallback visual de imágenes de personal | Gestionar datos institucionales |
| `gds-api.js` | Cliente HTTP y contrato del frontend con la API | Ejecutar SQL o validar permisos por sí solo |
| `api.php` | API, validación, consultas y permisos administrativos | Renderizar HTML |
| `app/config/config.php` | Credenciales y configuración privada del servidor | Ser accesible desde el navegador |
| MySQL | Persistencia de contenido, formularios y estados | Servir archivos públicos |
| Apps Script | Operaciones con Sheets y Drive | Sustituir la base de datos institucional |

## 3. Estructura de carpetas

```text
Proyecto Plataforma Web GDS/
├── public/                         # Raíz pública del sitio y document root
│   ├── index.html                  # Portada y resúmenes
│   ├── noticias.html               # Noticias, periódicos y documentos
│   ├── organigrama.html            # Personal y estructura institucional
│   ├── servicios.html              # Servicios y administración relacionada
│   ├── inscripciones.html          # Matrículas y formularios
│   ├── style.css                   # Estilos globales compartidos
│   ├── css/home.css                # Ajustes específicos de la portada
│   ├── js/common.js                # JavaScript común activo
│   ├── js/modules/avatar.js         # Fallback de avatares
│   ├── script.js                   # Compatibilidad histórica; no agregar lógica aquí
│   ├── gds-api.js                  # Cliente API del navegador
│   ├── api.php                     # API PHP principal
│   ├── apps_script_proxy.php       # Proxy server-side hacia Apps Script
│   ├── config.php                  # No debe existir en public; configuración activa fuera del document root
│   ├── .htaccess                   # Seguridad, headers, cache y compresión
│   ├── img/                        # Imágenes publicables
│   └── documento/                  # Documentos publicables
├── storage/database/               # SQL de instalación y respaldo, no público
├── app/services/Code.gs             # Código fuente de Google Apps Script
├── archive/                        # Código histórico, no desplegar
├── img_originales_respaldo/        # Respaldo local, no desplegar
├── README.md                       # Instalación rápida
└── LEEME_CAMBIOS.md                # Historial de reorganización de imágenes
```

## 4. Reglas de organización del frontend

### Páginas

`index.html` debe mostrar resúmenes y accesos. No debe convertirse en el repositorio de todo el contenido institucional.

- El detalle de noticias pertenece a `noticias.html`.
- La estructura y personal pertenecen a `organigrama.html`.
- Los servicios pertenecen a `servicios.html`.
- Las matrículas, costos y formularios pertenecen a `inscripciones.html`.
- Si una sección crece demasiado, debe convertirse en una página propia antes de agregar más bloques a la portada.

### JavaScript

Antes de crear una función:

1. Comprobar si ya existe una función equivalente en `js/common.js`, `gds-api.js` o en la página correspondiente.
2. Si se usa en dos o más páginas, moverla a `js/common.js` solo si no depende de datos privados de una página.
3. Si pertenece a una sola página, crear un archivo dedicado como `js/pages/noticias.js` o `js/pages/inscripciones.js`.
4. No colocar nuevas funciones en `script.js`; es únicamente un archivo legado de compatibilidad.
5. No duplicar nombres globales como `GDS`, `gdsGet`, `gdsPost`, `gdsAvatar` o `ADMIN_API_TOKEN`.
6. Mantener el orden de carga: librerías externas, módulos auxiliares, `gds-api.js`, JavaScript común y finalmente la lógica de página.

### CSS

- `style.css` contiene reglas globales y componentes compartidos.
- Las reglas de una página deben ir en `css/home.css`, `css/noticias.css`, `css/servicios.css`, etc.
- No agregar nuevos bloques `<style>` inline salvo una necesidad temporal documentada.
- No usar estilos inline para reglas permanentes.
- Mantener nombres de clases descriptivos y evitar selectores que dependan de una posición concreta del HTML.
- Toda modificación visual debe comprobar escritorio y móvil.

### Datos

- El contenido editable debe vivir en MySQL.
- `localStorage` solo puede utilizarse como fallback temporal o para preferencias no sensibles del navegador.
- Las claves y nombres de campos de la API deben mantenerse compatibles con las páginas existentes.
- Si se cambia una respuesta de `api.php`, actualizar el consumidor y documentar la migración.

## 5. Reglas para backend y base de datos

### API PHP

Toda acción nueva debe:

- Validar el método HTTP esperado.
- Validar y normalizar cada entrada del usuario.
- Usar consultas preparadas PDO; nunca concatenar valores recibidos en SQL.
- Comprobar autorización en cada acción administrativa.
- Devolver JSON consistente con `ok`, `data` o `error`.
- No revelar rutas internas, consultas, credenciales ni trazas en producción.
- Registrar errores en el log del servidor, no en la respuesta pública.

Las acciones públicas deben ser de lectura o de recepción controlada de formularios. Las acciones de escritura administrativa deben requerir autenticación independiente y verificarse en el servidor.

### MySQL

- Usar `utf8mb4`.
- Mantener claves primarias, índices y claves foráneas.
- No editar manualmente la base de producción sin respaldo.
- Toda modificación estructural debe tener un script SQL de migración reversible o un plan de restauración.
- No usar `DROP TABLE` en migraciones de producción.
- Añadir índices cuando una consulta nueva filtre u ordene grandes volúmenes.
- Separar tablas de catálogo, contenido, formularios y auditoría.

El archivo `storage/database/gds_database_final.sql` es una instalación o respaldo inicial. No debe subirse al directorio público ni ejecutarse sobre producción sin verificar primero el respaldo.

## 6. Seguridad obligatoria antes de cPanel

La configuración activa está en `app/config/config.php`, fuera de `public`. Antes de publicar:

1. Rotar la contraseña de MySQL.
2. Generar un nuevo token administrativo largo y aleatorio.
3. No reutilizar el token actual.
4. No guardar secretos reales en Git, ZIP compartidos, capturas ni documentación.
5. Mantener `app/config/config.php` fuera de `public_html` y cargarlo mediante una ruta absoluta segura. No depender únicamente de `.htaccess`.
6. Confirmar que una petición directa a `config.php` no devuelve su contenido.
7. Mantener `DEBUG_MODE` en `false` en producción y proporcionar `GDS_DB_PASS` mediante el entorno del servidor.
8. Activar HTTPS antes de usar el panel administrativo.
9. Crear un usuario MySQL exclusivo para la aplicación, no usar `root`.
10. Asignar al usuario solo los privilegios necesarios sobre la base GDS.

### Advertencia sobre el token del navegador

Un token incluido en `gds-api.js` puede ser inspeccionado por cualquier visitante. Por eso no debe considerarse una autenticación fuerte. Para una publicación profesional, el panel administrativo debe evolucionar a una sesión PHP segura o a autenticación equivalente server-side:

- Login HTTPS.
- Contraseña almacenada con `password_hash`.
- Sesión PHP con cookies `HttpOnly`, `Secure` y `SameSite`.
- Regeneración de sesión después del login.
- Protección CSRF para operaciones POST.
- Expiración y cierre de sesión.
- Rate limiting y bloqueo progresivo.
- Registro de acciones administrativas.

Durante la transición, el token ya no está embebido en `gds-api.js`: se conserva solo en configuración privada y el administrador lo introduce en runtime. Esto es temporal y no sustituye una sesión PHP segura.

### Formularios

- Validar en JavaScript solo para mejorar la experiencia.
- Validar de nuevo siempre en PHP.
- Limitar longitud, tipo y tamaño de archivos.
- Sanitizar la salida HTML y escapar valores dinámicos.
- Evitar insertar directamente contenido enviado por usuarios mediante `innerHTML`.
- Añadir protección contra spam, rate limiting y CAPTCHA si el volumen aumenta.
- No guardar contraseñas ni códigos OTP en texto plano.

## 7. Despliegue recomendado en cPanel

### Preparación

- Respaldar archivos actuales y base de datos.
- Probar localmente con PHP, MySQL y HTTPS simulado cuando sea posible.
- Comprobar que las rutas de imágenes usan `img/` y no rutas antiguas.
- Revisar que no se incluyan `archive/`, `img_originales_respaldo/` ni SQL dentro de `public_html`.
- Verificar versión PHP compatible y extensiones `pdo`, `pdo_mysql`, `curl`, `json` y `mbstring`.

### Distribución

En `public_html` deben quedar solo los archivos necesarios de `public/`:

```text
public_html/
├── index.html
├── noticias.html
├── organigrama.html
├── servicios.html
├── inscripciones.html
├── style.css
├── css/
├── js/
├── img/
├── documento/
├── api.php
├── apps_script_proxy.php
├── gds-api.js
└── .htaccess
```

El SQL se importa desde phpMyAdmin y no se deja descargable. `config.php` debe estar fuera de `public_html` siempre que el hosting lo permita.

### Verificación posterior

Comprobar en este orden:

1. `https://dominio/` carga sin errores de consola.
2. `https://dominio/api.php?action=ping` devuelve JSON correcto.
3. Noticias, convenios, organigrama y servicios cargan desde MySQL.
4. Las imágenes y documentos no tienen errores 404.
5. Los formularios muestran validaciones y llegan a sus destinos.
6. Las acciones administrativas rechazan peticiones sin autorización.
7. `https://dominio/config.php` no expone código ni credenciales.
8. La web funciona en móvil, escritorio y navegadores principales.
9. Los logs no muestran warnings, errores fatales ni credenciales.

## 8. Flujo obligatorio para cualquier modificación

1. Identificar la página, módulo o endpoint responsable.
2. Leer el código existente y buscar usos antes de cambiar nombres o contratos.
3. Formular una hipótesis concreta del cambio y una prueba que pueda fallar.
4. Hacer el cambio mínimo, sin reformatear archivos no relacionados.
5. Ejecutar validación de sintaxis o pruebas específicas inmediatamente.
6. Probar la ruta afectada en escritorio y móvil.
7. Comprobar consola del navegador y respuesta de API.
8. Si hay base de datos, respaldar y probar la migración en local.
9. Documentar cambios de API, SQL, configuración o despliegue.
10. Publicar primero en una copia o entorno de prueba, nunca directamente sobre producción.

No se debe aceptar una modificación si:

- Rompe la estructura JSON consumida por el frontend sin migración.
- Introduce secretos en HTML o JavaScript público.
- Usa SQL concatenado.
- Desactiva validaciones para "hacer que funcione".
- Mezcla lógica de página en `gds-api.js`.
- Convierte la portada en un contenedor de contenido que pertenece a otra página.
- Elimina información o archivos sin respaldo y justificación.

## 9. Copias de seguridad y recuperación

Mantener como mínimo:

- Copia diaria de la base de datos en producción.
- Copia antes de cada migración.
- Copia de archivos antes de cada despliegue.
- Una copia fuera del servidor.
- Registro de fecha, versión y responsable.

Una copia no se considera válida hasta probar su restauración en otra base o entorno. El procedimiento de recuperación debe poder responder:

- Qué versión de archivos estaba activa.
- Qué respaldo de base corresponde.
- Qué credenciales deben regenerarse.
- Cómo volver a habilitar el sitio sin exponer la configuración.

## 10. Crecimiento previsto

### Corto plazo

- Extraer los scripts inline restantes a `js/pages/`.
- Extraer los estilos inline restantes a `css/pages/`.
- Sustituir el token administrativo del frontend por sesiones PHP.
- Añadir logs de errores y acciones administrativas.
- Crear pruebas básicas para `ping`, lecturas públicas y formularios.

### Mediano plazo

- Añadir migraciones SQL versionadas.
- Crear un panel administrativo separado de las páginas públicas.
- Incorporar roles y permisos.
- Añadir paginación y filtros para noticias, documentos e inscripciones.
- Añadir caché de lecturas públicas si el tráfico aumenta.
- Servir imágenes optimizadas y generar miniaturas.

### Largo plazo

Evaluar un framework o un frontend con build solo si existe una necesidad real: muchos componentes interactivos, equipos de desarrollo, pruebas automatizadas amplias o crecimiento importante del panel. La migración no debe hacerse solo por moda ni antes de estabilizar los contratos de la API.

## 11. Regla final de diseño

Cada pieza debe tener un único lugar responsable:

- El contenido persistente va en MySQL.
- La presentación va en HTML y CSS.
- La interacción común va en `js/common.js`.
- La interacción de una página va en su módulo de página.
- Las lecturas y escrituras pasan por `gds-api.js` y `api.php`.
- Los secretos viven en configuración privada del servidor.
- Las decisiones importantes quedan documentadas junto con el cambio.

Si una modificación no encaja claramente en una de esas responsabilidades, primero hay que revisar la arquitectura antes de implementarla.