import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ID } from "./blocks.ts";
import { bbox, centroid, composeO, rot, type Part } from "./teks.ts";
import {
  fuelFromMelt,
  parkPoses,
  refuel,
  stepVehicle,
  vehicleFromAssembly,
  type Vehicle,
} from "./vehicle.ts";

// P5b wiring tests (Muse, 2026-10-30). Effect-observed: every claim
// is a before/after value, and the conversion expectations are
// re-derived here from teks.ts primitives (bbox / centroid / rot),
// not from vehicle.ts's own helpers.

const part = (uid: number, id: number, q: [number, number, number], on = true): Part => ({ uid, id, o: 0, q, on });

/** The plan's minimal vehicle: 4 wheels + chassis + 1 motor + hub
 *  (+ battery box), all at orientation 0, wheels at (±2, 0, ±2). */
function fixture(): Part[] {
  return [
    part(1, ID.Wheel, [-8, 0, -8]),
    part(2, ID.Wheel, [8, 0, -8]),
    part(3, ID.Wheel, [-8, 0, 8]),
    part(4, ID.Wheel, [8, 0, 8]),
    part(5, ID.TechHub, [0, 8, 0]),
    part(6, ID.Battery, [0, 8, 8]),
    part(7, ID.MotorM, [0, 4, -4]),
    part(8, ID.Liftarm11, [-8, 4, 0]),
    part(9, ID.Liftarm11, [8, 4, 0]),
  ];
}

const flat = () => 0;
const DT = 1 / 60;
function drive(v: Vehicle, seconds: number, cmd: { throttle: number; steer: number; channel: "A" | "B" | "C" | "D" }, heightAt: (x: number, z: number) => number = flat) {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) stepVehicle(v, DT, cmd, heightAt);
}

describe("p5b vehicle conversion (build == run)", () => {
  it("converts the minimal assembly with exact mass and centre", () => {
    const parts = fixture();
    const { vehicle: v, missing } = vehicleFromAssembly(parts);
    assert.deepEqual(missing, []);
    assert.equal(v.wheels.length, 4);
    assert.equal(v.motors.length, 1);
    assert.equal(v.motors[0].size, "M");
    assert.equal(v.hubOn, true);
    assert.equal(v.hasBatteryBox, true);
    // Expected mass + origin re-derived from teks primitives.
    let m = 0;
    const c = [0, 0, 0];
    for (const p of parts) {
      const [lo, hi] = bbox(p.id, 0);
      const vol = ((hi[0] - lo[0]) * (hi[1] - lo[1]) * (hi[2] - lo[2])) / 8;
      const pm = Math.max(0.03, vol * 0.0012);
      const cen = centroid(p.id);
      const r = rot(p.o, [cen[0], cen[1], cen[2]]);
      m += pm;
      c[0] += (p.q[0] / 4 + r[0] / 4) * pm;
      c[1] += (p.q[1] / 4 + r[1] / 4) * pm;
      c[2] += (p.q[2] / 4 + r[2] / 4) * pm;
    }
    assert.ok(Math.abs(v.mass - m) < 1e-9, `mass ${v.mass} vs ${m}`);
    assert.ok(Math.abs(v.origin0.x - c[0] / m) < 1e-9);
    assert.ok(Math.abs(v.origin0.y - c[1] / m) < 1e-9);
    assert.ok(Math.abs(v.origin0.z - c[2] / m) < 1e-9);
    // The mass centre in the vehicle's own frame is the origin.
    assert.ok(Math.hypot(v.centre.x, v.centre.y, v.centre.z) < 1e-9);
    // Frame convention: wheels face +X (axle along Z at o=0), so a
    // wheel's local coords are (Δz, Δy, −Δx) of its world offset.
    // uid 2 sits at world origin (2, ·, −2).
    const w = v.parts.find((p) => p.uid === 2)!;
    assert.ok(Math.abs(w.localPos.x - (-2 - v.origin0.z)) < 1e-9, `lx ${w.localPos.x}`);
    assert.ok(Math.abs(w.localPos.z - -(2 - v.origin0.x)) < 1e-9, `lz ${w.localPos.z}`);
    // Wheel radius from the real geometry: blade Ø 5 modules = 1.25 blocks.
    assert.ok(Math.abs(w.radius - 1.25) < 1e-9, `radius ${w.radius}`);
  });

  it("reports what is missing instead of inventing a vehicle", () => {
    const noHub = fixture().filter((p) => p.id !== ID.TechHub);
    assert.ok(vehicleFromAssembly(noHub).missing.includes("hub"));
    const noMotor = fixture().filter((p) => p.id !== ID.MotorM);
    assert.ok(vehicleFromAssembly(noMotor).missing.includes("motor"));
    const oneWheel = fixture().filter((p) => p.uid === 1 || p.id !== ID.Wheel);
    assert.ok(vehicleFromAssembly(oneWheel).missing.some((s) => s.includes("wheels")));
  });

  it("parkPoses at rest reproduce the assembly exactly, part for part", () => {
    const parts = fixture();
    const { vehicle: v } = vehicleFromAssembly(parts);
    const poses = parkPoses(v)!;
    assert.equal(poses.length, parts.length);
    for (const p of parts) {
      const pose = poses.find((x) => x.uid === p.uid)!;
      assert.equal(pose.id, p.id);
      assert.equal(pose.o, p.o);
      assert.deepEqual(pose.q, p.q);
    }
  });

  it("parkPoses after a quarter turn rotate every part by composeO", () => {
    const { vehicle: v } = vehicleFromAssembly(fixture());
    v.yaw = v.yaw0 + Math.PI / 2;
    const poses = parkPoses(v)!;
    for (const p of v.parts) {
      const pose = poses.find((x) => x.uid === p.uid)!;
      assert.equal(pose.o, composeO(p.o, 1, 1));
      const rk = composeO(0, 1, 1);
      const off = rot(rk, [p.relOrigin.x, p.relOrigin.y, p.relOrigin.z]);
      assert.deepEqual(pose.q, [
        Math.round((v.pos.x + off[0]) * 4),
        Math.round((v.pos.y + off[1]) * 4),
        Math.round((v.pos.z + off[2]) * 4),
      ]);
    }
  });
});

