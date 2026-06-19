/* ════════════════════════════════════════════════════
   FEMIX PLUMBING — script.js  (SPA Edition)
   Single-Page Application router + all interactions
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
    $$('#view-home .reveal-fade').forEach((el, i) => {
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
   5. SCROLL PROGRESS (tracks active view scroll)
════════════════════════════════════════════════════ */
(function progressBar() {
  const fill = $('.scroll-progress-fill');
  if (!fill) return;
  function update() {
    // Track whichever view is currently scrolling
    const activeView = $('.spa-view--active');
    if (!activeView) return;
    const el   = activeView.classList.contains('spa-view--home') ? document.documentElement : activeView;
    const h    = el.scrollHeight - (activeView.classList.contains('spa-view--home') ? innerHeight : activeView.clientHeight);
    const pos  = activeView.classList.contains('spa-view--home') ? window.scrollY : activeView.scrollTop;
    fill.style.width = h > 0 ? `${(pos / h) * 100}%` : '0%';
  }
  window.addEventListener('scroll', update, { passive: true });
  // Also listen on page views
  $$('.spa-view--page').forEach(v => v.addEventListener('scroll', update, { passive: true }));
})();

/* ════════════════════════════════════════════════════
   6. HEADER SCROLL STYLE
════════════════════════════════════════════════════ */
const headerEl = $('#header');
window.addEventListener('scroll', () => {
  headerEl?.classList.toggle('scrolled', scrollY > 40);
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

/* Drawer accordion */
function toggleContent(id) {
  $$('.item-content').forEach(c => {
    c.classList.toggle('active', c.id === id ? !c.classList.contains('active') : false);
  });
}
// Expose globally (used in onclick attributes)
window.toggleContent = toggleContent;

/* ════════════════════════════════════════════════════
   8. ★ SPA ROUTER ★
   - Hash-based: #home #services #about #reviews #contact
   - Views slide in from right, back = slide out right
   - body scroll locked when a page-view is active
   - Scroll position of each view is remembered
════════════════════════════════════════════════════ */
const VIEWS     = ['home', 'services', 'about', 'reviews', 'contact'];
const scrollPos = {};   // remember scroll per view
let   currentView = 'home';

/* Low-level: swap which view element is visible */
function showView(id, pushHistory = true) {
  if (!VIEWS.includes(id)) id = 'home';
  if (id === currentView) return;

  const prev    = `view-${currentView}`;
  const next    = `view-${id}`;
  const prevEl  = document.getElementById(prev);
  const nextEl  = document.getElementById(next);
  if (!prevEl || !nextEl) return;

  // Save scroll position of leaving view
  scrollPos[currentView] = currentView === 'home'
    ? window.scrollY
    : prevEl.scrollTop;

  const goingHome = id === 'home';

  /* Animate out */
  prevEl.classList.add(goingHome ? 'spa-view--exit-right' : 'spa-view--exit-left');
  prevEl.addEventListener('animationend', () => {
    prevEl.classList.remove('spa-view--active', 'spa-view--exit-left', 'spa-view--exit-right');
    prevEl.setAttribute('aria-hidden', 'true');
  }, { once: true });

  /* Animate in */
  nextEl.classList.add(goingHome ? 'spa-view--enter-left' : 'spa-view--enter-right');
  nextEl.classList.add('spa-view--active');
  nextEl.setAttribute('aria-hidden', 'false');
  nextEl.addEventListener('animationend', () => {
    nextEl.classList.remove('spa-view--enter-right', 'spa-view--enter-left');
    // Restore scroll
    if (id === 'home') {
      window.scrollTo({ top: scrollPos['home'] || 0, behavior: 'instant' });
      document.body.style.overflow = '';
    } else {
      nextEl.scrollTop = scrollPos[id] || 0;
      document.body.style.overflow = 'hidden';
    }
  }, { once: true });

  currentView = id;

  /* Lock/unlock body scroll */
  if (id !== 'home') {
    document.body.style.overflow = 'hidden';
  }

  /* Update hash without triggering hashchange loop */
  if (pushHistory) {
    const hash = id === 'home' ? '#home' : `#${id}`;
    history.pushState({ view: id }, '', hash);
  }

  /* Update nav active states */
  updateNavActive(id);

  /* Trigger reveal animations on newly shown view */
  if (id !== 'home') {
    setTimeout(() => triggerReveals(nextEl), 80);
  }

  /* Re-init carousel when reviews view shown */
  if (id === 'reviews') {
    setTimeout(initCarousel, 120);
  }

  /* Re-init tab indicator when services view shown */
  if (id === 'services') {
    setTimeout(() => {
      const activeTab = $('.svc-tab.active');
      positionIndicator(activeTab);
    }, 120);
  }

  /* Close drawer if open */
  closeDrawer();
}

/* Navigate — public API */
function navigateTo(viewId, tab) {
  showView(viewId);
  if (tab && viewId === 'services') {
    setTimeout(() => activateTab(tab), 150);
  }
}

/* Hash-based routing on load + back/forward */
function routeFromHash() {
  const hash = location.hash.replace('#', '') || 'home';
  const id   = VIEWS.includes(hash) ? hash : 'home';
  if (id !== currentView) {
    // Instant swap (no animation) on initial load
    const prevEl = document.getElementById(`view-${currentView}`);
    const nextEl = document.getElementById(`view-${id}`);
    if (prevEl && nextEl) {
      prevEl.classList.remove('spa-view--active');
      prevEl.setAttribute('aria-hidden', 'true');
      nextEl.classList.add('spa-view--active');
      nextEl.setAttribute('aria-hidden', 'false');
      currentView = id;
      if (id !== 'home') document.body.style.overflow = 'hidden';
    }
    updateNavActive(id);
    if (id === 'reviews') setTimeout(initCarousel, 120);
    if (id === 'services') setTimeout(() => positionIndicator($('.svc-tab.active')), 120);
  }
}

window.addEventListener('hashchange', () => routeFromHash());
window.addEventListener('popstate',   e  => {
  const id = e.state?.view || 'home';
  if (id !== currentView) {
    showView(id, false);
  }
});

/* Update active state on all nav triggers */
function updateNavActive(id) {
  $$('[data-view]').forEach(el => {
    el.classList.toggle('active', el.dataset.view === id);
  });
  /* Side dots on home view */
  $$('.sdot').forEach(d => d.classList.toggle('active', d.dataset.target === id));
}

/* Wire ALL [data-view] elements */
document.addEventListener('click', e => {
  const trigger = e.target.closest('[data-view]');
  if (!trigger) return;

  // Allow normal links for tel/mailto/external
  if (trigger.tagName === 'A') {
    const href = trigger.getAttribute('href') || '';
    if (!href.startsWith('#') && !href.startsWith('javascript')) return;
  }

  e.preventDefault();
  const viewId = trigger.dataset.view;
  const tab    = trigger.dataset.tab;
  if (viewId) navigateTo(viewId, tab);
});

/* ════════════════════════════════════════════════════
   9. REVEAL ANIMATIONS
════════════════════════════════════════════════════ */
function triggerReveals(container) {
  const revObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });

  $$('.reveal, .reveal-left, .reveal-right, .reveal-fade', container).forEach(el => {
    el.classList.remove('visible');
    revObs.observe(el);
  });
}

