import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEBRIS_ADVANCED, DEBRIS_BASIC, DEBRIS_PARTS, DEBRIS_RARE, arteryMul, debrisAt, debrisStuds, debrisZone } from "./debris.ts";
import { ID } from "./blocks.ts";
import { SMELT, SMELT_N, teksCastCost } from "./recipes.ts";
import { stockChest } from "./loot.ts";

const BASIC = new Set<number>(DEBRIS_BASIC);
const ADV = new Set<number>(DEBRIS_ADVANCED);
const RARE = new Set<number>(DEBRIS_RARE);

function sample(seed: number, cx0: number, cx1: number, cz0: number, cz1: number) {
  const sites: number[][] = [];
  for (let cx = cx0; cx < cx1; cx++) for (let cz = cz0; cz < cz1; cz++) {
    const s = debrisAt(seed, cx, cz);
    if (s.ids.length) sites.push(s.ids);
  }
  return sites;
}

describe("§11 debris sites — topology", () => {
  it("is deterministic per (seed, chunk) and seed-sensitive", () => {
    assert.deepEqual(debrisAt(7, 3, 4), debrisAt(7, 3, 4));
    let differs = false;
    for (let cx = -10; cx < 10 && !differs; cx++) if (JSON.stringify(debrisAt(7, cx, 4)) !== JSON.stringify(debrisAt(8, cx, 4))) differs = true;
    assert.ok(differs, "another seed reshuffles the sites");
  });

  it("zones gate the pools: no rares near spawn, advanced parts guaranteed far out", () => {
    assert.equal(debrisZone(0, 0), 0);
    assert.equal(debrisZone(30, 0), 1);
    assert.equal(debrisZone(80, 0), 2);
    const z0 = sample(11, -19, 19, -19, 19);
    assert.ok(z0.length > 40, "zone 0 has sites: " + z0.length);
    let adv0 = 0;
    let tot0 = 0;
    for (const ids of z0) for (const id of ids) {
      tot0++;
      assert.ok(!RARE.has(id), "a rare part in zone 0: " + id);
      if (ADV.has(id)) adv0++;
      else assert.ok(BASIC.has(id), "unknown pool member in zone 0: " + id);
    }
    assert.ok(adv0 / tot0 < 0.1, "zone 0 advanced parts stay a teaser: " + adv0 + "/" + tot0);
    const z2 = sample(11, 60, 100, -20, 20);
    assert.ok(z2.length > 100, "zone 2 has sites: " + z2.length);
    const withAdv = z2.filter((ids) => ids.some((id) => ADV.has(id) || RARE.has(id))).length;
    assert.ok(withAdv / z2.length > 0.9, "zone 2 sites carry advanced parts: " + withAdv + "/" + z2.length);
    assert.ok(z2.some((ids) => ids.some((id) => RARE.has(id))), "zone 2 pays out rares somewhere");
  });

  it("arteries concentrate sites: on-ridge chunks host more than off-ridge", () => {
    const rows: { mul: number; has: boolean }[] = [];
    for (let cx = -60; cx < 60; cx++) for (let cz = -60; cz < 60; cz++) {
      rows.push({ mul: arteryMul(5, cx, cz), has: debrisAt(5, cx, cz).ids.length > 0 });
    }
    const sorted = [...rows].sort((a, b) => a.mul - b.mul);
    const q = Math.floor(sorted.length / 4);
    const rate = (part: { has: boolean }[]) => part.filter((r) => r.has).length / part.length;
    const lo = rate(sorted.slice(0, q));
    const hi = rate(sorted.slice(-q));
    assert.ok(hi > lo * 1.5, "ridge " + hi.toFixed(2) + " vs valley " + lo.toFixed(2));
    const overall = rate(rows);
    assert.ok(overall > 0.15 && overall < 0.7, "overall presence stays readable: " + overall.toFixed(2));
  });

  it("studs mirror the site, and the game wiring is unchanged", () => {
    const spot = debrisAt(7, 3, 4);
    const studs = debrisStuds(7, 3, 4, 30);
    assert.equal(studs.length, spot.ids.length);
    for (const s of studs) assert.equal(s.sy, 31);
    const world = readFileSync(new URL("./world.ts", import.meta.url), "utf8");
    const game = readFileSync(new URL("./game.ts", import.meta.url), "utf8");
    assert.equal(world.includes("debrisAt"), false);
    assert.equal(game.includes("world.edits.set(mark, ID.Bedrock)"), true);
    assert.equal(game.includes("addBrick(c.id, c.x * 2, c.y, c.z * 2)"), true);
    assert.ok(DEBRIS_PARTS === DEBRIS_BASIC, "v1 pool name kept as the basic pool");
  });
});

describe("§11 debris economy — recycling and monument jackpots", () => {
  it("every Teks part smelts back to ~50% of its casting cost in pellets", () => {
    for (const id of [...DEBRIS_BASIC, ...DEBRIS_ADVANCED, ...DEBRIS_RARE]) {
      assert.equal(SMELT[id], ID.Pellets, "part not recyclable: " + id);
      const want = Math.max(1, Math.round(teksCastCost(id).ingots * 0.5));
      assert.equal(SMELT_N[id], want, "recycle yield off for " + id);
      assert.ok(SMELT_N[id] <= teksCastCost(id).ingots, "recycling never profits");
    }
  });

  it("monument chests pay advanced parts; wild chests never do", () => {
    let hits = 0;
    const runs = 60;
    for (let i = 0; i < runs; i++) {
      const bin = { ids: new Array(27).fill(0), ns: new Array(27).fill(0) };
      stockChest(bin, 100 + i * 3, 40, 200, 42, "wreck");
      if (bin.ids.some((id) => ADV.has(id) || RARE.has(id))) hits++;
    }
    assert.ok(hits > runs * 0.2 && hits < runs * 0.95, "wreck jackpots land often, not always: " + hits + "/" + runs);
    for (let i = 0; i < 20; i++) {
      const bin = { ids: new Array(27).fill(0), ns: new Array(27).fill(0) };
      stockChest(bin, 500 + i * 3, 40, 700, 42, "wild");
      assert.ok(!bin.ids.some((id) => ADV.has(id) || RARE.has(id) || BASIC.has(id)), "wild chest held a Teks part");
    }
  });
});
