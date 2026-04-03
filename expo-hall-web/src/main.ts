import "./style.css";
import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Broker } from "./brokers";
import { BROKERS } from "./brokers";

const HALL = { w: 120, d: 80, ceiling: 12 };
const COL = { hall: 0x030507, surface: 0x080c14, fog: 0x05080e };

function hexColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

function makeLabelTexture(
  main: string,
  sub?: string,
  opts: { w?: number; h?: number; mainPx?: number; subPx?: number } = {}
): THREE.CanvasTexture {
  const w = opts.w ?? 1024;
  const h = opts.h ?? 256;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "rgba(8,12,20,0.15)";
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${opts.mainPx ?? 72}px Barlow Condensed, sans-serif`;
  ctx.fillText(main, w / 2, sub ? h * 0.38 : h / 2);
  if (sub) {
    ctx.font = `400 ${opts.subPx ?? 28}px DM Sans, sans-serif`;
    ctx.fillStyle = "#00c896";
    ctx.fillText(sub, w / 2, h * 0.68);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createBooth(broker: Broker, x: number, z: number, width: number, depth: number, height: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const prim = hexColor(broker.primary);
  const sec = hexColor(broker.secondary);

  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.96, 0.06, depth * 0.96),
    new THREE.MeshStandardMaterial({
      color: prim,
      metalness: 0.35,
      roughness: 0.55,
    })
  );
  platform.position.y = 0.03;
  platform.castShadow = true;
  platform.receiveShadow = true;
  g.add(platform);

  const back = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.98, height * 0.72, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0xeef1f5,
      metalness: 0.08,
      roughness: 0.88,
    })
  );
  back.position.set(0, 0.06 + (height * 0.72) / 2, -depth / 2 + 0.08);
  back.castShadow = true;
  g.add(back);

  const fascia = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.02, 0.55, 0.18),
    new THREE.MeshStandardMaterial({
      color: prim,
      emissive: prim,
      emissiveIntensity: 0.9,
      metalness: 0.4,
      roughness: 0.35,
    })
  );
  fascia.position.set(0, height - 0.28, -depth / 2 + 0.12);
  g.add(fascia);

  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.04, 0.08, 0.12),
    new THREE.MeshStandardMaterial({
      color: prim,
      emissive: prim,
      emissiveIntensity: 1.2,
      metalness: 0.5,
      roughness: 0.25,
    })
  );
  strip.position.set(0, height - 0.04, -depth / 2 + 0.14);
  g.add(strip);

  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.45, 1.08, 0.55),
    new THREE.MeshStandardMaterial({
      color: sec,
      metalness: 0.28,
      roughness: 0.62,
    })
  );
  counter.position.set(0, 0.54, depth / 2 - 0.35);
  counter.castShadow = true;
  g.add(counter);

  const sideGeo = new THREE.BoxGeometry(0.1, height * 0.65, depth * 0.88);
  const sideMat = new THREE.MeshStandardMaterial({
    color: COL.surface,
    metalness: 0.1,
    roughness: 0.9,
  });
  const sL = new THREE.Mesh(sideGeo, sideMat);
  sL.position.set(-width / 2 + 0.06, 0.06 + (height * 0.65) / 2, 0);
  const sR = sL.clone();
  sR.position.x = width / 2 - 0.06;
  g.add(sL, sR);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.35, height * 0.25),
    new THREE.MeshStandardMaterial({
      color: 0x0a1628,
      emissive: 0x1a3a5c,
      emissiveIntensity: 0.35,
      metalness: 0.2,
      roughness: 0.5,
    })
  );
  screen.position.set(0, height * 0.48, -depth / 2 + 0.08);
  g.add(screen);

  g.userData.broker = broker as unknown as Record<string, unknown>;
  g.userData.isBooth = true;
  return g;
}

function distributeCenters(count: number, unit: number): number[] {
  if (count <= 0) return [];
  const step = Math.max(unit * 1.15, unit + 1);
  const total = (count - 1) * step;
  const start = -total / 2;
  return Array.from({ length: count }, (_, i) => start + i * (total / Math.max(count - 1, 1)));
}

function buildHall(scene: THREE.Scene, brokers: Broker[]): THREE.Group[] {
  const booths: THREE.Group[] = [];

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(HALL.w, HALL.d),
    new THREE.MeshStandardMaterial({
      color: 0x1a1e28,
      metalness: 0.65,
      roughness: 0.28,
      envMapIntensity: 0.85,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(HALL.w * 0.92, 8),
    new THREE.MeshStandardMaterial({
      color: 0x1c1c1f,
      metalness: 0.05,
      roughness: 0.95,
    })
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.002, 0);
  scene.add(carpet);

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x2a2d35,
    metalness: 0.15,
    roughness: 0.88,
  });

  const north = new THREE.Mesh(new THREE.BoxGeometry(HALL.w, HALL.ceiling, 0.8), wallMat);
  north.position.set(0, HALL.ceiling / 2, -HALL.d / 2);
  scene.add(north);

  const south = new THREE.Mesh(new THREE.BoxGeometry(HALL.w, HALL.ceiling, 0.8), wallMat);
  south.position.set(0, HALL.ceiling / 2, HALL.d / 2);
  scene.add(south);

  const east = new THREE.Mesh(new THREE.BoxGeometry(0.8, HALL.ceiling, HALL.d), wallMat);
  east.position.set(HALL.w / 2, HALL.ceiling / 2, 0);
  scene.add(east);

  const west = new THREE.Mesh(new THREE.BoxGeometry(0.8, HALL.ceiling, HALL.d), wallMat);
  west.position.set(-HALL.w / 2, HALL.ceiling / 2, 0);
  scene.add(west);

  const trussMat = new THREE.MeshStandardMaterial({
    color: 0x0d0f12,
    metalness: 0.85,
    roughness: 0.35,
  });
  for (let x = -HALL.w / 2 + 4; x < HALL.w / 2; x += 8) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, HALL.d - 2), trussMat);
    beam.position.set(x, HALL.ceiling - 0.4, 0);
    scene.add(beam);
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.06, HALL.d - 2),
      new THREE.MeshStandardMaterial({
        color: 0xffe8cc,
        emissive: 0xffe8cc,
        emissiveIntensity: 0.6,
        metalness: 0.2,
        roughness: 0.5,
      })
    );
    led.position.set(x, HALL.ceiling - 0.62, 0);
    scene.add(led);
  }

  const archW = 15;
  const archH = 10;
  const archZ = HALL.d / 2 - 0.2;
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, archH, 1.2), wallMat);
  pillar.position.set(-archW / 2, archH / 2, archZ);
  const pillarR = pillar.clone();
  pillarR.position.x = archW / 2;
  scene.add(pillar, pillarR);

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(archW + 2, 1.2, 1.4), wallMat);
  lintel.position.set(0, archH, archZ);
  scene.add(lintel);

  const archLed = new THREE.Mesh(
    new THREE.BoxGeometry(archW + 1, 0.15, 0.2),
    new THREE.MeshStandardMaterial({
      color: 0xe8192c,
      emissive: 0xe8192c,
      emissiveIntensity: 1.1,
      metalness: 0.3,
      roughness: 0.35,
    })
  );
  archLed.position.set(0, archH - 0.5, archZ + 0.5);
  scene.add(archLed);

  const entranceTex = makeLabelTexture("ExpoVR", "Powered by mybestbrokers.com", { h: 320, mainPx: 96, subPx: 32 });
  const entrancePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 4.5),
    new THREE.MeshBasicMaterial({ map: entranceTex, transparent: true, depthWrite: false })
  );
  entrancePlane.position.set(0, archH - 2.2, archZ + 0.55);
  scene.add(entrancePlane);

  const ti = brokers.filter((b) => b.tier === "titanium");
  const di = brokers.filter((b) => b.tier === "diamond");
  const go = brokers.filter((b) => b.tier === "gold");

  const tiX = distributeCenters(ti.length, 14);
  ti.forEach((b, i) => {
    const booth = createBooth(b, tiX[i]!, -35, 14, 8, 7);
    scene.add(booth);
    booths.push(booth);
  });

  const diX = distributeCenters(di.length, 9);
  di.forEach((b, i) => {
    const booth = createBooth(b, diX[i]!, -10, 9, 6, 5);
    scene.add(booth);
    booths.push(booth);
  });

  const goX = distributeCenters(go.length, 6);
  go.forEach((b, i) => {
    const booth = createBooth(b, goX[i]!, 18, 6, 5, 4);
    scene.add(booth);
    booths.push(booth);
  });

  const rowSign = (text: string, z: number, color: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1536;
    canvas.height = 160;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "700 96px Barlow Condensed, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = `#${new THREE.Color(color).getHexString()}`;
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 24;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 1.9),
      new THREE.MeshStandardMaterial({
        map: tex,
        emissive: color,
        emissiveIntensity: 0.25,
        metalness: 0.6,
        roughness: 0.35,
        transparent: true,
        side: THREE.DoubleSide,
      })
    );
    mesh.position.set(0, 10.2, z);
    mesh.rotation.x = -0.12;
    scene.add(mesh);
  };

  rowSign("TITANIUM SPONSORS", -35, 0xd4a843);
  rowSign("DIAMOND SPONSORS", -10, 0xc0c8d4);
  rowSign("GOLD EXHIBITORS", 18, 0xb87333);

  const ambient = new THREE.AmbientLight(0x3a4255, 0.35);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x8899bb, 0x080a0e, 0.5);
  scene.add(hemi);

  for (const z of [-35, -10, 18]) {
    const pl = new THREE.PointLight(0xffe6cc, 2.5, 55, 1.8);
    pl.position.set(0, 9, z);
    scene.add(pl);
  }

  return booths;
}

function setupPanel(): {
  show: (b: Broker) => void;
  hide: () => void;
} {
  const panel = document.getElementById("panel")!;
  const nameEl = document.getElementById("panel-name")!;
  const tagEl = document.getElementById("panel-tag")!;
  const featEl = document.getElementById("panel-features")!;
  const closeBtn = document.getElementById("panel-close")!;

  const show = (b: Broker) => {
    nameEl.textContent = b.name;
    tagEl.textContent = b.tagline;
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
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(COL.fog);
scene.fog = new THREE.FogExp2(COL.fog, 0.012);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(0, 1.65, 34);

const pmrem = new THREE.PMREMGenerator(renderer);
const env = new RoomEnvironment();
const envRT = pmrem.fromScene(env, 0.04);
scene.environment = envRT.texture;
pmrem.dispose();

const booths = buildHall(scene, BROKERS);

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

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