/* Home view reveals on scroll */
const homeRevObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      homeRevObs.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -36px 0px' });
$$('#view-home .reveal, #view-home .reveal-left, #view-home .reveal-right').forEach(el => homeRevObs.observe(el));

/* ════════════════════════════════════════════════════
   10. SERVICES TAB SYSTEM
════════════════════════════════════════════════════ */
function positionIndicator(tab) {
  const ind = $('#tabIndicator');
  if (!tab || !ind) return;
  const r  = tab.getBoundingClientRect();
  const pr = tab.closest('.svc-tabs')?.getBoundingClientRect();
  if (!pr) return;
  ind.style.left  = (r.left - pr.left) + 'px';
  ind.style.width = r.width + 'px';
}

function activateTab(name) {
  $$('.svc-tab').forEach(t => {
    const on = t.dataset.tab === name;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', String(on));
    if (on) positionIndicator(t);
  });
  $$('.svc-panel').forEach(p => {
    const on = p.id === `tab-${name}`;
    p.classList.toggle('active', on);
    p.hidden = !on;
  });
}

$$('.svc-tab').forEach(tab => tab.addEventListener('click', () => activateTab(tab.dataset.tab)));

/* Service CTA → open quote modal with pre-selected service */
$$('.panel-cta').forEach(btn => {
  btn.addEventListener('click', () => {
    const svc = btn.dataset.service;
    openModal('contactModal');
    if (svc) {
      const sel = $('#mfservice');
      if (!sel) return;
      for (const opt of sel.options) {
        if (opt.text.includes(svc.split('(')[0].trim().replace(/&amp;/g, '&'))) {
          opt.selected = true; break;
        }
      }
    }
  });
});

/* ════════════════════════════════════════════════════
   11. REVIEW CAROUSEL
════════════════════════════════════════════════════ */
let carouselInitted = false;

function initCarousel() {
  const track    = $('#reviewsTrack');
  const prevBtn  = $('#revPrev');
  const nextBtn  = $('#revNext');
  const pipsWrap = $('#revPips');
  if (!track) return;

  const cards = $$('.review-card', track);
  let current = 0, perView, auto;

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
    const w = (cards[0]?.offsetWidth || 0) + 20;
    track.style.transform = `translateX(-${current * perView * w}px)`;
    $$('.pip', pipsWrap).forEach((d, i) => d.classList.toggle('on', i === current));
  }

  function next() { goto(current + 1); }
  function prev() { goto(current - 1); }
  function resetAuto() { clearInterval(auto); auto = setInterval(next, 5200); }

  // Remove old listeners by replacing buttons
  const newPrev = prevBtn?.cloneNode(true);
  const newNext = nextBtn?.cloneNode(true);
  prevBtn?.parentNode?.replaceChild(newPrev, prevBtn);
  nextBtn?.parentNode?.replaceChild(newNext, nextBtn);
  newPrev?.addEventListener('click', () => { prev(); resetAuto(); });
  newNext?.addEventListener('click', () => { next(); resetAuto(); });

  let tx = 0;
  track.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 45) { dx < 0 ? next() : prev(); resetAuto(); }
  });

  perView = ppv();
  buildPips();
  goto(0);
  resetAuto();

  let rd;
  window.addEventListener('resize', () => {
    clearTimeout(rd);
    rd = setTimeout(() => { perView = ppv(); buildPips(); goto(0); }, 250);
  });
}

