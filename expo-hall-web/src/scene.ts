import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Broker } from "./brokers";
import type { LoadedAssets } from "./assets";

export const HALL = { w: 120, d: 80, ceiling: 12 };
export const COL = { hall: 0x030507, surface: 0x080c14, fog: 0x04060a };

function hexColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

export function makeLabelTexture(
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
  tex.anisotropy = 16;
  tex.needsUpdate = true;
  return tex;
}

function createBooth(
  broker: Broker,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const prim = hexColor(broker.primary);
  const sec = hexColor(broker.secondary);

  const rad = 0.06;
  const seg = 2;

  const platform = new THREE.Mesh(
    new RoundedBoxGeometry(width * 0.96, 0.08, depth * 0.96, seg, rad),
    new THREE.MeshPhysicalMaterial({
      color: prim,
      metalness: 0.42,
      roughness: 0.48,
      envMapIntensity: 0.9,
      clearcoat: 0.35,
      clearcoatRoughness: 0.35,
    })
  );
  platform.position.y = 0.04;
  platform.castShadow = true;
  platform.receiveShadow = true;
  g.add(platform);

  const back = new THREE.Mesh(
    new RoundedBoxGeometry(width * 0.98, height * 0.72, 0.14, seg, rad * 0.8),
    new THREE.MeshPhysicalMaterial({
      color: 0xf0f2f6,
      metalness: 0.04,
      roughness: 0.78,
      envMapIntensity: 0.55,
      clearcoat: 0.06,
      clearcoatRoughness: 0.5,
    })
  );
  back.position.set(0, 0.08 + (height * 0.72) / 2, -depth / 2 + 0.08);
  back.castShadow = true;
  g.add(back);

  const fascia = new THREE.Mesh(
    new RoundedBoxGeometry(width * 1.02, 0.55, 0.2, seg, rad),
    new THREE.MeshPhysicalMaterial({
      color: prim,
      emissive: prim,
      emissiveIntensity: 1.35,
      metalness: 0.55,
      roughness: 0.22,
      envMapIntensity: 0.7,
      clearcoat: 0.85,
      clearcoatRoughness: 0.18,
      iridescence: 0.08,
      iridescenceIOR: 1.5,
    })
  );
  fascia.position.set(0, height - 0.28, -depth / 2 + 0.12);
  g.add(fascia);

  const strip = new THREE.Mesh(
    new RoundedBoxGeometry(width * 1.04, 0.1, 0.14, seg, rad * 0.5),
    new THREE.MeshPhysicalMaterial({
      color: prim,
      emissive: prim,
      emissiveIntensity: 2.2,
      metalness: 0.6,
      roughness: 0.18,
      toneMapped: false,
    })
  );
  strip.position.set(0, height - 0.04, -depth / 2 + 0.14);
  g.add(strip);

  const counter = new THREE.Mesh(
    new RoundedBoxGeometry(width * 0.45, 1.08, 0.55, seg, rad),
    new THREE.MeshPhysicalMaterial({
      color: sec,
      metalness: 0.32,
      roughness: 0.55,
      envMapIntensity: 0.65,
      clearcoat: 0.25,
      clearcoatRoughness: 0.45,
    })
  );
  counter.position.set(0, 0.54, depth / 2 - 0.35);
  counter.castShadow = true;
  g.add(counter);

  const sideGeo = new RoundedBoxGeometry(0.12, height * 0.65, depth * 0.88, seg, rad * 0.5);
  const sideMat = new THREE.MeshPhysicalMaterial({
    color: COL.surface,
    metalness: 0.12,
    roughness: 0.88,
    envMapIntensity: 0.4,
  });
  const sL = new THREE.Mesh(sideGeo, sideMat);
  sL.position.set(-width / 2 + 0.08, 0.08 + (height * 0.65) / 2, 0);
  const sR = sL.clone();
  sR.position.x = width / 2 - 0.08;
  g.add(sL, sR);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.35, height * 0.25),
    new THREE.MeshPhysicalMaterial({
      color: 0x050a14,
      emissive: 0x2a5080,
      emissiveIntensity: 0.55,
      metalness: 0.35,
      roughness: 0.25,
      envMapIntensity: 0.5,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
    })
  );
  screen.position.set(0, height * 0.48, -depth / 2 + 0.09);
  g.add(screen);

  g.userData.broker = broker as unknown as Record<string, unknown>;
  g.userData.isBooth = true;
  return g;
}

export function distributeCenters(count: number, unit: number): number[] {
  if (count <= 0) return [];
  const step = Math.max(unit * 1.15, unit + 1);
  const total = (count - 1) * step;
  const start = -total / 2;
  return Array.from({ length: count }, (_, i) => start + i * (total / Math.max(count - 1, 1)));
}

