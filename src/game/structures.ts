// Biome structures (biome-structures, 2026-10-31).
//
// Same rules as hamlets / sites / landmarks (world.ts): one candidate per
// grid cell, every choice rolled from hash2(cell, seed + salt), every
// structure a PURE pattern of bricks relative to its origin, so any chunk
// can repaint its slice deterministically. Zero assets: only the variables
// (zone theme: materials, colours, shape) change; the rules stay fixed and
// the SNR/SIREN shader does the plastic look.
//
// Kinds: a themed village per zone (the desert city gets real multi-storey
// buildings), shrines with special loot, abandoned mechas broken into
// pieces, small points of interest, and rare hidden vaults.
import { ID, def } from "./blocks.ts";
import { hash2, hash3 } from "./noise.ts";
import { SPECIES_BY_ID, ZONES, type ZoneId } from "./biomes.ts";
import { stockChest, type LootKind } from "./loot.ts";
import { DEBRIS_ADVANCED, DEBRIS_RARE } from "./debris.ts";

export const STRUCT_STEP = 128;
const CS = 16;
const HEIGHT = 72;
const SEA = 26;
const REGION = 192;
const SITE_STEP = 96;
const LM_STEP = 256;
/** Nothing is built closer than this to the spawn hamlet / world origin. */
export const SPAWN_CLEAR = 112;

export type StructKind = "village" | "shrine" | "mecha" | "poi" | "hidden";

export type Structure = {
  x: number; // footprint min corner
  z: number;
  y: number; // reference level (pad floor / deck)
  w: number;
  d: number;
  kind: StructKind;
  zone: ZoneId;
  gx: number;
  gz: number;
};

/** mode 0: y = s.y + dy. mode 1: y = ground(column) + dy. mode 2: post —
 *  fills from s.y + dy downward until it meets solid ground. */
export type SBrick = { dx: number; dy: number; dz: number; id: number; mode: 0 | 1 | 2 };

/** What structures need from World (kept structural so tests can use the real World). */
export interface StructWorld {
  readonly seed: number;
  readonly flat: boolean;
  heightAt(x: number, z: number): number;
  zoneAt(x: number, z: number): ZoneId | "";
  hamletAt(rx: number, rz: number): { x: number; z: number; y: number } | null;
  siteAt(gx: number, gz: number): { x: number; z: number } | null;
  landmarkAt(gx: number, gz: number): { x: number; z: number } | null;
}

// ---------------------------------------------------------------- themes

type HouseShape = "cottage" | "adobe" | "tower" | "dome" | "stilt" | "bunker";
type Center = "well" | "fire" | "totem" | "fountain" | "pyre";

export type Theme = {
  walls: readonly number[]; // one per house, cycled
  trim: number; // corners / beams
  roof: number;
  floor: number; // house floors / decks
  ground: number; // pad surface
  path: number;
  post: number;
  light: number;
  glass: number;
  shape: HouseShape;
  center: Center;
  stone: number; // shrine / vault body
  pillar: number;
  accent: number;
  gem: number; // the shrine's relic block
};

export const THEMES: Record<ZoneId, Theme> = {
  jungle: { walls: [ID.Planks, ID.Green], trim: ID.Log, roof: ID.Leaves, floor: ID.Planks, ground: ID.Moss, path: ID.Mud, post: ID.Log, light: ID.Lantern, glass: ID.Air, shape: "stilt", center: "totem", stone: ID.Moss, pillar: ID.Cobble, accent: ID.Green, gem: ID.EmeraldOre },
  desert: { walls: [ID.Yellow, ID.Calcite], trim: ID.Orange, roof: ID.Orange, floor: ID.Sand, ground: ID.Sand, path: ID.Calcite, post: ID.Log, light: ID.Torch, glass: ID.Air, shape: "adobe", center: "well", stone: ID.Yellow, pillar: ID.Calcite, accent: ID.Orange, gem: ID.Gold },
  arctic: { walls: [ID.Snow], trim: ID.Ice, roof: ID.Snow, floor: ID.Planks, ground: ID.Snow, path: ID.Stone, post: ID.Log, light: ID.Lantern, glass: ID.Ice, shape: "dome", center: "fire", stone: ID.Ice, pillar: ID.White, accent: ID.Azure, gem: ID.CrystalOre },
  volcano: { walls: [ID.Basalt, ID.Tuff], trim: ID.Obsidian, roof: ID.Obsidian, floor: ID.Basalt, ground: ID.AshSoil, path: ID.Basalt, post: ID.Obsidian, light: ID.Lantern, glass: ID.Glass, shape: "bunker", center: "pyre", stone: ID.Basalt, pillar: ID.Obsidian, accent: ID.Red, gem: ID.PrismOre },
  valley: { walls: [ID.White, ID.Pink], trim: ID.Log, roof: ID.Pink, floor: ID.Planks, ground: ID.Grass, path: ID.Stone, post: ID.Log, light: ID.Lamp, glass: ID.Glass, shape: "cottage", center: "fountain", stone: ID.Calcite, pillar: ID.White, accent: ID.Pink, gem: ID.Bloom },
  plains: { walls: [ID.Red, ID.Blue, ID.Orange, ID.Green], trim: ID.Log, roof: ID.Yellow, floor: ID.Planks, ground: ID.Grass, path: ID.Cobble, post: ID.Log, light: ID.Lamp, glass: ID.Glass, shape: "cottage", center: "well", stone: ID.Stone, pillar: ID.Cobble, accent: ID.Yellow, gem: ID.Gold },
  mountain: { walls: [ID.Cobble, ID.Stone], trim: ID.Log, roof: ID.Black, floor: ID.Planks, ground: ID.Grass, path: ID.Cobble, post: ID.Log, light: ID.Lantern, glass: ID.Glass, shape: "tower", center: "fire", stone: ID.Tuff, pillar: ID.Stone, accent: ID.Blue, gem: ID.SapphireOre },
  swamp: { walls: [ID.Planks, ID.Mud], trim: ID.Log, roof: ID.Moss, floor: ID.Planks, ground: ID.Mud, path: ID.Planks, post: ID.Log, light: ID.Lantern, glass: ID.Air, shape: "stilt", center: "totem", stone: ID.Mud, pillar: ID.Log, accent: ID.Moss, gem: ID.AmberOre },
  canyon: { walls: [ID.Clay, ID.Orange], trim: ID.Red, roof: ID.Red, floor: ID.Planks, ground: ID.Clay, path: ID.Stone, post: ID.Log, light: ID.Torch, glass: ID.Air, shape: "adobe", center: "well", stone: ID.Clay, pillar: ID.Orange, accent: ID.Red, gem: ID.CopperOre },
  desertCity: { walls: [ID.Yellow, ID.White, ID.Calcite, ID.Orange], trim: ID.Gold, roof: ID.White, floor: ID.Calcite, ground: ID.Sand, path: ID.Stone, post: ID.Log, light: ID.Lantern, glass: ID.Glass, shape: "adobe", center: "fountain", stone: ID.White, pillar: ID.Gold, accent: ID.Azure, gem: ID.Gold },
  islands: { walls: [ID.White, ID.Azure], trim: ID.Planks, roof: ID.Blue, floor: ID.Planks, ground: ID.Sand, path: ID.Planks, post: ID.Log, light: ID.Lamp, glass: ID.Glass, shape: "stilt", center: "fountain", stone: ID.Calcite, pillar: ID.Azure, accent: ID.White, gem: ID.PrismOre },
};

