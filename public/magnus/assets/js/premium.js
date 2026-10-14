(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Magnetic hover on Buy buttons: a small pull toward the pointer.
  if (!reduce && fine) {
    document.querySelectorAll('.btn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) / r.width;
        var y = (e.clientY - r.top - r.height / 2) / r.height;
        b.style.transform = 'translate(' + (x * 8).toFixed(1) + 'px,' + (y * 6).toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  // Sticky mini buy bar on small screens, shown once the hero is out of view.
  var bar = document.querySelector('.buybar');
  var hero = document.querySelector('.hero');
  var buy = document.querySelector('.buy');
  if (bar && hero && 'IntersectionObserver' in window) {
    bar.hidden = false;
    var heroOut = false, buyIn = false;
    var sync = function () {
      var show = heroOut && !buyIn;
      bar.classList.toggle('on', show);
      bar.setAttribute('aria-hidden', show ? 'false' : 'true');
      bar.querySelector('a').tabIndex = show ? 0 : -1;
    };
    new IntersectionObserver(function (es) { heroOut = !es[0].isIntersecting; sync(); }).observe(hero);
    if (buy) new IntersectionObserver(function (es) { buyIn = es[0].isIntersecting; sync(); }).observe(buy);
  }

  // Clips: load and play only near the viewport; static poster under reduced motion.
  var vids = document.querySelectorAll('video[data-lazy]');
  if (reduce) return;
  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) {
        if (!v.dataset.loaded) {
          v.querySelectorAll('source[data-src]').forEach(function (s) { s.src = s.dataset.src; });
          v.load(); v.dataset.loaded = '1';
        }
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      } else if (v.dataset.loaded) { v.pause(); }
    });
  }, { rootMargin: '200px 0px' });
  vids.forEach(function (v) { io.observe(v); });
})();
