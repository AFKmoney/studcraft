// P5b — the vehicle SYSTEM (Muse wiring chantier, 2026-10-30).
//
// Grok's p5bProto.ts proved the numbers in isolation; this module is
// what the plan (§P5b) actually asks for:
//   · a player's Teks ASSEMBLY converts into ONE kinematic body
//     (build == run: same parts, same geometry, same relative layout);
//   · the hub owns channels A–D, motors are BOUND to channels, and a
//     motor only answers when its channel is the one being commanded
//     (the pairing is real, tested with a negative control);
//   · wheels are suspension raycasts against the game's real terrain
//     height function — compression drives body height, pitch, roll;
//   · the driven axle runs through mechState.diffOutput, the ONE
//     differential implementation (mechLink uses it too);
//   · energy answers "made of what" (plan, CARBURANT item): every
//     Teks drive motor in the 1:1 catalogue is ELECTRIC, so motors
//     drink the hub BATTERY, drained in proportion to TORQUE LOAD
//     (not speed). FUEL — plastic melted at the Foundry, 0.25 per
//     pellet (p5bProto FUEL numbers) — feeds the hub GENERATOR, which
//     recharges the battery at 0.08 units/s under full load. Dry =
//     battery empty AND tank empty: the machine stops. No magic.
//   · parking re-seats the assembly on the half-module lattice (yaw
//     snapped to a multiple of 90°, positions snapped to the lattice)
//     so a driven vehicle becomes a build again, part for part.
//
// Pure logic: no three.js, no game.ts. game.ts owns rendering, input
// sampling and the terrain; it passes heightAt in.
//
// Tuning constants (documented choices, not hidden):
//   DRIVE_REDUCTION 8 — the classic Teks 8:1 final drive between a
//     Power Functions motor and the wheel; without it a 405 rpm motor
//     on a Ø5-module wheel would do 53 blocks/s.
//   MASS_DENSITY — part mass = bbox volume (modules³) × density, with
//     a floor; the hub really is the heavy part, like the real one.

import { ID } from "./blocks.ts";
import { ORIENTS, bbox, centroid, composeO, rot, spec, type Mat, type Part, type V3 } from "./teks.ts";
import { diffOutput, frac } from "./mechState.ts";
import { FUEL, MOTOR_SPEC, suspRay, type Channel, type MotorSize } from "./p5bProto.ts";

export type { Channel };
export type Vec3 = { x: number; y: number; z: number };

export const DRIVE_REDUCTION = 8;
export const MASS_DENSITY = 0.0012;
export const MASS_FLOOR = 0.03;
/** Battery fraction drained per second at load 1.0 (XL at full throttle). */
export const BATT_DRAIN = 0.012;
/** Battery charge produced per fuel unit burned by the hub generator. */
export const GEN_CHARGE_PER_FUEL = 0.6;
const SUSP_LEN = 0.35; // blocks of suspension travel (p5bProto's number)

const v3 = (a: V3): Vec3 => ({ x: a[0], y: a[1], z: a[2] });
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });

function matMul(a: Mat, b: Mat): Mat {
  const out = new Array(9).fill(0);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) out[r * 3 + c] += a[r * 3 + k] * b[k * 3 + c];
  return out;
}
function matT(a: Mat): Mat {
  return [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]];
}
function orientIndex(m: Mat): number {
  const key = m.map((n) => Math.round(n)).join(",");
  for (let i = 0; i < ORIENTS.length; i++) if (ORIENTS[i].join(",") === key) return i;
  return -1;
}
/** Rotate a vector by a yaw (game convention: forward = (−sin, 0, −cos);
 *  a point at local −z must land on the new forward). */
function rotY(yaw: number, p: Vec3): Vec3 {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return { x: c * p.x + s * p.z, y: p.y, z: -s * p.x + c * p.z };
}

export type PartRole = "wheel" | "motor" | "hub" | "battery" | "remote" | "chassis" | "weapon" | "turret" | "cockpit";

export type VJoint = {
  /** The joint part's uid. */
  uid: number;
  kind: "servo" | "screw";
  /** The channel this joint answers (bindings, like motors). */
  channel: Channel;
  /** Subgroup this joint moves (the child side). */
  group: number;
  /** Subgroup the joint is mounted on (the parent side). */
  parentGroup: number;
  /** Joint part centre, vehicle frame (blocks). Servo: rotation pivot. */
  pivot: Vec3;
  /** Servo: rotation axis (vehicle frame, unit). Screw: slide axis. */
  axis: Vec3;
  /** Servo state, radians, −π/2..π/2. */
  angle: number;
  /** Screw state, 0..1 of stroke. */
  ext: number;
  /** Screw stroke in blocks. */
  stroke: number;
};

