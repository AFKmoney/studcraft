import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { BLOCKS, ID, ATLAS_COLS, ATLAS_ROWS, TEKS, def, faceTile } from "./blocks.ts";
import { RECIPES } from "./recipes.ts";

register(
  "data:text/javascript," +
    encodeURIComponent(`export async function resolve(s, c, n) {
      try { return await n(s, c); } catch (e) {
        if ((s.startsWith("./") || s.startsWith("../")) && !/\\.[cm]?[jt]s$/.test(s)) return n(s + ".ts", c);
        throw e;
      }
    }`),
);
const { World, CS, HEIGHT } = await import("./world.ts");

const NEW = [ID.Sandstone, ID.Adobe, ID.PackedSnow, ID.IceBrick, ID.BasaltBrick, ID.ObsidianTile, ID.Mangrove, ID.Bamboo, ID.Coral, ID.CrystalBrick, ID.JungleStone, ID.MudBrick, ID.RedRock];

test("chunks are 16-bit: ids > 255 survive set/get and chunk regeneration of edits", () => {
  const w = new World(42, false);
  const data = w.ensure(0, 0);
  assert.ok(data instanceof Uint16Array);
  assert.equal(data.length, CS * HEIGHT * CS);
  for (const [i, id] of NEW.entries()) {
    assert.ok(id > 255);
    w.set(i, 60, 3, id);
    assert.equal(w.get(i, 60, 3), id);
  }
});

test("biome bricks: labelled, placeable, in the atlas, craftable", () => {
  for (const id of NEW) {
    const d = def(id);
    assert.ok(d.name && d.name !== "Air", "label " + id);
    assert.ok(d.placeable && d.solid);
    for (const f of [0, 1, 2, 3] as const) {
      const t = faceTile(id, f);
      assert.ok(t > 0 && Math.floor(t / ATLAS_COLS) < ATLAS_ROWS, d.name + " tile off atlas");
    }
    assert.ok(RECIPES.some((r) => r.out === id), "recipe for " + d.name);
  }
  for (const id of [ID.SanctumStud, ID.MechaCore]) assert.ok(RECIPES.some((r) => r.out === id));
});

test("every non-Teks world brick still fits the atlas", () => {
  const teks = new Set<number>(TEKS);
  for (const b of BLOCKS) {
    if (!b || teks.has(b.id) || !b.placeable) continue;
    const t = faceTile(b.id, 3);
    if (!t) continue;
    assert.ok(Math.floor(t / ATLAS_COLS) < ATLAS_ROWS, b.name);
  }
});

const { normalizeSave } = await import("./save.ts");

test("legacy 8-bit save migrates; 16-bit ids round-trip through save JSON", () => {
  const legacy = normalizeSave(JSON.parse(JSON.stringify({ v: 1, seed: 1, flat: false, creative: false, edits: [[1, 2, 3, ID.Stone], [4, 5, 6, 300]], px: 0, py: 0, pz: 0, yaw: 0, pitch: 0, health: 20 })));
  assert.ok(legacy);
  assert.equal(legacy.ids, 16);
  assert.deepEqual(legacy.edits, [[1, 2, 3, ID.Stone]], "a legacy save cannot carry ids > 255");
  const modern = normalizeSave(JSON.parse(JSON.stringify({ ...legacy, ids: 16, edits: NEW.map((id, i) => [i, 40, 0, id]) })));
  assert.ok(modern);
  assert.deepEqual(modern.edits.map((e) => e[3]), NEW);
  const w = new World(1, false);
  for (const [x, y, z, id] of modern.edits) w.set(x, y, z, id);
  for (const [x, y, z, id] of modern.edits) assert.equal(w.get(x, y, z), id);
});

test("network edit messages carry ids > 255 (JSON relay)", () => {
  for (const id of NEW) {
    const msg = JSON.parse(JSON.stringify({ t: "edit", x: 1, y: 2, z: 3, block: id }));
    assert.equal(Number(msg.block), id);
  }
});

test("mesher builds faces for ids > 255", async () => {
  const { buildChunk } = await import("./mesher.ts");
  const w = new World(7, true);
  w.ensure(0, 0);
  const before = buildChunk(w, 0, 0, false, false);
  const count = (m: unknown) => JSON.stringify(m).length;
  for (const [i, id] of NEW.entries()) w.set(1 + i, 50, 8, id);
  const after = buildChunk(w, 0, 0, false, false);
  assert.ok(count(after.opaque) > count(before.opaque) || count(after.glass) > count(before.glass));
});
