// B21 (t92u) — vehicle armoury, cockpits and the garage builder.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ID, TEKS, def } from "./blocks.ts";
import { RECIPES } from "./recipes.ts";
import { readFileSync } from "node:fs";
import { SPECS, TechWorld } from "./teks.ts";
import { WEAPONS, MUZZLES, muzzleOf, HEAT_RESUME, POD_TUBES, aimDir, ballistic, coolWeapon, crimeOf, fireWeapon, laserBurnTime, mobDamage, newWeaponState } from "./vehArms.ts";
import { COCKPITS, cockpitEye, cockpitForward, cockpitPart, dashGauges } from "./cockpits.ts";
import { validateBuild, validateModel, buildSummary } from "./vehBuild.ts";
import { builtinModels, decodeModel, encodeModel, modelFromParts } from "./catalogue.ts";
import { vehicleFromAssembly, roleOf } from "./vehicle.ts";
import { boxDist } from "./vehView.ts";

const needOf = (out: number) => RECIPES.filter((r) => r.out === out).map((r) => new Map(r.need));

test("recipes: plastic cannon + balls from plastic, gold cannon from GOLD, laser from EMERALDS, cockpits from plastic tiers + glass", () => {
  assert.ok(needOf(ID.VehCannon).some((n) => n.has(ID.PlasticIngot) && !n.has(ID.Gold)));
  assert.ok(needOf(ID.Cannonball).some((n) => n.has(ID.PlasticIngot)));
  assert.ok(needOf(ID.VehGoldCannon).every((n) => n.has(ID.Gold)));
  assert.ok(needOf(ID.GoldShell).every((n) => n.has(ID.Gold)));
  assert.ok(needOf(ID.VehLaser).every((n) => n.has(ID.Emerald)));
  assert.ok(needOf(ID.CockpitSeat).some((n) => n.has(ID.PlasticIngot)));
  for (const id of [ID.CockpitCab, ID.CockpitMech]) assert.ok(needOf(id).every((n) => n.has(ID.Glass) && n.has(ID.TemperedIngot)), def(id).name);
  // no plain plastic cast for gold / emerald parts
  assert.equal(RECIPES.some((r) => r.id === "cast-tech-" + ID.VehGoldCannon || r.id === "cast-tech-" + ID.VehLaser), false);
  for (const id of [ID.VehCannon, ID.VehGoldCannon, ID.VehLaser, ID.VehRocketPod, ID.VehTurretMount, ID.CockpitSeat, ID.CockpitCab, ID.CockpitCage, ID.CockpitMech]) {
    assert.ok((TEKS as readonly number[]).includes(id), "teks part " + id);
    assert.ok(SPECS.get(id)!.ops.length >= 4, "procedural geometry " + id);
  }
});

test("garage + upgrades vendor stock the armoury and cockpits", () => {
  // quests.ts uses extensionless imports (bundler-only), so read its table as text
  const src = readFileSync(new URL("./quests.ts", import.meta.url), "utf8");
  const block = (role: string) => src.slice(src.indexOf("  " + role + ": {"), src.indexOf("],", src.indexOf("  " + role + ": {")));
  for (const n of ["CockpitSeat", "Cannonball", "VehCannon", "CockpitCab", "CockpitCage"]) assert.match(block("mechanic"), new RegExp("out: ID\\." + n + "\\b"));
  for (const n of ["GoldShell", "VehLaser", "VehTurretMount", "VehRocket"]) assert.match(block("outfitter"), new RegExp("out: ID\\." + n + "\\b"));
});

test("ammo: a cannon spends one ball per shot, respects cooldown, refuses when empty", () => {
  const st = newWeaponState(1, ID.VehCannon);
  assert.deepEqual(fireWeapon(st, 0, 0.016, 3, 1), { gate: "fired", ammo: 1, energy: 0 });
  assert.equal(fireWeapon(st, 0.2, 0.016, 2, 1).gate, "cooldown");
  assert.equal(fireWeapon(st, 1.0, 0.016, 2, 1).gate, "fired");
  assert.equal(fireWeapon(st, 5, 0.016, 0, 1).gate, "empty");
  const pod = newWeaponState(2, ID.VehRocketPod);
  let t = 0;
  for (let i = 0; i < POD_TUBES; i++, t += 0.5) assert.equal(fireWeapon(pod, t, 0.016, 9, 1).gate, "fired");
  assert.equal(fireWeapon(pod, t, 0.016, 9, 1).gate, "reloading");
});

