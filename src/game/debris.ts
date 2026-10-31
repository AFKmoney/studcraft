import { ID } from "./blocks.ts";
import { hash2, hash3, makeNoise } from "./noise.ts";

// §11 DEBRIS SITES — THE FULL DESIGN (Philippe, master plan §11).
//
// Wreckage scattered through the world is the FIND half of the
// double path for advanced parts: everything findable here is also
// castable at the Foundry (the craft half, B4) — finding is a
// shortcut, never a monopoly, and crafting stays the pity timer.
//
// Topology, three readable rules:
// - ZONES by distance from the world origin: the farther out, the
//   richer the wreckage (zone 0 < 20 chunks, zone 1 < 56, zone 2
//   beyond). Zone 0 teaches (basic parts), zone 2 pays (hubs,
//   servos, sensors).
// - ARTERIES: a low-frequency noise ridge concentrates sites into
//   wandering bands — learn to follow a ridge and loot follows.
//   Density multiplier 0.6 (off-ridge) to 2.2 (on the ridge).
// - MONUMENTS (sites with chests) are the jackpots: loot.ts adds a
//   bonus advanced part to most monument chests.
//
// Unused finds recycle at the Foundry for ~50% of their casting
// cost in pellets (recipes.ts SMELT rows) — nothing found is dead
// weight, nothing kept is lost matter.

/** Tier 0 finds: the mechanical basics. */
export const DEBRIS_BASIC = [
  ID.Axle, ID.Axle2, ID.Axle4, ID.Axle6, ID.Axle8,
  ID.Gear8, ID.Gear16, ID.Gear24, ID.Gear40,
  ID.Crank, ID.Worm, ID.Pin2L, ID.Pin3L,
  ID.Liftarm3, ID.Liftarm5, ID.Thin3, ID.Thin5,
  ID.CrossBlock, ID.Angle1, ID.Angle6,
] as const;

/** Advanced finds (common): the working machines of P5/P5b/P5c. */
export const DEBRIS_ADVANCED = [
  ID.Wheel, ID.MotorM, ID.Battery,
  ID.Actuator, ID.ActMini, ID.Pump, ID.Cylinder, ID.Valve, ID.Tank,
  ID.SmallPump, ID.SpringPump,
  ID.Diff, ID.Rack, ID.UJoint, ID.Pulley, ID.Cam,
  ID.DigBucket,
] as const;

/** Advanced finds (rare): the prizes — zone 2 and monument chests. */
export const DEBRIS_RARE = [
  ID.TechHub, ID.MotorL, ID.MotorXL, ID.Servo, ID.Remote,
  ID.ActXL, ID.SensorDist, ID.SensorColor,
] as const;

/** Back-compat name (the v1 pool). */
export const DEBRIS_PARTS = DEBRIS_BASIC;

export function debrisZone(cx: number, cz: number): 0 | 1 | 2 {
  const d = Math.max(Math.abs(cx), Math.abs(cz));
  return d < 20 ? 0 : d < 56 ? 1 : 2;
}

/** The artery field: 0.6 off-ridge, up to 2.2 on a ridge line. */
export function arteryMul(seed: number, cx: number, cz: number): number {
  const n = makeNoise(seed + 8812).noise2(cx * 0.03, cz * 0.03); // 0..1 smooth
  const ridge = 1 - Math.abs(n * 2 - 1); // peaks where the field crosses its middle
  return 0.6 + ridge * ridge * 1.6;
}

function pick(pool: readonly number[], roll: number): number {
  return pool[Math.floor(roll * pool.length) % pool.length];
}

/** One site per chunk — possibly none. Spot and parts derive only
 *  from (seed, cx, cz), so a site is identical on every visit and
 *  every client. `ids` empty = no site in this chunk. */
export function debrisAt(seed: number, cx: number, cz: number) {
  const lx = 2 + Math.floor(hash2(cx, cz, seed + 8801) * 12);
  const lz = 2 + Math.floor(hash2(cx, cz, seed + 8802) * 12);
  const zone = debrisZone(cx, cz);
  // Presence: ~38% of chunks before the artery multiplier.
  if (hash2(cx, cz, seed + 8800) > 0.38 * arteryMul(seed, cx, cz)) return { lx, lz, ids: [] as number[] };
  const base = zone === 0 ? 2 + Math.floor(hash2(cx, cz, seed + 8804) * 3) : zone === 1 ? 3 + Math.floor(hash2(cx, cz, seed + 8804) * 3) : 4 + Math.floor(hash2(cx, cz, seed + 8804) * 3);
  const advSlots = zone === 0 ? 0 : zone === 1 ? 1 + (hash2(cx, cz, seed + 8805) > 0.8 ? 1 : 0) : 2 + (hash2(cx, cz, seed + 8805) > 0.7 ? 1 : 0);
  const rareChance = zone === 1 ? 0.12 : zone === 2 ? 0.28 : 0;
  const ids: number[] = [];
  for (let i = 0; i < base; i++) ids.push(pick(DEBRIS_BASIC, hash3(cx, i, cz, seed + 8803)));
  for (let i = 0; i < advSlots; i++) {
    const rare = hash3(cx, 100 + i, cz, seed + 8806) < rareChance;
    ids.push(pick(rare ? DEBRIS_RARE : DEBRIS_ADVANCED, hash3(cx, 200 + i, cz, seed + 8807)));
  }
  // Zone 0 teaser: rarely, one advanced part far above the zone's
  // pay grade — a reason to go farther. Never a rare.
  if (zone === 0 && hash2(cx, cz, seed + 8808) > 0.92) ids.push(pick(DEBRIS_ADVANCED, hash3(cx, 300, cz, seed + 8807)));
  return { lx, lz, ids };
}

/** Stud positions of the pile. Scattered, not stacked. Parts sit above 255. */
export function debrisStuds(seed: number, cx: number, cz: number, h: number) {
  const spot = debrisAt(seed, cx, cz);
  const x = cx * 16 + spot.lx;
  const z = cz * 16 + spot.lz;
  return spot.ids.map((id, i) => {
    const ox = Math.floor(hash3(cx, i, cz, seed + 8810) * 3) - 1;
    const oz = Math.floor(hash3(cx, i, cz, seed + 8811) * 3) - 1;
    return { id, sx: (x + ox) * 2, sy: h + 1, sz: (z + oz) * 2 };
  });
}
