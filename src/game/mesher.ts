import { ATLAS_COLS, ATLAS_ROWS, ID, def, faceTile } from "./blocks";
import { MELT_STAGES, fkey, heatDirAt, heatMap, meltAt, puddleSrc } from "./fireState";
import { FULL, chipMap, pieceIndex, removedAt } from "./chipState";
import { hasTuftAt, tuftJitter } from "./tuftState";
import { CS, HEIGHT, type World } from "./world";

export type Surface = { pos: number[]; nor: number[]; uv: number[]; col: number[]; tan: number[] };

const FACES = [
  { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];

function empty(): Surface {
  return { pos: [], nor: [], uv: [], col: [], tan: [] };
}

function uvs(tile: number): [number, number, number, number] {
  const c = tile % ATLAS_COLS;
  const r = Math.floor(tile / ATLAS_COLS);
  const du = 1 / ATLAS_COLS;
  const dv = 1 / ATLAS_ROWS;
  const padU = du * 0.02;
  const padV = dv * 0.02;
  const u0 = c * du + padU;
  const u1 = (c + 1) * du - padU;
  const vTop = 1 - r * dv - padV;
  const vBot = 1 - (r + 1) * dv + padV;
  return [u0, vBot, u1, vTop];
}

const QUAD_ORDER_0 = [0, 1, 2, 0, 2, 3] as const;
const QUAD_ORDER_1 = [1, 2, 3, 1, 3, 0] as const;
const DEFAULT_AO = [1, 1, 1, 1] as const;

function pushQuad(s: Surface, v: number[][], n: number[], tile: number, shade?: readonly number[], tint?: readonly number[]) {
  const cTile = tile % ATLAS_COLS;
  const rTile = (tile / ATLAS_COLS) | 0;
  const du = 1 / ATLAS_COLS;
  const dv = 1 / ATLAS_ROWS;
  const padU = du * 0.02;
  const padV = dv * 0.02;
  const u0 = cTile * du + padU;
  const u1 = (cTile + 1) * du - padU;
  const v1 = 1 - rTile * dv - padV;
  const v0 = 1 - (rTile + 1) * dv + padV;
  const ao = shade ?? DEFAULT_AO;
  const order = ao[0] + ao[2] < ao[1] + ao[3] ? QUAD_ORDER_1 : QUAD_ORDER_0;
  const tx = v[1][0] - v[0][0];
  const ty = v[1][1] - v[0][1];
  const tz = v[1][2] - v[0][2];
  const invTl = 1 / (Math.hypot(tx, ty, tz) || 1);
  const nx = n[0];
  const ny = n[1];
  const nz = n[2];
  const tnx = tx * invTl;
  const tny = ty * invTl;
  const tnz = tz * invTl;
  const tr = tint ? tint[0] : 1;
  const tg = tint ? tint[1] : 1;
  const tb = tint ? tint[2] : 1;
  for (let k = 0; k < 6; k++) {
    const i = order[k];
    const vi = v[i];
    s.pos.push(vi[0], vi[1], vi[2]);
    s.nor.push(nx, ny, nz);
    s.uv.push(i === 0 || i === 3 ? u0 : u1, i < 2 ? v0 : v1);
    const c = ao[i];
    s.col.push(c * tr, c * tg, c * tb);
    s.tan.push(tnx, tny, tnz, 1);
  }
}

// Deterministic per-block tint hash (world coords): the same brick gets the
// same subtle color variation on every mesh, from any chunk, forever.
function hashBlock(x: number, y: number, z: number) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// Classic 2×2 LEGO brick on a 1×1×1 voxel cell (40×40 LDU top):
// 4 cylindrical studs in a 2×2 grid at (0.26, 0.26), (0.74, 0.26), (0.26, 0.74), (0.74, 0.74).
export const STUD_R = 0.148;
export const STUD_H = 0.11;
export const STUD_OFFSETS = [
  [0.26, 0.26],
  [0.74, 0.26],
  [0.26, 0.74],
  [0.74, 0.74],
] as const;
const STUD_N = 8; // v4.12: 10→8 segments per stud — invisible at stud size, −20 % stud triangles
const STUD_TOP_R = STUD_R * 0.91;
const STUD_COS = new Float32Array(STUD_N);
const STUD_SIN = new Float32Array(STUD_N);
const STUD_LIP_X = new Float32Array(STUD_N);
const STUD_LIP_Z = new Float32Array(STUD_N);
const STUD_LIP_Y = (() => {
  const dh = STUD_H * 0.35;
  const dr = STUD_R - STUD_TOP_R;
  const lipLen = Math.hypot(dh, dr) || 1;
  for (let i = 0; i < STUD_N; i++) {
    const a = (i / STUD_N) * Math.PI * 2;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    STUD_COS[i] = c;
    STUD_SIN[i] = sn;
    STUD_LIP_X[i] = (c * dh) / lipLen;
    STUD_LIP_Z[i] = (sn * dh) / lipLen;
  }
  return dr / lipLen;
})();

function addBox(s: Surface, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile: number) {
  pushQuad(s, [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], tile);
  pushQuad(s, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], tile);
  pushQuad(s, [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], tile);
  pushQuad(s, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], tile);
  pushQuad(s, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], tile);
  pushQuad(s, [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], tile);
}

// Box with per-face tiles (side / top / bottom), for slabs and stairs whose
// top must carry the material's top tile, not its side tile.
function addBoxT(s: Surface, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, side: number, top: number, bottom: number, tint?: readonly number[]) {
  pushQuad(s, [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], side, undefined, tint);
  pushQuad(s, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], side, undefined, tint);
  pushQuad(s, [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], top, undefined, tint);
  pushQuad(s, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], bottom, undefined, tint);
  pushQuad(s, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], side, undefined, tint);
  pushQuad(s, [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], side, undefined, tint);
}

// ---------------------------------------------------------------------------
// MOLTEN SURFACE (v4.16.1 pass 2, rebuilt in v4.17 as an implicit field —
// see buildChunk). Everything that is liquid plastic goes into its own
// `molten` surface, rendered by a seamless glossy material (game.ts): no
// sub-brick seams, no stud texture, real specular that follows the
// curvature. Zero idle cost: when nothing melts the surface is empty and no
// mesh is created; all of it is computed at meshing time.
// ---------------------------------------------------------------------------

// v4.17: a brick's base colour in LINEAR space (vertex colours are linear;
// the def colours are sRGB hex) — the molten surface is untextured.
const LIN_CACHE = new Map<number, number[]>();
function brickLinear(id: number): number[] {
  let c = LIN_CACHE.get(id);
  if (!c) {
    const hex = def(id).color || "#808080";
    const n = parseInt(hex.slice(1, 7), 16) || 0x808080;
    const lin = (v: number) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    c = [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255)];
    LIN_CACHE.set(id, c);
  }
  return c;
}

// Burnt plastic: real burning ABS goes from its colour through a scorched
// brown to glossy black char, in irregular patches. The mesher writes the
// char AMOUNT per vertex (this smooth world-space patch noise runs across
// fused bricks); the colour ramp itself is applied per pixel in the molten
// shader (game.ts moltenize).
function charPatch(px: number, py: number, pz: number) {
  return 0.5 + 0.5 * Math.sin(px * 7.3 + pz * 3.1 + py * 5.7) * Math.sin(pz * 6.1 - px * 2.3 + py * 4.1);
}

// Horizontal/vertical tube between two points (axis-aligned runs only) —
// the ROUND rungs of the v4.16 ladder. 7 flat-shaded facets read as a
// molded plastic cylinder at game distance; rung ends bury into the rails,
// so no end caps are emitted.
function addTube(s: Surface, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number, tile: number) {
  const SEG = 7;
  const alongX = Math.abs(bx - ax) > Math.abs(bz - az);
  for (let i = 0; i < SEG; i++) {
    const t0 = (i / SEG) * Math.PI * 2;
    const t1 = ((i + 1) / SEG) * Math.PI * 2;
    const c0 = Math.cos(t0), s0 = Math.sin(t0), c1 = Math.cos(t1), s1 = Math.sin(t1);
    const tm = (t0 + t1) / 2, cm = Math.cos(tm), sm = Math.sin(tm);
    if (alongX) {
      const p00 = [ax, ay + r * c0, az + r * s0], p01 = [ax, ay + r * c1, az + r * s1];
      const p10 = [bx, by + r * c0, bz + r * s0], p11 = [bx, by + r * c1, bz + r * s1];
      pushQuad(s, [p00, p01, p11, p10], [0, cm, sm], tile);
    } else {
      const p00 = [ax + r * s0, ay + r * c0, az], p01 = [ax + r * s1, ay + r * c1, az];
      const p10 = [bx + r * s0, by + r * c0, bz], p11 = [bx + r * s1, by + r * c1, bz];
      pushQuad(s, [p00, p10, p11, p01], [sm, cm, 0], tile);
    }
  }
}

function pushStudVert(
  s: Surface,
  px: number,
  py: number,
  pz: number,
  nx: number,
  ny: number,
  nz: number,
  cu: number,
  cv: number,
  tx: number,
  ty: number,
  tz: number,
  shade: number,
) {
  s.pos.push(px, py, pz);
  s.nor.push(nx, ny, nz);
  s.uv.push(cu, cv);
  s.col.push(shade, shade, shade);
  s.tan.push(tx, ty, tz, 1);
}

