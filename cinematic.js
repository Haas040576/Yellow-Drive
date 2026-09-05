import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const root = document.documentElement;
const story = document.querySelector('.scroll-story');
const stage = document.querySelector('.cinematic-stage');
const canvas = document.querySelector('.frame-canvas');
const fallback = document.querySelector('.fallback-world');
const fallbackCar = document.querySelector('.car');
const fallbackRoad = document.querySelector('.road-space');
const hero = document.querySelector('.hero-copy');
const stations = [...document.querySelectorAll('.station')];
const fill = document.querySelector('.progress-fill');
const label = document.querySelector('.progress-label');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const YELLOW = 0xe8ff38;
const CAR_URL = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/GLB/CarConcept.glb';
const HDR_URL = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/sunset_forest_2k.hdr';
const ASPHALT = {
  color: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/asphalt_track/asphalt_track_diff_2k.jpg',
  normal: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/asphalt_track/asphalt_track_nor_gl_2k.jpg',
  rough: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/asphalt_track/asphalt_track_rough_2k.jpg'
};
const GRASS = {
  color: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/grass_path_3/grass_path_3_diff_2k.jpg',
  normal: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/grass_path_3/grass_path_3_nor_gl_2k.jpg',
  rough: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/grass_path_3/grass_path_3_rough_2k.jpg'
};

const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const range = (p, a, b) => clamp((p - a) / (b - a));
const plateau = (p, a, b, c, d) => {
  if (p < a || p > d) return 0;
  if (p <= b) return smooth(range(p, a, b));
  if (p < c) return 1;
  return 1 - smooth(range(p, c, d));
};

function storyProgress() {
  if (!story) return 0;
  const rect = story.getBoundingClientRect();
  return clamp(-rect.top / Math.max(1, rect.height - innerHeight));
}

function setStation(el, opacity) {
  if (!el) return;
  const eased = smooth(opacity);
  el.style.opacity = eased.toFixed(3);
  el.style.transform = `translateY(-44%) translateY(${(1 - eased) * 28}px)`;
}

function labelFor(p) {
  if (p < .16) return 'Start';
  if (p < .31) return 'Anmeldung';
  if (p < .54) return 'Theorie';
  if (p < .79) return 'Praxis';
  return 'Ziel';
}

function animateCopy(p) {
  if (hero) {
    const visible = 1 - smooth(range(p, .045, .14));
    hero.style.opacity = visible.toFixed(3);
    hero.style.transform = `translateY(${(1 - visible) * -38}px)`;
  }

  const opacities = [
    plateau(p, .155, .18, .275, .305),
    plateau(p, .385, .415, .505, .535),
    plateau(p, .615, .645, .745, .775),
    plateau(p, .855, .885, .965, .995)
  ];
  stations.forEach((station, i) => setStation(station, opacities[i] || 0));
  if (fill) fill.style.transform = `scaleY(${p.toFixed(4)})`;
  if (label) label.textContent = labelFor(p);
}

// Piecewise travel curve with deliberate plateaus: the vehicle physically stops
// while the user keeps scrolling through Anmeldung, Theorie and Praxis.
const travelSegments = [
  [0.00, 0.16, 0.00, 0.20],
  [0.16, 0.30, 0.20, 0.20],
  [0.30, 0.39, 0.20, 0.43],
  [0.39, 0.53, 0.43, 0.43],
  [0.53, 0.62, 0.43, 0.66],
  [0.62, 0.77, 0.66, 0.66],
  [0.77, 0.86, 0.66, 0.86],
  [0.86, 0.96, 0.86, 0.86],
  [0.96, 1.00, 0.86, 1.00]
];
function travelFor(p) {
  for (const [p0, p1, t0, t1] of travelSegments) {
    if (p <= p1) return lerp(t0, t1, smooth(range(p, p0, p1)));
  }
  return 1;
}

function activeStop(p) {
  const stops = [
    { a: .16, b: .30, index: 0, side: 1 },
    { a: .39, b: .53, index: 1, side: -1 },
    { a: .62, b: .77, index: 2, side: 1 },
    { a: .86, b: .96, index: 3, side: -1 }
  ];
  return stops.find(s => p >= s.a && p <= s.b) || null;
}

function animateFallback(p) {
  if (!fallback || !fallbackCar || !fallbackRoad) return;
  const travel = travelFor(p);
  root.style.setProperty('--car-x', `${Math.sin(travel * Math.PI * 3) * 38}px`);
  root.style.setProperty('--car-s', `${(1 + travel * .18).toFixed(3)}`);
  root.style.setProperty('--road-y', `${travel * 9000}px`);
  root.style.setProperty('--speed-opacity', `${activeStop(p) ? .05 : .26}`);
  fallbackCar.classList.toggle('braking', Boolean(activeStop(p)));
}

let renderer;
let scene;
let camera;
let carRig;
let carModel;
let wheels = [];
let stationLights = [];
let threeReady = false;
let targetProgress = storyProgress();
let renderProgress = targetProgress;
let previousTravel = travelFor(renderProgress);

