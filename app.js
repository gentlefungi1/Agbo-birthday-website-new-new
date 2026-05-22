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
// CONFIG — update these to match the person
// ─────────────────────────────────────────
const CONFIG = {
  name:       'Endurance',
  birthYear:  2002,
  birthMonth: 7,    // 1-indexed (7 = July)
  birthDay:   15,
};


// ─────────────────────────────────────────
// VIEW REGISTRY
// Each entry: { el, onEnter?, onExit? }
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

  /** Navigate to a named view with a cinematic transition */
  go(next) {
    if (next === this.current) return;

    const from = views[this.current];
    const to   = views[next];
    if (!from || !to) return;

    // 1. Flash overlay (white flash, like a camera)
    const overlay = document.getElementById('overlay');
    overlay.classList.add('flash');

    // 2. Exit current view
    if (from.onExit) from.onExit();
    from.el.classList.remove('active');
    from.el.classList.add('exit');

    setTimeout(() => {
      // 3. Clean up exited view
      from.el.classList.remove('exit');
      overlay.classList.remove('flash');

      // 4. Enter new view
      to.el.classList.add('active');
      if (to.onEnter) to.onEnter();

      this.current = next;
    }, 380);
  },

  /** Re-fire confetti without changing view */
  celebrate() {
    launchConfetti('burst');
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
// STAGGER ANIMATION — for cards/polaroids
// ─────────────────────────────────────────
function triggerStagger(viewEl) {
  const items = viewEl.querySelectorAll('.memory-card, .polaroid');
  // Reset first (so re-entering re-animates)
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
  // }

  function getTarget() {
    const now  = new Date();
    const curr = now.getFullYear();

    // Birthday this year, but only if it hasn't passed yet today
    const thisYear = new Date(curr, CONFIG.birthMonth - 1, CONFIG.birthDay, 0, 0, 0); // ← changed

    // If today IS the birthday, don't calculate a target — tick() handles it
    // If birthday is still ahead this year, count to it
    // If birthday already passed this year, count to next year
    if (isBirthdayToday()) return null;

    if (now < thisYear) return thisYear;

    return new Date(curr + 1, CONFIG.birthMonth - 1, CONFIG.birthDay, 0, 0, 0); // ← changed (also added next year + midnight)

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
  },
});


// ─────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initCountdown();

  // Make sure the first view is visible
  const first = views['countdown'];
  if (first) first.el.classList.add('active');
});
