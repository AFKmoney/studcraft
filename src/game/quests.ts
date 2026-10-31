import { ID } from "./blocks";

export type Offer = { pay: number; pn: number; out: number; on: number; tier?: number; stock?: number };

/** Villager professions level up as you trade with that profession:
 *  tier-2 offers unlock at 4 trades, tier-3 (master) at 12. */
export const TIER_NAMES = ["", "Novice", "Journeyman", "Master"];
export const TIER_XP = [0, 4, 12];
export function tradeLevelFor(xp: number): number {
  return xp >= TIER_XP[2] ? 3 : xp >= TIER_XP[1] ? 2 : 1;
}

export type TraderRole = "grocer" | "smith" | "mason" | "herder" | "clerk" | "mage" | "ranger" | "mechanic" | "outfitter" | "fence";

export const TRADERS: Record<TraderRole, { name: string; blurb: string; offers: Offer[]; tint: number }> = {
  grocer: {
    name: "Grocer",
    blurb: "Grain in, loaves and seeds out.",
    tint: 0x3aaa4c,
    offers: [
      { pay: ID.Wheat, pn: 8, out: ID.Emerald, on: 1 },
      { pay: ID.Emerald, pn: 1, out: ID.Bread, on: 4 },
      { pay: ID.Emerald, pn: 1, out: ID.Seeds, on: 6 },
      { pay: ID.Apple, pn: 4, out: ID.Emerald, on: 1 },
      { pay: ID.Pumpkin, pn: 3, out: ID.Emerald, on: 1 },
      { pay: ID.Honey, pn: 2, out: ID.Emerald, on: 1 },
      { pay: ID.Wheat, pn: 16, out: ID.Emerald, on: 2, tier: 2 },
      { pay: ID.Emerald, pn: 2, out: ID.Honey, on: 3, tier: 2 },
      { pay: ID.Emerald, pn: 5, out: ID.Gapple, on: 1, tier: 3 },
      { pay: ID.Honey, pn: 6, out: ID.Emerald, on: 2, tier: 3 },
    ],
  },
  smith: {
    name: "Smith",
    blurb: "Coal and raw iron for studs. Tools for gems.",
    tint: 0xf07820,
    offers: [
      { pay: ID.Coal, pn: 8, out: ID.Emerald, on: 1 },
      { pay: ID.RawIron, pn: 4, out: ID.Emerald, on: 1 },
      { pay: ID.Emerald, pn: 3, out: ID.PlasticPick, on: 1 },
      { pay: ID.Emerald, pn: 5, out: ID.Ingot, on: 4 },
      { pay: ID.Coal, pn: 16, out: ID.Emerald, on: 2, tier: 2 },
      { pay: ID.Emerald, pn: 9, out: ID.Ingot, on: 8, tier: 2 },
      { pay: ID.Emerald, pn: 12, out: ID.TPlasticSword, on: 1, tier: 3 },
      { pay: ID.Emerald, pn: 22, out: ID.SwordSapph, on: 1, tier: 3 },
    ],
  },
  mason: {
    name: "Mason",
    blurb: "Glass, torches, and a lamp.",
    tint: 0xe23b2f,
    offers: [
      { pay: ID.Cobble, pn: 16, out: ID.Emerald, on: 1 },
      { pay: ID.Emerald, pn: 1, out: ID.Glass, on: 6 },
      { pay: ID.Emerald, pn: 2, out: ID.Torch, on: 8 },
      { pay: ID.Emerald, pn: 4, out: ID.Lamp, on: 1 },
      { pay: ID.Emerald, pn: 3, out: ID.Lantern, on: 2 },
      { pay: ID.Cobble, pn: 32, out: ID.Emerald, on: 2, tier: 2 },
      { pay: ID.Emerald, pn: 3, out: ID.Lamp, on: 2, tier: 2 },
      { pay: ID.Sand, pn: 16, out: ID.Emerald, on: 1, tier: 3 },
      { pay: ID.Emerald, pn: 4, out: ID.Lantern, on: 4, tier: 3 },
    ],
  },
  herder: {
    name: "Herder",
    blurb: "Wool, chops, and one saddle.",
    tint: 0x8d5a34,
    offers: [
      { pay: ID.White, pn: 8, out: ID.Emerald, on: 1 },
      { pay: ID.RawMeat, pn: 6, out: ID.Emerald, on: 1 },
      { pay: ID.Emerald, pn: 2, out: ID.Cooked, on: 6 },
      { pay: ID.Emerald, pn: 6, out: ID.Saddle, on: 1 },
      { pay: ID.Emerald, pn: 2, out: ID.Lead, on: 1, tier: 2 },
      { pay: ID.Emerald, pn: 3, out: ID.Fur, on: 2, tier: 2 },
      { pay: ID.RawMeat, pn: 14, out: ID.Emerald, on: 3, tier: 3 },
      { pay: ID.Emerald, pn: 4, out: ID.Cooked, on: 10, tier: 3 },
    ],
  },
  clerk: {
    name: "Clerk",
    blurb: "The quest board is also in your bin. Rare studs sit here.",
    tint: 0x1f5fbf,
    offers: [
      { pay: ID.Emerald, pn: 3, out: ID.Tin, on: 4 },
      { pay: ID.Emerald, pn: 6, out: ID.Amber, on: 2 },
      { pay: ID.Prism, pn: 1, out: ID.Emerald, on: 8 },
      { pay: ID.Emerald, pn: 8, out: ID.Eye, on: 1 },
      { pay: ID.Emerald, pn: 4, out: ID.Sapphire, on: 1, tier: 2 },
      { pay: ID.Emerald, pn: 3, out: ID.Book, on: 2, tier: 2 },
      { pay: ID.Emerald, pn: 12, out: ID.Prism, on: 1, tier: 3 },
      { pay: ID.Emerald, pn: 6, out: ID.Chrome, on: 2, tier: 3 },
    ],
  },
  mage: {
    name: "Mage",
    blurb: "Dust, bottles, and a tome if you already studied Spark.",
    tint: 0x7a4ad4,
    offers: [
      { pay: ID.Emerald, pn: 2, out: ID.Bottle, on: 3 },
      { pay: ID.Wisp, pn: 2, out: ID.Emerald, on: 1 },
      { pay: ID.Emerald, pn: 4, out: ID.Amber, on: 1 },
      { pay: ID.Emerald, pn: 6, out: ID.Tome, on: 1 },
      { pay: ID.Emerald, pn: 5, out: ID.Focus, on: 1, tier: 2 },
      { pay: ID.Wisp, pn: 4, out: ID.Emerald, on: 2, tier: 2 },
      { pay: ID.Emerald, pn: 9, out: ID.EnderPearl, on: 2, tier: 3 },
      { pay: ID.Emerald, pn: 7, out: ID.PotionRegen, on: 1, tier: 3 },
    ],
  },
  ranger: {
    name: "Ranger",
    blurb: "Arrows, string, and fur from the grove.",
    tint: 0x1d5526,
    offers: [
      { pay: ID.Emerald, pn: 1, out: ID.Arrow, on: 8 },
      { pay: ID.Feather, pn: 4, out: ID.Emerald, on: 1 },
      { pay: ID.Fur, pn: 3, out: ID.Emerald, on: 2 },
      { pay: ID.Emerald, pn: 5, out: ID.Bow, on: 1 },
      { pay: ID.Emerald, pn: 4, out: ID.Compass, on: 1 },
      { pay: ID.Emerald, pn: 3, out: ID.Arrow, on: 16, tier: 2 },
      { pay: ID.String, pn: 6, out: ID.Emerald, on: 2, tier: 2 },
      { pay: ID.Emerald, pn: 20, out: ID.Elytra, on: 1, tier: 3 },
      { pay: ID.Feather, pn: 10, out: ID.Emerald, on: 3, tier: 3 },
    ],
  },
  mechanic: {
    name: "Mechanic",
    blurb: "Teks parts, cast true. Whole vehicles off the stand — pay the matter it is made of, drive away.",
    tint: 0x71808f,
    offers: [
      { pay: ID.Copper, pn: 8, out: ID.Emerald, on: 1 },
      { pay: ID.Emerald, pn: 3, out: ID.Wheel, on: 1 },
      { pay: ID.Emerald, pn: 2, out: ID.Axle2, on: 2 },
      { pay: ID.Emerald, pn: 6, out: ID.Battery, on: 1, tier: 2 },
      { pay: ID.Emerald, pn: 8, out: ID.MotorM, on: 1, tier: 2 },
      { pay: ID.Emerald, pn: 10, out: ID.TechHub, on: 1, tier: 3 },
    ],
  },
  outfitter: {
    name: "Upgrades vendor",
    blurb: "Matter for your machine, tool and vehicle upgrades — paid in emeralds.",
    tint: 0x2f6fb0,
    offers: [
      { pay: ID.Emerald, pn: 2, out: ID.PlasticIngot, on: 2 },
      { pay: ID.Emerald, pn: 2, out: ID.Copper, on: 3 },
      { pay: ID.Emerald, pn: 3, out: ID.Gear16, on: 1 },
      { pay: ID.Emerald, pn: 5, out: ID.TemperedIngot, on: 1, tier: 2 },
      { pay: ID.Emerald, pn: 6, out: ID.Battery, on: 1, tier: 2 },
      { pay: ID.Emerald, pn: 9, out: ID.EnchBook, on: 1, tier: 3 },
    ],
  },
  fence: {
    name: "Fence",
    blurb: "No questions asked. Stolen goods in, emeralds out — at a cut.",
    tint: 0x3b3b3b,
    offers: [
      { pay: ID.Gold, pn: 3, out: ID.Emerald, on: 1 },
      { pay: ID.Ingot, pn: 5, out: ID.Emerald, on: 1 },
      { pay: ID.Diamond, pn: 1, out: ID.Emerald, on: 2 },
      { pay: ID.Crystal, pn: 2, out: ID.Emerald, on: 1 },
      { pay: ID.Battery, pn: 1, out: ID.Emerald, on: 2, tier: 2 },
      { pay: ID.Emerald, pn: 4, out: ID.TNT, on: 2, tier: 2 },
    ],
  },
};

