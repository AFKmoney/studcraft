import { ID } from "./blocks";

export type Perk = {
  level: number;
  name: string;
  detail: string;
};

export const PERKS: Perk[] = [
  { level: 2, name: "Steady hands", detail: "Mine 15% faster" },
  { level: 4, name: "Light pack", detail: "Hunger drains slower" },
  { level: 6, name: "Ore ear", detail: "Breaking stone whispers nearby rare studs" },
  { level: 8, name: "Thick shell", detail: "Hits land softer" },
  { level: 10, name: "Deep lungs", detail: "Hold a breath longer" },
  { level: 12, name: "Long stride", detail: "Sprint carries farther" },
  { level: 15, name: "Soft land", detail: "Falls hurt less" },
  { level: 18, name: "Keen edge", detail: "Blades bite for +1" },
  { level: 22, name: "Master mason", detail: "New tools last longer. Master brick unlocks" },
];

const TITLES = [
  "Bricklet",
  "Apprentice",
  "Stud hand",
  "Mason",
  "Foreman",
  "Smith",
  "Architect",
  "Rune wright",
  "Master builder",
  "Legend",
];

export function xpNeed(level: number): number {
  if (level < 6) return 10 + level * 4;
  if (level < 14) return 34 + (level - 6) * 8;
  return 98 + (level - 14) * 14;
}

export function rankTitle(level: number): string {
  if (level < TITLES.length) return TITLES[level];
  return "Mythic " + (level - TITLES.length + 1);
}

export function nextPerk(level: number): Perk | null {
  return PERKS.find((perk) => perk.level > level) ?? null;
}

export type CodexEntry = {
  id: number;
  where: string;
  use: string;
  lvl: number;
};

export const CODEX: CodexEntry[] = [
  { id: ID.TinOre, where: "Mid stone, under the hills", use: "Smelt into tin. Half of bronze.", lvl: 0 },
  { id: ID.CopperOre, where: "Mid stone, a little deeper than tin", use: "Smelt into copper. Half of bronze.", lvl: 0 },
  { id: ID.Tin, where: "Kiln", use: "Alloy with copper.", lvl: 0 },
  { id: ID.Copper, where: "Kiln", use: "Alloy with tin.", lvl: 0 },
  { id: ID.Bronze, where: "Craft one tin and one copper", use: "Bronze pick, blade, and axe. Level 4.", lvl: 4 },
  { id: ID.AmberOre, where: "Deeper caves", use: "Smelt into amber. Long fuel and focus brew.", lvl: 6 },
  { id: ID.Amber, where: "Kiln", use: "Burns longer than coal. Brews focus.", lvl: 6 },
  { id: ID.ChromeOre, where: "Low stone", use: "Smelt into chrome. Tools and a mirror brick.", lvl: 8 },
  { id: ID.Chrome, where: "Kiln", use: "Chrome pick, cap, and chrome brick.", lvl: 8 },
  { id: ID.SapphireOre, where: "Deep stone", use: "Smelt into sapphire.", lvl: 12 },
  { id: ID.Sapphire, where: "Kiln", use: "Sapphire blade. Level 12.", lvl: 12 },
  { id: ID.ResinOre, where: "Nether floor, and the deepest cracks", use: "Smelt into resin. Grip boots ignore ice.", lvl: 10 },
  { id: ID.Resin, where: "Kiln or the nether", use: "Grip boots. Level 10.", lvl: 10 },
  { id: ID.PrismOre, where: "Next to the baseplate core, and the End", use: "Smelt into prism. Sometimes drops a stud core.", lvl: 16 },
  { id: ID.Prism, where: "Kiln", use: "Prism pick and shell. Level 16.", lvl: 16 },
  { id: ID.Core, where: "Rare extra from prism ore", use: "Eat it. Feeds you and pours studs into the rank bar.", lvl: 0 },
  { id: ID.MasterBrick, where: "Craft prism, sapphire, chrome, and resin", use: "Level 22. Feeds the master pick.", lvl: 22 },
  { id: ID.ChromeBrick, where: "Nine chrome", use: "A mirror brick you can build with.", lvl: 8 },
  { id: ID.Focus, where: "Bottle plus amber, level 6", use: "Drink for studs and a short dash.", lvl: 6 },
];

export const DISCOVER = new Set(CODEX.map((entry) => entry.id));

export const ORE_XP: Record<number, number> = {
  [ID.Coal]: 1,
  [ID.IronOre]: 2,
  [ID.Gold]: 3,
  [ID.EmeraldOre]: 4,
  [ID.Diamond]: 6,
  [ID.TinOre]: 2,
  [ID.CopperOre]: 3,
  [ID.AmberOre]: 4,
  [ID.ChromeOre]: 6,
  [ID.SapphireOre]: 8,
  [ID.ResinOre]: 7,
  [ID.PrismOre]: 12,
};

export const ORE_HEAR: Record<number, string> = {
  [ID.TinOre]: "tin",
  [ID.CopperOre]: "copper",
  [ID.AmberOre]: "amber",
  [ID.ChromeOre]: "chrome",
  [ID.SapphireOre]: "sapphire",
  [ID.ResinOre]: "resin",
  [ID.PrismOre]: "prism",
  [ID.Diamond]: "aqua gem",
  [ID.EmeraldOre]: "trade gem",
  [ID.Gold]: "gold",
};

export const MOB_XP: Record<string, number> = {
  sheep: 2,
  cow: 3,
  pig: 2,
  chicken: 1,
  spider: 4,
  skelly: 5,
  walker: 5,
  creeper: 6,
  ghast: 10,
  piglin: 7,
  phantom: 6,
  dragon: 40,
  villager: 2,
};
