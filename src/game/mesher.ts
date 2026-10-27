import { ATLAS_COLS, ATLAS_ROWS, ID, def, faceTile } from "./blocks";
import { fkey, heatDirAt, heatMap, meltAt, meltOrder, puddleSrc } from "./fireState";
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

// Charred tint for a finished melt puddle: burnt plastic ends as a near-
// black warm charcoal pool, only a whisper of the original hue surviving.
const PUDDLE_CHAR: readonly number[] = [0.05, 0.04, 0.035];
// v4.16.1 pass 2: the thin cooling rim of a pool stays scorched brown with a
// trace of the source colour (multiplied by the brick's own texel).
const PUDDLE_RIM: readonly number[] = [0.12, 0.075, 0.045];

// ---------------------------------------------------------------------------
// v4.16.1 realism pass 2 (Claude) — MOLTEN SURFACE.
// Everything that is actually liquid plastic (a block past MOLTEN_MIN melt,
// and every Melted puddle) is meshed into its own `molten` surface: smooth
// per-vertex normals over subdivided faces, rendered by a seamless glossy
// material (game.ts) — no sub-brick seams, no stud texture, real specular
// and env reflections that follow the curvature. Zero idle cost: when
// nothing melts the surface is empty and no mesh is created. All of it is
// computed at meshing time; the per-frame cost is only the triangles of
// geometry that already existed.
// ---------------------------------------------------------------------------

// UV of a tile's centre: molten plastic samples ONE texel of its source
// block's top tile (between the studs = the brick's plain colour), so the
// atlas detail (seams, studs, bevel) never prints onto the liquid.
function tileCentreUV(tile: number): [number, number] {
  const c = tile % ATLAS_COLS;
  const r = Math.floor(tile / ATLAS_COLS);
  return [(c + 0.5) / ATLAS_COLS, 1 - (r + 0.5) / ATLAS_ROWS];
}

// Quad with PER-VERTEX normals (smooth shading) and a single UV point.
function pushQuadN(s: Surface, v: number[][], nrm: number[][], uv: readonly number[], shade: readonly number[], tints: readonly (readonly number[])[]) {
  const order = shade[0] + shade[2] < shade[1] + shade[3] ? QUAD_ORDER_1 : QUAD_ORDER_0;
  const tx = v[1][0] - v[0][0], ty = v[1][1] - v[0][1], tz = v[1][2] - v[0][2];
  const inv = 1 / (Math.hypot(tx, ty, tz) || 1);
  for (let k = 0; k < 6; k++) {
    const i = order[k];
    const vi = v[i], ni = nrm[i];
    s.pos.push(vi[0], vi[1], vi[2]);
    s.nor.push(ni[0], ni[1], ni[2]);
    s.uv.push(uv[0], uv[1]);
    const c = shade[i];
    const tint = tints[i];
    s.col.push(c * tint[0], c * tint[1], c * tint[2]);
    s.tan.push(tx * inv, ty * inv, tz * inv, 1);
  }
}

function norm3(a: number[]) {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  a[0] /= l; a[1] /= l; a[2] /= l;
  return a;
}

// v4.16.1 pass 2 — burnt plastic colour. Real burning ABS does not darken
// as one flat tint: it goes from its colour through a scorched brown to
// glossy black char, in irregular patches, hottest (darkest) low down where
// the fire licks. `charAmt` = local char 0..1 → colour multiplier applied
// on top of the brick's base tint. The patch noise is a smooth function of
// WORLD position, so the pattern runs continuously across fused neighbours.
const SCORCH = [0.42, 0.26, 0.15];
function charPatch(px: number, py: number, pz: number) {
  return 0.5 + 0.5 * Math.sin(px * 7.3 + pz * 3.1 + py * 5.7) * Math.sin(pz * 6.1 - px * 2.3 + py * 4.1);
}
function charTint(base: readonly number[], c: number): number[] {
  const k = Math.max(0, Math.min(1, c));
  const brown = Math.max(0, 1 - Math.abs(k - 0.45) / 0.35) * 0.65; // scorched-brown band mid-way
  const blk = k * k * (3 - 2 * k);
  const dk = 1 - k * 0.3;
  const out = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const col = base[i] * (1 - brown) + base[i] * SCORCH[i] * 1.6 * brown;
    out[i] = col * dk * (1 - blk * (0.94 + i * 0.015));
  }
  return out;
}

