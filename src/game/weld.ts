// P2 residues — the pure half of welding (game.ts owns the meshes,
// the stress scans and the save). Two questions live here:
//  1. What is the welded COMPONENT of a brick? (BFS over joint pairs)
//  2. Where does the visible weld BEAD run? (a ring of segments
//     around the contact rectangle of a welded pair, half-proud of
//     the bricks' surface so the seam reads from above and the side)

export type BrickLike = { sx: number; sy: number; sz: number };

/** The welded component containing `start`: every brick key
 *  reachable through weld pairs. `welds` holds "keyA|keyB" strings;
 *  `keyOf` maps a brick back to its key. */
export function weldComponentOf(welds: Iterable<string>, start: string): string[] {
  const adj = new Map<string, string[]>();
  for (const w of welds) {
    const [a, b] = w.split("|");
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push(b);
    adj.get(b)!.push(a);
  }
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    const k = queue.shift()!;
    for (const n of adj.get(k) ?? []) {
      if (!seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  return [...seen];
}

export type BeadSeg = { cx: number; cy: number; cz: number; sx: number; sy: number; sz: number };

const T = 0.1; // bead thickness (blocks)
const H = 0.15; // bead height across the seam (blocks)

/** The bead ring for one welded pair, in WORLD block units (a brick
 *  spans [s/2, s/2 + 1] in x/z and [sy, sy + 1] in y). Four segments
 *  trace the contact rectangle's perimeter, centred on the bricks'
 *  outer surface line: half embedded, half proud. */
export function beadSegments(a: BrickLike, b: BrickLike): BeadSeg[] {
  const ox0 = Math.max(a.sx, b.sx) / 2;
  const ox1 = Math.min(a.sx + 2, b.sx + 2) / 2;
  const oz0 = Math.max(a.sz, b.sz) / 2;
  const oz1 = Math.min(a.sz + 2, b.sz + 2) / 2;
  if (Math.abs(a.sy - b.sy) === 1) {
    // Stacked: a horizontal ring at the seam height (the upper
    // brick's floor), following the overlap rectangle.
    const y = Math.max(a.sy, b.sy);
    const mx = (ox0 + ox1) / 2;
    const mz = (oz0 + oz1) / 2;
    return [
      { cx: mx, cy: y, cz: oz0, sx: ox1 - ox0 + T, sy: H, sz: T },
      { cx: mx, cy: y, cz: oz1, sx: ox1 - ox0 + T, sy: H, sz: T },
      { cx: ox0, cy: y, cz: mz, sx: T, sy: H, sz: oz1 - oz0 + T },
      { cx: ox1, cy: y, cz: mz, sx: T, sy: H, sz: oz1 - oz0 + T },
    ];
  }
  if (a.sy === b.sy) {
    const my = a.sy + 0.5;
    if (ox1 - ox0 === 0) {
      // Side by side along x: a vertical ring in the contact plane.
      const px = ox0;
      const mz = (oz0 + oz1) / 2;
      return [
        { cx: px, cy: a.sy + 1, cz: mz, sx: T, sy: T, sz: oz1 - oz0 + T },
        { cx: px, cy: a.sy, cz: mz, sx: T, sy: T, sz: oz1 - oz0 + T },
        { cx: px, cy: my, cz: oz0, sx: T, sy: 1 + T, sz: T },
        { cx: px, cy: my, cz: oz1, sx: T, sy: 1 + T, sz: T },
      ];
    }
    if (oz1 - oz0 === 0) {
      // Side by side along z: a vertical ring in the contact plane.
      const pz = oz0;
      const mx = (ox0 + ox1) / 2;
      return [
        { cx: mx, cy: a.sy + 1, cz: pz, sx: ox1 - ox0 + T, sy: T, sz: T },
        { cx: mx, cy: a.sy, cz: pz, sx: ox1 - ox0 + T, sy: T, sz: T },
        { cx: ox0, cy: my, cz: pz, sx: T, sy: 1 + T, sz: T },
        { cx: ox1, cy: my, cz: pz, sx: T, sy: 1 + T, sz: T },
      ];
    }
  }
  return [];
}
