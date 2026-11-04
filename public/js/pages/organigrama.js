'use strict';

const _gdsRevealIO = ('IntersectionObserver' in window) ? new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      _gdsRevealIO.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }) : null;

function gdsRevealInit(container, selector, staggerMs, variant) {
  if (!container) return;
  const cls = variant || 'gds-reveal';
  const items = container.querySelectorAll(selector);
  items.forEach((el, i) => {
    el.classList.add(cls);
    el.style.transitionDelay = (i * (staggerMs || 80)) + 'ms';
    if (_gdsRevealIO) {
      _gdsRevealIO.observe(el);
      setTimeout(() => { if (!el.classList.contains('is-visible')) el.classList.add('is-visible'); }, 900);
    } else {
      el.classList.add('is-visible');
    }
  });
}

function gdsFrameVariant(id) {
  const s = String(id || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return 'frame-v' + ((h % 4) + 1);
}

function gdsAttachTilt(card) {
  if (!card || card._gdsTiltOn) return;
  card._gdsTiltOn = true;
  if (window.matchMedia && (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('(hover: none)').matches)) return;
  let raf = null;
  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      card.style.transition = 'transform .12s ease-out';
      card.style.transform = `perspective(900px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg) translateY(-4px) scale(1.015)`;
    });
  });
  card.addEventListener('mouseleave', () => {
    if (raf) cancelAnimationFrame(raf);
    card.style.transition = 'transform .5s cubic-bezier(.16,.8,.24,1)';
    card.style.transform = '';
  });
}
function gdsAttachTiltAll(container, selector) {
  if (!container) return;
  container.querySelectorAll(selector).forEach(gdsAttachTilt);
}

