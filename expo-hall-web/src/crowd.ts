import * as THREE from "three";

/* ── Palette arrays for variety ─────────────────────────────────────── */

const SKIN_TONES = [0xf5d0b0, 0xd4a574, 0xc68642, 0x8d5524, 0x5c3a1e];

const SUIT_COLORS = [
  0x1b2a4a, // dark navy
  0x2d2d2d, // charcoal
  0x111111, // near-black
  0x1a3a3a, // dark teal
  0x3b2314, // dark brown
  0x4a4a4a, // grey
];

const LIGHT_CLOTHES = [0xc8b89a, 0xb0b0b0]; // beige, light grey

/* ── Helper: build one human figure ─────────────────────────────────── */

function buildFigure(): THREE.Group {
  const g = new THREE.Group();

  // --- randomised dimensions ---
  const height = 1.55 + Math.random() * 0.3; // 1.55 – 1.85
  const skinHex = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)]!;
  const isLight = Math.random() < 0.1;
  const clothHex = isLight
    ? LIGHT_CLOTHES[Math.floor(Math.random() * LIGHT_CLOTHES.length)]!
    : SUIT_COLORS[Math.floor(Math.random() * SUIT_COLORS.length)]!;

  // Proportions derived from height
  const legLen = height * 0.46;
  const torsoLen = height * 0.34;
  const headR = 0.12;
  const legR = 0.045;
  const torsoR = 0.13;
  const legGap = 0.07;

  // --- skin material (head) ---
  const skinMat = new THREE.MeshPhysicalMaterial({
    color: skinHex,
    roughness: 0.55,
    metalness: 0.0,
    emissive: 0x331a0a,
    emissiveIntensity: 0.15,
    envMapIntensity: 0.3,
  });

  // --- clothing material ---
  const clothMat = new THREE.MeshPhysicalMaterial({
    color: clothHex,
    roughness: 0.75,
    metalness: 0.15,
    envMapIntensity: 0.35,
  });

  // --- legs ---
  const legGeo = new THREE.CapsuleGeometry(legR, legLen - 2 * legR, 6, 12);
  const pantMat = clothMat.clone();
  // Pants slightly darker than jacket
  pantMat.color.offsetHSL(0, 0, -0.05);

  const leftLeg = new THREE.Mesh(legGeo, pantMat);
  leftLeg.position.set(-legGap, legLen / 2, 0);
  leftLeg.castShadow = true;

  const rightLeg = new THREE.Mesh(legGeo, pantMat);
  rightLeg.position.set(legGap, legLen / 2, 0);
  rightLeg.castShadow = true;

  // --- torso / jacket ---
  const torsoGeo = new THREE.CapsuleGeometry(torsoR, torsoLen - 2 * torsoR, 8, 16);
  const torso = new THREE.Mesh(torsoGeo, clothMat);
  torso.position.y = legLen + torsoLen / 2;
  torso.castShadow = true;

  // --- shirt collar (white ring at neck) ---
  const collarGeo = new THREE.TorusGeometry(0.06, 0.01, 4, 8);
  const collarMat = new THREE.MeshPhysicalMaterial({
    color: 0xf0f0f0,
    roughness: 0.6,
    metalness: 0.0,
  });
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.position.y = legLen + torsoLen - 0.02;
  collar.rotation.x = Math.PI / 2;

  // --- head ---
  const headGeo = new THREE.SphereGeometry(headR, 32, 32);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = legLen + torsoLen + headR + 0.02;
  head.castShadow = true;

  // --- eye highlights ---
  const eyeGeo = new THREE.SphereGeometry(0.015, 8, 8);
  const eyeMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.0,
  });

  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.04, 0.02, headR - 0.01);
  head.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.04, 0.02, headR - 0.01);
  head.add(rightEye);

  // --- assemble ---
  g.add(leftLeg, rightLeg, torso, collar, head);

  // Store head reference for animation
  g.userData.headMesh = head;

  return g;
}

/* ── Public API ──────────────────────────────────────────────────────── */

/** Spawn life-like expo visitors that walk between aisles. */
export function addCrowd(scene: THREE.Scene, count: number): THREE.Group[] {
  const walkers: THREE.Group[] = [];

  for (let i = 0; i < count; i++) {
    const g = buildFigure();

    g.position.set(
      (Math.random() - 0.5) * 118,
      0,
      (Math.random() - 0.5) * 78,
    );

    g.userData.walkSpeed = 0.4 + Math.random() * 0.5;
    g.userData.walkAngle = Math.random() * Math.PI * 2;
    g.userData.phase = Math.random() * Math.PI * 2;

    scene.add(g);
    walkers.push(g);
  }

  return walkers;
}

/** Animate crowd — walking, breathing bob, head micro-movement. */
export function animateCrowd(
  walkers: THREE.Group[],
  dt: number,
  hall: { w: number; d: number },
): void {
  const t = performance.now() * 0.001;

  for (const g of walkers) {
    let ang = g.userData.walkAngle as number;
    const spd = 2.2 * (g.userData.walkSpeed as number);
    const ph = g.userData.phase as number;

    // Gentle steering — smoother turns than before
    ang += Math.sin(t * 0.5 + ph) * 0.025;

    g.position.x += Math.cos(ang) * spd * dt;
    g.position.z += Math.sin(ang) * spd * dt;

    // Wall clamping
    g.position.x = THREE.MathUtils.clamp(g.position.x, -hall.w / 2 + 4, hall.w / 2 - 4);
    g.position.z = THREE.MathUtils.clamp(g.position.z, -hall.d / 2 + 6, hall.d / 2 - 10);

    // Bounce off walls with gentler deflection
    if (g.position.x <= -hall.w / 2 + 4.1 || g.position.x >= hall.w / 2 - 4.1) {
      g.userData.walkAngle = Math.PI - ang + (Math.random() - 0.5) * 0.4;
    }
    if (g.position.z <= -hall.d / 2 + 6.1 || g.position.z >= hall.d / 2 - 10.1) {
      g.userData.walkAngle = -ang + (Math.random() - 0.5) * 0.4;
    }

    g.userData.walkAngle = ang;

    // Face walking direction
    g.rotation.y = -ang + Math.PI / 2;

    // Breathing bob — subtle Y oscillation
    g.position.y = Math.sin(t * 1.5 + ph) * 0.008;

    // Head micro-movement
    const head = g.userData.headMesh as THREE.Mesh | undefined;
    if (head) {
      head.rotation.y = Math.sin(t * 0.8 + ph) * 0.05;
    }
  }
}
