import { ID, def } from "./blocks.ts";

// R4 — BUILD IDENTITY (master plan §8, RPG roadmap 2026-10-28):
// "A specialization choice that commits the character (one
// signature branch bonus) + rare named loot with affixes, so two
// players' gear reads different."
//
// This module is the pure data + generation half. game.ts wires
// every bonus into the real systems (Foundry ticks, upgrade costs,
// chest stocking, mining), so a path is a set of numbers the game
// actually obeys — never a label.

export type PathId = "founder" | "mechanic" | "scavenger" | "breaker";

export const PATHS: { id: PathId; name: string; bonus: string }[] = [
  { id: "founder", name: "The Founder", bonus: "Foundry cooks 20% faster" },
  { id: "mechanic", name: "The Mechanic", bonus: "Machine upgrades cost 25% less matter" },
  { id: "scavenger", name: "The Scavenger", bonus: "Monument chests always hold a Teks part — and named relics turn up twice as often" },
  { id: "breaker", name: "The Breaker", bonus: "Breaks blocks 25% faster · mining knocks 3 chips loose instead of 2" },
];

/** Changing your committed path costs this many emeralds. The first
 *  choice is free; identity is a commitment, not a menu. */
export const PATH_CHANGE_COST = 25;

export type AffixKey = "keen" | "swift" | "sturdy" | "lucky";

export const AFFIXES: Record<AffixKey, { name: string; suffix: string; desc: string }> = {
  keen: { name: "Keen", suffix: "the Edge", desc: "+2 damage" },
  swift: { name: "Swift", suffix: "the Wind", desc: "breaks blocks 15% faster" },
  sturdy: { name: "Sturdy", suffix: "the Mountain", desc: "wears out half as fast" },
  lucky: { name: "Lucky", suffix: "the Prospector", desc: "+1 pellet from plastic blocks" },
};

const AFFIX_KEYS: AffixKey[] = ["keen", "swift", "sturdy", "lucky"];

/** Relic bases: high-tier gear a named variant can ride on. The
 *  bag holds ONE instance per gear id (its count is durability),
 *  so a base the player already owns converts to pellets instead. */
export const RELIC_BASES = [
  ID.SwordG, ID.TPlasticSword, ID.PickG, ID.MasterPick, ID.TPlasticPick, ID.ExecutionerAxe, ID.TPlasticAxe, ID.TPlasticShovel,
] as const;

export type Relic = { baseId: number; name: string; affixes: [AffixKey, AffixKey] };

/** Deterministic relic from three rolls in [0, 1): base, first
 *  affix, second affix (always distinct from the first). The name
 *  reads "{Affix1} {base name} of {Affix2 suffix}". */
export function rollRelic(r1: number, r2: number, r3: number): Relic {
  const baseId = RELIC_BASES[Math.floor(r1 * RELIC_BASES.length) % RELIC_BASES.length];
  const a1 = AFFIX_KEYS[Math.floor(r2 * AFFIX_KEYS.length) % AFFIX_KEYS.length];
  const rest = AFFIX_KEYS.filter((k) => k !== a1);
  const a2 = rest[Math.floor(r3 * rest.length) % rest.length];
  return {
    baseId,
    name: AFFIXES[a1].name + " " + def(baseId).name + " of " + AFFIXES[a2].suffix,
    affixes: [a1, a2],
  };
}
