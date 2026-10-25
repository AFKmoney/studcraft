import { ID } from "./blocks";

export type Offer = { pay: number; pn: number; out: number; on: number };

export type TraderRole = "grocer" | "smith" | "mason" | "herder" | "clerk";

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
];
