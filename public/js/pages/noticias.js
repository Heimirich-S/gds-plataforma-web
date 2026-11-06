'use strict';

/* ══════════════════════════════════════════════════════════════
   REVELADO SUAVE AL HACER SCROLL + INCLINACI͓N 3D EN HOVER
   Mismo sistema que organigrama.html (se duplica aquí porque cada
   HTML tiene su propio contexto de script). Se usa en las tarjetas
   de noticias, periódicos y documentos para darle más vida a la
   página sin depender de librerías externas como three.js.
   ══════════════════════════════════════════════════════ */
const _gdsRevealIO = ('IntersectionObserver' in window) ? new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      _gdsRevealIO.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' }) : null;

function gdsRevealInit(container, selector, staggerMs) {
  if (!container) return;
  const items = container.querySelectorAll(selector);
  items.forEach((el, i) => {
    el.classList.add('gds-reveal');
    el.style.transitionDelay = (i * (staggerMs || 70)) + 'ms';
    if (_gdsRevealIO) {
      _gdsRevealIO.observe(el);
      setTimeout(() => { if (!el.classList.contains('is-visible')) el.classList.add('is-visible'); }, 900);
    } else {
      el.classList.add('is-visible');
    }
  });
}

function gdsAttachTilt(card, strength) {
  if (!card || card._gdsTiltOn) return;
  card._gdsTiltOn = true;
  if (window.matchMedia && (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('(hover: none)').matches)) return;
  const s = strength || 5;
  let raf = null;
  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      card.style.transition = 'transform .12s ease-out';
      card.style.transform = `perspective(900px) rotateX(${(-py * s).toFixed(2)}deg) rotateY(${(px * s).toFixed(2)}deg) translateY(-6px)`;
    });
  });
  card.addEventListener('mouseleave', () => {
    if (raf) cancelAnimationFrame(raf);
    card.style.transition = 'transform .5s cubic-bezier(.16,.8,.24,1)';
    card.style.transform = '';
  });
}
function gdsAttachTiltAll(container, selector, strength) {
  if (!container) return;
  container.querySelectorAll(selector).forEach(el => gdsAttachTilt(el, strength));
}

/* ── ADMIN AUTH ── */
// Credenciales retiradas: la autenticación se realiza en el servidor.
let adminMode = false;

/* ══ ADMIN AUTH NOTICIAS ══ */
const NOT_ADMIN_CREDS = []; // Credenciales retiradas: la autenticación se realiza en el servidor.
const NOT_MAX_INT = 4, NOT_BLOCK_MS = 10 * 60 * 1000;
let _notOtp = null, _notOtpExpiry = null, notBlockTimer = null;

function getNotAttempts() { try { return JSON.parse(localStorage.getItem('gds_auth_attempts') || '{}'); } catch(e) { return {}; } }
function saveNotAttempts(d) { try { localStorage.setItem('gds_auth_attempts', JSON.stringify(d)); } catch(e) {} }
function isNotBlocked() { const d = getNotAttempts(); if (!d.blockedUntil) return false; if (Date.now() < d.blockedUntil) return true; saveNotAttempts({}); return false; }
function registerNotFailed() { const d = getNotAttempts(); d.intentos = (d.intentos||0)+1; if (d.intentos >= NOT_MAX_INT) { d.blockedUntil = Date.now()+NOT_BLOCK_MS; d.intentos=0; } saveNotAttempts(d); return d; }
function startNotBlockCountdown(until) {
  const el = document.getElementById('notBlockCountdown'), errEl = document.getElementById('notBlockError');
  if (!el||!errEl) return; errEl.style.display='block'; clearInterval(notBlockTimer);
  notBlockTimer = setInterval(() => { const rem = until-Date.now(); if(rem<=0){clearInterval(notBlockTimer);errEl.style.display='none';saveNotAttempts({});return;} const m=Math.floor(rem/60000),s=Math.floor((rem%60000)/1000); el.textContent=m+':'+String(s).padStart(2,'0'); },1000);
}
function generateNotOTP() { return String(Math.floor(100000+Math.random()*900000)); }
async function enviarNotOTP(code) {
  emailjs.init({ publicKey: 'A8_-VTv06yO5YWU7-' });
  await emailjs.send('service_dapdvr6','template_0rtnkuc',{ to_email:'gimnasiodomingosavio3@gmail.com', otp_code:code, expiry:'10 minutos', timestamp:new Date().toLocaleString('es-CO') });
}
function mostrarNotOTPEstado(ok) {
  let prev = document.getElementById('pageOtpEmailPreview');
  if (!prev) { prev=document.createElement('div'); prev.id='pageOtpEmailPreview'; prev.style.cssText='position:fixed;bottom:20px;right:20px;z-index:99999;max-width:340px;background:white;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden;'; document.body.appendChild(prev); }
  if (ok) { prev.innerHTML=`<div style="background:linear-gradient(135deg,#132950,#1e4a90);padding:16px 20px;color:white;display:flex;align-items:center;gap:12px;"><span style="font-size:24px">📨</span><div><div style="font-size:13px;font-weight:700">Código enviado</div><div style="font-size:11px;opacity:.8">Revisa: gimnasiodomingosavio3@gmail.com</div></div></div><div style="padding:12px 20px;font-size:12px;color:#555;">Válido por <strong>10 minutos</strong></div>`; }
  else { prev.innerHTML=`<div style="background:linear-gradient(135deg,#c0392b,#922b21);padding:16px 20px;color:white;display:flex;align-items:center;gap:12px;"><span style="font-size:24px">⚠️</span><div><div style="font-size:13px;font-weight:700">Error al enviar el código</div></div></div><div style="padding:12px 20px;font-size:12px;color:#555;">No se pudo enviar el OTP.</div>`; }
  setTimeout(() => { const el = document.getElementById('pageOtpEmailPreview'); if(el) el.remove(); }, 9000);
}