function addStud(s: Surface, x: number, y: number, z: number, tile: number, jit = 1, sink = 0, flat = 1, mask = 15) {
  const y0 = y + 1.001 - sink;
  const y1 = y0 + STUD_H * flat;
  const [u0, v0, u1, v1] = uvs(tile);
  const cu = (u0 + u1) * 0.5;
  const cv = (v0 + v1) * 0.5;
  const baseShade = 0.82 * jit;
  const topShade = 1.02 * jit;
  for (let sIdx = 0; sIdx < 4; sIdx++) {
    if (!(mask & (1 << sIdx))) continue; // v4.17: studs of the pieces still standing only
    const off = STUD_OFFSETS[sIdx];
    const cx = x + off[0];
    const cz = z + off[1];
    const t0x = cx + STUD_COS[0] * STUD_TOP_R;
    const t0z = cz + STUD_SIN[0] * STUD_TOP_R;
    for (let i = 0; i < STUD_N; i++) {
      const j = (i + 1) % STUD_N;
      const ci = STUD_COS[i];
      const si = STUD_SIN[i];
      const cj = STUD_COS[j];
      const sj = STUD_SIN[j];
      const bix = cx + ci * STUD_R;
      const biz = cz + si * STUD_R;
      const bjx = cx + cj * STUD_R;
      const bjz = cz + sj * STUD_R;
      const tix = cx + ci * STUD_TOP_R;
      const tiz = cz + si * STUD_TOP_R;
      const tjx = cx + cj * STUD_TOP_R;
      const tjz = cz + sj * STUD_TOP_R;
      const tx = -si;
      const tz = ci;
      const lix = STUD_LIP_X[i];
      const liz = STUD_LIP_Z[i];
      const ljx = STUD_LIP_X[j];
      const ljz = STUD_LIP_Z[j];

      // Single tapered cylinder wall quad with base contact AO & bevelled top rim normal (cuts stud tris by 53%)
      pushStudVert(s, bix, y0, biz, ci, 0, si, cu, cv, tx, 0, tz, baseShade);
      pushStudVert(s, tix, y1, tiz, lix, STUD_LIP_Y, liz, cu, cv, tx, 0, tz, topShade);
      pushStudVert(s, tjx, y1, tjz, ljx, STUD_LIP_Y, ljz, cu, cv, tx, 0, tz, topShade);
      pushStudVert(s, bix, y0, biz, ci, 0, si, cu, cv, tx, 0, tz, baseShade);
      pushStudVert(s, tjx, y1, tjz, ljx, STUD_LIP_Y, ljz, cu, cv, tx, 0, tz, topShade);
      pushStudVert(s, bjx, y0, bjz, cj, 0, sj, cu, cv, tx, 0, tz, baseShade);

      // Top cap N-gon triangle fan (STUD_N - 2 triangles instead of STUD_N center-fan triangles)
      if (i >= 1 && i < STUD_N - 1) {
        pushStudVert(s, t0x, y1, t0z, 0, 1, 0, cu, cv, 1, 0, 0, topShade);
        pushStudVert(s, tjx, y1, tjz, 0, 1, 0, cu, cv, 1, 0, 0, topShade);
        pushStudVert(s, tix, y1, tiz, 0, 1, 0, cu, cv, 1, 0, 0, topShade);
      }
    }
  }
}

// v4.17 molten field cache: a contoured cell is reused as long as nothing in
// its 5×5×5 neighbourhood changed (block ids, melt stages, heat direction,
// puddle sources) — a remesh only re-contours the cells around the brick
// whose melt stage moved. Bounded; cleared wholesale when it grows.
type MoltenCell = { sig: number; pos: number[]; nor: number[]; uv: number[]; col: number[]; tan: number[] };
const moltenCache = new Map<string, MoltenCell>();
function appendAll(dst: number[], src: number[]) {
  for (let i = 0; i < src.length; i += 4096) dst.push(...src.slice(i, i + 4096));
}

