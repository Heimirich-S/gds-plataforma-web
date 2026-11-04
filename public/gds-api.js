/* ============================================================
   GDS Web v3 — gds-api.js
   Capa de abstracción entre el frontend y el backend PHP.

   INSTRUCCIONES DE USO:
  1. Sube este archivo al servidor junto con api.php; la configuracion vive fuera del document root
   2. En cada HTML agrega ANTES de los demás scripts:
        <script src="gds-api.js"></script>
   3. Configura las dos constantes de abajo.
   ============================================================ */

'use strict';

/* ── Configura estos dos valores ── */
const GDS_API_URL = 'api.php';   // ruta relativa (mismo directorio) o absoluta

let _gdsAdminHabilitado = false;
let _gdsCsrfToken = '';
function gdsAdminHabilitado() { return _gdsAdminHabilitado === true; }
function gdsCsrfToken() { return _gdsCsrfToken; }

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

function getAdminApiToken() { return ''; }

/* ── Cliente HTTP base ── */
async function gdsGet(action, params = {}) {
  const url = new URL(GDS_API_URL, window.location.href);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { credentials: 'same-origin' });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Error desconocido');
  return json.data;
}

async function gdsPost(action, body = {}, isAdmin = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (isAdmin && _gdsCsrfToken) {
    headers['X-CSRF-Token'] = _gdsCsrfToken;
  }
  // Siempre enviar CSRF cuando esté disponible (logout y otras operaciones)
  if (_gdsCsrfToken && !headers['X-CSRF-Token']) {
    headers['X-CSRF-Token'] = _gdsCsrfToken;
  }
  const res = await fetch(GDS_API_URL + '?action=' + action, {
    method: 'POST',
    headers,
    credentials: 'same-origin',
    body: JSON.stringify({ ...body, action })
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Error desconocido');
  return json.data;
}

/* ================================================================
   API P͚BLICA — lectura de contenido
   ================================================================ */

const GDS = {

  /* ── Noticias ── */
  async getNoticias()        { return gdsGet('noticias'); },
  async getNoticia(id)       { return gdsGet('noticia', { id }); },

  /* ── Convenios ── */
  async getConvenios()       { return gdsGet('convenios'); },

  /* ── Popup ── */
  async getPopupSlides()     { return gdsGet('popup_slides'); },

  /* ── Organigrama ── */
  async getOrganigrama()     { return gdsGet('organigrama'); },

  /* ── Horarios ── */
  async getHorario(curso, nivel, ano = 2026) {
    return gdsGet('horario', { curso, nivel, ano });
  },

  /* ── Servicios ── */
  async getServicios()       { return gdsGet('servicios'); },
  async getServicio(id)      { return gdsGet('servicio', { id }); },

  /* ── ͚tiles Escolares ── */
  async getUtiles(grado_id, ano = 2026) {
    return gdsGet('utiles', { grado_id, ano });
  },
  async getUtilesTodos(ano = 2026) {
    return gdsGet('utiles_todos', { ano });
  },

  /* ── Descuentos ── */
  async getDescuentos()      { return gdsGet('descuentos'); },

  /* ── Periódicos ── */
  async getPeriodicos()      { return gdsGet('periodicos'); },

  /* ── Documentos ── */
  async getDocumentos()      { return gdsGet('documentos'); },

  /* ── Promociones ── */
  async getPromociones()     { return gdsGet('promociones'); },

  /* ── Grados (para formulario de inscripciones) ── */
  async getGrados()          { return gdsGet('grados'); },

  /* ── Config pública ── */
  async getConfig()          { return gdsGet('config'); },

  /* ================================================================
     FORMULARIOS P͚BLICOS
     ================================================================ */

  async enviarInscripcion(datos) {
    return gdsPost('inscripcion', datos, false);
  },

  async enviarColaborador(datos) {
    return gdsPost('colaborador', datos, false);
  },

  /* ================================================================
     API DE ADMIN — requieren token
     ================================================================ */

  admin: {
    /* ── Sesión ── */
    async login(user, pass)  { const r = await gdsPost('admin_login', { user, pass }, false); try { const s = await gdsGet('admin_session'); if (s && s.csrf_token) _gdsCsrfToken = s.csrf_token; } catch(e) {} return r; },
    async logout()          { return gdsPost('admin_logout', {}, true); },
    async session()         { const r = await gdsGet('admin_session'); if (r && r.csrf_token) _gdsCsrfToken = r.csrf_token; return r; },
    async verifyOtp(code)    { const r = await gdsPost('admin_verify_otp', { code }, true); try { const s = await gdsGet('admin_session'); if (s && s.csrf_token) _gdsCsrfToken = s.csrf_token; } catch(e) {} return r; },
    async resendOtp()       { return gdsPost('admin_resend_otp', {}, true); },

    /* ── Noticias ── */
    async getNoticias()         { return gdsGet('noticias'); },
    async guardarNoticia(d)     { return gdsPost('admin_noticias_save', d, true); },
    async eliminarNoticia(id)   { return gdsPost('admin_noticias_delete', { id }, true); },

    /* ── Convenios ── */
    async getConvenios()        { return gdsGet('convenios'); },
    async guardarConvenio(d)    { return gdsPost('admin_convenios_save', d, true); },
    async eliminarConvenio(id)  { return gdsPost('admin_convenios_delete', { id }, true); },

    /* ── Organigrama ── */
    async getOrganigrama()      { return gdsGet('organigrama'); },
    async guardarPersonal(d)    { return gdsPost('admin_organigrama_save', d, true); },
    async eliminarPersonal(id)  { return gdsPost('admin_organigrama_delete', { id }, true); },

    /* ── Popup ── */
    async getPopup()            { return gdsGet('popup_slides'); },
    async guardarSlide(d)       { return gdsPost('admin_popup_save', d, true); },
    async eliminarSlide(id)     { return gdsPost('admin_popup_delete', { id }, true); },

    /* ── Horarios ── */
    async configurarHorario(d)  { return gdsPost('admin_horario_save', d, true); },
    async guardarCelda(d)       { return gdsPost('admin_horario_celda', d, true); },

    /* ── Servicios ── */
    async guardarServicio(d)    { return gdsPost('admin_servicio_save', d, true); },

    /* ── ͚tiles Escolares ── */
    async guardarUtiles(grado_id, items, ano = 2026) {
      return gdsPost('admin_utiles_save', { grado_id, items, ano }, true);
    },

    /* ── Descuentos ── */
    async guardarDescuento(d)   { return gdsPost('admin_descuento_save', d, true); },

    /* ── Periódicos ── */
    async guardarPeriodico(d)   { return gdsPost('admin_periodico_save', d, true); },
    async eliminarPeriodico(id) { return gdsPost('admin_periodico_delete', { id }, true); },

    /* ── Documentos ── */
    async guardarDocumento(d)   { return gdsPost('admin_documento_save', d, true); },
    async eliminarDocumento(id) { return gdsPost('admin_documento_delete', { id }, true); },

    /* ── Promociones Grado 11 ── */
    async guardarPromocion(d)   { return gdsPost('admin_promocion_save', d, true); },
    async eliminarPromocion(id) { return gdsPost('admin_promocion_delete', { id }, true); },

    /* ── Estado de formularios recibidos ── */
    async getInscripciones(estado = '', ano = 0) {
      return gdsGet('admin_inscripciones', { estado, ano });
    },
    async cambiarEstadoInscripcion(id, estado) {
      return gdsPost('admin_inscripcion_estado', { id, estado }, true);
    },
    async getColaboradores(estado = '') {
      return gdsGet('admin_colaboradores', { estado });
    },
    async cambiarEstadoColaborador(id, estado) {
      return gdsPost('admin_colaborador_estado', { id, estado }, true);
    }
  }
};

/* ================================================================
   INICIALIZACI͓N AUTOḾTICA DE CONTENIDO
   Al cargar cada página, reemplaza los renders que antes leían
   de localStorage. Se detecta la página por el body o por IDs.
   ================================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  gdsDetectarModoAdmin();

  /* ── Convenios (cinta infinita) ── */
  const track = document.getElementById('conveniosTrack');
  if (track) {
    try {
      const convenios = await GDS.getConvenios();
      renderConveniosAPI(convenios, track);
    } catch (e) { console.warn('GDS: convenios no disponibles', e); }
  }

  /* ── Noticias en index.html ── */
  const notGrid = document.getElementById('noticiasIndexGrid');
  if (notGrid) {
    try {
      const noticias = await GDS.getNoticias();
      renderNoticiasIndexAPI(noticias, notGrid);
    } catch (e) { console.warn('GDS: noticias no disponibles', e); }
  }

  /* ── Noticias en noticias.html ──
     Esta página (a diferencia de la portada) tiene sus propias
     funciones renderNoticias/renderPeriodicos/renderDocumentos, con
     las clases CSS correctas Y el modo admin (editar/eliminar) ya
     integrado. La función renderNoticiasFullAPI de aquí abajo se
     había quedado desactualizada con clases distintas a las que
     usa el CSS de esta página, por eso se veía todo sin estilo.
     En vez de mantener un HTML duplicado, le pasamos los datos de
     la base de datos a esas mismas funciones de la página. */
  const notFullGrid = document.getElementById('noticiasGrid');
  if (notFullGrid && typeof window.renderNoticias === 'function') {
    try {
      const noticiasDB = await GDS.getNoticias();
      if (noticiasDB && noticiasDB.length) {
        window.getNoticias = () => noticiasDB; // la página ya no depende de localStorage
        window.renderNoticias(typeof filtroActual !== 'undefined' ? filtroActual : 'all');
        gdsBridgeNoticiasCRUD(); // conecta Guardar/Editar/Eliminar con la BD (una sola vez)
      }
    } catch (e) { console.warn('GDS: noticias no disponibles, se muestran datos locales', e); }

    if (typeof window.renderPeriodicos === 'function') {
      try {
        const periodicosDB = await GDS.getPeriodicos();
        if (periodicosDB && periodicosDB.length) {
          window.getPeriodicos = () => periodicosDB;
          window.renderPeriodicos();
        }
      } catch (e) { console.warn('GDS: periódicos no disponibles, se muestran datos locales', e); }
    }

    if (typeof window.renderDocumentos === 'function') {
      try {
        const documentosDB = await GDS.getDocumentos();
        if (documentosDB && documentosDB.length) {
          /* FIX — normaliza nombres de campo: la base de datos entrega
             'descripcion'/'tamano_kb' (snake_case, típico de MySQL/PHP)
             mientras que renderDocumentos() de esta página espera 'desc'.
             Sin este mapeo el diseño se veía bien pero el texto de
             descripción aparecía vacío ("undefined") al usar la BD. */
          window.getDocumentos = () => documentosDB.map(d => ({
            ...d,
            desc: d.desc || d.descripcion || (d.tamano_kb ? Math.round(d.tamano_kb) + ' KB' : '')
          }));
          window.renderDocumentos();
        }
      } catch (e) { console.warn('GDS: documentos no disponibles, se muestran datos locales', e); }
    }
  } else if (notFullGrid) {
    /* Fallback: si por algún motivo esta página no define renderNoticias */
    try {
      const noticias = await GDS.getNoticias();
      renderNoticiasFullAPI(noticias, notFullGrid);
    } catch (e) { console.warn('GDS: noticias no disponibles', e); }
  }

  /* ── Organigrama ── */
  const orgDir = document.getElementById('directivosAdminRow');
  if (orgDir) {
    try {
      const org = await GDS.getOrganigrama();
      renderOrganigramaAPI(org);
      gdsBridgeOrgCRUD(); // conecta Guardar/Editar/Eliminar (los 4 tipos) con la BD
    } catch (e) { console.warn('GDS: organigrama no disponible', e); }
  }

  /* ── ͚tiles Escolares (en inscripciones.html) ──
     Reutiliza el propio renderizador de la página (getUtiles/
     renderUtilesEscolares), igual que con Noticias: le pasamos los
     datos de la base de datos y dejamos que la página dibuje su
     propio diseño (tabs + tarjetas + modal), en vez de mantener un
     HTML duplicado aquí. Esta lista ya NO maneja precios: el precio
     se consulta por WhatsApp desde el modal de cada grado. */
  const utilesWrap = document.querySelector('.utiles-section');
  if (utilesWrap && typeof window.renderUtilesEscolares === 'function') {
    try {
      const utilesDB = await GDS.getUtilesTodos();
      if (utilesDB && utilesDB.length) {
        const NIVEL_A_GRUPO = {
          'Preescolar': { grupo: 'jardin', grupoLabel: 'Jardín (Preescolar)', icono: 'jardin' },
          'Primaria':   { grupo: 'primaria', grupoLabel: 'Primaria', icono: 'primaria' },
          'Secundaria': { grupo: 'secundaria', grupoLabel: 'Secundaria', icono: 'secundaria' },
          'Media':      { grupo: 'bachillerato', grupoLabel: 'Bachillerato (Media)', icono: 'bachillerato' }
        };
        const transformado = utilesDB.map(g => {
          const mapa = NIVEL_A_GRUPO[g.nivel] || { grupo: 'otros', grupoLabel: g.nivel, icono: 'mochila' };
          return {
            grupo: mapa.grupo, grupoLabel: mapa.grupoLabel, icono: mapa.icono,
            slug: g.slug, nombre: g.grado, grado_id: g.grado_id,
            items: (g.items || []).map(it => ({
              item: it.item, cantidad: it.cantidad, observacion: it.observacion
            }))
          };
        });
        // slug -> grado_id, lo necesita gdsBridgeUtilesCRUD() para guardar en la BD
        window._gdsUtilesGradoIds = {};
        transformado.forEach(g => { window._gdsUtilesGradoIds[g.slug] = g.grado_id; });
        window.getUtiles = () => transformado;
        window.renderUtilesEscolares();
        if (typeof gdsBridgeUtilesCRUD === 'function') gdsBridgeUtilesCRUD();
      }
    } catch (e) { console.warn('GDS: útiles no disponibles, se muestran datos locales', e); }
  }

  /* ── Popup Carousel ── */
  const popupEl = document.querySelector('.popup-carousel-overlay');
  if (popupEl && typeof renderPopupCarouselAPI === 'function') {
    try {
      const slides = await GDS.getPopupSlides();
      renderPopupCarouselAPI(slides);
    } catch (e) { console.warn('GDS: popup no disponible', e); }
  }

  /* ── Periódicos ──
     FIX: este bloque genérico existía para páginas que NO tienen su
     propio render de periódicos. El problema era que se ejecutaba
     SIEMPRE, incluso en noticias.html —que sí tiene el suyo, con las
     clases CSS correctas (renderPeriodicos(), más arriba)— y como
     corría después, terminaba pisando ese render bueno con esta
     plantilla genérica (sin badge de año, sin "Descargar →"). Ahora
     se salta si la página ya se encargó de sí misma. */
  const perGrid = document.getElementById('periodicosGrid');
  if (perGrid && typeof window.renderPeriodicos !== 'function') {
    try {
      const periodicos = await GDS.getPeriodicos();
      renderPeriodicosAPI(periodicos, perGrid);
    } catch (e) { console.warn('GDS: periódicos no disponibles', e); }
  }

  /* ── Documentos ── (mismo problema y mismo fix que Periódicos arriba) */
  const docGrid = document.getElementById('documentosGrid');
  if (docGrid && typeof window.renderDocumentos !== 'function') {
    try {
      const documentos = await GDS.getDocumentos();
      renderDocumentosAPI(documentos, docGrid);
    } catch (e) { console.warn('GDS: documentos no disponibles', e); }
  }

  /* ── Promociones (organigrama.html) ── */
  const promoGrid = document.getElementById('promoGrid');
  if (promoGrid) {
    try {
      const promos = await GDS.getPromociones();
      renderPromocionesAPI(promos);
      gdsBridgePromocionesCRUD(); // conecta Guardar/Editar/Eliminar con la BD
    } catch (e) { console.warn('GDS: promociones no disponibles', e); }
  }
});

