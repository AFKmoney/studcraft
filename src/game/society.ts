// Society layer (PR 3): chiefs, guilds, bandits, quests/missions, money,
// reputation, bounty, guards and jail — ALL generated from the seed by a
// few fixed rules over data tables (only the variables change). Pure
// module: no THREE, no game state; game.ts feeds it events and reads
// decisions. Quests use one structured, JSON-safe schema with a
// validator, so an optional LLM can later write dialogue on top of
// `text` without touching the rules.
import { BLOCKS, ID } from "./blocks.ts";
import { ZONES, ZONE_IDS, type ZoneId } from "./biomes.ts";
import { hash2 } from "./noise.ts";

// ---------------------------------------------------------------- rng / names

/** Deterministic stream from (a, b, seed, salt). */
export function rngOf(a: number, b: number, seed: number, salt: number): () => number {
  let i = 0;
  return () => hash2(a * 31 + i++, b * 17 - i, seed + salt);
}
const pick = <T>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length) % list.length];
const between = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

const SYL_A = ["Bri", "Klo", "Tes", "Mar", "Plo", "Stu", "Dar", "Vel", "Gra", "Ilo", "Run", "Zef", "Oka", "Tam", "Quin", "Lys"];
const SYL_B = ["ck", "nel", "ra", "bo", "dan", "mi", "sel", "tor", "ve", "lin", "pa", "gor", "eth", "us", "ka", "ri"];
const SURN = ["Moulebrique", "Tenon", "Clipsec", "Goujon", "Plaquette", "Rivet", "Liftarm", "Tuile", "Basalte", "Corail", "Boulon", "Ressort"];
export function npcName(r: () => number): string {
  return pick(r, SYL_A) + pick(r, SYL_B) + " " + pick(r, SURN);
}

// ---------------------------------------------------------------- money

/** The game's currency already exists: every trade, reward and price is
 *  paid in Emeralds. The wallet IS the Emerald stack — no new item, no
 *  save migration; fines, bounties, guild dues and the upgrade vendor
 *  all price in it. */
export const COIN = ID.Emerald;
export function canPay(wallet: number, price: number): boolean {
  return Number.isInteger(price) && price >= 0 && wallet >= price;
}
/** Rep-adjusted price (better reputation = cheaper), never below 1. */
export function repPrice(base: number, rep: number): number {
  const f = 1 - Math.max(-0.5, Math.min(0.3, rep / 250));
  return Math.max(1, Math.round(base * f));
}

// ---------------------------------------------------------------- quest schema

export type GiverKind = "chief" | "guild" | "bandit";
export type QuestType = "kill" | "fetch" | "find" | "boss" | "steal" | "sabotage" | "pickpocket" | "burgle" | "diplomacy";
export type Quest = {
  id: string;
  giver: { kind: GiverKind; key: string; name: string };
  type: QuestType;
  zone: ZoneId;
  /** Progress rule the board already knows: count kills of a tag, or hold items. */
  track: { kind: "kill" | "have" | "crime"; tag: string; what: number; need: number };
  reward: { coins: number; items: [number, number][]; rep: number; guildXp: number };
  /** Crime jobs: done unseen or failed (bounty) — stealth 0..1 is the guard sharpness. */
  crime: boolean;
  stealth: number;
  text: { title: string; detail: string };
};

const TYPES: readonly QuestType[] = ["kill", "fetch", "find", "boss", "steal", "sabotage", "pickpocket", "burgle", "diplomacy"];

export function validateQuest(q: unknown): string[] {
  const e: string[] = [];
  const o = q as Quest;
  if (!o || typeof o !== "object") return ["not an object"];
  if (typeof o.id !== "string" || !o.id) e.push("id");
  if (!o.giver || !["chief", "guild", "bandit"].includes(o.giver.kind) || typeof o.giver.key !== "string" || typeof o.giver.name !== "string") e.push("giver");
  if (!TYPES.includes(o.type)) e.push("type");
  if (!ZONE_IDS.includes(o.zone)) e.push("zone");
  const t = o.track;
  if (!t || !["kill", "have", "crime"].includes(t.kind) || typeof t.tag !== "string" || !Number.isInteger(t.need) || t.need < 1 || !Number.isInteger(t.what)) e.push("track");
  const rw = o.reward;
  if (!rw || !Number.isInteger(rw.coins) || rw.coins < 0 || !Array.isArray(rw.items) || !rw.items.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger) && p[1] > 0) || !Number.isFinite(rw.rep) || !Number.isInteger(rw.guildXp)) e.push("reward");
  if (typeof o.crime !== "boolean" || !(o.stealth >= 0 && o.stealth <= 1)) e.push("crime");
  if (o.crime !== (o.type === "steal" || o.type === "sabotage" || o.type === "pickpocket" || o.type === "burgle")) e.push("crime flag");
  if (!o.text || typeof o.text.title !== "string" || typeof o.text.detail !== "string") e.push("text");
  if (JSON.stringify(o) === undefined) e.push("json");
  return e;
}

