// Recipe table integrity: a duplicate id made the Wall shelf uncraftable
// (the crafting UI keys recipes by id, so the second "shelf" was shadowed).
import { test } from "node:test";
import assert from "node:assert/strict";
import { BLOCKS } from "./blocks.ts";
import { RECIPES, SMELT } from "./recipes.ts";

test("recipe ids are unique", () => {
  const seen = new Map<string, string>();
  for (const r of RECIPES) {
    assert.ok(!seen.has(r.id), `duplicate recipe id "${r.id}": ${seen.get(r.id)} / ${r.name}`);
    seen.set(r.id, r.name);
  }
});

test("every recipe references real items with positive counts", () => {
  for (const r of RECIPES) {
    assert.ok(r.special === "hammer" || BLOCKS[r.out], `${r.id}: output ${r.out} is not a block/item`);
    assert.ok(r.n > 0, `${r.id}: n must be > 0`);
    for (const [id, n] of r.need) {
      assert.ok(BLOCKS[id], `${r.id}: input ${id} is not a block/item`);
      assert.ok(n > 0, `${r.id}: input ${id} count must be > 0`);
    }
    if (r.shape) {
      if (r.w && r.h) assert.equal(r.shape.length, r.w * r.h, `${r.id}: shape size ≠ w×h`);
      for (const id of r.shape) assert.ok(id === 0 || BLOCKS[id], `${r.id}: shape cell ${id} unknown`);
    }
  }
});

test("every smelt entry maps real items", () => {
  for (const [k, v] of Object.entries(SMELT)) {
    assert.ok(BLOCKS[Number(k)], `SMELT input ${k} unknown`);
    assert.ok(BLOCKS[v], `SMELT ${k} → ${v} unknown output`);
  }
});