/** Push force of a joint, in the same bore² units as teks cylForce:
 *  a servo's torque, a screw actuator's screw advantage. The bucket
 *  digs only what its driving joint can push (plan P5c accounting). */
export function jointForce(j: VJoint): number {
  return j.kind === "servo" ? 1.1 : 0.36 * 1.6;
}

export type VPart = {
  uid: number;
  id: number;
  o: number; // lattice orientation at conversion
  on: boolean;
  role: PartRole;
  /** P5c-3: subgroup index (0 = the hub's base group). Joint parts
   *  carry their parent group: they render/move with the parent side. */
  group: number;
  /** Rod extension at conversion (a non-joint rod part keeps it). */
  ext0: number;
  /** Sensor configuration at conversion (P5d cfg; 0 for the rest).
   *  B17: carried so a mid-drive save restores the sensor as-is. */
  cfg: number;
  /** Part origin offset from the vehicle origin, WORLD frame at conversion (blocks). For parking. */
  relOrigin: Vec3;
  /** Part origin in the vehicle frame (x right, y up, z rear), blocks. */
  localPos: Vec3;
  /** Part orientation index in the vehicle frame. */
  localO: number;
  /** Part centroid in the vehicle frame, blocks. */
  centreLocal: Vec3;
  /** Part AABB in the vehicle frame, blocks. B17: the driving
   *  seat search tests candidate eye points against these. */
  box?: { min: Vec3; max: Vec3 };
  mass: number;
  // wheels
  radius: number;
  // motors
  size: MotorSize | null;
  channel: Channel;
};

export type Vehicle = {
  parts: VPart[];
  wheels: VPart[];
  motors: VPart[];
  /** Conversion origin (mass centre), world blocks. pos starts here. */
  origin0: Vec3;
  /** ORIENTS index of the vehicle basis (local → world at conversion). */
  frameO: number;
  yaw0: number;
  pos: Vec3;
  yaw: number;
  pitch: number;
  roll: number;
  /** Forward speed, blocks/s (signed). */
  vel: number;
  wheelSpin: number;
  /** Driven-axle wheel surface speeds from the last step (left, right). */
  wheelSpeeds: { left: number; right: number; carrier: number };
  /** Per-wheel suspension compression 0..1, aligned with `wheels`. */
  susp: number[];
  mass: number;
  /** Mass centre in the vehicle frame. */
  centre: Vec3;
  wheelbase: number;
  track: number;
  // energy
  battery: number; // 0..1
  hasBatteryBox: boolean;
  fuel: number; // units, 0..FUEL.tankCapacity
  hubOn: boolean;
  /** The channel the hub is listening on (its remote's channel). */
  hubChannel: Channel;
  /** Load of the last step, 0..1 — torque-proportional. */
  load: number;
  /** Drive rpm of the last step (motor side of the reduction). */
  rpm: number;
  /** P5c-3: articulation joints (servos = rotation, screw actuators
   *  = telescopic slide). Empty for a plain rigid vehicle. */
  joints: VJoint[];
};

export function roleOf(id: number): PartRole {
  if (id === ID.Wheel) return "wheel";
  if (id === ID.TechHub) return "hub";
  if (id === ID.Battery) return "battery";
  if (id === ID.Remote) return "remote";
  // B21: armoury + cockpits (vehArms.ts / cockpits.ts own the behaviour)
  if (id === ID.VehCannon || id === ID.VehGoldCannon || id === ID.VehLaser || id === ID.VehRocketPod) return "weapon";
  if (id === ID.VehTurretMount) return "turret";
  if (id === ID.CockpitSeat || id === ID.CockpitCab || id === ID.CockpitCage || id === ID.CockpitMech) return "cockpit";
  if (spec(id)?.drive === "motor") return "motor";
  return "chassis";
}

export function motorSizeOf(id: number): MotorSize | null {
  if (id === ID.MotorM) return "M";
  if (id === ID.MotorL) return "L";
  if (id === ID.MotorXL) return "XL";
  if (id === ID.Servo) return "servo";
  return null;
}

/** Mass of one part from its own geometry: bbox volume × density. */
export function partMass(id: number): number {
  const [lo, hi] = bbox(id, 0); // cell units (half-modules)
  const volModules = ((hi[0] - lo[0]) * (hi[1] - lo[1]) * (hi[2] - lo[2])) / 8;
  return Math.max(MASS_FLOOR, volModules * MASS_DENSITY);
}

/** World position (blocks) of a lattice part's centroid. */
export function partWorldCentre(p: Part): Vec3 {
  const c = centroid(p.id); // cell units
  const r = rot(p.o, [c[0], c[1], c[2]]);
  return { x: p.q[0] / 4 + r[0] / 4, y: p.q[1] / 4 + r[1] / 4, z: p.q[2] / 4 + r[2] / 4 };
}

