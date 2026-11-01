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

test("buildAtlas PAINT loops skip aliases (the glow loop is the one exception)", () => {
  const src = readFileSync(new URL("./textures.ts", import.meta.url), "utf8");
  assert.ok(!/if \(!block\) continue;/.test(src), "a buildAtlas loop paints aliases again");
  assert.ok((src.match(/paintsOwnTile\(block\)/g) ?? []).length >= 4);
  // Audit 2026-10-31: the glow loop must NOT skip aliases — a lit alias
  // (Paper lamp, Lamp post, Candle…) emits through its target's tile.
  // Painting loops keep the guard; the glow loop deliberately has none.
  const glow = src.slice(src.indexOf("Glow atlas"), src.indexOf("High-resolution"));
  assert.ok(glow.length > 0 && !glow.includes("if (!paintsOwnTile(block)) continue;"), "the glow loop skips lit aliases again — lamps stop glowing");
  assert.ok(glow.includes("if (block == null) continue;"), "the glow loop dereferences sparse-registry holes again — buildAtlas throws and the game never boots (proven by rig, 2026-10-31)");
  assert.ok(glow.includes("block.light"), "the glow loop lost its light test");
});

test("every drawn block's tiles fit inside the atlas (no unpainted overflow)", async () => {
  const { ATLAS_COLS, ATLAS_ROWS, TILE } = await import("./blocks.ts");
  assert.ok(ATLAS_COLS * TILE <= 8192 && ATLAS_ROWS * TILE <= 8192, "atlas over the 8192 px WebGL limit");
  for (const b of BLOCKS) {
    if (!b) continue;
    for (const f of [0, 1, 2, 3] as const) {
      const t = faceTile(b.id, f);
      assert.ok(Math.floor(t / ATLAS_COLS) < ATLAS_ROWS, `${b.name} (${b.id}) face ${f}: tile ${t} outside the atlas`);
    }
  }
});

test("atlas keeps ≥ 200 free tiles of headroom for new blocks", async () => {
  const { ATLAS_COLS, ATLAS_ROWS } = await import("./blocks.ts");
  let used = 0;
  for (const b of BLOCKS) if (b) for (const f of [0, 1, 2, 3] as const) used = Math.max(used, faceTile(b.id, f) + 1);
  const free = ATLAS_COLS * ATLAS_ROWS - used;
  assert.ok(free >= 200, `only ${free} free atlas tiles left: raise ATLAS_ROWS (keep ≤ 8192 px)`);
});
