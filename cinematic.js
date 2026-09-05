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

  // Longer drive phases and noticeably longer holds at the three stations.
  // The car physically stops while each light pool and label remains visible.
  function travelled(p) {
    if (p < .22) return lerp(0, .27, smoothstep(p / .22));
    if (p < .34) return .27;
    if (p < .48) return lerp(.27, .53, smoothstep((p - .34) / .14));
    if (p < .60) return .53;
    if (p < .74) return lerp(.53, .78, smoothstep((p - .60) / .14));
    if (p < .86) return .78;
    return lerp(.78, 1, smoothstep((p - .86) / .14));
  }

  function pageProgress() {
    const rect = drive.getBoundingClientRect();
    return clamp(-rect.top / Math.max(1, rect.height - innerHeight));
  }

  function stationOpacity(p, a, b) {
    const fade = .022;
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

    current += (target - current) * .105;
    if (Math.abs(target - current) < .00008) current = target;

    const t = travelled(current);
    const carY = lerp(8, 74, t);
    const roadY = -t * 190;
    const shadowY = carY + carHeightVh * .43;
    const headlightY = carY + carHeightVh * .78;

    road.style.transform = `translate3d(0, ${roadY}vh, 0)`;
    car.style.transform = `translate3d(-50%, ${carY}vh, 0)`;
    if (shadow) shadow.style.transform = `translate3d(-50%, ${shadowY}vh, 0)`;
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