const DIRECTIVOS_DEFAULT = [
  {id:'dir1', nombre:'JOSE RICARDO ABRAJIM CORT͉S', cargo:'Rector', rol:'rector', foto:'img/personal/jose-ricardo-abrajim-cortes.webp'},
  {id:'dir2', nombre:'SYLVIA ABRAJIM CORT͉S', cargo:'Directora Académica', rol:'academica', foto:'img/personal/sylvia-abrajim-cortes.webp'},
  {id:'dir3', nombre:'PATRICIA P͉REZ SANTOS', cargo:'Directora Administrativa', rol:'administrativa', foto:'img/personal/patricia-perez-santos.webp'}
];
const DOCENTES_DIRECTIVOS_DEFAULT = [
  {id:'dd1', nombre:'JOS͉ RA͚L GUTI͉RREZ VALDERRAMA', cargo:'Coord. Convivencia Social', rol:'convivencia', foto:'img/personal/jose-raul-gutierrez-valderrama.webp'},
  {id:'dd2', nombre:'MARIO ENRIQUE ĆRDENAS CABALLERO', cargo:'Coordinador Académico', rol:'academico', foto:'img/personal/mario-enrique-cardenas-caballero.webp'},
  {id:'dd3', nombre:'MARYORI DAYANA URIBE', cargo:'Psicóloga Institucional', rol:'psicologa', foto:'img/personal/maryori-dayana-uribe.webp'}
];
const ADMINISTRATIVOS_DEFAULT = [
  {id:'adm1', nombre:'FRANCYS JULIET ĆRDENAS ĆRDENAS', cargo:'Secretaria General', foto:'img/personal/francys-juliet-cardenas-cardenas.webp'},
  {id:'adm2', nombre:'MARCO FIDEL MORENO SARABIA', cargo:'Tesorero', foto:'img/personal/marco-fidel-moreno-sarabia.webp'},
  {id:'adm3', nombre:'KARINA IRENE BECERRA PARADA', cargo:'Asistente Administrativa', foto:'img/personal/karina-irene-becerra-parada.webp'},
  {id:'adm4', nombre:'IBETH KARINA ARCINIEGAS ALFONSO', cargo:'Secretaria Recepcionista', foto:'img/personal/ibeth-karina-arciniegas-alfonso.webp'},
  {id:'adm5', nombre:'SERGIO GALVIS CARRASCAL', cargo:'Secretario Académico', foto:'img/personal/sergio-galvis-carrascal.webp'},
  {id:'adm6', nombre:'NORALBA GUILLIN GUILLIN', cargo:'Bibliotecaria', foto:'img/personal/noralba-guillin-guillin.webp'},
  {id:'adm7', nombre:'MIRYAM XILENA GUERRERO FERŃNDEZ', cargo:'Enfermera', foto:'img/personal/miryam-xilena-guerrero-fernandez.webp'}
];
const DOCENTES_DEFAULT = [
  {id:'d1', nombre:'LEYDI STEPHANY SUAREZ DELGADO', cargo:'Titular Jardín', nivel:'Preescolar', foto:'img/personal/leydi-stephany-suarez-delgado.webp'},
  {id:'d2', nombre:'ANA MARIA SARMIENTO CARDENAS', cargo:'Titular Transición', nivel:'Preescolar', foto:'img/personal/ana-maria-sarmiento-cardenas.webp'},
  {id:'d3', nombre:'INGRID VALENTINA VALENCIA PARADA', cargo:'Titular 1°A', nivel:'Básica Primaria', foto:'img/personal/ingrid-valentina-valencia-parada.webp'},
  {id:'d4', nombre:'CAMILA ANDREA BAUTISTA PARADA', cargo:'Titular 2°A', nivel:'Básica Primaria', foto:'img/personal/camila-andrea-bautista-parada.webp'},
  {id:'d5', nombre:'KAROLAINE ZULAY GAITAN MERCHAN', cargo:'Titular 3°A', nivel:'Básica Primaria', foto:'img/personal/karolaine-zulay-gaitan-merchan.webp'},
  {id:'d6', nombre:'MARIA NELLA SERRANO GONZALEZ', cargo:'Titular 4°A', nivel:'Básica Primaria', foto:'img/personal/maria-nella-serrano-gonzalez.webp'},
  {id:'d7', nombre:'KAREN VILLAMIZAR MANTILLA', cargo:'Titular 5°A', nivel:'Básica Primaria', foto:'img/personal/karen-michell-villamizar-mantilla.webp'},
  {id:'d8', nombre:'LESLY PAOLA ROZO CASTELLANOS', cargo:'Titular 6°A', nivel:'Básica Secundaria', foto:'img/personal/lesly-paola-rozo-castellanos.webp'},
  {id:'d9', nombre:'KEYLA ANDREA LIZARAZO ROLON', cargo:'Titular 7°A', nivel:'Básica Secundaria', foto:'img/personal/keyla-andrea-lizarazo-rolon.webp'},
  {id:'d10', nombre:'CLAUDIA PATRICIA HERNANDEZ GAMBOA', cargo:'Titular 7°B', nivel:'Básica Secundaria', foto:'img/personal/claudia-patricia-hernandez-gamboa.webp'},
  {id:'d11', nombre:'JOHANA STEPHANIE FLOREZ SIERRA', cargo:'Titular 8°A', nivel:'Básica Secundaria', foto:'img/personal/johana-stephanie-florez-sierra.webp'},
  {id:'d12', nombre:'YURI TATIANA RODRIGUEZ HURTADO', cargo:'Titular 8°B', nivel:'Básica Secundaria', foto:'img/personal/yuri-tatiana-rodriguez-hurtado.webp'},
  {id:'d13', nombre:'MAIRA RODRIGUEZ TORRADO', cargo:'Titular 9°A', nivel:'Básica Secundaria', foto:'img/personal/maira-fernanda-rodriguez-torrado.webp'},
  {id:'d14', nombre:'NATALY RICARDO QUI͑ONES', cargo:'Titular 9°B', nivel:'Básica Secundaria', foto:'img/personal/nataly-ricardo-quinones.webp'},
  {id:'d15', nombre:'LAURA VANESSA SANTOS LOPEZ', cargo:'Titular 10°A', nivel:'Media Académica', foto:'img/personal/laura-vanessa-santos-lopez.webp'},
  {id:'d16', nombre:'ISBELIA CAROLINA MORALES JOYA', cargo:'Titular 10°B', nivel:'Media Académica', foto:'img/personal/isbelia-carolina-morales-joya.webp'},
  {id:'d17', nombre:'ERIKA YURLEY ALCINA URE͑A', cargo:'Titular 11°A', nivel:'Media Académica', foto:'img/personal/erika-yurley-alcina-urena.webp'},
  {id:'d18', nombre:'DAHIANA ALEXANDRA CESPEDES MARTINEZ', cargo:'Titular 11°B', nivel:'Media Académica', foto:'img/personal/dahiana-alexandra-cespedes-martinez.webp'},
  {id:'d19', nombre:'LILIAN CAROLINA ACEVEDO SANCHEZ', cargo:'́rea: Inglés', nivel:'Secundaria', foto:'img/personal/lilian-carolina-acevedo-sanchez.webp'},
  {id:'d20', nombre:'EDWIN MAURICIO BAYONA OLIVEROS', cargo:'́rea: Informática', nivel:'Secundaria', foto:'img/personal/edwin-mauricio-bayona-oliveros.webp'},
  {id:'d21', nombre:'BRANDON SNEYDER GONZALEZ FONSECA', cargo:'́rea: Sociales', nivel:'Secundaria', foto:'img/personal/brandon-sneyder-gonzalez-fonseca.webp'},
  {id:'d22', nombre:'ANDERSON ADRIAN DELGADO TORRES', cargo:'́rea: Dibujo Artístico', nivel:'Secundaria', foto:'img/personal/anderson-adrian-delgado-torres.webp'},
  {id:'d23', nombre:'SINDY PAOLA FERNANDEZ ARIAS', cargo:'́rea: Música y Dibujo', nivel:'Secundaria', foto:'img/personal/sindy-paola-fernandez-arias.webp'},
  {id:'d24', nombre:'SERGIO ORTIZ AGUILAR', cargo:'́rea: Baile y Ed. Física', nivel:'Secundaria', foto:'img/personal/sergio-ortiz-aguilar.webp'},
  {id:'d25', nombre:'NELSON RENE PATI͑O DELGADO', cargo:'́rea: Matemáticas', nivel:'Secundaria', foto:'img/personal/nelson-rene-patino-delgado.webp'},
  {id:'d26', nombre:'BRAYAN SAMIR PAVAS AMADO', cargo:'́rea: Inglés', nivel:'Secundaria', foto:'img/personal/brayan-samir-pavas-amado.webp'},
  {id:'d27', nombre:'ANDRES JESUS CAMARGO GALVIS', cargo:'́rea: Matemáticas', nivel:'Secundaria', foto:'img/personal/andres-jesus-camargo-galvis.webp'}
];

