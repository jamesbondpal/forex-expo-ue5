import * as THREE from "three";

/** Simple expo visitors walking between aisles (stylized capsules). */
export function addCrowd(scene: THREE.Scene, count: number): THREE.Group[] {
  const walkers: THREE.Group[] = [];
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x2a3140,
    metalness: 0.2,
    roughness: 0.75,
    envMapIntensity: 0.35,
  });
  const accent = [0x3d4f6f, 0x4a5568, 0x2d3748, 0x1e293b];

  for (let i = 0; i < count; i++) {
    const g = new THREE.Group();
    const h = 1.55 + Math.random() * 0.2;
    const r = 0.14 + Math.random() * 0.03;
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(r, h - 2 * r - 0.12, 4, 8),
      bodyMat.clone()
    );
    (body.material as THREE.MeshPhysicalMaterial).color.setHex(accent[i % accent.length]!);
    body.position.y = 0.05 + (h - 2 * r - 0.12) / 2 + r;
    body.castShadow = true;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), bodyMat.clone());
    head.position.y = body.position.y + (h - 2 * r - 0.12) / 2 + r + 0.11;
    head.castShadow = true;

    g.add(body, head);
    g.position.set(
      (Math.random() - 0.5) * 118,
      0,
      (Math.random() - 0.5) * 78
    );
    g.userData.walkSpeed = 0.4 + Math.random() * 0.5;
    g.userData.walkAngle = Math.random() * Math.PI * 2;
    g.userData.phase = Math.random() * Math.PI * 2;
    scene.add(g);
    walkers.push(g);
  }
  return walkers;
}

export function animateCrowd(walkers: THREE.Group[], dt: number, hall: { w: number; d: number }) {
  const t = performance.now() * 0.001;
  for (const g of walkers) {
    let ang = g.userData.walkAngle as number;
    const spd = 2.2 * (g.userData.walkSpeed as number);
    const ph = g.userData.phase as number;
    ang += Math.sin(t * 0.7 + ph) * 0.04;
    g.position.x += Math.cos(ang) * spd * dt;
    g.position.z += Math.sin(ang) * spd * dt;
    g.position.x = THREE.MathUtils.clamp(g.position.x, -hall.w / 2 + 4, hall.w / 2 - 4);
    g.position.z = THREE.MathUtils.clamp(g.position.z, -hall.d / 2 + 6, hall.d / 2 - 10);
    if (g.position.x <= -hall.w / 2 + 4.1 || g.position.x >= hall.w / 2 - 4.1) {
      g.userData.walkAngle = Math.PI - ang + (Math.random() - 0.5) * 0.8;
    }
    if (g.position.z <= -hall.d / 2 + 6.1 || g.position.z >= hall.d / 2 - 10.1) {
      g.userData.walkAngle = -ang + (Math.random() - 0.5) * 0.8;
    }
    g.rotation.y = -ang + Math.PI / 2;
  }
}
