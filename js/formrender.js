/* Renders the admission form from its saved configuration. Used by the public page and the admin preview. */
(function () {
  'use strict';
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var AUTOC = { name: 'name', email: 'email', phone: 'tel' };

  function render(root, cfg, opts) {
    opts = opts || {}; root.textContent = '';
    var form = el('form', 'af'); form.noValidate = true; form.setAttribute('novalidate', '');
    var grid = el('div', 'flds'); form.appendChild(grid);
    (cfg.fields || []).forEach(function (f) {
      var id = 'f_' + f.id, wrap = el('div', 'fld' + (f.width === 'half' ? ' half' : '')); wrap.dataset.id = f.id;
      if (f.type === 'heading') { wrap.appendChild(el('h3', 'fh', f.label)); if (f.help) wrap.appendChild(el('p', 'fp', f.help)); grid.appendChild(wrap); return; }
      if (f.type === 'paragraph') { wrap.appendChild(el('p', 'fp', f.help || f.label)); grid.appendChild(wrap); return; }
      var input, req = !!f.required, hid = id + '_help', err = el('p', 'ferr'); err.id = id + '_err'; err.setAttribute('role', 'alert');

      function label(text, forId) { var l = el('label', 'fl'); if (forId) l.htmlFor = forId; l.appendChild(document.createTextNode(text)); if (req) { var s = el('span', 'req', ' *'); s.setAttribute('aria-hidden', 'true'); l.appendChild(s); } return l; }

      if (['radio', 'checkboxes'].indexOf(f.type) >= 0) {
        var fs = el('fieldset', 'fs'), lg = el('legend', 'fl'); lg.appendChild(document.createTextNode(f.label)); if (req) lg.appendChild(el('span', 'req', ' *')); fs.appendChild(lg);
        (f.options || []).forEach(function (o, i) {
          var row = el('label', 'opt'), inp = document.createElement('input'); inp.type = f.type === 'radio' ? 'radio' : 'checkbox'; inp.name = id; inp.value = o; inp.id = id + '_' + i;
          if (f.type === 'radio' && req && i === 0) inp.required = false; row.appendChild(inp); row.appendChild(el('span', '', o)); fs.appendChild(row);
        });
        wrap.appendChild(fs);
      } else if (f.type === 'checkbox') {
        var row = el('label', 'opt single'); input = document.createElement('input'); input.type = 'checkbox'; input.name = id; input.id = id; input.value = 'yes';
        row.appendChild(input); var tx = el('span', '', f.label); if (req) tx.appendChild(el('span', 'req', ' *')); row.appendChild(tx); wrap.appendChild(row);
      } else {
        wrap.appendChild(label(f.label, id));
        if (f.type === 'textarea') { input = document.createElement('textarea'); input.rows = 4; if (f.maxLength) input.maxLength = f.maxLength; if (f.minLength) input.minLength = f.minLength; }
        else if (f.type === 'select') {
          input = document.createElement('select'); var o0 = el('option', '', 'Choose...'); o0.value = ''; input.appendChild(o0);
          (f.options || []).forEach(function (o) { var op = el('option', '', o); op.value = o; input.appendChild(op); });
        } else if (f.type === 'file') {
          input = document.createElement('input'); input.type = 'file'; input.multiple = !!f.multiple;
          var acc = []; (f.accept || ['pdf', 'image']).forEach(function (a) { acc.push(a === 'pdf' ? 'application/pdf' : 'image/jpeg,image/png,image/webp,image/gif'); }); input.accept = acc.join(',');
        } else {
          input = document.createElement('input'); input.type = ({ text: 'text', email: 'email', tel: 'tel', number: 'number', date: 'date', time: 'time', url: 'url' })[f.type] || 'text';
          if (f.type === 'number') { if (f.min !== '' && f.min != null) input.min = f.min; if (f.max !== '' && f.max != null) input.max = f.max; input.step = 'any'; }
          if (f.maxLength) input.maxLength = f.maxLength; if (f.minLength) input.minLength = f.minLength;
          if (AUTOC[f.role]) input.autocomplete = AUTOC[f.role];
        }
        input.name = id; input.id = id; if (f.placeholder && f.type !== 'select' && f.type !== 'file') input.placeholder = f.placeholder;
        if (f.help) input.setAttribute('aria-describedby', hid);
        wrap.appendChild(input);
      }
      if (f.help) { var h = el('p', 'fhelp', f.help); h.id = hid; wrap.appendChild(h); }
      wrap.appendChild(err); grid.appendChild(wrap);
    });
    if (!opts.preview) {
      var hp = el('div', 'hp'); hp.setAttribute('aria-hidden', 'true');
      var hi = document.createElement('input'); hi.name = 'website'; hi.tabIndex = -1; hi.autocomplete = 'off'; hp.appendChild(hi); form.appendChild(hp);
    }
    var actions = el('div', 'factions'), btn = el('button', 'btn btn-solid', cfg.submitLabel || 'Send'); btn.type = 'submit';
    if (opts.preview) btn.disabled = true; actions.appendChild(btn); actions.appendChild(el('span', 'fnote', 'Fields marked * are required.')); form.appendChild(actions);
    form.appendChild(el('p', 'fstatus')); form.lastChild.setAttribute('role', 'status');
    root.appendChild(form); return form;
  }

  function validate(form, cfg) {
    var bad = 0, first = null;
    (cfg.fields || []).forEach(function (f) {
      if (f.type === 'heading' || f.type === 'paragraph') return;
      var id = 'f_' + f.id, wrap = form.querySelector('[data-id="' + f.id + '"]'), err = wrap.querySelector('.ferr'), msg = '';
      var els = form.querySelectorAll('[name="' + id + '"]'), v;
      if (f.type === 'file') {
        var files = els[0].files;
        if (f.required && !files.length) msg = 'Please attach a file.';
        else if (!f.multiple && files.length > 1) msg = 'Attach only one file.';
        else for (var i = 0; i < files.length; i++) if (files[i].size > 10 * 1024 * 1024) msg = files[i].name + ' is over 10 MB.';
      } else if (f.type === 'checkbox') { if (f.required && !els[0].checked) msg = 'This must be ticked.'; }
      else if (f.type === 'checkboxes') { var any = Array.prototype.some.call(els, function (x) { return x.checked; }); if (f.required && !any) msg = 'Choose at least one option.'; }
      else if (f.type === 'radio') { var pick = Array.prototype.some.call(els, function (x) { return x.checked; }); if (f.required && !pick) msg = 'Please choose one option.'; }
      else {
        v = els[0].value.trim();
        if (!v) { if (f.required) msg = 'This field is required.'; }
        else if (!els[0].checkValidity()) msg = els[0].validationMessage || 'Please check this answer.';
      }
      err.textContent = msg; wrap.classList.toggle('bad', !!msg);
      if (msg) { bad++; if (!first) first = wrap; }
    });
    return { bad: bad, first: first };
  }

  window.SHSForm = { render: render, validate: validate };
})();
