/* ==========================================================================
   RELEASEHUB V3 — NOTIFICATIONS (toast layer)
   Replaces the jarring native alert() with a premium, accessible toast.
   Additive: delete this file + its <script> tag to revert to native alerts.
   ========================================================================== */
(function () {
  'use strict';

  var ICONS = {
    info: 'fa-circle-info',
    success: 'fa-circle-check',
    warn: 'fa-triangle-exclamation',
    error: 'fa-circle-exclamation'
  };

  var host = null;
  function ensureHost() {
    if (host && document.body.contains(host)) return host;
    host = document.createElement('div');
    host.className = 'ux-toasts';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    host.setAttribute('aria-atomic', 'false');
    document.body.appendChild(host);
    return host;
  }

  function inferType(msg) {
    var m = String(msg || '').toLowerCase();
    if (/(error|fail|invalid|cannot|unable|denied|missing|blocked)/.test(m)) return 'error';
    if (/(warn|required|notice|attention)/.test(m)) return 'warn';
    if (/(success|complete|completed|ready|saved|uploaded|passed|done)/.test(m)) return 'success';
    return 'info';
  }

  function toast(message, type) {
    var text = String(message == null ? '' : message);
    var kind = type || inferType(text);
    var el = document.createElement('div');
    el.className = 'ux-toast ux-toast-' + kind;
    el.setAttribute('role', 'status');

    var icon = document.createElement('i');
    icon.className = 'fa-solid ' + (ICONS[kind] || ICONS.info);
    icon.setAttribute('aria-hidden', 'true');

    var span = document.createElement('span');
    span.textContent = text;

    el.appendChild(icon);
    el.appendChild(span);
    ensureHost().appendChild(el);

    requestAnimationFrame(function () { el.classList.add('is-in'); });

    var timer = setTimeout(dismiss, kind === 'error' ? 7000 : 5200);
    function dismiss() {
      clearTimeout(timer);
      el.classList.remove('is-in');
      el.classList.add('is-out');
      setTimeout(function () { el.remove(); }, 320);
    }
    el.addEventListener('click', dismiss);
    return el;
  }

  window.uxToast = toast;

  /* Route the app's many alert() calls through the toast layer.
     Falls back to the native dialog if anything goes wrong. */
  var nativeAlert = window.alert;
  window.alert = function (message) {
    try { toast(message); } catch (e) { nativeAlert.call(window, message); }
  };
})();
