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
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { VignetteShader } from "three/addons/shaders/VignetteShader.js";
import { BROKERS } from "./brokers";
import type { Broker } from "./brokers";
import { loadAssets } from "./assets";
import { buildHall, HALL, COL } from "./scene";
import { addCrowd, animateCrowd } from "./crowd";
import { representativePortraitUrl } from "./logoLoader";
import { resolveBoothCollisions } from "./collision";
import {
  applyHdrSkybox,
  clearHdrSkybox,
  loadGltfProps,
  DEFAULT_GLTF_PROPS,
  tryAddVideoBackdrop,
} from "./ueStyleVisuals";

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
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;

RectAreaLightUniformsLib.init();

const scene = new THREE.Scene();
scene.background = new THREE.Color(COL.fog);
scene.fog = new THREE.FogExp2(COL.fog, 0.006);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.08, 520);
camera.position.set(0, 1.65, 35);
camera.rotation.y = Math.PI;  // face into hall (negative Z)

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.4, 0.7, 0.22);
const SMAAFactory = SMAAPass as unknown as new (w: number, h: number) => InstanceType<typeof SMAAPass>;
const smaaPass = new SMAAFactory(window.innerWidth, window.innerHeight);
const filmPass = new FilmPass(0.06, false);
const vignettePass = new ShaderPass(VignetteShader);
vignettePass.uniforms.offset.value = 0.85;
vignettePass.uniforms.darkness.value = 1.5;
const outputPass = new OutputPass();

composer.addPass(renderPass);
composer.addPass(bloomPass);
composer.addPass(filmPass);
composer.addPass(vignettePass);
composer.addPass(smaaPass);
composer.addPass(outputPass);

let booths: THREE.Group[] = [];
let crowdWalkers: THREE.Group[] = [];
let disposeAssets: (() => void) | null = null;
let disposeVideoBackdrop: (() => void) | null = null;

