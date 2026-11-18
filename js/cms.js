/* Loads admin-edited content into the page and provides a shared lightbox. Fails quietly if the API is offline. */
(function () {
  'use strict';
  var SHS = window.SHS = window.SHS || {};

  // ---- content overrides
  fetch('/api/content').then(function (r) { return r.ok ? r.json() : {}; }).then(function (c) {
    document.querySelectorAll('[data-edit]').forEach(function (el) {
      var v = c[el.getAttribute('data-edit')];
      if (typeof v === 'string') el.textContent = v;
    });
    document.querySelectorAll('[data-edit-img]').forEach(function (el) {
      var k = el.getAttribute('data-edit-img');
      if (typeof c[k] === 'string' && c[k]) el.src = c[k];
      if (typeof c[k + '.alt'] === 'string') el.alt = c[k + '.alt'];
    });
    document.dispatchEvent(new Event('shs:content'));
  }).catch(function () {});

  // ---- helpers
  SHS.fmtDate = function (iso) {
    var d = new Date(iso + 'T00:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  SHS.el = function (tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  // ---- lightbox: items = [{type:'image'|'pdf', url, caption}]
  SHS.lightbox = function (items, i) {
    var prev = document.activeElement, box = SHS.el('div', 'lb');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Viewer');
    var stage = SHS.el('div', 'lb-stage'), cap = SHS.el('p');
    var x = SHS.el('button', 'x', '\u00d7'), pv = SHS.el('button', 'pv', '\u2039'), nx = SHS.el('button', 'nx', '\u203a');
    x.setAttribute('aria-label', 'Close'); pv.setAttribute('aria-label', 'Previous'); nx.setAttribute('aria-label', 'Next');
    box.appendChild(stage); box.appendChild(cap); box.appendChild(x);
    if (items.length > 1) { box.appendChild(pv); box.appendChild(nx); }
    function show() {
      var it = items[i]; stage.textContent = '';
      var m;
      if (it.type === 'pdf') { m = document.createElement('iframe'); m.title = it.caption || 'PDF document'; }
      else { m = document.createElement('img'); m.alt = it.caption || ''; }
      m.src = it.url; stage.appendChild(m); cap.textContent = it.caption || '';
    }
    function go(n) { i = (i + n + items.length) % items.length; show(); }
    function close() { document.removeEventListener('keydown', key); box.remove(); document.body.style.overflow = ''; if (prev && prev.focus) prev.focus(); }
    function key(e) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft' && items.length > 1) go(-1);
      else if (e.key === 'ArrowRight' && items.length > 1) go(1);
    }
    x.onclick = close; pv.onclick = function () { go(-1); }; nx.onclick = function () { go(1); };
    box.addEventListener('click', function (e) { if (e.target === box || e.target === stage) close(); });
    document.addEventListener('keydown', key);
    document.body.style.overflow = 'hidden';
    document.body.appendChild(box); show(); x.focus();
  };

  // ---- latest announcements on the home page
  var latest = document.getElementById('latest-list');
  if (latest) {
    fetch('/api/announcements').then(function (r) { return r.json(); }).then(function (list) {
      if (!list.length) return;
      list.slice(0, 3).forEach(function (a) {
        var c = SHS.el('a', 'ncard'); c.href = 'announcements.html#a-' + a.id;
        c.appendChild(SHS.el('time', '', SHS.fmtDate(a.date)));
        c.appendChild(SHS.el('h3', '', a.title));
        var t = a.body.length > 140 ? a.body.slice(0, 140).trim() + '\u2026' : a.body;
        c.appendChild(SHS.el('p', '', t));
        if (a.files.length) c.appendChild(SHS.el('small', '', a.files.length + (a.files.length === 1 ? ' attachment' : ' attachments')));
        latest.appendChild(c);
      });
      document.getElementById('latest').hidden = false;
    }).catch(function () {});
  }
})();

/* ---- team section + image safety net (appended) */
(function () {
  'use strict';
  var S = window.SHS;
  // if an edited photo fails to load, fall back to the original picture
  document.querySelectorAll('img[data-edit-img]').forEach(function (im) {
    var def = im.getAttribute('src');
    im.addEventListener('error', function () { if (def && im.getAttribute('src') !== def) im.src = def; });
  });
  var grids = document.querySelectorAll('[data-team]');
  if (!grids.length) return;
  fetch('/api/team').then(function (r) { return r.json(); }).then(function (list) {
    if (!list.length) return;
    grids.forEach(function (g) {
      g.textContent = '';
      list.forEach(function (m) {
        var c = S.el('article', 'tm'), ph = S.el('div', 'ph');
        ph.appendChild(S.el('span', 'ini', (m.name.trim()[0] || '?').toUpperCase()));
        if (m.photo) { var im = document.createElement('img'); im.src = m.photo; im.alt = m.name; im.decoding = 'async'; im.addEventListener('error', function () { im.remove(); }); ph.appendChild(im); }
        var info = S.el('div', 'info'); info.appendChild(S.el('h3', '', m.name)); if (m.role) info.appendChild(S.el('p', 'role', m.role));
        c.appendChild(ph); c.appendChild(info); if (m.bio) c.appendChild(S.el('p', 'bio', m.bio));
        c.addEventListener('pointermove', function (e) {
          if (e.pointerType === 'touch') return; var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
          c.style.transform = 'rotateX(' + (-y * 10) + 'deg) rotateY(' + (x * 10) + 'deg)';
        });
        c.addEventListener('pointerleave', function () { c.style.transform = ''; });
        g.appendChild(c);
      });
      var sec = g.closest('[data-team-sec]'); if (sec) sec.hidden = false;
    });
  }).catch(function () {});
})();
