import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/** Poly Haven CC0 — interior HDRI + tileable PBR maps (browser-friendly CDN). */
const HDR_URL =
  "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/brown_photostudio_06_2k.hdr";

const MARBLE = {
  diff: "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/marble_01/marble_01_diff_1k.jpg",
  nor: "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/marble_01/marble_01_nor_gl_1k.jpg",
  rough: "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/marble_01/marble_01_rough_1k.jpg",
};

const CONCRETE = {
  diff: "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/concrete_wall_001/concrete_wall_001_diff_1k.jpg",
  nor: "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/concrete_wall_001/concrete_wall_001_nor_gl_1k.jpg",
  rough: "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/concrete_wall_001/concrete_wall_001_rough_1k.jpg",
};

const CARPET = {
  diff: "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/carpet_01/carpet_01_diff_1k.jpg",
  rough: "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/carpet_01/carpet_01_rough_1k.jpg",
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
  loader.crossOrigin = "anonymous";

  const loadTex = (url: string) =>
    new Promise<THREE.Texture>((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });

  let envMap: THREE.Texture;
  let disposeEnv: () => void = () => {};

  onProgress("Loading HDRI environment…");
  try {
    const rgbe = new RGBELoader();
    rgbe.crossOrigin = "anonymous";
    const hdr = await rgbe.loadAsync(HDR_URL);
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const rt = pmrem.fromEquirectangular(hdr);
    envMap = rt.texture;
    hdr.dispose();
    disposeEnv = () => {
      envMap.dispose();
      rt.dispose();
    };
  } catch {
    onProgress("HDRI failed — using procedural studio fallback.");
    const envScene = new RoomEnvironment();
    const rt = pmrem.fromScene(envScene, 0.045);
    envMap = rt.texture;
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

  const floorMat = new THREE.MeshPhysicalMaterial({
    map: mDiff,
    normalMap: mNor,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughnessMap: mRough,
    metalness: 0.12,
    roughness: 1,
    envMapIntensity: 1.15,
    clearcoat: 0.45,
    clearcoatRoughness: 0.28,
    reflectivity: 0.65,
  });

  const carpetMat = new THREE.MeshPhysicalMaterial({
    map: cpDiff,
    roughnessMap: cpRough,
    metalness: 0,
    roughness: 1,
    envMapIntensity: 0.35,
    sheen: 0.35,
    sheenRoughness: 0.85,
    sheenColor: new THREE.Color(0x1a1a22),
  });

  const wallMat = new THREE.MeshPhysicalMaterial({
    map: cDiff,
    normalMap: cNor,
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughnessMap: cRough,
    metalness: 0.06,
    roughness: 1,
    envMapIntensity: 0.45,
    clearcoat: 0.08,
    clearcoatRoughness: 0.6,
  });

  const trussMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x0a0c10),
    metalness: 0.92,
    roughness: 0.32,
    envMapIntensity: 1.2,
    clearcoat: 0.2,
    clearcoatRoughness: 0.4,
  });

  pmrem.dispose();

  return {
    envMap,
    disposeEnv,
    floorMat,
    carpetMat,
    wallMat,
    trussMat,
  };
}
