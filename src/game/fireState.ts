// v4.15 — shared fire / heat / melt state (SRN fire + melting plastic).
//
// Sparse maps only: when nothing is burning, every map here is empty and the
// whole system costs nothing (Philippe's law: A1 performance even on cheap
// devices). Imported by mesher.ts (melt deformation, puddle tiles, fire
// culling) and game.ts (simulation tick, flame/smoke instance sync, save).
// Imports nothing from game/mesher/blocks -> no import cycles.

export function fkey(x: number, y: number, z: number): string {
  return x + "," + y + "," + z;
}

export function funkey(k: string): [number, number, number] {
  const p = k.split(",");
  return [Number(p[0]), Number(p[1]), Number(p[2])];
}

/** Cells currently holding an ID.Fire block. Synced to the flame instances. */
export const fireCells = new Set<string>();

/** Flammable cells actively burning (the block itself is on fire): key -> seconds left. */
export const burningMap = new Map<string, number>();

/**
 * Heat emitters registered by the mesher per chunk (campfires, exposed lava):
 * chunkKey "cx,cz" -> cell keys. Validated by the tick (stale entries die).
 */
export const emitters = new Map<string, string[]>();

export function allEmitters(): string[] {
  const out: string[] = [];
  for (const list of emitters.values()) for (const k of list) out.push(k);
  return out;
}

/**
 * Heat/melt per cell. h = heat 0..1 (decays, drives further melting),
 * m = melt 0..1 (permanent deformation), stage = floor(m * 8) — the mesher
 * remeshes a cell's chunk only when its stage changes (<= 8 remeshes/melt).
 */
export const heatMap = new Map<string, { h: number; m: number; stage: number }>();

/** Melted puddle cell -> the block id it melted from (its tile/colors). */
export const puddleSrc = new Map<string, number>();

export function meltAt(x: number, y: number, z: number): number {
  const e = heatMap.get(fkey(x, y, z));
  return e ? e.m : 0;
}

export function clearFireState() {
  fireCells.clear();
  burningMap.clear();
  emitters.clear();
  heatMap.clear();
  puddleSrc.clear();
}
