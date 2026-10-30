// STUDS Teks — 3D geometry for the parts of teks.ts (step 1 of the
// Teks relay). Pure interpretation of each spec's draw `ops` into ONE
// merged THREE.BufferGeometry per part: home-made merge (no
// three/examples/jsm anywhere — the standalone build excludes it), vertex
// colours on every vertex, flat + analytic normals (no textures, no uv
// content — the uv attribute exists, zeroed, only so brickGeo-style merges
// that read uv keep working).
//
// Frame & units: geometry is built in MODULES (1 M = 8 mm) in the part's
// own local frame from teks.ts (X = length, holes of flat parts along
// Z, shafts along X). Step 2 places one Mesh per part with
// mesh.scale.setScalar(MODULE_TO_BLOCK) and the TechWorld orientations —
// the same frame TechWorld.worldCells/rot() already use.
//
// Vertex colours: THREE.Color(hex) components, i.e. sRGB -> linear
// working space — the same convention as game.ts (col.set(def.color))
// and mesher.ts (brickLinear). Materials for this layer must use
// vertexColors: true (BUG-1 law: no colour attribute = black bricks).
//
// Interpretation choices where an op is ambiguous (kept literal otherwise):
// - plate: the outline is the TRUE union of the stadium (capsule) segments
//   — traced exactly, so L/T/frame/triangle plates get their real outline
//   incl. the frame opening as a shape hole. Holes: "P" = round bore
//   Ø 4.85 mm, "A" = cross bore 4.8/1.8 mm, "N" = not drilled.
// - axle `stop`: a collar ring (r 0.44 M, 0.45 M wide) centred at x=stop.
// - pin: shaft r 0.29 M; each entry of `collar` is the x of a collar ring
//   (r 0.42 M, 0.2 M wide). `ball`: plain stem + a sphere r 0.40 M at the
//   far end (towball). Friction ridges of real pins are not modelled.
// - tube `flange`: a ring of that radius at the -axis end of the tube,
//   protruding 0.1 M (STUDS bush 3713 style).
// - gear: module-1 teeth, tip radius = pitchR + 0.13 M, root radius =
//   pitchR - 0.16 M (tips of meshed gears clear the other's root circle).
//   Tooth phase is NOT synced to neighbours (same as real STUDS in hand).
//   taper "one"/"two": the toothed outline scales to 0.78 at the tapered
//   face(s). If the op carries no `holes`, the centre bore is taken from
//   the spec hole whose axis line passes through the gear centre (this is
//   how the Diff ring gear and the turntables get their cross bore).
// - worm: the core is drawn as a cross-bored tube (the through "A" hole
//   the spec records) under a trapezoidal thread swept at 1.25 turns/M,
//   inset by the thread's half-width so it stays inside [x0, x1].
// - rack: bar up to z 0.18 M with the op's holes through it, trapezoid
//   teeth (pitch pi/8 M — the real pi mm pitch) on top; teeth carry no
//   holes (on the real racks the holes sit between teeth).
// - helix: starts at c and extends along +axis; circular wire of radius
//   `tr` (the shock/spring coils of the specs).
// - blade: chord twists around the radial axis by pitch * s (s = 0 at the
//   root, 1 at the tip).
// - shell: cylindrical patch around the centre line (y, z); the angle is
//   measured from +Z toward +/-Y, so a = 0 touches the panel's top face.
//   Drawn as a thin solid (0.07 M).
// - dot: flat dark disc, 0.024 M thick (the hole pastilles B.hole emits).
// - studs: r 0.3 M, 0.22 M tall, growing +Z from op.z.
// - arm: a cross-bored tube from the origin along direction d (the
//   off-grid arm of angle connectors #3/#5).
// - Holes that exist only in spec data (added beside the ops, e.g. the
//   FairLarge panel and the Spring motor) get the same dark pastille a
//   B.hole() would have emitted, on both faces, when the hole sits inside
//   one of the part's occupancy boxes and no dot op already marks it.
//   Holes already drawn as real bores (plate / gear / rack / tube ops)
//   never get a pastille — it would cap the bore mouth. Everything else
//   follows the ops literally: an op that is not emitted is not drawn.
import * as THREE from "three";
import { AXLE_R, AXLE_W, HOLE_R, SPECS, pitchR, type Ax, type Op, type Spec, type V3 } from "./teks.ts";

/** 1 module in world blocks — the scale step 2 applies to part meshes. */
export const MODULE_TO_BLOCK = 0.5;

type P2 = [number, number];
type P3 = [number, number, number];
type RGB = [number, number, number];

