// Mob drop tables (mob-redesign, 2026-10-31). Pulled out of game.ts's kill
// handler so every kind's table is data — testable, and coherent with the
// new identities (MOB_LABEL). Item ids are unchanged (saves/recipes stay
// valid); only the mapping kind → ids moved/changed where a mob had no
// drop or one that contradicted its new body.
import { ID } from "./blocks.ts";
import { MOB_KINDS, type MobKind } from "./mobNames.ts";

export type DropCtx = { sheared?: boolean; size?: number };

/** Guaranteed drops (one of each), before pellets/looting/bonuses. */
export const MOB_BASE_DROPS: Record<Exclude<MobKind, "boat" | "cart">, readonly number[]> = {
  sheep: [ID.White, ID.RawMeat], // Floconnet: fleece bricks + toy ham (sheared: ham only)
  cow: [ID.RawMeat, ID.RawMeat], // Meuhbloc
  pig: [ID.RawMeat], // Cochonnet-Tirelire (coin = bonus Gold)
  goat: [ID.RawMeat, ID.Antler], // Bélier-Butoir: was ham only — its ram horns are clip antlers
  chicken: [ID.Feather, ID.RawMeat], // Cocotte-Clic: fin tiles
  horse: [ID.Pelt], // Galopiot: was the [Green] brick fallback — felt saddle cloth
  spider: [ID.String], // Araignée-Pince: rubber bands
  skelly: [ID.Bone, ID.Arrow], // Squelek: Teks rods + bolts
  stray: [ID.Bone, ID.Arrow, ID.Frost], // Squelek givré: + frost (was identical to skelly)
  walker: [ID.Bone, ID.Fang], // Démoulé: beam rod + flash burr (toy ham moved to bonus)
  husk: [ID.PharaohGold, ID.Bone],
  drowned: [ID.RawMeat, ID.Copper],
  creeper: [ID.Powder], // Pétabrique: popper powder
  enderman: [ID.VoidGlass, ID.EnderPearl], // Veilleur-Prisme (v5): void-glass shard + blink lens (core = bonus)
  blaze: [ID.Blaze],
  witch: [ID.WitchVenom, ID.PotionHeal], // Mixeuse
  bee: [ID.Wax],
  cat: [ID.String],
  squid: [ID.InkSac], // Poulpe-Pipette: stamp ink
  bat: [ID.Feather], // Chauvi-Clip: was empty — its wing fin tiles
  axolotl: [ID.Slime], // Axolo-Flotteur: was empty — float gel
  ghast: [ID.Blaze, ID.Powder],
  piglin: [ID.Scrap, ID.Gold],
  phantom: [ID.Feather], // Cerf-Volant de Nuit: kite fins
  parrot: [ID.Feather, ID.Prism], // Perroquet-Prisme: + prism (was feather only)
  dragon: [ID.Elytra, ID.Totem, ID.Scrap, ID.VoidCore],
  wither: [ID.NetherStar], // Le Triple Rebut: weld star
  frog: [ID.Slime],
  fox: [ID.Fur, ID.RawMeat],
  crab: [ID.Scale],
  wisp: [ID.Wisp],
  slime: [ID.Slime], // Gélatoc: big ones dropped nothing before splitting — now 1 gel at every size
  wolf: [ID.Bone, ID.Fur], // Clébard-Clip: + fuzz
  golem: [ID.Ingot],
  guardian: [ID.GuardianSpike, ID.Crystal],
  shulker: [ID.ShulkerShell, ID.VoidCore],
  pillager: [ID.IllagerBadge, ID.Arrow],
  vindicator: [ID.IllagerBadge, ID.Emerald],
  evoker: [ID.Totem, ID.IllagerBadge, ID.Emerald],
  vex: [ID.Wisp],
  ravager: [ID.IllagerBadge, ID.Fur, ID.RawMeat],
  villager: [ID.Emerald],
};

export function mobBaseDrops(kind: string, ctx: DropCtx = {}): number[] {
  if (kind === "sheep" && ctx.sheared) return [ID.RawMeat];
  return [...((MOB_BASE_DROPS as Record<string, readonly number[]>)[kind] ?? [ID.Pellets])];
}

/** Bonus rolls. `luck` = scaled by the trophy/generous luck (0.38 / 0.62); `p` = fixed chance. */
export type BonusDrop = { kinds: readonly string[]; id: number; luck?: number; p?: number };
export const MOB_BONUS_DROPS: readonly BonusDrop[] = [
  { kinds: ["walker"], id: ID.RawMeat, luck: 1 },
  { kinds: ["husk"], id: ID.PharaohGold, luck: 1 },
  { kinds: ["skelly", "stray", "phantom"], id: ID.Wisp, luck: 1 },
  { kinds: ["creeper"], id: ID.Slime, luck: 1 },
  { kinds: ["fox"], id: ID.Pelt, luck: 1 },
  { kinds: ["crab"], id: ID.Shell, luck: 1 },
  { kinds: ["frog"], id: ID.Wax, luck: 0.6 },
  { kinds: ["wisp"], id: ID.Frost, luck: 1 },
  { kinds: ["enderman"], id: ID.VoidCore, luck: 1 },
  { kinds: ["drowned", "guardian"], id: ID.GuardianSpike, luck: 1 },
  { kinds: ["drowned"], id: ID.Trident, p: 0.25 },
  { kinds: ["pillager"], id: ID.Crossbow, p: 0.18 },
  { kinds: ["pillager", "vindicator", "evoker"], id: ID.IllagerBadge, luck: 1 },
  { kinds: ["vindicator"], id: ID.TPlasticAxe, p: 0.16 }, // P8: moulded tempered axe
  { kinds: ["ravager"], id: ID.Emerald, luck: 1 },
  { kinds: ["squid"], id: ID.InkSac, luck: 1 },
  { kinds: ["witch"], id: ID.WitchVenom, luck: 1 },
  { kinds: ["creeper", "ghast"], id: ID.Cinder, luck: 0.7 },
  { kinds: ["skelly", "walker"], id: ID.Antler, luck: 0.45 },
  { kinds: ["pig"], id: ID.Gold, p: 0.12 }, // Cochonnet-Tirelire: the coin in its slot
  { kinds: ["golem"], id: ID.Ingot, luck: 0.5 }, // Grue-Garde: crane counterweight
];

export function rollBonusDrops(kind: string, luck: number, rnd: () => number = Math.random): number[] {
  const out: number[] = [];
  for (const b of MOB_BONUS_DROPS) {
    if (!b.kinds.includes(kind)) continue;
    if (rnd() < (b.p ?? luck * (b.luck ?? 1))) out.push(b.id);
  }
  return out;
}

export const DROP_MOB_KINDS = MOB_KINDS.filter((k) => k !== "boat" && k !== "cart");
