/* ══ DATOS ══ */
const servicios={
  auditorio:{tag:'Espacio Principal · Eventos Institucionales',titulo:'Auditorio',img:'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1600&q=85',chips:['🎭 Espacio principal del colegio','🎓 Actos cívicos y graduaciones','🎤 Conferencias y capacitaciones','👨‍👩‍👧 Capacidad para toda la comunidad'],cuerpo:`<p>El <strong>Auditorio</strong> es el espacio principal del Gimnasio Domingo Savio para la realización de actos cívicos, graduaciones, conferencias, capacitaciones y eventos institucionales de gran formato.</p><p>Cuenta con un escenario amplio, sistema de sonido e iluminación, y capacidad suficiente para reunir a estudiantes, docentes, padres de familia y visitantes en un mismo evento.</p><p>Es utilizado durante todo el año escolar para izadas de bandera, entrega de logros, celebraciones institucionales y actividades culturales y académicas de gran convocatoria.</p>`,videos:[{'label':'Video institucional GDS','sub':'Gimnasio Domingo Savio · YouTube','url':'https://www.youtube.com/watch?v=lV7-vJBPBWA'},{'label':'Canal oficial GDS Cúcuta','sub':'Ver todos los videos · YouTube','url':'https://www.youtube.com/@DomingoSavio-h5p'}]},
  biblioteca:{tag:'Conocimiento · Cultura',titulo:'Biblioteca Institucional',img:'img/servicios/biblioteca.webp',chips:['📅 Lun–Vie 6:30am–3:30pm','📚 +5.000 títulos','🖥️ 4 computadores de consulta','🔇 Zona de silencio'],cuerpo:`<p>La <strong>Biblioteca del Gimnasio Domingo Savio</strong> es el corazón académico e investigativo de nuestra institución. Cuenta con un amplio catálogo de libros, enciclopedias, revistas científicas y material didáctico organizado por nivel y área de conocimiento.</p><p>El espacio está dividido en zona de lectura silenciosa, sala de trabajo grupal y área de consulta digital. Contamos con personal bibliotecario capacitado que apoya los procesos de búsqueda de información y fomento lector.</p><p>Los estudiantes pueden solicitar préstamos domiciliarios de libros por hasta 5 días hábiles presentando su carné estudiantil.</p>`,videos:[{'label':'Video institucional GDS','sub':'Gimnasio Domingo Savio · YouTube','url':'https://youtu.be/i2fLSQyBOPw'},{'label':'Canal oficial GDS Cúcuta','sub':'Ver todos los videos · YouTube','url':'https://www.youtube.com/@DomingoSavio-h5p'}]},
  laboratorio:{tag:'Ciencias · Tecnología',titulo:'Laboratorio de Ciencias',img:'https://images.unsplash.com/photo-1554475901-4538ddfbccc2?w=1200&q=85',chips:['⚗️ Química, Física y Biología','🥽 Dotación completa EPP','👩‍🔬 Docente especializado','📋 Reserva previa requerida'],cuerpo:`<p>El <strong>Laboratorio de Ciencias</strong> es un espacio de 80 m² equipado con material de última generación para prácticas en Química, Biología y Física desde grado 5° hasta grado 11°.</p><p>Cuenta con 10 mesas de trabajo para grupos de 4 estudiantes, campanas de extracción, microscopios, reactivos certificados y equipos de medición calibrados periódicamente.</p><p>Las prácticas se realizan con acompañamiento permanente del docente especializado y bajo estrictas normas de bioseguridad.</p>`,videos:[{'label':'Video institucional GDS','sub':'Gimnasio Domingo Savio · YouTube','url':'https://www.youtube.com/watch?v=lV7-vJBPBWA'},{'label':'Canal oficial GDS Cúcuta','sub':'Ver todos los videos · YouTube','url':'https://www.youtube.com/@DomingoSavio-h5p'}]},
  puntoasistencia:{tag:'Salud · Bienestar',titulo:'Punto de Asistencia',img:'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=1200&q=85',chips:['🕐 Atención 6:30am–3:00pm','🩹 Primeros auxilios','📞 Comunicación a acudientes','💊 Seguimiento medicamentos'],cuerpo:`<p>El <strong>Punto de Asistencia del Gimnasio Domingo Savio</strong> brinda atención preventiva y de primeros auxilios a toda la comunidad estudiantil durante la jornada escolar. Está atendido por una enfermera profesional con formación en salud escolar.</p><p>Servicios: control de signos vitales, atención de lesiones menores, administración de medicamentos formulados (previa autorización), control de enfermedades crónicas y seguimiento nutricional básico.</p>`,videos:[{'label':'Video institucional GDS','sub':'Gimnasio Domingo Savio · YouTube','url':'https://www.youtube.com/watch?v=lV7-vJBPBWA'},{'label':'Canal oficial GDS Cúcuta','sub':'Ver todos los videos · YouTube','url':'https://www.youtube.com/@DomingoSavio-h5p'}]},
  sistemas:{tag:'Tecnología · Innovación',titulo:'Sala de Sistemas',img:'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=85',chips:['💻 30 equipos actualizados','📶 Internet fibra óptica','🕹️ Software educativo','🔐 Control parental activo'],cuerpo:`<p>La <strong>Sala de Sistemas</strong> cuenta con 30 equipos de cómputo actualizados en 2024, todos con conexión a internet por fibra óptica de 200 Mbps garantizados.</p><p>Dispone de software educativo licenciado: Microsoft 365 Educación, plataformas de programación para niños (Scratch, Code.org) y acceso a Fundamerani, UNOI y SUMUN.</p>`,videos:[{'label':'Video institucional GDS','sub':'Gimnasio Domingo Savio · YouTube','url':'https://www.youtube.com/watch?v=lV7-vJBPBWA'},{'label':'Canal oficial GDS Cúcuta','sub':'Ver todos los videos · YouTube','url':'https://www.youtube.com/@GimnasioDomingoSavio'}]},
  robotica:{tag:'Tecnología · STEM',titulo:'Sala de Robótica',img:'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&q=85',chips:['🤖 Kits de robótica educativa','💡 Pensamiento lógico y creativo','🧩 Proyectos por niveles','🏆 Participación en competencias STEM'],cuerpo:`<p>La <strong>Sala de Robótica</strong> es un espacio dedicado al desarrollo de competencias en programación, electrónica básica y pensamiento computacional a través de kits de robótica educativa.</p><p>Los estudiantes diseñan, construyen y programan sus propios proyectos robóticos, fortaleciendo habilidades de resolución de problemas, trabajo en equipo y creatividad aplicada a la tecnología.</p><p>El espacio se utiliza tanto en clases curriculares de tecnología e informática como en clubes y semilleros extracurriculares de robótica.</p>`,videos:[{'label':'Video institucional GDS','sub':'Gimnasio Domingo Savio · YouTube','url':'https://www.youtube.com/watch?v=lV7-vJBPBWA'},{'label':'Canal oficial GDS Cúcuta','sub':'Ver todos los videos · YouTube','url':'https://www.youtube.com/@DomingoSavio-h5p'}]},
  canchas:{tag:'Deporte · Recreación',titulo:'Canchas Deportivas',img:'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=85',chips:['⚽ Fútbol y microfútbol','🏀 Baloncesto','🏃 Atletismo básico','🌤️ Uso en recreo y clase'],cuerpo:`<p>Las <strong>Canchas Deportivas</strong> ofrecen espacios amplios y seguros para el desarrollo de la educación física y actividades recreativas. Contamos con cancha múltiple de fútbol/microfútbol y cancha de baloncesto con tableros oficiales reglamentarios.</p><p>Son utilizadas en clases de Educación Física, recreos supervisados y torneos deportivos interclases semestrales, además de entrenamientos de las selecciones deportivas del colegio.</p>`,videos:[{'label':'Video institucional GDS','sub':'Gimnasio Domingo Savio · YouTube','url':'https://www.youtube.com/watch?v=lV7-vJBPBWA'},{'label':'Canal oficial GDS Cúcuta','sub':'Ver todos los videos · YouTube','url':'https://www.youtube.com/@DomingoSavio-h5p'}]},
  cafeteria:{tag:'Nutrición · Bienestar',titulo:'Cafetería Escolar',img:'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=1200&q=85',chips:['🕖 Descanso 9:30am–10:00am','🥗 Menú balanceado','✅ Supervisión INVIMA','🚫 Sin comida chatarra'],cuerpo:`<p>La <strong>Cafetería</strong> ofrece alimentación sana y balanceada supervisada por profesionales en nutrición. Los menús se diseñan mensualmente cumpliendo las guías alimentarias del ICBF para población escolar.</p><p>Ofrecemos desayunos, refrigerios y almuerzos con opciones variadas que incluyen proteínas, carbohidratos complejos, frutas de temporada y bebidas naturales. El área cuenta con condiciones higiénicas certificadas.</p>`,videos:[{'label':'Video institucional GDS','sub':'Gimnasio Domingo Savio · YouTube','url':'https://www.youtube.com/watch?v=lV7-vJBPBWA'},{'label':'Canal oficial GDS Cúcuta','sub':'Ver todos los videos · YouTube','url':'https://www.youtube.com/@DomingoSavio-h5p'}]},
  piscina:{tag:'Preescolar · Jardín',titulo:'Piscina',img:'https://images.unsplash.com/photo-1560090995-01632a28895b?w=1200&q=85',chips:['🏊 Exclusiva Preescolar y Jardín','👩‍🏫 Supervisión permanente','🌡️ Temperatura controlada','🩱 Actividades de adaptación acuática'],cuerpo:`<p>La <strong>Piscina</strong> del Gimnasio Domingo Savio está diseñada especialmente para los estudiantes de Preescolar y Jardín, ofreciendo un espacio seguro para sus primeras experiencias de adaptación al agua.</p><p>Las actividades acuáticas se realizan siempre bajo la supervisión constante de personal capacitado, con protocolos estrictos de seguridad y profundidad adecuada para los más pequeños.</p><p>Forma parte del proceso de estimulación motriz y autonomía corporal propio de la etapa de educación inicial.</p>`,videos:[{'label':'Video institucional GDS','sub':'Gimnasio Domingo Savio · YouTube','url':'https://www.youtube.com/watch?v=lV7-vJBPBWA'},{'label':'Canal oficial GDS Cúcuta','sub':'Ver todos los videos · YouTube','url':'https://www.youtube.com/@DomingoSavio-h5p'}]},
  miniparque:{tag:'Preescolar · Recreación',titulo:'Miniparque Infantil',img:'https://images.unsplash.com/photo-1597392582469-a697febf3b8c?w=1200&q=85',chips:['🧸 Juegos seguros y coloridos','🤸 Desarrollo motor','🌳 Espacio exclusivo para los más pequeños','👀 Supervisión constante'],cuerpo:`<p>El <strong>Miniparque Infantil</strong> es un espacio recreativo pensado exclusivamente para los estudiantes más pequeños del Gimnasio Domingo Savio, con juegos seguros y adecuados para su edad.</p><p>Cuenta con toboganes, columpios y zonas de juego blandas que favorecen el desarrollo motor grueso, la coordinación y la socialización temprana entre los niños de Preescolar.</p><p>Todas las actividades en este espacio se realizan bajo la supervisión constante de las docentes a cargo.</p>`,videos:[{'label':'Video institucional GDS','sub':'Gimnasio Domingo Savio · YouTube','url':'https://www.youtube.com/watch?v=lV7-vJBPBWA'},{'label':'Canal oficial GDS Cúcuta','sub':'Ver todos los videos · YouTube','url':'https://www.youtube.com/@DomingoSavio-h5p'}]}
};
window.servicios = servicios;

