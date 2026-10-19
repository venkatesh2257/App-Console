/* ==========================================================================
   RELEASEHUB V2 — MOTION & INTERACTION ENGINE
   Progressive enhancement: if this file never loads, the page still renders
   normally with its original styling. Nothing is hidden by default.

   1. Skip link (a11y)        5. Scroll progress + header condense
   2. Custom cursor FX        6. Number count-up
   3. Card spotlight          7. Ripple feedback
   4. Scroll reveals          8. Magnetic buttons
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = false;
  var finePointer = false;

  try {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  } catch (e) { /* matchMedia unavailable — fall back to safe defaults */ }

  var COLOR_PRIMARY = '#4F46E5';

  /* ======================================================================
     1. SKIP LINK — let keyboard users jump straight to the content
     ====================================================================== */
  function injectSkipLink() {
    if (doc.querySelector('.ux-skip-link')) return;
    var main = doc.querySelector('main.app-main') || doc.querySelector('main');
    if (!main) return;
    if (!main.id) main.id = 'ux-main-content';
    main.setAttribute('tabindex', '-1');

    var link = doc.createElement('a');
    link.className = 'ux-skip-link';
    link.href = '#' + main.id;
    link.textContent = 'Skip to main content';
    link.addEventListener('click', function (e) {
      e.preventDefault();
      main.focus();
      main.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
    doc.body.insertBefore(link, doc.body.firstChild);
  }

  /* ======================================================================
     2. CUSTOM CURSOR — crisp dot + trailing ring
     Native cursor is hidden only once the FX layer is confirmed live.
     ====================================================================== */
  var cursor = { active: false, mx: -100, my: -100, rx: -100, ry: -100 };

  function initCursor() {
    if (!finePointer || reduceMotion) return;
    // Without the independent `translate` property the dot would fight its
    // own scale animation and leave the system cursor hidden for nothing.
    if (!(window.CSS && CSS.supports && CSS.supports('translate', '0px'))) return;

    var dot = doc.createElement('div');
    dot.className = 'ux-cursor-dot';
    var ring = doc.createElement('div');
    ring.className = 'ux-cursor-ring';
    doc.body.appendChild(dot);
    doc.body.appendChild(ring);

    var lastMove = 0;
    var ready = false;

    var INTERACTIVE = [
      'a', 'button', 'input', 'select', 'textarea', 'label', 'summary',
      '[role="button"]', '[role="tab"]', '[role="link"]', '[role="checkbox"]',
      '.nav-item', '.rh-btn', '.btn-cred', '.rh-card', '.cred-card',
      '.rc-search-bar', '.period-pill', '.app-sidebar-link', '.switch'
    ].join(',');

    doc.addEventListener('pointermove', function (e) {
      cursor.mx = e.clientX;
      cursor.my = e.clientY;
      lastMove = performance.now();

      if (!ready) {
        ready = true;
        cursor.rx = cursor.mx;
        cursor.ry = cursor.my;
        root.classList.add('ux-cursor-on');
        cursor.active = true;
      }

      dot.classList.remove('is-dormant');
      ring.classList.remove('is-dormant');

      var hot = e.target.closest && e.target.closest(INTERACTIVE);
      ring.classList.toggle('is-active', !!hot);
      dot.classList.toggle('is-active', !!hot);
    }, { passive: true });

    doc.addEventListener('pointerdown', function () { ring.classList.add('is-pressed'); }, { passive: true });
    doc.addEventListener('pointerup', function () { ring.classList.remove('is-pressed'); }, { passive: true });

    // Never trap the cursor: park it the moment the pointer leaves the page.
    doc.addEventListener('mouseleave', function () {
      dot.classList.add('is-dormant');
      ring.classList.add('is-dormant');
    });
    doc.addEventListener('mouseenter', function () {
      dot.classList.remove('is-dormant');
      ring.classList.remove('is-dormant');
    });

    function frame() {
      if (cursor.active) {
        // Ring trails the dot with easing — the signature "liquid" feel.
        cursor.rx += (cursor.mx - cursor.rx) * 0.17;
        cursor.ry += (cursor.my - cursor.ry) * 0.17;

        dot.style.translate = cursor.mx + 'px ' + cursor.my + 'px';
        ring.style.translate = cursor.rx + 'px ' + cursor.ry + 'px';

        // Idle safety net: if the pointer has been still for 4s, fade the ring.
        var idle = performance.now() - lastMove > 4000;
        ring.classList.toggle('is-dormant', idle);
        dot.classList.toggle('is-dormant', idle);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // Full escape hatch: Escape always restores the system cursor.
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') root.classList.remove('ux-cursor-on');
    });
  }

  /* ======================================================================
     3 + 8. POINTER-DRIVEN EFFECTS — spotlight + magnetic in one pass
     ====================================================================== */
  var magneticTargets = [];

  function registerMagnetic() {
    var selector = '.rc-search-bar, .brand-logo, .rh-btn-primary, .btn-cred-primary';
    doc.querySelectorAll(selector).forEach(function (el) {
      if (el.dataset.uxMag) return;
      el.dataset.uxMag = '1';
      el.classList.add('ux-magnetic');
      magneticTargets.push(el);
    });
  }

  function initPointerEffects() {
    if (!finePointer || reduceMotion) return;

    var spotlightCard = null;

    doc.addEventListener('pointermove', function (e) {
      // --- Card spotlight ---
      var card = e.target.closest ? e.target.closest('.rh-card, .cred-card') : null;
      if (card !== spotlightCard) spotlightCard = card;
      if (card) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      }

      // --- Magnetic pull ---
      for (var i = 0; i < magneticTargets.length; i++) {
        var el = magneticTargets[i];
        var b = el.getBoundingClientRect();
        if (b.width === 0) continue;

        var cx = b.left + b.width / 2;
        var cy = b.top + b.height / 2;
        var dx = e.clientX - cx;
        var dy = e.clientY - cy;
        var reach = Math.max(b.width, b.height) * 0.75;

        if (Math.abs(dx) < reach && Math.abs(dy) < reach) {
          var pull = 0.16;
          var tx = Math.max(-9, Math.min(9, dx * pull));
          var ty = Math.max(-9, Math.min(9, dy * pull));
          el.style.setProperty('--ux-mx', tx.toFixed(2) + 'px');
          el.style.setProperty('--ux-my', ty.toFixed(2) + 'px');
        } else if (el.style.getPropertyValue('--ux-mx') !== '0px') {
          el.style.setProperty('--ux-mx', '0px');
          el.style.setProperty('--ux-my', '0px');
        }
      }
    }, { passive: true });

    doc.addEventListener('pointerleave', function () {
      magneticTargets.forEach(function (el) {
        el.style.setProperty('--ux-mx', '0px');
        el.style.setProperty('--ux-my', '0px');
      });
    });
  }

  /* ======================================================================
     7. RIPPLE — pointer-originated feedback on any button-like element
     ====================================================================== */
  function initRipple() {
    if (reduceMotion) return;
    var SELECTOR = '.rh-btn, .btn-cred, .nav-item, .app-sidebar-link';

    doc.addEventListener('pointerdown', function (e) {
      var el = e.target.closest ? e.target.closest(SELECTOR) : null;
      if (!el) return;
      if (el.classList.contains('ux-skip-link')) return;

      var r = el.getBoundingClientRect();
      var size = Math.max(r.width, r.height) * 2;
      var span = doc.createElement('span');
      span.className = 'ux-ripple';
      span.style.width = size + 'px';
      span.style.height = size + 'px';
      span.style.left = (e.clientX - r.left - size / 2) + 'px';
      span.style.top = (e.clientY - r.top - size / 2) + 'px';

      el.appendChild(span);
      span.addEventListener('animationend', function () { span.remove(); });
      // Safety: never leave stray nodes behind if the animation is interrupted.
      setTimeout(function () { if (span.isConnected) span.remove(); }, 1200);
    }, { passive: true });
  }

  /* ======================================================================
     4. SCROLL REVEALS
     Elements are opted in with .ux-reveal-ready — they are visible and
     untransitioned until this runs, so a JS failure costs nothing.
     ====================================================================== */
  var REVEAL_SELECTOR = [
    '.content-wrapper .rh-card',
    '.content-wrapper .cred-card',
    '.content-wrapper .rc-metric-grid > *',
    '.content-wrapper .rc-release-item-card',
    '.content-wrapper .rc-finding-card',
    '.content-wrapper .rc-delta-box',
    '.content-wrapper .audit-card',
    '.content-wrapper .play-radio-card',
    '.content-wrapper .grid-kpis > *',
    '.content-wrapper .timeline-item',
    '.content-wrapper .table-responsive',
    '.content-wrapper .stacktrace-box',
    '.content-wrapper .ux-anim'
  ].join(',');

  var revealObserver = null;
  var revealTargets = [];

  function showEl(el) {
    if (el.classList.contains('ux-is-visible')) return;
    el.classList.add('ux-is-visible');
    maybeCountUp(el);

    // Once the entrance has played, remove the reveal machinery entirely.
    // Leaving `transform: none` behind would permanently defeat the legacy
    // hover-lift rules (.audit-card:hover, .rc-metric-card:hover, ...).
    // dataset.uxReveal is deliberately kept so rescans never re-hide it.
    var cleaned = false;
    function cleanup(e) {
      if (e && e.target !== el) return;
      if (cleaned) return;
      cleaned = true;
      el.classList.remove('ux-reveal-ready', 'ux-is-visible', 'ux-r-up', 'ux-r-scale');
      el.style.removeProperty('--i');
      el.removeEventListener('transitionend', cleanup);
    }
    el.addEventListener('transitionend', cleanup);
    // Fallback for hidden/detached nodes whose transition never fires.
    setTimeout(cleanup, 1600);
  }

  function prepareReveals() {
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    var nodes = doc.querySelectorAll(REVEAL_SELECTOR);
    var perParent = new Map();

    nodes.forEach(function (el) {
      if (el.dataset.uxReveal) return;
      el.dataset.uxReveal = '1';

      // Stagger resets per container so long lists don't feel slow.
      var parent = el.parentElement;
      var n = perParent.get(parent) || 0;
      perParent.set(parent, n + 1);
      el.style.setProperty('--i', Math.min(n, 5));

      el.classList.add('ux-reveal-ready');

      // A little variety: KPI tiles pop in, everything else rises.
      var variant = (el.closest('.grid-kpis') || el.hasAttribute('data-ux-kpi')) ? 'ux-r-scale' : 'ux-r-up';
      el.classList.add(variant);

      revealTargets.push(el);
      revealObserver.observe(el);
    });
  }

  function initReveals() {
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          showEl(entry.target);
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });

    prepareReveals();

    // Re-scan: this app injects a lot of markup after first paint.
    var rescans = 0;
    var rescan = setInterval(function () {
      prepareReveals();
      if (++rescans >= 6) clearInterval(rescan);
    }, 700);

    // Safety sweep whenever a tab becomes visible, so no content can be
    // left stuck at opacity:0 (e.g. observer quirk after display toggling).
    sweepOnTabChange();
    setTimeout(sweepActiveTab, 900);
    setTimeout(sweepActiveTab, 2600);
  }

  function sweepActiveTab() {
    var active = doc.querySelector('.tab-content.active');
    if (!active) return;
    var vh = window.innerHeight || root.clientHeight;
    active.querySelectorAll('.ux-reveal-ready:not(.ux-is-visible)').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 1.05 && r.bottom > -vh * 0.5) showEl(el);
    });
  }

  function sweepOnTabChange() {
    if (!('MutationObserver' in window)) return;
    var sections = doc.querySelectorAll('.tab-content');
    if (!sections.length) return;
    var mo = new MutationObserver(function () {
      requestAnimationFrame(function () {
        sweepActiveTab();
        setTimeout(sweepActiveTab, 120);
      });
    });
    sections.forEach(function (s) { mo.observe(s, { attributes: true, attributeFilter: ['class'] }); });
  }

  /* ======================================================================
     6. COUNT-UP — animates a numeric value the first time it is revealed
     ====================================================================== */
  function maybeCountUp(scopeEl) {
    var nodes = scopeEl.classList && scopeEl.classList.contains('kpi-value')
      ? [scopeEl]
      : (scopeEl.querySelectorAll ? scopeEl.querySelectorAll('.kpi-value, [data-ux-count]') : []);

    Array.prototype.forEach.call(nodes, animateCount);
  }

  function animateCount(el) {
    if (reduceMotion || el.dataset.uxCounted) return;
    // Still inside a hidden tab — leave it uncounted so we can retry later.
    if (el.offsetParent === null) return;

    var raw = (el.textContent || '').trim();
    var m = raw.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(\D*)$/);
    // Empty or non-numeric — leave unmarked so we retry once data streams in.
    if (!m) return;

    var prefix = m[1];
    var numberStr = m[2];
    var suffix = m[3];
    var target = parseFloat(numberStr.replace(/,/g, ''));
    if (!isFinite(target)) return;

    var decimals = numberStr.indexOf('.') > -1 ? numberStr.split('.')[1].length : 0;
    var grouped = numberStr.indexOf(',') > -1;
    el.dataset.uxCounted = '1';

    var duration = 1050;
    var start = null;
    var last = raw;

    function format(v) {
      var out;
      if (grouped) {
        out = v.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        });
      } else {
        out = decimals ? v.toFixed(decimals) : String(Math.round(v));
      }
      return prefix + out + suffix;
    }

    function step(now) {
      if (!el.isConnected) return;
      // The app overwrote our value — hand control straight back to it.
      if (el.textContent !== last) return;

      if (start === null) start = now;
      var p = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - p, 3);

      if (p < 1) {
        last = format(target * eased);
        el.textContent = last;
        requestAnimationFrame(step);
      } else {
        el.textContent = raw;
      }
    }

    requestAnimationFrame(step);
  }

  /* ======================================================================
     6b. LATE-ARRIVING NUMBERS
     KPI values stream in after first paint, so watch for them — each value
     is counted at most once (guarded by data-ux-counted).
     ====================================================================== */
  function observeKpiValues() {
    if (reduceMotion || !('MutationObserver' in window) || !doc.body) return;

    var mo = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var rec = records[i];
        var node = rec.type === 'characterData'
          ? (rec.target.nodeType === 3 ? rec.target.parentElement : rec.target)
          : rec.target;
        if (!node) continue;

        if (node.classList && node.classList.contains('kpi-value')) {
          animateCount(node);
        } else if (node.querySelector && (rec.addedNodes.length || rec.type === 'characterData')) {
          var kids = node.querySelectorAll('.kpi-value');
          for (var k = 0; k < kids.length; k++) animateCount(kids[k]);
        }
      }
    });

    mo.observe(doc.body, { childList: true, characterData: true, subtree: true });
  }

  /* ======================================================================
     5. SCROLL PROGRESS + HEADER CONDENSE
     ====================================================================== */
  function initScroll() {
    var bar = doc.createElement('div');
    bar.className = 'ux-scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(bar);

    var header = doc.querySelector('.app-header');
    var ticking = false;

    function update() {
      var st = window.scrollY || root.scrollTop || 0;
      var max = (root.scrollHeight - window.innerHeight) || 1;
      var p = Math.max(0, Math.min(1, st / max));
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      if (header) header.classList.toggle('ux-condensed', st > 24);
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });

    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ======================================================================
     BOOT
     ====================================================================== */
  function boot() {
    try { injectSkipLink(); } catch (e) {}
    try { initScroll(); } catch (e) {}
    try { initRipple(); } catch (e) {}
    try { initReveals(); } catch (e) {}
    try { initPointerEffects(); } catch (e) {}
    try { initCursor(); } catch (e) {}
    try { registerMagnetic(); } catch (e) {}
    try { observeKpiValues(); } catch (e) {}

    // Late-added controls (many render after data loads) get the magnetic pull.
    setTimeout(registerMagnetic, 1200);
    setTimeout(registerMagnetic, 3000);
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
