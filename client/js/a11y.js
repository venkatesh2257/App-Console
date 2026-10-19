/* ==========================================================================
   RELEASEHUB V2 — ACCESSIBILITY LAYER
   Additive, runtime-only enhancement. It never removes or rewrites markup;
   it only adds the attributes a screen reader needs (labels, roles, scope,
   aria-hidden on decorative icons) plus a visually-hidden <h1>.

   Runs on load and re-runs when the DOM changes (tab switches, rendering),
   so dynamically generated content is covered too.

   Delete this file + its <script> tag to revert.
   ========================================================================== */
(function () {
  'use strict';

  /* Human labels for the Font Awesome glyphs used across the console. */
  var ICON_LABELS = {
    'bars': 'Toggle navigation menu',
    'xmark': 'Close',
    'magnifying-glass': 'Search',
    'bell': 'Notifications',
    'plus': 'Add',
    'minus': 'Remove',
    'trash': 'Delete',
    'trash-can': 'Delete',
    'pen': 'Edit',
    'pencil': 'Edit',
    'download': 'Download',
    'upload': 'Upload',
    'cloud-arrow-up': 'Upload file',
    'file-arrow-down': 'Export',
    'eye': 'View details',
    'copy': 'Copy to clipboard',
    'check': 'Confirm',
    'circle-check': 'Completed',
    'circle-xmark': 'Remove',
    'triangle-exclamation': 'Warning',
    'circle-exclamation': 'Notice',
    'arrow-right': 'Next',
    'arrow-left': 'Back',
    'arrow-up': 'Previous',
    'arrow-down': 'Next',
    'chevron-left': 'Previous page',
    'chevron-right': 'Next page',
    'backward-step': 'First page',
    'forward-step': 'Last page',
    'play': 'Run',
    'rotate': 'Refresh',
    'rotate-right': 'Refresh',
    'arrows-rotate': 'Refresh',
    'ellipsis': 'More options',
    'ellipsis-vertical': 'More options',
    'filter': 'Filter',
    'gear': 'Settings',
    'sliders': 'Adjust settings',
    'bolt': 'Quick action',
    'calendar': 'Date',
    'clock': 'Time',
    'folder-open': 'Open folder',
    'file': 'File',
    'shield-halved': 'Security',
    'lock': 'Locked',
    'unlock': 'Unlocked',
    'key': 'Signing key',
    'mobile-screen': 'Device',
    'bug': 'Issue',
    'chart-line': 'Chart',
    'chart-pie': 'Chart',
    'list': 'List view',
    'table': 'Table view',
    'th-large': 'Grid view',
    'print': 'Print',
    'link': 'Open link',
    'external-link': 'Open in new tab'
  };

  var SR_CSS = '.ux-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}';

  function injectSrOnlyStyles() {
    if (document.getElementById('ux-sr-only-style')) return;
    var s = document.createElement('style');
    s.id = 'ux-sr-only-style';
    s.textContent = SR_CSS;
    document.head.appendChild(s);
  }

  /* A page needs exactly one <h1>; keep it visually hidden so the design
     is untouched but assistive tech gets a proper document outline. */
  function ensureH1() {
    if (document.querySelector('h1')) return;
    var h1 = document.createElement('h1');
    h1.className = 'ux-sr-only';
    h1.textContent = 'ReleaseHub — Release Command Center';
    var host = document.querySelector('.app-main') || document.body;
    host.insertBefore(h1, host.firstChild);
  }

  function labelNavigation() {
    document.querySelectorAll('nav').forEach(function (nav) {
      if (!nav.hasAttribute('aria-label')) nav.setAttribute('aria-label', 'Primary navigation');
    });
    document.querySelectorAll('.nav-item.active').forEach(function (item) {
      if (!item.hasAttribute('aria-current')) item.setAttribute('aria-current', 'page');
    });
  }

  /* De-corrupt the accessible name of icon-only controls: prefer an explicit
     label, then the existing title, then a sensible name for the glyph. */
  function labelIconControls() {
    document.querySelectorAll('button, a, [role="button"]').forEach(function (el) {
      var text = (el.textContent || '').trim();
      var icon = el.querySelector('i[class*="fa-"], svg');
      if (!icon || text.length > 0) return;

      if (el.getAttribute('aria-label')) return;
      if (el.getAttribute('title')) {
        el.setAttribute('aria-label', el.getAttribute('title'));
        return;
      }

      var cls = (icon.getAttribute && icon.getAttribute('class')) || '';
      var name = '';
      Object.keys(ICON_LABELS).some(function (key) {
        if (cls.indexOf('fa-' + key) !== -1) { name = ICON_LABELS[key]; return true; }
        return false;
      });
      if (!name) {
        var tokens = cls.split(/\s+/).filter(function (c) {
          return c.indexOf('fa-') === 0 && ['fa-solid', 'fa-regular', 'fa-brands', 'fa-fw'].indexOf(c) === -1;
        });
        name = tokens.length ? tokens[tokens.length - 1].slice(3).replace(/-/g, ' ') : 'Button';
      }
      el.setAttribute('aria-label', name);
    });
  }

  /* Every FA glyph here is decorative: controls carry real text or, if
     icon-only, now have an aria-label. */
  function hideDecorativeIcons() {
    document.querySelectorAll('i[class*="fa-"]').forEach(function (i) {
      if (i.getAttribute('aria-hidden') !== 'true') i.setAttribute('aria-hidden', 'true');
    });
  }

  function prettify(v) {
    return String(v).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function labelFormControls() {
    document.querySelectorAll('input, select, textarea').forEach(function (el) {
      if (el.type === 'hidden') return;
      if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return;
      if (el.closest('label')) return;
      if (el.id) {
        var lab = document.querySelector('label[for="' + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id) + '"]');
        if (lab && (lab.textContent || '').trim()) return;
      }
      var source = el.getAttribute('placeholder') || el.getAttribute('name') ||
                   el.getAttribute('title') || el.getAttribute('data-label');
      el.setAttribute('aria-label', source ? prettify(source) : prettify(el.type || el.tagName));
    });
  }

  function scopeTableHeaders() {
    document.querySelectorAll('table th').forEach(function (th) {
      if (!th.hasAttribute('scope')) th.setAttribute('scope', 'col');
    });
  }

  /* The header search bar is a clickable <div>; make it a real control. */
  function fixCommandSearch() {
    document.querySelectorAll('.rc-search-bar').forEach(function (el) {
      if (el.getAttribute('data-ux-a11y') === '1') return;
      el.setAttribute('data-ux-a11y', '1');
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', 'Search releases, apps, findings and artifacts');
      el.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          el.click();
        }
      });
    });
  }

  function apply() {
    injectSrOnlyStyles();
    ensureH1();
    labelNavigation();
    labelIconControls();
    hideDecorativeIcons();
    labelFormControls();
    scopeTableHeaders();
    fixCommandSearch();
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    (window.requestAnimationFrame || window.setTimeout)(function () {
      scheduled = false;
      apply();
    }, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }

  /* Re-apply when the UI renders new content (tab switches, tables, modals). */
  document.addEventListener('DOMContentLoaded', function () {
    var obs = new MutationObserver(schedule);
    obs.observe(document.body, { childList: true, subtree: true });
  });

  window.addEventListener('load', schedule);
})();