/* ================================================================
   FUNCIONES DE RENDER — traducen la respuesta de la API al HTML
   existente (mismas clases CSS, misma estructura visual)
   ================================================================ */

function renderConveniosAPI(convenios, track) {
  if (!convenios || !convenios.length) return;
  /* ── FIX ──
     Esta función generaba el <img> suelto, sin el contenedor
     .conv-img-wrap que es lo que en realidad limita el tamaño del
     logo a 40x40px (ver style.css). Por eso, cuando esta función se
     ejecutaba (MySQL activo), las imágenes se veían gigantes: no
     había ninguna regla CSS aplicándose sobre un <img> suelto.
     Ahora genera exactamente la misma estructura que script.js usa
     para el mismo carrusel, para que el mismo CSS aplique igual sin
     importar cuál de los dos scripts terminó dibujando la cinta. */
  const stripTags = (s) => (s || '').replace(/<[^>]*>/g, '');
  const html = convenios.map(c => `
    <div class="convenio-item">
      <a href="${c.url || '#'}" target="_blank" rel="noopener" class="convenio-logo">
        <div class="conv-img-wrap">
          <img src="${c.img}" alt="${stripTags(c.nombre)}" onerror="this.style.display='none'"/>
        </div>
        <span>${c.nombre}</span>
      </a>
    </div>`).join('');
  // Duplicar para el loop infinito
  track.innerHTML = html + html;
}

