import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeProto, massOf, centerOf, stepProto, diff, suspRay } from "./p5bProto.ts";

describe("p5b proto", () => {
  it("has 4 wheels + chassis + motor + hub", () => {
    const v = makeProto();
    assert.equal(v.parts.filter((p) => p.kind === "wheel").length, 4);
    assert.equal(v.parts.filter((p) => p.kind === "chassis").length, 1);
    assert.equal(v.parts.filter((p) => p.kind === "motor").length, 1);
    assert.equal(v.parts.filter((p) => p.kind === "hub").length, 1);
  });

  it("mass and center from parts", () => {
    const v = makeProto();
    assert.ok(massOf(v) > 0);
    const c = centerOf(v);
    assert.ok(Number.isFinite(c.x) && Number.isFinite(c.y));
  });

  it("rolls and drains battery when on", () => {
    const v = makeProto();
    v.on = true;
    const before = v.battery;
    stepProto(v, 1);
    assert.ok(v.pos.x > 0);
    assert.ok(v.battery < before);
    assert.equal(v.rpm, 405);
  });

  it("diff averages wheel speeds", () => {
    assert.equal(diff(10, 20), 15);
  });

  it("suspension ray returns 0..1", () => {
    const c = suspRay(0, 0.2);
    assert.ok(c >= 0 && c <= 1);
  });
});