async function adminCheckAuth() { if (!gdsAdminHabilitado()) return;
  try {
    const s = await GDS.admin.session();
    if (s && s.authenticated) { sessionStorage.setItem('gds_admin','true'); adminMode = true; const tb = document.getElementById('adminToolbar'); if (tb) tb.classList.add('visible'); document.querySelectorAll('.admin-only-btn').forEach(b => b.style.display = 'inline-flex'); renderAll(); return; }
    if (isAdminLogged()) {
      adminMode = true;
      const tb = document.getElementById('adminToolbar');
      if (tb) tb.classList.add('visible');
      document.querySelectorAll('.admin-only-btn').forEach(b => b.style.display = 'inline-flex');
      renderAll();
      return;
    }
    const ov = document.getElementById('notAdminLoginOverlay');
    if (!ov) { console.error('GDS: notAdminLoginOverlay no encontrado'); return; }
    ov.style.display = 'flex';
    ov.style.alignItems = 'center';
    ov.style.justifyContent = 'center';
    ov.style.position = 'fixed';
    ov.style.inset = '0';
    ov.style.zIndex = '99999';
    ov.style.background = 'rgba(0,0,0,.65)';
    const d = getNotAttempts();
    if (d.blockedUntil && Date.now() < d.blockedUntil) startNotBlockCountdown(d.blockedUntil);
    setTimeout(() => { const el=document.getElementById('notAdminEmail'); if(el) el.focus(); }, 300);
  } catch(err) { console.error('GDS adminCheckAuth error:', err); }
}

function cerrarNotAdminLogin() {
  const ov = document.getElementById('notAdminLoginOverlay');
  if (ov) ov.style.display = 'none';
  const s1 = document.getElementById('notStepOTP'); if(s1) s1.style.display = 'none';
  const s2 = document.getElementById('notStepEmail'); if(s2) s2.style.display = 'block';
  const em=document.getElementById('notAdminEmail'); if(em) em.value='';
  const pw=document.getElementById('notAdminPass'); if(pw) pw.value='';
  const err=document.getElementById('notLoginError'); if(err) err.style.display='none';
}

async function doNotStep1() {
  if (isNotBlocked()) { const d=getNotAttempts(); startNotBlockCountdown(d.blockedUntil); return; }
  const email=document.getElementById('notAdminEmail').value.trim().toLowerCase();
  const pass=document.getElementById('notAdminPass').value.trim();
  const errEl=document.getElementById('notLoginError'); errEl.style.display='none';
  try { await GDS.admin.login(email, pass); } catch (e) { const d=registerNotFailed(); if(d.blockedUntil){startNotBlockCountdown(d.blockedUntil);return;} errEl.textContent='⚠️ ⚠️ Credenciales incorrectas. Intentos restantes: '+(NOT_MAX_INT-(d.intentos||0)); errEl.style.display='block'; document.getElementById('notAdminPass').value=''; return; }
  _notOtp=generateNotOTP(); _notOtpExpiry=Date.now()+10*60*1000;
  const btn=document.querySelector('#notStepEmail .btn-primary'); if(btn){btn.disabled=true;btn.textContent='Enviando código...';}
  try { await enviarNotOTP(_notOtp); mostrarNotOTPEstado(true); } catch(err) { _notOtp=null;_notOtpExpiry=null; mostrarNotOTPEstado(false); if(btn){btn.disabled=false;btn.textContent='Continuar →';} return; }
  if(btn){btn.disabled=false;btn.textContent='Continuar →';}
  document.getElementById('notStepEmail').style.display='none';
  document.getElementById('notStepOTP').style.display='block';
  const sh=document.getElementById('notEmailShown'); if(sh) sh.textContent='gimnasiodomingosavio3@gmail.com';
  document.getElementById('notOTPInput').value='';
  document.getElementById('notOTPError').style.display='none';
  setTimeout(()=>document.getElementById('notOTPInput').focus(),100);
}