test("energy: the laser drinks the battery, heats, overheats and cools back", () => {
  const st = newWeaponState(3, ID.VehLaser);
  const r = fireWeapon(st, 0, 0.1, 0, 1);
  assert.equal(r.gate, "fired");
  assert.ok(r.energy > 0 && r.ammo === 0);
  assert.equal(fireWeapon(newWeaponState(4, ID.VehLaser), 0, 0.1, 0, 0.01).gate, "no-energy");
  let n = 0;
  while (!st.overheated && n < 200) { fireWeapon(st, n * 0.1, 0.1, 0, 1); coolWeapon(st, 0.1); n++; }
  assert.ok(st.overheated && n < 60, "overheats in a few seconds (" + n + ")");
  assert.equal(fireWeapon(st, 99, 0.1, 0, 1).gate, "overheated");
  while (st.overheated) coolWeapon(st, 0.1);
  assert.ok(st.heat <= HEAT_RESUME);
});

test("damage: gold shells hit harder and splash; cannonballs don't splash; laser scales with beam time", () => {
  const c = WEAPONS[ID.VehCannon], g = WEAPONS[ID.VehGoldCannon], l = WEAPONS[ID.VehLaser];
  assert.ok(mobDamage(g) > mobDamage(c) * 2);
  assert.equal(mobDamage(c, 2), 0);
  assert.ok(mobDamage(g, 2) > 0 && mobDamage(g, 2) < mobDamage(g));
  assert.equal(mobDamage(g, 10), 0);
  assert.ok(Math.abs(mobDamage(l, 0, 1) - 2 * mobDamage(l, 0, 0.5)) < 1e-9);
  assert.ok(g.blast > 0 && c.blast === 0 && g.blockHit === "blast" && c.blockHit === "chip" && l.blockHit === "burn");
  assert.ok(laserBurnTime(3) > laserBurnTime(0.5));
  // ballistics: the heavier shell drops more over the same flight
  const p0 = { x: 0, y: 10, z: 0 }, v0 = { x: 0, y: 0, z: -30 };
  assert.ok(ballistic(p0, v0, g.grav, 1).y < ballistic(p0, v0, c.grav, 1).y);
});

test("village rules: hitting a villager is assault, a village block is a break, the wild is free", () => {
  assert.equal(crimeOf("villager", true), "assault");
  assert.equal(crimeOf("golem", true), "assault");
  assert.equal(crimeOf("block", true), "break");
  assert.equal(crimeOf("block", true, true), null);
  assert.equal(crimeOf("mob", true), null);
  assert.equal(crimeOf("villager", false), null);
});

test("aim: locked forward without a turret, mouse yaw with one", () => {
  const f = aimDir(0.5, false, 2.0, 0.6);
  assert.ok(Math.abs(f.yaw - 0.5) < 1e-9 && f.pitch <= 0.25);
  const t = aimDir(0.5, true, 2.0, 0.6);
  assert.ok(Math.abs(t.yaw - 2.0) < 1e-9 && Math.abs(t.pitch - 0.6) < 1e-9);
  assert.ok(Math.abs(Math.hypot(t.x, t.y, t.z) - 1) < 1e-9);
});

function placeModel(name: string) {
  const model = builtinModels().find((m) => m.name === name)!;
  const tech = new TechWorld();
  for (const mp of model.parts) tech.add(mp.id, mp.o, [200 + mp.dq[0], 260 + mp.dq[1], 200 + mp.dq[2]]);
  return { model, parts: [...tech.parts.values()] };
}

test("cockpit eye: every built-in vehicle seats the driver at its cockpit, facing forward, clear of the hull", () => {
  for (const name of ["Starter Buggy", "Rig Digger"]) {
    const { parts } = placeModel(name);
    const { vehicle, missing } = vehicleFromAssembly(parts, { hubChannel: "A", battery: 1, fuel: 0 });
    assert.deepEqual(missing, []);
    const cp = cockpitPart(vehicle)!;
    assert.ok(cp, name + " has a cockpit");
    assert.equal(roleOf(cp.id), "cockpit");
    assert.deepEqual(Object.values(cockpitForward(cp)).map(Math.round), [0, 0, -1]);
    const eye = cockpitEye(vehicle)!;
    // above the cockpit floor, inside its footprint, and no OTHER part's box contains the eye
    assert.ok(eye.y > cp.localPos.y + 1.5, name + " eye height");
    for (const p of vehicle.parts) if (p.uid !== cp.uid) assert.ok(boxDist(p, eye) > 0.2, name + ": eye clips part " + p.id);
    assert.ok(cp.box && eye.x >= cp.box.min.x && eye.x <= cp.box.max.x && eye.z >= cp.box.min.z - 0.01 && eye.z <= cp.box.max.z + 0.01);
  }
  for (const c of Object.values(COCKPITS)) assert.ok(c.eye[1] > 3 && c.fov >= 60 && c.fov <= 90);
  const g = dashGauges({ vel: 6, battery: 0.5 }, 16);
  assert.deepEqual(g, { speed: 0.5, ammo: 0.5, energy: 0.5 });
});

