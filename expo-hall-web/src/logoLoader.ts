import * as THREE from "three";

/** Try several CORS-friendly favicon endpoints; composite onto a canvas for the booth back wall. */
const FAVICON_URLS = (domain: string) => [
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=256`,
  `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
];

/** Deterministic “real” portrait URLs (RandomUser stock photos — demo only, not broker staff). */
export function representativePhotoUrl(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = Math.abs(h) % 99;
  const women = (Math.abs(h >> 8) & 1) === 0;
  const gender = women ? "women" : "men";
  return `https://randomuser.me/api/portraits/${gender}/${idx}.jpg`;
}

/** Same URL as `loadPortraitTexture` — for HTML `<img>` in the side panel. */
export function representativePortraitUrl(seed: string): string {
  return representativePhotoUrl(seed);
}

export function makeBrandedBackWallTexture(
  broker: { name: string; code: string; primary: string },
  logoImage: HTMLImageElement | null
): THREE.CanvasTexture {
  const w = 1024;
  const h = 1024;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#f7f4ef");
  grad.addColorStop(1, "#e2dcd2");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const pad = 48;
  if (logoImage && logoImage.complete && logoImage.naturalWidth > 0) {
    const maxW = w - pad * 2;
    const maxH = h * 0.55;
    const scale = Math.min(maxW / logoImage.naturalWidth, maxH / logoImage.naturalHeight, 2.5);
    const lw = logoImage.naturalWidth * scale;
    const lh = logoImage.naturalHeight * scale;
    ctx.drawImage(logoImage, (w - lw) / 2, pad + 40, lw, lh);
  } else {
    ctx.fillStyle = broker.primary;
    ctx.fillRect(pad, pad + 60, w - pad * 2, 200);
    ctx.fillStyle = "#ffffff";
    ctx.font = 'bold 120px "Barlow Condensed", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(broker.code, w / 2, pad + 60 + 100);
  }

  ctx.fillStyle = "#141a24";
  ctx.font = '600 52px "DM Sans", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(broker.name, w / 2, h * 0.72);

  ctx.fillStyle = "rgba(20,26,36,0.55)";
  ctx.font = '400 26px "DM Sans", sans-serif';
  ctx.fillText("Forex Expo Dubai · WTC · MENA", w / 2, h * 0.8);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.needsUpdate = true;
  return tex;
}

export async function fetchFaviconImage(domain: string): Promise<HTMLImageElement | null> {
  for (const url of FAVICON_URLS(domain)) {
    const img = await tryLoadImage(url);
    if (img && img.naturalWidth > 16 && img.naturalHeight > 16) {
      return img;
    }
  }
  return null;
}

function tryLoadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function loadPortraitTexture(seed: string): Promise<THREE.Texture> {
  const url = representativePhotoUrl(seed);
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.generateMipmaps = true;
        resolve(tex);
      },
      undefined,
      () => {
        const c = document.createElement("canvas");
        c.width = 128;
        c.height = 128;
        const g = c.getContext("2d")!;
        g.fillStyle = "#cbd5e1";
        g.fillRect(0, 0, 128, 128);
        g.fillStyle = "#475569";
        g.font = "bold 48px sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("?", 64, 64);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        resolve(t);
      }
    );
  });
}