function doNotStep2() {
  const input=document.getElementById('notOTPInput').value.trim();
  const errEl=document.getElementById('notOTPError'); errEl.style.display='none';
  if(!_notOtp||Date.now()>_notOtpExpiry){errEl.textContent='⚠️ El código expiró. Solicita uno nuevo.';errEl.style.display='block';return;}
  if(input!==_notOtp){const d=registerNotFailed();errEl.textContent='⚠️ Código incorrecto';errEl.style.display='block';if(d.blockedUntil){cerrarNotAdminLogin();startNotBlockCountdown(d.blockedUntil);}return;}
  _notOtp=null;_notOtpExpiry=null;saveNotAttempts({});sessionStorage.setItem('gds_admin','true');
  adminMode = true;
  const prev=document.getElementById('pageOtpEmailPreview');if(prev)prev.remove();
  cerrarNotAdminLogin();
  document.getElementById('adminToolbar').classList.add('visible');
  document.querySelectorAll('.admin-only-btn').forEach(b=>b.style.display='inline-flex');
  renderAll();
}

function volverNotStep1() {
  document.getElementById('notStepOTP').style.display='none';
  document.getElementById('notStepEmail').style.display='block';
  _notOtp=null;_notOtpExpiry=null;
}
function isAdminLogged() { return sessionStorage.getItem('gds_admin') === 'true'; }
async function adminLogoutNoticias() {
  try {
    await GDS.admin.logout();
    sessionStorage.removeItem('gds_admin');
    adminMode = false;
    document.getElementById('adminToolbar').classList.remove('visible');
    document.querySelectorAll('.admin-only-btn').forEach(b => b.style.display = 'none');
    renderAll();
  } catch(e) {
    alert('No se pudo cerrar la sesión: ' + (e.message || 'Error desconocido'));
  }
}

const urlParams = new URLSearchParams(window.location.search);
if (isAdminLogged()) {
  adminMode = true;
}
if (urlParams.get('admin') === '1' && isAdminLogged()) {
  adminMode = true;
  document.getElementById('adminToolbar').classList.add('visible');
  document.querySelectorAll('.admin-only-btn').forEach(b => b.style.display = 'inline-flex');
  const tab = urlParams.get('tab');
  if (tab === 'periodicos') setTimeout(() => document.getElementById('seccPeriodicos').scrollIntoView({behavior:'smooth', block:'start'}), 600);
  if (tab === 'documentos') setTimeout(() => document.getElementById('seccDocumentos').scrollIntoView({behavior:'smooth', block:'start'}), 600);
}

function mostrarTabAdmin(tab) {
  if (tab === 'noticias') { document.getElementById('vistaLista').classList.remove('hidden'); document.getElementById('noticiaDetalle').classList.remove('active'); window.scrollTo({top:300,behavior:'smooth'}); }
  if (tab === 'periodicos') document.getElementById('seccPeriodicos').scrollIntoView({behavior:'smooth', block:'start'});
  if (tab === 'documentos') document.getElementById('seccDocumentos').scrollIntoView({behavior:'smooth', block:'start'});
}