export function traderOf(role: string | undefined) {
  if (role && role in TRADERS) return TRADERS[role as TraderRole];
  return TRADERS.grocer;
}

export type QuestDef = {
  id: string;
  chain?: string;
  name: string;
  detail: string;
  kind: "break" | "place" | "kill" | "have";
  tag: string;
  what: number;
  need: number;
  reward: [number, number][];
  xp: number;
  keep?: boolean;
};

export const QUESTS: QuestDef[] = [
  {
    id: "logs",
    chain: "master",
    name: "First posts",
    detail: "Chop 8 wood bricks.",
    kind: "break",
    tag: "log",
    what: ID.Log,
    need: 8,
    reward: [
      [ID.Bread, 4],
      [ID.Emerald, 2],
    ],
    xp: 6,
  },
  {
    id: "torches",
    chain: "master",
    name: "Light the lane",
    detail: "Place 6 torches anywhere.",
    kind: "place",
    tag: "torch",
    what: ID.Torch,
    need: 6,
    reward: [
      [ID.Lamp, 2],
      [ID.Emerald, 2],
    ],
    xp: 6,
  },
  {
    id: "wheat",
    chain: "provider",
    name: "Fill the grocer",
    detail: "Hold 12 grain, then claim. The grain is spent.",
    kind: "have",
    tag: "wheat",
    what: ID.Wheat,
    need: 12,
    reward: [
      [ID.Emerald, 4],
      [ID.Seeds, 4],
    ],
    xp: 8,
  },
  {
    id: "hunt",
    chain: "hunter",
    name: "Night watch",
    detail: "Drop 4 night studs, bone studs, or fuse bricks.",
    kind: "kill",
    tag: "host",
    what: 0,
    need: 4,
    reward: [
      [ID.PlasticSword, 1],
      [ID.Emerald, 3],
    ],
    xp: 10,
  },
  {
    id: "tin",
    chain: "master",
    name: "Tin for the smith",
    detail: "Hold 6 tin ore, then claim. The ore is spent.",
    kind: "have",
    tag: "tin",
    what: ID.TinOre,
    need: 6,
    reward: [
      [ID.Bronze, 4],
      [ID.Emerald, 3],
    ],
    xp: 8,
  },
  {
    id: "gem",
    chain: "master",
    name: "Deep stud",
    detail: "Hold an aqua gem or a prism, then claim. One is spent.",
    kind: "have",
    tag: "gem",
    what: ID.Diamond,
    need: 1,
    reward: [
      [ID.Emerald, 8],
      [ID.Focus, 1],
    ],
    xp: 14,
  },
  {
    id: "moss",
    chain: "wilds",
    name: "Fen posts",
    detail: "Break 8 moss bricks. Fens sit low and wet.",
    kind: "break",
    tag: "moss",
    what: ID.Moss,
    need: 8,
    reward: [
      [ID.Seeds, 6],
      [ID.Emerald, 2],
    ],
    xp: 6,
  },
  {
    id: "snow",
    chain: "wilds",
    name: "Cap the ridge",
    detail: "Break 8 snow bricks on a snow cap.",
    kind: "break",
    tag: "snow",
    what: ID.Snow,
    need: 8,
    reward: [
      [ID.Cookie, 6],
      [ID.Wisp, 1],
    ],
    xp: 6,
  },
  {
    id: "ash",
    chain: "wilds",
    name: "Ash course",
    detail: "Break 8 ash bricks. Dry hot ridges.",
    kind: "break",
    tag: "ash",
    what: ID.Ash,
    need: 8,
    reward: [
      [ID.Coal, 4],
      [ID.Emerald, 2],
    ],
    xp: 6,
  },
  {
    id: "clay",
    chain: "wilds",
    name: "Shore clay",
    detail: "Break 6 clay bricks along a shore.",
    kind: "break",
    tag: "clay",
    what: ID.Clay,
    need: 6,
    reward: [
      [ID.Emerald, 2],
      [ID.Bread, 3],
    ],
    xp: 4,
  },
  {
    id: "web",
    chain: "wilds",
    name: "Cut the web",
    detail: "Drop 3 crawlers.",
    kind: "kill",
    tag: "spider",
    what: 0,
    need: 3,
    reward: [
      [ID.String, 6],
      [ID.Emerald, 2],
    ],
    xp: 6,
  },
  {
    id: "frogs",
    chain: "hunter",
    name: "Fen chorus",
    detail: "Drop 3 hop studs.",
    kind: "kill",
    tag: "frog",
    what: 0,
    need: 3,
    reward: [
      [ID.Slime, 4],
      [ID.Emerald, 2],
    ],
    xp: 6,
  },
  {
    id: "foxes",
    chain: "hunter",
    name: "Grove tails",
    detail: "Drop 2 brush studs.",
    kind: "kill",
    tag: "fox",
    what: 0,
    need: 2,
    reward: [
      [ID.Fur, 4],
      [ID.Emerald, 2],
    ],
    xp: 6,
  },
  {
    id: "crabs",
    chain: "hunter",
    name: "Tide pinch",
    detail: "Drop 3 pinch studs on sand or shore.",
    kind: "kill",
    tag: "crab",
    what: 0,
    need: 3,
    reward: [
      [ID.Scale, 4],
      [ID.Fish, 2],
    ],
    xp: 6,
  },
  {
    id: "wisps",
    chain: "master",
    name: "Night dust",
    detail: "Drop 3 wisp studs after dark, in fen, grove, or snow.",
    kind: "kill",
    tag: "wisp",
    what: 0,
    need: 3,
    reward: [
      [ID.Wisp, 3],
      [ID.Bottle, 2],
    ],
    xp: 8,
  },
  {
    id: "bones",
    chain: "wilds",
    name: "Bone pile",
    detail: "Hold 6 bones, then claim. The bones are spent.",
    kind: "have",
    tag: "bone",
    what: ID.Bone,
    need: 6,
    reward: [
      [ID.Emerald, 3],
      [ID.Arrow, 8],
    ],
    xp: 6,
  },
  {
    id: "tome",
    chain: "master",
    name: "Open the tome",
    detail: "Hold a spell tome. It is not spent.",
    kind: "have",
    tag: "tome",
    what: ID.Tome,
    need: 1,
    keep: true,
    reward: [
      [ID.Emerald, 4],
      [ID.Wisp, 2],
    ],
    xp: 10,
  },
  {
    id: "cactus",
    chain: "wilds",
    name: "Ridge spines",
    detail: "Break 4 cactus studs on an ash ridge.",
    kind: "break",
    tag: "cactus",
    what: ID.Cactus,
    need: 4,
    reward: [
      [ID.Cinder, 3],
      [ID.Emerald, 2],
    ],
    xp: 6,
  },
  {
    id: "reeds",
    chain: "wilds",
    name: "Cut the fen",
    detail: "Break 6 reeds.",
    kind: "break",
    tag: "reed",
    what: ID.Reed,
    need: 6,
    reward: [
      [ID.Stick, 8],
      [ID.Seeds, 4],
    ],
    xp: 4,
  },
  {
    id: "crystal",
    chain: "master",
    name: "Shard ear",
    detail: "Hold 4 crystals, then claim. They are spent.",
    kind: "have",
    tag: "crystal",
    what: ID.Crystal,
    need: 4,
    reward: [
      [ID.Emerald, 5],
      [ID.Eye, 1],
    ],
    xp: 10,
  },
  {
    id: "bloom",
    chain: "wilds",
    name: "Grove press",
    detail: "Break 6 blooms.",
    kind: "break",
    tag: "bloom",
    what: ID.Bloom,
    need: 6,
    reward: [
      [ID.Wax, 3],
      [ID.Emerald, 2],
    ],
    xp: 4,
  },
  {
    id: "pelt",
    chain: "wilds",
    name: "Winter pile",
    detail: "Hold 3 pelts, then claim. They are spent.",
    kind: "have",
    tag: "pelt",
    what: ID.Pelt,
    need: 3,
    reward: [
      [ID.FurCap, 1],
      [ID.Emerald, 2],
    ],
    xp: 8,
  },
  {
    id: "seal",
    chain: "master",
    name: "Wax the board",
    detail: "Hold a wax seal. It is not spent.",
    kind: "have",
    tag: "seal",
    what: ID.WaxSeal,
    need: 1,
    keep: true,
    reward: [
      [ID.Emerald, 4],
      [ID.Bottle, 2],
    ],
    xp: 8,
  },
  {
    id: "slimes",
    chain: "hunter",
    name: "Split the stud",
    detail: "Drop 4 slime bricks. Big ones split into smaller studs.",
    kind: "kill",
    tag: "slime",
    what: 0,
    need: 4,
    reward: [
      [ID.Slime, 6],
      [ID.Emerald, 2],
    ],
    xp: 6,
  },
  {
    id: "gourds",
    chain: "provider",
    name: "Orange course",
    detail: "Break 4 pumpkins. Plains and grove patches grow them.",
    kind: "break",
    tag: "pumpkin",
    what: ID.Pumpkin,
    need: 4,
    reward: [
      [ID.Pie, 2],
      [ID.Emerald, 2],
    ],
    xp: 6,
  },
  {
    id: "melons",
    chain: "provider",
    name: "Green rind",
    detail: "Break 4 melons.",
    kind: "break",
    tag: "melon",
    what: ID.Melon,
    need: 4,
    reward: [
      [ID.MelonCut, 8],
      [ID.Emerald, 2],
    ],
    xp: 6,
  },
  {
    id: "shrooms",
    chain: "provider",
    name: "Cap pick",
    detail: "Break 6 mushrooms. Caves and fens.",
    kind: "break",
    tag: "shroom",
    what: ID.Mushroom,
    need: 6,
    reward: [
      [ID.Stew, 2],
      [ID.Emerald, 2],
    ],
    xp: 6,
  },
  {
    id: "webs",
    chain: "wilds",
    name: "Cut the mine",
    detail: "Break 4 webs. Mines hang them in the dark.",
    kind: "break",
    tag: "web",
    what: ID.Web,
    need: 4,
    reward: [
      [ID.String, 8],
      [ID.Torch, 8],
    ],
    xp: 6,
  },
  {
    id: "goats",
    chain: "hunter",
    name: "Ridge horns",
    detail: "Drop 2 ridge goats on a snow cap.",
    kind: "kill",
    tag: "goat",
    what: 0,
    need: 2,
    reward: [
      [ID.Horn, 1],
      [ID.Emerald, 3],
    ],
    xp: 8,
  },
  {
    id: "bees",
    chain: "provider",
    name: "Comb run",
    detail: "Drop 3 stud bees in a grove or on the plains.",
    kind: "kill",
    tag: "bee",
    what: 0,
    need: 3,
    reward: [
      [ID.Honey, 2],
      [ID.Wax, 3],
    ],
    xp: 6,
  },
  {
    id: "turtles",
    chain: "hunter",
    name: "Slow shells",
    detail: "Drop 2 shore turtles.",
    kind: "kill",
    tag: "turtle",
    what: 0,
    need: 2,
    reward: [
      [ID.Scale, 3],
      [ID.Emerald, 2],
    ],
    xp: 6,
  },
  {
    id: "bats",
    chain: "hunter",
    name: "Dusk squeak",
    detail: "Drop 3 bats after dark.",
    kind: "kill",
    tag: "bat",
    what: 0,
    need: 3,
    reward: [
      [ID.Wisp, 2],
      [ID.Emerald, 2],
    ],
    xp: 6,
  },
  {
    id: "raiders",
    chain: "hunter",
    name: "Outpost watch",
    detail: "Drop 3 bandits. They hold the fence posts and do not burn at dawn.",
    kind: "kill",
    tag: "raider",
    what: 0,
    need: 3,
    reward: [
      [ID.Emerald, 4],
      [ID.Bow, 1],
    ],
    xp: 10,
  },
  {
    id: "honey",
    chain: "provider",
    name: "Jar the comb",
    detail: "Hold 2 honey, then claim. The honey is spent.",
    kind: "have",
    tag: "honey",
    what: ID.Honey,
    need: 2,
    reward: [
      [ID.Emerald, 3],
      [ID.Bottle, 2],
    ],
    xp: 6,
  },
  {
    id: "bearings",
    chain: "provider",
    name: "Take a bearing",
    detail: "Hold a compass. It is not spent. It points at the nearest hamlet and site.",
    kind: "have",
    tag: "compass",
    what: ID.Compass,
    need: 1,
    keep: true,
    reward: [
      [ID.Emerald, 3],
      [ID.Lantern, 2],
    ],
    xp: 6,
  },
  {
    id: "pages",
    chain: "master",
    name: "Press the reeds",
    detail: "Hold 6 paper, then claim. The paper is spent.",
    kind: "have",
    tag: "paper",
    what: ID.Paper,
    need: 6,
    reward: [
      [ID.Book, 2],
      [ID.Emerald, 2],
    ],
    xp: 6,
  },
  {
    id: "horn",
    chain: "hunter",
    name: "Sound the ridge",
    detail: "Hold a horn. It is not spent. Place with it to shove hostiles back.",
    kind: "have",
    tag: "horn",
    what: ID.Horn,
    need: 1,
    keep: true,
    reward: [
      [ID.Emerald, 4],
      [ID.Arrow, 8],
    ],
    xp: 8,
  },
  {
    id: "masterbrick",
    chain: "master",
    name: "The Master Brick",
    detail: "Craft the Master Brick: prism, sapphire, chrome and resin in one brick (rank 22). The hamlet has waited a long time for this.",
    kind: "have",
    tag: "master",
    what: ID.MasterBrick,
    need: 1,
    reward: [
      [ID.Emerald, 40],
      [ID.Core, 2],
    ],
    xp: 150,
    keep: true,
  },
];