function renderNoticiasIndexAPI(noticias, grid) {
  if (!noticias || !noticias.length) {
    grid.innerHTML = '<p style="text-align:center;color:var(--muted);padding:30px 0;grid-column:1/-1;">Aún no hay noticias publicadas.</p>';
    return;
  }
  const destacada = noticias.find(n => n.featured);
  const resto     = noticias.filter(n => !destacada || n.id !== destacada.id);
  const seleccion = destacada ? [destacada, ...resto].slice(0, 4) : noticias.slice(0, 4);
  grid.innerHTML = seleccion.map(n => `
    <article class="noticia-card ${n.featured ? 'featured' : ''}" onclick="abrirNoticia('${n.id}')">
      <div class="noticia-img">
        <img src="${n.img}" alt="${n.titulo}" onerror="this.style.display='none'"/>
        <div class="noticia-img-blur"></div>
      </div>
      <div class="noticia-body">
        <span class="noticia-tag">${n.cat}</span>
        <h3>${n.titulo}</h3>
        <p>${n.extracto || ''}</p>
        <a href="#" class="noticia-link" onclick="event.preventDefault();abrirNoticiaAPI('${n.id}')">Leer más →</a>
      </div>
    </article>`).join('');
}

function renderNoticiasFullAPI(noticias, grid) {
  if (!noticias || !noticias.length) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted)">No hay noticias publicadas.</p>';
    return;
  }
  grid.innerHTML = noticias.map(n => `
    <article class="noticia-full-card" onclick="abrirNoticiaAPI('${n.id}')">
      <div class="noticia-img">
        <img src="${n.img}" alt="${n.titulo}" onerror="this.style.display='none'"/>
        <div class="noticia-img-blur"></div>
        <span class="noticia-tag">${n.cat}</span>
      </div>
      <div class="noticia-body">
        <h3>${n.titulo}</h3>
        <p>${n.extracto || ''}</p>
        <div class="noticia-meta">📅 ${n.fecha}</div>
        <a href="#" class="noticia-link" onclick="event.preventDefault();abrirNoticiaAPI('${n.id}')">Leer más →</a>
      </div>
    </article>`).join('');
}

