/* ==========================================================================
   RELEASEHUB V2 — THEME ENGINE
   Owns light/dark switching: injects the toggle button into the header,
   persists the choice, follows the OS when the user hasn't chosen, and
   recolours existing Chart.js instances.

   Delete this file + its <script> tag to remove the toggle (dark mode CSS
   can stay, it simply never activates).
   ========================================================================== */
(function () {
  'use strict';

  var KEY = 'rh-theme';
  var root = document.documentElement;

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function systemPrefersDark() {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function current() {
    return root.getAttribute('data-theme') || stored() || (systemPrefersDark() ? 'dark' : 'light');
  }

  function chartPalette() {
    return current() === 'dark'
      ? { text: '#A7B3CA', grid: 'rgba(255,255,255,0.08)' }
      : { text: '#64748B', grid: 'rgba(15,23,42,0.08)' };
  }

  /* Charts draw to canvas, so they don't inherit CSS colours. Re-tint the
     already-rendered instances so they stay legible after a switch. */
  function recolorCharts() {
    if (!window.Chart || !window.Chart.getChart) return;
    var c = chartPalette();
    document.querySelectorAll('canvas').forEach(function (cv) {
      var chart = window.Chart.getChart(cv);
      if (!chart) return;
      chart.options.color = c.text;
      if (chart.options.scales) {
        Object.keys(chart.options.scales).forEach(function (k) {
          var sc = chart.options.scales[k];
          if (sc.ticks) sc.ticks.color = c.text;
          if (sc.grid && sc.grid.color !== undefined) sc.grid.color = c.grid;
        });
      }
      if (chart.options.plugins && chart.options.plugins.legend && chart.options.plugins.legend.labels) {
        chart.options.plugins.legend.labels.color = c.text;
      }
      try { chart.update('none'); } catch (e) { /* ignore */ }
    });
  }

  function updateButton(mode) {
    if (!btn) return;
    var dark = mode === 'dark';
    btn.innerHTML = '<i class="fa-solid ' + (dark ? 'fa-sun' : 'fa-moon') + '" aria-hidden="true"></i>';
    btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    btn.setAttribute('title', dark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
  }

  function apply(mode, persist) {
    root.setAttribute('data-theme', mode);
    if (persist) { try { localStorage.setItem(KEY, mode); } catch (e) { /* ignore */ } }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'dark' ? '#0B0F17' : '#F8F9FE');
    updateButton(mode);
    recolorCharts();
  }

  function toggle() { apply(current() === 'dark' ? 'light' : 'dark', true); }

  var btn = null;
  function buildButton() {
    if (btn && document.body.contains(btn)) return;
    if (document.querySelector('.ux-theme-toggle')) return;
    var actions = document.querySelector('.header-actions');
    if (!actions) return;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-cred btn-cred-outline btn-cred-sm ux-theme-toggle';
    btn.style.cssText = 'border-radius:50%;width:36px;height:36px;padding:0;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
    btn.addEventListener('click', toggle);
    actions.insertBefore(btn, actions.firstChild);
    updateButton(current());
  }

  /* Sync with the OS while the user hasn't made an explicit choice. */
  if (window.matchMedia) {
    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
        if (!stored()) apply(e.matches ? 'dark' : 'light', false);
      });
    } catch (e) { /* older browsers */ }
  }

  apply(current(), false);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildButton);
  } else {
    buildButton();
  }

  window.Theme = {
    toggle: toggle,
    set: function (m) { apply(m, true); },
    current: current
  };
})();