function textureRepeat(texture, x, y, color = false) {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(x, y);
  texture.anisotropy = renderer?.capabilities?.getMaxAnisotropy?.() || 4;
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildRoad(textures) {
  const roadMat = new THREE.MeshStandardMaterial({
    map: textureRepeat(textures.asphaltColor, 2.2, 48, true),
    normalMap: textureRepeat(textures.asphaltNormal, 2.2, 48),
    roughnessMap: textureRepeat(textures.asphaltRough, 2.2, 48),
    roughness: .94,
    metalness: .02
  });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 230), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, 20);
  road.receiveShadow = true;
  scene.add(road);

  const grassMat = new THREE.MeshStandardMaterial({
    map: textureRepeat(textures.grassColor, 14, 55, true),
    normalMap: textureRepeat(textures.grassNormal, 14, 55),
    roughnessMap: textureRepeat(textures.grassRough, 14, 55),
    roughness: 1
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 230), grassMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -.035, 20);
  ground.receiveShadow = true;
  scene.add(ground);

  const white = new THREE.MeshStandardMaterial({ color: 0xf3f0df, roughness: .75 });
  for (const x of [-3.67, 3.67]) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(.10, .018, 230), white);
    edge.position.set(x, .018, 20);
    scene.add(edge);
  }
  const dashGeo = new THREE.BoxGeometry(.12, .022, 3.6);
  for (let z = -92; z <= 132; z += 8.3) {
    const dash = new THREE.Mesh(dashGeo, white);
    dash.position.set(0, .023, z);
    scene.add(dash);
  }

  const metal = new THREE.MeshStandardMaterial({ color: 0x9ea19c, metalness: .74, roughness: .38 });
  for (const side of [-1, 1]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(.16, .20, 178), metal);
    beam.position.set(side * 5.0, .73, 17);
    beam.castShadow = beam.receiveShadow = true;
    scene.add(beam);
    const postGeo = new THREE.BoxGeometry(.12, .82, .12);
    for (let z = -70; z <= 104; z += 4.2) {
      const post = new THREE.Mesh(postGeo, metal);
      post.position.set(side * 5.0, .38, z);
      post.castShadow = true;
      scene.add(post);
    }
  }
}

function buildForest() {
  const mobile = innerWidth < 700;
  const count = mobile ? 70 : 125;
  const trunkGeo = new THREE.CylinderGeometry(.13, .22, 2.6, 6);
  const crownGeo = new THREE.ConeGeometry(1.35, 5.7, 7);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a382c, roughness: 1 });
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x27382a, roughness: .98 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, count);
  trunks.castShadow = crowns.castShadow = true;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const rand = i => {
    const x = Math.sin(i * 91.173 + 17.7) * 43758.5453;
    return x - Math.floor(x);
  };
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? 1 : -1;
    const z = -100 + rand(i + 5) * 250;
    const x = side * (8.5 + rand(i + 13) * 18);
    const scale = .75 + rand(i + 29) * 1.25;
    pos.set(x, 1.3 * scale, z);
    s.set(scale, scale, scale);
    m.compose(pos, q, s); trunks.setMatrixAt(i, m);
    pos.set(x, (2.6 + 2.2) * scale, z);
    m.compose(pos, q, s); crowns.setMatrixAt(i, m);
  }
  scene.add(trunks, crowns);
}

function buildStationMarkers() {
  const zStops = [-30, 4.5, 39, 69];
  const sides = [-1, 1, -1, 1];
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x121513, metalness: .45, roughness: .38 });
  zStops.forEach((z, i) => {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(.34, 3.2, .34), baseMat);
    base.position.y = 1.6;
    base.castShadow = true;
    group.add(base);
    const glowMat = new THREE.MeshStandardMaterial({
      color: YELLOW,
      emissive: YELLOW,
      emissiveIntensity: .8,
      roughness: .28,
      metalness: .08
    });
    const glow = new THREE.Mesh(new THREE.BoxGeometry(.38, .16, .38), glowMat);
    glow.position.y = 2.75;
    group.add(glow);
    const point = new THREE.PointLight(YELLOW, 0, 11, 2.1);
    point.position.set(0, 2.5, 0);
    group.add(point);
    group.position.set(sides[i] * 4.55, 0, z);
    group.rotation.y = sides[i] < 0 ? .18 : -.18;
    scene.add(group);
    stationLights.push({ glowMat, point, z });
  });
}

