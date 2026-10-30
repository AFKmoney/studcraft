// LEGO Technic — 1:1 parts, real assembly, real mechanics (pure, no three.js).
// Units: 1 module (M) = 8 mm = 1 stud pitch (Catalogue LEGO Technic PDF).
// World: 1 block = 2 studs, so 1 M = 0.5 block. Parts live on a lattice in
// half-modules (q): world = q / 4 blocks. Hole/axle lines sit on odd q.
// Local frame of every part: X = length, holes of flat parts along Z,
// shafts (axles, pins, tubes) along X. Thin parts span z∈[-0.5, 0].
import { ID } from "./blocks.ts";

export type V3 = [number, number, number];
export type Ax = 0 | 1 | 2;
export type HoleT = "P" | "A"; // pin hole (round) / axle hole (cross)
export type MaleT = "p" | "a"; // pin shaft / axle shaft
export type Hole = { c: V3; ax: Ax; len: number; t: HoleT };
export type Male = { c: V3; ax: Ax; len: number; t: MaleT };
export type Seg = [[number, number], [number, number]];
// Draw ops — interpreted by technicGeo.ts (three.js), pure data here.
export type Op =
  | { k: "plate"; segs: Seg[]; holes: [number, number, HoleT | "N"][]; z0: number; z1: number; col: number; w: number }
  | { k: "axle"; x0: number; x1: number; col: number; stop?: number }
  | { k: "pin"; x0: number; x1: number; collar: number[]; col: number; ball?: boolean }
  | { k: "tube"; ax: Ax; c: V3; r: number; len: number; hole: HoleT | "N"; col: number; flange?: number }
  | { k: "box"; a: V3; b: V3; col: number }
  | { k: "cyl"; ax: Ax; c: V3; r: number; len: number; col: number; seg?: number }
  | { k: "sphere"; c: V3; r: number; col: number }
  | { k: "gear"; n: number; z0: number; z1: number; col: number; taper?: "one" | "two"; holes?: [number, number, HoleT][]; ax?: Ax; at?: V3 }
  | { k: "worm"; x0: number; x1: number; col: number }
  | { k: "rack"; x0: number; x1: number; col: number; holes: [number, HoleT][] }
  | { k: "lathe"; ax: Ax; c: V3; pts: [number, number][]; col: number }
  | { k: "helix"; ax: Ax; c: V3; r: number; tr: number; len: number; turns: number; col: number }
  | { k: "blade"; n: number; r0: number; r1: number; w0: number; w1: number; t: number; col: number; pitch: number; z: number }
  | { k: "studs"; xs: number[]; ys: number[]; z: number; col: number }
  | { k: "dot"; c: V3; ax: Ax; r: number; col: number }
  | { k: "arm"; d: [number, number]; r: number; len: number; col: number }
  | { k: "shell"; x0: number; x1: number; r: number; y: number; z: number; a0: number; a1: number; col: number };

export type GearInfo = { n: number; kind: "spur" | "bevel" | "worm"; c: V3; ax: Ax };
export type Spec = {
  id: number;
  part: string; // real LEGO design ID
  col: number; // main real colour
  prim: Ax; // primary axis (hole axis for flat parts, shaft axis for rods)
  holes: Hole[];
  males: Male[];
  boxes: [V3, V3][];
  discs: { c: V3; ax: Ax; r: number; len: number }[];
  ops: Op[];
  gears: GearInfo[];
  drive?: "motor" | "crank" | "power";
  rpm?: number;
  hand?: number; // optional display scale in hand
};

// Real LEGO colours (BrickLink/LDraw values)
export const COL = {
  LBG: 0xa0a5a9, // light bluish gray
  DBG: 0x6c6e68, // dark bluish gray
  BLK: 0x27282b, // black (lifted a hair so it shades)
  BLU: 0x0055bf,
  TAN: 0xe4cd9e,
  RED: 0xc91a09,
  YEL: 0xf2cd37,
  WHT: 0xf4f4f4,
  ORG: 0xfe8a18,
  GRN: 0x4b9f4a,
  TRC: 0xdfe8ec, // trans-clear-ish
  MET: 0x9ba19d, // flat silver
};
const { LBG, DBG, BLK, BLU, TAN, RED, YEL, WHT, ORG, GRN, TRC, MET } = COL;

// Real-geometry constants (modules)
export const HOLE_R = 4.85 / 16; // Ø 4.85 mm
export const AXLE_R = 4.8 / 16; // axle cross span 4.8 mm
export const AXLE_W = 1.8 / 16; // axle arm half-width (1.8 mm arm)
export const BEAM_W = 7.2 / 8; // studless beam width 7.2 mm
export const pitchR = (n: number) => n / 16; // module-1 gears: Ø_pitch(mm) = teeth

class B {
  s: Spec;
  constructor(id: number, part: string, col: number, prim: Ax) {
    this.s = { id, part, col, prim, holes: [], males: [], boxes: [], discs: [], ops: [], gears: [] };
  }
  // flat outline (union of stadium segments) with holes along Z, z0..z1
  plate(segs: Seg[], holes: [number, number, HoleT | "N"][], z0: number, z1: number, col = this.s.col, w = BEAM_W, occ = true) {
    this.s.ops.push({ k: "plate", segs, holes, z0, z1, col, w });
    for (const [x, y, t] of holes) if (t !== "N") this.s.holes.push({ c: [x, y, (z0 + z1) / 2], ax: 2, len: z1 - z0, t });
    if (occ)
      for (const [[ax, ay], [bx, by]] of segs) {
        if (ax !== bx && ay !== by) continue; // diagonal: holes only
        this.s.boxes.push([
          [Math.min(ax, bx) - 0.5, Math.min(ay, by) - 0.5, z0],
          [Math.max(ax, bx) + 0.5, Math.max(ay, by) + 0.5, z1],
        ]);
      }
    return this;
  }
  beam(L: number, thin: boolean, ends: HoleT = "P", mid: HoleT = "P", col = this.s.col) {
    const h = (L - 1) / 2;
    const holes: [number, number, HoleT][] = [];
    for (let i = 0; i < L; i++) holes.push([i - h, 0, i === 0 || i === L - 1 ? ends : mid]);
    return this.plate([[[-h, 0], [h, 0]]], holes, thin ? -0.5 : -0.5, thin ? 0 : 0.5, col);
  }
  axle(x0: number, x1: number, col = this.s.col, stop?: number) {
    this.s.ops.push({ k: "axle", x0, x1, col, stop });
    this.s.males.push({ c: [(x0 + x1) / 2, 0, 0], ax: 0, len: x1 - x0, t: "a" });
    return this;
  }
  pin(x0: number, x1: number, collar: number[], col = this.s.col, ball = false) {
    this.s.ops.push({ k: "pin", x0, x1, collar, col, ball });
    if (!ball) this.s.males.push({ c: [(x0 + x1) / 2, 0, 0], ax: 0, len: x1 - x0, t: "p" });
    return this;
  }
  tube(ax: Ax, c: V3, r: number, len: number, hole: HoleT | "N", col = this.s.col, flange?: number) {
    this.s.ops.push({ k: "tube", ax, c, r, len, hole, col, flange });
    if (hole !== "N") this.s.holes.push({ c, ax, len, t: hole });
    this.s.discs.push({ c, ax, r: Math.max(r, 0.45), len });
    return this;
  }
  box(a: V3, b: V3, col = this.s.col, occ = true) {
    this.s.ops.push({ k: "box", a, b, col });
    if (occ) this.s.boxes.push([a, b]);
    return this;
  }
  cyl(ax: Ax, c: V3, r: number, len: number, col = this.s.col, occ = false, seg?: number) {
    this.s.ops.push({ k: "cyl", ax, c, r, len, col, seg });
    if (occ) this.s.discs.push({ c, ax, r, len });
    return this;
  }
  gear(n: number, z0: number, z1: number, col = this.s.col, taper?: "one" | "two", holes: [number, number, HoleT][] = [], centre: HoleT = "A") {
    this.s.ops.push({ k: "gear", n, z0, z1, col, taper, holes: [[0, 0, centre], ...holes] });
    this.s.holes.push({ c: [0, 0, (z0 + z1) / 2], ax: 2, len: z1 - z0, t: centre });
    for (const [x, y, t] of holes) this.s.holes.push({ c: [x, y, (z0 + z1) / 2], ax: 2, len: z1 - z0, t });
    const r = pitchR(n) - 0.3;
    if (r > 0.5) this.s.discs.push({ c: [0, 0, (z0 + z1) / 2], ax: 2, r, len: z1 - z0 });
    this.s.gears.push({ n, kind: taper ? "bevel" : "spur", c: [0, 0, (z0 + z1) / 2], ax: 2 });
    return this;
  }
  op(o: Op) {
    this.s.ops.push(o);
    return this;
  }
  hole(c: V3, ax: Ax, len: number, t: HoleT, dots = true) {
    this.s.holes.push({ c, ax, len, t });
    if (dots) {
      for (const sg of [-1, 1]) {
        const p = [...c] as V3;
        p[ax] += (sg * len) / 2 + sg * 0.004;
        this.s.ops.push({ k: "dot", c: p, ax, r: t === "A" ? AXLE_R : HOLE_R, col: 0x141414 });
      }
    }
    return this;
  }
  male(c: V3, ax: Ax, len: number, t: MaleT) {
    this.s.males.push({ c, ax, len, t });
    return this;
  }
  done(extra: Partial<Spec> = {}) {
    return Object.assign(this.s, extra);
  }
}

