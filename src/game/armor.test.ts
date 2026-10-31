import test from "node:test";
import assert from "node:assert/strict";
import { ID, def } from "./blocks.ts";
import { armorHitWear, armorMaxDur, combineDur, repairCost, salvageYield, wearArmor } from "./foundry.ts";
import { salvageOf } from "./recipes.ts";

test("armor has durability and loses it on hits, breaking at 0", () => {
  const max = (id: number) => armorMaxDur(def(id));
  assert.ok(armorMaxDur({ armor: 0.1, maxUse: 0 }) > 0);
  assert.equal(armorMaxDur({ armor: 5, maxUse: 380 }), 380);
  assert.equal(armorHitWear(0), 0);
  assert.ok(armorHitWear(1) >= 1 && armorHitWear(8) > armorHitWear(2));
  const piece = ID.GuardianPlate;
  let wear: Record<number, number> = {};
  let r = wearArmor([piece, 0, 0, 0], wear, 6, max);
  assert.equal(r.wear[piece], armorHitWear(6));
  assert.deepEqual(r.broken, []);
  wear = { [piece]: max(piece) - 1 };
  r = wearArmor([piece, 0, 0, 0], wear, 6, max);
  assert.deepEqual(r.broken, [piece], "breaks at 0");
  assert.equal(r.wear[piece], undefined);
});

test("worn armor is repairable with plastic; cost grows with missing durability", () => {
  const m = armorMaxDur(def(ID.GuardianPlate));
  const a = repairCost(m - 10, m, 3, false);
  const b = repairCost(m - 100, m, 3, false);
  assert.ok(a.n > 0 && b.n > a.n);
  assert.equal(repairCost(m, m, 3, false).n, 0);
});

test("combine: two copies → summed durability + bonus, capped at max", () => {
  assert.equal(combineDur(30, 40, 200), 90);
  assert.equal(combineDur(150, 150, 200), 200);
  assert.ok(combineDur(10, 10, 100) > 20);
});

test("used-item salvage (anvil or plastic kiln) scales with durability and stays below cost", () => {
  for (const c of [2, 6, 20]) {
    assert.ok(salvageYield(c, 100, 100) < c);
    assert.ok(salvageYield(c, 25, 100) <= salvageYield(c, 100, 100));
  }
  const pick = ID.PlasticPick ?? 0;
  if (pick && def(pick).maxUse) {
    const full = salvageOf(pick, def(pick).maxUse, def(pick).maxUse);
    const worn = salvageOf(pick, 1, def(pick).maxUse);
    if (full.ok) assert.ok(worn.pellets <= full.pellets);
  }
  assert.equal(salvageOf(ID.Diamond, 1, 1).ok, false, "gem-made refused");
});
