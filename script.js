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

function toggleContent(id) {
  $$('.item-content').forEach(c => {
    c.classList.toggle('active', c.id === id ? !c.classList.contains('active') : false);
  });
}
window.toggleContent = toggleContent;

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

/* ── Service CTA buttons → navigate to booking form ── */
$$('.panel-cta').forEach(btn => {
  btn.addEventListener('click', () => {
    const svc = btn.dataset.service;
    navigateTo('contact');
    if (svc) {
      setTimeout(() => {
        const sel = $('#fservice');
        if (!sel) return;
        for (const opt of sel.options) {
          if (opt.text.includes(svc.split('(')[0].trim().replace(/&amp;/g, '&'))) {
            opt.selected = true;
            break;
          }
        }
      }, 350);
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
$('#heroQuoteBtn')?.addEventListener('click',     () => navigateTo('contact'));
$('#openContactModal')?.addEventListener('click', () => navigateTo('contact'));

/* Success modal close — use closeModal() everywhere for consistency */
$('#closeSuccessModal')?.addEventListener('click', () => closeModal('successModal'));

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
   Site Address on the booking form. Purely visual — the
   native `required` + type=email/tel attributes plus the
   :invalid check in handleForm() still gate submission.
════════════════════════════════════════════════════ */
(function fieldCheckmarks() {
  const RULES = {
    fname:    v => v.trim().length >= 2,
    femail:   v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    fphone:   v => v.replace(/[^\d]/g, '').length >= 10,
    faddress: v => v.trim().length >= 5
  };

  Object.keys(RULES).forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    const wrap  = input.closest('.field-input-wrap');
    const check = wrap?.querySelector('.field-check');
    if (!wrap || !check) return;

    const evaluate = () => {
      const ok = RULES[id](input.value);
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
      Object.keys(RULES).forEach(id => {
        document.getElementById(id)?.dispatchEvent(new Event('input'));
      });
    }, 600);
  });
})();

/* ════════════════════════════════════════════════════
   16. FORM SUBMIT
════════════════════════════════════════════════════ */
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

  // ── Loading state ──
  const orig = btn.innerHTML;
  btn.innerHTML = '<span style="opacity:.65">Sending…</span>';
  btn.disabled  = true;

  // Render's free tier can spin down when idle, so a cold-start request
  // can take up to ~50s. Reassure the user instead of leaving the button
  // looking frozen — first at 4s (likely cold start), then again at 15s.
  const slowTimer1 = setTimeout(() => {
    btn.innerHTML = '<span style="opacity:.65">Waking up server…</span>';
    Toast.info('Just a moment', 'Our server is starting up — this can take up to a minute on the first request.', 9000, 'coldstart');
  }, 4000);

  const slowTimer2 = setTimeout(() => {
    btn.innerHTML = '<span style="opacity:.65">Almost there…</span>';
    Toast.info('Still working', 'Thanks for your patience — finishing up your booking now.', 9000, 'coldstart');
  }, 16000);

  try {
    const fd = new FormData(form);
    const payload = {
      name:    fd.get('name')           || '',
      phone:   fd.get('phone')          || '',
      address: fd.get('address')        || '',
      issue:   fd.get('service')        || '',
      date:    fd.get('preferred_date') || '',
      time:    fd.get('preferred_time') || '',
      email:   fd.get('email')          || '',
      message: fd.get('message')        || ''
    };

    // ── POST to backend ──
    const r = await fetch(BACKEND_URL, {
      method:  'POST',
      body:    JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json'
      }
    });

    clearTimeout(slowTimer1);
    clearTimeout(slowTimer2);
    Toast.dismissKey('coldstart');

    if (r.ok) {
      // ★ Reset form before showing success UI
      form.reset();

      // Reset checkmark state since the fields are now empty
      $$('.field-check.show').forEach(c => c.classList.remove('show'));
      $$('.field-input-wrap input.field-valid').forEach(i => i.classList.remove('field-valid'));

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
      let serverMsg = 'Please try again or call us directly.';
      try {
        const errBody = await r.json();
        if (errBody?.message) serverMsg = errBody.message;
      } catch { /* ignore parse error */ }
      Toast.error('Send failed', serverMsg);
    }

  } catch (networkErr) {
    // Likely cold-start timeout or no connection
    clearTimeout(slowTimer1);
    clearTimeout(slowTimer2);
    Toast.dismissKey('coldstart');
    console.error('Fetch error:', networkErr);
    Toast.error('Network error', 'Please check your connection and try again.');
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