async function initThree() {
  if (!canvas || reduceMotion) return;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.65));
    renderer.setSize(innerWidth, innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x8a806f, 44, 155);
    camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, .1, 320);

    const hemi = new THREE.HemisphereLight(0xe7dfca, 0x273126, 1.8);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffc27f, 4.0);
    sun.position.set(-22, 30, -22);
    sun.castShadow = true;
    sun.shadow.mapSize.set(innerWidth < 800 ? 1024 : 2048, innerWidth < 800 ? 1024 : 2048);
    sun.shadow.camera.left = -28; sun.shadow.camera.right = 28;
    sun.shadow.camera.top = 28; sun.shadow.camera.bottom = -28;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 120;
    sun.shadow.bias = -.00015;
    scene.add(sun);

    const tex = new THREE.TextureLoader();
    const rgb = new RGBELoader();
    const [env, asphaltColor, asphaltNormal, asphaltRough, grassColor, grassNormal, grassRough] = await Promise.all([
      rgb.loadAsync(HDR_URL),
      tex.loadAsync(ASPHALT.color), tex.loadAsync(ASPHALT.normal), tex.loadAsync(ASPHALT.rough),
      tex.loadAsync(GRASS.color), tex.loadAsync(GRASS.normal), tex.loadAsync(GRASS.rough)
    ]);
    env.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = env;
    scene.background = env;
    if ('backgroundBlurriness' in scene) scene.backgroundBlurriness = .19;
    if ('environmentIntensity' in scene) scene.environmentIntensity = .72;

    buildRoad({ asphaltColor, asphaltNormal, asphaltRough, grassColor, grassNormal, grassRough });
    buildForest();
    buildStationMarkers();

    const gltf = await new GLTFLoader().loadAsync(CAR_URL);
    carModel = gltf.scene;
    carModel.traverse(obj => {
      if (!obj.isMesh) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      const name = (obj.name || '').toLowerCase();
      if (/wheel|tire|tyre|rim/.test(name)) wheels.push(obj);
    });

    // Normalize any vehicle model to roughly real-car dimensions and ground it.
    const initial = new THREE.Box3().setFromObject(carModel);
    const size = initial.getSize(new THREE.Vector3());
    const longest = Math.max(size.x, size.z);
    const scale = 4.55 / Math.max(.001, longest);
    carModel.scale.setScalar(scale);
    carModel.updateMatrixWorld(true);
    const normalized = new THREE.Box3().setFromObject(carModel);
    const center = normalized.getCenter(new THREE.Vector3());
    carModel.position.x -= center.x;
    carModel.position.z -= center.z;
    carModel.position.y -= normalized.min.y;

    carRig = new THREE.Group();
    carRig.add(carModel);
    scene.add(carRig);

    // The Khronos concept car faces the opposite direction to our road convention.
    carRig.rotation.y = Math.PI;

    threeReady = true;
    canvas.classList.add('is-live');
    stage?.classList.add('is-3d');
    if (fallback) fallback.style.opacity = '0';
  } catch (error) {
    console.warn('Yellow Drive 3D cinematic fallback active:', error);
    threeReady = false;
  }
}

function updateThree(p) {
  if (!threeReady || !carRig || !camera) return;
  const travel = travelFor(p);
  const z = lerp(-60, 92, travel);
  const stop = activeStop(p);
  const laneX = 1.78 + Math.sin(travel * Math.PI * 2.8) * .12;
  carRig.position.set(laneX, .02, z);

  // Wheel motion follows actual distance and freezes during plateau segments.
  const deltaTravel = travel - previousTravel;
  if (Math.abs(deltaTravel) > 0.000001) {
    wheels.forEach(wheel => { wheel.rotation.x -= deltaTravel * 90; });
  }
  previousTravel = travel;

  let camX = laneX + 3.65 + Math.sin(p * Math.PI * 3.1) * .65;
  let camY = 1.72 + Math.sin(p * Math.PI * 2.0) * .22;
  let zOffset = -10.8 + Math.cos(p * Math.PI * 2.5) * .7;
  let lookX = laneX + .15;
  let lookY = .86;
  let lookZ = z + 3.9;

  if (stop) {
    const local = range(p, stop.a, stop.b);
    const orbit = (local - .5) * 1.65;
    camX = laneX + stop.side * (4.25 + Math.sin(local * Math.PI) * .65);
    camY = 1.65 + Math.sin(local * Math.PI) * .45;
    zOffset = -8.8 + orbit * 1.2;
    lookX = laneX;
    lookY = .82;
    lookZ = z + 1.8;
  }

  // Finale opens up into a wider, slightly higher shot.
  const finale = smooth(range(p, .96, 1));
  camX = lerp(camX, laneX + 5.8, finale);
  camY = lerp(camY, 3.2, finale);
  zOffset = lerp(zOffset, -14.5, finale);
  lookZ = lerp(lookZ, z + 8.0, finale);

  camera.position.set(camX, camY, z + zOffset);
  camera.lookAt(lookX, lookY, lookZ);

  stationLights.forEach((item, i) => {
    const active = stop?.index === i;
    item.glowMat.emissiveIntensity = active ? 4.5 : .7;
    item.point.intensity = active ? 15 : 0;
  });

  renderer.render(scene, camera);
}

function tick() {
  targetProgress = storyProgress();
  // tiny cinematic inertia, still reversible and tightly tied to scroll
  renderProgress += (targetProgress - renderProgress) * .12;
  if (Math.abs(targetProgress - renderProgress) < .00008) renderProgress = targetProgress;
  animateCopy(renderProgress);
  if (threeReady) updateThree(renderProgress); else animateFallback(renderProgress);
  requestAnimationFrame(tick);
}

addEventListener('resize', () => {
  if (!renderer || !camera) return;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.65));
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', event => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });
});

initThree();
tick();