describe("p5b driving", () => {
  it("drives forward on flat ground and drains the battery by load", () => {
    const { vehicle: v } = vehicleFromAssembly(fixture());
    const x0 = v.pos.x;
    drive(v, 5, { throttle: 1, steer: 0, channel: "A" });
    assert.ok(v.pos.x - x0 > 10, `displacement ${v.pos.x - x0}`);
    assert.ok(v.vel > 3, `vel ${v.vel}`);
    // M motor: vMax = 405 rpm / 8 (reduction) × 1.25 (radius) ≈ 6.63.
    assert.ok(v.vel <= 6.64, `vel cap ${v.vel}`);
    assert.ok(v.battery < 1 && v.battery > 0.9, `battery ${v.battery}`);
    assert.ok(v.load > 0.2 && v.load < 0.35, `load ${v.load}`);
  });

  it("wrong channel: the motor does NOT answer (negative control)", () => {
    const bindings = new Map([[7, "B" as const]]);
    const { vehicle: v } = vehicleFromAssembly(fixture(), { bindings });
    const x0 = v.pos.x;
    drive(v, 3, { throttle: 1, steer: 0, channel: "A" });
    assert.equal(v.vel, 0);
    assert.ok(Math.abs(v.pos.x - x0) < 1e-9, `crept ${v.pos.x - x0}`);
    assert.equal(v.load, 0);
    // Same vehicle, the channel it is actually bound to: it moves.
    drive(v, 3, { throttle: 1, steer: 0, channel: "B" });
    assert.ok(v.pos.x - x0 > 1, `bound channel drives: ${v.pos.x - x0}`);
  });

  it("hub off: no drive even on the right channel", () => {
    const parts = fixture().map((p) => (p.id === ID.TechHub ? { ...p, on: false } : p));
    const { vehicle: v } = vehicleFromAssembly(parts);
    const x0 = v.pos.x;
    drive(v, 3, { throttle: 1, steer: 0, channel: "A" });
    assert.equal(v.vel, 0);
    assert.ok(Math.abs(v.pos.x - x0) < 1e-9);
  });

  it("a servo alone cannot propel (steering motor, not a drive motor)", () => {
    const parts = fixture().map((p) => (p.id === ID.MotorM ? part(7, ID.Servo, [0, 4, -4]) : p));
    const { vehicle: v, missing } = vehicleFromAssembly(parts);
    assert.deepEqual(missing, []);
    const x0 = v.pos.x;
    drive(v, 3, { throttle: 1, steer: 0, channel: "A" });
    assert.equal(v.vel, 0);
    assert.ok(Math.abs(v.pos.x - x0) < 1e-9);
  });

  it("suspension: a step under the front wheels lifts and pitches the body", () => {
    const { vehicle: v } = vehicleFromAssembly(fixture());
    drive(v, 0.5, { throttle: 0, steer: 0, channel: "A" });
    const flatY = v.pos.y;
    const flatPitch = v.pitch;
    assert.ok(Math.abs(flatPitch) < 0.02, `flat pitch ${flatPitch}`);
    // Front wheels sit at pos.x + 2; put a 1-block step under them only.
    const stepX = v.pos.x + 2.5;
    const step = (x: number) => (x > stepX ? 1 : 0);
    v.pos.x += 1;
    drive(v, 0.5, { throttle: 0, steer: 0, channel: "A" }, step);
    assert.ok(v.pos.y > flatY + 0.3, `body lifted ${flatY} → ${v.pos.y}`);
    assert.ok(v.pitch > 0.15, `pitch ${v.pitch}`);
    // A full block of step saturates the 0.35 travel: front wheels
    // (local z < 0) pinned at full compression, rear at full droop.
    const frontSusp = Math.max(...v.wheels.map((w, i) => (w.localPos.z < 0 ? v.susp[i] : -1)));
    const rearSusp = Math.min(...v.wheels.map((w, i) => (w.localPos.z > 0 ? v.susp[i] : 2)));
    assert.ok(frontSusp > 0.9, `front compression ${frontSusp}`);
    assert.ok(rearSusp < 0.1, `rear compression ${rearSusp}`);
  });

  it("differential: a turn splits wheel speeds, the average is preserved", () => {
    const { vehicle: v } = vehicleFromAssembly(fixture());
    drive(v, 3, { throttle: 1, steer: 1, channel: "A" });
    const { left, right, carrier } = v.wheelSpeeds;
    assert.ok(Math.abs(right - left) > 0.5, `split L ${left} R ${right}`);
    assert.ok(Math.abs(carrier - v.vel) < 0.002, `carrier ${carrier} vs vel ${v.vel}`);
    assert.ok(Math.abs(v.yaw - v.yaw0) > 0.3, `yaw moved ${v.yaw - v.yaw0}`);
  });
});

