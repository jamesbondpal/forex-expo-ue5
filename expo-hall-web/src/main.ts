import "./style.css";
import * as THREE from "three";
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

// ─── Info Panel ────────────────────────────────────────────────────────────────

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

// ─── Renderer ──────────────────────────────────────────────────────────────────

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
camera.position.set(0, 1.65, 20);
camera.rotation.order = "YXZ"; // Yaw-Pitch order for FPS camera

// Face into the hall (negative Z), slightly downward to see the floor
const yaw = Math.PI;
const pitch = -0.08;
camera.rotation.set(pitch, yaw, 0);

// ─── Post-processing ──────────────────────────────────────────────────────────

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

// ─── Scene state ──────────────────────────────────────────────────────────────

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

// ─── Drag-to-Look Camera Controls ─────────────────────────────────────────────
// No pointer lock needed — just drag on the canvas to look around.
// WASD movement works immediately without clicking.

const hint = document.getElementById("hint")!;
hint.textContent = "WASD move · Drag to look · Scroll zoom";

let cameraYaw = yaw;
let cameraPitch = -0.08;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
const MOUSE_SENSITIVITY = 0.003;
const PITCH_LIMIT = Math.PI / 2 - 0.05; // ~85 degrees

// Touch support state
let lastTouchX = 0;
let lastTouchY = 0;
let isTouchDragging = false;

canvas.addEventListener("mousedown", (e) => {
  if (e.button === 0 || e.button === 2) {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    canvas.style.cursor = "grabbing";
  }
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  const dx = e.clientX - lastMouseX;
  const dy = e.clientY - lastMouseY;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;

  cameraYaw -= dx * MOUSE_SENSITIVITY;
  cameraPitch -= dy * MOUSE_SENSITIVITY;
  cameraPitch = THREE.MathUtils.clamp(cameraPitch, -PITCH_LIMIT, PITCH_LIMIT);
});

window.addEventListener("mouseup", () => {
  isDragging = false;
  canvas.style.cursor = "grab";
});

// Touch controls
canvas.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) {
    isTouchDragging = true;
    lastTouchX = e.touches[0].clientX;
    lastTouchY = e.touches[0].clientY;
  }
}, { passive: true });

canvas.addEventListener("touchmove", (e) => {
  if (!isTouchDragging || e.touches.length !== 1) return;
  const dx = e.touches[0].clientX - lastTouchX;
  const dy = e.touches[0].clientY - lastTouchY;
  lastTouchX = e.touches[0].clientX;
  lastTouchY = e.touches[0].clientY;

  cameraYaw -= dx * MOUSE_SENSITIVITY * 1.5;
  cameraPitch -= dy * MOUSE_SENSITIVITY * 1.5;
  cameraPitch = THREE.MathUtils.clamp(cameraPitch, -PITCH_LIMIT, PITCH_LIMIT);
}, { passive: true });

canvas.addEventListener("touchend", () => {
  isTouchDragging = false;
}, { passive: true });

// Scroll to zoom (adjust FOV)
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const zoom = camera.fov + e.deltaY * 0.05;
  camera.fov = THREE.MathUtils.clamp(zoom, 40, 90);
  camera.userData.baseFov = THREE.MathUtils.clamp(zoom, 40, 90);
  camera.updateProjectionMatrix();
}, { passive: false });

// Prevent context menu on right-click drag
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

// Set initial cursor
canvas.style.cursor = "grab";

// Camera is added directly to scene (no controls wrapper)
scene.add(camera);

// ─── Panel + Proximity ────────────────────────────────────────────────────────

const panelApi = setupPanel();
let activeBroker: Broker | null = null;
const TRIGGER = 7;

// ─── WASD Movement (always active, no lock needed) ────────────────────────────

const keys = { f: false, b: false, l: false, r: false, sprint: false };
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyW" || e.code === "ArrowUp") keys.f = true;
  if (e.code === "KeyS" || e.code === "ArrowDown") keys.b = true;
  if (e.code === "KeyA" || e.code === "ArrowLeft") keys.l = true;
  if (e.code === "KeyD" || e.code === "ArrowRight") keys.r = true;
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.sprint = true;
  if (e.code === "Escape") panelApi.hide();
});
window.addEventListener("keyup", (e) => {
  if (e.code === "KeyW" || e.code === "ArrowUp") keys.f = false;
  if (e.code === "KeyS" || e.code === "ArrowDown") keys.b = false;
  if (e.code === "KeyA" || e.code === "ArrowLeft") keys.l = false;
  if (e.code === "KeyD" || e.code === "ArrowRight") keys.r = false;
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.sprint = false;
});

// ─── Resize ───────────────────────────────────────────────────────────────────

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

// ─── Ambient Audio ────────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;
let audioStarted = false;

