// Plastic Foundry — the main game loop's pure, data-driven core
// (Grok Bot, 2026-10-31, branch grokbot/plastic-foundry).
// Philippe: « le plastic foundry est le main game loop » + « fondre des
// objets rares donne des bonus ». Everything here is pure math, no
// three.js, so node --test covers it. game.ts owns the Furn object and
// calls these helpers from tickFurnaces / furnaceTap / the HUD.
//
// The loop:
//  1. HEAT  — burning fuel raises the kiln's heat (0..1); without fuel it
//     cools. Cook speed scales with heat (a cold kiln crawls), so keeping
//     the fire fed is a skill, not a chore.
//  2. MELT  — every melted input adds to the molten pool's PURITY
//     (0..100). Plain pellets drift purity toward the level's cap;
//     rare drops (boss relics, prisms, cores) inject a big purity spike
//     and an AFFIX charge on the batch.
//  3. MOLD  — purity → quality tier. Higher tiers pour bonus ingots
//     (deterministic accumulator, so it is fair and testable) and the
//     active affix shapes the pour (extra yield, tempered ingots, faster
//     cook, double fuel distillation).
//  4. UPGRADE — Foundry level raises the purity cap, heat rate and
//     unlocks the tiers above it: a Lv1 kiln can never pour Masterwork.
import { ID } from "./blocks.ts";

export type Tier = { name: string; min: number; bonus: number; color: string };
/** Quality tiers by purity. `bonus` = extra ingots per ingot poured
 *  (fractional, paid through the accumulator). */
export const TIERS: Tier[] = [
  { name: "Raw", min: 0, bonus: 0, color: "#9aa0a6" },
  { name: "Fine", min: 35, bonus: 0.15, color: "#5ec46a" },
  { name: "Superior", min: 60, bonus: 0.3, color: "#4aa3ff" },
  { name: "Masterwork", min: 85, bonus: 0.5, color: "#ffb02e" },
];

/** Per Foundry level: purity cap of plain melt, heat-up rate /s, the
 *  highest tier index this kiln can pour. */
export const LEVEL_FOUNDRY = [
  { cap: 45, heatUp: 0.25, maxTier: 1 },
  { cap: 70, heatUp: 0.4, maxTier: 2 },
  { cap: 90, heatUp: 0.6, maxTier: 3 },
];

export type Affix = "yield" | "tempered" | "swift" | "distil";
export const AFFIX_INFO: Record<Affix, { name: string; desc: string }> = {
  yield: { name: "Abundant", desc: "+1 ingot per pour" },
  tempered: { name: "Tempered", desc: "pours tempered ingots" },
  swift: { name: "Swift", desc: "cook ×2 faster" },
  distil: { name: "Volatile", desc: "fuel distillation ×3" },
};

/** Rare melts: item → purity spike, affix, number of charged pours.
 *  Data-driven: add a row to add a rare. */
export const RARE_MELT: Record<number, { purity: number; affix: Affix; charges: number; pellets: number }> = {
  [ID.GuardianSpike]: { purity: 30, affix: "tempered", charges: 6, pellets: 3 },
  [ID.PharaohGold]: { purity: 35, affix: "yield", charges: 8, pellets: 4 },
  [ID.WitchVenom]: { purity: 25, affix: "distil", charges: 8, pellets: 2 },
  [ID.IllagerBadge]: { purity: 25, affix: "swift", charges: 10, pellets: 2 },
  // v5 remap (integration): 305 is now the "Prism sentinel core" (boss
  // core, top rare), 474 the Veilleur-Prisme's void-glass shard, 268
  // the "Blink lens" (former ender pearl, common drop → small spike).
  [ID.VoidCore]: { purity: 50, affix: "tempered", charges: 12, pellets: 6 },
  [ID.VoidGlass]: { purity: 30, affix: "swift", charges: 6, pellets: 3 },
  [ID.EnderPearl]: { purity: 10, affix: "swift", charges: 2, pellets: 1 },
  [ID.Prism]: { purity: 20, affix: "yield", charges: 4, pellets: 1 },
  [ID.Sapphire]: { purity: 12, affix: "swift", charges: 4, pellets: 1 },
  [ID.Amber]: { purity: 8, affix: "distil", charges: 3, pellets: 1 },
};

export type Pool = {
  heat?: number;
  purity?: number;
  bonusAcc?: number;
  affix?: Affix | "";
  charges?: number;
};

export function tierIndex(purity: number, lvl: number): number {
  const max = LEVEL_FOUNDRY[Math.max(0, Math.min(2, lvl - 1))].maxTier;
  let t = 0;
  for (let i = 0; i < TIERS.length; i++) if (purity >= TIERS[i].min) t = i;
  return Math.min(t, max);
}