// Fetch stock per zone: what the biome grows or the new bricks it is built from.
const FETCH: Record<ZoneId, readonly number[]> = {
  jungle: [ID.Bamboo, ID.JungleStone, ID.Log, ID.Moss],
  desert: [ID.Sandstone, ID.Adobe, ID.Sand, ID.Cactus],
  arctic: [ID.PackedSnow, ID.IceBrick, ID.Ice, ID.Snow],
  volcano: [ID.BasaltBrick, ID.ObsidianTile, ID.Basalt, ID.Obsidian],
  valley: [ID.Wheat, ID.Apple, ID.Planks, ID.Calcite],
  plains: [ID.Wheat, ID.Log, ID.Cobble, ID.Hay],
  mountain: [ID.Cobble, ID.Ingot, ID.Copper, ID.Log],
  swamp: [ID.MudBrick, ID.Mangrove, ID.Mud, ID.Slime],
  canyon: [ID.RedRock, ID.Clay, ID.Copper, ID.Gold],
  desertCity: [ID.Sandstone, ID.Gold, ID.Glass, ID.Calcite],
  islands: [ID.Coral, ID.CrystalBrick, ID.Shell, ID.Fish],
};

/** Kill tag of a zone mob: species id, or the vanilla kind. */
export function mobTag(m: { kind?: string; species?: string }): string {
  return m.species ? "sp:" + m.species : "mob:" + (m.kind ?? "");
}

function rewardFor(r: () => number, tier: number, crime: boolean): Quest["reward"] {
  const coins = between(r, 2, 4) * tier + (crime ? 3 : 0);
  const extra = pick(r, [ID.Bread, ID.Lantern, ID.Ingot, ID.Copper, ID.Crystal, ID.Gold] as const);
  return { coins, items: [[extra, between(r, 1, 2 + tier)]], rep: crime ? -0 : 4 + tier * 2, guildXp: 2 + tier * 2 };
}

/** One quest, from fixed rules; `slot` and `epoch` vary it. */
export function makeQuest(giver: Quest["giver"], zone: ZoneId, seed: number, slot: number, epoch: number, types: readonly QuestType[]): Quest {
  const [ka, kb] = giver.key.split(",").map((v) => Number(v) || 0);
  const r = rngOf(ka * 97 + slot, kb * 89 + epoch, seed, 0x5e7 + giver.kind.length);
  const type = pick(r, types);
  const tier = 1 + Math.min(2, epoch);
  const z = ZONES[zone];
  const id = `${giver.kind}:${giver.key}:${epoch}:${slot}`;
  let track: Quest["track"];
  let title: string;
  let detail: string;
  if (type === "kill") {
    const m = pick(r, z.mobs);
    const need = between(r, 3, 5) * tier;
    track = { kind: "kill", tag: mobTag(m), what: 0, need };
    title = "Cull the " + (m.label ?? m.species ?? m.kind);
    detail = `Defeat ${need} ${m.label ?? m.species ?? m.kind} in the ${z.label}.`;
  } else if (type === "boss") {
    track = { kind: "kill", tag: "boss:" + z.boss.id, what: 0, need: 1 };
    title = "Bring down " + z.boss.label;
    detail = `Defeat ${z.boss.label}, the boss of the ${z.label}.`;
  } else if (type === "find") {
    const shrine = r() < 0.5;
    track = { kind: "have", tag: shrine ? "find:shrine" : "find:mecha", what: shrine ? ID.SanctumStud : ID.MechaCore, need: 1 };
    title = shrine ? "The lost shrine" : "The fallen mecha";
    detail = shrine ? "Find a hidden shrine and bring back a Sanctum stud." : "Find an abandoned mecha and salvage its Mecha core.";
  } else if (type === "fetch" || type === "diplomacy") {
    const what = pick(r, FETCH[zone]);
    const need = type === "diplomacy" ? between(r, 2, 4) : between(r, 6, 12) * tier;
    track = { kind: "have", tag: "fetch", what: type === "diplomacy" ? ID.Emerald : what, need };
    // B21: the fetch text never said WHAT to bring ("Bring 9 of the
    // requested stock."), and a guild's entry job read exactly like the
    // chief's ("Supplies for the village").
    const item = (BLOCKS[what]?.name ?? "goods").toLowerCase();
    title = type === "diplomacy" ? "Peace offering" : giver.kind === "chief" ? "Supplies for the village" : "Supplies for the " + giver.name;
    detail = type === "diplomacy" ? `Carry ${need} emeralds as a peace token between rivals.` : `Bring ${need} ${item}.`;
  } else {
    // crime jobs (bandits / thieves): tracked by the crime events game.ts reports
    const tag = type === "steal" ? "crime:steal" : type === "sabotage" ? "crime:sabotage" : type === "pickpocket" ? "crime:pickpocket" : "crime:burgle";
    track = { kind: "crime", tag, what: 0, need: type === "steal" ? between(r, 1, 3) : 1 };
    title = type === "steal" ? "Light fingers" : type === "sabotage" ? "Spanner in the works" : type === "pickpocket" ? "The chief's purse" : "Crack the vault";
    detail =
      type === "steal" ? "Take goods from a village chest without being seen."
      : type === "sabotage" ? "Break a brick inside a TEKS garage, unseen."
      : type === "pickpocket" ? "Lift the chief's purse while he isn't looking."
      : "Open a hidden vault's chest and get away clean.";
  }
  const crime = type === "steal" || type === "sabotage" || type === "pickpocket" || type === "burgle";
  return { id, giver, type, zone, track, reward: rewardFor(r, tier, crime), crime, stealth: crime ? Math.min(1, 0.35 + 0.2 * tier) : 0, text: { title, detail } };
}

