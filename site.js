(() => {
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

  const licenses = {
    B: { type:'Auto', price:'ca. 2.500–4.500 €', age:'18 / BF17 ab 17', exam:'Theorie + Praxis', text:'Der klassische Pkw-Führerschein. Die tatsächlichen Kosten hängen vor allem davon ab, wie viele Übungsstunden du brauchst.' },
    BF17: { type:'Begleitetes Fahren', price:'ca. 2.500–4.500 €', age:'ab 17', exam:'Theorie + Praxis', text:'Klasse B schon mit 17. Bis zum 18. Geburtstag fährst du mit eingetragener Begleitperson.' },
    B197: { type:'Auto · Automatik + Schaltung', price:'ca. 2.500–4.500 €', age:'18 / BF17 möglich', exam:'Theorie + Praxis', text:'Praktische Prüfung auf Automatik, kombiniert mit vorgeschriebener Schaltkompetenz. Danach darfst du auch Schaltwagen fahren.' },
    A1: { type:'Motorrad bis 125 cm³', price:'ca. 2.500–3.500 €', age:'ab 16', exam:'Theorie + Praxis', text:'Der Einstieg in die 125er-Klasse. Ideal, wenn du schon mit 16 selbstständig Motorrad fahren willst.' },
    A2: { type:'Motorrad bis 35 kW', price:'ca. 2.500–3.500 €', age:'ab 18', exam:'Theorie + Praxis', text:'Motorradklasse bis 35 kW. Später ist der vereinfachte Aufstieg auf A möglich.' },
    A: { type:'Motorrad offen', price:'ca. 2.500–3.500 €', age:'direkt ab 24', exam:'Theorie + Praxis', text:'Die offene Motorradklasse ohne Leistungsbegrenzung. Auch über den stufenweisen Aufstieg von A2 erreichbar.' },
    AM: { type:'Roller / Kleinkraftrad', price:'ca. 500–1.300 €', age:'ab 15', exam:'Theorie + Praxis', text:'Für Roller und Kleinkrafträder der Klasse AM. Der genaue Aufwand hängt stark von deiner praktischen Vorbereitung ab.' },
    BE: { type:'Anhänger', price:'ca. 800–1.500 €', age:'mit Klasse B', exam:'Praxis', text:'Für schwerere Anhänger. Voraussetzung ist Klasse B; Theorieprüfung ist nicht nötig, dafür praktische Ausbildung und Prüfung.' },
    B96: { type:'Anhänger-Erweiterung', price:'ca. 300–500 €', age:'mit Klasse B', exam:'keine Prüfung', text:'Erweiterung von Klasse B für schwerere Gespanne bis 4,25 t. Schulung in Theorie und Praxis, aber keine eigene Prüfung.' },
    L: { type:'Landwirtschaft', price:'Preis auf Anfrage', age:'ab 16', exam:'Theorie', text:'Für bestimmte land- und forstwirtschaftliche Zugmaschinen. Den konkreten Preis klären wir am besten direkt mit dir.' }
  };

  const code = document.getElementById('licenseCode');
  const type = document.getElementById('licenseType');
  const price = document.getElementById('licensePrice');
  const desc = document.getElementById('licenseDescription');
  const age = document.getElementById('licenseAge');
  const exam = document.getElementById('licenseExam');
  const mail = document.getElementById('licenseMail');

  document.querySelectorAll('.license-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const key = tab.dataset.license;
      const item = licenses[key];
      if (!item) return;
      document.querySelectorAll('.license-tab').forEach(x => x.classList.toggle('is-active', x === tab));
      code.textContent = key;
      type.textContent = item.type;
      price.textContent = item.price;
      desc.textContent = item.text;
      age.textContent = item.age;
      exam.textContent = item.exam;
      mail.href = `mailto:stefanbartl@gmx.net?subject=${encodeURIComponent('Anfrage Führerscheinklasse ' + key)}`;
    });
  });

  const panel = document.getElementById('chatPanel');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const messages = document.getElementById('chatMessages');

  function openChat() {
    if (!panel) return;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    setTimeout(() => input?.focus(), 120);
  }
  function closeChat() {
    panel?.classList.remove('is-open');
    panel?.setAttribute('aria-hidden', 'true');
  }
  document.querySelectorAll('[data-open-chat]').forEach(btn => btn.addEventListener('click', openChat));
  document.querySelectorAll('[data-close-chat]').forEach(btn => btn.addEventListener('click', closeChat));

  function addMessage(text, who) {
    const el = document.createElement('div');
    el.className = `chat-message ${who}`;
    el.textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  function answerQuestion(raw) {
    const q = raw.toLowerCase();
    if (q.includes('b197')) return 'B197 ist entspannt gesagt: Du kannst die praktische Prüfung auf Automatik machen, lernst aber zusätzlich Schalten. Wenn die vorgeschriebene Schaltkompetenz bestätigt ist, darfst du danach auch Schaltwagen fahren.';
    if (q.includes('bf17') || q.includes('begleitet')) return 'BF17 ist Klasse B ab 17. Bis du 18 bist, fährst du mit einer eingetragenen Begleitperson. Danach geht es ganz normal allein weiter.';
    if ((q.includes('kosten') || q.includes('preis')) && q.includes('b96')) return 'Für B96 kannst du grob mit 300 bis 500 € rechnen. Das ist nur eine Orientierung; den Yellow-Drive-Preis klärst du am besten direkt.';
    if ((q.includes('kosten') || q.includes('preis')) && (q.includes('klasse b') || q.includes('auto'))) return 'Für Klasse B liegt die grobe Orientierung aktuell oft bei etwa 2.500 bis 4.500 €. Entscheidend ist vor allem, wie viele normale Fahrstunden du brauchst.';
    if ((q.includes('kosten') || q.includes('preis')) && q.includes('am')) return 'AM liegt grob oft zwischen 500 und 1.300 €. Der genaue Preis hängt von Fahrschule und benötigten Praxisstunden ab.';
    if (q.includes('motorrad') || q.includes('a1') || q.includes('a2') || q === 'a') return 'Kurz sortiert: A1 ab 16 für 125er, A2 ab 18 bis 35 kW, A offen direkt ab 24 oder später über den Stufenaufstieg. Wenn du mir dein Alter sagst, kann ich es noch genauer einordnen.';
    if (q.includes('anhänger') || q.includes('be')) return 'Für Anhänger gibt es meist zwei Wege: B96 ohne Prüfung für Gespanne bis 4,25 t oder BE mit praktischer Prüfung für deutlich schwerere Anhänger. Wenn du weißt, was du ziehen willst, lässt sich das schnell eingrenzen.';
    if (q.includes('theorie')) return 'Die Theorie kommt nach der Anmeldung und läuft parallel zur Vorbereitung auf die Praxis. Ziel ist nicht nur Fragen auswendig zu lernen, sondern die Regeln wirklich zu verstehen.';
    if (q.includes('praxis') || q.includes('fahrstunde')) return 'Bei der Praxis geht es Schritt für Schritt von den Basics bis zu Überland, Autobahn und Nachtfahrt. Wie viele normale Übungsstunden du brauchst, ist individuell.';
    if (q.includes('anmeld') || q.includes('unterlagen')) return 'Für die Anmeldung klärt ihr Führerscheinklasse und Ablauf. Für den Antrag brauchst du typischerweise unter anderem Sehtest, Erste-Hilfe-Nachweis und biometrisches Foto.';
    if (q.includes('telefon') || q.includes('kontakt') || q.includes('termin')) return 'Am schnellsten erreichst du Yellow Drive unter 08841 3840 oder mobil unter 0171 8779310. Per Mail geht es an stefanbartl@gmx.net.';
    if (q.includes('wo') || q.includes('adresse') || q.includes('murnau')) return 'Yellow Drive ist in der Reschstrasse 2 in 82418 Murnau.';
    if (q.includes('unsicher') || q.includes('welche klasse') || q.includes('was passt')) return 'Kein Stress. Sag mir einfach dein Alter und was du fahren willst – Auto, Motorrad, Anhänger oder Landwirtschaft – dann grenze ich die passende Klasse ein.';
    return 'Kann ich einordnen. Schreib mir am besten kurz dazu, ob es um Auto, Motorrad, Anhänger, Kosten oder den Ablauf geht – dann antworte ich konkreter.';
  }

  function submitQuestion(text) {
    const clean = text.trim();
    if (!clean) return;
    openChat();
    addMessage(clean, 'user');
    input.value = '';
    setTimeout(() => addMessage(answerQuestion(clean), 'bot'), 180);
  }

  form?.addEventListener('submit', e => { e.preventDefault(); submitQuestion(input.value); });
  document.querySelectorAll('[data-chat-question]').forEach(btn => btn.addEventListener('click', () => submitQuestion(btn.dataset.chatQuestion)));
})();
