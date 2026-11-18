(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile menu
  var btn = document.querySelector('.menu-btn'), nav = document.getElementById('nav');
  function closeMenu() { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
  btn.addEventListener('click', function () {
    btn.setAttribute('aria-expanded', String(nav.classList.toggle('open')));
  });
  nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') closeMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  var y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
  if (reduce) { document.querySelectorAll('.rise').forEach(function (e) { e.classList.add('in'); }); }

  // Rise-in for photos (once)
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .15 });
    document.querySelectorAll('.rise').forEach(function (e) { io.observe(e); });
  } else { document.querySelectorAll('.rise').forEach(function (e) { e.classList.add('in'); }); }

  // Hero stack follows the pointer
  var scene = document.querySelector('.scene'), stack = document.querySelector('.stack');
  if (scene && stack && !reduce) {
    scene.addEventListener('pointermove', function (e) {
      var r = scene.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - .5, yy = (e.clientY - r.top) / r.height - .5;
      stack.classList.add('live');
      stack.style.transform = 'rotateX(' + (-yy * 22) + 'deg) rotateY(' + (x * 40) + 'deg)';
    });
    scene.addEventListener('pointerleave', function () {
      stack.classList.remove('live'); stack.style.transform = '';
    });
  }

  // Tilt tiles
  if (!reduce) {
    document.querySelectorAll('[data-tilt]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5, yy = (e.clientY - r.top) / r.height - .5;
        el.style.transform = 'rotateX(' + (-yy * 14) + 'deg) rotateY(' + (x * 14) + 'deg)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  // Flip cards (tap or Enter on touch / keyboard)
  document.querySelectorAll('.flipcard').forEach(function (c) {
    c.addEventListener('click', function () { c.classList.toggle('on'); });
  });

  // 3D ring gallery
  var ring = document.querySelector('.ring');
  if (ring) {
    var cells = ring.querySelectorAll('.cell'), n = cells.length, step = 360 / n, idx = 0, auto = null;
    var cap = document.getElementById('ring-cap');
    var radius = Math.round((ring.offsetWidth / 2) / Math.tan(Math.PI / n)) + 24;
    cells.forEach(function (c, i) { c.style.transform = 'rotateY(' + (i * step) + 'deg) translateZ(' + radius + 'px)'; });
    var base = 0;
    function show() {
      ring.style.transform = 'translateZ(-' + radius + 'px) rotateY(' + (-idx * step) + 'deg)';
      var k = ((idx % n) + n) % n;
      if (cap) cap.textContent = cells[k].querySelector('img').alt;
    }
    function go(d) { idx += d; show(); }
    document.getElementById('ring-prev').addEventListener('click', function () { go(-1); restart(); });
    document.getElementById('ring-next').addEventListener('click', function () { go(1); restart(); });
    function restart() { clearInterval(auto); if (!reduce) auto = setInterval(function () { go(1); }, 3500); }
    var sx = null;
    ring.parentNode.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    ring.parentNode.addEventListener('pointerup', function (e) {
      if (sx !== null && Math.abs(e.clientX - sx) > 40) { go(e.clientX < sx ? 1 : -1); restart(); }
      sx = null;
    });
    show(); restart();
  }
})();

/* ---- safety nets and footer crest (appended) */
(function () {
  'use strict';
  // never leave photo boxes empty if the reveal observer does not fire
  setTimeout(function () { document.querySelectorAll('.rise').forEach(function (e) { e.classList.add('in'); }); }, 2200);

  // broken images: retry once, then remove the empty frame so no blank gap is left
  function handle(im) {
    im.addEventListener('error', function () {
      if (!im.dataset.retry) { im.dataset.retry = '1'; var u = im.getAttribute('src'); im.src = u + (u.indexOf('?') < 0 ? '?r=1' : '&r=1'); return; }
      var box = im.closest('figure.photo, figure.frame, figure.ri, figure.cell, .att button, .g-item');
      if (box) box.hidden = true; else im.style.visibility = 'hidden';
    });
    if (im.complete && im.naturalWidth === 0 && im.getAttribute('src')) im.dispatchEvent(new Event('error'));
  }
  document.querySelectorAll('main img, .site-footer img').forEach(handle);

  // footer crest follows the pointer in 3D
  var foot = document.querySelector('.site-footer'), crest = document.querySelector('.crest');
  if (foot && crest && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    foot.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = crest.getBoundingClientRect(), x = (e.clientX - (r.left + r.width / 2)) / innerWidth, y = (e.clientY - (r.top + r.height / 2)) / innerHeight;
      crest.style.transform = 'rotateY(' + (x * 38) + 'deg) rotateX(' + (-y * 28) + 'deg)';
    });
    foot.addEventListener('pointerleave', function () { crest.style.transform = ''; });
  }
})();

