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
// « Tout est plastique sauf l'or, les diamants et le bois. » One data
// table: every melt ratio (inputs per pellet), its purity push and every
// fuel value. Common/abundant stuff needs MANY inputs per pellet and
// barely lifts purity; rare stuff melts near 1:1 and lifts it a lot.
// Wood is the fuel; quality plastic (ingots) also burns. Gold and
// diamond are never meltable (currency / upgrade materials).
// RARE_MELT rows above keep their spike + affix on top of this.
export type MatRow =
  | { kind: "plastic"; ratio: number; purity: number; fuel?: number }
  | { kind: "fuel"; fuel: number }
  | { kind: "reject"; why: string };
const P = (ratio: number, purity: number, fuel?: number): MatRow => ({ kind: "plastic", ratio, purity, fuel });
export const MATERIALS: Record<number, MatRow> = {
  // never melted
  [ID.Gold]: { kind: "reject", why: "Gold is currency — the kiln won't melt it" },
  [ID.GoldOre]: { kind: "reject", why: "Gold is currency — the kiln won't melt it" },
  [ID.Diamond]: { kind: "reject", why: "Diamonds are for upgrades — the kiln won't melt them" },
  [ID.DiamondOre]: { kind: "reject", why: "Diamonds are for upgrades — the kiln won't melt them" },
  // wood = fuel (seconds of burn)
  [ID.Log]: { kind: "fuel", fuel: 3 },
  [ID.Planks]: { kind: "fuel", fuel: 1.5 },
  [ID.SlabPlanks]: { kind: "fuel", fuel: 0.8 },
  [ID.Stick]: { kind: "fuel", fuel: 0.8 },
  [ID.Leaves]: { kind: "fuel", fuel: 0.4 },
  // common, abundant → large quantities (8–16 : 1), low purity
  [ID.Dirt]: P(16, 0.5),
  [ID.Grass]: P(16, 0.5),
  [ID.Gravel]: P(14, 0.75),
  [ID.Snow]: P(16, 0.5),
  [ID.Cobble]: P(12, 1),
  [ID.Stone]: P(12, 1),
  [ID.Basalt]: P(10, 1.5),
  [ID.Sandstone]: P(10, 1.5),
  [ID.Ice]: P(10, 1),
  // mid: ores / plastic bricks (3–6 : 1)
  [ID.Red]: P(2, 3), [ID.Blue]: P(2, 3), [ID.Yellow]: P(2, 3), [ID.White]: P(2, 3), [ID.Black]: P(2, 3),
  [ID.Orange]: P(2, 3), [ID.Green]: P(2, 3), [ID.Pink]: P(2, 3), [ID.Azure]: P(2, 3),
  [ID.Obsidian]: P(4, 4),
  // rarer → small quantities (1–2 : 1), high purity
  [ID.Crystal]: P(1, 8),
  // NOTE: Sand→Glass, Clay→Hard, Netherrack→Ash and the metal/gem ores
  // (iron, tin, copper, chrome, sapphire, amber, resin, prism) keep their
  // refining rows: 30+ recipes need Glass/Copper/Chrome — open question
  // for Philippe before turning them into plastic too.
  // quality plastic: also burnable as fuel
  [ID.PlasticIngot]: { kind: "fuel", fuel: 6 },
  [ID.TemperedIngot]: { kind: "fuel", fuel: 10 },
};
// rare drops (RARE_MELT) are 1:1 plastic and keep their bonuses
for (const k of Object.keys(RARE_MELT)) MATERIALS[+k] ??= P(1, 0);

export const isMeltable = (id: number) => MATERIALS[id]?.kind === "plastic";
export const meltRatio = (id: number) => (MATERIALS[id]?.kind === "plastic" ? (MATERIALS[id] as { ratio: number }).ratio : 0);
export function fuelValue(id: number): number {
  const m = MATERIALS[id];
  return m && m.kind !== "reject" ? (m as { fuel?: number }).fuel ?? 0 : 0;
}
export function rejectReason(id: number): string | null {
  const m = MATERIALS[id];
  return m?.kind === "reject" ? m.why : null;
}
/** Feed one input; returns whole pellets emitted (accumulator on the
 *  pool keeps big ratios exact and deterministic). */
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
