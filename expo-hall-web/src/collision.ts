import * as THREE from "three";

export interface BoothCollider {
  halfW: number;
  halfD: number;
}

/** Push a circular player footprint out of axis-aligned booth footprints (XZ). */
export function resolveBoothCollisions(pos: THREE.Vector3, booths: THREE.Group[], radius: number): void {
  for (const g of booths) {
    const c = g.userData.collider as BoothCollider | undefined;
    if (!c) continue;
    const bx = g.position.x;
    const bz = g.position.z;
    const minX = bx - c.halfW;
    const maxX = bx + c.halfW;
    const minZ = bz - c.halfD;
    const maxZ = bz + c.halfD;
    const qx = THREE.MathUtils.clamp(pos.x, minX, maxX);
    const qz = THREE.MathUtils.clamp(pos.z, minZ, maxZ);
    let dx = pos.x - qx;
    let dz = pos.z - qz;
    const d2 = dx * dx + dz * dz;
    const r2 = radius * radius;
    if (d2 >= r2) continue;
    if (d2 < 1e-10) {
      const penL = pos.x - minX;
      const penR = maxX - pos.x;
      const penB = pos.z - minZ;
      const penF = maxZ - pos.z;
      const m = Math.min(penL, penR, penB, penF);
      if (m === penL) pos.x = minX - radius;
      else if (m === penR) pos.x = maxX + radius;
      else if (m === penB) pos.z = minZ - radius;
      else pos.z = maxZ + radius;
      continue;
    }
    const d = Math.sqrt(d2);
    const push = (radius - d) / d;
    pos.x += dx * push;
    pos.z += dz * push;
  }
}
