/* ════════════════════════════════════════════════════
   FEMIX PLUMBING — script.js
   SPA interactions · Carousel · Chatbot (Claude AI)
   Toast system · PWA · Tilt · Notifications · Scroll
   ════════════════════════════════════════════════════ */
'use strict';

/* ─── DOM HELPERS ─── */
const $  = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];

/* ════════════════════════════════════════════════════
   1. LOADER
════════════════════════════════════════════════════ */
window.addEventListener('load', () => {
  const loader = $('#loader');
  setTimeout(() => {
    loader?.classList.add('out');
    // Kick off hero entrance
    $$('.hero-section .reveal-fade').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), 100 + i * 110);
    });
  }, 1350);
});

/* ════════════════════════════════════════════════════
   2. THEME
════════════════════════════════════════════════════ */
(function themeSystem() {
  const html = document.documentElement;
  const KEY  = 'femix-v3-theme';
  const btns = $$('[data-theme]', $('.theme-switch'));

  function apply(t) {
    html.setAttribute('data-theme', t);
    localStorage.setItem(KEY, t);
    btns.forEach(b => {
      const on = b.dataset.theme === t;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  const saved = localStorage.getItem(KEY);
  if (saved) {
    apply(saved);
  } else {
    apply(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem(KEY)) apply(e.matches ? 'dark' : 'light');
    });
  }

  btns.forEach(b => b.addEventListener('click', () => apply(b.dataset.theme)));
})();

/* ════════════════════════════════════════════════════
   3. TOAST NOTIFICATION SYSTEM
════════════════════════════════════════════════════ */
const Toast = (function() {
  const container = $('#toastContainer');
  const ICONS = { success: '✓', error: '⚠', info: 'ℹ', warning: '⚡' };

  function show(title, msg, type = 'info', ms = 4200) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <span class="toast-icon">${ICONS[type] || '📢'}</span>
      <div class="toast-body">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        ${msg   ? `<div class="toast-msg">${msg}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Close notification">✕</button>
    `;
    container.appendChild(el);

    const dismiss = () => {
      el.classList.add('toast-out');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    };
    el.querySelector('.toast-close').addEventListener('click', dismiss);
    setTimeout(dismiss, ms);
  }

  return {
    success: (t, m, d) => show(t, m, 'success', d),
    error:   (t, m, d) => show(t, m, 'error',   d),
    info:    (t, m, d) => show(t, m, 'info',     d),
    warn:    (t, m, d) => show(t, m, 'warning',  d),
  };
})();

/* ════════════════════════════════════════════════════
   4. PARTICLE CANVAS
════════════════════════════════════════════════════ */
(function particles() {
  const canvas = $('#bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, pts = [], raf;

  class P {
    constructor() { this.reset(); }
    reset() {
      this.x   = Math.random() * W;
      this.y   = Math.random() * H;
      this.r   = Math.random() * 1.3 + 0.2;
      this.vx  = (Math.random() - 0.5) * 0.22;
      this.vy  = (Math.random() - 0.5) * 0.22;
      this.a   = Math.random();
      this.da  = (Math.random() * 0.003 + 0.001) * (Math.random() < 0.5 ? 1 : -1);
      this.hue = [42, 228, 185][Math.floor(Math.random() * 3)];
    }
  }

  const resize = () => { W = canvas.width = innerWidth; H = canvas.height = innerHeight; };
  const spawn  = () => { pts = Array.from({ length: Math.min(Math.floor(W * H / 14000), 78) }, () => new P()); };

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.x = (p.x + p.vx + W) % W;
      p.y = (p.y + p.vy + H) % H;
      p.a = Math.max(0, Math.min(1, p.a + p.da));
      if (p.a <= 0 || p.a >= 1) p.da *= -1;

      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue},60%,65%,${p.a * 0.65})`; ctx.fill();

      for (let j = i + 1; j < pts.length; j++) {
        const dx = p.x - pts[j].x, dy = p.y - pts[j].y;
        const d = Math.hypot(dx, dy);
        if (d < 100) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `hsla(${p.hue},55%,60%,${(1 - d / 100) * 0.07})`;
          ctx.lineWidth = 0.4; ctx.stroke();
        }
      }
    }
    raf = requestAnimationFrame(draw);
  }

  resize(); spawn(); draw();
  let deb;
  window.addEventListener('resize', () => {
    clearTimeout(deb);
    deb = setTimeout(() => { cancelAnimationFrame(raf); resize(); spawn(); draw(); }, 200);
  });
})();

/* ════════════════════════════════════════════════════
   5. SCROLL PROGRESS BAR
════════════════════════════════════════════════════ */
(function progressBar() {
  const fill = $('.scroll-progress-fill');
  if (!fill) return;
  window.addEventListener('scroll', () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    fill.style.width = h > 0 ? `${(scrollY / h) * 100}%` : '0%';
  }, { passive: true });
})();

/* ════════════════════════════════════════════════════
   6. HEADER SCROLL7th
════════════════════════════════════════════════════ */
const header = $('#header');
window.addEventListener('scroll', () => {
  header?.classList.toggle('scrolled', scrollY > 40);
}, { passive: true });

/* ════════════════════════════════════════════════════
   7. MOBILE DRAWER
════════════════════════════════════════════════════ */
const drawer  = $('#mobDrawer');
const overlay = $('#mobOverlay');
const hamBtn  = $('#hamBtn');

function openDrawer() {
  drawer?.classList.add('open');
  overlay?.classList.add('show');
  hamBtn?.classList.add('open');
  hamBtn?.setAttribute('aria-expanded', 'true');
  drawer?.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  drawer?.classList.remove('open');
  overlay?.classList.remove('show');
  hamBtn?.classList.remove('open');
  hamBtn?.setAttribute('aria-expanded', 'false');
  drawer?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

hamBtn?.addEventListener('click', () =>
  drawer?.classList.contains('open') ? closeDrawer() : openDrawer()
);
overlay?.addEventListener('click', closeDrawer);
$('#closeDrawer')?.addEventListener('click', closeDrawer);

function toggleContent(id) {
  const selectedContent = document.getElementById(id);
  const allContents = document.querySelectorAll('.item-content');

  allContents.forEach((content) => {
    if (content.id === id) {
      // Toggle the clicked one
      content.classList.toggle('active');
    } else {
      // Close all others
      content.classList.remove('active');
    }
  });
}

/* ════════════════════════════════════════════════════
   8. SPA NAVIGATION
════════════════════════════════════════════════════ */
function navH() {
  return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-total')) || 92;
}

function scrollTo(id) {
  const el = document.getElementById(id.replace('#', ''));
  if (!el) return;
  window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - navH(), behavior: 'smooth' });
  closeDrawer();
  closeChatIfOpen();
}

// Wire all [data-nav] links
$$('[data-nav]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (!href?.startsWith('#')) return;
    e.preventDefault();
    scrollTo(href);
  });
});

// Dropdown nav items that navigate + activate tab
$$('[data-dd-nav]').forEach(btn => {
  btn.addEventListener('click', () => {
    // Close dropdown
    btn.closest('.nav-dd')?.querySelector('.nav-dd-menu')?.classList.remove('show');
    scrollTo('#' + btn.dataset.ddNav);
    // Activate target tab after scroll settles
    const tab = btn.dataset.tab;
    if (tab) setTimeout(() => activateTab(tab), 600);
  });
});

/* ════════════════════════════════════════════════════
   9. SECTION OBSERVER — dots + active nav
════════════════════════════════════════════════════ */
const sectionObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const id = e.target.id;
    $$('.sdot').forEach(d => d.classList.toggle('active', d.dataset.target === id));
    $$('.nav-link[data-section]').forEach(l => l.classList.toggle('active', l.dataset.section === id));
  });
}, { threshold: 0.35 });

$$('[data-section]').forEach(s => sectionObs.observe(s));

// Side dots click
$$('.sdot').forEach(d => d.addEventListener('click', () => scrollTo('#' + d.dataset.target)));

/* ════════════════════════════════════════════════════
   10. SCROLL REVEAL
════════════════════════════════════════════════════ */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -36px 0px' });

$$('.reveal, .reveal-left, .reveal-right').forEach(el => revealObs.observe(el));

/* ════════════════════════════════════════════════════
   12. SERVICES TAB SYSTEM
════════════════════════════════════════════════════ */
function activateTab(name) {
  const tabs   = $$('.svc-tab');
  const panels = $$('.svc-panel');
  const ind    = $('#tabIndicator');

  tabs.forEach(t => {
    const on = t.dataset.tab === name;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', String(on));
    if (on && ind) {
      // Slide indicator
      const r = t.getBoundingClientRect();
      const pr = t.closest('.svc-tabs').getBoundingClientRect();
      ind.style.left  = (r.left - pr.left) + 'px';
      ind.style.width = r.width + 'px';
    }
  });

  panels.forEach(p => {
    const on = p.id === `tab-${name}`;
    p.classList.toggle('active', on);
    p.hidden = !on;
  });
}

// Init indicator position on load
window.addEventListener('load', () => {
  const activeTab = $('.svc-tab.active');
  if (activeTab) {
    const r  = activeTab.getBoundingClientRect();
    const pr = activeTab.closest('.svc-tabs')?.getBoundingClientRect();
    const ind = $('#tabIndicator');
    if (ind && pr) {
      ind.style.left  = (r.left - pr.left) + 'px';
      ind.style.width = r.width + 'px';
    }
  }
});

$$('.svc-tab').forEach(tab => {
  tab.addEventListener('click', () => activateTab(tab.dataset.tab));
});

// Service CTA → open quote modal with pre-selected service
$$('.panel-cta').forEach(btn => {
  btn.addEventListener('click', () => {
    const svc = btn.dataset.service;
    openModal('contactModal');
    const sel = $('#mfservice');
    if (sel && svc) {
      for (const opt of sel.options) {
        if (opt.text.includes(svc.split('(')[0].trim().replace(/&amp;/g, '&'))) {
          opt.selected = true; break;
        }
      }
    }
  });
});

/* ════════════════════════════════════════════════════
   13. REVIEW CAROUSEL
════════════════════════════════════════════════════ */
(function carousel() {
  const track    = $('#reviewsTrack');
  const prevBtn  = $('#revPrev');
  const nextBtn  = $('#revNext');
  const pipsWrap = $('#revPips');
  if (!track) return;

  const cards = $$('.review-card', track);
  let current = 0, perView = 3, auto;

  const ppv = () => window.innerWidth < 700 ? 1 : window.innerWidth < 1024 ? 2 : 3;

  function buildPips() {
    if (!pipsWrap) return;
    pipsWrap.innerHTML = '';
    const count = Math.ceil(cards.length / perView);
    for (let i = 0; i < count; i++) {
      const d = document.createElement('div');
      d.className = 'pip' + (i === 0 ? ' on' : '');
      d.addEventListener('click', () => goto(i));
      pipsWrap.appendChild(d);
    }
  }

  function goto(idx) {
    const count = Math.ceil(cards.length / perView);
    current = ((idx % count) + count) % count;
    const w = cards[0]?.offsetWidth + 20 || 0;
    track.style.transform = `translateX(-${current * perView * w}px)`;
    $$('.pip', pipsWrap).forEach((d, i) => d.classList.toggle('on', i === current));
  }

  function next() { goto(current + 1); }
  function prev() { goto(current - 1); }
  function resetAuto() { clearInterval(auto); auto = setInterval(next, 5200); }

  prevBtn?.addEventListener('click', () => { prev(); resetAuto(); });
  nextBtn?.addEventListener('click', () => { next(); resetAuto(); });

  // Touch/swipe
  let tx = 0;
  track.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 45) { dx < 0 ? next() : prev(); resetAuto(); }
  });

  // Keyboard when focused
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { next(); resetAuto(); }
    if (e.key === 'ArrowLeft')  { prev(); resetAuto(); }
  });

  function init() { perView = ppv(); buildPips(); goto(0); resetAuto(); }

  init();
  let rd;
  window.addEventListener('resize', () => {
    clearTimeout(rd);
    rd = setTimeout(() => { perView = ppv(); buildPips(); goto(0); }, 250);
  });
})();

/* ════════════════════════════════════════════════════
   14. 3D TILT CARDS
════════════════════════════════════════════════════ */
$$('.tilt-card, .pillar').forEach(card => {
  card.addEventListener('mousemove', e => {
    const { left, top, width, height } = card.getBoundingClientRect();
    const x = (e.clientX - left) / width  - 0.5;
    const y = (e.clientY - top)  / height - 0.5;
    card.style.transform = `perspective(700px) rotateX(${-y * 7}deg) rotateY(${x * 7}deg) translateZ(6px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(700px) rotateX(0) rotateY(0) translateZ(0)';
  });
});

