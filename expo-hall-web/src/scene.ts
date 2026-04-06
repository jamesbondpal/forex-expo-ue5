import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Broker } from "./brokers";
import type { LoadedAssets } from "./assets";
import { fetchFaviconImage, loadPortraitTexture, makeBrandedBackWallTexture } from "./logoLoader";
import { makeProspectusEntranceTexture, PROSPECTUS } from "./prospectusTheme";

/** Wider hall + taller ceiling for trade-show scale; aisles enforced in `distributeWithAisles`. */
export const HALL = { w: 132, d: 90, ceiling: 14 };
export const COL = { hall: PROSPECTUS.hallNavy, surface: 0x0c121f, fog: PROSPECTUS.fog };

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

/** Suit body + large photoreal portrait plane (faces the aisle / visitor). */
function addStaffFigure(parent: THREE.Group, broker: Broker, portraitMap: THREE.Texture, xOff: number, depth: number) {
  const g = new THREE.Group();
  const r = 0.14;
  const torsoLen = 0.74;
  const suit = new THREE.MeshPhysicalMaterial({
    color: broker.secondary,
    metalness: 0.22,
    roughness: 0.58,
    envMapIntensity: 0.5,
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(r, torsoLen, 8, 16), suit);
  const yBot = 0.08 + r + torsoLen / 2;
  body.position.y = yBot;
  body.castShadow = true;

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.66),
    new THREE.MeshPhysicalMaterial({
      map: portraitMap,
      metalness: 0,
      roughness: 0.32,
      envMapIntensity: 0.22,
    })
  );
  face.position.set(0, yBot + torsoLen / 2 + r + 0.02, r * 1.15);

  g.add(body, face);
  g.position.set(xOff, 0, -depth * 0.2);
  parent.add(g);
}

