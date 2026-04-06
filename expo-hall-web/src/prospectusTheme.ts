import * as THREE from "three";

/**
 * Visual language aligned with Forex Expo Dubai / WTC trade-show prospectus:
 * deep hall navy, champagne gold, warm cream floors, crimson accent (not a pixel-perfect PDF trace).
 */
export const PROSPECTUS = {
  hallNavy: 0x0a101c,
  fog: 0x080d18,
  gold: 0xc9a84c,
  cream: 0xf2ebe0,
  crimson: 0xc41e3a,
  ink: 0x05080e,
  runner: 0x8c1a2a, // Deep red carpet runner
} as const;

/** Canvas texture for the south entrance arch (replaces generic ExpoVR slab). */
export function makeProspectusEntranceTexture(): THREE.CanvasTexture {
  const w = 2048;
  const h = 640;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#121a2a");
  g.addColorStop(0.45, "#0c1424");
  g.addColorStop(1, "#060a12");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(201,168,76,0.85)";
  ctx.lineWidth = 6;
  ctx.strokeRect(48, 48, w - 96, h - 96);

  ctx.fillStyle = "#c9a84c";
  ctx.font = '700 112px "Barlow Condensed", "Arial Narrow", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "0.08em";
  ctx.fillText("FOREX EXPO DUBAI", w / 2, h * 0.38);

  ctx.fillStyle = "#f2ebe0";
  ctx.font = '400 34px "DM Sans", sans-serif';
  ctx.letterSpacing = "0.02em";
  ctx.fillText("Dubai World Trade Centre · MENA", w / 2, h * 0.52);

  ctx.fillStyle = "#00c896";
  ctx.font = '500 28px "DM Sans", sans-serif';
  ctx.fillText("ExpoVR · Powered by mybestbrokers.com", w / 2, h * 0.68);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.needsUpdate = true;
  return tex;
}
