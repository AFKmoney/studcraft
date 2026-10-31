// Render lab: a studio diorama (brick furnace, like Philippe's reference
// render) built with the game's REAL atlas + mesher + materials, so shader /
// texture tuning can be judged frame by frame without booting the full game.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildAtlas } from "../game/textures";
import { buildChunk, type Surface } from "../game/mesher";
import { ID } from "../game/blocks";

// ---- fake world: just a block map behind world.get ----
const blocks = new Map<string, number>();
const K = (x: number, y: number, z: number) => x + "," + y + "," + z;
function B(x: number, y: number, z: number, id: number) {
  blocks.set(K(x, y, z), id);
}
function hash(x: number, y: number, z: number) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const stoneMix = (x: number, y: number, z: number) => (hash(x, y, z) < 0.32 ? ID.Cobble : ID.Stone);

// stepped platform
for (let x = 0; x < 15; x++) for (let z = 0; z < 15; z++) B(x, 0, z, ID.Cobble);
for (let x = 1; x < 14; x++) for (let z = 1; z < 14; z++) B(x, 1, z, stoneMix(x, 1, z));
// furnace body: solid shell x 3..11, z 4..10, y 2..6
for (let y = 2; y <= 6; y++)
  for (let x = 3; x <= 11; x++)
    for (let z = 4; z <= 10; z++) B(x, y, z, stoneMix(x, y, z));
// carve the fire cavity + arched mouth (front is z = 4)
for (let y = 2; y <= 4; y++) for (let x = 6; x <= 8; x++) for (let z = 4; z <= 7; z++) blocks.delete(K(x, y, z));
blocks.delete(K(7, 5, 4)); // arch crown
// magma bed inside the cavity
for (let x = 6; x <= 8; x++) for (let z = 5; z <= 7; z++) B(x, 2, z, ID.Lava);
B(7, 3, 7, ID.Lava);
// chimney: hollow stack + cap slab (studs on top)
for (let y = 7; y <= 9; y++)
  for (let x = 5; x <= 9; x++)
    for (let z = 5; z <= 9; z++) {
      if (x > 5 && x < 9 && z > 5 && z < 9) continue;
      B(x, y, z, stoneMix(x, y, z));
    }
for (let x = 5; x <= 9; x++) for (let z = 5; z <= 9; z++) B(x, 10, z, ID.Stone);

const fakeWorld = { get: (x: number, y: number, z: number) => blocks.get(K(x, y, z)) ?? 0 };

// ---- renderer / scene, mirroring the game's realistic pipeline ----
const renderer = new THREE.WebGLRenderer({ powerPreference: "high-performance", antialias: true });
renderer.setSize(1100, 1100);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf4f4f4);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;

const atlases = buildAtlas();
if (new URLSearchParams(location.search).has("nomip")) {
  atlases.normal.generateMipmaps = false;
  atlases.normal.minFilter = THREE.LinearFilter;
  atlases.normal.needsUpdate = true;
}
if (new URLSearchParams(location.search).has("noaniso")) {
  atlases.normal.anisotropy = 1;
  atlases.normal.needsUpdate = true;
}
const opaqueMat = new THREE.MeshStandardMaterial({
  map: atlases.color,
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

function surfaceToMesh(surf: Surface, material: THREE.Material) {
  if (surf.pos.length === 0) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(surf.pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(surf.nor, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(surf.uv, 2));
  if (surf.col.length === surf.pos.length) geo.setAttribute("color", new THREE.Float32BufferAttribute(surf.col, 3));
  if (surf.tan.length * 3 === surf.pos.length * 4) geo.setAttribute("tangent", new THREE.Float32BufferAttribute(surf.tan, 4));
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const built = buildChunk(fakeWorld as never, 0, 0, true, true);
const m = surfaceToMesh(built.opaque, opaqueMat);
if (m) scene.add(m);

// studio floor + lights
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(46, 48),
  new THREE.MeshStandardMaterial({ color: 0xececec, roughness: 1, metalness: 0 }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.set(7, -0.02, 7);
floor.receiveShadow = true;
scene.add(floor);

const sun = new THREE.DirectionalLight(0xfff1dd, 2.7);
sun.position.set(14, 26, -6);
sun.target.position.set(7, 3, 7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -16;
sun.shadow.camera.right = 16;
sun.shadow.camera.top = 16;
sun.shadow.camera.bottom = -16;
sun.shadow.camera.near = 4;
sun.shadow.camera.far = 60;
sun.shadow.bias = -0.0002;
sun.shadow.normalBias = 0.05;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0xdcebf7, 0x9a938a, 0.38));
const fire = new THREE.PointLight(0xff7722, 26, 10, 2);
fire.position.set(7, 3.4, 5.6);
scene.add(fire);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
if (new URLSearchParams(location.search).has("zoom")) {
  camera.position.set(4.6, 3.4, -0.6);
  camera.lookAt(2.2, 1.1, 2.2);
} else {
  camera.position.set(19, 12.5, -7.5);
  camera.lookAt(7, 3.2, 7);
}

renderer.render(scene, camera);
(window as unknown as { __labReady: boolean }).__labReady = true;
