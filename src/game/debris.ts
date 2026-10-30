import { ID } from "./blocks.ts";
import { hash2, hash3 } from "./noise.ts";

/** Teks debris parts. Randomized per site. Broken-looking finds. */
export const DEBRIS_PARTS = [
  ID.Axle, ID.Axle2, ID.Axle4, ID.Axle6, ID.Axle8,
  ID.Gear8, ID.Gear16, ID.Gear24, ID.Gear40,
  ID.Crank, ID.Worm, ID.Pin2L, ID.Pin3L,
  ID.Liftarm3, ID.Liftarm5, ID.Thin3, ID.Thin5,
  ID.CrossBlock, ID.Angle1, ID.Angle6,
] as const;

/** One site per chunk. Spot, count (2-5), and parts randomized from world seed. */
export function debrisAt(seed: number, cx: number, cz: number) {
  const lx = 2 + Math.floor(hash2(cx, cz, seed + 8801) * 12);
  const lz = 2 + Math.floor(hash2(cx, cz, seed + 8802) * 12);
  const n = 2 + Math.floor(hash2(cx, cz, seed + 8804) * 4); // 2 to 5 parts
  const ids = Array.from({ length: n }, (_, i) =>
    DEBRIS_PARTS[Math.floor(hash3(cx, i, cz, seed + 8803) * DEBRIS_PARTS.length) % DEBRIS_PARTS.length],
  );
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
