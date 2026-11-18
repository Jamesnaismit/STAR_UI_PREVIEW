/* Admissions page: loads the admin-built form and submits it. */
(function () {
  'use strict';
  var root = document.getElementById('apply-form'); if (!root) return;
  var S = window.SHS, F = window.SHSForm;
  var title = document.getElementById('apply-title'), intro = document.getElementById('apply-intro');
  fetch('/api/form').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (cfg) {
    if (title && cfg.title) title.textContent = cfg.title;
    if (intro) intro.textContent = cfg.intro || '';
    if (!cfg.open) { root.textContent = ''; root.appendChild(S.el('p', 'closed', cfg.closedMessage || 'Applications are closed.')); return; }
    var form = F.render(root, cfg), status = form.querySelector('.fstatus'), btn = form.querySelector('button[type=submit]');
    form.addEventListener('submit', function (e) {
      e.preventDefault(); status.textContent = ''; status.className = 'fstatus';
      var v = F.validate(form, cfg);
      if (v.bad) { status.textContent = 'Please fix the ' + v.bad + ' highlighted field' + (v.bad > 1 ? 's' : '') + '.'; status.classList.add('bad'); if (v.first) v.first.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      var fd = new FormData(form); btn.disabled = true; var label = btn.textContent; btn.textContent = 'Sending...';
      fetch('/api/apply', { method: 'POST', body: fd }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); }).then(function (res) {
        if (!res.ok) {
          btn.disabled = false; btn.textContent = label; status.textContent = res.d.error || 'Something went wrong. Please try again.'; status.classList.add('bad');
          var fe = res.d.fields || {}; Object.keys(fe).forEach(function (id) { var w = form.querySelector('[data-id="' + id + '"]'); if (w) { w.classList.add('bad'); w.querySelector('.ferr').textContent = fe[id]; } });
          return;
        }
        root.textContent = '';
        var ok = S.el('div', 'sent'); ok.appendChild(S.el('h3', '', 'Inquiry received'));
        ok.appendChild(S.el('p', '', res.d.message || 'Thank you.'));
        var ref = S.el('p', 'ref'); ref.appendChild(document.createTextNode('Your reference: ')); ref.appendChild(S.el('strong', '', res.d.ref)); ok.appendChild(ref);
        ok.appendChild(S.el('p', 'fnote', 'Please keep this reference if you contact the school office.'));
        root.appendChild(ok); ok.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }).catch(function () { btn.disabled = false; btn.textContent = label; status.textContent = 'Could not reach the server. Please try again or call the school office.'; status.classList.add('bad'); });
    });
  }).catch(function () {
    root.textContent = ''; root.appendChild(S.el('p', 'closed', 'The online form is not available right now. Please call the school office on +255 786 707 337.'));
  });
})();
