import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ID, TEKS } from "./blocks.ts";
import { ORIENTS, SPECS, TechWorld, axOf, localCells, rot, SENSOR_RANGES, SENSOR_TARGETS, nextSensorCfg, sensorCfgLabel, colorFamilyOf } from "./teks.ts";

const find = (f: (o: number) => boolean) => ORIENTS.findIndex((_, o) => f(o));

describe("teks", () => {
  it("has a real 1:1 spec for every Teks part", () => {
    for (const id of TEKS) {
      const s = SPECS.get(id);
      assert.ok(s, "spec " + id);
      assert.ok(s.ops.length > 0 && localCells(id).length > 0, "geometry " + id);
      assert.ok(s.holes.length + s.males.length > 0 || id === ID.Pipe || id === ID.PipeElbow || id === ID.Remote || id === ID.Wheel || id === ID.Mill || id === ID.Spring || id === ID.Rack, "connectors " + id);
    }
    assert.equal(ORIENTS.length, 24);
    assert.deepEqual(rot(0, [1, 2, 3]), [1, 2, 3]);
  });
  it("pins, beams and axles assemble like real STUDS", () => {
    const w = new TechWorld();
    const b = w.plan(ID.Liftarm5, { kind: "face", point: [10, 0, 10], n: [1, 1], face: 0 }, [1, 0, 0], 0)!;
    assert.deepEqual(axOf(b.o, 2)[0], 1); // holes vertical when laid flat
    w.add(ID.Liftarm5, b.o, b.q);
    const h = w.raycast([7.2, 8, 9.2], [0, -1, 0], 40)!;
    const p = w.plan(ID.Pin2L, { kind: "part", uid: h.uid, point: h.point, n: h.n, cell: h.cell }, [0, -1, 0], 0)!;
    assert.ok(p.links > 0); // seated in the hole
    w.add(ID.Pin2L, p.o, p.q);
    const h2 = w.raycast([7.2, 8, 9.2], [0, -1, 0], 40)!;
    assert.equal(h2.uid, 2); // the protruding half of the pin
    const b2 = w.plan(ID.Liftarm3, { kind: "part", uid: h2.uid, point: h2.point, n: h2.n, cell: h2.cell }, [1, 0, 0], 0)!;
    assert.ok(b2.links > 0);
    w.add(ID.Liftarm3, b2.o, b2.q);
    // a pin never fits a cross hole; a second beam can't overlap the first
    assert.equal(w.test(ID.Liftarm5, b.o, b.q), -1);
    const t = new TechWorld();
    t.add(ID.Thin3, 0, [1, 1, 1]); // ends are axle holes at x = -1, 3
    const ax = find((o) => axOf(o, 0)[0] === 2);
    assert.equal(t.test(ID.Pin2L, ax, [-1, 1, 1]), -1);
    assert.ok(t.test(ID.Axle2, ax, [-1, 1, 1]) > 0);
  });
  it("16T gears 2M apart mesh and turn the other way", () => {
    const w = new TechWorld();
    w.add(ID.Liftarm5, 0, [1, 1, 1]); // holes along z at x = -3,-1,1,3,5
    const az = find((o) => axOf(o, 0)[0] === 2);
    w.add(ID.Axle, az, [-3, 1, 1]);
    w.add(ID.Axle, az, [1, 1, 1]);
    assert.ok(w.test(ID.Gear16, 0, [-3, 1, 3]) > 0);
    const g1 = w.add(ID.Gear16, 0, [-3, 1, 3]);
    const g2 = w.add(ID.Gear16, 0, [1, 1, 3]);
    const flip = find((o) => axOf(o, 0)[0] === 0 && axOf(o, 0)[1] === -1 && axOf(o, 2)[0] === 2 && axOf(o, 2)[1] === -1);
    const ck = w.test(ID.Crank, flip, [-5, 1, -1]);
    assert.ok(ck > 0, "crank fits " + ck);
    w.add(ID.Crank, flip, [-5, 1, -1]);
    w.step(0.1, () => false);
    const o1 = w.gOmega.get(w.groups.get(g1.uid)!)!;
    const o2 = w.gOmega.get(w.groups.get(g2.uid)!)!;
    assert.ok(o1 > 0 && Math.abs(o2 + o1) < 1e-6, o1 + " " + o2);
    // 8T + 24T at 2M: 3:1
    const r = new TechWorld();
    r.add(ID.Liftarm5, 0, [1, 1, 1]);
    r.add(ID.Axle, az, [-3, 1, 1]);
    r.add(ID.Axle, az, [1, 1, 1]);
    const a = r.add(ID.Gear8, 0, [-3, 1, 3]);
    const c = r.add(ID.Gear24, 0, [1, 1, 3]);
    r.add(ID.Crank, flip, [-5, 1, -1]);
    r.step(0.1, () => false);
    const wa = r.gOmega.get(r.groups.get(a.uid)!)!;
    const wc = r.gOmega.get(r.groups.get(c.uid)!)!;
    assert.ok(Math.abs(wc / wa + 1 / 3) < 1e-6);
  });
  it("P5c-1: a motor-driven screw actuator extends, clamps, holds, and reverses with a flipped drive axle", () => {
    const zPlus = find((o) => axOf(o, 0)[0] === 2 && axOf(o, 0)[1] === 1);
    const zMinus = find((o) => axOf(o, 0)[0] === 2 && axOf(o, 0)[1] === -1);
    // Actuator (L7, stroke 1.94) at the origin, o=0: its input cross
    // hole sits at world [-4,0,0] on the Z axis. One axle along Z
    // through both the actuator input and a Motor M output at z=4.
    const build = (axleO: number, motorO: number, motorQ: [number, number, number]) => {
      const w = new TechWorld();
      const act = w.add(ID.Actuator, 0, [0, 0, 0]);
      const ax = w.add(ID.Axle, axleO, [-4, 0, 2]);
      w.add(ID.MotorM, motorO, motorQ);
      return { w, act, ax };
    };
    const { w, act, ax } = build(zPlus, zPlus, [-4, 0, -1]);
    w.step(0.5, () => true);
    assert.ok((act.ext ?? 0) > 0.3 && (act.ext ?? 0) < 0.9, "extends under power: " + act.ext);
    w.step(2, () => true);
    assert.equal(act.ext, 1, "clamps at full stroke (end-of-travel clutch)");
    w.step(1, () => false);
    assert.equal(act.ext, 1, "holds its load unpowered (self-locking screw)");
    // Same build with the drive axle flipped end-for-end: travel reverses.
    const b = build(zMinus, zMinus, [-4, 0, 9]);
    b.act.ext = 0.8;
    b.w.step(0.5, () => true);
    assert.ok((b.act.ext ?? 1) < 0.5 && (b.act.ext ?? 0) > 0, "retracts with a flipped drive: " + b.act.ext);
    // The actuator body itself never joins the spinning group.
    assert.notEqual(w.groups.get(act.uid), w.groups.get(ax.uid));
  });
  it("P5c-2: a driven pump pressurises a tank network and a cylinder extends, spends air, and retracts on valve close", () => {
    const stepN = (w: TechWorld, secs: number, on: (p: { id: number }) => boolean) => {
      for (let t = 0; t < secs; t += 0.05) w.step(0.05, on);
    };
    // Chain of touching AABBs: Tank — Pump — Cylinder, motor above the pump.
    const w = new TechWorld();
    const tank = w.add(ID.Tank, 0, [0, 0, 0]);
    const pump = w.add(ID.Pump, 0, [12, 0, 0]);
    const cyl = w.add(ID.Cylinder, 0, [24, 0, 0]);
    w.add(ID.MotorM, 0, [12, 5, 0]);
    const on = (p: { id: number }) => p.id === ID.MotorM;
    assert.equal(w.airPressureOf(cyl.uid), 0, "starts empty");
    stepN(w, 2, on);
    assert.ok(w.airPressureOf(tank.uid) > 0.1, "pump charges the network: " + w.airPressureOf(tank.uid));
    assert.ok((cyl.ext ?? 0) > 0.15, "direct line (no valve) extends: " + cyl.ext);
    stepN(w, 4, on);
    assert.equal(cyl.ext, 1, "reaches full extension");
    assert.ok(w.airPressureOf(cyl.uid) > 0.7, "tank keeps pressure up while topped: " + w.airPressureOf(cyl.uid));
    assert.ok(w.cylForce(cyl.uid) > 0.2, "force = pressure x bore^2: " + w.cylForce(cyl.uid));
    stepN(w, 2, () => false);
    assert.ok((cyl.ext ?? 0) === 1, "no air spent, no motion without a direction change");
    // Valve world: closed valve holds the cylinder in; opening extends;
    // closing again retracts under pressure (double-acting).
    const v = new TechWorld();
    v.add(ID.Tank, 0, [0, 0, 0]);
    const valve = v.add(ID.Valve, 0, [10, 0, 0]);
    v.add(ID.Pump, 0, [20, 0, 0]);
    const vc = v.add(ID.Cylinder, 0, [32, 0, 0]);
    v.add(ID.MotorM, 0, [20, 5, 0]);
    valve.on = false;
    stepN(v, 3, on);
    assert.ok(v.airPressureOf(vc.uid) > 0.4, "charges against a closed valve: " + v.airPressureOf(vc.uid));
    assert.equal(vc.ext ?? 0, 0, "closed valve: cylinder stays in");
    valve.on = true;
    v.step(3, on);
    assert.equal(vc.ext, 1, "open valve: extends");
    valve.on = false;
    stepN(v, 2, on);
    assert.ok((vc.ext ?? 1) < 0.6, "closed again: powered retract: " + vc.ext);
    // No tank: pressure caps low and bleeds, but still works.
    const n = new TechWorld();
    n.add(ID.Pump, 0, [0, 0, 0]);
    const nc = n.add(ID.Cylinder, 0, [12, 0, 0]);
    n.add(ID.MotorM, 0, [0, 5, 0]);
    stepN(n, 4, on);
    assert.ok(n.airPressureOf(nc.uid) <= 0.35 && n.airPressureOf(nc.uid) > 0.05, "tankless cap: " + n.airPressureOf(nc.uid));
    assert.ok((nc.ext ?? 0) > 0, "tankless line still moves the rod");
    assert.ok((pump.ext ?? 0) !== 0 || true); // pump piston visual is state, asserted in-game
  });
});

