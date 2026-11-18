/* Home page motion: gentle hero drift, camera walk, card stack, photo rails. Vanilla JS. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(f) { return f * f * f * (f * (6 * f - 15) + 10); }
  var hero = document.getElementById('hero');

  /* ---- walk: camera moves through photographs */
  var walk = document.getElementById('walk'), tunnel = document.getElementById('tunnel');
  var frames = tunnel ? Array.prototype.slice.call(tunnel.children) : [];
  var wcap = document.getElementById('walkcap'), bar = document.getElementById('walkbar');
  var Z = 1000, X = [.15, -.27, .25, -.24, .27, -.25, 0], lastIdx = -1;
  function layoutWalk() {
    var w = innerWidth;
    frames.forEach(function (f, i) { f.style.transform = 'translate3d(calc(-50% + ' + (X[i % X.length] * w) + 'px),-50%,' + (-i * Z) + 'px)'; });
  }
  function updWalk() {
    var p = clamp((scrollY - walk.offsetTop) / (walk.offsetHeight - innerHeight), 0, 1), cam = p * (frames.length - 1) * Z;
    tunnel.style.transform = 'translateZ(' + cam + 'px)';
    frames.forEach(function (f, i) {
      var rz = -i * Z + cam, far = clamp((rz + 2.6 * Z) / (1.1 * Z), 0, 1), near = clamp(1 - (rz - .15 * Z) / (.5 * Z), 0, 1);
      f.style.opacity = Math.min(far, near).toFixed(3); f.style.visibility = (far <= 0 || near <= 0) ? 'hidden' : 'visible';
    });
    var k = clamp(Math.round(cam / Z), 0, frames.length - 1);
    if (k !== lastIdx && wcap) {
      lastIdx = k; wcap.textContent = ''; wcap.appendChild(document.createTextNode(frames[k].dataset.title));
      var s = document.createElement('small'); s.textContent = frames[k].dataset.note; wcap.appendChild(s);
    }
    if (bar) bar.style.width = (p * 100) + '%';
  }

  /* ---- stack: cards fly away in 3D */
  var stack = document.getElementById('stack'), cards = Array.prototype.slice.call(document.querySelectorAll('#stk .sc')), sc = document.getElementById('stkc');
  function updStack() {
    var p = clamp((scrollY - stack.offsetTop) / (stack.offsetHeight - innerHeight), 0, 1), N = cards.length, raw = p * (N - 1);
    var fl = Math.floor(raw), pos = Math.min(N - 1, fl + ease(raw - fl));
    cards.forEach(function (c, i) {
      var d = i - pos, tr, op, b = 1;
      if (d >= 0) { tr = 'translate3d(0,' + (d * 34) + 'px,' + (-d * 130) + 'px) scale(' + (1 - d * .05) + ')'; op = d > 3 ? 0 : 1 - d * .14; b = 1 - d * .16; }
      else { var t = -d; tr = 'translate3d(' + (-t * 70) + 'vw,' + (-t * 8) + 'vh,' + (t * 260) + 'px) rotateY(' + (t * 38) + 'deg) rotateZ(' + (-t * 7) + 'deg)'; op = clamp(1 - t * 1.25, 0, 1); }
      c.style.transform = tr; c.style.opacity = op.toFixed(3); c.style.zIndex = N - i; c.style.filter = b < 1 ? 'brightness(' + b.toFixed(2) + ')' : 'none';
      c.style.visibility = op <= 0 ? 'hidden' : 'visible';
    });
    if (sc) sc.textContent = (Math.round(pos) + 1) + ' of ' + N;
  }

  /* ---- rails */
  var railsSec = document.getElementById('rails'), rails = Array.prototype.slice.call(document.querySelectorAll('#rails .rail'));
  function updRails() {
    var r = railsSec.getBoundingClientRect(), vh = innerHeight, p = clamp((vh - r.top) / (vh + r.height), 0, 1), w = innerWidth;
    rails.forEach(function (el, i) {
      var dir = +el.dataset.dir, shift = w * .42;
      el.style.transform = 'translate3d(' + ((dir < 0 ? -w * .06 - p * shift : -w * .5 + p * shift) + (i === 2 ? w * .04 : 0)) + 'px,0,0)';
    });
  }

  /* ---- one scroll loop */
  var queued = false;
  function update() {
    queued = false;
    if (reduce) return;
    if (hero) hero.style.setProperty('--sp', clamp(scrollY / hero.offsetHeight, 0, 1).toFixed(4));
    if (walk && tunnel) updWalk();
    if (stack && cards.length) updStack();
    if (railsSec && rails.length) updRails();
  }
  function kick() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', function () { layoutWalk(); kick(); });
  layoutWalk(); update();
})();