// ---------------------------------------------------------------------
// small vector helpers (plain tuples, no allocations in hot loops lost)
// ---------------------------------------------------------------------
const sub3 = (a: P3, b: P3): P3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross3 = (a: P3, b: P3): P3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot3 = (a: P3, b: P3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm3 = (a: P3): P3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const area2 = (pts: P2[]): number => {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
};
/** copy of pts oriented CCW (sign +1) or CW (sign -1) in its own plane */
const orient = (pts: P2[], sign: 1 | -1): P2[] => (area2(pts) * sign < 0 ? [...pts].reverse() : [...pts]);

const rgbCache = new Map<number, RGB>();
function rgbOf(hex: number): RGB {
  let c = rgbCache.get(hex);
  if (!c) {
    const t = new THREE.Color(hex); // sRGB -> linear working space
    c = [t.r, t.g, t.b];
    rgbCache.set(hex, c);
  }
  return c;
}

// ---------------------------------------------------------------------
// Bucket — triangle soup accumulator (position / normal / color / uv)
// ---------------------------------------------------------------------
class Bucket {
  pos: number[] = [];
  nor: number[] = [];
  col: number[] = [];
  uv: number[] = [];

  tri(a: P3, b: P3, c: P3, rgb: RGB, na?: P3, nb?: P3, nc?: P3) {
    let n: P3;
    if (na && nb && nc) {
      n = na;
      this.pushV(a, na, rgb);
      this.pushV(b, nb, rgb);
      this.pushV(c, nc, rgb);
      return;
    }
    n = cross3(sub3(b, a), sub3(c, a));
    const l2 = dot3(n, n);
    if (l2 < 1e-14) return; // degenerate — no area, no normal, skip
    const l = Math.sqrt(l2);
    n = [n[0] / l, n[1] / l, n[2] / l];
    this.pushV(a, n, rgb);
    this.pushV(b, n, rgb);
    this.pushV(c, n, rgb);
  }
  private pushV(p: P3, n: P3, rgb: RGB) {
    this.pos.push(p[0], p[1], p[2]);
    this.nor.push(n[0], n[1], n[2]);
    this.col.push(rgb[0], rgb[1], rgb[2]);
    this.uv.push(0, 0);
  }
  /** quad (a,b,c,d) with winding auto-flipped so its normal faces `hint` */
  quadAuto(a: P3, b: P3, c: P3, d: P3, rgb: RGB, hint: P3) {
    const n = cross3(sub3(b, a), sub3(c, a));
    if (dot3(n, hint) < 0) {
      this.tri(a, d, c, rgb);
      this.tri(a, c, b, rgb);
    } else {
      this.tri(a, b, c, rgb);
      this.tri(a, c, d, rgb);
    }
  }
  /** triangle fan around `center` over ring points, auto-oriented to hint */
  fanAuto(center: P3, ring: P3[], rgb: RGB, hint: P3) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      const n = cross3(sub3(a, center), sub3(b, center));
      if (dot3(n, hint) < 0) this.tri(center, b, a, rgb);
      else this.tri(center, a, b, rgb);
    }
  }
  /** merge another bucket into this one, optionally through a matrix */
  absorb(other: Bucket, m?: THREE.Matrix4) {
    if (!m) {
      this.pos.push(...other.pos);
      this.nor.push(...other.nor);
      this.col.push(...other.col);
      this.uv.push(...other.uv);
      return;
    }
    const v = new THREE.Vector3();
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    for (let i = 0; i < other.pos.length; i += 3) {
      v.set(other.pos[i], other.pos[i + 1], other.pos[i + 2]).applyMatrix4(m);
      this.pos.push(v.x, v.y, v.z);
      v.set(other.nor[i], other.nor[i + 1], other.nor[i + 2]).applyMatrix3(nm).normalize();
      this.nor.push(v.x, v.y, v.z);
      this.col.push(other.col[i], other.col[i + 1], other.col[i + 2]);
      this.uv.push(0, 0);
    }
  }
  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    return g;
  }
}

// ---------------------------------------------------------------------
// Bases — right-handed frames; a point is o + a*u + b*v + t*w.
// For axis X the (a, b) plane is (Y, Z); for Y it is (Z, X); for Z, (X, Y).
// ---------------------------------------------------------------------
type Basis = { u: P3; v: P3; w: P3 };
const BASIS: Basis[] = [
  { u: [0, 1, 0], v: [0, 0, 1], w: [1, 0, 0] },
  { u: [0, 0, 1], v: [1, 0, 0], w: [0, 1, 0] },
  { u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] },
];
const bp = (bs: Basis, o: P3, a: number, b: number, t: number): P3 => [
  o[0] + a * bs.u[0] + b * bs.v[0] + t * bs.w[0],
  o[1] + a * bs.u[1] + b * bs.v[1] + t * bs.w[1],
  o[2] + a * bs.u[2] + b * bs.v[2] + t * bs.w[2],
];
const segFor = (r: number): number => (r <= 0.34 ? 16 : r <= 0.55 ? 20 : r <= 1.05 ? 26 : 32);

// ---------------------------------------------------------------------
// 2D contours
// ---------------------------------------------------------------------
function circlePts(r: number, seg: number, cx = 0, cy = 0): P2[] {
  const out: P2[] = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out; // CCW
}
/** plus-sign (axle cross) outline, half-span AXLE_R, half-arm AXLE_W, CCW */
function crossPts(cx = 0, cy = 0): P2[] {
  const s = AXLE_R;
  const w = AXLE_W;
  const rel: P2[] = [
    [s, -w], [s, w], [w, w], [w, s], [-w, s], [-w, w],
    [-s, w], [-s, -w], [-w, -w], [-w, -s], [w, -s], [w, -w],
  ];
  return rel.map(([x, y]) => [x + cx, y + cy] as P2);
}
function rectPts(x0: number, y0: number, x1: number, y1: number): P2[] {
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ]; // CCW
}
/** polygon for a typed hole centred at (x, y); null for "N" */
function holePts(t: "P" | "A" | "N", x: number, y: number): P2[] | null {
  if (t === "N") return null;
  return t === "A" ? crossPts(x, y) : circlePts(HOLE_R, 18, x, y);
}

// ---------------------------------------------------------------------
// prism — straight (or once-tapered) extrusion of an outline with holes
// along a basis axis, caps triangulated by THREE.ShapeUtils (core three,
// Earcut) with a defensive per-face winding check against +/-w.
// ---------------------------------------------------------------------
function cap(bk: Bucket, bs: Basis, o: P3, outer: P2[], holes: P2[][], t: number, rgb: RGB, side: 1 | -1) {
  const all = [...outer, ...holes.flat()];
  const contour = outer.map((p) => new THREE.Vector2(p[0], p[1]));
  const holeV = holes.map((h) => h.map((p) => new THREE.Vector2(p[0], p[1])));
  const faces = THREE.ShapeUtils.triangulateShape(contour, holeV);
  const wn: P3 = [bs.w[0] * side, bs.w[1] * side, bs.w[2] * side];
  for (const f of faces) {
    const A = bp(bs, o, all[f[0]][0], all[f[0]][1], t);
    const B = bp(bs, o, all[f[1]][0], all[f[1]][1], t);
    const C = bp(bs, o, all[f[2]][0], all[f[2]][1], t);
    if (dot3(cross3(sub3(B, A), sub3(C, A)), wn) < 0) bk.tri(A, C, B, rgb, wn, wn, wn);
    else bk.tri(A, B, C, rgb, wn, wn, wn);
  }
}
function walls(bk: Bucket, bs: Basis, o: P3, bot: P2[], top: P2[], t0: number, t1: number, rgb: RGB) {
  const n = bot.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const A = bp(bs, o, bot[i][0], bot[i][1], t0);
    const B = bp(bs, o, bot[j][0], bot[j][1], t0);
    const C = bp(bs, o, top[j][0], top[j][1], t1);
    const D = bp(bs, o, top[i][0], top[i][1], t1);
    bk.tri(A, B, C, rgb);
    bk.tri(A, C, D, rgb);
  }
}
type PrismOpts = { topOuter?: P2[]; topHoles?: P2[][]; capBottom?: boolean; capTop?: boolean };
function prism(bk: Bucket, bs: Basis, o: P3, outer: P2[], holes: P2[][], t0: number, t1: number, rgb: RGB, opts?: PrismOpts) {
  const out = orient(outer, 1);
  const hs = holes.map((h) => orient(h, -1));
  const tOut = opts?.topOuter ? orient(opts.topOuter, 1) : out;
  const tHs = opts?.topHoles ? opts.topHoles.map((h) => orient(h, -1)) : hs;
  if (opts?.capBottom !== false) cap(bk, bs, o, out, hs, t0, rgb, -1);
  if (opts?.capTop !== false) cap(bk, bs, o, tOut, tHs, t1, rgb, 1);
  walls(bk, bs, o, out, tOut, t0, t1, rgb);
  for (let i = 0; i < hs.length; i++) walls(bk, bs, o, hs[i], tHs[i], t0, t1, rgb);
}