/** Mecha paint schemes (main, secondary) — rolled per wreck. */
const MECHA_PAINT: readonly (readonly [number, number])[] = [
  [ID.Red, ID.White],
  [ID.Yellow, ID.Black],
  [ID.Blue, ID.White],
  [ID.Orange, ID.Black],
  [ID.Green, ID.White],
  [ID.White, ID.Red],
];

// ---------------------------------------------------------------- builder

class Build {
  readonly out: SBrick[] = [];
  readonly mode: 0 | 1;
  constructor(mode: 0 | 1 = 0) {
    this.mode = mode;
  }
  put(dx: number, dy: number, dz: number, id: number, mode: 0 | 1 | 2 = this.mode) {
    this.out.push({ dx, dy, dz, id, mode });
  }
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number) {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.put(x, y, z, id);
  }
  shell(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number) {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (x === x0 || x === x1 || z === z0 || z === z1) this.put(x, y, z, id);
    }
  }
}

type Rnd = (salt: number) => number;

// ---------------------------------------------------------------- houses

/** One house on a lot; door on +z when face=1 else on -z. Interior always
 *  gets a crate, a bed and a light (the hamlet cottage rule). */
function house(b: Build, ox: number, oz: number, t: Theme, wall: number, face: 0 | 1, r: Rnd) {
  const W = 7;
  const D = 6;
  const dz = face ? D - 1 : 0; // door wall
  const furnish = (y: number) => {
    b.put(ox + 2, y, oz + (face ? 1 : 4), ID.Chest);
    b.put(ox + 4, y, oz + (face ? 2 : 3), ID.Bed);
    b.put(ox + 5, y, oz + (face ? 1 : 4), r(1) > 0.5 ? ID.Bench : ID.Furnace);
    b.put(ox + 1, y, oz + (face ? 1 : 4), t.light === ID.Torch ? ID.Torch : ID.Lantern);
  };
  if (t.shape === "dome") {
    const cx = ox + 3;
    const cz = oz + 3;
    const R = 3.6;
    for (let y = 0; y <= 4; y++) for (let z = -4; z <= 4; z++) for (let x = -4; x <= 4; x++) {
      const d = Math.hypot(x, y * 1.05, z);
      if (d > R || d <= R - 1.1) continue;
      const window = y === 2 && (x === 0 || z === 0) && Math.abs(x + z) >= 3;
      b.put(cx + x, y + 1, cz + z, window ? t.glass : wall);
    }
    b.put(cx, 0, cz, t.floor);
    const door = face ? 1 : -1;
    for (let k = 3; k <= 4; k++) {
      b.put(cx, 1, cz + door * k, ID.Air);
      b.put(cx, 2, cz + door * k, ID.Air);
      b.put(cx - 1, 1, cz + door * k, wall);
      b.put(cx + 1, 1, cz + door * k, wall);
      b.put(cx - 1, 2, cz + door * k, wall);
      b.put(cx + 1, 2, cz + door * k, wall);
      b.put(cx, 3, cz + door * k, wall);
    }
    b.put(cx - 1, 1, cz - door, ID.Chest);
    b.put(cx + 1, 1, cz - door, ID.Bed);
    b.put(cx, 1, cz, ID.Campfire);
    return;
  }
  let y0 = 0;
  if (t.shape === "stilt") {
    for (const [px, pz] of [[0, 0], [W - 1, 0], [0, D - 1], [W - 1, D - 1]] as const) {
      b.put(ox + px, 0, oz + pz, t.post, 2);
      for (let y = 1; y <= 3; y++) b.put(ox + px, y, oz + pz, t.post);
    }
    y0 = 3;
    // ladder up to the door
    const lz = face ? oz + D : oz - 1;
    for (let y = 1; y <= 4; y++) b.put(ox + 3, y, lz, ID.Ladder);
  }
  const wallH = t.shape === "tower" ? 7 : t.shape === "bunker" ? 3 : 4;
  b.box(ox, y0, oz, ox + W - 1, y0, oz + D - 1, t.floor);
  for (let y = y0 + 1; y <= y0 + wallH; y++) {
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const edge = x === 0 || z === 0 || x === W - 1 || z === D - 1;
      if (!edge) continue;
      const corner = (x === 0 || x === W - 1) && (z === 0 || z === D - 1);
      let id = corner ? t.trim : wall;
      if (z === dz && x === 3 && y <= y0 + 2) id = t.shape === "adobe" ? ID.Air : ID.Door;
      else if (!corner && (y - y0) % 4 === 2 && (x === 0 || x === W - 1) && (z === 2 || z === 3)) id = t.glass;
      else if (!corner && (y - y0) % 4 === 2 && z !== dz && (z === 0 || z === D - 1) && (x === 1 || x === 5)) id = t.glass;
      b.put(ox + x, y, oz + z, id);
    }
  }
  if (t.shape === "tower") {
    // two floors joined by a ladder; crate upstairs
    b.box(ox + 1, y0 + 4, oz + 1, ox + W - 2, y0 + 4, oz + D - 2, t.floor);
    for (let y = y0 + 1; y <= y0 + 4; y++) b.put(ox + 5, y, oz + (face ? 1 : 4), ID.Ladder);
    b.put(ox + 2, y0 + 5, oz + 2, ID.Chest);
  }
  furnish(y0 + 1);
  const top = y0 + wallH + 1;
  if (t.shape === "cottage" || t.shape === "tower" || t.shape === "stilt") {
    // gable roof along x, overhanging by one
    for (let k = 0; k <= 3; k++) {
      for (let x = -1; x <= W; x++) {
        b.put(ox + x, top + k, oz - 1 + k, t.roof);
        b.put(ox + x, top + k, oz + D - k, t.roof);
      }
      if (k > 0) for (let z = k; z < D - k; z++) {
        b.put(ox, top + k - 1, oz + z, wall);
        b.put(ox + W - 1, top + k - 1, oz + z, wall);
      }
    }
    for (let x = -1; x <= W; x++) for (let z = 3; z <= D - 4; z++) b.put(ox + x, top + 3, oz + z, t.roof);
  } else {
    // flat roof with corner parapets (adobe / bunker)
    b.box(ox, top, oz, ox + W - 1, top, oz + D - 1, t.roof);
    for (const [px, pz] of [[0, 0], [W - 1, 0], [0, D - 1], [W - 1, D - 1]] as const) b.put(ox + px, top + 1, oz + pz, t.trim);
    b.put(ox + 3, top + 1, oz + 2, t.light === ID.Torch ? ID.Torch : ID.Lantern);
  }
}