// ---------------------------------------------------------------- chiefs

export const CHIEF_TYPES: readonly QuestType[] = ["kill", "kill", "fetch", "find", "boss"];
/** A village chief: name and three quests per epoch (epoch = sets done). */
export function chiefOf(gx: number, gz: number, zone: ZoneId, seed: number) {
  const r = rngOf(gx, gz, seed, 0xc41e);
  return { key: gx + "," + gz, name: "Chief " + npcName(r), zone };
}
export function chiefQuests(gx: number, gz: number, zone: ZoneId, seed: number, epoch: number): Quest[] {
  const c = chiefOf(gx, gz, zone, seed);
  const g = { kind: "chief" as const, key: c.key, name: c.name };
  return [0, 1, 2].map((slot) => makeQuest(g, zone, seed, slot, epoch, CHIEF_TYPES));
}

// ---------------------------------------------------------------- guilds

export type Guild = {
  id: string;
  name: string;
  /** Hall look: wall / accent / banner brick ids (zero assets). */
  hall: { wall: number; accent: number; banner: number };
  ranks: string[];
  perk: { kind: "discount" | "xp" | "loot" | "stealth" | "speed" | "fine"; value: number };
  missions: readonly QuestType[];
  /** Thieves/assassins ride on the bandit axis, not the village one. */
  outlaw: boolean;
};

// The fixed table: only names, materials and the mission mix differ.
const GUILD_TABLE: [string, string, number, number, number, Guild["perk"]["kind"], readonly QuestType[], boolean][] = [
  ["techno", "Techno Guild", ID.IronBlock, ID.Azure, ID.Blue, "discount", ["fetch", "find", "find"], false],
  ["sorcerers", "Sorcerers' Circle", ID.ObsidianTile, ID.CrystalBrick, ID.Pink, "xp", ["find", "boss", "fetch"], false],
  ["warriors", "Warriors' Hall", ID.Cobble, ID.Red, ID.Red, "loot", ["kill", "kill", "boss"], false],
  ["traders", "Traders' Company", ID.Planks, ID.Gold, ID.Yellow, "discount", ["fetch", "fetch", "diplomacy"], false],
  ["politicians", "Assembly of Envoys", ID.Calcite, ID.White, ID.Azure, "fine", ["diplomacy", "diplomacy", "fetch"], false],
  ["thieves", "Thieves' Guild", ID.MudBrick, ID.Black, ID.Black, "stealth", ["steal", "pickpocket", "burgle"], true],
  ["rangers", "Rangers' Lodge", ID.Log, ID.Green, ID.Green, "speed", ["kill", "find", "kill"], false],
  ["mechanics", "TEKS Mechanics", ID.BasaltBrick, ID.Orange, ID.Orange, "discount", ["fetch", "find", "fetch"], false],
  ["alchemists", "Alchemists' Still", ID.Adobe, ID.Moss, ID.Green, "xp", ["fetch", "fetch", "find"], false],
  ["miners", "Miners' Union", ID.Stone, ID.Copper, ID.Orange, "loot", ["fetch", "kill", "fetch"], false],
  ["explorers", "Explorers' Club", ID.Sandstone, ID.Azure, ID.Yellow, "speed", ["find", "find", "kill"], false],
  ["builders", "Builders' Lodge", ID.RedRock, ID.Yellow, ID.Yellow, "discount", ["fetch", "fetch", "fetch"], false],
  ["smiths", "Smiths' Forge", ID.BasaltBrick, ID.IronBlock, ID.Red, "loot", ["fetch", "kill", "boss"], false],
  ["assassins", "Silent Knives", ID.ObsidianTile, ID.Red, ID.Black, "stealth", ["pickpocket", "sabotage", "boss"], true],
  ["scholars", "Scholars' Archive", ID.Calcite, ID.Blue, ID.Blue, "xp", ["find", "diplomacy", "fetch"], false],
];
const RANK_WORDS = ["Initiate", "Apprentice", "Journeyman", "Adept", "Master", "Grandmaster"];

