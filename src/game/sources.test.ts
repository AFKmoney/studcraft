// Every recipe input must have a source (Philippe: no recipe may become
// unobtainable after the v6 "everything is plastic" foundry).
import test from "node:test";
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
const { BLOCKS, ID, def } = await import("./blocks.ts");
const { RECIPES, SMELT } = await import("./recipes.ts");
const { World, CS, HEIGHT } = await import("./world.ts");
const { MOB_BASE_DROPS, MOB_BONUS_DROPS } = await import("./mobDrops.ts");
const { TRADERS } = await import("./quests.ts");

test("every recipe input is obtainable (world, drops, trade, smelt, craft)", () => {
  const have = new Set<number>();
  const add = (id: number) => { if (id > 0) have.add(id); };
  // naturally generated blocks across a spread of chunks (all zones), and what they drop
  const w = new World(1234567, false);
  for (let cx = -60; cx <= 60; cx += 6) for (let cz = -60; cz <= 60; cz += 6) {
    const d = w.ensure(cx, cz);
    for (let i = 0; i < CS * CS * HEIGHT; i += 7) add(d[i]);
  }
  for (const id of [...have]) { const dr = (BLOCKS[id] as { drop?: number })?.drop; if (dr && dr > 0) add(dr); }
  for (const list of Object.values(MOB_BASE_DROPS)) for (const id of list) add(id);
  for (const b of MOB_BONUS_DROPS) add(b.id);
  for (const t of Object.values(TRADERS)) for (const o of t.offers) add(o.out);
  // runtime sources living in game.ts (not tables): crop harvest → Grain,
  // chickens lay Eggs, leaves drop Apples, reeds → Cane, water freezes to
  // Ice in the cold, hay bales in farms, Prism ore → Core (22 %).
  // t79u: cows are milked with a bucket; full composters yield Fertilizer.
  for (const id of [ID.Milk, ID.Fertilizer, ID.Wheat, ID.Egg, ID.Apple, ID.Cane, ID.Ice, ID.Hay, ID.Core]) add(id);
  for (let round = 0; round < 12; round++) {
    for (const [k, v] of Object.entries(SMELT)) if (have.has(+k)) add(v);
    for (const r of RECIPES) if (r.out && r.need.every(([i]) => have.has(i))) add(r.out);
  }
  const missing = new Map<number, string[]>();
  for (const r of RECIPES) for (const [i] of r.need) if (!have.has(i)) missing.set(i, [...(missing.get(i) ?? []), r.id]);
  const msg = [...missing].map(([i, rs]) => `${def(i).name}(${i}) ← ${rs.slice(0, 3).join(",")}`).join("; ");
  assert.equal(missing.size, 0, msg);
  void ID;
});
