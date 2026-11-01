/**
 * Farming rules (Philippe t79u) — pure, testable. game.ts feeds a block
 * getter; nothing here touches three.js or the save.
 *
 *  - Hoe tills grass/dirt to farmland; farmland within 4 blocks of water
 *    (same level or one above) is HYDRATED. Dry farmland with nothing
 *    planted slowly reverts to dirt.
 *  - Crops grow in stages on random ticks: chance scales with light
 *    (needs ≥ 9: open sky by day, or a light block close by) and doubles
 *    when hydrated (rain counts as water).
 *  - Stems keep living and drop a fruit on a free neighbour cell.
 *  - Cane / cactus grow up to 3 tall; berry bushes ripen in 2 stages.
 *  - Fertilizer (or bone) jumps one stage; harvest drops crop + seeds.
 *  - Landing hard on farmland (or a mob walking on it, rarely) tramples it.
 */
export type Get = (x: number, y: number, z: number) => number;

export type FarmIds = {
  Air: number; Water: number; Dirt: number; Grass: number; Farmland: number; Sand: number;
  Crop: number; Crop1: number; Crop2: number; CropRipe: number;
  CarrotCrop: number; CarrotRipe: number; PotatoCrop: number; PotatoRipe: number; BeetCrop: number; BeetRipe: number;
  PumpkinStem: number; MelonStem: number; Pumpkin: number; Melon: number;
  Cane: number; Cactus: number; BerryYoung: number; Berry: number;
  Seeds: number; Wheat: number; Carrot: number; Potato: number; Beetroot: number; BeetSeeds: number;
};

export const HYDRATE_R = 4;
export const MIN_LIGHT = 9;
export const STACK_MAX = 3;

export function hydrated(get: Get, I: FarmIds, x: number, y: number, z: number, raining = false): boolean {
  if (raining) return true;
  for (let dy = 0; dy <= 1; dy++)
    for (let dz = -HYDRATE_R; dz <= HYDRATE_R; dz++)
      for (let dx = -HYDRATE_R; dx <= HYDRATE_R; dx++) if (get(x + dx, y + dy, z + dz) === I.Water) return true;
  return false;
}

/** Light level 0..15 from sky exposure, daylight (0..1) and a nearby lamp. */
export function cropLight(skyOpen: boolean, day: number, lampNear: boolean): number {
  const sky = skyOpen ? Math.round(15 * Math.max(0, Math.min(1, day))) : 0;
  return Math.max(sky, lampNear ? 13 : 0);
}

export function growChance(light: number, wet: boolean): number {
  if (light < MIN_LIGHT) return 0;
  const base = 0.18 + 0.02 * (light - MIN_LIGHT);
  return Math.min(0.95, wet ? base * 2 : base);
}

/** Next stage of a farmland crop (same id when it does not advance). */
export function nextStage(I: FarmIds, id: number): number {
  switch (id) {
    case I.Crop: return I.Crop1;
    case I.Crop1: return I.Crop2;
    case I.Crop2: return I.CropRipe;
    case I.CarrotCrop: return I.CarrotRipe;
    case I.PotatoCrop: return I.PotatoRipe;
    case I.BeetCrop: return I.BeetRipe;
    case I.BerryYoung: return I.Berry;
    default: return id;
  }
}

export const isFarmCrop = (I: FarmIds, id: number) =>
  id === I.Crop || id === I.Crop1 || id === I.Crop2 || id === I.CropRipe || id === I.CarrotCrop || id === I.CarrotRipe ||
  id === I.PotatoCrop || id === I.PotatoRipe || id === I.BeetCrop || id === I.BeetRipe || id === I.PumpkinStem || id === I.MelonStem;
export const isRipe = (I: FarmIds, id: number) => id === I.CropRipe || id === I.CarrotRipe || id === I.PotatoRipe || id === I.BeetRipe || id === I.Berry;

