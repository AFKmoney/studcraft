// CPU worker pool for world generation (prefetch ahead of the mesher).
// Size: hardwareConcurrency − 2 (main + render), clamped 1..6. Results
// are adopted only into the World they were asked for (seed + instance),
// never replace an existing chunk, and the main thread's ensure() stays
// the fallback whenever a chunk is not back yet (or Workers are absent).
// Meshing stays on the main thread: buildChunk reads neighbour chunks,
// the edits overlay and the brick layers, which live there.
import type { World } from "./world";

export type WorkerLike = { postMessage(m: unknown): void; onmessage: ((e: MessageEvent) => void) | null; terminate(): void };
export function poolSize(hc: number | undefined): number {
  return Math.max(1, Math.min(6, (hc ?? 2) - 2));
}

export class GenPool {
  private workers: { w: WorkerLike; busy: number }[] = [];
  private pending = new Map<string, number>(); // key → request id
  private next = 1;
  private world: World | null = null;
  stats = { adopted: 0, wasted: 0, ms: 0 };
  constructor(make: () => WorkerLike, n: number) {
    for (let i = 0; i < n; i++) {
      try {
        const w = make();
        const slot = { w, busy: 0 };
        w.onmessage = (e) => this.done(slot, e.data);
        this.workers.push(slot);
      } catch {
        break; // no workers → main-thread fallback
      }
    }
  }
  get size() {
    return this.workers.length;
  }
  /** Switch world (new game / load): in-flight results are dropped. */
  bind(world: World) {
    if (this.world !== world) {
      this.world = world;
      this.pending.clear();
    }
  }
  /** Queue the missing chunks (nearest first); max 2 in flight per worker. */
  prefetch(world: World, list: readonly { cx: number; cz: number }[]) {
    this.bind(world);
    if (!this.workers.length) return;
    for (const c of list) {
      const key = c.cx + "," + c.cz;
      if (world.has(c.cx, c.cz) || this.pending.has(key)) continue;
      const slot = this.workers.reduce((a, b) => (b.busy < a.busy ? b : a));
      if (slot.busy >= 2) return;
      const id = this.next++;
      this.pending.set(key, id);
      slot.busy++;
      slot.w.postMessage({ seed: world.seed, flat: world.flat, cx: c.cx, cz: c.cz, id });
    }
  }
  private done(slot: { busy: number }, d: { id: number; cx: number; cz: number; seed: number; flat: boolean; data: Uint16Array; ms: number }) {
    slot.busy = Math.max(0, slot.busy - 1);
    const key = d.cx + "," + d.cz;
    const w = this.world;
    if (this.pending.get(key) !== d.id || !w || w.seed !== d.seed || w.flat !== d.flat) {
      this.stats.wasted++;
      return;
    }
    this.pending.delete(key);
    if (w.adopt(d.cx, d.cz, d.data)) {
      this.stats.adopted++;
      this.stats.ms += d.ms;
    } else this.stats.wasted++;
  }
  terminate() {
    for (const s of this.workers) s.w.terminate();
    this.workers = [];
  }
}