/* ════════════════════════════════════════════════════
   15. MODAL SYSTEM
════════════════════════════════════════════════════ */
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  // Focus first focusable
  setTimeout(() => el.querySelector('input, select, button')?.focus(), 100);
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
  if (!$$('.modal-overlay.open').length) document.body.style.overflow = '';
}

$('#heroQuoteBtn')?.addEventListener('click',  () => openModal('contactModal'));
$('#openContactModal')?.addEventListener('click', () => openModal('contactModal'));
$('#closeContactModal')?.addEventListener('click', () => closeModal('contactModal'));
$('#closeSuccessModal')?.addEventListener('click', () => closeModal('successModal'));

// Click outside
$$('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay.id); });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    $$('.modal-overlay.open').forEach(m => closeModal(m.id));
    closeChat();
  }
});

/* ════════════════════════════════════════════════════
   16. SUCCESS CHIME
════════════════════════════════════════════════════ */
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = f;
      g.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
      g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.18 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.95);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 1);
    });
  } catch { /* silent */ }
}

/* ════════════════════════════════════════════════════
   17. FORM SUBMIT
════════════════════════════════════════════════════ */
async function handleForm(form, btn) {
  const invalids = [...form.querySelectorAll(':invalid')];
  if (invalids.length) {
    invalids.forEach(f => {
      f.style.borderColor = 'rgba(240,64,64,0.7)';
      f.style.boxShadow   = '0 0 0 3px rgba(240,64,64,0.1)';
      f.addEventListener('input', () => { f.style.borderColor = ''; f.style.boxShadow = ''; }, { once: true });
    });
    invalids[0].focus();
    Toast.error('Incomplete', 'Please fill in all required fields.');
    return;
  }

  const orig = btn.innerHTML;
  btn.innerHTML = '<span style="opacity:.65">Sending…</span>';
  btn.disabled = true;

  try {
    const r = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    });

    if (r.ok) {
      form.reset();
      playChime();
      closeModal('contactModal');
      setTimeout(() => openModal('successModal'), 80);
      notify('✅ Request Received', 'FEMIX team will contact you shortly.');
      Toast.success('Sent!', 'We\'ll get back to you within hours.');
    } else {
      Toast.error('Send failed', 'Please try again or call us directly.');
    }
  } catch {
    Toast.error('Network error', 'Please check your connection and try again.');
  } finally {
    btn.innerHTML = orig;
    btn.disabled = false;
  }
}

