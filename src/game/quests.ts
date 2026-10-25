import { ID } from "./blocks";

export type Offer = { pay: number; pn: number; out: number; on: number };

export type TraderRole = "grocer" | "smith" | "mason" | "herder" | "clerk" | "mage" | "ranger";

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
    ],
  },
  smith: {
    name: "Smith",
    blurb: "Coal and raw iron for studs. Tools for gems.",
    tint: 0xf07820,
    offers: [
      { pay: ID.Coal, pn: 8, out: ID.Emerald, on: 1 },
      { pay: ID.RawIron, pn: 4, out: ID.Emerald, on: 1 },
      { pay: ID.Emerald, pn: 3, out: ID.PickS, on: 1 },
      { pay: ID.Emerald, pn: 5, out: ID.Ingot, on: 4 },
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
    ],
  },
};

export function traderOf(role: string | undefined) {
  if (role && role in TRADERS) return TRADERS[role as TraderRole];
  return TRADERS.grocer;
}

export type QuestDef = {
  id: string;
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
    name: "Night watch",
    detail: "Drop 4 night studs, bone studs, or fuse bricks.",
    kind: "kill",
    tag: "host",
    what: 0,
    need: 4,
    reward: [
      [ID.SwordS, 1],
      [ID.Emerald, 3],
    ],
    xp: 10,
  },
  {
    id: "tin",
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
];
