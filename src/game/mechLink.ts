// P5 world adapter. Block cells are 2 studs apart, which is the catalog
// distance for 16T+16T and 8T+24T. Does not import game.ts or save.ts.

import { integrateMech, putMech, resetParts, solveMech, speedAt, strokeAt, type Axis, type Frac, type MechKind } from "./mechState.ts";

export type MechBlockIds = {
  axle: number;
  g8: number;
  g16: number;
  g24: number;
  crank: number;
  crankOn: number;
  clutch: number;
  clutchOpen: number;
  worm: number;
  cam: number;
  pulley: number;
  wheel: number;
  mill: number;
  spring: number;
  diff: number;
  rack: number;
  water: number;
  door: number;
  doorOpen: number;
  gate: number;
  gateOpen: number;
};

export type MechCell = { x: number; y: number; z: number };
export type MechEdit = { x: number; y: number; z: number; id: number };

type Spec = { kind: MechKind; teeth: number; axis: Axis; drive: boolean; open: boolean; belt: number; pulley: number };

function specFor(id: number, ids: MechBlockIds): Spec | null {
  if (id === ids.axle) return { kind: "axle", teeth: 0, axis: "y", drive: false, open: false, belt: 0, pulley: 0 };
  if (id === ids.g8) return { kind: "gear", teeth: 8, axis: "y", drive: false, open: false, belt: 0, pulley: 0 };
  if (id === ids.g16) return { kind: "gear", teeth: 16, axis: "y", drive: false, open: false, belt: 0, pulley: 0 };
  if (id === ids.g24) return { kind: "gear", teeth: 24, axis: "y", drive: false, open: false, belt: 0, pulley: 0 };
  if (id === ids.crank) return { kind: "crank", teeth: 0, axis: "y", drive: false, open: false, belt: 0, pulley: 0 };
  if (id === ids.crankOn) return { kind: "crank", teeth: 0, axis: "y", drive: true, open: false, belt: 0, pulley: 0 };
  if (id === ids.clutch) return { kind: "clutch", teeth: 0, axis: "y", drive: false, open: false, belt: 0, pulley: 0 };
  if (id === ids.clutchOpen) return { kind: "clutch", teeth: 0, axis: "y", drive: false, open: true, belt: 0, pulley: 0 };
  if (id === ids.worm) return { kind: "worm", teeth: 0, axis: "x", drive: false, open: false, belt: 0, pulley: 0 };
  if (id === ids.cam) return { kind: "cam", teeth: 0, axis: "y", drive: false, open: false, belt: 0, pulley: 0 };
  if (id === ids.pulley) return { kind: "pulley", teeth: 0, axis: "y", drive: false, open: false, belt: 1, pulley: 16 };
  if (id === ids.wheel) return { kind: "wheel", teeth: 0, axis: "y", drive: false, open: false, belt: 0, pulley: 0 };
  if (id === ids.mill) return { kind: "wheel", teeth: 0, axis: "y", drive: false, open: false, belt: 0, pulley: 0 };
  if (id === ids.spring) return { kind: "crank", teeth: 0, axis: "y", drive: false, open: false, belt: 0, pulley: 0 };
  if (id === ids.diff) return { kind: "diff", teeth: 0, axis: "y", drive: false, open: false, belt: 0, pulley: 0 };
  return null;
}

function wet(get: (x: number, y: number, z: number) => number, c: MechCell, water: number) {
  return (
    get(c.x + 1, c.y, c.z) === water ||
    get(c.x - 1, c.y, c.z) === water ||
    get(c.x, c.y, c.z + 1) === water ||
    get(c.x, c.y, c.z - 1) === water ||
    get(c.x, c.y - 1, c.z) === water
  );
}

const WIND_CAP = 8;
const wind = new Map<string, number>();
let justSpent: MechCell[] = [];

function skey(x: number, y: number, z: number) {
  return x + "," + y + "," + z;
}

export function clearSprings() {
  wind.clear();
  justSpent = [];
}

/** Right-click. Adds a few seconds, never past eight. Not saved. */
export function windSpring(x: number, y: number, z: number, seconds = 6) {
  const k = skey(x, y, z);
  wind.set(k, Math.min(WIND_CAP, (wind.get(k) ?? 0) + seconds));
}

export function springLeft(x: number, y: number, z: number) {
  return wind.get(skey(x, y, z)) ?? 0;
}

export function springsJustSpent(): MechCell[] {
  const out = justSpent;
  justSpent = [];
  return out;
}

const rackAcc = new Map<string, number>();

export function clearRacks() {
  rackAcc.clear();
}

function isGear(id: number, ids: MechBlockIds) {
  return id === ids.g8 || id === ids.g16 || id === ids.g24;
}