const S = new Map<number, Spec>();
const put = (s: Spec) => S.set(s.id, s);

// ---------- AXLES (cross 4.8 mm, 1L = 8 mm) ----------
const axleL: [number, string, number, number][] = [
  [ID.Axle2, "32062", 2, RED],
  [ID.Axle, "4519", 3, LBG],
  [ID.Axle4, "3705", 4, BLK],
  [ID.Axle6, "3706", 6, BLK],
  [ID.Axle8, "3707", 8, BLK],
];
for (const [id, part, L, col] of axleL) put(new B(id, part, col, 0).axle(-L / 2, L / 2).done());
put(new B(ID.AxleStop3, "24316", DBG, 0).axle(-1.5, 1.5, DBG, 1).done());
put(new B(ID.AxleStop5, "15462", DBG, 0).axle(-2.5, 2.5, DBG, 1).done());

// ---------- PINS ----------
put(new B(ID.Pin2L, "2780", BLK, 0).pin(-1, 1, [0]).done());
put(new B(ID.PinFree, "3673", LBG, 0).pin(-1, 1, [0]).done());
put(new B(ID.Pin3L, "6558", BLU, 0).pin(-1.5, 1.5, [-0.5]).done());
put(new B(ID.Pin3LFree, "32556", TAN, 0).pin(-1.5, 1.5, [-0.5]).done());
put(new B(ID.AxlePin, "43093", BLU, 0).pin(-1, 0, [0]).axle(0, 1, BLU).done());
put(new B(ID.Towball, "6628", BLK, 0).pin(-1, 0, [0]).pin(0, 1, [], BLK, true).done());

// ---------- BUSHES / RINGS ----------
put(new B(ID.Bush, "3713", LBG, 0).tube(0, [0, 0, 0], 0.36, 0.92, "A", LBG, 0.44).done());
put(new B(ID.HalfBush, "32123", YEL, 0).tube(0, [-0.25, 0, 0], 0.38, 0.46, "A").done());
put(new B(ID.Ring, "18947", DBG, 0).tube(0, [0, 0, 0], 0.44, 0.94, "A").cyl(0, [0, 0, 0], 0.5, 0.22, DBG).done());

// ---------- LIFTARMS (studless 1M, thin 0.5M) ----------
const beams: [number, string, number][] = [
  [ID.Liftarm3, "32523", 3],
  [ID.Liftarm5, "32316", 5],
  [ID.Liftarm7, "32524", 7],
  [ID.Liftarm9, "40490", 9],
  [ID.Liftarm11, "32525", 11],
  [ID.Liftarm13, "41239", 13],
  [ID.Liftarm15, "32278", 15],
];
for (const [id, part, L] of beams) put(new B(id, part, LBG, 2).beam(L, false).done());
const thins: [number, string, number][] = [
  [ID.Thin3, "6632", 3],
  [ID.Thin5, "32017", 5],
  [ID.Thin7, "32065", 7],
];
for (const [id, part, L] of thins) put(new B(id, part, LBG, 2).beam(L, true, "A", "P").done());
// 32526 — liftarm 3×5 L-shape thick (7 holes, shared corner)
{
  const h: [number, number, HoleT][] = [];
  for (let i = 0; i < 5; i++) h.push([i - 2, 0, "P"]);
  for (let j = 1; j < 3; j++) h.push([-2, j, "P"]);
  put(new B(ID.BentL, "32526", LBG, 2).plate([[[-2, 0], [2, 0]], [[-2, 0], [-2, 2]]], h, -0.5, 0.5).done());
}
// 60484 — liftarm 3×3 T-shape thick
put(
  new B(ID.BentT, "60484", LBG, 2)
    .plate([[[-1, 0], [1, 0]], [[0, 0], [0, -2]]], [[-1, 0, "P"], [0, 0, "P"], [1, 0, "P"], [0, -1, "P"], [0, -2, "A"]], -0.5, 0.5)
    .done(),
);
// Frames 5×7 (64179), 7×11 (39790), 11×15 (39794) — open studless frames
const frames: [number, string, number, number][] = [
  [ID.Frame57, "64179", 7, 5],
  [ID.Frame711, "39790", 11, 7],
  [ID.Frame1115, "39794", 15, 11],
];
for (const [id, part, L, W] of frames) {
  const hx = (L - 1) / 2;
  const hy = (W - 1) / 2;
  const h: [number, number, HoleT][] = [];
  for (let i = 0; i < L; i++) h.push([i - hx, -hy, "P"], [i - hx, hy, "P"]);
  for (let j = 1; j < W - 1; j++) h.push([-hx, j - hy, j === hy ? "A" : "P"], [hx, j - hy, j === hy ? "A" : "P"]);
  put(
    new B(id, part, LBG, 2)
      .plate([[[-hx, -hy], [hx, -hy]], [[-hx, hy], [hx, hy]], [[-hx, -hy], [-hx, hy]], [[hx, -hy], [hx, hy]]], h, -0.5, 0.5)
      .done(),
  );
}
// 2905 — triangle thin liftarm
put(
  new B(ID.Triangle, "2905", LBG, 2)
    .plate([[[0, 0], [2, 0]], [[0, 0], [0, 2]], [[2, 0], [0, 2]]], [[0, 0, "A"], [1, 0, "P"], [2, 0, "P"], [0, 1, "P"], [0, 2, "P"]], -0.5, 0)
    .done(),
);
// 2853 — connecting rod (thin, pin holes ends)
put(new B(ID.ConRod, "2853", LBG, 2).plate([[[-1, 0], [1, 0]]], [[-1, 0, "P"], [1, 0, "P"]], -0.5, 0, LBG, 0.72).done());
// Crank — thin liftarm 1×3 axle hole + handle post (6629-style)
put(
  new B(ID.Crank, "33299", BLK, 2)
    .plate([[[-1, 0], [1, 0]]], [[-1, 0, "A"], [0, 0, "P"], [1, 0, "N"]], -0.5, 0)
    .cyl(2, [1, 0, 0.55], 0.26, 1.1, LBG, true)
    .cyl(2, [1, 0, 1.12], 0.34, 0.12, LBG)
    .done({ drive: "crank", rpm: 40 }),
);
// 6575 — cam (oval, axle hole centre, pin holes eccentric)
put(new B(ID.Cam, "6575", LBG, 2).plate([[[-0.5, 0], [0.5, 0]]], [[-0.5, 0, "A"], [0.5, 0, "P"]], -0.5, 0, LBG, 1.5).done());

