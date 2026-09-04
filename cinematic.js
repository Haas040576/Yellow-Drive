(() => {
  const root = document.documentElement;
  const stage = document.querySelector('.cinematic-stage');
  const story = document.querySelector('.scroll-story');
  const car = document.querySelector('.car');
  const road = document.querySelector('.road-space');
  const fallback = document.querySelector('.fallback-world');
  const canvas = document.querySelector('.frame-canvas');
  const ctx = canvas?.getContext('2d');
  const hero = document.querySelector('.hero-copy');
  const stations = [...document.querySelectorAll('.station')];
  const fill = document.querySelector('.progress-fill');
  const label = document.querySelector('.progress-label');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const plateau = (p, inA, inB, outA, outB) => {
    if (p < inA || p > outB) return 0;
    if (p <= inB) return smooth(range(p, inA, inB));
    if (p < outA) return 1;
    return 1 - smooth(range(p, outA, outB));
  };

  let raf = 0;
  let frameMode = false;
  let manifest = null;
  let frames = [];
  let lastFrame = -1;

  function storyProgress() {
    if (!story) return 0;
    const rect = story.getBoundingClientRect();
    const distance = Math.max(1, rect.height - innerHeight);
    return clamp(-rect.top / distance);
  }

  function setStation(el, opacity) {
    if (!el) return;
    const eased = smooth(opacity);
    el.style.opacity = eased.toFixed(3);
    el.style.transform = `translateY(-44%) translateY(${(1 - eased) * 28}px)`;
  }

  function labelFor(p) {
    if (p < .17) return 'Start';
    if (p < .36) return 'Anmeldung';
    if (p < .58) return 'Theorie';
    if (p < .80) return 'Praxis';
    return 'Ziel';
  }

  function animateFallback(p) {
    if (!fallback || !car || !road) return;

    const travel = Math.sin(p * Math.PI * 5.1) * 34 + Math.sin(p * Math.PI * 11) * 7;
    const side = p < .18 ? 0 : p < .36 ? lerp(0, -120, range(p, .18, .36)) : p < .58 ? lerp(-120, 90, range(p, .36, .58)) : p < .80 ? lerp(90, -45, range(p, .58, .80)) : lerp(-45, 0, range(p, .80, 1));
    const scale = 1 + Math.sin(p * Math.PI) * .17 + range(p, .82, 1) * .22;
    const lift = Math.sin(p * Math.PI * 2.3) * 5;
    const rot = clamp((travel / 34) * 3.8, -4, 4);

    root.style.setProperty('--car-x', `${side + travel}px`);
    root.style.setProperty('--car-y', `${lift}px`);
    root.style.setProperty('--car-r', `${rot}deg`);
    root.style.setProperty('--car-s', scale.toFixed(3));
    root.style.setProperty('--road-y', `${p * 7600}px`);
    root.style.setProperty('--speed-opacity', (0.08 + Math.abs(Math.cos(p * Math.PI * 6)) * .28).toFixed(3));

    const stop1 = plateau(p, .205, .225, .315, .335);
    const stop2 = plateau(p, .425, .445, .555, .575);
    const stop3 = plateau(p, .655, .675, .775, .795);
    const brake = Math.max(stop1, stop2, stop3);
    car.classList.toggle('braking', brake > .28);

    const warm = clamp(range(p, .62, .94));
    fallback.style.filter = `brightness(${lerp(1, .62, warm)}) saturate(${lerp(1, 1.22, warm)})`;
  }

  function animateCopy(p) {
    if (hero) {
      const visible = 1 - smooth(range(p, .055, .15));
      hero.style.opacity = visible.toFixed(3);
      hero.style.transform = `translateY(${(1 - visible) * -40}px)`;
    }

    const opacities = [
      plateau(p, .18, .21, .31, .34),
      plateau(p, .40, .43, .54, .57),
      plateau(p, .62, .65, .76, .79),
      plateau(p, .84, .87, .965, .995)
    ];
    stations.forEach((station, i) => setStation(station, opacities[i] || 0));

    if (fill) fill.style.transform = `scaleY(${p.toFixed(4)})`;
    if (label) label.textContent = labelFor(p);
  }

  function fitCanvas() {
    if (!canvas || !ctx) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.max(1, innerWidth);
    const h = Math.max(1, innerHeight);
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
  }

  function drawCover(img) {
    if (!canvas || !ctx || !img?.naturalWidth) return;
    fitCanvas();
    const cw = canvas.width;
    const ch = canvas.height;
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  function drawFrame(p) {
    if (!frameMode || !frames.length) return;
    const index = Math.min(frames.length - 1, Math.round(p * (frames.length - 1)));
    if (index === lastFrame) return;
    lastFrame = index;
    const img = frames[index];
    if (img?.complete) drawCover(img);
  }

  async function loadFrameSequence() {
    if (!canvas || !ctx) return;
    try {
      const response = await fetch('assets/cinematic/manifest.json', { cache: 'no-store' });
      if (!response.ok) return;
      manifest = await response.json();
      if (!Array.isArray(manifest.frames) || manifest.frames.length < 2) return;

      const loaded = manifest.frames.map(src => {
        const img = new Image();
        img.decoding = 'async';
        img.src = src;
        return img;
      });
      await Promise.all(loaded.slice(0, Math.min(8, loaded.length)).map(img => img.decode().catch(() => {})));
      frames = loaded;
      frameMode = true;
      canvas.classList.add('is-live');
      if (fallback) fallback.style.opacity = '0';
      drawFrame(storyProgress());
    } catch (_) {
      frameMode = false;
    }
  }

  function update() {
    raf = 0;
    const p = storyProgress();
    animateCopy(p);
    if (frameMode) drawFrame(p); else animateFallback(p);
  }

  function requestUpdate() {
    if (raf) return;
    raf = requestAnimationFrame(update);
  }

  if (!reduceMotion) {
    addEventListener('scroll', requestUpdate, { passive: true });
    addEventListener('resize', () => {
      lastFrame = -1;
      requestUpdate();
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  loadFrameSequence();
  update();
})();
