/* ============================================
   GDS — comportamiento común del sitio
   ============================================ */

'use strict';

/* ── Page load animation ────────────────────────── */
document.body.style.opacity = '0';
document.body.style.transition = 'opacity .35s ease';
window.addEventListener('load', () => {
  document.body.style.opacity = '1';

  if (typeof twemoji !== 'undefined') {
    twemoji.parse(document.body, {
      folder: 'svg',
      ext: '.svg',
      base: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/'
    });
  }
});

/* ── Navbar scroll ─────────────────────────── */
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
    updateWhatsappFloat(window.scrollY);
  }, { passive: true });
}

/* ── Navbar dropdown ───────────────────────── */
const dropdownTimers = {};
document.querySelectorAll('.nav-item').forEach((item, idx) => {
  item.addEventListener('mouseenter', () => {
    clearTimeout(dropdownTimers[idx]);

    document.querySelectorAll('.nav-item').forEach((other, otherIndex) => {
      if (otherIndex !== idx) {
        clearTimeout(dropdownTimers[otherIndex]);
        other.classList.remove('dropdown-open');
      }
    });
    item.classList.add('dropdown-open');
  });
  item.addEventListener('mouseleave', () => {
    dropdownTimers[idx] = setTimeout(() => {
      item.classList.remove('dropdown-open');
    }, 280);
  });
});

/* ── Hamburger ─────────────────────────────── */
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
  document.addEventListener('click', (event) => {
    if (navbar && !navbar.contains(event.target)) {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
      document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('open'));
    }
  });
  document.querySelectorAll('.nav-item .nav-link').forEach(link => {
    link.addEventListener('click', (event) => {
      if (window.innerWidth <= 768) {
        const item = link.closest('.nav-item');
        const wasOpen = item.classList.contains('open');
        document.querySelectorAll('.nav-item').forEach(other => other.classList.remove('open'));
        if (!wasOpen) {
          item.classList.add('open');
          event.preventDefault();
        }
      }
    });
  });
}

/* ── Hero slider ───────────────────────────── */
const slides = document.querySelectorAll('.hero-slide');
const dots = document.querySelectorAll('.dot');
const INTERVAL = 5000;
let current = 0;
let timer = null;
let elapsed = 0;
let progressTimer = null;
const progressBar = document.getElementById('heroProgressBar');

if (slides.length) {
  function goTo(index) {
    slides[current].classList.remove('active');
    if (dots[current]) dots[current].classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    if (dots[current]) dots[current].classList.add('active');
    resetProgress();
  }

  function resetProgress() {
    elapsed = 0;
    if (progressBar) progressBar.style.width = '0%';
    clearInterval(progressTimer);
    progressTimer = setInterval(() => {
      elapsed += 100;
      const percentage = Math.min((elapsed / INTERVAL) * 100, 100);
      if (progressBar) progressBar.style.width = percentage + '%';
      if (elapsed >= INTERVAL) clearInterval(progressTimer);
    }, 100);
  }

  function startAuto() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), INTERVAL);
    resetProgress();
  }

  function stopAuto() {
    clearInterval(timer);
    clearInterval(progressTimer);
  }

  const sliderNext = document.getElementById('sliderNext');
  const sliderPrev = document.getElementById('sliderPrev');
  if (sliderNext) sliderNext.addEventListener('click', () => { stopAuto(); goTo(current + 1); startAuto(); });
  if (sliderPrev) sliderPrev.addEventListener('click', () => { stopAuto(); goTo(current - 1); startAuto(); });
  dots.forEach((dot, index) => dot.addEventListener('click', () => { stopAuto(); goTo(index); startAuto(); }));

  const heroSlider = document.getElementById('heroSlider');
  if (heroSlider) {
    let touchStartX = 0;
    heroSlider.addEventListener('touchstart', event => { touchStartX = event.touches[0].clientX; }, { passive: true });
    heroSlider.addEventListener('touchend', event => {
      const difference = touchStartX - event.changedTouches[0].clientX;
      if (Math.abs(difference) > 45) {
        stopAuto();
        goTo(difference > 0 ? current + 1 : current - 1);
        startAuto();
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') { stopAuto(); goTo(current + 1); startAuto(); }
    if (event.key === 'ArrowLeft') { stopAuto(); goTo(current - 1); startAuto(); }
  });

  startAuto();
}

/* ── WhatsApp float ────────────────────────── */
const whatsappFloat = document.getElementById('whatsappFloat');
function updateWhatsappFloat(scrollPosition) {
  if (whatsappFloat) whatsappFloat.classList.toggle('visible', scrollPosition > 300);
}

/* ── Tabs ──────────────────────────────────── */
document.querySelectorAll('.tab-btn').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    const target = document.getElementById('tab-' + button.dataset.tab);
    if (target) target.classList.add('active');
  });
});

