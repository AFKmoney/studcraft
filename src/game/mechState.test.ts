import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  clearMech,
  meshStuds,
  putMech,
  speedAt,
  strokeAt,
  tickMech,
  torqueAt,
  type MechPart,
} from "./mechState.ts";

function part(p: MechPart) {
  putMech(p);
}

describe("technic mesh", () => {
  beforeEach(() => clearMech());

  it("uses the catalog centre distance", () => {
    assert.equal(meshStuds(16, 16), 2);
    assert.equal(meshStuds(8, 24), 2);
    assert.equal(meshStuds(8, 8), 1);
    assert.equal(meshStuds(24, 40), 4);
  });

  it("reverses a 16T pair and keeps the torque", () => {
    part({ x: 0, y: 0, z: 0, kind: "crank", axis: "y", teeth: 0, driveN: 1, driveD: 1 });
    part({ x: 0, y: 2, z: 0, kind: "gear", axis: "y", teeth: 16 });
    part({ x: 2, y: 2, z: 0, kind: "gear", axis: "y", teeth: 16 });
    tickMech(0);
    assert.deepEqual(speedAt(2, 2, 0), { n: -1, d: 1 });
    assert.deepEqual(torqueAt(2, 2, 0), { n: 1, d: 1 });
  });

  it("slows an 8T driving a 24T and multiplies the torque", () => {
    part({ x: 0, y: 0, z: 0, kind: "crank", axis: "y", teeth: 0, driveN: 3, driveD: 1 });
    part({ x: 0, y: 2, z: 0, kind: "gear", axis: "y", teeth: 8 });
    part({ x: 2, y: 2, z: 0, kind: "gear", axis: "y", teeth: 24 });
    tickMech(0);
    assert.deepEqual(speedAt(2, 2, 0), { n: -1, d: 1 });
    assert.deepEqual(torqueAt(2, 2, 0), { n: 3, d: 1 });
  });

  it("does not let a gear turn a worm", () => {
    part({ x: 0, y: 0, z: 0, kind: "crank", axis: "y", teeth: 0, driveN: 1, driveD: 1 });
    part({ x: 0, y: 2, z: 0, kind: "gear", axis: "y", teeth: 8 });
    part({ x: 2, y: 2, z: 0, kind: "worm", axis: "x", teeth: 0 });
    tickMech(0);
    assert.deepEqual(speedAt(2, 2, 0), { n: 0, d: 1 });
  });

  it("lets a worm advance a gear by one tooth per turn", () => {
    part({ x: 0, y: 0, z: 0, kind: "crank", axis: "x", teeth: 0, driveN: 1, driveD: 1 });
    part({ x: 2, y: 0, z: 0, kind: "worm", axis: "x", teeth: 0 });
    part({ x: 2, y: 0, z: 2, kind: "gear", axis: "y", teeth: 8 });
    tickMech(0);
    assert.deepEqual(speedAt(2, 0, 2), { n: -1, d: 8 });
    assert.deepEqual(torqueAt(2, 0, 2), { n: 8, d: 1 });
  });

  it("opens a clutch", () => {
    part({ x: 0, y: 0, z: 0, kind: "crank", axis: "y", teeth: 0, driveN: 1, driveD: 1 });
    part({ x: 0, y: 2, z: 0, kind: "clutch", axis: "y", teeth: 0, open: true });
    part({ x: 0, y: 4, z: 0, kind: "axle", axis: "y", teeth: 0 });
    tickMech(0);
    assert.deepEqual(speedAt(0, 2, 0), { n: 1, d: 1 });
    assert.deepEqual(speedAt(0, 4, 0), { n: 0, d: 1 });
  });

  it("carries a belt without reversing", () => {
    part({ x: 0, y: 0, z: 0, kind: "crank", axis: "y", teeth: 0, driveN: 2, driveD: 1 });
    part({ x: 0, y: 2, z: 0, kind: "pulley", axis: "y", teeth: 0, belt: 1, pulley: 8 });
    part({ x: 10, y: 2, z: 0, kind: "pulley", axis: "y", teeth: 0, belt: 1, pulley: 16 });
    tickMech(0);
    assert.deepEqual(speedAt(10, 2, 0), { n: 1, d: 1 });
  });

  it("leaves a loose gear still", () => {
    part({ x: 5, y: 5, z: 5, kind: "gear", axis: "y", teeth: 16 });
    tickMech(0);
    assert.deepEqual(speedAt(5, 5, 5), { n: 0, d: 1 });
  });

  it("lifts a cam halfway through a turn", () => {
    part({ x: 0, y: 0, z: 0, kind: "crank", axis: "y", teeth: 0, driveN: 1, driveD: 1 });
    part({ x: 0, y: 2, z: 0, kind: "cam", axis: "y", teeth: 0 });
    tickMech(0.5);
    assert.ok(Math.abs(strokeAt(0, 2, 0) - 1) < 1e-9);
  });

  it("stops a shaft pulled both ways", () => {
    part({ x: 0, y: 0, z: 0, kind: "crank", axis: "y", teeth: 0, driveN: 1, driveD: 1 });
    part({ x: 0, y: 2, z: 0, kind: "axle", axis: "y", teeth: 0 });
    part({ x: 0, y: 4, z: 0, kind: "crank", axis: "y", teeth: 0, driveN: -1, driveD: 1 });
    tickMech(0);
    assert.deepEqual(speedAt(0, 2, 0), { n: 0, d: 1 });
  });
});