// ---------- CONNECTORS ----------
// Angle connectors #1..#6: corner pin hole (Z) + axle-hole arms; angle between arms
const angles: [number, string, number, number][] = [
  [ID.Angle1, "32013", 0, BLK],
  [ID.Angle2, "32034", 180, BLK],
  [ID.Angle3, "32016", 157.5, WHT],
  [ID.Angle4, "32192", 135, LBG],
  [ID.Angle5, "32015", 112.5, WHT],
  [ID.Angle6, "32014", 90, LBG],
];
for (const [id, part, deg, col] of angles) {
  const b = new B(id, part, col, 2).tube(2, [0, 0, 0], 0.46, 0.96, "P");
  b.tube(0, [-1, 0, 0], 0.4, 1, "A");
  if (deg > 0) {
    const phi = Math.PI - (deg * Math.PI) / 180;
    const dx = Math.cos(phi);
    const dy = Math.sin(phi);
    if (Math.abs(dy) < 1e-6) b.tube(0, [1, 0, 0], 0.4, 1, "A");
    else if (Math.abs(dx) < 1e-6) b.tube(1, [0, 1, 0], 0.4, 1, "A");
    else b.op({ k: "arm", d: [dx, dy], r: 0.4, len: 1, col }); // off-grid arm: drawn, not on the lattice
  }
  put(b.done());
}
// 6536 — axle & pin connector perpendicular
put(new B(ID.CrossBlock, "6536", LBG, 2).box([0, -0.48, -0.48], [1, 0.48, 0.48]).hole([0.5, 0, 0], 2, 0.96, "P").box([-1, -0.48, -0.48], [0, 0.48, 0.48]).hole([-0.5, 0, 0], 1, 0.96, "A").done());
// 61903 — universal joint 3L (axle-hole forks)
put(
  new B(ID.UJoint, "61903", LBG, 0)
    .tube(0, [-1, 0, 0], 0.42, 1, "A")
    .tube(0, [1, 0, 0], 0.42, 1, "A")
    .box([-0.5, -0.42, -0.12], [0.5, 0.42, 0.12], LBG, false)
    .box([-0.12, -0.12, -0.42], [0.12, 0.12, 0.42], DBG, false)
    .done(),
);
// CV joint (32494 housing + 32495 ball axle)
put(new B(ID.CVJoint, "32494", LBG, 0).tube(0, [-0.5, 0, 0], 0.5, 1, "A").op({ k: "sphere", c: [0.15, 0, 0], r: 0.4, col: LBG }).axle(0.5, 1.5, LBG).done());
// 6.5L shock absorber (eyes 5.5M apart: ends 6.5L)
put(
  new B(ID.Shock, "731c06", DBG, 0)
    .tube(2, [-2.75, 0, 0], 0.45, 0.96, "P")
    .tube(2, [2.75, 0, 0], 0.45, 0.96, "P")
    .cyl(0, [-0.9, 0, 0], 0.42, 3, DBG, true)
    .cyl(0, [1.3, 0, 0], 0.18, 2.4, MET)
    .op({ k: "helix", ax: 0, c: [-0.7, 0, 0], r: 0.4, tr: 0.06, len: 3.6, turns: 9, col: LBG })
    .done(),
);
// Hub 3×3 with axle centre + pin holes (92911-style), knuckle (92908)
put(new B(ID.Hub, "92911", DBG, 2).hole([0, 0, 0], 2, 1, "A", false).op({ k: "lathe", ax: 2, c: [0, 0, 0], pts: [[0.32, -0.5], [1.4, -0.5], [1.4, 0.5], [0.32, 0.5]], col: DBG }).hole([1, 0, 0], 2, 1, "P").hole([-1, 0, 0], 2, 1, "P").hole([0, 1, 0], 2, 1, "P").hole([0, -1, 0], 2, 1, "P").done());
S.get(ID.Hub)!.discs.push({ c: [0, 0, 0], ax: 2, r: 1.4, len: 1 });
put(
  new B(ID.Knuckle, "92908", LBG, 2)
    .box([-0.5, -1.5, -0.5], [0.5, 1.5, 0.5])
    .hole([0, 0, 0], 2, 1, "A")
    .hole([0, 1, 0], 2, 1, "P")
    .hole([0, -1, 0], 2, 1, "P")
    .plate([[[0, 1], [1.5, 1]]], [[1.5, 1, "P"]], -0.25, 0.25, LBG, 0.9, false)
    .done(),
);

// ---------- GEARS (module 1: pitch Ø mm = teeth; R = N/16 M) ----------
put(new B(ID.Gear8, "10928", DBG, 2).gear(8, -0.5, 0).done());
put(new B(ID.Gear16, "94925", LBG, 2).gear(16, -0.5, 0).done());
put(new B(ID.Gear24, "3648", DBG, 2).gear(24, -0.5, 0, DBG, undefined, [[1, 0, "P"], [-1, 0, "P"], [0, 1, "P"], [0, -1, "P"]]).done());
put(new B(ID.Gear40, "3649", LBG, 2).gear(40, -0.5, 0, LBG, undefined, [[1, 0, "P"], [-1, 0, "P"], [0, 1, "P"], [0, -1, "P"], [2, 0, "A"], [-2, 0, "A"], [0, 2, "A"], [0, -2, "A"]]).done());
put(new B(ID.Slip, "60c01", WHT, 2).gear(24, -0.5, 0, WHT).op({ k: "cyl", ax: 2, c: [0, 0, -0.25], r: 0.62, len: 0.52, col: DBG }).done());
put(new B(ID.Clutch, "18946", DBG, 2).gear(16, -0.5, 0, DBG, undefined, [], "P").cyl(2, [0, 0, 0.18], 0.46, 0.36, DBG, true).done());
put(new B(ID.Bevel12, "6589", TAN, 2).gear(12, -0.5, 0, TAN, "one").done());
put(new B(ID.Bevel20, "32198", TAN, 2).gear(20, -0.5, 0, TAN, "one").done());
put(new B(ID.DBevel12, "32270", BLK, 2).gear(12, -0.5, 0, BLK, "two").done());
put(new B(ID.DBevel20, "32269", TAN, 2).gear(20, -0.5, 0, TAN, "two").done());
put(new B(ID.DBevel36, "32498", BLK, 2).gear(36, -0.5, 0, BLK, "two", [[1, 0, "P"], [-1, 0, "P"], [0, 1, "P"], [0, -1, "P"]]).done());
// 4716 — worm screw (2L, axle hole)
{
  const b = new B(ID.Worm, "4716", LBG, 0).op({ k: "worm", x0: -1, x1: 1, col: LBG });
  b.s.holes.push({ c: [0, 0, 0], ax: 0, len: 2, t: "A" });
  b.s.discs.push({ c: [0, 0, 0], ax: 0, r: 0.5, len: 2 });
  b.s.gears.push({ n: 1, kind: "worm", c: [0, 0, 0], ax: 0 });
  put(b.done());
}
// 4185 — wedge belt wheel (pulley)
put(
  new B(ID.Pulley, "4185", LBG, 2)
    .op({ k: "lathe", ax: 2, c: [0, 0, -0.25], pts: [[0.3, -0.24], [1.18, -0.24], [0.98, 0], [1.18, 0.24], [0.3, 0.24]], col: LBG })
    .hole([0, 0, -0.25], 2, 0.5, "A")
    .done(),
);
S.get(ID.Pulley)!.discs.push({ c: [0, 0, -0.25], ax: 2, r: 0.9, len: 0.5 });
// 62821 — differential 28T
put(
  new B(ID.Diff, "62821", DBG, 0)
    .cyl(0, [-0.25, 0, 0], 0.95, 1.5, DBG, true)
    .op({ k: "gear", n: 28, z0: -0.25, z1: 0.25, col: DBG, taper: "one", ax: 0, at: [0.75, 0, 0] })
    .hole([0, 0, 0], 0, 2, "A")
    .done(),
);
S.get(ID.Diff)!.gears.push({ n: 28, kind: "bevel", c: [0.75, 0, 0], ax: 0 });
// Turntables: 28T (99009/99010, 3×3), 56T (48452, 7×7), 60T (18938/18939)
const turns: [number, string, number, number, number, number][] = [
  [ID.Turn28, "99009", 28, 1.5, BLK, LBG],
  [ID.Turn56, "48452", 56, 3.5, BLK, DBG],
  [ID.Turret, "18938", 60, 3.5, DBG, LBG],
];
for (const [id, part, n, h, cb, ct] of turns) {
  const b = new B(id, part, cb, 2).box([-h, -h, -0.5], [h, h, 0], cb);
  b.op({ k: "gear", n, z0: 0, z1: 0.5, col: ct });
  b.hole([0, 0, -0.25], 2, 0.5, "A", false);
  b.s.holes.push({ c: [0, 0, 0.25], ax: 2, len: 0.5, t: "A" });
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) b.hole([sx * (h - 0.5), sy * (h - 0.5), -0.25], 2, 0.5, "P");
  b.s.discs.push({ c: [0, 0, 0.25], ax: 2, r: h, len: 0.5 });
  b.s.gears.push({ n, kind: "spur", c: [0, 0, 0.25], ax: 2 });
  put(b.done());
}
// Racks (π mm pitch): 3743 1×4, 1×4 holed, 87761 1×7, 1×14
const racks: [number, string, number, boolean, number][] = [
  [ID.Rack, "3743", 4, false, LBG],
  [ID.Rack4, "3743b", 4, true, DBG],
  [ID.Rack7, "87761", 7, true, LBG],
  [ID.Rack14, "18942", 14, true, LBG],
];
for (const [id, part, L, holed, col] of racks) {
  const hs: [number, HoleT][] = [];
  if (holed) for (let i = 0; i < L; i++) hs.push([i - (L - 1) / 2, i === 0 || i === L - 1 ? "A" : "P"]);
  const b = new B(id, part, col, 2).op({ k: "rack", x0: -L / 2, x1: L / 2, col, holes: hs });
  for (const [x, t] of hs) b.s.holes.push({ c: [x, 0, 0], ax: 2, len: 1, t });
  b.s.boxes.push([[-L / 2, -0.5, -0.5], [L / 2, 0.5, 0.5]]);
  put(b.done());
}

