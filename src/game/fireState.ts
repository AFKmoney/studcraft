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
export const heatMap = new Map<string, { h: number; m: number; stage: number; sx?: number; sy?: number; sz?: number }>();

/**
 * v4.17 melt = Teardown STUDS: a heated block melts PIECE BY PIECE (its 12
 * STUDS pieces, see chipState), starting with the pieces that face the heat.
 * One remesh per piece: stage = floor(m · MELT_STAGES).
 * (sx, sy, sz) = accumulated direction from the block toward its heat
 * sources (written by the fire tick) — where the flames lick from.
 */
export const MELT_STAGES = 12;

export function heatDirAt(x: number, y: number, z: number): [number, number, number] {
  const e = heatMap.get(fkey(x, y, z));
  const dx = e?.sx ?? 0, dy = e?.sy ?? -1, dz = e?.sz ?? 0;
  const l = Math.hypot(dx, dy, dz) || 1;
  return [dx / l, dy / l, dz / l];
}

/** The order in which a block's 12 pieces melt: the ones facing the heat first (a bit lower first: flames lick upward from below). */
export function meltOrder(dx: number, dy: number, dz: number): number[] {
  const score: number[] = [];
  for (let p = 0; p < 12; p++) {
    const ix = p & 1, iz = (p >> 1) & 1, iy = p >> 2;
    const cx = ix * 0.5 - 0.25, cy = (iy + 0.5) / 3 - 0.5, cz = iz * 0.5 - 0.25;
    score.push(cx * dx + cy * dy + cz * dz - 0.12 * cy + ((p * 37) % 11) * 0.002);
  }
  return [...Array(12).keys()].sort((a, b) => score[b] - score[a]);
}

/** Melted puddle cell -> the block id it melted from (its tile/colors). */
export const puddleSrc = new Map<string, number>();

/** Melted puddle cell -> the pellet mass pooled in it (audit 2026-10-31:
 *  molten plastic FUSES into one mass visually, but its matter must stay
 *  recoverable — every block that melts into a puddle adds its pellet
 *  yield here, and mining the puddle pays the whole pool back). */
export const puddleMass = new Map<string, number>();

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
  puddleMass.clear();
}
