// P5 — Teks kinematics. Pure graph, no game.ts / save.ts / brick layer.
//
// Catalog (module 1): centre distance in studs is (N1 + N2) / 16.
// 16T+16T and 8T+24T both sit 2 studs apart (one block). A worm is
// irreversible: one turn advances the gear by one tooth, and the gear
// cannot turn the worm. Nothing transmits unless the parts touch, or a
// belt joins two pulleys. At most 64 visits per tick.

export const MESH_CAP = 64;
/** A 24T clutch gear passes torque up to 2. Past that it slips and drives nothing. */
export const SLIP_LIMIT = 2;

export type Axis = "x" | "y" | "z";
export type MechKind = "axle" | "gear" | "worm" | "crank" | "clutch" | "pulley" | "cam" | "wheel" | "diff" | "slip";

export type MechPart = {
  x: number;
  y: number;
  z: number;
  kind: MechKind;
  axis: Axis;
  teeth: number;
  driveN?: number;
  driveD?: number;
  open?: boolean;
  belt?: number;
  pulley?: number;
};

export type Frac = { n: number; d: number };

const parts = new Map<string, MechPart>();
const speeds = new Map<string, Frac>();
const torques = new Map<string, Frac>();
const angles = new Map<string, number>();

export function mkey(x: number, y: number, z: number) {
  return x + "," + y + "," + z;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a) | 0;
  b = Math.abs(b) | 0;
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a || 1;
}