/* ════════════════════════════════════════════════════
   12. 3D TILT CARDS + cursor-tracked glow
════════════════════════════════════════════════════ */
document.addEventListener('mousemove', e => {
  const card = e.target.closest('.tilt-card, .pillar');
  if (!card) return;
  const { left, top, width, height } = card.getBoundingClientRect();
  const x = (e.clientX - left) / width  - 0.5;
  const y = (e.clientY - top)  / height - 0.5;
  card.style.transform = `perspective(700px) rotateX(${-y * 7}deg) rotateY(${x * 7}deg) translateZ(6px)`;
  // Position the light-catch glow at the cursor (used by .pillar::after)
  card.style.setProperty('--mx', `${((e.clientX - left) / width) * 100}%`);
  card.style.setProperty('--my', `${((e.clientY - top) / height) * 100}%`);
});
document.addEventListener('mouseleave', e => {
  const card = e.target.closest('.tilt-card, .pillar');
  if (card) card.style.transform = 'perspective(700px) rotateX(0) rotateY(0) translateZ(0)';
}, true);

/* ════════════════════════════════════════════════════
   13. MODAL SYSTEM
════════════════════════════════════════════════════ */
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  // Don't lock body if a page-view is already managing overflow
  if (currentView === 'home') document.body.style.overflow = 'hidden';
  setTimeout(() => el.querySelector('input, select, button')?.focus(), 100);
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
  // Restore body scroll only if no page-view is active
  if (currentView === 'home' && !$$('.modal-overlay.open').length) {
    document.body.style.overflow = '';
  }
}

$('#heroQuoteBtn')?.addEventListener('click',    () => openModal('contactModal'));
$('#openContactModal')?.addEventListener('click', () => openModal('contactModal'));
$('#closeContactModal')?.addEventListener('click',() => closeModal('contactModal'));
$('#closeSuccessModal')?.addEventListener('click',() => closeModal('successModal'));

$$('.modal-overlay').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target === ov) closeModal(ov.id); });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    $$('.modal-overlay.open').forEach(m => closeModal(m.id));
  }
});

/* ════════════════════════════════════════════════════
   14. SUCCESS CHIME
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
   15. FORM SUBMIT
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

$('#contactForm')?.addEventListener('submit',      e => { e.preventDefault(); handleForm(e.target, $('#submitBtn'));      });
$('#modalContactForm')?.addEventListener('submit', e => { e.preventDefault(); handleForm(e.target, $('#modalSubmitBtn')); });

/* ════════════════════════════════════════════════════
   16. PWA + BROWSER NOTIFICATIONS
════════════════════════════════════════════════════ */
async function notify(title, body) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') await Notification.requestPermission();
  if (Notification.permission === 'granted') {
    try { new Notification(title, { body, icon: 'images/femix-logo.webp', tag: 'femix' }); }
    catch { /* Safari */ }
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

setTimeout(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Toast.info('Stay Updated', 'Enable notifications for FEMIX service alerts.', 6000);
  }
}, 16000);

/* ════════════════════════════════════════════════════
   17. FOOTER YEAR
════════════════════════════════════════════════════ */
const yr = $('#yr');
if (yr) yr.textContent = new Date().getFullYear();

/* ════════════════════════════════════════════════════
   18. BUTTON RIPPLE
════════════════════════════════════════════════════ */
(function ripple() {
  const style = document.createElement('style');
  style.textContent = '@keyframes ripple{from{transform:scale(0);opacity:1}to{transform:scale(4);opacity:0}}';
  document.head.appendChild(style);

  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn-primary, .panel-cta, .btn-emg, .nav-cta, .spa-qcard');
    if (!btn) return;
    const r   = btn.getBoundingClientRect();
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
})();

/* ════════════════════════════════════════════════════
   18b. HERO BANNER PARALLAX
════════════════════════════════════════════════════ */
(function heroParallax() {
  const img = $('.hero-banner-img');
  if (!img) return;
  img.classList.add('parallax');

  function update() {
    const hero = $('#hero');
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    // Only animate while hero is in view
    if (rect.bottom < 0 || rect.top > innerHeight) return;
    const offset = rect.top * 0.12;   // subtle drift factor
    img.style.transform = `translateY(${offset}px) scale(1.06)`;
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
})();

/* ════════════════════════════════════════════════════
   19. INIT ON LOAD
════════════════════════════════════════════════════ */
window.addEventListener('load', () => {
  // Route from URL hash on first load
  routeFromHash();

  // Init tab indicator
  setTimeout(() => positionIndicator($('.svc-tab.active')), 200);

  // If landing on reviews, init carousel
  if (location.hash === '#reviews') setTimeout(initCarousel, 200);
});
