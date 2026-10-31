// Dev-only harness (biomes-bosses): /biome-shots.html?species=id | ?boss=zone | ?zone=zone | ?kind=k
import * as THREE from "three";
import { applyBiomeLook, buildSpecies, buildStuds, decorateVillagerRole } from "../src/game/game";
import { SPECIES_BY_ID, ZONES, type ZoneId } from "../src/game/biomes";
import { displayName } from "../src/game/mobNames";

const q = new URLSearchParams(location.search);
const W = q.get("zone") ? 1024 : 512;
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setSize(W, 512);
r.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(r.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfd8e3);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(3, 5, -4);
scene.add(sun);
const root = new THREE.Group();
scene.add(root);
let title = "";
const one = (o: THREE.Object3D) => root.add(o);
if (q.get("species")) {
  const s = SPECIES_BY_ID.get(q.get("species")!)!;
  one(buildSpecies(s).group);
  title = `${s.label} (${s.arch}, IA ${s.ai})`;
} else if (q.get("boss")) {
  const b = ZONES[q.get("boss") as ZoneId].boss;
  const body = buildStuds(b.ai, b.scale);
  applyBiomeLook(body.group, b.tint, 0.6, b.rule);
  one(body.group);
  title = `${b.label} — boss ${ZONES[q.get("boss") as ZoneId].label}${b.rule ? " · règle " + b.rule : ""}`;
} else if (q.get("zone")) {
  const z = ZONES[q.get("zone") as ZoneId];
  scene.background = new THREE.Color(z.ground).lerp(new THREE.Color(0xdde6ef), 0.75);
  const ground = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 5), new THREE.MeshStandardMaterial({ color: z.ground }));
  ground.position.y = -0.1;
  scene.add(ground);
  const items: THREE.Object3D[] = [];
  for (const m of z.mobs) {
    const g = m.species ? buildSpecies(SPECIES_BY_ID.get(m.species)!).group : buildStuds(m.kind!, 1).group;
    if (m.tint !== undefined) applyBiomeLook(g, m.tint, 0.55);
    items.push(g);
  }
  const boss = buildStuds(z.boss.ai, z.boss.scale);
  applyBiomeLook(boss.group, z.boss.tint, 0.6, z.boss.rule);
  items.push(boss.group);
  let x = 0;
  for (const g of items) {
    g.updateMatrixWorld(true);
    const s = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());
    g.position.x = x + s.x / 2;
    x += s.x + 0.4;
    root.add(g);
  }
  root.position.x = -x / 2;
  title = `${z.label} — ${z.mobs.map((m) => m.species ? SPECIES_BY_ID.get(m.species)!.label : m.label ?? displayName({ kind: m.kind! })).join(", ")} · boss ${z.boss.label}`;
} else if (q.get("roles")) {
  // ?roles=1 : the plain villager followed by every trader profession, side by side
  let x = 0;
  for (const role of [undefined, "grocer", "smith", "mason", "herder", "clerk", "mage", "ranger", "mechanic"] as const) {
    const g = buildStuds("villager", 1).group;
    decorateVillagerRole(g, role);
    const i = Math.round(x);
    g.position.set((i % 5) * 0.95, 0, Math.floor(i / 5) * 1.3);
    x += 1;
    if (q.get("swing")) for (const c of g.children) if (c.userData.arm) c.rotation.x = c.userData.arm * 0.7; // animator pose: arms swing
    root.add(g);
  }
  root.position.x = -1.9;
  title = "Villageois + marchands";
} else {
  const kg = buildStuds(q.get("kind") ?? "creeper", 1).group;
  if (q.get("role")) decorateVillagerRole(kg, q.get("role") as Parameters<typeof decorateVillagerRole>[1]);
  if (q.get("swing")) for (const c of kg.children) if (c.userData.arm) c.rotation.x = c.userData.arm * 0.7; // walk-cycle arm swing
  one(kg);
  title = displayName({ kind: q.get("kind") ?? "creeper" });
}
root.updateMatrixWorld(true);
const box = new THREE.Box3().setFromObject(root);
const c = box.getCenter(new THREE.Vector3());
const size = box.getSize(new THREE.Vector3());
const s = q.get("zone") ? Math.max(size.x * 0.55, size.y * 1.6) : size.length();
const cam = new THREE.PerspectiveCamera(35, W / 512, 0.01, 500);
cam.position.set(c.x + s * (q.get("zone") ? 0.3 : 0.9), c.y + s * 0.45, c.z - s * (q.get("zone") ? 1.6 : 1.3));
cam.lookAt(c);
r.render(scene, cam);
const tag = document.createElement("div");
tag.textContent = title;
tag.style.cssText = "position:fixed;left:8px;bottom:8px;right:8px;font:600 16px sans-serif;color:#1a120c";
document.body.appendChild(tag);
(window as unknown as { __ready: boolean }).__ready = true;
