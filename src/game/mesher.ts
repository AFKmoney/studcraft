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

function pushQuad(s: Surface, v: number[][], n: number[], tile: number, shade?: number[]) {
  const [u0, v0, u1, v1] = uvs(tile);
  const uv = [
    [u0, v0],
    [u1, v0],
    [u1, v1],
    [u0, v1],
  ];
  const ao = shade ?? [1, 1, 1, 1];
  const flip = ao[0] + ao[2] < ao[1] + ao[3];
  const order = flip ? [1, 2, 3, 1, 3, 0] : [0, 1, 2, 0, 2, 3];
  const tx = v[1][0] - v[0][0];
  const ty = v[1][1] - v[0][1];
  const tz = v[1][2] - v[0][2];
  const tl = Math.hypot(tx, ty, tz) || 1;
  for (const i of order) {
    s.pos.push(v[i][0], v[i][1], v[i][2]);
    s.nor.push(n[0], n[1], n[2]);
    s.uv.push(uv[i][0], uv[i][1]);
    const c = ao[i];
    s.col.push(c, c, c);
    s.tan.push(tx / tl, ty / tl, tz / tl, 1);
  }
}

function pushPoly(s: Surface, verts: number[][], normals: number[][], cu: number, cv: number) {
  const order = verts.length === 3 ? [0, 1, 2] : [0, 1, 2, 0, 2, 3];
  for (const i of order) {
    const p = verts[i];
    const n = normals[i];
    s.pos.push(p[0], p[1], p[2]);
    s.nor.push(n[0], n[1], n[2]);
    s.uv.push(cu, cv);
    s.col.push(1, 1, 1);
    s.tan.push(1, 0, 0, 1);
  }
}

// LDraw stud.dat on a 1×1 brick: pitch 20 LDU, stud Ø12 LDU (r=6), height 4 LDU.
export const STUD_R = 6 / 20;
export const STUD_H = 4 / 20;
const STUD_N = 16;
const STUD_TOP_R = STUD_R * 0.9;
const STUD_BEVEL = STUD_H * 0.22;
const STUD_COS: number[] = [];
const STUD_SIN: number[] = [];
for (let i = 0; i < STUD_N; i++) {
  const a = (i / STUD_N) * Math.PI * 2;
  STUD_COS.push(Math.cos(a));
  STUD_SIN.push(Math.sin(a));
}

function addBox(s: Surface, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile: number) {
  pushQuad(s, [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], tile);
  pushQuad(s, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], tile);
  pushQuad(s, [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], tile);
  pushQuad(s, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], tile);
  pushQuad(s, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], tile);
  pushQuad(s, [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], tile);
}

function addStud(s: Surface, x: number, y: number, z: number, tile: number) {
  const cx = x + 0.5;
  const cz = z + 0.5;
  const y0 = y + 1.004;
  const yb = y0 + STUD_H - STUD_BEVEL;
  const y1 = y0 + STUD_H;
  const [u0, v0, u1, v1] = uvs(tile);
  const cu = (u0 + u1) * 0.5;
  const cv = (v0 + v1) * 0.5;
  const up = [0, 1, 0];
  const bot: number[][] = [];
  const mid: number[][] = [];
  const top: number[][] = [];
  const radial: number[][] = [];
  const lip: number[][] = [];
  const dh = STUD_BEVEL;
  const dr = STUD_R - STUD_TOP_R;
  const lipLen = Math.hypot(dh, dr) || 1;
  for (let i = 0; i < STUD_N; i++) {
    const c = STUD_COS[i];
    const sn = STUD_SIN[i];
    bot.push([cx + c * STUD_R, y0, cz + sn * STUD_R]);
    mid.push([cx + c * STUD_R, yb, cz + sn * STUD_R]);
    top.push([cx + c * STUD_TOP_R, y1, cz + sn * STUD_TOP_R]);
    radial.push([c, 0, sn]);
    lip.push([(c * dh) / lipLen, dr / lipLen, (sn * dh) / lipLen]);
  }
  for (let i = 0; i < STUD_N; i++) {
    const j = (i + 1) % STUD_N;
    pushPoly(s, [bot[i], mid[i], mid[j], bot[j]], [radial[i], radial[i], radial[j], radial[j]], cu, cv);
    pushPoly(s, [mid[i], top[i], top[j], mid[j]], [radial[i], lip[i], lip[j], radial[j]], cu, cv);
    pushPoly(s, [[cx, y1, cz], top[j], top[i]], [up, up, up], cu, cv);
  }
}

export function buildChunk(world: World, cx: number, cz: number, fancy: boolean) {
  const opaque = empty();
  const glass = empty();
  const water = empty();
  const plant = empty();
  const x0 = cx * CS;
  const z0 = cz * CS;
  const AO = [0.66, 0.8, 0.91, 1];

  function occludes(id: number) {
    if (!id) return 0;
    const block = def(id);
    return block.solid && !block.glass && !block.fluid ? 1 : 0;
  }

  function shadeAt(x: number, y: number, z: number, nx: number, ny: number, nz: number, vx: number, vy: number, vz: number) {
    const steps: number[][] = [];
    if (nx === 0) steps.push([vx === 0 ? -1 : 1, 0, 0]);
    if (ny === 0) steps.push([0, vy === 0 ? -1 : 1, 0]);
    if (nz === 0) steps.push([0, 0, vz === 0 ? -1 : 1]);
    const a = steps[0] ?? [0, 0, 0];
    const b = steps[1] ?? [0, 0, 0];
    const s1 = occludes(world.get(x + nx + a[0], y + ny + a[1], z + nz + a[2]));
    const s2 = occludes(world.get(x + nx + b[0], y + ny + b[1], z + nz + b[2]));
    const corner = occludes(world.get(x + nx + a[0] + b[0], y + ny + a[1] + b[1], z + nz + a[2] + b[2]));
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
        if (self.torch || self.door || self.ladder || self.dust || self.lever || self.gate || self.plate || self.rail || self.cactus) {
          const tile = faceTile(id, 1);
          const top = faceTile(id, 0);
          if (self.torch) {
            addBox(opaque, x + 0.42, y, z + 0.42, x + 0.58, y + 0.55, z + 0.58, tile);
            addBox(opaque, x + 0.32, y + 0.52, z + 0.32, x + 0.68, y + 0.78, z + 0.68, top);
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
            addBox(opaque, x + 0.15, y, z + 0.15, x + 0.85, y + 0.95, z + 0.85, tile);
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

        for (const face of FACES) {
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
          } else if (n.solid && !n.glass) {
            continue;
          }

          const surf = self.fluid ? water : self.glass ? glass : opaque;
          const tile = faceTile(id, ny > 0 ? 0 : ny < 0 ? 2 : 1);
          const pull = self.glass ? 0.012 : 0;
          const verts = face.v.map(([vx, vy, vz]) => [
            x + vx - nx * pull,
            y + vy - ny * pull,
            z + vz - nz * pull,
          ]);
          const shade = face.v.map(([vx, vy, vz]) => shadeAt(x, y, z, nx, ny, nz, vx, vy, vz));
          pushQuad(surf, verts, face.n, tile, shade);
          if (fancy && ny > 0 && !self.fluid && self.solid && !n.plant) addStud(surf, x, y, z, faceTile(id, 0));
        }
      }
    }
  }

  return { opaque, glass, water, plant };
}
