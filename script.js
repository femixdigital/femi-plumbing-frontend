/* ════════════════════════════════════════════════════
   FEMIX PLUMBING — script.js  (SPA Edition)
   Single-Page Application router + all interactions
   ════════════════════════════════════════════════════ */
'use strict';

/* ─── BACKEND URL ─── */
const BACKEND_URL = 'https://femix-plumbing-backend.onrender.com/book';

/* ─── DOM HELPERS ─── */
const $  = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];

/* ─── SHARED FIELD VALIDITY RULES ───
   Used by BOTH the green-checkmark indicator AND the booking
   wizard's step-advance gate, so they can never disagree — a
   field only ever shows green when it would actually let you
   press Continue, and Continue only ever fails on a field that
   isn't already showing green. */
const FIELD_RULES = {
  // At least two "words" (first + last name), letters only per word
  // (allows hyphens/apostrophes inside a word, e.g. "Mary-Jane O'Brien").
  fname: v => /^[A-Za-z]{2,}(?:['-][A-Za-z]{2,})?(?:\s+[A-Za-z]{2,}(?:['-][A-Za-z]{2,})?)+$/.test(v.trim()),
  // Standard email shape: something@something.tld (tld letters only, 2+ chars).
  femail: v => /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v.trim()),
  // Nigerian mobile number: 0XXXXXXXXXX (11 digits) or +234/234XXXXXXXXXX,
  // where the subscriber number starts with 7, 8, or 9.
  fphone: v => {
    const d = v.replace(/[^\d+]/g, '');
    return /^0[7-9]\d{9}$/.test(d) || /^(?:\+?234)[7-9]\d{9}$/.test(d);
  },
  faddress: v => v.trim().length >= 5
};

document.addEventListener('visibilitychange', () => {
  document.body.classList.toggle('is-tab-hidden', document.hidden);
});

// The fixed WhatsApp/Call bubbles sit in the same bottom-right corner as
// the footer's own "Contact" nav card — fade them out of the way whenever
// that card scrolls into view so they can never steal its taps.
(function footerFabClearance() {
  const footerNav = $('.footer-nav-row');
  if (!footerNav || !('IntersectionObserver' in window)) return;
  const obs = new IntersectionObserver(
    entries => entries.forEach(e => document.body.classList.toggle('is-footer-in-view', e.isIntersecting)),
    { rootMargin: '0px 0px -20% 0px', threshold: 0.15 }
  );
  obs.observe(footerNav);
})();

/* ════════════════════════════════════════════════════
   1. LOADER
   Shows just long enough to read as intentional, then
   gets out of the way — it no longer waits for the full
   window "load" event (every image/font/script), which is
   what made the site feel like it was hanging. A safety
   timeout also guarantees it never blocks the page even on
   a slow connection.
════════════════════════════════════════════════════ */
(function loaderControl() {
  const loader = $('#loader');
  const MIN_VISIBLE = 320; // long enough to not flicker, short enough to feel instant
  const MAX_WAIT    = 1600; // hard cap — the loader can never hang the site
  const start = Date.now();
  let done = false;

  function hide() {
    if (done) return;
    done = true;
    const wait = Math.max(MIN_VISIBLE - (Date.now() - start), 0);
    setTimeout(() => {
      loader?.classList.add('out');
      $$('#view-home .reveal-fade').forEach((el, i) => {
        setTimeout(() => el.classList.add('visible'), 60 + i * 80);
      });
    }, wait);
  }

  if (document.readyState === 'complete') {
    hide();
  } else {
    window.addEventListener('load', hide, { once: true });
  }
  setTimeout(hide, MAX_WAIT);
})();

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
  const activeToasts = {}; // key -> element, so we can update/replace in place

  function show(title, msg, type = 'info', ms = 4200, key = null) {
    // If a keyed toast already exists (e.g. the "waking up server" notice),
    // update it in place instead of stacking duplicates.
    if (key && activeToasts[key]) {
      const el = activeToasts[key];
      el.className = `toast ${type}`;
      el.querySelector('.toast-icon').textContent = ICONS[type] || '📢';
      const titleEl = el.querySelector('.toast-title');
      const msgEl   = el.querySelector('.toast-msg');
      if (titleEl) titleEl.textContent = title || '';
      if (msgEl)   msgEl.textContent   = msg || '';
      clearTimeout(el._dismissTimer);
      if (ms > 0) el._dismissTimer = setTimeout(() => dismiss(el, key), ms);
      return el;
    }

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
    container?.appendChild(el);
    if (key) activeToasts[key] = el;

    function dismiss(node, k) {
      node.classList.add('toast-out');
      node.addEventListener('animationend', () => {
        node.remove();
        if (k && activeToasts[k] === node) delete activeToasts[k];
      }, { once: true });
    }

    el.querySelector('.toast-close').addEventListener('click', () => dismiss(el, key));
    if (ms > 0) el._dismissTimer = setTimeout(() => dismiss(el, key), ms);
    return el;
  }

  return {
    success: (t, m, d) => show(t, m, 'success', d),
    error:   (t, m, d) => show(t, m, 'error',   d),
    info:    (t, m, d, key) => show(t, m, 'info',     d ?? 4200, key),
    warn:    (t, m, d, key) => show(t, m, 'warning',  d ?? 4200, key),
    dismissKey: (key) => {
      const el = activeToasts[key];
      if (!el) return;
      el.classList.add('toast-out');
      el.addEventListener('animationend', () => { el.remove(); delete activeToasts[key]; }, { once: true });
    }
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
  const spawn = () => {
    const cap = W < 640 ? 34 : W < 1024 ? 56 : 78;
    pts = Array.from({ length: Math.min(Math.floor(W * H / 14000), cap) }, () => new P());
  };

  let paused = false;

  function draw() {
    if (paused) return;
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

  // Free up the main thread when the tab is backgrounded — a background
  // canvas animation gains the visitor nothing while they're on another tab.
  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
    if (!paused) { cancelAnimationFrame(raf); draw(); }
  });
})();