export function buildHall(
  scene: THREE.Scene,
  brokers: Broker[],
  assets: LoadedAssets
): THREE.Group[] {
  const booths: THREE.Group[] = [];

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALL.w, HALL.d), assets.floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(HALL.w * 0.92, 8), assets.carpetMat);
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.003, 0);
  carpet.receiveShadow = true;
  scene.add(carpet);

  const wallMat = assets.wallMat;

  const north = new THREE.Mesh(new THREE.BoxGeometry(HALL.w, HALL.ceiling, 0.8), wallMat);
  north.position.set(0, HALL.ceiling / 2, -HALL.d / 2);
  north.castShadow = true;
  north.receiveShadow = true;
  scene.add(north);

  const south = new THREE.Mesh(new THREE.BoxGeometry(HALL.w, HALL.ceiling, 0.8), wallMat);
  south.position.set(0, HALL.ceiling / 2, HALL.d / 2);
  south.castShadow = true;
  south.receiveShadow = true;
  scene.add(south);

  const east = new THREE.Mesh(new THREE.BoxGeometry(0.8, HALL.ceiling, HALL.d), wallMat);
  east.position.set(HALL.w / 2, HALL.ceiling / 2, 0);
  east.castShadow = true;
  east.receiveShadow = true;
  scene.add(east);

  const west = new THREE.Mesh(new THREE.BoxGeometry(0.8, HALL.ceiling, HALL.d), wallMat);
  west.position.set(-HALL.w / 2, HALL.ceiling / 2, 0);
  west.castShadow = true;
  west.receiveShadow = true;
  scene.add(west);

  const trussMat = assets.trussMat;
  for (let x = -HALL.w / 2 + 4; x < HALL.w / 2; x += 8) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, HALL.d - 2), trussMat);
    beam.position.set(x, HALL.ceiling - 0.4, 0);
    beam.castShadow = true;
    scene.add(beam);
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.06, HALL.d - 2),
      new THREE.MeshPhysicalMaterial({
        color: 0xffeedd,
        emissive: 0xffe8cc,
        emissiveIntensity: 1.8,
        metalness: 0.15,
        roughness: 0.45,
        toneMapped: false,
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
    new THREE.MeshPhysicalMaterial({
      color: 0xe8192c,
      emissive: 0xe8192c,
      emissiveIntensity: 2.5,
      metalness: 0.25,
      roughness: 0.35,
      toneMapped: false,
    })
  );
  archLed.position.set(0, archH - 0.5, archZ + 0.5);
  scene.add(archLed);

  const entranceTex = makeLabelTexture("ExpoVR", "Powered by mybestbrokers.com", { h: 320, mainPx: 96, subPx: 32 });
  const entrancePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 4.5),
    new THREE.MeshPhysicalMaterial({
      map: entranceTex,
      transparent: true,
      depthWrite: false,
      metalness: 0,
      roughness: 0.9,
      emissive: 0xffffff,
      emissiveIntensity: 0.15,
      envMapIntensity: 0.3,
    })
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
    tex.anisotropy = 16;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 1.9),
      new THREE.MeshPhysicalMaterial({
        map: tex,
        emissive: color,
        emissiveIntensity: 0.4,
        metalness: 0.65,
        roughness: 0.28,
        transparent: true,
        side: THREE.DoubleSide,
        envMapIntensity: 0.5,
      })
    );
    mesh.position.set(0, 10.2, z);
    mesh.rotation.x = -0.12;
    scene.add(mesh);
  };

  rowSign("TITANIUM SPONSORS", -35, 0xd4a843);
  rowSign("DIAMOND SPONSORS", -10, 0xc0c8d4);
  rowSign("GOLD EXHIBITORS", 18, 0xb87333);

  const ambient = new THREE.AmbientLight(0x4a5a78, 0.22);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x9db4d8, 0x06080c, 0.35);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfff5e8, 1.35);
  key.position.set(28, 42, 22);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  key.shadow.camera.near = 5;
  key.shadow.camera.far = 200;
  key.shadow.camera.left = -70;
  key.shadow.camera.right = 70;
  key.shadow.camera.top = 70;
  key.shadow.camera.bottom = -70;
  key.shadow.bias = -0.00015;
  key.shadow.normalBias = 0.025;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x8899ff, 0.35);
  fill.position.set(-40, 25, -10);
  scene.add(fill);

  for (const z of [-35, -10, 18]) {
    const pl = new THREE.PointLight(0xffe6cc, 18, 95, 2);
    pl.position.set(0, 9.5, z);
    pl.castShadow = false;
    scene.add(pl);
  }

  return booths;
}