describe("p5b energy: battery, generator, fuel", () => {
  it("melt yield is the plan's number", () => {
    assert.equal(fuelFromMelt(1), 0.25);
    assert.equal(fuelFromMelt(4), 1);
  });

  it("the generator burns fuel to keep a weak battery driving", () => {
    const { vehicle: v } = vehicleFromAssembly(fixture(), { battery: 0.05, fuel: 1 });
    const x0 = v.pos.x;
    drive(v, 10, { throttle: 1, steer: 0, channel: "A" });
    assert.ok(v.pos.x - x0 > 5, `drove ${v.pos.x - x0}`);
    assert.ok(v.fuel < 0.9, `fuel burned: ${v.fuel}`);
    assert.ok(v.battery > 0.1, `battery held up by the generator: ${v.battery}`);
  });

  it("dry tank + dry battery stops a MOVING vehicle (displacement, not rpm)", () => {
    const { vehicle: v } = vehicleFromAssembly(fixture(), { battery: 0.6, fuel: 0 });
    drive(v, 2, { throttle: 1, steer: 0, channel: "A" });
    assert.ok(v.vel > 1, `moving first: vel ${v.vel}`);
    v.battery = 0.01; // nearly dry, no fuel aboard
    drive(v, 12, { throttle: 1, steer: 0, channel: "A" });
    assert.equal(v.vel, 0);
    const stoppedX = v.pos.x;
    drive(v, 2, { throttle: 1, steer: 0, channel: "A" });
    assert.equal(v.pos.x, stoppedX);
  });

  it("battery alone runs out and the vehicle stops for good", () => {
    const { vehicle: v } = vehicleFromAssembly(fixture(), { battery: 0.05, fuel: 0 });
    drive(v, 40, { throttle: 1, steer: 0, channel: "A" });
    assert.equal(v.battery, 0);
    assert.equal(v.vel, 0);
    const stoppedX = v.pos.x;
    drive(v, 2, { throttle: 1, steer: 0, channel: "A" });
    assert.equal(v.pos.x, stoppedX);
  });

  it("refuel respects the tank capacity", () => {
    const { vehicle: v } = vehicleFromAssembly(fixture(), { fuel: 3.5 });
    assert.equal(refuel(v, 1), 0.5);
    assert.equal(v.fuel, 4);
    assert.equal(refuel(v, 1), 0);
  });
});