function getDirectivos() {
  try {
    var stored = localStorage.getItem('gds_directivos');
    if (!stored) return DIRECTIVOS_DEFAULT.slice();
    var parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) return DIRECTIVOS_DEFAULT.slice();
    return parsed;
  } catch(e) { return DIRECTIVOS_DEFAULT.slice(); }
}
function saveDirectivos(d) { try { localStorage.setItem('gds_directivos', JSON.stringify(d)); } catch(e) {} }
function getDocentesDirectivos() {
  try {
    var stored = localStorage.getItem('gds_docentes_directivos');
    if (!stored) return DOCENTES_DIRECTIVOS_DEFAULT.slice();
    var parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) return DOCENTES_DIRECTIVOS_DEFAULT.slice();
    return parsed;
  } catch(e) { return DOCENTES_DIRECTIVOS_DEFAULT.slice(); }
}
function saveDocentesDirectivos(d) { try { localStorage.setItem('gds_docentes_directivos', JSON.stringify(d)); } catch(e) {} }
function getAdministrativos() {
  try {
    var s = localStorage.getItem('gds_administrativos');
    if (!s) return ADMINISTRATIVOS_DEFAULT.slice();
    var parsed = JSON.parse(s);
    if (!Array.isArray(parsed) || parsed.length === 0) return ADMINISTRATIVOS_DEFAULT.slice();
    return parsed;
  } catch(e) { return ADMINISTRATIVOS_DEFAULT.slice(); }
}
function saveAdministrativos(d) { try { localStorage.setItem('gds_administrativos', JSON.stringify(d)); } catch(e) {} }
function getDocentes() {
  try {
    var stored = localStorage.getItem('gds_docentes');
    if (!stored) return DOCENTES_DEFAULT.slice();
    var parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) return DOCENTES_DEFAULT.slice();
    return parsed;
  } catch(e) { return DOCENTES_DEFAULT.slice(); }
}
function saveDocentes(d) { try { localStorage.setItem('gds_docentes', JSON.stringify(d)); } catch(e) {} }

function gdsAvatar(img, size) {
  size = size || 80;
  var name = img.alt || '?';
  var parts = name.trim().split(/\s+/);
  var initials = parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
  var palette = ['#0a2e5c','#0090c8','#1a5276','#117a65','#6c3483','#784212','#1f618d'];
  var hash = 0;
  var len = name.length;
  for (var i = 0; i !== len; i++) { hash = name.charCodeAt(i) + ((hash * 32) - hash); }
  var color = palette[Math.abs(hash) % palette.length];
  var half = size / 2;
  var fs = Math.round(size * 0.36);
  var svg = ['<svg xmlns="http://www.w3.org/2000/svg"',' width="' + size + '" height="' + size + '"',' viewBox="0 0 ' + size + ' ' + size + '">','<circle cx="' + half + '" cy="' + half + '" r="' + half + '" fill="' + color + '"/>','<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"',' font-family="DM Sans,sans-serif"',' font-size="' + fs + '" font-weight="700" fill="#fff">' + initials + '</text>','</svg>'].join('');
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  img.onerror = null;
}

function renderDirectivosFromStorage() {
  const container = document.getElementById('directivosAdminRow');
  if (!container) return;
  container.innerHTML = getDirectivos().map(d => `<div class="org-card org-card-top"><div class="org-avatar"><img src="${d.foto}" alt="${d.nombre}" onerror="gdsAvatar(this,80)"/></div><div class="org-info"><h4>${d.nombre}</h4><span class="org-role ${d.rol || 'otro'}">${d.cargo}</span></div></div>`).join('');
  gdsRevealInit(container, '.org-card', 100);
}
function renderDocentesDirectivosFromStorage() {
  const container = document.getElementById('docentesDirectivosRow');
  if (!container) return;
  container.innerHTML = getDocentesDirectivos().map(d => `<div class="org-card"><div class="org-avatar"><img src="${d.foto}" alt="${d.nombre}" onerror="gdsAvatar(this,80)"/></div><div class="org-info"><h4>${d.nombre}</h4><span class="org-role ${d.rol || 'otro'}">${d.cargo}</span></div></div>`).join('');
  gdsRevealInit(container, '.org-card', 100);
}
function renderAdministrativosFromStorage() {
  const container = document.getElementById('administrativosRow');
  if (!container) return;
  container.innerHTML = getAdministrativos().map(function(d) { return '<div class="org-card org-card-adm"><div class="org-avatar"><img src="' + (d.foto||'') + '" alt="' + d.nombre + '" onerror="gdsAvatar(this,80)" /></div><div class="org-info"><h4>' + d.nombre + '</h4><span class="org-role administrativo">' + d.cargo + '</span></div></div>'; }).join('');
  gdsRevealInit(container, '.org-card', 80);
}
function renderDocentesFromStorage() {
  const grid = document.getElementById('cuerpoDocenteGrid');
  if (!grid) return;
  grid.innerHTML = getDocentes().map(d => `<div class="org-docente-card"><div class="org-avatar-sm"><img src="${d.foto}" alt="${d.nombre}" onerror="gdsAvatar(this,40)"/></div><div class="org-docente-info"><h5>${d.nombre}</h5><span class="org-titular">${d.cargo}</span><span class="org-nivel">${d.nivel}</span></div></div>`).join('');
  gdsRevealInit(grid, '.org-docente-card', 45);
}
function renderAll() {
  renderDirectivosFromStorage(); renderDocentesDirectivosFromStorage(); renderAdministrativosFromStorage(); renderDocentesFromStorage(); renderPromocionesTabs(); renderPromocionesGrid();
  if (isAdminLoggedOrg()) { renderDirectivosList(); renderDocentesDirectivosList(); renderAdministrativosList(); renderDocentesList(); renderPromocionesList(); }
}
function toggleOrg() {
  const exp = document.getElementById('orgExpandible');
  const btn = document.getElementById('orgToggleBtn');
  const isOpening = exp.style.maxHeight === '0px' || exp.style.maxHeight === '';
  if (isOpening) { exp.style.maxHeight = '5000px'; exp.style.opacity = '1'; btn.classList.add('open'); btn.querySelector('span:first-child').textContent = 'Ocultar Cuerpo Docente'; renderDocentesDirectivosFromStorage(); renderAdministrativosFromStorage(); renderDocentesFromStorage(); }
  else { exp.style.maxHeight = '0px'; exp.style.opacity = '0'; btn.classList.remove('open'); btn.querySelector('span:first-child').textContent = 'Ver Docentes Administrativos y Cuerpo Docente'; }
}

