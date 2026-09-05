(() => {
  const revealItems=[...document.querySelectorAll('.reveal')];
  if('IntersectionObserver'in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    const o=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in-view');o.unobserve(e.target)}}),{threshold:.08});
    revealItems.forEach(el=>o.observe(el));
  }else revealItems.forEach(el=>el.classList.add('in-view'));

  const groups={
    auto:[
      {key:'B',type:'Auto',price:'2.500–4.500 €',age:'18',ageNote:'BF17 ab 17',exam:'Theorie + Praxis',text:'Der klassische Pkw-Führerschein. Wie viele Fahrstunden du brauchst, ist individuell.'},
      {key:'BF17',type:'Begleitetes Fahren',price:'2.500–4.500 €',age:'17',ageNote:'mit Begleitperson',exam:'Theorie + Praxis',text:'Klasse B schon mit 17. Bis zum 18. Geburtstag fährst du mit eingetragener Begleitperson.'},
      {key:'B197',type:'Automatik + Schaltung',price:'2.500–4.500 €',age:'18',ageNote:'BF17 möglich',exam:'Theorie + Praxis',text:'Prüfung auf Automatik, kombiniert mit vorgeschriebener Schaltkompetenz. Danach darfst du auch Schaltwagen fahren.'}
    ],
    motorcycle:[{key:'A1',type:'Motorrad bis 125 cm³',price:'2.500–3.500 €',age:'16',ageNote:'Direkteinstieg',exam:'Theorie + Praxis',text:'Einstieg in die 125er-Klasse.'},{key:'A2',type:'Motorrad bis 35 kW',price:'2.500–3.500 €',age:'18',ageNote:'Aufstieg möglich',exam:'Theorie + Praxis',text:'Motorradklasse bis 35 kW.'},{key:'A',type:'Motorrad offen',price:'2.500–3.500 €',age:'24',ageNote:'oder Aufstieg',exam:'Theorie + Praxis',text:'Die offene Motorradklasse ohne Leistungsbegrenzung.'}],
    scooter:[{key:'AM',type:'Roller / Kleinkraftrad',price:'500–1.300 €',age:'15',ageNote:'Direkteinstieg',exam:'Theorie + Praxis',text:'Für Roller und Kleinkrafträder der Klasse AM.'}],
    trailer:[{key:'BE',type:'Auto + Anhänger',price:'800–1.500 €',age:'mit B',ageNote:'B erforderlich',exam:'Praxis',text:'Für schwerere Anhänger.'},{key:'B96',type:'Anhänger-Erweiterung',price:'300–500 €',age:'mit B',ageNote:'B erforderlich',exam:'keine Prüfung',text:'Erweiterung für Gespanne bis 4,25 t.'}],
    tractor:[{key:'L',type:'Landwirtschaft',price:'auf Anfrage',age:'16',ageNote:'Direkteinstieg',exam:'Theorie',text:'Für bestimmte land- und forstwirtschaftliche Zugmaschinen.'}]
  };
  const vehicleArt={
    auto:'assets/vehicles/auto-studio.svg',
    motorcycle:'assets/vehicles/motorcycle-studio.svg',
    scooter:'assets/vehicles/scooter-studio.svg',
    trailer:'assets/vehicles/trailer-studio.svg',
    tractor:'assets/vehicles/tractor-studio.svg'
  };
  const order=['auto','motorcycle','scooter','trailer','tractor'];
  let family='auto',variant=0;
  const $=id=>document.getElementById(id);
  const title=$('consoleTitle'),subtitle=$('consoleSubtitle'),price=$('consolePrice'),age=$('consoleAge'),ageNote=$('consoleAgeNote'),exam=$('consoleExam'),desc=$('consoleDescription'),mail=$('consoleMail'),progress=$('consoleProgressBar'),index=$('consoleIndex'),mobile=$('activeMobileClass'),variantControls=$('variantControls'),vehicle=$('consoleVehicle'),still=$('vehicleStill'),shell=$('consoleVehicleShell');
  const allItems=()=>order.flatMap(k=>groups[k]);
  const current=()=>groups[family][variant];

  function renderVariants(){
    if(!variantControls)return;
    variantControls.innerHTML='';
    groups[family].forEach((item,i)=>{
      const b=document.createElement('button');
      b.type='button';
      b.className='variant-chip'+(i===variant?' is-active':'');
      b.textContent=item.key;
      b.setAttribute('aria-pressed',String(i===variant));
      b.onclick=()=>{variant=i;render(false)};
      variantControls.appendChild(b);
    });
  }

  function showVehicle(animate=true){
    if(!vehicle)return;
    const next=vehicleArt[family];
    const same=vehicle.dataset.family===family;
    if(still)still.hidden=true;
    vehicle.hidden=false;
    if(same)return;
    if(animate)shell?.classList.add('is-switching');
    window.setTimeout(()=>{
      vehicle.src=next;
      vehicle.alt=`${current().type} – Yellow Drive Fahrzeugdarstellung`;
      vehicle.dataset.family=family;
      vehicle.style.setProperty('--vehicle-tilt','0deg');
      window.setTimeout(()=>shell?.classList.remove('is-switching'),90);
    },animate?125:0);
  }

  function render(animateVehicle=true){
    const item=current(),gi=allItems().findIndex(x=>x.key===item.key);
    if(title)title.textContent=item.key;
    if(subtitle)subtitle.textContent=item.type;
    if(price)price.textContent=item.price;
    if(age)age.textContent=item.age;
    if(ageNote)ageNote.textContent=item.ageNote;
    if(exam)exam.textContent=item.exam;
    if(desc)desc.textContent=item.text;
    if(mobile)mobile.textContent=item.key;
    if(index)index.textContent=String(gi+1).padStart(2,'0');
    if(progress)progress.style.width=`${((gi+1)/allItems().length)*100}%`;
    if(mail){mail.href=`mailto:stefanbartl@gmx.net?subject=${encodeURIComponent('Anfrage Führerscheinklasse '+item.key)}`;mail.textContent=`Beratung zu ${item.key}`}
    title?.closest('.console-copy')?.classList.toggle('is-long-code',item.key.length>=4);
    document.querySelectorAll('.family-chip').forEach(b=>{
      const active=b.dataset.family===family;
      b.classList.toggle('is-active',active);
      b.setAttribute('aria-pressed',String(active));
    });
    renderVariants();
    showVehicle(animateVehicle);
  }

  document.querySelectorAll('.family-chip').forEach(b=>b.onclick=()=>{if(family===b.dataset.family)return;family=b.dataset.family;variant=0;render(true)});
  document.querySelectorAll('[data-license-prev]').forEach(b=>b.onclick=()=>{const i=(order.indexOf(family)-1+order.length)%order.length;family=order[i];variant=0;render(true)});
  document.querySelectorAll('[data-license-next]').forEach(b=>b.onclick=()=>{const i=(order.indexOf(family)+1)%order.length;family=order[i];variant=0;render(true)});

  if(shell&&vehicle&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    let touchActive=false,touchStartX=0;
    const setTilt=n=>vehicle.style.setProperty('--vehicle-tilt',`${Math.max(-5,Math.min(5,n)).toFixed(2)}deg`);
    shell.addEventListener('pointermove',e=>{
      if(e.pointerType==='mouse'){
        const r=shell.getBoundingClientRect();
        setTilt(((e.clientX-r.left)/r.width-.5)*9);
      }else if(touchActive){
        setTilt((e.clientX-touchStartX)/22);
      }
    },{passive:true});
    shell.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'){touchActive=true;touchStartX=e.clientX;shell.setPointerCapture?.(e.pointerId)}},{passive:true});
    const reset=e=>{if(e?.pointerType!=='mouse')touchActive=false;setTilt(0)};
    shell.addEventListener('pointerup',reset,{passive:true});
    shell.addEventListener('pointercancel',reset,{passive:true});
    shell.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')setTilt(0)},{passive:true});
  }

  const roadmap=[['01 / 03','Sag uns, was du fahren willst.','Auto, Motorrad, Anhänger oder noch unsicher. Wir sortieren gemeinsam, welche Klasse wirklich zu dir passt.'],['02 / 03','Wir bauen dir einen sinnvollen Weg.','Welche Unterlagen, wann Theorie, wann Praxis und wie du ohne unnötigen Leerlauf durch die Ausbildung kommst.'],['03 / 03','Dann geht es wirklich los.','Kurzer Kontakt, Anmeldung klären und die nächsten Schritte festmachen.']];
  document.querySelectorAll('[data-roadmap]').forEach(btn=>btn.onclick=()=>{const i=Number(btn.dataset.roadmap||0);document.querySelectorAll('[data-roadmap]').forEach(x=>x.classList.toggle('is-active',x===btn));if($('roadmapStep'))$('roadmapStep').textContent=roadmap[i][0];if($('roadmapTitle'))$('roadmapTitle').textContent=roadmap[i][1];if($('roadmapText'))$('roadmapText').textContent=roadmap[i][2]});

  const panel=$('chatPanel'),form=$('chatForm'),input=$('chatInput'),messages=$('chatMessages');
  const open=()=>{panel?.classList.add('is-open');panel?.setAttribute('aria-hidden','false')};
  const close=()=>{panel?.classList.remove('is-open');panel?.setAttribute('aria-hidden','true')};
  document.querySelectorAll('[data-open-chat]').forEach(b=>b.onclick=open);document.querySelectorAll('[data-close-chat]').forEach(b=>b.onclick=close);
  function add(text,who){const el=document.createElement('div');el.className=`chat-message ${who}`;el.textContent=text;messages?.appendChild(el);if(messages)messages.scrollTop=messages.scrollHeight}
  function fallback(q){q=q.toLowerCase();if(q.includes('b197'))return'B197 kombiniert Automatikprüfung mit zusätzlicher Schaltausbildung.';if(q.includes('bf17'))return'BF17 ist Klasse B ab 17 mit eingetragener Begleitperson.';if(q.includes('preis')||q.includes('kosten'))return'Bei Klasse B liegt die grobe Orientierung oft bei etwa 2.500 bis 4.500 €. Verbindlich ist nur die persönliche Auskunft von Yellow Drive.';return'Frag gern nach Klasse, Preis, Theorie, Praxis oder deinem Alter.'}
  form?.addEventListener('submit',e=>{e.preventDefault();const q=input?.value.trim();if(!q)return;open();add(q,'user');if(input)input.value='';add(fallback(q),'bot')});
  render(false);
})();