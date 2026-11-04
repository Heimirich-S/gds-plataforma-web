# Diagnóstico de ubicación del acceso administrativo — GDS

| Campo | Valor |
|---|---|
| Fecha | 31/10/2026 |
| Tipo | Inspección de solo lectura |

---

## 1. Archivo y línea donde se encuentra el botón

En `public/index.html`, línea 995:

```html
<div class="footer-bottom">
  <p>© 2026 Gimnasio Domingo Savio · Cúcuta, Norte de Santander, Colombia</p>
  <button class="gds-admin-entry" onclick="adminCheckAuth()" ...>Administrador</button>
</div>
```

El mismo patrón aparece en:
- `public/servicios.html`, línea 374
- `public/organigrama.html`, línea 474
- `public/inscripciones.html`, línea 640

## 2. Contenedor HTML al que pertenece actualmente

`<div class="footer-bottom">` dentro de `<footer class="footer">`, al final del documento, después de todo el contenido principal.

## 3. Causa raíz

El botón con clase `gds-admin-entry` fue colocado dentro del footer en lugar de dentro de la navbar (`<header class="navbar" id="navbar">`, líneas 83-150). La navbar no contiene ningún elemento con clase `gds-admin-entry`.

Esto ocurrió durante la fase de seguridad (Fase 1), cuando se agregó la clase `gds-admin-entry` a los botones existentes. Los botones ya estaban en el footer (diseño original), y no se movieron a la navbar.

## 4. ¿HTML, CSS o JavaScript?

**HTML (ubicación del elemento).** No hay regla CSS ni función JS que traslade el botón. La clase `gds-admin-entry` solo controla la visibilidad (`display: none !important` cuando `data-gds-admin !== "on"`), no la posición.

## 5. Cambio mínimo recomendado

Mover el bloque del botón administrativo (líneas 995-998 en `index.html`) desde `<div class="footer-bottom">` hacia el interior de `<nav class="nav-links" id="navLinks">` (antes del cierre `</nav>`, línea 145), junto al botón de inscripciones.

El mismo cambio aplica a las otras 3 páginas.

## 6. Archivos que sería necesario modificar

- `public/index.html`
- `public/servicios.html`
- `public/organigrama.html`
- `public/inscripciones.html`

No es necesario modificar CSS ni JavaScript.

---

**No se modificó ningún archivo. Diagnóstico completado. Esperando autorización.**