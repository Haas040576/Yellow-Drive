(() => {
  // Load UI refinements without touching the approved opening animation.
  if (!document.querySelector('link[href="ui-fixes.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'ui-fixes.css';
    document.head.appendChild(link);
  }

  const revealItems = [...document.querySelectorAll('.reveal')];
  if (revealItems.length) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      revealItems.forEach(el => el.classList.add('in-view'));
    } else {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
      revealItems.forEach(el => observer.observe(el));
    }
  }

  const licenses = [
    { key:'B', type:'Auto', price:'2.500–4.500 €', age:'18', ageNote:'BF17 ab 17', exam:'Theorie + Praxis', text:'Der klassische Pkw-Führerschein. Wie viele Fahrstunden du brauchst, ist individuell.', vehicle:'car' },
    { key:'BF17', type:'Begleitetes Fahren', price:'2.500–4.500 €', age:'17', ageNote:'mit Begleitperson', exam:'Theorie + Praxis', text:'Klasse B schon mit 17. Bis zum 18. Geburtstag fährst du mit einer eingetragenen Begleitperson.', vehicle:'car' },
    { key:'B197', type:'Automatik + Schaltung', price:'2.500–4.500 €', age:'18', ageNote:'BF17 möglich', exam:'Theorie + Praxis', text:'Prüfung auf Automatik, kombiniert mit vorgeschriebener Schaltkompetenz. Danach darfst du auch Schaltwagen fahren.', vehicle:'car' },
    { key:'A1', type:'Motorrad bis 125 cm³', price:'2.500–3.500 €', age:'16', ageNote:'Direkteinstieg', exam:'Theorie + Praxis', text:'Der Einstieg in die 125er-Klasse. Ideal, wenn du schon mit 16 selbstständig Motorrad fahren willst.', vehicle:'motorcycle' },
    { key:'A2', type:'Motorrad bis 35 kW', price:'2.500–3.500 €', age:'18', ageNote:'Aufstieg möglich', exam:'Theorie + Praxis', text:'Motorradklasse bis 35 kW. Später ist der vereinfachte Aufstieg auf A möglich.', vehicle:'motorcycle' },
    { key:'A', type:'Motorrad offen', price:'2.500–3.500 €', age:'24', ageNote:'oder Aufstieg', exam:'Theorie + Praxis', text:'Die offene Motorradklasse ohne Leistungsbegrenzung – direkt oder später über den Stufenaufstieg.', vehicle:'motorcycle' },
    { key:'AM', type:'Roller / Kleinkraftrad', price:'500–1.300 €', age:'15', ageNote:'Direkteinstieg', exam:'Theorie + Praxis', text:'Für Roller und Kleinkrafträder der Klasse AM. Der genaue Aufwand hängt von deiner praktischen Vorbereitung ab.', vehicle:'scooter' },
    { key:'BE', type:'Auto + Anhänger', price:'800–1.500 €', age:'mit B', ageNote:'B erforderlich', exam:'Praxis', text:'Für schwerere Anhänger. Voraussetzung ist Klasse B; Theorieprüfung ist nicht nötig.', vehicle:'trailer' },
    { key:'B96', type:'Anhänger-Erweiterung', price:'300–500 €', age:'mit B', ageNote:'B erforderlich', exam:'keine Prüfung', text:'Erweiterung von Klasse B für Gespanne bis 4,25 t. Schulung in Theorie und Praxis, aber keine eigene Prüfung.', vehicle:'trailer' },
    { key:'L', type:'Landwirtschaft', price:'auf Anfrage', age:'16', ageNote:'Direkteinstieg', exam:'Theorie', text:'Für bestimmte land- und forstwirtschaftliche Zugmaschinen. Den konkreten Preis klären wir am besten direkt.', vehicle:'tractor' }
  ];

  const vehicleSources = {
    car: 'https://raw.githubusercontent.com/playcanvas/web-components/main/examples/assets/models/porsche-911-carrera-4s.glb'
  };

  // These are the exact public Sketchfab models from the ZIP files supplied by the user.
  const sketchfabModels = {
    motorcycle: '7b3343ad0c0f4cbe94238c734e1b731a',
    scooter: '930f4ddc472640709e9b3567dccc63e0',
    trailer: 'b2dd63b6c34d4a3a934abcafa6924b98',
    tractor: '38625f3e0fd0465bb7cc99de89590071'
  };

  const title = document.getElementById('consoleTitle');
  const copy = title?.closest('.console-copy');
  const subtitle = document.getElementById('consoleSubtitle');
  const price = document.getElementById('consolePrice');
  const age = document.getElementById('consoleAge');
  const ageNote = document.getElementById('consoleAgeNote');
  const exam = document.getElementById('consoleExam');
  const description = document.getElementById('consoleDescription');
  const mail = document.getElementById('consoleMail');
  const shell = document.getElementById('consoleVehicleShell');
  const vehicle = document.getElementById('consoleVehicle');
  const placeholder = document.getElementById('vehiclePlaceholder');
  const indexEl = document.getElementById('consoleIndex');
  const progressBar = document.getElementById('consoleProgressBar');
  const carousel = document.getElementById('licenseCarousel');
  let activeIndex = 0;
  let sketchfabFrame = null;

  if (shell) {
    const badge = document.createElement('div');
    badge.className = 'console-active-mobile';
    badge.innerHTML = '<span>Aktive Klasse</span><strong id="mobileActiveClass">B</strong>';
    shell.appendChild(badge);

    sketchfabFrame = document.createElement('iframe');
    sketchfabFrame.className = 'sketchfab-vehicle';
    sketchfabFrame.title = '3D Fahrzeugansicht';
    sketchfabFrame.allow = 'autoplay; fullscreen; xr-spatial-tracking';
    sketchfabFrame.setAttribute('allowfullscreen', '');
    sketchfabFrame.setAttribute('loading', 'lazy');
    shell.appendChild(sketchfabFrame);
  }

  const mobileActive = () => document.getElementById('mobileActiveClass');

  function centerActiveChip(chip, smooth = true) {
    if (!carousel || !chip) return;
    const target = chip.offsetLeft - (carousel.clientWidth - chip.offsetWidth) / 2;
    carousel.scrollTo({ left: Math.max(0, target), behavior: smooth ? 'smooth' : 'auto' });
  }

  function sketchfabSrc(uid) {
    return `https://sketchfab.com/models/${uid}/embed?autostart=1&preload=1&ui_infos=0&ui_controls=0&ui_stop=0&ui_inspector=0&ui_watermark=0&ui_watermark_link=0&ui_help=0&ui_settings=0&ui_fullscreen=0&ui_annotations=0&transparent=1&autospin=0.08`;
  }

  function showVehicle(item) {
    const localSrc = vehicleSources[item.vehicle];
    const sketchfabUid = sketchfabModels[item.vehicle];

    if (localSrc && vehicle) {
      shell?.classList.remove('uses-sketchfab');
      vehicle.hidden = false;
      placeholder && (placeholder.hidden = true);
      sketchfabFrame?.classList.remove('is-active');
      if (vehicle.getAttribute('src') !== localSrc) vehicle.setAttribute('src', localSrc);
      vehicle.setAttribute('alt', `${item.type} – Beispiel-Fahrzeug`);
      return;
    }

    if (sketchfabUid && sketchfabFrame) {
      shell?.classList.add('uses-sketchfab');
      vehicle && (vehicle.hidden = false);
      placeholder && (placeholder.hidden = true);
      const nextSrc = sketchfabSrc(sketchfabUid);
      if (sketchfabFrame.src !== nextSrc) sketchfabFrame.src = nextSrc;
      sketchfabFrame.classList.add('is-active');
      sketchfabFrame.title = `${item.type} – 3D Fahrzeugansicht`;
      return;
    }

    shell?.classList.remove('uses-sketchfab');
    vehicle && (vehicle.hidden = true);
    sketchfabFrame?.classList.remove('is-active');
    if (placeholder) placeholder.hidden = false;
  }

  function switchLicense(nextIndex, smoothChip = true) {
    activeIndex = (nextIndex + licenses.length) % licenses.length;
    const item = licenses[activeIndex];
    shell?.classList.add('is-switching');

    setTimeout(() => {
      if (title) title.textContent = item.key;
      copy?.classList.toggle('is-long-code', item.key.length >= 4);
      if (subtitle) subtitle.textContent = item.type;
      if (price) price.textContent = item.price;
      if (age) age.textContent = item.age;
      if (ageNote) ageNote.textContent = item.ageNote;
      if (exam) exam.textContent = item.exam;
      if (description) description.textContent = item.text;
      if (mail) {
        mail.href = `mailto:stefanbartl@gmx.net?subject=${encodeURIComponent('Anfrage Führerscheinklasse ' + item.key)}`;
        mail.textContent = `Beratung zu ${item.key}`;
      }
      if (indexEl) indexEl.textContent = String(activeIndex + 1).padStart(2, '0');
      if (progressBar) progressBar.style.width = `${((activeIndex + 1) / licenses.length) * 100}%`;
      if (mobileActive()) mobileActive().textContent = item.key;

      let activeChip = null;
      document.querySelectorAll('.drive-chip').forEach((chip, i) => {
        const selected = i === activeIndex;
        chip.classList.toggle('is-active', selected);
        chip.setAttribute('aria-selected', String(selected));
        if (selected) activeChip = chip;
      });
      // Scroll only the carousel itself. Never move the document viewport horizontally.
      requestAnimationFrame(() => centerActiveChip(activeChip, smoothChip));

      showVehicle(item);
      setTimeout(() => shell?.classList.remove('is-switching'), 100);
    }, 160);
  }

  document.querySelectorAll('.drive-chip').forEach((chip, i) => chip.addEventListener('click', () => switchLicense(i)));
  document.querySelectorAll('[data-license-prev]').forEach(btn => btn.addEventListener('click', e => { e.preventDefault(); switchLicense(activeIndex - 1); }));
  document.querySelectorAll('[data-license-next]').forEach(btn => btn.addEventListener('click', e => { e.preventDefault(); switchLicense(activeIndex + 1); }));

  // Swipe the shell only when the local Porsche viewer is active. Sketchfab keeps its own 3D drag gesture.
  let touchStartX = null;
  shell?.addEventListener('touchstart', e => {
    if (sketchfabModels[licenses[activeIndex].vehicle]) return;
    touchStartX = e.touches[0]?.clientX ?? null;
  }, { passive:true });
  shell?.addEventListener('touchend', e => {
    if (touchStartX == null) return;
    const x = e.changedTouches[0]?.clientX ?? touchStartX;
    const delta = x - touchStartX;
    touchStartX = null;
    if (Math.abs(delta) > 70) switchLicense(activeIndex + (delta < 0 ? 1 : -1));
  }, { passive:true });

  const roadmap = [
    ['01 / 03','Sag uns, was du fahren willst.','Auto, Motorrad, Anhänger oder noch unsicher. Wir sortieren gemeinsam, welche Klasse wirklich zu dir passt.'],
    ['02 / 03','Wir bauen dir einen sinnvollen Weg.','Welche Unterlagen, wann Theorie, wann Praxis und wie du ohne unnötigen Leerlauf durch die Ausbildung kommst.'],
    ['03 / 03','Dann geht es wirklich los.','Kurzer Kontakt, Anmeldung klären und die nächsten Schritte festmachen. Kein komplizierter Online-Prozess nötig.']
  ];
  const roadmapStep = document.getElementById('roadmapStep');
  const roadmapTitle = document.getElementById('roadmapTitle');
  const roadmapText = document.getElementById('roadmapText');
  document.querySelectorAll('[data-roadmap]').forEach(btn => btn.addEventListener('click', () => {
    const i = Number(btn.dataset.roadmap || 0);
    document.querySelectorAll('[data-roadmap]').forEach(x => x.classList.toggle('is-active', x === btn));
    if (roadmapStep) roadmapStep.textContent = roadmap[i][0];
    if (roadmapTitle) roadmapTitle.textContent = roadmap[i][1];
    if (roadmapText) roadmapText.textContent = roadmap[i][2];
  }));

  const panel = document.getElementById('chatPanel');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const messages = document.getElementById('chatMessages');
  const chatNote = document.getElementById('chatNote');

  function openChat() { panel?.classList.add('is-open'); panel?.setAttribute('aria-hidden','false'); setTimeout(() => input?.focus(), 100); }
  function closeChat() { panel?.classList.remove('is-open'); panel?.setAttribute('aria-hidden','true'); }
  document.querySelectorAll('[data-open-chat]').forEach(btn => btn.addEventListener('click', openChat));
  document.querySelectorAll('[data-close-chat]').forEach(btn => btn.addEventListener('click', closeChat));

  function addMessage(text, who, pending = false) {
    const el = document.createElement('div');
    el.className = `chat-message ${who}${pending ? ' is-pending' : ''}`;
    el.textContent = text;
    messages?.appendChild(el);
    if (messages) messages.scrollTop = messages.scrollHeight;
    return el;
  }

  function localAnswer(raw) {
    const q = raw.toLowerCase();
    if (q.includes('b197')) return 'B197 heißt: Prüfung auf Automatik, aber mit zusätzlicher Schaltausbildung. Danach darfst du trotzdem auch Schaltwagen fahren.';
    if (q.includes('bf17')) return 'BF17 ist Klasse B ab 17. Bis 18 fährst du mit eingetragener Begleitperson.';
    if (q.includes('motorrad') || q.includes('a1') || q.includes('a2')) return 'A1 ist ab 16 für 125er, A2 ab 18 bis 35 kW und A offen direkt ab 24 oder über den Aufstieg. Sag mir dein Alter, dann grenze ich es ein.';
    if (q.includes('preis') || q.includes('kosten')) return 'Bei Klasse B ist grob oft mit etwa 2.500 bis 4.500 € zu rechnen. Andere Klassen können deutlich darunter oder ähnlich liegen. Für einen echten Yellow-Drive-Preis bitte direkt nachfragen.';
    if (q.includes('kontakt') || q.includes('telefon')) return 'Du erreichst Yellow Drive unter 08841 3840 oder mobil unter 0171 8779310.';
    return 'Ich kann dir dazu schon etwas sagen. Wenn du magst, schreib Alter, gewünschtes Fahrzeug und ob du schon einen Führerschein hast dazu – dann kann ich es besser einordnen.';
  }

  async function getSmartAnswer(question) {
    try {
      const res = await fetch('/api/chat', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ message:question, selectedLicense:licenses[activeIndex].key })
      });
      if (!res.ok) throw new Error('backend unavailable');
      const data = await res.json();
      if (!data?.answer) throw new Error('empty response');
      if (chatNote) chatNote.textContent = 'KI-Assistent aktiv. Preise und Termine bleiben unverbindlich bis zur persönlichen Bestätigung.';
      return data.answer;
    } catch {
      return localAnswer(question);
    }
  }

  async function submitQuestion(text) {
    const clean = text.trim();
    if (!clean) return;
    openChat();
    addMessage(clean,'user');
    if (input) input.value = '';
    const pending = addMessage('Einen Moment …','bot',true);
    const answer = await getSmartAnswer(clean);
    pending.classList.remove('is-pending');
    pending.textContent = answer;
    if (messages) messages.scrollTop = messages.scrollHeight;
  }

  form?.addEventListener('submit', e => { e.preventDefault(); submitQuestion(input?.value || ''); });
  document.querySelectorAll('[data-chat-question]').forEach(btn => btn.addEventListener('click', () => submitQuestion(btn.dataset.chatQuestion || '')));

  // Discreet legal credits for the user-supplied CC BY vehicle models.
  const footer = document.querySelector('footer');
  if (footer && !footer.querySelector('.vehicle-credits')) {
    const credits = document.createElement('span');
    credits.className = 'vehicle-credits';
    credits.textContent = '3D: Yamaha R1 — ejsnowy · Scooter — Sketchfab helper · Trailer — jimbogies · Tractor sgw3 — mamont nikita · CC BY 4.0';
    footer.appendChild(credits);
  }

  switchLicense(0, false);
})();