function centerPiece(b: Build, cx: number, cz: number, t: Theme, zone: ZoneId) {
  if (t.center === "well") {
    b.shell(cx - 2, 1, cz - 2, cx + 1, 1, cz + 1, t.pillar);
    b.box(cx - 1, 0, cz - 1, cx, 1, cz, ID.Water);
    for (const [px, pz] of [[-2, -2], [1, -2], [-2, 1], [1, 1]] as const) {
      b.put(cx + px, 2, cz + pz, t.post);
      b.put(cx + px, 3, cz + pz, t.post);
    }
    b.box(cx - 2, 4, cz - 2, cx + 1, 4, cz + 1, t.roof);
  } else if (t.center === "fire") {
    b.shell(cx - 1, 0, cz - 1, cx + 1, 0, cz + 1, ID.Cobble);
    b.put(cx, 1, cz, ID.Campfire);
    for (const [px, pz] of [[-3, 0], [3, 0], [0, -3], [0, 3]] as const) b.put(cx + px, 1, cz + pz, ID.Log);
  } else if (t.center === "totem") {
    const stack = [ID.Red, ID.Yellow, zone === "swamp" ? ID.Moss : ID.Green, ID.Blue, ID.Gold];
    stack.forEach((id, i) => b.put(cx, 1 + i, cz, id));
    b.put(cx - 1, 4, cz, ID.Yellow);
    b.put(cx + 1, 4, cz, ID.Yellow);
    b.put(cx, 6, cz, ID.Lantern);
  } else if (t.center === "fountain") {
    b.shell(cx - 3, 1, cz - 3, cx + 2, 1, cz + 2, t.stone === ID.Calcite ? ID.White : t.stone);
    b.box(cx - 2, 1, cz - 2, cx + 1, 1, cz + 1, ID.Water);
    b.box(cx - 1, 1, cz - 1, cx, 3, cz, t.pillar);
    b.put(cx, 4, cz, ID.LampOn);
  } else {
    b.shell(cx - 2, 1, cz - 2, cx + 1, 1, cz + 1, ID.Obsidian);
    b.box(cx - 1, 1, cz - 1, cx, 1, cz, ID.Lava);
    for (const [px, pz] of [[-3, -3], [2, -3], [-3, 2], [2, 2]] as const) {
      b.put(cx + px, 1, cz + pz, ID.Basalt);
      b.put(cx + px, 2, cz + pz, ID.Basalt);
      b.put(cx + px, 3, cz + pz, ID.Lantern);
    }
  }
}

// ---------------------------------------------------------------- villages

export const VILLAGE_W = 34;
export const CITY_W = 47;

const LOTS: readonly (readonly [number, number])[] = [
  [2, 2], [13, 2], [24, 2],
  [2, 13], [24, 13],
  [2, 25], [13, 25], [24, 25],
];

function village(t: Theme, zone: ZoneId, r: Rnd): SBrick[] {
  const b = new Build();
  const W = VILLAGE_W;
  const mid = 17;
  const water = zone === "islands";
  // paths: a cross through the plaza
  for (let i = 0; i < W; i++) {
    for (const k of [mid - 1, mid]) {
      b.put(i, 0, k, t.path);
      b.put(k, 0, i, t.path);
      if (water) {
        if (i % 4 === 0) {
          b.put(i, -1, k, t.post, 2);
          b.put(k, -1, i, t.post, 2);
        }
      }
    }
  }
  if (water) {
    // plaza deck on posts
    for (let z = mid - 5; z <= mid + 4; z++) for (let x = mid - 5; x <= mid + 4; x++) {
      b.put(x, 0, z, t.floor);
      if ((x - mid) % 3 === 0 && (z - mid) % 3 === 0) b.put(x, -1, z, t.post, 2);
    }
  }
  centerPiece(b, mid, mid, t, zone);
  let lots = 0;
  LOTS.forEach(([lx, lz], i) => {
    // keep >= 5 houses: drop at most 3 lots, decided by the seed
    if (lots + (LOTS.length - i) > 5 && r(20 + i) < 0.3) return;
    lots++;
    const face: 0 | 1 = lz < mid ? 1 : 0;
    const wall = t.walls[i % t.walls.length];
    house(b, lx, lz, t, wall, face, (s) => r(100 + i * 7 + s));
    if (water) {
      // gangway from the house to the cross path
      const gz = face ? lz + 7 : lz - 2;
      for (let x = lx; x < lx + 7; x++) b.put(x, 3, gz, t.floor);
      for (let z = Math.min(gz, mid); z <= Math.max(gz, mid); z++) b.put(lx + 3, 0, z, t.floor);
    }
  });
  // lamp posts at the path ends, a village crate by the plaza
  for (const [px, pz] of [[mid - 2, 1], [mid - 2, W - 2], [1, mid - 2], [W - 2, mid - 2]] as const) {
    b.put(px, 1, pz, t.post);
    b.put(px, 2, pz, t.post);
    b.put(px, 3, pz, t.light === ID.Torch ? ID.Torch : t.light);
  }
  b.put(mid + 3, 1, mid + 3, ID.Chest);
  b.put(mid + 4, 1, mid + 3, ID.Barrel);
  // farmland strip in the green zones
  if (zone === "plains" || zone === "valley") {
    for (let x = 6; x <= 11; x++) {
      b.put(x, 0, mid + 3, ID.Farmland);
      b.put(x, 1, mid + 3, r(300 + x) > 0.5 ? ID.CropRipe : ID.CarrotRipe);
      b.put(x, 0, mid + 4, ID.Water);
      b.put(x, 0, mid + 5, ID.Farmland);
      b.put(x, 1, mid + 5, ID.CropRipe);
    }
  }
  return b.out;
}

/** The desert city: a 3x3 street grid of real multi-storey buildings,
 *  a domed palace in the middle and a market block. */
function desertCity(t: Theme, r: Rnd): SBrick[] {
  const b = new Build();
  const W = CITY_W;
  const B = 13;
  const origins = [1, 17, 33];
  // streets: stone, calcite kerbs; lamps at crossings; palms on corners
  for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) {
    const inBlock = origins.some((o) => x >= o && x < o + B) && origins.some((o) => z >= o && z < o + B);
    if (!inBlock) b.put(x, 0, z, (x + z) % 7 === 0 ? ID.Calcite : t.path);
  }
  for (const cx of [15, 31]) for (const cz of [15, 31]) {
    b.put(cx, 1, cz, ID.Fence);
    b.put(cx, 2, cz, ID.Fence);
    b.put(cx, 3, cz, ID.Lantern);
  }
  for (const [px, pz] of [[0, 0], [W - 1, 0], [0, W - 1], [W - 1, W - 1]] as const) palm(b, px, pz);
  let k = 0;
  for (const oz of origins) for (const ox of origins) {
    k++;
    if (ox === 17 && oz === 17) palace(b, ox, oz, t);
    else if (k === 3 + Math.floor(r(40) * 2) * 4) market(b, ox, oz, r);
    else building(b, ox, oz, t, (s) => r(500 + k * 13 + s));
  }
  return b.out;
}

function palm(b: Build, x: number, z: number) {
  for (let y = 1; y <= 5; y++) b.put(x, y, z, ID.Log);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]] as const) b.put(x + dx, 5 + (Math.abs(dx + dz) === 2 ? -1 : 0), z + dz, ID.Leaves);
  b.put(x, 6, z, ID.Leaves);
}

/** A multi-storey block: 2-4 floors of 4, glass bands, interior floors,
 *  a ladder shaft, a parapet roof with a garden or water tank. */