// ---------- WHEELS / ROTORS ----------
put(
  new B(ID.Road, "56145", LBG, 2)
    .op({ k: "lathe", ax: 2, c: [0, 0, 0], pts: [[1.2, -0.85], [1.75, -0.9], [1.92, -0.6], [1.92, 0.6], [1.75, 0.9], [1.2, 0.85]], col: BLK })
    .op({ k: "lathe", ax: 2, c: [0, 0, 0], pts: [[0.32, -0.95], [1.22, -0.88], [1.22, 0.88], [0.32, 0.95]], col: LBG })
    .hole([0, 0, 0], 2, 2, "A")
    .done(),
);
S.get(ID.Road)!.discs.push({ c: [0, 0, 0], ax: 2, r: 1.9, len: 2 });
put(new B(ID.Wheel, "2983", BLU, 2).tube(2, [0, 0, 0], 0.5, 1, "A", LBG).op({ k: "blade", n: 8, r0: 0.5, r1: 2.5, w0: 0.9, w1: 0.9, t: 0.14, col: BLU, pitch: 0, z: 0 }).done());
put(new B(ID.Mill, "2952", WHT, 2).tube(2, [0, 0, 0], 0.5, 1, "A", LBG).op({ k: "blade", n: 3, r0: 0.5, r1: 4.5, w0: 0.9, w1: 0.45, t: 0.12, col: WHT, pitch: 0.35, z: 0 }).done());
// 3873 — tread link (conveyor)
put(new B(ID.Belt, "3873", BLK, 2).box([-0.75, -1, -0.5], [0.75, 1, -0.25]).box([-0.25, -1, -0.25], [0.25, 1, 0], BLK, false).hole([0, 0, -0.25], 2, 0.5, "P", false).done());
// 32001 — Technic plate 2×6 with 5 holes (Trap)
put(
  new B(ID.Trap, "32001", DBG, 2)
    .box([-3, -1, -0.5], [3, 1, -0.1])
    .op({ k: "studs", xs: [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5], ys: [-0.5, 0.5], z: -0.1, col: DBG })
    .done(),
);
for (let i = -2; i <= 2; i++) S.get(ID.Trap)!.holes.push({ c: [i, 0, -0.3], ax: 2, len: 0.4, t: "P" });

// ---------- ACTUATORS / PNEUMATICS / ENGINE ----------
function rodPart(id: number, part: string, L: number, body: number, rod: number, r: number, input: boolean) {
  const e = (L - 1) / 2;
  const b = new B(id, part, body, 0).tube(2, [-e, 0, 0], 0.46, 0.96, "P", body).tube(2, [e, 0, 0], 0.46, 0.96, "P", rod);
  const bodyLen = L * 0.58;
  b.cyl(0, [-e + 0.5 + bodyLen / 2, 0, 0], r, bodyLen, body, true);
  b.cyl(0, [(-e + 0.5 + bodyLen + e - 0.5) / 2, 0, 0], 0.2, e - 0.5 - (-e + 0.5 + bodyLen), rod);
  if (input) b.hole([-e + 1, 0, 0], 2, 1, "A");
  return b;
}
put(rodPart(ID.ActMini, "92693", 5, DBG, LBG, 0.5, true).done());
put(rodPart(ID.Actuator, "61927", 7, DBG, LBG, 0.6, true).done());
put(rodPart(ID.ActXL, "47224", 11, DBG, LBG, 0.7, true).done());
put(rodPart(ID.Pump, "19482", 6, LBG, BLU, 0.6, false).done());
put(rodPart(ID.Cylinder, "19461", 6, LBG, MET, 0.55, false).done());
put(rodPart(ID.SpringPump, "2797", 6, TRC, LBG, 0.5, false).op({ k: "helix", ax: 0, c: [0.6, 0, 0], r: 0.33, tr: 0.05, len: 2, turns: 6, col: MET }).done());
put(
  new B(ID.SmallPump, "47225", LBG, 0)
    .box([-1.5, -0.5, -1], [0.5, 0.5, 1], DBG)
    .cyl(0, [1.25, 0, 0], 0.45, 1.5, LBG, true)
    .hole([-1, 0, 0], 1, 1, "P")
    .hole([0, 0, 0], 1, 1, "A")
    .done(),
);
put(
  new B(ID.Valve, "19476", LBG, 2)
    .box([-1.5, -0.5, -0.5], [1.5, 0.5, 0.5])
    .hole([-1, 0, 0], 2, 1, "P")
    .hole([1, 0, 0], 2, 1, "P")
    .hole([0, 0, 0], 1, 1, "A")
    .cyl(1, [0, 0.9, 0], 0.12, 0.8, RED)
    .op({ k: "sphere", c: [0, 1.32, 0], r: 0.2, col: RED })
    .cyl(0, [-1.7, 0, 0], 0.14, 0.4, LBG)
    .cyl(0, [1.7, 0, 0], 0.14, 0.4, LBG)
    .done(),
);
put(
  new B(ID.Tank, "67c01", WHT, 0)
    .op({ k: "lathe", ax: 0, c: [0, 0, 0], pts: [[0, -3], [0.6, -2.9], [0.92, -2.5], [0.95, 0], [0.92, 2.5], [0.6, 2.9], [0, 3]], col: WHT })
    .cyl(0, [3.2, 0, 0], 0.16, 0.5, LBG)
    .box([-2.5, -1.45, -0.5], [-1.5, -0.6, 0.5], LBG)
    .box([1.5, -1.45, -0.5], [2.5, -0.6, 0.5], LBG)
    .hole([-2, -1, 0], 2, 1, "P")
    .hole([2, -1, 0], 2, 1, "P")
    .done(),
);
S.get(ID.Tank)!.discs.push({ c: [0, 0, 0], ax: 0, r: 0.9, len: 6 });
put(new B(ID.Pipe, "5102", BLU, 0).cyl(0, [0, 0, 0], 0.2, 4, BLU, true, 10).cyl(0, [-1.9, 0, 0], 0.26, 0.2, LBG).cyl(0, [1.9, 0, 0], 0.26, 0.2, LBG).done());
put(new B(ID.PipeElbow, "4697", LBG, 0).box([-0.3, -0.3, -0.3], [0.3, 0.3, 0.3]).cyl(0, [0.5, 0, 0], 0.18, 0.5, LBG).cyl(1, [0, 0.5, 0], 0.18, 0.5, LBG).cyl(0, [-0.5, 0, 0], 0.18, 0.5, LBG).done());
// engine: 2850 cylinder, 2851 piston (rod 2853 above)
put(
  new B(ID.CylBlock, "2850", LBG, 1)
    .op({ k: "lathe", ax: 1, c: [0, 0.5, 0], pts: [[0.62, -1], [0.95, -1], [0.95, -0.7], [0.8, -0.6], [0.95, -0.4], [0.8, -0.2], [0.95, 0], [0.8, 0.2], [0.95, 0.4], [0.8, 0.6], [0.95, 0.7], [0.95, 1], [0.62, 1]], col: LBG })
    .box([-1, -1, -0.5], [1, -0.5, 0.5], LBG)
    .hole([-0.5, -1, 0], 2, 1, "P")
    .hole([0.5, -1, 0], 2, 1, "P")
    .done(),
);
S.get(ID.CylBlock)!.discs.push({ c: [0, 0.5, 0], ax: 1, r: 0.95, len: 2 });
put(new B(ID.EnginePiston, "2851", LBG, 1).cyl(1, [0, 0.1, 0], 0.6, 1.1, MET, true).hole([0, -0.1, 0], 2, 1, "P").done());