/* Abrir noticia desde la API (reemplaza la función hardcodeada) */
async function abrirNoticiaAPI(id) {
  try {
    const n = await GDS.getNoticia(id);
    const modal = document.getElementById('noticiaModal');
    const content = document.getElementById('modalContent');
    if (!modal || !content) return;
    content.innerHTML = `
      <div class="modal-tag">${n.cat}</div>
      <h2 class="modal-titulo">${n.titulo}</h2>
      <div class="modal-meta">📅 ${n.fecha} · Gimnasio Domingo Savio</div>
      <img src="${n.img}" alt="${n.titulo}" class="modal-img" onerror="this.style.display='none'"/>
      <div class="modal-cuerpo">${n.cuerpo}</div>
      <div class="modal-footer-btns">
        <a href="noticias.html" class="btn-primary">Ver todas las noticias</a>
        <a href="https://wa.me/573157859157?text=Hola, quiero más información sobre: ${encodeURIComponent(n.titulo)}"
           target="_blank" class="btn-whatsapp">Compartir</a>
      </div>`;
    modal.classList.add('open');
    document.body.classList.add('modal-open');
  } catch (e) { console.error('GDS: error al abrir noticia', e); }
}

function renderOrganigramaAPI(org) {
  const renders = {
    directivos:          { el: document.getElementById('directivosAdminRow'),    cls: 'org-card-top' },
    docentes_directivos: { el: document.getElementById('docentesDirectivosRow'), cls: '' },
    administrativos:     { el: document.getElementById('administrativosRow'),     cls: 'org-card-adm' },
    docentes:            { el: document.getElementById('cuerpoDocenteGrid'),      cls: '' }
  };
  // Directivos, docentes_directivos, administrativos
  ['directivos','docentes_directivos','administrativos'].forEach(tipo => {
    const { el, cls } = renders[tipo];
    if (!el || !org[tipo]) return;
    el.innerHTML = org[tipo].map(p => `
      <div class="org-card ${cls}">
        <div class="org-avatar">
          <img src="${p.foto}" alt="${p.nombre}" onerror="gdsAvatar&&gdsAvatar(this,80)"/>
        </div>
        <div class="org-info">
          <h4>${p.nombre}</h4>
          <span class="org-role ${p.rol || 'otro'}">${p.cargo}</span>
        </div>
      </div>`).join('');
    /* Mismo revelado suave que en localStorage (definido en organigrama.html) */
    if (typeof gdsRevealInit === 'function') gdsRevealInit(el, '.org-card', tipo === 'administrativos' ? 80 : 100);
  });
  // Cuerpo docente
  const { el } = renders.docentes;
  if (el && org.docentes) {
    el.innerHTML = org.docentes.map(p => `
      <div class="org-docente-card">
        <div class="org-avatar-sm">
          <img src="${p.foto}" alt="${p.nombre}" onerror="gdsAvatar&&gdsAvatar(this,40)"/>
        </div>
        <div class="org-docente-info">
          <h5>${p.nombre}</h5>
          <span class="org-titular">${p.cargo}</span>
          <span class="org-nivel">${p.nivel_docente || ''}</span>
        </div>
      </div>`).join('');
    if (typeof gdsRevealInit === 'function') gdsRevealInit(el, '.org-docente-card', 45);
  }
}

