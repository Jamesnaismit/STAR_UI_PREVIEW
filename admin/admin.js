(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var view = $('view'), S = { tab: 'dash', group: null, album: 'All', sel: {}, dirty: false, preview: true };
  var TITLES = { dash: 'Dashboard', apps: 'Applications', form: 'Admission form', content: 'Page content', ann: 'Announcements', gallery: 'Gallery', team: 'Our team', account: 'Account' };
  var PAGES = { home: '/', about: '/about.html', academics: '/academics.html', 'campus-life': '/campus-life.html', gallery: '/gallery.html', announcements: '/announcements.html', admissions: '/admissions.html', contact: '/contact.html', global: '/' };
  var TAGS = { h1: 'Main heading', h2: 'Heading', h3: 'Sub-heading', p: 'Paragraph', li: 'List item', figcaption: 'Caption', th: 'Table heading', td: 'Table cell', a: 'Button', alt: 'Photo description' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m, bad) { var t = $('toast'); t.textContent = m; t.className = 'show' + (bad ? ' bad' : ''); clearTimeout(toast.t); toast.t = setTimeout(function () { t.className = ''; }, 3200); }
  function abs(u) { return /^(\/|https?:)/.test(u) ? u : '/' + u.replace(/^\.?\//, ''); }
  function fail(e) { toast(e.message, true); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function ask(msg, ok) {
    return new Promise(function (res) {
      var d = $('dlg'); $('dlg-msg').textContent = msg; $('dlg-ok').textContent = ok || 'Delete';
      d.onclose = function () { res(d.returnValue === 'yes'); }; d.showModal();
    });
  }

  function api(method, url, body) {
    var o = { method: method, headers: { 'X-Requested-With': 'shs-admin' }, credentials: 'same-origin' };
    if (body instanceof FormData) o.body = body;
    else if (body !== undefined) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
    return fetch(url, o).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) { if (r.status === 401 && url !== '/api/login') showLogin(); throw new Error(d.error || 'Request failed'); }
        return d;
      });
    });
  }
  function xhr(method, url, fd, onp) {
    return new Promise(function (res, rej) {
      var x = new XMLHttpRequest(); x.open(method, url); x.setRequestHeader('X-Requested-With', 'shs-admin');
      if (x.upload && onp) x.upload.onprogress = function (e) { if (e.lengthComputable) onp(e.loaded / e.total); };
      x.onload = function () {
        var d = {}; try { d = JSON.parse(x.responseText); } catch (e) {}
        if (x.status >= 200 && x.status < 300) res(d); else { if (x.status === 401) showLogin(); rej(new Error(d.error || 'Upload failed')); }
      };
      x.onerror = function () { rej(new Error('Network error')); }; x.send(fd);
    });
  }

  /* ---- drop zones */
  function dz(name, accept, multiple, label, hint) {
    return '<label class="dz"><input type="file" name="' + name + '"' + (multiple ? ' multiple' : '') + ' accept="' + accept + '"><b>' + label + '</b>' + hint + '<ul class="picked"></ul></label>';
  }
  function wireDz(root) {
    Array.prototype.forEach.call(root.querySelectorAll('.dz'), function (z) {
      var inp = z.querySelector('input'), ul = z.querySelector('.picked');
      function show() { ul.innerHTML = Array.prototype.map.call(inp.files, function (f) { return '<li>' + esc(f.name) + ' (' + Math.max(1, Math.round(f.size / 1024)) + ' KB)</li>'; }).join(''); }
      inp.addEventListener('change', show);
      ['dragenter', 'dragover'].forEach(function (ev) { z.addEventListener(ev, function (e) { e.preventDefault(); z.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { z.addEventListener(ev, function (e) { e.preventDefault(); z.classList.remove('over'); }); });
      z.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) { inp.files = e.dataTransfer.files; show(); } });
    });
  }
  var IMGACC = 'image/jpeg,image/png,image/webp,image/gif', ALLACC = IMGACC + ',application/pdf';

  /* ---- shell */
  function showLogin() { $('app').hidden = true; $('login').hidden = false; }
  function showApp() { $('login').hidden = true; $('app').hidden = false; go(S.tab, true); }
  $('login-form').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target; $('login-err').textContent = '';
    api('POST', '/api/login', { username: f.username.value, password: f.password.value })
      .then(function () { f.password.value = ''; showApp(); }).catch(function (er) { $('login-err').textContent = er.message; });
  });
  $('logout').onclick = function () { api('POST', '/api/logout').then(showLogin); };
  $('burger').onclick = function () { $('side').classList.toggle('open'); };
  $('tabs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) go(b.dataset.tab); });
  window.addEventListener('beforeunload', function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

  function go(tab, force) {
    function run() {
      S.dirty = false; S.tab = tab; $('title').textContent = TITLES[tab]; $('side').classList.remove('open');
      Array.prototype.forEach.call($('tabs').children, function (b) { if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
      view.onclick = view.onchange = view.onsubmit = view.oninput = null; view.ondragstart = view.ondragend = view.ondragover = view.ondrop = null;
      if (typeof closeDrawer === 'function') closeDrawer();
      view.innerHTML = '<p class="empty">Loading&hellip;</p>';
      ({ dash: viewDash, apps: viewApps, form: viewForm, content: viewContent, ann: viewAnn, gallery: viewGallery, team: viewTeam, account: viewAccount })[tab]().catch(fail);
    }
    if (S.dirty && !force) ask('You have unsaved changes. Leave without saving?', 'Leave').then(function (ok) { if (ok) run(); }); else run();
  }

  /* ---- dashboard */
  function viewDash() {
    return api('GET', '/api/stats').then(function (d) {
      view.innerHTML = '<div class="stats">' + [['New applications', d.appsNew], ['All applications', d.apps], ['Announcements', d.announcements], ['Photos', d.photos], ['Team members', d.team], ['Edited fields', d.edits]].map(function (x) { return '<div class="stat"><b>' + x[1] + '</b><span>' + x[0] + '</span></div>'; }).join('') + '</div>' +
        '<div class="card"><h2>Quick actions</h2><div class="quick"><button data-go="apps">Review applications<small>Contact, accept or reject</small></button><button data-go="form">Edit admission form<small>Add questions and input types</small></button><button data-go="content">Edit page text<small>Headings, paragraphs, photos, footer</small></button><button data-go="ann">Post an announcement<small>With PDFs, images and photos</small></button><button data-go="gallery">Add gallery photos<small>Upload many at once</small></button><button data-go="team">Manage the team<small>Names, roles and photos</small></button></div></div>' +
        '<div class="card"><h2>Latest announcements</h2>' + (d.latest.length ? '<ul class="list">' + d.latest.map(function (a) { return '<li><span>' + esc(a.title) + '</span><small>' + esc(a.date) + '</small></li>'; }).join('') + '</ul>' : '<p class="empty">Nothing published yet.</p>') + '</div>';
      view.onclick = function (e) { var b = e.target.closest('[data-go]'); if (b) go(b.dataset.go); };
    });
  }

  /* ---- page content */
  function viewContent() {
    return Promise.all([api('GET', '/api/schema'), api('GET', '/api/content')]).then(function (r) {
      var schema = r[0], content = r[1];
      if (!S.group || !schema.some(function (g) { return g.id === S.group; })) S.group = schema[0].id;
      var g = schema.filter(function (x) { return x.id === S.group; })[0];
      var html = '<div class="toolbar"><label>Page<select id="grp">' + schema.map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === g.id ? ' selected' : '') + '>' + esc(s.title) + '</option>'; }).join('') + '</select></label>' +
        '<label>Search this page<input id="q" type="search" placeholder="Type a word to find a field"></label><label class="chk" style="flex:none"><input type="checkbox" id="pvt"' + (S.preview ? ' checked' : '') + '> Show preview</label></div>' +
        '<div class="cols' + (S.preview ? '' : ' nop') + '"><div class="card" id="fields"><p class="hint">Change any text or photo, then press Save. Fields marked <b>edited</b> differ from the original wording.</p>';
      g.fields.forEach(function (f) {
        var val = content[f.key] != null ? content[f.key] : f.default, ed = content[f.key] != null, search = (f.default + ' ' + val).toLowerCase();
        if (f.type === 'image') {
          html += '<div class="field" data-img="' + esc(f.key) + '" data-s="photo ' + esc(search) + '"><small>Photo' + (ed ? '<span class="edited">edited</span>' : '') + '</small><div class="imgf"><img src="' + esc(abs(val)) + '" alt=""><div><input type="file" accept="' + IMGACC + '"><div class="row"><button type="button" class="ghost" data-reset="' + esc(f.key) + '">Use original photo</button></div></div></div></div>';
        } else {
          html += '<div class="field" data-s="' + esc(search) + '"><label><small><span class="tag">' + esc(TAGS[f.tag] || f.tag) + '</span>' + (ed ? '<span class="edited">edited</span>' : '') + '</small><textarea data-key="' + esc(f.key) + '" data-init="' + esc(val) + '" data-def="' + esc(f.default) + '" rows="' + (val.length > 150 ? 5 : val.length > 70 ? 3 : 1) + '">' + esc(val) + '</textarea></label><div class="row"><button type="button" class="ghost" data-undo="' + esc(f.key) + '">Original wording</button></div></div>';
        }
      });
      html += '</div>' + (S.preview ? '<aside class="preview"><header><span>Live preview</span><button class="ghost" id="pvr" type="button">Refresh</button></header><iframe id="pv" title="Page preview" src="' + PAGES[g.id] + '"></iframe></aside>' : '') + '</div>' +
        '<div class="savebar"><span class="dirty" id="dirty">No unsaved changes</span><button class="btn" id="save">Save changes</button></div>';
      view.innerHTML = html;

      function count() { var n = 0; view.querySelectorAll('textarea[data-key]').forEach(function (t) { if (t.value !== t.dataset.init) n++; }); S.dirty = n > 0; var d = $('dirty'); d.textContent = n ? n + ' unsaved change' + (n > 1 ? 's' : '') : 'No unsaved changes'; d.className = 'dirty' + (n ? ' on' : ''); }
      view.oninput = function (e) { if (e.target.id === 'q') { var q = e.target.value.toLowerCase().trim(); view.querySelectorAll('.field').forEach(function (f) { f.hidden = q && f.dataset.s.indexOf(q) < 0; }); } else if (e.target.matches('textarea[data-key]')) count(); };
      view.onclick = function (e) {
        var u = e.target.getAttribute && e.target.getAttribute('data-undo');
        if (u) { var ta = view.querySelector('textarea[data-key="' + u + '"]'); ta.value = ta.dataset.def; count(); }
        var rs = e.target.getAttribute && e.target.getAttribute('data-reset');
        if (rs) { var up = {}; up[rs] = null; api('PUT', '/api/content', { updates: up }).then(function () { toast('Original photo restored'); go('content', true); }).catch(fail); }
        if (e.target.id === 'pvr') { var f = $('pv'); if (f) f.src = f.src; }
      };
      view.onchange = function (e) {
        if (e.target.id === 'grp') { var v = e.target.value; if (S.dirty) { ask('You have unsaved changes. Switch page anyway?', 'Switch').then(function (ok) { if (ok) { S.group = v; go('content', true); } else e.target.value = S.group; }); } else { S.group = v; go('content', true); } }
        else if (e.target.id === 'pvt') { S.preview = e.target.checked; go('content'); }
        else if (e.target.type === 'file' && e.target.files[0]) {
          var key = e.target.closest('[data-img]').dataset.img, fd = new FormData(); fd.append('file', e.target.files[0]);
          api('POST', '/api/content-image/' + encodeURIComponent(key), fd).then(function () { toast('Photo updated'); go('content', true); }).catch(fail);
        }
      };
      $('save').onclick = function () {
        var updates = {}, n = 0;
        view.querySelectorAll('textarea[data-key]').forEach(function (t) { if (t.value !== t.dataset.init) { updates[t.dataset.key] = t.value === t.dataset.def ? null : t.value; n++; } });
        if (!n) return toast('Nothing to save');
        api('PUT', '/api/content', { updates: updates }).then(function () { toast('Saved. The website is updated.'); S.dirty = false; go('content', true); }).catch(fail);
      };
    });
  }

  /* ---- announcements */
  function annForm(a) {
    var files = a ? '<ul class="files">' + (a.files.length ? a.files.map(function (f) { return '<li><input type="checkbox" name="rm" value="' + esc(f.url) + '" id="rm-' + esc(f.url) + '"><label for="rm-' + esc(f.url) + '" style="margin:0;font-weight:400;color:var(--ink)"><span class="t">' + (f.type === 'pdf' ? 'PDF' : 'IMAGE') + '</span> ' + esc(f.name) + ' <small style="color:var(--muted)">tick to remove</small></label></li>'; }).join('') : '<li class="empty" style="padding:0">No attachments</li>') + '</ul>' : '';
    return '<form data-ann="' + (a ? esc(a.id) : '') + '"><div class="two"><label>Title<input name="title" required maxlength="200" value="' + esc(a ? a.title : '') + '"></label><label>Date<input type="date" name="date" value="' + esc(a ? a.date : today()) + '"></label></div>' +
      '<label>Message<textarea name="body" rows="5" maxlength="5000">' + esc(a ? a.body : '') + '</textarea></label>' + files +
      dz('files', ALLACC, true, a ? 'Add more files' : 'Drop PDFs, images or photos here', 'or click to choose (up to 10 files, 15 MB each)') +
      '<label class="chk" style="margin-top:1rem"><input type="checkbox" name="pinned"' + (a && a.pinned ? ' checked' : '') + '> Pin to the top</label>' +
      '<div class="prog" hidden><i></i></div><div class="row"><button class="btn" type="submit">' + (a ? 'Save changes' : 'Publish announcement') + '</button>' + (a ? '<button class="danger" type="button" data-del="' + esc(a.id) + '">Delete</button>' : '') + '</div></form>';
  }
  function viewAnn() {
    return api('GET', '/api/announcements').then(function (list) {
      view.innerHTML = '<div class="card"><h2>New announcement</h2>' + annForm(null) + '</div><h2>Published (' + list.length + ')</h2>' +
        (list.length ? list.map(function (a) { return '<details class="item"><summary>' + esc(a.title) + (a.pinned ? ' <span class="pin">pinned</span>' : '') + ' <small>' + esc(a.date) + ' &middot; ' + a.files.length + ' file(s)</small></summary>' + annForm(a) + '</details>'; }).join('') : '<p class="empty">Nothing published yet.</p>');
      wireDz(view);
      view.onsubmit = function (e) {
        e.preventDefault(); var f = e.target, id = f.dataset.ann, fd = new FormData();
        fd.append('title', f.title.value); fd.append('date', f.date.value); fd.append('body', f.body.value); fd.append('pinned', f.pinned.checked ? 'true' : 'false');
        Array.prototype.forEach.call(f.files.files, function (x) { fd.append('files', x); });
        if (id) fd.append('removeFiles', JSON.stringify(Array.prototype.map.call(f.querySelectorAll('input[name=rm]:checked'), function (c) { return c.value; })));
        var btn = f.querySelector('.btn'), pg = f.querySelector('.prog'); btn.disabled = true; pg.hidden = false;
        xhr(id ? 'PUT' : 'POST', '/api/announcements' + (id ? '/' + id : ''), fd, function (p) { pg.firstChild.style.width = (p * 100) + '%'; })
          .then(function () { toast(id ? 'Saved' : 'Published'); go('ann', true); }).catch(function (er) { btn.disabled = false; pg.hidden = true; fail(er); });
      };
      view.onclick = function (e) {
        var id = e.target.getAttribute && e.target.getAttribute('data-del');
        if (id) ask('Delete this announcement and its files?').then(function (ok) { if (ok) api('DELETE', '/api/announcements/' + id).then(function () { toast('Deleted'); go('ann', true); }).catch(fail); });
      };
    });
  }

  /* ---- gallery */
  function selIds() { return Object.keys(S.sel).filter(function (k) { return S.sel[k]; }); }
  function viewGallery() {
    return api('GET', '/api/gallery').then(function (d) {
      var items = d.items.filter(function (i) { return S.album === 'All' || i.album === S.album; });
      view.innerHTML = '<div class="card"><h2>Add photos</h2><form id="gup"><div class="two"><label>Album<input name="album" list="albums" placeholder="e.g. Sports day" required></label><label>Caption (optional, used for every photo)<input name="caption" maxlength="200"></label></div>' +
        '<datalist id="albums">' + d.albums.map(function (a) { return '<option value="' + esc(a) + '">'; }).join('') + '</datalist>' +
        dz('files', IMGACC, true, 'Drop photos here', 'or click to choose (up to 20 at a time, 15 MB each)') + '<div class="prog" hidden><i></i></div><div class="row"><button class="btn" type="submit">Upload</button></div></form></div>' +
        '<div class="toolbar"><label>Show album<select id="alb"><option>All</option>' + d.albums.map(function (a) { return '<option' + (a === S.album ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('') + '</select></label><span class="hint" style="margin:0">' + items.length + ' photo(s). Tick photos to move or delete several at once.</span></div><div id="bulk"></div>' +
        (items.length ? '<div class="gal">' + items.map(function (i) { return '<div class="g' + (S.sel[i.id] ? ' sel' : '') + '" data-id="' + esc(i.id) + '"><input class="pick" type="checkbox" aria-label="Select photo"' + (S.sel[i.id] ? ' checked' : '') + '><img src="' + esc(i.url) + '" alt="" loading="lazy"><input class="cap" type="text" value="' + esc(i.caption) + '" placeholder="Caption" aria-label="Caption" maxlength="200"><input class="alb" type="text" value="' + esc(i.album) + '" list="albums" aria-label="Album" maxlength="60"><div class="row"><button class="btn" data-save>Save</button><button class="danger" data-rm>Delete</button></div></div>'; }).join('') + '</div>' : '<p class="empty">No photos here yet.</p>');
      wireDz(view);
      function bulk() {
        var n = selIds().length, b = $('bulk');
        b.innerHTML = n ? '<div class="bulk"><b>' + n + ' selected</b><span class="grow"></span><input id="bulkalb" list="albums" placeholder="Move to album"><button class="ghost" id="bulkmv">Move</button><button class="danger" id="bulkrm">Delete selected</button><button class="ghost" id="bulkno">Clear</button></div>' : '';
      }
      bulk();
      $('alb').onchange = function () { S.album = this.value; go('gallery', true); };
      $('gup').onsubmit = function (e) {
        e.preventDefault(); var f = e.target, fd = new FormData(); fd.append('album', f.album.value); fd.append('caption', f.caption.value);
        if (!f.files.files.length) return toast('Choose at least one photo', true);
        Array.prototype.forEach.call(f.files.files, function (x) { fd.append('files', x); });
        var b = f.querySelector('.btn'), pg = f.querySelector('.prog'); b.disabled = true; b.textContent = 'Uploading...'; pg.hidden = false;
        xhr('POST', '/api/gallery', fd, function (p) { pg.firstChild.style.width = (p * 100) + '%'; }).then(function (r) { toast(r.length + ' photo(s) added'); go('gallery', true); }).catch(function (er) { b.disabled = false; b.textContent = 'Upload'; pg.hidden = true; fail(er); });
      };
      view.onchange = function (e) {
        if (e.target.classList.contains('pick')) { var card = e.target.closest('.g'); S.sel[card.dataset.id] = e.target.checked; card.classList.toggle('sel', e.target.checked); bulk(); }
      };
      view.onclick = function (e) {
        var t = e.target;
        if (t.id === 'bulkno') { S.sel = {}; go('gallery', true); }
        else if (t.id === 'bulkmv') { var a = $('bulkalb').value.trim(); if (!a) return toast('Type an album name', true); api('POST', '/api/gallery-bulk', { ids: selIds(), action: 'album', album: a }).then(function (r) { toast(r.moved + ' moved'); S.sel = {}; go('gallery', true); }).catch(fail); }
        else if (t.id === 'bulkrm') { ask('Delete ' + selIds().length + ' selected photo(s)?').then(function (ok) { if (ok) api('POST', '/api/gallery-bulk', { ids: selIds(), action: 'delete' }).then(function (r) { toast(r.removed + ' deleted'); S.sel = {}; go('gallery', true); }).catch(fail); }); }
        var card = t.closest && t.closest('.g'); if (!card) return; var id = card.dataset.id;
        if (t.hasAttribute('data-save')) api('PUT', '/api/gallery/' + id, { caption: card.querySelector('.cap').value, album: card.querySelector('.alb').value }).then(function () { toast('Saved'); }).catch(fail);
        if (t.hasAttribute('data-rm')) ask('Delete this photo from the gallery?').then(function (ok) { if (ok) api('DELETE', '/api/gallery/' + id).then(function () { delete S.sel[id]; toast('Deleted'); go('gallery', true); }).catch(fail); });
      };
    });
  }

  /* ---- team */
  function teamForm(m) {
    return '<form data-team="' + (m ? esc(m.id) : '') + '"><div class="three"><label>Name<input name="name" required maxlength="80" value="' + esc(m ? m.name : '') + '"></label><label>Role or title<input name="role" maxlength="100" value="' + esc(m ? m.role : '') + '"></label><label>Order<input name="order" type="number" min="0" max="999" value="' + (m ? m.order : 10) + '"></label></div>' +
      '<label>Short description (shown when a visitor hovers over the card)<textarea name="bio" rows="3" maxlength="600">' + esc(m ? m.bio : '') + '</textarea></label>' +
      dz('photo', IMGACC, false, m ? 'Replace photo' : 'Drop a photo here (optional)', 'or click to choose. Portrait photos work best.') +
      (m && m.photo ? '<label class="chk" style="margin-top:.8rem"><input type="checkbox" name="removePhoto"> Remove current photo</label>' : '') +
      '<div class="row"><button class="btn" type="submit">' + (m ? 'Save changes' : 'Add team member') + '</button>' + (m ? '<button class="danger" type="button" data-del="' + esc(m.id) + '">Delete</button>' : '') + '</div></form>';
  }
  function viewTeam() {
    return api('GET', '/api/team').then(function (list) {
      view.innerHTML = '<div class="card"><h2>Add a team member</h2><p class="hint">The Our Team section appears on the home page and the About page as soon as there is at least one person. Lower order numbers come first.</p>' + teamForm(null) + '</div><h2>Team (' + list.length + ')</h2>' +
        (list.length ? list.map(function (m) { return '<details class="item"><summary>' + esc(m.name) + ' <small>' + esc(m.role) + '</small></summary><div style="padding:0 1rem 1rem"><div class="tmc">' + (m.photo ? '<img src="' + esc(m.photo) + '" alt="">' : '<div class="av">' + esc((m.name[0] || '?').toUpperCase()) + '</div>') + '<div>' + teamForm(m) + '</div></div></div></details>'; }).join('') : '<p class="empty">No team members yet.</p>');
      wireDz(view);
      view.onsubmit = function (e) {
        e.preventDefault(); var f = e.target, id = f.dataset.team, fd = new FormData();
        ['name', 'role', 'order', 'bio'].forEach(function (k) { fd.append(k, f[k].value); });
        if (f.photo.files[0]) fd.append('photo', f.photo.files[0]);
        if (f.removePhoto && f.removePhoto.checked) fd.append('removePhoto', 'true');
        var btn = f.querySelector('.btn'); btn.disabled = true;
        xhr(id ? 'PUT' : 'POST', '/api/team' + (id ? '/' + id : ''), fd).then(function () { toast(id ? 'Saved' : 'Added'); go('team', true); }).catch(function (er) { btn.disabled = false; fail(er); });
      };
      view.onclick = function (e) {
        var id = e.target.getAttribute && e.target.getAttribute('data-del');
        if (id) ask('Remove this person from the team page?', 'Remove').then(function (ok) { if (ok) api('DELETE', '/api/team/' + id).then(function () { toast('Removed'); go('team', true); }).catch(fail); });
      };
    });
  }

  /* ---- account */
  function viewAccount() {
    view.innerHTML = '<div class="card" style="max-width:480px"><h2>Change password</h2><form id="pw"><label>Current password<input type="password" name="current" autocomplete="current-password" required></label><label>New password (10 characters or more)<input type="password" name="next" minlength="10" autocomplete="new-password" required></label><label>Repeat new password<input type="password" name="again" minlength="10" autocomplete="new-password" required></label><button class="btn" type="submit">Change password</button></form></div>';
    $('pw').onsubmit = function (e) {
      e.preventDefault(); var f = e.target;
      if (f.next.value !== f.again.value) return toast('The new passwords do not match', true);
      api('PUT', '/api/password', { current: f.current.value, next: f.next.value }).then(function () { toast('Password changed. Please sign in again.'); showLogin(); }).catch(fail);
    };
    return Promise.resolve();
  }

    /* ================= applications ================= */
  var SL = { 'new': 'New', contacted: 'Contacted', accepted: 'Accepted', rejected: 'Rejected' }, ORDER = ['new', 'contacted', 'accepted', 'rejected'];
  var drawer = $('drawer'), scrim = $('scrim');
  function fdate(t) { return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function fdt(t) { return new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  function refreshBadge() {
    api('GET', '/api/stats').then(function (d) { var b = $('appbadge'); b.textContent = d.appsNew; b.hidden = !d.appsNew; }).catch(function () {});
  }
  function viewApps() {
    return api('GET', '/api/applications').then(function (list) { S.apps = list; renderApps(); refreshBadge(); });
  }
  function card(a) {
    return '<div class="kc s-' + a.status + '" draggable="true" data-id="' + esc(a.id) + '"><b>' + esc(a.name || 'Unnamed applicant') + '</b><small>' + esc(a.ref) + ' &middot; ' + fdate(a.created) + '</small>' +
      '<div class="meta">' + (a.phone ? '<span>' + esc(a.phone) + '</span>' : '') + (a.email ? '<span>' + esc(a.email) + '</span>' : '') + (a.files ? '<span>' + a.files + ' file(s)</span>' : '') + (a.notes ? '<span>note</span>' : '') + '</div></div>';
  }
  function renderApps() {
    var q = (S.appq || '').toLowerCase(), items = S.apps.filter(function (a) { return !q || (a.name + ' ' + a.ref + ' ' + a.email + ' ' + a.phone).toLowerCase().indexOf(q) >= 0; });
    var counts = {}; ORDER.forEach(function (k) { counts[k] = items.filter(function (a) { return a.status === k; }).length; });
    var html = '<div class="toolbar"><label>Search<input id="aq" type="search" placeholder="Name, reference, phone or email" value="' + esc(S.appq || '') + '"></label>' +
      '<div class="seg"><button data-v="board" aria-pressed="' + (S.appview !== 'list') + '">Board</button><button data-v="list" aria-pressed="' + (S.appview === 'list') + '">List</button></div>' +
      '<a class="ghost" style="text-decoration:none;display:inline-block" href="/api/applications.csv">Export CSV</a></div>';
    if (!S.apps.length) html += '<div class="card"><h2>No applications yet</h2><p class="hint">When someone sends the admission form on the website, it appears here. Drag cards between columns to change their status.</p></div>';
    else if (S.appview === 'list') {
      html += '<table class="lst"><thead><tr><th>Applicant</th><th>Reference</th><th>Received</th><th>Contact</th><th>Status</th></tr></thead><tbody>' + items.map(function (a) { return '<tr data-id="' + esc(a.id) + '"><td><b>' + esc(a.name || 'Unnamed applicant') + '</b></td><td>' + esc(a.ref) + '</td><td>' + fdate(a.created) + '</td><td>' + esc(a.phone || a.email) + '</td><td><span class="sbadge sb-' + a.status + '">' + SL[a.status] + '</span></td></tr>'; }).join('') + '</tbody></table>';
    } else {
      html += '<div class="board">' + ORDER.map(function (k) { return '<div class="col" data-st="' + k + '"><h3><span><span class="dot ' + 's-' + k + '"></span>' + SL[k] + '</span><i>' + counts[k] + '</i></h3>' + items.filter(function (a) { return a.status === k; }).map(card).join('') + '</div>'; }).join('') + '</div>';
    }
    view.innerHTML = html;
    view.oninput = function (e) { if (e.target.id === 'aq') { S.appq = e.target.value; var pos = e.target.selectionStart; renderApps(); var n = $('aq'); n.focus(); n.setSelectionRange(pos, pos); } };
    view.onclick = function (e) {
      var v = e.target.closest('[data-v]'); if (v) { S.appview = v.dataset.v; return renderApps(); }
      var c = e.target.closest('[data-id]'); if (c) openDrawer(c.dataset.id);
    };
    var dragId = null;
    view.ondragstart = function (e) { var c = e.target.closest('.kc'); if (!c) return; dragId = c.dataset.id; c.classList.add('drag'); e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; };
    view.ondragend = function (e) { var c = e.target.closest('.kc'); if (c) c.classList.remove('drag'); view.querySelectorAll('.col.over').forEach(function (x) { x.classList.remove('over'); }); };
    view.ondragover = function (e) { var col = e.target.closest('.col'); if (col) { e.preventDefault(); view.querySelectorAll('.col.over').forEach(function (x) { x.classList.remove('over'); }); col.classList.add('over'); } };
    view.ondrop = function (e) {
      var col = e.target.closest('.col'); if (!col || !dragId) return; e.preventDefault();
      setStatus(dragId, col.dataset.st); dragId = null;
    };
  }
  function setStatus(id, st, keepDrawer) {
    return api('PUT', '/api/applications/' + id, { status: st }).then(function (a) {
      var s = S.apps.filter(function (x) { return x.id === id; })[0]; if (s) s.status = a.status;
      toast('Marked ' + SL[st].toLowerCase()); if (S.tab === 'apps') renderApps(); refreshBadge(); if (!drawer.hidden && keepDrawer !== false) openDrawer(id);
    }).catch(fail);
  }
  function closeDrawer() { drawer.hidden = true; scrim.hidden = true; }
  scrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) closeDrawer(); });
  function digits(p) { var d = String(p || '').replace(/[^\d+]/g, ''); if (d[0] === '+') return d.slice(1); if (d[0] === '0') return '255' + d.slice(1); return d; }
  function tpl(kind, a) {
    var n = a.contact.name || 'there', r = a.ref;
    return ({
      ack: 'Hello ' + n + ', thank you for your admission inquiry to Star High School (reference ' + r + '). We have received it and will be in touch shortly.',
      docs: 'Hello ' + n + ', regarding your inquiry to Star High School (reference ' + r + '): please send us the missing documents so we can continue with the application.',
      accept: 'Hello ' + n + ', we are pleased to tell you that your application to Star High School (reference ' + r + ') has been accepted. The school office will contact you with the next steps.',
      reject: 'Hello ' + n + ', thank you for applying to Star High School (reference ' + r + '). We are sorry to say that we are unable to offer a place at this time.'
    })[kind];
  }
  function openDrawer(id) {
    api('GET', '/api/applications/' + id).then(function (a) {
      var c = a.contact, msg = tpl(a.status === 'accepted' ? 'accept' : a.status === 'rejected' ? 'reject' : 'ack', a);
      drawer.innerHTML = '<header><div><h2>' + esc(c.name || 'Unnamed applicant') + '</h2><div class="sub">' + esc(a.ref) + ' &middot; received ' + fdt(a.created) + '</div></div><div><span class="sbadge sb-' + a.status + '">' + SL[a.status] + '</span> <button class="ghost" id="dclose">Close</button></div></header>' +
        '<div class="sect"><h4>Decision</h4><div class="stbtns"><button class="ghost" data-st="contacted">Mark contacted</button><button class="btn ok" data-st="accepted">Accept</button><button class="btn no" data-st="rejected">Reject</button>' + (a.status !== 'new' ? '<button class="ghost" data-st="new">Back to new</button>' : '') + '</div></div>' +
        '<div class="sect"><h4>Contact the applicant</h4><div class="cbtns" id="cbtns"></div>' +
        '<label style="margin-top:.9rem">Message<select id="tplk"><option value="ack">Acknowledge</option><option value="docs">Ask for documents</option><option value="accept"' + (a.status === 'accepted' ? ' selected' : '') + '>Accepted</option><option value="reject"' + (a.status === 'rejected' ? ' selected' : '') + '>Rejected</option></select></label><textarea id="msg" rows="4">' + esc(msg) + '</textarea>' +
        (!c.phone && !c.email ? '<p class="hint">No phone or email was given. Mark a field as Phone or Email in the form builder to enable contact buttons.</p>' : '') + '</div>' +
        '<div class="sect"><h4>Answers</h4><dl class="ans">' + a.answers.map(function (x) { return '<dt>' + esc(x.label) + '</dt><dd>' + esc(x.value) + '</dd>'; }).join('') + '</dl></div>' +
        (a.files.length ? '<div class="sect"><h4>Files</h4>' + a.files.map(function (f) { var u = '/api/applications/' + a.id + '/file/' + f.id; return '<div class="fileitem">' + (f.mime.indexOf('image') === 0 ? '<img src="' + u + '" alt="">' : '<span class="t">PDF</span>') + '<span style="flex:1">' + esc(f.name) + '<br><small style="color:var(--muted)">' + esc(f.fieldLabel) + ' &middot; ' + Math.max(1, Math.round(f.size / 1024)) + ' KB</small></span><a href="' + u + '">Download</a></div>'; }).join('') + '</div>' : '') +
        '<div class="sect"><h4>Private notes</h4><textarea id="dnotes" rows="3" placeholder="Only visible to admins">' + esc(a.notes) + '</textarea><div class="row"><button class="btn" id="savenotes">Save notes</button></div></div>' +
        '<div class="sect"><h4>History</h4><ul class="hist">' + a.history.slice().reverse().map(function (h) { return '<li>' + fdt(h.at) + ' - ' + esc(h.action) + '</li>'; }).join('') + '</ul></div>' +
        '<div class="sect"><button class="danger" id="delapp">Delete this application</button></div>';
      function links() {
        var m = encodeURIComponent($('msg').value), b = '';
        if (c.phone) b += '<a class="btn cb" href="tel:' + esc(c.phone) + '">Call</a><a class="ghost cb" href="sms:' + esc(c.phone) + '?body=' + m + '">SMS</a><a class="ghost cb" target="_blank" rel="noopener" href="https://wa.me/' + digits(c.phone) + '?text=' + m + '">WhatsApp</a>';
        if (c.email) b += '<a class="ghost cb" href="mailto:' + esc(c.email) + '?subject=' + encodeURIComponent('Star High School admission ' + a.ref) + '&body=' + m + '">Email</a>';
        $('cbtns').innerHTML = b;
      }
      links(); drawer.hidden = false; scrim.hidden = false;
      $('msg').oninput = links; $('tplk').onchange = function () { $('msg').value = tpl(this.value, a); links(); };
      $('dclose').onclick = closeDrawer;
      drawer.onclick = function (e) {
        var st = e.target.getAttribute && e.target.getAttribute('data-st'); if (st) return setStatus(id, st);
        if (e.target.classList.contains('cb') && a.status === 'new') setStatus(id, 'contacted', false);
        if (e.target.id === 'savenotes') api('PUT', '/api/applications/' + id, { notes: $('dnotes').value }).then(function () { toast('Notes saved'); var s = S.apps.filter(function (x) { return x.id === id; })[0]; if (s) s.notes = !!$('dnotes').value; }).catch(fail);
        if (e.target.id === 'delapp') ask('Delete this application and its files for good?').then(function (ok) { if (ok) api('DELETE', '/api/applications/' + id).then(function () { toast('Deleted'); closeDrawer(); S.apps = S.apps.filter(function (x) { return x.id !== id; }); if (S.tab === 'apps') renderApps(); refreshBadge(); }).catch(fail); });
      };
    }).catch(fail);
  }

  /* ================= admission form builder ================= */
  var TYPES = [['text', 'Short text', 'One line'], ['textarea', 'Long text', 'Several lines'], ['email', 'Email', 'Checks the format'], ['tel', 'Phone number', 'Digits and +'], ['number', 'Number', 'Min and max'], ['date', 'Date', 'Date picker'], ['time', 'Time', 'Time picker'], ['url', 'Web link', 'Starts with http'], ['select', 'Dropdown list', 'Choose one'], ['radio', 'Single choice', 'Buttons'], ['checkboxes', 'Multiple choice', 'Tick several'], ['checkbox', 'Tick box', 'Yes or no'], ['file', 'File upload', 'PDF or photos'], ['heading', 'Section heading', 'Group questions'], ['paragraph', 'Information text', 'Notes for parents']];
  var TL = {}; TYPES.forEach(function (t) { TL[t[0]] = t[1]; });
  var CHOICE = ['select', 'radio', 'checkboxes'], TEXTY = ['text', 'textarea', 'email', 'tel', 'url'];
  function rid() { return Math.random().toString(36).slice(2, 10); }
  var cssText = null;
  function viewForm() {
    return api('GET', '/api/form').then(function (cfg) { S.cfg = cfg; S.fopen = {}; renderForm(); });
  }
  function fieldBody(f) {
    var h = '<div class="two"><label>' + (f.type === 'heading' ? 'Heading text' : f.type === 'paragraph' ? 'Title (optional)' : 'Question / label') + '<input data-k="label" value="' + esc(f.label) + '" maxlength="200"></label>' +
      '<label>Change type<select data-k="type">' + TYPES.map(function (t) { return '<option value="' + t[0] + '"' + (t[0] === f.type ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select></label></div>';
    if (f.type !== 'checkbox') h += '<label>' + (f.type === 'paragraph' ? 'Text shown to parents' : 'Help text under the field') + '<textarea data-k="help" rows="2" maxlength="500">' + esc(f.help) + '</textarea></label>';
    if (f.type === 'heading' || f.type === 'paragraph') return h;
    var row = '<div class="mini"><label class="chk"><input type="checkbox" data-k="required"' + (f.required ? ' checked' : '') + '> Required</label>';
    if (f.type !== 'checkbox') row += '<label class="chk">Width <select data-k="width" style="width:auto"><option value="full"' + (f.width !== 'half' ? ' selected' : '') + '>Full row</option><option value="half"' + (f.width === 'half' ? ' selected' : '') + '>Half row</option></select></label>';
    if (f.type === 'file') row += '<label class="chk"><input type="checkbox" data-k="multiple"' + (f.multiple ? ' checked' : '') + '> Allow several files</label><label class="chk"><input type="checkbox" data-a="pdf"' + ((f.accept || []).indexOf('pdf') >= 0 ? ' checked' : '') + '> PDF</label><label class="chk"><input type="checkbox" data-a="image"' + ((f.accept || []).indexOf('image') >= 0 ? ' checked' : '') + '> Photos</label>';
    h += row + '</div>';
    if (TEXTY.indexOf(f.type) >= 0 || f.type === 'number') h += '<div class="two"><label>Placeholder<input data-k="placeholder" value="' + esc(f.placeholder) + '" maxlength="120"></label>' + (TEXTY.indexOf(f.type) >= 0 ? '<label>Use this answer as the applicant\'s<select data-k="role"><option value="">Nothing special</option><option value="name"' + (f.role === 'name' ? ' selected' : '') + '>Name</option><option value="phone"' + (f.role === 'phone' ? ' selected' : '') + '>Phone number</option><option value="email"' + (f.role === 'email' ? ' selected' : '') + '>Email</option></select></label>' : '') + '</div>';
    if (CHOICE.indexOf(f.type) >= 0) h += '<label>Options (one per line)<textarea data-k="options" rows="4">' + esc((f.options || []).join('\n')) + '</textarea></label>';
    if (f.type === 'number') h += '<div class="two"><label>Minimum<input type="number" data-k="min" value="' + esc(f.min == null ? '' : f.min) + '"></label><label>Maximum<input type="number" data-k="max" value="' + esc(f.max == null ? '' : f.max) + '"></label></div>';
    if (['text', 'textarea'].indexOf(f.type) >= 0) h += '<div class="two"><label>Minimum characters<input type="number" min="0" data-k="minLength" value="' + esc(f.minLength || '') + '"></label><label>Maximum characters<input type="number" min="0" data-k="maxLength" value="' + esc(f.maxLength || '') + '"></label></div>';
    return h;
  }
  function fcard(f, i, n) {
    var star = f.required ? '<span class="freq">*</span>' : '';
    return '<div class="fcard' + (S.fopen[f.id] ? ' open' : '') + '" data-i="' + i + '" data-id="' + esc(f.id) + '"><div class="fhead" draggable="true"><span class="grip" title="Drag to reorder">::</span><span class="ftype">' + esc(TL[f.type] || f.type) + '</span><span class="flabel">' + esc(f.label || (f.type === 'paragraph' ? (f.help || 'Information text').slice(0, 60) : 'Untitled')) + '</span>' + star +
      '<span class="fact2"><button data-act="up"' + (i === 0 ? ' disabled' : '') + ' title="Move up">&uarr;</button><button data-act="down"' + (i === n - 1 ? ' disabled' : '') + ' title="Move down">&darr;</button><button data-act="dup" title="Duplicate">Copy</button><button data-act="del" title="Delete">Delete</button></span></div><div class="fbody">' + fieldBody(f) + '</div></div>';
  }
  function listHtml() { var fs = S.cfg.fields; return fs.length ? fs.map(function (f, i) { return fcard(f, i, fs.length); }).join('') : '<p class="empty">No fields yet. Add one from the buttons above.</p>'; }
  function dirty() { S.dirty = true; var d = $('fdirty'); if (d) { d.textContent = 'Unsaved changes'; d.className = 'dirty on'; } clearTimeout(dirty.t); dirty.t = setTimeout(preview, 200); }
  function preview() {
    var host = $('fprev'); if (!host || !window.SHSForm) return;
    if (!host.shadowRoot) host.attachShadow({ mode: 'open' });
    function paint() {
      var sr = host.shadowRoot; sr.innerHTML = '<style>:host{display:block;font-family:system-ui,sans-serif;color:#1c2b44;line-height:1.6;--bg:#fff;--bg2:#eef7fe;--bg3:#dcedf9;--line:#dbe6ef;--line2:#b4c6d8;--text:#1c2b44;--muted:#586b87;--head:#0a1428;--blue:#0b86d8;--accent:#0a6db4;--yellow:#fbee0a;--btn-bg:#fbee0a;--btn-fg:#101010;--r:6px;--sans:system-ui,sans-serif;--serif:Georgia,serif;--ease:ease}h3,h2{font-family:Georgia,serif;color:#0a1428;margin:0 0 .5em}</style><style>' + cssText + '</style><div class="ph"></div>';
      var box = sr.querySelector('.ph'), c = S.cfg;
      box.innerHTML = '<h2 style="font-size:1.6rem">' + esc(c.title) + '</h2><p style="color:#586b87">' + esc(c.intro) + '</p><div class="pf"></div>';
      window.SHSForm.render(box.querySelector('.pf'), c, { preview: true });
    }
    if (cssText != null) paint(); else fetch('/css/style.css').then(function (r) { return r.text(); }).then(function (t) { cssText = t.replace(/:root[^{]*\{[^}]*\}/g, ''); paint(); });
  }
  function renderForm() {
    var c = S.cfg;
    view.innerHTML = '<div class="card"><h2>Form settings</h2><div class="two"><label>Form title<input id="ftitle" value="' + esc(c.title) + '" maxlength="120"></label><label>Submit button text<input id="fsubmit" value="' + esc(c.submitLabel) + '" maxlength="40"></label></div>' +
      '<label>Introduction shown above the form<textarea id="fintro" rows="2" maxlength="1000">' + esc(c.intro) + '</textarea></label><label>Message shown after sending<textarea id="fsuccess" rows="2" maxlength="600">' + esc(c.successMessage) + '</textarea></label>' +
      '<label class="chk"><input type="checkbox" id="fopen"' + (c.open ? ' checked' : '') + '> Accepting applications online</label><label style="margin-top:.8rem">Message shown when closed<input id="fclosed" value="' + esc(c.closedMessage) + '" maxlength="400"></label></div>' +
      '<div class="card"><h2>Add a field</h2><p class="hint">Pick any input type. Click a field below to edit it, drag the handle to reorder.</p><div class="palette">' + TYPES.map(function (t) { return '<button data-add="' + t[0] + '">' + t[1] + '<small>' + t[2] + '</small></button>'; }).join('') + '</div></div>' +
      '<div class="card"><h2>Fields (' + c.fields.length + ')</h2><div id="flist">' + listHtml() + '</div></div>' +
      '<div class="card"><h2>Preview</h2><p class="hint">This is how parents will see the form. It updates as you edit.</p><div class="prevbox"><div id="fprev"></div></div></div>' +
      '<div class="savebar"><span class="dirty" id="fdirty">No unsaved changes</span><a class="ghost" style="text-decoration:none" href="/admissions.html#apply" target="_blank" rel="noopener">View on site</a><button class="btn" id="fsave">Save form</button></div>';
    preview();
    var list = $('flist');
    function rerender() { list.innerHTML = listHtml(); preview(); }
    ['ftitle:title', 'fsubmit:submitLabel', 'fintro:intro', 'fsuccess:successMessage', 'fclosed:closedMessage'].forEach(function (p) { var s = p.split(':'); $(s[0]).addEventListener('input', function () { S.cfg[s[1]] = this.value; dirty(); }); });
    $('fopen').addEventListener('change', function () { S.cfg.open = this.checked; dirty(); });
    view.onclick = function (e) {
      var add = e.target.closest('[data-add]');
      if (add) {
        var t = add.dataset.add, f = { id: rid(), type: t, label: t === 'heading' ? 'New section' : t === 'paragraph' ? '' : 'Untitled question', key: '', placeholder: '', help: t === 'paragraph' ? 'Write your note here.' : '', required: false, width: 'full', options: CHOICE.indexOf(t) >= 0 ? ['Option 1', 'Option 2'] : [], role: '' };
        if (t === 'file') { f.accept = ['pdf', 'image']; f.multiple = true; }
        S.cfg.fields.push(f); S.fopen[f.id] = true; dirty(); rerender(); $('flist').lastChild.scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
      }
      var card = e.target.closest('.fcard'); if (!card) return;
      var i = +card.dataset.i, act = e.target.getAttribute('data-act'), fs = S.cfg.fields;
      if (act) {
        if (act === 'up' && i > 0) fs.splice(i - 1, 0, fs.splice(i, 1)[0]);
        else if (act === 'down' && i < fs.length - 1) fs.splice(i + 1, 0, fs.splice(i, 1)[0]);
        else if (act === 'dup') { var cp = JSON.parse(JSON.stringify(fs[i])); cp.id = rid(); cp.key = ''; cp.label += ' (copy)'; fs.splice(i + 1, 0, cp); S.fopen[cp.id] = true; }
        else if (act === 'del') { ask('Delete the field "' + (fs[i].label || 'Untitled') + '"?').then(function (ok) { if (ok) { fs.splice(i, 1); dirty(); rerender(); } }); return; }
        dirty(); return rerender();
      }
      if (e.target.closest('.fhead')) { S.fopen[card.dataset.id] = !S.fopen[card.dataset.id]; card.classList.toggle('open'); }
    };
    function setProp(e) {
      var card = e.target.closest('.fcard'); if (!card) return; var f = S.cfg.fields[+card.dataset.i], k = e.target.dataset.k, a = e.target.dataset.a;
      if (a) { f.accept = f.accept || []; var ix = f.accept.indexOf(a); if (e.target.checked && ix < 0) f.accept.push(a); if (!e.target.checked && ix >= 0) f.accept.splice(ix, 1); dirty(); return; }
      if (!k) return; var v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      if (k === 'options') v = String(v).split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
      if (k === 'type') { f.type = v; if (CHOICE.indexOf(v) >= 0 && !(f.options || []).length) f.options = ['Option 1', 'Option 2']; if (v === 'file' && !f.accept) { f.accept = ['pdf', 'image']; } S.fopen[f.id] = true; dirty(); return rerender(); }
      f[k] = v;
      if (k === 'label') { var l = card.querySelector('.flabel'); l.textContent = v || 'Untitled'; }
      if (k === 'required') { var h = card.querySelector('.fhead'), s = h.querySelector('.freq'); if (v && !s) { var sp = document.createElement('span'); sp.className = 'freq'; sp.textContent = '*'; h.querySelector('.flabel').after(sp); } else if (!v && s) s.remove(); }
      dirty();
    }
    list.addEventListener('input', function (e) { if (e.target.type !== 'checkbox' && e.target.tagName !== 'SELECT') setProp(e); });
    list.addEventListener('change', setProp);
    var dragI = null;
    list.addEventListener('dragstart', function (e) { var c = e.target.closest('.fcard'); if (!c) return; dragI = +c.dataset.i; e.dataTransfer.setData('text/plain', String(dragI)); e.dataTransfer.effectAllowed = 'move'; });
    list.addEventListener('dragover', function (e) { var c = e.target.closest('.fcard'); if (c && dragI != null) { e.preventDefault(); list.querySelectorAll('.drop').forEach(function (x) { x.classList.remove('drop'); }); c.classList.add('drop'); } });
    list.addEventListener('drop', function (e) { var c = e.target.closest('.fcard'); if (!c || dragI == null) return; e.preventDefault(); var to = +c.dataset.i, fs = S.cfg.fields; if (to !== dragI) { fs.splice(to, 0, fs.splice(dragI, 1)[0]); dirty(); } dragI = null; rerender(); });
    list.addEventListener('dragend', function () { dragI = null; list.querySelectorAll('.drop').forEach(function (x) { x.classList.remove('drop'); }); });
    $('fsave').onclick = function () {
      var btn = this; btn.disabled = true;
      api('PUT', '/api/form', S.cfg).then(function (cfg) { S.cfg = cfg; S.dirty = false; toast('Form saved. It is live on the website.'); renderForm(); }).catch(function (er) { btn.disabled = false; fail(er); });
    };
  }

  setInterval(function () { if (!$('app').hidden) refreshBadge(); }, 60000);
  api('GET', '/api/me').then(showApp).catch(showLogin);
})();