$('#contactForm')?.addEventListener('submit', e => { e.preventDefault(); handleForm(e.target, $('#submitBtn')); });
$('#modalContactForm')?.addEventListener('submit', e => { e.preventDefault(); handleForm(e.target, $('#modalSubmitBtn')); });

/* ════════════════════════════════════════════════════
   18. PWA + BROWSER NOTIFICATIONS
════════════════════════════════════════════════════ */
async function notify(title, body) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: 'images/femix-logo.webp', tag: 'femix' });
    } catch { /* Safari */ }
  }
}

// Service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Invite notification permission after delay
setTimeout(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Toast.info('Stay Updated', 'Enable notifications for FEMIX service alerts.', 6000);
  }
}, 16000);

/* ════════════════════════════════════════════════════
   19. BACK TO TOP
════════════════════════════════════════════════════ */
const bttBtn = $('#btt');
window.addEventListener('scroll', () => {
  if (!bttBtn) return;
  const show = scrollY > 500;
  bttBtn.style.opacity = show ? '1' : '0';
  bttBtn.style.pointerEvents = show ? 'auto' : 'none';
  bttBtn.tabIndex = show ? 0 : -1;
  bttBtn.classList.toggle('visible', show);
}, { passive: true });
bttBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ════════════════════════════════════════════════════
   20. FOOTER YEAR
════════════════════════════════════════════════════ */
const yr = $('#yr');
if (yr) yr.textContent = new Date().getFullYear();

/* ════════════════════════════════════════════════════
   21. BUTTON RIPPLE
════════════════════════════════════════════════════ */
(function ripple() {
  const style = document.createElement('style');
  style.textContent = '@keyframes ripple{from{transform:scale(0);opacity:1}to{transform:scale(4);opacity:0}}';
  document.head.appendChild(style);

  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn-primary, .panel-cta, .btn-emg, .nav-cta');
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const dot = document.createElement('span');
    dot.style.cssText = `
      position:absolute;border-radius:50%;
      width:70px;height:70px;margin:-35px;
      background:rgba(255,255,255,0.15);pointer-events:none;
      animation:ripple 0.55s ease-out forwards;
      left:${e.clientX - r.left}px;top:${e.clientY - r.top}px;
    `;
    if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(dot);
    dot.addEventListener('animationend', () => dot.remove(), { once: true });
  });
})()