function gearBeside(c: MechCell, get: (x: number, y: number, z: number) => number, ids: MechBlockIds): MechCell | null {
  const spots = [
    { x: c.x - 1, y: c.y, z: c.z },
    { x: c.x + 1, y: c.y, z: c.z },
    { x: c.x, y: c.y, z: c.z - 1 },
    { x: c.x, y: c.y, z: c.z + 1 },
  ];
  for (const s of spots) if (isGear(get(s.x, s.y, s.z), ids)) return s;
  return null;
}

/** Rebuild the local machine and return door/gate edits the cam is asking for. */
export function stepMech(
  get: (x: number, y: number, z: number) => number,
  cells: readonly MechCell[],
  ids: MechBlockIds,
  dt: number,
): MechEdit[] {
  resetParts();
  const cams: MechCell[] = [];
  const diffs: MechCell[] = [];
  const racks: MechCell[] = [];
  for (const c of cells) {
    const id = get(c.x, c.y, c.z);
    if (id === ids.rack) racks.push(c);
    const spec = specFor(id, ids);
    if (!spec) continue;
    let drive = spec.drive;
    if (id === ids.wheel && wet(get, c, ids.water)) drive = true;
    if (id === ids.mill && get(c.x, c.y + 1, c.z) === 0 && c.y >= 40) drive = true;
    if (id === ids.spring) {
      const left = wind.get(skey(c.x, c.y, c.z)) ?? 0;
      if (left > 0) {
        drive = true;
        const next = left - dt;
        if (next <= 1e-6) {
          wind.delete(skey(c.x, c.y, c.z));
          justSpent.push(c);
        } else wind.set(skey(c.x, c.y, c.z), next);
      }
    }
    if (id === ids.cam) cams.push(c);
    if (id === ids.diff) diffs.push(c);
    putMech({
      x: c.x * 2,
      y: c.y * 2,
      z: c.z * 2,
      kind: spec.kind,
      axis: spec.axis,
      teeth: spec.teeth,
      driveN: drive ? 1 : undefined,
      driveD: drive ? 1 : undefined,
      open: spec.open,
      belt: spec.belt || undefined,
      pulley: spec.pulley || undefined,
    });
  }
  solveMech();
  if (diffs.length) {
    const feeds: { x: number; y: number; z: number; s: Frac }[] = [];
    for (const c of diffs) {
      const a = speedAt(c.x * 2, (c.y - 1) * 2, c.z * 2);
      const b = speedAt(c.x * 2, (c.y + 1) * 2, c.z * 2);
      const avg = { n: a.n * b.d + b.n * a.d, d: a.d * b.d * 2 };
      if (!avg.n) continue;
      feeds.push({ x: (c.x + 1) * 2, y: c.y * 2, z: c.z * 2, s: avg });
    }
    if (feeds.length) solveMech(feeds);
  }
  integrateMech(dt);
  const edits: MechEdit[] = [];
  for (const c of cams) {
    const lift = strokeAt(c.x * 2, c.y * 2, c.z * 2);
    const nx = c.x + 1;
    const there = get(nx, c.y, c.z);
    const open = lift >= 0.5;
    if (open && there === ids.door) edits.push({ x: nx, y: c.y, z: c.z, id: ids.doorOpen });
    else if (!open && there === ids.doorOpen) edits.push({ x: nx, y: c.y, z: c.z, id: ids.door });
    else if (open && there === ids.gate) edits.push({ x: nx, y: c.y, z: c.z, id: ids.gateOpen });
    else if (!open && there === ids.gateOpen) edits.push({ x: nx, y: c.y, z: c.z, id: ids.gate });
  }
  for (const c of racks) {
    const gear = gearBeside(c, get, ids);
    if (!gear || !dt) continue;
    const sp = speedAt(gear.x * 2, gear.y * 2, gear.z * 2);
    if (!sp.n) continue;
    const k = skey(c.x, c.y, c.z);
    const acc = (rackAcc.get(k) ?? 0) + (sp.n / sp.d) * dt;
    const step = acc >= 1 ? 1 : acc <= -1 ? -1 : 0;
    if (!step) {
      rackAcc.set(k, acc);
      continue;
    }
    const dest = { x: c.x + step, y: c.y, z: c.z };
    if (get(dest.x, dest.y, dest.z) !== 0) {
      rackAcc.set(k, step);
      continue;
    }
    edits.push({ x: c.x, y: c.y, z: c.z, id: 0 });
    edits.push({ ...dest, id: ids.rack });
    rackAcc.delete(k);
    const rest = acc - step;
    if (rest) rackAcc.set(skey(dest.x, dest.y, dest.z), rest);
  }
  return edits;
}