function building(b: Build, ox: number, oz: number, t: Theme, r: Rnd) {
  const split = r(1) > 0.5; // one big building or two narrow ones
  const parts: [number, number, number, number][] = split
    ? [[ox, oz, 13, 6], [ox, oz + 7, 13, 6]]
    : [[ox + 1, oz + 1, 11, 11]];
  parts.forEach(([x0, z0, w, d], i) => {
    const floors = 2 + Math.floor(r(2 + i) * 3);
    const wall = t.walls[Math.floor(r(5 + i) * t.walls.length) % t.walls.length];
    const H = floors * 4;
    b.box(x0, 0, z0, x0 + w - 1, 0, z0 + d - 1, t.floor);
    for (let y = 1; y <= H; y++) {
      for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) {
        const edge = x === 0 || z === 0 || x === w - 1 || z === d - 1;
        if (!edge) {
          if (y % 4 === 0) b.put(x0 + x, y, z0 + z, x === 1 && z === 1 ? ID.Air : t.floor);
          continue;
        }
        const corner = (x === 0 || x === w - 1) && (z === 0 || z === d - 1);
        let id = corner ? t.trim === ID.Gold ? wall : t.trim : wall;
        if (y % 4 === 0) id = ID.Calcite; // floor band
        else if (!corner && y % 4 === 2 && (x + z) % 2 === 1) id = t.glass;
        // street door on the -z (or +z for the back half) face
        const doorZ = i === 1 ? d - 1 : 0;
        if (z === doorZ && x === Math.floor(w / 2) && y <= 2) id = ID.Air;
        b.put(x0 + x, y, z0 + z, id);
      }
    }
    for (let y = 1; y <= H; y++) b.put(x0 + 1, y, z0 + 1, ID.Ladder);
    // roof
    b.box(x0, H + 1, z0, x0 + w - 1, H + 1, z0 + d - 1, t.roof);
    b.shell(x0, H + 2, z0, x0 + w - 1, H + 2, z0 + d - 1, wall);
    b.put(x0 + 1, H + 2, z0 + 1, ID.Air);
    for (let y = H - 2; y <= H + 1; y++) b.put(x0 + 1, y, z0 + 1, ID.Ladder);
    b.put(x0 + 1, H + 1, z0 + 1, ID.Air);
    if (r(9 + i) > 0.5) {
      b.box(x0 + 3, H + 2, z0 + 2, x0 + 4, H + 2, z0 + d - 3, ID.Leaves);
      b.put(x0 + w - 3, H + 2, z0 + 2, ID.Bloom);
    } else {
      b.box(x0 + w - 4, H + 2, z0 + d - 4, x0 + w - 3, H + 3, z0 + d - 3, ID.Barrel);
    }
    // furniture: crate + light on the top floor, bench + kiln downstairs
    b.put(x0 + w - 2, H - 3, z0 + d - 2, ID.Chest);
    b.put(x0 + w - 2, H - 3, z0 + 1, ID.Lantern);
    b.put(x0 + 2, 1, z0 + d - 2, ID.Bench);
    b.put(x0 + w - 2, 1, z0 + d - 2, ID.Furnace);
    // awning over the door
    const az = i === 1 ? z0 + d : z0 - 1;
    for (let x = Math.floor(w / 2) - 1; x <= Math.floor(w / 2) + 1; x++) b.put(x0 + x, 3, az, (x & 1) ? ID.Red : ID.White);
  });
}

function palace(b: Build, ox: number, oz: number, t: Theme) {
  const W = 13;
  const H = 8;
  b.box(ox, 0, oz, ox + W - 1, 0, oz + W - 1, ID.Calcite);
  for (let y = 1; y <= H; y++) for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) {
    const edge = x === 0 || z === 0 || x === W - 1 || z === W - 1;
    if (!edge) {
      if (y === 4 && !(x === 1 && z === 1)) b.put(ox + x, y, oz + z, ID.Calcite);
      continue;
    }
    const corner = (x === 0 || x === W - 1) && (z === 0 || z === W - 1);
    let id: number = corner ? ID.Gold : ID.White;
    if (!corner && (y === 2 || y === 6) && x % 3 === 0) id = t.glass;
    if (!corner && y === 4) id = ID.Azure;
    if (z === 0 && x >= 5 && x <= 7 && y <= 3) id = y === 3 && x !== 6 ? ID.Gold : ID.Air; // arch
    b.put(ox + x, y, oz + z, id);
  }
  for (let y = 1; y <= H; y++) b.put(ox + 1, y, oz + 1, ID.Ladder);
  b.box(ox, H + 1, oz, ox + W - 1, H + 1, oz + W - 1, ID.White);
  // dome
  const cx = ox + 6;
  const cz = oz + 6;
  for (let y = 0; y <= 5; y++) for (let z = -5; z <= 5; z++) for (let x = -5; x <= 5; x++) {
    const d = Math.hypot(x, y * 1.1, z);
    if (d > 5.2 || d <= 4.1) continue;
    b.put(cx + x, H + 2 + y, cz + z, y >= 3 ? ID.Gold : ID.Azure);
  }
  b.put(cx, H + 8, cz, ID.Gold);
  b.put(cx, H + 9, cz, ID.LampOn);
  // corner minarets
  for (const [px, pz] of [[0, 0], [W - 1, 0], [0, W - 1], [W - 1, W - 1]] as const) {
    for (let y = H + 2; y <= H + 5; y++) b.put(ox + px, y, oz + pz, ID.White);
    b.put(ox + px, H + 6, oz + pz, ID.Gold);
  }
  // treasury
  b.put(cx, 1, cz, ID.Chest);
  b.put(cx - 1, 1, cz, ID.Chest);
  b.put(cx, 5, cz, ID.Chest);
  b.put(cx + 1, 1, cz, ID.Bookshelf);
  b.put(cx, 1, cz + 3, ID.Lantern);
}

function market(b: Build, ox: number, oz: number, r: Rnd) {
  b.box(ox, 0, oz, ox + 12, 0, oz + 12, ID.Calcite);
  const canopies = [ID.Red, ID.Blue, ID.Yellow, ID.Green];
  let s = 0;
  for (const sz of [1, 7]) for (const sx of [1, 5, 9]) {
    const c = canopies[s++ % canopies.length];
    for (const [px, pz] of [[0, 0], [2, 0], [0, 4], [2, 4]] as const) for (let y = 1; y <= 2; y++) b.put(ox + sx + px, y, oz + sz + pz, ID.Fence);
    for (let z = 0; z <= 4; z++) for (let x = 0; x <= 2; x++) b.put(ox + sx + x, 3, oz + sz + z, (z & 1) ? ID.White : c);
    const goods = [ID.Melon, ID.Pumpkin, ID.Barrel, ID.Hay];
    b.put(ox + sx + 1, 1, oz + sz + 1, goods[Math.floor(r(60 + s) * goods.length) % goods.length]);
    b.put(ox + sx + 1, 1, oz + sz + 3, s % 3 === 0 ? ID.Chest : ID.Barrel);
  }
}

// ---------------------------------------------------------------- shrine

export const SHRINE_W = 11;

function shrine(t: Theme, zone: ZoneId): SBrick[] {
  const b = new Build();
  b.box(1, 1, 1, 9, 1, 9, t.stone);
  b.box(2, 2, 2, 8, 2, 8, t.stone === ID.Ice ? ID.White : t.stone);
  b.box(4, 3, 4, 6, 3, 6, t.accent);
  for (const [px, pz] of [[2, 2], [8, 2], [2, 8], [8, 8]] as const) {
    for (let y = 3; y <= 6; y++) b.put(px, y, pz, t.pillar);
    b.put(px, 7, pz, t.accent);
    b.put(px, 8, pz, t.light === ID.Torch ? ID.Torch : ID.Lantern);
  }
  // lintels joining the pillars (a torii-like frame on the entrance side)
  for (let x = 2; x <= 8; x++) b.put(x, 7, 2, t.accent);
  b.put(5, 4, 5, ID.Chest);
  b.put(5, 4, 7, t.gem);
  b.put(5, 5, 7, t.gem === ID.Bloom ? ID.Bloom : ID.LampOn);
  // steps
  for (let x = 4; x <= 6; x++) {
    b.put(x, 1, 0, t.stone);
    b.put(x, 2, 1, t.stone);
  }
  if (zone === "volcano") for (const [px, pz] of [[0, 0], [10, 0], [0, 10], [10, 10]] as const) b.put(px, 0, pz, ID.Lava);
  if (zone === "swamp" || zone === "jungle") for (const [px, pz] of [[1, 5], [9, 5], [5, 9]] as const) b.put(px, 2, pz, ID.Leaves);
  if (zone === "arctic") for (const [px, pz] of [[0, 3], [10, 7], [3, 10]] as const) { b.put(px, 1, pz, ID.Ice); b.put(px, 2, pz, ID.Ice); }
  return b.out;
}

