// B21 — garage builder logic à la Nuts & Bolts: a vehicle is assembled
// from parts (cockpit, power, wheels/motors, weapons) and VALIDATED
// before it can roll out or be saved. Pure: works on part ids.
import { ID } from "./blocks.ts";
import { WEAPONS } from "./vehArms.ts";
import { COCKPITS } from "./cockpits.ts";
import type { VehicleModel } from "./catalogue.ts";

export type BuildIssue = { code: "cockpit" | "power" | "hub" | "drive" | "wheels" | "ammo" | "turret" | "cockpits"; msg: string; fatal: boolean };
export type BuildReport = { ok: boolean; issues: BuildIssue[]; cockpit: number | null; weapons: number[]; turret: boolean; power: { battery: boolean; hub: boolean } };

// Road (56145) is the tyred road wheel the showroom rolls on — a wheel too (vehicle.ts treats both as wheels).
const WHEELS = new Set<number>([ID.Wheel, ID.Road]);
const MOTORS = new Set<number>([ID.MotorM, ID.MotorL, ID.MotorXL]);

/** Validate a build from its part ids. Fatal: no cockpit, no power
 *  source (a hub — it carries the battery cell; a battery box adds
 *  reserve), no drive motor, fewer than 2 wheels. Warnings: weapons
 *  without ammo in stock, a turret mount with no weapon, two cockpits. */
export function validateBuild(ids: readonly number[], ammoHave: (ammoId: number) => number = () => Infinity): BuildReport {
  const issues: BuildIssue[] = [];
  const cockpits = ids.filter((id) => id in COCKPITS);
  const weapons = ids.filter((id) => id in WEAPONS);
  const hub = ids.includes(ID.TechHub);
  const battery = ids.includes(ID.Battery);
  const turret = ids.includes(ID.VehTurretMount);
  if (!cockpits.length) issues.push({ code: "cockpit", msg: "needs a cockpit (seat, cab, roll cage or mech cabin)", fatal: true });
  if (cockpits.length > 1) issues.push({ code: "cockpits", msg: "two cockpits — the first one drives", fatal: false });
  if (!hub) issues.push({ code: "power", msg: "needs a power source (Teks hub)", fatal: true });
  if (!ids.some((id) => MOTORS.has(id))) issues.push({ code: "drive", msg: "needs a drive motor", fatal: true });
  if (ids.filter((id) => WHEELS.has(id)).length < 2) issues.push({ code: "wheels", msg: "needs 2 wheels or more", fatal: true });
  for (const w of new Set(weapons)) {
    const spec = WEAPONS[w];
    if (spec.ammo && ammoHave(spec.ammo) < 1) issues.push({ code: "ammo", msg: spec.name + " has no ammo in your pack", fatal: false });
  }
  if (turret && !weapons.length) issues.push({ code: "turret", msg: "turret mount carries no weapon", fatal: false });
  return { ok: !issues.some((i) => i.fatal), issues, cockpit: cockpits[0] ?? null, weapons, turret, power: { battery, hub } };
}

export const buildSummary = (r: BuildReport) =>
  r.ok
    ? "Build OK" + (r.weapons.length ? " · " + r.weapons.length + " weapon" + (r.weapons.length > 1 ? "s" : "") : "") + (r.turret ? " · turret" : "") + (r.issues.length ? " · " + r.issues.map((i) => i.msg).join("; ") : "")
    : "Build not ready — " + r.issues.filter((i) => i.fatal).map((i) => i.msg).join("; ");

export const validateModel = (m: VehicleModel, ammoHave?: (id: number) => number) => validateBuild(m.parts.map((p) => p.id), ammoHave);
