(() => {
  const drive = document.querySelector('.drive');
  const road = document.querySelector('#roadScene');
  const car = document.querySelector('#car');
  const shadow = document.querySelector('#carShadow');
  const light = document.querySelector('#roadLight');
  if (!drive || !road || !car) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smoothstep = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  // Three clean holds are already built into the motion at roughly 27%, 54%
  // and 80%. Later these exact holds receive Anmeldung, Theorie and Praxis.
  function travelled(p) {
    if (p < .24) return lerp(0, .27, smoothstep(p / .24));
    if (p < .31) return .27;
    if (p < .51) return lerp(.27, .53, smoothstep((p - .31) / .20));
    if (p < .58) return .53;
    if (p < .78) return lerp(.53, .78, smoothstep((p - .58) / .20));
    if (p < .85) return .78;
    return lerp(.78, 1, smoothstep((p - .85) / .15));
  }

  function pageProgress() {
    const rect = drive.getBoundingClientRect();
    return clamp(-rect.top / Math.max(1, rect.height - innerHeight));
  }

  let target = reduced ? .5 : pageProgress();
  let current = target;
  let raf = 0;

  function draw() {
    raf = 0;
    if (reduced) return;

    // Damp scroll jumps so mouse wheel, trackpad and iPhone momentum all feel
    // like one continuous mechanical movement instead of frame stepping.
    current += (target - current) * .115;
    if (Math.abs(target - current) < .00008) current = target;

    const t = travelled(current);
    const carY = lerp(8, 74, t);
    const roadY = -t * 165;

    road.style.transform = `translate3d(0, ${roadY}vh, 0)`;
    car.style.transform = `translate3d(-50%, ${carY}vh, 0)`;
    if (shadow) shadow.style.transform = `translate3d(-50%, ${carY + 2.4}vh, 0)`;
    if (light) light.style.transform = `translate3d(-50%, ${carY - 27}vh, 0)`;

    if (current !== target) request();
  }

  function request() {
    if (!raf) raf = requestAnimationFrame(draw);
  }

  function onScroll() {
    target = pageProgress();
    request();
  }

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  car.addEventListener('load', request, { once: true });
  request();
})();