// ---------------------------------------------------------------- hidden vault

export const HIDDEN_W = 11;

/** A buried vault: only a lone bush and a lantern-capped stone give it away. */
function hidden(t: Theme): SBrick[] {
  const b = new Build();
  const top = -10;
  const bot = -15;
  for (let y = bot; y <= top; y++) for (let z = 1; z <= 9; z++) for (let x = 1; x <= 9; x++) {
    const shell = x === 1 || z === 1 || x === 9 || z === 9 || y === bot || y === top;
    b.put(x, y, z, shell ? (t.stone === ID.Mud || t.stone === ID.Snow ? ID.Cobble : t.stone) : ID.Air);
  }
  for (const [px, pz] of [[2, 2], [8, 2], [2, 8], [8, 8]] as const) for (let y = bot + 1; y < top; y++) b.put(px, y, pz, ID.Gold);
  b.put(5, bot + 1, 8, ID.Chest);
  b.put(3, bot + 1, 8, ID.Chest);
  b.put(7, bot + 1, 8, ID.Bookshelf);
  b.put(7, bot + 2, 8, ID.Bookshelf);
  b.put(5, bot + 1, 5, ID.IronBlock);
  b.put(5, bot + 2, 5, ID.LampOn);
  b.put(3, bot + 3, 3, ID.Lantern);
  b.put(7, bot + 3, 7, ID.Lantern);
  // ladder shaft from the surface, hidden under a bush
  for (let y = bot + 1; y <= 0; y++) b.put(5, y, 2, ID.Ladder);
  b.put(5, 1, 2, ID.Leaves);
  b.put(4, 1, 2, ID.Leaves);
  b.put(5, 1, 3, ID.Leaves);
  b.put(8, 1, 6, t.pillar === ID.Gold ? ID.Calcite : t.pillar);
  b.put(8, 2, 6, ID.Lantern);
  return b.out;
}

// ---------------------------------------------------------------- mecha wreck

export const MECHA_W = 19;

/** An abandoned mecha broken into pieces: torso with its open cockpit
 *  crate, a fallen head, scattered limbs and a field of loose bricks, all
 *  resting on the ground (mode 1). */
function mecha(zone: ZoneId, r: Rnd): SBrick[] {
  const b = new Build(1);
  const [main, sec] = MECHA_PAINT[Math.floor(r(1) * MECHA_PAINT.length) % MECHA_PAINT.length];
  const joint = r(2) > 0.5 ? ID.IronBlock : ID.ChromeBrick;
  const c = 9;
  // scorched crater
  for (let z = -4; z <= 4; z++) for (let x = -4; x <= 4; x++) {
    const d = Math.hypot(x, z);
    if (d <= 4.4 && r(10 + x * 17 + z) > 0.35) b.put(c + x, 0, c + z, d < 2.5 ? ID.Ash : ID.Gravel);
  }
  // torso lying on its back: 5 x 3 x 4, cockpit open on top
  b.box(c - 2, 0, c - 2, c + 2, 2, c + 1, main);
  b.box(c - 2, 1, c - 1, c + 2, 1, c, sec);
  b.box(c - 1, 1, c - 1, c + 1, 2, c, ID.Air);
  b.put(c, 1, c, ID.Chest);
  b.put(c - 1, 1, c - 1, ID.LampOn);
  b.put(c + 1, 2, c - 2, ID.Glass);
  b.put(c - 1, 2, c - 2, ID.Glass);
  b.put(c - 3, 1, c - 1, joint); // shoulders
  b.put(c + 3, 1, c - 1, joint);
  // head, knocked off a few studs away
  const hx = c + 3 + Math.floor(r(3) * 3);
  const hz = c + 4;
  b.box(hx, 0, hz, hx + 2, 2, hz + 2, sec);
  b.put(hx, 1, hz + 1, ID.Glass);
  b.put(hx + 1, 1, hz, ID.LampOn);
  b.put(hx + 1, 3, hz + 1, main);
  b.put(hx + 1, 4, hz + 1, ID.Red); // antenna tip
  // limbs: 2-wide rods with joint knuckles, flung along four directions
  const limbs: [number, number, number, number][] = [
    [c - 4, c - 1, -1, 0], // arm L
    [c + 4, c - 1, 1, -1], // arm R
    [c - 1, c + 3, -1, 1], // leg L
    [c + 1, c - 4, 0, -1], // leg R
  ];
  limbs.forEach(([x0, z0, sx, sz], i) => {
    const len = 3 + Math.floor(r(30 + i) * 3);
    for (let k = 0; k < len; k++) {
      const x = x0 + sx * k;
      const z = z0 + sz * k;
      const id = k === 0 || k === len - 1 ? joint : (k & 1) ? main : sec;
      b.put(x, 0, z, id);
      b.put(x + (sz !== 0 ? 1 : 0), 0, z + (sx !== 0 ? 1 : 0), id);
      if (i >= 2 && k === len - 1) b.put(x, 1, z, ID.Black); // foot
    }
    if (i < 2) b.put(x0 + sx * len, 1, z0 + sz * len, ID.Black); // fist
  });
  // loose bricks scattered around
  const loose = [main, sec, joint, ID.Black, main, ID.Stone];
  for (let i = 0; i < 26; i++) {
    const a = r(50 + i) * Math.PI * 2;
    const d = 4 + r(80 + i) * 5;
    const x = Math.round(c + Math.cos(a) * d);
    const z = Math.round(c + Math.sin(a) * d);
    if (x < 0 || z < 0 || x >= MECHA_W || z >= MECHA_W) continue;
    b.put(x, 1, z, loose[i % loose.length]);
    if (r(120 + i) > 0.8) b.put(x, 2, z, ID.Black);
  }
  // the zone claims the wreck
  if (zone === "jungle" || zone === "swamp" || zone === "valley") {
    b.put(c - 2, 3, c + 1, ID.Leaves);
    b.put(c + 2, 3, c - 2, ID.Leaves);
    b.put(c, 3, c + 1, ID.Moss);
  } else if (zone === "arctic") {
    b.put(c - 2, 3, c - 2, ID.Snow);
    b.put(c + 2, 3, c + 1, ID.Snow);
    b.put(hx, 3, hz, ID.Ice);
  } else if (zone === "volcano") {
    b.put(c + 3, 0, c + 2, ID.Lava);
    b.put(c - 3, 0, c + 3, ID.Basalt);
  } else if (zone === "desert" || zone === "desertCity" || zone === "canyon") {
    b.put(c - 2, 3, c, ID.Sand);
    b.put(c - 1, 3, c + 1, ID.Sand);
  }
  return b.out;
}

// ---------------------------------------------------------------- points of interest

export const POI_W = 11;

export const POI_LABEL: Record<ZoneId, string> = {
  jungle: "Idole envahie",
  desert: "Fossile",
  arctic: "Camp gelé",
  volcano: "Cheminée de basalte",
  valley: "Cercle de menhirs",
  plains: "Moulin de garde",
  mountain: "Entrée de mine",
  swamp: "Cabane engloutie",
  canyon: "Arche et camp",
  desertCity: "Obélisque",
  islands: "Phare",
};

