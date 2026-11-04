# Diagnóstico de visibilidad del acceso administrativo — GDS

| Campo | Valor |
|---|---|
| Fecha | 31/10/2026 |
| Tipo | Inspección de solo lectura |

---

## 1. Causa raíz

El botón `.gds-admin-entry` tiene estilo inline con texto blanco:

```html
style="...;color:rgba(255,255,255,.7);..."
```

Este color fue diseñado para el footer (fondo oscuro). La navbar tiene fondo **blanco** (`.navbar { background: white; }`), por lo que el texto blanco es invisible.

## 2. Propiedades calculadas relevantes

| Propiedad | Valor | Observación |
|---|---|---|
| display | inline-flex | ✓ visible por CSS |
| visibility | visible | ✓ |
| opacity | 1 | ✓ |
| color | rgba(255,255,255,0.7) | ✗ invisible sobre fondo blanco |
| background-color | none | — |
| width/height | auto | ✓ |
| position | static | ✓ |
| z-index | auto | ✓ |

La regla `html:not([data-gds-admin="on"]) .gds-admin-entry { display: none !important; }` NO está ocultando el botón (data-gds-admin="on" confirmado).

## 3. Afectación por página

El mismo problema afecta a las 4 páginas (index, servicios, organigrama, inscripciones), todas con navbar blanca y el mismo estilo inline blanco.

## 4. Cambio mínimo recomendado

Cambiar el color del texto en el estilo inline del botón de `rgba(255,255,255,.7)` a un color oscuro (ej. `var(--azul)` o `var(--muted)`), tanto en `style` como en `onmouseout`.

No es necesario modificar CSS ni JavaScript.

## 5. Archivos afectados

- `public/index.html`
- `public/servicios.html`
- `public/organigrama.html`
- `public/inscripciones.html`

---

**No se modificó ningún archivo. Diagnóstico completado. Esperando autorización.**