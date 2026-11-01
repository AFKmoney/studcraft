// t92u — dedicated weapon models for the minifig arsenal (catalogue v2, CAT-06).
// Each weapon is a bespoke procedural build (extruded profiles, lathed barrels,
// wrapped grips, bevelled blades) at the mob-redesign quality bar. No asset, no
// material created here: every surface comes from the caller's `M`, which in the
// game is skin() → sirenize() (SNR path), so the shader audit stays whole.
// Frame: guns fire along +X with the pistol grip at GRIP; blades rise along +Y
// from a hand grip centred at y = -0.11 (same frames as the generic parts).
import * as THREE from "three";

export type Finish = "metal" | "blued" | "wood" | "plastic" | "gold" | "glow" | "glass" | "rubber";
export type MatFn = (hex: number, finish?: Finish) => THREE.Material;
export interface Built { group: THREE.Group; muzzle?: [number, number, number]; glow?: THREE.Material[] }

const GUN = 0x2b2f35, BLK = 0x1b1d21, STEEL = 0xc9d0d8, WD = 0x7c522b, DWD = 0x4e3220, GLD = 0xd8a22e, BRASS = 0xc9a03a;
const LEGO_ORANGE = 0xf08a24, RED = 0xc8302a;

// ---------- geometry helpers ----------
function mesh(g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  parent.add(o);
  return o;
}
function poly(pts: [number, number][]) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  return s;
}
/** Extrude an XY profile to a centred slab of `depth` along Z, with a soft bevel. */
function slab(shape: THREE.Shape, depth: number, bevel = 0.002, curve = 6) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: curve });
  g.translate(0, 0, -depth / 2);
  return g;
}
/** Blade slab: thin core, wide bevel → a real edge on both sides. */
function blade(shape: THREE.Shape, core = 0.002, edge = 0.004) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: core, bevelEnabled: true, bevelThickness: edge, bevelSize: edge * 0.9, bevelSegments: 1, curveSegments: 16 });
  g.translate(0, 0, -core / 2);
  return g;
}
/** Lathe a radius profile [r, along] around +X (barrels, scopes, hilts lying on X). */
function latheX(pr: [number, number][], seg = 18) {
  const g = new THREE.LatheGeometry(pr.map(([r, a]) => new THREE.Vector2(r, a)), seg);
  g.rotateZ(-Math.PI / 2);
  return g;
}
/** Lathe around +Y (sword hilts). */
function latheY(pr: [number, number][], seg = 18) {
  return new THREE.LatheGeometry(pr.map(([r, a]) => new THREE.Vector2(r, a)), seg);
}
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cylX = (r: number, l: number, seg = 14) => new THREE.CylinderGeometry(r, r, l, seg).rotateZ(Math.PI / 2);
const cylZ = (r: number, l: number, seg = 14) => new THREE.CylinderGeometry(r, r, l, seg).rotateX(Math.PI / 2);
/** LEGO signature: a 1×1 stud badge (with its hollow ring) on a flank. */
function stud(parent: THREE.Object3D, m: THREE.Material, x: number, y: number, z: number, r = 0.006) {
  const s = mesh(cylZ(r, 0.004, 14), m, parent, x, y, z + Math.sign(z || 1) * 0.002);
  return s;
}
/** Wrapped grip along Y: alternating bands (leather/cord look). */
function wrapY(parent: THREE.Object3D, a: THREE.Material, b: THREE.Material, y0: number, y1: number, r: number, n: number) {
  const h = (y1 - y0) / n;
  for (let i = 0; i < n; i++) {
    const m = mesh(new THREE.CylinderGeometry(r * (i % 2 ? 0.94 : 1.04), r * (i % 2 ? 0.94 : 1.04), h * 1.02, 12), i % 2 ? b : a, parent, 0, y0 + h * (i + 0.5), 0);
    m.rotation.y = i * 0.35;
  }
}
function triggerGuard(g: THREE.Group, m: THREE.Material, x: number, y: number) {
  const t = mesh(new THREE.TorusGeometry(0.016, 0.0028, 6, 16, Math.PI), m, g, x, y, 0);
  t.rotation.z = Math.PI;
  mesh(box(0.003, 0.014, 0.004), m, g, x + 0.002, y - 0.004, 0).rotation.z = 0.35; // trigger blade
}

