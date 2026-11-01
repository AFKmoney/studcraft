// t91u: every catalogue p.4 accessory exists, is craftable, modeled and functional
import { test } from "node:test";
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
const { ACCESSORIES, ACC_BASE, accId } = await import("./accessories.ts");
const { GUNS } = await import("./firearms.ts");
const { ID, BLOCKS, def, faceTile, ATLAS_COLS, ATLAS_ROWS } = await import("./blocks.ts");
const { RECIPES, itemByName } = await import("./recipes.ts");

// the catalogue rows (p.4) that were missing, by item key
const CATALOGUE = ["Wrench", "Drill", "Hammer", "Crowbar", "OilCan", "Broom", "Extinguisher", "Chainsaw", "FireAxe", "Walkie", "Megaphone", "TvCamera", "Binoculars", "Magnifier", "Phone", "Mug", "Goblet", "Suitcase", "TreasureChest", "Bag", "Croissant", "Banana", "TurkeyLeg", "HotDog", "IceCream", "Pizza", "ShortSword", "LongSword", "Katana", "Halberd", "TriShield", "OvalShield", "RoundShield", "Cutlass", "Flintlock", "Musket", "Revolver", "Handcuffs", "Lightsaber", "BlasterS", "BlasterM", "BlasterL", "Launcher", "Wand", "Cauldron", "ElectricGuitar", "AcousticGuitar", "Saxophone", "HardHat", "SpaceHelmet", "Visor", "BaseballCap", "Bicorne", "Backpack", "AirTanks", "Quiver", "Breastplate", "Cape", "Carbine", "Rifle"];

for (const k of CATALOGUE) {
  test(`accessory ${k}: registered, modeled, craftable`, () => {
    const id = accId(k);
    assert.ok(id >= ACC_BASE && id <= 0xffff && (ID as any)[k] === id, "id");
    const a = ACCESSORIES[id - ACC_BASE];
    assert.equal(def(id).name, a.name);
    assert.ok(a.parts.length >= 1);
    for (const p of a.parts) for (const v of p.slice(1)) assert.ok(v === undefined || Number.isFinite(v));
    const r = RECIPES.find((x: any) => x.out === id);
    assert.ok(r, "recipe");
    for (const [i, n] of r.need) assert.ok(i > 0 && n > 0, "ingredient resolves");
    const t = faceTile(id, 0);
    assert.ok(t >= 0 && t < ATLAS_COLS * ATLAS_ROWS);
    if (a.kind === "food") assert.ok(def(id).food > 0);
    if (a.kind === "wear") assert.ok(def(id).armorSlot > 0);
    if (a.kind === "tool") assert.ok(def(id).tool && def(id).maxUse > 0);
    if (a.kind === "gun") { assert.ok(GUNS[k], "gun spec"); assert.ok(a.muzzle && def(id).maxUse > 0); }
  });
}
test("guns hold their grip under the stock and their ammo is craftable", () => {
  for (const a of ACCESSORIES.filter((x: any) => x.kind === "gun")) {
    const g = GUNS[a.key];
    if (g.ammo) assert.ok(itemByName(g.ammo === "PowerCell" ? "Power cell" : g.ammo) > 0, a.key + " ammo");
    assert.ok(a.muzzle![0] > 0, "muzzle forward (+X)");
  }
  const cart = RECIPES.find((r: any) => r.out === accId("Cartridge"))!;
  assert.deepEqual(cart.need.map(([i]: number[]) => def(i).name).sort(), ["Brass casing", "Bullet", "Popper powder"]);
});
test("every accessory recipe ingredient resolves to a real item", () => {
  for (const a of ACCESSORIES) for (const [n] of a.recipe) assert.ok(itemByName(n) > 0, a.key + ": " + n);
});
test("ids are contiguous and unique", () => {
  ACCESSORIES.forEach((a: any, i: number) => assert.equal(BLOCKS[ACC_BASE + i].name, a.name));
  assert.equal(new Set(ACCESSORIES.map((a: any) => a.key)).size, ACCESSORIES.length);
});
