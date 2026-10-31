// Mob display names — "Ménagerie de Plastique" redesign (Philippe, 2026-10-31).
// Internal `kind` ids stay Minecraft-flavoured on purpose: saves, AI, drops,
// spawns and multiplayer all key on them. Only what the player READS changes,
// so every on-screen mob name goes through this table.
// Full design: mob-redesign.md (roster §3).

import { BOSS_BY_ID, SPECIES_BY_ID } from "./biomes.ts";

export const MOB_KINDS = [
  "sheep", "creeper", "cow", "walker", "pig", "chicken", "spider", "skelly", "villager", "ghast", "dragon", "horse",
  "phantom", "piglin", "boat", "cart", "frog", "fox", "crab", "wisp", "slime", "wolf", "golem", "wither", "enderman",
  "blaze", "witch", "bee", "cat", "squid", "bat", "drowned", "husk", "stray", "goat", "axolotl", "parrot", "guardian",
  "shulker", "pillager", "vindicator", "evoker", "vex", "ravager",
] as const;

export type MobKind = (typeof MOB_KINDS)[number];

export const MOB_LABEL: Record<MobKind, string> = {
  sheep: "Floconnet",
  cow: "Meuhbloc",
  pig: "Cochonnet-Tirelire",
  chicken: "Cocotte-Clic",
  horse: "Galopiot",
  fox: "Rusé-Ressort",
  frog: "Grenoplaque",
  crab: "Pincette",
  wolf: "Clébard-Clip",
  cat: "Minou-Molette",
  bee: "Bzzt",
  parrot: "Perroquet-Prisme",
  bat: "Chauvi-Clip",
  squid: "Poulpe-Pipette",
  axolotl: "Axolo-Flotteur",
  goat: "Bélier-Butoir",
  villager: "Bricolier",
  golem: "Grue-Garde",
  walker: "Démoulé",
  husk: "Démoulé des sables",
  drowned: "Démoulé gonflé",
  skelly: "Squelek",
  stray: "Squelek givré",
  creeper: "Pétabrique",
  spider: "Araignée-Pince",
  enderman: "Veilleur-Prisme",
  witch: "Mixeuse",
  slime: "Gélatoc",
  wisp: "Lucion",
  phantom: "Cerf-Volant de Nuit",
  guardian: "Bouée-Sentinelle",
  ghast: "Fumebloc",
  blaze: "Braiseur",
  piglin: "Groin-d'Or",
  shulker: "Coffre-Huître",
  pillager: "Pilleplot",
  vindicator: "Casseur",
  evoker: "Invoqueur-Manivelle",
  vex: "Vexlet",
  ravager: "Bulldobrique",
  dragon: "La Grande Presse",
  wither: "Le Triple Rebut",
  boat: "Boat",
  cart: "Cart",
};

/** On-screen name of a mob; a few kinds carry state-dependent variants. */
export function mobLabel(kind: string, opts: { tame?: boolean; elder?: boolean } = {}): string {
  if (kind === "wolf" && !opts.tame) return "Clébard-Clip sauvage";
  if (kind === "guardian" && opts.elder) return "Bouée-Sentinelle ancienne";
  return (MOB_LABEL as Record<string, string>)[kind] ?? kind;
}

// biomes-bosses: original species + biome bosses (labels live with their specs).
export const SPECIES_LABEL: Readonly<Record<string, string>> = Object.fromEntries([...SPECIES_BY_ID].map(([id, s]) => [id, s.label]));
export const BOSS_LABEL: Readonly<Record<string, string>> = Object.fromEntries([...BOSS_BY_ID].map(([id, b]) => [id, b.label]));
/** Display name for a live mob: boss > species > zone variant > kind. */
export function displayName(m: { kind: string; species?: string; bossOf?: string; variantLabel?: string; tame?: boolean; elder?: boolean }): string {
  if (m.bossOf && BOSS_LABEL[m.bossOf]) return BOSS_LABEL[m.bossOf];
  if (m.species && SPECIES_LABEL[m.species]) return SPECIES_LABEL[m.species];
  if (m.variantLabel) return m.variantLabel;
  return mobLabel(m.kind as MobKind, { tame: m.tame, elder: m.elder });
}
