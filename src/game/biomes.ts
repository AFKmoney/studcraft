// Biome zones, their mob rosters and their bosses (biomes-bosses, 2026-10-31).
// Pure data + pure rules so they are testable without a renderer.
//
// A *zone* is a gameplay label laid on top of the terrain biome
// (World.zoneAt): new zones are noise VARIANTS of existing biomes, so the
// terrain of every saved world is unchanged — only spawns differ.
//
// Regular mobs are either an existing kind worn in the zone's palette
// (`tint`, a parameter variant — AI untouched) or a *species*: an original
// toy-brick creature (refs/collection.jpg style) built by buildSpecies() and
// driven by an existing kind's AI (`ai`). Bosses reuse an existing kind's AI
// at a bigger scale, with at most ONE new SNR rule each (bossSkin rule).
import { ID } from "./blocks.ts";

export type ZoneId =
  | "jungle" | "desert" | "arctic" | "volcano" | "valley" | "plains"
  | "mountain" | "swamp" | "canyon" | "desertCity" | "islands";

export type BossRule = "molten" | "weld" | "vein" | "heat" | "frost" | "jelly" | "strata" | "iris";

/** Archetypes of the original collection (refs/collection.jpg). */
export type Archetype = "crab" | "raptor" | "beetle" | "ankylo" | "drake" | "spider";

export type SpeciesSpec = {
  id: string;
  label: string;
  arch: Archetype;
  ai: string; // existing Mob kind whose AI drives it
  color: number; // main bright plastic
  accent: number; // white/secondary plates
  joint?: number; // Technic joints (default grey 0x5a5f66)
  eye?: number; // trans eye (default green 0x5cff6a)
  size: number; // overall scale
  hp: number;
  drops: readonly number[];
};