/* ══ MODAL ══ */
function abrirModal(id){
  const s=servicios[id];if(!s)return;
  const svImg=document.getElementById('svModalImg');if(!svImg)return;
  svImg.style.backgroundImage=`url('${s.img}')`;
  document.getElementById('svModalTag').textContent=s.tag;
  document.getElementById('svModalTitle').textContent=s.titulo;
  document.getElementById('svModalChips').innerHTML=s.chips.map(c=>`<span class="sv-chip">${c}</span>`).join('');
  document.getElementById('svModalBody').innerHTML=s.cuerpo;
  document.getElementById('svModalVideos').innerHTML=`<h4>📹 Videos de referencia</h4><div class="sv-video-links">${s.videos.map(v=>`<a href="${v.url}" target="_blank" rel="noopener" class="sv-video-link"><div class="sv-video-thumb">▶</div><div class="sv-video-meta"><span class="sv-video-label">${v.label}</span><span class="sv-video-sub">${v.sub}</span></div></a>`).join('')}</div>`;
  document.getElementById('svModalBackdrop').classList.add('open');
  document.body.style.overflow='hidden';
}
function cerrarModal(){ document.getElementById('svModalBackdrop').classList.remove('open'); document.body.style.overflow=''; }
function cerrarModalFuera(e){ if(e.target===document.getElementById('svModalBackdrop')) cerrarModal(); }
document.addEventListener('keydown',e=>{ if(e.key==='Escape') cerrarModal(); });

