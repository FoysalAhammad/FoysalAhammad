(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- theme ---------- */
  var themeBtn = doc.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('fa-theme', next); } catch (e) {}
    });
  }

  /* ---------- avatar fallback (until a real photo is dropped in) ---------- */
  ['brandAvatar', 'drawerAvatar', 'footerAvatar'].forEach(function (id) {
    var img = doc.getElementById(id);
    if (!img) return;
    img.addEventListener('error', function () {
      var host = img.parentNode;
      if (host) { host.classList.remove('avatar'); host.textContent = 'FA'; }
    });
  });

  /* ---------- drawer menu (all devices) ---------- */
  var menuBtn = doc.getElementById('menuBtn');
  var drawer = doc.getElementById('drawer');
  var backdrop = doc.getElementById('drawerBackdrop');
  var drawerClose = doc.getElementById('drawerClose');
  var lastFocus = null;

  function openDrawer() {
    if (!drawer) return;
    lastFocus = doc.activeElement;
    backdrop.hidden = false;
    requestAnimationFrame(function () {
      backdrop.classList.add('show');
      drawer.classList.add('open');
    });
    drawer.setAttribute('aria-hidden', 'false');
    drawer.removeAttribute('inert');
    menuBtn && menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn && menuBtn.setAttribute('aria-label', 'Close menu');
    doc.body.classList.add('menu-open');
    var first = drawer.querySelector('[data-drawer]');
    if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 260);
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('open');
    backdrop.classList.remove('show');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('inert', '');
    menuBtn && menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn && menuBtn.setAttribute('aria-label', 'Open menu');
    doc.body.classList.remove('menu-open');
    setTimeout(function () { backdrop.hidden = true; }, 300);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  if (menuBtn) menuBtn.addEventListener('click', function () {
    drawer && drawer.classList.contains('open') ? closeDrawer() : openDrawer();
  });
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) closeDrawer();
  });
  if (drawer) {
    [].slice.call(drawer.querySelectorAll('a[href^="#"]')).forEach(function (a) {
      a.addEventListener('click', function () { closeDrawer(); });
    });
  }

  /* ---------- water ripple on press ---------- */
  var rippleSel = '.btn, .icon-btn, .chip, .tech, .link-list a, .to-top';
  doc.addEventListener('pointerdown', function (e) {
    var host = e.target.closest ? e.target.closest(rippleSel) : null;
    if (!host || reduce) return;
    var r = host.getBoundingClientRect();
    var size = Math.max(r.width, r.height) * 2.1;
    var span = doc.createElement('span');
    span.className = 'ripple';
    span.style.setProperty('--rx', (e.clientX - r.left) + 'px');
    span.style.setProperty('--ry', (e.clientY - r.top) + 'px');
    span.style.setProperty('--rs', size + 'px');
    host.appendChild(span);
    setTimeout(function () { span.remove(); }, 700);
  }, { passive: true });

  /* ---------- scroll progress (GPU) + active nav ---------- */
  var bar = doc.getElementById('progressBar');
  var navLinks = [].slice.call(doc.querySelectorAll('[data-nav]'));
  var sections = [].slice.call(doc.querySelectorAll('section[id]'));
  var ticking = false;

  function onScroll() {
    var h = doc.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? window.scrollY / h : 0;
    if (bar) bar.style.transform = 'scaleX(' + (p > 1 ? 1 : p) + ')';

    var pos = window.scrollY + 150;
    var current = sections.length ? sections[0].id : '';
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].offsetTop <= pos) current = sections[i].id;
    }
    navLinks.forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });

  [].slice.call(doc.querySelectorAll('a[href^="#"]')).forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var el = id && doc.getElementById(id);
      if (!el) return;
      e.preventDefault();
      var top = el.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top: Math.max(top, 0), behavior: reduce ? 'auto' : 'smooth' });
      history.replaceState(null, '', '#' + id);
    });
  });

  /* ---------- reveal on scroll + meters ---------- */
  function activate(el) {
    el.classList.add('in');
    [].slice.call(el.querySelectorAll('.meter-bar span')).forEach(function (s) {
      s.style.width = (s.getAttribute('data-width') || 0) + '%';
    });
  }
  var revealIO = null;
  if ('IntersectionObserver' in window && !reduce) {
    revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { activate(en.target); revealIO.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  }
  function observeReveals(scope) {
    var els = [].slice.call((scope || doc).querySelectorAll('[data-reveal]:not(.in)'));
    els.forEach(function (el) { revealIO ? revealIO.observe(el) : activate(el); });
  }
  observeReveals();

  /* ---------- marquee: clone track for a seamless loop ---------- */
  var track = doc.getElementById('marqueeTrack');
  if (track) {
    var clone = track.cloneNode(true);
    clone.removeAttribute('id');
    clone.setAttribute('aria-hidden', 'true');
    while (clone.firstChild) track.appendChild(clone.firstChild);
  }

  /* ---------- terminal pips + typewriter ---------- */
  [].slice.call(doc.querySelectorAll('.pips')).forEach(function (p) {
    var n = parseInt(p.getAttribute('data-pips'), 10) || 0;
    var out = '';
    for (var i = 0; i < 5; i++) out += i < n ? '▮' : '▯';
    p.textContent = out;
  });

  var termLines = [].slice.call(doc.querySelectorAll('#termBody .tline'));
  function playTerminal() {
    if (reduce) { termLines.forEach(function (l) { l.classList.add('show'); }); return; }
    var d = 0;
    termLines.forEach(function (line) {
      setTimeout(function () { line.classList.add('show'); }, d);
      d += 340;
    });
  }
  if (termLines.length) {
    if ('IntersectionObserver' in window) {
      var tio = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { playTerminal(); tio.disconnect(); }
      }, { threshold: 0.3 });
      tio.observe(termLines[0].closest('.terminal') || termLines[0]);
    } else { playTerminal(); }
  }

  /* ---------- hero typed role ---------- */
  var typed = doc.getElementById('typed');
  var words = ['Android developer', 'AI agent builder', 'terminal tinkerer', 'permanent learner'];
  if (typed) {
    if (reduce) {
      typed.textContent = words[0];
    } else {
      var wi = 0, ci = 0, deleting = false;
      (function tick() {
        var word = words[wi];
        typed.textContent = word.slice(0, ci);
        var wait = deleting ? 45 : 95;
        if (!deleting && ci === word.length) { deleting = true; wait = 1500; }
        else if (deleting && ci === 0) { deleting = false; wi = (wi + 1) % words.length; wait = 350; }
        else { ci += deleting ? -1 : 1; }
        setTimeout(tick, wait);
      })();
    }
  }

  /* ---------- card pointer glow ---------- */
  if (!reduce && window.matchMedia && window.matchMedia('(hover:hover)').matches) {
    [].slice.call(doc.querySelectorAll('.card')).forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      }, { passive: true });
    });
  }

  /* ---------- live clock (Asia/Dhaka) ---------- */
  function tickClock() {
    var t;
    try {
      t = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      t = new Date().toTimeString().slice(0, 5);
    }
    ['footerClock', 'drawerClock'].forEach(function (id) {
      var el = doc.getElementById(id);
      if (el) el.textContent = t;
    });
  }
  tickClock();
  setInterval(tickClock, 20000);

  /* ============================================================
     Live GitHub: repo cards + latest releases (auto sync)
     1) reads data/*.json  (refreshed every 6h by GitHub Actions)
     2) "Sync now" hits the GitHub API directly (localStorage cache)
     ============================================================ */
  var API = 'https://api.github.com';
  var OWNER = 'FoysalAhammad';
  var LANG_DOT = {
    Kotlin: '#a97bff', Java: '#f04a24', Python: '#3572a5', JavaScript: '#f1e05a',
    HTML: '#e34c26', CSS: '#563d7c', TypeScript: '#3178c6', C: '#555555', 'C++': '#f34b7d'
  };

  var FALLBACK = {
    synced_at: null,
    repos: [
      { name: 'agent24', description: 'Agent 24 — autonomous AI coding and technical assistant for Android.', url: 'https://github.com/FoysalAhammad/agent24', language: 'HTML', stars: 0, pushed_at: '' },
      { name: 'portfolio', description: 'Portfolio site', url: 'https://github.com/FoysalAhammad/portfolio', language: 'HTML', stars: 0, pushed_at: '' },
      { name: 'smarttrade', description: 'Crypto swing-trading journal for Android.', url: 'https://github.com/FoysalAhammad/smarttrade', language: 'HTML', stars: 0, pushed_at: '' },
      { name: 'WiFi-Repeater', description: 'WiFi repeater firmware for ESP8266 / ESP32.', url: 'https://github.com/FoysalAhammad/WiFi-Repeater', language: '', stars: 0, pushed_at: '' },
      { name: 'mobilerepair', description: 'Mobile repair helper tooling.', url: 'https://github.com/FoysalAhammad/mobilerepair', language: '', stars: 0, pushed_at: '' },
      { name: 'FoysalAhammad', description: 'GitHub profile README.', url: 'https://github.com/FoysalAhammad/FoysalAhammad', language: '', stars: 0, pushed_at: '' }
    ]
  };
  var FALLBACK_REL = {
    synced_at: null,
    releases: [
      { repo: 'WiFi-Repeater', tag: 'v1.0.0', url: 'https://github.com/FoysalAhammad/WiFi-Repeater/releases/tag/v1.0.0', published_at: '2026-10-04T16:45:02Z' },
      { repo: 'agent24', tag: 'v0.119.0', url: 'https://github.com/FoysalAhammad/agent24/releases/tag/v0.119.0', published_at: '2026-10-04T04:53:54Z' },
      { repo: 'smarttrade', tag: 'v1.1.2', url: 'https://github.com/FoysalAhammad/smarttrade/releases/tag/v1.1.2', published_at: '2026-10-04T02:10:53Z' }
    ]
  };

  var repoGrid = doc.getElementById('repoGrid');
  var relGrid = doc.getElementById('releaseGrid');
  var syncState = doc.getElementById('syncState');
  var syncBtn = doc.getElementById('syncBtn');
  var syncPill = syncState ? syncState.parentNode : null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function ago(iso) {
    if (!iso) return 'recently';
    var diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (isNaN(diff)) return 'recently';
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 86400 * 30) return Math.floor(diff / 86400) + 'd ago';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function skeletons(target, n) {
    if (!target) return;
    target.innerHTML = '';
    for (var i = 0; i < n; i++) {
      var s = doc.createElement('div');
      s.className = 'skel';
      target.appendChild(s);
    }
  }

  function renderRepos(payload) {
    if (!repoGrid) return;
    var list = (payload && payload.repos) || FALLBACK.repos;
    if (!list.length) {
      repoGrid.innerHTML = '<p class="empty-note">No public repos to show right now.</p>';
      return;
    }
    repoGrid.innerHTML = list.map(function (r) {
      var dot = LANG_DOT[r.language] || 'var(--brand)';
      return '<article class="repo-card" data-reveal>' +
        '<div class="repo-head"><svg class="i i-sm" aria-hidden="true"><use href="#i-box"/></svg>' +
        '<b class="repo-name">' + esc(r.name) + '</b>' +
        (r.archived ? '<span class="repo-badge">archived</span>' : (r.language ? '<span class="repo-badge">' + esc(r.language) + '</span>' : '')) +
        '</div>' +
        '<p class="repo-desc">' + esc(r.description || 'No description yet.') + '</p>' +
        '<div class="repo-meta">' +
        (r.language ? '<span><i class="lang-dot" style="background:' + dot + '"></i>' + esc(r.language) + '</span>' : '') +
        '<span><svg class="i i-sm" aria-hidden="true"><use href="#i-star"/></svg>' + (r.stars || 0) + '</span>' +
        '<span><svg class="i i-sm" aria-hidden="true"><use href="#i-clock"/></svg>' + ago(r.pushed_at) + '</span>' +
        '</div>' +
        '<a class="repo-go" href="' + esc(r.url) + '" target="_blank" rel="noopener">Open repo ' +
        '<svg class="i i-sm" aria-hidden="true"><use href="#i-arrow-right"/></svg></a>' +
        '</article>';
    }).join('');
    observeReveals(repoGrid);
  }

  function renderReleases(payload) {
    if (!relGrid) return;
    var list = (payload && payload.releases) || FALLBACK_REL.releases;
    if (!list.length) {
      relGrid.innerHTML = '<p class="empty-note">No releases yet — the first one is probably compiling.</p>';
      return;
    }
    relGrid.innerHTML = list.slice(0, 5).map(function (rel) {
      return '<article class="release-card" data-reveal>' +
        '<span class="release-ico"><svg class="i" aria-hidden="true"><use href="#i-box"/></svg></span>' +
        '<div class="release-body">' +
        '<a href="' + esc(rel.url) + '" target="_blank" rel="noopener"><b class="release-tag">' + esc(rel.tag) + '</b></a>' +
        '<span class="release-repo">' + esc(rel.repo) + '</span>' +
        '<span class="release-date">released ' + ago(rel.published_at) + '</span>' +
        '</div></article>';
    }).join('');
    observeReveals(relGrid);
  }

  function setSync(text, mode) {
    if (!syncState) return;
    syncState.textContent = text;
    if (syncPill) {
      syncPill.classList.toggle('live', mode === 'live');
      syncPill.classList.toggle('busy', mode === 'busy');
    }
  }

  function cacheSet(data) {
    try { localStorage.setItem('fa-gh-cache', JSON.stringify({ t: Date.now(), d: data })); } catch (e) {}
  }
  function cacheGet() {
    try {
      var raw = localStorage.getItem('fa-gh-cache');
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (Date.now() - o.t > 30 * 60 * 1000) return null;
      return o.d;
    } catch (e) { return null; }
  }

  function pickReleases(perRepoLists) {
    var all = [];
    perRepoLists.forEach(function (list) {
      (list || []).forEach(function (rel) {
        if (rel.draft || !rel.published_at) return;
        all.push({
          repo: rel.repository ? rel.repository.name : (rel.html_url.split('/releases/')[0].split('/').pop() || ''),
          tag: rel.tag_name || '',
          url: rel.html_url || '',
          published_at: rel.published_at
        });
      });
    });
    all.sort(function (a, b) { return new Date(b.published_at) - new Date(a.published_at); });
    var out = [], seen = {};
    all.forEach(function (x) { if (!seen[x.repo] && out.length < 5) { seen[x.repo] = 1; out.push(x); } });
    all.forEach(function (x) { if (out.length < 5 && out.indexOf(x) === -1) out.push(x); });
    return out.slice(0, 5);
  }

  function syncLive() {
    if (!syncBtn || syncBtn.disabled) return;
    syncBtn.disabled = true;
    syncBtn.classList.add('spinning');
    setSync('Talking to GitHub…', 'busy');

    fetch(API + '/users/' + OWNER + '/repos?per_page=100&sort=updated', { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) { if (!r.ok) throw new Error('repos ' + r.status); return r.json(); })
      .then(function (repos) {
        var pub = repos.filter(function (r) { return !r.private && !r.fork; });
        var repoPayload = {
          synced_at: new Date().toISOString(),
          repos: pub.map(function (r) {
            return {
              name: r.name, description: r.description || '', url: r.html_url,
              language: r.language || '', stars: r.stargazers_count || 0,
              archived: !!r.archived, pushed_at: r.pushed_at || ''
            };
          })
        };
        renderRepos(repoPayload);

        var probes = pub.slice(0, 8).map(function (r) {
          return fetch(API + '/repos/' + OWNER + '/' + r.name + '/releases?per_page=10')
            .then(function (res) { return res.ok ? res.json() : []; })
            .catch(function () { return []; });
        });
        return Promise.all(probes).then(function (lists) {
          var relPayload = { synced_at: new Date().toISOString(), releases: pickReleases(lists) };
          renderReleases(relPayload);
          cacheSet({ repos: repoPayload, releases: relPayload });
          setSync('Live sync · just now (' + repoPayload.repos.length + ' repos)', 'live');
        });
      })
      .catch(function (err) {
        setSync('GitHub API busy — showing saved data', '');
        if (window.console) console.warn('sync failed', err);
      })
      .then(function () {
        syncBtn.disabled = false;
        syncBtn.classList.remove('spinning');
      });
  }

  /* first paint: skeletons, then data (live cache → data/*.json → fallback) */
  skeletons(repoGrid, 6);
  skeletons(relGrid, 3);

  (function boot() {
    var cached = cacheGet();
    if (cached && cached.repos) {
      renderRepos(cached.repos);
      renderReleases(cached.releases);
      setSync('Live sync · ' + ago(cached.repos.synced_at), 'live');
      return;
    }
    Promise.all([
      fetch('data/repos.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch('data/releases.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (res) {
      var repos = res[0] || FALLBACK;
      var rels = res[1] || FALLBACK_REL;
      renderRepos(repos);
      renderReleases(rels);
      if (res[0]) setSync('Auto-synced · ' + ago(repos.synced_at), 'live');
      else setSync('Offline snapshot', '');
    });
  })();

  if (syncBtn) syncBtn.addEventListener('click', syncLive);

  onScroll();
})();