/* renderUtilesAPI (vieja versión ligada a la tabla de Costos) fue
   eliminada: el bloque de Costos ya no existe en inscripciones.html,
   se reemplazó por el acordeón de ͚tiles Escolares. La integración
   con la base de datos ahora vive arriba, en el bloque
   "͚tiles Escolares (en inscripciones.html)". */

function renderPeriodicosAPI(periodicos, grid) {
  if (!periodicos || !periodicos.length) { grid.innerHTML = ''; return; }
  grid.innerHTML = periodicos.map(p => `
    <a href="${p.url}" target="_blank" class="periodico-card">
      ${p.img ? `<img src="${p.img}" alt="${p.nombre}" onerror="this.style.display='none'"/>` : ''}
      <div class="periodico-info"><h4>${p.nombre}</h4><span>${p.anio}</span></div>
    </a>`).join('');
}

function renderDocumentosAPI(docs, grid) {
  if (!docs || !docs.length) { grid.innerHTML = ''; return; }
  grid.innerHTML = docs.map(d => `
    <a href="${d.url}" target="_blank" class="documento-card">
      <span class="doc-icon">📄</span>
      <div class="doc-info">
        <h4>${d.nombre}</h4>
        <span>${d.descripcion || ''}${d.tamano_kb ? ' · ' + Math.round(d.tamano_kb) + ' KB' : ''}</span>
      </div>
      <span class="doc-badge">${d.tipo}</span>
    </a>`).join('');
}

function renderPromocionesAPI(promos) {
  const grid  = document.getElementById('promoGrid');
  const tabs  = document.getElementById('promoTabs');
  if (!grid) return;
  if (!promos || !promos.length) {
    grid.innerHTML = '<div class="promo-empty">Aún no se han agregado fotos de promociones.</div>';
    if (tabs) tabs.innerHTML = '';
    return;
  }
  const anios = [...new Set(promos.map(p => p.anio))].sort((a,b) => b-a);
  let anioActivo = anios[0];
  function renderTabs() {
    if (!tabs) return;
    tabs.innerHTML = anios.map(a => `
      <button class="promo-tab-btn ${a == anioActivo ? 'active' : ''}"
              onclick="(function(){window._promoAnioActivo='${a}';renderPromocionesAPI(window._promoData||[]);})()">
        ${a}
      </button>`).join('');
  }
  function renderGrid() {
    const del = promos.filter(p => p.anio == anioActivo);
    grid.innerHTML = del.map(p => `
      <div class="promo-card ${typeof gdsFrameVariant === 'function' ? gdsFrameVariant(p.id || p.anio) : ''}">
        <img class="promo-card-img" src="${p.foto}" alt="Promoción ${p.anio}" onerror="this.style.display='none'"/>
        <div class="promo-card-info">
          <h4>Promoción ${p.anio}</h4>
          ${p.nombre_grupo ? `<span>${p.nombre_grupo}</span>` : ''}
        </div>
      </div>`).join('');
    /* Mismo marco de madera / revelado / inclinación 3D que en localStorage */
    if (typeof gdsRevealInit === 'function') gdsRevealInit(grid, '.promo-card', 110, 'gds-reveal-frame');
    if (typeof gdsAttachTiltAll === 'function') gdsAttachTiltAll(grid, '.promo-card');
  }
  window._promoData = promos;
  if (window._promoAnioActivo) anioActivo = window._promoAnioActivo;
  renderTabs();
  renderGrid();
}

/* ================================================================
   OVERRIDE DE FUNCIONES DE ADMIN QUE ANTES USABAN localStorage
   Cuando el admin guarda algo, ahora llama a la API en lugar de
   localStorage.setItem(). El patrón: guardar → refrescar render.
   ================================================================ */

/* ================================================================
   PUENTE CRUD ADMIN ↔ BASE DE DATOS
   Antes, el panel admin de organigrama.html y noticias.html SOLO
   escribía en localStorage (guardarNoticia, eliminarDirectivo, etc.
   llamaban a saveNoticias()/saveDirectivos(), nunca a la API). Como
   estas páginas muestran datos que vienen de la base de datos, el
   cambio parecía no guardarse (o desaparecía al recargar).
   Estas funciones REEMPLAZAN a las del HTML por versiones que llaman
   a GDS.admin.* y refrescan con lo que quedó realmente guardado en
   la BD. Se activan solo una vez, y solo si la API respondió arriba
   (en modo 100% localStorage/offline, el HTML sigue funcionando tal
   cual estaba, sin estos overrides).

   ⚠️ Los nombres de campo que se envían (tipo, nombre, cargo, rol,
   nivel_docente, nombre_grupo…) se dedujeron de lo que YA devuelven
   GDS.getOrganigrama()/getPromociones() (ver renderOrganigramaAPI /
   renderPromocionesAPI más arriba). Si al guardar algo la consola
   muestra un error o el dato no aparece, revisa en api.php que
   admin_organigrama_save / admin_promocion_save esperen esos mismos
   nombres — es la única parte que no pude verificar sin ver el PHP.
   ================================================================ */