// Radial profile of a molten pool (rho 0 = centre, 1 = rim): a thick viscous
// body that rolls over a rounded meniscus edge and feathers onto the ground.
const BLOB_RHO = [0, 0.38, 0.68, 0.86, 0.96, 1.04];
const BLOB_H = [1, 0.97, 0.87, 0.64, 0.3, 0.02];

// A smooth molten blob: centre (cx, cz), base y, rim radius R(theta), peak
// thickness H. Smooth normals from the radial slope. Top-facing only (it
// always sits on a surface). K = angular segments.
function emitBlob(s: Surface, cx: number, baseY: number, cz: number, R: (t: number) => number, H: number, K: number, uv: readonly number[], tint: readonly number[], rim: readonly number[] = tint) {
  const rings = BLOB_RHO.length;
  const P: number[][][] = [];
  const N: number[][][] = [];
  for (let k = 0; k <= K; k++) {
    const th = (k / K) * Math.PI * 2;
    const c = Math.cos(th), sn = Math.sin(th);
    const rad = R(th);
    const pr: number[][] = [], nr: number[][] = [];
    for (let r = 0; r < rings; r++) {
      const rho = BLOB_RHO[r];
      pr.push([cx + c * rad * rho, baseY + H * BLOB_H[r], cz + sn * rad * rho]);
      // radial slope dy/dr from the neighbouring rings
      const r0 = Math.max(0, r - 1), r1 = Math.min(rings - 1, r + 1);
      const dy = H * (BLOB_H[r1] - BLOB_H[r0]);
      const dr = rad * (BLOB_RHO[r1] - BLOB_RHO[r0]) || 1;
      const sl = dy / dr;
      nr.push(norm3([-sl * c, 1, -sl * sn]));
    }
    P.push(pr); N.push(nr);
  }
  const shade = [1, 1, 1, 1];
  // charred black body, the thin rim cooler: a scorched-brown edge
  const ringTint = BLOB_RHO.map((rho) => {
    const w = Math.max(0, Math.min(1, (rho - 0.9) / 0.14)); // a thin cooling edge only
    return [tint[0] + (rim[0] - tint[0]) * w, tint[1] + (rim[1] - tint[1]) * w, tint[2] + (rim[2] - tint[2]) * w];
  });
  for (let k = 0; k < K; k++) {
    for (let r = 0; r < rings - 1; r++) {
      // clockwise in (x, z) seen from above = front face (see FACES top)
      pushQuadN(s, [P[k + 1][r], P[k + 1][r + 1], P[k][r + 1], P[k][r]], [N[k + 1][r], N[k + 1][r + 1], N[k][r + 1], N[k][r]], uv, shade, [ringTint[r], ringTint[r + 1], ringTint[r + 1], ringTint[r]]);
    }
  }
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

  // ---- v4.17 MELT = TEARDOWN LEGO (Claude, Philippe 12:01: « si je fais un
  // trou dans le mur avec du feu, ça doit avoir l'air d'un trou dans du
  // plastique fondu — pas des coussins, comme du vrai plastique qui fond »).
  // A heated block melts PIECE BY PIECE (its 12 LEGO pieces), the pieces
  // facing the flames first (fireState.meltOrder over the heat direction):
  // melted pieces are GONE — the fire eats a hole — the pieces on the rim of
  // the hole are molten (rounded, glossy, charred, dripping), the rest of the
  // block stays a brick. The liquid runs down and pools at the bottom of the
  // hole. Neighbouring rims overlap into one molten edge.
  /** [gone, rim] piece masks of a melting block (chips included in gone). */
  function meltMasks(x: number, y: number, z: number, id: number): [number, number] {
    const m = meltAt(x, y, z);
    if (m <= 0) return [removedAt(x, y, z, id), 0];
    const [dx, dy, dz] = heatDirAt(x, y, z);
    const order = meltOrder(dx, dy, dz);
    const k = Math.min(12, Math.floor(m * 12 + 1e-6));
    let gone = removedAt(x, y, z, id);
    for (let i = 0; i < k; i++) gone |= 1 << order[i];
    let rim = 0;
    if (k < 12) rim |= (1 << order[k]) & ~gone; // the piece melting right now
    for (let p = 0; p < 12; p++) {
      if (gone & (1 << p)) continue;
      const ix = p & 1, iz = (p >> 1) & 1, iy = p >> 2;
      const nb = [pieceIndex(1 - ix, iy, iz), pieceIndex(ix, iy, 1 - iz)];
      if (iy > 0) nb.push(pieceIndex(ix, iy - 1, iz));
      if (iy < 2) nb.push(pieceIndex(ix, iy + 1, iz));
      for (const q of nb) if (gone & (1 << q)) { rim |= 1 << p; break; }
    }
    return [gone & FULL, rim & FULL];
  }
  // Rounded box from a subdivided cube (cube-to-rounded-box projection):
  // flat faces, rounded edges and corners of radius r, smooth normals.
  function emitRoundBox(s: Surface, cx: number, cy: number, cz: number, hx: number, hy: number, hz: number, r: number, uv: readonly number[], tintAt: (p: number[]) => number[]) {
    const N = detail ? 3 : 2;
    const ex = Math.max(0, hx - r), ey = Math.max(0, hy - r), ez = Math.max(0, hz - r);
    const shade = [1, 1, 1, 1];
    for (let fi = 0; fi < 6; fi++) {
      const V = FACES[fi].v, fn = FACES[fi].n;
      const P: number[][][] = [], Nn: number[][][] = [];
      for (let i = 0; i <= N; i++) {
        const pr: number[][] = [], nr: number[][] = [];
        for (let j = 0; j <= N; j++) {
          const sp = i / N, tp = j / N;
          const w0 = (1 - sp) * (1 - tp), w1 = sp * (1 - tp), w2 = sp * tp, w3 = (1 - sp) * tp;
          const lx = (2 * (w0 * V[0][0] + w1 * V[1][0] + w2 * V[2][0] + w3 * V[3][0]) - 1) * hx;
          const ly = (2 * (w0 * V[0][1] + w1 * V[1][1] + w2 * V[2][1] + w3 * V[3][1]) - 1) * hy;
          const lz = (2 * (w0 * V[0][2] + w1 * V[1][2] + w2 * V[2][2] + w3 * V[3][2]) - 1) * hz;
          const kx = Math.max(-ex, Math.min(ex, lx)), ky = Math.max(-ey, Math.min(ey, ly)), kz = Math.max(-ez, Math.min(ez, lz));
          let nx = lx - kx, ny = ly - ky, nz = lz - kz;
          const nl = Math.hypot(nx, ny, nz);
          if (nl > 1e-6) { nx /= nl; ny /= nl; nz /= nl; } else { nx = fn[0]; ny = fn[1]; nz = fn[2]; }
          pr.push([cx + kx + nx * r, cy + ky + ny * r, cz + kz + nz * r]);
          nr.push([nx, ny, nz]);
        }
        P.push(pr); Nn.push(nr);
      }
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const q = [P[i][j], P[i + 1][j], P[i + 1][j + 1], P[i][j + 1]];
        pushQuadN(s, q, [Nn[i][j], Nn[i + 1][j], Nn[i + 1][j + 1], Nn[i][j + 1]], uv, shade, q.map(tintAt));
      }
    }
  }
  function emitMeltHole(x: number, y: number, z: number, id: number, melt: number, jit: number, base: number[], h0: number) {
    const [gone, rim] = meltMasks(x, y, z, id);
    // the bricks still standing: heat-scorched, normal LEGO pieces
    const scorch = charTint(base, 0.2 * melt);
    if ((gone | rim) !== FULL) emitChippedBlock(x, y, z, id, gone | rim, jit, scorch);
    const uv = tileCentreUV(faceTile(id, 0));
    const mChar = Math.min(1, 0.4 + melt * 0.7);
    const tintAt = (p: number[]) => charTint(base, mChar + (charPatch(p[0], p[1], p[2]) - 0.5) * 0.55 * mChar);
    const H3 = 1 / 3;
    for (let p = 0; p < 12; p++) {
      if (!(rim & (1 << p))) continue;
      const ix = p & 1, iz = (p >> 1) & 1, iy = p >> 2;
      const hp = hashBlock(x * 13 + p, y * 7 - p, z * 11 + p * 3);
      // molten rim piece: rounded, a touch swollen so neighbouring rim pieces
      // overlap into ONE continuous molten edge, sagging a little
      const cx = x + ix * 0.5 + 0.25, cz = z + iz * 0.5 + 0.25;
      const cy = y + (iy + 0.5) * H3 - 0.05 * melt;
      const hy = H3 * 0.5 * (1.02 - 0.12 * melt);
      emitRoundBox(molten, cx, cy, cz, 0.27, hy, 0.27, Math.min(0.15, hy * 0.95), uv, tintAt);
      // drips hang where the plastic can run: under a rim piece with nothing
      // below it (a melted piece, or open air under the block)
      const belowOpen = iy > 0 ? !!(gone & (1 << pieceIndex(ix, iy - 1, iz))) : !occ(world.get(x, y - 1, z));
      if (belowOpen && melt > 0.2) {
        const L = (0.1 + 0.42 * melt) * (0.55 + 0.9 * hp);
        const dx = cx + (hp - 0.5) * 0.18, dz = cz + (((hp * 7.7) % 1) - 0.5) * 0.18;
        const top = cy - hy + 0.04;
        emitRoundBox(molten, dx, top - L * 0.5, dz, 0.055, L * 0.5, 0.055, 0.05, uv, tintAt);
        emitRoundBox(molten, dx, top - L, dz, 0.075, 0.07, 0.075, 0.068, uv, tintAt); // the bead at the tip
      }
    }
    // the liquid pools at the bottom of the hole (on solid ground)
    let goneLow = 0;
    for (let p = 0; p < 4; p++) if (gone & (1 << p)) goneLow++;
    if (goneLow && occ(world.get(x, y - 1, z))) {
      const rA = 0.3 + 0.45 * melt * (goneLow / 4) + 0.1;
      const hA = h0 * 6.283;
      emitBlob(molten, x + 0.5, y, z + 0.5, (th) => rA * (1 + 0.12 * Math.sin(2 * th + hA) + 0.06 * Math.sin(5 * th + hA * 1.7)), 0.03 + 0.06 * melt, detail ? 14 : 8, uv, charTint(base, Math.min(1, mChar + 0.15)), charTint(base, mChar * 0.85));
    }
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
    if (meltActive && meltAt(wx, wy, wz) > 0) { const [g, r] = meltMasks(wx, wy, wz, nid); rm |= g | r; }
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
            // v4.15: glossy puddle of the block that melted — two low slabs
            // carrying the SOURCE block's tiles (fireState.puddleSrc).
            const src = puddleSrc.get(fkey(x, y, z)) ?? ID.Melted;
            // Liquid, NOT a plate (Philippe's verdict on the first version:
            // the studded TOP tile made it read as a flat LEGO plate). The
            // puddle wears the SMOOTH side tile on every face — glossy
            // molten plastic has no studs.
            const pTop = faceTile(src, 1);
            const pSide = faceTile(src, 1);
            // v4.15 rework (Philippe: "que ça se liquéfie pis que ça
            // s'étende"): the puddle OVERFLOWS its cell — a wide irregular
            // glossy sheet, hash-shifted so no two puddles align, plus a
            // thin drip tongue that ran off one side.
            const ph = hashBlock(x, y, z);
            const ox = (ph - 0.5) * 0.12, oz = ((ph * 7.3) % 1 - 0.5) * 0.12;
            // v4.16.1 FUSION (Philippe's law — no stacked plates, no
            // voids): a puddle with puddles BELOW it is the same pool,
            // not a separate plate floating in its own cell — the whole
            // sheet drops onto the pool beneath (0.8 per melted level).
            let pudSink = 0;
            while (pudSink < 3 && world.get(x, y - 1 - pudSink, z) === ID.Melted) pudSink++;
            const py = y - pudSink * 0.8;
            // v4.16.1 realism pass 2 (Claude): the pool is a smooth
            // viscous BLOB, not stacked boxes — organic rim (3 hashed
            // harmonics), thick rounded body, meniscus edge feathering
            // onto the ground, smooth normals for a real wet highlight.
            // FUSION, horizontal: toward each Melted neighbour the rim
            // swells past the shared boundary, so neighbouring blobs
            // overlap into ONE continuous pool (no bridges, no seams).
            void pTop; void pSide;
            const uv = tileCentreUV(faceTile(src, 0));
            const nE = world.get(x + 1, y, z) === ID.Melted, nW = world.get(x - 1, y, z) === ID.Melted;
            const nS = world.get(x, y, z + 1) === ID.Melted, nN = world.get(x, y, z - 1) === ID.Melted;
            const p1 = ph * 6.283, p2 = ((ph * 13.7) % 1) * 6.283, p3 = ((ph * 29.3) % 1) * 6.283;
            const lobe = (th: number, a: number) => { const c = Math.cos(th - a); return c > 0 ? c * c * c * c : 0; };
            const R = (th: number) =>
              0.7 + 0.08 * Math.sin(2 * th + p1) + 0.05 * Math.sin(3 * th + p2) + 0.03 * Math.sin(5 * th + p3) +
              (nE ? 0.42 * lobe(th, 0) : 0) + (nS ? 0.42 * lobe(th, Math.PI / 2) : 0) +
              (nW ? 0.42 * lobe(th, Math.PI) : 0) + (nN ? 0.42 * lobe(th, -Math.PI / 2) : 0);
            const K = detail ? 18 : 10;
            emitBlob(molten, x + 0.5 + ox, py, z + 0.5 + oz, R, 0.12 + ph * 0.06, K, uv, PUDDLE_CHAR, PUDDLE_RIM);
            // Satellites + drip tongue live only on the pool's outer
            // perimeter (ground layer, toward a non-puddle cell) —
            // inside a merged pool they would read as separate plates.
            if (pudSink === 0) {
              // A detached splat droplet beside the pool — liquid throws
              // satellites.
              if (!(ph > 0.5 ? nE : nW)) {
                const sx = x + (ph > 0.5 ? 1.28 : -0.28) + ox, sz = z + 0.25 + ((ph * 3.1) % 1) * 0.5 + oz;
                const r0 = 0.1 + ((ph * 5.9) % 1) * 0.06;
                emitBlob(molten, sx, y, sz, (th) => r0 * (1 + 0.18 * Math.sin(3 * th + p2)), 0.045, 8, uv, PUDDLE_CHAR);
              }
              // A tongue that ran off one side: an elongated blob
              // reaching out from the rim.
              const dir = Math.floor(ph * 4) % 4;
              const open = dir === 0 ? !nN : dir === 1 ? !nE : dir === 2 ? !nS : !nW;
              if (open) {
                const a = dir === 0 ? -Math.PI / 2 : dir === 1 ? 0 : dir === 2 ? Math.PI / 2 : Math.PI;
                const tx = x + 0.5 + ox + Math.cos(a) * 0.62, tz = z + 0.5 + oz + Math.sin(a) * 0.62;
                emitBlob(molten, tx, y, tz, (th) => 0.14 + 0.3 * lobe(th, a) * (1 + 0.15 * Math.sin(th * 4 + p3)), 0.055, 12, uv, PUDDLE_CHAR);
              }
            }
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
        // v4.17 melt = Teardown LEGO: a heated block is meshed piece by piece
        // (hole + molten rim + drips + pool) — see emitMeltHole.
        const melt = heatMap.size ? meltAt(x, y, z) : 0;
        if (melt > 0 && self.solid && !self.fluid && !self.glass) {
          emitMeltHole(x, y, z, id, melt, jit, scratchTint, h0);
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
          if (fancy && ny > 0 && !self.fluid && self.solid && !n.plant) addStud(surf, x, y, z, faceTile(id, 0), jit);
        }
      }
    }
  }

  return { opaque, glass, water, plant, molten, emitters };
}