/* ---- header on the home page, reveal on scroll, timeline tree, fact counters (appended) */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  var hdr = document.querySelector('.home .site-header'), hero = document.querySelector('.home .hero');
  function hdrState() { if (hdr) hdr.classList.toggle('solid', scrollY > (hero ? hero.offsetHeight - 110 : 60)); }

  var tree = document.getElementById('tree');
  function treeProgress() {
    if (!tree) return;
    var r = tree.getBoundingClientRect(), p = clamp((innerHeight * .6 - r.top) / r.height, 0, 1);
    tree.style.setProperty('--tp', reduce ? 1 : p.toFixed(4));
  }
  var ticking = false;
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; hdrState(); treeProgress(); }); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  hdrState(); treeProgress();

  var reveal = document.querySelectorAll('.reveal');
  if (reveal.length) {
    if (!reduce && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .12 });
      reveal.forEach(function (e) { io.observe(e); });
      setTimeout(function () { reveal.forEach(function (e) { e.classList.add('in'); }); }, 3500);
    } else reveal.forEach(function (e) { e.classList.add('in'); });
  }

  var nums = document.querySelectorAll('.fact .no');
  if (nums.length && !reduce && 'IntersectionObserver' in window) {
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; io2.unobserve(e.target);
        var m = /^(\d+)(.*)$/.exec(e.target.textContent.trim()); if (!m) return;
        var to = +m[1], suf = m[2], t0 = performance.now();
        (function step(now) { var f = clamp((now - t0) / 1300, 0, 1); e.target.textContent = Math.round(to * (1 - Math.pow(1 - f, 3))) + suf; if (f < 1) requestAnimationFrame(step); })(t0);
      });
    }, { threshold: .6 });
    nums.forEach(function (n) { io2.observe(n); });
  }
})();

/* ---- scroll progress, marker underline, staggered reveals, photo parallax (appended) */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // thin progress bar
  var bar = document.createElement('div'); bar.className = 'progress'; bar.setAttribute('aria-hidden', 'true'); document.body.appendChild(bar);

  // yellow marker under the last word of each page title
  function mark() {
    var h = document.querySelector('.page-head h1'); if (!h || h.querySelector('.hl')) return;
    var t = h.textContent.trim().split(/\s+/); if (!t.length) return;
    var last = t.pop(); h.textContent = t.join(' ') + (t.length ? ' ' : '');
    var s = document.createElement('span'); s.className = 'hl'; s.textContent = last; h.appendChild(s);
    setTimeout(function () { s.classList.add('on'); }, 450);
  }
  mark(); document.addEventListener('shs:content', function () { mark(); });

  // staggered reveals for common blocks
  var SEL = 'main .section h2, main .section .lead, main .tile, main .fact, main .ncard, main .tm, main .ann, main .steps li, main .branch, main .table-scroll, main .flips, main .split > div, main .chips, main .latest-head, main .pc, main .apply-head, main .af';
  var targets = Array.prototype.filter.call(document.querySelectorAll(SEL), function (e) {
    return !e.closest('.hero, .walk, .stack, .rails, .ring-wrap, .tree') && !e.classList.contains('rise') && !e.classList.contains('reveal') && !e.querySelector('.rise');
  });
  targets.forEach(function (e) {
    var i = Array.prototype.indexOf.call(e.parentNode.children, e);
    e.classList.add('reveal'); e.style.setProperty('--d', ((i % 6) * 70) + 'ms');
  });
  if (targets.length) {
    if (!reduce && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .08, rootMargin: '0px 0px -4% 0px' });
      targets.forEach(function (e) { io.observe(e); });
      setTimeout(function () { targets.forEach(function (e) { e.classList.add('in'); }); }, 4000);
    } else targets.forEach(function (e) { e.classList.add('in'); });
  }

  // progress + gentle parallax inside photo frames
  var photos = reduce ? [] : Array.prototype.slice.call(document.querySelectorAll('main .split .photo, main .two-photos .photo'));
  var tick = false;
  function frame() {
    tick = false;
    var max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--sc', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
    photos.forEach(function (p) {
      var r = p.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      var d = ((r.top + r.height / 2) - innerHeight / 2) / innerHeight;
      p.style.setProperty('--py', (-d * 22).toFixed(1) + 'px');
    });
  }
  function on() { if (!tick) { tick = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', on, { passive: true }); window.addEventListener('resize', on); frame();
})();

/* ---- growth rings timeline and exercise books (appended) */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var growth = document.getElementById('growth');
  if (growth) {
    var rings = growth.querySelectorAll('.rg'), steps = growth.querySelectorAll('.gstep');
    var byN = {}; Array.prototype.forEach.call(rings, function (r) { byN[r.style.getPropertyValue('--n').trim()] = r; });
    var set = function (i) {
      growth.dataset.s = i;
      growth.classList.toggle('tags', i >= 4);
      var upto = Math.min(i + 1, 6);
      for (var n = 1; n <= 6; n++) { var r = byN[n]; if (!r) continue; r.classList.toggle('on', n <= upto); r.classList.toggle('cur', n === upto && i < 6); }
      Array.prototype.forEach.call(steps, function (s, k) { s.classList.toggle('cur', k === i); });
    };
    if (reduce || !('IntersectionObserver' in window)) { set(6); }
    else {
      set(0);
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) set(+e.target.dataset.i); });
      }, { rootMargin: '-42% 0px -48% 0px' });
      Array.prototype.forEach.call(steps, function (s) { io.observe(s); });
    }
  }

  document.querySelectorAll('.book .cover').forEach(function (c) {
    var book = c.closest('.book');
    function toggle() { var o = book.classList.toggle('open'); c.setAttribute('aria-expanded', String(o)); }
    c.addEventListener('click', toggle);
    c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
})();