/** World position (blocks) of a lattice part's origin. */
export function partWorldOrigin(p: Part): Vec3 {
  return { x: p.q[0] / 4, y: p.q[1] / 4, z: p.q[2] / 4 };
}

/** Wheel radius in blocks, from the part's real GEOMETRY (spec ops):
 *  the largest radial extent of any cyl/tube/blade/lathe/sphere op,
 *  in modules × 0.5. (bbox() measures occupancy cells — the wheel's
 *  blade disc is drawn with occ=false, so cells under-report it:
 *  measured 0.25 instead of the true 1.25 during the wiring QA.) */
export function wheelRadius(p: Part): number {
  const s = spec(p.id);
  let rModules = 0;
  if (s) {
    for (const op of s.ops) {
      if (op.k === "cyl" || op.k === "tube" || op.k === "sphere") rModules = Math.max(rModules, op.r);
      else if (op.k === "blade") rModules = Math.max(rModules, op.r0, op.r1);
      else if (op.k === "lathe") for (const pt of op.pts) rModules = Math.max(rModules, pt[1]);
      else if (op.k === "helix") rModules = Math.max(rModules, op.r + op.tr);
    }
  }
  if (rModules > 0) return rModules * 0.5;
  const [lo, hi] = bbox(p.id, p.o); // fallback: occupancy diameter
  return Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 8;
}

export type Conversion = { vehicle: Vehicle; missing: string[] };

/**
 * Convert one connected Teks assembly (lattice parts, world frame)
 * into a Vehicle. `bindings` maps motor uid → channel (default A);
 * `hubChannel` is the channel the hub listens on (default A).
 * The vehicle frame: x = right (wheel axle direction), y = up,
 * z = rear (forward is −z, the game's convention).
 */