function poi(t: Theme, zone: ZoneId, r: Rnd): SBrick[] {
  const b = new Build();
  if (zone === "jungle") {
    b.box(3, 1, 4, 7, 5, 7, ID.Moss);
    b.box(4, 2, 3, 6, 4, 3, ID.Cobble);
    b.put(4, 4, 3, ID.Gold);
    b.put(6, 4, 3, ID.Gold);
    b.put(5, 2, 3, ID.Black);
    for (const [x, y, z] of [[3, 6, 5], [5, 6, 6], [7, 6, 4], [2, 1, 5], [8, 2, 6], [7, 5, 7]] as const) b.put(x, y, z, ID.Leaves);
    b.put(5, 1, 8, ID.Chest);
  } else if (zone === "desert") {
    for (let i = 0; i < 8; i++) {
      const x = 1 + i;
      b.put(x, 1, 5, ID.Calcite);
      if (i % 2 === 0) for (let k = 1; k <= 2; k++) { b.put(x, 1 + k, 5 - k, ID.White); b.put(x, 1 + k, 5 + k, ID.White); }
    }
    b.box(9, 1, 4, 10, 2, 6, ID.Calcite);
    b.put(10, 2, 5, ID.Black);
    b.put(2, 1, 8, ID.Chest);
    b.put(3, 1, 8, ID.Cactus);
  } else if (zone === "arctic") {
    for (let x = 2; x <= 6; x++) for (let k = 0; k <= 2; k++) {
      b.put(x, 1 + k, 2 + k, (x & 1) ? ID.Red : ID.White);
      b.put(x, 1 + k, 8 - k, (x & 1) ? ID.Red : ID.White);
    }
    b.put(4, 1, 5, ID.Campfire);
    b.box(7, 1, 6, 9, 3, 8, ID.Ice);
    b.put(8, 2, 7, ID.Chest);
    b.put(1, 1, 5, ID.Lantern);
  } else if (zone === "volcano") {
    for (let z = 2; z <= 8; z++) for (let x = 2; x <= 8; x++) {
      const d = Math.hypot(x - 5, z - 5);
      if (d > 3.2) continue;
      if (d > 2.2) for (let y = 1; y <= 2 + Math.floor(r(x * 9 + z) * 3); y++) b.put(x, y, z, ID.Basalt);
      else if (d < 1.2) b.put(x, 0, z, ID.Lava);
      else b.put(x, 0, z, ID.Obsidian);
    }
    for (const [x, z, h] of [[1, 1, 4], [9, 2, 5], [2, 9, 3]] as const) for (let y = 1; y <= h; y++) b.put(x, y, z, ID.Obsidian);
    b.put(9, 1, 9, ID.Chest);
  } else if (zone === "valley") {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = Math.round(5 + Math.cos(a) * 4);
      const z = Math.round(5 + Math.sin(a) * 4);
      const h = 2 + (i % 3);
      for (let y = 1; y <= h; y++) b.put(x, y, z, ID.Stone);
      b.put(x, h + 1, z, i % 2 ? ID.Moss : ID.Stone);
    }
    b.put(5, 1, 5, ID.Calcite);
    b.put(5, 2, 5, ID.Chest);
    for (const [x, z] of [[4, 4], [6, 6], [4, 6], [6, 4]] as const) b.put(x, 1, z, ID.Bloom);
  } else if (zone === "plains") {
    b.shell(4, 1, 4, 6, 7, 6, ID.Planks);
    for (let y = 1; y <= 7; y++) for (const [x, z] of [[4, 4], [6, 4], [4, 6], [6, 6]] as const) b.put(x, y, z, ID.Log);
    b.put(5, 1, 4, ID.Door);
    for (let y = 1; y <= 7; y++) b.put(5, y, 5, ID.Ladder);
    b.box(3, 8, 3, 7, 8, 7, ID.Planks);
    b.put(5, 8, 5, ID.Air);
    b.put(4, 9, 4, ID.Chest);
    b.put(6, 9, 6, ID.Lantern);
    // windmill sails on the north face
    for (let k = -3; k <= 3; k++) { b.put(5 + k, 6, 3, k ? ID.White : ID.Log); b.put(5, 6 + k, 3, k ? ID.Red : ID.Log); }
    b.put(8, 1, 8, ID.Hay);
    b.put(9, 1, 8, ID.Hay);
  } else if (zone === "mountain") {
    b.box(2, 1, 6, 8, 5, 10, ID.Stone);
    b.box(4, 1, 6, 6, 3, 10, ID.Air);
    for (let y = 1; y <= 4; y++) { b.put(3, y, 5, ID.Log); b.put(7, y, 5, ID.Log); }
    for (let x = 3; x <= 7; x++) b.put(x, 4, 5, ID.Log);
    for (let z = 3; z <= 10; z++) b.put(5, 1, z, ID.Rail);
    b.put(4, 1, 9, ID.Chest);
    b.put(6, 2, 9, ID.Torch);
    b.put(6, 1, 8, ID.IronOre);
    b.put(4, 2, 7, ID.Web);
  } else if (zone === "swamp") {
    // a hut sunk at an angle: floor tilts into the mud
    for (let x = 2; x <= 8; x++) {
      const sink = x < 5 ? 0 : -1;
      for (let z = 3; z <= 7; z++) b.put(x, sink, z, ID.Planks);
      for (let y = 1; y <= 3; y++) { b.put(x, sink + y, 3, ID.Planks); b.put(x, sink + y, 7, ID.Planks); }
      for (let z = 3; z <= 7; z++) if (x !== 5) b.put(x, sink + 4, z, ID.Moss);
    }
    for (let y = 1; y <= 3; y++) for (let z = 4; z <= 6; z++) { b.put(2, y, z, ID.Mud); b.put(8, y - 1, z, ID.Planks); }
    b.put(4, 1, 5, ID.Chest);
    b.put(6, 0, 5, ID.Lantern);
    for (const [x, z] of [[1, 2], [9, 8], [1, 8], [9, 1]] as const) { b.put(x, 1, z, ID.Reed); b.put(x, 2, z, ID.Reed); }
  } else if (zone === "canyon") {
    for (let y = 1; y <= 6; y++) { b.box(0, y, 4, 1, y, 6, ID.Clay); b.box(9, y, 4, 10, y, 6, ID.Clay); }
    for (let x = 0; x <= 10; x++) { b.put(x, 7, 5, ID.Orange); b.put(x, 7, 4, ID.Clay); b.put(x, 7, 6, ID.Clay); }
    for (let x = 2; x <= 8; x++) b.put(x, 6, 5, (x === 2 || x === 8) ? ID.Clay : ID.Air);
    b.put(5, 1, 5, ID.Campfire);
    b.put(3, 1, 4, ID.Chest);
    b.put(7, 1, 6, ID.Barrel);
    b.put(7, 1, 4, ID.Bed);
  } else if (zone === "desertCity") {
    b.box(3, 1, 3, 7, 1, 7, ID.Calcite);
    for (let y = 2; y <= 9; y++) b.box(4, y, 4, 6, y, 6, y > 7 ? ID.Gold : ID.Yellow);
    b.put(5, 10, 5, ID.Gold);
    for (let y = 2; y <= 9; y += 2) b.put(5, y, 3, ID.Azure);
    b.put(1, 1, 1, ID.Chest);
    b.put(9, 1, 9, ID.Lantern);
    palm(b, 1, 9);
  } else {
    // islands: a striped lighthouse on a rock
    b.box(2, 0, 2, 8, 1, 8, ID.Stone);
    for (let y = 2; y <= 11; y++) b.shell(4, y, 4, 6, y, 6, (Math.floor(y / 2) & 1) ? ID.Red : ID.White);
    for (let y = 2; y <= 11; y++) b.put(5, y, 5, ID.Ladder);
    b.put(5, 2, 4, ID.Door);
    b.box(3, 12, 3, 7, 12, 7, ID.Planks);
    b.put(5, 12, 5, ID.Air);
    b.box(4, 13, 4, 6, 14, 6, ID.Glass);
    b.put(5, 13, 5, ID.LampOn);
    b.put(5, 15, 5, ID.Red);
    b.put(6, 2, 5, ID.Chest);
  }
  void t;
  return b.out;
}

