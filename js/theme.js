/* Light/dark theme. Light is the default; the visitor's choice is remembered. */
(function () {
  'use strict';
  var KEY = 'shs-theme', root = document.documentElement, saved = null;
  root.classList.add('js');
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  var dark = matchMedia('(prefers-color-scheme: dark)');
  function current() { return saved === 'dark' ? 'dark' : 'light'; }
  function apply() {
    root.setAttribute('data-theme', current());
    document.querySelectorAll('.theme').forEach(function (b) { b.setAttribute('aria-checked', String(current() === 'dark')); });
  }
  apply();
  document.addEventListener('DOMContentLoaded', function () {
    apply();
    document.querySelectorAll('.theme').forEach(function (b) {
      b.addEventListener('click', function () {
        saved = current() === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(KEY, saved); } catch (e) {}
        apply();
      });
    });
  });
})();