// ---------- firearms ----------
function carbine(M: MatFn): Built {
  const g = new THREE.Group();
  const recv = M(GUN, "blued"), poly1 = M(BLK, "plastic"), steel = M(0x3a3f46, "metal"), orange = M(LEGO_ORANGE, "plastic"), lens = M(0xff3a2a, "glow");
  // upper + lower receiver: one stepped profile
  mesh(slab(poly([[-0.1, -0.072], [0.06, -0.072], [0.064, -0.058], [0.064, -0.032], [-0.095, -0.032], [-0.1, -0.04]]), 0.026), recv, g);
  mesh(slab(poly([[-0.085, -0.072], [0.02, -0.072], [0.012, -0.082], [-0.06, -0.082]]), 0.022), recv, g); // magwell lip
  // picatinny rail: base + 9 teeth
  mesh(box(0.15, 0.006, 0.016), steel, g, -0.02, -0.028, 0);
  for (let i = 0; i < 9; i++) mesh(box(0.008, 0.004, 0.018), steel, g, -0.088 + i * 0.017, -0.023, 0);
  // red-dot sight
  mesh(latheX([[0, -0.012], [0.01, -0.012], [0.011, -0.008], [0.011, 0.012], [0.009, 0.014], [0, 0.014]]), recv, g, -0.03, -0.007, 0);
  mesh(cylX(0.0065, 0.002), lens, g, -0.043, -0.007, 0);
  mesh(box(0.02, 0.008, 0.014), recv, g, -0.03, -0.018, 0);
  // ventilated handguard (octagon tube) + vent slots
  mesh(latheX([[0.017, 0], [0.017, 0.09]], 8), poly1, g, 0.06, -0.05, 0).rotation.x = Math.PI / 8;
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) mesh(box(0.012, 0.005, 0.004), recv, g, 0.075 + i * 0.02, -0.05, s * 0.016);
  // barrel + gas block + birdcage flash hider (muzzle at x 0.19)
  mesh(latheX([[0.0065, 0], [0.0065, 0.04]]), steel, g, 0.15, -0.045, 0);
  mesh(box(0.012, 0.014, 0.014), steel, g, 0.155, -0.045, 0);
  mesh(box(0.004, 0.018, 0.004), steel, g, 0.155, -0.03, 0); // front sight post
  mesh(latheX([[0.0095, 0], [0.0095, 0.02], [0.006, 0.021]], 6), steel, g, 0.17, -0.045, 0);
  // curved 20-round magazine
  const mag = new THREE.Shape();
  mag.moveTo(-0.05, -0.074); mag.lineTo(-0.02, -0.074);
  mag.quadraticCurveTo(-0.012, -0.11, 0.0, -0.142); mag.lineTo(-0.03, -0.148);
  mag.quadraticCurveTo(-0.04, -0.11, -0.05, -0.074);
  mesh(slab(mag, 0.018, 0.0015, 10), poly1, g);
  mesh(box(0.034, 0.006, 0.022), steel, g, -0.016, -0.146, 0).rotation.z = -0.2; // baseplate
  // pistol grip with finger grooves + trigger guard
  mesh(slab(poly([[-0.09, -0.07], [-0.06, -0.07], [-0.066, -0.09], [-0.07, -0.11], [-0.078, -0.128], [-0.1, -0.124], [-0.096, -0.1]]), 0.022), poly1, g);
  triggerGuard(g, recv, -0.048, -0.072);
  // charging handle + ejection port + forward assist
  mesh(box(0.012, 0.005, 0.03), steel, g, -0.095, -0.034, 0);
  mesh(box(0.03, 0.012, 0.002), M(0x15171a, "plastic"), g, -0.02, -0.048, 0.0135);
  mesh(cylZ(0.004, 0.008), steel, g, -0.06, -0.04, 0.015);
  // collapsible stock: buffer tube + skeletal butt
  mesh(latheX([[0.008, 0], [0.008, 0.08]]), steel, g, -0.18, -0.045, 0);
  mesh(slab(poly([[-0.2, -0.04], [-0.17, -0.04], [-0.17, -0.06], [-0.25, -0.1], [-0.262, -0.1], [-0.262, -0.035], [-0.24, -0.032]]), 0.022), poly1, g);
  mesh(box(0.006, 0.07, 0.026), M(0x2a2c30, "rubber"), g, -0.264, -0.066, 0); // butt pad
  // signature: orange LEGO stud badges on both flanks + selector
  stud(g, orange, -0.07, -0.05, 0.013);
  stud(g, orange, -0.07, -0.05, -0.013);
  mesh(cylZ(0.0035, 0.03), steel, g, -0.075, -0.064, 0);
  return { group: g, muzzle: [0.19, -0.045, 0], glow: [lens] };
}

