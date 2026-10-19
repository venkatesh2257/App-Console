/* ==========================================================================
   RELEASEHUB V4 — PLAY CONSOLE SHELL INTERACTIONS
   Header dropdowns (notifications · help · account) + light-first theming.
   Additive: delete this file + its <script> tag to remove the menus.
   ========================================================================== */
(function () {
  'use strict';

  /* Play Console is a light workspace — enforce it. */
  try { document.documentElement.setAttribute('data-theme', 'light'); } catch (e) {}

  var header = document.querySelector('.app-header');
  if (!header) return;

  /* ----------------------------------------------------------------
     Menu engine
     ---------------------------------------------------------------- */
  var menus = [];

  function closeAll(except) {
    menus.forEach(function (m) {
      if (m.panel === except) return;
      m.panel.classList.remove('is-open');
      m.button.setAttribute('aria-expanded', 'false');
    });
  }

  function makeMenu(buttonId, panelClass, ariaLabel, build) {
    var button = document.getElementById(buttonId);
    if (!button) return;
    var panel = document.createElement('div');
    panel.className = 'pcs-menu ' + panelClass;
    panel.setAttribute('role', 'menu');
    panel.setAttribute('aria-label', ariaLabel);
    panel.tabIndex = -1;
    build(panel);
    header.appendChild(panel);

    button.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = panel.classList.contains('is-open');
      closeAll(null);
      if (!open) {
        panel.classList.add('is-open');
        button.setAttribute('aria-expanded', 'true');
        panel.focus();
      }
    });
    panel.addEventListener('click', function () { closeAll(null); });

    menus.push({ button: button, panel: panel });
  }

  function row(icon, color, title, body, time) {
    return '<div class="pcs-menu-item" role="menuitem" tabindex="-1">' +
      '<i class="' + icon + '" style="color:' + color + '" aria-hidden="true"></i>' +
      '<div><div class="pcs-mi-title">' + title + '</div>' +
      (body ? '<div class="pcs-mi-body">' + body + '</div>' : '') +
      (time ? '<div class="pcs-mi-time">' + time + '</div>' : '') +
      '</div></div>';
  }

  /* ----------------------------------------------------------------
     Notifications  (local/demo activity — not Google Play data)
     ---------------------------------------------------------------- */
  var NOTIFICATIONS = [
    { icon: 'fa-solid fa-shield-halved', color: '#188038', title: 'Pre-audit finished', body: '8 engines completed · 0 blocking findings', time: '12 minutes ago' },
    { icon: 'fa-solid fa-cube', color: '#1A73E8', title: 'Bundle validated', body: '16 KB page alignment verified for all native libraries', time: '48 minutes ago' },
    { icon: 'fa-solid fa-triangle-exclamation', color: '#E37400', title: 'Review required', body: '2 permissions need a declaration before submission', time: '3 hours ago' },
    { icon: 'fa-solid fa-fingerprint', color: '#5F6368', title: 'Signing check passed', body: 'Upload key matches the registered certificate', time: 'Yesterday' }
  ];

  makeMenu('pcs-notif-btn', 'pcs-menu-notif', 'Notifications', function (panel) {
    var items = NOTIFICATIONS.map(function (n) {
      return row(n.icon, n.color, n.title, n.body, n.time);
    }).join('');
    panel.innerHTML =
      '<div class="pcs-menu-head"><span>Notifications</span>' +
      '<span class="pcs-menu-sub">Local workspace activity</span></div>' +
      items +
      '<div class="pcs-menu-foot">Demo activity from this workspace — not Google Play data.</div>';
  });

  /* ----------------------------------------------------------------
     Help / keyboard shortcuts
     ---------------------------------------------------------------- */
  makeMenu('pcs-help-btn', 'pcs-menu-help', 'Help and keyboard shortcuts', function (panel) {
    panel.innerHTML =
      '<div class="pcs-menu-head"><span>Keyboard shortcuts</span></div>' +
      '<div class="pcs-kbd-row"><span>Open command search</span><kbd>Ctrl / ⌘ + K</kbd></div>' +
      '<div class="pcs-kbd-row"><span>Close menus and dialogs</span><kbd>Esc</kbd></div>' +
      '<div class="pcs-kbd-row"><span>Toggle navigation drawer</span><kbd>Ctrl + B</kbd></div>' +
      '<div class="pcs-menu-foot">ReleaseHub Developer Console · internal release workspace.</div>';
  });

  /* ----------------------------------------------------------------
     Account
     ---------------------------------------------------------------- */
  makeMenu('pcs-account-btn', 'pcs-menu-account', 'Account', function (panel) {
    panel.innerHTML =
      '<div class="pcs-menu-head"><div>Venkatesh<br>' +
      '<span class="pcs-menu-sub">Release Lead · Enterprise Mobile Engineering</span></div></div>' +
      '<div class="pcs-menu-item" role="menuitem" tabindex="-1" data-action="search">' +
      '<i class="fa-solid fa-magnifying-glass" style="color:#5F6368" aria-hidden="true"></i>' +
      '<div><div class="pcs-mi-title">Open command search</div></div></div>' +
      '<div class="pcs-menu-item" role="menuitem" tabindex="-1" data-action="help">' +
      '<i class="fa-regular fa-circle-question" style="color:#5F6368" aria-hidden="true"></i>' +
      '<div><div class="pcs-mi-title">Keyboard shortcuts</div></div></div>' +
      '<div class="pcs-menu-item" role="menuitem" tabindex="-1" data-action="reload">' +
      '<i class="fa-solid fa-rotate" style="color:#5F6368" aria-hidden="true"></i>' +
      '<div><div class="pcs-mi-title">Refresh workspace</div></div></div>';

    panel.addEventListener('click', function (e) {
      var item = e.target.closest('[data-action]');
      if (!item) return;
      var action = item.getAttribute('data-action');
      if (action === 'search' && window.ReleaseHubUI && ReleaseHubUI.openCommandModal) ReleaseHubUI.openCommandModal();
      else if (action === 'help') { var h = document.getElementById('pcs-help-btn'); if (h) h.click(); }
      else if (action === 'reload') location.reload();
    });
  });

  /* ----------------------------------------------------------------
     Global dismissal + shortcut: Ctrl/Cmd + B closes menus
     ---------------------------------------------------------------- */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.pcs-menu') && !e.target.closest('[aria-haspopup="true"]')) closeAll(null);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeAll(null); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
      closeAll(null);
      if (window.App && App.toggleMobileSidebar) App.toggleMobileSidebar();
    }
  });

  /* ----------------------------------------------------------------
     Collapsible navigation groups (Play Console behaviour)
     ---------------------------------------------------------------- */
  var nav = document.querySelector('.nav-menu');
  if (nav) {
    var groups = [];
    var current = null;
    Array.prototype.forEach.call(nav.children, function (child) {
      if (child.classList && child.classList.contains('nav-item')) {
        if (current) current.items.push(child);
      } else {
        current = { header: child, items: [] };
        groups.push(current);
      }
    });

    groups.forEach(function (g) {
      var header = g.header;
      if (!header || !g.items.length) return;
      header.classList.add('pcs-nav-group');
      header.setAttribute('role', 'button');
      header.setAttribute('tabindex', '0');
      header.setAttribute('aria-expanded', 'true');

      var caret = document.createElement('i');
      caret.className = 'fa-solid fa-chevron-down pcs-group-caret';
      caret.setAttribute('aria-hidden', 'true');
      header.appendChild(caret);

      function toggle() {
        var collapsed = header.classList.toggle('pcs-collapsed');
        g.items.forEach(function (it) { it.classList.toggle('pcs-collapsed', collapsed); });
        header.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      }
      header.addEventListener('click', toggle);
      header.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); toggle(); }
      });
    });
  }
})();
