import { ATLAS_COLS, ATLAS_ROWS, ID, def, faceTile } from "./blocks";
import { fkey, heatMap, meltAt, puddleSrc } from "./fireState";
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

// v4.16.1 FUSION: how far the block at (bx,by,bz) SETTLES because its
// support liquefied — the drop of the top surface of whatever is below
// it. A puddle's surface sits ~0.19 above the bottom of the melted
// stack; a melting block's top drops by its own sink plus its slump.
// This is what stops blocks hovering over empty holes (Philippe: a
// burning wall melts as ONE mass, nothing floats over a void).
function sinkOf(world: World, bx: number, by: number, bz: number): number {
  const belowId = world.get(bx, by - 1, bz);
  if (belowId === ID.Melted) {
    let d = 1;
    while (d < 4 && world.get(bx, by - 1 - d, bz) === ID.Melted) d++;
    return d - 0.24;
  }
  if (!def(belowId).solid) return 0; // floating over air/fluid: no contact, no settle
  // Solid support: this block settles by the drop of the support's top
  // surface = the support's own sink + its slump. Walk the solid chain
  // down (bounded: 6 cells — deeper pure-sink chains do not occur, a
  // burning column melts bottom-up) and fold the drops back up. The
  // first version recursed unconditionally and descended forever under
  // ordinary solid ground — that froze world loading (qa81b BOOT
  // FAILED); this iterative form always terminates.
  let drop = 0;
  const chain: number[] = [];
  let cy = by - 1;
  while (chain.length < 6) {
    const idc = world.get(bx, cy, bz);
    if (idc === ID.Melted) {
      let d = 1;
      while (d < 4 && world.get(bx, cy - d, bz) === ID.Melted) d++;
      drop = d - 0.24;
      break;
    }
    if (!def(idc).solid) { drop = 0; break; }
    chain.push(cy);
    cy--;
  }
  for (let i = chain.length - 1; i >= 0; i--) {
    drop = Math.min(2.5, drop + 0.78 * meltAt(bx, chain[i], bz));
  }
  return drop;
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

function addStud(s: Surface, x: number, y: number, z: number, tile: number, jit = 1, sink = 0, flat = 1) {
  const y0 = y + 1.001 - sink;
  const y1 = y0 + STUD_H * flat;
  const [u0, v0, u1, v1] = uvs(tile);
  const cu = (u0 + u1) * 0.5;
  const cv = (v0 + v1) * 0.5;
  const baseShade = 0.82 * jit;
  const topShade = 1.02 * jit;
  for (let sIdx = 0; sIdx < 4; sIdx++) {
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
            const hBase = 0.08 + ph * 0.05;
            // v4.16.1 FUSION (Philippe's law — no stacked plates, no
            // voids): a puddle with puddles BELOW it is the same pool,
            // not a separate plate floating in its own cell — the whole
            // sheet drops onto the pool beneath (0.8 per melted level).
            let pudSink = 0;
            while (pudSink < 3 && world.get(x, y - 1 - pudSink, z) === ID.Melted) pudSink++;
            const py = y - pudSink * 0.8;
            addBoxT(opaque, x - 0.14 + ox, py, z - 0.14 + oz, x + 1.14 + ox, py + hBase, z + 1.14 + oz, pSide, pTop, pSide, PUDDLE_CHAR);
            addBoxT(opaque, x - 0.03 - ox, py + hBase, z - 0.03 - oz, x + 1.03 - ox, py + hBase + 0.05, z + 1.03 - oz, pSide, pTop, pSide, PUDDLE_CHAR);
            addBoxT(opaque, x + 0.1 + oz, py + hBase + 0.05, z + 0.2 - ox, x + 0.84 + oz, py + hBase + 0.1, z + 0.88 - ox, pSide, pTop, pSide, PUDDLE_CHAR);
            // FUSION, horizontal: neighbouring puddles are ONE pool —
            // a bridge sheet crosses each shared boundary at this
            // cell's sheet height (the neighbour draws its own from its
            // side; the tiny height delta reads as liquid thickness,
            // never as a seam or a gap between two pools).
            const hBridge = hBase + 0.05;
            if (world.get(x + 1, y, z) === ID.Melted) addBoxT(opaque, x + 0.45, py, z + 0.22 + oz, x + 1.55, py + hBridge, z + 0.78 + oz, pSide, pTop, pSide, PUDDLE_CHAR);
            if (world.get(x - 1, y, z) === ID.Melted) addBoxT(opaque, x - 0.55, py, z + 0.22 + oz, x + 0.55, py + hBridge, z + 0.78 + oz, pSide, pTop, pSide, PUDDLE_CHAR);
            if (world.get(x, y, z + 1) === ID.Melted) addBoxT(opaque, x + 0.22 + ox, py, z + 0.45, x + 0.78 + ox, py + hBridge, z + 1.55, pSide, pTop, pSide, PUDDLE_CHAR);
            if (world.get(x, y, z - 1) === ID.Melted) addBoxT(opaque, x + 0.22 + ox, py, z - 0.55, x + 0.78 + ox, py + hBridge, z + 0.45, pSide, pTop, pSide, PUDDLE_CHAR);
            // Satellites + drip tongue live only on the pool's outer
            // perimeter (ground layer, toward a non-puddle cell) —
            // inside a merged pool they would read as separate plates.
            if (pudSink === 0) {
              // A detached splat droplet beside the pool — liquid throws
              // satellites; perfect rectangles read as plates, splats don't.
              if (world.get(ph > 0.5 ? x + 1 : x - 1, y, z) !== ID.Melted) {
                const sx = x + (ph > 0.5 ? 1.22 : -0.3) + ox, sz = z + ((ph * 3.1) % 1) * 0.5 + oz;
                addBoxT(opaque, sx, y, sz, sx + 0.24, y + 0.045, sz + 0.2, pSide, pTop, pSide, PUDDLE_CHAR);
              }
              const dir = Math.floor(ph * 4) % 4;
              const tongueCell = dir === 0 ? world.get(x, y, z - 1) : dir === 1 ? world.get(x + 1, y, z) : dir === 2 ? world.get(x, y, z + 1) : world.get(x - 1, y, z);
              if (tongueCell !== ID.Melted) {
                if (dir === 0) addBoxT(opaque, x + 0.3, y, z - 0.48, x + 0.7, y + 0.045, z + 0.1, pSide, pTop, pSide, PUDDLE_CHAR);
                else if (dir === 1) addBoxT(opaque, x + 0.9, y, z + 0.3, x + 1.48, y + 0.045, z + 0.7, pSide, pTop, pSide, PUDDLE_CHAR);
                else if (dir === 2) addBoxT(opaque, x + 0.3, y, z + 0.9, x + 0.7, y + 0.045, z + 1.48, pSide, pTop, pSide, PUDDLE_CHAR);
                else addBoxT(opaque, x - 0.48, y, z + 0.3, x + 0.1, y + 0.045, z + 0.7, pSide, pTop, pSide, PUDDLE_CHAR);
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

        // v4.15 melt: sparse lookup (free when nothing melts). CHAR tint
        // (Philippe's law: melting plastic BLACKENS, ultra realistic, and
        // stays fully OPAQUE — never a fade): a gentle warm pre-darken,
        // then a smoothstep char curve that takes the block to warm
        // charcoal-black as the melt completes.
        const melt = heatMap.size ? meltAt(x, y, z) : 0;
        const sag = melt * 0.78;
        // v4.16.1 FUSION (Philippe's law): melt is a property of the
        // MASS, not of the single block. sinkSelf = this block settling
        // because its support liquefied (persists after the fire is out
        // — puddles are permanent). The corner drops are computed from
        // the cells SHARING each vertical edge, identically for every
        // block touching that edge: watertight slump, neighbours fuse
        // into one continuous mass, no V-notches, no voids.
        const sinkSelf = heatMap.size || puddleSrc.size ? sinkOf(world, x, y, z) : 0;
        const fused = melt > 0 || sinkSelf > 0;
        let cTop: number[] | null = null, cBot: number[] | null = null, cShared: boolean[] | null = null, cDrip: number[] | null = null;
        if (fused) {
          cTop = [0, 0, 0, 0]; cBot = [0, 0, 0, 0]; cShared = [false, false, false, false]; cDrip = [0, 0, 0, 0];
          for (let ci = 0; ci < 4; ci++) {
            const cx = ci & 1, cz = (ci >> 1) & 1;
            let tSum = 0, bSum = 0, dSum = 0, mSum = 0, n = 0, sh = false;
            for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
              const px = x + cx - 1 + i, pz = z + cz - 1 + j;
              const pm = meltAt(px, y, pz);
              const psk = sinkOf(world, px, y, pz);
              if (pm > 0 || psk > 0) {
                // Top drop = sink + linear slump + a pm^2 ROUNDING term:
                // the shoulders of a melting block curl down faster
                // than its centre — real molten plastic rounds over,
                // it does not stay a flat slanted slab.
                tSum += psk + 0.78 * pm + 0.16 * pm * pm;
                bSum += psk; mSum += pm; n++;
                if (px !== x || pz !== z) sh = true;
                // DRIP: past ~30% melt, plastic runs DOWN an exposed
                // face — but only where it can actually flow (the cell
                // below this participant is a puddle, itself melting,
                // or open air).
                if (pm > 0.3) {
                  const bp = world.get(px, y - 1, pz);
                  if (bp === ID.Melted || meltAt(px, y - 1, pz) > 0.2 || !def(bp).solid) dSum += Math.min(0.38, (pm - 0.3) * 0.55);
                }
              }
            }
            if (n) {
              // Organic unevenness: hashed from the CORNER's own
              // coordinates, so every block sharing this edge computes
              // the identical surface — lumpy like real melt, still
              // watertight between neighbours.
              cTop[ci] = tSum / n + (hashBlock(x + cx, y, z + cz) - 0.5) * 0.07 * (mSum / n);
              cBot[ci] = bSum / n; cShared[ci] = sh; cDrip[ci] = dSum / n;
            }
          }
        }
        if (melt > 0) {
          // Char blends across the cluster: a block beside a fully
          // molten neighbour blackens toward it — no per-block tint
          // steps across a fusing wall.
          const nMax = Math.max(meltAt(x + 1, y, z), meltAt(x - 1, y, z), meltAt(x, y, z + 1), meltAt(x, y, z - 1), meltAt(x, y - 1, z));
          const mTint = Math.max(melt, 0.65 * nMax);
          const dk = 1 - mTint * 0.3;
          const ch = mTint * mTint * (3 - 2 * mTint);
          scratchTint[0] *= dk * (1 - ch * 0.94);
          scratchTint[1] *= dk * (1 - ch * 0.96);
          scratchTint[2] *= dk * (1 - ch * 0.97);
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
          } else if (n.solid && !n.glass && !isPartialLego(nid, n)) {
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
            if (fused && v[1] === 1) {
              // FUSION slump (v4.16.1): the top drops by the CORNER
              // value — every block sharing this vertical edge computes
              // the identical drop, so neighbours slump INTO each other
              // as one continuous mass (no V-notch, no seam). Shoulders
              // pull in less where the corner is shared with another
              // melting/settling block: the mass stays wide where it
              // fuses, narrow only at free edges.
              const ci = (v[0] ? 1 : 0) + (v[2] ? 2 : 0);
              sv[1] -= cTop![ci];
              const pa = melt * 0.3 * (cShared![ci] ? 0.35 : 1);
              sv[0] += (0.5 - v[0]) * pa;
              sv[2] += (0.5 - v[2]) * pa;
            } else if (fused && v[1] === 0) {
              // The base follows the corner sink: when the support
              // below has liquefied, the block settles INTO the melt —
              // no floating slab, no empty hole beneath it. Side faces
              // keep the foot bulge (plastic spreading at the base).
              const ci = (v[0] ? 1 : 0) + (v[2] ? 2 : 0);
              sv[1] -= cBot![ci];
              if (ny === 0 && melt > 0) {
                sv[0] += nx * melt * 0.13;
                sv[2] += nz * melt * 0.13;
                // Viscous run: the bottom edge of the face stretches
                // DOWN toward the melt below — plastic sheeting over
                // the edge, not a clean cube bottom.
                sv[1] -= cDrip![ci];
              }
            }
            scratchShade[vi] = shadeAt(x, y, z, nx, ny, nz, v[0], v[1], v[2]) * jit;
          }
          // Molten finish (Philippe: "plus réaliste, comme du vrai
          // plastique fondu"): the top goes GLOSSY early and strong —
          // a wet sheen — while the sides darken a touch. Wet molten
          // plastic reads darker + shinier, never matte, never faded.
          const ft = ny > 0 ? (melt > 0.25 ? 1 + (melt - 0.25) * 0.45 : 1) : ny === 0 && melt > 0 ? 1 - melt * 0.13 : 1;
          if (ft !== 1) { scratchTint[0] *= ft; scratchTint[1] *= ft; scratchTint[2] *= ft; }
          pushQuad(surf, scratchVerts, face.n, tile, scratchShade, scratchTint);
          if (ft !== 1) { scratchTint[0] /= ft; scratchTint[1] /= ft; scratchTint[2] /= ft; }
          if (fancy && ny > 0 && !self.fluid && self.solid && !n.plant && melt < 0.7) addStud(surf, x, y, z, faceTile(id, 0), jit, sinkSelf + sag + 0.16 * melt * melt, 1 - melt * 0.9);
        }
      }
    }
  }

  return { opaque, glass, water, plant, emitters };
}