function rifle(M: MatFn): Built {
  const g = new THREE.Group();
  const wood = M(WD, "wood"), dark = M(DWD, "wood"), blued = M(GUN, "blued"), brass = M(BRASS, "gold"), glass = M(0x5ac8ff, "glass");
  // one-piece stock: forend, wrist, cheek rise, butt — single extruded profile
  mesh(slab(poly([[0.15, -0.058], [0.15, -0.045], [-0.05, -0.044], [-0.1, -0.05], [-0.15, -0.04], [-0.27, -0.038], [-0.27, -0.1], [-0.24, -0.1], [-0.13, -0.07], [-0.1, -0.078], [-0.075, -0.115], [-0.055, -0.112], [-0.06, -0.07]]), 0.026, 0.003), wood, g);
  mesh(box(0.008, 0.064, 0.03), brass, g, -0.272, -0.069, 0); // brass butt plate
  for (let i = 0; i < 5; i++) mesh(box(0.004, 0.012, 0.028), dark, g, -0.07 + i * 0.006, -0.1, 0).rotation.z = 0.5; // grip checkering
  // receiver + bolt with ball knob
  mesh(latheX([[0.011, 0], [0.011, 0.11], [0.009, 0.115]]), blued, g, -0.08, -0.036, 0);
  mesh(cylZ(0.0025, 0.03), blued, g, -0.065, -0.036, 0.016).rotation.y = -0.2;
  mesh(new THREE.SphereGeometry(0.0055, 10, 8), blued, g, -0.068, -0.038, 0.032);
  // tapered barrel to the crowned muzzle (x 0.24)
  mesh(latheX([[0.0085, 0], [0.0068, 0.2], [0.0075, 0.205], [0.0075, 0.21]]), blued, g, 0.03, -0.04, 0);
  mesh(box(0.004, 0.01, 0.004), blued, g, 0.23, -0.03, 0); // front blade
  mesh(cylX(0.0095, 0.01), brass, g, 0.12, -0.044, 0); // barrel band
  // scope: bell ends, turrets, blue glass, two rings
  mesh(latheX([[0.0, 0], [0.012, 0], [0.012, 0.02], [0.008, 0.035], [0.008, 0.09], [0.013, 0.11], [0.013, 0.125], [0, 0.125]]), blued, g, -0.07, -0.005, 0);
  mesh(cylX(0.011, 0.002), glass, g, 0.056, -0.005, 0);
  mesh(cylX(0.010, 0.002), glass, g, -0.071, -0.005, 0);
  mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.012, 10), blued, g, -0.005, 0.006, 0);
  mesh(cylZ(0.0055, 0.012), blued, g, -0.005, -0.005, 0.012);
  for (const x of [-0.035, 0.025]) mesh(box(0.008, 0.024, 0.02), blued, g, x, -0.018, 0);
  triggerGuard(g, blued, -0.05, -0.06);
  // internal 5-round box: floorplate + brass cartridge tips visible on the flank
  mesh(box(0.03, 0.006, 0.024), blued, g, -0.02, -0.06, 0);
  for (let i = 0; i < 3; i++) mesh(cylX(0.0028, 0.012), brass, g, -0.025 + i * 0.002, -0.05 - i * 0.004, 0.0135);
  // leather sling swivels + strap
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.003, 4, 24, 1.1), M(0x5b3a22, "rubber"));
  strap.position.set(-0.06, 0.06, -0.016); strap.rotation.z = -Math.PI / 2 - 0.55; g.add(strap);
  return { group: g, muzzle: [0.24, -0.04, 0], glow: [glass] };
}