async function bootstrap() {
  try {
    const assets = await loadAssets(renderer, (msg) => {
      loadingText.textContent = msg;
    });
    scene.environment = assets.envMap;
    disposeAssets = assets.disposeEnv;

    if (assets.backgroundEquirect) {
      applyHdrSkybox(scene, assets.backgroundEquirect, { intensity: 0.78, blurriness: 0.12 });
      scene.fog = new THREE.FogExp2(COL.fog, 0.003);
    }

    const rect = new THREE.RectAreaLight(0xfff2dd, 12, HALL.w * 0.82, 4);
    rect.position.set(0, HALL.ceiling - 0.6, 0);
    rect.rotation.x = -Math.PI / 2;
    scene.add(rect);

    booths = await buildHall(scene, BROKERS, assets, (msg) => {
      loadingText.textContent = msg;
    });

    await loadGltfProps(scene, assets.envMap, DEFAULT_GLTF_PROPS, (msg) => {
      loadingText.textContent = msg;
    });

    const vd = await tryAddVideoBackdrop(scene, HALL);
    if (vd) disposeVideoBackdrop = vd.dispose;

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
const speed = 12;
const PLAYER_RADIUS = 0.48;

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

// === PROCEDURAL AMBIENT AUDIO ===
let audioCtx: AudioContext | null = null;
let audioStarted = false;

function startAmbientAudio() {
  if (audioStarted) return;
  audioStarted = true;
  try {
    audioCtx = new AudioContext();
    // Crowd murmur — filtered noise
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.015;
    }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    // Bandpass filter — 200-800Hz for murmur effect
    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 400;
    filter.Q.value = 0.5;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.12;
    noiseSource.connect(filter).connect(gain).connect(audioCtx.destination);
    noiseSource.start();

    // Subtle low hum — 60Hz
    const hum = audioCtx.createOscillator();
    hum.frequency.value = 60;
    hum.type = "sine";
    const humGain = audioCtx.createGain();
    humGain.gain.value = 0.02;
    hum.connect(humGain).connect(audioCtx.destination);
    hum.start();
  } catch (_) {
    // Audio not supported — silently continue
  }
}

// === CINEMATIC INTRO CAMERA FLY-IN ===
let introActive = false;  // TODO: Re-enable with proper PointerLockControls handoff
let introTime = 0;
const INTRO_DURATION = 3.5; // seconds
const INTRO_START = new THREE.Vector3(0, 4.5, HALL.d / 2 - 2);
const INTRO_END = new THREE.Vector3(0, 1.65, HALL.d / 2 - 8);

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // Cinematic intro fly-in
  if (introActive) {
    introTime += dt;
    const progress = Math.min(introTime / INTRO_DURATION, 1.0);
    // Smooth ease-out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    camera.position.lerpVectors(INTRO_START, INTRO_END, ease);
    camera.lookAt(0, 1.5, -20);
    // Gradually narrow FOV for dramatic zoom
    camera.fov = THREE.MathUtils.lerp(85, 62, ease);
    camera.updateProjectionMatrix();

    if (progress >= 1.0) {
      introActive = false;
      camera.position.copy(INTRO_END);
    }

    // Still render during intro
    animateDustAndNeon(t);
    animateCrowd(crowdWalkers, dt, HALL);
    composer.render(dt);
    return;
  }

  // Start audio on first interaction
  if (controls.isLocked && !audioStarted) {
    startAmbientAudio();
  }

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

  // Camera bob when walking (subtle sine wave)
  const isMoving = keys.f || keys.b || keys.l || keys.r;
  if (isMoving && controls.isLocked) {
    p.y = 1.65 + Math.sin(t * 8.0) * 0.025; // subtle walk bob
  } else {
    p.y = THREE.MathUtils.lerp(p.y, 1.65, dt * 5); // smoothly return
  }

  // FOV breathing effect (subtle pulse 60-64 degrees)
  camera.fov = 62 + Math.sin(t * 0.6) * 1.5;
  camera.updateProjectionMatrix();

  p.x = THREE.MathUtils.clamp(p.x, -HALL.w / 2 + 2.5, HALL.w / 2 - 2.5);
  p.z = THREE.MathUtils.clamp(p.z, -HALL.d / 2 + 3.5, HALL.d / 2 - 2.5);

  resolveBoothCollisions(p, booths, PLAYER_RADIUS);
  p.x = THREE.MathUtils.clamp(p.x, -HALL.w / 2 + 2.5, HALL.w / 2 - 2.5);
  p.z = THREE.MathUtils.clamp(p.z, -HALL.d / 2 + 3.5, HALL.d / 2 - 2.5);

  // Animate crowd
  animateCrowd(crowdWalkers, dt, HALL);

  // Animate dust particles + neon strips
  animateDustAndNeon(t);

  // Broker proximity check
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

function animateDustAndNeon(t: number) {
  // Animate dust particles — gentle floating
  scene.traverse((obj) => {
    if (obj.userData.isDust && obj instanceof THREE.Points) {
      const positions = obj.geometry.attributes.position;
      if (positions) {
        const arr = positions.array as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i] += Math.sin(t * 0.3 + i) * 0.003;      // drift X
          arr[i + 1] += Math.sin(t * 0.2 + i * 0.5) * 0.002; // drift Y
          arr[i + 2] += Math.cos(t * 0.25 + i * 0.3) * 0.002; // drift Z
          // Wrap around if they drift out of bounds
          if (arr[i + 1] > HALL.ceiling) arr[i + 1] = 0.5;
          if (arr[i + 1] < 0) arr[i + 1] = HALL.ceiling - 0.5;
        }
        positions.needsUpdate = true;
      }
    }
    // Animate neon strips — pulse emissive intensity
    if (obj.userData.isNeon && obj instanceof THREE.Mesh) {
      const mat = obj.material as THREE.MeshPhysicalMaterial;
      const phase = (obj.userData.neonPhase as number) || 0;
      mat.emissiveIntensity = 1.8 + Math.sin(t * 2.0 + phase) * 1.2;
    }
  });
}

bootstrap()
  .then(() => animate())
  .catch(() => {
    loadingEl.classList.remove("hidden");
  });

window.addEventListener("beforeunload", () => {
  clearHdrSkybox(scene);
  scene.background = new THREE.Color(COL.fog);
  disposeVideoBackdrop?.();
  disposeVideoBackdrop = null;
  disposeAssets?.();
  composer.dispose();
  renderer.dispose();
});
