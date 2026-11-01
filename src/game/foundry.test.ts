import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ID } from "./blocks.ts";
import { RARE_MELT, TIERS, cookRate, meltInto, pour, stepHeat, tierIndex, type Pool } from "./foundry.ts";
import { PLASTIC, RECIPES, SMELT, SMELT_N } from "./recipes.ts";

describe("plastic foundry", () => {
  it("heat rises with fuel, cools without, clamps", () => {
    let h = 0;
    for (let i = 0; i < 100; i++) h = stepHeat(h, true, 1, 0.1);
    assert.equal(h, 1);
    h = stepHeat(1, false, 1, 1);
    assert.ok(h < 1 && h > 0.9);
    assert.ok(stepHeat(0, true, 3, 1) > stepHeat(0, true, 1, 1));
  });
  it("cold kiln cooks slowly, hot one at full rate", () => {
    assert.equal(cookRate({ heat: 0 }), 0.25);
    assert.equal(cookRate({ heat: 1 }), 1);
    assert.equal(cookRate({ heat: 1, affix: "swift", charges: 1 }), 2);
  });
  it("plain melt purity is capped by foundry level; tiers gated by level", () => {
    const p: Pool = {};
    for (let i = 0; i < 200; i++) meltInto(p, ID.Pellets, 1);
    assert.equal(p.purity, 45);
    assert.equal(tierIndex(100, 1), 1);
    assert.equal(tierIndex(100, 3), TIERS.length - 1);
    const q: Pool = {};
    for (let i = 0; i < 200; i++) meltInto(q, ID.Pellets, 3);
    assert.equal(tierIndex(q.purity!, 3), 3);
  });
  it("rare melt spikes purity and charges an affix", () => {
    const p: Pool = { purity: 40 };
    meltInto(p, ID.VoidCore, 3);
    assert.equal(p.purity, 90);
    assert.equal(p.affix, "tempered");
    const out = pour(p, 3, 1);
    assert.equal(out.id, ID.TemperedIngot);
    assert.equal(p.charges, RARE_MELT[ID.VoidCore].charges - 1);
  });
  it("same affix stacks charges, a different one replaces", () => {
    const p: Pool = {};
    meltInto(p, ID.Prism, 1);
    meltInto(p, ID.Prism, 1);
    assert.equal(p.charges, 8);
    meltInto(p, ID.Amber, 1);
    assert.equal(p.affix, "distil");
    assert.equal(p.charges, 3);
  });
  it("B24-A2 conservation: every tier pours exactly 1:1 (Guide §1 — no matter from nowhere)", () => {
    for (const purity of [0, 40, 70, 90, 100]) {
      const p: Pool = { purity };
      let n = 0;
      for (let i = 0; i < 10; i++) n += pour(p, 3, 1).n;
      assert.equal(n, 10, "purity " + purity);
    }
    const r: Pool = { purity: 0 };
    let n = 0;
    for (let i = 0; i < 10; i++) n += pour(r, 1, 1).n;
    assert.equal(n, 10);
  });
  it("B24-A2: no tier carries a quantity bonus and no rare charges the removed yield affix", () => {
    for (const t of TIERS) assert.equal((t as unknown as { bonus?: number }).bonus, undefined, t.name);
    for (const v of Object.values(RARE_MELT)) assert.notEqual(v.affix as string, "yield");
  });
  it("charges run out and the affix clears", () => {
    const p: Pool = { affix: "tempered", charges: 1 };
    assert.equal(pour(p, 1, 1).id, ID.TemperedIngot);
    assert.equal(pour(p, 1, 1).n, 1);
    assert.equal(p.affix, "");
    assert.equal(pour(p, 1, 1).id, ID.PlasticIngot);
    assert.equal(pour(p, 1, 1).n, 1);
  });
  it("every rare is a Kiln input that melts to pellets (matter returns)", () => {
    for (const [k, v] of Object.entries(RARE_MELT)) {
      assert.equal(SMELT[+k], ID.Pellets, "rare " + k);
      assert.equal(SMELT_N[+k], v.pellets);
    }
  });
});

describe("foundry balance", () => {
  it("regrind lowers purity", () => {
    const p: Pool = { purity: 90 };
    meltInto(p, 0, 3, { regrind: true });
    assert.equal(p.purity, 75);
  });
  it("TEKS cast costs are 1..24 ingots and recycling returns at most ~half", async () => {
    const { TEKS } = await import("./blocks.ts");
    const { teksCastCost } = await import("./recipes.ts");
    for (const id of TEKS) {
      const c = teksCastCost(id).ingots;
      assert.ok(c >= 1 && c <= 24);
      assert.ok(SMELT_N[id] <= Math.ceil(c / 2));
    }
  });
});

it("v5 remap: void-glass shard and blink lens melt as rares, the sentinel core stays the top rare", () => {
  assert.ok(RARE_MELT[ID.VoidGlass] && RARE_MELT[ID.EnderPearl]);
  const top = Math.max(...Object.values(RARE_MELT).map((r) => r.purity));
  assert.equal(RARE_MELT[ID.VoidCore].purity, top);
  assert.ok(RARE_MELT[ID.EnderPearl].purity < RARE_MELT[ID.VoidGlass].purity);
});