function revolver(M: MatFn): Built {
  const g = new THREE.Group();
  const frame = M(0x8e959c, "metal"), dark = M(GUN, "blued"), wood = M(DWD, "wood"), gold = M(GLD, "gold");
  mesh(slab(poly([[-0.1, -0.05], [-0.04, -0.05], [-0.04, -0.022], [-0.1, -0.022], [-0.108, -0.03]]), 0.02), frame, g);
  // fluted 6-shot cylinder with chamber mouths
  mesh(cylX(0.019, 0.036, 18), frame, g, -0.07, -0.036, 0);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    mesh(box(0.028, 0.004, 0.004), dark, g, -0.07, -0.036 + Math.cos(a) * 0.019, Math.sin(a) * 0.019).rotation.x = a;
    mesh(cylX(0.004, 0.002), M(0xb88a2a, "gold"), g, -0.051, -0.036 + Math.cos(a + 0.5) * 0.011, Math.sin(a + 0.5) * 0.011);
  }
  // barrel with top rib + ejector rod housing + blade sight
  mesh(latheX([[0.0075, 0], [0.0075, 0.095], [0.0085, 0.1]]), frame, g, -0.052, -0.032, 0);
  mesh(box(0.095, 0.005, 0.006), frame, g, -0.004, -0.023, 0);
  mesh(cylX(0.004, 0.06), frame, g, -0.02, -0.044, 0);
  mesh(box(0.006, 0.008, 0.002), frame, g, 0.04, -0.018, 0);
  // hammer spur + trigger guard
  mesh(slab(poly([[-0.1, -0.024], [-0.094, -0.024], [-0.104, -0.008], [-0.112, -0.01]]), 0.006), dark, g);
  triggerGuard(g, frame, -0.065, -0.052);
  // bird's-head walnut grip + gold medallion
  mesh(slab(poly([[-0.104, -0.048], [-0.08, -0.05], [-0.084, -0.08], [-0.092, -0.115], [-0.115, -0.112], [-0.112, -0.08], [-0.112, -0.055]]), 0.022, 0.003), wood, g);
  for (const z of [-0.014, 0.014]) mesh(cylZ(0.005, 0.002), gold, g, -0.098, -0.08, z);
  return { group: g, muzzle: [0.045, -0.035, 0] };
}

