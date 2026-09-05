(() => {
  const consoleSection = document.getElementById('fuehrerschein');
  if (!consoleSection) return;

  let loaded = false;
  function loadViewer() {
    if (loaded) return;
    loaded = true;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';
    document.head.appendChild(script);
  }

  if (!('IntersectionObserver' in window)) loadViewer();
  else {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      loadViewer();
    }, { rootMargin: '0px', threshold: 0.05 });
    observer.observe(consoleSection);
  }

  addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
      .console-vehicle[hidden],.vehicle-still[hidden]{display:none!important;opacity:0!important}
      .console-vehicle,.vehicle-still{inset:7%!important;width:86%!important;height:86%!important;max-width:none!important;max-height:none!important;object-fit:contain!important;object-position:center!important;transform:none!important;filter:drop-shadow(0 28px 30px rgba(0,0,0,.48))!important}
      .vehicle-still{image-rendering:auto!important;backface-visibility:hidden;will-change:opacity}
      .console-vehicle-shell.is-switching .console-vehicle,.console-vehicle-shell.is-switching .vehicle-still{transform:translateY(4px) scale(.985)!important;opacity:.35!important}
      @media(max-width:900px){.console-vehicle,.vehicle-still{inset:5%!important;width:90%!important;height:90%!important}}
    `;
    document.head.appendChild(style);

    const model = document.getElementById('consoleVehicle');
    const still = document.getElementById('vehicleStill');
    const familyButtons = [...document.querySelectorAll('.family-chip')];
    const prev = [...document.querySelectorAll('[data-license-prev]')];
    const next = [...document.querySelectorAll('[data-license-next]')];
    if (!familyButtons.length) return;

    function activeFamily() {
      return document.querySelector('.family-chip.is-active')?.dataset.family || 'auto';
    }

    function syncVehicle() {
      const family = activeFamily();
      const isAuto = family === 'auto';
      if (model) {
        model.hidden = !isAuto;
        model.style.display = isAuto ? 'block' : 'none';
        model.style.visibility = isAuto ? 'visible' : 'hidden';
        model.style.opacity = isAuto ? '1' : '0';
        model.style.pointerEvents = 'none';
      }
      if (still) {
        still.hidden = isAuto;
        still.style.display = isAuto ? 'none' : 'block';
        still.style.visibility = isAuto ? 'hidden' : 'visible';
        still.style.opacity = isAuto ? '0' : '1';
      }
    }

    function moveFamily(delta) {
      const current = Math.max(0, familyButtons.findIndex(btn => btn.classList.contains('is-active')));
      const target = (current + delta + familyButtons.length) % familyButtons.length;
      familyButtons[target].click();
      requestAnimationFrame(syncVehicle);
    }

    prev.forEach(btn => btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      moveFamily(-1);
    }, { capture: true }));

    next.forEach(btn => btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      moveFamily(1);
    }, { capture: true }));

    familyButtons.forEach(btn => btn.addEventListener('click', () => requestAnimationFrame(syncVehicle)));
    new MutationObserver(syncVehicle).observe(consoleSection, { subtree: true, attributes: true, attributeFilter: ['class','hidden','src'] });
    requestAnimationFrame(syncVehicle);
  });
})();
