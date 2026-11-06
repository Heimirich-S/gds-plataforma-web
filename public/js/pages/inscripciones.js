function toggleInscPassVis() {
  const p = document.getElementById('inscAdminPass');
  const b = document.getElementById('inscPassBtn');
  p.type = p.type === 'password' ? 'text' : 'password';
  b.textContent = p.type === 'password' ? '👁' : '🙈';
}
function cerrarInscAdminLogin() {
  var ov = document.getElementById('adminLoginInsc');
  if (ov) ov.classList.remove('open');
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  var se = document.getElementById('inscStepEmail');
  var so = document.getElementById('inscStepOTP');
  if (se) se.style.display = 'block';
  if (so) so.style.display = 'none';
  var em = document.getElementById('inscAdminEmail');
  var pw = document.getElementById('inscAdminPass');
  if (em) em.value = '';
  if (pw) pw.value = '';
  var err = document.getElementById('inscLoginError');
  if (err) err.style.display = 'none';
}
function cerrarInscAdminPanel() {
  var ov = document.getElementById('inscAdminPanelOverlay');
  if (ov) ov.classList.remove('open');
  document.body.classList.remove('modal-open');
}
function abrirPanelAdmin() {
  var ov = document.getElementById('inscAdminPanelOverlay');
  if (ov) { ov.classList.add('open'); document.body.classList.add('modal-open'); }
}
async function adminCheckAuthInsc() {
  if (!gdsAdminHabilitado()) return;
  try {
    const s = await GDS.admin.session();
    if (s && s.authenticated) { sessionStorage.setItem('gds_admin','true'); document.getElementById('inscAdminToolbar').classList.add('visible'); var panel = document.getElementById('inscAdminPanelOverlay'); if (panel) { panel.classList.add('open'); document.body.classList.add('modal-open'); } return; }
  } catch(e) {}
  sessionStorage.removeItem('gds_admin');
  var ov = document.getElementById('adminLoginInsc');
  if (ov) { ov.classList.add('open'); document.body.classList.add('modal-open'); }
  const d = getInscAttemptData();
  if (d.blockedUntil && Date.now() < d.blockedUntil) startInscBlockCountdown(d.blockedUntil);
  setTimeout(() => { var el = document.getElementById('inscAdminEmail'); if(el) el.focus(); }, 300);
  return;
}

'use strict';

/* ── FAQ Accordion ── */
document.querySelectorAll('.faq-question').forEach(q => {
  q.addEventListener('click', () => {
    const isOpen = q.classList.contains('open');
    document.querySelectorAll('.faq-question').forEach(x => {
      x.classList.remove('open');
      x.nextElementSibling.classList.remove('open');
    });
    if (!isOpen) { q.classList.add('open'); q.nextElementSibling.classList.add('open'); }
  });
});

/* ── TOAST ── */
function showToastInsc(msg, type='success') {
  let t = document.getElementById('gds-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'gds-toast';
    t.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(80px);background:var(--azul);color:white;padding:12px 24px;border-radius:99px;font-size:0.8125rem;font-weight:600;z-index:99999;transition:transform .3s ease;box-shadow:0 8px 24px rgba(0,0,0,.25);white-space:nowrap;';
    document.body.appendChild(t);
  }
  t.textContent = (type === 'success' ? '✅ ' : '❌ ') + msg;
  t.style.background = type === 'success' ? '#132950' : '#c0392b';
  t.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => { t.style.transform = 'translateX(-50%) translateY(80px)'; }, 3500);
}

/* ── ADMIN LOGIN — OTP + BLOQUEO IP ── */
const INSC_ADMIN_CREDS = []; // Credenciales retiradas: la autenticación se realiza en el servidor.
const INSC_MAX_INTENTOS = 4;
const INSC_BLOCK_MS = 10 * 60 * 1000;
let _inscOtp = null, _inscOtpExpiry = null, _inscPendingEmail = null;
let inscBlockTimer = null;

function getInscAttemptData() {
  try { return JSON.parse(localStorage.getItem('gds_insc_attempts') || '{}'); } catch(e) { return {}; }
}
function saveInscAttemptData(d) { /* persistencia por API (bridge) */ }

function isInscBlocked() {
  const d = getInscAttemptData();
  if (!d.blockedUntil) return false;
  if (Date.now() < d.blockedUntil) return true;
  saveInscAttemptData({});
  return false;
}

function registerInscFailed() {
  const d = getInscAttemptData();
  d.intentos = (d.intentos || 0) + 1;
  if (d.intentos >= INSC_MAX_INTENTOS) { d.blockedUntil = Date.now() + INSC_BLOCK_MS; d.intentos = 0; }
  saveInscAttemptData(d);
  return d;
}

function startInscBlockCountdown(until) {
  const el = document.getElementById('inscBlockCountdown');
  const errEl = document.getElementById('inscBlockError');
  if (!el || !errEl) return;
  errEl.style.display = 'block';
  document.getElementById('inscStepEmail').style.display = 'none';
  clearInterval(inscBlockTimer);
  inscBlockTimer = setInterval(() => {
    const rem = until - Date.now();
    if (rem <= 0) {
      clearInterval(inscBlockTimer);
      errEl.style.display = 'none';
      document.getElementById('inscStepEmail').style.display = 'block';
      saveInscAttemptData({});
      return;
    }
    const m = Math.floor(rem / 60000);
    const s = Math.floor((rem % 60000) / 1000);
    el.textContent = m + ':' + String(s).padStart(2, '0');
  }, 1000);
}

function generateInscOTP() { return String(Math.floor(100000 + Math.random() * 900000)); }

function getInscAdminOTPEmail() { return 'gimnasiodomingosavio3@gmail.com'; }

/* ── ENV͍O REAL DEL OTP POR EMAILJS ── */
async function enviarInscOTPEmail(code) {
  const SERVICE_ID  = 'service_dapdvr6';
  const TEMPLATE_ID = 'template_0rtnkuc';
  const PUBLIC_KEY  = 'A8_-VTv06yO5YWU7-';
  emailjs.init({ publicKey: PUBLIC_KEY });
  await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
    to_email : getInscAdminOTPEmail(),
    otp_code : code,
    expiry   : '10 minutos',
    timestamp: new Date().toLocaleString('es-CO')
  });
}

