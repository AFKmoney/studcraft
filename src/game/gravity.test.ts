import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyzeComponent, type GravOpts } from "./gravity.ts";

// Fake world: Map-backed, ids — 1 stone (member), 2 bedrock
// (anchor), 3 furnace (fixed), 4 sand (fall-type), 0 air.
const STONE = 1;
const BEDROCK = 2;
const FURNACE = 3;
const SAND = 4;
const opts: GravOpts = {
  solid: (id) => id !== 0,
  anchor: (id) => id === BEDROCK,
  fixed: (id) => id === FURNACE,
  fall: (id) => id === SAND,
};
function world(blocks: [number, number, number, number][]) {
  const m = new Map<string, number>();
  for (const [x, y, z, id] of blocks) m.set(x + "," + y + "," + z, id);
  return (x: number, y: number, z: number) => m.get(x + "," + y + "," + z) ?? 0;
}

describe("gravity §12 component analysis", () => {
  it("a floating platform falls with 0 supports, cells bottom-up", () => {
    const get = world([
      [0, 10, 0, STONE],
      [1, 10, 0, STONE],
      [1, 11, 0, STONE],
    ]);
    const v = analyzeComponent(get, 0, 10, 0, opts);
    assert.equal(v.kind, "falls");
    if (v.kind === "falls") {
      assert.equal(v.supports, 0);
      assert.equal(v.cells.length, 3);
      assert.equal(v.cells[0].y, 10);
      assert.equal(v.cells[2].y, 11);
    }
  });

  it("a platform on two fixed blocks stands; on one it falls", () => {
    const two = world([
      [0, 9, 0, FURNACE],
      [2, 9, 0, FURNACE],
      [0, 10, 0, STONE],
      [1, 10, 0, STONE],
      [2, 10, 0, STONE],
    ]);
    const v2 = analyzeComponent(two, 1, 10, 0, opts);
    assert.equal(v2.kind, "stands");
    if (v2.kind === "stands") assert.equal(v2.supports, 2);
    const one = world([
      [0, 9, 0, FURNACE],
      [0, 10, 0, STONE],
      [1, 10, 0, STONE],
      [2, 10, 0, STONE],
    ]);
    const v1 = analyzeComponent(one, 1, 10, 0, opts);
    assert.equal(v1.kind, "falls");
    if (v1.kind === "falls") assert.equal(v1.supports, 1);
  });

  it("sand counts as ground but is never a member", () => {
    const get = world([
      [0, 9, 0, SAND],
      [2, 9, 0, SAND],
      [0, 10, 0, STONE],
      [1, 10, 0, STONE],
      [2, 10, 0, STONE],
    ]);
    const v = analyzeComponent(get, 0, 10, 0, opts);
    assert.equal(v.kind, "stands");
    // Starting inside the sand itself: not a member, nothing to do.
    assert.equal(analyzeComponent(get, 0, 9, 0, opts).kind, "anchored");
  });

  it("touching bedrock anchors; a mass that overflows the budget is terrain", () => {
    const onBedrock = world([
      [0, 0, 0, BEDROCK],
      [0, 1, 0, STONE],
      [1, 1, 0, STONE],
    ]);
    assert.equal(analyzeComponent(onBedrock, 0, 1, 0, opts).kind, "anchored");
    // A long stone floor with a tiny budget: the fill cannot close.
    const floor: [number, number, number, number][] = [];
    for (let x = 0; x < 40; x++) floor.push([x, 5, 0, STONE]);
    const v = analyzeComponent(world(floor), 20, 5, 0, { ...opts, maxCells: 10 });
    assert.equal(v.kind, "anchored");
  });

  it("a cut column top falls; the rooted stump is terrain", () => {
    // Column y 10..20 on a stone floor at y 9 that runs off to the
    // horizon (budget overflow = terrain). Cut at y 15 (air there).
    const blocks: [number, number, number, number][] = [];
    for (let x = -20; x <= 20; x++) blocks.push([x, 9, 0, STONE]);
    for (let y = 10; y <= 20; y++) if (y !== 15) blocks.push([0, y, 0, STONE]);
    const get = world(blocks);
    const top = analyzeComponent(get, 0, 18, 0, { ...opts, maxCells: 60 });
    assert.equal(top.kind, "falls");
    if (top.kind === "falls") assert.equal(top.cells.length, 5); // y 16..20
    const stump = analyzeComponent(get, 0, 12, 0, { ...opts, maxCells: 30 });
    assert.equal(stump.kind, "anchored"); // rooted into the floor mass (fill overflows)
  });

  it("air and fixed starts are no-ops", () => {
    const get = world([[0, 9, 0, FURNACE]]);
    assert.equal(analyzeComponent(get, 5, 5, 5, opts).kind, "anchored");
    assert.equal(analyzeComponent(get, 0, 9, 0, opts).kind, "anchored");
  });
});
