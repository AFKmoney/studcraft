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
  dungeon: [
    [ID.Gold, 3],
    [ID.Emerald, 2],
    [ID.Diamond, 1],
    [ID.Book, 2],
    [ID.Torch, 6],
    [ID.Lantern, 1],
    [ID.Ingot, 2],
    [ID.Obsidian, 1],
    [ID.Gapple, 1],
    [ID.Bone, 2],
    [ID.Pellets, 4],
    [ID.PlasticIngot, 2],
    [ID.TemperedIngot, 1],
    [ID.PlasticPick, 1],
    [ID.PlasticSword, 1],
    [ID.TPlasticPick, 1],
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
  pyramid: [
    [ID.Gold, 4],
    [ID.Emerald, 3],
    [ID.PharaohGold, 1],
    [ID.Bone, 5],
    [ID.Diamond, 1],
    [ID.Gapple, 1],
    [ID.Saddle, 1],
    [ID.TNT, 2],
    [ID.Book, 2],
  ],
  temple: [
    [ID.Emerald, 3],
    [ID.Gold, 3],
    [ID.Diamond, 1],
    [ID.Arrow, 10],
    [ID.Bone, 4],
    [ID.Moss, 6],
    [ID.Fang, 2],
    [ID.Book, 2],
  ],
  witch_hut: [
    [ID.WitchVenom, 1],
    [ID.PotionHeal, 1],
    [ID.PotionRegen, 1],
    [ID.SplashVenom, 1],
    [ID.Wisp, 2],
    [ID.Wart, 3],
    [ID.Bottle, 3],
    [ID.MushroomRed, 3],
    [ID.Eye, 1],
  ],
  castle: [
    [ID.Ingot, 5],
    [ID.Gold, 3],
    [ID.Emerald, 3],
    [ID.IllagerBadge, 1],
    [ID.Shield, 1],
    [ID.Crossbow, 1],
    [ID.Arrow, 12],
    [ID.Bread, 4],
    [ID.Gapple, 1],
    [ID.Book, 2],
  ],
  mansion: [
    [ID.Emerald, 4],
    [ID.IllagerBadge, 1],
    [ID.Book, 3],
    [ID.Diamond, 1],
    [ID.Totem, 1],
    [ID.Gold, 3],
    [ID.AxeI, 1],
    [ID.Crossbow, 1],
    [ID.Lantern, 2],
  ],
  monument: [
    [ID.Prism, 3],
    [ID.GuardianSpike, 2],
    [ID.Gold, 4],
    [ID.Scale, 3],
    [ID.Shell, 3],
    [ID.Core, 1],
    [ID.CookedFish, 4],
    [ID.PotionGill, 1],
  ],
};

export type LootKind =
  | SiteKind
  | "wild"
  | "hamlet"
  | "deep"
  | "nether"
  | "pyramid"
  | "temple"
  | "witch_hut"
  | "castle"
  | "mansion"
  | "monument";

export function stockChest(bin: { ids: number[]; ns: number[] }, x: number, y: number, z: number, seed: number, kind: LootKind) {
  if (bin.ids.some((id) => id > 0)) return;
  const table = TABLES[kind] ?? TABLES.wild;
  const isMajor =
    kind === "pyramid" ||
    kind === "temple" ||
    kind === "witch_hut" ||
    kind === "castle" ||
    kind === "mansion" ||
    kind === "monument" ||
    kind === "dungeon";
  const n = (isMajor ? 5 : 3) + Math.floor(hash2(x, z, seed + y + 17) * 3);
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
  // R3/P6: the boss "moulds" are Foundry recipes, not items — a dungeon chest's
  // rare bonus is therefore one of the materials those recipes consume, so the
  // dungeon feeds the mould loop while the level gates (12/16/22) stay intact.
  const DUNGEON_BOSS_MATS = [ID.Fang, ID.Cinder, ID.Prism, ID.Sapphire, ID.Scale, ID.GuardianSpike, ID.PharaohGold];
  if ((kind === "deep" || kind === "mine" || kind === "shrine" || isMajor) && hash3(x, y, z, seed + 333) > 0.72) {
    const slot = bin.ids.findIndex((id) => !id);
    if (slot >= 0) {
      bin.ids[slot] =
        kind === "shrine"
          ? ID.Eye
          : kind === "pyramid"
            ? ID.PharaohGold
            : kind === "witch_hut"
              ? ID.WitchVenom
              : kind === "monument"
                ? ID.GuardianSpike
                : kind === "castle" || kind === "mansion"
                  ? ID.IllagerBadge
                  : kind === "dungeon"
                    ? DUNGEON_BOSS_MATS[Math.floor(hash3(x, y + 99, z, seed + 777) * DUNGEON_BOSS_MATS.length) % DUNGEON_BOSS_MATS.length]
                    : ID.Diamond;
      bin.ns[slot] = 1;
    }
  }
  // Music discs (v3.8): the rare prize of deep and nether chests.
  if ((kind === "deep" && hash3(x, y, z, seed + 334) > 0.88) || (kind === "nether" && hash3(x, y, z, seed + 335) > 0.9)) {
    const slot = bin.ids.findIndex((id) => !id);
    if (slot >= 0) {
      const discs = [ID.DiscA, ID.DiscB, ID.DiscC, ID.DiscD, ID.DiscE];
      bin.ids[slot] = discs[Math.floor(hash3(x + 9, y, z + 9, seed + 336) * discs.length) % discs.length];
      bin.ns[slot] = 1;
    }
  }
}
