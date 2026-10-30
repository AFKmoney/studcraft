import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeVehicle, massOf, centerOf, stepVehicle, diff, suspRay, MOTOR_SPEC, FUEL } from "./p5bProto.ts";
import { diffOutput, frac } from "./mechState.ts";

describe("p5b complete", () => {
  it("motors have Power Functions numbers", () => {
    assert.equal(MOTOR_SPEC.M.rpm, 405);
    assert.equal(MOTOR_SPEC.L.torqueNcm, 18);
    assert.equal(MOTOR_SPEC.XL.rpm, 220);
  });

  it("vehicle has hub, battery, remote, 4 wheels", () => {
    const v = makeVehicle("L", "B");
    assert.equal(v.parts.filter((p) => p.kind === "wheel").length, 4);
    assert.equal(v.parts.filter((p) => p.kind === "hub").length, 1);
    assert.equal(v.parts.filter((p) => p.kind === "battery").length, 1);
    assert.equal(v.parts.filter((p) => p.kind === "remote").length, 1);
    assert.equal(v.channel, "B");
  });

  // Strengthened 2026-10-30 (P5b wiring): the verifier found massOf /
  // centerOf imported but never asserted. Exact values, hand-computed
  // from the fixture: masses sum to 0.99; centre y = 0.303/0.99,
  // centre z = 0.007/0.99, centre x = 0 (symmetric wheels).
  it("mass and centre are the fixture's exact values", () => {
    const v = makeVehicle();
    assert.ok(Math.abs(massOf(v) - 0.99) < 1e-9, `mass ${massOf(v)}`);
    const c = centerOf(v);
    assert.ok(Math.abs(c.x) < 1e-9, `cx ${c.x}`);
    assert.ok(Math.abs(c.y - 0.303 / 0.99) < 1e-9, `cy ${c.y}`);
    assert.ok(Math.abs(c.z - 0.007 / 0.99) < 1e-9, `cz ${c.z}`);
  });

  it("rolls and drains battery", () => {
    const v = makeVehicle();
    v.on = true;
    const b0 = v.battery;
    stepVehicle(v, 1);
    assert.ok(v.pos.x > 0);
    assert.ok(v.battery < b0);
  });

  // Strengthened: the old test asserted rpm on a vehicle that never
  // moved. This one gets it MOVING, then kills the battery and
  // asserts the DISPLACEMENT stops, not just the rpm.
  it("stops when battery empty", () => {
    const v = makeVehicle();
    v.on = true;
    for (let i = 0; i < 30; i++) stepVehicle(v, 1 / 30);
    assert.ok(v.pos.x > 0.1, `it moved first: ${v.pos.x}`);
    v.battery = 0;
    const stoppedAt = v.pos.x;
    for (let i = 0; i < 120; i++) stepVehicle(v, 1 / 30);
    assert.equal(v.pos.x, stoppedAt);
    assert.equal(v.rpm, 0);
  });

  // The differential is ONE implementation (mechState.diffOutput);
  // p5bProto.diff delegates to it, mechLink consumes it too.
  it("diff and suspension", () => {
    assert.equal(diff(8, 12), 10);
    const f = diffOutput(frac(1, 3), frac(1, 6));
    assert.equal(f.n / f.d, 0.25);
    assert.equal(diff(1 / 3, 1 / 6), 0.25);
    // Suspension travel ends are exact, not just "within [0,1]".
    assert.equal(suspRay(0, 0), 1);
    assert.equal(suspRay(0, 0.35), 0);
    assert.ok(Math.abs(suspRay(0, 0.175) - 0.5) < 1e-9);
  });

  it("fuel design numbers present", () => {
    assert.equal(FUEL.emptyBehavior, "stop");
    assert.equal(FUEL.meltPlasticYield, 0.25);
    assert.equal(FUEL.tankCapacity, 4);
    assert.equal(FUEL.consumptionPerLoad, 0.08);
  });
});
