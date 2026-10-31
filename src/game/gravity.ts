// Component gravity analysis — master plan §12 ("la gravité pour
// TOUS les blocs"). PURE: the caller supplies block access and the
// block-class predicates; the verdict says whether the component
// containing the start cell is anchored, stands on enough supports,
// or falls (with its cells, bottom-up, ready for the faller waves).
//
// The model (Philippe's law + the §12 scoping design):
// - The natural terrain is ONE mass anchored to bedrock: it never
//   falls. The flood fill therefore runs through every ordinary
//   solid block, terrain included; a fill that cannot close inside
//   the cell budget is that mass (or a huge build) → anchored.
// - A component that DOES close is a detached island (anything
//   face-touching ordinary solid ground was absorbed into the mass
//   above). It stands iff at least 2 of its cells rest on ground it
//   could not absorb — fixed blocks, fall-type blocks, bedrock.
//   1 support = it falls, like the trees. 0 = it falls.
// - Bedrock adjacency anchors outright. Stateful blocks (work
//   stations, chests) are FIXED: never members, but they count as
//   ground. Fall-type blocks (sand & friends) keep their own
//   spawner and are never members — but they count as ground too.

export type GravGet = (x: number, y: number, z: number) => number;

export type GravOpts = {
  /** Ordinary solid block (def.solid). */
  solid: (id: number) => boolean;
  /** Bedrock-class: adjacency anchors the component. */
  anchor: (id: number) => boolean;
  /** Stateful block: never a member, counts as ground. */
  fixed: (id: number) => boolean;
  /** Fall-type block (own spawner): never a member, counts as ground. */
  fall: (id: number) => boolean;
  /** Flood-fill budget; overflow reads as the terrain mass. */
  maxCells?: number;
  /** Optional caller-shared set of already-classified member cells:
   *  the fill adds its cells to it (including on overflow), so a
   *  caller scanning several starts in one area never re-floods the
   *  same mass twice. */
  seen?: Set<string>;
};

export type GravCell = { x: number; y: number; z: number; id: number };

export type GravVerdict =
  | { kind: "anchored" }
  | { kind: "stands"; supports: number; cells: number }
  | { kind: "falls"; supports: number; cells: GravCell[] };

const DIRS6: [number, number, number][] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

const key = (x: number, y: number, z: number) => x + "," + y + "," + z;

export function analyzeComponent(get: GravGet, sx: number, sy: number, sz: number, opts: GravOpts): GravVerdict {
  const maxCells = opts.maxCells ?? 6000;
  const isMember = (id: number) => id !== 0 && opts.solid(id) && !opts.anchor(id) && !opts.fixed(id) && !opts.fall(id);
  if (!isMember(get(sx, sy, sz))) return { kind: "anchored" };
  const seen = opts.seen ?? new Set<string>();
  seen.add(key(sx, sy, sz));
  const cells: GravCell[] = [{ x: sx, y: sy, z: sz, id: get(sx, sy, sz) }];
  const queue: GravCell[] = [...cells];
  let touchesAnchor = false;
  while (queue.length) {
    const c = queue.pop()!;
    for (const [dx, dy, dz] of DIRS6) {
      const nx = c.x + dx;
      const ny = c.y + dy;
      const nz = c.z + dz;
      const nid = get(nx, ny, nz);
      if (opts.anchor(nid)) {
        touchesAnchor = true;
        continue;
      }
      if (!isMember(nid)) continue;
      const k = key(nx, ny, nz);
      if (seen.has(k)) continue;
      if (cells.length >= maxCells) return { kind: "anchored" }; // the terrain mass (or a huge build)
      seen.add(k);
      const cell = { x: nx, y: ny, z: nz, id: nid };
      cells.push(cell);
      queue.push(cell);
    }
  }
  if (touchesAnchor) return { kind: "anchored" };
  // Support points: member cells whose below-cell is solid ground
  // that is not itself part of this component.
  let supports = 0;
  for (const c of cells) {
    const below = get(c.x, c.y - 1, c.z);
    if (below !== 0 && opts.solid(below) && !seen.has(key(c.x, c.y - 1, c.z))) supports++;
  }
  if (supports >= 2) return { kind: "stands", supports, cells: cells.length };
  cells.sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z);
  return { kind: "falls", supports, cells };
}
