/**
 * app.js — Birthday Experience Controller
 *
 * Architecture: mini view-router
 *   - App.go(viewName)  → transitions between views
 *   - Each view has optional onEnter() / onExit() hooks
 *   - Views are plain <section> elements; JS handles show/hide + animation
 *
 * Views: countdown → reveal → memories → gallery → letter
 */

// ─────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────
const CONFIG = {
  name:       'Endurance',
  birthYear:  2002,
  birthMonth: 7,   // 1-indexed (7 = July)
  birthDay:   15,
};


// ─────────────────────────────────────────
// VIEW REGISTRY
// ─────────────────────────────────────────
const views = {};

function registerView(name, hooks = {}) {
  const el = document.getElementById(`view-${name}`);
  if (!el) return console.warn(`View not found: view-${name}`);
  views[name] = { el, ...hooks };
}


// ─────────────────────────────────────────
// APP — public API
// ─────────────────────────────────────────
const App = {

  current: 'countdown',

  go(next) {
    if (next === this.current) return;

    const from = views[this.current];
    const to   = views[next];
    if (!from || !to) return;

    const overlay = document.getElementById('overlay');
    overlay.classList.add('flash');

    if (from.onExit) from.onExit();
    from.el.classList.remove('active');
    from.el.classList.add('exit');

    setTimeout(() => {
      from.el.classList.remove('exit');
      overlay.classList.remove('flash');

      // Scroll the view element itself to top (not window)
      // This is the correct fix for overflow-y: auto views
      to.el.scrollTop = 0;

      to.el.classList.add('active');
      if (to.onEnter) to.onEnter();

      this.current = next;
    }, 380);
  },

  celebrate() {
    launchConfetti('burst');
  },

  toggleMusic() {
    const music = document.getElementById('bgMusic');
    const btn   = document.getElementById('musicToggle');
    if (!music || !btn) return;

    if (music.paused) {
      music.play();
      btn.textContent = '⏸ Pause Music';
    } else {
      music.pause();
      btn.textContent = '▶ Play Music';
    }
  },
};


// ─────────────────────────────────────────
// CONFETTI
// ─────────────────────────────────────────
function launchConfetti(style = 'burst') {
  if (typeof confetti === 'undefined') return;

  if (style === 'burst') {
    confetti({ particleCount: 220, spread: 120, origin: { y: 0.55 } });
    setTimeout(() => confetti({ particleCount: 80, spread: 80, origin: { y: 0.4, x: 0.2 } }), 250);
    setTimeout(() => confetti({ particleCount: 80, spread: 80, origin: { y: 0.4, x: 0.8 } }), 400);
  }

  if (style === 'rain') {
    let count = 0;
    const rain = setInterval(() => {
      confetti({ particleCount: 12, spread: 60, origin: { y: 0, x: Math.random() } });
      if (++count >= 8) clearInterval(rain);
    }, 300);
  }
}


// ─────────────────────────────────────────
// MUSIC
// ─────────────────────────────────────────
function startMusic() {
  const music = document.getElementById('bgMusic');
  if (!music) return;
  music.volume = 0;
  music.play().catch(() => {});

  let vol = 0;
  const fadeIn = setInterval(() => {
    vol = Math.min(vol + 0.05, 0.6);
    music.volume = vol;
    if (vol >= 0.6) clearInterval(fadeIn);
  }, 100);
}

function fadeOutMusic() {
  const music = document.getElementById('bgMusic');
  if (!music) return;

  let vol = music.volume;
  const fadeOut = setInterval(() => {
    vol = Math.max(vol - 0.03, 0);
    music.volume = vol;
    if (vol <= 0) {
      music.pause();
      clearInterval(fadeOut);
    }
  }, 100);
}