// ---------- PANELS / FAIRINGS ----------
function panel(id: number, part: string, L: number, curve: number, mirror: number, col = WHT) {
  const h = (L - 1) / 2;
  const b = new B(id, part, col, 2).plate([[[-h, 0], [h, 0]]], [[-h, 0, "P"], [h, 0, "P"]], -0.5, -0.25, col, 0.9);
  b.op({ k: "shell", x0: -h - 0.45, x1: h + 0.45, r: 1.3 + curve, y: mirror * 0.35, z: -1.55, a0: -0.5, a1: 0.5, col });
  return b;
}
put(panel(ID.Fairing1, "64683", 3, 0, 1).done());
put(panel(ID.Fairing2, "64681", 3, 0, -1, WHT).done());
put(panel(ID.FairLeft, "64391", 5, 0, 1).done());
put(panel(ID.FairRight, "64392", 5, 0, -1).done());
{
  const h: [number, number, HoleT][] = [];
  for (const x of [-5, 5]) for (const y of [-2, 0, 2]) h.push([x, y, "P"]);
  put(new B(ID.FairLarge, "64782", WHT, 2).box([-5.5, -2.5, -0.5], [5.5, 2.5, -0.25], WHT).done({}));
  for (const [x, y, t] of h) S.get(ID.FairLarge)!.holes.push({ c: [x, y, -0.375], ax: 2, len: 0.25, t });
}

// ---------- ELECTRONICS (Powered Up / Power Functions, real outer size) ----------
function eBox(id: number, part: string, body: number, a: V3, b: V3, top: number, out?: { c: V3; ax: Ax }, extra?: (bb: B) => void) {
  const bb = new B(id, part, body, 1).box(a, b, body);
  bb.box([a[0] + 0.1, b[1] - 0.15, a[2] + 0.1], [b[0] - 0.1, b[1] + 0.02, b[2] - 0.1], top, false);
  if (out) {
    bb.hole(out.c, out.ax, 1, "A", false);
    const p = [...out.c] as V3;
    bb.cyl(out.ax, p, 0.62, 1.02, top);
    bb.op({ k: "dot", c: ((): V3 => { const q = [...p] as V3; q[out.ax] += 0.52; return q; })(), ax: out.ax, r: AXLE_R, col: 0x141414 });
  }
  extra?.(bb);
  return bb;
}
const pinRow = (bb: B, xs: number[], y: number, z: number, len: number) => {
  for (const x of xs) bb.hole([x, y, z], 2, len, "P");
};
put(eBox(ID.MotorM, "45303", DBG, [-2, -1.5, -1.5], [2, 1.5, 1.5], LBG, { c: [2.5, 0, 0], ax: 0 }, (bb) => pinRow(bb, [-1, 1], -1, 0, 3)).done({ drive: "motor", rpm: 135 }));
put(eBox(ID.MotorL, "88013", DBG, [-3, -1.5, -1.5], [3, 1.5, 1.5], LBG, { c: [3.5, 0, 0], ax: 0 }, (bb) => pinRow(bb, [-2, 0, 2], -1, 0, 3)).done({ drive: "motor", rpm: 175 }));
put(eBox(ID.MotorXL, "88014", DBG, [-3, -2.5, -1.5], [3, 2.5, 1.5], LBG, { c: [3.5, 0, 0], ax: 0 }, (bb) => pinRow(bb, [-2, 0, 2], -2, 0, 3)).done({ drive: "motor", rpm: 145 }));
put(eBox(ID.Servo, "88004", LBG, [-2.5, -1.5, -1.5], [2.5, 1.5, 1.5], DBG, { c: [0, 0, 2], ax: 2 }, (bb) => pinRow(bb, [-2, 2], -1, 0, 3)).done({ drive: "motor", rpm: 60 }));
put(eBox(ID.TechHub, "88012", WHT, [-4, -2, -3], [4, 2, 3], DBG, undefined, (bb) => {
  pinRow(bb, [-3, -1, 1, 3], 1, 0, 6);
  bb.cyl(1, [0, 2.06, 0], 0.5, 0.12, GRN);
}).done({ drive: "power" }));
put(eBox(ID.Battery, "8881", DBG, [-2, -1.5, -4], [2, 1.5, 4], LBG, undefined, (bb) => {
  bb.cyl(1, [0, 1.56, 2.5], 0.4, 0.12, GRN);
  pinRow(bb, [-1.5, 1.5], -1, 0, 8);
}).done({ drive: "power" }));
put(eBox(ID.Remote, "88010", LBG, [-3, -0.75, -2], [3, 0.75, 2], BLK, undefined, (bb) => {
  for (const x of [-1.6, 1.6]) bb.box([x - 0.5, 0.75, -1.4], [x + 0.5, 1.1, 1.4], RED, false);
  bb.cyl(1, [0, 0.9, 0], 0.45, 0.2, GRN);
}).done());
// Pull-back "spring" motor 6×2×1⅓ (axle out through the sides)
put(eBox(ID.Spring, "75822", BLK, [-3, -0.8, -1], [3, 0.8, 1], DBG, undefined, (bb) => bb.hole([2, 0, 0], 2, 2, "A")).done());

// ---------- fill the rest (none expected) ----------
export const SPECS = S;
export function spec(id: number): Spec | undefined {
  return S.get(id);
}

// =====================================================================
// ORIENTATIONS — the 24 rotations of the cube (signed axis permutations).
// =====================================================================
export type Mat = number[]; // 3×3 row-major ints
export const ORIENTS: Mat[] = (() => {
  const out: Mat[] = [];
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  for (const p of perms)
    for (let s = 0; s < 8; s++) {
      const m = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (let c = 0; c < 3; c++) m[p[c] * 3 + c] = s & (1 << c) ? -1 : 1;
      const det = m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
      if (det === 1) out.push(m);
    }
  out.sort((a, b) => (a[0] === 1 && a[4] === 1 ? -1 : 0) - (b[0] === 1 && b[4] === 1 ? -1 : 0));
  return out;
})();
export const rot = (o: number, v: V3): V3 => {
  const m = ORIENTS[o];
  return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
};
/** world axis + sign that local axis `a` maps to under orientation o */
export const axOf = (o: number, a: Ax): [Ax, number] => {
  const m = ORIENTS[o];
  for (let r = 0; r < 3; r++) if (m[r * 3 + a] !== 0) return [r as Ax, m[r * 3 + a]];
  return [a, 1];
};

const ORIENT_INDEX = new Map<string, number>(ORIENTS.map((m, i) => [m.join(","), i]));
/** Orientation index of R · ORIENTS[o], R a ±90° turn about a world axis
 *  (0=x, 1=y, 2=z; dir +1 = right-hand rule). The 24 orientations form a
 *  group, so the composed orientation always exists. Build-mode rotation
 *  keys (WASD / Q E) dial orientations in with this. */
export function composeO(o: number, axis: 0 | 1 | 2, dir: 1 | -1): number {
  // R for +90° about the axis, row-major (columns are the images of e_x,e_y,e_z)
  const R: Mat =
    axis === 0 ? [1, 0, 0, 0, 0, -1, 0, 1, 0] : axis === 1 ? [0, 0, 1, 0, 1, 0, -1, 0, 0] : [0, -1, 0, 1, 0, 0, 0, 0, 1];
  if (dir < 0) {
    // inverse of a rotation matrix is its transpose
    const t = [R[0], R[3], R[6], R[1], R[4], R[7], R[2], R[5], R[8]];
    for (let i = 0; i < 9; i++) R[i] = t[i];
  }
  const m = ORIENTS[o];
  const out: Mat = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out[r * 3 + c] = R[r * 3] * m[c] + R[r * 3 + 1] * m[3 + c] + R[r * 3 + 2] * m[6 + c];
  return ORIENT_INDEX.get(out.join(",")) ?? o;
}