// ---------------------------------------------------------------------
// revolve — a profile of [radius, along-axis] points swept around an
// axis. `closed` wraps the last station back to the first (lathe loops);
// open profiles may start/end on the axis (r = 0 poles -> fans).
// Normals are analytic: for profile tangent (dr, dt) the outward normal
// in (radial, axial) is (dt, -dr) for the profile windings teks.ts
// emits; strip winding (A, B, C), (A, C, D) matches it (checked against
// the bottom / outer / inner walls of a ring profile).
// ---------------------------------------------------------------------
function revolve(bk: Bucket, ax: Ax, c: P3, prof: [number, number][], closed: boolean, rgb: RGB, seg = 0) {
  const bs = BASIS[ax];
  const maxR = Math.max(...prof.map((p) => p[0]));
  const n = seg || (maxR > 1.3 ? 30 : maxR > 0.65 ? 22 : 16);
  const m = prof.length;
  const stations = prof.map(([r, t], i) => {
    const pp = prof[closed ? (i - 1 + m) % m : Math.max(0, i - 1)];
    const pn = prof[closed ? (i + 1) % m : Math.min(m - 1, i + 1)];
    let dr = pn[0] - pp[0];
    let dt = pn[1] - pp[1];
    const l = Math.hypot(dr, dt) || 1;
    dr /= l;
    dt /= l;
    return { r, t, nr: dt, nt: -dr };
  });
  const vtx = (i: number, j: number): { p: P3; n: P3 } => {
    const s = stations[i];
    if (s.r < 1e-7) {
      const nn = norm3([bs.w[0] * s.nt, bs.w[1] * s.nt, bs.w[2] * s.nt]);
      return { p: bp(bs, c, 0, 0, s.t), n: nn };
    }
    const th = (j / n) * Math.PI * 2;
    const co = Math.cos(th);
    const si = Math.sin(th);
    const radial: P3 = [
      bs.u[0] * co + bs.v[0] * si,
      bs.u[1] * co + bs.v[1] * si,
      bs.u[2] * co + bs.v[2] * si,
    ];
    const p = bp(bs, c, s.r * co, s.r * si, s.t);
    const nn = norm3([
      radial[0] * s.nr + bs.w[0] * s.nt,
      radial[1] * s.nr + bs.w[1] * s.nt,
      radial[2] * s.nr + bs.w[2] * s.nt,
    ]);
    return { p, n: nn };
  };
  const last = closed ? m - 1 : m - 2;
  for (let i = 0; i <= last; i++) {
    const i2 = closed ? (i + 1) % m : i + 1;
    const poleA = stations[i].r < 1e-7;
    const poleB = stations[i2].r < 1e-7;
    if (poleA && poleB) continue;
    if (poleA) {
      const P = vtx(i, 0);
      for (let j = 0; j < n; j++) {
        const A = vtx(i2, j);
        const B = vtx(i2, (j + 1) % n);
        bk.tri(P.p, B.p, A.p, rgb, P.n, B.n, A.n);
      }
    } else if (poleB) {
      const P = vtx(i2, 0);
      for (let j = 0; j < n; j++) {
        const A = vtx(i, j);
        const B = vtx(i, (j + 1) % n);
        bk.tri(A.p, B.p, P.p, rgb, A.n, B.n, P.n);
      }
    } else {
      for (let j = 0; j < n; j++) {
        const A = vtx(i, j);
        const B = vtx(i, (j + 1) % n);
        const C = vtx(i2, (j + 1) % n);
        const D = vtx(i2, j);
        bk.tri(A.p, B.p, C.p, rgb, A.n, B.n, C.n);
        bk.tri(A.p, C.p, D.p, rgb, A.n, C.n, D.n);
      }
    }
  }
}

// ---------------------------------------------------------------------
// cylSmooth — solid cylinder with radial smooth normals and flat caps.
// ---------------------------------------------------------------------
function cylSmooth(bk: Bucket, ax: Ax, c: P3, r: number, len: number, rgb: RGB, segN: number) {
  const bs = BASIS[ax];
  const vtx = (t: number, j: number): { p: P3; n: P3 } => {
    const th = (j / segN) * Math.PI * 2;
    const co = Math.cos(th);
    const si = Math.sin(th);
    const p = bp(bs, c, r * co, r * si, t);
    const nn: P3 = [
      bs.u[0] * co + bs.v[0] * si,
      bs.u[1] * co + bs.v[1] * si,
      bs.u[2] * co + bs.v[2] * si,
    ];
    return { p, n: nn };
  };
  const lo = -len / 2;
  const hi = len / 2;
  for (let j = 0; j < segN; j++) {
    const A = vtx(lo, j);
    const B = vtx(lo, (j + 1) % segN);
    const C = vtx(hi, (j + 1) % segN);
    const D = vtx(hi, j);
    bk.tri(A.p, B.p, C.p, rgb, A.n, B.n, C.n);
    bk.tri(A.p, C.p, D.p, rgb, A.n, C.n, D.n);
  }
  const cLo = bp(bs, c, 0, 0, lo);
  const cHi = bp(bs, c, 0, 0, hi);
  const nLo: P3 = [-bs.w[0], -bs.w[1], -bs.w[2]];
  const nHi: P3 = [bs.w[0], bs.w[1], bs.w[2]];
  for (let j = 0; j < segN; j++) {
    const A = vtx(lo, j);
    const B = vtx(lo, (j + 1) % segN);
    bk.tri(cLo, B.p, A.p, rgb, nLo, nLo, nLo);
    const A2 = vtx(hi, j);
    const B2 = vtx(hi, (j + 1) % segN);
    bk.tri(cHi, A2.p, B2.p, rgb, nHi, nHi, nHi);
  }
}

