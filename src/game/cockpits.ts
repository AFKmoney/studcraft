// B21 — craftable cockpits (Philippe t92u: "pilotable first person avec
// cockpits propres, différents, fabricables avec plastique, vitre").
// A cockpit defines the driver's eye, the dashboard (speed / ammo /
// energy gauges) and the window panes. Coordinates here are PART-LOCAL
// MODULES (teks.ts spec frame: 1 block = 2 modules, −Z = forward).
import { ID } from "./blocks.ts";
import { ORIENTS, rot, type V3 } from "./teks.ts";
import type { Vehicle, VPart } from "./vehicle.ts";

export type Pane = { a: V3; b: V3 };
export type CockpitSpec = {
  id: number;
  name: string;
  /** Eye point, part-local modules. */
  eye: V3;
  /** Dashboard centre (gauges face the eye), part-local modules. */
  dash: V3;
  /** Window panes (rendered with the shared SNR glass). */
  panes: Pane[];
  enclosed: boolean;
  /** Field of view the cockpit gives (deg) — the cab is a touch narrower. */
  fov: number;
};

export const COCKPITS: Record<number, CockpitSpec> = {
  [ID.CockpitSeat]: { id: ID.CockpitSeat, name: "Open seat", eye: [0, 4.4, 0.8], dash: [0, 2.05, -2.4], panes: [], enclosed: false, fov: 78 },
  [ID.CockpitCab]: {
    id: ID.CockpitCab, name: "Glass cab", eye: [0, 4.4, 0.6], dash: [0, 2.05, -3.0], enclosed: true, fov: 74,
    panes: [
      { a: [-2.6, 2.6, -3.95], b: [2.6, 6.2, -3.85] },
      { a: [-2.95, 2.6, -3.6], b: [-2.85, 6.2, 3.6] },
      { a: [2.85, 2.6, -3.6], b: [2.95, 6.2, 3.6] },
    ],
  },
  [ID.CockpitCage]: { id: ID.CockpitCage, name: "Buggy roll cage", eye: [0, 4.2, 0.8], dash: [0, 2.05, -2.4], panes: [], enclosed: false, fov: 80 },
  [ID.CockpitMech]: {
    id: ID.CockpitMech, name: "Mech cabin", eye: [0, 4.0, 0.4], dash: [0, 2.05, -3.0], enclosed: true, fov: 70,
    panes: [{ a: [-2.6, 2.4, -3.9], b: [2.6, 5.4, -3.8] }],
  },
};
export const isCockpit = (id: number) => id in COCKPITS;

/** Part-local modules → vehicle-frame blocks for a vehicle part. */
export function partLocalToVehicle(vp: VPart, p: V3): { x: number; y: number; z: number } {
  const r = rot(vp.localO, p);
  return { x: vp.localPos.x + r[0] / 2, y: vp.localPos.y + r[1] / 2, z: vp.localPos.z + r[2] / 2 };
}

/** The vehicle's cockpit part (the first one, by uid order). */
export function cockpitPart(v: Vehicle): VPart | null {
  return v.parts.filter((p) => isCockpit(p.id)).sort((a, b) => a.uid - b.uid)[0] ?? null;
}

/** The driver's eye in the vehicle frame (blocks), from the cockpit. */
export function cockpitEye(v: Vehicle): { x: number; y: number; z: number } | null {
  const cp = cockpitPart(v);
  return cp ? partLocalToVehicle(cp, COCKPITS[cp.id].eye) : null;
}

/** The cockpit's forward in the vehicle frame (part −Z rotated). */
export function cockpitForward(vp: VPart): { x: number; y: number; z: number } {
  const r = rot(vp.localO, [0, 0, -1]);
  return { x: r[0], y: r[1], z: r[2] };
}

/** Dashboard gauges 0..1: speed vs a top speed, ammo (rounds / cap),
 *  energy (battery). */
export function dashGauges(v: Pick<Vehicle, "vel" | "battery">, ammo: number, ammoCap = 32, topSpeed = 12) {
  return {
    speed: Math.min(1, Math.abs(v.vel) / topSpeed),
    ammo: Number.isFinite(ammo) ? Math.min(1, ammo / ammoCap) : 1,
    energy: Math.max(0, Math.min(1, v.battery)),
  };
}

export { ORIENTS };
