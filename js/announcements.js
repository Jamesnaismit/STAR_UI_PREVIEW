(function () {
  'use strict';
  var S = window.SHS, root = document.getElementById('ann-list');
  fetch('/api/announcements').then(function (r) { return r.json(); }).then(function (list) {
    root.textContent = '';
    if (!list.length) { root.appendChild(S.el('p', 'lead', 'There are no announcements at the moment. Please check again soon.')); return; }
    list.forEach(function (a) {
      var art = S.el('article', 'ann'); art.id = 'a-' + a.id;
      var t = S.el('time', '', S.fmtDate(a.date)); art.appendChild(t);
      if (a.pinned) t.appendChild(S.el('span', 'pin', 'PINNED'));
      art.appendChild(S.el('h2', '', a.title));
      a.body.split(/\n{2,}/).forEach(function (p) { if (p.trim()) art.appendChild(S.el('p', '', p.trim())); });
      var imgs = a.files.filter(function (f) { return f.type === 'image'; });
      var pdfs = a.files.filter(function (f) { return f.type === 'pdf'; });
      var all = a.files.map(function (f) { return { type: f.type, url: f.url, caption: f.name }; });
      if (a.files.length) {
        var att = S.el('div', 'att');
        imgs.forEach(function (f) {
          var b = S.el('button'); b.type = 'button'; b.setAttribute('aria-label', 'View image ' + f.name);
          var im = document.createElement('img'); im.src = f.url; im.alt = f.name; im.loading = 'lazy'; b.appendChild(im);
          b.onclick = function () { S.lightbox(all, all.findIndex(function (x) { return x.url === f.url; })); };
          att.appendChild(b);
        });
        pdfs.forEach(function (f) {
          var row = S.el('div', 'pdf'); row.appendChild(S.el('b', '', 'PDF')); row.appendChild(S.el('span', '', f.name));
          var v = S.el('button', '', 'View'); v.type = 'button';
          v.onclick = function () { S.lightbox(all, all.findIndex(function (x) { return x.url === f.url; })); };
          var d = S.el('a', '', 'Download'); d.href = f.url; d.setAttribute('download', f.name);
          row.appendChild(v); row.appendChild(d); att.appendChild(row);
        });
        art.appendChild(att);
      }
      root.appendChild(art);
    });
    if (location.hash) { var t = document.querySelector(location.hash.replace(/[^#\w-]/g, '')); if (t) t.scrollIntoView(); }
  }).catch(function () {
    root.textContent = '';
    root.appendChild(S.el('p', 'lead', 'Announcements could not be loaded. Please try again later.'));
  });
})();
