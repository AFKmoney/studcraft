// v4.16 grass tufts — an independent decoration layer growing BETWEEN
// THE STUDS on top of Grass blocks (Philippe's law). Tufts are NOT world
// blocks: presence is derived deterministically (air cell + grass below +
// hash), so untouched tufts cost zero storage and zero per-frame work.
// Only TORN tufts are remembered (tuftGone) and saved with the world.
// No imports beyond block ids — no cycles (same pattern as fireState).
import { ID } from "./blocks";

export const tuftGone = new Set<string>();

export function tkey(x: number, y: number, z: number): string {
  return x + "," + y + "," + z;
}

export function parseTkey(k: string): [number, number, number] {
  const p = k.split(",");
  return [Number(p[0]), Number(p[1]), Number(p[2])];
}

// Deterministic hash of a grass column — same value forever for a cell.
export function tuftHash(x: number, z: number): number {
  let h = (x * 374761393 + z * 668265263) ^ 0x5bf03635;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Second independent channel for size/offset jitter in the mesher.
export function tuftJitter(x: number, z: number): number {
  let h = (x * 2246822519 + z * 3266489917) ^ 0x27d4eb2f;
  h = Math.imul(h ^ (h >>> 15), 2654435761);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export const TUFT_DENSITY = 0.22;

type Getter = { get(x: number, y: number, z: number): number };

// True when the AIR cell (x, y, z) carries a tuft: grass directly below,
// the cell itself empty, hash under density, and never torn by the player.
export function hasTuftAt(w: Getter, x: number, y: number, z: number): boolean {
  if (tuftGone.has(tkey(x, y, z))) return false;
  if (w.get(x, y, z) !== 0) return false;
  if (w.get(x, y - 1, z) !== ID.Grass) return false;
  return tuftHash(x, z) < TUFT_DENSITY;
}

export function tearTuft(x: number, y: number, z: number): void {
  tuftGone.add(tkey(x, y, z));
}

export function clearTufts(): void {
  tuftGone.clear();
}
