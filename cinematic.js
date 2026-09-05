import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
import { EXRLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/EXRLoader.js';

const story = document.querySelector('.scroll-story');
const canvas = document.querySelector('.frame-canvas');
const fallback = document.querySelector('.fallback-world');
const hero = document.querySelector('.hero-copy');
const stations = [...document.querySelectorAll('.station')];
const fill = document.querySelector('.progress-fill');
const label = document.querySelector('.progress-label');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const range=(p,a,b)=>clamp((p-a)/(b-a));
const plateau=(p,a,b,c,d)=>p<a||p>d?0:p<=b?smooth(range(p,a,b)):p<c?1:1-smooth(range(p,c,d));

function storyProgress(){
  const r=story.getBoundingClientRect();
  return clamp(-r.top/Math.max(1,r.height-innerHeight));
}
function setStation(el,o){
  if(!el)return; const e=smooth(o);
  el.style.opacity=e.toFixed(3);
  el.style.transform=`translateY(-44%) translateY(${(1-e)*28}px)`;
}
function animateCopy(p){
  if(hero){const v=1-smooth(range(p,.035,.105));hero.style.opacity=v.toFixed(3);hero.style.transform=`translateY(${(1-v)*-30}px)`;}
  const os=[
    plateau(p,.245,.265,.315,.335),
    plateau(p,.475,.495,.545,.565),
    plateau(p,.705,.725,.775,.795),
    plateau(p,.91,.93,.975,.995)
  ];
  stations.forEach((s,i)=>setStation(s,os[i]||0));
  if(fill)fill.style.transform=`scaleY(${p})`;
  if(label)label.textContent=p<.24?'Fahrt I':p<.34?'Anmeldung':p<.47?'Fahrt II':p<.57?'Theorie':p<.70?'Fahrt III':p<.80?'Praxis':p<.91?'Finale':'Ziel';
}

function travelProgress(p){
  const key=[
    [0,0], [.24,.28], [.34,.28], [.47,.52], [.57,.52],
    [.70,.76], [.80,.76], [.91,.94], [1,1]
  ];
  for(let i=0;i<key.length-1;i++){
    const [pa,ta]=key[i],[pb,tb]=key[i+1];
    if(p<=pb){const q=(p-pa)/(pb-pa);return lerp(ta,tb,smooth(clamp(q)));}
  }
  return 1;
}
function isHolding(p){return (p>.24&&p<.34)||(p>.47&&p<.57)||(p>.70&&p<.80);}

let renderer,scene,camera,car,roadCurve,carWheels=[],lightMaterials=[];
let carReady=false;
const clock=new THREE.Clock();
const textureLoader=new THREE.TextureLoader();
const tmpPoint=new THREE.Vector3(), tmpTangent=new THREE.Vector3(), tmpSide=new THREE.Vector3();

const URLS={
  car:'https://raw.githubusercontent.com/esc5221/drive-game/main/public/models/911.glb',
  env:'https://dl.polyhaven.org/file/ph-assets/HDRIs/exr/2k/tief_etz_2k.exr',
  asphaltDiff:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/asphalt_track/asphalt_track_diff_2k.jpg',
  asphaltNormal:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/asphalt_track/asphalt_track_nor_gl_2k.jpg',
  asphaltRough:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/asphalt_track/asphalt_track_rough_2k.jpg',
  firBark:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/fir_tree_01/fir_tree_01_bark_diff_1k.jpg',
  firTwig:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/fir_tree_01/fir_tree_01_twig_diff_1k.jpg',
  firAlpha:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/fir_tree_01/fir_tree_01_twig_alpha_1k.jpg'
};

function makeCurve(){
  const pts=[];
  for(let i=0;i<15;i++){
    const t=i/14;
    const z=75-t*360;
    const x=Math.sin(t*Math.PI*2.35)*15 + Math.sin(t*Math.PI*5.1)*4.5;
    const y=Math.sin(t*Math.PI*1.7)*1.1 + Math.sin(t*Math.PI*4.4)*.35;
    pts.push(new THREE.Vector3(x,y,z));
  }
  return new THREE.CatmullRomCurve3(pts,false,'catmullrom',.45);
}

function makeRoadMaterial(diff,norm,rough){
  [diff,norm,rough].forEach(t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1.15,58);t.anisotropy=8;});
  diff.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map:diff,normalMap:norm,roughnessMap:rough,roughness:.92,metalness:.02,color:0xffffff});
}