export function vehicleFromAssembly(
  parts: Part[],
  opts: { bindings?: Map<number, Channel>; hubChannel?: Channel; battery?: number; fuel?: number } = {},
): Conversion {
  const missing: string[] = [];
  const roles = parts.map((p) => roleOf(p.id));
  const wheels = parts.filter((_, i) => roles[i] === "wheel");
  if (!roles.includes("hub")) missing.push("hub");
  if (!roles.includes("motor")) missing.push("motor");
  if (wheels.length < 2) missing.push("wheels (≥2)");

  // Mass centre = the vehicle origin.
  let totalMass = 0;
  const origin = { x: 0, y: 0, z: 0 };
  const centres = parts.map((p) => partWorldCentre(p));
  parts.forEach((p, i) => {
    const m = partMass(p.id);
    totalMass += m;
    origin.x += centres[i].x * m;
    origin.y += centres[i].y * m;
    origin.z += centres[i].z * m;
  });
  if (totalMass > 0) {
    origin.x /= totalMass;
    origin.y /= totalMass;
    origin.z /= totalMass;
  }

  // Vehicle basis: right = mean wheel axle direction (world), forced
  // horizontal; forward = up × right; rear = −forward.
  let axle = { x: 1, y: 0, z: 0 };
  if (wheels.length) {
    const acc = { x: 0, y: 0, z: 0 };
    for (const w of wheels) {
      const s = spec(w.id);
      const prim = s ? s.prim : 2;
      const d = rot(w.o, [prim === 0 ? 1 : 0, prim === 1 ? 1 : 0, prim === 2 ? 1 : 0]);
      // Sign-align with the first wheel so opposed mountings still agree.
      const ref = acc.x || acc.z ? acc : { x: d[0], y: d[1], z: d[2] };
      const dot = d[0] * ref.x + d[2] * ref.z;
      const sgn = dot < 0 ? -1 : 1;
      acc.x += d[0] * sgn;
      acc.z += d[2] * sgn;
    }
    const len = Math.hypot(acc.x, acc.z);
    if (len > 1e-6) axle = { x: acc.x / len, y: 0, z: acc.z / len };
  }
  const right = axle;
  const fwd = { x: right.z, y: 0, z: -right.x }; // up × right… (0,1,0)×(x,0,z) = (1*z−0, .., −x) → (z, 0, −x) ✓
  const rear = { x: -fwd.x, y: 0, z: -fwd.z };
  // Basis matrix, columns = images of local axes (right, up, rear).
  const B: Mat = [
    right.x, 0, rear.x,
    right.y, 1, rear.y,
    right.z, 0, rear.z,
  ];
  const frameO = orientIndex(B);
  const Bt = matT(B);
  // Game yaw whose forward (−sin, 0, −cos) equals fwd.
  const yaw0 = Math.atan2(-fwd.x, -fwd.z);

  const toLocal = (world: Vec3): Vec3 => {
    const d = sub(world, origin);
    const r = [
      Bt[0] * d.x + Bt[1] * d.y + Bt[2] * d.z,
      Bt[3] * d.x + Bt[4] * d.y + Bt[5] * d.z,
      Bt[6] * d.x + Bt[7] * d.y + Bt[8] * d.z,
    ];
    return { x: r[0], y: r[1], z: r[2] };
  };

  // --- P5c-3: subgroups + joints. Removing the joint parts (servos,
  // screw actuators) splits the assembly into rigid subgroups; a joint
  // part touching ≥2 subgroups articulates them. The hub's subgroup
  // is the base (group 0). Adjacency = AABB touch, like the air
  // networks and the game's component walk.
  const isJointPart = (p: Part) => motorSizeOf(p.id) === "servo" || spec(p.id)?.drive === "screw";
  const boxesOf = parts.map((p) => {
    const [lo, hi] = bbox(p.id, p.o);
    return {
      lo: [lo[0] + p.q[0], lo[1] + p.q[1], lo[2] + p.q[2]],
      hi: [hi[0] + p.q[0], hi[1] + p.q[1], hi[2] + p.q[2]],
    };
  });
  const touchIdx = (a: number, b: number) => {
    const A = boxesOf[a];
    const B = boxesOf[b];
    for (let i = 0; i < 3; i++) if (A.lo[i] > B.hi[i] + 1 || B.lo[i] > A.hi[i] + 1) return false;
    return true;
  };
  const groupOfIdx: number[] = parts.map(() => -1);
  {
    let ng = 0;
    for (let i = 0; i < parts.length; i++) {
      if (isJointPart(parts[i]) || groupOfIdx[i] >= 0) continue;
      const stack = [i];
      groupOfIdx[i] = ng;
      while (stack.length) {
        const a = stack.pop()!;
        for (let b = 0; b < parts.length; b++) {
          if (b === a || isJointPart(parts[b]) || groupOfIdx[b] >= 0) continue;
          if (touchIdx(a, b)) {
            groupOfIdx[b] = ng;
            stack.push(b);
          }
        }
      }
      ng++;
    }
    // Renumber so the hub's group is 0.
    const hubIdx = parts.findIndex((p) => roleOf(p.id) === "hub");
    const baseG = hubIdx >= 0 ? groupOfIdx[hubIdx] : 0;
    if (baseG > 0) {
      for (let i = 0; i < groupOfIdx.length; i++) {
        if (groupOfIdx[i] === 0) groupOfIdx[i] = baseG;
        else if (groupOfIdx[i] === baseG) groupOfIdx[i] = 0;
      }
    }
  }

  const vparts: VPart[] = parts.map((p, i) => {
    const role = roles[i];
    const wo = partWorldOrigin(p);
    const localO = frameO >= 0 ? orientIndex(matMul(Bt, ORIENTS[p.o])) : p.o;
    // B17: frame-space AABB — the part's lattice box corners
    // carried through the same basis as centreLocal.
    const [blo, bhi] = bbox(p.id, p.o);
    const mn = { x: Infinity, y: Infinity, z: Infinity };
    const mx = { x: -Infinity, y: -Infinity, z: -Infinity };
    for (const cx of [blo[0] + p.q[0], bhi[0] + p.q[0]])
      for (const cy of [blo[1] + p.q[1], bhi[1] + p.q[1]])
        for (const cz of [blo[2] + p.q[2], bhi[2] + p.q[2]]) {
          const l = toLocal({ x: cx / 4, y: cy / 4, z: cz / 4 });
          if (l.x < mn.x) mn.x = l.x;
          if (l.y < mn.y) mn.y = l.y;
          if (l.z < mn.z) mn.z = l.z;
          if (l.x > mx.x) mx.x = l.x;
          if (l.y > mx.y) mx.y = l.y;
          if (l.z > mx.z) mx.z = l.z;
        }
    return {
      uid: p.uid,
      id: p.id,
      o: p.o,
      on: p.on !== false,
      role,
      group: Math.max(0, groupOfIdx[i]),
      ext0: p.ext ?? 0,
      cfg: p.cfg ?? 0,
      relOrigin: sub(wo, origin),
      localPos: toLocal(wo),
      localO: localO >= 0 ? localO : p.o,
      centreLocal: toLocal(centres[i]),
      box: { min: mn, max: mx },
      mass: partMass(p.id),
      radius: role === "wheel" ? wheelRadius(p) : 0,
      size: role === "motor" ? motorSizeOf(p.id) : null,
      channel: (opts.bindings?.get(p.uid) ?? "A") as Channel,
    };
  });

  const vWheels = vparts.filter((p) => p.role === "wheel");
  const vMotors = vparts.filter((p) => p.role === "motor");
  const xs = vWheels.map((w) => w.localPos.x);
  const zs = vWheels.map((w) => w.localPos.z);
  const track = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
  const wheelbase = zs.length ? Math.max(...zs) - Math.min(...zs) : 0;
  const centre = { x: 0, y: 0, z: 0 };
  for (const p of vparts) {
    centre.x += p.centreLocal.x * p.mass;
    centre.y += p.centreLocal.y * p.mass;
    centre.z += p.centreLocal.z * p.mass;
  }
  if (totalMass > 0) {
    centre.x /= totalMass;
    centre.y /= totalMass;
    centre.z /= totalMass;
  }
  const hub = vparts.find((p) => p.role === "hub");

  // --- P5c-3: joints, hierarchised by BFS from the base group. ---
  const joints: VJoint[] = [];
  {
    const unitFor = (ax: number): V3 => (ax === 0 ? [1, 0, 0] : ax === 1 ? [0, 1, 0] : [0, 0, 1]);
    // (ax arrives as a plain number from the spec holes; it is an Ax.)
    // group adjacency through joint parts
    const jointTouched = new Map<number, number[]>(); // part index -> touched groups
    for (let i = 0; i < parts.length; i++) {
      if (!isJointPart(parts[i])) continue;
      const gs = new Set<number>();
      for (let b = 0; b < parts.length; b++) {
        if (b === i || isJointPart(parts[b])) continue;
        if (touchIdx(i, b)) gs.add(groupOfIdx[b]);
      }
      jointTouched.set(i, [...gs]);
    }
    const depth = new Map<number, number>([[0, 0]]);
    const adj = new Map<number, { to: number; joint: number }[]>();
    for (const [i, gs] of jointTouched) {
      for (let a = 0; a < gs.length; a++)
        for (let b = a + 1; b < gs.length; b++) {
          (adj.get(gs[a]) ?? adj.set(gs[a], []).get(gs[a])!).push({ to: gs[b], joint: i });
          (adj.get(gs[b]) ?? adj.set(gs[b], []).get(gs[b])!).push({ to: gs[a], joint: i });
        }
    }
    const queue = [0];
    while (queue.length) {
      const g = queue.shift()!;
      for (const e of adj.get(g) ?? []) {
        if (!depth.has(e.to)) {
          depth.set(e.to, (depth.get(g) ?? 0) + 1);
          queue.push(e.to);
        }
      }
    }
    for (const [i, gs] of jointTouched) {
      const vp = vparts[i];
      if (!gs.length) continue;
      const sorted = [...gs].sort((a, b) => (depth.get(a) ?? 999) - (depth.get(b) ?? 999));
      const parentGroup = sorted[0];
      vp.group = parentGroup;
      if (gs.length < 2) continue;
      const s = spec(parts[i].id);
      const kind: VJoint["kind"] = motorSizeOf(parts[i].id) === "servo" ? "servo" : "screw";
      let axisLocal: V3 = [1, 0, 0];
      if (kind === "servo") {
        const hole = s?.holes.find((h) => h.t === "A");
        axisLocal = unitFor(hole ? hole.ax : 2);
      }
      const axisW = rot(vp.localO, axisLocal);
      const axis: Vec3 = { x: axisW[0], y: axisW[1], z: axisW[2] };
      for (const child of sorted.slice(1)) {
        joints.push({
          uid: parts[i].uid,
          kind,
          channel: (opts.bindings?.get(parts[i].uid) ?? "A") as Channel,
          group: child,
          parentGroup,
          pivot: { ...vp.centreLocal },
          axis,
          angle: 0,
          ext: kind === "screw" ? (parts[i].ext ?? 0) : 0,
          stroke: (s?.rod?.stroke ?? 0) * 0.5,
        });
      }
    }
  }

  const vehicle: Vehicle = {
    parts: vparts,
    wheels: vWheels,
    motors: vMotors,
    origin0: { ...origin },
    frameO,
    yaw0,
    pos: { ...origin },
    yaw: yaw0,
    pitch: 0,
    roll: 0,
    vel: 0,
    wheelSpin: 0,
    wheelSpeeds: { left: 0, right: 0, carrier: 0 },
    susp: vWheels.map(() => 0.5),
    mass: totalMass,
    centre,
    wheelbase: Math.max(wheelbase, 0.5),
    track: Math.max(track, 0.4),
    battery: opts.battery ?? 1,
    hasBatteryBox: roles.includes("battery"),
    fuel: Math.min(opts.fuel ?? 0, FUEL.tankCapacity),
    hubOn: hub ? hub.on : false,
    hubChannel: opts.hubChannel ?? "A",
    load: 0,
    rpm: 0,
    joints,
  };
  return { vehicle, missing };
}