const PROMOCIONES_DEFAULT = [
  { id:'promo_2022', anio:'2022', nombreGrupo:'', foto:'img/promociones/promocion-2022.webp' },
  { id:'promo_2023', anio:'2023', nombreGrupo:'', foto:'img/promociones/promocion-2023.webp' },
  { id:'promo_2024', anio:'2024', nombreGrupo:'', foto:'img/promociones/promocion-2024.webp' },
  { id:'promo_2025', anio:'2025', nombreGrupo:'', foto:'img/promociones/promocion-2025.webp' }
];
function getPromociones() { try { const s = localStorage.getItem('gds_promociones'); if (!s) return PROMOCIONES_DEFAULT.slice(); const parsed = JSON.parse(s); return Array.isArray(parsed) ? parsed : PROMOCIONES_DEFAULT.slice(); } catch (e) { return PROMOCIONES_DEFAULT.slice(); } }
function savePromociones(d) { try { localStorage.setItem('gds_promociones', JSON.stringify(d)); } catch (e) {} }
let _promoAnioActivo = null;
function renderPromocionesTabs() { const wrap = document.getElementById('promoTabs'); if (!wrap) return; const promos = getPromociones(); const anios = [...new Set(promos.map(p => p.anio))].sort((a, b) => b - a); if (!anios.length) { wrap.innerHTML = ''; return; } if (!_promoAnioActivo || !anios.includes(_promoAnioActivo)) _promoAnioActivo = anios[0]; wrap.innerHTML = anios.map(a => `<button class="promo-tab-btn ${a === _promoAnioActivo ? 'active' : ''}" onclick="seleccionarAnioPromocion('${a}')">${a}</button>`).join(''); }
function seleccionarAnioPromocion(anio) { _promoAnioActivo = anio; renderPromocionesTabs(); renderPromocionesGrid(); }
function renderPromocionesGrid() { const grid = document.getElementById('promoGrid'); if (!grid) return; const promos = getPromociones(); if (!promos.length) { grid.innerHTML = '<div class="promo-empty">Aún no se han agregado fotos de promociones. El administrador puede subirlas desde el panel de gestión.</div>'; return; } const delAnio = promos.filter(p => p.anio === _promoAnioActivo); grid.innerHTML = delAnio.map(p => `<div class="promo-card ${gdsFrameVariant(p.id || p.anio)}"><img class="promo-card-img" src="${p.foto}" alt="Promoción ${p.anio}" onerror="this.style.display='none'"/><div class="promo-card-info"><h4>Promoción ${p.anio}</h4>${p.nombreGrupo ? `<span>${p.nombreGrupo}</span>` : ''}</div></div>`).join(''); gdsRevealInit(grid, '.promo-card', 110, 'gds-reveal-frame'); gdsAttachTiltAll(grid, '.promo-card'); }
function renderPromocionesList() { const list = document.getElementById('promocionesList'); if (!list) return; const promos = getPromociones().sort((a, b) => b.anio - a.anio); list.innerHTML = promos.map(p => `<div class="admin-item-row"><img src="${p.foto}" style="width:40px;height:40px;border-radius:6px;object-fit:cover" onerror="this.style.background='var(--fondo-2)'"/><div class="admin-item-info"><strong>Promoción ${p.anio}</strong><span>${p.nombreGrupo || ''}</span></div><div class="admin-item-btns"><button class="admin-btn-edit" onclick="editarPromocion('${p.id}')">✏️</button><button class="admin-btn-del" onclick="eliminarPromocion('${p.id}')">🗑️</button></div></div>`).join(''); }
function mostrarFormPromocion(preData) { document.getElementById('formPromocion').style.display = 'block'; if (preData) { document.getElementById('promAnio').value = preData.anio || ''; document.getElementById('promNombreGrupo').value = preData.nombreGrupo || ''; document.getElementById('promFoto').value = preData.foto || ''; document.getElementById('promEditId').value = preData.id || ''; } else { ['promAnio', 'promNombreGrupo', 'promFoto', 'promEditId'].forEach(id => document.getElementById(id).value = ''); } }
function guardarPromocion() { const anio = document.getElementById('promAnio').value.trim(); const nombreGrupo = document.getElementById('promNombreGrupo').value.trim(); const foto = document.getElementById('promFoto').value.trim(); const editId = document.getElementById('promEditId').value; if (!anio || !foto) { gdsAlertOrg('⚠️ Completa al menos el año y la foto.'); return; } let promos = getPromociones(); if (editId) { const idx = promos.findIndex(p => p.id == editId); if (idx > -1) promos[idx] = { id: editId, anio, nombreGrupo, foto }; } else { promos.push({ id: 'promo_' + Date.now(), anio, nombreGrupo, foto }); } savePromociones(promos); document.getElementById('formPromocion').style.display = 'none'; renderPromocionesList(); renderPromocionesTabs(); renderPromocionesGrid(); }
function editarPromocion(id) { const p = getPromociones().find(x => x.id == id); if (p) mostrarFormPromocion(p); }
async function eliminarPromocion(id) { const ok = await gdsConfirmOrg('¿Eliminar esta foto de promoción?'); if (!ok) return; savePromociones(getPromociones().filter(p => p.id != id)); renderPromocionesList(); renderPromocionesTabs(); renderPromocionesGrid(); }

