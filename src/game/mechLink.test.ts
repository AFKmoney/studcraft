import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { clearMech, speedAt } from "./mechState.ts";
import { clearBelts, clearRacks, clearSprings, clearTraps, springLeft, stepMech, windSpring, type MechBlockIds } from "./mechLink.ts";

const ids: MechBlockIds = {
  axle: 1,
  g8: 2,
  g16: 3,
  g24: 4,
  crank: 5,
  crankOn: 6,
  clutch: 7,
  clutchOpen: 8,
  worm: 9,
  cam: 10,
  pulley: 11,
  wheel: 12,
  mill: 13,
  spring: 19,
  diff: 20,
  rack: 21,
  ujoint: 22,
  road: 23,
  belt: 24,
  trap: 25,
  ring: 26,
  ringLo: 27,
  water: 14,
  door: 15,
  doorOpen: 16,
  gate: 17,
  gateOpen: 18,
};

describe("placed technic", () => {
  beforeEach(() => {
    clearMech();
    clearSprings();
    clearRacks();
    clearBelts();
    clearTraps();
  });

  it("turns a 16T gear backwards beside a crank", () => {
    const grid = new Map<string, number>([
      ["0,0,0", ids.crankOn],
      ["0,1,0", ids.g16],
      ["1,1,0", ids.g16],
    ]);
    const get = (x: number, y: number, z: number) => grid.get(x + "," + y + "," + z) ?? 0;
    stepMech(get, [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }], ids, 0);
    assert.deepEqual(speedAt(2, 2, 0), { n: -1, d: 1 });
  });

  it("opens the door east of a cam after half a turn", () => {
    const grid = new Map<string, number>([
      ["0,0,0", ids.crankOn],
      ["0,1,0", ids.cam],
      ["1,1,0", ids.door],
    ]);
    const get = (x: number, y: number, z: number) => grid.get(x + "," + y + "," + z) ?? 0;
    const edits = stepMech(get, [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }], ids, 0.5);
    assert.deepEqual(edits, [{ x: 1, y: 1, z: 0, id: ids.doorOpen }]);
  });

  it("spins a water wheel only when water touches it", () => {
    const dry = new Map<string, number>([
      ["0,0,0", ids.wheel],
      ["0,1,0", ids.axle],
    ]);
    const getDry = (x: number, y: number, z: number) => dry.get(x + "," + y + "," + z) ?? 0;
    stepMech(getDry, [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }], ids, 0);
    assert.deepEqual(speedAt(0, 2, 0), { n: 0, d: 1 });
    const wet = new Map(dry);
    wet.set("1,0,0", ids.water);
    const getWet = (x: number, y: number, z: number) => wet.get(x + "," + y + "," + z) ?? 0;
    stepMech(getWet, [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }], ids, 0);
    assert.deepEqual(speedAt(0, 2, 0), { n: 1, d: 1 });
  });

  it("runs a wound spring, then stops", () => {
    const grid = new Map<string, number>([
      ["0,0,0", ids.spring],
      ["0,1,0", ids.axle],
    ]);
    const get = (x: number, y: number, z: number) => grid.get(x + "," + y + "," + z) ?? 0;
    const cells = [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }];
    stepMech(get, cells, ids, 0);
    assert.deepEqual(speedAt(0, 2, 0), { n: 0, d: 1 });
    windSpring(0, 0, 0, 1);
    stepMech(get, cells, ids, 0.4);
    assert.deepEqual(speedAt(0, 2, 0), { n: 1, d: 1 });
    assert.ok(Math.abs(springLeft(0, 0, 0) - 0.6) < 1e-9);
    stepMech(get, cells, ids, 0.6);
    assert.deepEqual(speedAt(0, 2, 0), { n: 1, d: 1 });
    assert.equal(springLeft(0, 0, 0), 0);
    stepMech(get, cells, ids, 0.1);
    assert.deepEqual(speedAt(0, 2, 0), { n: 0, d: 1 });
  });

  it("averages the two shafts into the east axle", () => {
    const grid = new Map<string, number>([
      ["0,0,0", ids.crankOn],
      ["0,1,0", ids.diff],
      ["0,2,0", ids.crankOn],
      ["1,1,0", ids.axle],
    ]);
    const get = (x: number, y: number, z: number) => grid.get(x + "," + y + "," + z) ?? 0;
    const cells = [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 2, z: 0 }, { x: 1, y: 1, z: 0 }];
    stepMech(get, cells, ids, 0);
    assert.deepEqual(speedAt(2, 2, 0), { n: 1, d: 1 });
    grid.set("0,2,0", ids.crank);
    stepMech(get, cells, ids, 0);
    assert.deepEqual(speedAt(2, 2, 0), { n: 1, d: 2 });
  });

  it("walks a rack one cell after one turn of the gear", () => {
    const grid = new Map<string, number>([
      ["0,1,0", ids.crankOn],
      ["0,0,0", ids.g16],
      ["1,0,0", ids.rack],
    ]);
    const get = (x: number, y: number, z: number) => grid.get(x + "," + y + "," + z) ?? 0;
    const edits = stepMech(
      get,
      [{ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
      ids,
      1,
    );
    assert.deepEqual(edits, [
      { x: 1, y: 0, z: 0, id: 0 },
      { x: 2, y: 0, z: 0, id: ids.rack },
    ]);
  });

  it("turns a sideways axle through a universal joint", () => {
    const grid = new Map<string, number>([
      ["0,0,0", ids.crankOn],
      ["0,1,0", ids.ujoint],
      ["1,1,0", ids.axle],
      ["2,1,0", ids.axle],
    ]);
    const get = (x: number, y: number, z: number) => grid.get(x + "," + y + "," + z) ?? 0;
    stepMech(get, [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 2, y: 1, z: 0 }], ids, 0);
    assert.deepEqual(speedAt(2, 2, 0), { n: 1, d: 1 });
    assert.deepEqual(speedAt(4, 2, 0), { n: 1, d: 1 });
  });

  it("spins a road wheel on the axle and ignores water", () => {
    const spinning = new Map<string, number>([
      ["0,0,0", ids.crankOn],
      ["0,1,0", ids.road],
    ]);
    const getSpin = (x: number, y: number, z: number) => spinning.get(x + "," + y + "," + z) ?? 0;
    stepMech(getSpin, [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }], ids, 0);
    assert.deepEqual(speedAt(0, 2, 0), { n: 1, d: 1 });
    const wet = new Map<string, number>([
      ["0,0,0", ids.road],
      ["1,0,0", ids.water],
    ]);
    const getWet = (x: number, y: number, z: number) => wet.get(x + "," + y + "," + z) ?? 0;
    stepMech(getWet, [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }], ids, 0);
    assert.deepEqual(speedAt(0, 0, 0), { n: 0, d: 1 });
  });

  it("carries the block on a conveyor one cell per turn", () => {
    const grid = new Map<string, number>([
      ["0,0,0", ids.crankOn],
      ["0,1,0", ids.belt],
      ["0,2,0", 99],
    ]);
    const get = (x: number, y: number, z: number) => grid.get(x + "," + y + "," + z) ?? 0;
    const edits = stepMech(get, [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 2, z: 0 }], ids, 1);
    assert.deepEqual(edits, [
      { x: 0, y: 2, z: 0, id: 0 },
      { x: 1, y: 2, z: 0, id: 99 },
    ]);
    grid.set("1,2,0", 40);
    const blocked = stepMech(get, [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 2, z: 0 }], ids, 1);
    assert.deepEqual(blocked, []);
  });

  it("drops the block through a trap after one turn", () => {
    const grid = new Map<string, number>([
      ["0,3,0", ids.crankOn],
      ["0,2,0", 99],
      ["0,1,0", ids.trap],
    ]);
    const get = (x: number, y: number, z: number) => grid.get(x + "," + y + "," + z) ?? 0;
    const edits = stepMech(get, [{ x: 0, y: 3, z: 0 }, { x: 0, y: 2, z: 0 }, { x: 0, y: 1, z: 0 }], ids, 1);
    assert.deepEqual(edits, [
      { x: 0, y: 2, z: 0, id: 0 },
      { x: 0, y: 0, z: 0, id: 99 },
    ]);
    grid.set("0,0,0", 40);
    const held = stepMech(get, [{ x: 0, y: 3, z: 0 }, { x: 0, y: 2, z: 0 }, { x: 0, y: 1, z: 0 }], ids, 1);
    assert.deepEqual(held, []);
  });

  it("shifts a driving ring from 1:1 to 1:2", () => {
    const grid = new Map<string, number>([
      ["0,0,0", ids.crankOn],
      ["0,1,0", ids.ring],
      ["1,1,0", ids.axle],
    ]);
    const get = (x: number, y: number, z: number) => grid.get(x + "," + y + "," + z) ?? 0;
    const cells = [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }];
    stepMech(get, cells, ids, 0);
    assert.deepEqual(speedAt(2, 2, 0), { n: 1, d: 1 });
    grid.set("0,1,0", ids.ringLo);
    stepMech(get, cells, ids, 0);
    assert.deepEqual(speedAt(2, 2, 0), { n: 1, d: 2 });
  });
});