import { MATERIALS, meltRatio, meltRatioStep, fuelValue, rejectReason, isMeltable, qualityOf, salvageYield, repairCost, combineDur, QUALITY_ITEM } from "./foundry.ts";
import { fuelTime, plasticCost, salvageOf, RECIPES as ALL_RECIPES } from "./recipes.ts";
describe("v6 material table", () => {
  it("quality tiers: iron good, copper medium, the rest low", () => {
    for (const id of [ID.IronOre, ID.RawIron, ID.Ingot]) assert.equal(qualityOf(id), "good");
    for (const id of [ID.CopperOre, ID.Copper]) assert.equal(qualityOf(id), "medium");
    for (const id of [ID.Netherrack, ID.CoalOre, ID.TinOre, ID.ChromeOre, ID.Stone]) assert.equal(qualityOf(id), "low");
    assert.equal(PLASTIC[ID.IronOre], QUALITY_ITEM.good);
    assert.equal(PLASTIC[ID.CopperOre], QUALITY_ITEM.medium);
    assert.equal(PLASTIC[ID.Stone], ID.Pellets);
  });
  it("ratio scales with abundance; rare melts keep 1:1 + bonus", () => {
    for (const id of [ID.Dirt, ID.Cobble, ID.Stone, ID.Gravel]) assert.ok(meltRatio(id) >= 8 && meltRatio(id) <= 16);
    assert.ok(meltRatio(ID.Dirt) > meltRatio(ID.CoalOre) && meltRatio(ID.CoalOre) > meltRatio(ID.Copper));
    for (const id of Object.keys(RARE_MELT).map(Number)) { assert.equal(meltRatio(id), 1); assert.equal(PLASTIC[id], ID.Pellets); }
    const p: { purity?: number; ratioAcc?: number } = {};
    let n = 0;
    for (let i = 0; i < 32; i++) n += meltRatioStep(p, ID.Dirt);
    assert.equal(n, 2);
  });
  it("water, rare ores and wood are never melted", () => {
    for (const id of [ID.Water, ID.Gold, ID.GoldOre, ID.Diamond, ID.DiamondOre, ID.EmeraldOre, ID.SapphireOre, ID.PrismOre, ID.CrystalOre, ID.Sand, ID.Clay]) {
      assert.ok(rejectReason(id), String(id));
      assert.equal(PLASTIC[id], undefined);
    }
    for (const id of [ID.Log, ID.Planks, ID.Leaves]) { assert.equal(isMeltable(id), false); assert.equal(PLASTIC[id], undefined); }
  });
  it("wood and quality plastic burn as fuel; gold does not", () => {
    assert.ok(fuelTime(ID.Log) > 0 && fuelTime(ID.Planks) > 0);
    assert.ok(fuelValue(ID.PlasticIngot) > 0 && fuelTime(ID.TemperedIngot) > fuelTime(ID.PlasticIngot));
    assert.equal(fuelTime(ID.Gold), 0);
  });
  it("salvage: less than craft cost, scales with durability; gem gear refused", () => {
    assert.equal(salvageYield(10, 100, 100), 5);
    assert.equal(salvageYield(10, 50, 100), 2);
    assert.ok(salvageYield(1, 1, 1) < 1);
    const sword = ALL_RECIPES.find((r) => r.id === "sword-g");
    if (sword) assert.equal(salvageOf(sword.out, 10, 10).ok, false);
    const iron = ALL_RECIPES.find((r) => r.need.some(([i]) => i === ID.Ingot) && plasticCost(r.out) > 2);
    assert.ok(iron, "an iron-made item");
    const full = salvageOf(iron!.out, 10, 10).pellets, half = salvageOf(iron!.out, 5, 10).pellets;
    assert.ok(full < plasticCost(iron!.out) && half <= full);
  });
  it("repair: cost ∝ missing durability × tier; rare needs good plastic; combine caps", () => {
    assert.equal(repairCost(10, 10, 1, false).n, 0);
    const a = repairCost(5, 10, 1, false), b = repairCost(0, 10, 1, false), c = repairCost(0, 10, 3, false);
    assert.ok(a.n < b.n && b.n < c.n);
    assert.equal(repairCost(0, 10, 1, false).item, ID.Pellets);
    assert.equal(repairCost(0, 10, 2, false).item, ID.PlasticIngot);
    assert.equal(repairCost(0, 10, 1, true).item, ID.TemperedIngot);
    assert.equal(combineDur(60, 70, 100), 100);
  });
});

describe("v6 final: normal crafting is untouched (plastic is parallel)", () => {
  it("normal kiln mode keeps the classic smelts", () => {
    assert.equal(SMELT[ID.Sand], ID.Glass);
    assert.equal(SMELT[ID.Clay], ID.Hard);
    assert.equal(SMELT[ID.Log], ID.Coal);
    assert.equal(SMELT[ID.Cobble], ID.Stone);
    assert.equal(SMELT[ID.Netherrack], ID.Ash);
    assert.equal(SMELT[ID.IronOre], ID.Ingot);
    assert.equal(SMELT[ID.CopperOre], ID.Copper);
  });
  it("no normal recipe was remapped to plastic", () => {
    assert.equal(RECIPES.some((r) => ["cast-glass", "cast-hard", "cast-ash", "cast-tin", "cast-resin", "cast-amber", "cast-copper", "cast-chrome", "cast-iron"].includes(r.id)), false);
  });
});