// =====================================================================
// OCCUPANCY — half-module sub-cells. Holes accept shafts; nothing else
// may share space. Cells are typed: S solid, P/A hole, p/a shaft.
// =====================================================================
type Cell = { k: V3; t: "S" | HoleT | MaleT; ax: Ax };
const cellCache = new Map<number, Cell[]>();
export function localCells(id: number): Cell[] {
  const hit = cellCache.get(id);
  if (hit) return hit;
  const s = S.get(id)!;
  const out: Cell[] = [];
  // bbox of everything (q units = 2 × modules)
  const lo: V3 = [1e9, 1e9, 1e9];
  const hi: V3 = [-1e9, -1e9, -1e9];
  const grow = (p: V3) => {
    for (let i = 0; i < 3; i++) {
      lo[i] = Math.min(lo[i], p[i]);
      hi[i] = Math.max(hi[i], p[i]);
    }
  };
  for (const [a, b] of s.boxes) (grow(a), grow(b));
  const ext = (c: V3, ax: Ax, len: number, r: number) => {
    const a = [...c] as V3;
    const b = [...c] as V3;
    for (let i = 0; i < 3; i++) {
      const e = i === ax ? len / 2 : r;
      a[i] -= e;
      b[i] += e;
    }
    grow(a);
    grow(b);
  };
  for (const h of s.holes) ext(h.c, h.ax, h.len, 0.5);
  for (const m of s.males) ext(m.c, m.ax, m.len, 0.5);
  for (const d of s.discs) ext(d.c, d.ax, d.len, d.r);
  const inLine = (p: V3, c: V3, ax: Ax, len: number) => {
    for (let i = 0; i < 3; i++) {
      const d = Math.abs(p[i] - c[i]);
      if (i === ax ? d > len / 2 : d >= 0.5) return false;
    }
    return true;
  };
  for (let i = Math.floor(lo[0] * 2); i < Math.ceil(hi[0] * 2); i++)
    for (let j = Math.floor(lo[1] * 2); j < Math.ceil(hi[1] * 2); j++)
      for (let k = Math.floor(lo[2] * 2); k < Math.ceil(hi[2] * 2); k++) {
        const p: V3 = [(i + 0.5) / 2, (j + 0.5) / 2, (k + 0.5) / 2];
        let cell: Cell | null = null;
        for (const m of s.males) if (inLine(p, m.c, m.ax, m.len)) cell = { k: [i, j, k], t: m.t, ax: m.ax };
        if (!cell) for (const h of s.holes) if (inLine(p, h.c, h.ax, h.len)) cell = { k: [i, j, k], t: h.t, ax: h.ax };
        if (!cell)
          for (const [a, b] of s.boxes)
            if (p[0] > a[0] && p[0] < b[0] && p[1] > a[1] && p[1] < b[1] && p[2] > a[2] && p[2] < b[2]) cell = { k: [i, j, k], t: "S", ax: 0 };
        if (!cell)
          for (const d of s.discs) {
            let r2 = 0;
            let ok = true;
            for (let x = 0; x < 3; x++) {
              const dd = p[x] - d.c[x];
              if (x === d.ax) ok = ok && Math.abs(dd) < d.len / 2;
              else r2 += dd * dd;
            }
            if (ok && r2 < Math.max(d.r, 0.36) ** 2) cell = { k: [i, j, k], t: "S", ax: 0 };
          }
        if (cell) out.push(cell);
      }
  cellCache.set(id, out);
  return out;
}

export type Part = { uid: number; id: number; o: number; q: V3; on?: boolean };
type Occ = { uid: number; t: Cell["t"]; ax: Ax };
const K = (x: number, y: number, z: number) => x + "," + y + "," + z;

export function worldCells(p: { id: number; o: number; q: V3 }) {
  const out: { key: string; x: number; y: number; z: number; t: Cell["t"]; ax: Ax }[] = [];
  for (const c of localCells(p.id)) {
    const w = rot(p.o, [c.k[0] + 0.5, c.k[1] + 0.5, c.k[2] + 0.5]);
    const x = Math.floor(w[0] + p.q[0]);
    const y = Math.floor(w[1] + p.q[1]);
    const z = Math.floor(w[2] + p.q[2]);
    out.push({ key: K(x, y, z), x, y, z, t: c.t, ax: c.t === "S" ? 0 : axOf(p.o, c.ax)[0] });
  }
  return out;
}

const isHole = (t: string) => t === "P" || t === "A";
const isMale = (t: string) => t === "p" || t === "a";
/** can these two cells share space? (a shaft inside a matching hole) */
export function mates(a: Occ, b: Occ): boolean {
  const h = isHole(a.t) ? a : isHole(b.t) ? b : null;
  const m = isMale(a.t) ? a : isMale(b.t) ? b : null;
  if (!h || !m || h.ax !== m.ax) return false;
  return !(h.t === "A" && m.t === "p"); // a round pin never fits a cross hole
}

export type WorldConn = { uid: number; c: V3; ax: Ax; len: number; t: HoleT | MaleT };
export type Target =
  | { kind: "part"; uid: number; point: V3; n: [Ax, number]; cell: V3 }
  | { kind: "face"; point: V3; n: [Ax, number]; face: number };
export type Plan = { o: number; q: V3; links: number };

export class TechWorld {
  parts = new Map<number, Part>();
  occ = new Map<string, Occ[]>();
  next = 1;
  rev = 0; // bumps on every change (mechanics rebuild)