function buildRoad(material){
  const N=500, half=4.25, pos=[],uv=[],idx=[];
  for(let i=0;i<=N;i++){
    const t=i/N,p=roadCurve.getPointAt(t),tan=roadCurve.getTangentAt(t).normalize();
    const side=new THREE.Vector3(-tan.z,0,tan.x).normalize();
    for(const s of [-1,1]){
      const v=p.clone().addScaledVector(side,half*s);v.y+=.035;
      pos.push(v.x,v.y,v.z);uv.push(s<0?0:1,t*58);
    }
  }
  for(let i=0;i<N;i++){const a=i*2,b=a+1,c=a+2,d=a+3;idx.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const road=new THREE.Mesh(g,material);road.receiveShadow=true;scene.add(road);

  const lineMat=new THREE.MeshStandardMaterial({color:0xf2f0e9,roughness:.78});
  const yellowMat=new THREE.MeshStandardMaterial({color:0xe8ff38,roughness:.72});
  const addStrip=(offset,width,segments,dashed=false,mat=lineMat)=>{
    for(let i=0;i<segments;i++){
      if(dashed && i%2)continue;
      const a=i/segments,b=(i+1)/segments,mid=(a+b)/2;
      const p=roadCurve.getPointAt(mid),tan=roadCurve.getTangentAt(mid).normalize();
      const side=new THREE.Vector3(-tan.z,0,tan.x).normalize();
      const len=roadCurve.getLength()/segments*.94;
      const m=new THREE.Mesh(new THREE.BoxGeometry(width,.018,len),mat);
      m.position.copy(p).addScaledVector(side,offset);m.position.y+=.07;
      m.rotation.y=Math.atan2(tan.x,tan.z);m.receiveShadow=true;scene.add(m);
    }
  };
  addStrip(-3.65,.11,90,false);addStrip(3.65,.11,90,false);addStrip(0,.09,120,true);

  [.28,.52,.76].forEach(t=>{
    const p=roadCurve.getPointAt(t),tan=roadCurve.getTangentAt(t).normalize();
    const side=new THREE.Vector3(-tan.z,0,tan.x).normalize();
    const pole=new THREE.Mesh(new THREE.BoxGeometry(.12,2.4,.12),new THREE.MeshStandardMaterial({color:0x202321,roughness:.65}));
    pole.position.copy(p).addScaledVector(side,5.2);pole.position.y+=1.1;scene.add(pole);
    const sign=new THREE.Mesh(new THREE.BoxGeometry(1.3,.58,.08),yellowMat);
    sign.position.copy(p).addScaledVector(side,5.2);sign.position.y+=2.15;sign.rotation.y=Math.atan2(tan.x,tan.z);scene.add(sign);
  });
}

function buildTerrain(){
  const mat=new THREE.MeshStandardMaterial({color:0x283127,roughness:1,metalness:0});
  const g=new THREE.PlaneGeometry(900,900,1,1);const m=new THREE.Mesh(g,mat);m.rotation.x=-Math.PI/2;m.position.y=-.24;m.receiveShadow=true;scene.add(m);
  const shoulderMat=new THREE.MeshStandardMaterial({color:0x4b4a42,roughness:1});
  for(let i=0;i<170;i++){
    const t=i/169,p=roadCurve.getPointAt(t),tan=roadCurve.getTangentAt(t).normalize();
    const side=new THREE.Vector3(-tan.z,0,tan.x).normalize();
    for(const s of [-1,1]){
      const stone=new THREE.Mesh(new THREE.BoxGeometry(.45,.12,1.7),shoulderMat);
      stone.position.copy(p).addScaledVector(side,s*4.55);stone.position.y-=.02;stone.rotation.y=Math.atan2(tan.x,tan.z);scene.add(stone);
    }
  }
}

async function buildForest(){
  const [bark,twig,alpha]=await Promise.all([
    textureLoader.loadAsync(URLS.firBark),textureLoader.loadAsync(URLS.firTwig),textureLoader.loadAsync(URLS.firAlpha)
  ]);
  bark.colorSpace=twig.colorSpace=THREE.SRGBColorSpace;
  bark.wrapS=bark.wrapT=THREE.RepeatWrapping;bark.repeat.set(2,4);
  const trunkGeo=new THREE.CylinderGeometry(.22,.38,6.8,7);
  const trunkMat=new THREE.MeshStandardMaterial({map:bark,roughness:.95,color:0xc9c0a9});
  const foliageGeo=new THREE.ConeGeometry(2.7,10,9,5,true);
  const foliageMat=new THREE.MeshStandardMaterial({map:twig,alphaMap:alpha,transparent:true,alphaTest:.28,side:THREE.DoubleSide,roughness:.9,color:0x9bb095});
  const count=210;
  const trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,count);const crowns=new THREE.InstancedMesh(foliageGeo,foliageMat,count);
  trunks.castShadow=crowns.castShadow=true; crowns.receiveShadow=true;
  const dummy=new THREE.Object3D();
  for(let i=0;i<count;i++){
    const t=(i*.61803398875)%1,p=roadCurve.getPointAt(t),tan=roadCurve.getTangentAt(t).normalize();
    const side=new THREE.Vector3(-tan.z,0,tan.x).normalize();
    const sign=i%2?1:-1; const dist=9+((i*37)%23)*.72;
    const scale=.72+((i*17)%31)/65;
    const jitter=((i*43)%17)-8;
    const base=p.clone().addScaledVector(side,sign*dist).addScaledVector(tan,jitter);
    dummy.position.copy(base);dummy.position.y+=3.2*scale-.15;dummy.scale.set(scale,scale,scale);dummy.rotation.y=(i*.91)%6.28;dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
    dummy.position.copy(base);dummy.position.y+=8.1*scale-.1;dummy.scale.set(scale,scale,scale);dummy.rotation.y=(i*.91)%6.28;dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix);
  }
  scene.add(trunks,crowns);
}