// ─────────────────────────────────────────
// PARTICLES — soft floating hearts/stars
// ─────────────────────────────────────────
function initParticles() {
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const SYMBOLS = ['✦', '✧', '❤', '✿', '·'];
  const items = Array.from({ length: 28 }, () => ({
    x:      Math.random() * window.innerWidth,
    y:      Math.random() * window.innerHeight,
    s:      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    size:   Math.random() * 14 + 8,
    speed:  Math.random() * 0.4 + 0.15,
    drift:  (Math.random() - 0.5) * 0.3,
    alpha:  Math.random() * 0.3 + 0.1,
    wobble: Math.random() * Math.PI * 2,
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    items.forEach(p => {
      p.y -= p.speed;
      p.x += p.drift + Math.sin(p.wobble += 0.01) * 0.3;
      if (p.y < -30) { p.y = canvas.height + 20; p.x = Math.random() * canvas.width; }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle   = '#ffffff';
      ctx.font        = `${p.size}px serif`;
      ctx.fillText(p.s, p.x, p.y);
      ctx.restore();
    });
    requestAnimationFrame(draw);
  }
  draw();
}


// ─────────────────────────────────────────
// LIGHTBOX
// ─────────────────────────────────────────
function initLightbox() {
  const lightbox    = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCap = document.getElementById('lightbox-caption');
  const closeBtn    = document.getElementById('lightbox-close');

  if (!lightbox) return;

  document.getElementById('view-gallery').addEventListener('click', e => {
    const polaroid = e.target.closest('.polaroid');
    if (!polaroid) return;

    const img     = polaroid.querySelector('img');
    const caption = polaroid.querySelector('.polaroid-caption')?.textContent || '';

    if (!img) return;

    lightboxImg.src         = img.src;
    lightboxImg.alt         = img.alt;
    lightboxCap.textContent = caption;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  closeBtn.addEventListener('click', closeLightbox);

  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLightbox();
  });

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }
}


// ─────────────────────────────────────────
// STAGGER ANIMATION
// ─────────────────────────────────────────
function triggerStagger(viewEl) {
  const items = viewEl.querySelectorAll('.memory-card, .polaroid');
  items.forEach(el => el.classList.remove('visible'));
  requestAnimationFrame(() => {
    items.forEach(el => el.classList.add('visible'));
  });
}


// ─────────────────────────────────────────
// COUNTDOWN ENGINE
// ─────────────────────────────────────────
function initCountdown() {
  const elDays    = document.getElementById('days');
  const elHours   = document.getElementById('hours');
  const elMinutes = document.getElementById('minutes');
  const elSeconds = document.getElementById('seconds');
  const enterWrap = document.getElementById('enter-wrap');

  function isBirthdayToday() {
    return true; // force birthday mode for testing
  }

  // function isBirthdayToday() {
  //   const now = new Date();
  //   return now.getMonth() === CONFIG.birthMonth - 1 &&
  //          now.getDate()  === CONFIG.birthDay;
  //   // ── TESTING: comment the two lines above and use: return true;
  // }

  function getTarget() {
    const now      = new Date();
    const curr     = now.getFullYear();
    const thisYear = new Date(curr, CONFIG.birthMonth - 1, CONFIG.birthDay, 0, 0, 0);

    if (isBirthdayToday()) return null;
    if (now < thisYear)    return thisYear;

    return new Date(curr + 1, CONFIG.birthMonth - 1, CONFIG.birthDay, 0, 0, 0);
  }

  function showBirthdayState() {
    elDays.textContent    = '00';
    elHours.textContent   = '00';
    elMinutes.textContent = '00';
    elSeconds.textContent = '00';
    enterWrap.classList.remove('hidden');
    clearInterval(timer);
  }

  function tick() {
    if (isBirthdayToday()) {
      showBirthdayState();
      return;
    }

    const target = getTarget();
    const diff   = target - new Date();

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000)  / 60000);
    const s = Math.floor((diff % 60000)    / 1000);

    const pad = n => String(n).padStart(2, '0');
    elDays.textContent    = d;
    elHours.textContent   = pad(h);
    elMinutes.textContent = pad(m);
    elSeconds.textContent = pad(s);
  }

  const timer = setInterval(tick, 1000);
  tick();
}


// ─────────────────────────────────────────
// REGISTER ALL VIEWS + HOOKS
// ─────────────────────────────────────────
registerView('countdown');

registerView('reveal', {
  onEnter() {
    launchConfetti('burst');
    startMusic();
  },
});

registerView('memories', {
  onEnter() {
    triggerStagger(views.memories.el);
  },
});

registerView('gallery', {
  onEnter() {
    triggerStagger(views.gallery.el);
  },
});

registerView('letter', {
  onEnter() {
    setTimeout(() => launchConfetti('rain'), 800);
    // music plays on naturally until the song ends
  },
});


// ─────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initLightbox();
  initCountdown();

  const first = views['countdown'];
  if (first) first.el.classList.add('active');
});