  add(id: number, o: number, q: V3, uid = 0): Part {
    const p: Part = { uid: uid || this.next++, id, o, q: [...q] as V3, on: true };
    this.next = Math.max(this.next, p.uid + 1);
    this.parts.set(p.uid, p);
    for (const c of worldCells(p)) {
      let a = this.occ.get(c.key);
      if (!a) this.occ.set(c.key, (a = []));
      a.push({ uid: p.uid, t: c.t, ax: c.ax });
    }
    this.rev++;
    return p;
  }
  remove(uid: number) {
    const p = this.parts.get(uid);
    if (!p) return;
    for (const c of worldCells(p)) {
      const a = this.occ.get(c.key);
      if (!a) continue;
      const i = a.findIndex((e) => e.uid === uid);
      if (i >= 0) a.splice(i, 1);
      if (!a.length) this.occ.delete(c.key);
    }
    this.parts.delete(uid);
    this.rev++;
  }
  clear() {
    this.parts.clear();
    this.occ.clear();
    this.rev++;
  }
  /** -1 = blocked, else number of shaft-in-hole cells formed */
  test(id: number, o: number, q: V3, solidAt?: (bx: number, by: number, bz: number) => boolean): number {
    let links = 0;
    for (const c of worldCells({ id, o, q })) {
      if (solidAt && solidAt(Math.floor(c.x / 4), Math.floor(c.y / 4), Math.floor(c.z / 4))) return -1;
      const a = this.occ.get(c.key);
      if (!a) continue;
      if (a.length > 1) return -1;
      if (!mates(a[0], { uid: 0, t: c.t, ax: c.ax })) return -1;
      links++;
    }
    return links;
  }
  conns(p: Part): WorldConn[] {
    const s = S.get(p.id)!;
    const out: WorldConn[] = [];
    const tf = (c: V3): V3 => {
      const w = rot(p.o, [c[0] * 2, c[1] * 2, c[2] * 2]);
      return [w[0] + p.q[0], w[1] + p.q[1], w[2] + p.q[2]];
    };
    for (const h of s.holes) out.push({ uid: p.uid, c: tf(h.c), ax: axOf(p.o, h.ax)[0], len: h.len * 2, t: h.t });
    for (const m of s.males) out.push({ uid: p.uid, c: tf(m.c), ax: axOf(p.o, m.ax)[0], len: m.len * 2, t: m.t });
    return out;
  }
  /** DDA through sub-cells; origin/dir in q units */
  raycast(o: V3, d: V3, maxT: number): { uid: number; cell: V3; n: [Ax, number]; t: number; point: V3 } | null {
    const cell = [Math.floor(o[0]), Math.floor(o[1]), Math.floor(o[2])];
    const step = [Math.sign(d[0]), Math.sign(d[1]), Math.sign(d[2])];
    const tMax = [0, 0, 0];
    const tD = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      tD[i] = d[i] !== 0 ? Math.abs(1 / d[i]) : Infinity;
      tMax[i] = d[i] > 0 ? (cell[i] + 1 - o[i]) * tD[i] : d[i] < 0 ? (o[i] - cell[i]) * tD[i] : Infinity;
    }
    let t = 0;
    let n: [Ax, number] = [1, 1];
    for (let it = 0; it < 400 && t <= maxT; it++) {
      const a = this.occ.get(K(cell[0], cell[1], cell[2]));
      if (a && a.length) {
        const pick = a.find((e) => !isMale(e.t)) ?? a[0];
        return { uid: pick.uid, cell: [cell[0], cell[1], cell[2]], n, t, point: [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t] };
      }
      const i = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : tMax[1] < tMax[2] ? 1 : 2;
      t = tMax[i];
      tMax[i] += tD[i];
      cell[i] += step[i];
      n = [i as Ax, -step[i]];
    }
    return null;
  }

  /** where would held part `id` go for this aim? spin cycles the alternatives.
   *  wantO (build-mode rotation keys): place with EXACTLY this orientation —
   *  a seating candidate with it, the flat-face anchor with it, or null. */
  plan(id: number, tg: Target, look: V3, spin: number, solidAt?: (x: number, y: number, z: number) => boolean, wantO?: number): Plan | null {
    const s = S.get(id);
    if (!s) return null;
    const cands: (Plan & { score: number })[] = [];
    const seen = new Set<string>();
    const tryAt = (o: number, q: V3, bonus: number) => {
      const key = o + ":" + q.join(",");
      if (seen.has(key)) return;
      seen.add(key);
      const links = this.test(id, o, q, solidAt);
      if (links < 0) return;
      // prefer: more shafts seated, the part's body on the player's side, along the look
      const lc = centroid(id);
      const w = rot(o, lc);
      const cw: V3 = [w[0] + q[0], w[1] + q[1], w[2] + q[2]];
      const toward = (cw[tg.n[0]] - tg.point[tg.n[0]]) * tg.n[1];
      const [la] = axOf(o, 0);
      const dist = Math.hypot(cw[0] - tg.point[0], cw[1] - tg.point[1], cw[2] - tg.point[2]);
      cands.push({ o, q, links, score: links * 4 + bonus + (toward > -0.01 ? 2 : 0) + Math.abs(look[la]) * 0.5 - dist * 0.02 });
    };
    if (tg.kind === "part") {
      const P = this.parts.get(tg.uid);
      if (P) {
        const near = this.conns(P)
          .map((c) => ({ c, d: connDist(c, tg.point) }))
          .sort((a, b) => a.d - b.d)
          .slice(0, 3);
        for (const { c: tc } of near)
          for (let o = 0; o < 24; o++) {
            for (const hc of heldConns(s)) {
              const [ax] = axOf(o, hc.ax);
              if (ax !== tc.ax) continue;
              const hl = rot(o, [hc.c[0] * 2, hc.c[1] * 2, hc.c[2] * 2]);
              const segs = (len: number) => {
                const out: number[] = [];
                for (let x = -len / 2 + 1; x <= len / 2 - 1 + 1e-6; x += 2) out.push(x);
                return out.length ? out : [0];
              };
              if (isHole(tc.t) && isMale(hc.t)) {
                // push the shaft into the aimed hole (any 1M segment of it)
                for (const sg of segs(hc.len * 2)) {
                  const q: V3 = [tc.c[0] - hl[0], tc.c[1] - hl[1], tc.c[2] - hl[2]];
                  q[ax] -= sg * axOf(o, hc.ax)[1];
                  tryAt(o, q.map(Math.round) as V3, 3);
                }
              } else if (isMale(tc.t) && isHole(hc.t)) {
                // slide the held hole onto the aimed shaft
                for (const sg of segs(tc.len)) {
                  for (const sub of hc.len * 2 < 2 ? [-0.5, 0.5] : [0]) {
                    const q: V3 = [tc.c[0] - hl[0], tc.c[1] - hl[1], tc.c[2] - hl[2]];
                    q[ax] += sg + sub;
                    tryAt(o, q.map(Math.round) as V3, 3);
                  }
                }
              } else if (isHole(tc.t) && isHole(hc.t)) {
                // stack hole-on-hole, ready for a pin through both
                for (const sd of [-1, 1]) {
                  const q: V3 = [tc.c[0] - hl[0], tc.c[1] - hl[1], tc.c[2] - hl[2]];
                  q[ax] += sd * (tc.len / 2 + hc.len);
                  tryAt(o, q.map(Math.round) as V3, 0);
                }
              }
            }
          }
      }
    }
    // One flat-on-the-face attempt with an explicit orientation: anchor
    // the part's reference connection on the aimed face (the same maths
    // the ranked loop below uses per orientation), valid iff test() seats it.
    const tryFace = (o: number): Plan | null => {
      const face = tg.kind === "face" ? tg.face : tg.cell[tg.n[0]] + (tg.n[1] > 0 ? 1 : 0);
      const ref = refConn(s);
      const [lo, hi] = bbox(id, o);
      const q: V3 = [0, 0, 0];
      const r = rot(o, [ref.c[0] * 2, ref.c[1] * 2, ref.c[2] * 2]);
      const [rax] = axOf(o, ref.ax);
      for (let a = 0; a < 3; a++) {
        if (a === tg.n[0]) {
          q[a] = tg.n[1] > 0 ? face - lo[a] : face - hi[a];
          if (rax !== a && mod2(q[a] + r[a]) !== 1) q[a] += tg.n[1];
        } else {
          const v = tg.point[a] - r[a];
          let x = Math.round(v);
          if (rax !== a && mod2(x + r[a]) !== 1) x += v > x ? 1 : -1;
          q[a] = x;
        }
      }
      const links = this.test(id, o, q, solidAt);
      return links >= 0 ? { o, q, links } : null;
    };
    if (wantO !== undefined) {
      // The player dialled this orientation in: honour it exactly — a
      // seating candidate with it, the flat-face anchor with it, or
      // nothing (the ghost shows red; never silently place differently).
      const mine = cands.filter((c) => c.o === wantO);
      if (mine.length) {
        mine.sort((a, b) => b.score - a.score);
        return { o: mine[0].o, q: mine[0].q, links: mine[0].links };
      }
      if (cands.length) return null;
      return tryFace(wantO);
    }
    if (!cands.length) {
      // flat on the face (block face, or the face of a Technic part)
      const ranked = faceOrients(s, tg.n, look);
      for (let i = 0; i < ranked.length; i++) {
        const got = tryFace(ranked[(i + spin) % ranked.length]);
        if (got) return got;
      }
      return null;
    }
    cands.sort((a, b) => b.score - a.score);
    const top = cands.filter((c) => c.score > cands[0].score - 1.5);
    const pick = top[spin % top.length];
    return { o: pick.o, q: pick.q, links: pick.links };
  }

  // ===================================================================
  // MECHANICS — axle-in-cross-hole locks parts into one rotating group;
  // gears mesh at their real centre distance (N1+N2)/16 M; worms drive
  // gears 1:N; motors (powered by a hub/battery box) and cranks drive.
  // ===================================================================
  groups = new Map<number, number>(); // uid -> group
  gAxis = new Map<number, { p: V3; ax: Ax }>();
  gOmega = new Map<number, number>();
  gAngle = new Map<number, number>();
  jammed = false;
  private builtRev = -1;
  rebuild() {
    if (this.builtRev === this.rev) return;
    this.builtRev = this.rev;
    const par = new Map<number, number>();
    const find = (a: number): number => {
      let r = a;
      while (par.get(r) !== r) r = par.get(r)!;
      par.set(a, r);
      return r;
    };
    for (const uid of this.parts.keys()) par.set(uid, uid);
    const isStatic = (uid: number) => S.get(this.parts.get(uid)!.id)?.drive === "motor" || S.get(this.parts.get(uid)!.id)?.drive === "power";
    for (const a of this.occ.values()) {
      if (a.length < 2) continue;
      const h = a.find((e) => e.t === "A");
      const m = a.find((e) => e.t === "a");
      if (h && m && !isStatic(h.uid)) par.set(find(h.uid), find(m.uid));
    }
    this.groups.clear();
    this.gAxis.clear();
    for (const uid of this.parts.keys()) this.groups.set(uid, find(uid));
    // axis of each group: its axle, else its centre cross hole
    for (const p of this.parts.values()) {
      const g = this.groups.get(p.uid)!;
      const cs = this.conns(p);
      const ax = cs.find((c) => c.t === "a") ?? cs.find((c) => c.t === "A");
      if (!ax) continue;
      const cur = this.gAxis.get(g);
      if (!cur || ax.t === "a") this.gAxis.set(g, { p: ax.c, ax: ax.ax });
    }
    for (const g of [...this.gAngle.keys()]) if (!this.gAxis.has(g)) this.gAngle.delete(g);
  }
  /** gear contacts between groups: [gA, gB, ratio ωB/ωA] */
  meshes(): [number, number, number][] {
    const gs: { g: number; c: V3; ax: Ax; n: number; kind: GearInfo["kind"] }[] = [];
    for (const p of this.parts.values()) {
      const s = S.get(p.id);
      if (!s) continue;
      for (const gi of s.gears) {
        const w = rot(p.o, [gi.c[0] * 2, gi.c[1] * 2, gi.c[2] * 2]);
        gs.push({ g: this.groups.get(p.uid)!, c: [(w[0] + p.q[0]) / 2, (w[1] + p.q[1]) / 2, (w[2] + p.q[2]) / 2], ax: axOf(p.o, gi.ax)[0], n: gi.n, kind: gi.kind });
      }
    }
    const out: [number, number, number][] = [];
    for (let i = 0; i < gs.length; i++)
      for (let j = i + 1; j < gs.length; j++) {
        const a = gs[i];
        const b = gs[j];
        if (a.g === b.g) continue;
        const d: V3 = [b.c[0] - a.c[0], b.c[1] - a.c[1], b.c[2] - a.c[2]];
        if (a.kind !== "worm" && b.kind !== "worm" && a.ax === b.ax) {
          const along = Math.abs(d[a.ax]);
          const rad = Math.hypot(...d.map((v, k) => (k === a.ax ? 0 : v)));
          if (along <= 0.5 && Math.abs(rad - (a.n + b.n) / 16) < 0.12) out.push([a.g, b.g, -a.n / b.n]);
        } else if (a.ax !== b.ax) {
          const w = a.kind === "worm" ? a : b.kind === "worm" ? b : null;
          if (w) {
            const g = w === a ? b : a;
            if (g.kind === "worm") continue;
            const dd: V3 = [g.c[0] - w.c[0], g.c[1] - w.c[1], g.c[2] - w.c[2]];
            const third = 3 - w.ax - g.ax;
            if (Math.abs(dd[w.ax]) <= 1.2 && Math.abs(dd[g.ax]) <= 0.5 && Math.abs(Math.abs(dd[third]) - (pitchR(g.n) + 0.5)) < 0.2)
              out.push(w === a ? [a.g, b.g, 1 / g.n] : [a.g, b.g, g.n]);
          } else if (a.kind === "bevel" && b.kind === "bevel") {
            // perpendicular bevels: each centre sits one pitch radius off the other's axis line
            const offA = Math.hypot(...d.map((v, k) => (k === a.ax ? 0 : v)));
            const offB = Math.hypot(...d.map((v, k) => (k === b.ax ? 0 : v)));
            if (Math.abs(offA - pitchR(b.n)) < 0.4 && Math.abs(offB - pitchR(a.n)) < 0.4) out.push([a.g, b.g, a.n / b.n]);
          }
        }
      }
    return out;
  }
  /** advance the simulation; powered(p) says whether a motor gets current */
  step(dt: number, powered: (p: Part) => boolean) {
    this.rebuild();
    const om = new Map<number, number>();
    const q: number[] = [];
    this.jammed = false;
    for (const p of this.parts.values()) {
      const s = S.get(p.id)!;
      if (!s.drive || s.drive === "power" || !s.rpm) continue;
      if (s.drive === "motor" && !powered(p)) continue;
      if (s.drive === "crank" && !p.on) continue;
      const w = (s.rpm / 60) * Math.PI * 2;
      // a motor drives whatever axle sits in its output cross hole
      const gsDriven = new Set<number>();
      if (s.drive === "motor") {
        for (const c of worldCells(p)) {
          if (c.t !== "A") continue;
          for (const e of this.occ.get(c.key) ?? []) if (e.uid !== p.uid) gsDriven.add(this.groups.get(e.uid)!);
        }
      } else gsDriven.add(this.groups.get(p.uid)!);
      for (const g of gsDriven) {
        if (om.has(g) && Math.abs(om.get(g)! - w) > 1e-3) this.jammed = true;
        om.set(g, w);
        q.push(g);
      }
    }
    const mesh = q.length ? this.meshes() : [];
    while (q.length && !this.jammed) {
      const g = q.shift()!;
      const w = om.get(g)!;
      for (const [a, b, r] of mesh) {
        const other = a === g ? b : b === g ? a : -1;
        if (other < 0) continue;
        const wo = a === g ? w * r : w / r;
        if (om.has(other)) {
          if (Math.abs(om.get(other)! - wo) > 1e-3 * Math.max(1, Math.abs(wo))) this.jammed = true;
          continue;
        }
        om.set(other, wo);
        q.push(other);
      }
    }
    if (this.jammed) om.clear();
    this.gOmega = om;
    for (const [g, w] of om) this.gAngle.set(g, ((this.gAngle.get(g) ?? 0) + w * dt) % (Math.PI * 2));
  }
}