export const SPECIES: readonly SpeciesSpec[] = [
  { id: "raptoclic", label: "Raptoclic", arch: "raptor", ai: "fox", color: 0xf2c614, accent: 0xf6e27a, size: 1, hp: 6, drops: [ID.Feather, ID.RawMeat] },
  { id: "lianarak", label: "Lianarak", arch: "spider", ai: "spider", color: 0x2f8a3a, accent: 0xa6e05a, size: 1, hp: 8, drops: [ID.String, ID.Slime] },
  { id: "scarabrique", label: "Scarabrique", arch: "beetle", ai: "crab", color: 0xe0a82e, accent: 0x6a4a1a, size: 0.9, hp: 5, drops: [ID.Scale, ID.Gold] },
  { id: "dunosaure", label: "Dunosaure", arch: "ankylo", ai: "goat", color: 0xd8c08a, accent: 0x9a7a4a, size: 1, hp: 8, drops: [ID.Antler, ID.RawMeat] },
  { id: "ankylogivre", label: "Ankylogivre", arch: "ankylo", ai: "goat", color: 0xf2f4f6, accent: 0xc8ccd2, size: 1, hp: 8, drops: [ID.Antler, ID.Frost] },
  { id: "pingoclic", label: "Pingoclic", arch: "raptor", ai: "chicken", color: 0x22262c, accent: 0xf2f4f6, eye: 0x7ad8ff, size: 0.75, hp: 4, drops: [ID.Feather, ID.Frost] },
  { id: "dracobraise", label: "Dracobraise", arch: "drake", ai: "wolf", color: 0xd42a2a, accent: 0xf2f4f6, size: 1, hp: 10, drops: [ID.Scale, ID.Cinder] },
  { id: "crabe-magma", label: "Crabe-Magma", arch: "crab", ai: "crab", color: 0x2a1e1a, accent: 0xff7a1a, eye: 0xffb03a, size: 0.9, hp: 6, drops: [ID.Cinder, ID.Shell] },
  { id: "scarableu", label: "Scarableu", arch: "beetle", ai: "pig", color: 0x2a5fd0, accent: 0xf2f4f6, size: 1, hp: 6, drops: [ID.Scale, ID.Shell] },
  { id: "ankylomousse", label: "Ankylomousse", arch: "ankylo", ai: "goat", color: 0x5aa84a, accent: 0xd8eec8, size: 0.9, hp: 8, drops: [ID.Antler, ID.Fur] },
  { id: "crabouge", label: "Crabouge", arch: "crab", ai: "crab", color: 0xd42a2a, accent: 0xf2f4f6, size: 1, hp: 5, drops: [ID.Scale, ID.Shell] },
  { id: "raptonnet", label: "Raptonnet", arch: "raptor", ai: "fox", color: 0x4ab0e8, accent: 0xf2f4f6, size: 0.9, hp: 6, drops: [ID.Feather, ID.RawMeat] },
  { id: "arachnoclic", label: "Arachnoclic", arch: "spider", ai: "spider", color: 0x2a5fd0, accent: 0x7aa8f0, size: 1, hp: 8, drops: [ID.String, ID.Crystal] },
  { id: "ankyroc", label: "Ankyroc", arch: "ankylo", ai: "goat", color: 0x8a8f96, accent: 0xd0d4d8, size: 1.1, hp: 10, drops: [ID.Antler, ID.Copper] },
  { id: "scarabouse", label: "Scarabouse", arch: "beetle", ai: "frog", color: 0x6a7a2a, accent: 0xb8c46a, size: 0.8, hp: 4, drops: [ID.Slime, ID.Scale] },
  { id: "arachnase", label: "Arachnase", arch: "spider", ai: "spider", color: 0x6a3aa8, accent: 0xc8a8f0, eye: 0xd86aff, size: 0.9, hp: 8, drops: [ID.String, ID.WitchVenom] },
  { id: "drakocre", label: "Drakocre", arch: "drake", ai: "wolf", color: 0xc0582a, accent: 0xf2d8b0, size: 1, hp: 10, drops: [ID.Scale, ID.Copper] },
  { id: "raptor-rouille", label: "Raptor-Rouille", arch: "raptor", ai: "fox", color: 0xa8442a, accent: 0xe8a070, size: 1, hp: 6, drops: [ID.Feather, ID.Scrap] },
  { id: "scarabor", label: "Scarabor", arch: "beetle", ai: "pig", color: 0xf5c518, accent: 0x1d4ed8, size: 1, hp: 6, drops: [ID.Gold, ID.PharaohGold] },
  { id: "drakosable", label: "Drakosable", arch: "drake", ai: "wolf", color: 0xd8c08a, accent: 0xf5c518, size: 0.9, hp: 10, drops: [ID.Scale, ID.Gold] },
  { id: "crabcorail", label: "Crabcorail", arch: "crab", ai: "crab", color: 0xf06a8a, accent: 0xfff0f4, size: 0.9, hp: 5, drops: [ID.Shell, ID.Prism] },
  { id: "drakazur", label: "Drakazur", arch: "drake", ai: "wolf", color: 0x2ab0a8, accent: 0xf2f4f6, eye: 0xffe14a, size: 1, hp: 10, drops: [ID.Scale, ID.GuardianSpike] },
];
export const SPECIES_BY_ID: ReadonlyMap<string, SpeciesSpec> = new Map(SPECIES.map((s) => [s.id, s]));

/** A zone roster entry: an existing kind in the zone palette, or a species. */
export type ZoneMob = { kind?: string; species?: string; tint?: number; label?: string; night?: boolean };

export type BossSpec = {
  id: string;
  label: string;
  ai: string; // existing kind (AI + base mesh)
  scale: number;
  hp: number;
  tint: number;
  rule?: BossRule; // at most one SNR rule per boss
  drops: readonly number[];
};

export type ZoneSpec = { id: ZoneId; label: string; ground: number; mobs: readonly ZoneMob[]; boss: BossSpec };

