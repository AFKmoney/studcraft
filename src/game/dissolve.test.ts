import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CATALOG, CATALOG_EXCLUDED, ID, def } from "./blocks.ts";
import { DISSOLVED, dissolvedYield } from "./dissolve.ts";
import { RECIPES } from "./recipes.ts";

// P8 dissolution: the superseded tiers are gone from every source,
// their moulded successors are strictly better, and the migration
// yields are what the plan promised (T2 → 6, T3 → 12 pellets).
describe("P8 dissolution (stone + iron tool tiers)", () => {
  it("dissolves exactly the six superseded tools at the planned yields", () => {
    assert.equal(DISSOLVED.size, 6);
    assert.equal(dissolvedYield(ID.PickS), 6);
    assert.equal(dissolvedYield(ID.SwordS), 6);
    for (const id of [ID.PickI, ID.SwordI, ID.AxeI, ID.ShovelI]) assert.equal(dissolvedYield(id), 12);
    // Kept tiers: wood (starter), gem (no moulded equivalent yet).
    assert.equal(dissolvedYield(ID.PickW), 0);
    assert.equal(dissolvedYield(ID.PickG), 0);
    assert.equal(dissolvedYield(ID.PickBronze), 0);
  });

  it("no recipe, catalogue entry or successor gap remains", () => {
    for (const id of DISSOLVED.keys()) {
      assert.ok(!RECIPES.some((r) => r.out === id), "recipe still produces " + def(id).name);
      assert.ok(!CATALOG.includes(id), "catalogue still lists " + def(id).name);
      assert.ok(CATALOG_EXCLUDED[id]?.includes("dissolution"), "exclusion must document the dissolution");
    }
  });

  it("the moulded successors are strictly better at the same tier", () => {
    const pairs: [number, number][] = [
      [ID.PickS, ID.PlasticPick],
      [ID.SwordS, ID.PlasticSword],
      [ID.PickI, ID.TPlasticPick],
      [ID.SwordI, ID.TPlasticSword],
      [ID.AxeI, ID.TPlasticAxe],
      [ID.ShovelI, ID.TPlasticShovel],
    ];
    for (const [oldId, newId] of pairs) {
      assert.equal(def(newId).tier, def(oldId).tier, def(newId).name + " keeps the tier");
      assert.ok((def(newId).maxUse ?? 0) > (def(oldId).maxUse ?? 0), def(newId).name + " outlasts " + def(oldId).name);
      assert.ok(CATALOG.includes(newId), def(newId).name + " is obtainable (catalogued)");
    }
  });
});
