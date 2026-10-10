/* ============================================================================
   Portfolio — modern ES module
   Theme · drawer · scroll UX · terminal · live GitHub sync
   ========================================================================== */

const doc = document;
const root = doc.documentElement;
const $ = (sel, ctx = doc) => ctx.querySelector(sel);
const $$ = (sel, ctx = doc) => [...ctx.querySelectorAll(sel)];

const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const prefersHover = matchMedia('(hover: hover)');
const reduce = () => prefersReducedMotion.matches;

const raf = (fn) => requestAnimationFrame(fn);
const on = (el, type, fn, opts) => el?.addEventListener(type, fn, opts);

/* ---------------------------------------------------------------------------
   Theme
   --------------------------------------------------------------------------- */
const THEME_KEY = 'fa-theme';

function applyTheme(theme, persist = true) {
  root.dataset.theme = theme;
  if (persist) {
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* private mode */ }
  }
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'light' ? '#f3f5fb' : '#070912';
}

function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch { /* ignore */ }
  const system = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  applyTheme(saved || system, false);

  on($('#themeBtn'), 'click', () => {
    applyTheme(root.dataset.theme === 'light' ? 'dark' : 'light');
  });

  prefersReducedMotion.addEventListener('change', () => {});
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    try { if (!localStorage.getItem(THEME_KEY)) applyTheme(e.matches ? 'light' : 'dark', false); } catch { /* ignore */ }
  });
}

/* ---------------------------------------------------------------------------
   Avatar fallback
   --------------------------------------------------------------------------- */
function initAvatars() {
  ['brandAvatar', 'drawerAvatar', 'footerAvatar'].forEach((id) => {
    const img = doc.getElementById(id);
    if (!img) return;
    img.addEventListener('error', () => {
      const host = img.parentNode;
      if (host) {
        host.classList.remove('avatar');
        host.textContent = 'FA';
      }
    }, { once: true });
  });
}

/* ---------------------------------------------------------------------------
   Drawer menu
   --------------------------------------------------------------------------- */
function initDrawer() {
  const menuBtn = $('#menuBtn');
  const drawer = $('#drawer');
  const backdrop = $('#drawerBackdrop');
  const closeBtn = $('#drawerClose');
  if (!drawer) return;

  let lastFocus = null;

  const open = () => {
    lastFocus = doc.activeElement;
    backdrop.hidden = false;
    raf(() => {
      backdrop.classList.add('show');
      drawer.classList.add('open');
    });
    drawer.setAttribute('aria-hidden', 'false');
    drawer.removeAttribute('inert');
    menuBtn?.setAttribute('aria-expanded', 'true');
    menuBtn?.setAttribute('aria-label', 'Close menu');
    doc.body.classList.add('menu-open');
    const first = drawer.querySelector('[data-drawer]');
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 260);
  };

  const close = () => {
    drawer.classList.remove('open');
    backdrop.classList.remove('show');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('inert', '');
    menuBtn?.setAttribute('aria-expanded', 'false');
    menuBtn?.setAttribute('aria-label', 'Open menu');
    doc.body.classList.remove('menu-open');
    setTimeout(() => { backdrop.hidden = true; }, 300);
    lastFocus?.focus?.({ preventScroll: true });
  };

  const toggle = () => (drawer.classList.contains('open') ? close() : open());

  on(menuBtn, 'click', toggle);
  on(closeBtn, 'click', close);
  on(backdrop, 'click', close);
  on(doc, 'keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) close();
  });
  $$('a[href^="#"]', drawer).forEach((a) => on(a, 'click', close));
}

/* ---------------------------------------------------------------------------
   Ripple press feedback
   --------------------------------------------------------------------------- */
function initRipple() {
  const selector = '.btn, .icon-btn, .chip, .tech, .link-list a, .to-top, .drawer-nav a, .topnav a, .f-links a, .repo-go, .proj-links a';
  on(doc, 'pointerdown', (e) => {
    const host = e.target.closest?.(selector);
    if (!host) return;
    /* Haptic feedback on every interactive element */
    if (navigator.vibrate) navigator.vibrate(8);
    if (reduce()) return;
    const rect = host.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.1;
    const span = doc.createElement('span');
    span.className = 'ripple';
    span.style.setProperty('--rx', `${e.clientX - rect.left}px`);
    span.style.setProperty('--ry', `${e.clientY - rect.top}px`);
    span.style.setProperty('--rs', `${size}px`);
    host.appendChild(span);
    setTimeout(() => span.remove(), 700);
  }, { passive: true });
}