export const ZONES: Record<ZoneId, ZoneSpec> = {
  jungle: {
    id: "jungle", label: "Jungle", ground: 0x2f7a2a,
    mobs: [{ kind: "walker", tint: 0x3f8a3a, label: "Démoulé-liane", night: true }, { kind: "spider", tint: 0x2f7a2a }, { kind: "parrot" }, { species: "raptoclic" }, { species: "lianarak", night: true }],
    boss: { id: "totem-liane", label: "Totem-Liane", ai: "golem", scale: 1.8, hp: 90, tint: 0x3f8a3a, rule: "vein", drops: [ID.Crystal, ID.Emerald, ID.Wax] },
  },
  desert: {
    id: "desert", label: "Désert", ground: 0xe6d29a,
    mobs: [{ kind: "husk", night: true }, { kind: "crab", tint: 0xd8b04a, label: "Pincette dorée" }, { species: "scarabrique" }, { species: "dunosaure" }],
    boss: { id: "sphinx-moule", label: "Sphinx-Moule", ai: "husk", scale: 2.2, hp: 80, tint: 0xd8b04a, rule: "heat", drops: [ID.PharaohGold, ID.Gold, ID.Scale] },
  },
  arctic: {
    id: "arctic", label: "Arctique", ground: 0xf2f6fa,
    mobs: [{ kind: "stray", night: true }, { kind: "sheep", tint: 0xe8f4ff, label: "Floconnet polaire" }, { species: "ankylogivre" }, { species: "pingoclic" }],
    boss: { id: "mammouth-glacon", label: "Mammouth-Glaçon", ai: "ravager", scale: 1.6, hp: 100, tint: 0xdff0ff, rule: "frost", drops: [ID.Frost, ID.Fur, ID.Crystal] },
  },
  volcano: {
    id: "volcano", label: "Volcan", ground: 0x3a2a26,
    // No Pétabrique here (Philippe 2026-10-31): Braiseur, a scorched Fumebloc and two species.
    mobs: [{ kind: "blaze" }, { kind: "ghast", tint: 0x5a3a30, label: "Fumebloc cendré" }, { species: "dracobraise" }, { species: "crabe-magma" }],
    boss: { id: "forge-titan", label: "Forge-Titan", ai: "blaze", scale: 2, hp: 90, tint: 0x2a1e1a, rule: "molten", drops: [ID.Blaze, ID.Scrap, ID.Cinder] },
  },
  valley: {
    id: "valley", label: "Vallée", ground: 0x5aa84a,
    mobs: [{ kind: "cow" }, { kind: "sheep" }, { kind: "horse" }, { species: "scarableu" }, { species: "ankylomousse" }],
    boss: { id: "grand-meuhbloc", label: "Grand Meuhbloc", ai: "cow", scale: 2.2, hp: 60, tint: 0xf4f1ea, drops: [ID.RawMeat, ID.Pelt, ID.Gold] },
  },
  plains: {
    id: "plains", label: "Plaines", ground: 0x7cb84a,
    mobs: [{ kind: "pig" }, { kind: "chicken" }, { kind: "cow" }, { species: "crabouge" }, { species: "raptonnet" }],
    boss: { id: "grand-tirelire", label: "Grand Cochonnet-Tirelire", ai: "pig", scale: 2.2, hp: 60, tint: 0xf2a2c0, drops: [ID.RawMeat, ID.Gold, ID.Emerald] },
  },
  mountain: {
    id: "mountain", label: "Montagne", ground: 0x8a8f96,
    mobs: [{ kind: "goat" }, { kind: "golem", tint: 0x8a8f96, label: "Grue-Garde de pierre" }, { species: "arachnoclic", night: true }, { species: "ankyroc" }],
    boss: { id: "golem-strate", label: "Golem-Strate", ai: "golem", scale: 2, hp: 110, tint: 0x9a9088, rule: "strata", drops: [ID.Ingot, ID.Copper, ID.Crystal] },
  },
  swamp: {
    id: "swamp", label: "Marais", ground: 0x4a5a2a,
    mobs: [{ kind: "frog" }, { kind: "slime" }, { kind: "witch", night: true }, { species: "scarabouse" }, { species: "arachnase", night: true }],
    boss: { id: "reine-gelatine", label: "Reine-Gélatine", ai: "witch", scale: 1.9, hp: 70, tint: 0x7ad84a, rule: "jelly", drops: [ID.Slime, ID.WitchVenom, ID.PotionHeal] },
  },
  canyon: {
    id: "canyon", label: "Canyon", ground: 0xc0582a,
    mobs: [{ kind: "pillager", tint: 0xb8643a, night: true }, { species: "drakocre" }, { species: "raptor-rouille" }],
    boss: { id: "chef-pilleplot", label: "Chef Pilleplot", ai: "vindicator", scale: 1.6, hp: 70, tint: 0xb8643a, drops: [ID.IllagerBadge, ID.Crossbow, ID.Emerald] },
  },
  desertCity: {
    id: "desertCity", label: "Cité du désert", ground: 0xd8c08a,
    mobs: [{ kind: "villager" }, { kind: "vindicator", tint: 0xd8b04a, night: true }, { species: "scarabor" }, { species: "drakosable" }],
    boss: { id: "pharaon-presse", label: "Pharaon-Presse", ai: "piglin", scale: 2, hp: 90, tint: 0xf5c518, rule: "weld", drops: [ID.PharaohGold, ID.Gold, ID.Totem] },
  },
  islands: {
    id: "islands", label: "Îles mystérieuses", ground: 0xe6d29a,
    mobs: [{ kind: "parrot", tint: 0x7a4ad8, label: "Perroquet-Prisme mauve" }, { kind: "axolotl" }, { species: "crabcorail" }, { species: "drakazur" }],
    boss: { id: "kraken-bouee", label: "Kraken-Bouée", ai: "guardian", scale: 2.2, hp: 90, tint: 0x2ab0a8, rule: "iris", drops: [ID.GuardianSpike, ID.Shell, ID.Prism] },
  },
};
export const ZONE_IDS = Object.keys(ZONES) as ZoneId[];

