// Philippe 2026-10-31 (« tous les arbres en pierre »): skinOf aliases repainted
// their target's atlas tile with their own colors — Stool painted Wood tan,
// Hanging plant painted Leaves tan, rugs repainted the wool bricks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BLOCKS, ID, faceTile, paintsOwnTile } from "./blocks.ts";

test("every atlas tile has exactly one painter, and it is the tile's owner", () => {
  const painter = new Map<number, number>();
  for (const b of BLOCKS) {
    if (!paintsOwnTile(b)) continue;
    for (const f of [0, 1, 2, 3] as const) {
      const t = faceTile(b.id, f);
      if (t < 4) continue; // slot 0 = shared "undrawn" scratch tiles
      assert.ok(!painter.has(t), `tile ${t} painted by ${painter.get(t)} and ${b.id}`);
      painter.set(t, b.id);
    }
  }
  for (const id of [ID.Leaves, ID.Log, ID.Grass, ID.Stone, ID.Sand]) assert.equal(painter.get(faceTile(id, 1)), id);
});

test("aliases (skinOf) never paint and share their target's tiles", () => {
  for (const b of BLOCKS) if (b?.skinOf) {
    assert.equal(paintsOwnTile(b), false);
    assert.equal(faceTile(b.id, 1), faceTile(b.skinOf, 1));
  }
});

test("buildAtlas loops skip aliases", () => {
  const src = readFileSync(new URL("./textures.ts", import.meta.url), "utf8");
  assert.ok(!/if \(!block\) continue;/.test(src), "a buildAtlas loop paints aliases again");
  assert.ok((src.match(/paintsOwnTile\(block\)/g) ?? []).length >= 5);
});
