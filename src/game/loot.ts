import { ID } from "./blocks";
import { hash2, hash3 } from "./noise";
import type { SiteKind } from "./sites";

type Stack = [number, number];

const TABLES: Record<string, Stack[]> = {
  wild: [
    [ID.Bread, 2],
    [ID.Torch, 4],
    [ID.Apple, 2],
    [ID.Seeds, 3],
    [ID.Coal, 3],
    [ID.Stick, 5],
  ],
  hamlet: [
    [ID.Bread, 3],
    [ID.Emerald, 1],
    [ID.Seeds, 4],
    [ID.Apple, 3],
    [ID.Wheat, 4],
    [ID.Torch, 6],
    [ID.Book, 1],
    [ID.Carrot, 3],
    [ID.Potato, 3],
    [ID.BakedPotato, 2],
    [ID.Planks, 8],
  ],
  ruin: [
    [ID.Cobble, 6],
    [ID.Bone, 3],
    [ID.Emerald, 2],
    [ID.Ingot, 2],
    [ID.SwordS, 1],
    [ID.Coal, 4],
    [ID.Moss, 4],
    [ID.Paper, 2],
  ],
  camp: [
    [ID.Bread, 3],
    [ID.Cooked, 2],
    [ID.Torch, 4],
    [ID.Seeds, 3],
    [ID.Fur, 1],
    [ID.Campfire, 1],
  ],
  wreck: [
    [ID.Fish, 3],
    [ID.String, 3],
    [ID.Planks, 6],
    [ID.Stick, 4],
    [ID.Bottle, 2],
    [ID.Scale, 1],
    [ID.Paper, 1],
  ],
  mine: [
    [ID.Torch, 8],
    [ID.Coal, 5],
    [ID.RawIron, 3],
    [ID.Rail, 4],
    [ID.Cobble, 8],
    [ID.Ladder, 4],
    [ID.PickS, 1],
    [ID.Lantern, 1],
  ],
  shrine: [
    [ID.Bottle, 2],
    [ID.Wisp, 1],
    [ID.Amber, 1],
    [ID.Crystal, 1],
    [ID.Book, 1],
    [ID.Lantern, 1],
    [ID.Emerald, 2],
  ],
  cairn: [
    [ID.Cookie, 4],
    [ID.Frost, 2],
    [ID.Fur, 2],
    [ID.Bread, 2],
    [ID.IceSheet, 1],
    [ID.Lantern, 1],
  ],
  outpost: [
    [ID.Arrow, 8],
    [ID.String, 3],
    [ID.Scrap, 1],
    [ID.Emerald, 2],
    [ID.Bread, 2],
    [ID.Bow, 1],
    [ID.Horn, 1],
  ],
  patch: [
    [ID.Pumpkin, 2],
    [ID.Melon, 1],
    [ID.Seeds, 4],
    [ID.Wheat, 5],
    [ID.Mushroom, 2],
    [ID.Bread, 2],
    [ID.Honey, 1],
  ],
  tomb: [
    [ID.Gold, 2],
    [ID.Bone, 3],
    [ID.Emerald, 2],
    [ID.Cactus, 2],
    [ID.Ingot, 1],
    [ID.Arrow, 6],
    [ID.Sand, 8],
  ],
  reef: [
    [ID.Fish, 4],
    [ID.Prism, 1],
    [ID.Scale, 2],
    [ID.String, 3],
    [ID.Bottle, 2],
    [ID.Emerald, 1],
    [ID.Clay, 4],
  ],
  deep: [
    [ID.Gold, 2],
    [ID.Coal, 6],
    [ID.RawIron, 4],
    [ID.Torch, 6],
    [ID.Obsidian, 1],
    [ID.Bone, 3],
  ],
  nether: [
    [ID.Blaze, 1],
    [ID.Scrap, 2],
    [ID.Gold, 3],
    [ID.Netherrack, 8],
    [ID.PotionHeal, 1],
    [ID.Wart, 2],
  ],
};

export type LootKind = SiteKind | "wild" | "hamlet" | "deep" | "nether";

export function stockChest(bin: { ids: number[]; ns: number[] }, x: number, y: number, z: number, seed: number, kind: LootKind) {
  if (bin.ids.some((id) => id > 0)) return;
  const table = TABLES[kind] ?? TABLES.wild;
  const n = 3 + Math.floor(hash2(x, z, seed + y + 17) * 3);
  for (let i = 0; i < n; i++) {
    const roll = hash3(x, y + i * 5, z, seed + 90 + i);
    const stack = table[Math.floor(roll * table.length) % table.length];
    if (!stack) continue;
    let slot = Math.floor(hash3(x + 4, y, z + i * 7, seed + 11) * 27) % 27;
    if (bin.ids[slot]) {
      const empty = bin.ids.findIndex((id) => !id);
      if (empty < 0) return;
      slot = empty;
    }
    bin.ids[slot] = stack[0];
    bin.ns[slot] = stack[1];
  }
  if ((kind === "deep" || kind === "mine" || kind === "shrine") && hash3(x, y, z, seed + 333) > 0.84) {
    const slot = bin.ids.findIndex((id) => !id);
    if (slot >= 0) {
      bin.ids[slot] = kind === "shrine" ? ID.Eye : ID.Diamond;
      bin.ns[slot] = 1;
    }
  }
}
