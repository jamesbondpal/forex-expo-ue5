import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { HALL } from "./scene";

function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  const normalized = base.endsWith("/") ? base : `${base}/`;
  return `${normalized}${path.replace(/^\//, "")}`;
}

/** UE-style: visible HDRI sky (same file as PMREM source) + optional blur for softer horizon. */
export function applyHdrSkybox(
  scene: THREE.Scene,
  equirect: THREE.Texture,
  opts: { intensity?: number; blurriness?: number } = {}
): void {
  scene.background = equirect;
  scene.backgroundIntensity = opts.intensity ?? 0.82;
  scene.backgroundBlurriness = opts.blurriness ?? 0.14;
}

/** Clear skybox before disposing the underlying HDR texture. */
export function clearHdrSkybox(scene: THREE.Scene): void {
  scene.background = null;
  scene.backgroundIntensity = 1;
  scene.backgroundBlurriness = 0;
}

export interface GltfInstance {
  /** Path under /public, e.g. `models/foo.glb` */
  url: string;
  x: number;
  z: number;
  ry: number;
  scale: number;
}

/** Demo layout — swap URLs for your own baked / high-poly exhibition assets. */
export const DEFAULT_GLTF_PROPS: GltfInstance[] = [
  { url: "models/duck.glb", x: -40, z: -40, ry: 0.5, scale: 4 },
  { url: "models/duck.glb", x: 42, z: -40, ry: -0.4, scale: 4 },
  { url: "models/duck.glb", x: -36, z: -14, ry: 2.1, scale: 3.5 },
  { url: "models/duck.glb", x: 34, z: -14, ry: -1.8, scale: 3.5 },
  { url: "models/duck.glb", x: -28, z: 22, ry: 0.9, scale: 3 },
  { url: "models/duck.glb", x: 30, z: 22, ry: -1.2, scale: 3 },
];

function snapRootToGround(root: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(root);
  root.position.y -= box.min.y;
}

function applyEnvToObject(root: THREE.Object3D, envMap: THREE.Texture, intensity = 1.05): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat || typeof mat !== "object") continue;
      const m = mat as THREE.MeshStandardMaterial & { lightMapIntensity?: number };
      m.envMap = envMap;
      m.envMapIntensity = intensity;
      if ("aoMapIntensity" in m && m.aoMapIntensity === undefined) m.aoMapIntensity = 1;
    }
  });
}

/**
 * Load glTF / glB props (baked lightmaps & AO in albedo/occlusion are respected by GLTFLoader).
 */
export async function loadGltfProps(
  scene: THREE.Scene,
  envMap: THREE.Texture,
  instances: GltfInstance[],
  onProgress?: (msg: string) => void
): Promise<THREE.Group[]> {
  const loader = new GLTFLoader();
  const roots: THREE.Group[] = [];
  const cache = new Map<string, THREE.Group>();

  for (let i = 0; i < instances.length; i++) {
    const inst = instances[i]!;
    const url = publicUrl(inst.url);
    onProgress?.(`Loading 3D props (${i + 1}/${instances.length})…`);
    try {
      let proto = cache.get(url);
      if (!proto) {
        const gltf = await loader.loadAsync(url);
        proto = gltf.scene;
        cache.set(url, proto);
      }
      const root = proto.clone(true);
      root.position.set(inst.x, 0, inst.z);
      root.rotation.y = inst.ry;
      root.scale.setScalar(inst.scale);
      applyEnvToObject(root, envMap);
      snapRootToGround(root);
      scene.add(root);
      roots.push(root);
    } catch (e) {
      console.warn(`[ueStyleVisuals] Skipping prop ${inst.url}:`, e);
    }
  }
  return roots;
}

export interface VideoBackdropHandle {
  group: THREE.Group;
  dispose: () => void;
}

/**
 * Optional **north** half-dome with a video texture (equirectangular-style MP4 works best).
 * Place file at `public/video/hall-backdrop.mp4` or pass a custom URL.
 */
export async function tryAddVideoBackdrop(
  scene: THREE.Scene,
  hall: typeof HALL,
  videoPath = "video/hall-backdrop.mp4"
): Promise<VideoBackdropHandle | null> {
  const url = publicUrl(videoPath);
  const video = document.createElement("video");
  video.src = url;
  video.crossOrigin = "anonymous";
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.preload = "auto";

  const canPlay = await new Promise<boolean>((resolve) => {
    const ok = () => resolve(true);
    const bad = () => resolve(false);
    video.addEventListener("loadeddata", ok, { once: true });
    video.addEventListener("error", bad, { once: true });
    video.load();
  });
  if (!canPlay) return null;

  const play = video.play();
  if (play) await play.catch(() => {});

  const tex = new THREE.VideoTexture(video);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;

  const radius = Math.max(hall.w, hall.d) * 0.85;
  const geo = new THREE.SphereGeometry(radius, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.BackSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  const group = new THREE.Group();
  group.position.set(0, hall.ceiling * 0.35, -hall.d * 0.52);
  group.add(mesh);
  scene.add(group);

  const dispose = () => {
    scene.remove(group);
    geo.dispose();
    mat.dispose();
    tex.dispose();
    video.pause();
    video.removeAttribute("src");
    video.load();
  };

  return { group, dispose };
}