export type DriveCmd = {
  /** −1..1, forward positive. */
  throttle: number;
  /** −1..1, right positive. */
  steer: number;
  /** The channel being commanded this step (the hub's active channel). */
  channel: Channel;
  /** P8 hub levels: battery drain multiplier (L2 0.67, L3 0.5). */
  battMul?: number;
  /** P8 hub levels: generator charge multiplier (L3 1.5). */
  genMul?: number;
};

/**
 * Advance the vehicle one step. `heightAt(x, z)` is the game's terrain
 * height (top of the ground) in blocks — the suspension raycasts
 * sample it at every wheel.
 */
export function stepVehicle(v: Vehicle, dt: number, cmd: DriveCmd, heightAt: (x: number, z: number) => number): Vehicle {
  if (dt <= 0) return v;
  const throttle = Math.max(-1, Math.min(1, cmd.throttle));
  const steer = Math.max(-1, Math.min(1, cmd.steer));

  // --- Binding: a motor answers only on the commanded channel. ---
  const active = v.motors.filter((m) => m.on && m.channel === cmd.channel && m.size !== "servo");
  const driveMotors = v.hubOn ? active : [];
  const torqueSum = driveMotors.reduce((s, m) => s + (m.size ? MOTOR_SPEC[m.size].torqueNcm : 0), 0);
  const load = torqueSum > 0 ? (Math.abs(throttle) * torqueSum) / MOTOR_SPEC.XL.torqueNcm : 0;
  v.load = load;

  // --- Energy: generator burns fuel → battery; motors drink battery.
  // The generator runs when there is demand (driving) or the battery
  // is low; from a dead battery with fuel aboard it bootstraps a
  // crank charge — the fuel is still what pays for it.
  const demand = driveMotors.length > 0 && throttle !== 0;
  if (v.fuel > 0 && v.battery < 0.999 && (demand || v.battery < 0.35)) {
    if (v.battery <= 0.001) v.battery = 0.02; // generator crank
    const burn = Math.min(v.fuel, FUEL.consumptionPerLoad * Math.max(load, 0.35) * dt);
    v.fuel -= burn;
    v.battery = Math.min(1, v.battery + burn * GEN_CHARGE_PER_FUEL * (cmd.genMul ?? 1));
  }
  if (demand && v.battery > 0) {
    v.battery = Math.max(0, v.battery - BATT_DRAIN * load * dt * (cmd.battMul ?? 1));
  }
  const hasPower = demand && v.battery > 0;

  // --- Propulsion through the driven axle. ---
  const rAvg = v.wheels.length ? v.wheels.reduce((s, w) => s + w.radius, 0) / v.wheels.length : 0.25;
  if (hasPower && torqueSum > 0) {
    const force = ((torqueSum / 100) * DRIVE_REDUCTION) / rAvg;
    const accel = (force / Math.max(0.01, v.mass)) * throttle;
    v.vel += accel * dt;
    const minRpm = Math.min(...driveMotors.map((m) => (m.size ? MOTOR_SPEC[m.size].rpm : 0)));
    const vMax = ((minRpm * Math.PI) / 30 / DRIVE_REDUCTION) * rAvg;
    v.vel = Math.max(-vMax, Math.min(vMax, v.vel));
  } else {
    // Coast: rolling resistance + drag. A dry vehicle rolls to a stop.
    const drag = 1.4 * dt;
    if (Math.abs(v.vel) <= drag) v.vel = 0;
    else v.vel -= Math.sign(v.vel) * drag;
  }
  // Mild powered drag so a held throttle settles instead of creeping.
  v.vel *= Math.max(0, 1 - 0.12 * dt);

  // --- Steering + differential (the shared mech primitive). ---
  const yawRate = Math.max(-1.6, Math.min(1.6, (steer * v.vel * 0.8) / v.wheelbase));
  v.yaw += yawRate * dt;
  const vLeft = v.vel - (yawRate * v.track) / 2;
  const vRight = v.vel + (yawRate * v.track) / 2;
  const carrier = diffOutput(frac(Math.round(vLeft * 1000), 1000), frac(Math.round(vRight * 1000), 1000));
  v.wheelSpeeds = { left: vLeft, right: vRight, carrier: carrier.n / carrier.d };
  v.rpm = (Math.abs(v.vel) / rAvg) * DRIVE_REDUCTION * (30 / Math.PI);
  v.wheelSpin += (v.vel / rAvg) * dt;

  // --- Advance along the heading. ---
  v.pos.x += -Math.sin(v.yaw) * v.vel * dt;
  v.pos.z += -Math.cos(v.yaw) * v.vel * dt;

  // --- P5c-3: joints answer their own channel's throttle. A servo
  // swings toward throttle × 90°; a screw actuator slides its stroke.
  // Drive motors use the same cmd, so a subsystem moves only when
  // the player binds it to the channel they are commanding.
  for (const j of v.joints) {
    if (j.channel !== cmd.channel) continue;
    if (j.kind === "servo") {
      // B21: the servo used to chase throttle × 90° and spring back to
      // 0 the moment W was released — so a boom fell back down as soon
      // as you switched channel to curl the bucket, and a Digger could
      // never dig. It now HOLDS its angle: throttle sets the swing rate.
      j.angle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, j.angle + throttle * 2.2 * dt));
    } else {
      j.ext = Math.max(0, Math.min(1, j.ext + throttle * dt * 0.8));
    }
  }

  // --- Suspension: raycast every wheel against the real terrain. ---
  if (v.wheels.length) {
    const supports: number[] = [];
    v.wheels.forEach((w) => {
      const world = wheelWorldPos(v, w);
      const ground = heightAt(world.x, world.z);
      supports.push(ground + w.radius - w.localPos.y);
    });
    const bodyY = supports.reduce((s, n) => s + n, 0) / supports.length + SUSP_LEN * 0.5;
    v.pos.y = bodyY;
    // Recompute compression against the settled body height.
    v.wheels.forEach((w, i) => {
      const world = wheelWorldPos(v, w);
      const ground = heightAt(world.x, world.z);
      v.susp[i] = suspRay(ground + w.radius, bodyY + w.localPos.y);
    });
    const sup = (w: VPart) => {
      const world = wheelWorldPos(v, w);
      return heightAt(world.x, world.z) + w.radius - w.localPos.y;
    };
    const front = v.wheels.filter((w) => w.localPos.z < -0.01);
    const rear = v.wheels.filter((w) => w.localPos.z > 0.01);
    const left = v.wheels.filter((w) => w.localPos.x < -0.01);
    const right = v.wheels.filter((w) => w.localPos.x > 0.01);
    const mean = (ws: VPart[]) => (ws.length ? ws.reduce((s, w) => s + sup(w), 0) / ws.length : bodyY);
    if (front.length && rear.length) v.pitch = Math.atan2(mean(front) - mean(rear), v.wheelbase);
    if (left.length && right.length) v.roll = Math.atan2(mean(right) - mean(left), v.track);
  }
  return v;
}