/* ── Scroll reveal ─────────────────────────── */
const revealItems = document.querySelectorAll(
  '.info-card, .perfil-card, .proceso-step, .noticia-card, .noticia-full-card, .portal-card, .convenio-logo, .float-card, .stat-item, .org-card, .org-docente-card, .colab-card, .mapa-info-card'
);

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0) scale(1)';
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

revealItems.forEach((element, index) => {
  element.style.opacity = '0';
  element.style.transform = 'translateY(24px) scale(.98)';
  element.style.transition = `opacity .48s ease ${(index % 8) * 0.06}s, transform .48s ease ${(index % 8) * 0.06}s, box-shadow .26s, border-color .26s`;
  revealObserver.observe(element);
});

document.querySelectorAll('.section-header').forEach(element => {
  element.style.opacity = '0';
  element.style.transform = 'translateY(16px)';
  element.style.transition = 'opacity .55s ease, transform .55s ease';
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  observer.observe(element);
});

/* ── Stat counter ──────────────────────────── */
function animateCount(element, target, suffix = '') {
  const duration = 1800;
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.floor(ease * target).toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

const countObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const element = entry.target.querySelector('.stat-num-animated');
      const target = parseInt(entry.target.dataset.count);
      const suffix = entry.target.dataset.suffix || '';
      if (element && !isNaN(target)) animateCount(element, target, suffix);
      countObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.4 });

document.querySelectorAll('.stat-item[data-count]').forEach(element => countObserver.observe(element));

/* ── Horarios parallax ─────────────────────── */
['horarioPrimaria', 'horarioSecundaria'].forEach(id => {
  const element = document.getElementById(id);
  if (!element) return;
  element.addEventListener('mousemove', event => {
    const rect = element.getBoundingClientRect();
    const xPercent = ((event.clientX - rect.left) / rect.width - .5) * 10;
    const yPercent = ((event.clientY - rect.top) / rect.height - .5) * 10;
    element.querySelector('.horario-content').style.transform = `translate(${xPercent}px,${yPercent}px) scale(1.04)`;
  });
  element.addEventListener('mouseleave', () => {
    element.querySelector('.horario-content').style.transform = '';
  });
});

/* ── Video placeholder ─────────────────────── */
const videoPlaceholder = document.getElementById('videoPlaceholder');
if (videoPlaceholder) {
  videoPlaceholder.addEventListener('click', () => window.open('https://youtu.be/lV7-vJBPBWA', '_blank'));
}

/* ── Resize: close mobile menu ──────────────── */
window.addEventListener('resize', () => {
  if (window.innerWidth > 768 && hamburger && navLinks) {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('open'));
  }
});

/* ── Topbar CTA pulse ───────────────────────── */
const inscriptionCta = document.querySelector('.topbar-cta');
if (inscriptionCta) {
  setInterval(() => {
    inscriptionCta.style.transform = 'scale(1.06)';
    setTimeout(() => { inscriptionCta.style.transform = ''; }, 300);
  }, 5000);
}

/* ── Button feedback ───────────────────────── */
document.addEventListener('click', event => {
  const button = event.target.closest('button, .btn-primary, .btn-secondary, .btn-ghost, .btn-outline, .btn-whatsapp, .btn-acento, .btn-inscripcion');
  if (!button) return;
  button.style.transition = 'transform .12s cubic-bezier(0.34,1.56,0.64,1)';
  button.style.transform = 'scale(0.95)';
  setTimeout(() => { button.style.transform = ''; }, 140);
});

/* ── Page visibility ───────────────────────── */
document.addEventListener('visibilitychange', () => {
  const statsTrack = document.querySelector('.stats-track');
  const conveniosTrack = document.querySelector('.convenios-track');
  const state = document.hidden ? 'paused' : 'running';
  if (statsTrack) statsTrack.style.animationPlayState = state;
  if (conveniosTrack) conveniosTrack.style.animationPlayState = state;
});