/* ── NOTICIAS DATA ── */
const NOTICIAS_DEFAULT = [
  {
    id:'n1', cat:'Academico', featured:true,
    titulo:'Calendario académico y proceso de inducción 2026',
    extracto:'El GDS informa a toda la comunidad educativa el calendario oficial de actividades para el año lectivo 2026 y el proceso de inducción para nuevos estudiantes.',
    img:'img/noticias/calendario-induccion-2026.webp',
    fecha:'Enero 2026',
    cuerpo:'<p>El Gimnasio Domingo Savio presenta el calendario oficial de inducción y actividades para el periodo académico 2026, diseñado para garantizar una transición fluida para todos los estudiantes, especialmente los nuevos integrantes de la familia dominguina.</p><p>Las actividades incluyen jornada de bienvenida con directivos y docentes, recorrido por las instalaciones del colegio, presentación del manual de convivencia actualizado para 2026, entrega de materiales e inicio del proceso de adaptación para los grados de preescolar.</p><p>Los padres de familia y acudientes son invitados a participar en las reuniones informativas programadas durante la primera semana. Para más información, consulta en la secretaría académica al PBX 5750230 o escríbenos al WhatsApp institucional.</p>'
  },
  {
    id:'n2', cat:'Internacional',
    titulo:'GDS en el Podcast Campus Global: Internacionalización educativa',
    extracto:'Directivos del Gimnasio participaron en el Podcast Campus Global, compartiendo la visión intercultural del colegio con instituciones de toda Latinoamérica.',
    img:'img/noticias/conversatorio-podcast-campus-global.webp',
    fecha:'Febrero 2026',
    cuerpo:'<p>En el marco del programa de internacionalización educativa, el Gimnasio Domingo Savio participó en el Podcast Campus Global, un espacio de diálogo entre instituciones de Latinoamérica comprometidas con la formación intercultural.</p><p>Nuestros directivos conversaron con expertos en pedagogía intercultural sobre la importancia de preparar a los estudiantes para un mundo globalizado, el fortalecimiento del programa de inglés con el convenio Teaching For Kids, y la visión institucional de cara a los próximos cinco años.</p><p>Esta iniciativa reafirma el compromiso del GDS con una educación de calidad que trasciende fronteras.</p>'
  },
  {
    id:'n3', cat:'Deportes',
    titulo:'Dominguinos destacan en torneos deportivos intercolegiales 2026',
    extracto:'Nuestros equipos de fútbol, baloncesto, atletismo y ajedrez representan al GDS con alegría y compromiso en los torneos de Cúcuta y Norte de Santander.',
    img:'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=900&q=80',
    fecha:'Febrero 2026',
    cuerpo:'<p>El Gimnasio Domingo Savio celebra los resultados de sus estudiantes en las competencias deportivas intercolegiales de Cúcuta y Norte de Santander correspondientes al primer trimestre de 2026.</p><p>El equipo de fútbol masculino sub-14 alcanzó el tercer lugar en el torneo municipal, mientras que la selección de atletismo femenino obtuvo medallas en velocidad y salto largo. El equipo de ajedrez clasificó a la fase departamental.</p><p>Felicitamos a todos los participantes y sus familias por el apoyo incondicional. ¡El deporte es parte fundamental de la formación integral dominguina!</p>'
  },
  {
    id:'n4', cat:'Tecnologia',
    titulo:'Nuevos laboratorios y equipos de vanguardia en alianza con FUCS Salud',
    extracto:'El GDS incorporó equipos de scanner digital para laboratorios de ciencias, en el marco del convenio con la Fundación Universitaria de Ciencias de la Salud.',
    img:'https://www.fucsalud.edu.co/sites/default/files/inline-images/scanner.png',
    fecha:'Enero 2026',
    cuerpo:'<p>En línea con el compromiso de ofrecer educación de vanguardia, el Gimnasio Domingo Savio ha incorporado a sus laboratorios un moderno sistema de scanner digital para láminas portaobjetos, tecnología utilizada en centros universitarios y de investigación.</p><p>Este equipo permite a los estudiantes de bachillerato realizar observaciones microscópicas de alta resolución, capturar imágenes digitales y realizar análisis posteriores, fortaleciendo las competencias científicas. Se estima que más de 300 estudiantes se beneficiarán durante 2026.</p>'
  },
  {
    id:'n5', cat:'Cultura',
    titulo:'Festival de Talentos "Dominguinos en Escena" 2026',
    extracto:'Más de 150 estudiantes brillaron en música, danza, teatro y artes plásticas en el festival anual que celebra los talentos de la familia dominguina.',
    img:'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&q=80',
    fecha:'Marzo 2026',
    cuerpo:'<p>El Gimnasio Domingo Savio vivió una jornada memorable con la realización del Festival de Talentos "Dominguinos en Escena", reuniendo a toda la comunidad educativa en una celebración de la creatividad y el arte.</p><p>Más de 150 estudiantes participaron en música, danza folclórica y moderna, teatro, artes plásticas y oratoria. El evento contó con la participación especial de padres de familia y egresados. La próxima edición está programada para agosto.</p>'
  },
  {
    id:'n6', cat:'Institucion',
    titulo:'GDS renueva convenio con Universidad de Santander UDES',
    extracto:'El nuevo acuerdo amplía beneficios para egresados dominguinos: descuentos en matrículas, orientación vocacional y proyectos de investigación conjunta.',
    img:'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=900&q=80',
    fecha:'Febrero 2026',
    cuerpo:'<p>El Gimnasio Domingo Savio renovó y amplió el convenio de cooperación académica con la Universidad de Santander (UDES), una alianza que ha beneficiado a centenares de egresados.</p><p>El nuevo convenio incluye condiciones especiales de admisión, descuentos en matrículas de pregrado, orientación vocacional para estudiantes de 10° y 11°, y la posibilidad de proyectos de investigación conjunta.</p>'
  },
  {
    id:'n7', cat:'Academico',
    titulo:'Estudiantes del GDS clasifican en Olimpiadas SUMUN 2026',
    extracto:'Tres estudiantes de los grados 9° a 11° clasificaron a la fase departamental de las Olimpiadas de Matemáticas SUMUN, destacando el nivel académico dominguino.',
    img:'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=900&q=80',
    fecha:'Marzo 2026',
    cuerpo:'<p>Un grupo selecto de estudiantes del GDS participó en la edición regional de las Olimpiadas de Matemáticas SUMUN, con tres estudiantes que clasificaron a la instancia departamental.</p><p>Este resultado es fruto del trabajo del área de matemáticas y del apoyo de la plataforma SUMUN. La institución celebra estos logros como muestra del esfuerzo por alcanzar la excelencia académica.</p>'
  },
  {
    id:'n8', cat:'Institucion',
    titulo:'Renovación de instalaciones deportivas: mejor calidad para 1.200 estudiantes',
    extracto:'El GDS completó la adecuación de su cancha multifuncional, vestidores y zona de atletismo, en el marco del plan de mejoramiento institucional 2025–2026.',
    img:'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&q=80',
    fecha:'Diciembre 2025',
    cuerpo:'<p>El Gimnasio Domingo Savio completó la renovación de sus instalaciones deportivas, beneficiando directamente a más de 1.200 estudiantes. Las mejoras incluyen la repavimentación de la cancha multifuncional, nuevo equipamiento deportivo y adecuación de los vestidores.</p><p>La inversión hace parte del plan de mejoramiento institucional que lidera la Rectoría con el apoyo del Consejo Directivo.</p>'
  }
];