/* ════════════════════════════════════════════════════
   5. SCROLL PROGRESS
════════════════════════════════════════════════════ */
(function progressBar() {
  const fill = $('.scroll-progress-fill');
  if (!fill) return;
  function update() {
    const activeView = $('.spa-view--active');
    if (!activeView) return;
    const el  = activeView.classList.contains('spa-view--home') ? document.documentElement : activeView;
    const h   = el.scrollHeight - (activeView.classList.contains('spa-view--home') ? innerHeight : activeView.clientHeight);
    const pos = activeView.classList.contains('spa-view--home') ? window.scrollY : activeView.scrollTop;
    fill.style.width = h > 0 ? `${(pos / h) * 100}%` : '0%';
  }
  window.addEventListener('scroll', update, { passive: true });
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

// Drawer's "Contact" item: always take the visitor home, then bring the
// on-page Contact card into view — works whether they opened the drawer
// from Home or from any other view.
$('#drawerContactBtn')?.addEventListener('click', () => {
  setTimeout(() => {
    document.getElementById('contactCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, currentView === 'home' ? 50 : 420);
});

/* ════════════════════════════════════════════════════
   8. ★ SPA ROUTER ★
════════════════════════════════════════════════════ */
const VIEWS     = ['home', 'services', 'about', 'reviews', 'contact'];
const scrollPos = {};
let   currentView = 'home';

function showView(id, pushHistory = true) {
  if (!VIEWS.includes(id)) id = 'home';
  if (id === currentView) return;

  const prev   = `view-${currentView}`;
  const next   = `view-${id}`;
  const prevEl = document.getElementById(prev);
  const nextEl = document.getElementById(next);
  if (!prevEl || !nextEl) return;

  scrollPos[currentView] = currentView === 'home'
    ? window.scrollY
    : prevEl.scrollTop;

  const goingHome = id === 'home';

  prevEl.classList.add(goingHome ? 'spa-view--exit-right' : 'spa-view--exit-left');
  prevEl.addEventListener('animationend', () => {
    prevEl.classList.remove('spa-view--active', 'spa-view--exit-left', 'spa-view--exit-right');
    prevEl.setAttribute('aria-hidden', 'true');
  }, { once: true });

  nextEl.classList.add(goingHome ? 'spa-view--enter-left' : 'spa-view--enter-right');
  nextEl.classList.add('spa-view--active');
  nextEl.setAttribute('aria-hidden', 'false');
  nextEl.addEventListener('animationend', () => {
    nextEl.classList.remove('spa-view--enter-right', 'spa-view--enter-left');
    if (id === 'home') {
      window.scrollTo({ top: scrollPos['home'] || 0, behavior: 'instant' });
      document.body.style.overflow = '';
    } else {
      nextEl.scrollTop = scrollPos[id] || 0;
      document.body.style.overflow = 'hidden';
    }
  }, { once: true });

  currentView = id;

  if (id !== 'home') document.body.style.overflow = 'hidden';

  if (pushHistory) {
    history.pushState({ view: id }, '', id === 'home' ? '#home' : `#${id}`);
  }

  updateNavActive(id);

  if (id !== 'home') setTimeout(() => triggerReveals(nextEl), 80);
  if (id === 'reviews') setTimeout(initCarousel, 120);
  if (id === 'services') {
    setTimeout(() => {
      const activeTab = $('.svc-tab.active');
      positionIndicator(activeTab);
    }, 120);
  }

  closeDrawer();
}

function navigateTo(viewId, tab) {
  showView(viewId);
  if (tab && viewId === 'services') {
    setTimeout(() => activateTab(tab), 150);
  }
}

function routeFromHash() {
  const hash = location.hash.replace('#', '') || 'home';
  const id   = VIEWS.includes(hash) ? hash : 'home';
  if (id !== currentView) {
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
window.addEventListener('popstate', e => {
  const id = e.state?.view || 'home';
  if (id !== currentView) showView(id, false);
});

function updateNavActive(id) {
  $$('[data-view]').forEach(el => {
    el.classList.toggle('active', el.dataset.view === id);
  });
  $$('.sdot').forEach(d => d.classList.toggle('active', d.dataset.target === id));
  // The fixed WhatsApp/Call bubbles can visually sit on top of the booking
  // wizard's Continue/Back buttons on short screens, silently swallowing
  // taps meant for the form. There's already a WhatsApp link and phone
  // number inside the booking flow itself, so hide the floating duplicates
  // while that view is open.
  document.body.classList.toggle('is-booking-view', id === 'contact');
}

document.addEventListener('click', e => {
  const trigger = e.target.closest('[data-view]');
  if (!trigger) return;
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

/* ════════════════════════════════════════════════════
   10a. BOOKING WIZARD — 4-step SPA flow inside the card
   Details → Service → Payment → Confirm. Steps swap via
   class/hidden toggles only — the booking card itself
   never moves or resizes the surrounding page, it just
   swaps its own inner content, so it stays put on screen
   as you move through it (per-step validation runs on
   only the currently visible step; native `required`
   fields on hidden steps are automatically excluded from
   constraint validation by the browser, so they can never
   block progress on an earlier step).
════════════════════════════════════════════════════ */
const BookingWizard = (function () {
  const TOTAL = 4;
  let current = 1;

  const stepEl = n => document.querySelector(`.form-step[data-step="${n}"]`);

  function validateStep(n) {
    const el = stepEl(n);
    if (!el) return true;
    const fields = $$('input, select, textarea', el).filter(f => f.required);
    const invalids = fields.filter(f => {
      const rule = FIELD_RULES[f.id];
      // A field with a stricter shared rule must pass THAT rule (not just
      // "non-empty") before it counts as valid for continuing.
      return rule ? !rule(f.value) : !f.checkValidity();
    });
    if (invalids.length) {
      invalids.forEach(f => {
        // The service select is visually hidden (the custom dropdown trigger
        // is what people actually see) — show the red-border feedback on
        // the trigger instead, or nobody would ever see it.
        const target = f.id === 'fservice' ? ($('#fserviceTrigger') || f) : f;
        target.style.borderColor = 'rgba(240,64,64,0.7)';
        target.style.boxShadow   = '0 0 0 3px rgba(240,64,64,0.1)';
        const clear = () => { target.style.borderColor = ''; target.style.boxShadow = ''; };
        target.addEventListener('input', clear, { once: true });
        target.addEventListener('click', clear, { once: true });
      });
      Toast.error('Check your details', 'One or more fields need to be entered correctly before continuing.');
      return false;
    }
    return true;
  }

  function render() {
    $$('.form-step').forEach(el => {
      const n = Number(el.dataset.step);
      const active = n === current;
      el.classList.toggle('form-step--active', active);
      el.hidden = !active;
    });
    $$('.bstep').forEach(tab => {
      const n = Number(tab.dataset.step);
      tab.classList.toggle('active', n === current);
      tab.classList.toggle('completed', n < current);
      tab.setAttribute('aria-selected', String(n === current));
      const numEl = tab.querySelector('.bstep-num');
      if (numEl) numEl.textContent = n < current ? '✓' : String(n);
    });
    $$('.bstep-line').forEach((line, i) => {
      line.classList.toggle('filled', (i + 1) < current);
    });
    // Focus the first field of the newly visible step for keyboard users,
    // but only after it's actually rendered (avoids focusing display:none),
    // and never the visually-hidden native <select> that backs the custom
    // service dropdown — its own trigger button is the visible control.
    requestAnimationFrame(() => {
      const el = stepEl(current);
      const target = el?.querySelector('.cs-trigger') || el?.querySelector('input:not(.cs-native), select:not(.cs-native), textarea');
      target?.focus({ preventScroll: true });
    });
  }

  function goTo(n, { validate = true } = {}) {
    n = Math.min(Math.max(n, 1), TOTAL);
    if (validate && n > current) {
      for (let s = current; s < n; s++) {
        if (!validateStep(s)) { current = s; render(); return; }
      }
    }
    current = n;
    render();
  }

  function reset() { current = 1; render(); }

  document.addEventListener('click', e => {
    if (e.target.closest('[data-step-next]')) { goTo(current + 1); return; }
    if (e.target.closest('[data-step-back]')) { goTo(current - 1, { validate: false }); return; }
    const tab = e.target.closest('.bstep');
    if (tab) goTo(Number(tab.dataset.step));
  });

  render();
  return { goTo, reset };
})();

/* Payment method buttons: set the hidden #fpayment field and show a
   selected state, so the chosen method travels with the rest of the
   dispatch request on submit — this is step 3 of the wizard above. */
(function paymentSelector() {
  const buttons = $$('.pay-method');
  const hidden  = $('#fpayment');
  if (!buttons.length || !hidden) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => {
        b.classList.remove('selected');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('selected');
      btn.setAttribute('aria-checked', 'true');
      hidden.value = btn.dataset.method || '';
    });
  });
})();

/* ════════════════════════════════════════════════════
   10a-1. CONTACT CARD TOGGLE
   Collapsed by default (just the "Contact" label) —
   expands to reveal the six contact methods on click.
   Height is measured with scrollHeight so the open/close
   transition is smooth and accurate at any content size.
════════════════════════════════════════════════════ */
(function contactCardToggle() {
  const toggle = $('#contactToggle');
  const panel  = $('#contactPanel');
  if (!toggle || !panel) return;

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';

    if (isOpen) {
      // Collapse: measure current height first so the browser has a
      // concrete starting point to animate down from (not "auto").
      panel.style.maxHeight = panel.scrollHeight + 'px';
      requestAnimationFrame(() => {
        panel.classList.remove('qc-contact-panel--open');
        panel.style.maxHeight = '0px';
      });
      toggle.setAttribute('aria-expanded', 'false');
      panel.addEventListener('transitionend', function onEnd(e) {
        if (e.propertyName !== 'max-height') return;
        panel.hidden = true;
        panel.removeEventListener('transitionend', onEnd);
      });
    } else {
      panel.hidden = false;
      panel.style.maxHeight = '0px';
      requestAnimationFrame(() => {
        panel.classList.add('qc-contact-panel--open');
        panel.style.maxHeight = panel.scrollHeight + 'px';
      });
      toggle.setAttribute('aria-expanded', 'true');
      panel.addEventListener('transitionend', function onEnd(e) {
        if (e.propertyName !== 'max-height') return;
        panel.style.maxHeight = 'none'; // let it breathe if content reflows (resize, etc.)
        panel.removeEventListener('transitionend', onEnd);
      });
    }
  });

  // If the viewport resizes while open, "none" keeps it correct; if it's
  // mid-animation this is harmless since scrollHeight is re-measured on
  // every open.
  window.addEventListener('resize', () => {
    if (toggle.getAttribute('aria-expanded') === 'true') panel.style.maxHeight = 'none';
  });
})();

/* ════════════════════════════════════════════════════
   10a-2. CUSTOM SERVICE DROPDOWN
   Drives the grouped, gold-accented dropdown that replaces
   the native <select> (whose open list is drawn by the OS
   on mobile and can't be restyled — no way to fix its blue
   selection dot or its size from CSS). The real #fservice
   select stays in sync underneath as the actual form data
   source and the thing the wizard's validation checks.
════════════════════════════════════════════════════ */
const ServiceSelect = (function () {
  const root     = $('#fserviceSelect');
  const trigger  = $('#fserviceTrigger');
  const valueEl  = $('#fserviceValue');
  const panel    = $('#fserviceList');
  const native   = $('#fservice');
  const dateTimeRow = $('#dateTimeRow');
  const step2Actions = $('#step2Actions');
  if (!root || !trigger || !panel || !native) return { setValue() {}, reset() {} };

  const options = $$('.cs-option', panel);

  function isOpen() { return !panel.hidden; }

  function close() {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    dateTimeRow?.classList.remove('dt-hidden');
    step2Actions?.classList.remove('dt-hidden');
  }

  function open() {
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    // Hide Date/Time and the Back/Continue row while actively choosing a
    // service so the picker is the only thing competing for attention —
    // they all reappear as soon as a service is picked (or the panel is
    // dismissed) via close().
    dateTimeRow?.classList.add('dt-hidden');
    step2Actions?.classList.add('dt-hidden');
    const current = options.find(o => o.getAttribute('aria-selected') === 'true') || options[0];
    requestAnimationFrame(() => current?.focus({ preventScroll: true }));
  }

  function selectValue(text, { silent = false } = {}) {
    if (!text) return;
    let matched = false;
    for (const opt of native.options) {
      if (opt.textContent.trim().toLowerCase() === text.trim().toLowerCase()) {
        opt.selected = true;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const opt = document.createElement('option');
      opt.textContent = text;
      opt.value = text;
      opt.selected = true;
      native.insertBefore(opt, native.firstChild);
    }
    if (!silent) native.dispatchEvent(new Event('change', { bubbles: true }));

    valueEl.textContent = text;
    valueEl.classList.remove('cs-placeholder');
    options.forEach(o => {
      o.setAttribute('aria-selected', String(o.dataset.value.trim().toLowerCase() === text.trim().toLowerCase()));
    });
  }

  function reset() {
    valueEl.textContent = 'Select a service…';
    valueEl.classList.add('cs-placeholder');
    options.forEach(o => o.setAttribute('aria-selected', 'false'));
    native.selectedIndex = 0;
    dateTimeRow?.classList.remove('dt-hidden');
    step2Actions?.classList.remove('dt-hidden');
  }

  trigger.addEventListener('click', () => (isOpen() ? close() : open()));

  options.forEach(opt => {
    opt.addEventListener('click', () => {
      selectValue(opt.dataset.value);
      close();
      trigger.focus({ preventScroll: true });
    });
  });

  panel.addEventListener('keydown', e => {
    const idx = options.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (options[idx + 1] || options[0]).focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (options[idx - 1] || options[options.length - 1]).focus(); }
    else if (e.key === 'Escape') { close(); trigger.focus({ preventScroll: true }); }
  });

  document.addEventListener('click', e => {
    if (isOpen() && !root.contains(e.target)) close();
  });

  return { setValue: t => selectValue(t), reset };
})();

/* ════════════════════════════════════════════════════
   10b. BOOK-A-SERVICE ROUTING
   Any element carrying data-service (the big category
   "Book a Service →" buttons AND every individual
   service-item card in the 4-across grids) routes the
   visitor straight to the booking wizard (reset to step 1)
   and pre-selects that exact service for when they reach
   the Service step. Handled with one delegated listener so
   newly-added cards work for free.
════════════════════════════════════════════════════ */
function goToBookingWithService(serviceName) {
  ServiceSelect.setValue(serviceName);
  navigateTo('contact');
  BookingWizard.reset();
}

document.addEventListener('click', e => {
  const btn = e.target.closest('.svc-item-btn, .panel-cta');
  if (!btn) return;
  e.preventDefault();
  const label = btn.dataset.service || (btn.querySelector('.svc-item-text')?.textContent) || '';
  if (label.trim()) goToBookingWithService(label.trim());
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

  const newPrev = prevBtn?.cloneNode(true);
  const newNext = nextBtn?.cloneNode(true);
  prevBtn?.parentNode?.replaceChild(newPrev, prevBtn);
  nextBtn?.parentNode?.replaceChild(newNext, nextBtn);
  newPrev?.addEventListener('click', () => { prev(); resetAuto(); });
  newNext?.addEventListener('click', () => { next(); resetAuto(); });

  let tx = 0;
  track.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
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
   12. 3D TILT CARDS
════════════════════════════════════════════════════ */
document.addEventListener('mousemove', e => {
  const card = e.target.closest('.tilt-card, .pillar');
  if (!card) return;
  const { left, top, width, height } = card.getBoundingClientRect();
  const x = (e.clientX - left) / width  - 0.5;
  const y = (e.clientY - top)  / height - 0.5;
  card.style.transform = `perspective(700px) rotateX(${-y * 7}deg) rotateY(${x * 7}deg) translateZ(6px)`;
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
  if (currentView === 'home') document.body.style.overflow = 'hidden';
  setTimeout(() => el.querySelector('button')?.focus(), 100);
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
  if (currentView === 'home' && !$$('.modal-overlay.open').length) {
    document.body.style.overflow = '';
  }
}

/* Hero / nav "Book" buttons → go to contact view */
/* Hero / nav CTAs now route to Services via their own data-view="services"
   attribute (handled by the generic [data-view] delegated click handler
   above) — booking itself only ever starts from inside the Services view. */

/* Success modal close — use closeModal() everywhere for consistency */
$('#closeSuccessModal')?.addEventListener('click', () => closeModal('successModal'));
$('#successDoneBtn')?.addEventListener('click', () => closeModal('successModal'));

$$('.modal-overlay').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target === ov) closeModal(ov.id); });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') $$('.modal-overlay.open').forEach(m => closeModal(m.id));
});

/* ════════════════════════════════════════════════════
   14. SUCCESS CHIME
════════════════════════════════════════════════════ */
let _audioCtx = null;

function getAudioCtx() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _audioCtx;
}

function playChime() {
  try {
    const ctx = getAudioCtx();

    const doPlay = () => {
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();

        const osc2  = ctx.createOscillator();
        const gain2 = ctx.createGain();

        osc.connect(gain);   gain.connect(ctx.destination);
        osc2.connect(gain2); gain2.connect(ctx.destination);

        osc.type  = 'sine';
        osc2.type = 'sine';
        osc.frequency.value  = freq;
        osc2.frequency.value = freq * 1.003;

        const t0 = ctx.currentTime + i * 0.20;

        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.22, t0 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.1);

        gain2.gain.setValueAtTime(0, t0);
        gain2.gain.linearRampToValueAtTime(0.08, t0 + 0.04);
        gain2.gain.exponentialRampToValueAtTime(0.001, t0 + 1.1);

        osc.start(t0);  osc.stop(t0 + 1.2);
        osc2.start(t0); osc2.stop(t0 + 1.2);
      });
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(doPlay).catch(() => {});
    } else {
      doPlay();
    }
  } catch {
    /* Audio not supported — silent fail */
  }
}