// ---------------------------------------------------------------- placement

export function structSize(kind: StructKind, zone: ZoneId): number {
  if (kind === "village") return zone === "desertCity" ? CITY_W : VILLAGE_W;
  if (kind === "shrine") return SHRINE_W;
  if (kind === "mecha") return MECHA_W;
  if (kind === "hidden") return HIDDEN_W;
  return POI_W;
}

/** Roll for a cell: which kind it holds (or none). Pure, seed only. */
export function cellKind(seed: number, gx: number, gz: number): StructKind | null {
  const r = hash2(gx, gz, seed + 3100);
  if (r < 0.14) return "village";
  if (r < 0.28) return "shrine";
  if (r < 0.42) return "mecha";
  if (r < 0.47) return "hidden";
  if (r < 0.75) return "poi";
  return null;
}

const cache = new WeakMap<object, Map<string, Structure | null>>();

/** The structure of grid cell (gx, gz), or null. Deterministic from the seed. */
export function structureAt(w: StructWorld, gx: number, gz: number): Structure | null {
  if (w.flat) return null;
  let m = cache.get(w);
  if (!m) {
    m = new Map();
    cache.set(w, m);
  }
  const key = gx + "," + gz;
  if (m.has(key)) return m.get(key)!;
  const s = rollStructure(w, gx, gz);
  m.set(key, s);
  return s;
}

function rollStructure(w: StructWorld, gx: number, gz: number): Structure | null {
  const seed = w.seed;
  const kind0 = cellKind(seed, gx, gz);
  if (!kind0) return null;
  // the zone decides the footprint, so sample it at the cell's roll point
  const px = gx * STRUCT_STEP + 8 + Math.floor(hash2(gx, gz, seed + 3101) * (STRUCT_STEP - 16 - CITY_W));
  const pz = gz * STRUCT_STEP + 8 + Math.floor(hash2(gx, gz, seed + 3102) * (STRUCT_STEP - 16 - CITY_W));
  if (px >= 20000 && px < 24000) return null; // never in the Nether band
  const zone = w.zoneAt(px + 17, pz + 17);
  if (!zone) return null;
  const kind = kind0;
  const size = structSize(kind, zone);
  const x = px;
  const z = pz;
  const cx = x + size / 2;
  const cz = z + size / 2;
  // spawn: keep the start hamlet, its gate and the origin clear
  const home = w.hamletAt(0, 0);
  const hx = home ? home.x + 15 : 0;
  const hz = home ? home.z + 14 : 0;
  const far = (ax: number, az: number, r: number) => Math.abs(cx - ax) > r + size / 2 || Math.abs(cz - az) > r + size / 2;
  if (!far(hx, hz, SPAWN_CLEAR) || !far(0, 0, SPAWN_CLEAR)) return null;
  // other generators: hamlets, sites, landmarks keep their ground
  const rx = Math.floor(cx / REGION);
  const rz = Math.floor(cz / REGION);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const ham = w.hamletAt(rx + dx, rz + dz);
    if (ham && !far(ham.x + 15, ham.z + 14, 30)) return null;
  }
  for (let sz = Math.floor((z - 12) / SITE_STEP); sz <= Math.floor((z + size + 4) / SITE_STEP); sz++) {
    for (let sx = Math.floor((x - 12) / SITE_STEP); sx <= Math.floor((x + size + 4) / SITE_STEP); sx++) {
      const site = w.siteAt(sx, sz);
      if (site && site.x + 10 >= x - 2 && site.x - 3 <= x + size + 2 && site.z + 10 >= z - 2 && site.z - 3 <= z + size + 2) return null;
    }
  }
  const lx = Math.floor(cx / LM_STEP);
  const lz = Math.floor(cz / LM_STEP);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const lm = w.landmarkAt(lx + dx, lz + dz);
    if (lm && !far(lm.x, lm.z, 40)) return null;
  }
  // ground: corners + centre (+ edge midpoints for the big pads)
  const pts: [number, number][] = [[0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1], [size >> 1, size >> 1]];
  if (size > 20) pts.push([size >> 1, 0], [0, size >> 1], [size - 1, size >> 1], [size >> 1, size - 1]);
  const hs = pts.map(([dx, dz]) => w.heightAt(x + dx, z + dz));
  const zones = pts.map(([dx, dz]) => w.zoneAt(x + dx, z + dz));
  const same = zones.filter((zz) => zz === zone).length;
  if (same < Math.ceil(pts.length * 0.6)) return null;
  const min = Math.min(...hs);
  const max = Math.max(...hs);
  const sorted = [...hs].sort((a, b) => a - b);
  const median = sorted[sorted.length >> 1];
  if (zone === "islands" && kind === "village") {
    // stilt village over the lagoon: shallow water only
    if (max > SEA + 3 || min < SEA - 10) return null;
    return { x, z, y: SEA + 1, w: size, d: size, kind, zone, gx, gz };
  }
  if (kind === "mecha") {
    if (max - min > 6 || min < SEA - 1) return null;
    return { x, z, y: median, w: size, d: size, kind, zone, gx, gz };
  }
  if (min <= SEA) return null;
  const tol = kind === "village" ? 8 : kind === "hidden" ? 10 : 6;
  if (max - min > tol) return null;
  const y = Math.max(SEA + 2, Math.min(HEIGHT - 26, median));
  if (kind === "hidden" && y < 20) return null;
  return { x, z, y, w: size, d: size, kind, zone, gx, gz };
}

/** Does the structure level and clear its footprint? */
export function padOf(s: Structure): { floor: number; clear: number } | null {
  if (s.kind === "mecha" || s.kind === "hidden") return null;
  if (s.kind === "village" && s.zone === "islands") return null;
  const t = THEMES[s.zone];
  const clear = s.kind === "village" ? (s.zone === "desertCity" ? 28 : 14) : 18;
  return { floor: s.kind === "shrine" ? t.stone : t.ground, clear };
}

const brickCache = new Map<string, SBrick[]>();

/** The brick pattern of a structure: pure function of (structure, seed). */
export function structureBricks(s: Structure, seed: number): SBrick[] {
  const key = seed + ":" + s.kind + ":" + s.zone + ":" + s.x + "," + s.z;
  const hit = brickCache.get(key);
  if (hit) return hit;
  const r: Rnd = (salt) => hash2(s.x + salt * 31, s.z - salt * 17, seed + 3200);
  const t = THEMES[s.zone];
  let out: SBrick[];
  if (s.kind === "village") out = s.zone === "desertCity" ? desertCity(t, r) : village(t, s.zone, r);
  else if (s.kind === "shrine") out = shrine(t, s.zone);
  else if (s.kind === "mecha") out = mecha(s.zone, r);
  else if (s.kind === "hidden") out = hidden(t);
  else out = poi(t, s.zone, r);
  if (brickCache.size > 256) brickCache.clear();
  brickCache.set(key, out);
  return out;
}