// ---------------------------------------------------------------------
// plate outlines — exact union of stadium (capsule) segments.
// Each capsule boundary (2 offset lines + 2 semicircles as chords) is
// collected as directed edges; edges are split at crossings with other
// capsules, pieces whose midpoint lies inside another capsule are
// dropped, and the survivors are chained into loops with the standard
// arrangement rule (keep the face on the left). Signed area then tells
// outer loops (CCW) from inner ones (frame openings).
// ---------------------------------------------------------------------
type Edge = { a: P2; b: P2; cap: number };
function capsuleEdges(idx: number, p: P2, q: P2, r: number): Edge[] {
  const edges: Edge[] = [];
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const L = Math.hypot(dx, dy);
  if (L < 1e-9) {
    for (let i = 0; i < 16; i++) {
      const a0 = (i / 16) * Math.PI * 2;
      const a1 = ((i + 1) / 16) * Math.PI * 2;
      edges.push({ a: [p[0] + r * Math.cos(a0), p[1] + r * Math.sin(a0)], b: [p[0] + r * Math.cos(a1), p[1] + r * Math.sin(a1)], cap: idx });
    }
    return edges;
  }
  const du: P2 = [dx / L, dy / L];
  const nv: P2 = [-du[1], du[0]];
  const arc = (cen: P2, a0: number) => {
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      const t0 = a0 + (i / steps) * Math.PI;
      const t1 = a0 + ((i + 1) / steps) * Math.PI;
      edges.push({ a: [cen[0] + r * Math.cos(t0), cen[1] + r * Math.sin(t0)], b: [cen[0] + r * Math.cos(t1), cen[1] + r * Math.sin(t1)], cap: idx });
    }
  };
  const aN = Math.atan2(nv[1], nv[0]);
  // CCW walk: bottom line p-n -> q-n, arc at q (from -n through d to +n),
  // top line q+n -> p+n, arc at p (from +n through -d to -n).
  edges.push({ a: [p[0] - nv[0] * r, p[1] - nv[1] * r], b: [q[0] - nv[0] * r, q[1] - nv[1] * r], cap: idx });
  arc(q, aN - Math.PI);
  edges.push({ a: [q[0] + nv[0] * r, q[1] + nv[1] * r], b: [p[0] + nv[0] * r, p[1] + nv[1] * r], cap: idx });
  arc(p, aN);
  return edges;
}
const distToSeg = (pt: P2, a: P2, b: P2): number => {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const l2 = abx * abx + aby * aby;
  let t = l2 > 0 ? ((pt[0] - a[0]) * abx + (pt[1] - a[1]) * aby) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(pt[0] - (a[0] + t * abx), pt[1] - (a[1] + t * aby));
};
function segInt(a: P2, b: P2, c: P2, d: P2): number | null {
  // parameter t along a->b of the crossing with c->d, or null
  const r: P2 = [b[0] - a[0], b[1] - a[1]];
  const s: P2 = [d[0] - c[0], d[1] - c[1]];
  const den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-12) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den;
  const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
  return t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9 ? t : null;
}
const key2 = (p: P2): string => Math.round(p[0] * 1e5) + "," + Math.round(p[1] * 1e5);
function capsuleUnion(segs: [P2, P2][], r: number): { outers: P2[][]; holes: P2[][] } {
  const edges: Edge[] = [];
  segs.forEach(([p, q], i) => edges.push(...capsuleEdges(i, p, q, r)));
  // split each edge at crossings with edges of other capsules
  const splits: number[][] = edges.map(() => [0, 1]);
  for (let i = 0; i < edges.length; i++)
    for (let j = i + 1; j < edges.length; j++) {
      if (edges[i].cap === edges[j].cap) continue;
      const t = segInt(edges[i].a, edges[i].b, edges[j].a, edges[j].b);
      if (t !== null) {
        splits[i].push(t);
        const u = segInt(edges[j].a, edges[j].b, edges[i].a, edges[i].b);
        if (u !== null) splits[j].push(u);
      }
    }
  const kept: Edge[] = [];
  edges.forEach((e, i) => {
    const ts = splits[i].sort((x, y) => x - y);
    for (let k = 0; k < ts.length - 1; k++) {
      const t0 = ts[k];
      const t1 = ts[k + 1];
      if (t1 - t0 < 1e-9) continue;
      const pt = (t: number): P2 => [e.a[0] + (e.b[0] - e.a[0]) * t, e.a[1] + (e.b[1] - e.a[1]) * t];
      const mid = pt((t0 + t1) / 2);
      let inside = false;
      for (let j = 0; j < segs.length && !inside; j++) {
        if (j === e.cap) continue;
        if (distToSeg(mid, segs[j][0], segs[j][1]) < r - 1e-4) inside = true;
      }
      if (!inside) kept.push({ a: pt(t0), b: pt(t1), cap: e.cap });
    }
  });
  // chain into loops
  const out = new Map<string, number[]>();
  kept.forEach((e, i) => {
    const k = key2(e.a);
    const arr = out.get(k);
    if (arr) arr.push(i);
    else out.set(k, [i]);
  });
  const used = new Set<number>();
  const outers: P2[][] = [];
  const holes: P2[][] = [];
  for (let s = 0; s < kept.length; s++) {
    if (used.has(s)) continue;
    const loop: P2[] = [];
    let cur = s;
    let ok = false;
    for (let guard = 0; guard < kept.length + 2; guard++) {
      used.add(cur);
      const e = kept[cur];
      loop.push(e.a);
      if (key2(e.b) === key2(loop[0]) && loop.length > 2) {
        ok = true;
        break;
      }
      const incoming = Math.atan2(e.b[1] - e.a[1], e.b[0] - e.a[0]);
      const beta = incoming + Math.PI; // direction back where we came from
      const cands = (out.get(key2(e.b)) ?? []).filter((i) => !used.has(i));
      if (!cands.length) break;
      let best = -1;
      let bestCw = Infinity;
      for (const ci of cands) {
        const ce = kept[ci];
        const th = Math.atan2(ce.b[1] - ce.a[1], ce.b[0] - ce.a[0]);
        let cw = (beta - th) % (Math.PI * 2);
        if (cw < 0) cw += Math.PI * 2;
        if (cw > 1e-9 && cw < bestCw) {
          bestCw = cw;
          best = ci;
        }
      }
      if (best < 0) break;
      cur = best;
    }
    if (ok && loop.length >= 3) {
      if (area2(loop) > 0) outers.push(loop);
      else holes.push(loop);
    }
  }
  return { outers, holes };
}
const pointInPoly = (pt: P2, poly: P2[]): boolean => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const centroid2 = (poly: P2[]): P2 => {
  let x = 0;
  let y = 0;
  for (const p of poly) {
    x += p[0];
    y += p[1];
  }
  return [x / poly.length, y / poly.length];
};