/* ══ SHARED NAV ══ */
(function(){
  var nb=document.getElementById('navbar');
  window.addEventListener('scroll',function(){
    if(nb) nb.classList.toggle('scrolled',window.scrollY>10);
    var wf=document.getElementById('whatsappFloat');
    if(wf) wf.classList.toggle('visible',window.scrollY>200);
  });
  var ham=document.getElementById('hamburger');
  var navL=document.getElementById('navLinks');
  if(ham&&navL){
    ham.addEventListener('click',function(){
      this.classList.toggle('open');
      navL.classList.toggle('open');
      document.body.style.overflow=navL.classList.contains('open')?'hidden':'';
    });
  }
  /* Mobile nav-item tap */
  document.querySelectorAll('.nav-item > .nav-link').forEach(function(link){
    link.addEventListener('click',function(e){
      if(window.innerWidth<=768){
        var item=this.parentElement;
        var wasOpen=item.classList.contains('open');
        document.querySelectorAll('.nav-item').forEach(function(i){i.classList.remove('open');});
        if(!wasOpen) item.classList.add('open');
        e.preventDefault();
      }
    });
  });
  /* Soy Dominguino */
  var soyBtn=document.getElementById('soyDominguinoBtn');
  var soyMenu=document.getElementById('soyDominguinoMenu');
  if(soyBtn&&soyMenu){
    soyBtn.addEventListener('click',function(e){
      e.preventDefault();
      soyMenu.classList.toggle('open');
      var arrow=soyBtn.querySelector('.td-arrow');
      if(arrow) arrow.style.transform=soyMenu.classList.contains('open')?'rotate(180deg)':'';
    });
    document.addEventListener('click',function(e){
      if(!soyBtn.contains(e.target)&&!soyMenu.contains(e.target)){
        soyMenu.classList.remove('open');
        var arrow=soyBtn.querySelector('.td-arrow');
        if(arrow) arrow.style.transform='';
      }
    });
  }
  /* Twemoji */
  window.addEventListener('load',function(){
    if(typeof twemoji!=='undefined') twemoji.parse(document.body,{folder:'svg',ext:'.svg'});
  });
})();