/** World position of a wheel's centre, from the body state. */
export function wheelWorldPos(v: Vehicle, w: VPart): Vec3 {
  // Vehicle frame → conversion world frame (basis B), then the body's
  // yaw change since conversion, then translate. B's rotation is
  // ORIENTS[v.frameO]; a point p_local maps to B·p in conversion-world
  // axes; the body then yaws by (yaw − yaw0) about Y.
  const bw = rot(v.frameO >= 0 ? v.frameO : 0, [w.localPos.x, w.localPos.y, w.localPos.z]);
  const spun = rotY(v.yaw - v.yaw0, { x: bw[0], y: bw[1], z: bw[2] });
  return { x: v.pos.x + spun.x, y: v.pos.y + spun.y, z: v.pos.z + spun.z };
}

// ---- P5c-3: articulation helpers -----------------------------------
type Affine = { r: Mat; t: Vec3 };
const AFF_I: Mat = [1, 0, 0, 0, 1, 0, 0, 0, 1];
function matVec(m: Mat, p: Vec3): Vec3 {
  return {
    x: m[0] * p.x + m[1] * p.y + m[2] * p.z,
    y: m[3] * p.x + m[4] * p.y + m[5] * p.z,
    z: m[6] * p.x + m[7] * p.y + m[8] * p.z,
  };
}
function rotAxisMat(axis: Vec3, ang: number): Mat {
  const { x, y, z } = axis;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const C = 1 - c;
  return [
    c + x * x * C, x * y * C - z * s, x * z * C + y * s,
    y * x * C + z * s, c + y * y * C, y * z * C - x * s,
    z * x * C - y * s, z * y * C + x * s, c + z * z * C,
  ];
}
function jointLocal(j: VJoint, angle: number, ext: number): Affine {
  if (j.kind === "servo") {
    const r = rotAxisMat(j.axis, angle);
    const rp = matVec(r, j.pivot);
    return { r, t: { x: j.pivot.x - rp.x, y: j.pivot.y - rp.y, z: j.pivot.z - rp.z } };
  }
  return { r: AFF_I, t: { x: j.axis.x * ext * j.stroke, y: j.axis.y * ext * j.stroke, z: j.axis.z * ext * j.stroke } };
}
/** The joints moving a group, ordered base → leaf. */
export function jointChain(v: Vehicle, group: number): VJoint[] {
  const byGroup = new Map(v.joints.map((j) => [j.group, j]));
  const out: VJoint[] = [];
  let g = group;
  while (g !== 0) {
    const j = byGroup.get(g);
    if (!j) break;
    out.unshift(j);
    g = j.parentGroup;
  }
  return out;
}
/** Accumulated affine (vehicle frame, blocks) for a subgroup. With
 *  `snapped`, servo angles quantise to quarter turns (parking folds
 *  the machine back onto the lattice). */