async function loadEnvironment(){
  try{
    const tex=await new EXRLoader().loadAsync(URLS.env);tex.mapping=THREE.EquirectangularReflectionMapping;
    scene.background=tex;scene.environment=tex;
  }catch(e){console.warn('Tief Etz environment failed',e);scene.background=new THREE.Color(0x75806f);}
}

async function loadCar(){
  const gltf=await new GLTFLoader().loadAsync(URLS.car);car=gltf.scene;
  const box=new THREE.Box3().setFromObject(car),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const targetLength=4.55,scale=targetLength/Math.max(size.x,size.z);car.scale.setScalar(scale);
  car.position.sub(center.multiplyScalar(scale));
  car.rotation.y=Math.PI;
  car.traverse(o=>{
    if(o.isMesh){o.castShadow=true;o.receiveShadow=true;
      const n=(o.material?.name||'').toLowerCase();
      if(n.includes('paint')){o.material=o.material.clone();o.material.color.set(0x202423);o.material.metalness=.72;o.material.roughness=.2;}
      if(n.includes('light')){o.material=o.material.clone();lightMaterials.push(o.material);}
      if(/cylinder/i.test(o.name))carWheels.push(o);
    }
  });
  scene.add(car);carReady=true;
}

function setBrake(on){lightMaterials.forEach(m=>{if('emissive' in m){m.emissive.set(on?0xff1f12:0x220000);m.emissiveIntensity=on?4:.25;}});}