test("build validation: needs a cockpit plus a power source (and drive + wheels)", () => {
  const ok = validateBuild([ID.CockpitSeat, ID.TechHub, ID.MotorM, ID.Wheel, ID.Wheel, ID.VehCannon]);
  assert.equal(ok.ok, true);
  assert.equal(ok.cockpit, ID.CockpitSeat);
  const noCp = validateBuild([ID.TechHub, ID.MotorM, ID.Wheel, ID.Wheel]);
  assert.equal(noCp.ok, false);
  assert.ok(noCp.issues.some((i) => i.code === "cockpit"));
  const noPow = validateBuild([ID.CockpitCab, ID.MotorM, ID.Wheel, ID.Wheel]);
  assert.equal(noPow.ok, false);
  assert.ok(noPow.issues.some((i) => i.code === "power"));
  const dry = validateBuild([ID.CockpitSeat, ID.TechHub, ID.MotorM, ID.Wheel, ID.Wheel, ID.VehGoldCannon], () => 0);
  assert.equal(dry.ok, true);
  assert.ok(dry.issues.some((i) => i.code === "ammo" && !i.fatal));
  assert.match(buildSummary(noCp), /cockpit/);
  for (const m of builtinModels()) assert.equal(validateModel(m).ok, true, m.name);
});

test("save round-trip: an armed build survives encode/decode and still validates", () => {
  const { parts } = placeModel("Starter Buggy");
  const m = modelFromParts(parts, "Armed Buggy", "Local", ID.TechHub, 42);
  const back = decodeModel(encodeModel(m))!;
  assert.deepEqual(back, m);
  assert.equal(validateModel(back).ok, true);
  assert.ok(back.parts.some((p) => p.id === ID.VehCannon) && back.parts.some((p) => p.id === ID.CockpitCage));
});

test("phase B: muzzles sit at the barrel tips, the pod cycles its 4 tubes", () => {
  for (const id of Object.keys(WEAPONS).map(Number)) {
    assert.ok(MUZZLES[id]?.length, "muzzle for " + id);
    for (const m of MUZZLES[id]) assert.ok(m[2] < -2, "muzzle ahead of the mount");
  }
  const st = newWeaponState(1, ID.VehRocketPod);
  const seen = new Set<string>();
  let t = 0;
  for (let i = 0; i < 4; i++) {
    seen.add(muzzleOf(st).join(","));
    assert.equal(fireWeapon(st, (t += 1), 0.016, 10, 1).gate, "fired");
  }
  assert.equal(seen.size, 4);
});

test("phase B: the cockpit is never hidden as an occluder of the driver's own view", async () => {
  const { driverOccluders } = await import("./vehView.ts");
  for (const name of ["Starter Buggy", "Rig Digger"]) {
    const { parts } = placeModel(name);
    const { vehicle } = vehicleFromAssembly(parts, { hubChannel: "A", battery: 1, fuel: 0 });
    const cp = cockpitPart(vehicle)!;
    assert.ok(!driverOccluders(vehicle, cockpitEye(vehicle)!).has(cp.uid), name);
  }
});

test("phase B: game.ts wires cockpit eye, build law, fire control and the V view toggle", () => {
  const src = readFileSync(new URL("./game.ts", import.meta.url), "utf8");
  assert.match(src, /vehSeatEye = cockpitEye\(vehicle\) \?\? computeSeatEye\(vehicle\)/);
  assert.match(src, /validateBuild\(asm\.map/);
  assert.match(src, /vehFireTick\(vehEnt, dt, vehFireHeld\)/);
  assert.match(src, /keys\.has\("KeyV"\)/);
});