function renderDirectivosList() {
  const list = document.getElementById('directivosList');
  if (!list) return;
  const dirs = getDirectivos();
  list.innerHTML = dirs.map(d => `
    <div class="admin-item-row">
      <img src="${d.foto}" style="width:40px;height:40px;border-radius:50%;object-fit:cover" onerror="gdsAvatar(this,40)"/>
      <div class="admin-item-info"><strong>${d.nombre}</strong><span>${d.cargo}</span></div>
      <div class="admin-item-btns">
        <button class="admin-btn-edit" onclick="editarDirectivo('${d.id}')">✏️</button>
        <button class="admin-btn-del" onclick="eliminarDirectivo('${d.id}')">🗑️</button>
      </div>
    </div>`).join('');
}
function renderDocentesDirectivosList() {
  const list = document.getElementById('docentesDirectivosList');
  if (!list) return;
  const dds = getDocentesDirectivos();
  list.innerHTML = dds.map(d => `
    <div class="admin-item-row">
      <img src="${d.foto}" style="width:40px;height:40px;border-radius:50%;object-fit:cover" onerror="gdsAvatar(this,40)"/>
      <div class="admin-item-info"><strong>${d.nombre}</strong><span>${d.cargo}</span></div>
      <div class="admin-item-btns">
        <button class="admin-btn-edit" onclick="editarDocenteDirectivo('${d.id}')">✏️</button>
        <button class="admin-btn-del" onclick="eliminarDocenteDirectivo('${d.id}')">🗑️</button>
      </div>
    </div>`).join('');
}
function renderAdministrativosList() {
  const list = document.getElementById('administrativosList');
  if (!list) return;
  const items = getAdministrativos();
  list.innerHTML = items.map(d => `
    <div class="admin-item-row">
      <img src="${d.foto}" style="width:40px;height:40px;border-radius:50%;object-fit:cover" onerror="gdsAvatar(this,40)"/>
      <div class="admin-item-info"><strong>${d.nombre}</strong><span>${d.cargo}</span></div>
      <div class="admin-item-btns">
        <button class="admin-btn-edit" onclick="editarAdministrativo('${d.id}')">✏️</button>
        <button class="admin-btn-del" onclick="eliminarAdministrativo('${d.id}')">🗑️</button>
      </div>
    </div>`).join('');
}
function renderDocentesList() {
  const list = document.getElementById('docentesList');
  if (!list) return;
  const docs = getDocentes();
  list.innerHTML = docs.map(d => `
    <div class="admin-item-row">
      <img src="${d.foto}" style="width:40px;height:40px;border-radius:50%;object-fit:cover" onerror="gdsAvatar(this,40)"/>
      <div class="admin-item-info"><strong>${d.nombre}</strong><span>${d.cargo}</span></div>
      <div class="admin-item-btns">
        <button class="admin-btn-edit" onclick="editarDocente('${d.id}')">✏️</button>
        <button class="admin-btn-del" onclick="eliminarDocente('${d.id}')">🗑️</button>
      </div>
    </div>`).join('');
}

function procesarFotoAdmin(input, targetId) { if (input.files && input.files[0]) { const reader = new FileReader(); reader.onload = function(e) { document.getElementById(targetId).value = e.target.result; }; reader.readAsDataURL(input.files[0]); } }
function mostrarFormDocente(preData) { document.getElementById('formDocente').style.display = 'block'; if (preData) { document.getElementById('dNombre').value = preData.nombre || ''; document.getElementById('dCargo').value = preData.cargo || ''; document.getElementById('dNivel').value = preData.nivel || ''; document.getElementById('dFoto').value = preData.foto || ''; document.getElementById('dEditId').value = preData.id || ''; } else { ['dNombre','dCargo','dNivel','dFoto','dEditId'].forEach(id => document.getElementById(id).value = ''); } }
function mostrarFormDirectivo(preData) { document.getElementById('formDirectivo').style.display = 'block'; if (preData) { document.getElementById('dirNombre').value = preData.nombre || ''; document.getElementById('dirCargo').value = preData.cargo || ''; document.getElementById('dirRol').value = preData.rol || 'otro'; document.getElementById('dirFoto').value = preData.foto || ''; document.getElementById('dirEditId').value = preData.id || ''; } else { ['dirNombre','dirCargo','dirFoto','dirEditId'].forEach(id => document.getElementById(id).value = ''); document.getElementById('dirRol').value = 'rector'; } }
function mostrarFormDocenteDirectivo(preData) { document.getElementById('formDocenteDirectivo').style.display = 'block'; if (preData) { document.getElementById('ddNombre').value = preData.nombre || ''; document.getElementById('ddCargo').value = preData.cargo || ''; document.getElementById('ddFoto').value = preData.foto || ''; document.getElementById('ddEditId').value = preData.id || ''; } else { ['ddNombre','ddCargo','ddFoto','ddEditId'].forEach(id => document.getElementById(id).value = ''); } }
function mostrarFormAdministrativo(preData) { document.getElementById('formAdministrativo').style.display = 'block'; if (preData) { document.getElementById('admNombre').value = preData.nombre || ''; document.getElementById('admCargo').value = preData.cargo || ''; document.getElementById('admFoto').value = preData.foto || ''; document.getElementById('admEditId').value = preData.id || ''; } else { ['admNombre','admCargo','admFoto','admEditId'].forEach(id => document.getElementById(id).value = ''); } }