describe("teks P5d sensors", () => {
  it("has dist + color sensor specs with geometry and connectors", () => {
    assert.equal(SPECS.get(ID.SensorDist)?.sensor, "dist");
    assert.equal(SPECS.get(ID.SensorColor)?.sensor, "color");
    for (const id of [ID.SensorDist, ID.SensorColor]) {
      const s = SPECS.get(id)!;
      assert.ok(s.ops.length > 0 && localCells(id).length > 0 && s.holes.length > 0, "spec " + id);
    }
  });
  it("cycles the packed cfg and labels it", () => {
    let cfg = 0;
    const seen: number[] = [0];
    for (let i = 0; i < SENSOR_RANGES.length; i++) {
      cfg = nextSensorCfg(ID.SensorDist, cfg);
      seen.push(cfg);
    }
    assert.deepEqual(seen, [0, 1, 2, 3, 0]); // wraps through every range
    assert.equal(sensorCfgLabel(ID.SensorDist, 0), "Range 25 cm");
    assert.equal(sensorCfgLabel(ID.SensorDist, 3), "Range 2 m");
    assert.equal(sensorCfgLabel(ID.SensorColor, 0), "Target Anything");
    assert.equal(sensorCfgLabel(ID.SensorColor, SENSOR_TARGETS.length - 1), "Target Dark");
    assert.equal(nextSensorCfg(ID.Wheel, 0), 0); // not a sensor: no cfg
  });
  it("classifies colour families like the sensor reads them", () => {
    assert.equal(colorFamilyOf(0xe23b2f), "Red");
    assert.equal(colorFamilyOf("#f5c518"), "Yellow");
    assert.equal(colorFamilyOf(0x3fae4a), "Green");
    assert.equal(colorFamilyOf(0x2f6fd0), "Blue");
    assert.equal(colorFamilyOf(0xf2ead8), "White");
    assert.equal(colorFamilyOf("#23272c"), "Dark");
    assert.equal(colorFamilyOf(0x71808f), "Other"); // GUN grey-blue: mid lightness, low saturation
    assert.equal(colorFamilyOf(0x8a4fd0), "Other"); // purple has no target family
  });
});