// ---------------------------------------------------------------------
// gears — module-1 teeth (tip = pitchR + 0.13, root = pitchR - 0.16),
// optional conical taper, bores from the op or (fallback) the spec hole
// whose axis line runs through the gear centre.
// ---------------------------------------------------------------------
const GEAR_TAPER = 0.78;
function gearOutline(n: number): P2[] {
  const R = pitchR(n);
  const tip = R + 0.13;
  const root = Math.max(0.08, R - 0.16);
  const pts: P2[] = [];
  const step = (Math.PI * 2) / n;
  for (let i = 0; i < n; i++) {
    const a = i * step;
    const P = (f: number, r: number): P2 => {
      const t = a + f * step;
      return [r * Math.cos(t), r * Math.sin(t)];
    };
    pts.push(P(0.06, root), P(0.34, root), P(0.44, tip), P(0.56, tip), P(0.66, root), P(0.86, root));
  }
  return pts;
}
type GearOp = Extract<Op, { k: "gear" }>;
function gearGeo(bk: Bucket, spec: Spec, op: GearOp) {
  const sub = new Bucket();
  const rgb = rgbOf(op.col);
  const outline = gearOutline(op.n);
  const holes: P2[][] = [];
  if (op.holes) {
    for (const [x, y, t] of op.holes) {
      const h = holePts(t, x, y);
      if (h) holes.push(h);
    }
  } else {
    // bore fallback: the spec hole on the gear's axis line (Diff, turntables)
    const gax = op.ax ?? 2;
    const gc = op.at ?? [0, 0, 0];
    for (const h of spec.holes) {
      if (h.ax !== gax) continue;
      const perp = [0, 1, 2].filter((i) => i !== gax);
      if (Math.abs(h.c[perp[0]] - gc[perp[0]]) < 0.01 && Math.abs(h.c[perp[1]] - gc[perp[1]]) < 0.01) {
        const b = holePts(h.t, 0, 0);
        if (b) holes.push(b);
        break;
      }
    }
  }
  const Z: P3 = [0, 0, 0];
  if (!op.taper) {
    prism(sub, BASIS[2], Z, outline, holes, op.z0, op.z1, rgb);
  } else if (op.taper === "one") {
    const top = outline.map((p) => [p[0] * GEAR_TAPER, p[1] * GEAR_TAPER] as P2);
    prism(sub, BASIS[2], Z, outline, holes, op.z0, op.z1, rgb, { topOuter: top });
  } else {
    const zm = (op.z0 + op.z1) / 2;
    const scaled = outline.map((p) => [p[0] * GEAR_TAPER, p[1] * GEAR_TAPER] as P2);
    prism(sub, BASIS[2], Z, scaled, holes, op.z0, zm, rgb, { topOuter: outline, capTop: false });
    prism(sub, BASIS[2], Z, outline, holes, zm, op.z1, rgb, { topOuter: scaled, capBottom: false });
  }
  const ax = op.ax ?? 2;
  if (ax !== 2 || op.at) {
    const bs = BASIS[ax];
    const m = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(...bs.u),
      new THREE.Vector3(...bs.v),
      new THREE.Vector3(...bs.w),
    );
    if (op.at) m.setPosition(op.at[0], op.at[1], op.at[2]);
    bk.absorb(sub, m);
  } else {
    bk.absorb(sub);
  }
}

// ---------------------------------------------------------------------
// helical sweeps — worm thread (trapezoid section) and spring coils
// (circular wire). Quads are auto-oriented against their radial hint.
// ---------------------------------------------------------------------
function wormGeo(bk: Bucket, op: Extract<Op, { k: "worm" }>) {
  const rgb = rgbOf(op.col);
  // cross-bored core (the through axle hole of the real 4716)
  prism(bk, BASIS[0], [0, 0, 0], circlePts(0.3, 18), [crossPts()], op.x0, op.x1, rgb);
  const turns = (op.x1 - op.x0) * 1.25;
  const prof: [number, number][] = [
    [0.26, -0.17],
    [0.5, -0.075],
    [0.5, 0.075],
    [0.26, 0.17],
  ]; // (radius, axial offset) trapezoid, closed loop
  const steps = Math.max(12, Math.ceil(turns * 30));
  const inset = 0.17; // thread section half-width: keep the sweep inside [x0, x1]
  const ring = (i: number): P3[] => {
    const f = i / steps;
    const th = f * turns * Math.PI * 2;
    const xc = op.x0 + inset + f * (op.x1 - op.x0 - 2 * inset);
    const co = Math.cos(th);
    const si = Math.sin(th);
    return prof.map(([r, off]) => [xc + off, r * co, r * si] as P3);
  };
  let prev = ring(0);
  const cen0: P3 = [prev.reduce((s, p) => s + p[0], 0) / 4, 0, 0];
  bk.fanAuto(cen0, prev, rgb, [-1, 0, 0]);
  for (let i = 1; i <= steps; i++) {
    const cur = ring(i);
    for (let j = 0; j < 4; j++) {
      const j2 = (j + 1) % 4;
      const A = prev[j];
      const B = cur[j];
      const C = cur[j2];
      const D = prev[j2];
      const cen: P3 = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2, (A[2] + C[2]) / 2];
      bk.quadAuto(A, B, C, D, rgb, [0, cen[1], cen[2]]);
    }
    prev = cur;
  }
  const cen: P3 = [prev.reduce((s, p) => s + p[0], 0) / 4, 0, 0];
  bk.fanAuto(cen, [...prev].reverse(), rgb, [1, 0, 0]);
}
function helixGeo(bk: Bucket, op: Extract<Op, { k: "helix" }>) {
  const rgb = rgbOf(op.col);
  const bs = BASIS[op.ax];
  const steps = Math.max(10, Math.round(op.turns * 18));
  const cs = 8;
  const frame = (i: number) => {
    const f = i / steps;
    const ph = f * op.turns * Math.PI * 2;
    const co = Math.cos(ph);
    const si = Math.sin(ph);
    const radial: P3 = [
      bs.u[0] * co + bs.v[0] * si,
      bs.u[1] * co + bs.v[1] * si,
      bs.u[2] * co + bs.v[2] * si,
    ];
    const center = bp(bs, op.c, op.r * co, op.r * si, op.len * f);
    const tangent = norm3([
      bs.w[0] * op.len - bs.u[0] * si * op.turns * Math.PI * 2 * op.r + bs.v[0] * co * op.turns * Math.PI * 2 * op.r,
      bs.w[1] * op.len - bs.u[1] * si * op.turns * Math.PI * 2 * op.r + bs.v[1] * co * op.turns * Math.PI * 2 * op.r,
      bs.w[2] * op.len - bs.u[2] * si * op.turns * Math.PI * 2 * op.r + bs.v[2] * co * op.turns * Math.PI * 2 * op.r,
    ]);
    return { radial, center, tangent };
  };
  const ring = (i: number): P3[] => {
    const { radial, center } = frame(i);
    const out: P3[] = [];
    for (let j = 0; j < cs; j++) {
      const ps = (j / cs) * Math.PI * 2;
      const off: P3 = [
        radial[0] * Math.cos(ps) + bs.w[0] * Math.sin(ps),
        radial[1] * Math.cos(ps) + bs.w[1] * Math.sin(ps),
        radial[2] * Math.cos(ps) + bs.w[2] * Math.sin(ps),
      ];
      out.push([center[0] + off[0] * op.tr, center[1] + off[1] * op.tr, center[2] + off[2] * op.tr]);
    }
    return out;
  };
  let prev = ring(0);
  {
    const { center, tangent } = frame(0);
    bk.fanAuto(center, [...prev].reverse(), rgb, [-tangent[0], -tangent[1], -tangent[2]]);
  }
  for (let i = 1; i <= steps; i++) {
    const cur = ring(i);
    const mid = frame(i - 0.5);
    for (let j = 0; j < cs; j++) {
      const j2 = (j + 1) % cs;
      bk.quadAuto(prev[j], cur[j], cur[j2], prev[j2], rgb, mid.radial);
    }
    prev = cur;
  }
  const { center, tangent } = frame(steps);
  bk.fanAuto(center, prev, rgb, tangent);
}

