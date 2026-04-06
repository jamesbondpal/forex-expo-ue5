import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/**
 * Same-origin assets under /public/polyhaven (no CORS).
 * Poly Haven CC0 — see https://polyhaven.com
 */
function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  const normalized = base.endsWith("/") ? base : `${base}/`;
  return `${normalized}polyhaven/${path}`;
}

const HDR_PATH = "hdr/brown_photostudio_06_1k.hdr";

const MARBLE = {
  diff: "textures/marble_01/marble_01_diff_1k.jpg",
  nor: "textures/marble_01/marble_01_nor_gl_1k.jpg",
  rough: "textures/marble_01/marble_01_rough_1k.jpg",
};

const CONCRETE = {
  diff: "textures/concrete_wall_001/concrete_wall_001_diff_1k.jpg",
  nor: "textures/concrete_wall_001/concrete_wall_001_nor_gl_1k.jpg",
  rough: "textures/concrete_wall_001/concrete_wall_001_rough_1k.jpg",
};

const CARPET = {
  diff: "textures/dirty_carpet/dirty_carpet_diff_1k.jpg",
  rough: "textures/dirty_carpet/dirty_carpet_rough_1k.jpg",
};

function configureRepeat(tex: THREE.Texture, rx: number, ry: number) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  tex.anisotropy = 16;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
}

function configureNonColor(tex: THREE.Texture, rx: number, ry: number) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  tex.anisotropy = 16;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.needsUpdate = true;
}

export interface LoadedAssets {
  envMap: THREE.Texture;
  /** Same HDRI as equirect — use for `scene.background` (UE-style sky) while `envMap` stays the convolved PMREM. */
  backgroundEquirect: THREE.Texture | null;
  disposeEnv: () => void;
  floorMat: THREE.MeshPhysicalMaterial;
  carpetMat: THREE.MeshPhysicalMaterial;
  wallMat: THREE.MeshPhysicalMaterial;
  trussMat: THREE.MeshPhysicalMaterial;
}

export async function loadAssets(
  renderer: THREE.WebGLRenderer,
  onProgress: (msg: string) => void
): Promise<LoadedAssets> {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const loader = new THREE.TextureLoader();

  const loadTex = (relativePath: string) =>
    new Promise<THREE.Texture>((resolve, reject) => {
      loader.load(assetUrl(relativePath), resolve, undefined, reject);
    });

  let envMap: THREE.Texture;
  let backgroundEquirect: THREE.Texture | null = null;
  let disposeEnv: () => void = () => {};

  onProgress("Loading HDRI environment…");
  try {
    const rgbe = new RGBELoader();
    const hdr = await rgbe.loadAsync(assetUrl(HDR_PATH));
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    backgroundEquirect = hdr;
    const rt = pmrem.fromEquirectangular(hdr);
    envMap = rt.texture;
    disposeEnv = () => {
      envMap.dispose();
      rt.dispose();
      hdr.dispose();
    };
  } catch (e) {
    console.warn("HDRI load failed, using RoomEnvironment:", e);
    onProgress("HDRI missing — using procedural studio fallback.");
    const envScene = new RoomEnvironment();
    const rt = pmrem.fromScene(envScene, 0.045);
    envMap = rt.texture;
    backgroundEquirect = null;
    disposeEnv = () => {
      envMap.dispose();
      rt.dispose();
    };
  }

  onProgress("Loading PBR surface textures…");
  const [mDiff, mNor, mRough, cDiff, cNor, cRough, cpDiff, cpRough] = await Promise.all([
    loadTex(MARBLE.diff),
    loadTex(MARBLE.nor),
    loadTex(MARBLE.rough),
    loadTex(CONCRETE.diff),
    loadTex(CONCRETE.nor),
    loadTex(CONCRETE.rough),
    loadTex(CARPET.diff),
    loadTex(CARPET.rough),
  ]);

  configureRepeat(mDiff, 48, 32);
  configureNonColor(mNor, 48, 32);
  configureNonColor(mRough, 48, 32);

  configureRepeat(cDiff, 10, 3);
  configureNonColor(cNor, 10, 3);
  configureNonColor(cRough, 10, 3);

  configureRepeat(cpDiff, 4, 32);
  configureNonColor(cpRough, 4, 32);

  // Light grey floor — real expo hall style
  const floorMat = new THREE.MeshPhysicalMaterial({
    map: mDiff,
    normalMap: mNor,
    normalScale: new THREE.Vector2(0.15, 0.15),
    roughnessMap: mRough,
    color: new THREE.Color(0xc8c4be),
    metalness: 0.05,
    roughness: 0.55,
    envMapIntensity: 0.5,
    clearcoat: 0.2,
    clearcoatRoughness: 0.3,
  });

  // Light grey carpet with subtle warmth
  const carpetMat = new THREE.MeshPhysicalMaterial({
    map: cpDiff,
    roughnessMap: cpRough,
    color: new THREE.Color(0xa8a4a0),
    metalness: 0,
    roughness: 0.9,
    envMapIntensity: 0.3,
    sheen: 0.2,
    sheenRoughness: 0.85,
    sheenColor: new THREE.Color(0x908880),
  });

  // Light walls — real expo halls have light-colored walls
  const wallMat = new THREE.MeshPhysicalMaterial({
    map: cDiff,
    normalMap: cNor,
    normalScale: new THREE.Vector2(0.4, 0.4),
    roughnessMap: cRough,
    color: new THREE.Color(0xd0d0d8),
    metalness: 0.05,
    roughness: 0.8,
    envMapIntensity: 0.4,
  });

  const trussMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x151820),
    metalness: 0.92,
    roughness: 0.32,
    envMapIntensity: 1.5,
    clearcoat: 0.2,
    clearcoatRoughness: 0.4,
  });

  pmrem.dispose();

  return {
    envMap,
    backgroundEquirect,
    disposeEnv,
    floorMat,
    carpetMat,
    wallMat,
    trussMat,
  };
}