/* ════════════════════════════════════════════════════
   15. FIELD VALIDATION CHECKMARKS
   Live green tick indicator for Name / Email / Phone /
   Site Address on the booking form. Uses the same
   FIELD_RULES the wizard uses to gate Continue, so a
   green tick always means "this will actually let you
   proceed" — never just "not empty".
════════════════════════════════════════════════════ */
(function fieldCheckmarks() {
  Object.keys(FIELD_RULES).forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    const wrap  = input.closest('.field-input-wrap');
    const check = wrap?.querySelector('.field-check');
    if (!wrap || !check) return;

    const evaluate = () => {
      const ok = FIELD_RULES[id](input.value);
      input.classList.toggle('field-valid', ok);
      check.classList.toggle('show', ok);
    };

    input.addEventListener('input', evaluate);
    input.addEventListener('blur', evaluate);
    evaluate(); // in case of autofill on load
  });

  // Autofill (Chrome) sometimes populates fields without firing 'input'.
  // A short poll right after load catches that case for free.
  window.addEventListener('load', () => {
    setTimeout(() => {
      Object.keys(FIELD_RULES).forEach(id => {
        document.getElementById(id)?.dispatchEvent(new Event('input'));
      });
    }, 600);
  });
})();

/* ════════════════════════════════════════════════════
   15b. MEDIA ATTACHMENTS — voice note, video, photos
   Optional multimedia for the booking's Confirm step.
   Everything captured here is converted to base64 and
   travels inside the same JSON payload the booking form
   already sends — no backend format change required for
   the existing text fields, which keep working exactly
   as before. Size/duration caps keep the request sane.
════════════════════════════════════════════════════ */
const MediaAttachments = (function () {
  const LIMITS = {
    imageMaxBytes: 10 * 1024 * 1024,  // 10MB per photo — matches backend ATTACHMENT_LIMITS.image
    imageMaxCount: 4,
    videoMaxBytes: 30 * 1024 * 1024,  // 30MB — matches backend ATTACHMENT_LIMITS.video
    audioMaxSeconds: 60,              // cap for in-browser recording
    audioMaxBytes: 20 * 1024 * 1024   // cap for uploaded audio files — matches backend ATTACHMENT_LIMITS.voice
  };

  let voiceBlob = null;
  let videoFile = null;
  let images = []; // [{ file, dataUrl }]

  const voiceBtn        = $('#voiceRecBtn');
  const voiceTime       = $('#voiceRecTime');
  const voicePrev       = $('#voicePreview');
  const voiceAudio      = $('#voiceAudioEl');
  const voiceRemoveBtn  = $('#voiceRemoveBtn');
  const voiceRecorderEl = $('#voiceRecorder');
  const voiceUploadRow  = $('#voiceUploadRow');
  const voiceUploadInput = $('#voiceUploadInput');

  const videoCaptureInput = $('#videoCaptureInput');
  const videoUploadInput  = $('#videoUploadInput');
  const videoPreview      = $('#videoPreview');
  const videoPreviewEl    = $('#videoPreviewEl');
  const videoMeta         = $('#videoMeta');
  const videoRemoveBtn    = $('#videoRemoveBtn');
  const videoActions      = $('#videoActions');

  const imageCaptureInput = $('#imageCaptureInput');
  const imageUploadInput  = $('#imageUploadInput');
  const imageGrid         = $('#imagePreviewGrid');

  /* ---------- helpers ---------- */
  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload  = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }
  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  }
  function fmtTime(sec) {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  /* ---------- voice recording ---------- */
  let mediaRecorder = null, recChunks = [], recStream = null, recTimer = null, recStart = 0;

  async function startRecording() {
    if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) {
      Toast.error('Not supported', "Voice recording isn't supported in this browser.");
      return;
    }
    try {
      recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
        Toast.error('Microphone blocked', "This browser/app has no mic access — use \"Upload Audio\" below instead, or check your browser's site permissions.");
      } else if (err?.name === 'NotFoundError') {
        Toast.error('No microphone found', 'Try "Upload Audio" below instead.');
      } else {
        Toast.error('Microphone unavailable', 'Try "Upload Audio" below instead.');
      }
      return;
    }
    recChunks = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
    mediaRecorder = new MediaRecorder(recStream, mimeType ? { mimeType } : undefined);
    mediaRecorder.ondataavailable = e => { if (e.data.size) recChunks.push(e.data); };
    mediaRecorder.onstop = onRecordingStop;
    mediaRecorder.start();
    recStart = Date.now();
    voiceBtn?.classList.add('recording');
    recTimer = setInterval(() => {
      const elapsed = (Date.now() - recStart) / 1000;
      if (voiceTime) voiceTime.textContent = fmtTime(elapsed) + ' / 1:00';
      if (elapsed >= LIMITS.audioMaxSeconds) stopRecording();
    }, 200);
  }

  function stopRecording() {
    clearInterval(recTimer);
    voiceBtn?.classList.remove('recording');
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    recStream?.getTracks().forEach(t => t.stop());
  }

  function onRecordingStop() {
    const blob = new Blob(recChunks, { type: recChunks[0]?.type || 'audio/webm' });
    if (blob.size < 500) {
      Toast.error('Too short', 'That recording was too short — try again.');
      resetVoiceUI();
      return;
    }
    voiceBlob = blob;
    if (voiceAudio) voiceAudio.src = URL.createObjectURL(blob);
    showVoicePreview();
  }

  function showVoicePreview() {
    if (voicePrev) voicePrev.hidden = false;
    if (voiceRecorderEl) voiceRecorderEl.hidden = true;
    if (voiceUploadRow) voiceUploadRow.hidden = true;
  }

  function resetVoiceUI() {
    voiceBlob = null;
    if (voicePrev) voicePrev.hidden = true;
    if (voiceRecorderEl) voiceRecorderEl.hidden = false;
    if (voiceUploadRow) voiceUploadRow.hidden = false;
    if (voiceTime) voiceTime.textContent = 'Tap to record';
    if (voiceUploadInput) voiceUploadInput.value = '';
  }

  voiceBtn?.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') stopRecording();
    else startRecording();
  });
  voiceRemoveBtn?.addEventListener('click', resetVoiceUI);

  // Fallback for when in-browser recording isn't available (blocked mic,
  // unsupported WebView, etc.) — attach an audio file recorded elsewhere.
  voiceUploadInput?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      Toast.error('Unsupported file', 'Please choose an audio file.');
      return;
    }
    if (file.size > LIMITS.audioMaxBytes) {
      Toast.error('Audio too large', `Please keep voice notes under ${fmtBytes(LIMITS.audioMaxBytes)}.`);
      return;
    }
    voiceBlob = file;
    if (voiceAudio) voiceAudio.src = URL.createObjectURL(file);
    showVoicePreview();
  });

  /* ---------- video ---------- */
  function handleVideoFile(file) {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      Toast.error('Unsupported file', 'Please choose a video file.');
      return;
    }
    if (file.size > LIMITS.videoMaxBytes) {
      Toast.error('Video too large', `Please keep videos under ${fmtBytes(LIMITS.videoMaxBytes)}.`);
      return;
    }
    videoFile = file;
    if (videoPreviewEl) videoPreviewEl.src = URL.createObjectURL(file);
    if (videoMeta) videoMeta.textContent = `${file.name} · ${fmtBytes(file.size)}`;
    if (videoPreview) videoPreview.hidden = false;
    if (videoActions) videoActions.hidden = true;
  }
  videoCaptureInput?.addEventListener('change', e => handleVideoFile(e.target.files[0]));
  videoUploadInput?.addEventListener('change', e => handleVideoFile(e.target.files[0]));
  videoRemoveBtn?.addEventListener('click', () => {
    videoFile = null;
    if (videoPreviewEl) videoPreviewEl.src = '';
    if (videoPreview) videoPreview.hidden = true;
    if (videoActions) videoActions.hidden = false;
    if (videoCaptureInput) videoCaptureInput.value = '';
    if (videoUploadInput) videoUploadInput.value = '';
  });

  /* ---------- images ---------- */
  function renderImageGrid() {
    if (!imageGrid) return;
    imageGrid.innerHTML = '';
    images.forEach((img, i) => {
      const div = document.createElement('div');
      div.className = 'img-thumb';
      div.innerHTML = `<img src="${img.dataUrl}" alt="Attached photo ${i + 1}">` +
        `<button type="button" class="attach-remove" aria-label="Remove photo ${i + 1}">✕</button>`;
      div.querySelector('.attach-remove').addEventListener('click', () => {
        images.splice(i, 1);
        renderImageGrid();
      });
      imageGrid.appendChild(div);
    });
  }

  // Resizes/re-encodes a photo on <canvas> before it ever gets converted to
  // base64 — a phone camera shot straight out of the gallery is often 8-12MB
  // at 4000px+ wide, which is slow to upload for no real benefit here. This
  // brings it down to something reasonable while keeping the 10MB cap as a
  // generous ceiling rather than the typical size.
  function compressImage(file, { maxDimension = 1600, quality = 0.78 } = {}) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) { height = Math.round(height * (maxDimension / width)); width = maxDimension; }
          else                { width  = Math.round(width  * (maxDimension / height)); height = maxDimension; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(blob => {
          URL.revokeObjectURL(url);
          blob ? resolve(blob) : reject(new Error('Canvas produced no blob'));
        }, 'image/jpeg', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image failed to load')); };
      img.src = url;
    });
  }

  async function handleImageFiles(fileList) {
    for (const file of [...fileList]) {
      if (images.length >= LIMITS.imageMaxCount) {
        Toast.error('Limit reached', `You can attach up to ${LIMITS.imageMaxCount} photos.`);
        break;
      }
      if (!file.type.startsWith('image/')) {
        Toast.error('Unsupported file', `${file.name} isn't an image.`);
        continue;
      }

      // Compress first, then check the resulting size — so the 10MB cap is
      // a safety ceiling, not the size most photos actually hit.
      let toStore = file;
      try {
        const compressed = await compressImage(file);
        if (compressed.size < file.size) toStore = compressed;
      } catch {
        // Compression failed (e.g. an odd format canvas can't decode) —
        // fall back to the original file and let the size check below judge it.
      }

      if (toStore.size > LIMITS.imageMaxBytes) {
        Toast.error('Photo too large', `${file.name} is over ${fmtBytes(LIMITS.imageMaxBytes)}, even after compression.`);
        continue;
      }
      try {
        const dataUrl = await fileToDataUrl(toStore);
        images.push({ file: toStore, dataUrl, name: file.name });
      } catch {
        Toast.error('Read error', `Couldn't read ${file.name}.`);
      }
    }
    renderImageGrid();
  }
  imageCaptureInput?.addEventListener('change', e => { handleImageFiles(e.target.files); e.target.value = ''; });
  imageUploadInput?.addEventListener('change', e => { handleImageFiles(e.target.files); e.target.value = ''; });

  /* ---------- collect + reset (used by the form-submit handler) ---------- */
  async function collect() {
    const attachments = [];
    if (voiceBlob) {
      attachments.push({
        kind: 'voice', name: 'voice-note.webm', type: voiceBlob.type, size: voiceBlob.size,
        data: await fileToDataUrl(voiceBlob)
      });
    }
    if (videoFile) {
      attachments.push({
        kind: 'video', name: videoFile.name, type: videoFile.type, size: videoFile.size,
        data: await fileToDataUrl(videoFile)
      });
    }
    for (const img of images) {
      attachments.push({ kind: 'image', name: img.name || img.file.name, type: img.file.type, size: img.file.size, data: img.dataUrl });
    }
    return attachments;
  }

  function reset() {
    resetVoiceUI();
    videoFile = null;
    if (videoPreviewEl) videoPreviewEl.src = '';
    if (videoPreview) videoPreview.hidden = true;
    if (videoActions) videoActions.hidden = false;
    if (videoCaptureInput) videoCaptureInput.value = '';
    if (videoUploadInput) videoUploadInput.value = '';
    images = [];
    renderImageGrid();
  }

  function hasAttachments() {
    return !!voiceBlob || !!videoFile || images.length > 0;
  }

  return { collect, reset, hasAttachments };
})();