export function jointAffine(v: Vehicle, group: number, snapped = false): Affine {
  let acc: Affine = { r: AFF_I, t: { x: 0, y: 0, z: 0 } };
  for (const j of jointChain(v, group)) {
    const ang = snapped ? Math.round(j.angle / (Math.PI / 2)) * (Math.PI / 2) : j.angle;
    const jl = jointLocal(j, ang, j.ext);
    const t = matVec(acc.r, jl.t);
    acc = { r: matMul(acc.r, jl.r), t: { x: t.x + acc.t.x, y: t.y + acc.t.y, z: t.z + acc.t.z } };
  }
  return acc;
}
/** Apply a subgroup's joint chain to a vehicle-frame point. */
export function applyJointPoint(v: Vehicle, group: number, p: Vec3, snapped = false): Vec3 {
  const a = jointAffine(v, group, snapped);
  const r = matVec(a.r, p);
  return { x: r.x + a.t.x, y: r.y + a.t.y, z: r.z + a.t.z };
}
/** World position (blocks) of a vehicle-frame point on a part:
 *  joints, then the body transform (pos/yaw; pitch/roll ignored —
 *  digging tolerates the small tilt error). */
export function partWorldPoint(v: Vehicle, vp: VPart, local: Vec3): Vec3 {
  const j = applyJointPoint(v, vp.group, local);
  const bw = rot(v.frameO >= 0 ? v.frameO : 0, [j.x, j.y, j.z]);
  const spun = rotY(v.yaw - v.yaw0, { x: bw[0], y: bw[1], z: bw[2] });
  return { x: v.pos.x + spun.x, y: v.pos.y + spun.y, z: v.pos.z + spun.z };
}

