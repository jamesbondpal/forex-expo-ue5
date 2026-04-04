import "./style.css";
import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { FilmPass } from "three/addons/postprocessing/FilmPass.js";
import { BROKERS } from "./brokers";
import type { Broker } from "./brokers";
import { loadAssets } from "./assets";
import { buildHall, HALL, COL } from "./scene";
import { addCrowd, animateCrowd } from "./crowd";
import { representativePortraitUrl } from "./logoLoader";

function setupPanel(): {
  show: (b: Broker) => void;
  hide: () => void;
} {
  const panel = document.getElementById("panel")!;
  const nameEl = document.getElementById("panel-name")!;
  const tagEl = document.getElementById("panel-tag")!;
  const repsEl = document.getElementById("panel-reps")!;
  const featEl = document.getElementById("panel-features")!;
  const closeBtn = document.getElementById("panel-close")!;

  const show = (b: Broker) => {
    nameEl.textContent = b.name;
    tagEl.textContent = b.tagline;
    repsEl.innerHTML = "";
    for (const rep of b.representatives) {
      const wrap = document.createElement("div");
      wrap.className = "rep";
      const img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      img.src = representativePortraitUrl(rep.portraitSeed);
      const meta = document.createElement("div");
      meta.className = "meta";
      const strong = document.createElement("strong");
      strong.textContent = rep.name;
      const span = document.createElement("span");
      span.textContent = rep.title;
      meta.append(strong, span);
      wrap.append(img, meta);
      repsEl.appendChild(wrap);
    }
    featEl.innerHTML = "";
    for (const f of b.features) {
      const li = document.createElement("li");
      li.textContent = f;
      featEl.appendChild(li);
    }
    panel.classList.remove("hidden");
  };

  const hide = () => panel.classList.add("hidden");

  closeBtn.addEventListener("click", hide);
  return { show, hide };
}

const canvas = document.getElementById("c") as HTMLCanvasElement;
const loadingEl = document.getElementById("loading")!;
const loadingText = document.getElementById("loading-text")!;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  alpha: false,
  powerPreference: "high-performance",
  stencil: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.outputColorSpace = THREE.SRGBColorSpace;

RectAreaLightUniformsLib.init();

const scene = new THREE.Scene();
scene.background = new THREE.Color(COL.fog);
scene.fog = new THREE.FogExp2(COL.fog, 0.007);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.08, 450);
camera.position.set(0, 1.65, 34);

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.42, 0.55, 0.9);
const SMAAFactory = SMAAPass as unknown as new (w: number, h: number) => InstanceType<typeof SMAAPass>;
const smaaPass = new SMAAFactory(window.innerWidth, window.innerHeight);
const filmPass = new FilmPass(0.06, false);
const outputPass = new OutputPass();

composer.addPass(renderPass);
composer.addPass(bloomPass);
composer.addPass(filmPass);
composer.addPass(smaaPass);
composer.addPass(outputPass);

let booths: THREE.Group[] = [];
let crowdWalkers: THREE.Group[] = [];
let disposeAssets: (() => void) | null = null;

async function bootstrap() {
  try {
    const assets = await loadAssets(renderer, (msg) => {
      loadingText.textContent = msg;
    });
    scene.environment = assets.envMap;
    disposeAssets = assets.disposeEnv;

    const rect = new THREE.RectAreaLight(0xfff2dd, 12, HALL.w * 0.82, 4);
    rect.position.set(0, HALL.ceiling - 0.6, 0);
    rect.rotation.x = -Math.PI / 2;
    scene.add(rect);

    booths = await buildHall(scene, BROKERS, assets, (msg) => {
      loadingText.textContent = msg;
    });
    crowdWalkers = addCrowd(scene, 42);
  } catch (e) {
    console.error(e);
    loadingText.textContent = "Failed to load assets. Run npm run build from expo-hall-web and ensure public/polyhaven exists.";
    throw e;
  } finally {
    loadingEl.classList.add("hidden");
  }
}

const controls = new PointerLockControls(camera, document.body);
const hint = document.getElementById("hint")!;

canvas.addEventListener("click", () => {
  if (!controls.isLocked) controls.lock();
});

controls.addEventListener("lock", () => {
  hint.textContent = "WASD · Mouse look · Esc unlock";
});
controls.addEventListener("unlock", () => {
  hint.textContent = "Click canvas to explore";
});

scene.add(controls.object);

const panelApi = setupPanel();
let activeBroker: Broker | null = null;
const TRIGGER = 7;

const keys = { f: false, b: false, l: false, r: false };
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyW") keys.f = true;
  if (e.code === "KeyS") keys.b = true;
  if (e.code === "KeyA") keys.l = true;
  if (e.code === "KeyD") keys.r = true;
  if (e.code === "Escape") panelApi.hide();
});
window.addEventListener("keyup", (e) => {
  if (e.code === "KeyW") keys.f = false;
  if (e.code === "KeyS") keys.b = false;
  if (e.code === "KeyA") keys.l = false;
  if (e.code === "KeyD") keys.r = false;
});

const clock = new THREE.Clock();
const moveVec = new THREE.Vector3();
const speed = 14;

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloomPass.setSize(w, h);
  (smaaPass as { setSize: (w: number, h: number) => void }).setSize(w, h);
}

window.addEventListener("resize", onResize);

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (controls.isLocked) {
    moveVec.set(0, 0, 0);
    if (keys.f) moveVec.z -= 1;
    if (keys.b) moveVec.z += 1;
    if (keys.l) moveVec.x -= 1;
    if (keys.r) moveVec.x += 1;
    moveVec.normalize().multiplyScalar(speed * dt);
    controls.moveRight(moveVec.x);
    controls.moveForward(moveVec.z);
  }

  const p = camera.position;
  p.x = THREE.MathUtils.clamp(p.x, -HALL.w / 2 + 2, HALL.w / 2 - 2);
  p.z = THREE.MathUtils.clamp(p.z, -HALL.d / 2 + 3, HALL.d / 2 - 2);

  animateCrowd(crowdWalkers, dt, HALL);

  let nearest: Broker | null = null;
  let best = TRIGGER + 1;
  for (const g of booths) {
    const b = g.userData.broker as Broker | undefined;
    if (!b) continue;
    const dx = p.x - g.position.x;
    const dz = p.z - g.position.z;
    const d = Math.hypot(dx, dz);
    if (d < best) {
      best = d;
      nearest = b;
    }
  }

  if (nearest && best < TRIGGER) {
    if (activeBroker !== nearest) {
      activeBroker = nearest;
      panelApi.show(nearest);
    }
  } else if (best >= TRIGGER + 0.5) {
    activeBroker = null;
    panelApi.hide();
  }

  composer.render(dt);
}

bootstrap()
  .then(() => animate())
  .catch(() => {
    loadingEl.classList.remove("hidden");
  });

window.addEventListener("beforeunload", () => {
  disposeAssets?.();
  composer.dispose();
  renderer.dispose();
});
