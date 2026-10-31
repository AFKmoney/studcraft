import { test } from "node:test";
import assert from "node:assert/strict";
import { MOB_KINDS, MOB_LABEL, mobLabel } from "./mobNames.ts";

test("every mob kind has a unique non-empty display name", () => {
  const seen = new Set<string>();
  for (const k of MOB_KINDS) {
    const label = MOB_LABEL[k];
    assert.ok(label && label.trim().length > 0, `missing label for ${k}`);
    assert.ok(!seen.has(label), `duplicate label ${label}`);
    seen.add(label);
  }
});

test("display names drop the Minecraft vocabulary", () => {
  const banned = /creeper|enderman|zombie|skeleton|wither|ender dragon|golem/i;
  for (const k of MOB_KINDS) assert.doesNotMatch(MOB_LABEL[k], banned, k);
});

test("variants: untamed wolf and elder guardian", () => {
  assert.notEqual(mobLabel("wolf", { tame: false }), mobLabel("wolf", { tame: true }));
  assert.notEqual(mobLabel("guardian", { elder: true }), mobLabel("guardian"));
});