function startAmbientAudio() {
  if (audioStarted) return;
  audioStarted = true;
  try {
    audioCtx = new AudioContext();
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.015;
    }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 400;
    filter.Q.value = 0.5;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.12;
    noiseSource.connect(filter).connect(gain).connect(audioCtx.destination);
    noiseSource.start();

    const hum = audioCtx.createOscillator();
    hum.frequency.value = 60;
    hum.type = "sine";
    const humGain = audioCtx.createGain();
    humGain.gain.value = 0.02;
    hum.connect(humGain).connect(audioCtx.destination);
    hum.start();
  } catch (_) {
    // Audio not supported
  }
}

// Start audio on first user interaction
window.addEventListener("mousedown", startAmbientAudio, { once: true });
window.addEventListener("keydown", startAmbientAudio, { once: true });
window.addEventListener("touchstart", startAmbientAudio, { once: true });

// ─── Cinematic Intro ──────────────────────────────────────────────────────────

let introActive = false;
let introTime = 0;
const INTRO_DURATION = 3.5;
const INTRO_START = new THREE.Vector3(0, 4.5, HALL.d / 2 - 2);
const INTRO_END = new THREE.Vector3(0, 1.65, HALL.d / 2 - 8);

// ─── Animation Loop ──────────────────────────────────────────────────────────

const clock = new THREE.Clock();
const moveDir = new THREE.Vector3();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const speed = 12;
const SPRINT_MULT = 1.8;
const PLAYER_RADIUS = 0.48;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // ── Cinematic intro fly-in ──
  if (introActive) {
    introTime += dt;
    const progress = Math.min(introTime / INTRO_DURATION, 1.0);
    const ease = 1 - Math.pow(1 - progress, 3);
    camera.position.lerpVectors(INTRO_START, INTRO_END, ease);
    camera.lookAt(0, 1.5, -20);
    camera.fov = THREE.MathUtils.lerp(85, 62, ease);
    camera.updateProjectionMatrix();

    if (progress >= 1.0) {
      introActive = false;
      camera.position.copy(INTRO_END);
      // Set camera to look straight into the hall (negative Z), level pitch
      cameraYaw = Math.PI;
      cameraPitch = -0.02; // very slight downward tilt
    }

    animateDustAndNeon(t);
    animateCrowd(crowdWalkers, dt, HALL);
    composer.render(dt);
    return;
  }

  // ── Apply camera rotation from drag ──
  camera.rotation.set(cameraPitch, cameraYaw, 0);

  // ── WASD movement (always active) ──
  const isMoving = keys.f || keys.b || keys.l || keys.r;
  if (isMoving) {
    const currentSpeed = speed * (keys.sprint ? SPRINT_MULT : 1);
    // Get forward/right vectors from camera yaw only (no pitch influence on movement)
    forward.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
    right.set(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);

    moveDir.set(0, 0, 0);
    if (keys.f) moveDir.add(forward);
    if (keys.b) moveDir.sub(forward);
    if (keys.r) moveDir.add(right);
    if (keys.l) moveDir.sub(right);
    moveDir.normalize().multiplyScalar(currentSpeed * dt);

    camera.position.x += moveDir.x;
    camera.position.z += moveDir.z;
  }

  const p = camera.position;

  // Camera bob when walking
  if (isMoving) {
    p.y = 1.65 + Math.sin(t * 8.0) * 0.025;
  } else {
    p.y = THREE.MathUtils.lerp(p.y, 1.65, dt * 5);
  }

  // Subtle FOV breathing
  const baseFov = (camera.userData.baseFov as number) || 62;
  camera.fov = baseFov + Math.sin(t * 0.6) * 1.0;
  camera.updateProjectionMatrix();

  // Bounds clamping
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
  scene.traverse((obj) => {
    if (obj.userData.isDust && obj instanceof THREE.Points) {
      const positions = obj.geometry.attributes.position;
      if (positions) {
        const arr = positions.array as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i] += Math.sin(t * 0.3 + i) * 0.003;
          arr[i + 1] += Math.sin(t * 0.2 + i * 0.5) * 0.002;
          arr[i + 2] += Math.cos(t * 0.25 + i * 0.3) * 0.002;
          if (arr[i + 1] > HALL.ceiling) arr[i + 1] = 0.5;
          if (arr[i + 1] < 0) arr[i + 1] = HALL.ceiling - 0.5;
        }
        positions.needsUpdate = true;
      }
    }
    if (obj.userData.isNeon && obj instanceof THREE.Mesh) {
      const mat = obj.material as THREE.MeshPhysicalMaterial;
      const phase = (obj.userData.neonPhase as number) || 0;
      mat.emissiveIntensity = 1.8 + Math.sin(t * 2.0 + phase) * 1.2;
    }
  });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

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