/* ── NOTIFICACI͓N VISUAL — nunca muestra el código ── */
function mostrarInscEstadoOTP(exito) {
  let prev = document.getElementById('inscOtpEmailPreview');
  if (!prev) {
    prev = document.createElement('div');
    prev.id = 'inscOtpEmailPreview';
    prev.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;max-width:340px;background:white;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden;font-family:inherit;';
    document.body.appendChild(prev);
  }
  const destino = getInscAdminOTPEmail();
  if (exito) {
    prev.innerHTML = `
      <div style="background:linear-gradient(135deg,#132950,#1e4a90);padding:16px 20px;color:white;display:flex;align-items:center;gap:12px;">
        <span style="font-size:24px;flex-shrink:0">📨</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700">Código enviado</div>
          <div style="font-size:11px;opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Revisa: <strong>${destino}</strong></div>
        </div>
        <button onclick="document.getElementById('inscOtpEmailPreview').remove()" style="background:rgba(255,255,255,.15);border:none;color:white;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:12px;flex-shrink:0;line-height:22px">✕</button>
      </div>
      <div style="padding:12px 20px;font-size:12px;color:#555;">Válido por <strong>10 minutos</strong>. Si no aparece en bandeja de entrada, revisa spam.</div>`;
  } else {
    prev.innerHTML = `
      <div style="background:linear-gradient(135deg,#c0392b,#922b21);padding:16px 20px;color:white;display:flex;align-items:center;gap:12px;">
        <span style="font-size:24px;flex-shrink:0">⚠️</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700">Error al enviar el código</div>
          <div style="font-size:11px;opacity:.85">Verifica la configuración de EmailJS</div>
        </div>
        <button onclick="document.getElementById('inscOtpEmailPreview').remove()" style="background:rgba(255,255,255,.15);border:none;color:white;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:12px;flex-shrink:0;line-height:22px">✕</button>
      </div>
      <div style="padding:12px 20px;font-size:12px;color:#555;">No se pudo enviar a <strong>${destino}</strong>. Comprueba las credenciales EmailJS y que el template tenga las variables correctas.</div>`;
  }
  setTimeout(() => { const el = document.getElementById('inscOtpEmailPreview'); if (el) el.remove(); }, 9000);
}

async function doInscStep1() {
  if (isInscBlocked()) {
    const d = getInscAttemptData();
    startInscBlockCountdown(d.blockedUntil);
    return;
  }
  const email = document.getElementById('inscAdminEmail').value.trim().toLowerCase();
  const pass = document.getElementById('inscAdminPass').value.trim();
  const errEl = document.getElementById('inscLoginError');
  errEl.style.display = 'none';
  try {
    await GDS.admin.login(email, pass);
  } catch (e) {
    const d = registerInscFailed();
    if (d.blockedUntil) { startInscBlockCountdown(d.blockedUntil); return; }
    errEl.textContent = '⚠️ ⚠️ Credenciales incorrectas. Intentos restantes: ' + (INSC_MAX_INTENTOS - (d.intentos || 0));
    errEl.style.display = 'block';
    document.getElementById('inscAdminPass').value = '';
    return;
  }

  _inscPendingEmail = email;
  _inscOtp = generateInscOTP();
  _inscOtpExpiry = Date.now() + 10 * 60 * 1000;

  const continueBtn = document.querySelector('#inscStepEmail .btn-primary');
  if (continueBtn) { continueBtn.disabled = true; continueBtn.textContent = 'Enviando código...'; }

  try {
    await enviarInscOTPEmail(_inscOtp);
    mostrarInscEstadoOTP(true);
  } catch (err) {
    _inscOtp = null; _inscOtpExpiry = null;
    mostrarInscEstadoOTP(false);
    if (continueBtn) { continueBtn.disabled = false; continueBtn.textContent = 'Continuar →'; }
    return;
  }

  if (continueBtn) { continueBtn.disabled = false; continueBtn.textContent = 'Continuar →'; }

  document.getElementById('inscStepEmail').style.display = 'none';
  document.getElementById('inscStepOTP').style.display = 'block';
  document.getElementById('inscEmailShown').textContent = getInscAdminOTPEmail();
  document.getElementById('inscOTPInput').value = '';
  document.getElementById('inscOTPError').style.display = 'none';
  setTimeout(() => document.getElementById('inscOTPInput').focus(), 100);
}

