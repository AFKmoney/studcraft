// v4.17 — Teardown LEGO: every full block is built from 12 LEGO pieces
// (a 2 × 2 grid of 1×1 bricks, 3 courses high — the studs of a block sit
// exactly on the 4 piece centres). Explosions, mining and collapses knock
// pieces out one by one; the block keeps the pieces that are left.
//
// Sparse state only (Philippe's law: A1 performance even on cheap devices):
// a block that was never damaged has no entry, and when nothing is damaged
// every lookup here is a single `size` check. Imports nothing from
// game/mesher -> no import cycles.

export const PIECES = 12;
export const FULL = (1 << PIECES) - 1;

/** piece index: ix (0..1, x) + 2·iz (0..1, z) + 4·iy (0..2, y) */
export function pieceIndex(ix: number, iy: number, iz: number) {
  return ix + 2 * iz + 4 * iy;
}
export function pieceCoords(p: number): [number, number, number] {
  return [p & 1, p >> 2, (p >> 1) & 1];
}
/** local centre of a piece inside its block (0..1 on each axis) */
export function pieceCentre(p: number): [number, number, number] {
  const [ix, iy, iz] = pieceCoords(p);
  return [ix * 0.5 + 0.25, (iy + 0.5) / 3, iz * 0.5 + 0.25];
}

export function ckey(x: number, y: number, z: number): string {
  return x + "," + y + "," + z;
}

/**
 * Damaged blocks: key -> (blockId << 12) | removedMask. The id is stored with
 * the mask so a stale entry can never carve a DIFFERENT block placed later in
 * the same cell (it is ignored, then dropped by the game on the next write).
 */
export const chipMap = new Map<string, number>();

/** Removed-piece mask of the block at (x,y,z) if it is still `id`, else 0. */
export function removedAt(x: number, y: number, z: number, id: number): number {
  if (!chipMap.size) return 0;
  const v = chipMap.get(ckey(x, y, z));
  if (v === undefined || v >>> 12 !== id) return 0;
  return v & FULL;
}

export function setRemoved(x: number, y: number, z: number, id: number, mask: number) {
  const k = ckey(x, y, z);
  if (!mask) chipMap.delete(k);
  else chipMap.set(k, (id << 12) | (mask & FULL));
}

export function clearChips() {
  chipMap.clear();
}