/** Free neighbour for a stem's fruit: air over dirt/grass/farmland. */
export function fruitSpot(get: Get, I: FarmIds, x: number, y: number, z: number, r = Math.random): [number, number, number] | null {
  const n: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const start = Math.floor(r() * 4);
  for (let k = 0; k < 4; k++) {
    const [dx, dz] = n[(start + k) % 4];
    const fx = x + dx, fz = z + dz;
    const f = get(fx, y, fz);
    if (f === I.Pumpkin || f === I.Melon) return null; // one fruit at a time
  }
  for (let k = 0; k < 4; k++) {
    const [dx, dz] = n[(start + k) % 4];
    const below = get(x + dx, y - 1, z + dz);
    if (get(x + dx, y, z + dz) === I.Air && (below === I.Dirt || below === I.Grass || below === I.Farmland)) return [x + dx, y, z + dz];
  }
  return null;
}

/** Column plants (cane, cactus): may grow one block on top? */
export function canStack(get: Get, I: FarmIds, id: number, x: number, y: number, z: number): boolean {
  if (get(x, y + 1, z) !== I.Air) return false;
  let h = 1;
  while (get(x, y - h, z) === id) h++;
  if (h >= STACK_MAX) return false;
  const soil = get(x, y - h, z);
  if (id === I.Cane) {
    if (soil !== I.Sand && soil !== I.Dirt && soil !== I.Grass) return false;
    const by = y - h;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (get(x + dx, by, z + dz) === I.Water) return true;
    return false;
  }
  if (id === I.Cactus) {
    if (soil !== I.Sand) return false;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (get(x + dx, y + 1, z + dz) !== I.Air) return false;
    return true;
  }
  return false;
}

/** Harvest drops [id, n][] for a broken crop block. r = rng. */
export function harvestDrops(I: FarmIds, id: number, r = Math.random): [number, number][] {
  const seeds = 1 + Math.floor(r() * 3);
  if (id === I.CropRipe) return [[I.Wheat, 1], [I.Seeds, seeds]];
  if (id === I.Crop || id === I.Crop1 || id === I.Crop2) return [[I.Seeds, 1]];
  if (id === I.CarrotRipe) return [[I.Carrot, 2 + Math.floor(r() * 3)]];
  if (id === I.PotatoRipe) return [[I.Potato, 2 + Math.floor(r() * 3)]];
  if (id === I.CarrotCrop) return [[I.Carrot, 1]];
  if (id === I.PotatoCrop) return [[I.Potato, 1]];
  if (id === I.BeetRipe) return [[I.Beetroot, 1], [I.BeetSeeds, seeds]];
  if (id === I.BeetCrop) return [[I.BeetSeeds, 1]];
  if (id === I.PumpkinStem) return [[I.Pumpkin, 1]]; // the fruit is its own seed
  if (id === I.MelonStem) return [[I.Melon, 1]];
  if (id === I.Berry) return [[I.Berry, 2 + Math.floor(r() * 2)]];
  return [];
}

/** Fall speed (blocks/s, positive down) that tramples farmland. */
export const TRAMPLE_V = 6.5;
export const tramples = (fallV: number, r = Math.random) => fallV >= TRAMPLE_V && r() < 0.75;

/** Composter: chance one item raises the level; full at COMPOST_FULL. */
export const COMPOST_FULL = 3;
export function compostChance(I: FarmIds & { Leaves: number; Sapling: number; TallGrass: number; Flower: number; Hay: number; Bread: number }, id: number): number {
  if (id === I.Leaves || id === I.Sapling || id === I.TallGrass || id === I.Seeds || id === I.BeetSeeds) return 0.3;
  if (id === I.Wheat || id === I.Cane || id === I.Cactus || id === I.Flower || id === I.Berry) return 0.5;
  if (id === I.Carrot || id === I.Potato || id === I.Beetroot || id === I.Pumpkin || id === I.Melon) return 0.65;
  if (id === I.Hay || id === I.Bread) return 0.85;
  return 0;
}

/** Breeding foods per animal kind. */
export const BREED_FOOD: Record<string, readonly string[]> = {
  cow: ["Wheat"], sheep: ["Wheat"], goat: ["Wheat"], pig: ["Carrot", "Potato", "Beetroot"], chicken: ["Seeds"],
  horse: ["Wheat", "Apple", "Hay", "Gapple"], fox: ["Berry"], wolf: ["Cooked", "CookedFish"], frog: ["Slime"], crab: ["Fish"],
};
export const BABY_GROW = 50; // seconds as a baby