/* ── Noticias, Periódicos y Documentos (noticias.html) ── */
function gdsBridgeNoticiasCRUD() {
  if (window._gdsNoticiasCRUDBridged) return;
  window._gdsNoticiasCRUDBridged = true;

  async function refrescarNoticias() {
    const data = await GDS.getNoticias();
    window.getNoticias = () => data;
    if (typeof window.renderNoticias === 'function') {
      window.renderNoticias(typeof filtroActual !== 'undefined' ? filtroActual : 'all');
    }
  }
  async function refrescarPeriodicos() {
    const data = await GDS.getPeriodicos();
    window.getPeriodicos = () => data;
    if (typeof window.renderPeriodicos === 'function') window.renderPeriodicos();
  }
  async function refrescarDocumentos() {
    const data = await GDS.getDocumentos();
    window.getDocumentos = () => data.map(d => ({
      ...d, desc: d.desc || d.descripcion || (d.tamano_kb ? Math.round(d.tamano_kb) + ' KB' : '')
    }));
    if (typeof window.renderDocumentos === 'function') window.renderDocumentos();
  }

  if (typeof window.guardarNoticia === 'function') {
    window.guardarNoticia = async function () {
      const titulo = document.getElementById('nTitulo').value.trim();
      if (!titulo) { alert('El título es obligatorio'); return; }
      const editId = document.getElementById('nEditId').value;
      const noticia = {
        id: editId || undefined,
        titulo, cat: document.getElementById('nCat').value,
        extracto: document.getElementById('nExtracto').value.trim(),
        cuerpo: '<p>' + document.getElementById('nCuerpo').value.trim().split('\n\n').join('</p><p>') + '</p>',
        img: document.getElementById('nImg').value.trim() || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=900&q=80',
        fecha: document.getElementById('nFecha').value.trim() || 'Abril 2026',
        featured: document.getElementById('nFeatured').value === '1'
      };
      try {
        await GDS.admin.guardarNoticia(noticia);
        document.getElementById('editorNoticiaOverlay').classList.remove('open');
        await refrescarNoticias();
      } catch (e) { alert('❌ No se pudo guardar en la base de datos: ' + e.message); }
    };
  }
  if (typeof window.eliminarNoticia === 'function') {
    window.eliminarNoticia = async function (id) {
      if (!confirm('¿Eliminar esta noticia?')) return;
      try {
        await GDS.admin.eliminarNoticia(id);
        await refrescarNoticias();
      } catch (e) { alert('❌ No se pudo eliminar: ' + e.message); }
    };
  }

  if (typeof window.guardarPeriodico === 'function') {
    window.guardarPeriodico = async function () {
      const nombre = document.getElementById('pNombre').value.trim();
      if (!nombre) { alert('El nombre es obligatorio'); return; }
      const editId = document.getElementById('pEditId').value;
      const per = {
        id: editId || undefined,
        nombre, anio: document.getElementById('pAnio').value.trim(),
        img: document.getElementById('pImg').value.trim(),
        url: document.getElementById('pUrl').value.trim() || '#'
      };
      try {
        await GDS.admin.guardarPeriodico(per);
        document.getElementById('editorPeriodicoOverlay').classList.remove('open');
        await refrescarPeriodicos();
      } catch (e) { alert('❌ No se pudo guardar en la base de datos: ' + e.message); }
    };
  }
  if (typeof window.eliminarPeriodico === 'function') {
    window.eliminarPeriodico = async function (id) {
      if (!confirm('¿Eliminar este periódico?')) return;
      try {
        await GDS.admin.eliminarPeriodico(id);
        await refrescarPeriodicos();
      } catch (e) { alert('❌ No se pudo eliminar: ' + e.message); }
    };
  }

  if (typeof window.guardarDocumento === 'function') {
    window.guardarDocumento = async function () {
      const nombre = document.getElementById('docNombre').value.trim();
      if (!nombre) { alert('El nombre es obligatorio'); return; }
      const editId = document.getElementById('docEditId').value;
      const doc = {
        id: editId || undefined,
        nombre, desc: document.getElementById('docDesc').value.trim(),
        tipo: document.getElementById('docTipo').value,
        url: document.getElementById('docUrl').value.trim() || '#'
      };
      try {
        await GDS.admin.guardarDocumento(doc);
        document.getElementById('editorDocumentoOverlay').classList.remove('open');
        await refrescarDocumentos();
      } catch (e) { alert('❌ No se pudo guardar en la base de datos: ' + e.message); }
    };
  }
  if (typeof window.eliminarDocumentoItem === 'function') {
    window.eliminarDocumentoItem = async function (id) {
      if (!confirm('¿Eliminar este documento?')) return;
      try {
        await GDS.admin.eliminarDocumento(id);
        await refrescarDocumentos();
      } catch (e) { alert('❌ No se pudo eliminar: ' + e.message); }
    };
  }
}