/* ════════════════════════════════════════════════════
   16. FORM SUBMIT
════════════════════════════════════════════════════ */
/* XHR wrapper (instead of fetch) purely so we can report real upload
   progress — handy now that a booking can carry photos/video/audio. */
function postJSONWithProgress(url, payload, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body = null;
      try { body = JSON.parse(xhr.responseText); } catch { /* non-JSON response */ }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, body });
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(JSON.stringify(payload));
  });
}

async function handleForm(form, btn) {
  // ── Client-side validation ──
  const invalids = [...form.querySelectorAll(':invalid')];
  if (invalids.length) {
    invalids.forEach(f => {
      f.style.borderColor = 'rgba(240,64,64,0.7)';
      f.style.boxShadow   = '0 0 0 3px rgba(240,64,64,0.1)';
      f.addEventListener('input', () => {
        f.style.borderColor = '';
        f.style.boxShadow   = '';
      }, { once: true });
    });
    invalids[0].focus();
    Toast.error('Incomplete', 'Please fill in all required fields.');
    return;
  }

  const progressWrap = $('#uploadProgress');
  const progressFill = $('#uploadProgressFill');

  // ── Loading state — a single "Sending…" stage, no separate "uploading"
  // phase to sit through first, since it's really just one network request ──
  const orig = btn.innerHTML;
  const hasMedia = MediaAttachments.hasAttachments();
  btn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span><span>Sending…</span>';
  btn.disabled  = true;

  if (hasMedia && progressWrap) {
    progressWrap.hidden = false;
    progressFill.style.width = '0%';
  }

  try {
    const fd = new FormData(form);
    const attachments = await MediaAttachments.collect();
    const payload = {
      name:    fd.get('name')           || '',
      phone:   fd.get('phone')          || '',
      address: fd.get('address')        || '',
      issue:   fd.get('service')        || '',
      date:    fd.get('preferred_date') || '',
      time:    fd.get('preferred_time') || '',
      email:   fd.get('email')          || '',
      message: fd.get('message')        || '',
      payment_method: fd.get('payment_method') || '',
      attachments // [] when nothing was attached — existing bookings unaffected
    };

    // ── POST to backend (XHR so we can show real upload progress) ──
    const r = await postJSONWithProgress(BACKEND_URL, payload, pct => {
      if (progressFill) progressFill.style.width = pct + '%';
    });

    if (r.ok) {
      // ★ Reset form before showing success UI
      form.reset();

      // Reset checkmark state since the fields are now empty
      $$('.field-check.show').forEach(c => c.classList.remove('show'));
      $$('.field-input-wrap input.field-valid').forEach(i => i.classList.remove('field-valid'));

      // ★ Back to step 1 for the next visitor / next booking
      BookingWizard.reset();
      ServiceSelect.reset();
      MediaAttachments.reset();
      if (progressWrap) progressWrap.hidden = true;

      // Visually reset payment method selection to match the hidden field's
      // reset value (form.reset() reverts the value but not our own classes)
      $$('.pay-method').forEach(b => {
        const isCash = b.dataset.method === 'Cash';
        b.classList.toggle('selected', isCash);
        b.setAttribute('aria-checked', String(isCash));
      });

      // ★ Play chime (AudioContext already warmed by earlier user interaction)
      playChime();

      // ★ Open success modal via openModal() so .open class is added correctly
      setTimeout(() => openModal('successModal'), 80);

      // ★ Toast
      Toast.success('Booking Confirmed!', "We'll confirm your slot within 30 minutes.");

      // ★ Browser push notification (if granted)
      notify('✅ Booking Received', 'FEMIX team will confirm your slot within 30 minutes.');

    } else {
      // Server returned non-2xx
      const serverMsg = r.body?.message || 'Please try again or call us directly.';
      Toast.error('Send failed', serverMsg);
      if (progressWrap) progressWrap.hidden = true;
    }

  } catch (networkErr) {
    console.error('Fetch error:', networkErr);
    Toast.error('Network error', 'Please check your connection and try again.');
    if (progressWrap) progressWrap.hidden = true;
  } finally {
    btn.innerHTML = orig;
    btn.disabled  = false;
  }
}