/** Cells whose structure could touch the chunk at (baseX, baseZ). */
function cellsNear(baseX: number, baseZ: number): [number, number][] {
  const out: [number, number][] = [];
  const g0x = Math.floor((baseX - STRUCT_STEP) / STRUCT_STEP);
  const g1x = Math.floor((baseX + CS) / STRUCT_STEP);
  const g0z = Math.floor((baseZ - STRUCT_STEP) / STRUCT_STEP);
  const g1z = Math.floor((baseZ + CS) / STRUCT_STEP);
  for (let gz = g0z; gz <= g1z; gz++) for (let gx = g0x; gx <= g1x; gx++) out.push([gx, gz]);
  return out;
}

function nonSolid(id: number): boolean {
  if (id === ID.Air || id === ID.Water) return true;
  const d = def(id);
  return !d || d.solid === false;
}

/** Paint every structure slice that falls in this chunk (world.ts calls
 *  this right after the sites, like paintHamlet/paintSites). */
export function paintStructures(w: StructWorld, data: Uint8Array, baseX: number, baseZ: number) {
  if (w.flat) return;
  const at = (x: number, y: number, z: number) => x - baseX + (z - baseZ) * CS + y * CS * CS;
  const inside = (x: number, z: number) => x >= baseX && x < baseX + CS && z >= baseZ && z < baseZ + CS;
  for (const [gx, gz] of cellsNear(baseX, baseZ)) {
    const s = structureAt(w, gx, gz);
    if (!s) continue;
    if (s.x + s.w + 2 < baseX || s.x - 2 >= baseX + CS || s.z + s.d + 2 < baseZ || s.z - 2 >= baseZ + CS) continue;
    const pad = padOf(s);
    if (pad) {
      for (let z = s.z - 1; z <= s.z + s.d; z++) for (let x = s.x - 1; x <= s.x + s.w; x++) {
        if (!inside(x, z)) continue;
        if (s.y >= 1 && s.y < HEIGHT) data[at(x, s.y, z)] = pad.floor;
        for (let y = s.y - 1; y >= Math.max(1, s.y - 12); y--) {
          const i = at(x, y, z);
          if (!nonSolid(data[i])) break;
          data[i] = pad.floor === ID.Snow || pad.floor === ID.Sand ? pad.floor : ID.Dirt;
        }
        for (let y = s.y + 1; y <= Math.min(HEIGHT - 2, s.y + pad.clear); y++) data[at(x, y, z)] = ID.Air;
      }
    }
    for (const b of structureBricks(s, w.seed)) {
      const x = s.x + b.dx;
      const z = s.z + b.dz;
      if (!inside(x, z)) continue;
      if (b.mode === 2) {
        for (let y = s.y + b.dy; y >= 1; y--) {
          if (y >= HEIGHT) continue;
          const i = at(x, y, z);
          if (!nonSolid(data[i])) break;
          data[i] = b.id;
        }
        continue;
      }
      const y = b.mode === 1 ? w.heightAt(x, z) + b.dy : s.y + b.dy;
      if (y < 1 || y >= HEIGHT - 1) continue;
      data[at(x, y, z)] = b.id;
    }
  }
}

/** Every structure whose cell lies within `rings` cells of (x, z). */
export function structuresNear(w: StructWorld, x: number, z: number, rings = 2): Structure[] {
  const gx = Math.floor(x / STRUCT_STEP);
  const gz = Math.floor(z / STRUCT_STEP);
  const out: Structure[] = [];
  for (let dz = -rings; dz <= rings; dz++) for (let dx = -rings; dx <= rings; dx++) {
    const s = structureAt(w, gx + dx, gz + dz);
    if (s) out.push(s);
  }
  return out;
}

/** Spiral search for the nearest structure of a kind (and zone) — QA / tests. */
export function findStructure(w: StructWorld, kind: StructKind, zone?: ZoneId, maxRing = 40, fromX = 0, fromZ = 0): Structure | null {
  const gx0 = Math.floor(fromX / STRUCT_STEP);
  const gz0 = Math.floor(fromZ / STRUCT_STEP);
  for (let ring = 0; ring <= maxRing; ring++) {
    for (let dz = -ring; dz <= ring; dz++) for (let dx = -ring; dx <= ring; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
      if (cellKind(w.seed, gx0 + dx, gz0 + dz) !== kind) continue;
      const s = structureAt(w, gx0 + dx, gz0 + dz);
      if (s && s.kind === kind && (!zone || s.zone === zone)) return s;
    }
  }
  return null;
}

export function structureLabel(s: Structure): string {
  const z = ZONES[s.zone].label;
  if (s.kind === "village") return s.zone === "desertCity" ? "Cité du désert" : "Village — " + z;
  if (s.kind === "shrine") return "Sanctuaire — " + z;
  if (s.kind === "mecha") return "Mécha abandonné";
  if (s.kind === "hidden") return "Caveau caché";
  return POI_LABEL[s.zone];
}

// ---------------------------------------------------------------- loot

const POI_LOOT: Record<ZoneId, LootKind> = {
  jungle: "ruin", desert: "tomb", arctic: "cairn", volcano: "ruin", valley: "shrine", plains: "camp",
  mountain: "mine", swamp: "camp", canyon: "outpost", desertCity: "tomb", islands: "wreck",
};

/** The structure (if any) that owns the crate at (x, y, z). */
export function structureOwning(w: StructWorld, x: number, y: number, z: number): Structure | null {
  for (const s of structuresNear(w, x, z, 1)) {
    if (x < s.x - 1 || x > s.x + s.w || z < s.z - 1 || z > s.z + s.d) continue;
    if (y < s.y - 20 || y > s.y + 32) continue;
    return s;
  }
  return null;
}

/** Loot pool for a crate inside a structure, or null when it is not one of ours. */
export function structureLootKind(s: Structure): LootKind {
  if (s.kind === "village") return "hamlet";
  if (s.kind === "shrine") return "sanctum";
  if (s.kind === "mecha") return "mecha";
  if (s.kind === "hidden") return "vault";
  return POI_LOOT[s.zone];
}

/** Zone signature material: the first drop of the zone's first species. */
export function zoneMaterial(zone: ZoneId): number {
  for (const m of ZONES[zone].mobs) {
    const sp = m.species ? SPECIES_BY_ID.get(m.species) : undefined;
    if (sp) return sp.drops[0];
  }
  return ZONES[zone].boss.drops[0];
}

/** Fill a fresh structure crate: the pool table, then the structure's
 *  signature pieces (deterministic from position + seed). */
export function stockStructureChest(bin: { ids: number[]; ns: number[] }, x: number, y: number, z: number, seed: number, s: Structure) {
  if (bin.ids.some((id) => id > 0)) return;
  stockChest(bin, x, y, z, seed, structureLootKind(s));
  const add = (id: number, n = 1) => {
    const slot = bin.ids.findIndex((v) => !v);
    if (slot < 0) return;
    bin.ids[slot] = id;
    bin.ns[slot] = n;
  };
  const roll = (salt: number) => hash3(x, y, z, seed + 3300 + salt);
  const pick = <T>(arr: readonly T[], v: number) => arr[Math.floor(v * arr.length) % arr.length];
  if (s.kind === "village") {
    if (roll(1) > 0.5) add(zoneMaterial(s.zone), 1 + Math.floor(roll(2) * 2));
  } else if (s.kind === "shrine") {
    add(zoneMaterial(s.zone), 2);
    if (roll(3) > 0.55) add(ID.SanctumStud);
  } else if (s.kind === "mecha") {
    add(pick(DEBRIS_ADVANCED, roll(4)));
    if (roll(5) > 0.6) add(ID.MechaCore);
  } else if (s.kind === "hidden") {
    add(pick(DEBRIS_RARE, roll(6)));
    add(roll(7) > 0.5 ? ID.SanctumStud : ID.MechaCore);
  }
}
