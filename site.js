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
    B:{type:'Auto',price:'2.500–4.500 €',age:'18',ageNote:'BF17 ab 17',exam:'Theorie + Praxis',text:'Der klassische Pkw-Führerschein. Wie viele Fahrstunden du brauchst, ist individuell.'},
    BF17:{type:'Begleitetes Fahren',price:'2.500–4.500 €',age:'17',ageNote:'mit Begleitperson',exam:'Theorie + Praxis',text:'Klasse B schon mit 17. Bis 18 fährst du mit eingetragener Begleitperson.'},
    B197:{type:'Automatik + Schaltung',price:'2.500–4.500 €',age:'18',ageNote:'BF17 möglich',exam:'Theorie + Praxis',text:'Prüfung auf Automatik plus vorgeschriebene Schaltkompetenz. Danach darfst du auch Schaltwagen fahren.'},
    A1:{type:'Motorrad 125',price:'2.500–3.500 €',age:'16',ageNote:'125 cm³',exam:'Theorie + Praxis',text:'Der Einstieg in die 125er-Klasse für alle, die früh selbstständig Motorrad fahren möchten.'},
    A2:{type:'Motorrad 35 kW',price:'2.500–3.500 €',age:'18',ageNote:'bis 35 kW',exam:'Theorie + Praxis',text:'Die mittlere Motorradklasse. Später kannst du vereinfacht auf die offene Klasse A aufsteigen.'},
    A:{type:'Motorrad offen',price:'2.500–3.500 €',age:'24',ageNote:'direkter Einstieg',exam:'Theorie + Praxis',text:'Die offene Motorradklasse ohne Leistungsbegrenzung. Alternativ über den Stufenaufstieg von A2.'},
    AM:{type:'Roller / Kleinkraftrad',price:'500–1.300 €',age:'15',ageNote:'Klasse AM',exam:'Theorie + Praxis',text:'Für Roller und Kleinkrafträder. Der tatsächliche Aufwand hängt von deiner Vorbereitung ab.'},
    BE:{type:'Anhänger',price:'800–1.500 €',age:'mit B',ageNote:'Vorbesitz B',exam:'Praxis',text:'Für schwerere Anhänger. Keine eigene Theorieprüfung, dafür praktische Ausbildung und Prüfung.'},
    B96:{type:'Anhänger-Erweiterung',price:'300–500 €',age:'mit B',ageNote:'Vorbesitz B',exam:'keine Prüfung',text:'Erweiterung für Gespanne bis 4,25 t. Schulung in Theorie und Praxis, aber ohne eigene Prüfung.'},
    L:{type:'Landwirtschaft',price:'auf Anfrage',age:'16',ageNote:'Landwirtschaft',exam:'Theorie',text:'Für bestimmte land- und forstwirtschaftliche Zugmaschinen. Preis und Ablauf klären wir direkt.'}
  };

  const chips = [...document.querySelectorAll('.drive-chip')];
  const carousel = document.getElementById('licenseCarousel');
  const title = document.getElementById('consoleTitle');
  const subtitle = document.getElementById('consoleSubtitle');
  const price = document.getElementById('consolePrice');
  const age = document.getElementById('consoleAge');
  const ageNote = document.getElementById('consoleAgeNote');
  const exam = document.getElementById('consoleExam');
  const description = document.getElementById('consoleDescription');
  const mail = document.getElementById('consoleMail');
  const carWrap = document.getElementById('consoleCarWrap');
  let activeIndex = Math.max(0, chips.findIndex(x => x.classList.contains('is-active')));

  function selectLicense(index) {
    if (!chips.length) return;
    activeIndex = (index + chips.length) % chips.length;
    const chip = chips[activeIndex];
    const key = chip.dataset.license;
    const item = licenses[key];
    if (!item) return;
    chips.forEach((x,i) => x.classList.toggle('is-active', i === activeIndex));
    carWrap?.classList.add('is-switching');
    setTimeout(() => carWrap?.classList.remove('is-switching'), 240);
    title.textContent = key;
    subtitle.textContent = item.type;
    price.textContent = item.price;
    age.textContent = item.age;
    ageNote.textContent = item.ageNote;
    exam.textContent = item.exam;
    description.textContent = item.text;
    mail.href = `mailto:stefanbartl@gmx.net?subject=${encodeURIComponent('Anfrage Führerscheinklasse ' + key)}`;
    chip.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
  }
  chips.forEach((chip,i) => chip.addEventListener('click', () => selectLicense(i)));
  document.querySelector('[data-license-prev]')?.addEventListener('click', () => selectLicense(activeIndex - 1));
  document.querySelector('[data-license-next]')?.addEventListener('click', () => selectLicense(activeIndex + 1));

  const roadmap = [
    {title:'Sag uns, was du fahren willst.',text:'Auto, Motorrad, Anhänger oder noch unsicher. Wir sortieren gemeinsam, welche Klasse wirklich zu dir passt.'},
    {title:'Wir klären den sinnvollsten Weg.',text:'Alter, Vorbesitz, B197, BF17, Aufstieg oder Anhänger-Erweiterung – kurz persönlich klären statt lange suchen.'},
    {title:'Dann wird daraus dein Start.',text:'Anmeldung, Unterlagen, Theorie und erste Fahrstunden. Klar geplant und ohne unnötigen Umweg.'}
  ];
  const roadmapButtons = [...document.querySelectorAll('[data-roadmap]')];
  const roadmapStep = document.getElementById('roadmapStep');
  const roadmapTitle = document.getElementById('roadmapTitle');
  const roadmapText = document.getElementById('roadmapText');
  roadmapButtons.forEach((btn,i) => btn.addEventListener('click', () => {
    roadmapButtons.forEach((x,j) => x.classList.toggle('is-active', i === j));
    roadmapStep.textContent = `0${i+1} / 03`;
    roadmapTitle.textContent = roadmap[i].title;
    roadmapText.textContent = roadmap[i].text;
  }));

  const panel = document.getElementById('chatPanel');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const messages = document.getElementById('chatMessages');
  function openChat(){if(!panel)return;panel.classList.add('is-open');panel.setAttribute('aria-hidden','false');setTimeout(()=>input?.focus(),120)}
  function closeChat(){panel?.classList.remove('is-open');panel?.setAttribute('aria-hidden','true')}
  document.querySelectorAll('[data-open-chat]').forEach(btn=>btn.addEventListener('click',openChat));
  document.querySelectorAll('[data-close-chat]').forEach(btn=>btn.addEventListener('click',closeChat));
  function addMessage(text,who){const el=document.createElement('div');el.className=`chat-message ${who}`;el.textContent=text;messages.appendChild(el);messages.scrollTop=messages.scrollHeight}
  function answerQuestion(raw){
    const q=raw.toLowerCase();
    if(q.includes('b197'))return 'B197 ist die entspannte Kombi aus Automatikprüfung und zusätzlichem Schalttraining. Danach darfst du trotzdem Schaltwagen fahren.';
    if(q.includes('bf17')||q.includes('begleitet'))return 'BF17 ist Klasse B ab 17. Bis 18 fährst du mit eingetragener Begleitperson, danach ganz normal allein.';
    if((q.includes('kosten')||q.includes('preis'))&&q.includes('b96'))return 'B96 liegt grob oft bei 300 bis 500 €. Das ist nur eine Orientierung – den konkreten Yellow-Drive-Preis bitte direkt klären.';
    if((q.includes('kosten')||q.includes('preis'))&&(q.includes('klasse b')||q.includes('auto')))return 'Für Klasse B kannst du grob mit 2.500 bis 4.500 € rechnen. Wie viele normale Fahrstunden du brauchst, macht dabei viel aus.';
    if(q.includes('motorrad')||q.includes('a1')||q.includes('a2'))return 'Kurz: A1 ab 16 für 125er, A2 ab 18 bis 35 kW, A offen direkt ab 24 oder später über den Aufstieg.';
    if(q.includes('anhänger')||q.includes('be'))return 'B96 ist die kompakte Erweiterung ohne Prüfung bis 4,25 t Gespann. BE ist für schwerere Anhänger und hat eine praktische Prüfung.';
    if(q.includes('anmeld')||q.includes('unterlagen'))return 'Für den Antrag brauchst du typischerweise unter anderem Sehtest, Erste-Hilfe-Nachweis und biometrisches Foto. Den genauen Ablauf klärt Yellow Drive mit dir.';
    if(q.includes('kontakt')||q.includes('termin')||q.includes('telefon'))return 'Du erreichst Yellow Drive unter 08841 3840 oder mobil unter 0171 8779310. Mail: stefanbartl@gmx.net.';
    if(q.includes('adresse')||q.includes('wo'))return 'Yellow Drive ist in der Reschstrasse 2 in 82418 Murnau.';
    return 'Klar. Sag mir einfach kurz, ob es um Klasse, Preis, Theorie, Praxis oder Anmeldung geht – dann antworte ich dir konkret.';
  }
  function submitQuestion(text){const clean=text.trim();if(!clean)return;openChat();addMessage(clean,'user');input.value='';setTimeout(()=>addMessage(answerQuestion(clean),'bot'),170)}
  form?.addEventListener('submit',e=>{e.preventDefault();submitQuestion(input.value)});
  document.querySelectorAll('[data-chat-question]').forEach(btn=>btn.addEventListener('click',()=>submitQuestion(btn.dataset.chatQuestion)));
})();