function doInscStep2() {
  const input = document.getElementById('inscOTPInput').value.trim();
  const errEl = document.getElementById('inscOTPError');
  errEl.style.display = 'none';
  if (!_inscOtp || Date.now() > _inscOtpExpiry) {
    errEl.textContent = '⚠️ El código expiró. Solicita uno nuevo.';
    errEl.style.display = 'block';
    return;
  }
  if (input !== _inscOtp) {
    const d = registerInscFailed();
    errEl.textContent = '⚠️ Código incorrecto';
    errEl.style.display = 'block';
    if (d.blockedUntil) { cerrarInscAdminLogin(); startInscBlockCountdown(d.blockedUntil); }
    return;
  }
  _inscOtp = null; _inscOtpExpiry = null;
  saveInscAttemptData({});
  sessionStorage.setItem('gds_admin', 'true');
  const prev = document.getElementById('inscOtpPreview');
  if (prev) prev.remove();
  cerrarInscLogin();
  document.getElementById('inscAdminToolbar').classList.add('visible');
  document.getElementById('inscAdminPanelOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  showToastInsc('Acceso concedido. Modo admin activado.');
}

function volverInscStep1() {
  document.getElementById('inscStepOTP').style.display = 'none';
  document.getElementById('inscStepEmail').style.display = 'block';
  _inscOtp = null; _inscOtpExpiry = null;
}

function cerrarInscLogin() {
  document.getElementById('adminLoginInsc').classList.remove('open');
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  document.getElementById('inscStepOTP').style.display = 'none';
  document.getElementById('inscStepEmail').style.display = 'block';
  if (document.getElementById('inscAdminEmail')) document.getElementById('inscAdminEmail').value = '';
  if (document.getElementById('inscAdminPass')) document.getElementById('inscAdminPass').value = '';
}

function isAdminLogged() { return sessionStorage.getItem('gds_admin') === 'true'; }

async function adminLogoutInsc() {
  try {
    await GDS.admin.logout();
    sessionStorage.removeItem('gds_admin');
    document.getElementById('inscAdminToolbar').classList.remove('visible');
    document.body.classList.remove('admin-edit-mode');
    editMode = false;
    cerrarInscAdminPanel();
  } catch(e) {
    alert('No se pudo cerrar la sesión: ' + (e.message || 'Error desconocido'));
  }
}

function cerrarInscAdminPanel() {
  document.getElementById('inscAdminPanelOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

if (new URLSearchParams(window.location.search).get('admin') === '1' && isAdminLogged()) {
  document.getElementById('inscAdminToolbar').classList.add('visible');
}

/* ── ADMIN TOOLBAR BOTONES ── */
let editMode = false;

function abrirPanelAdmin() {
  document.getElementById('inscAdminPanelOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function abrirEditorCostos() {
  cerrarInscAdminPanel();
  toggleEditMode();
}

function abrirEditorPostulados() {
  cerrarInscAdminPanel();
  renderPostuladosList();
  document.getElementById('editorPostuladosOverlay').classList.add('open');
}

/* ── POSTULADOS ── */
function getPostulados() {
  try { return JSON.parse(localStorage.getItem('gds_postulados') || '[]'); } catch(e) { return []; }
}
function savePostulado(data) {
  try {
    const list = getPostulados();
    data.id = 'p_' + Date.now();
    data.fecha_registro = new Date().toLocaleString('es-CO');
    list.unshift(data);
    localStorage.setItem('gds_postulados', JSON.stringify(list));
  } catch(e) {}
}
function renderPostuladosList() {
  const list = document.getElementById('postuladosList');
  const posts = getPostulados();
  if (!posts.length) { list.innerHTML = '<div style="text-align:center;color:var(--muted);padding:30px;font-size:13px">No hay postulados aún.</div>'; return; }
  list.innerHTML = posts.map(p => `
    <div style="border-bottom:1px solid rgba(0,174,238,.1);padding:12px 0;font-size:12px;">
      <strong>${p.nombres || ''} ${p.apellidos || ''}</strong> — ${p.grado || ''}<br>
      <span style="color:var(--muted)">${p.fecha_registro || ''} · ${p.email || ''} · ${p.tel_principal || ''}</span>
    </div>`).join('');
}
function limpiarPostulados() {
  if (!confirm('¿Eliminar todos los postulados? Esta acción no se puede deshacer.')) return;
  localStorage.removeItem('gds_postulados');
  renderPostuladosList();
  showToastInsc('Postulados eliminados');
}

/* ── ͚TILES ESCOLARES (reemplaza la tabla de Costos) ──
   Estructura agrupada en 4 niveles: Jardín, Primaria, Secundaria y
   Bachillerato. Cada grado tiene una lista de útiles con cantidad
   (sin precio: el precio se consulta por WhatsApp desde el modal).
   Se muestra como tabs por nivel + tarjetas de grado; al hacer clic
   en un grado se abre un modal con el detalle, sin desplazar el
   resto de la página.
   ── */
const UTILES_DEFAULT = [
  { grupo:'jardin', grupoLabel:'Jardín (Preescolar)', icono:'jardin', slug:'pj', nombre:'Prejardín', items:[
    {item:'Morral', cantidad:'1'},
    {item:'Lonchera', cantidad:'1'},
    {item:'Cartuchera', cantidad:'1'},
    {item:'Colores 12 unidades', cantidad:'1 caja'},
    {item:'Plastilina', cantidad:'1 caja'},
    {item:'Cuaderno cosido', cantidad:'2'},
  ]},
  { grupo:'jardin', grupoLabel:'Jardín (Preescolar)', icono:'jardin', slug:'jd', nombre:'Jardín', items:[
    {item:'Morral', cantidad:'1'},
    {item:'Lonchera', cantidad:'1'},
    {item:'Cartuchera', cantidad:'1'},
    {item:'Colores 24 unidades', cantidad:'1 caja'},
    {item:'Plastilina', cantidad:'1 caja'},
    {item:'Cuaderno cosido', cantidad:'3'},
  ]},
  { grupo:'jardin', grupoLabel:'Jardín (Preescolar)', icono:'jardin', slug:'tr', nombre:'Transición', items:[
    {item:'Morral', cantidad:'1'},
    {item:'Lonchera', cantidad:'1'},
    {item:'Cartuchera', cantidad:'1'},
    {item:'Colores 24 unidades', cantidad:'1 caja'},
    {item:'Cuaderno cosido', cantidad:'4'},
    {item:'Tijeras punta roma', cantidad:'1'},
  ]},
  { grupo:'primaria', grupoLabel:'Primaria', icono:'primaria', slug:'p1', nombre:'1° (Primero)', items:[
    {item:'Cuaderno cuadriculado 100 hojas', cantidad:'5'},
    {item:'Diccionario escolar', cantidad:'1'},
    {item:'Colores 24 unidades', cantidad:'1 caja'},
    {item:'Cartuchera surtida', cantidad:'1'},
    {item:'Agenda escolar institucional', cantidad:'1'},
  ]},
  { grupo:'primaria', grupoLabel:'Primaria', icono:'primaria', slug:'p2', nombre:'2° (Segundo)', items:[
    {item:'Cuaderno cuadriculado 100 hojas', cantidad:'5'},
    {item:'Diccionario escolar', cantidad:'1'},
    {item:'Colores 24 unidades', cantidad:'1 caja'},
    {item:'Cartuchera surtida', cantidad:'1'},
    {item:'Agenda escolar institucional', cantidad:'1'},
  ]},
  { grupo:'primaria', grupoLabel:'Primaria', icono:'primaria', slug:'p3', nombre:'3° (Tercero)', items:[
    {item:'Cuaderno cuadriculado 100 hojas', cantidad:'6'},
    {item:'Diccionario escolar', cantidad:'1'},
    {item:'Colores 24 unidades', cantidad:'1 caja'},
    {item:'Cartuchera surtida', cantidad:'1'},
    {item:'Agenda escolar institucional', cantidad:'1'},
  ]},
  { grupo:'primaria', grupoLabel:'Primaria', icono:'primaria', slug:'p4', nombre:'4° (Cuarto)', items:[
    {item:'Cuaderno cuadriculado 100 hojas', cantidad:'6'},
    {item:'Diccionario escolar', cantidad:'1'},
    {item:'Calculadora básica', cantidad:'1'},
    {item:'Cartuchera surtida', cantidad:'1'},
    {item:'Agenda escolar institucional', cantidad:'1'},
  ]},
  { grupo:'primaria', grupoLabel:'Primaria', icono:'primaria', slug:'p5', nombre:'5° (Quinto)', items:[
    {item:'Cuaderno cuadriculado 100 hojas', cantidad:'6'},
    {item:'Diccionario escolar', cantidad:'1'},
    {item:'Calculadora básica', cantidad:'1'},
    {item:'Cartuchera surtida', cantidad:'1'},
    {item:'Agenda escolar institucional', cantidad:'1'},
  ]},
  { grupo:'secundaria', grupoLabel:'Secundaria', icono:'secundaria', slug:'s6', nombre:'6° (Sexto)', items:[
    {item:'Cuaderno cuadriculado 100 hojas', cantidad:'7'},
    {item:'Calculadora científica', cantidad:'1'},
    {item:'Juego de geometría', cantidad:'1'},
    {item:'Agenda escolar institucional', cantidad:'1'},
  ]},
  { grupo:'secundaria', grupoLabel:'Secundaria', icono:'secundaria', slug:'s7', nombre:'7° (Séptimo)', items:[
    {item:'Cuaderno cuadriculado 100 hojas', cantidad:'7'},
    {item:'Calculadora científica', cantidad:'1'},
    {item:'Juego de geometría', cantidad:'1'},
    {item:'Agenda escolar institucional', cantidad:'1'},
  ]},
  { grupo:'secundaria', grupoLabel:'Secundaria', icono:'secundaria', slug:'s8', nombre:'8° (Octavo)', items:[
    {item:'Cuaderno cuadriculado 100 hojas', cantidad:'7'},
    {item:'Calculadora científica', cantidad:'1'},
    {item:'Juego de geometría', cantidad:'1'},
    {item:'Agenda escolar institucional', cantidad:'1'},
  ]},
  { grupo:'secundaria', grupoLabel:'Secundaria', icono:'secundaria', slug:'s9', nombre:'9° (Noveno)', items:[
    {item:'Cuaderno cuadriculado 100 hojas', cantidad:'7'},
    {item:'Calculadora científica', cantidad:'1'},
    {item:'Juego de geometría', cantidad:'1'},
    {item:'Agenda escolar institucional', cantidad:'1'},
  ]},
  { grupo:'bachillerato', grupoLabel:'Bachillerato (Media)', icono:'bachillerato', slug:'m10', nombre:'10° (Décimo)', items:[
    {item:'Cuaderno cuadriculado 100 hojas', cantidad:'7'},
    {item:'Calculadora científica', cantidad:'1'},
    {item:'Agenda escolar institucional', cantidad:'1'},
  ]},
  { grupo:'bachillerato', grupoLabel:'Bachillerato (Media)', icono:'bachillerato', slug:'m11', nombre:'11° (Undécimo)', items:[
    {item:'Cuaderno cuadriculado 100 hojas', cantidad:'7'},
    {item:'Calculadora científica', cantidad:'1'},
    {item:'Agenda escolar institucional', cantidad:'1'},
  ]},
];

const GRUPOS_ORDEN = [
  {key:'jardin', label:'Jardín', color:'var(--amarillo)'},
  {key:'primaria', label:'Primaria', color:'var(--celeste)'},
  {key:'secundaria', label:'Secundaria', color:'var(--verde)'},
  {key:'bachillerato', label:'Bachillerato', color:'var(--azul-medio)'}
];

/* Iconos SVG estilo línea (mismo lenguaje visual que Becas y Descuentos) */
const UTILES_ICONOS = {
  jardin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
  primaria: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  secundaria: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  bachillerato: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.5 2.5 3 6 3s6-1.5 6-3v-5"/><path d="M22 10v6"/></svg>',
  mochila: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 8V6a4 4 0 0 1 8 0v2"/><rect x="5" y="8" width="14" height="13" rx="2"/><rect x="9" y="11" width="6" height="4" rx="1"/></svg>',
  cerrar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.9 11.89L4 20l4.24-1.11a7.9 7.9 0 0 0 3.8.97h.01a7.94 7.94 0 0 0 5.55-13.54zm-5.55 12.2a6.6 6.6 0 0 1-3.36-.92l-.24-.14-2.5.66.67-2.44-.16-.25a6.59 6.59 0 0 1 10.2-8.2 6.55 6.55 0 0 1 1.94 4.67 6.6 6.6 0 0 1-6.55 6.62zm3.6-4.93c-.2-.1-1.17-.58-1.35-.64s-.31-.1-.44.1-.5.64-.61.77-.23.15-.42.05a5.4 5.4 0 0 1-1.6-.98 6 6 0 0 1-1.1-1.37c-.12-.2 0-.3.09-.4s.2-.23.29-.35a1.3 1.3 0 0 0 .2-.34.37.37 0 0 0 0-.35c-.05-.1-.44-1.06-.6-1.45s-.32-.33-.44-.34h-.38a.72.72 0 0 0-.53.25 2.2 2.2 0 0 0-.68 1.63c0 .96.7 1.89.8 2.02s1.37 2.1 3.33 2.94a11.4 11.4 0 0 0 1.11.41 2.68 2.68 0 0 0 1.23.08c.37-.06 1.17-.48 1.34-.94s.17-.86.12-.94-.19-.14-.4-.24z"/></svg>'
};

let utilesTabActual = 'jardin';

function getUtiles() {
  try { const d = localStorage.getItem('gds_utiles_escolares'); return d ? JSON.parse(d) : UTILES_DEFAULT; } catch(e) { return UTILES_DEFAULT; }
}
function saveUtiles(d) { /* persistencia por API (bridge) */ }

function renderUtilesEscolares() {
  const tabsCont = document.getElementById('utilesTabs');
  const gridCont = document.getElementById('utilesGradosGrid');
  if (!tabsCont || !gridCont) return;
  const grados = getUtiles();
  const tabActivo = GRUPOS_ORDEN.find(g => g.key === utilesTabActual) || GRUPOS_ORDEN[0];

  tabsCont.innerHTML = GRUPOS_ORDEN.map(g => `
    <button type="button" class="utiles-tab ${g.key === utilesTabActual ? 'active' : ''}" style="--accent-tab:${g.color}" onclick="cambiarUtilesTab('${g.key}')">
      ${UTILES_ICONOS[g.key]}${g.label}
    </button>`).join('');

  const gradosGrupo = grados.filter(x => x.grupo === utilesTabActual);
  if (!gradosGrupo.length) {
    gridCont.innerHTML = '<p style="text-align:center;color:var(--muted);font-size:13px;width:100%;padding:20px 0">Aún no hay grados configurados en este nivel.</p>';
    return;
  }
  gridCont.innerHTML = gradosGrupo.map(gr => `
    <div class="utiles-grado-card gc-${gr.grupo}" onclick='abrirUtilesModal(${JSON.stringify(gr).replace(/'/g, "&#39;")})'>
      <div class="ugc-icon">${UTILES_ICONOS[gr.icono] || UTILES_ICONOS.mochila}</div>
      <h4>${gr.nombre}</h4>
      <span>${gr.items.length} útiles</span>
    </div>`).join('');
}

function cambiarUtilesTab(key) {
  utilesTabActual = key;
  renderUtilesEscolares();
}

function abrirUtilesModal(grado) {
  document.getElementById('utilesModalIcon').innerHTML = UTILES_ICONOS[grado.icono] || UTILES_ICONOS.mochila;
  document.getElementById('utilesModalNivel').textContent = grado.grupoLabel || '';
  document.getElementById('utilesModalTitulo').textContent = grado.nombre;
  document.getElementById('utilesModalLista').innerHTML = (grado.items || []).map(it => `
    <li><span class="utiles-modal-qty">${it.cantidad}</span><span>${it.item}${it.observacion ? ' <em style="color:var(--muted)">(' + it.observacion + ')</em>' : ''}</span></li>
  `).join('') || '<li style="color:var(--muted)">Sin útiles registrados para este grado.</li>';
  const waMsg = encodeURIComponent(`Hola, quiero consultar el precio de los útiles escolares de ${grado.nombre}.`);
  document.getElementById('utilesModalPrecioBtn').href = `https://wa.me/573157859157?text=${waMsg}`;
  document.getElementById('utilesModalOverlay').classList.add('open');
  document.body.classList.add('modal-open');
}
function cerrarUtilesModal() {
  document.getElementById('utilesModalOverlay').classList.remove('open');
  document.body.classList.remove('modal-open');
}

/* ── Admin: gestionar útiles escolares (agregar/editar/eliminar) ── */
function abrirEditorUtilesInsc() {
  cerrarInscAdminPanel();
  const sel = document.getElementById('utGradoSelect');
  const grados = getUtiles();
  sel.innerHTML = GRUPOS_ORDEN.map(g => {
    const opciones = grados.filter(x => x.grupo === g.key)
      .map(gr => `<option value="${gr.slug}">${gr.nombre}</option>`).join('');
    return opciones ? `<optgroup label="${g.label}">${opciones}</optgroup>` : '';
  }).join('');
  renderUtilesInscList();
  document.getElementById('editorUtilesInscOverlay').classList.add('open');
}

function renderUtilesInscList() {
  const list = document.getElementById('utilesInscList');
  const slug = document.getElementById('utGradoSelect').value;
  const grado = getUtiles().find(g => g.slug === slug);
  if (!grado || !grado.items.length) { list.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;font-size:13px">Sin útiles para este grado.</div>'; return; }
  list.innerHTML = grado.items.map((it, idx) => `
    <div class="admin-item-row">
      <div class="admin-item-info"><strong>${it.item}</strong><span>Cantidad: ${it.cantidad}</span></div>
      <div class="admin-item-btns">
        <button class="admin-btn-edit" onclick="editarUtilInsc(${idx})">✏️ Editar</button>
        <button class="admin-btn-del" onclick="eliminarUtilInsc(${idx})">🗑️</button>
      </div>
    </div>`).join('');
}

function mostrarFormUtilInsc(pre, idx) {
  document.getElementById('formUtilInsc').style.display = 'block';
  if (pre) {
    document.getElementById('uiItem').value = pre.item || '';
    document.getElementById('uiCantidad').value = pre.cantidad || '';
    document.getElementById('uiEditIdx').value = idx;
  } else {
    document.getElementById('uiItem').value = '';
    document.getElementById('uiCantidad').value = '';
    document.getElementById('uiEditIdx').value = '';
  }
  document.getElementById('uiItem').focus();
}

function editarUtilInsc(idx) {
  const slug = document.getElementById('utGradoSelect').value;
  const grado = getUtiles().find(g => g.slug === slug);
  if (grado && grado.items[idx]) mostrarFormUtilInsc(grado.items[idx], idx);
}

function eliminarUtilInsc(idx) {
  if (!confirm('¿Eliminar este útil de la lista?')) return;
  const slug = document.getElementById('utGradoSelect').value;
  const grados = getUtiles();
  const grado = grados.find(g => g.slug === slug);
  if (!grado) return;
  grado.items.splice(idx, 1);
  saveUtiles(grados);
  renderUtilesInscList();
  renderUtilesEscolares();
  showToastInsc('͚til eliminado');
}

function guardarUtilInsc() {
  const item = document.getElementById('uiItem').value.trim();
  const cantidad = document.getElementById('uiCantidad').value.trim();
  const editIdx = document.getElementById('uiEditIdx').value;
  if (!item || !cantidad) { alert('El nombre del útil y la cantidad son obligatorios'); return; }
  const slug = document.getElementById('utGradoSelect').value;
  const grados = getUtiles();
  const grado = grados.find(g => g.slug === slug);
  if (!grado) return;
  if (editIdx !== '') { grado.items[Number(editIdx)] = { item, cantidad }; }
  else { grado.items.push({ item, cantidad }); }
  saveUtiles(grados);
  document.getElementById('formUtilInsc').style.display = 'none';
  renderUtilesInscList();
  renderUtilesEscolares();
  showToastInsc('͚til guardado');
}

renderUtilesEscolares();

/* ── COSTOS Y DESCUENTOS ── */
function toggleCostGroup(group) {
  const row = document.querySelector('.cost-group-row[onclick*="' + group + '"]');
  if (!row) return;
  row.classList.toggle('open');
  const isOpen = row.classList.contains('open');
  document.querySelectorAll('.cost-child-row[data-group="' + group + '"]').forEach(function(r) {
    r.classList.toggle('visible', isOpen);
  });
}

async function toggleEditMode() {
  editMode = !editMode;
  document.body.classList.toggle('admin-edit-mode', editMode);
  document.querySelectorAll('.editable-cell').forEach(cell => {
    cell.setAttribute('contenteditable', editMode ? 'true' : 'false');
    if (editMode) cell.title = 'Haz clic para editar';
  });
  const btn = document.querySelector('[onclick="abrirEditorCostos()"]') || document.querySelector('[onclick="toggleEditMode()"]');
  if (editMode) {
    showToastInsc('Modo edición activado. Haz clic en cualquier valor para editarlo.');
  } else {
    await saveCostosData();
    showToastInsc('Cambios guardados correctamente');
  }
}

async function saveCostosData() {
  // Costos: persisten en la BD vía API
  const data = {};
  document.querySelectorAll('[data-cost-key]').forEach(el => { data[el.dataset.costKey] = el.textContent.trim(); });
  try { localStorage.setItem('gds_costos_data', JSON.stringify(data)); } catch(e) {}
  try {
    await GDS.admin.guardarCostos({ costos: data });
  } catch (e) {
    console.error('Error guardando costos:', e);
  }
  // Descuentos: persisten en la BD vía API
  const descElements = document.querySelectorAll('[data-desc-key]');
  for (const el of descElements) {
    const clave = el.dataset.descKey;
    const porcentaje = el.textContent.trim();
    try {
      await GDS.admin.guardarDescuento({ clave_storage: clave, porcentaje: porcentaje });
    } catch (e) {
      console.error('Error guardando descuento:', clave, e);
    }
  }
}

async function loadCostosData() {
  // Costos: desde la API (BD)
  try {
    const costos = await GDS.getCostos();
    if (costos && typeof costos === 'object') {
      Object.entries(costos).forEach(([k, v]) => { const el = document.querySelector('[data-cost-key="' + k + '"]'); if (el) el.textContent = v; });
    }
  } catch(e) { console.warn('Costos no disponibles desde API, usando localStorage', e); }
  // Fallback a localStorage
  try {
    const data = JSON.parse(localStorage.getItem('gds_costos_data') || '{}');
    Object.entries(data).forEach(([k, v]) => { const el = document.querySelector('[data-cost-key="' + k + '"]'); if (el && !el.textContent) el.textContent = v; });
  } catch(e) {}
  // Descuentos: desde la API (BD)
  try {
    const descuentos = await GDS.getDescuentos();
    if (descuentos && Array.isArray(descuentos)) {
      descuentos.forEach(d => {
        const el = document.querySelector('[data-desc-key="' + d.clave_storage + '"]');
        if (el && d.porcentaje) el.textContent = d.porcentaje;
      });
    }
  } catch(e) { console.warn('Descuentos no disponibles desde API, usando localStorage', e); }
}

/* ── DESCARGAR POSTULADOS (CSV) ── */
function descargarPostulados() {
  const posts = getPostulados();
  if (!posts.length) { showToastInsc('No hay postulados para exportar', 'error'); return; }
  const keys = ['fecha_registro','nombres','apellidos','tipo_doc','num_doc','fecha_nac','genero','grado','ano_lectivo','inst_anterior','acudiente_nombre','parentesco','tel_principal','tel_alt','email','direccion','ocupacion','observaciones'];
  const headers = ['Fecha','Nombres','Apellidos','Tipo Doc','N° Doc','Fecha Nac','Género','Grado','Año','Inst. Anterior','Acudiente','Parentesco','Tel. Principal','Tel. Alternativo','Email','Dirección','Ocupación','Observaciones'];
  const csv = [headers.join(','), ...posts.map(p => keys.map(k => '"' + (p[k] || '').toString().replace(/"/g, '""') + '"').join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'postulados_gds_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click(); URL.revokeObjectURL(url);
  showToastInsc('Archivo descargado correctamente');
}

/* ── GESTI͓N DOCENTES (compartida con index.html vía localStorage) ── */
const DOCENTES_DEFAULT_INSC = [
  {id:'d1', nombre:'CATALINA PINEDA MORANTES', cargo:'Titular', nivel:'Jardín', foto:'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&q=80'},
  {id:'d2', nombre:'JESSICA CECILIA GOMEZ BAUTISTA', cargo:'Titular', nivel:'Transición', foto:'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=150&q=80'},
  {id:'d3', nombre:'GLORIA MERCEDES URIBE', cargo:'Titular', nivel:'Transición', foto:'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80'}
];
function getDocentesInsc() { try { const d = JSON.parse(localStorage.getItem('gds_docentes')); return d || DOCENTES_DEFAULT_INSC; } catch(e) { return DOCENTES_DEFAULT_INSC; } }
function saveDocentesInsc(d) { /* persistencia por API (bridge) */ }

function abrirEditorDocentesInsc() {
  cerrarInscAdminPanel();
  renderDocentesInscList();
  document.getElementById('editorDocentesInscOverlay').classList.add('open');
}
function renderDocentesInscList() {
  const list = document.getElementById('docentesInscList');
  const docs = getDocentesInsc();
  if (!docs.length) { list.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;font-size:13px">Sin docentes.</div>'; return; }
  list.innerHTML = docs.map(d => `
    <div class="admin-item-row">
      <img src="${d.foto||''}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.src='https://via.placeholder.com/40'"/>
      <div class="admin-item-info"><strong>${d.nombre}</strong><span>${d.cargo} · ${d.nivel}</span></div>
      <div class="admin-item-btns">
        <button class="admin-btn-edit" onclick="editarDocenteInsc('${d.id}')">✏️ Editar</button>
        <button class="admin-btn-del" onclick="eliminarDocenteInsc('${d.id}')">🗑️</button>
      </div>
    </div>`).join('');
}
function mostrarFormDocenteInsc(pre) {
  document.getElementById('formDocenteInsc').style.display = 'block';
  if (pre) {
    document.getElementById('diNombre').value = pre.nombre || '';
    document.getElementById('diCargo').value = pre.cargo || '';
    document.getElementById('diNivel').value = pre.nivel || '';
    document.getElementById('diFoto').value = pre.foto || '';
    document.getElementById('diEditId').value = pre.id || '';
  } else {
    ['diNombre','diCargo','diNivel','diFoto','diEditId'].forEach(id => document.getElementById(id).value = '');
  }
  document.getElementById('diNombre').focus();
}
function editarDocenteInsc(id) { const d = getDocentesInsc().find(x => x.id === id); if (d) mostrarFormDocenteInsc(d); }
function eliminarDocenteInsc(id) {
  if (!confirm('¿Eliminar este docente?')) return;
  saveDocentesInsc(getDocentesInsc().filter(d => d.id !== id));
  renderDocentesInscList();
}
function guardarDocenteInsc() {
  const nombre = document.getElementById('diNombre').value.trim().toUpperCase();
  const cargo = document.getElementById('diCargo').value.trim();
  const nivel = document.getElementById('diNivel').value.trim();
  const foto = document.getElementById('diFoto').value.trim();
  const editId = document.getElementById('diEditId').value.trim();
  if (!nombre || !cargo) { alert('Nombre y cargo son obligatorios'); return; }
  const docs = getDocentesInsc();
  if (editId) { const idx = docs.findIndex(d => d.id === editId); if (idx !== -1) docs[idx] = {id:editId,nombre,cargo,nivel,foto}; }
  else { docs.push({id:'dc_'+Date.now(),nombre,cargo,nivel,foto}); }
  saveDocentesInsc(docs);
  document.getElementById('formDocenteInsc').style.display = 'none';
  renderDocentesInscList();
  showToastInsc('Docente guardado');
}

/* ── GESTI͓N DIRECTIVOS ── */
const DIRECTIVOS_DEFAULT_INSC = [
  {id:'dir1',nombre:'JOSE RICARDO ABRAJIM CORT͉S',cargo:'Rector',rol:'rector',foto:'img/2025_JOS-RICARDO-ABRAJIM-CORTS.jpg'},
  {id:'dir2',nombre:'SYLVIA ABRAJIM CORT͉S',cargo:'Directora Académica',rol:'academica',foto:'img/2025_SYLVIA-ABRAJIM-CORTS.jpg'},
  {id:'dir3',nombre:'PATRICIA P͉REZ SANTOS',cargo:'Directora Administrativa',rol:'administrativa',foto:'img/2025_PATRICIA-PREZ-SANTOS.jpg'}
];
function getDirectivosInsc() { try { const d = JSON.parse(localStorage.getItem('gds_directivos')); return d || DIRECTIVOS_DEFAULT_INSC; } catch(e) { return DIRECTIVOS_DEFAULT_INSC; } }
function saveDirectivosInsc(d) { /* persistencia por API (bridge) */ }

function abrirEditorDirectivosInsc() {
  cerrarInscAdminPanel();
  renderDirectivosInscList();
  document.getElementById('editorDirectivosInscOverlay').classList.add('open');
}
function renderDirectivosInscList() {
  const list = document.getElementById('directivosInscList');
  const dirs = getDirectivosInsc();
  if (!dirs.length) { list.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;font-size:13px">Sin directivos.</div>'; return; }
  list.innerHTML = dirs.map(d => `
    <div class="admin-item-row">
      <img src="${d.foto||''}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.src='https://via.placeholder.com/40'"/>
      <div class="admin-item-info"><strong>${d.nombre}</strong><span>${d.cargo}</span></div>
      <div class="admin-item-btns">
        <button class="admin-btn-edit" onclick="editarDirectivoInsc('${d.id}')">✏️ Editar</button>
        <button class="admin-btn-del" onclick="eliminarDirectivoInsc('${d.id}')">🗑️</button>
      </div>
    </div>`).join('');
}
function mostrarFormDirectivoInsc(pre) {
  document.getElementById('formDirectivoInsc').style.display = 'block';
  if (pre) {
    document.getElementById('dri2Nombre').value = pre.nombre || '';
    document.getElementById('dri2Cargo').value = pre.cargo || '';
    document.getElementById('dri2Rol').value = pre.rol || 'otro';
    document.getElementById('dri2Foto').value = pre.foto || '';
    document.getElementById('dri2EditId').value = pre.id || '';
  } else {
    ['dri2Nombre','dri2Cargo','dri2Foto','dri2EditId'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('dri2Rol').value = 'otro';
  }
  document.getElementById('dri2Nombre').focus();
}
function editarDirectivoInsc(id) { const d = getDirectivosInsc().find(x => x.id === id); if (d) mostrarFormDirectivoInsc(d); }
function eliminarDirectivoInsc(id) {
  if (!confirm('¿Eliminar este directivo?')) return;
  saveDirectivosInsc(getDirectivosInsc().filter(d => d.id !== id));
  renderDirectivosInscList();
}
function guardarDirectivoInsc() {
  const nombre = document.getElementById('dri2Nombre').value.trim().toUpperCase();
  const cargo = document.getElementById('dri2Cargo').value.trim();
  const rol = document.getElementById('dri2Rol').value;
  const foto = document.getElementById('dri2Foto').value.trim();
  const editId = document.getElementById('dri2EditId').value.trim();
  if (!nombre || !cargo) { alert('Nombre y cargo son obligatorios'); return; }
  const dirs = getDirectivosInsc();
  if (editId) { const idx = dirs.findIndex(d => d.id === editId); if (idx !== -1) dirs[idx] = {id:editId,nombre,cargo,rol,foto}; }
  else { dirs.push({id:'dir_'+Date.now(),nombre,cargo,rol,foto}); }
  saveDirectivosInsc(dirs);
  document.getElementById('formDirectivoInsc').style.display = 'none';
  renderDirectivosInscList();
  showToastInsc('Directivo guardado');
}

/* ── GESTI͓N DOCENTES DIRECTIVOS ── */
const DD_DEFAULT_INSC = [
  {id:'dd1',nombre:'JOS͉ RA͚L GUTI͉RREZ VALDERRAMA',cargo:'Coord. Convivencia Social',rol:'convivencia',foto:'img/RAUL-GUTIERREZ-GDS-2026.jpg'},
  {id:'dd2',nombre:'MARIO ENRIQUE ĆRDENAS CABALLERO',cargo:'Coordinador Académico',rol:'academico',foto:'img/MARIO-CARDENAS-GDS-2026.jpg'},
  {id:'dd3',nombre:'MARYORI DAYANA URIBE',cargo:'Psicóloga Institucional',rol:'psicologa',foto:'img/MARYORI-URIBE-GDS-2026.jpg'}
];
function getDocentesDirectivosInsc() { try { const d = JSON.parse(localStorage.getItem('gds_docentes_directivos')); return d || DD_DEFAULT_INSC; } catch(e) { return DD_DEFAULT_INSC; } }
function saveDocentesDirectivosInsc(d) { /* persistencia por API (bridge) */ }

function abrirEditorDocentesDirectivosInsc() {
  cerrarInscAdminPanel();
  renderDocentesDirectivosInscList();
  document.getElementById('editorDocentesDirectivosInscOverlay').classList.add('open');
}
function renderDocentesDirectivosInscList() {
  const list = document.getElementById('docentesDirectivosInscList');
  const dds = getDocentesDirectivosInsc();
  if (!dds.length) { list.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;font-size:13px">Sin docentes directivos.</div>'; return; }
  list.innerHTML = dds.map(d => `
    <div class="admin-item-row">
      <img src="${d.foto||''}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.src='https://via.placeholder.com/40'"/>
      <div class="admin-item-info"><strong>${d.nombre}</strong><span>${d.cargo}</span></div>
      <div class="admin-item-btns">
        <button class="admin-btn-edit" onclick="editarDocenteDirectivoInsc('${d.id}')">✏️ Editar</button>
        <button class="admin-btn-del" onclick="eliminarDocenteDirectivoInsc('${d.id}')">🗑️</button>
      </div>
    </div>`).join('');
}
function mostrarFormDocenteDirectivoInsc(pre) {
  document.getElementById('formDocenteDirectivoInsc').style.display = 'block';
  if (pre) {
    document.getElementById('ddi2Nombre').value = pre.nombre || '';
    document.getElementById('ddi2Cargo').value = pre.cargo || '';
    document.getElementById('ddi2Rol').value = pre.rol || 'otro';
    document.getElementById('ddi2Foto').value = pre.foto || '';
    document.getElementById('ddi2EditId').value = pre.id || '';
  } else {
    ['ddi2Nombre','ddi2Cargo','ddi2Foto','ddi2EditId'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('ddi2Rol').value = 'otro';
  }
  document.getElementById('ddi2Nombre').focus();
}
function editarDocenteDirectivoInsc(id) { const d = getDocentesDirectivosInsc().find(x => x.id === id); if (d) mostrarFormDocenteDirectivoInsc(d); }
function eliminarDocenteDirectivoInsc(id) {
  if (!confirm('¿Eliminar este docente directivo?')) return;
  saveDocentesDirectivosInsc(getDocentesDirectivosInsc().filter(d => d.id !== id));
  renderDocentesDirectivosInscList();
}
function guardarDocenteDirectivoInsc() {
  const nombre = document.getElementById('ddi2Nombre').value.trim().toUpperCase();
  const cargo = document.getElementById('ddi2Cargo').value.trim();
  const rol = document.getElementById('ddi2Rol').value;
  const foto = document.getElementById('ddi2Foto').value.trim();
  const editId = document.getElementById('ddi2EditId').value.trim();
  if (!nombre || !cargo) { alert('Nombre y cargo son obligatorios'); return; }
  const dds = getDocentesDirectivosInsc();
  if (editId) { const idx = dds.findIndex(d => d.id === editId); if (idx !== -1) dds[idx] = {id:editId,nombre,cargo,rol,foto}; }
  else { dds.push({id:'dd_'+Date.now(),nombre,cargo,rol,foto}); }
  saveDocentesDirectivosInsc(dds);
  document.getElementById('formDocenteDirectivoInsc').style.display = 'none';
  renderDocentesDirectivosInscList();
  showToastInsc('Docente directivo guardado');
}

/* ── MANEJO DE PDFs ADJUNTOS ── */
const _inscPdfs = { doc_estudiante: null, doc_observador: null, doc_boletin: null };
const PDF_MAX_MB = 6;

function handleInscPdf(input, key, dzId, lblId, errId) {
  const dz = document.getElementById(dzId);
  const lbl = document.getElementById(lblId);
  const err = document.getElementById(errId);
  err.textContent = '';
  dz.classList.remove('loaded','error-state');

  const file = input.files[0];
  if (!file) return;

  if (file.type !== 'application/pdf') {
    err.textContent = '⚠️ Solo se aceptan archivos en formato PDF.';
    dz.classList.add('error-state');
    input.value = ''; _inscPdfs[key] = null; return;
  }
  if (file.size > PDF_MAX_MB * 1024 * 1024) {
    err.textContent = `⚠️ El archivo supera el límite de ${PDF_MAX_MB}MB. Comprime el PDF e intenta de nuevo.`;
    dz.classList.add('error-state');
    input.value = ''; _inscPdfs[key] = null; return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    _inscPdfs[key] = { filename: file.name, mimeType: 'application/pdf', base64: e.target.result.split(',')[1] };
    lbl.innerHTML = `<strong>✅ ${file.name}</strong><br>${(file.size/1024).toFixed(0)} KB · listo para enviar`;
    dz.classList.add('loaded');
  };
  reader.readAsDataURL(file);
}

/* Drag & drop para los 3 dropzones de PDF */
document.addEventListener('DOMContentLoaded', () => {
  [
    { dzId:'dz_doc_estudiante', fileId:'file_doc_estudiante', key:'doc_estudiante', lblId:'lbl_doc_estudiante', errId:'err_doc_estudiante' },
    { dzId:'dz_observador',     fileId:'file_observador',     key:'doc_observador', lblId:'lbl_observador',     errId:'err_observador' },
    { dzId:'dz_boletin',        fileId:'file_boletin',        key:'doc_boletin',    lblId:'lbl_boletin',        errId:'err_boletin' }
  ].forEach(({ dzId, fileId, key, lblId, errId }) => {
    const dz = document.getElementById(dzId);
    if (!dz) return;
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.style.borderColor = 'var(--azul)'; });
    dz.addEventListener('dragleave', () => { if (!dz.classList.contains('loaded')) dz.style.borderColor = 'var(--celeste)'; });
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const inp = document.getElementById(fileId);
      const dt = new DataTransfer();
      dt.items.add(file);
      inp.files = dt.files;
      handleInscPdf(inp, key, dzId, lblId, errId);
    });
  });
});

/* ── FORM INSCRIPCI͓N SUBMIT ── */
const form = document.getElementById('inscripcionForm');
if (form) {
  /* ── URL del proxy PHP (mismo servidor, misma carpeta) ──
     El proxy llama al Apps Script server-side, captura los
     links de Drive y guarda todo en MySQL + Google Sheets. */
  const PROXY_URL = 'apps_script_proxy.php';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {};
    const formData = new FormData(form);
    for (let [key, val] of formData.entries()) { data[key] = val; }
    form.querySelectorAll('input[type="radio"]:checked').forEach(r => { data[r.name] = r.value; });
    form.querySelectorAll('input[type="checkbox"]:checked').forEach(c => {
      if (!data[c.name]) data[c.name] = [];
      if (!Array.isArray(data[c.name])) data[c.name] = [data[c.name]];
      data[c.name].push(c.value);
    });

    /* Validación de campos requeridos */
    let valid = true;
    form.querySelectorAll('[required]').forEach(field => {
      if (!field.value.trim()) {
        field.style.borderColor = '#e24b4a';
        valid = false;
        setTimeout(() => { field.style.borderColor = ''; }, 3000);
      }
    });
    if (!valid) { showToastInsc('Por favor completa todos los campos obligatorios', 'error'); return; }

    const submitBtn = form.querySelector('[type="submit"]');
    const origTxt = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Enviando... (puede tardar hasta 30s)'; }

    try {
      /* Construir payload con PDFs en base64 */
      const payload = {
        ...data,
        formType: 'inscripcion',
        timestamp: new Date().toLocaleString('es-CO')
      };
      /* Los PDFs van como objetos {filename, mimeType, base64}
         El proxy los manda al Apps Script → Apps Script sube a Drive
         → responde con los links → proxy guarda en MySQL */
      if (_inscPdfs.doc_estudiante)  payload.doc_documentacion = _inscPdfs.doc_estudiante;
      if (_inscPdfs.doc_observador)  payload.doc_observador    = _inscPdfs.doc_observador;
      if (_inscPdfs.doc_boletin)     payload.doc_boletin       = _inscPdfs.doc_boletin;

      /* Llamar al proxy PHP (SIN mode:no-cors → podemos leer la respuesta) */
      const res  = await fetch(PROXY_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      });
      const json = await res.json();

      if (json.ok) {
        /* ͉xito: guardado en MySQL + Google Sheets + PDFs en Drive */
        const links = json.drive_links || {};
        console.log('Drive links recibidos:', links);
        savePostulado(data); /* Respaldo local */
      } else {
        /* El proxy respondió pero con error */
        console.warn('GDS proxy error:', json.error);
        savePostulado(data);
      }

      /* Mostrar confirmación al usuario independientemente */
      const succ = document.getElementById('formSuccess');
      if (succ) succ.style.display = 'block';
      form.reset();
      Object.keys(_inscPdfs).forEach(k => _inscPdfs[k] = null);
      ['dz_doc_estudiante','dz_observador','dz_boletin'].forEach(id => {
        const dz = document.getElementById(id);
        if (dz) dz.classList.remove('loaded','error-state');
      });
      ['lbl_doc_estudiante','lbl_observador','lbl_boletin'].forEach((id, i) => {
        const icons = ['📄','📋','📊'];
        const el = document.getElementById(id);
        if (el) {
          const dz = el.closest('.pdf-dropzone');
          if (dz) { const ic = dz.querySelector('.pdf-dz-icon'); if (ic) ic.textContent = icons[i]; }
          el.textContent = 'Clic aquí o arrastra el PDF · máx. 6MB';
        }
      });
      form.style.display = 'none';
      showToastInsc('✅ Solicitud enviada exitosamente. Te contactaremos pronto.');
      window.scrollTo({ top: document.getElementById('formulario').offsetTop - 100, behavior: 'smooth' });

    } catch(err) {
      /* Error de red: guardar localmente y avisar */
      console.error('GDS submit error:', err);
      savePostulado(data);
      showToastInsc('⚠️ Error de conexión. Tu solicitud fue guardada localmente.', 'warn');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origTxt; }
    }
  });
}

loadCostosData().catch(e => console.warn('Costos/descuentos no disponibles:', e));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('adminLoginInsc').classList.remove('open');
    cerrarInscAdminPanel();
    document.querySelectorAll('.admin-editor-overlay').forEach(o => o.classList.remove('open'));
    document.body.style.overflow = '';
  }
});
/* ═══ GDS SHARED NAV ═══ */
(function(){
  var nb = document.getElementById('navbar');
  window.addEventListener('scroll', function(){
    if(nb) nb.classList.toggle('scrolled', window.scrollY > 10);
    var wf = document.getElementById('whatsappFloat');
    if(wf) wf.classList.toggle('visible', window.scrollY > 200);
  });
  var ham = document.getElementById('hamburger');
  var navL = document.getElementById('navLinks');
  if(ham && navL){
    ham.addEventListener('click', function(){
      this.classList.toggle('open');
      navL.classList.toggle('open');
      document.body.style.overflow = navL.classList.contains('open') ? 'hidden' : '';
    });
  }
  var soyBtn = document.getElementById('soyDominguinoBtn');
  var soyMenu = document.getElementById('soyDominguinoMenu');
  if(soyBtn && soyMenu){
    soyBtn.addEventListener('click', function(e){
      e.preventDefault();
      soyMenu.classList.toggle('open');
      var arrow = soyBtn.querySelector('.td-arrow');
      if(arrow) arrow.style.transform = soyMenu.classList.contains('open') ? 'rotate(180deg)' : '';
    });
    document.addEventListener('click', function(e){
      if(!soyBtn.contains(e.target) && !soyMenu.contains(e.target)){
        soyMenu.classList.remove('open');
        var arrow = soyBtn.querySelector('.td-arrow');
        if(arrow) arrow.style.transform = '';
      }
    });
  }
})();