function updateCarAndCamera(p){
  if(!carReady)return;
  const t=travelProgress(p);roadCurve.getPointAt(t,tmpPoint);roadCurve.getTangentAt(t,tmpTangent).normalize();tmpSide.set(-tmpTangent.z,0,tmpTangent.x).normalize();
  car.position.copy(tmpPoint);car.position.y+=.54;
  car.rotation.y=Math.atan2(tmpTangent.x,tmpTangent.z)+Math.PI;
  const moving=!isHolding(p);setBrake(!moving);
  if(moving){const spin=clock.getElapsedTime()*5.2;carWheels.forEach(w=>w.rotation.x=spin);}

  let back=18,height=8,side=6,lookAhead=7;
  if(p<.14){back=lerp(42,22,range(p,0,.14));height=lerp(27,11,range(p,0,.14));side=lerp(15,7,range(p,0,.14));}
  else if(p<.24){back=19;height=8;side=lerp(7,-5,range(p,.14,.24));}
  else if(p<.34){const q=range(p,.24,.34);back=lerp(15,9,q);height=lerp(7,4.5,q);side=lerp(-6,8,q);lookAhead=1;}
  else if(p<.47){back=lerp(16,10,range(p,.34,.47));height=lerp(7,12,range(p,.34,.47));side=lerp(8,-10,range(p,.34,.47));}
  else if(p<.57){const q=range(p,.47,.57);back=lerp(13,7,q);height=6;side=lerp(-8,9,q);lookAhead=.5;}
  else if(p<.70){back=13;height=lerp(6,13,range(p,.57,.70));side=lerp(10,-12,range(p,.57,.70));}
  else if(p<.80){const q=range(p,.70,.80);back=lerp(11,6,q);height=lerp(7,4,q);side=lerp(-9,8,q);lookAhead=0;}
  else if(p<.91){back=lerp(14,27,range(p,.80,.91));height=lerp(7,17,range(p,.80,.91));side=lerp(8,2,range(p,.80,.91));}
  else {back=lerp(25,48,range(p,.91,1));height=lerp(17,32,range(p,.91,1));side=lerp(2,14,range(p,.91,1));lookAhead=10;}
  const camPos=tmpPoint.clone().addScaledVector(tmpTangent,-back).addScaledVector(tmpSide,side);camPos.y+=height;
  camera.position.lerp(camPos,.11);
  const target=tmpPoint.clone().addScaledVector(tmpTangent,lookAhead);target.y+=1.0;camera.lookAt(target);
}

async function init3D(){
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.setSize(innerWidth,innerHeight,false);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.outputColorSpace=THREE.SRGBColorSpace;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.1,900);
  roadCurve=makeCurve();
  const hemi=new THREE.HemisphereLight(0xdce7d2,0x20251f,1.15);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffd9aa,3.2);sun.position.set(-55,70,35);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-80;sun.shadow.camera.right=80;sun.shadow.camera.top=80;sun.shadow.camera.bottom=-80;scene.add(sun);
  buildTerrain();
  const [diff,norm,rough]=await Promise.all([textureLoader.loadAsync(URLS.asphaltDiff),textureLoader.loadAsync(URLS.asphaltNormal),textureLoader.loadAsync(URLS.asphaltRough)]);
  buildRoad(makeRoadMaterial(diff,norm,rough));
  await Promise.allSettled([loadEnvironment(),buildForest(),loadCar()]);
  canvas.classList.add('is-live');if(fallback)fallback.style.display='none';
  render();
}

let raf=0;
function render(){raf=0;const p=storyProgress();animateCopy(p);updateCarAndCamera(p);if(renderer)renderer.render(scene,camera);}
function requestRender(){if(!raf)raf=requestAnimationFrame(render);}
addEventListener('scroll',requestRender,{passive:true});
addEventListener('resize',()=>{if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.setSize(innerWidth,innerHeight,false);requestRender();});

document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const t=document.querySelector(a.getAttribute('href'));if(!t)return;e.preventDefault();t.scrollIntoView({behavior:reduceMotion?'auto':'smooth'});}));

animateCopy(0);
if(!reduceMotion)init3D().catch(err=>{console.error('Cinematic 3D failed',err);if(fallback)fallback.style.display='block';});
