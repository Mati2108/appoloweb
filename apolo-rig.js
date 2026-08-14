(function () {
  if (window.__apoloRigLoaded) return;
  window.__apoloRigLoaded = true;
  document.documentElement.classList.add('ap-rig');

  var eyeState = new WeakMap();
  var mx = window.innerWidth / 2, my = window.innerHeight * 0.42, hasPointer = false;
  window.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; hasPointer = true; spotQueued = true; }, { passive: true });
  var spotQueued = false;
  var excited = false, exciteT = 0, hoverStart = 0, angerT = 0;
  document.addEventListener('pointerover', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('[data-excite]')) { if (!excited) hoverStart = Date.now(); excited = true; }
  }, { passive: true });
  document.addEventListener('pointerout', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('[data-excite]')) excited = false;
  }, { passive: true });

  // ---- cursor spotlight: writes local --mx/--my on [data-spot] hosts ----
  function spot() {
    var hosts = document.querySelectorAll('[data-spot]');
    for (var i = hosts.length; i--;) {
      var h = hosts[i], r = h.getBoundingClientRect();
      if (!r.width || r.bottom < -200 || r.top > window.innerHeight + 200) continue;
      h.style.setProperty('--mx', (mx - r.left).toFixed(1) + 'px');
      h.style.setProperty('--my', (my - r.top).toFixed(1) + 'px');
    }
  }

  function opts() { return window.__apoloOpts || { eyeFollow: true, scrollReveal: true, stickyCta: true }; }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- scroll-linked reveal (Apple-style: progress driven, eased, staggered) ----
  var items = [];        // {el, i, p}
  var groups = new WeakSet();
  function collect() {
    var secs = document.querySelectorAll('[data-reveal]');
    items = [];
    for (var s = 0; s < secs.length; s++) {
      var sec = secs[s];
      sec.setAttribute('data-revealed', '1'); // CSS hand-off: rig owns it from here
      if (!groups.has(sec)) { groups.add(sec); sec.style.willChange = 'opacity, transform'; }
      var inner = sec.firstElementChild;
      var kids = inner && inner.children.length > 1 ? inner.children : [sec];
      for (var k = 0; k < kids.length; k++) {
        var kid = kids[k];
        // one more level for card grids
        var grid = kid.children && kid.children.length > 2 && /grid|flex/.test(kid.style.display || '') ? kid.children : null;
        if (grid) { for (var g = 0; g < grid.length; g++) items.push({ el: grid[g], i: g, p: -1 }); }
        else items.push({ el: kid, i: k, p: -1 });
      }
    }
  }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  var frame = 0, lastCount = -1;
  function tick() {
    frame++;
    var o = opts();
    var vh = window.innerHeight;

    // eyes
    exciteT += excited ? 0.055 : -0.055;
    exciteT = Math.max(0, Math.min(1, exciteT));
    var ex = exciteT * exciteT * (3 - 2 * exciteT);

    // hover duration drives two beats: a glance at the viewer, then anger
    var held = excited ? (Date.now() - hoverStart) / 1000 : 0;
    var glance = 0;
    if (held > 2.2 && held < 3.3) glance = Math.sin((held - 2.2) / 1.1 * Math.PI);
    angerT += (excited && held > 4.6) ? 0.018 : -0.06;
    angerT = Math.max(0, Math.min(1, angerT));
    var ang = angerT * angerT * (3 - 2 * angerT);

    var shake = 0.62 + 0.9 * ang;
    var bob = ex ? Math.sin(frame * shake) * (2.3 + 1.6 * ang) * ex : 0;
    var jit = ex ? Math.sin(frame * (shake * 1.47)) * (1.3 + 1.4 * ang) * ex : 0;
    var eyes = document.querySelectorAll('[data-eye]');
    for (var i = eyes.length; i--;) {
      var eye = eyes[i], pupil = eye.querySelector('[data-pupil]');
      if (!pupil) continue;
      if (!o.eyeFollow) { pupil.style.transform = 'none'; continue; }
      var r = eye.getBoundingClientRect();
      if (!r.width) continue;
      var st = eyeState.get(eye);
      if (!st) { st = { x: 0, y: 0, vx: 0, vy: 0 }; eyeState.set(eye, st); }
      var dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height / 2);
      var d = Math.hypot(dx, dy) || 1;
      var max = r.width * (0.15 + 0.09 * ex);
      var reach = Math.min(1, d / (hasPointer ? 260 : 420));
      var tx = dx / d * max * reach, ty = dy / d * max * reach;
      if (glance) { tx *= 1 - glance; ty *= 1 - glance; }   // pupils centre: looks straight at you
      st.vx = (st.vx + (tx - st.x) * (0.16 + 0.1 * glance)) * 0.80;
      st.vy = (st.vy + (ty - st.y) * (0.16 + 0.1 * glance)) * 0.80;
      st.x += st.vx; st.y += st.vy;
      pupil.style.transform = 'translate(' + (st.x + jit).toFixed(2) + 'px,' + (st.y + bob).toFixed(2) + 'px) scale(' + (1 + 0.34 * ex - 0.22 * ang).toFixed(3) + ')';
      eye.style.transform = ex ? 'scale(' + (1 + 0.12 * ex).toFixed(3) + ',' + (1 + 0.12 * ex - 0.3 * ang).toFixed(3) + ')' : '';
    }

    var brows = document.querySelectorAll('[data-brow]');
    for (var bi = brows.length; bi--;) {
      var inner = bi % 2 === 0 ? 1 : -1;                    // inner ends drop when angry
      brows[bi].style.transform = (ex || ang)
        ? 'translateY(' + (-3.2 * ex + 5.4 * ang + bob * 0.5).toFixed(2) + 'px) rotate(' + (inner * 19 * ang).toFixed(1) + 'deg) scale(' + (1 + 0.55 * ex + 0.3 * ang).toFixed(3) + ',' + (1 + 0.35 * ex + 0.7 * ang).toFixed(3) + ')'
        : '';
    }

    if (frame % 2 === 0) {
      if (spotQueued) { spotQueued = false; spot(); }
      var n = document.querySelectorAll('[data-reveal]').length;
      if (n !== lastCount) { lastCount = n; collect(); }

      for (var j = 0; j < items.length; j++) {
        var it = items[j], el = it.el;
        if (!el.isConnected) { collect(); break; }
        if (!o.scrollReveal || reduce) { el.style.opacity = '1'; el.style.transform = 'none'; continue; }
        var b = el.getBoundingClientRect();
        var start = vh * 0.94 + it.i * 34;   // stagger: later children start lower
        var end = vh * 0.58;
        var raw = (start - b.top) / (start - end);
        var p = ease(Math.max(0, Math.min(1, raw)));
        if (Math.abs(p - it.p) < 0.002) continue;
        it.p = p;
        el.style.opacity = (0.05 + 0.95 * p).toFixed(3);
        el.style.transform = 'translate3d(0,' + ((1 - p) * 34).toFixed(2) + 'px,0) scale(' + (0.985 + 0.015 * p).toFixed(4) + ')';
        el.style.willChange = p > 0 && p < 1 ? 'opacity, transform' : 'auto';
      }

      var prog = document.querySelector('[data-progress]');
      if (prog) {
        var max = document.documentElement.scrollHeight - vh;
        prog.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : 0) + ')';
      }

      var bar = document.querySelector('[data-sticky]');
      if (bar) {
        if (!o.stickyCta) bar.setAttribute('data-off', '1');
        else {
          bar.removeAttribute('data-off');
          var hero = document.querySelector('section');
          var past = hero ? hero.getBoundingClientRect().bottom - 40 < 0 : window.scrollY > 600;
          if (past) bar.setAttribute('data-past', '1'); else bar.removeAttribute('data-past');
        }
      }
    }
    requestAnimationFrame(tick);
  }
  // fail-safe: never leave content hidden
  setTimeout(function () {
    var els = document.querySelectorAll('[data-reveal]');
    for (var i = els.length; i--;) els[i].setAttribute('data-revealed', '1');
  }, 3000);
  requestAnimationFrame(tick);
})();