/** Heat step; returns the new heat. */
export function stepHeat(heat: number, burning: boolean, lvl: number, dt: number): number {
  const L = LEVEL_FOUNDRY[Math.max(0, Math.min(2, lvl - 1))];
  const h = burning ? heat + L.heatUp * dt : heat - 0.08 * dt;
  return Math.max(0, Math.min(1, h));
}

/** Cook-speed multiplier from heat: 0.25 cold → 1 at full heat; Swift ×2. */
export function cookRate(p: Pool): number {
  const h = p.heat ?? 0;
  const base = 0.25 + 0.75 * h * h * (3 - 2 * h);
  return base * (p.affix === "swift" && (p.charges ?? 0) > 0 ? 2 : 1);
}

/** Melt one item into the pool (call when one input finishes cooking). */
export function meltInto(p: Pool, inId: number, lvl: number, opts?: { regrind?: boolean }): void {
  const L = LEVEL_FOUNDRY[Math.max(0, Math.min(2, lvl - 1))];
  const pur = p.purity ?? 0;
  const rare = RARE_MELT[inId];
  if (rare) {
    p.purity = Math.min(100, pur + rare.purity);
    if (p.affix === rare.affix) p.charges = (p.charges ?? 0) + rare.charges;
    else { p.affix = rare.affix; p.charges = rare.charges; }
    return;
  }
  // Regrind (a recycled Teks part) contaminates the pool: −15 purity.
  // Guards the recycle loop (part → pellets → Masterwork ingots → part)
  // from becoming a matter fountain.
  if (opts?.regrind) {
    p.purity = Math.max(0, pur - 15);
    return;
  }
  // Plain melt: purity eases toward the level cap (never past it), so a
  // rare spike above the cap slowly dilutes back down — keep feeding.
  p.purity = pur < L.cap ? Math.min(L.cap, pur + 4) : Math.max(L.cap, pur - 1.5);
}

/** Pour the ingots for one melted pellet. Returns what to emit. */
export function pour(p: Pool, lvl: number, baseN: number): { id: number; n: number; fuelMul: number; tier: number } {
  const tier = tierIndex(p.purity ?? 0, lvl);
  let n = baseN;
  p.bonusAcc = (p.bonusAcc ?? 0) + TIERS[tier].bonus * baseN;
  while (p.bonusAcc >= 1) { p.bonusAcc -= 1; n += 1; }
  let id: number = ID.PlasticIngot;
  let fuelMul = 1;
  if ((p.charges ?? 0) > 0) {
    if (p.affix === "yield") n += 1;
    if (p.affix === "tempered") id = ID.TemperedIngot;
    if (p.affix === "distil") fuelMul = 3;
    p.charges = (p.charges ?? 0) - 1;
    if (p.charges <= 0) { p.charges = 0; p.affix = ""; }
  }
  return { id, n, fuelMul, tier };
}

/** Molten-pool colour for the HUD/visuals: tier colour lerped to white
 *  by heat (hot plastic glows). */
export function poolGlow(p: Pool, lvl: number): string {
  const c = TIERS[tierIndex(p.purity ?? 0, lvl)].color;
  const h = p.heat ?? 0;
  const mix = (i: number) => Math.round(parseInt(c.slice(i, i + 2), 16) * (1 - h * 0.4) + 255 * h * 0.4);
  return "#" + [1, 3, 5].map((i) => mix(i).toString(16).padStart(2, "0")).join("");
}

// ── v6 material table (Philippe, 2026-10-31) ─────────────────────────
// « Tout fond en plastique sauf l'eau, les minerais rares et le bois. »
// One data table: melt ratio (inputs per plastic unit), plastic QUALITY
// and fuel values. Quality (Philippe): copper (ore + items) → MEDIUM,
// iron → GOOD, everything else → LOW, ratio scaled by abundance.
//   low    → Pellets        (then Pellets → Plastic ingot as before)
//   medium → Plastic ingot  (direct)
//   good   → Tempered ingot (direct)
// Wood is the fuel; quality plastic (ingots) also burns. Water, gold,
// diamond and the gem ores are refused. RARE_MELT rows keep their spike
// + affix on top (they melt 1:1 to pellets).
export type Quality = "low" | "medium" | "good";
export type MatRow =
  | { kind: "plastic"; ratio: number; purity: number; quality: Quality }
  | { kind: "fuel"; fuel: number }
  | { kind: "reject"; why: string };