// RPG chains (v4.18, Philippe's "the other 50%"): the flat quest board becomes
// four story lines. A quest only counts progress while it is the current step
// of its chain — every earlier step claimed. Step order = QUESTS array order
// within the chain. Chain state derives from the quest done-set, so old saves
// (which store only {id, n, done}) stay valid untouched.
export type ChainDef = { name: string; from: string; blurb: string };
export const CHAINS: Record<string, ChainDef> = {
  master: {
    name: "The Master Brick",
    from: "Elder Maren, hamlet clerk",
    blurb: "The hamlet's long road: first posts, first ore, first magic — all the way to the brick of legend.",
  },
  provider: {
    name: "The Hamlet Table",
    from: "Bess, hamlet grocer",
    blurb: "Feed the hamlet: fields, orchards, hives and the winter store.",
  },
  hunter: {
    name: "The Wild Ledger",
    from: "Tam, hamlet ranger",
    blurb: "Every beast of the wilds, entered in the ledger one by one — raiders last but one.",
  },
  wilds: {
    name: "The Four Lands",
    from: "Ivo, hamlet mage",
    blurb: "Walk the strange lands — fen, snow, ash and shore — and bring back their proofs.",
  },
};

export function chainQuests(chain: string): QuestDef[] {
  return QUESTS.filter((q) => q.chain === chain);
}

export function chainStepOf(q: QuestDef): { step: number; steps: number } {
  if (!q.chain) return { step: 1, steps: 1 };
  const list = chainQuests(q.chain);
  return { step: list.findIndex((e) => e.id === q.id) + 1, steps: list.length };
}

/** A quest is active when every earlier step of its chain is done. */
export function questActive(q: QuestDef, isDone: (id: string) => boolean): boolean {
  if (!q.chain) return true;
  for (const e of chainQuests(q.chain)) {
    if (e.id === q.id) return true;
    if (!isDone(e.id)) return false;
  }
  return true;
}
