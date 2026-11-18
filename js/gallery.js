(function () {
  'use strict';
  var S = window.SHS, grid = document.getElementById('g-grid'), chips = document.getElementById('g-chips');
  var items = [], current = 'All';
  var FALLBACK = [['download.jpeg','Campus','The main school building'],['images__1_.jpeg','Campus','Students and teachers in front of the main building'],['images__13_.jpeg','Learning','Reading in class'],['images__12_.jpeg','Learning','Learning together'],['images__2_.jpeg','Community','Morning assembly'],['images__5_.jpeg','Community','Assembly in the hall'],['images__15_.jpeg','Community','Standing together'],['images__16_.jpeg','Community','On the school grounds'],['images__7_.jpeg','Faith','Mass in the school hall'],['images__11_.jpeg','Study tours','Kaole Ruins, Bagamoyo'],['images__8_.jpeg','Sport','Our team with their trophy'],['images__9_.jpeg','Sport','Champions'],['images__4_.jpeg','Campus life','Lunch together'],['images__17_.jpeg','Ceremonies','A school ceremony from above'],['images__10_.jpeg','Ceremonies','Graduation'],['images__14_.jpeg','Campus life','Reporting day']].map(function (a) { return { url: 'images/' + a[0], album: a[1], caption: a[2] }; });

  function render() {
    var show = items.filter(function (i) { return current === 'All' || i.album === current; });
    grid.textContent = '';
    if (!show.length) { grid.appendChild(S.el('p', 'lead', 'No photographs in this album yet.')); return; }
    var set = show.map(function (i) { return { type: 'image', url: i.url, caption: i.caption }; });
    show.forEach(function (it, n) {
      var b = S.el('button', 'g-item'); b.type = 'button'; b.setAttribute('aria-label', 'Open photo: ' + (it.caption || 'Star High School'));
      var im = document.createElement('img'); im.src = it.url; im.alt = it.caption || ''; im.loading = 'lazy'; b.appendChild(im);
      if (it.caption) b.appendChild(S.el('span', '', it.caption));
      b.onclick = function () { S.lightbox(set, n); };
      grid.appendChild(b);
    });
  }
  function buildChips(albums) {
    chips.textContent = '';
    ['All'].concat(albums).forEach(function (a) {
      var b = S.el('button', '', a); b.type = 'button'; b.setAttribute('aria-pressed', String(a === current));
      b.onclick = function () { current = a; Array.prototype.forEach.call(chips.children, function (c) { c.setAttribute('aria-pressed', String(c === b)); }); render(); };
      chips.appendChild(b);
    });
  }
  fetch('/api/gallery').then(function (r) { return r.json(); }).then(function (d) {
    items = d.items; buildChips(d.albums); render();
  }).catch(function () {
    items = FALLBACK; buildChips(Array.from(new Set(FALLBACK.map(function (i) { return i.album; }))).sort()); render();
  });
})();