function flintlock(M: MatFn, long = false): Built {
  const g = new THREE.Group();
  const wood = M(WD, "wood"), brass = M(BRASS, "gold"), steel = M(0x9aa1a8, "metal"), dark = M(GUN, "blued");
  const L = long ? 0.3 : 0.13, x0 = long ? -0.13 : -0.07;
  if (long) {
    // musket: full stock, butt, comb
    mesh(slab(poly([[0.1, -0.052], [0.1, -0.04], [-0.12, -0.04], [-0.27, -0.045], [-0.27, -0.105], [-0.25, -0.105], [-0.12, -0.065], [-0.08, -0.07], [-0.065, -0.11], [-0.045, -0.106], [-0.05, -0.06]]), 0.026, 0.003), wood, g);
    mesh(box(0.008, 0.06, 0.028), brass, g, -0.272, -0.075, 0);
    // ramrod + three brass bands + bayonet lug
    mesh(cylX(0.0025, 0.2), steel, g, 0.0, -0.056, 0);
    for (const x of [-0.02, 0.05, 0.1]) mesh(cylX(0.011, 0.008), brass, g, x, -0.042, 0);
    mesh(new THREE.ConeGeometry(0.004, 0.1, 4).rotateZ(-Math.PI / 2), steel, g, 0.21, -0.052, 0.008); // socket bayonet
  } else {
    // pistol: forestock + curved grip ending in a brass skull-crusher ball
    mesh(slab(poly([[0.05, -0.05], [0.05, -0.04], [-0.09, -0.04], [-0.1, -0.06], [-0.11, -0.1], [-0.13, -0.12], [-0.11, -0.128], [-0.09, -0.1], [-0.075, -0.065], [-0.06, -0.05]]), 0.022, 0.003), wood, g);
    mesh(new THREE.SphereGeometry(0.012, 12, 10), brass, g, -0.124, -0.122, 0);
    mesh(cylX(0.0022, 0.1), steel, g, 0.0, -0.053, 0);
  }
  // octagonal-to-round barrel with a flared muzzle
  mesh(latheX([[0.009, 0], [0.008, L * 0.4], [0.0085, L * 0.42], [0.008, L], [0.0105, L + 0.004], [0.0105, L + 0.008]], long ? 12 : 8), dark, g, x0, long ? -0.03 : -0.038, 0);
  // the lock: plate, cock (S-curve) holding a flint, frizzen + pan
  mesh(box(0.05, 0.016, 0.003), steel, g, x0 - 0.0, -0.045, 0.014);
  const cock = new THREE.Shape();
  cock.moveTo(0, 0); cock.quadraticCurveTo(-0.012, 0.01, -0.006, 0.022); cock.lineTo(0.0, 0.026); cock.lineTo(0.004, 0.022);
  cock.quadraticCurveTo(-0.004, 0.01, 0.006, 0.002); cock.closePath();
  mesh(slab(cock, 0.004, 0.001), steel, g, x0 - 0.012, -0.045, 0.016);
  mesh(box(0.008, 0.005, 0.006), M(0x55585c, "plastic"), g, x0 - 0.01, -0.019, 0.016); // flint
  mesh(box(0.004, 0.016, 0.008), steel, g, x0 + 0.01, -0.028, 0.016);
  mesh(box(0.012, 0.003, 0.01), brass, g, x0 + 0.008, -0.038, 0.016);
  triggerGuard(g, brass, long ? -0.035 : -0.06, -0.054);
  return { group: g, muzzle: long ? [0.17, -0.03, 0] : [0.06, -0.04, 0] };
}