/* ---------------------------------------------------------------------------
   Scroll: progress bar + active nav + smooth anchors
   --------------------------------------------------------------------------- */
function initScroll() {
  const bar = $('#progressBar');
  const navLinks = $$('[data-nav]');
  const sections = $$('section[id]');
  let ticking = false;

  const update = () => {
    const h = doc.documentElement.scrollHeight - innerHeight;
    const p = h > 0 ? scrollY / h : 0;
    if (bar) bar.style.transform = `scaleX(${Math.min(Math.max(p, 0), 1)})`;

    const pos = scrollY + 150;
    let current = sections[0]?.id ?? '';
    for (const s of sections) {
      if (s.offsetTop <= pos) current = s.id;
    }
    const href = `#${current}`;
    navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === href));
    ticking = false;
  };

  on(window, 'scroll', () => {
    if (!ticking) { ticking = true; raf(update); }
  }, { passive: true });

  $$('a[href^="#"]').forEach((a) => {
    on(a, 'click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const el = id && doc.getElementById(id);
      if (!el) return;
      e.preventDefault();
      const top = el.getBoundingClientRect().top + scrollY - 96;
      scrollTo({ top: Math.max(top, 0), behavior: reduce() ? 'auto' : 'smooth' });
      history.replaceState(null, '', `#${id}`);
    });
  });

  update();
}

/* ---------------------------------------------------------------------------
   Reveal on scroll + skill meters
   --------------------------------------------------------------------------- */
function initReveal() {
  const activate = (el) => {
    el.classList.add('in');
    $$('.meter-bar span', el).forEach((s) => {
      s.style.width = `${s.getAttribute('data-width') || 0}%`;
    });
  };

  let io = null;
  if ('IntersectionObserver' in window && !reduce()) {
    io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (en.isIntersecting) { activate(en.target); io.unobserve(en.target); }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  }

  const observeReveals = (scope = doc) => {
    $$('[data-reveal]:not(.in)', scope).forEach((el) => {
      io ? io.observe(el) : activate(el);
    });
  };

  observeReveals();
  return observeReveals;
}

/* ---------------------------------------------------------------------------
   Marquee: seamless loop
   --------------------------------------------------------------------------- */
function initMarquee() {
  const track = $('#marqueeTrack');
  if (!track) return;
  const clone = track.cloneNode(true);
  clone.removeAttribute('id');
  clone.setAttribute('aria-hidden', 'true');
  track.append(...clone.childNodes);
}

/* ---------------------------------------------------------------------------
   Hero terminal + typed role
   --------------------------------------------------------------------------- */
function initTerminal() {
  $$('.pips').forEach((p) => {
    const n = parseInt(p.getAttribute('data-pips'), 10) || 0;
    let out = '';
    for (let i = 0; i < 5; i++) out += i < n ? '▮' : '▯';
    p.textContent = out;
  });

  const lines = $$('#termBody .tline');
  const play = () => {
    if (reduce()) { lines.forEach((l) => l.classList.add('show')); return; }
    let d = 0;
    for (const line of lines) {
      setTimeout(() => line.classList.add('show'), d);
      d += 340;
    }
  };

  if (lines.length) {
    if ('IntersectionObserver' in window) {
      const tio = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) { play(); tio.disconnect(); }
      }, { threshold: 0.3 });
      tio.observe(lines[0].closest('.terminal') || lines[0]);
    } else {
      play();
    }
  }
}

function initTyped() {
  const typed = $('#typed');
  if (!typed) return;
  const words = ['Android developer', 'AI agent builder', 'terminal tinkerer', 'permanent learner'];

  if (reduce()) { typed.textContent = words[0]; return; }

  let wi = 0, ci = 0, deleting = false;
  const tick = () => {
    const word = words[wi];
    typed.textContent = word.slice(0, ci);
    let wait = deleting ? 45 : 95;
    if (!deleting && ci === word.length) { deleting = true; wait = 1500; }
    else if (deleting && ci === 0) { deleting = false; wi = (wi + 1) % words.length; wait = 350; }
    else { ci += deleting ? -1 : 1; }
    setTimeout(tick, wait);
  };
  tick();
}

/* ---------------------------------------------------------------------------
   Card pointer glow
   --------------------------------------------------------------------------- */