/* ── Attach submit handler to the one booking form ── */
$('#contactForm')?.addEventListener('submit', e => {
  e.preventDefault();
  handleForm(e.target, $('#submitBtn'));
});

/* ════════════════════════════════════════════════════
   17. PWA + BROWSER NOTIFICATIONS
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
   18. FOOTER YEAR
════════════════════════════════════════════════════ */
const yr = $('#yr');
if (yr) yr.textContent = new Date().getFullYear();

/* ════════════════════════════════════════════════════
   19. BUTTON RIPPLE
════════════════════════════════════════════════════ */
(function ripple() {
  const style = document.createElement('style');
  style.textContent = '@keyframes ripple{from{transform:scale(0);opacity:1}to{transform:scale(4);opacity:0}}';
  document.head.appendChild(style);

  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn-primary, .panel-cta, .btn-emg, .nav-cta, .spa-qcard, .svc-item-btn, .pay-method, .btn-step, .bstep');
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
   19b. HERO BANNER PARALLAX
════════════════════════════════════════════════════ */
(function heroParallax() {
  const img = $('.hero-banner-img');
  if (!img) return;
  img.classList.add('parallax');

  function update() {
    const hero = $('#hero');
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) return;
    const offset = rect.top * 0.12;
    img.style.transform = `translateY(${offset}px) scale(1.06)`;
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
})();

/* ════════════════════════════════════════════════════
   20. INIT ON LOAD
════════════════════════════════════════════════════ */
window.addEventListener('load', () => {
  routeFromHash();
  setTimeout(() => positionIndicator($('.svc-tab.active')), 200);
  if (location.hash === '#reviews') setTimeout(initCarousel, 200);
});
