import { test } from "node:test";
import assert from "node:assert/strict";
import { TROPHIES, bump, newlyEarned, statsFrom, trophyRows } from "./trophies.ts";

test("trophies: three tiers per line, unique ids, rising goals", () => {
  assert.equal(new Set(TROPHIES.map((t) => t.id)).size, TROPHIES.length);
  assert.ok(TROPHIES.length >= 45);
  const byStat = new Map<string, number[]>();
  for (const t of TROPHIES) byStat.set(t.stat, [...(byStat.get(t.stat) ?? []), t.goal]);
  for (const [s, g] of byStat) assert.ok(g.length === 3 && g[0] < g[1] && g[1] < g[2], s);
});
test("trophies: earned exactly when the stat reaches the goal, once", () => {
  const st = {};
  const have = new Set<string>();
  bump(st, "mined", 49);
  assert.equal(newlyEarned(st, have).length, 0);
  bump(st, "mined");
  const got = newlyEarned(st, have);
  assert.deepEqual(got.map((t) => t.id), ["mined:0"]);
  for (const t of got) have.add(t.id);
  assert.equal(newlyEarned(st, have).length, 0);
  bump(st, "reputation", 12, true);
  bump(st, "reputation", 5, true);
  assert.equal((st as { reputation: number }).reputation, 12, "max stats keep the best");
  const row = trophyRows(st, have).find((r) => r.id === "mined:1")!;
  assert.equal(row.value, 50);
  assert.equal(row.earned, false);
});
test("trophies: persisted stats are sanitised", () => {
  assert.deepEqual(statsFrom({ mined: 5.7, bogus: 3, kills: -1, placed: "x" }), { mined: 5 });
  assert.deepEqual(statsFrom(null), {});
});
