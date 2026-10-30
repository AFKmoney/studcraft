import { diffOutput, frac } from "./mechState.ts";

// P5b — prototype + spec constants (Grok, 2026-10-30).
// Motors M/L/XL with Power Functions numbers; hub channels A–D;
// FUEL design numbers; massOf/centerOf/suspRay helpers.
//
// The WIRED system lives in vehicle.ts (Muse chantier, same day):
// assembly→vehicle conversion, real channel binding, terrain
// suspension, the shared differential, the battery/generator/fuel
// energy model, game wiring. This module stays as the constants
// base + the original isolated prototype (makeVehicle/stepVehicle
// are fixtures now — the game's vehicles come from real assemblies).
// Energy model (decided in the wiring claim, WORKLOG 2026-10-30):
// motors are ELECTRIC → battery, drained by torque load; FUEL is
// melted plastic burned by the hub GENERATOR to recharge it.

export type Vec3 = { x: number; y: number; z: number };

export type MotorSize = "M" | "L" | "XL" | "servo";

export const MOTOR_SPEC: Record<MotorSize, { rpm: number; torqueNcm: number; servo?: boolean }> = {
  M: { rpm: 405, torqueNcm: 11 },
  L: { rpm: 390, torqueNcm: 18 },
  XL: { rpm: 220, torqueNcm: 40 },
  servo: { rpm: 0, torqueNcm: 15, servo: true },
};

export type Channel = "A" | "B" | "C" | "D";

export type ProtoPart = {
  kind: "wheel" | "chassis" | "motor" | "hub" | "battery" | "remote";
  pos: Vec3;
  mass: number;
  channel?: Channel;
  size?: MotorSize;
};

export type ProtoVehicle = {
  parts: ProtoPart[];
  pos: Vec3;
  vel: Vec3;
  battery: number; // 0..1
  fuel: number;    // 0..1 (combustion)
  on: boolean;
  channel: Channel;
  rpm: number;
  motor: MotorSize;
};

const WHEEL_R = 0.25;
const SUSP_LEN = 0.35;

export function makeVehicle(motor: MotorSize = "M", channel: Channel = "A"): ProtoVehicle {
  return {
    parts: [
      { kind: "chassis", pos: { x: 0, y: 0.3, z: 0 }, mass: 0.45 },
      { kind: "hub", pos: { x: 0, y: 0.45, z: 0 }, mass: 0.08, channel },
      { kind: "battery", pos: { x: 0, y: 0.4, z: -0.05 }, mass: 0.1 },
      { kind: "remote", pos: { x: 0, y: 0.5, z: 0 }, mass: 0.04, channel },
      { kind: "motor", pos: { x: 0, y: 0.35, z: 0.1 }, mass: 0.12, size: motor, channel },
      { kind: "wheel", pos: { x: -0.4, y: 0.15, z: 0.3 }, mass: 0.05 },
      { kind: "wheel", pos: { x: 0.4, y: 0.15, z: 0.3 }, mass: 0.05 },
      { kind: "wheel", pos: { x: -0.4, y: 0.15, z: -0.3 }, mass: 0.05 },
      { kind: "wheel", pos: { x: 0.4, y: 0.15, z: -0.3 }, mass: 0.05 },
    ],
    pos: { x: 0, y: 1, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    battery: 1,
    fuel: 0,
    on: false,
    channel,
    rpm: 0,
    motor,
  };
}

export function massOf(v: ProtoVehicle): number {
  return v.parts.reduce((s, p) => s + p.mass, 0);
}

export function centerOf(v: ProtoVehicle): Vec3 {
  const m = massOf(v);
  const c = { x: 0, y: 0, z: 0 };
  for (const p of v.parts) {
    c.x += p.pos.x * p.mass;
    c.y += p.pos.y * p.mass;
    c.z += p.pos.z * p.mass;
  }
  c.x /= m; c.y /= m; c.z /= m;
  return c;
}

export function suspRay(groundY: number, wheelY: number): number {
  const travel = wheelY - groundY;
  return Math.max(0, Math.min(1, 1 - travel / SUSP_LEN));
}

/** Delegates to mechState.diffOutput — the ONE differential
 *  implementation (mechLink's stepMech + vehicle.ts use it too).
 *  The local copy that lived here was dead code; deleted 2026-10-30. */
export function diff(left: number, right: number): number {
  const f = diffOutput(frac(left, 1), frac(right, 1));
  return f.n / f.d;
}

/** Step. Battery drains under load. Stops when empty. */
export function stepVehicle(v: ProtoVehicle, dt: number, groundY = 0): ProtoVehicle {
  const spec = MOTOR_SPEC[v.motor];
  if (!v.on || v.battery <= 0) {
    v.rpm = Math.max(0, v.rpm - dt * 180);
    return v;
  }
  v.rpm = spec.rpm;
  const omega = (v.rpm * Math.PI) / 30;
  const force = (spec.torqueNcm / 100) / WHEEL_R;
  const mass = massOf(v);
  const accel = force / Math.max(0.01, mass);
  v.vel.x += accel * dt;
  v.pos.x += v.vel.x * dt;
  // Drain proportional to load
  v.battery = Math.max(0, v.battery - dt * 0.015 * (1 + Math.abs(v.vel.x) * 0.5));
  const minY = groundY + 0.18;
  if (v.pos.y < minY) v.pos.y = minY;
  return v;
}

/** Fuel design numbers: plastic melt → fuel for the hub generator
 *  (vehicle.ts). No combustion motor exists in the 1:1 catalogue. */
export const FUEL = {
  meltPlasticYield: 0.25, // 1 plastic block → 0.25 fuel units
  tankCapacity: 4,
  consumptionPerLoad: 0.08, // units/s at full load
  emptyBehavior: "stop",
};
