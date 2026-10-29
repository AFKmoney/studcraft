import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ID, TECHNIC } from "./blocks.ts";
import { ORIENTS, SPECS, TechWorld, axOf, localCells, rot } from "./technic.ts";

const find = (f: (o: number) => boolean) => ORIENTS.findIndex((_, o) => f(o));

describe("technic", () => {
  it("has a real 1:1 spec for every Technic part", () => {
    for (const id of TECHNIC) {
      const s = SPECS.get(id);
      assert.ok(s, "spec " + id);
      assert.ok(s.ops.length > 0 && localCells(id).length > 0, "geometry " + id);
      assert.ok(s.holes.length + s.males.length > 0 || id === ID.Pipe || id === ID.PipeElbow || id === ID.Remote || id === ID.Wheel || id === ID.Mill || id === ID.Spring || id === ID.Rack, "connectors " + id);
    }
    assert.equal(ORIENTS.length, 24);
    assert.deepEqual(rot(0, [1, 2, 3]), [1, 2, 3]);
  });
  it("pins, beams and axles assemble like real LEGO", () => {
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
});