export function buildChunk(world: World, cx: number, cz: number, fancy: boolean, detail = true) {
  const opaque = empty();
  const glass = empty();
  const water = empty();
  const plant = empty();
  const molten = empty(); // v4.16.1 pass 2: liquid plastic (own glossy, seamless material)
  // v4.15: heat emitters seen in this chunk (campfires; lava with air above) —
  // game.ts registers them in fireState so the fire tick never scans the world.
  const emitters: string[] = [];
  const x0 = cx * CS;
  const z0 = cz * CS;
  const AO = [0.56, 0.74, 0.89, 1];
  const scratchVerts = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const scratchShade = [1, 1, 1, 1];
  const scratchTint = [1, 1, 1];

  function isPartialLego(id: number, block: ReturnType<typeof def>) {
    return (
      block.slab ||
      block.stairs ||
      block.sign ||
      block.flat ||
      block.door ||
      block.gate ||
      block.cactus ||
      block.fruit ||
      id === ID.Anvil ||
      id === ID.Grindstone ||
      id === ID.Brew ||
      id === ID.Campfire ||
      id === ID.Bed ||
      id === ID.Fence ||
      id === ID.EndCrystal ||
      id === ID.Hopper
    );
  }

  function occludes(id: number) {
    if (!id) return 0;
    const block = def(id);
    // Slabs/stairs/signs/work-props never fully hide a neighbour's face or cast full AO.
    return block.solid && !block.glass && !block.fluid && !isPartialLego(id, block) ? 1 : 0;
  }

  function shadeAt(x: number, y: number, z: number, nx: number, ny: number, nz: number, vx: number, vy: number, vz: number) {
    if (!detail) return 1;
    const bx = x + nx;
    const by = y + ny;
    const bz = z + nz;
    const az = 0;
    const dx = 0;
    let ax = 0, ay = 0;
    let dy = 0, dz = 0;
    if (nx === 0) {
      ax = vx === 0 ? -1 : 1;
      if (ny === 0) dy = vy === 0 ? -1 : 1;
      else dz = vz === 0 ? -1 : 1;
    } else {
      ay = vy === 0 ? -1 : 1;
      dz = vz === 0 ? -1 : 1;
    }
    const s1 = occludes(world.get(bx + ax, by + ay, bz + az));
    const s2 = occludes(world.get(bx + dx, by + dy, bz + dz));
    const corner = s1 && s2 ? 1 : occludes(world.get(bx + ax + dx, by + ay + dy, bz + az + dz));
    const level = s1 && s2 ? 0 : 3 - (s1 + s2 + corner);
    return AO[level];
  }

  // A puddle (Melted) is a low liquid sheet, NOT a full cube: it never
  // hides a neighbour's face (v4.16.1 see-through fix).
  const occ = (nid: number) => {
    if (nid === ID.Melted) return false;
    const n = def(nid);
    return n.solid && !n.glass && !isPartialLego(nid, n);
  };
  // A neighbour that is melting, damaged (pieces knocked out) or a puddle no
  // longer fills its cube — it must not cull this block's face, or the gap
  // it leaves shows straight through the wall (Philippe: « briques
  // transparentes sur les côtés »).
  const meltActive = heatMap.size > 0 || puddleSrc.size > 0;
  const deformsAt = (x: number, y: number, z: number, nid: number) => {
    if (nid === ID.Melted) return true;
    if (chipMap.size && removedAt(x, y, z, nid)) return true;
    return meltActive && meltAt(x, y, z) > 0;
  };

  // ---- v4.17 MELT, rethought from scratch (Claude — Philippe 12:31: « c'est
  // affreux, c'est des bulles… repense complètement la fonte »).
  // Molten plastic is ONE continuous implicit surface (a signed distance
  // field: pure math, zero assets) instead of separate shapes. Every melting
  // brick is a volume that softens (edges round a little), SAGS at the top
  // (lower on the side the flames lick), SLUMPS outward at its foot, is EATEN
  // AWAY on its exposed faces (most where the heat comes from), RUNS DOWN its
  // faces in streaks and HANGS DRIPS from an open underside; a puddle is a
  // thin meniscus sheet on the floor. Everything molten is SMOOTH-UNIONED, so
  // neighbouring molten bricks, their drips and the pools under them fuse into
  // one liquid body, and the liquid wets the cold bricks it touches (fillets).
  // The field is a pure function of world position, contoured cell by cell
  // with surface nets on an R³ lattice -> identical values on shared
  // cell faces: no seams between cells or chunks. Mesher-time only, and only
  // the cells around melting plastic / puddles are contoured (zero idle cost).
  type Prim = {
    k: number; // 0 cold brick, 1 molten brick, 2 pool
    x: number; y: number; z: number; m: number; id: number;
    lx: number; hx: number; ly: number; lz: number; hz: number;
    top: number; tx: number; tz: number; ed: number; r: number;
    fW: number; fE: number; fN: number; fS: number;
    caps: number[]; // [ax, az, ay, by, r0] per drip / streak
    cliff: number; // pool: sides (+x, -x, +z, -z bits) that drop away
    pcx: number; pcz: number; R0: number; p1: number; p2: number; p3: number; H: number;
  };
  const isMolten = (x: number, y: number, z: number, id: number) => {
    if (!meltActive || !id || id === ID.Melted) return false;
    const d = def(id);
    if (!d.solid || d.fluid || d.glass || isPartialLego(id, d)) return false;
    return meltAt(x, y, z) > 0;
  };
  const openCell = (id: number) => id !== ID.Melted && !occ(id) && !def(id).fluid;
  const frac = (v: number) => v - Math.floor(v);
  const primCache = new Map<number, Prim | null>();
  const pkey = (x: number, y: number, z: number) => ((y + 8) * 4096 + (x - x0 + 1024)) * 4096 + (z - z0 + 1024);
  function blankPrim(k: number, x: number, y: number, z: number, id: number): Prim {
    return { k, x, y, z, m: 0, id, lx: x + 0.03, hx: x + 0.97, ly: y + 0.03, lz: z + 0.03, hz: z + 0.97, top: y + 0.97, tx: 0, tz: 0, ed: 0, r: 0, fW: 0, fE: 0, fN: 0, fS: 0, caps: [], cliff: 0, pcx: 0, pcz: 0, R0: 0, p1: 0, p2: 0, p3: 0, H: 0 };
  }
  function getPrim(x: number, y: number, z: number): Prim | null {
    const key = pkey(x, y, z);
    const hit = primCache.get(key);
    if (hit !== undefined) return hit;
    let pr: Prim | null = null;
    const id = y < 0 || y >= HEIGHT ? 0 : world.get(x, y, z);
    if (id === ID.Melted) {
      // pool: a thin rounded sheet, hash-shifted, wider than its cell so
      // neighbouring pools overlap and fuse
      const ph = hashBlock(x, y, z);
      pr = blankPrim(2, x, y, z, puddleSrc.get(fkey(x, y, z)) ?? ID.Melted);
      pr.m = 1;
      pr.pcx = x + 0.5 + (ph - 0.5) * 0.14;
      pr.pcz = z + 0.5 + (frac(ph * 7.3) - 0.5) * 0.14;
      pr.R0 = 0.66 + frac(ph * 3.9) * 0.08;
      pr.p1 = ph * 6.283; pr.p2 = frac(ph * 13.7) * 6.283; pr.p3 = frac(ph * 29.3) * 6.283;
      pr.H = 0.13 + frac(ph * 5.1) * 0.03; // the studs under a puddle are drowned (not drawn)
      pr.ly = y - 0.04;
      // at a drop (open cell beside AND below it) the liquid does not hang
      // out as a shelf: the sheet stops short of the edge and runs over it
      // in drips down the face
      const sides: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (let sd = 0; sd < 4; sd++) {
        const [ox, oz] = sides[sd];
        if (!openCell(world.get(x + ox, y, z + oz)) || !openCell(world.get(x + ox, y - 1, z + oz))) continue;
        pr.cliff |= 1 << sd;
        const hs = hashBlock(x * 5 + sd, y, z * 3 - sd);
        const n = 1 + (hs > 0.5 ? 1 : 0);
        for (let q = 0; q < n; q++) {
          const u = 0.2 + 0.6 * frac(hs * (3.1 + q * 2.3));
          const ex = ox ? x + 0.5 + ox * 0.5 : x + u, ez = oz ? z + 0.5 + oz * 0.5 : z + u;
          pr.caps.push(ex - ox * 0.03, ez - oz * 0.03, y + 0.06, y - 0.25 - 0.5 * frac(hs * 7.7 + q * 0.4), 0.065);
        }
      }
    } else if (id && isMolten(x, y, z, id)) {
      // quantised to the remesh stage (and the heat direction to quarters):
      // the geometry of a cell is a pure function of what the cache signs
      const m = Math.min(1, (Math.floor(meltAt(x, y, z) * MELT_STAGES) + 0.5) / MELT_STAGES);
      const [hdx0, , hdz0] = heatDirAt(x, y, z);
      const hdx = Math.round(hdx0 * 4) / 4, hdz = Math.round(hdz0 * 4) / 4;
      pr = blankPrim(1, x, y, z, id);
      pr.m = m;
      // a puddle is only a thin sheet at the bottom of its cell: for the
      // brick next to / above it, that cell is open space
      const op = (id: number) => id === ID.Melted || openCell(id);
      const oW = op(world.get(x - 1, y, z)), oE = op(world.get(x + 1, y, z));
      const oN = op(world.get(x, y, z - 1)), oS = op(world.get(x, y, z + 1));
      const oU = op(world.get(x, y + 1, z)), oD = op(world.get(x, y - 1, z));
      // exposed faces are eaten away (most on the side the heat comes from);
      // faces against bricks stay welded (the box reaches a hair past them)
      const eat = (open: boolean, dot: number) => (open ? m * (0.07 + 0.33 * Math.max(0, dot)) : -0.03);
      pr.lx = x + eat(oW, -hdx); pr.hx = x + 1 - eat(oE, hdx);
      pr.lz = z + eat(oN, -hdz); pr.hz = z + 1 - eat(oS, hdz);
      pr.ly = oD ? y + 0.1 * m : y - 0.03;
      if (oU) {
        pr.top = y + 1 - 0.48 * Math.pow(m, 1.2);
        pr.tx = 0.4 * m * hdx; pr.tz = 0.4 * m * hdz; // lower toward the flames
        pr.ed = 0.04 * m; // the top edges roll over a little
      } else pr.top = y + 1.03;
      const belowMolten = isMolten(x, y - 1, z, world.get(x, y - 1, z));
      if (!oD && !belowMolten) {
        // resting on something cold: the soft plastic slumps out at its foot
        // (volume goes somewhere: the lower the top, the wider the foot)
        const fl = 0.26 * m;
        pr.fW = oW ? fl : 0; pr.fE = oE ? fl : 0;
        pr.fN = oN ? fl : 0; pr.fS = oS ? fl : 0;
      }
      pr.r = 0.02 + 0.045 * m;
      const h = hashBlock(x, y, z);
      // drips hanging from an open underside: thin, tapering, a bead at the tip
      if (oD && m > 0.08) {
        const n = 1 + Math.floor(h * 2.99);
        for (let i = 0; i < n; i++) {
          const hi = hashBlock(x * 3 + i * 17, y + i * 5, z * 7 - i * 11);
          const len = m * (0.2 + 0.62 * frac(hi * 3.7));
          pr.caps.push(x + 0.2 + 0.6 * hi, z + 0.2 + 0.6 * frac(hi * 7.31), pr.ly + 0.06, pr.ly - len, 0.065 + 0.035 * m);
        }
      }
      // streaks: plastic running down the exposed faces
      if (m > 0.12) {
        const sides: [boolean, number][] = [[oW, 0], [oE, 1], [oN, 2], [oS, 3]];
        for (const [open, sd] of sides) {
          if (!open) continue;
          const hs = hashBlock(x + sd * 31, y * 3 + sd, z - sd * 13);
          const runs = hs < 0.45 ? 2 : 1;
          for (let q = 0; q < runs; q++) {
          const u = q ? 0.15 + 0.3 * frac(hs * 2.9) : 0.55 + 0.3 * frac(hs * 5.3);
          const ax = sd === 0 ? pr.lx + 0.012 : sd === 1 ? pr.hx - 0.012 : x + u;
          const az = sd === 2 ? pr.lz + 0.012 : sd === 3 ? pr.hz - 0.012 : z + u;
          // a run keeps going down the molten brick below / off an open edge
          const by = oD ? pr.ly - m * 0.45 * frac(hs * 9.1 + q * 0.37) : belowMolten ? y - m * 0.55 * frac(hs * 4.3 + q * 0.61) : y + 0.05;
          pr.caps.push(ax, az, Math.min(pr.top, y + 1) - 0.1, by, 0.045 + 0.03 * m);
          }
        }
      }
    } else if (id) {
      // a cold brick only matters where molten plastic touches it (the
      // wetting fillet): touching a molten brick or a puddle on a face
      const d = def(id);
      if (d.solid && !d.fluid && !isPartialLego(id, d)) {
        let touch = false;
        for (let f = 0; f < 6 && !touch; f++) {
          const n = FACES[f].n, nx = x + n[0], ny = y + n[1], nz = z + n[2];
          const nid = ny < 0 || ny >= HEIGHT ? 0 : world.get(nx, ny, nz);
          touch = nid === ID.Melted || isMolten(nx, ny, nz, nid);
        }
        if (touch) pr = blankPrim(0, x, y, z, id);
      }
    }
    primCache.set(key, pr);
    return pr;
  }
  const smin = (a: number, b: number, k: number) => {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  };
  function primDist(p: Prim, px: number, py: number, pz: number) {
    if (p.k === 0) {
      const qx = Math.abs(px - (p.x + 0.5)) - 0.47, qy = Math.abs(py - (p.y + 0.5)) - 0.47, qz = Math.abs(pz - (p.z + 0.5)) - 0.47;
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0);
    }
    if (p.k === 2) {
      const dx = px - p.pcx, dz = pz - p.pcz;
      if (py > p.ly + 0.5 || Math.abs(dx) > 1.05 || Math.abs(dz) > 1.05) return 1;
      const th = Math.atan2(dz, dx);
      let R = p.R0 * (1 + 0.09 * Math.sin(2 * th + p.p1) + 0.06 * Math.sin(3 * th + p.p2) + 0.04 * Math.sin(5 * th + p.p3));
      if (p.cliff) {
        const c = Math.cos(th), sn = Math.sin(th);
        const lobe = (v: number) => (v > 0 ? v * v : 0);
        const w = Math.max(p.cliff & 1 ? lobe(c) : 0, p.cliff & 2 ? lobe(-c) : 0, p.cliff & 4 ? lobe(sn) : 0, p.cliff & 8 ? lobe(-sn) : 0);
        R *= 1 - 0.45 * w;
      }
      const rr = p.H * 0.5;
      const qx = Math.hypot(dx, dz) - R + rr, qy = Math.abs(py - (p.ly + rr)); // fully rounded edge = meniscus
      return withCaps(p, Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr, px, py, pz);
    }
    // far from this brick's reach (flare, drips into the cell below): it
    // cannot change the surface — skip the exact distance
    if (px < p.x - 0.45 || px > p.x + 1.45 || pz < p.z - 0.45 || pz > p.z + 1.45 || py > p.y + 1.25 || py < p.y - 1.05) return 1;
    const ox = px - (p.x + 0.5), oz = pz - (p.z + 0.5);
    const top = Math.max(p.ly + 0.06, p.top - p.tx * ox - p.tz * oz - p.ed * (ox * ox + oz * oz) * 4);
    const t = Math.min(1, Math.max(0, (py - p.y) / (0.3 + 0.35 * p.m)));
    const f = (1 - t) * (1 - t);
    const lx = p.lx - p.fW * f, hx = p.hx + p.fE * f, lz = p.lz - p.fN * f, hz = p.hz + p.fS * f;
    const r = Math.min(p.r, (top - p.ly) * 0.45);
    const qx = Math.abs(px - (lx + hx) * 0.5) - (hx - lx) * 0.5 + r;
    const qy = Math.abs(py - (p.ly + top) * 0.5) - (top - p.ly) * 0.5 + r;
    const qz = Math.abs(pz - (lz + hz) * 0.5) - (hz - lz) * 0.5 + r;
    let d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
    // SRN wobble: a soft uneven skin + vertical run-lines
    d += p.m * (0.026 * Math.sin(7.3 * px + 2.1 * py + 1.3) * Math.sin(6.7 * pz - 3.3 * py + 0.7) + 0.014 * Math.sin(19 * (0.8 * px + 0.6 * pz) + 2.5 * Math.sin(4.1 * py)));
    return withCaps(p, d, px, py, pz);
  }
  function withCaps(p: Prim, d: number, px: number, py: number, pz: number) {
    const c = p.caps;
    for (let i = 0; i < c.length; i += 5) {
      const ax = c[i], az = c[i + 1], ay = c[i + 2], by = c[i + 3], r0 = c[i + 4];
      if (Math.abs(px - ax) > r0 + 0.14 || Math.abs(pz - az) > r0 + 0.14 || py > ay + 0.14 || py < by - r0 - 0.14) continue;
      const yy = Math.min(ay, Math.max(by, py));
      const s = (yy - by) / (ay - by || 1);
      let dc = Math.hypot(px - ax, py - yy, pz - az) - r0 * (0.55 + 0.45 * s);
      dc = Math.min(dc, Math.hypot(px - ax, py - (by + r0 * 0.35), pz - az) - r0 * 1.05);
      d = smin(d, dc, 0.07);
    }
    return d;
  }
  /** distance to a molten prim's surface + the colour-marbling wobble */
  const mdist = (p: Prim, px: number, py: number, pz: number) =>
    primDist(p, px, py, pz) + 0.035 * Math.sin(9.1 * px + 5.3 * py + p.x * 1.7 + p.z * 2.3) * Math.sin(7.7 * pz - 4.1 * py + p.y * 1.3);
  const listCache = new Map<number, Prim[]>();
  function cellList(cx: number, cy: number, cz: number) {
    const key = pkey(cx, cy, cz);
    let l = listCache.get(key);
    if (!l) {
      l = [];
      for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const p = getPrim(cx + dx, cy + dy, cz + dz);
        if (p) l.push(p);
      }
      listCache.set(key, l);
    }
    return l;
  }
  function field(px: number, py: number, pz: number) {
    const l = cellList(Math.floor(px), Math.floor(py), Math.floor(pz));
    let dCold = 1e9, dMol = 1e9;
    for (let i = 0; i < l.length; i++) {
      const p = l[i];
      const d = primDist(p, px, py, pz);
      if (p.k === 0) { if (d < dCold) dCold = d; continue; }
      dMol = dMol > 1e8 ? d : smin(dMol, d, 0.12);
    }
    if (dMol > 1e8) return dCold;
    return smin(dMol, dCold, 0.06);
  }

  // Domain = melting bricks, puddles and the open cells around them (where
  // slumps, drips, streaks and pools reach). Local numeric keys.
  const domain = new Set<number>();
  function addSource(sx: number, sy: number, sz: number) {
    for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const x = sx + dx, y = sy + dy, z = sz + dz;
      const lx = x - x0, lz = z - z0;
      if (lx < 0 || lx >= CS || lz < 0 || lz >= CS || y < 0 || y >= HEIGHT) continue;
      const id = world.get(x, y, z);
      if (id === ID.Melted || openCell(id) || isMolten(x, y, z, id)) domain.add((y * CS + lz) * CS + lx);
    }
  }
  function contourMolten() {
    // One shared lattice for the whole chunk: every lattice point is
    // evaluated once (cells share their faces), normals come from central
    // differences ON the lattice (no extra field evaluations per vertex).
    const R = detail ? 5 : 3, inv = 1 / R;
    if (moltenCache.size > 3000) moltenCache.clear();
    // numeric melt-stage / heat-dir / puddle-source lookups for the signature
    const qmap = new Map<number, number>();
    for (const [k, e] of heatMap) {
      if (e.m <= 0) continue;
      const [qx, qy, qz] = k.split(",").map(Number);
      if (qx < x0 - 3 || qx > x0 + CS + 2 || qz < z0 - 3 || qz > z0 + CS + 2) continue;
      const [hx, , hz] = heatDirAt(qx, qy, qz);
      qmap.set(pkey(qx, qy, qz), 1 + Math.floor(e.m * MELT_STAGES) + 16 * (Math.round(hx * 4) + 4) + 256 * (Math.round(hz * 4) + 4));
    }
    for (const [k, src] of puddleSrc) {
      const [qx, qy, qz] = k.split(",").map(Number);
      if (qx < x0 - 3 || qx > x0 + CS + 2 || qz < z0 - 3 || qz > z0 + CS + 2) continue;
      qmap.set(pkey(qx, qy, qz), 100000 + src);
    }
    const cellSig = (x: number, y: number, z: number) => {
      let h = 2166136261 ^ R;
      // block ids over 5×5×5 (they shape the prims next door); melt stage /
      // heat dir only where a change can still reach this cell's vertices:
      // the 3×3×3 around it, plus the layer 2 above (drips hang 1 cell down)
      for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        const yy = y + dy;
        const id = yy < 0 || yy >= HEIGHT ? 0 : world.get(x + dx, yy, z + dz);
        h = Math.imul(h ^ id, 16777619);
        if (dx >= -1 && dx <= 1 && dz >= -1 && dz <= 1 && dy >= -1) h = Math.imul(h ^ (qmap.get(pkey(x + dx, yy, z + dz)) ?? 0), 16777619);
      }
      return h >>> 0;
    };
    let pend: { key: string; sig: number; p: number; u: number; t: number } | null = null;
    const flush = () => {
      if (!pend) return;
      moltenCache.set(pend.key, {
        sig: pend.sig,
        pos: molten.pos.slice(pend.p), nor: molten.nor.slice(pend.p), col: molten.col.slice(pend.p),
        uv: molten.uv.slice(pend.u), tan: molten.tan.slice(pend.t),
      });
      pend = null;
    };
    const lat = new Map<number, number>();
    const gkey = (gx: number, gy: number, gz: number) => ((gy + 16) * 2048 + (gx - x0 * R + 256)) * 2048 + (gz - z0 * R + 256);
    const S = (gx: number, gy: number, gz: number) => {
      const k = gkey(gx, gy, gz);
      let v = lat.get(k);
      if (v === undefined) {
        v = field(gx * inv, gy * inv, gz * inv);
        lat.set(k, v);
      }
      return v;
    };
    // vertex of a lattice sub-cube (min corner gx,gy,gz): mean of its edge
    // crossings; normal = gradient of the trilinear field there. Shared by
    // every quad of the chunk (global lattice key).
    const VP: number[] = [], VN: number[] = [], VC: number[] = [];
    const vmap = new Map<number, number>();
    const cv = [0, 0, 0, 0, 0, 0, 0, 0];
    const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    const netVert = (gx: number, gy: number, gz: number) => {
      const key = gkey(gx, gy, gz);
      const hit = vmap.get(key);
      if (hit !== undefined) return hit;
      for (let bit = 0; bit < 8; bit++) cv[bit] = S(gx + (bit & 1), gy + ((bit >> 1) & 1), gz + ((bit >> 2) & 1));
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (const [e0, e1] of EDGES) {
        const a = cv[e0], b = cv[e1];
        if (a < 0 === b < 0) continue;
        const t = a / (a - b);
        sx += (e0 & 1) + ((e1 & 1) - (e0 & 1)) * t;
        sy += ((e0 >> 1) & 1) + (((e1 >> 1) & 1) - ((e0 >> 1) & 1)) * t;
        sz += ((e0 >> 2) & 1) + (((e1 >> 2) & 1) - ((e0 >> 2) & 1)) * t;
        n++;
      }
      const fx = n ? sx / n : 0.5, fy = n ? sy / n : 0.5, fz = n ? sz / n : 0.5;
      // gradient of the trilinear interpolant
      const gxv = (1 - fy) * (1 - fz) * (cv[1] - cv[0]) + fy * (1 - fz) * (cv[3] - cv[2]) + (1 - fy) * fz * (cv[5] - cv[4]) + fy * fz * (cv[7] - cv[6]);
      const gyv = (1 - fx) * (1 - fz) * (cv[2] - cv[0]) + fx * (1 - fz) * (cv[3] - cv[1]) + (1 - fx) * fz * (cv[6] - cv[4]) + fx * fz * (cv[7] - cv[5]);
      const gzv = (1 - fx) * (1 - fy) * (cv[4] - cv[0]) + fx * (1 - fy) * (cv[5] - cv[1]) + (1 - fx) * fy * (cv[6] - cv[2]) + fx * fy * (cv[7] - cv[3]);
      const gl = Math.hypot(gxv, gyv, gzv) || 1;
      const px = (gx + fx) * inv, py = (gy + fy) * inv, pz = (gz + fz) * inv;
      // colour: the molten prims near the vertex and how close each one's own
      // surface is (+ a marbling wobble where two colours fused). The shader
      // draws the sharp border between two bricks from the signed distance
      // difference; the char amount is blended smoothly.
      const cp = charPatch(px, py, pz);
      const l = cellList(Math.floor(px), Math.floor(py), Math.floor(pz));
      let dmin = 1e9;
      const near: [Prim, number][] = [];
      for (let i = 0; i < l.length; i++) {
        const p = l[i];
        if (!p.k) continue;
        const d = mdist(p, px, py, pz);
        near.push([p, d]);
        if (d < dmin) dmin = d;
      }
      let ch = 0, wt = 0;
      for (let i = near.length - 1; i >= 0; i--) {
        const [p, d] = near[i];
        if (d > dmin + 0.2) { near.splice(i, 1); continue; }
        if (d > dmin + 0.09) continue;
        const w0 = 1 - (d - dmin) / 0.09;
        const w = w0 * w0;
        ch += (p.k === 2 ? 0.62 + 0.25 * cp : Math.min(1, p.m * 0.9 + (cp - 0.5) * 0.45 * p.m)) * w;
        wt += w;
      }
      const idx = VP.length / 3;
      VP.push(px, py, pz); VN.push(gxv / gl, gyv / gl, gzv / gl); VC.push(wt > 0 ? ch / wt : 0.5);
      VNear.push(near);
      vmap.set(key, idx);
      return idx;
    };
    const VNear: [Prim, number][][] = [];
    const dAt = (i: number, p: Prim) => {
      for (const [q, d] of VNear[i]) if (q === p) return d;
      return mdist(p, VP[i * 3], VP[i * 3 + 1], VP[i * 3 + 2]);
    };
    const tri = (a: number, b: number, c: number) => {
      // orient with the field gradient (outward)
      const ax = VP[a * 3], ay = VP[a * 3 + 1], az = VP[a * 3 + 2];
      const ux = VP[b * 3] - ax, uy = VP[b * 3 + 1] - ay, uz = VP[b * 3 + 2] - az;
      const wx = VP[c * 3] - ax, wy = VP[c * 3 + 1] - ay, wz = VP[c * 3 + 2] - az;
      const cx = uy * wz - uz * wy, cy = uz * wx - ux * wz, cz = ux * wy - uy * wx;
      if (cx * cx + cy * cy + cz * cz < 1e-14) return;
      const nx = VN[a * 3] + VN[b * 3] + VN[c * 3], ny = VN[a * 3 + 1] + VN[b * 3 + 1] + VN[c * 3 + 1], nz = VN[a * 3 + 2] + VN[b * 3 + 2] + VN[c * 3 + 2];
      const o1 = cx * nx + cy * ny + cz * nz < 0 ? c : b, o2 = o1 === b ? c : b;
      // the two bricks this triangle shows: lowest summed distance over its
      // corners (a triangle spans at most one colour border)
      let pA: Prim | null = null, pB: Prim | null = null, sA = 1e9, sB = 1e9;
      const na = VNear[a], nb = VNear[b], nc = VNear[c];
      if (na.length === 1 && nb.length === 1 && nc.length === 1 && na[0][0] === nb[0][0] && na[0][0] === nc[0][0]) {
        pA = na[0][0]; // inside one brick's colour: the common case
      } else {
        for (let w = 0; w < 3; w++) {
          const lst = w === 0 ? na : w === 1 ? nb : nc;
          for (let j = 0; j < lst.length; j++) {
            const p = lst[j][0];
            if (p === pA || p === pB) continue;
            const sc = dAt(a, p) + dAt(b, p) + dAt(c, p);
            if (sc < sA) { pB = pA; sB = sA; pA = p; sA = sc; }
            else if (sc < sB) { pB = p; sB = sc; }
          }
        }
      }
      const cA = pA ? brickLinear(pA.id) : [0.3, 0.3, 0.3];
      const cB = pB ? brickLinear(pB.id) : cA;
      for (let q = 0; q < 3; q++) {
        const i = q === 0 ? a : q === 1 ? o1 : o2;
        molten.pos.push(VP[i * 3], VP[i * 3 + 1], VP[i * 3 + 2]);
        molten.nor.push(VN[i * 3], VN[i * 3 + 1], VN[i * 3 + 2]);
        // molten vertex layout (read by game.ts moltenize): color = brick A,
        // tangent = (brick B, dB − dA), uv.x = char amount
        molten.col.push(cA[0], cA[1], cA[2]);
        molten.tan.push(cB[0], cB[1], cB[2], pA && pB ? dAt(i, pB) - dAt(i, pA) : 1);
        molten.uv.push(VC[i], 0);
      }
    };
    for (const key of domain) {
      flush();
      const lx = key % CS, lz = Math.floor(key / CS) % CS, y = Math.floor(key / (CS * CS));
      const x = x0 + lx, z = z0 + lz;
      const sig = cellSig(x, y, z);
      const ckey = x + "," + y + "," + z + "," + R;
      const hit = moltenCache.get(ckey);
      if (hit && hit.sig === sig) {
        appendAll(molten.pos, hit.pos); appendAll(molten.nor, hit.nor); appendAll(molten.col, hit.col);
        appendAll(molten.uv, hit.uv); appendAll(molten.tan, hit.tan);
        continue;
      }
      pend = { key: ckey, sig, p: molten.pos.length, u: molten.uv.length, t: molten.tan.length };
      // only cells that molten plastic can reach
      let any = false;
      for (const p of cellList(x, y, z)) if (p.k) { any = true; break; }
      if (!any) continue;
      const bx = x * R, by = y * R, bz = z * R;
      let neg = 0, pos = 0;
      for (let k = 0; k <= R; k++) for (let j = 0; j <= R; j++) for (let i = 0; i <= R; i++) {
        if (S(bx + i, by + k, bz + j) < 0) neg++; else pos++;
      }
      if (!neg || !pos) continue;
      // SURFACE NETS: one quad per lattice edge (owned by this cell) that
      // crosses the surface, joining the vertices of the 4 sub-cubes around it
      for (let k = 0; k < R; k++) for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
        const gx = bx + i, gy = by + k, gz = bz + j;
        const v0 = S(gx, gy, gz);
        for (let ax = 0; ax < 3; ax++) {
          const v1 = ax === 0 ? S(gx + 1, gy, gz) : ax === 1 ? S(gx, gy + 1, gz) : S(gx, gy, gz + 1);
          if (v0 < 0 === v1 < 0) continue;
          let a: number, b: number, c: number, d: number;
          if (ax === 0) { a = netVert(gx, gy, gz); b = netVert(gx, gy - 1, gz); c = netVert(gx, gy - 1, gz - 1); d = netVert(gx, gy, gz - 1); }
          else if (ax === 1) { a = netVert(gx, gy, gz); b = netVert(gx - 1, gy, gz); c = netVert(gx - 1, gy, gz - 1); d = netVert(gx, gy, gz - 1); }
          else { a = netVert(gx, gy, gz); b = netVert(gx - 1, gy, gz); c = netVert(gx - 1, gy - 1, gz); d = netVert(gx, gy - 1, gz); }
          // split along the shorter diagonal-free order; orientation fixed per triangle
          tri(a, b, c);
          tri(a, c, d);
        }
      }
    }
    flush();
  }

  // ---- v4.17 Teardown LEGO: a damaged block is meshed piece by piece —
  // only the 1×1 LEGO bricks still standing (2 × 2 × 3 grid), each face
  // culled against its neighbour piece (inside this block or in the
  // neighbouring block, damaged or not), a stud on every exposed top, and
  // the block's own tiles mapped across the pieces so the brick reads
  // continuous. Same opaque material: zero new draw calls.
  const pieceSolid = (wx: number, wy: number, wz: number, ix: number, iy: number, iz: number) => {
    const nid = world.get(wx, wy, wz);
    if (!occ(nid)) return false;
    let rm = removedAt(wx, wy, wz, nid);
    if (meltActive && meltAt(wx, wy, wz) > 0) return false;
    return !rm || !(rm & (1 << pieceIndex(ix, iy, iz)));
  };
  const PIECE_FACES = [
    { n: [1, 0, 0], fi: 0 }, { n: [-1, 0, 0], fi: 1 }, { n: [0, 1, 0], fi: 2 },
    { n: [0, -1, 0], fi: 3 }, { n: [0, 0, 1], fi: 4 }, { n: [0, 0, -1], fi: 5 },
  ] as const;
  const pieceVerts = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  function emitChippedBlock(x: number, y: number, z: number, id: number, removed: number, jit: number, tint: readonly number[]) {
    const H3 = 1 / 3;
    const studMask = [0, 0, 0];
    for (let p = 0; p < 12; p++) {
      if (removed & (1 << p)) continue;
      const ix = p & 1, iz = (p >> 1) & 1, iy = p >> 2;
      const ox = ix * 0.5, oy = iy * H3, oz = iz * 0.5;
      for (const pf of PIECE_FACES) {
        const [nx, ny, nz] = pf.n;
        // neighbour piece (same block or across the block boundary)
        let jx = ix + nx, jy = iy + ny, jz = iz + nz, bx = x, by = y, bz = z;
        if (jx < 0) { jx = 1; bx--; } else if (jx > 1) { jx = 0; bx++; }
        if (jz < 0) { jz = 1; bz--; } else if (jz > 1) { jz = 0; bz++; }
        if (jy < 0) { jy = 2; by--; } else if (jy > 2) { jy = 0; by++; }
        if (bx === x && by === y && bz === z) {
          if (!(removed & (1 << pieceIndex(jx, jy, jz)))) continue;
        } else if (pieceSolid(bx, by, bz, jx, jy, jz)) continue;
        if (ny > 0) studMask[iy] |= 1 << (ix + 2 * iz);
        const fv = FACES[pf.fi].v;
        const tile = faceTile(id, ny > 0 ? 0 : ny < 0 ? 2 : 1);
        for (let vi = 0; vi < 4; vi++) {
          const v = fv[vi];
          pieceVerts[vi][0] = x + ox + v[0] * 0.5;
          pieceVerts[vi][1] = y + oy + v[1] * H3;
          pieceVerts[vi][2] = z + oz + v[2] * 0.5;
        }
        // map the tile across the block: this piece shows ITS part of the brick
        const [u0, v0, u1, v1] = uvs(tile);
        const fu = (a: number) => u0 + (u1 - u0) * a, fvv = (b: number) => v0 + (v1 - v0) * b;
        const before = opaque.uv.length;
        pushQuad(opaque, pieceVerts, pf.n as unknown as number[], tile, undefined, tint);
        // re-map the 6 UVs just written to the piece's sub-rectangle
        for (let k = before; k < opaque.uv.length; k += 2) {
          const vi = (k - before) / 2;
          const P = opaque.pos.length / 3 - 6 + vi;
          const px = opaque.pos[P * 3] - x, py = opaque.pos[P * 3 + 1] - y, pz = opaque.pos[P * 3 + 2] - z;
          const a = nx !== 0 ? (nx > 0 ? 1 - pz : pz) : ny !== 0 ? px : nz > 0 ? px : 1 - px;
          const b = ny !== 0 ? (ny > 0 ? 1 - pz : pz) : py;
          opaque.uv[k] = fu(Math.min(1, Math.max(0, a)));
          opaque.uv[k + 1] = fvv(Math.min(1, Math.max(0, b)));
        }
      }
    }
    if (fancy) {
      const top = faceTile(id, 0);
      for (let iy = 0; iy < 3; iy++) if (studMask[iy]) addStud(opaque, x, y, z, top, jit, 1 - (iy + 1) * H3, 1, studMask[iy]);
    }
  }

  for (let lz = 0; lz < CS; lz++) {
    for (let lx = 0; lx < CS; lx++) {
      for (let y = 0; y < HEIGHT; y++) {
        const x = x0 + lx;
        const z = z0 + lz;
        const id = world.get(x, y, z);
        if (id === 0) {
          // v4.16 tufts: derived decoration in the air cell above a grass
          // block — two crossed blade quads sitting BETWEEN the studs (the
          // studs stand at the quarter points; the tuft hugs the center).
          if (hasTuftAt(world, x, y, z)) {
            const j = tuftJitter(x, z);
            const tile = faceTile(ID.TallGrass, 3);
            const cx = x + 0.5 + (j - 0.5) * 0.14;
            const cz = z + 0.5 + (tuftJitter(z, x) - 0.5) * 0.14;
            const r = 0.19 + j * 0.06;
            const y0 = y + 0.02;
            const y1 = y + 0.34 + j * 0.22;
            pushQuad(plant, [[cx - r, y0, cz - r], [cx + r, y0, cz + r], [cx + r, y1, cz + r], [cx - r, y1, cz - r]], [0, 0, 1], tile);
            pushQuad(plant, [[cx + r, y0, cz - r], [cx - r, y0, cz + r], [cx - r, y1, cz + r], [cx + r, y1, cz - r]], [0, 0, 1], tile);
          }
          continue;
        }
        if (id === ID.Fire) continue; // v4.15: flames are shader instances (game.ts), not world geometry
        if (id === ID.Campfire) emitters.push(fkey(x, y, z));
        else if (id === ID.Lava && world.get(x, y + 1, z) === 0) emitters.push(fkey(x, y, z));
        const self = def(id);
        if (
          self.torch ||
          self.door ||
          self.ladder ||
          self.dust ||
          self.lever ||
          self.gate ||
          self.plate ||
          self.rail ||
          self.cactus ||
          self.fruit ||
          self.slab ||
          self.stairs ||
          self.sign ||
          self.flat ||
          id === ID.Anvil ||
          id === ID.Grindstone ||
          id === ID.Brew ||
          id === ID.Campfire ||
          id === ID.Bed ||
          id === ID.Fence ||
          id === ID.EndCrystal ||
          id === ID.Hopper ||
          id === ID.Melted
        ) {
          const tile = faceTile(id, 1);
          const top = faceTile(id, 0);
          const bot = faceTile(id, 2);
          if (id === ID.Melted) {
            // v4.17: a puddle is part of the molten field (contoured below)
            addSource(x, y, z);
          } else if (self.slab) {
            addBoxT(opaque, x, y, z, x + 1, y + 0.5, z + 1, tile, top, bot);
            if (fancy) addStud(opaque, x, y - 0.5, z, top);
          } else if (self.stairs) {
            addBoxT(opaque, x, y, z, x + 1, y + 0.5, z + 1, tile, top, bot);
            // High half on the def's dir side (0=-z, 1=+x, 2=+z, 3=-x).
            if (self.dir === 0) addBoxT(opaque, x, y + 0.5, z, x + 1, y + 1, z + 0.5, tile, top, tile);
            else if (self.dir === 1) addBoxT(opaque, x + 0.5, y + 0.5, z, x + 1, y + 1, z + 1, tile, top, tile);
            else if (self.dir === 2) addBoxT(opaque, x, y + 0.5, z + 0.5, x + 1, y + 1, z + 1, tile, top, tile);
            else addBoxT(opaque, x, y + 0.5, z, x + 0.5, y + 1, z + 1, tile, top, tile);
          } else if (id === ID.Anvil || id === ID.Grindstone) {
            // Multi-part 3D LEGO Anvil: stepped base plate + narrow waist pillar + heavy horned anvil top with studs
            addBoxT(opaque, x + 0.14, y, z + 0.18, x + 0.86, y + 0.22, z + 0.82, tile, top, bot);
            addBoxT(opaque, x + 0.28, y + 0.22, z + 0.30, x + 0.72, y + 0.54, z + 0.70, tile, top, bot);
            addBoxT(opaque, x + 0.08, y + 0.54, z + 0.18, x + 0.92, y + 0.96, z + 0.82, tile, top, bot);
            if (fancy) addStud(opaque, x, y - 0.04, z, top);
          } else if (id === ID.Brew) {
            // 3D LEGO Brewing Stand: cobblestone 2x2 base plate + central blaze rod + 3 LEGO potion bottles
            addBoxT(opaque, x + 0.08, y, z + 0.08, x + 0.92, y + 0.20, z + 0.92, tile, top, bot);
            addBox(opaque, x + 0.44, y + 0.20, z + 0.44, x + 0.56, y + 0.92, z + 0.56, faceTile(ID.Gold, 0));
            addBox(opaque, x + 0.16, y + 0.20, z + 0.20, x + 0.36, y + 0.54, z + 0.40, faceTile(ID.Red, 0));
            addBox(opaque, x + 0.64, y + 0.20, z + 0.20, x + 0.84, y + 0.54, z + 0.40, faceTile(ID.Azure, 0));
            addBox(opaque, x + 0.40, y + 0.20, z + 0.64, x + 0.60, y + 0.54, z + 0.84, faceTile(ID.Orange, 0));
            if (fancy) addStud(opaque, x, y - 0.80, z, top);
          } else if (id === ID.Campfire) {
            // 3D LEGO Campfire: 4 crossed reddish-brown LEGO logs + glowing ember base + stepped LEGO flame plumes
            const logTile = faceTile(ID.Log, 1);
            const flameTile = faceTile(ID.Lava, 0);
            addBox(opaque, x + 0.10, y, z + 0.18, x + 0.90, y + 0.18, z + 0.36, logTile);
            addBox(opaque, x + 0.10, y, z + 0.64, x + 0.90, y + 0.18, z + 0.82, logTile);
            addBox(opaque, x + 0.18, y + 0.12, z + 0.10, x + 0.36, y + 0.30, z + 0.90, logTile);
            addBox(opaque, x + 0.64, y + 0.12, z + 0.10, x + 0.82, y + 0.30, z + 0.90, logTile);
            addBox(opaque, x + 0.32, y + 0.06, z + 0.32, x + 0.68, y + 0.48, z + 0.68, top);
            addBox(opaque, x + 0.38, y + 0.48, z + 0.38, x + 0.62, y + 0.78, z + 0.62, flameTile);
            addBox(opaque, x + 0.43, y + 0.78, z + 0.43, x + 0.57, y + 0.96, z + 0.57, top);
          } else if (id === ID.Bed) {
            // 3D LEGO Bed: 4 wooden corner feet + oak frame + red LEGO mattress + white LEGO pillow brick + studs
            const woodTile = faceTile(ID.Planks, 1);
            const pilTile = faceTile(ID.White, 0);
            addBox(opaque, x + 0.04, y, z + 0.04, x + 0.20, y + 0.18, z + 0.20, woodTile);
            addBox(opaque, x + 0.80, y, z + 0.04, x + 0.96, y + 0.18, z + 0.20, woodTile);
            addBox(opaque, x + 0.04, y, z + 0.80, x + 0.20, y + 0.18, z + 0.96, woodTile);
            addBox(opaque, x + 0.80, y, z + 0.80, x + 0.96, y + 0.18, z + 0.96, woodTile);
            addBox(opaque, x + 0.04, y + 0.18, z + 0.04, x + 0.96, y + 0.32, z + 0.96, woodTile);
            addBoxT(opaque, x + 0.04, y + 0.32, z + 0.04, x + 0.96, y + 0.56, z + 0.96, top, top, bot);
            addBox(opaque, x + 0.08, y + 0.56, z + 0.08, x + 0.92, y + 0.68, z + 0.38, pilTile);
            if (fancy) addStud(opaque, x, y - 0.44, z, top);
          } else if (id === ID.EndCrystal) {
            // v4.16: a floating crystal, not a pink cube — three stacked
            // shrinking boxes read as a voxel gem; it hovers over its cell.
            addBoxT(opaque, x + 0.3, y + 0.12, z + 0.3, x + 0.7, y + 0.34, z + 0.7, tile, top, bot);
            addBoxT(opaque, x + 0.22, y + 0.34, z + 0.22, x + 0.78, y + 0.68, z + 0.78, tile, top, bot);
            addBoxT(opaque, x + 0.36, y + 0.68, z + 0.36, x + 0.64, y + 0.94, z + 0.64, tile, top, bot);
          } else if (id === ID.Hopper) {
            // v4.16: a hopper's funnel silhouette — wide mouth, narrow neck.
            addBoxT(opaque, x + 0.04, y + 0.55, z + 0.04, x + 0.96, y + 1.0, z + 0.96, tile, top, bot);
            addBoxT(opaque, x + 0.18, y + 0.3, z + 0.18, x + 0.82, y + 0.55, z + 0.82, tile, top, bot);
            addBoxT(opaque, x + 0.34, y, z + 0.34, x + 0.66, y + 0.3, z + 0.66, tile, top, bot);
          } else if (id === ID.Fence) {
            // 3D LEGO Fence: central post + connecting rails to adjacent solid/fence blocks
            addBoxT(opaque, x + 0.34, y, z + 0.34, x + 0.66, y + 1.0, z + 0.66, tile, top, bot);
            const conn = (nx: number, nz: number) => {
              const nid = world.get(x + nx, y, z + nz);
              return nid === ID.Fence || nid === ID.Gate || nid === ID.GateOpen || occludes(nid) === 1;
            };
            if (conn(1, 0)) {
              addBox(opaque, x + 0.66, y + 0.28, z + 0.42, x + 1.0, y + 0.44, z + 0.58, tile);
              addBox(opaque, x + 0.66, y + 0.68, z + 0.42, x + 1.0, y + 0.84, z + 0.58, tile);
            }
            if (conn(-1, 0)) {
              addBox(opaque, x, y + 0.28, z + 0.42, x + 0.34, y + 0.44, z + 0.58, tile);
              addBox(opaque, x, y + 0.68, z + 0.42, x + 0.34, y + 0.84, z + 0.58, tile);
            }
            if (conn(0, 1)) {
              addBox(opaque, x + 0.42, y + 0.28, z + 0.66, x + 0.58, y + 0.44, z + 1.0, tile);
              addBox(opaque, x + 0.42, y + 0.68, z + 0.66, x + 0.58, y + 0.84, z + 1.0, tile);
            }
            if (conn(0, -1)) {
              addBox(opaque, x + 0.42, y + 0.28, z, x + 0.58, y + 0.44, z + 0.34, tile);
              addBox(opaque, x + 0.42, y + 0.68, z, x + 0.58, y + 0.84, z + 0.34, tile);
            }
          } else if (self.sign) {
            addBox(opaque, x + 0.44, y, z + 0.44, x + 0.56, y + 0.55, z + 0.56, tile);
            addBox(opaque, x + 0.06, y + 0.5, z + 0.4, x + 0.94, y + 0.98, z + 0.54, tile);
          } else if (self.flat) {
            // A framed panel hung mid-cell: thin, double-faced, walk-through.
            addBox(opaque, x + 0.07, y + 0.07, z + 0.44, x + 0.93, y + 0.93, z + 0.56, tile);
          } else if (self.torch) {
            if (id === ID.Lantern) {
              // 3D LEGO Lantern: iron base plate + glowing yellow lamp body + top hood + hanging loop
              const ironT = faceTile(ID.Anvil, 1);
              addBox(opaque, x + 0.30, y, z + 0.30, x + 0.70, y + 0.12, z + 0.70, ironT);
              addBox(opaque, x + 0.33, y + 0.12, z + 0.33, x + 0.67, y + 0.56, z + 0.67, top);
              addBox(opaque, x + 0.28, y + 0.56, z + 0.28, x + 0.72, y + 0.68, z + 0.72, ironT);
              addBox(opaque, x + 0.42, y + 0.68, z + 0.42, x + 0.58, y + 0.82, z + 0.58, ironT);
            } else {
              // 3D LEGO Torch: brown handle bar + collar + glowing stepped LEGO flame plume
              addBox(opaque, x + 0.43, y, z + 0.43, x + 0.57, y + 0.50, z + 0.57, tile);
              addBox(opaque, x + 0.39, y + 0.46, z + 0.39, x + 0.61, y + 0.56, z + 0.61, bot);
              addBox(opaque, x + 0.36, y + 0.56, z + 0.36, x + 0.64, y + 0.76, z + 0.64, top);
              addBox(opaque, x + 0.41, y + 0.76, z + 0.41, x + 0.59, y + 0.90, z + 0.59, top);
            }
          } else if (self.door || self.gate) {
            if (self.solid) addBox(opaque, x + 0.06, y, z, x + 0.94, y + 0.98, z + 0.16, tile);
            else addBox(opaque, x, y, z + 0.06, x + 0.16, y + 0.98, z + 0.94, tile);
          } else if (self.fruit) {
            // v4.16: sculpted fruit — a lobed body, not a colored cube
            // (Philippe's law: a pumpkin must look like a pumpkin). Core box
            // inset on all sides, four proud vertical ribs at the face
            // centers and four corner posts carve the lobed silhouette; the
            // melon reuses the skeleton with dark-tinted ribs for its
            // stripes. Bent brown stem on top; no studs — fruit, not brick.
            const ribTint: readonly number[] | undefined = id === ID.Melon ? [0.55, 0.72, 0.55] : undefined;
            addBoxT(opaque, x + 0.07, y + 0.03, z + 0.07, x + 0.93, y + 0.95, z + 0.93, tile, top, bot);
            const rib = (u0: number, w0: number, u1: number, w1: number) =>
              addBoxT(opaque, x + u0, y + 0.05, z + w0, x + u1, y + 0.93, z + w1, tile, top, bot, ribTint);
            rib(0.36, 0.0, 0.64, 0.09); rib(0.36, 0.91, 0.64, 1.0); rib(0.0, 0.36, 0.09, 0.64); rib(0.91, 0.36, 1.0, 0.64);
            rib(0.03, 0.03, 0.17, 0.17); rib(0.83, 0.03, 0.97, 0.17); rib(0.03, 0.83, 0.17, 0.97); rib(0.83, 0.83, 0.97, 0.97);
            const stemT = faceTile(ID.Log, 0);
            addBox(opaque, x + 0.43, y + 0.95, z + 0.43, x + 0.57, y + 1.1, z + 0.57, stemT);
            addBox(opaque, x + 0.47, y + 1.08, z + 0.43, x + 0.67, y + 1.17, z + 0.57, stemT);
          } else if (self.ladder) {
            // v4.16: the classic LEGO ladder as a real 3D piece — two side
            // rails and ROUND rungs (Philippe's law: a ladder is a sculpted
            // piece, never a flat decal). It leans on its first solid
            // neighbour; free-standing keeps the historic south face.
            const wood = faceTile(ID.Log, 1);
            let fx = 0, fz = 1;
            if (def(world.get(x, y, z - 1)).solid) { fx = 0; fz = 1; }
            else if (def(world.get(x, y, z + 1)).solid) { fx = 0; fz = -1; }
            else if (def(world.get(x - 1, y, z)).solid) { fx = 1; fz = 0; }
            else if (def(world.get(x + 1, y, z)).solid) { fx = -1; fz = 0; }
            // Local frame: u along the wall, v up, w out from the wall.
            // 90° rotations keep every box axis-aligned in world space, so
            // mapping both corners and taking min/max is exact.
            const P = (u: number, v: number, w: number): [number, number, number] => {
              if (fz === 1) return [x + u, y + v, z + w];
              if (fz === -1) return [x + 1 - u, y + v, z + 1 - w];
              if (fx === 1) return [x + w, y + v, z + u];
              return [x + 1 - w, y + v, z + 1 - u];
            };
            const lbox = (u0: number, v0: number, w0: number, u1: number, v1: number, w1: number) => {
              const a = P(u0, v0, w0), b = P(u1, v1, w1);
              addBox(opaque, Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2]), wood);
            };
            lbox(0.09, 0, 0.03, 0.2, 1, 0.15); // left rail
            lbox(0.8, 0, 0.03, 0.91, 1, 0.15); // right rail
            for (const rv of [0.14, 0.32, 0.5, 0.68, 0.86]) {
              const a = P(0.14, rv, 0.09), b = P(0.86, rv, 0.09);
              addTube(opaque, a[0], a[1], a[2], b[0], b[1], b[2], 0.042, wood);
            }
          } else if (self.dust) {
            addBox(opaque, x + 0.1, y, z + 0.1, x + 0.9, y + 0.1, z + 0.9, top);
          } else if (self.lever) {
            addBox(opaque, x + 0.42, y, z + 0.42, x + 0.58, y + 0.16, z + 0.58, tile);
            if (id === ID.LeverOn) addBox(opaque, x + 0.2, y + 0.12, z + 0.44, x + 0.8, y + 0.24, z + 0.56, top);
            else addBox(opaque, x + 0.44, y + 0.12, z + 0.44, x + 0.56, y + 0.48, z + 0.56, top);
          } else if (self.plate) {
            addBox(opaque, x + 0.05, y, z + 0.05, x + 0.95, y + (id === ID.PlateOn ? 0.04 : 0.1), z + 0.95, top);
          } else if (self.rail) {
            addBox(opaque, x + 0.05, y, z + 0.3, x + 0.95, y + 0.08, z + 0.4, tile);
            addBox(opaque, x + 0.05, y, z + 0.6, x + 0.95, y + 0.08, z + 0.7, tile);
          } else if (self.cactus) {
            // 3D LEGO Saguaro Cactus:
            // 1. Central fluted LEGO column (full height y..y+1 so stacked segments interlock seamlessly)
            addBoxT(opaque, x + 0.18, y, z + 0.18, x + 0.82, y + 1.0, z + 0.82, tile, top, bot);
            // 2. Four vertical 3D fluted LEGO rib plates on cardinal sides (+X, -X, +Z, -Z)
            addBoxT(opaque, x + 0.82, y + 0.02, z + 0.28, x + 0.88, y + 0.98, z + 0.44, tile, top, bot);
            addBoxT(opaque, x + 0.82, y + 0.02, z + 0.56, x + 0.88, y + 0.98, z + 0.72, tile, top, bot);
            addBoxT(opaque, x + 0.12, y + 0.02, z + 0.28, x + 0.18, y + 0.98, z + 0.44, tile, top, bot);
            addBoxT(opaque, x + 0.12, y + 0.02, z + 0.56, x + 0.18, y + 0.98, z + 0.72, tile, top, bot);
            addBoxT(opaque, x + 0.28, y + 0.02, z + 0.82, x + 0.44, y + 0.98, z + 0.88, tile, top, bot);
            addBoxT(opaque, x + 0.56, y + 0.02, z + 0.82, x + 0.72, y + 0.98, z + 0.88, tile, top, bot);
            addBoxT(opaque, x + 0.28, y + 0.02, z + 0.12, x + 0.44, y + 0.98, z + 0.18, tile, top, bot);
            addBoxT(opaque, x + 0.56, y + 0.02, z + 0.12, x + 0.72, y + 0.98, z + 0.18, tile, top, bot);
            // 3. Protruding 3D cream-white LEGO spines jutting out from the corners in silhouette
            const spineT = faceTile(ID.Sand, 0);
            for (const sy of [0.24, 0.70]) {
              addBox(opaque, x + 0.09, y + sy, z + 0.14, x + 0.18, y + sy + 0.06, z + 0.20, spineT);
              addBox(opaque, x + 0.82, y + sy, z + 0.14, x + 0.91, y + sy + 0.06, z + 0.20, spineT);
              addBox(opaque, x + 0.09, y + sy, z + 0.80, x + 0.18, y + sy + 0.06, z + 0.86, spineT);
              addBox(opaque, x + 0.82, y + sy, z + 0.80, x + 0.91, y + sy + 0.06, z + 0.86, spineT);
            }
            // 4. L-shaped 3D LEGO Saguaro Side Arms on upper/middle segments when adjacent space is clear
            const hasBelow = world.get(x, y - 1, z) === ID.Cactus;
            const hasAbove = world.get(x, y + 1, z) === ID.Cactus;
            const ch = hashBlock(x, y, z);
            if (hasBelow) {
              // Left/Right (+X / -X) LEGO Saguaro arms
              if (ch < 0.68 && world.get(x + 1, y, z) === ID.Air) {
                // Horizontal connector brick + vertical upward LEGO arm + top stud
                addBoxT(opaque, x + 0.82, y + 0.24, z + 0.36, x + 1.18, y + 0.46, z + 0.64, tile, top, bot);
                addBoxT(opaque, x + 0.96, y + 0.46, z + 0.36, x + 1.22, y + 0.92, z + 0.64, tile, top, bot);
                addBox(opaque, x + 1.01, y + 0.92, z + 0.41, x + 1.17, y + 1.01, z + 0.59, top);
              }
              if (ch > 0.28 && ch < 0.88 && world.get(x - 1, y, z) === ID.Air) {
                const ay = ch > 0.58 ? 0.14 : 0.34;
                addBoxT(opaque, x - 0.18, y + ay, z + 0.36, x + 0.18, y + ay + 0.22, z + 0.64, tile, top, bot);
                addBoxT(opaque, x - 0.22, y + ay + 0.22, z + 0.36, x + 0.04, y + ay + 0.66, z + 0.64, tile, top, bot);
                addBox(opaque, x - 0.17, y + ay + 0.66, z + 0.41, x - 0.01, y + ay + 0.75, z + 0.59, top);
              }
              if (ch >= 0.68 && world.get(x, y, z + 1) === ID.Air) {
                addBoxT(opaque, x + 0.36, y + 0.22, z + 0.82, x + 0.64, y + 0.44, z + 1.18, tile, top, bot);
                addBoxT(opaque, x + 0.36, y + 0.44, z + 0.96, x + 0.64, y + 0.90, z + 1.22, tile, top, bot);
                addBox(opaque, x + 0.41, y + 0.90, z + 1.01, x + 0.59, y + 0.99, z + 1.17, top);
              }
            }
            // 5. Top 2x2 cylindrical LEGO studs & Desert Cactus Flower Crown on the top segment
            if (!hasAbove) {
              if (fancy) addStud(opaque, x, y, z, top);
              if (hasBelow && ch < 0.62) {
                const flowerT = faceTile(ch < 0.32 ? ID.Pink : ID.Yellow, 0);
                const centerT = faceTile(ID.Orange, 0);
                addBox(opaque, x + 0.36, y + 1.0, z + 0.36, x + 0.64, y + 1.10, z + 0.64, flowerT);
                addBox(opaque, x + 0.42, y + 1.10, z + 0.42, x + 0.58, y + 1.19, z + 0.58, centerT);
              }
            }
          }
          continue;
        }
        if (self.plant) {
          const tile = faceTile(id, 3);
          const y0 = y + 0.02;
          const y1 = y + (self.crop ? (id === ID.CropRipe ? 0.88 : 0.4) : 0.92);
          pushQuad(
            plant,
            [
              [x + 0.18, y0, z + 0.18],
              [x + 0.82, y0, z + 0.82],
              [x + 0.82, y1, z + 0.82],
              [x + 0.18, y1, z + 0.18],
            ],
            [0, 0, 1],
            tile,
          );
          pushQuad(
            plant,
            [
              [x + 0.82, y0, z + 0.18],
              [x + 0.18, y0, z + 0.82],
              [x + 0.18, y1, z + 0.82],
              [x + 0.82, y1, z + 0.18],
            ],
            [0, 0, 1],
            tile,
          );
          continue;
        }

        // Compute per-brick ABS batch color variation once per block instead of 6 times per block
        const h0 = hashBlock(x, y, z);
        const jit = 0.96 + h0 * 0.07;
        scratchTint[0] = 0.986 + ((h0 * 17.3) % 1) * 0.028;
        scratchTint[1] = 1;
        scratchTint[2] = 0.986 + ((h0 * 43.7) % 1) * 0.028;

        // v4.17 Teardown LEGO: a damaged full block is meshed piece by piece.
        if (chipMap.size && self.solid && !self.fluid && !self.glass) {
          const rm = removedAt(x, y, z, id);
          if (rm && rm !== FULL) {
            emitChippedBlock(x, y, z, id, rm, jit, scratchTint);
            continue;
          }
        }
        // v4.17 melt: a melting brick is part of the molten field (contoured
        // below); only its studs stay real geometry while they still stand.
        if (isMolten(x, y, z, id)) {
          addSource(x, y, z);
          const p = getPrim(x, y, z);
          if (fancy && p && p.m < 0.4 && p.top < y + 1.01) {
            const sink = (y + 1 - p.top) + p.ed * 0.46 + Math.hypot(p.tx, p.tz) * 0.34;
            addStud(opaque, x, y, z, faceTile(id, 0), jit, sink, 1 - p.m * 2.4);
          }
          continue;
        }
        for (let fi = 0; fi < 6; fi++) {
          const face = FACES[fi];
          const nx = face.n[0];
          const ny = face.n[1];
          const nz = face.n[2];
          const nid = world.get(x + nx, y + ny, z + nz);
          const n = def(nid);
          if (self.fluid) {
            if (nid === id) continue;
            if (n.solid && !n.glass) continue;
          } else if (self.glass) {
            if (nid === id) continue;
          } else if (n.solid && !n.glass && !isPartialLego(nid, n) && !deformsAt(x + nx, y + ny, z + nz, nid)) {
            continue;
          }

          const surf = self.fluid ? water : self.glass ? glass : opaque;
          const tile = faceTile(id, ny > 0 ? 0 : ny < 0 ? 2 : 1);
          const pull = self.glass ? 0.012 : 0;
          const fv = face.v;
          for (let vi = 0; vi < 4; vi++) {
            const v = fv[vi];
            const sv = scratchVerts[vi];
            sv[0] = x + v[0] - nx * pull;
            sv[1] = y + v[1] - ny * pull;
            sv[2] = z + v[2] - nz * pull;
            scratchShade[vi] = shadeAt(x, y, z, nx, ny, nz, v[0], v[1], v[2]) * jit;
          }
          pushQuad(surf, scratchVerts, face.n, tile, scratchShade, scratchTint);
          if (fancy && ny > 0 && !self.fluid && self.solid && !n.plant && nid !== ID.Melted) addStud(surf, x, y, z, faceTile(id, 0), jit);
        }
      }
    }
  }

  // ---- v4.17 molten field: contour the domain (surface nets).
  if (meltActive) {
    for (const [k, e] of heatMap) {
      if (e.m <= 0) continue;
      const [sx, sy, sz] = k.split(",").map(Number);
      if (sx < x0 - 1 || sx > x0 + CS || sz < z0 - 1 || sz > z0 + CS) continue;
      if (isMolten(sx, sy, sz, world.get(sx, sy, sz))) addSource(sx, sy, sz);
    }
    for (const k of puddleSrc.keys()) {
      const [sx, sy, sz] = k.split(",").map(Number);
      if (sx < x0 - 1 || sx > x0 + CS || sz < z0 - 1 || sz > z0 + CS) continue;
      if (world.get(sx, sy, sz) === ID.Melted) addSource(sx, sy, sz);
    }
  }
  if (domain.size) contourMolten();

  return { opaque, glass, water, plant, molten, emitters };
}