export const GUILDS: readonly Guild[] = GUILD_TABLE.map(([id, name, wall, accent, banner, perk, missions, outlaw], i) => ({
  id,
  name,
  hall: { wall, accent, banner },
  ranks: RANK_WORDS.map((w) => w + " " + name.split(" ")[0].replace(/'s?$/, "")),
  perk: { kind: perk, value: 0.05 + (i % 3) * 0.05 },
  missions,
  outlaw,
}));
/** Guild XP thresholds per rank; rank 0 = joined (entry quest done). */
export const GUILD_RANK_XP = [0, 10, 30, 70, 140, 260];
export function guildRank(xp: number): number {
  let r = 0;
  for (let i = 0; i < GUILD_RANK_XP.length; i++) if (xp >= GUILD_RANK_XP[i]) r = i;
  return r;
}
/** Which guild keeps a hall in a given town (seed rule; cities host two). */
export function guildsIn(gx: number, gz: number, zone: ZoneId, seed: number): Guild[] {
  const r = rngOf(gx, gz, seed, 0x9a11);
  const legal = GUILDS.filter((g) => !g.outlaw);
  const first = pick(r, legal);
  if (zone !== "desertCity") return [first];
  let second = pick(r, legal);
  if (second.id === first.id) second = legal[(legal.indexOf(first) + 1) % legal.length];
  return [first, second];
}
export function guildQuests(g: Guild, hallKey: string, zone: ZoneId, seed: number, epoch: number): Quest[] {
  const giver = { kind: g.outlaw ? ("bandit" as const) : ("guild" as const), key: hallKey, name: g.name };
  // B21 lot 4: the id carries the guild ("guild:<hall>@<guild>:<epoch>:<slot>").
  // Two halls in one city produced the SAME ids, so taking one guild's job
  // read "Already taken" at the other and one claim completed both; an
  // outlaw guild's ids also collided with the bandit boss's contracts.
  return [0, 1, 2].map((slot) => {
    const q = makeQuest(giver, zone, seed + GUILDS.indexOf(g) * 101, slot, epoch, g.missions);
    return { ...q, id: `${giver.kind}:${hallKey}@${g.id}:${epoch}:${slot}` };
  });
}
/** Joining: the first mission of the guild's opening set that is not a
 *  boss hunt (B21 lot 4: joining the Sorcerers asked a newcomer to kill
 *  the biome boss); falls back to slot 0 for an all-boss mix. */
export function guildEntryQuest(g: Guild, hallKey: string, zone: ZoneId, seed: number): Quest {
  const qs = guildQuests(g, hallKey, zone, seed, 0);
  return qs.find((q) => q.type !== "boss") ?? qs[0];
}

// ---------------------------------------------------------------- bandits

export const BANDIT_TYPES: readonly QuestType[] = ["steal", "sabotage", "pickpocket", "burgle"];
export function banditQuests(gx: number, gz: number, zone: ZoneId, seed: number, epoch: number): Quest[] {
  const r = rngOf(gx, gz, seed, 0xba4d);
  const giver = { kind: "bandit" as const, key: gx + "," + gz, name: "Boss " + npcName(r) };
  return [0, 1, 2].map((slot) => makeQuest(giver, zone, seed, slot, epoch, BANDIT_TYPES));
}
/** A fence buys stolen goods at a cut (no questions, no bounty). */
export function fencePrice(base: number, banditRep: number): number {
  return Math.max(1, Math.floor(base * (0.5 + Math.max(0, Math.min(0.3, banditRep / 300)))));
}

// ---------------------------------------------------------------- reputation / crime

export type CrimeKind = "break" | "steal" | "assault" | "pickpocket" | "burgle" | "sabotage";
export const CRIME: Record<CrimeKind, { rep: number; bounty: number }> = {
  break: { rep: -2, bounty: 5 },
  steal: { rep: -5, bounty: 15 },
  pickpocket: { rep: -6, bounty: 20 },
  sabotage: { rep: -8, bounty: 25 },
  burgle: { rep: -10, bounty: 40 },
  assault: { rep: -17, bounty: 60 }, // + the -3 trade-rep nudge = -20 a strike (Guide §11)
};
export type Standing = { rep: number; bounty: number; banditRep: number };
export const BOUNTY_ARREST = 20;
export const REP_MIN = -100;
export const REP_MAX = 100;
const clampRep = (v: number) => Math.max(REP_MIN, Math.min(REP_MAX, v));

/** A crime: seen → village rep falls and bounty rises; unseen → only
 *  the bandit axis notices (rises a little). */
export function commitCrime(s: Standing, kind: CrimeKind, seen: boolean): Standing {
  const c = CRIME[kind];
  if (!seen) return { ...s, banditRep: clampRep(s.banditRep + 1) };
  return { rep: clampRep(s.rep + c.rep), bounty: s.bounty + c.bounty, banditRep: clampRep(s.banditRep + 2) };
}
export function goodDeed(s: Standing, rep: number): Standing {
  return { ...s, rep: clampRep(s.rep + rep) };
}

// ---------------------------------------------------------------- guards / detection

export type Observer = { x: number; z: number; yaw: number; range?: number; fov?: number };
export type Sneak = { x: number; z: number; sneaking: boolean; light: number /* 0..1 */ };
/** Detection 0..1 of one guard: range, view cone, sneaking and light
 *  (`blocked` = line of sight through bricks). */
export function detection(g: Observer, p: Sneak, blocked: boolean): number {
  if (blocked) return 0;
  const dx = p.x - g.x;
  const dz = p.z - g.z;
  const d = Math.hypot(dx, dz);
  const range = (g.range ?? 16) * (p.sneaking ? 0.5 : 1) * (0.5 + 0.5 * p.light);
  if (d > range) return 0;
  if (d < 1.5) return 1; // bumped into
  const fov = g.fov ?? Math.PI * 0.6;
  // yaw 0 faces -z (the camera convention)
  const fx = -Math.sin(g.yaw);
  const fz = -Math.cos(g.yaw);
  const cos = (dx * fx + dz * fz) / d;
  if (cos < Math.cos(fov / 2)) return 0;
  return Math.max(0, Math.min(1, 1 - d / range)) * (p.sneaking ? 0.6 : 1);
}
export const SEEN_AT = 0.25;
export function seenBy(guards: readonly Observer[], p: Sneak, blockedFor: (g: Observer) => boolean, sharpness = 0.5): boolean {
  const thr = SEEN_AT * (1.5 - sharpness);
  return guards.some((g) => detection(g, p, blockedFor(g)) >= thr);
}

export type Confront = "none" | "warn" | "arrest";
export function guardReaction(s: Standing, sawCrime: boolean): Confront {
  if (sawCrime || s.bounty >= BOUNTY_ARREST) return "arrest";
  if (s.bounty > 0 || s.rep <= -50) return "warn";
  return "none";
}
export type Verdict = { standing: Standing; coinsPaid: number; jailHours: number; confiscate: boolean; hostile: boolean };
/** The three answers to "Halt!": pay the fine, go to jail, or resist. */
export function resolveArrest(s: Standing, choice: "pay" | "jail" | "resist", wallet: number): Verdict {
  if (choice === "pay" && canPay(wallet, s.bounty)) return { standing: { ...s, bounty: 0, rep: clampRep(s.rep + 2) }, coinsPaid: s.bounty, jailHours: 0, confiscate: false, hostile: false };
  if (choice === "resist") return { standing: commitCrime(s, "assault", true), coinsPaid: 0, jailHours: 0, confiscate: false, hostile: true };
  // jail (or a fine you can't pay): time served clears the bounty
  return { standing: { ...s, bounty: 0 }, coinsPaid: 0, jailHours: Math.max(1, Math.min(24, Math.ceil(s.bounty / 10))), confiscate: s.bounty >= 40, hostile: false };
}