const PERIODICOS_DEFAULT = [
  {id:'p1', nombre:'El Dominguino — Ed. 2027', anio:'2027', img:'', url:'#'},
  {id:'p2', nombre:'El Dominguino — Ed. 2026', anio:'2026', img:'', url:'#'},
  {id:'p3', nombre:'El Dominguino — Ed. 2025', anio:'2025', img:'img/noticias/periodicos/periodico-el-dominguino-2025.webp', url:'#'},
  {id:'p4', nombre:'El Dominguino — Ed. 2024', anio:'2024', img:'img/noticias/periodicos/periodico-el-dominguino-2024.webp', url:'#'}
];

const DOCUMENTOS_DEFAULT = [
  {id:'doc1', nombre:'ACTA DE APROBACI͓N DEL SEM AL GIMNASIO DOMINGO SAVIO', desc:'Documento oficial · 9/04/2026 · 2.804 KB', tipo:'PDF', url:'https://drive.google.com/file/d/1scw7jMsJvVOBvssq8-6siHKnkkGHcPVx/view?usp=sharing', fileData: null},
  {id:'doc2', nombre:'PA-AF-D07 POL͍TICA DE BIOSEGURIDAD', desc:'Protocolo institucional vigente · 457 KB', tipo:'PDF', url:'https://drive.google.com/file/d/1yS1zV2n1QWPdEmvXjbruDyKbiYfmQWwg/view?usp=sharing', fileData: null},
  {id:'doc3', nombre:'PROTOCOLOS BAJO ESQUEMA DE ALTERNANCIA Y PŔCTICAS DE BIOSEGURIDAD', desc:'Documento oficial · 1.290 KB', tipo:'PDF', url:'https://drive.google.com/file/d/1HzRL3IRT6tFP5ZYFaJYBBED_GfZ1CFj-/view?usp=sharing', fileData: null},
  {id:'doc4', nombre:'TRATAMIENTO DE DATOS', desc:'Política de tratamiento de datos personales · 377 KB', tipo:'PDF', url:'https://drive.google.com/file/d/1Vv7beVDPlra7kPbM4UaLYusTdY8_svaO/view?usp=sharing', fileData: null}
];

function getNoticias() { try { const d = localStorage.getItem('gds_noticias_page'); return d ? JSON.parse(d) : NOTICIAS_DEFAULT.map(n=>({...n})); } catch(e) { return NOTICIAS_DEFAULT.map(n=>({...n})); } }
function getPeriodicos() { try { return JSON.parse(localStorage.getItem('gds_periodicos')) || PERIODICOS_DEFAULT; } catch(e) { return PERIODICOS_DEFAULT; } }
function getDocumentos() { try { return JSON.parse(localStorage.getItem('gds_documentos')) || DOCUMENTOS_DEFAULT; } catch(e) { return DOCUMENTOS_DEFAULT; } }

let filtroActual = 'all';

function renderNoticias(cat) {
  const grid = document.getElementById('noticiasGrid');
  const todas = getNoticias();
  const filtradas = cat === 'all' ? todas : todas.filter(n => n.cat === cat);
  grid.innerHTML = filtradas.map((n, i) => `
    <div class="noticia-full-card ${n.featured && cat === 'all' && i === 0 ? 'nfc-featured' : ''}" onclick="verDetalle('${n.id}')">
      <div class="nfc-img">
        <img src="${n.img || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=700&q=80'}" alt="${n.titulo}" loading="lazy"/>
        <div class="nfc-img-overlay"></div>
      </div>
      <div class="nfc-body">
        <span class="nfc-tag">${n.cat}</span>
        <h3 class="nfc-titulo">${n.titulo}</h3>
        <p class="nfc-extracto">${n.extracto}</p>
        <div class="nfc-footer">
          <span class="nfc-fecha">📅 ${n.fecha}</span>
          <span class="nfc-leer">Leer más →</span>
        </div>
      </div>
      ${adminMode ? `<div style="display:flex;gap:6px;padding:10px 22px 14px;border-top:1px solid var(--fondo-2)">
        <button class="admin-btn-edit" onclick="event.stopPropagation();editarNoticia('${n.id}')">✏️ Editar</button>
        <button class="admin-btn-del" onclick="event.stopPropagation();eliminarNoticia('${n.id}')">🗑️ Eliminar</button>
      </div>` : ''}
    </div>
  `).join('');
  if (adminMode) {
    const addBtn = document.createElement('div');
    addBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;min-height:200px;';
    addBtn.innerHTML = '<button class="admin-add-btn" style="max-width:200px" onclick="mostrarFormNoticia()">+ Nueva Noticia</button>';
    grid.appendChild(addBtn);
  }
  gdsRevealInit(grid, '.noticia-full-card', 70);
  gdsAttachTiltAll(grid, '.noticia-full-card', 4);
}