function guardarDocente() { const nombre = document.getElementById('dNombre').value.trim(); const cargo = document.getElementById('dCargo').value.trim(); const nivel = document.getElementById('dNivel').value.trim(); const foto = document.getElementById('dFoto').value.trim(); const editId = document.getElementById('dEditId').value; if (!nombre || !cargo) { gdsAlertOrg('⚠️ Completa al menos el nombre y el cargo.'); return; } let docs = getDocentes(); if (editId) { const idx = docs.findIndex(d => d.id == editId); if (idx > -1) docs[idx] = { id: editId, nombre, cargo, nivel, foto }; } else { docs.push({ id: 'd_' + Date.now(), nombre, cargo, nivel, foto }); } saveDocentes(docs); document.getElementById('formDocente').style.display = 'none'; renderDocentesList(); renderDocentesFromStorage(); }
function guardarDirectivo() { const nombre = document.getElementById('dirNombre').value.trim(); const cargo = document.getElementById('dirCargo').value.trim(); const rol = document.getElementById('dirRol').value; const foto = document.getElementById('dirFoto').value.trim(); const editId = document.getElementById('dirEditId').value; if (!nombre || !cargo) { gdsAlertOrg('⚠️ Completa al menos el nombre y el cargo.'); return; } let items = getDirectivos(); if (editId) { const idx = items.findIndex(d => d.id == editId); if (idx > -1) items[idx] = { id: editId, nombre, cargo, rol, foto }; } else { items.push({ id: 'dir_' + Date.now(), nombre, cargo, rol, foto }); } saveDirectivos(items); document.getElementById('formDirectivo').style.display = 'none'; renderDirectivosList(); renderDirectivosFromStorage(); }
function guardarDocenteDirectivo() { const nombre = document.getElementById('ddNombre').value.trim(); const cargo = document.getElementById('ddCargo').value.trim(); const foto = document.getElementById('ddFoto').value.trim(); const editId = document.getElementById('ddEditId').value; if (!nombre || !cargo) { gdsAlertOrg('⚠️ Completa al menos el nombre y el cargo.'); return; } let items = getDocentesDirectivos(); if (editId) { const idx = items.findIndex(d => d.id == editId); if (idx > -1) items[idx] = { id: editId, nombre, cargo, foto }; } else { items.push({ id: 'dd_' + Date.now(), nombre, cargo, foto }); } saveDocentesDirectivos(items); document.getElementById('formDocenteDirectivo').style.display = 'none'; renderDocentesDirectivosList(); renderDocentesDirectivosFromStorage(); }
function guardarAdministrativo() {
  const nombre = document.getElementById('admNombre').value.trim();
  const cargo = document.getElementById('admCargo').value.trim();
  const foto = document.getElementById('admFoto').value.trim();
  const editId = document.getElementById('admEditId').value;
  if (!nombre || !cargo) { gdsAlertOrg('⚠️ Completa al menos el nombre y el cargo.'); return; }
  let items = getAdministrativos();
  if (editId) {
    const idx = items.findIndex(d => d.id == editId);
    if (idx > -1) items[idx] = { id: editId, nombre, cargo, foto };
  } else {
    items.push({ id: 'adm_' + Date.now(), nombre, cargo, foto });
  }
  saveAdministrativos(items);
  document.getElementById('formAdministrativo').style.display = 'none';
  renderAdministrativosList();
  renderAdministrativosFromStorage();
}

function editarDocente(id) { const d = getDocentes().find(x => x.id == id); if (d) mostrarFormDocente(d); }
function editarDirectivo(id) { const d = getDirectivos().find(x => x.id == id); if (d) mostrarFormDirectivo(d); }
function editarDocenteDirectivo(id) { const d = getDocentesDirectivos().find(x => x.id == id); if (d) mostrarFormDocenteDirectivo(d); }
function editarAdministrativo(id) { const d = getAdministrativos().find(x => x.id == id); if (d) mostrarFormAdministrativo(d); }
async function eliminarDocente(id) { const ok = await gdsConfirmOrg('¿Eliminar este docente del organigrama?'); if (!ok) return; saveDocentes(getDocentes().filter(d => d.id != id)); renderDocentesList(); renderDocentesFromStorage(); }
async function eliminarDirectivo(id) { const ok = await gdsConfirmOrg('¿Eliminar este directivo del organigrama?'); if (!ok) return; saveDirectivos(getDirectivos().filter(d => d.id != id)); renderDirectivosList(); renderDirectivosFromStorage(); }
async function eliminarDocenteDirectivo(id) { const ok = await gdsConfirmOrg('¿Eliminar este docente directivo del organigrama?'); if (!ok) return; saveDocentesDirectivos(getDocentesDirectivos().filter(d => d.id != id)); renderDocentesDirectivosList(); renderDocentesDirectivosFromStorage(); }
async function eliminarAdministrativo(id) { const ok = await gdsConfirmOrg('¿Eliminar esta persona del personal administrativo?'); if (!ok) return; saveAdministrativos(getAdministrativos().filter(d => d.id != id)); renderAdministrativosList(); renderAdministrativosFromStorage(); }
function gdsAlertOrg(msg) { alert(msg); }
function gdsConfirmOrg(msg) { return Promise.resolve(window.confirm(msg)); }

