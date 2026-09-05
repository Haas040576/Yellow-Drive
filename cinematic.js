(() => {
  const film = document.querySelector('.film');
  const canvas = document.querySelector('#filmCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const overlays = [...document.querySelectorAll('.overlay-copy')];
  const progressEl = document.querySelector('#filmProgress');
  const currentEl = document.querySelector('#chapterCurrent');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FRAME_W = 1280;
  const FRAME_H = 720;
  const COLS = 4;
  const ROWS = 4;
  const PER_SHEET = COLS * ROWS;
  const FRAME_COUNT = 84;
  const SHEET_COUNT = Math.ceil(FRAME_COUNT / PER_SHEET);
  const sheets = [];
  let readyCount = 0;
  let raf = 0;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const range = (p, a, b) => clamp((p - a) / (b - a));

  function pageProgress() {
    const r = film.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - innerHeight));
  }

  function fit() {
    const dpr = Math.min(devicePixelRatio || 1, 1.45);
    const w = Math.round(innerWidth * dpr);
    const h = Math.round(innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = innerWidth + 'px';
      canvas.style.height = innerHeight + 'px';
    }
  }

  function loadSheets() {
    for (let i = 0; i < SHEET_COUNT; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = `assets/cinematic/cinematic-${i}.webp`;
      img.addEventListener('load', () => {
        readyCount++;
        request();
      });
      sheets.push(img);
    }
  }

  // Long driving sections with short, intentional holds. During a hold the
  // exact rendered frame stays frozen while the editorial text appears.
  function frameForProgress(p) {
    if (p < .22) return lerp(0, 20, smooth(range(p, 0, .22)));
    if (p < .29) return 20;
    if (p < .48) return lerp(20, 42, smooth(range(p, .29, .48)));
    if (p < .55) return 42;
    if (p < .74) return lerp(42, 64, smooth(range(p, .55, .74)));
    if (p < .81) return 64;
    if (p < .93) return lerp(64, 83, smooth(range(p, .81, .93)));
    return 83;
  }

  function chapterForProgress(p) {
    if (p < .22) return '00';
    if (p < .48) return '01';
    if (p < .74) return '02';
    if (p < .93) return '03';
    return '04';
  }

  function drawFrame(frameIndex, alpha = 1) {
    const idx = clamp(frameIndex, 0, FRAME_COUNT - 1);
    const sheetIndex = Math.floor(idx / PER_SHEET);
    const local = idx % PER_SHEET;
    const col = local % COLS;
    const row = Math.floor(local / COLS);
    const img = sheets[sheetIndex];
    if (!img || !img.complete || !img.naturalWidth) return false;

    const cw = canvas.width;
    const ch = canvas.height;
    const scale = Math.max(cw / FRAME_W, ch / FRAME_H);
    const dw = FRAME_W * scale;
    const dh = FRAME_H * scale;
    const dx = (cw - dw) * .5;
    const dy = (ch - dh) * .5;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      img,
      col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H,
      dx, dy, dw, dh
    );
    ctx.restore();
    return true;
  }

  function drawScene(p) {
    fit();
    const cw = canvas.width;
    const ch = canvas.height;
    ctx.fillStyle = '#10110f';
    ctx.fillRect(0, 0, cw, ch);

    if (!readyCount) return;

    const f = frameForProgress(p);
    const a = Math.floor(f);
    const b = Math.min(FRAME_COUNT - 1, a + 1);
    const t = f - a;

    // Crossfade adjacent rendered frames so slow scrolling stays cinematic
    // instead of visibly stepping between stills.
    drawFrame(a, 1);
    if (b !== a && t > .001) drawFrame(b, t);
  }

  function overlayOpacity(p, a, b) {
    const fade = Math.min(.016, (b - a) * .23);
    if (p < a - fade || p > b + fade) return 0;
    if (p < a) return smooth((p - (a - fade)) / fade);
    if (p > b) return 1 - smooth((p - b) / fade);
    return 1;
  }

  function update() {
    raf = 0;
    const p = reduced ? 0 : pageProgress();
    drawScene(p);

    overlays.forEach(el => {
      const [a, b] = el.dataset.range.split(',').map(Number);
      const o = overlayOpacity(p, a, b);
      el.style.opacity = o.toFixed(3);
      const base = el.classList.contains('station-copy') ? 'translateY(-44%) ' : '';
      el.style.transform = `${base}translateY(${(1 - o) * 20}px)`;
    });

    if (progressEl) progressEl.style.transform = `scaleX(${p})`;
    if (currentEl) currentEl.textContent = chapterForProgress(p);
  }

  function request() {
    if (!raf) raf = requestAnimationFrame(update);
  }

  loadSheets();
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request, { passive: true });
  update();
})();
