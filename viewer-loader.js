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

  if (!('IntersectionObserver' in window)) {
    loadViewer();
    return;
  }

  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    loadViewer();
  }, { rootMargin: '0px', threshold: 0.05 });

  observer.observe(consoleSection);
})();