const ORG_ADMIN_CREDS = []; // Credenciales retiradas: la autenticación se realiza en el servidor.
const ORG_MAX_INT = 4, ORG_BLOCK_MS = 10 * 60 * 1000;
let _orgOtp = null, _orgOtpExpiry = null, orgBlockTimer = null;
function getOrgAttempts() { try { return JSON.parse(localStorage.getItem('gds_auth_attempts') || '{}'); } catch(e) { return {}; } }
function saveOrgAttempts(d) { try { localStorage.setItem('gds_auth_attempts', JSON.stringify(d)); } catch(e) {} }
function isOrgBlocked() { const d = getOrgAttempts(); if (!d.blockedUntil) return false; if (Date.now() < d.blockedUntil) return true; saveOrgAttempts({}); return false; }
function registerOrgFailed() { const d = getOrgAttempts(); d.intentos = (d.intentos||0)+1; if (d.intentos >= ORG_MAX_INT) { d.blockedUntil = Date.now()+ORG_BLOCK_MS; d.intentos=0; } saveOrgAttempts(d); return d; }
function startOrgBlockCountdown(until) { const el = document.getElementById('orgBlockCountdown'), errEl = document.getElementById('orgBlockError'); if (!el||!errEl) return; errEl.style.display='block'; clearInterval(orgBlockTimer); orgBlockTimer = setInterval(() => { const rem = until-Date.now(); if(rem<=0){clearInterval(orgBlockTimer);errEl.style.display='none';saveOrgAttempts({});return;} const m=Math.floor(rem/60000),s=Math.floor((rem%60000)/1000); el.textContent=m+':'+String(s).padStart(2,'0'); },1000); }
function generateOrgOTP() { return String(Math.floor(100000+Math.random()*900000)); }
async function enviarOrgOTP(code) { emailjs.init({ publicKey: 'A8_-VTv06yO5YWU7-' }); await emailjs.send('service_dapdvr6','template_0rtnkuc',{ to_email:'gimnasiodomingosavio3@gmail.com', otp_code:code, expiry:'10 minutos', timestamp:new Date().toLocaleString('es-CO') }); }
function mostrarOrgOTPEstado(ok) { let prev = document.getElementById('pageOtpEmailPreview'); if (!prev) { prev=document.createElement('div'); prev.id='pageOtpEmailPreview'; prev.style.cssText='position:fixed;bottom:20px;right:20px;z-index:99999;max-width:340px;background:white;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden;'; document.body.appendChild(prev); } if (ok) { prev.innerHTML=`<div style="background:linear-gradient(135deg,#132950,#1e4a90);padding:16px 20px;color:white;display:flex;align-items:center;gap:12px;"><span style="font-size:24px">📨</span><div><div style="font-size:13px;font-weight:700">Código enviado</div><div style="font-size:11px;opacity:.8">Revisa: gimnasiodomingosavio3@gmail.com</div></div></div><div style="padding:12px 20px;font-size:12px;color:#555;">Válido por <strong>10 minutos</strong></div>`; } else { prev.innerHTML=`<div style="background:linear-gradient(135deg,#c0392b,#922b21);padding:16px 20px;color:white;display:flex;align-items:center;gap:12px;"><span style="font-size:24px">⚠️</span><div><div style="font-size:13px;font-weight:700">Error al enviar el código</div></div></div><div style="padding:12px 20px;font-size:12px;color:#555;">No se pudo enviar el OTP.</div>`; } setTimeout(() => { const el = document.getElementById('pageOtpEmailPreview'); if(el) el.remove(); }, 9000); }
async function adminCheckAuthOrg() { if (!gdsAdminHabilitado()) return; try { const s = await GDS.admin.session(); if (s && s.authenticated) { sessionStorage.setItem('gds_admin','true'); const tb = document.getElementById('adminToolbar'); if (tb) tb.classList.add('visible'); renderAll(); return; } } catch(e) {} sessionStorage.removeItem('gds_admin'); const ov = document.getElementById('orgAdminLoginOverlay'); if (!ov) return; ov.classList.add('open'); const d = getOrgAttempts(); if (d.blockedUntil && Date.now() < d.blockedUntil) startOrgBlockCountdown(d.blockedUntil); setTimeout(() => { const el=document.getElementById('orgAdminEmail'); if(el) el.focus(); }, 300); }
function cerrarOrgAdminLogin() { const ov = document.getElementById('orgAdminLoginOverlay'); if (ov) ov.classList.remove('open'); const s1 = document.getElementById('orgStepOTP'); if(s1) s1.style.display = 'none'; const s2 = document.getElementById('orgStepEmail'); if(s2) s2.style.display = 'block'; const em=document.getElementById('orgAdminEmail'); if(em) em.value=''; const pw=document.getElementById('orgAdminPass'); if(pw) pw.value=''; const err=document.getElementById('orgLoginError'); if(err) err.style.display='none'; }
async function doOrgStep1() { if (isOrgBlocked()) { const d=getOrgAttempts(); startOrgBlockCountdown(d.blockedUntil); return; } const email=document.getElementById('orgAdminEmail').value.trim().toLowerCase(); const pass=document.getElementById('orgAdminPass').value.trim(); const errEl=document.getElementById('orgLoginError'); errEl.style.display='none'; let _orgLoginOk = false; try { await GDS.admin.login(email, pass); _orgLoginOk = true; } catch(e) { _orgLoginOk = false; } if (!_orgLoginOk) { const d=registerOrgFailed(); if(d.blockedUntil){startOrgBlockCountdown(d.blockedUntil);return;} errEl.textContent='⚠️ ⚠️ Credenciales incorrectas. Intentos restantes: '+(ORG_MAX_INT-(d.intentos||0)); errEl.style.display='block'; document.getElementById('orgAdminPass').value=''; return; } _orgOtp=generateOrgOTP(); _orgOtpExpiry=Date.now()+10*60*1000; const btn=document.querySelector('#orgStepEmail .btn-primary'); if(btn){btn.disabled=true;btn.textContent='Enviando código...';} try { await enviarOrgOTP(_orgOtp); mostrarOrgOTPEstado(true); } catch(err) { _orgOtp=null;_orgOtpExpiry=null; mostrarOrgOTPEstado(false); if(btn){btn.disabled=false;btn.textContent='Continuar →';} return; } if(btn){btn.disabled=false;btn.textContent='Continuar →';} document.getElementById('orgStepEmail').style.display='none'; document.getElementById('orgStepOTP').style.display='block'; const sh=document.getElementById('orgEmailShown'); if(sh) sh.textContent='gimnasiodomingosavio3@gmail.com'; document.getElementById('orgOTPInput').value=''; document.getElementById('orgOTPError').style.display='none'; setTimeout(()=>document.getElementById('orgOTPInput').focus(),100); }
function doOrgStep2() { const input=document.getElementById('orgOTPInput').value.trim(); const errEl=document.getElementById('orgOTPError'); errEl.style.display='none'; if(!_orgOtp||Date.now()>_orgOtpExpiry){errEl.textContent='⚠️ El código expiró. Solicita uno nuevo.';errEl.style.display='block';return;} if(input!==_orgOtp){const d=registerOrgFailed();errEl.textContent='⚠️ Código incorrecto';errEl.style.display='block';if(d.blockedUntil){cerrarOrgAdminLogin();startOrgBlockCountdown(d.blockedUntil);}return;} _orgOtp=null;_orgOtpExpiry=null;saveOrgAttempts({});sessionStorage.setItem('gds_admin','true'); const prev=document.getElementById('pageOtpEmailPreview');if(prev)prev.remove(); cerrarOrgAdminLogin(); document.getElementById('adminToolbar').classList.add('visible'); renderAll(); }
function volverOrgStep1() { document.getElementById('orgStepOTP').style.display='none'; document.getElementById('orgStepEmail').style.display='block'; _orgOtp=null;_orgOtpExpiry=null; }
function isAdminLoggedOrg() { return sessionStorage.getItem('gds_admin') === 'true'; }
async function adminLogoutOrg() { try { await GDS.admin.logout(); sessionStorage.removeItem('gds_admin'); document.getElementById('adminToolbar').classList.remove('visible'); document.querySelectorAll('.admin-editor-overlay').forEach(ov => ov.classList.remove('open')); } catch(e) { alert('No se pudo cerrar la sesión: ' + (e.message || 'Error desconocido')); } }

