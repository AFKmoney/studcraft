import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeVehicle, massOf, centerOf, stepVehicle, diff, suspRay, MOTOR_SPEC, FUEL } from "./p5bProto.ts";

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

  it("rolls and drains battery", () => {
    const v = makeVehicle();
    v.on = true;
    const b0 = v.battery;
    stepVehicle(v, 1);
    assert.ok(v.pos.x > 0);
    assert.ok(v.battery < b0);
  });

  it("stops when battery empty", () => {
    const v = makeVehicle();
    v.on = true;
    v.battery = 0;
    stepVehicle(v, 1);
    assert.equal(v.rpm, 0);
  });

  it("diff and suspension", () => {
    assert.equal(diff(8, 12), 10);
    assert.ok(suspRay(0, 0.2) >= 0 && suspRay(0, 0.2) <= 1);
  });

  it("fuel design numbers present", () => {
    assert.equal(FUEL.emptyBehavior, "stop");
    assert.ok(FUEL.meltPlasticYield > 0);
  });
});