// ---------------------------------------------------------------------
// blade — propeller / fan / windmill blades with a radial twist.
// ---------------------------------------------------------------------
function bladeGeo(bk: Bucket, op: Extract<Op, { k: "blade" }>) {
  const rgb = rgbOf(op.col);
  for (let k = 0; k < op.n; k++) {
    const sub = new Bucket();
    const stations = [0, 0.5, 1].map((s) => {
      const r = op.r0 + (op.r1 - op.r0) * s;
      const wdt = op.w0 + (op.w1 - op.w0) * s;
      const tw = op.pitch * s;
      const chord: P3 = [0, Math.cos(tw), Math.sin(tw)];
      const nrm: P3 = [0, -Math.sin(tw), Math.cos(tw)];
      const C: P3 = [r, 0, op.z];
      const cor = (side: number, top: number): P3 => [
        C[0] + nrm[0] * top * (op.t / 2),
        C[1] + chord[1] * side * (wdt / 2) + nrm[1] * top * (op.t / 2),
        C[2] + chord[2] * side * (wdt / 2) + nrm[2] * top * (op.t / 2),
      ];
      return { chord, nrm, tP: cor(1, 1), tM: cor(-1, 1), bP: cor(1, -1), bM: cor(-1, -1) };
    });
    for (let i = 0; i < stations.length - 1; i++) {
      const A = stations[i];
      const B = stations[i + 1];
      const midN = norm3([A.nrm[0] + B.nrm[0], A.nrm[1] + B.nrm[1], A.nrm[2] + B.nrm[2]]);
      const midC = norm3([A.chord[0] + B.chord[0], A.chord[1] + B.chord[1], A.chord[2] + B.chord[2]]);
      sub.quadAuto(A.tM, A.tP, B.tP, B.tM, rgb, midN); // top face
      sub.quadAuto(A.bP, A.bM, B.bM, B.bP, rgb, [-midN[0], -midN[1], -midN[2]]); // bottom face
      sub.quadAuto(A.tP, A.bP, B.bP, B.tP, rgb, midC); // leading edge
      sub.quadAuto(A.bM, A.tM, B.tM, B.bM, rgb, [-midC[0], -midC[1], -midC[2]]); // trailing edge
    }
    const s0 = stations[0];
    const s1 = stations[stations.length - 1];
    sub.quadAuto(s0.tP, s0.tM, s0.bM, s0.bP, rgb, [-1, 0, 0]); // root
    sub.quadAuto(s1.tM, s1.tP, s1.bP, s1.bM, rgb, [1, 0, 0]); // tip
    if (k === 0) bk.absorb(sub);
    else bk.absorb(sub, new THREE.Matrix4().makeRotationZ((k * Math.PI * 2) / op.n));
  }
}

// ---------------------------------------------------------------------
// shell — fairing hood: cylindrical patch (centre line (y, z), angle
// from +Z toward +/-Y) as a thin solid.
// ---------------------------------------------------------------------
function shellGeo(bk: Bucket, op: Extract<Op, { k: "shell" }>) {
  const rgb = rgbOf(op.col);
  const steps = 12;
  const thick = 0.07;
  const P = (x: number, a: number, rr: number): P3 => [x, op.y + rr * Math.sin(a), op.z + rr * Math.cos(a)];
  const rad = (a: number): P3 => [0, Math.sin(a), Math.cos(a)];
  const tan = (a: number): P3 => [0, Math.cos(a), -Math.sin(a)];
  const angles: number[] = [];
  for (let i = 0; i <= steps; i++) angles.push(op.a0 + ((op.a1 - op.a0) * i) / steps);
  for (let i = 0; i < steps; i++) {
    const am = (angles[i] + angles[i + 1]) / 2;
    bk.quadAuto(P(op.x0, angles[i], op.r), P(op.x1, angles[i], op.r), P(op.x1, angles[i + 1], op.r), P(op.x0, angles[i + 1], op.r), rgb, rad(am));
    const ri = op.r - thick;
    const inHint = rad(am);
    bk.quadAuto(P(op.x0, angles[i], ri), P(op.x1, angles[i], ri), P(op.x1, angles[i + 1], ri), P(op.x0, angles[i + 1], ri), rgb, [-inHint[0], -inHint[1], -inHint[2]]);
    bk.quadAuto(P(op.x0, angles[i], op.r), P(op.x0, angles[i], ri), P(op.x0, angles[i + 1], ri), P(op.x0, angles[i + 1], op.r), rgb, [-1, 0, 0]);
    bk.quadAuto(P(op.x1, angles[i], op.r), P(op.x1, angles[i], ri), P(op.x1, angles[i + 1], ri), P(op.x1, angles[i + 1], op.r), rgb, [1, 0, 0]);
  }
  for (const [a, sgn] of [
    [op.a0, -1],
    [op.a1, 1],
  ] as const) {
    const t = tan(a);
    bk.quadAuto(P(op.x0, a, op.r), P(op.x1, a, op.r), P(op.x1, a, op.r - thick), P(op.x0, a, op.r - thick), rgb, [t[0] * sgn, t[1] * sgn, t[2] * sgn]);
  }
}

