// B18: first-person driving view helpers (pure, tested).
// The Rig Digger crowds its hub with a mast, motor and servos; from the
// computed seat a dark part filled ~60 % of the right view. In the
// first-person driving view we hide the parts hugging the driver's eye
// (never the wheels or the dig bucket — the driver must see what digs).
import type { Vehicle } from "./vehicle.ts";

type V3 = { x: number; y: number; z: number };
type Part = Vehicle["parts"][number];
const BUCKET_ID = 471;

export function boxDist(p: Part, e: V3): number {
  if (!p.box) return Infinity;
  const dx = Math.max(p.box.min.x - e.x, 0, e.x - p.box.max.x);
  const dy = Math.max(p.box.min.y - e.y, 0, e.y - p.box.max.y);
  const dz = Math.max(p.box.min.z - e.z, 0, e.z - p.box.max.z);
  return Math.hypot(dx, dy, dz);
}

/** The seat search (B17), lifted out of game.ts so it can be tested. */
export function seatEye(v: Vehicle, inWorld: (eye: V3) => boolean = () => true): V3 | null {
  const hub = v.parts.find((p) => p.role === "hub");
  if (!hub) return null;
  const c = hub.centreLocal;
  const clearance = (eye: V3) => Math.min(...v.parts.map((p) => boxDist(p, eye)));
  let best: V3 | null = null;
  let bestD = -1;
  for (const rear of [1.2, 2, 2.8, 3.6]) {
    for (const up of [1.2, 1.8, 2.4, 3]) {
      for (const xoff of [0, 1, -1]) {
        const eye = { x: c.x + xoff, y: c.y + up, z: c.z + rear };
        if (!inWorld(eye)) continue;
        const d = clearance(eye);
        if (d > bestD) { bestD = d; best = eye; }
        if (d >= 0.45) return eye;
      }
    }
  }
  return best;
}

function rayBox(o: V3, d: V3, p: Part, maxT: number): boolean {
  if (!p.box) return false;
  let t0 = 0, t1 = maxT;
  for (const k of ["x", "y", "z"] as const) {
    const inv = 1 / (d[k] || 1e-9);
    let a = (p.box.min[k] - o[k]) * inv, b = (p.box.max[k] - o[k]) * inv;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 > t1) return false;
  }
  return true;
}

/** Fraction of a ~70° view cone toward horizontal direction `dir`
 *  (vehicle frame) blocked by visible parts within `range` blocks. */
export function viewBlocked(v: Vehicle, eye: V3, dir: V3, hidden: ReadonlySet<number> = new Set(), range = 2.5): number {
  const n = 9;
  const fwd = { x: dir.x, y: 0, z: dir.z };
  const L = Math.hypot(fwd.x, fwd.z) || 1;
  fwd.x /= L; fwd.z /= L;
  const right = { x: -fwd.z, y: 0, z: fwd.x };
  const half = Math.tan((35 * Math.PI) / 180);
  let hit = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const sx = (i / (n - 1) * 2 - 1) * half, sy = (j / (n - 1) * 2 - 1) * half * 0.6 - 0.15;
    const d = { x: fwd.x + right.x * sx, y: sy, z: fwd.z + right.z * sx };
    const dl = Math.hypot(d.x, d.y, d.z);
    d.x /= dl; d.y /= dl; d.z /= dl;
    if (v.parts.some((p) => !hidden.has(p.uid) && rayBox(eye, d, p, range))) hit++;
  }
  return hit / (n * n);
}

/** Parts to hide in the first-person driving view: anything (but wheels
 *  and the dig bucket) within 1.3 blocks of the eye, or so close and so
 *  big that it walls off a view direction. */
export function driverOccluders(v: Vehicle, eye: V3): Set<number> {
  const out = new Set<number>();
  for (const p of v.parts) {
    if (!p.box || p.role === "wheel" || p.id === BUCKET_ID) continue;
    const d = boxDist(p, eye);
    const diag = Math.hypot(p.box.max.x - p.box.min.x, p.box.max.y - p.box.min.y, p.box.max.z - p.box.min.z);
    if (d < 1.3 || (d < 2.5 && diag / Math.max(d, 0.05) > 1.1)) out.add(p.uid);
  }
  return out;
}

/** B21: third-person chase distance from the driver's eye: past the
 *  farthest part of the machine (frame AABBs) plus a margin. */
export function vehChaseDistance(v: Vehicle, eye: V3 | null): number {
  const e = eye ?? { x: 0, y: 0, z: 0 };
  let far = 0;
  for (const p of v.parts) {
    if (!p.box) continue;
    for (const x of [p.box.min.x, p.box.max.x]) for (const y of [p.box.min.y, p.box.max.y]) for (const z of [p.box.min.z, p.box.max.z])
      far = Math.max(far, Math.hypot(x - e.x, y - e.y, z - e.z));
  }
  return Math.min(16, Math.max(4.2, far + 2));
}

/** B21: park on uneven ground — the rounded lattice poses lifted a
 *  quarter-module at a time (≤ maxLift) to the first height where every
 *  part fits; null when none does. */
export function liftToFit<T extends { q: [number, number, number] }>(poses: T[], fits: (p: T) => boolean, maxLift = 8): T[] | null {
  for (let l = 0; l <= maxLift; l++) {
    const cand = poses.map((p) => ({ ...p, q: [p.q[0], p.q[1] + l, p.q[2]] as [number, number, number] }));
    if (cand.every(fits)) return cand;
  }
  return null;
}