/** Base terrain biome (World.biomeOf) + variant noise samples → zone. */
export function zoneFor(biome: string, h: number, v: (salt: number) => number): ZoneId | "" {
  switch (biome) {
    case "Jungle": return "jungle";
    case "Desert": return v(902) > 0.6 ? "desertCity" : "desert";
    case "Sand flats": return "desert";
    case "Snow cap": return "arctic";
    case "Ash ridge": return v(903) > 0.5 ? "volcano" : "mountain";
    case "Mesa": return "canyon";
    case "Fen": case "Deep fen": return "swamp";
    case "Grove": case "Flower grove": case "Mushroom": return "valley";
    case "Brick plains": return h >= 40 ? "mountain" : "plains";
    case "Shore": return v(901) > 0.55 ? "islands" : "";
    case "Ocean": return v(901) > 0.62 ? "islands" : "";
    case "Nether": return "volcano";
    default: return "";
  }
}

// ---------- boss spawn rule ----------
export const BOSS_CHANCE = 0.1;
export const BOSS_COOLDOWN_S = 240;
export type BossState = { lastZone: string; cooldown: number };

/** Call when the player's zone is sampled. Returns the zone whose boss should
 *  spawn now, or "". Rolls once per zone ENTRY (10 %), then a cooldown;
 *  never while another boss is alive. */
export function bossRoll(st: BossState, zone: string, bossAlive: boolean, dt: number, rnd: () => number): ZoneId | "" {
  st.cooldown = Math.max(0, st.cooldown - dt);
  if (zone === st.lastZone) return "";
  st.lastZone = zone;
  if (!zone || !(zone in ZONES) || bossAlive || st.cooldown > 0) return "";
  if (rnd() >= BOSS_CHANCE) return "";
  st.cooldown = BOSS_COOLDOWN_S;
  return zone as ZoneId;
}

/** mulberry32 — tiny seeded RNG for tests and reproducible rolls. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const BOSS_BY_ID: ReadonlyMap<string, BossSpec> = new Map(ZONE_IDS.map((z) => [ZONES[z].boss.id, ZONES[z].boss]));
