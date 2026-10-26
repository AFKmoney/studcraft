import { ATLAS_COLS, ATLAS_ROWS, ID, def, faceTile } from "./blocks";
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
const STUD_N = 10;
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
function addBoxT(s: Surface, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, side: number, top: number, bottom: number) {
  pushQuad(s, [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], side);
  pushQuad(s, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], side);
  pushQuad(s, [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], top);
  pushQuad(s, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], bottom);
  pushQuad(s, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], side);
  pushQuad(s, [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], side);
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

function addStud(s: Surface, x: number, y: number, z: number, tile: number, jit = 1) {
  const y0 = y + 1.001;
  const y1 = y0 + STUD_H;
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
      id === ID.Anvil ||
      id === ID.Grindstone ||
      id === ID.Brew ||
      id === ID.Campfire ||
      id === ID.Bed ||
      id === ID.Fence
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
        if (id === 0) continue;
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
          self.slab ||
          self.stairs ||
          self.sign ||
          self.flat ||
          id === ID.Anvil ||
          id === ID.Grindstone ||
          id === ID.Brew ||
          id === ID.Campfire ||
          id === ID.Bed ||
          id === ID.Fence
        ) {
          const tile = faceTile(id, 1);
          const top = faceTile(id, 0);
          const bot = faceTile(id, 2);
          if (self.slab) {
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
          } else if (self.ladder) {
            pushQuad(opaque, [[x, y, z + 0.08], [x + 1, y, z + 0.08], [x + 1, y + 1, z + 0.08], [x, y + 1, z + 0.08]], [0, 0, 1], tile);
            pushQuad(opaque, [[x + 1, y, z + 0.08], [x, y, z + 0.08], [x, y + 1, z + 0.08], [x + 1, y + 1, z + 0.08]], [0, 0, -1], tile);
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
            scratchShade[vi] = shadeAt(x, y, z, nx, ny, nz, v[0], v[1], v[2]) * jit;
          }
          pushQuad(surf, scratchVerts, face.n, tile, scratchShade, scratchTint);
          if (fancy && ny > 0 && !self.fluid && self.solid && !n.plant) addStud(surf, x, y, z, faceTile(id, 0), jit);
        }
      }
    }
  }

  return { opaque, glass, water, plant };
}
