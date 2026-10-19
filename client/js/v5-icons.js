/* ==========================================================================
   RELEASEHUB V5 — GOOGLE MATERIAL SYMBOLS ICON LAYER
   Converts every Font Awesome <i> into the official Google Material Symbol,
   in place (the element stays an <i>, so all existing sizing/colour CSS and
   the layout are preserved). Runs on static + dynamically-rendered icons.

   Additive: delete this file + its <script> to revert to Font Awesome.
   ========================================================================== */
(function () {
  'use strict';

  /* Font Awesome class  →  Material Symbols ligature name */
  var MAP = {
    'fa-android': 'android',
    'fa-arrow-left': 'arrow_back',
    'fa-arrow-right': 'arrow_forward',
    'fa-arrow-rotate-left': 'undo',
    'fa-arrows-rotate': 'sync',
    'fa-arrow-up': 'arrow_upward',
    'fa-rotate': 'rotate_right',
    'fa-arrow-up-right-from-square': 'open_in_new',
    'fa-backward-step': 'skip_previous',
    'fa-ban': 'block',
    'fa-bars': 'menu',
    'fa-battery-full': 'battery_full',
    'fa-bell': 'notifications',
    'fa-bolt': 'bolt',
    'fa-bookmark': 'bookmark',
    'fa-box': 'inventory_2',
    'fa-box-archive': 'archive',
    'fa-boxes-stacked': 'inventory',
    'fa-box-open': 'package_2',
    'fa-bug': 'bug_report',
    'fa-calendar-check': 'event_available',
    'fa-camera': 'photo_camera',
    'fa-certificate': 'workspace_premium',
    'fa-chart-line': 'show_chart',
    'fa-chart-pie': 'pie_chart',
    'fa-check': 'check',
    'fa-check-double': 'done_all',
    'fa-chevron-down': 'expand_more',
    'fa-chevron-left': 'chevron_left',
    'fa-chevron-right': 'chevron_right',
    'fa-circle-check': 'check_circle',
    'fa-circle-exclamation': 'error',
    'fa-circle-info': 'info',
    'fa-circle-notch': 'progress_activity',
    'fa-circle-question': 'help',
    'fa-circle-xmark': 'cancel',
    'fa-clipboard-list': 'assignment',
    'fa-clock': 'schedule',
    'fa-clock-rotate-left': 'history',
    'fa-cloud-arrow-up': 'cloud_upload',
    'fa-code': 'code',
    'fa-code-branch': 'account_tree',
    'fa-code-compare': 'compare_arrows',
    'fa-code-merge': 'merge',
    'fa-copy': 'content_copy',
    'fa-cube': 'deployed_code',
    'fa-cubes': 'apps',
    'fa-cubes-stacked': 'widgets',
    'fa-database': 'database',
    'fa-download': 'download',
    'fa-file': 'description',
    'fa-file-circle-check': 'task',
    'fa-file-code': 'data_object',
    'fa-file-contract': 'description',
    'fa-file-csv': 'csv',
    'fa-file-invoice': 'receipt_long',
    'fa-file-shield': 'policy',
    'fa-file-zipper': 'folder_zip',
    'fa-filter': 'filter_list',
    'fa-fingerprint': 'fingerprint',
    'fa-flask': 'science',
    'fa-floppy-disk': 'save',
    'fa-folder-open': 'folder_open',
    'fa-forward-step': 'skip_next',
    'fa-gauge': 'speed',
    'fa-globe': 'public',
    'fa-google': 'public',
    'fa-google-play': 'apps',
    'fa-heart-pulse': 'monitor_heart',
    'fa-id-card': 'badge',
    'fa-image': 'image',
    'fa-key': 'key',
    'fa-layer-group': 'layers',
    'fa-link': 'link',
    'fa-list': 'list',
    'fa-list-check': 'checklist',
    'fa-location-dot': 'location_on',
    'fa-lock': 'lock',
    'fa-magnifying-glass': 'search',
    'fa-microchip': 'memory',
    'fa-mobile-screen': 'smartphone',
    'fa-mobile-screen-button': 'smartphone',
    'fa-moon': 'dark_mode',
    'fa-notes-medical': 'clinical_notes',
    'fa-pen': 'edit',
    'fa-pencil': 'edit',
    'fa-pen-to-square': 'edit_note',
    'fa-pills': 'medication',
    'fa-plane-departure': 'flight_takeoff',
    'fa-play': 'play_arrow',
    'fa-plus': 'add',
    'fa-print': 'print',
    'fa-rectangle-ad': 'ad_units',
    'fa-right-from-bracket': 'logout',
    'fa-rocket': 'rocket_launch',
    'fa-scale-balanced': 'balance',
    'fa-server': 'dns',
    'fa-shield-cat': 'security',
    'fa-shield-halved': 'verified_user',
    'fa-shield-heart': 'health_and_safety',
    'fa-shield-virus': 'coronavirus',
    'fa-signal': 'signal_cellular_alt',
    'fa-spinner': 'progress_activity',
    'fa-stethoscope': 'medical_services',
    'fa-sun': 'light_mode',
    'fa-table-columns': 'view_column',
    'fa-tablet': 'tablet',
    'fa-terminal': 'terminal',
    'fa-thumbtack': 'push_pin',
    'fa-traffic-light': 'traffic',
    'fa-trash': 'delete',
    'fa-trash-can': 'delete',
    'fa-triangle-exclamation': 'warning',
    'fa-truck-field': 'local_shipping',
    'fa-truck-medical': 'emergency',
    'fa-user-check': 'how_to_reg',
    'fa-user-lock': 'lock_person',
    'fa-user-shield': 'admin_panel_settings',
    'fa-wifi': 'wifi',
    'fa-wrench': 'build',
    'fa-xmark': 'close'
  };

  var STYLE_CLASSES = { 'fa-solid': 1, 'fa-regular': 1, 'fa-brands': 1, 'fa-light': 1, 'fa-thin': 1, 'fa-duotone': 1 };
  var ANIM_CLASSES = { 'fa-spin': 1, 'fa-pulse': 1, 'fa-spin-pulse': 1, 'fa-beat': 1, 'fa-bounce': 1, 'fa-fade': 1, 'fa-shake': 1, 'fa-flip': 1, 'fa-rotate': 1, 'fa-fw': 1 };

  function convert(el) {
    if (!el || el.dataset.msIcon === '1') return;
    var classes = (el.className || '').split(/\s+/);
    var key = null;
    for (var i = 0; i < classes.length; i++) {
      if (MAP[classes[i]]) { key = classes[i]; break; }
    }
    if (!key) return;

    var keepFixed = classes.indexOf('fa-fw') !== -1;

    el.dataset.msIcon = '1';
    el.classList.add('material-symbols-outlined');
    if (keepFixed) el.classList.add('ms-fw');
    el.textContent = MAP[key];
    if (!el.hasAttribute('aria-hidden') && !el.hasAttribute('aria-label')) {
      el.setAttribute('aria-hidden', 'true');
    }
    // Drop the Font Awesome classes (and animation utilities) so the FA
    // stylesheet no longer paints a glyph over the Material ligature.
    el.className.split(/\s+/).forEach(function (c) {
      if (STYLE_CLASSES[c] || ANIM_CLASSES[c] || c.indexOf('fa-') === 0) {
        if (c !== 'material-symbols-outlined' && c !== 'ms-fw') el.classList.remove(c);
      }
    });
  }

  function scan(root) {
    if (!root || root.nodeType !== 1 && root.nodeType !== 9) return;
    var list = root.querySelectorAll ? root.querySelectorAll('i[class*="fa-"]') : [];
    for (var i = 0; i < list.length; i++) convert(list[i]);
    if (root.nodeType === 1 && root.matches && root.matches('i[class*="fa-"]')) convert(root);
  }

  function boot() {
    scan(document);
    var obs = new MutationObserver(function (mutations) {
      for (var m = 0; m < mutations.length; m++) {
        var added = mutations[m].addedNodes;
        for (var n = 0; n < added.length; n++) {
          if (added[n].nodeType === 1) scan(added[n]);
        }
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.MaterialIcons = { convert: convert, scan: scan, MAP: MAP };
})();
