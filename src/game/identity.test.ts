import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AFFIXES, PATHS, PATH_CHANGE_COST, RELIC_BASES, rollRelic } from "./identity.ts";
import { def } from "./blocks.ts";

describe("R4 build identity", () => {
  it("four committed paths with real bonuses, and changing one has a price", () => {
    assert.equal(PATHS.length, 4);
    assert.deepEqual(PATHS.map((p) => p.id), ["founder", "mechanic", "scavenger", "breaker"]);
    for (const p of PATHS) assert.ok(p.bonus.length > 20, p.id + " states its numbered bonus");
    assert.ok(PATH_CHANGE_COST > 0);
  });

  it("relics roll deterministically, with two distinct affixes and a readable name", () => {
    const a = rollRelic(0.1, 0.2, 0.3);
    assert.deepEqual(a, rollRelic(0.1, 0.2, 0.3));
    assert.notEqual(a.affixes[0], a.affixes[1]);
    assert.ok(RELIC_BASES.includes(a.baseId as (typeof RELIC_BASES)[number]));
    // Name format: "{Affix1} {base name} of {Affix2 suffix}".
    assert.ok(a.name.startsWith(AFFIXES[a.affixes[0]].name + " "));
    assert.ok(a.name.includes(def(a.baseId).name));
    assert.ok(a.name.endsWith("of " + AFFIXES[a.affixes[1]].suffix));
    // Every base is real gear with durability (the one-instance bag model).
    for (const id of RELIC_BASES) assert.ok((def(id).maxUse ?? 0) > 0, def(id).name + " has durability");
    // Sweep the roll space: affixes always distinct, bases always valid.
    for (let i = 0; i < 60; i++) {
      const r = rollRelic(i / 60, ((i * 7) % 60) / 60, ((i * 13) % 60) / 60);
      assert.notEqual(r.affixes[0], r.affixes[1]);
      assert.ok(RELIC_BASES.includes(r.baseId as (typeof RELIC_BASES)[number]));
    }
  });

  it("every affix advertises the effect game.ts implements", () => {
    assert.match(AFFIXES.keen.desc, /\+2 damage/);
    assert.match(AFFIXES.swift.desc, /15%/);
    assert.match(AFFIXES.sturdy.desc, /half/);
    assert.match(AFFIXES.lucky.desc, /\+1 pellet/);
  });
});
