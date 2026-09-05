(() => {
  const drive = document.querySelector('.drive');
  const road = document.querySelector('#roadScene');
  const car = document.querySelector('#car');
  const shadow = document.querySelector('#carShadow');
  const light = document.querySelector('#roadLight');
  const stations = [...document.querySelectorAll('.drive-station')];
  if (!drive || !road || !car) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smoothstep = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  const stopTravel = [.27, .53, .78];
  stations.forEach((el, i) => {
    const y = lerp(8, 74, stopTravel[i] ?? .5);
    el.querySelectorAll('.station-glow,.station-marker,.station-copy').forEach(node => {
      node.style.top = `${y}%`;
    });
  });

  // Three clean holds: Anmeldung, Theorie, Praxis.
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

  function stationOpacity(p, a, b) {
    const fade = .014;
    if (p < a - fade || p > b + fade) return 0;
    if (p < a) return smoothstep((p - (a - fade)) / fade);
    if (p > b) return 1 - smoothstep((p - b) / fade);
    return 1;
  }

  let target = reduced ? .5 : pageProgress();
  let current = target;
  let carHeightVh = 24;
  let raf = 0;

  function measureCar() {
    const h = car.getBoundingClientRect().height;
    if (h > 0 && innerHeight > 0) carHeightVh = (h / innerHeight) * 100;
  }

  function draw() {
    raf = 0;
    if (reduced) return;

    current += (target - current) * .115;
    if (Math.abs(target - current) < .00008) current = target;

    const t = travelled(current);
    const carY = lerp(8, 74, t);
    const roadY = -t * 165;
    const shadowY = carY + carHeightVh * .43;
    const headlightY = carY + carHeightVh * .78;

    road.style.transform = `translate3d(0, ${roadY}vh, 0)`;

    // The source top-view already points nose-down. No rotation: the Porsche
    // now drives forward in the same direction as the scroll.
    car.style.transform = `translate3d(-50%, ${carY}vh, 0)`;
    if (shadow) shadow.style.transform = `translate3d(-50%, ${shadowY}vh, 0)`;

    // The light cone starts at the nose and projects in front of the car.
    if (light) light.style.transform = `translate3d(-50%, ${headlightY}vh, 0)`;

    stations.forEach(el => {
      const [a, b] = el.dataset.range.split(',').map(Number);
      el.style.opacity = stationOpacity(current, a, b).toFixed(3);
    });

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
  addEventListener('resize', () => { measureCar(); onScroll(); }, { passive: true });
  car.addEventListener('load', () => { measureCar(); request(); }, { once: true });
  measureCar();
  request();
})();