function initCardGlow() {
  if (reduce() || !prefersHover.matches) return;
  $$('.card').forEach((card) => {
    on(card, 'pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      card.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    }, { passive: true });
  });
}

/* ---------------------------------------------------------------------------
   Live clock (Asia/Dhaka)
   --------------------------------------------------------------------------- */
function initClock() {
  const tick = () => {
    let t;
    try {
      t = new Date().toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      t = new Date().toTimeString().slice(0, 5);
    }
    ['footerClock', 'drawerClock'].forEach((id) => {
      const el = doc.getElementById(id);
      if (el) el.textContent = t;
    });
  };
  tick();
  setInterval(tick, 20000);
}

/* ---------------------------------------------------------------------------
   Live GitHub: repos + latest releases
   --------------------------------------------------------------------------- */
function initGithub(observeReveals) {
  const API = 'https://api.github.com';
  const OWNER = 'FoysalAhammad';

  const LANG_DOT = {
    Kotlin: '#a97bff', Java: '#f04a24', Python: '#3572a5', JavaScript: '#f1e05a',
    HTML: '#e34c26', CSS: '#563d7c', TypeScript: '#3178c6', C: '#555555', 'C++': '#f34b7d',
  };

  const FALLBACK = {
    synced_at: null,
    repos: [
      { name: 'agent24', description: 'Agent 24 — AI coding and technical assistant for Android.', url: 'https://github.com/FoysalAhammad/agent24', language: 'HTML', stars: 0, pushed_at: '' },
      { name: 'smarttrade', description: 'Crypto swing-trading journal for Android.', url: 'https://github.com/FoysalAhammad/smarttrade', language: 'HTML', stars: 0, pushed_at: '' },
      { name: 'WiFi-Repeater', description: 'WiFi repeater firmware for ESP8266 / ESP32.', url: 'https://github.com/FoysalAhammad/WiFi-Repeater', language: '', stars: 0, pushed_at: '' },
    ],
  };
  const FALLBACK_REL = {
    synced_at: null,
    releases: [
      { repo: 'WiFi-Repeater', tag: 'v1.0.0', url: 'https://github.com/FoysalAhammad/WiFi-Repeater/releases/tag/v1.0.0', published_at: '' },
    ],
  };

  const repoGrid = $('#repoGrid');
  const relGrid = $('#releaseGrid');
  const syncState = $('#syncState');
  const syncBtn = $('#syncBtn');
  const syncPill = syncState?.parentNode ?? null;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const ago = (iso) => {
    if (!iso) return 'recently';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (Number.isNaN(diff)) return 'recently';
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const skeletons = (target, n) => {
    if (!target) return;
    target.replaceChildren(...Array.from({ length: n }, () => {
      const s = doc.createElement('div');
      s.className = 'skel';
      return s;
    }));
  };

  const setSync = (text, mode) => {
    if (!syncState) return;
    syncState.textContent = text;
    syncPill?.classList.toggle('live', mode === 'live');
    syncPill?.classList.toggle('busy', mode === 'busy');
  };

  const cache = {
    set(data) { try { localStorage.setItem('fa-gh-cache', JSON.stringify({ t: Date.now(), d: data })); } catch { /* ignore */ } },
    get() {
      try {
        const o = JSON.parse(localStorage.getItem('fa-gh-cache') || 'null');
        if (!o || Date.now() - o.t > 30 * 60 * 1000) return null;
        return o.d;
      } catch { return null; }
    },
  };

  function renderRepos(payload) {
    if (!repoGrid) return;
    const list = payload?.repos?.length ? payload.repos : FALLBACK.repos;
    repoGrid.innerHTML = list.map((r) => {
      const dot = LANG_DOT[r.language] || 'var(--brand)';
      return `<article class="repo-card" data-reveal>
        <div class="repo-head"><svg class="i i-sm" aria-hidden="true"><use href="#i-box"/></svg>
        <b class="repo-name">${esc(r.name)}</b>
        ${r.archived ? '<span class="repo-badge">archived</span>' : (r.language ? `<span class="repo-badge">${esc(r.language)}</span>` : '')}</div>
        <p class="repo-desc">${esc(r.description || 'No description yet.')}</p>
        <div class="repo-meta">
          ${r.language ? `<span><i class="lang-dot" style="background:${dot}"></i>${esc(r.language)}</span>` : ''}
          <span><svg class="i i-sm" aria-hidden="true"><use href="#i-star"/></svg>${r.stars || 0}</span>
          <span><svg class="i i-sm" aria-hidden="true"><use href="#i-clock"/></svg>${ago(r.pushed_at)}</span>
        </div>
        <a class="repo-go" href="${esc(r.url)}" target="_blank" rel="noopener">Open repo
          <svg class="i i-sm" aria-hidden="true"><use href="#i-arrow-right"/></svg></a>
      </article>`;
    }).join('');
    observeReveals(repoGrid);
  }

  function renderReleases(payload) {
    if (!relGrid) return;
    const list = payload?.releases?.length ? payload.releases : FALLBACK_REL.releases;
    relGrid.innerHTML = list.slice(0, 5).map((rel) => `<article class="release-card" data-reveal>
      <span class="release-ico"><svg class="i" aria-hidden="true"><use href="#i-box"/></svg></span>
      <div class="release-body">
        <a href="${esc(rel.url)}" target="_blank" rel="noopener"><b class="release-tag">${esc(rel.tag)}</b></a>
        <span class="release-repo">${esc(rel.repo)}</span>
        <span class="release-date">released ${ago(rel.published_at)}</span>
      </div></article>`).join('');
    observeReveals(relGrid);
  }

  const pickReleases = (lists) => {
    const all = lists.flat().filter((rel) => !rel.draft && rel.published_at).map((rel) => ({
      repo: rel.repository?.name || rel.html_url?.split('/releases/')[0].split('/').pop() || '',
      tag: rel.tag_name || '', url: rel.html_url || '', published_at: rel.published_at,
    }));
    all.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    const out = [], seen = new Set();
    for (const x of all) { if (!seen.has(x.repo) && out.length < 5) { seen.add(x.repo); out.push(x); } }
    for (const x of all) { if (out.length < 5 && !out.includes(x)) out.push(x); }
    return out.slice(0, 5);
  };

  async function syncLive() {
    if (!syncBtn || syncBtn.disabled) return;
    syncBtn.disabled = true;
    syncBtn.classList.add('spinning');
    setSync('Talking to GitHub…', 'busy');
    try {
      const res = await fetch(`${API}/users/${OWNER}/repos?per_page=100&sort=updated`, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (!res.ok) throw new Error(`repos ${res.status}`);
      const repos = await res.json();
      const pub = repos.filter((r) => !r.private && !r.fork);
      const repoPayload = {
        synced_at: new Date().toISOString(),
        repos: pub.map((r) => ({
          name: r.name, description: r.description || '', url: r.html_url,
          language: r.language || '', stars: r.stargazers_count || 0,
          archived: !!r.archived, pushed_at: r.pushed_at || '',
        })),
      };
      renderRepos(repoPayload);

      const lists = await Promise.all(pub.slice(0, 8).map((r) =>
        fetch(`${API}/repos/${OWNER}/${r.name}/releases?per_page=10`)
          .then((x) => (x.ok ? x.json() : []))
          .catch(() => [])
      ));
      const relPayload = { synced_at: new Date().toISOString(), releases: pickReleases(lists) };
      renderReleases(relPayload);
      cache.set({ repos: repoPayload, releases: relPayload });
      setSync(`Live sync · just now (${repoPayload.repos.length} repos)`, 'live');
    } catch (err) {
      setSync('GitHub API busy — showing saved data', '');
      console.warn('sync failed', err);
    } finally {
      syncBtn.disabled = false;
      syncBtn.classList.remove('spinning');
    }
  }

  /* first paint */
  skeletons(repoGrid, 6);
  skeletons(relGrid, 3);

  const cached = cache.get();
  if (cached?.repos) {
    renderRepos(cached.repos);
    renderReleases(cached.releases);
    setSync(`Live sync · ${ago(cached.repos.synced_at)}`, 'live');
  } else {
    Promise.all([
      fetch('data/repos.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('data/releases.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([repos, rels]) => {
      renderRepos(repos || FALLBACK);
      renderReleases(rels || FALLBACK_REL);
      setSync(repos ? `Auto-synced · ${ago(repos.synced_at)}` : 'Offline snapshot', repos ? 'live' : '');
    });
  }

  on(syncBtn, 'click', syncLive);
}

/* ---------------------------------------------------------------------------
   Boot
   --------------------------------------------------------------------------- */
function boot() {
  initTheme();
  initAvatars();
  initDrawer();
  initRipple();
  const observeReveals = initReveal();
  initMarquee();
  initTerminal();
  initTyped();
  initCardGlow();
  initClock();
  initScroll();
  initGithub(observeReveals);
}

if (doc.readyState === 'loading') {
  doc.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