function mod2(x: number) {
  return ((Math.round(x) % 2) + 2) % 2;
}
function connDist(c: WorldConn, p: V3) {
  // distance from p to the connector's segment
  const d: V3 = [p[0] - c.c[0], p[1] - c.c[1], p[2] - c.c[2]];
  d[c.ax] = Math.max(0, Math.abs(d[c.ax]) - c.len / 2);
  return Math.hypot(d[0], d[1], d[2]);
}
function heldConns(s: Spec) {
  return [...s.holes.map((h) => ({ c: h.c, ax: h.ax, len: h.len, t: h.t as HoleT | MaleT })), ...s.males.map((m) => ({ c: m.c, ax: m.ax, len: m.len, t: m.t as HoleT | MaleT }))];
}
const centCache = new Map<number, V3>();
export function centroid(id: number): V3 {
  let c = centCache.get(id);
  if (c) return c;
  const cs = localCells(id);
  c = [0, 0, 0];
  for (const e of cs) for (let i = 0; i < 3; i++) c[i] += (e.k[i] + 0.5) / cs.length;
  centCache.set(id, c);
  return c;
}
function refConn(s: Spec) {
  const cen = centroid(s.id);
  const all = heldConns(s);
  if (!all.length) return { c: [0, 0, 0] as V3, ax: s.prim, len: 1, t: "P" as const };
  let best = all[0];
  let bd = Infinity;
  for (const c of all) {
    const d = Math.hypot(c.c[0] * 2 - cen[0], c.c[1] * 2 - cen[1], c.c[2] * 2 - cen[2]);
    if (d < bd - 1e-6) (bd = d), (best = c);
  }
  return best;
}
export function bbox(id: number, o: number): [V3, V3] {
  const lo: V3 = [1e9, 1e9, 1e9];
  const hi: V3 = [-1e9, -1e9, -1e9];
  for (const c of localCells(id)) {
    const w = rot(o, [c.k[0] + 0.5, c.k[1] + 0.5, c.k[2] + 0.5]);
    for (let i = 0; i < 3; i++) {
      lo[i] = Math.min(lo[i], w[i] - 0.5);
      hi[i] = Math.max(hi[i], w[i] + 0.5);
    }
  }
  return [lo, hi];
}
/** orientations for laying a part on a face, best first */
export function faceOrients(s: Spec, n: [Ax, number], look: V3): number[] {
  const sc: [number, number][] = [];
  for (let o = 0; o < 24; o++) {
    const [pa, ps] = axOf(o, s.prim);
    const [la] = axOf(o, s.prim === 0 ? 2 : 0);
    const [ya, ys] = axOf(o, 1);
    let v = 0;
    if (s.prim !== 0) {
      // flat parts: holes along the face normal, length along the look
      if (pa === n[0]) v += 10 + (ps === n[1] ? 1 : 0);
      v += Math.abs(look[axOf(o, 0)[0]]) * 2;
      if (s.prim === 1 && ya === 1 && ys > 0) v += 12; // boxes stand upright
    } else if (n[0] === 1) {
      // rods on a floor/ceiling lie flat along the look
      if (pa !== 1) v += 10 + Math.abs(look[pa]) * 3;
      if (axOf(o, 1)[0] === 1) v += 0.5;
    } else {
      // rods on a wall stick out of it
      if (pa === n[0]) v += 10 + (ps === n[1] ? 1 : 0);
      if (axOf(o, 1)[0] === 1) v += 0.5;
    }
    void la;
    sc.push([o, v]);
  }
  sc.sort((a, b) => b[1] - a[1]);
  const best = sc[0][1];
  return sc.filter((e) => e[1] > best - 4).map((e) => e[0]);
}
