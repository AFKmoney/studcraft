// P5b prototype — minimal vehicle that rolls.
// 4 wheels + chassis + 1 Motor M + hub.
// One kinematic body. Mass/center from parts.
// Wheels = suspension raycasts. Diff = (A+B)/2.
// Battery drains. Power Functions numbers.
// Build geometry == run geometry.

export type Vec3 = { x: number; y: number; z: number };

export type ProtoPart = {
  kind: "wheel" | "chassis" | "motor" | "hub";
  pos: Vec3;
  mass: number; // kg
};

export type ProtoVehicle = {
  parts: ProtoPart[];
  pos: Vec3;
  vel: Vec3;
  battery: number; // 0..1
  rpm: number;
  on: boolean;
};

const MOTOR_M_RPM = 405;
const MOTOR_M_TORQUE = 11; // Ncm
const WHEEL_R = 0.25; // m
const SUSP_LEN = 0.35;
const GRAV = 9.81;

export function makeProto(): ProtoVehicle {
  return {
    parts: [
      { kind: "chassis", pos: { x: 0, y: 0.3, z: 0 }, mass: 0.4 },
      { kind: "hub", pos: { x: 0, y: 0.45, z: 0 }, mass: 0.08 },
      { kind: "motor", pos: { x: 0, y: 0.35, z: 0.1 }, mass: 0.12 },
      { kind: "wheel", pos: { x: -0.4, y: 0.15, z: 0.3 }, mass: 0.05 },
      { kind: "wheel", pos: { x: 0.4, y: 0.15, z: 0.3 }, mass: 0.05 },
      { kind: "wheel", pos: { x: -0.4, y: 0.15, z: -0.3 }, mass: 0.05 },
      { kind: "wheel", pos: { x: 0.4, y: 0.15, z: -0.3 }, mass: 0.05 },
    ],
    pos: { x: 0, y: 1, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    battery: 1,
    rpm: 0,
    on: false,
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

/** Suspension raycast: returns compression 0..1 (1 = fully compressed). */
export function suspRay(groundY: number, wheelY: number): number {
  const travel = wheelY - groundY;
  return Math.max(0, Math.min(1, 1 - travel / SUSP_LEN));
}

/** Diff: average of left and right wheel speeds. */
export function diff(left: number, right: number): number {
  return (left + right) / 2;
}

/** Step the proto. Battery drains when on. Motor at Power Functions numbers. */
export function stepProto(v: ProtoVehicle, dt: number, groundY = 0): ProtoVehicle {
  if (!v.on || v.battery <= 0) {
    v.rpm = Math.max(0, v.rpm - dt * 200);
    return v;
  }
  v.rpm = MOTOR_M_RPM;
  const omega = (v.rpm * Math.PI) / 30;
  const force = (MOTOR_M_TORQUE / 100) / WHEEL_R; // N
  const mass = massOf(v);
  const accel = force / mass;
  v.vel.x += accel * dt;
  v.pos.x += v.vel.x * dt;
  // Battery drain proportional to load
  v.battery = Math.max(0, v.battery - dt * 0.02 * (1 + Math.abs(v.vel.x)));
  // Simple suspension: keep above ground
  const minY = groundY + 0.2;
  if (v.pos.y < minY) v.pos.y = minY;
  return v;
}