function renderPeriodicos() {
  const grid = document.getElementById('periodicosGrid');
  const items = getPeriodicos();
  if (!items.length) { grid.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:30px;grid-column:span 4">No hay periódicos disponibles aún.</div>'; return; }
  grid.innerHTML = items.map(p => `
    <div class="periodico-card" onclick="window.open('${p.url}','_blank')">
      <div class="periodico-cover">
        ${p.img ? `<img src="${p.img}" alt="${p.nombre}"/>` : '<div class="periodico-cover-placeholder">📰</div>'}
      </div>
      <div class="periodico-info">
        <strong>${p.nombre}</strong>
        <div class="periodico-year">${p.anio}</div>
        <div style="margin-top:6px;font-size:11px;color:var(--celeste);font-weight:600">Descargar →</div>
      </div>
      ${adminMode ? `<div style="display:flex;gap:4px;padding:6px 10px 10px">
        <button class="admin-btn-edit" onclick="event.stopPropagation();editarPeriodico('${p.id}')">✏️</button>
        <button class="admin-btn-del" onclick="event.stopPropagation();eliminarPeriodico('${p.id}')">🗑️</button>
      </div>` : ''}
    </div>`).join('');
  gdsRevealInit(grid, '.periodico-card', 60);
}

function renderDocumentos() {
  const grid = document.getElementById('documentosGrid');
  const items = getDocumentos();
  const icons = {PDF:'📄',Word:'📝',Excel:'📊',Otro:'📎'};
  if (!items.length) { grid.innerHTML = '<div style="color:var(--muted);font-size:13px;grid-column:span 2;text-align:center;padding:30px">No hay documentos disponibles.</div>'; return; }
  grid.innerHTML = items.map(d => `
    <div>
      <a href="${d.url}" target="_blank" class="doc-card">
        <div class="doc-icon">${icons[d.tipo] || '📎'}</div>
        <div class="doc-info">
          <strong>${d.nombre}</strong>
          <span>${d.desc} · ${d.tipo}</span>
        </div>
        <div class="doc-download">Descargar</div>
      </a>
      ${adminMode ? `<div style="display:flex;gap:6px;margin-top:6px;padding:0 2px">
        <button class="admin-btn-edit" onclick="editarDocumento('${d.id}')">✏️ Editar</button>
        <button class="admin-btn-del" onclick="eliminarDocumentoItem('${d.id}')">🗑️ Eliminar</button>
      </div>` : ''}
    </div>`).join('');
  gdsRevealInit(grid, '.doc-card', 55);
}

function renderAll() { renderNoticias(filtroActual); renderPeriodicos(); renderDocumentos(); }

async function verDetalle(id) {
  let n = getNoticias().find(x => x.id == id);
  if (!n) return;
  if (typeof GDS !== 'undefined' && typeof GDS.getNoticias === 'function') {
    try {
      const full = await GDS.getNoticias(id);
      if (full) n = { ...n, ...full };
    } catch (e) { console.warn('GDS: no se pudo cargar el detalle completo, se muestra el resumen', e); }
  }
  const cuerpo = n.cuerpo || n.contenido || n.texto || (n.extracto ? `<p>${n.extracto}</p>` : '');
  document.getElementById('detalleContent').innerHTML = `
    <span class="detalle-tag">${n.cat}</span>
    <h1 class="detalle-titulo">${n.titulo}</h1>
    <div class="detalle-meta"><span>📅 ${n.fecha}</span><span>·</span><span>Gimnasio Domingo Savio</span></div>
    <img src="${n.img || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=820&q=80'}" alt="${n.titulo}" class="detalle-img"/>
    <div class="detalle-cuerpo">${cuerpo}</div>
    <div class="detalle-acciones">
      <a href="inscripciones.html" class="btn-primary">Ver inscripciones</a>
      <a href="https://wa.me/573157859157?text=Hola, quiero más información." target="_blank" class="btn-whatsapp">Contactar por WhatsApp</a>
      <button onclick="volverLista()" class="btn-secondary">Ver más noticias</button>
    </div>`;
  document.getElementById('vistaLista').classList.add('hidden');
  document.getElementById('noticiaDetalle').classList.add('active');
  window.scrollTo({ top: 200, behavior: 'smooth' });
}
function volverLista() {
  document.getElementById('noticiaDetalle').classList.remove('active');
  document.getElementById('vistaLista').classList.remove('hidden');
  window.scrollTo({ top: 300, behavior: 'smooth' });
}

document.querySelectorAll('.filtro-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtroActual = btn.dataset.cat;
    renderNoticias(filtroActual);
    document.getElementById('noticiaDetalle').classList.remove('active');
    document.getElementById('vistaLista').classList.remove('hidden');
  });
});