// ---------- blades ----------
function hilt(g: THREE.Group, M: MatFn, wrapA: number, wrapB: number, pommel: number, len = 0.11, gem?: number): THREE.Material | undefined {
  const a = M(wrapA, "rubber"), b = M(wrapB, "rubber");
  wrapY(g, a, b, -0.165, -0.165 + len, 0.018, 9);
  mesh(new THREE.SphereGeometry(0.022, 14, 10), M(pommel, "gold"), g, 0, -0.17, 0).scale.set(1, 0.8, 1);
  if (gem === undefined) return undefined;
  const gm = M(gem, "glow");
  mesh(new THREE.OctahedronGeometry(0.009), gm, g, 0, -0.17, 0.018);
  mesh(new THREE.OctahedronGeometry(0.009), gm, g, 0, -0.17, -0.018);
  return gm;
}
function shortSword(M: MatFn): Built {
  const g = new THREE.Group();
  hilt(g, M, 0x5b3a22, 0x3a2414, GLD);
  mesh(slab(poly([[-0.06, -0.006], [0.06, -0.006], [0.07, 0.004], [0.04, 0.0], [-0.04, 0.0], [-0.07, 0.004]]), 0.02, 0.003), M(GLD, "gold"), g, 0, -0.052, 0);
  // leaf blade: swells then tapers to a point
  const s = new THREE.Shape();
  s.moveTo(-0.016, -0.05); s.quadraticCurveTo(-0.028, 0.03, -0.012, 0.11); s.lineTo(0, 0.135); s.lineTo(0.012, 0.11); s.quadraticCurveTo(0.028, 0.03, 0.016, -0.05); s.closePath();
  mesh(blade(s), M(STEEL, "metal"), g);
  mesh(box(0.004, 0.11, 0.0095), M(0x8e959c, "metal"), g, 0, 0.02, 0); // fuller
  return { group: g };
}
function longSword(M: MatFn): Built {
  const g = new THREE.Group();
  const gem = hilt(g, M, 0x2a4a8c, 0x1a2a50, GLD, 0.11, 0x3aa0ff);
  // arched crossguard with scrolled tips
  const cg = new THREE.Shape();
  cg.moveTo(-0.08, 0.008); cg.quadraticCurveTo(0, -0.012, 0.08, 0.008); cg.lineTo(0.085, 0.016); cg.quadraticCurveTo(0, -0.002, -0.085, 0.016); cg.closePath();
  mesh(slab(cg, 0.018, 0.003, 12), M(GLD, "gold"), g, 0, -0.06, 0);
  mesh(new THREE.SphereGeometry(0.008, 10, 8), M(GLD, "gold"), g, 0.086, -0.046, 0);
  mesh(new THREE.SphereGeometry(0.008, 10, 8), M(GLD, "gold"), g, -0.086, -0.046, 0);
  // ricasso + long tapered blade with a deep fuller
  mesh(box(0.034, 0.02, 0.008), M(STEEL, "metal"), g, 0, -0.04, 0);
  mesh(blade(poly([[-0.02, -0.03], [-0.014, 0.25], [0, 0.29], [0.014, 0.25], [0.02, -0.03]])), M(0xdfe4ea, "metal"), g);
  mesh(box(0.006, 0.22, 0.0095), M(0x9aa1a8, "metal"), g, 0, 0.09, 0);
  return { group: g, glow: gem ? [gem] : undefined };
}
function katana(M: MatFn): Built {
  const g = new THREE.Group();
  // tsuka: ray-skin white under black diamond ito wrap, gold kashira
  const sameMat = M(0xf2efe6, "plastic"), ito = M(0x1b1d21, "rubber");
  mesh(new THREE.CylinderGeometry(0.016, 0.017, 0.12, 12), sameMat, g, 0, -0.11, 0);
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) {
    const d = mesh(box(0.036, 0.006, 0.006), ito, g, 0, -0.16 + i * 0.019, 0);
    d.rotation.set(0, (s * Math.PI) / 4, s * 0.55);
  }
  mesh(latheY([[0, -0.01], [0.019, -0.01], [0.019, 0.006], [0, 0.008]]), M(GLD, "gold"), g, 0, -0.172, 0);
  // tsuba: four-lobed guard
  const ts = new THREE.Shape();
  for (let k = 0; k <= 64; k++) { const a = (k / 64) * Math.PI * 2, r = 0.034 + 0.005 * Math.cos(a * 4); (k ? ts.lineTo : ts.moveTo).call(ts, Math.cos(a) * r, Math.sin(a) * r * 0.82); }
  const tsg = slab(ts, 0.005, 0.0015); tsg.rotateX(Math.PI / 2);
  mesh(tsg, M(0x3a3f46, "blued"), g, 0, -0.046, 0);
  mesh(box(0.024, 0.014, 0.012), M(GLD, "gold"), g, 0, -0.036, 0); // habaki
  // curved blade (sori) with a kissaki, and a pale hamon line
  const b = new THREE.Shape();
  b.moveTo(-0.011, -0.03); b.quadraticCurveTo(-0.006, 0.13, 0.024, 0.255); b.lineTo(0.018, 0.27); b.lineTo(0.008, 0.262);
  b.quadraticCurveTo(-0.018, 0.13, -0.023, -0.03); b.closePath();
  b.moveTo(-0.011, -0.03);
  mesh(blade(b, 0.002, 0.0035), M(0xe8ecf0, "metal"), g, 0.006, 0, 0);
  const h = new THREE.Shape();
  h.moveTo(-0.009, -0.025); h.quadraticCurveTo(-0.004, 0.13, 0.02, 0.25); h.lineTo(0.017, 0.252); h.quadraticCurveTo(-0.008, 0.13, -0.013, -0.025); h.closePath();
  for (const z of [-0.0047, 0.0047]) mesh(new THREE.ShapeGeometry(h, 16), M(0xffffff, "metal"), g, 0.006, 0, z).rotation.y = z < 0 ? Math.PI : 0;
  return { group: g };
}
function cutlass(M: MatFn): Built {
  const g = new THREE.Group();
  hilt(g, M, 0x1b1d21, 0x3a2414, GLD, 0.1);
  // brass basket shell + knuckle bow
  const shell = mesh(new THREE.SphereGeometry(0.04, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), M(GLD, "gold"), g, 0, -0.05, 0);
  shell.rotation.x = Math.PI; shell.scale.set(1, 0.6, 0.75);
  const bow = mesh(new THREE.TorusGeometry(0.06, 0.004, 6, 18, Math.PI * 0.9), M(GLD, "gold"), g, 0.012, -0.11, 0);
  bow.rotation.z = -Math.PI / 2 + 0.2;
  // broad curved blade, clipped point
  const s = new THREE.Shape();
  s.moveTo(-0.016, -0.045); s.quadraticCurveTo(-0.01, 0.1, 0.03, 0.19); s.lineTo(0.032, 0.205); s.lineTo(0.016, 0.196);
  s.quadraticCurveTo(-0.034, 0.1, -0.03, -0.045); s.closePath();
  mesh(blade(s), M(STEEL, "metal"), g, 0.008, 0, 0);
  return { group: g };
}
function halberd(M: MatFn): Built {
  const g = new THREE.Group();
  const wood = M(DWD, "wood"), steel = M(0xb8c0c8, "metal"), gold = M(GLD, "gold");
  mesh(new THREE.CylinderGeometry(0.012, 0.013, 0.48, 10), wood, g, 0, 0.06, 0);
  for (const y of [-0.12, 0.0, 0.2]) mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.01, 10), gold, g, 0, y, 0);
  mesh(new THREE.ConeGeometry(0.012, 0.03, 10).rotateX(Math.PI), gold, g, 0, -0.195, 0); // butt spike
  // crescent axe blade
  const ax = new THREE.Shape();
  ax.moveTo(0.01, 0.22); ax.lineTo(0.05, 0.2); ax.quadraticCurveTo(0.1, 0.24, 0.1, 0.28); ax.quadraticCurveTo(0.085, 0.26, 0.05, 0.3); ax.lineTo(0.01, 0.28); ax.closePath();
  mesh(blade(ax, 0.003, 0.003), steel, g);
  // back hook + top spear with langets
  mesh(blade(poly([[-0.01, 0.235], [-0.06, 0.25], [-0.07, 0.27], [-0.05, 0.258], [-0.01, 0.26]]), 0.003, 0.002), steel, g);
  mesh(blade(poly([[-0.01, 0.29], [-0.008, 0.36], [0, 0.4], [0.008, 0.36], [0.01, 0.29]]), 0.002, 0.003), steel, g);
  // red tassel at the socket
  for (let k = 0; k < 6; k++) { const t = mesh(new THREE.CylinderGeometry(0.002, 0.001, 0.04, 4), M(RED, "rubber"), g, Math.cos(k) * 0.01, 0.19, Math.sin(k) * 0.01); t.rotation.z = 0.2 * Math.cos(k * 2); }
  return { group: g };
}
function fireAxe(M: MatFn): Built {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.013, 0.015, 0.3, 10), M(RED, "plastic"), g, 0, 0.0, 0);
  mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.07, 10), M(0x1b1d21, "rubber"), g, 0, -0.12, 0);
  const head = new THREE.Shape();
  head.moveTo(-0.012, 0.1); head.lineTo(0.03, 0.105); head.quadraticCurveTo(0.08, 0.09, 0.085, 0.13); head.quadraticCurveTo(0.08, 0.17, 0.03, 0.15); head.lineTo(-0.012, 0.15);
  head.lineTo(-0.07, 0.13); head.lineTo(-0.012, 0.12); head.closePath();
  mesh(blade(head, 0.008, 0.003), M(RED, "metal"), g);
  for (const y of [-0.08, 0.06]) mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.008, 10), M(STEEL, "metal"), g, 0, y, 0);
  for (const z of [-0.0075, 0.0075]) for (const x of [-0.004, 0.018]) mesh(cylZ(0.0035, 0.003), M(STEEL, "metal"), g, x, 0.125, z);
  mesh(new THREE.ConeGeometry(0.01, 0.02, 4), M(STEEL, "metal"), g, 0, 0.16, 0); // top spike
  mesh(new THREE.SphereGeometry(0.017, 10, 8), M(0x1b1d21, "rubber"), g, 0, -0.158, 0);
  mesh(blade(poly([[0.06, 0.097], [0.088, 0.13], [0.06, 0.158], [0.064, 0.13]]), 0.004, 0.002), M(STEEL, "metal"), g); // polished edge
  return { group: g };
}
function lightsaber(M: MatFn, hue = 0x3aff6a): Built {
  const g = new THREE.Group();
  const chrome = M(0xd6dbe0, "metal"), black = M(BLK, "rubber"), glow = M(hue, "glow"), core = M(0xffffff, "glow");
  mesh(latheY([[0, -0.19], [0.016, -0.19], [0.017, -0.18], [0.015, -0.17], [0.015, -0.08], [0.019, -0.07], [0.021, -0.04], [0.016, -0.035], [0, -0.035]]), chrome, g);
  for (let i = 0; i < 7; i++) mesh(new THREE.CylinderGeometry(0.0165, 0.0165, 0.006, 14), black, g, 0, -0.16 + i * 0.011, 0); // grip ridges
  mesh(box(0.008, 0.012, 0.006), M(RED, "glow"), g, 0, -0.06, 0.017); // activation stud
  mesh(new THREE.CapsuleGeometry(0.0085, 0.29, 4, 12), glow, g, 0, 0.12, 0);
  mesh(new THREE.CapsuleGeometry(0.0045, 0.29, 4, 8), core, g, 0, 0.12, 0);
  return { group: g, glow: [glow, core] };
}

const BUILDERS: Record<string, (M: MatFn) => Built> = {
  Carbine: carbine,
  Rifle: rifle,
  Revolver: revolver,
  Flintlock: (M) => flintlock(M, false),
  Musket: (M) => flintlock(M, true),
  ShortSword: shortSword,
  LongSword: longSword,
  Katana: katana,
  Cutlass: cutlass,
  Halberd: halberd,
  FireAxe: fireAxe,
  Lightsaber: (M) => lightsaber(M),
};
export const DEDICATED_WEAPONS = Object.keys(BUILDERS);
export function buildWeapon(key: string, M: MatFn): Built | null {
  const b = BUILDERS[key];
  return b ? b(M) : null;
}
/** Bounding box of a built weapon (tests: sane size, grip inside, muzzle at the tip). */
export function weaponBounds(b: Built) {
  b.group.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(b.group);
}