// ---------------------------------------------------------------------
// plate — capsule-union outline with the op's holes drilled through.
// ---------------------------------------------------------------------
function capsuleOutlinePts(p: P2, q: P2, r: number): P2[] {
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const L = Math.hypot(dx, dy);
  if (L < 1e-9) return circlePts(r, 20, p[0], p[1]);
  const du: P2 = [dx / L, dy / L];
  const nv: P2 = [-du[1], du[0]];
  const aN = Math.atan2(nv[1], nv[0]);
  const pts: P2[] = [
    [p[0] - nv[0] * r, p[1] - nv[1] * r],
    [q[0] - nv[0] * r, q[1] - nv[1] * r],
  ];
  const arcPts = (cen: P2, a0: number, skipFirst: boolean, skipLast: boolean) => {
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      if (i === 0 && skipFirst) continue;
      if (i === steps && skipLast) continue;
      const t = a0 + (i / steps) * Math.PI;
      pts.push([cen[0] + r * Math.cos(t), cen[1] + r * Math.sin(t)]);
    }
  };
  arcPts(q, aN - Math.PI, true, false);
  pts.push([p[0] + nv[0] * r, p[1] + nv[1] * r]);
  arcPts(p, aN, true, true);
  return pts;
}
function plateGeo(bk: Bucket, op: Extract<Op, { k: "plate" }>) {
  const rgb = rgbOf(op.col);
  const r = op.w / 2;
  const designed: P2[][] = [];
  for (const [x, y, t] of op.holes) {
    const h = holePts(t, x, y);
    if (h) designed.push(h);
  }
  const { outers, holes: innerLoops } = capsuleUnion(op.segs as [P2, P2][], r);
  if (!outers.length) {
    // tracer fallback: overlapping per-segment capsules
    for (const [p, q] of op.segs) {
      const outline = capsuleOutlinePts(p, q, r);
      prism(bk, BASIS[2], [0, 0, 0], outline, designed.filter((d) => pointInPoly(centroid2(d), outline)), op.z0, op.z1, rgb);
    }
    return;
  }
  for (const outer of outers) {
    const hs = [
      ...innerLoops.filter((h) => pointInPoly(centroid2(h), outer)),
      ...designed.filter((d) => pointInPoly(centroid2(d), outer)),
    ];
    prism(bk, BASIS[2], [0, 0, 0], outer, hs, op.z0, op.z1, rgb);
  }
}

// ---------------------------------------------------------------------
// pin (lathe profile with collars) / sphere
// ---------------------------------------------------------------------
function sphereAt(bk: Bucket, c: P3, r: number, rgb: RGB) {
  const prof: [number, number][] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const ph = (i / n) * Math.PI;
    prof.push([r * Math.sin(ph), -r * Math.cos(ph)]);
  }
  revolve(bk, 2, c, prof, false, rgb, 18);
}
function pinGeo(bk: Bucket, op: Extract<Op, { k: "pin" }>) {
  const rgb = rgbOf(op.col);
  if (op.ball) {
    const prof: [number, number][] = [
      [0, op.x0],
      [0.26, op.x0],
      [0.26, op.x1 - 0.3],
      [0, op.x1 - 0.3],
    ];
    revolve(bk, 0, [0, 0, 0], prof, false, rgb, 14);
    sphereAt(bk, [op.x1 - 0.12, 0, 0], 0.4, rgb);
    return;
  }
  const prof: [number, number][] = [
    [0, op.x0],
    [0.29, op.x0],
  ];
  for (const cx of [...op.collar].sort((a, b) => a - b)) {
    const c0 = Math.max(cx - 0.1, op.x0);
    const c1 = Math.min(cx + 0.1, op.x1);
    if (c1 - c0 < 0.04) continue;
    prof.push([0.29, c0], [0.42, c0], [0.42, c1], [0.29, c1]);
  }
  prof.push([0.29, op.x1], [0, op.x1]);
  revolve(bk, 0, [0, 0, 0], prof, false, rgb, 16);
}

// ---------------------------------------------------------------------
// tube (annulus prism; round / cross / no bore; optional end flange)
// ---------------------------------------------------------------------
function tubeGeo(bk: Bucket, op: Extract<Op, { k: "tube" }>) {
  const rgb = rgbOf(op.col);
  const holes: P2[][] = op.hole === "P" ? [circlePts(HOLE_R, 18)] : op.hole === "A" ? [crossPts()] : [];
  prism(bk, BASIS[op.ax], op.c, circlePts(op.r, segFor(op.r)), holes, -op.len / 2, op.len / 2, rgb);
  if (op.flange) prism(bk, BASIS[op.ax], op.c, circlePts(op.flange, segFor(op.flange)), holes, -op.len / 2 - 0.1, -op.len / 2 + 0.02, rgb);
}