/* ═══ ADMIN SERVICIOS — mismo sistema OTP que index ═══ */
(function(){
  const CREDS=[{email:'gimnasiodomingosavio3@gmail.com',pass:'GDS1949'},{email:'calixtogonzalezj@gmail.com',pass:'GDS1949'},{email:'admin@gimnasiodomingosavio.edu.co',pass:'GDS1949'}];
  const MAX=4, BMS=10*60*1000;
  let otp=null,otpExp=null,blkTimer=null;

  function getAtt(){try{return JSON.parse(localStorage.getItem('gds_auth_attempts')||'{}');}catch(e){return{};}}
  function saveAtt(d){try{localStorage.setItem('gds_auth_attempts',JSON.stringify(d));}catch(e){}}
  function isBlk(){var d=getAtt();if(!d.blockedUntil)return false;if(Date.now()<d.blockedUntil)return true;saveAtt({});return false;}
  function regFail(){var d=getAtt();d.intentos=(d.intentos||0)+1;if(d.intentos>=MAX){d.blockedUntil=Date.now()+BMS;d.intentos=0;}saveAtt(d);return d;}
  function startBlk(until){
    var el=document.getElementById('blockCountdown'),er=document.getElementById('adminBlockError');
    if(!el||!er)return;er.style.display='block';clearInterval(blkTimer);
    blkTimer=setInterval(function(){var r=until-Date.now();if(r<=0){clearInterval(blkTimer);er.style.display='none';saveAtt({});return;}el.textContent=Math.floor(r/60000)+':'+String(Math.floor((r%60000)/1000)).padStart(2,'0');},1000);
  }

  function isLogged(){return sessionStorage.getItem('gds_admin')==='true';}

  window.adminCheckAuth=function(){
    if(isLogged()){
      var p=document.getElementById('adminPanelOverlay');if(p)p.classList.add('open');
      document.body.classList.add('modal-open');return;
    }
    var ov=document.getElementById('adminLoginOverlay');if(ov)ov.classList.add('open');
    document.body.classList.add('modal-open');
    if(isBlk())startBlk(getAtt().blockedUntil);
    setTimeout(function(){var e=document.getElementById('adminEmail');if(e)e.focus();},300);
  };

  window.cerrarAdminLogin=function(){
    var ov=document.getElementById('adminLoginOverlay');if(ov)ov.classList.remove('open');
    document.body.classList.remove('modal-open');
    var s1=document.getElementById('adminStepOTP');if(s1)s1.style.display='none';
    var s2=document.getElementById('adminStepEmail');if(s2)s2.style.display='block';
    var em=document.getElementById('adminEmail');if(em)em.value='';
    var pw=document.getElementById('adminPass');if(pw)pw.value='';
    var er=document.getElementById('adminLoginError');if(er)er.classList.remove('show');
  };

  window.doAdminStep1=async function(){
    if(isBlk()){startBlk(getAtt().blockedUntil);return;}
    var email=document.getElementById('adminEmail').value.trim().toLowerCase();
    var pass=document.getElementById('adminPass').value.trim();
    var er=document.getElementById('adminLoginError');er.classList.remove('show');
    var valid=CREDS.find(function(c){return c.email===email&&c.pass===pass;});
    if(!valid){var d=regFail();if(d.blockedUntil){startBlk(d.blockedUntil);return;}er.textContent='⚠️ Credenciales incorrectas. Intentos: '+(MAX-(d.intentos||0));er.classList.add('show');document.getElementById('adminPass').value='';return;}
    otp=String(Math.floor(100000+Math.random()*900000));otpExp=Date.now()+10*60*1000;
    var btn=document.querySelector('#adminStepEmail .btn-primary');if(btn){btn.disabled=true;btn.textContent='Enviando...';}
    try{
      emailjs.init({publicKey:'A8_-VTv06yO5YWU7-'});
      await emailjs.send('service_dapdvr6','template_0rtnkuc',{to_email:'calixtogonzalezj@gmail.com',otp_code:otp,expiry:'10 minutos',timestamp:new Date().toLocaleString('es-CO')});
    }catch(e){otp=null;otpExp=null;if(btn){btn.disabled=false;btn.textContent='Continuar →';}er.textContent='⚠️ Error enviando código. Intenta de nuevo.';er.classList.add('show');return;}
    if(btn){btn.disabled=false;btn.textContent='Continuar →';}
    document.getElementById('adminStepEmail').style.display='none';
    document.getElementById('adminStepOTP').style.display='block';
    var sh=document.getElementById('adminEmailShown');if(sh)sh.textContent='calixtogonzalezj@gmail.com';
    document.getElementById('adminOTPInput').value='';
    document.getElementById('adminOTPError').classList.remove('show');
    setTimeout(function(){document.getElementById('adminOTPInput').focus();},100);
  };

  window.doAdminStep2=function(){
    var input=document.getElementById('adminOTPInput').value.trim();
    var er=document.getElementById('adminOTPError');er.classList.remove('show');
    if(!otp||Date.now()>otpExp){er.textContent='⚠️ El código expiró.';er.classList.add('show');return;}
    if(input!==otp){var d=regFail();er.textContent='⚠️ Código incorrecto';er.classList.add('show');if(d.blockedUntil){window.cerrarAdminLogin();startBlk(d.blockedUntil);}return;}
    otp=null;otpExp=null;saveAtt({});sessionStorage.setItem('gds_admin','true');
    window.cerrarAdminLogin();
    var p=document.getElementById('adminPanelOverlay');if(p)p.classList.add('open');
    document.body.classList.add('modal-open');
  };

  window.volverAdminStep1=function(){
    document.getElementById('adminStepOTP').style.display='none';
    document.getElementById('adminStepEmail').style.display='block';
    otp=null;otpExp=null;
  };

  window.cerrarAdminPanel=function(){
    var p=document.getElementById('adminPanelOverlay');if(p)p.classList.remove('open');
    document.body.classList.remove('modal-open');
  };

  window.adminLogout=function(){
    sessionStorage.removeItem('gds_admin');
    window.cerrarAdminPanel();
  };

  window.abrirEditorServicios=function(){
    window.cerrarAdminPanel();
    var ov=document.getElementById('editorServiciosOverlay');if(ov)ov.classList.add('open');
    cargarDatosServicio('biblioteca');
  };

  window.cerrarEditorServicios=function(){
    var ov=document.getElementById('editorServiciosOverlay');if(ov)ov.classList.remove('open');
  };

  window.cargarDatosServicio=function(key){
    var d=window.servicios&&window.servicios[key];if(!d)return;
    var t=document.getElementById('edSrvTitulo');if(t)t.value=d.titulo||'';
    var tg=document.getElementById('edSrvTag');if(tg)tg.value=d.tag||'';
    var im=document.getElementById('edSrvImg');if(im)im.value=d.img||'';
    var cu=document.getElementById('edSrvCuerpo');
    if(cu)cu.value=(d.cuerpo||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
  };

  window.guardarServicio=async function(){
    var key=document.getElementById('edSrvSelect').value;
    if(!window.servicios||!window.servicios[key])return;
    var titulo=document.getElementById('edSrvTitulo').value.trim();
    var tag=document.getElementById('edSrvTag').value.trim();
    var img=document.getElementById('edSrvImg').value.trim();
    var cuerpo=document.getElementById('edSrvCuerpo').value.trim();
    if(titulo)window.servicios[key].titulo=titulo;
    if(tag)window.servicios[key].tag=tag;
    if(img)window.servicios[key].img=img;
    if(cuerpo){window.servicios[key].cuerpo='<p>'+cuerpo.split(String.fromCharCode(10)).join('</p><p>')+'</p>';}
    // Persistir en la API (base de datos)
    try { await GDS.admin.guardarServicio({ id: key, titulo: titulo, tag: tag, img: img, cuerpo_html: cuerpo ? '<p>'+cuerpo.split(String.fromCharCode(10)).join('</p><p>')+'</p>' : '' }); } catch(e) { console.error('Error guardando servicio:', e); var errT=document.createElement('div'); errT.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#c0392b;color:#fff;padding:12px 22px;border-radius:12px;font-size:13px;font-weight:600;z-index:99999;box-shadow:0 8px 32px rgba(0,0,0,.25);'; errT.textContent='Error al guardar: ' + (e.message || 'Error desconocido'); document.body.appendChild(errT); setTimeout(function(){errT.remove();},4000); return; }
    if(typeof window.renderServicios==='function')window.renderServicios();
    window.cerrarEditorServicios();
    var t=document.createElement('div');
    t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#132950;color:#fff;padding:12px 22px;border-radius:12px;font-size:13px;font-weight:600;z-index:99999;box-shadow:0 8px 32px rgba(0,0,0,.25);';
    t.textContent='✅ Servicio actualizado';document.body.appendChild(t);
    setTimeout(function(){t.remove();},3000);
  };

  window.agregarServicioNuevo = async function() {
    var nombre = prompt('Nombre del nuevo servicio:');
    if (!nombre || !nombre.trim()) return;
    var slug = nombre.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) { alert('Nombre inválido'); return; }
    if (window.servicios && window.servicios[slug]) { alert('Ya existe un servicio con ese nombre'); return; }
    if (!window.servicios) window.servicios = {};
    window.servicios[slug] = {
      tag: 'Nuevo Servicio',
      titulo: nombre.trim(),
      img: '',
      cuerpo: '<p>Descripción del servicio.</p>',
      chips: []
    };
    try {
      await GDS.admin.guardarServicio({ id: slug, titulo: nombre.trim(), tag: 'Nuevo Servicio', img: '', cuerpo_html: '<p>Descripción del servicio.</p>' });
      if (typeof window.renderServicios === 'function') window.renderServicios();
      // Add to dropdown
      var sel = document.getElementById('edSrvSelect');
      if (sel) {
        var opt = document.createElement('option');
        opt.value = slug;
        opt.textContent = nombre.trim();
        sel.appendChild(opt);
        sel.value = slug;
      }
      cargarDatosServicio(slug);
      var t = document.createElement('div');
      t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#132950;color:#fff;padding:12px 22px;border-radius:12px;font-size:13px;font-weight:600;z-index:99999;box-shadow:0 8px 32px rgba(0,0,0,.25);';
      t.textContent = 'Servicio creado';
      document.body.appendChild(t);
      setTimeout(function(){ t.remove(); }, 3000);
    } catch (e) {
      delete window.servicios[slug];
      var errT = document.createElement('div');
      errT.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#c0392b;color:#fff;padding:12px 22px;border-radius:12px;font-size:13px;font-weight:600;z-index:99999;box-shadow:0 8px 32px rgba(0,0,0,.25);';
      errT.textContent = 'Error al crear: ' + (e.message || 'Error desconocido');
      document.body.appendChild(errT);
      setTimeout(function(){ errT.remove(); }, 4000);
    }
  };

  window.eliminarServicioActual = async function() {
    var key = document.getElementById('edSrvSelect').value;
    if (!key) return;
    if (!confirm('Eliminar este servicio? Esta accion no se puede deshacer.')) return;
    try {
      await GDS.admin.eliminarServicio(key);
      if (window.servicios && window.servicios[key]) delete window.servicios[key];
      window.cerrarEditorServicios();
      if (typeof window.renderServicios === 'function') window.renderServicios();
      var t = document.createElement('div');
      t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#132950;color:#fff;padding:12px 22px;border-radius:12px;font-size:13px;font-weight:600;z-index:99999;box-shadow:0 8px 32px rgba(0,0,0,.25);';
      t.textContent = 'Servicio eliminado';
      document.body.appendChild(t);
      setTimeout(function(){ t.remove(); }, 3000);
    } catch (e) {
      var errT = document.createElement('div');
      errT.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#c0392b;color:#fff;padding:12px 22px;border-radius:12px;font-size:13px;font-weight:600;z-index:99999;box-shadow:0 8px 32px rgba(0,0,0,.25);';
      errT.textContent = 'Error al eliminar: ' + (e.message || 'Error desconocido');
      document.body.appendChild(errT);
      setTimeout(function(){ errT.remove(); }, 4000);
    }
  };

  // Nota: la persistencia ahora se hace por API (GDS.admin.guardarServicio).
  // Los datos se cargan desde el servidor al iniciar la página.
  // localStorage ya no es fuente de persistencia para servicios.
})();
