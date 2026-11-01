// t91u firearm logic: ammo, magazine, reload, fire, recoil, flash
import { test } from "node:test";
import assert from "node:assert/strict";
import { GUNS, ammoLabel, damageAt, finishReload, flashAt, newGun, recoilAt, reloadPose, startReload, tryFire } from "./firearms.ts";

test("a fresh gun is empty; firing empty asks for a reload", () => {
  const g = GUNS.Carbine, st = newGun(g);
  assert.equal(st.mag, 0);
  assert.equal(tryFire(g, st, 1), "empty");
});
test("reload takes only what fits and what you have, lands after the timer", () => {
  const g = GUNS.Carbine, st = newGun(g);
  assert.equal(startReload(g, st, 0, 7), 7);
  assert.equal(tryFire(g, st, 0.5), "reloading");
  assert.equal(startReload(g, st, 0.5, 100), 0, "no double reload");
  finishReload(st, 7);
  assert.equal(st.mag, 7);
  assert.equal(startReload(g, st, 5, 100), 13, "tops up to 20");
  assert.equal(startReload(GUNS.Rifle, newGun(GUNS.Rifle), 0, 0), 0, "no ammo, no reload");
});
test("each shot consumes one round; fire interval and semi-auto are enforced", () => {
  const g = GUNS.Rifle, st = newGun(g);
  finishReload(st, 5);
  assert.equal(tryFire(g, st, 10), "fired");
  assert.equal(st.mag, 4);
  assert.equal(tryFire(g, st, 10.1), "cooldown");
  assert.equal(tryFire(g, st, 11, true), "cooldown", "semi-auto needs a fresh pull");
  assert.equal(tryFire(g, st, 11), "fired");
  const c = GUNS.Carbine, cs = newGun(c);
  finishReload(cs, 20);
  let n = 0;
  for (let t = 0; t < 1; t += 0.01) if (tryFire(c, cs, t, t > 0) === "fired") n++;
  assert.ok(n >= 8 && n <= 10, "carbine is automatic at ~9 rounds/s: " + n);
});
test("magazine capacities and cartridge ammo", () => {
  assert.equal(GUNS.Carbine.mag, 20);
  assert.equal(GUNS.Rifle.mag, 5);
  assert.equal(GUNS.Revolver.mag, 6);
  assert.equal(GUNS.Musket.mag, 1);
  for (const k of ["Carbine", "Rifle", "Revolver", "Musket", "Flintlock"]) assert.equal(GUNS[k].ammo, "Cartridge");
  const w = GUNS.Wand, ws = newGun(w);
  assert.equal(tryFire(w, ws, 1), "fired", "the wand needs no ammo");
});
test("recoil kicks then decays; flash lasts 50 ms; reload pose dips and returns", () => {
  const g = GUNS.Rifle;
  assert.equal(recoilAt(g, 0.01), g.kick);
  assert.ok(recoilAt(g, 0.1) < g.kick && recoilAt(g, 0.5) === 0);
  assert.ok(flashAt(0.01) > 0 && flashAt(0.06) === 0);
  const st = newGun(g);
  startReload(g, st, 0, 5);
  assert.ok(reloadPose(g, st, g.reload / 2) > 0.9 && reloadPose(g, st, g.reload + 0.01) === 0);
});
test("damage falls off with range; HUD label", () => {
  const g = GUNS.Rifle;
  assert.equal(damageAt(g, 10), g.dmg);
  assert.ok(damageAt(g, 60) < g.dmg && damageAt(g, 500) >= Math.round(g.dmg / 2));
  const st = newGun(g);
  finishReload(st, 3);
  assert.equal(ammoLabel(g, st, 12, 0), "3/5 · 12");
  assert.equal(ammoLabel(GUNS.Wand, newGun(GUNS.Wand), 0, 0), "∞");
});
