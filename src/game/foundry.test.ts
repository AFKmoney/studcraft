import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ID } from "./blocks.ts";
import { RARE_MELT, TIERS, cookRate, meltInto, pour, stepHeat, tierIndex, type Pool } from "./foundry.ts";
import { SMELT, SMELT_N } from "./recipes.ts";

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
    meltInto(p, ID.Sapphire, 1);
    assert.equal(p.affix, "swift");
    assert.equal(p.charges, 4);
  });
  it("masterwork pours +50% ingots over time, Raw pours exactly 1:1", () => {
    const m: Pool = { purity: 90 };
    let n = 0;
    for (let i = 0; i < 10; i++) n += pour(m, 3, 1).n;
    assert.equal(n, 15);
    const r: Pool = { purity: 0 };
    n = 0;
    for (let i = 0; i < 10; i++) n += pour(r, 1, 1).n;
    assert.equal(n, 10);
  });
  it("charges run out and the affix clears", () => {
    const p: Pool = { affix: "yield", charges: 1 };
    assert.equal(pour(p, 1, 1).n, 2);
    assert.equal(p.affix, "");
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

import { MATERIALS, meltRatio, meltRatioStep, fuelValue, rejectReason, isMeltable } from "./foundry.ts";
import { fuelTime } from "./recipes.ts";
describe("v6 material table", () => {
  it("ratio scales with rarity: commons 8–16:1, rares 1–2:1", () => {
    for (const id of [ID.Dirt, ID.Cobble, ID.Stone, ID.Gravel]) assert.ok(meltRatio(id) >= 8 && meltRatio(id) <= 16);
    for (const id of [ID.Crystal, ...Object.keys(RARE_MELT).map(Number)]) assert.ok(meltRatio(id) >= 1 && meltRatio(id) <= 2);
    assert.ok((MATERIALS[ID.Crystal] as { purity: number }).purity > (MATERIALS[ID.Dirt] as { purity: number }).purity);
    const p: { purity?: number; ratioAcc?: number } = {};
    let n = 0;
    for (let i = 0; i < 32; i++) n += meltRatioStep(p, ID.Dirt);
    assert.equal(n, 2);
    assert.equal(meltRatioStep({}, ID.Crystal), 1);
  });
  it("gold, diamond and wood are never melted", () => {
    for (const id of [ID.Gold, ID.GoldOre, ID.Diamond, ID.DiamondOre]) {
      assert.ok(rejectReason(id));
      assert.equal(SMELT[id], undefined);
    }
    for (const id of [ID.Log, ID.Planks]) {
      assert.equal(isMeltable(id), false);
      assert.equal(SMELT[id], undefined);
    }
  });
  it("wood and quality plastic burn as fuel; gold does not", () => {
    assert.ok(fuelTime(ID.Log) > 0 && fuelTime(ID.Planks) > 0);
    assert.ok(fuelValue(ID.PlasticIngot) > 0 && fuelTime(ID.TemperedIngot) > fuelTime(ID.PlasticIngot));
    assert.equal(fuelTime(ID.Gold), 0);
    assert.equal(fuelTime(ID.Diamond), 0);
  });
});
