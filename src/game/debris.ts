import { ID } from "./blocks.ts";
import { hash2, hash3 } from "./noise.ts";

/** The pile is these parts, nothing else. Not a loot table. */
export const DEBRIS_PARTS = [ID.Axle, ID.Gear8, ID.Gear16, ID.Gear24, ID.Crank, ID.Worm] as const;

/** One site per chunk. The spot and the three parts come from the world seed. */
export function debrisAt(seed: number, cx: number, cz: number) {
  const lx = 2 + Math.floor(hash2(cx, cz, seed + 8801) * 12);
  const lz = 2 + Math.floor(hash2(cx, cz, seed + 8802) * 12);
  const ids = [0, 1, 2].map(
    (i) => DEBRIS_PARTS[Math.floor(hash3(cx, i, cz, seed + 8803) * DEBRIS_PARTS.length) % DEBRIS_PARTS.length],
  );
  return { lx, lz, ids };
}

/** Stud positions of the pile. Parts sit above 255, so they are bricks, never voxels. */
export function debrisStuds(seed: number, cx: number, cz: number, h: number) {
  const spot = debrisAt(seed, cx, cz);
  const x = cx * 16 + spot.lx;
  const z = cz * 16 + spot.lz;
  return [
    { id: spot.ids[0], sx: x * 2, sy: h + 1, sz: z * 2 },
    { id: spot.ids[1], sx: (x + 1) * 2, sy: h + 1, sz: z * 2 },
    { id: spot.ids[2], sx: x * 2, sy: h + 2, sz: z * 2 },
  ];
}
