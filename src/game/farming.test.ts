// t79u farming / decoration tests (Grok Bot)
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
register(
  "data:text/javascript," +
    encodeURIComponent(`export async function resolve(s, c, n) {
      try { return await n(s, c); } catch (e) {
        if ((s.startsWith("./") || s.startsWith("../")) && !/\\.[cm]?[jt]s$/.test(s)) return n(s + ".ts", c);
        throw e;
      }
    }`),
);
const F = await import("./farming.ts");
const { ID, BLOCKS, DECOR, ATLAS_COLS, ATLAS_ROWS, faceTile, def } = await import("./blocks.ts");
const { normalizeSave } = await import("./save.ts");
const { MATERIALS } = await import("./foundry.ts");
const { RECIPES } = await import("./recipes.ts");

const I = { ...(ID as any), BeetSeeds: ID.Beetroot };
const X = { ...I, Leaves: ID.Leaves, Sapling: ID.Sapling, TallGrass: ID.TallGrass, Flower: ID.Flower, Hay: ID.Hay, Bread: ID.Bread };
const world = (m: Record<string, number>) => (x: number, y: number, z: number) => m[`${x},${y},${z}`] ?? ID.Air;

test("hydration: water within 4 blocks wets farmland, 5 does not; rain always does", () => {
  assert.ok(F.hydrated(world({ "4,0,0": ID.Water }), I, 0, 0, 0));
  assert.ok(F.hydrated(world({ "0,1,3": ID.Water }), I, 0, 0, 0));
  assert.ok(!F.hydrated(world({ "5,0,0": ID.Water }), I, 0, 0, 0));
  assert.ok(F.hydrated(world({}), I, 0, 0, 0, true));
});
test("growth is gated by light and doubled by hydration", () => {
  assert.equal(F.growChance(F.MIN_LIGHT - 1, true), 0);
  assert.equal(F.growChance(F.cropLight(false, 1, false), true), 0, "covered, no lamp: no growth");
  assert.ok(F.growChance(F.cropLight(false, 0, true), false) > 0, "a lamp lights an underground farm");
  assert.equal(F.growChance(F.cropLight(true, 0, false), true), 0, "night sky: no growth");
  const dry = F.growChance(15, false), wet = F.growChance(15, true);
  assert.ok(wet > dry && dry > 0);
});
test("crop stages advance to ripe and stop", () => {
  let c: number = ID.Crop;
  for (let k = 0; k < 5; k++) c = F.nextStage(I, c);
  assert.equal(c, ID.CropRipe);
  assert.ok(F.isRipe(I, c));
  for (const [a, b] of [[ID.CarrotCrop, ID.CarrotRipe], [ID.PotatoCrop, ID.PotatoRipe], [ID.BeetCrop, ID.BeetRipe], [ID.BerryYoung, ID.Berry]]) assert.equal(F.nextStage(I, a), b);
});
test("stems set fruit only on free soil beside them", () => {
  const g = world({ "1,-1,0": ID.Dirt });
  assert.deepEqual(F.fruitSpot(g, I, 0, 0, 0, () => 0), [1, 0, 0]);
  assert.equal(F.fruitSpot(world({}), I, 0, 0, 0), null);
});
test("cane needs water beside its soil, cactus needs sand and clear sides; both cap at 3", () => {
  assert.ok(F.canStack(world({ "0,0,0": ID.Cane, "0,-1,0": ID.Sand, "1,-1,0": ID.Water }), I, ID.Cane, 0, 0, 0));
  assert.ok(!F.canStack(world({ "0,0,0": ID.Cane, "0,-1,0": ID.Sand }), I, ID.Cane, 0, 0, 0));
  assert.ok(F.canStack(world({ "0,0,0": ID.Cactus, "0,-1,0": ID.Sand }), I, ID.Cactus, 0, 0, 0));
  assert.ok(!F.canStack(world({ "0,0,0": ID.Cactus, "0,-1,0": ID.Sand, "1,1,0": ID.Stone }), I, ID.Cactus, 0, 0, 0));
  assert.ok(!F.canStack(world({ "0,0,0": ID.Cactus, "0,-1,0": ID.Cactus, "0,-2,0": ID.Cactus, "0,-3,0": ID.Sand }), I, ID.Cactus, 0, 0, 0));
});
test("harvest drops include seeds; unripe gives seeds back", () => {
  const d = new Map(F.harvestDrops(I, ID.CropRipe, () => 0.99));
  assert.ok((d.get(ID.Wheat) ?? 0) >= 1 && (d.get(ID.Seeds) ?? 0) >= 1);
  assert.ok(new Map(F.harvestDrops(I, ID.Crop1)).has(ID.Seeds));
  assert.ok((new Map(F.harvestDrops(I, ID.CarrotRipe)).get(ID.Carrot) ?? 0) >= 2);
  assert.ok(new Map(F.harvestDrops(I, ID.PumpkinStem)).has(ID.Pumpkin));
});
test("trampling needs a real fall; compost takes plant matter only", () => {
  assert.ok(!F.tramples(F.TRAMPLE_V - 0.1, () => 0));
  assert.ok(F.tramples(F.TRAMPLE_V + 1, () => 0));
  assert.ok(F.compostChance(X, ID.Wheat) > 0 && F.compostChance(X, ID.Hay) > F.compostChance(X, ID.Seeds));
  assert.equal(F.compostChance(X, ID.Stone), 0);
});
test("breeding foods are real items", () => {
  for (const [k, list] of Object.entries(F.BREED_FOOD)) for (const n of list) assert.ok(typeof (ID as any)[n] === "number", `${k}: ${n}`);
  assert.ok(F.BABY_GROW > 0);
});
test("plant matter is never plastic", () => {
  for (const id of [ID.Wheat, ID.Hay, ID.Cane, ID.Seeds, ID.Carrot, ID.Potato, ID.Beetroot, ID.Pumpkin, ID.Melon, ID.Berry, ID.Cactus])
    assert.notEqual(MATERIALS[id]?.kind ?? "none", "plastic", def(id).name);
});
test("decor: ~20 pieces, Uint16 ids, tiles borrowed inside the atlas, each craftable", () => {
  assert.ok(DECOR.length >= 20);
  for (const id of [...DECOR, ID.Fertilizer, ID.Sugar, ID.Cake, ID.BerryYoung, ID.Composter3]) {
    assert.ok(id > 255 && id <= 0xffff && BLOCKS[id], "id " + id);
    for (const f of [0, 1, 2, 3] as const) { const t = faceTile(id, f); assert.ok(t >= 0 && t < ATLAS_COLS * ATLAS_ROWS, def(id).name); }
  }
  for (const id of DECOR) assert.ok(RECIPES.some((r: any) => r.out === id), def(id).name + " recipe");
  assert.ok(RECIPES.some((r: any) => r.out === ID.Cake) && RECIPES.some((r: any) => r.out === ID.Sugar));
});
test("saves keep 16-bit farm/decor ids", () => {
  const s = normalizeSave({ v: 1, ids: 16, edits: [[0, 1, 0, ID.Picket], [1, 1, 0, ID.Composter2], [2, 1, 0, 70000]] } as any)!;
  assert.deepEqual(s.edits.map((e: number[]) => e[3]), [ID.Picket, ID.Composter2]);
});
