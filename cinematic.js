(() => {
  const film=document.querySelector('.film');
  const canvas=document.querySelector('#filmCanvas');
  const ctx=canvas.getContext('2d',{alpha:false});
  const overlays=[...document.querySelectorAll('.overlay-copy')];
  const progressEl=document.querySelector('#filmProgress');
  const currentEl=document.querySelector('#chapterCurrent');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const road=new Image(),car=new Image(),fir=new Image();
  road.decoding=car.decoding=fir.decoding='async';
  road.src='assets/cinematic/roads-sprite-hq.webp';
  car.src='assets/cinematic/porsche-sprite-hq.webp';
  fir.src='assets/cinematic/fir-foreground.webp';
  const ROAD_W=1280,ROAD_H=720,CAR_W=420,CAR_H=300;
  let raf=0;
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
  const lerp=(a,b,t)=>a+(b-a)*t;
  const range=(p,a,b)=>clamp((p-a)/(b-a));
  const pageProgress=()=>{const r=film.getBoundingClientRect();return clamp(-r.top/Math.max(1,r.height-innerHeight))};
  const fit=()=>{const dpr=Math.min(devicePixelRatio||1,1.6),w=Math.round(innerWidth*dpr),h=Math.round(innerHeight*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px'}};

  function phase(p){
    if(p<.235)return{kind:'drive',q:range(p,0,.235),a:0,b:1,chapter:0};
    if(p<.305)return{kind:'stop',q:range(p,.235,.305),a:1,b:1,chapter:1};
    if(p<.49)return{kind:'drive',q:range(p,.305,.49),a:1,b:2,chapter:1};
    if(p<.56)return{kind:'stop',q:range(p,.49,.56),a:2,b:2,chapter:2};
    if(p<.745)return{kind:'drive',q:range(p,.56,.745),a:2,b:3,chapter:2};
    if(p<.815)return{kind:'stop',q:range(p,.745,.815),a:3,b:3,chapter:3};
    if(p<.93)return{kind:'drive',q:range(p,.815,.93),a:3,b:3,chapter:3};
    return{kind:'stop',q:range(p,.93,1),a:3,b:3,chapter:4};
  }
  function drawRoadFrame(idx,alpha,zoom,panX,panY,rot){
    if(!road.complete||!road.naturalWidth)return;
    const cw=canvas.width,ch=canvas.height,base=Math.max(cw/ROAD_W,ch/ROAD_H);
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(cw/2+panX*cw,ch/2+panY*ch);ctx.rotate(rot);ctx.scale(base*zoom,base*zoom);
    ctx.drawImage(road,idx*ROAD_W,0,ROAD_W,ROAD_H,-ROAD_W/2,-ROAD_H/2,ROAD_W,ROAD_H);ctx.restore();
  }
  function drawCarFrame(idx,alpha,x,y,w,tilt){
    if(!car.complete||!car.naturalWidth)return;
    const h=w*(CAR_H/CAR_W);ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(tilt);
    ctx.drawImage(car,idx*CAR_W,0,CAR_W,CAR_H,-w/2,-h*.72,w,h);ctx.restore();
  }
  function carState(p,ph){
    const q=smooth(ph.q); let scale=.8,side=0,view=2,tilt=0;
    if(p<.235){scale=lerp(.48,.96,q);side=lerp(-.06,.02,q);view=lerp(.2,2.8,q);tilt=lerp(-.012,.008,q)}
    else if(p<.305){scale=1.02;side=lerp(.02,-.025,q);view=lerp(2.8,1.8,q);tilt=.004}
    else if(p<.49){scale=lerp(.70,1.04,q);side=lerp(-.03,.045,q);view=lerp(1.5,3.9,q);tilt=lerp(.01,-.012,q)}
    else if(p<.56){scale=1.08;side=lerp(.04,-.03,q);view=lerp(3.8,2.4,q);tilt=-.004}
    else if(p<.745){scale=lerp(.72,1.08,q);side=lerp(-.04,.035,q);view=lerp(1.2,4,q);tilt=lerp(-.01,.012,q)}
    else if(p<.815){scale=1.12;side=lerp(.035,-.02,q);view=lerp(4,2.6,q);tilt=.003}
    else if(p<.93){scale=lerp(1.0,.52,q);side=lerp(-.02,.01,q);view=lerp(2.4,2,q);tilt=0}
    else{scale=.50;side=.01;view=2;tilt=0}
    return{scale,side,view,tilt};
  }
  function drawFir(p,ph){
    if(!fir.complete||!fir.naturalWidth||ph.kind==='stop')return;
    const cw=canvas.width,ch=canvas.height,size=Math.max(cw,ch)*.72;
    ctx.save();ctx.globalAlpha=.075;ctx.filter='blur(2.5px)';ctx.translate(-size*.22+Math.sin(p*16)*14*devicePixelRatio,-size*.24);ctx.rotate(-.16);ctx.drawImage(fir,0,0,size,size);ctx.restore();ctx.filter='none';
    if(p>.56){ctx.save();ctx.globalAlpha=.045;ctx.filter='blur(3px)';ctx.translate(cw-size*.72+Math.cos(p*13)*12*devicePixelRatio,-size*.17);ctx.scale(-1,1);ctx.drawImage(fir,0,0,size,size);ctx.restore();ctx.filter='none'}
  }
  function drawScene(p){
    fit();const cw=canvas.width,ch=canvas.height,ph=phase(p),q=smooth(ph.q);
    ctx.fillStyle='#11120f';ctx.fillRect(0,0,cw,ch);
    let zoom=1.03,px=0,py=0,rot=0;
    if(ph.kind==='drive'){zoom=lerp(1.02,1.16,q);px=lerp(-.018,.018,q)*(ph.a%2? -1:1);py=lerp(.012,-.018,q);rot=lerp(-.004,.004,q)}
    else{zoom=1.13+Math.sin(q*Math.PI)*.025;px=lerp(-.012,.012,q);py=-.01;rot=lerp(-.003,.003,q)}
    if(ph.a===ph.b)drawRoadFrame(ph.a,1,zoom,px,py,rot);else{drawRoadFrame(ph.a,1-q,zoom,px,py,rot);drawRoadFrame(ph.b,q,zoom,px,py,rot)}
    drawFir(p,ph);
    const cs=carState(p,ph),vf=Math.floor(cs.view),vc=Math.min(4,vf+1),vt=cs.view-vf;
    const carW=Math.min(cw*.34,ch*.61)*cs.scale;
    const cx=cw*(.5+cs.side),cy=ch*.76;
    ctx.save();ctx.globalAlpha=.28;ctx.fillStyle='#000';ctx.filter='blur(11px)';ctx.beginPath();ctx.ellipse(cx,cy+carW*.055,carW*.35,carW*.075,0,0,Math.PI*2);ctx.fill();ctx.restore();ctx.filter='none';
    drawCarFrame(vf,1-vt,cx,cy,carW,cs.tilt);if(vc!==vf)drawCarFrame(vc,vt,cx,cy,carW,cs.tilt);
  }
  function overlayOpacity(p,a,b){const pad=Math.min(.02,(b-a)*.23);if(p<a-pad||p>b+pad)return 0;if(p<a)return smooth((p-(a-pad))/pad);if(p>b)return 1-smooth((p-b)/pad);return 1}
  function update(){raf=0;const p=reduced?0:pageProgress();drawScene(p);overlays.forEach(el=>{const[a,b]=el.dataset.range.split(',').map(Number),o=overlayOpacity(p,a,b);el.style.opacity=o.toFixed(3);el.style.transform=`${el.classList.contains('station-copy')?'translateY(-44%) ':''}translateY(${(1-o)*22}px)`});progressEl.style.transform=`scaleX(${p})`;currentEl.textContent=p<.235?'00':p<.49?'01':p<.745?'02':p<.93?'03':'04'}
  const request=()=>{if(!raf)raf=requestAnimationFrame(update)};
  [road,car,fir].forEach(img=>img.addEventListener('load',request));
  addEventListener('scroll',request,{passive:true});addEventListener('resize',request,{passive:true});update();
})();