export function frac(n: number, d: number): Frac {
  if (!d) return { n: 0, d: 1 };
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

/** The differential's one job: output = (A + B) / 2, in exact fractions.
 *  This is THE implementation — mechLink's stepMech feeds diff outputs
 *  through it, and the P5b vehicle layer (vehicle.ts) drives its driven
 *  wheel pair through it too. (Extracted 2026-10-30, P5b wiring: the
 *  formula used to live inline in mechLink AND as a dead copy in
 *  p5bProto — one implementation now, three call sites.) */
export function diffOutput(a: Frac, b: Frac): Frac {
  return frac(a.n * b.d + b.n * a.d, a.d * b.d * 2);
}

function mul(a: Frac, n: number, d: number): Frac {
  return frac(a.n * n, a.d * d);
}

function same(a: Frac, b: Frac) {
  return a.n === b.n && a.d === b.d;
}

/** Centre distance in studs. 8T+24T = 2. 16T+16T = 2. 8T+8T = 1. */
export function meshStuds(t1: number, t2: number) {
  return (t1 + t2) / 16;
}

export function clearMech() {
  parts.clear();
  speeds.clear();
  torques.clear();
  angles.clear();
}

/** Drop the graph but keep cam angles, so a placed machine keeps turning. */
export function resetParts() {
  parts.clear();
  speeds.clear();
  torques.clear();
}

export function putMech(p: MechPart) {
  parts.set(mkey(p.x, p.y, p.z), p);
}

export function delMech(x: number, y: number, z: number) {
  const k = mkey(x, y, z);
  parts.delete(k);
  speeds.delete(k);
  torques.delete(k);
  angles.delete(k);
}

export function speedAt(x: number, y: number, z: number): Frac {
  return speeds.get(mkey(x, y, z)) ?? { n: 0, d: 1 };
}

export function torqueAt(x: number, y: number, z: number): Frac {
  return torques.get(mkey(x, y, z)) ?? { n: 0, d: 1 };
}

/** Cam lift, 0 at the start of a turn and 1 halfway through. */
export function strokeAt(x: number, y: number, z: number) {
  const a = angles.get(mkey(x, y, z)) ?? 0;
  return (1 - Math.cos(a * Math.PI * 2)) / 2;
}

function along(axis: Axis, p: MechPart, q: MechPart) {
  if (axis === "x") return p.y === q.y && p.z === q.z ? q.x - p.x : 0;
  if (axis === "y") return p.x === q.x && p.z === q.z ? q.y - p.y : 0;
  return p.x === q.x && p.y === q.y ? q.z - p.z : 0;
}

function nearestShaft(p: MechPart): MechPart[] {
  let pos: MechPart | null = null;
  let neg: MechPart | null = null;
  let posD = 17;
  let negD = 17;
  for (const q of parts.values()) {
    if (q === p || q.axis !== p.axis) continue;
    const d = along(p.axis, p, q);
    if (d > 0 && d < posD && d <= 16) {
      posD = d;
      pos = q;
    } else if (d < 0 && -d < negD && -d <= 16) {
      negD = -d;
      neg = q;
    }
  }
  const out: MechPart[] = [];
  if (pos) out.push(pos);
  if (neg) out.push(neg);
  return out;
}

function beside(p: MechPart, q: MechPart, dist: number) {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const dz = q.z - p.z;
  const ad = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
  if (ad !== dist) return false;
  if (p.axis === "x" && dx !== 0) return false;
  if (p.axis === "y" && dy !== 0) return false;
  if (p.axis === "z" && dz !== 0) return false;
  return p.axis === q.axis;
}

function meshing(p: MechPart): MechPart[] {
  const out: MechPart[] = [];
  if (!p.teeth) return out;
  for (const q of parts.values()) {
    if (q === p || (q.kind !== "gear" && q.kind !== "slip") || !q.teeth || q.axis !== p.axis) continue;
    const need = meshStuds(p.teeth, q.teeth);
    if (need !== (need | 0)) continue;
    if (beside(p, q, need)) out.push(q);
  }
  return out;
}

function wormDriven(p: MechPart): MechPart[] {
  const out: MechPart[] = [];
  for (const q of parts.values()) {
    if (q.kind !== "gear" || !q.teeth || q.axis === p.axis) continue;
    const ad = Math.abs(q.x - p.x) + Math.abs(q.y - p.y) + Math.abs(q.z - p.z);
    if (ad === 2) out.push(q);
  }
  return out;
}

function sameBelt(p: MechPart): MechPart[] {
  const out: MechPart[] = [];
  if (!p.belt) return out;
  for (const q of parts.values()) {
    if (q !== p && q.kind === "pulley" && q.belt === p.belt) out.push(q);
  }
  return out;
}

export function tickMech(dt = 1) {
  solveMech();
  integrateMech(dt);
}

/** Speeds only. A differential calls this twice: once to read the inputs, once with the averaged output. */
export function solveMech(seeds: { x: number; y: number; z: number; s: Frac }[] = []) {
  speeds.clear();
  torques.clear();
  const q: { p: MechPart; s: Frac; t: Frac }[] = [];
  let guard = 0;
  const push = (p: MechPart, s: Frac, t: Frac) => {
    if (guard >= MESH_CAP) return;
    if (p.kind === "slip" && Math.abs(t.n) > SLIP_LIMIT * Math.abs(t.d)) return;
    const k = mkey(p.x, p.y, p.z);
    const prev = speeds.get(k);
    if (prev) {
      if (!same(prev, s)) {
        speeds.set(k, { n: 0, d: 1 });
        torques.set(k, { n: 0, d: 1 });
      }
      return;
    }
    speeds.set(k, s);
    torques.set(k, t);
    guard++;
    q.push({ p, s, t });
  };
  for (const p of parts.values()) {
    if ((p.kind === "crank" || p.kind === "wheel") && p.driveD) push(p, frac(p.driveN ?? 0, p.driveD), frac(1, 1));
  }
  for (const seed of seeds) {
    const p = parts.get(mkey(seed.x, seed.y, seed.z));
    if (p && seed.s.n) push(p, frac(seed.s.n, seed.s.d), frac(1, 1));
  }
  for (let i = 0; i < q.length && guard < MESH_CAP; i++) {
    const { p } = q[i];
    const s = speeds.get(mkey(p.x, p.y, p.z));
    const t = torques.get(mkey(p.x, p.y, p.z));
    if (!s || !t || (!s.n && q[i].s.n)) continue;
    if (!(p.kind === "clutch" && p.open) && p.kind !== "diff") {
      for (const n of nearestShaft(p)) push(n, s, t);
    }
    if (p.kind === "gear" || p.kind === "slip") {
      for (const n of meshing(p)) push(n, mul(s, -p.teeth, n.teeth), mul(t, n.teeth, p.teeth));
    } else if (p.kind === "worm") {
      for (const n of wormDriven(p)) push(n, mul(s, -1, n.teeth), mul(t, n.teeth, 1));
    }
    if (p.kind === "pulley") {
      for (const n of sameBelt(p)) {
        const a = p.pulley || 1;
        const b = n.pulley || 1;
        push(n, mul(s, a, b), mul(t, b, a));
      }
    }
  }
}

export function integrateMech(dt: number) {
  if (!dt) return;
  for (const [k, s] of speeds) {
    if (!s.n) continue;
    const next = (angles.get(k) ?? 0) + (s.n / s.d) * dt;
    angles.set(k, next - Math.floor(next));
  }
}