// ---------------------------------------------------------------------
// rack — holed bar + trapezoid teeth on top (pitch pi/8 M = pi mm)
// ---------------------------------------------------------------------
const TOOTH_BASIS: Basis = { u: [0, 0, 1], v: [1, 0, 0], w: [0, 1, 0] };
function rackGeo(bk: Bucket, op: Extract<Op, { k: "rack" }>) {
  const rgb = rgbOf(op.col);
  const holes = op.holes.map(([x, t]) => holePts(t, x, 0)).filter((h): h is P2[] => h !== null);
  prism(bk, BASIS[2], [0, 0, 0], rectPts(op.x0, -0.45, op.x1, 0.45), holes, -0.5, 0.18, rgb);
  const p = Math.PI / 8;
  const n = Math.max(1, Math.round((op.x1 - op.x0) / p));
  const startX = (op.x0 + op.x1) / 2 - ((n - 1) * p) / 2;
  for (let i = 0; i < n; i++) {
    const cx = startX + i * p;
    const outline: P2[] = [
      [0.18, cx - 0.3 * p],
      [0.5, cx - 0.12 * p],
      [0.5, cx + 0.12 * p],
      [0.18, cx + 0.3 * p],
    ];
    prism(bk, TOOTH_BASIS, [0, 0, 0], outline, [], -0.42, 0.42, rgb);
  }
}

// ---------------------------------------------------------------------
// arm — off-grid connector arm: cross-bored tube from the origin along d
// ---------------------------------------------------------------------
function armGeo(bk: Bucket, op: Extract<Op, { k: "arm" }>) {
  const sub = new Bucket();
  prism(sub, BASIS[0], [0, 0, 0], circlePts(op.r, segFor(op.r)), [crossPts()], 0, op.len, rgbOf(op.col));
  bk.absorb(sub, new THREE.Matrix4().makeRotationZ(Math.atan2(op.d[1], op.d[0])));
}

// ---------------------------------------------------------------------
// op dispatch
// ---------------------------------------------------------------------
function opGeo(bk: Bucket, spec: Spec, op: Op) {
  switch (op.k) {
    case "plate":
      plateGeo(bk, op);
      break;
    case "axle": {
      const rgb = rgbOf(op.col);
      prism(bk, BASIS[0], [0, 0, 0], crossPts(), [], op.x0, op.x1, rgb);
      if (op.stop !== undefined) cylSmooth(bk, 0, [op.stop, 0, 0], 0.44, 0.45, rgb, 18);
      break;
    }
    case "pin":
      pinGeo(bk, op);
      break;
    case "tube":
      tubeGeo(bk, op);
      break;
    case "box":
      prism(bk, BASIS[2], [0, 0, 0], rectPts(op.a[0], op.a[1], op.b[0], op.b[1]), [], op.a[2], op.b[2], rgbOf(op.col));
      break;
    case "cyl":
      cylSmooth(bk, op.ax, op.c, op.r, op.len, rgbOf(op.col), op.seg ?? segFor(op.r));
      break;
    case "sphere":
      sphereAt(bk, op.c, op.r, rgbOf(op.col));
      break;
    case "gear":
      gearGeo(bk, spec, op);
      break;
    case "worm":
      wormGeo(bk, op);
      break;
    case "rack":
      rackGeo(bk, op);
      break;
    case "lathe":
      revolve(bk, op.ax, op.c, op.pts, true, rgbOf(op.col));
      break;
    case "helix":
      helixGeo(bk, op);
      break;
    case "blade":
      bladeGeo(bk, op);
      break;
    case "studs": {
      const rgb = rgbOf(op.col);
      for (const x of op.xs) for (const y of op.ys) cylSmooth(bk, 2, [x, y, op.z + 0.11], 0.3, 0.22, rgb, 14);
      break;
    }
    case "dot":
      cylSmooth(bk, op.ax, op.c, op.r, 0.024, rgbOf(op.col), 12);
      break;
    case "arm":
      armGeo(bk, op);
      break;
    case "shell":
      shellGeo(bk, op);
      break;
  }
}

// ---------------------------------------------------------------------
// post-pass: holes recorded only in spec data (never emitted as ops)
// get the dark pastille B.hole() would have drawn — both faces — when
// the hole sits inside an occupancy box and no dot op already marks it.
// (Fires for e.g. FairLarge's six holes and the Spring motor's port.)
// ---------------------------------------------------------------------
function orphanHoleDots(bk: Bucket, spec: Spec) {
  const rgb = rgbOf(0x141414);
  // holes already drawn as real bores by their op (plate / gear / rack /
  // tube) must NOT get a pastille — it would cap the bore mouth.
  const drawn = new Set<string>();
  for (const o of spec.ops) {
    if (o.k === "plate" || o.k === "gear") {
      for (const [x, y, t] of o.holes ?? []) if (t !== "N") drawn.add(`2|${x}|${y}|${t}`);
    } else if (o.k === "rack") {
      for (const [x, t] of o.holes) drawn.add(`2|${x}|0|${t}`);
    } else if (o.k === "tube" && o.hole !== "N") {
      drawn.add(`${o.ax}|${o.c[0]}|${o.c[1]}|${o.c[2]}|${o.hole}`);
    }
  }
  for (const h of spec.holes) {
    const key =
      h.ax === 2 ? `2|${h.c[0]}|${h.c[1]}|${h.t}` : `${h.ax}|${h.c[0]}|${h.c[1]}|${h.c[2]}|${h.t}`;
    if (drawn.has(key)) continue;
    const faces: P3[] = [-1, 1].map((sg) => {
      const p = [...h.c] as P3;
      p[h.ax] += sg * (h.len / 2 + 0.004);
      return p;
    });
    const marked = spec.ops.some(
      (o) =>
        o.k === "dot" &&
        faces.some((f) => Math.abs(o.c[0] - f[0]) < 0.02 && Math.abs(o.c[1] - f[1]) < 0.02 && Math.abs(o.c[2] - f[2]) < 0.02),
    );
    if (marked) continue;
    const inBox = spec.boxes.some(
      ([a, b]) => h.c[0] > a[0] && h.c[0] < b[0] && h.c[1] > a[1] && h.c[1] < b[1] && h.c[2] > a[2] && h.c[2] < b[2],
    );
    if (!inBox) continue;
    for (const p of faces) cylSmooth(bk, h.ax, p, h.t === "A" ? AXLE_R : HOLE_R, 0.024, rgb, 12);
  }
}

// ---------------------------------------------------------------------
// public API (step 2: one Mesh per placed part, scale MODULE_TO_BLOCK)
// ---------------------------------------------------------------------
const geoCache = new Map<number, THREE.BufferGeometry>();
export function buildTeksGeometry(id: number): THREE.BufferGeometry | null {
  const hit = geoCache.get(id);
  if (hit) return hit;
  const s = SPECS.get(id);
  if (!s) return null;
  const bk = new Bucket();
  for (const op of s.ops) opGeo(bk, s, op);
  orphanHoleDots(bk, s);
  const g = bk.build();
  geoCache.set(id, g);
  return g;
}
