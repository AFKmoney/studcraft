// Icon lab: renders every placeable block as a floating isometric cube
// built by the game's REAL mesher + atlas + materials, on a transparent
// background. A node script (icons-shot.mjs) screenshots the sheet with
// Playwright (omitBackground) and slices one PNG per block — those PNGs
// are the game's item icons, so an icon is literally the block itself.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildAtlas } from "../game/textures";
import { buildChunk, type Surface } from "../game/mesher";
import { CATALOG, def } from "../game/blocks";

const ids = CATALOG.filter((id) => def(id).placeable);
const cols = Math.ceil(Math.sqrt(ids.length));
const SPACING = 3;
const Y = 8;

const blocks = new Map<string, number>();
const K = (x: number, y: number, z: number) => x + "," + y + "," + z;
const centers: { id: number; x: number; z: number }[] = [];
ids.forEach((id, i) => {
  const x = (i % cols) * SPACING;
  const z = Math.floor(i / cols) * SPACING;
  blocks.set(K(x, Y, z), id);
  centers.push({ id, x: x + 0.5, z: z + 0.5 });
});
const fakeWorld = { get: (x: number, y: number, z: number) => blocks.get(K(x, y, z)) ?? 0 };

const SIZE = 2048;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(SIZE, SIZE);
renderer.setPixelRatio(1);
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;

const atlases = buildAtlas();
const atlas = atlases.color;
const opaqueMat = new THREE.MeshStandardMaterial({
  map: atlas,
  roughness: 1,
  metalness: 0,
  roughnessMap: atlases.rough,
  normalMap: atlases.normal,
  emissiveMap: atlases.glow,
  emissive: new THREE.Color(0xffffff),
  emissiveIntensity: 1.15,
  vertexColors: true,
  envMapIntensity: 0.55,
});
const glassMat = new THREE.MeshStandardMaterial({
  map: atlas,
  roughness: 0.08,
  metalness: 0,
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
  envMapIntensity: 0.7,
  vertexColors: true,
});
const waterMat = new THREE.MeshStandardMaterial({
  map: atlas,
  roughness: 0.08,
  metalness: 0,
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
  side: THREE.DoubleSide,
  envMapIntensity: 1,
  vertexColors: true,
});
const plantMat = new THREE.MeshStandardMaterial({
  map: atlas,
  roughness: 0.86,
  metalness: 0,
  alphaTest: 0.45,
  side: THREE.DoubleSide,
  vertexColors: true,
  envMapIntensity: 0.4,
});

function surfaceToMesh(surf: Surface, material: THREE.Material) {
  if (surf.pos.length === 0) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(surf.pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(surf.nor, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(surf.uv, 2));
  if (surf.col.length === surf.pos.length) geo.setAttribute("color", new THREE.Float32BufferAttribute(surf.col, 3));
  if (surf.tan.length * 3 === surf.pos.length * 4) geo.setAttribute("tangent", new THREE.Float32BufferAttribute(surf.tan, 4));
  return new THREE.Mesh(geo, material);
}

const maxCX = Math.ceil((cols * SPACING) / 16);
const maxCZ = Math.ceil((Math.ceil(ids.length / cols) * SPACING) / 16);
for (let cx = 0; cx < maxCX; cx++) {
  for (let cz = 0; cz < maxCZ; cz++) {
    const built = buildChunk(fakeWorld as never, cx, cz, true, true);
    const parts: [Surface, THREE.Material][] = [
      [built.opaque, opaqueMat],
      [built.glass, glassMat],
      [built.water, waterMat],
      [built.plant, plantMat],
    ];
    for (const [surf, mat] of parts) {
      const mesh = surfaceToMesh(surf, mat);
      if (mesh) scene.add(mesh);
    }
  }
}

const sun = new THREE.DirectionalLight(0xfff1dd, 2.6);
sun.position.set(18, 30, -10);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xdcebf7, 0x9a938a, 0.5));
const fill = new THREE.DirectionalLight(0xdfe8ff, 0.55);
fill.position.set(-16, 10, 18);
scene.add(fill);

// Isometric ortho camera: sees the top, the +x side and the -z front
// (the mesher's special faces - kiln mouth, bench top - live on -z/top).
const worldW = cols * SPACING;
const worldD = Math.ceil(ids.length / cols) * SPACING;
const center = new THREE.Vector3(worldW / 2, Y + 0.5, worldD / 2);
const dir = new THREE.Vector3(1, 0.86, -1).normalize();
const aspect = 1;
const frustum = worldW * 0.86;
const camera = new THREE.OrthographicCamera(-frustum * aspect, frustum * aspect, frustum, -frustum, 0.1, 300);
camera.position.copy(center).addScaledVector(dir, 120);
camera.lookAt(center);
camera.updateProjectionMatrix();

renderer.render(scene, camera);
renderer.render(scene, camera);

const cells = centers.map((c) => {
  const v = new THREE.Vector3(c.x, Y + 0.55, c.z).project(camera);
  return { id: c.id, px: ((v.x + 1) / 2) * SIZE, py: ((1 - v.y) / 2) * SIZE };
});
// neighbor distance in px (for the slicer's crop radius)
let minD = Infinity;
for (let i = 0; i < cells.length; i++) {
  for (let j = i + 1; j < cells.length; j++) {
    const d = Math.hypot(cells[i].px - cells[j].px, cells[i].py - cells[j].py);
    if (d < minD) minD = d;
  }
}
(window as unknown as { __cells: unknown; __ready: boolean }).__cells = { cells, minD, size: SIZE };
(window as unknown as { __ready: boolean }).__ready = true;