function mostrarFormNoticia(preData) {
  document.getElementById('editorNoticiaTitle').textContent = preData ? '✏️ Editar Noticia' : '📰 Nueva Noticia';
  document.getElementById('nTitulo').value = preData ? preData.titulo : '';
  document.getElementById('nCat').value = preData ? preData.cat : 'Academico';
  document.getElementById('nExtracto').value = preData ? preData.extracto : '';
  document.getElementById('nCuerpo').value = preData ? (preData.cuerpo || '').replace(/<[^>]*>/g, '') : '';
  document.getElementById('nImg').value = preData ? preData.img : '';
  document.getElementById('nFecha').value = preData ? preData.fecha : '';
  document.getElementById('nFeatured').value = preData && preData.featured ? '1' : '';
  document.getElementById('nEditId').value = preData ? preData.id : '';
  document.getElementById('editorNoticiaOverlay').classList.add('open');
}
function editarNoticia(id) { mostrarFormNoticia(getNoticias().find(n => n.id == id)); }
function eliminarNoticia(id) {
  if (!confirm('¿Eliminar esta noticia?')) return;
  saveNoticias(getNoticias().filter(n => n.id != id));
  renderNoticias(filtroActual);
}
function guardarNoticia() {
  const titulo = document.getElementById('nTitulo').value.trim();
  if (!titulo) { alert('El título es obligatorio'); return; }
  const noticia = {
    id: document.getElementById('nEditId').value || 'n_' + Date.now(),
    titulo, cat: document.getElementById('nCat').value,
    extracto: document.getElementById('nExtracto').value.trim(),
    cuerpo: '<p>' + document.getElementById('nCuerpo').value.trim().split('\n\n').join('</p><p>') + '</p>',
    img: document.getElementById('nImg').value.trim() || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=900&q=80',
    fecha: document.getElementById('nFecha').value.trim() || 'Abril 2026',
    featured: document.getElementById('nFeatured').value === '1'
  };
  const todas = getNoticias();
  const idx = todas.findIndex(n => n.id == noticia.id);
  if (idx !== -1) todas[idx] = noticia; else todas.unshift(noticia);
  saveNoticias(todas);
  document.getElementById('editorNoticiaOverlay').classList.remove('open');
  renderNoticias(filtroActual);
}

function mostrarFormPeriodico(preData) {
  document.getElementById('pNombre').value = preData ? preData.nombre : '';
  document.getElementById('pAnio').value = preData ? preData.anio : '2026';
  document.getElementById('pImg').value = preData ? preData.img : '';
  document.getElementById('pUrl').value = preData ? preData.url : '#';
  document.getElementById('pEditId').value = preData ? preData.id : '';
  document.getElementById('editorPeriodicoOverlay').classList.add('open');
}
function editarPeriodico(id) { mostrarFormPeriodico(getPeriodicos().find(p => p.id == id)); }
function eliminarPeriodico(id) {
  if (!confirm('¿Eliminar este periódico?')) return;
  savePeriodicos(getPeriodicos().filter(p => p.id != id));
  renderPeriodicos();
}
function guardarPeriodico() {
  const nombre = document.getElementById('pNombre').value.trim();
  if (!nombre) { alert('El nombre es obligatorio'); return; }
  const per = {
    id: document.getElementById('pEditId').value || 'p_' + Date.now(),
    nombre, anio: document.getElementById('pAnio').value.trim(),
    img: document.getElementById('pImg').value.trim(),
    url: document.getElementById('pUrl').value.trim() || '#'
  };
  const todos = getPeriodicos();
  const idx = todos.findIndex(p => p.id == per.id);
  if (idx !== -1) todos[idx] = per; else todos.unshift(per);
  savePeriodicos(todos);
  document.getElementById('editorPeriodicoOverlay').classList.remove('open');
  renderPeriodicos();
}

function mostrarFormDocumento(preData) {
  document.getElementById('docNombre').value = preData ? preData.nombre : '';
  document.getElementById('docDesc').value = preData ? preData.desc : '';
  document.getElementById('docTipo').value = preData ? preData.tipo : 'PDF';
  document.getElementById('docUrl').value = preData ? preData.url : '#';
  document.getElementById('docEditId').value = preData ? preData.id : '';
  document.getElementById('editorDocumentoOverlay').classList.add('open');
}
function editarDocumento(id) { mostrarFormDocumento(getDocumentos().find(d => d.id == id)); }
function eliminarDocumentoItem(id) {
  if (!confirm('¿Eliminar este documento?')) return;
  saveDocumentos(getDocumentos().filter(d => d.id != id));
  renderDocumentos();
}
const MAX_IMG_SIZE = 800 * 1024;
const MAX_PDF_SIZE = 2 * 1024 * 1024;