(function(){
  var nb = document.getElementById('navbar');
  var ham = document.getElementById('hamburger');
  var navL = document.getElementById('navLinks');
  if (ham && navL) { ham.addEventListener('click', function(){ this.classList.toggle('open'); navL.classList.toggle('open'); document.body.style.overflow = navL.classList.contains('open') ? 'hidden' : ''; }); }
  var soyBtn = document.getElementById('soyDominguinoBtn');
  var soyMenu = document.getElementById('soyDominguinoMenu');
  if (soyBtn && soyMenu) { soyBtn.addEventListener('click', function(e){ e.preventDefault(); soyMenu.classList.toggle('open'); var arrow = soyBtn.querySelector('.td-arrow'); if (arrow) arrow.style.transform = soyMenu.classList.contains('open') ? 'rotate(180deg)' : ''; }); document.addEventListener('click', function(e){ if (!soyBtn.contains(e.target) && !soyMenu.contains(e.target)) { soyMenu.classList.remove('open'); var arrow = soyBtn.querySelector('.td-arrow'); if (arrow) arrow.style.transform = ''; } }); }
})();

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { document.getElementById('orgAdminLoginOverlay').classList.remove('open'); document.querySelectorAll('.admin-editor-overlay').forEach(o => o.classList.remove('open')); } });
window.addEventListener('load', () => { if (typeof twemoji !== 'undefined') { twemoji.parse(document.body, { folder: 'svg', ext: '.svg' }); } });
document.addEventListener('DOMContentLoaded', () => { renderDirectivosFromStorage(); renderDocentesDirectivosFromStorage(); renderAdministrativosFromStorage(); renderDocentesFromStorage(); renderPromocionesTabs(); renderPromocionesGrid(); if (isAdminLoggedOrg()) { document.getElementById('adminToolbar').classList.add('visible'); } });