const L = (ratio: number, purity: number): MatRow => ({ kind: "plastic", ratio, purity, quality: "low" });
const M = (ratio: number, purity: number): MatRow => ({ kind: "plastic", ratio, purity, quality: "medium" });
const G = (ratio: number, purity: number): MatRow => ({ kind: "plastic", ratio, purity, quality: "good" });
const RARE_ORE = "Rare ore — keep it for trade and upgrades; the kiln won't melt it";
export const MATERIALS: Record<number, MatRow> = {
  // refused
  [ID.Water]: { kind: "reject", why: "Water just boils off" },
  [ID.Sand]: { kind: "reject", why: "Sand stays sand — use normal mode for glass" },
  [ID.Clay]: { kind: "reject", why: "Clay stays clay — use normal mode for hard brick" },
  [ID.Gold]: { kind: "reject", why: "Gold is currency — the kiln won't melt it" },
  [ID.GoldOre]: { kind: "reject", why: RARE_ORE },
  [ID.Diamond]: { kind: "reject", why: "Diamonds are for upgrades — the kiln won't melt them" },
  [ID.DiamondOre]: { kind: "reject", why: RARE_ORE },
  [ID.EmeraldOre]: { kind: "reject", why: RARE_ORE },
  [ID.Emerald]: { kind: "reject", why: "Emeralds are currency" },
  [ID.CrystalOre]: { kind: "reject", why: RARE_ORE },
  [ID.SapphireOre]: { kind: "reject", why: RARE_ORE },
  [ID.PrismOre]: { kind: "reject", why: RARE_ORE },
  // wood = fuel (seconds of burn)
  [ID.Log]: { kind: "fuel", fuel: 3 },
  [ID.Planks]: { kind: "fuel", fuel: 1.5 },
  [ID.SlabPlanks]: { kind: "fuel", fuel: 0.8 },
  [ID.Stick]: { kind: "fuel", fuel: 0.8 },
  [ID.Leaves]: { kind: "fuel", fuel: 0.4 },
  // t79u: plant matter is never plastic — dry stalks burn, fresh produce goes to the composter
  [ID.Wheat]: { kind: "fuel", fuel: 0.5 }, [ID.Hay]: { kind: "fuel", fuel: 4 },
  [ID.Cane]: { kind: "fuel", fuel: 0.5 }, [ID.Sapling]: { kind: "fuel", fuel: 0.5 },
  [ID.Seeds]: { kind: "reject", why: "Plant matter isn't plastic — compost it" },
  [ID.Carrot]: { kind: "reject", why: "Plant matter isn't plastic — compost it" },
  [ID.Potato]: { kind: "reject", why: "Plant matter isn't plastic — compost it" },
  [ID.Beetroot]: { kind: "reject", why: "Plant matter isn't plastic — compost it" },
  [ID.Pumpkin]: { kind: "reject", why: "Plant matter isn't plastic — compost it" },
  [ID.Melon]: { kind: "reject", why: "Plant matter isn't plastic — compost it" },
  [ID.Berry]: { kind: "reject", why: "Plant matter isn't plastic — compost it" },
  [ID.Cactus]: { kind: "reject", why: "Plant matter isn't plastic — compost it" },
  [ID.TallGrass]: { kind: "reject", why: "Plant matter isn't plastic — compost it" },
  // quality plastic also burns
  [ID.PlasticIngot]: { kind: "fuel", fuel: 6 },
  [ID.TemperedIngot]: { kind: "fuel", fuel: 10 },
  // LOW — abundant commons need large quantities (8–16 : 1)
  [ID.Dirt]: L(16, 0.5), [ID.Grass]: L(16, 0.5), [ID.Snow]: L(16, 0.5),
  [ID.Gravel]: L(14, 0.75),
  [ID.Cobble]: L(12, 1), [ID.Stone]: L(12, 1), [ID.Netherrack]: L(12, 1),
  [ID.Basalt]: L(10, 1.5), [ID.Sandstone]: L(10, 1.5), [ID.Ice]: L(10, 1),
  [ID.Glass]: L(8, 2), [ID.Hard]: L(8, 2), [ID.Ash]: L(8, 2),
  // LOW — less common: coal, dye ores, tin, chrome, amber/resin ores, bricks
  [ID.CoalOre]: L(6, 2), [ID.Coal]: L(6, 2),
  [ID.LapisOre]: L(4, 3), [ID.RedOre]: L(4, 3),
  [ID.TinOre]: L(4, 3), [ID.Tin]: L(3, 3),
  [ID.ChromeOre]: L(3, 4), [ID.Chrome]: L(2, 4),
  [ID.AmberOre]: L(3, 4), [ID.ResinOre]: L(3, 4), [ID.Resin]: L(2, 4),
  [ID.Obsidian]: L(4, 4),
  [ID.Red]: L(2, 3), [ID.Blue]: L(2, 3), [ID.Yellow]: L(2, 3), [ID.White]: L(2, 3), [ID.Black]: L(2, 3),
  [ID.Orange]: L(2, 3), [ID.Green]: L(2, 3), [ID.Pink]: L(2, 3), [ID.Azure]: L(2, 3),
  // MEDIUM — copper
  [ID.CopperOre]: M(3, 5), [ID.Copper]: M(2, 5),
  // GOOD — iron
  [ID.IronOre]: G(4, 7), [ID.RawIron]: G(3, 7), [ID.Ingot]: G(2, 8), [ID.IronBlock]: G(1, 9),
};
// rare drops (RARE_MELT) are 1:1 low plastic (pellets) and keep their bonuses
for (const k of Object.keys(RARE_MELT)) MATERIALS[+k] = L(1, 0);