/* ── Directivos, Docentes Directivos, Administrativos y Docentes (organigrama.html) ── */
function gdsBridgeOrgCRUD() {
  if (window._gdsOrgCRUDBridged) return;
  window._gdsOrgCRUDBridged = true;

  async function refrescarOrganigrama() {
    const org = await GDS.getOrganigrama();
    if (org.docentes) {
      org.docentes = org.docentes.map(d => ({ ...d, nivel: d.nivel || d.nivel_docente || '', nivel_docente: d.nivel_docente || d.nivel || '' }));
    }
    window._gdsOrgData = org;
    if (org.directivos)          window.getDirectivos         = () => window._gdsOrgData.directivos;
    if (org.docentes_directivos) window.getDocentesDirectivos = () => window._gdsOrgData.docentes_directivos;
    if (org.administrativos)     window.getAdministrativos    = () => window._gdsOrgData.administrativos;
    if (org.docentes)            window.getDocentes           = () => window._gdsOrgData.docentes;
    renderOrganigramaAPI(org);
  }

  if (typeof window.guardarDirectivo === 'function') {
    window.guardarDirectivo = async function () {
      const nombre = document.getElementById('dirNombre').value.trim();
      const cargo  = document.getElementById('dirCargo').value.trim();
      const rol    = document.getElementById('dirRol').value;
      const foto   = document.getElementById('dirFoto').value.trim();
      const editId = document.getElementById('dirEditId').value;
      if (!nombre || !cargo) { gdsAlertOrg('⚠️ Completa al menos el nombre y el cargo.'); return; }
      try {
        await GDS.admin.guardarPersonal({ tipo: 'directivos', id: editId || undefined, nombre, cargo, rol, foto });
        document.getElementById('formDirectivo').style.display = 'none';
        await refrescarOrganigrama();
        if (typeof renderDirectivosList === 'function') renderDirectivosList();
      } catch (e) { gdsAlertOrg('❌ No se pudo guardar en la base de datos: ' + e.message); }
    };
  }
  if (typeof window.eliminarDirectivo === 'function') {
    window.eliminarDirectivo = async function (id) {
      const ok = await gdsConfirmOrg('¿Eliminar este directivo del organigrama?');
      if (!ok) return;
      try {
        await GDS.admin.eliminarPersonal(id);
        await refrescarOrganigrama();
        if (typeof renderDirectivosList === 'function') renderDirectivosList();
      } catch (e) { gdsAlertOrg('❌ No se pudo eliminar: ' + e.message); }
    };
  }

  if (typeof window.guardarDocenteDirectivo === 'function') {
    window.guardarDocenteDirectivo = async function () {
      const nombre = document.getElementById('ddNombre').value.trim();
      const cargo  = document.getElementById('ddCargo').value.trim();
      const foto   = document.getElementById('ddFoto').value.trim();
      const editId = document.getElementById('ddEditId').value;
      if (!nombre || !cargo) { gdsAlertOrg('⚠️ Completa al menos el nombre y el cargo.'); return; }
      try {
        await GDS.admin.guardarPersonal({ tipo: 'docentes_directivos', id: editId || undefined, nombre, cargo, foto });
        document.getElementById('formDocenteDirectivo').style.display = 'none';
        await refrescarOrganigrama();
        if (typeof renderDocentesDirectivosList === 'function') renderDocentesDirectivosList();
      } catch (e) { gdsAlertOrg('❌ No se pudo guardar en la base de datos: ' + e.message); }
    };
  }
  if (typeof window.eliminarDocenteDirectivo === 'function') {
    window.eliminarDocenteDirectivo = async function (id) {
      const ok = await gdsConfirmOrg('¿Eliminar este docente directivo del organigrama?');
      if (!ok) return;
      try {
        await GDS.admin.eliminarPersonal(id);
        await refrescarOrganigrama();
        if (typeof renderDocentesDirectivosList === 'function') renderDocentesDirectivosList();
      } catch (e) { gdsAlertOrg('❌ No se pudo eliminar: ' + e.message); }
    };
  }

  if (typeof window.guardarAdministrativo === 'function') {
    window.guardarAdministrativo = async function () {
      const nombre = document.getElementById('admNombre').value.trim();
      const cargo  = document.getElementById('admCargo').value.trim();
      const foto   = document.getElementById('admFoto').value.trim();
      const editId = document.getElementById('admEditId').value;
      if (!nombre || !cargo) { gdsAlertOrg('⚠️ Completa al menos el nombre y el cargo.'); return; }
      try {
        await GDS.admin.guardarPersonal({ tipo: 'administrativos', id: editId || undefined, nombre, cargo, foto });
        document.getElementById('formAdministrativo').style.display = 'none';
        await refrescarOrganigrama();
        if (typeof renderAdministrativosList === 'function') renderAdministrativosList();
      } catch (e) { gdsAlertOrg('❌ No se pudo guardar en la base de datos: ' + e.message); }
    };
  }
  if (typeof window.eliminarAdministrativo === 'function') {
    window.eliminarAdministrativo = async function (id) {
      const ok = await gdsConfirmOrg('¿Eliminar esta persona del personal administrativo?');
      if (!ok) return;
      try {
        await GDS.admin.eliminarPersonal(id);
        await refrescarOrganigrama();
        if (typeof renderAdministrativosList === 'function') renderAdministrativosList();
      } catch (e) { gdsAlertOrg('❌ No se pudo eliminar: ' + e.message); }
    };
  }

  if (typeof window.guardarDocente === 'function') {
    window.guardarDocente = async function () {
      const nombre = document.getElementById('dNombre').value.trim();
      const cargo  = document.getElementById('dCargo').value.trim();
      const nivel  = document.getElementById('dNivel').value.trim();
      const foto   = document.getElementById('dFoto').value.trim();
      const editId = document.getElementById('dEditId').value;
      if (!nombre || !cargo) { gdsAlertOrg('⚠️ Completa al menos el nombre y el cargo.'); return; }
      try {
        await GDS.admin.guardarPersonal({ tipo: 'docentes', id: editId || undefined, nombre, cargo, nivel, nivel_docente: nivel, foto });
        document.getElementById('formDocente').style.display = 'none';
        await refrescarOrganigrama();
        if (typeof renderDocentesList === 'function') renderDocentesList();
      } catch (e) { gdsAlertOrg('❌ No se pudo guardar en la base de datos: ' + e.message); }
    };
  }
  if (typeof window.eliminarDocente === 'function') {
    window.eliminarDocente = async function (id) {
      const ok = await gdsConfirmOrg('¿Eliminar este docente del organigrama?');
      if (!ok) return;
      try {
        await GDS.admin.eliminarPersonal(id);
        await refrescarOrganigrama();
        if (typeof renderDocentesList === 'function') renderDocentesList();
      } catch (e) { gdsAlertOrg('❌ No se pudo eliminar: ' + e.message); }
    };
  }
}