function showFileMsg(infoId, type, msg) {
  const el = document.getElementById(infoId);
  if (!el) return;
  el.innerHTML = `<span class="file-info-${type === 'ok' ? 'success' : 'error'}">${type === 'ok' ? '✅' : '⚠️'} ${msg}</span>`;
}

function handleImgUpload(input, imgFieldId, previewId) {
  const file = input.files[0];
  if (!file) return;
  const infoId = previewId + '_info';

  if (file.size > MAX_IMG_SIZE) {
    showFileMsg(infoId || previewId, 'error',
      `Imagen demasiado grande (${(file.size/1024).toFixed(0)} KB). Máx 800 KB. Usa una URL externa en el campo de arriba.`);
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      document.getElementById(imgFieldId).value = e.target.result;
      const preview = document.getElementById(previewId);
      if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
      showFileMsg(infoId || previewId, 'ok', `${file.name} (${(file.size/1024).toFixed(0)} KB) — listo.`);
    } catch(err) {
      showFileMsg(infoId || previewId, 'error', 'Error al leer la imagen. Intenta con una URL externa.');
    }
  };
  reader.onerror = () => showFileMsg(infoId || previewId, 'error', 'No se pudo leer el archivo.');
  reader.readAsDataURL(file);
}

function handlePdfUpload(input, urlFieldId, infoId) {
  const file = input.files[0];
  if (!file) return;

  if (file.size > MAX_PDF_SIZE) {
    showFileMsg(infoId, 'error',
      `PDF demasiado grande (${(file.size/1024).toFixed(0)} KB). Máx 2 MB. Sube el archivo a Google Drive y pega el enlace en el campo de URL.`);
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      document.getElementById(urlFieldId).value = e.target.result;
      showFileMsg(infoId, 'ok', `${file.name} (${(file.size/1024).toFixed(0)} KB) cargado.`);
    } catch(err) {
      showFileMsg(infoId, 'error', 'Error al leer el PDF. Usa un enlace de Google Drive en el campo de URL.');
      input.value = '';
    }
  };
  reader.onerror = () => showFileMsg(infoId, 'error', 'No se pudo leer el archivo.');
  reader.readAsDataURL(file);
}

function saveNoticias(d) { /* persistencia por API (bridge) */ }
function savePeriodicos(d) { /* persistencia por API (bridge) */ }
function saveDocumentos(d) { /* persistencia por API (bridge) */ }

function guardarDocumento() {
  const nombre = document.getElementById('docNombre').value.trim();
  if (!nombre) { alert('El nombre es obligatorio'); return; }
  const doc = {
    id: document.getElementById('docEditId').value || 'doc_' + Date.now(),
    nombre, desc: document.getElementById('docDesc').value.trim(),
    tipo: document.getElementById('docTipo').value,
    url: document.getElementById('docUrl').value.trim() || '#'
  };
  const todos = getDocumentos();
  const idx = todos.findIndex(d => d.id == doc.id);
  if (idx !== -1) todos[idx] = doc; else todos.push(doc);
  saveDocumentos(todos);
  document.getElementById('editorDocumentoOverlay').classList.remove('open');
  renderDocumentos();
}

const sdBtn = document.getElementById('soyDominguinoBtn');
const sdMenu = document.getElementById('soyDominguinoMenu');
if (sdBtn && sdMenu) {
  sdBtn.addEventListener('click', (e) => { e.preventDefault(); sdMenu.classList.toggle('open'); });
  document.addEventListener('click', (e) => {
    if (!sdBtn.contains(e.target) && !sdMenu.contains(e.target)) sdMenu.classList.remove('open');
  });
}

const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 60), {passive:true});
window.addEventListener('scroll', function(){
  var nb = document.getElementById('navbar');
  if(nb) nb.classList.toggle('scrolled', window.scrollY > 10);
  var wf = document.getElementById('whatsappFloat');
  if(wf) wf.classList.toggle('visible', window.scrollY > 200);
});
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
    if (!document.getElementById('notAdminLoginOverlay') || document.getElementById('notAdminLoginOverlay').style.display === 'none') { document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : ''; }
  });
  document.addEventListener('click', (e) => {
    if (!navbar.contains(e.target)) { hamburger.classList.remove('open'); navLinks.classList.remove('open'); }
  });
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.admin-editor-overlay').forEach(o => o.classList.remove('open'));
  }
});

renderAll();
if (adminMode) {
  document.getElementById('btnAddPeriodico').style.display = 'inline-flex';
  document.getElementById('btnAddDocumento').style.display = 'inline-flex';
}