export const QUALITY_ITEM: Record<Quality, number> = { low: ID.Pellets, medium: ID.PlasticIngot, good: ID.TemperedIngot };
export const isMeltable = (id: number) => MATERIALS[id]?.kind === "plastic";
export const meltRatio = (id: number) => (MATERIALS[id]?.kind === "plastic" ? (MATERIALS[id] as { ratio: number }).ratio : 0);
export const qualityOf = (id: number): Quality | null => (MATERIALS[id]?.kind === "plastic" ? (MATERIALS[id] as { quality: Quality }).quality : null);
export function fuelValue(id: number): number {
  const m = MATERIALS[id];
  return m?.kind === "fuel" ? m.fuel : 0;
}
export function rejectReason(id: number): string | null {
  const m = MATERIALS[id];
  return m?.kind === "reject" ? m.why : null;
}
/** Feed one input; returns whole plastic units emitted (the pool's
 *  ratioAcc keeps big ratios exact and deterministic; saved with the kiln). */
export function meltRatioStep(p: Pool & { ratioAcc?: number }, id: number): number {
  const r = meltRatio(id);
  if (!r) return 0;
  const m = MATERIALS[id] as { purity: number };
  p.purity = Math.min(100, (p.purity ?? 0) + m.purity);
  p.ratioAcc = (p.ratioAcc ?? 0) + 1 / r;
  let n = 0;
  while (p.ratioAcc >= 1 - 1e-9) { p.ratioAcc -= 1; n++; }
  return n;
}

// ── salvage + repair (durability) ────────────────────────────────────
/** Plastic value of one unit of `id` in LOW units (pellet = 1, plastic
 *  ingot = 2, tempered = 4): raw materials by ratio, crafted items by
 *  their recipe (see recipes.ts plasticCost). */
export const QUALITY_VALUE: Record<Quality, number> = { low: 1, medium: 2, good: 4 };
/** Salvage: a used item yields 50 % of its plastic cost × durability
 *  left, always strictly less than the craft cost. */
export function salvageYield(cost: number, dur: number, maxDur: number): number {
  if (cost <= 0) return 0;
  const frac = maxDur > 0 ? Math.max(0, Math.min(1, dur / maxDur)) : 1;
  return Math.min(Math.max(0, Math.ceil(cost) - 1), Math.floor(cost * 0.5 * frac));
}
/** Repair: the quality the item needs (tier + rare), and the cost in
 *  that quality's item for the missing durability. */
export function repairQuality(tier: number, rare: boolean): Quality {
  return rare || tier >= 3 ? "good" : tier >= 2 ? "medium" : "low";
}
export function repairCost(dur: number, maxDur: number, tier: number, rare: boolean): { quality: Quality; item: number; n: number } {
  const q = repairQuality(tier, rare);
  const missing = maxDur > 0 ? Math.max(0, maxDur - dur) / maxDur : 0;
  const n = missing <= 0 ? 0 : Math.max(1, Math.ceil(missing * (2 + 2 * Math.max(0, tier)) * (rare ? 1.5 : 1)));
  return { quality: q, item: QUALITY_ITEM[q], n };
}
/** Combine two of the same item: durabilities add (+10 % bonus), capped. */
export function combineDur(a: number, b: number, maxDur: number): number {
  return Math.min(maxDur, Math.round(a + b + maxDur * 0.1));
}

/** Armor durability: tools-style maxUse if set, else from its armor value. */
export function armorMaxDur(d: { armor: number; maxUse: number }): number {
  return d.maxUse > 0 ? d.maxUse : Math.round(60 + d.armor * 400);
}
/** Wear one worn piece takes from a hit of `dmg` (before armor). */
export function armorHitWear(dmg: number): number {
  return dmg <= 0 ? 0 : Math.max(1, Math.ceil(dmg / 2));
}
/** Apply a hit to worn armor: returns new wear per slot and which pieces broke. */
export function wearArmor(pieces: readonly number[], wear: Record<number, number>, dmg: number, maxOf: (id: number) => number): { wear: Record<number, number>; broken: number[] } {
  const w = { ...wear };
  const broken: number[] = [];
  const add = armorHitWear(dmg);
  for (const id of pieces) {
    if (!id || add <= 0) continue;
    w[id] = (w[id] ?? 0) + add;
    if (w[id] >= maxOf(id)) {
      broken.push(id);
      delete w[id];
    }
  }
  return { wear: w, broken };
}