/* ── Promociones de Grado 11° (organigrama.html) ── */
function gdsBridgePromocionesCRUD() {
  if (window._gdsPromoCRUDBridged) return;
  window._gdsPromoCRUDBridged = true;

  async function refrescarPromociones() {
    const raw = await GDS.getPromociones();
    const promos = raw.map(p => ({
      ...p,
      nombreGrupo: p.nombreGrupo || p.nombre_grupo || '',
      nombre_grupo: p.nombre_grupo || p.nombreGrupo || ''
    }));
    window._promoData = promos;
    window.getPromociones = () => promos;
    renderPromocionesAPI(promos);
  }

  if (typeof window.guardarPromocion === 'function') {
    window.guardarPromocion = async function () {
      const anio = document.getElementById('promAnio').value.trim();
      const nombreGrupo = document.getElementById('promNombreGrupo').value.trim();
      const foto = document.getElementById('promFoto').value.trim();
      const editId = document.getElementById('promEditId').value;
      if (!anio || !foto) { gdsAlertOrg('⚠️ Completa al menos el año y la foto.'); return; }
      try {
        await GDS.admin.guardarPromocion({ id: editId || undefined, anio, nombre_grupo: nombreGrupo, nombreGrupo, foto });
        document.getElementById('formPromocion').style.display = 'none';
        await refrescarPromociones();
        if (typeof renderPromocionesList === 'function') renderPromocionesList();
      } catch (e) { gdsAlertOrg('❌ No se pudo guardar en la base de datos: ' + e.message); }
    };
  }
  if (typeof window.eliminarPromocion === 'function') {
    window.eliminarPromocion = async function (id) {
      const ok = await gdsConfirmOrg('¿Eliminar esta foto de promoción?');
      if (!ok) return;
      try {
        await GDS.admin.eliminarPromocion(id);
        await refrescarPromociones();
        if (typeof renderPromocionesList === 'function') renderPromocionesList();
      } catch (e) { gdsAlertOrg('❌ No se pudo eliminar: ' + e.message); }
    };
  }
}

/* ── ͚tiles Escolares (inscripciones.html) ──
   El editor admin trabaja "por grado": elige un grado y agrega/edita/
   elimina ítems de su lista. admin_utiles_save reemplaza TODA la
   lista de ese grado de una sola vez (borra e inserta), así que en
   vez de una llamada por ítem, cada guardar/eliminar envía el arreglo
   completo de útiles del grado seleccionado.
   Necesita el grado_id numérico de la BD (no el slug 'p1','jd'...),
   por eso el bloque de arriba guarda window._gdsUtilesGradoIds. */
function gdsBridgeUtilesCRUD() {
  if (window._gdsUtilesCRUDBridged) return;
  window._gdsUtilesCRUDBridged = true;

  async function refrescarUtiles() {
    const utilesDB = await GDS.getUtilesTodos();
    const NIVEL_A_GRUPO = {
      'Preescolar': { grupo: 'jardin', grupoLabel: 'Jardín (Preescolar)', icono: 'jardin' },
      'Primaria':   { grupo: 'primaria', grupoLabel: 'Primaria', icono: 'primaria' },
      'Secundaria': { grupo: 'secundaria', grupoLabel: 'Secundaria', icono: 'secundaria' },
      'Media':      { grupo: 'bachillerato', grupoLabel: 'Bachillerato (Media)', icono: 'bachillerato' }
    };
    const transformado = utilesDB.map(g => {
      const mapa = NIVEL_A_GRUPO[g.nivel] || { grupo: 'otros', grupoLabel: g.nivel, icono: 'mochila' };
      return {
        grupo: mapa.grupo, grupoLabel: mapa.grupoLabel, icono: mapa.icono,
        slug: g.slug, nombre: g.grado, grado_id: g.grado_id,
        items: (g.items || []).map(it => ({ item: it.item, cantidad: it.cantidad, observacion: it.observacion }))
      };
    });
    window._gdsUtilesGradoIds = {};
    transformado.forEach(g => { window._gdsUtilesGradoIds[g.slug] = g.grado_id; });
    window.getUtiles = () => transformado;
    window.renderUtilesEscolares();
    if (typeof window.renderUtilesInscList === 'function' && document.getElementById('utGradoSelect')) {
      window.renderUtilesInscList();
    }
  }

  async function guardarListaGrado(slug) {
    const grado_id = (window._gdsUtilesGradoIds || {})[slug];
    if (!grado_id) { alert('❌ Este grado no está vinculado a la base de datos (falta grado_id). Revisa la tabla grados.'); return false; }
    const grado = window.getUtiles().find(g => g.slug === slug);
    try {
      await GDS.admin.guardarUtiles(grado_id, grado ? grado.items : [], new Date().getFullYear());
      await refrescarUtiles();
      return true;
    } catch (e) { alert('❌ No se pudo guardar en la base de datos: ' + e.message); return false; }
  }

  if (typeof window.guardarUtilInsc === 'function') {
    window.guardarUtilInsc = async function () {
      const item = document.getElementById('uiItem').value.trim();
      const cantidad = document.getElementById('uiCantidad').value.trim();
      const editIdx = document.getElementById('uiEditIdx').value;
      if (!item || !cantidad) { alert('El nombre del útil y la cantidad son obligatorios'); return; }
      const slug = document.getElementById('utGradoSelect').value;
      const grados = window.getUtiles();
      const grado = grados.find(g => g.slug === slug);
      if (!grado) return;
      if (editIdx !== '') { grado.items[Number(editIdx)] = { item, cantidad }; }
      else { grado.items.push({ item, cantidad }); }
      const ok = await guardarListaGrado(slug);
      if (ok) {
        document.getElementById('formUtilInsc').style.display = 'none';
        if (typeof showToastInsc === 'function') showToastInsc('͚til guardado');
      }
    };
  }

  if (typeof window.eliminarUtilInsc === 'function') {
    window.eliminarUtilInsc = async function (idx) {
      if (!confirm('¿Eliminar este útil de la lista?')) return;
      const slug = document.getElementById('utGradoSelect').value;
      const grados = window.getUtiles();
      const grado = grados.find(g => g.slug === slug);
      if (!grado) return;
      grado.items.splice(idx, 1);
      const ok = await guardarListaGrado(slug);
      if (ok && typeof showToastInsc === 'function') showToastInsc('͚til eliminado');
    };
  }
}

/* Sobreescribir guardarConvenio (index.html) */
if (typeof window !== 'undefined') {
  window._gdsApiReady = true;
}