/** Fuel units yielded by melting `plasticUnits` of plastic (FUEL: 0.25/unit). */
export function fuelFromMelt(plasticUnits: number): number {
  return plasticUnits * FUEL.meltPlasticYield;
}

/** Pour fuel units into the tank. Returns the amount actually taken. */
export function refuel(v: Vehicle, units: number): number {
  const take = Math.max(0, Math.min(units, FUEL.tankCapacity - v.fuel));
  v.fuel += take;
  return take;
}

export type ParkPose = { uid: number; id: number; o: number; q: [number, number, number] };

/**
 * The parking poses: the assembly re-seated on the half-module
 * lattice. Yaw is snapped to the nearest multiple of 90° from the
 * conversion heading (the lattice's own group), positions snapped to
 * the lattice. Returns null if the snapped rotation is somehow not
 * in the 24-orientation group (cannot happen — defensive).
 */
export function parkPoses(v: Vehicle): ParkPose[] | null {
  const dq = Math.round((v.yaw - v.yaw0) / (Math.PI / 2));
  const dir = dq >= 0 ? 1 : -1;
  let rk = 0; // orientation index of Rk = Ryaw(snapped)
  for (let i = 0; i < Math.abs(dq); i++) rk = composeO(rk, 1, dir as 1 | -1);
  const out: ParkPose[] = [];
  const B = ORIENTS[v.frameO >= 0 ? v.frameO : 0];
  const Bt = matT(B);
  for (const p of v.parts) {
    // P5c-3: fold the joint chain in (servo angles snapped to the
    // quarter turn — parking folds the machine back onto the lattice;
    // screw slides stay, their travel rounds into the lattice q).
    // Orientation = RyawSnap × (B × Rchain × Bᵀ) × rest, all as mats.
    const rChain = jointAffine(v, p.group, true).r;
    const rConv = matMul(matMul(B, rChain), Bt);
    const o = orientIndex(matMul(ORIENTS[rk], matMul(rConv, ORIENTS[p.o])));
    if (o < 0) return null;
    const jw = applyJointPoint(v, p.group, p.localPos, true);
    const bw = rot(v.frameO >= 0 ? v.frameO : 0, [jw.x, jw.y, jw.z]);
    const off = rot(rk, bw);
    out.push({
      uid: p.uid,
      id: p.id,
      o,
      q: [
        Math.round((v.pos.x + off[0]) * 4),
        Math.round((v.pos.y + off[1]) * 4),
        Math.round((v.pos.z + off[2]) * 4),
      ],
    });
  }
  return out;
}