function buildBoothMeshes(
  broker: Broker,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  backWallTex: THREE.CanvasTexture,
  portraitTex: [THREE.Texture, THREE.Texture]
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

  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.99, height * 0.74, 0.06),
    new THREE.MeshPhysicalMaterial({
      color: 0xd8dce4,
      metalness: 0.05,
      roughness: 0.85,
    })
  );
  backing.position.set(0, 0.08 + (height * 0.74) / 2, -depth / 2 + 0.05);
  g.add(backing);

  const logoWall = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.92, height * 0.62),
    new THREE.MeshPhysicalMaterial({
      map: backWallTex,
      metalness: 0.04,
      roughness: 0.55,
      envMapIntensity: 0.45,
      clearcoat: 0.08,
      clearcoatRoughness: 0.4,
    })
  );
  logoWall.position.set(0, 0.08 + (height * 0.62) / 2 + 0.1, -depth / 2 + 0.1);
  g.add(logoWall);

  const fascia = new THREE.Mesh(
    new RoundedBoxGeometry(width * 1.02, 0.55, 0.2, seg, rad),
    new THREE.MeshPhysicalMaterial({
      color: prim,
      emissive: prim,
      emissiveIntensity: 2.2,
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
      emissiveIntensity: 3.5,
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
    new THREE.PlaneGeometry(width * 0.32, height * 0.14),
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
  screen.position.set(width * 0.22, height * 0.78, -depth / 2 + 0.11);
  g.add(screen);

  const sx = width * 0.22;
  addStaffFigure(g, broker, portraitTex[0]!, -sx, depth);
  addStaffFigure(g, broker, portraitTex[1]!, sx, depth);

  g.userData.broker = broker as unknown as Record<string, unknown>;
  g.userData.isBooth = true;
  g.userData.collider = { halfW: width * 0.5, halfD: depth * 0.5 };
  return g;
}

async function createBoothAsync(
  broker: Broker,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number
): Promise<THREE.Group> {
  const logoImg = await fetchFaviconImage(broker.domain);
  const backWallTex = makeBrandedBackWallTexture(
    { name: broker.name, code: broker.code, primary: broker.primary },
    logoImg
  );
  const [p0, p1] = await Promise.all([
    loadPortraitTexture(broker.representatives[0].portraitSeed),
    loadPortraitTexture(broker.representatives[1].portraitSeed),
  ]);
  return buildBoothMeshes(broker, x, z, width, depth, height, backWallTex, [p0, p1]);
}

/** Minimum ~`aisleMin` meters clear between booth side edges along X. */
export function distributeWithAisles(count: number, boothWidth: number, aisleMin = 6): number[] {
  if (count <= 0) return [];
  const step = boothWidth + aisleMin;
  const total = (count - 1) * step;
  const start = -total / 2;
  return Array.from({ length: count }, (_, i) => start + i * (total / Math.max(count - 1, 1)));
}

export async function buildHall(
  scene: THREE.Scene,
  brokers: Broker[],
  assets: LoadedAssets,
  onProgress?: (msg: string) => void
): Promise<THREE.Group[]> {
  const booths: THREE.Group[] = [];

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALL.w, HALL.d), assets.floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(HALL.w * 0.92, 9), assets.carpetMat);
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.003, 0);
  carpet.receiveShadow = true;
  scene.add(carpet);

  const runner = new THREE.Mesh(
    new THREE.PlaneGeometry(11, HALL.d * 0.92),
    new THREE.MeshPhysicalMaterial({
      color: PROSPECTUS.runner,
      metalness: 0.02,
      roughness: 0.88,
      envMapIntensity: 0.25,
      clearcoat: 0.06,
      clearcoatRoughness: 0.55,
    })
  );
  runner.rotation.x = -Math.PI / 2;
  runner.position.set(0, 0.006, 0);
  runner.receiveShadow = true;
  scene.add(runner);

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
        emissiveIntensity: 3.0,
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

  const entranceTex = makeProspectusEntranceTexture();
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

  const tiX = distributeWithAisles(ti.length, 14, 6);
  const diX = distributeWithAisles(di.length, 9, 5);
  const goX = distributeWithAisles(go.length, 6, 4);

  const rowTitaniumZ = -42;
  const rowDiamondZ = -14;
  const rowGoldZ = 22;

  onProgress?.("Building booths (logos & representatives)…");
  const tiBooths = await Promise.all(ti.map((b, i) => createBoothAsync(b, tiX[i]!, rowTitaniumZ, 14, 8, 7)));
  const diBooths = await Promise.all(di.map((b, i) => createBoothAsync(b, diX[i]!, rowDiamondZ, 9, 6, 5)));
  const goBooths = await Promise.all(go.map((b, i) => createBoothAsync(b, goX[i]!, rowGoldZ, 6, 5, 4)));

  for (const b of [...tiBooths, ...diBooths, ...goBooths]) {
    scene.add(b);
    booths.push(b);
  }

  const rowSign = (text: string, z: number, color: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1536;
    canvas.height = 200;
    const ctx = canvas.getContext("2d")!;
    const bg = ctx.createLinearGradient(0, 0, canvas.width, 0);
    bg.addColorStop(0, "#05080e");
    bg.addColorStop(0.5, "#0c1528");
    bg.addColorStop(1, "#05080e");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(201,168,76,0.5)";
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 20, canvas.width - 48, canvas.height - 40);
    ctx.font = "700 84px Barlow Condensed, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = `#${new THREE.Color(color).getHexString()}`;
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 28;
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
    mesh.position.set(0, 11.2, z);
    mesh.rotation.x = -0.1;
    scene.add(mesh);
  };

  rowSign("TITANIUM SPONSORS", rowTitaniumZ, 0xd4a843);
  rowSign("DIAMOND SPONSORS", rowDiamondZ, 0xc0c8d4);
  rowSign("GOLD EXHIBITORS", rowGoldZ, 0xb87333);

  // === DRAMATIC LIGHTING SYSTEM ===

  // Subtle ambient — keep it dark for drama
  const ambient = new THREE.AmbientLight(0x3a4a64, 0.08);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x8090b0, 0x040608, 0.25);
  scene.add(hemi);

  // Key directional — warm, with high quality shadows
  const key = new THREE.DirectionalLight(0xfff2e0, 1.8);
  key.position.set(32, 48, 28);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  key.shadow.camera.near = 5;
  key.shadow.camera.far = 200;
  key.shadow.camera.left = -82;
  key.shadow.camera.right = 82;
  key.shadow.camera.top = 78;
  key.shadow.camera.bottom = -78;
  key.shadow.bias = -0.00015;
  key.shadow.normalBias = 0.025;
  scene.add(key);

  // Cool fill from opposite side
  const fill = new THREE.DirectionalLight(0x6080c0, 0.35);
  fill.position.set(-48, 32, -18);
  scene.add(fill);

  // Warm rim light from behind
  const rim = new THREE.DirectionalLight(0xffd8a8, 0.6);
  rim.position.set(0, 18, -40);
  scene.add(rim);

  // === BOOTH-SPECIFIC COLORED KEY LIGHTS ===
  // Each broker row gets strong colored RectAreaLights
  const boothColors: Record<string, number> = {
    titanium: 0xff3333,   // deep red for titanium row
    diamond:  0x00ccaa,   // electric teal
    gold:     0xffbb33,   // warm gold
  };

  const rowPositions: [string, number][] = [
    ["titanium", rowTitaniumZ],
    ["diamond", rowDiamondZ],
    ["gold", rowGoldZ],
  ];

  for (const [tier, z] of rowPositions) {
    const color = boothColors[tier] ?? 0xffffff;

    // Large overhead RectAreaLight — 16m × 5m
    const rl = new THREE.RectAreaLight(color, 18, 16, 5);
    rl.position.set(0, HALL.ceiling - 0.8, z);
    rl.rotation.x = -Math.PI / 2;
    scene.add(rl);

    // Warm white fill for each row
    const rowFill = new THREE.PointLight(0xfff0d8, 15, 80, 2);
    rowFill.position.set(0, 10.5, z);
    scene.add(rowFill);

    // Side accent spots for each row
    for (const side of [-1, 1]) {
      const spot = new THREE.SpotLight(color, 35, 60, Math.PI / 8, 0.5, 2);
      spot.position.set(side * 28, HALL.ceiling - 1, z);
      spot.target.position.set(0, 0, z);
      scene.add(spot, spot.target);
    }
  }

  // === DUST PARTICLES ===
  const dustCount = 800;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  const dustSizes = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * HALL.w;
    dustPos[i * 3 + 1] = Math.random() * HALL.ceiling;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * HALL.d;
    dustSizes[i] = 0.02 + Math.random() * 0.06;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute("size", new THREE.BufferAttribute(dustSizes, 1));

  const dustMat = new THREE.PointsMaterial({
    color: 0xffeedd,
    size: 0.04,
    transparent: true,
    opacity: 0.3,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dustParticles = new THREE.Points(dustGeo, dustMat);
  dustParticles.userData.isDust = true;
  scene.add(dustParticles);

  // === ANIMATED NEON WALL STRIPS ===
  const neonMat = new THREE.MeshPhysicalMaterial({
    color: 0x00aaff,
    emissive: 0x0088ff,
    emissiveIntensity: 2.5,
    metalness: 0.5,
    roughness: 0.15,
    toneMapped: false,
  });
  const neonGeo = new THREE.BoxGeometry(HALL.w - 4, 0.08, 0.08);

  for (const y of [2.0, 4.5]) {
    // North wall strip
    const n = new THREE.Mesh(neonGeo, neonMat.clone());
    n.position.set(0, y, -HALL.d / 2 + 0.5);
    n.userData.isNeon = true;
    n.userData.neonPhase = y * 1.5;
    scene.add(n);

    // South wall strip
    const s = new THREE.Mesh(neonGeo, neonMat.clone());
    s.position.set(0, y, HALL.d / 2 - 0.5);
    s.userData.isNeon = true;
    s.userData.neonPhase = y * 1.5 + 1.0;
    scene.add(s);
  }

  // East/West wall vertical strips
  const vertNeonGeo = new THREE.BoxGeometry(0.08, HALL.ceiling * 0.6, 0.08);
  for (const x of [-HALL.w / 2 + 0.5, HALL.w / 2 - 0.5]) {
    for (let zz = -HALL.d / 2 + 12; zz < HALL.d / 2 - 5; zz += 18) {
      const vn = new THREE.Mesh(vertNeonGeo, neonMat.clone());
      vn.position.set(x, HALL.ceiling * 0.35, zz);
      vn.userData.isNeon = true;
      vn.userData.neonPhase = zz * 0.1;
      scene.add(vn);
    }
  }

  return booths;
}
