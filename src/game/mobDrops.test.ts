import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BLOCKS, ID, def } from "./blocks.ts";
import { SPECIES, ZONES, ZONE_IDS } from "./biomes.ts";
import { DROP_MOB_KINDS, MOB_BASE_DROPS, MOB_BONUS_DROPS, mobBaseDrops, rollBonusDrops } from "./mobDrops.ts";

const ID_NAME = new Map(Object.entries(ID).map(([k, v]) => [v as number, k]));
const allDropIds = () => new Set([...Object.values(MOB_BASE_DROPS).flat(), ...MOB_BONUS_DROPS.map((b) => b.id), ...SPECIES.flatMap((s) => s.drops), ...ZONE_IDS.flatMap((z) => ZONES[z].boss.drops)]);

test("every mob kind has a non-empty base drop table", () => {
  for (const k of DROP_MOB_KINDS) {
    assert.ok(k in MOB_BASE_DROPS, `${k} missing from MOB_BASE_DROPS`);
    assert.ok(mobBaseDrops(k).length > 0, `${k} drops nothing`);
  }
  assert.ok(mobBaseDrops("sheep", { sheared: true }).length > 0);
  assert.ok(mobBaseDrops("slime", { size: 1 }).length > 0);
});

test("bonus drops target real kinds with sane chances", () => {
  for (const b of MOB_BONUS_DROPS) {
    for (const k of b.kinds) assert.ok((DROP_MOB_KINDS as readonly string[]).includes(k), k);
    const c = b.p ?? b.luck ?? 1;
    assert.ok(c > 0 && c <= 1, `${ID_NAME.get(b.id)} chance ${c}`);
  }
  assert.deepEqual(rollBonusDrops("pig", 0.38, () => 1), []);
  assert.ok(rollBonusDrops("pig", 0.38, () => 0).includes(ID.Gold));
});

test("every dropped id exists and has a display name", () => {
  const known = new Set(BLOCKS.filter(Boolean).map((b) => b.id));
  for (const id of allDropIds()) {
    assert.ok(ID_NAME.has(id) && known.has(id), `unknown id ${id}`);
    const n = def(id).name;
    assert.ok(n && n.trim() && !/^(item|block)\s*\d*$/i.test(n), `${ID_NAME.get(id)} has no display name`);
  }
});

test("every dropped item has a real held model (not the brick-tile fallback)", () => {
  const src = readFileSync(new URL("./game.ts", import.meta.url), "utf8");
  const a = src.indexOf("function buildStudsItem3D");
  const body = src.slice(a, src.indexOf("// 5. ALL PLACEABLE", a));
  assert.ok(a > 0 && body.length > 1000, "held-model builder not found");
  for (const id of allDropIds()) {
    const d = def(id);
    const name = ID_NAME.get(id)!;
    const ok = d.placeable !== false || !!d.tool || !!d.food || d.armor > 0 || new RegExp(`ID\\.${name}\\b`).test(body);
    assert.ok(ok, `${name} (${d.name}) falls to the placeholder tile`);
  }
});

test("v5 Veilleur-Prisme drops are original and stay craftable", async () => {
  const { RECIPES, SMELT } = await import("./recipes.ts");
  const base = mobBaseDrops("enderman");
  assert.ok(base.includes(ID.VoidGlass) && base.includes(ID.EnderPearl));
  for (const id of [ID.VoidGlass, ID.EnderPearl, ID.VoidCore]) assert.doesNotMatch(def(id).name, /ender|pearl/i);
  assert.equal(SMELT[ID.VoidGlass], ID.Prism, "void glass is a rare melt input");
  const list = RECIPES;
  assert.ok(list.some((r) => r.out === ID.EnderPearl && r.need.some(([i]) => i === ID.VoidGlass)), "blink lens craftable from drops");
  assert.ok(list.find((r) => r.id === "void-blade")?.need.some(([i]) => i === ID.EnderPearl), "void-blade still uses the lens");
});
