import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BLOCKS, ID } from "./blocks.ts";
import { RECIPES } from "./recipes.ts";

// P6 step 5 — boss moulds (bmold-*): the design contract, kept honest by
// this suite until the in-game qa111 battery (craftOf gate + casts) can
// run on a free rig. Design: ~/workspace/studcraft-work/p6-step5-design.md
const BMOLDS: [string, number, number, [number, number][]][] = [
  // [recipe id, required lvl, output id, need] — output maxUse checked too
  ["bmold-fang", 12, ID.FangBlade, [[ID.TemperedIngot, 2], [ID.Fang, 2], [ID.Bone, 1]]],
  ["bmold-cinder", 12, ID.CinderBlade, [[ID.TemperedIngot, 2], [ID.Cinder, 2], [ID.Stick, 1]]],
  ["bmold-tidal", 16, ID.TidalBlade, [[ID.TemperedIngot, 3], [ID.Prism, 1]]],
  ["bmold-void", 22, ID.VoidBlade, [[ID.TemperedIngot, 3], [ID.Prism, 1], [ID.Sapphire, 1]]],
];
const EXPECTED_USES: Record<number, number> = {
  [ID.FangBlade]: 280,
  [ID.CinderBlade]: 260,
  [ID.TidalBlade]: 480,
  [ID.VoidBlade]: 620,
};
// P6 step 5b — armour moulds: same law, cat "gear".
const BMOLDS_ARMOR: [string, number, number, [number, number][]][] = [
  ["bmold-guardian", 16, ID.GuardianPlate, [[ID.TemperedIngot, 3], [ID.GuardianSpike, 2], [ID.Scale, 1]]],
  ["bmold-pharaoh", 12, ID.PharaohCrown, [[ID.TemperedIngot, 2], [ID.PharaohGold, 2], [ID.Gold, 1]]],
];
const EXPECTED_USES_ARMOR: Record<number, number> = {
  [ID.GuardianPlate]: 380,
  [ID.PharaohCrown]: 340,
};

describe("foundry boss moulds", () => {
  it("each bmold exists exactly once, gated, with the designed need", () => {
    for (const [rid, lvl, out, need] of BMOLDS) {
      const hits = RECIPES.filter((x) => x.id === rid);
      assert.equal(hits.length, 1, rid + " must exist exactly once");
      const r = hits[0];
      assert.equal(r.lvl, lvl, rid + " lvl gate");
      assert.equal(r.out, out, rid + " output");
      assert.equal(r.n, 1, rid + " casts one");
      assert.equal(r.cat, "tools", rid + " cat");
      assert.deepEqual(r.need, need, rid + " need");
      // every ingredient and the output are real defs
      for (const [id] of need) assert.ok(BLOCKS[id], rid + " ingredient " + id);
      assert.ok(BLOCKS[out], rid + " output def");
      assert.equal(BLOCKS[out].maxUse, EXPECTED_USES[out], rid + " output maxUse");
      // shape (when present) must spend exactly the need — the grid
      // craft path reads the shape, the list path reads `need`
      if (r.shape) {
        const counts = new Map<number, number>();
        for (const c of r.shape) if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
        assert.deepEqual(counts, new Map(need), rid + " shape spends the need");
        assert.equal(r.shape.length, (r.w ?? 0) * (r.h ?? 0), rid + " shape is w*h");
      }
    }
  });

  it("the classic boss-blade recipes stay (mould = second way)", () => {
    for (const rid of ["fang-blade", "cinder-blade", "tidal-blade", "void-blade"]) {
      assert.equal(RECIPES.filter((x) => x.id === rid).length, 1, rid);
    }
  });

  it("each armour bmold exists exactly once, gated, with the designed need", () => {
    for (const [rid, lvl, out, need] of BMOLDS_ARMOR) {
      const hits = RECIPES.filter((x) => x.id === rid);
      assert.equal(hits.length, 1, rid + " must exist exactly once");
      const r = hits[0];
      assert.equal(r.lvl, lvl, rid + " lvl gate");
      assert.equal(r.out, out, rid + " output");
      assert.equal(r.n, 1, rid + " casts one");
      assert.equal(r.cat, "gear", rid + " cat");
      assert.deepEqual(r.need, need, rid + " need");
      for (const [id] of need) assert.ok(BLOCKS[id], rid + " ingredient " + id);
      assert.ok(BLOCKS[out], rid + " output def");
      assert.equal(BLOCKS[out].maxUse, EXPECTED_USES_ARMOR[out], rid + " output maxUse");
      assert.ok(BLOCKS[out].armor, rid + " output is armour");
      if (r.shape) {
        const counts = new Map<number, number>();
        for (const c of r.shape) if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
        assert.deepEqual(counts, new Map(need), rid + " shape spends the need");
        assert.equal(r.shape.length, (r.w ?? 0) * (r.h ?? 0), rid + " shape is w*h");
      }
    }
  });

  it("the classic boss-armour recipes stay (mould = second way)", () => {
    for (const rid of ["guardian-plate", "pharaoh-crown"]) {
      assert.equal(RECIPES.filter((x) => x.id === rid).length, 1, rid);
    }
  });
});
