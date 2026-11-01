// B21 — vehicle armoury (Grok vehicles lane, Philippe t92u: "des canons
// basiques avec des boulets en plastique, des canons puissants en or,
// des lasers en émeraude", think Nuts & Bolts / Trailmakers).
//
// Pure logic, no three.js: weapon specs, per-weapon ammo / energy /
// heat state, the fire gate, projectile ballistics, aim (mouse yaw on a
// turret, locked forward without one), and the damage resolution that
// game.ts applies to mobs and blocks (village crime rules included).
import { ID } from "./blocks.ts";

export type WeaponKind = "cannon" | "goldCannon" | "laser" | "rocketPod";
export type WeaponSpec = {
  id: number;
  kind: WeaponKind;
  name: string;
  /** Ammo item consumed per shot (0 = energy weapon). */
  ammo: number;
  /** Seconds between shots. */
  cooldown: number;
  /** Muzzle speed, blocks/s (laser: instant beam, 0). */
  speed: number;
  /** Projectile gravity, blocks/s². */
  grav: number;
  /** Direct-hit damage to a mob (hearts ×2 like the guns). */
  dmg: number;
  /** Explosion radius on impact, blocks (0 = none). */
  blast: number;
  /** Laser: battery fraction per second of beam, heat per second, range. */
  energyPerSec?: number;
  heatPerSec?: number;
  range?: number;
  /** Block damage on impact: "chip" (one block's pieces), "blast" (explode), "burn" (laser heat). */
  blockHit: "chip" | "blast" | "burn";
  /** Recoil impulse fed back into the vehicle's speed (blocks/s). */
  recoil: number;
};

export const WEAPONS: Record<number, WeaponSpec> = {
  [ID.VehCannon]: { id: ID.VehCannon, kind: "cannon", name: "Plastic cannon", ammo: ID.Cannonball, cooldown: 0.9, speed: 38, grav: 9, dmg: 9, blast: 0, blockHit: "chip", recoil: 0.6 },
  [ID.VehGoldCannon]: { id: ID.VehGoldCannon, kind: "goldCannon", name: "Gold cannon", ammo: ID.GoldShell, cooldown: 2.2, speed: 32, grav: 12, dmg: 22, blast: 2.6, blockHit: "blast", recoil: 1.6 },
  [ID.VehLaser]: { id: ID.VehLaser, kind: "laser", name: "Emerald laser", ammo: 0, cooldown: 0.1, speed: 0, grav: 0, dmg: 3, blast: 0, energyPerSec: 0.05, heatPerSec: 0.45, range: 28, blockHit: "burn", recoil: 0 },
  [ID.VehRocketPod]: { id: ID.VehRocketPod, kind: "rocketPod", name: "Rocket pod", ammo: ID.VehRocket, cooldown: 0.35, speed: 26, grav: 1.5, dmg: 12, blast: 1.6, blockHit: "blast", recoil: 0.3 },
};
export const isWeapon = (id: number) => id in WEAPONS;
export const TURRET_ID = ID.VehTurretMount;
/** Heat cools at this rate per second; at 1.0 the laser overheats and
 *  locks until it drops back under HEAT_RESUME. */
export const HEAT_COOL = 0.3;
export const HEAT_RESUME = 0.35;
/** Rocket pod: 4 tubes per salvo, then a reload. */
export const POD_TUBES = 4;
export const POD_RELOAD = 2.5;

export type WeaponState = { uid: number; id: number; lastShot: number; heat: number; overheated: boolean; tubes: number; reloadUntil: number };
export const newWeaponState = (uid: number, id: number): WeaponState => ({ uid, id, lastShot: -1e9, heat: 0, overheated: false, tubes: POD_TUBES, reloadUntil: 0 });

export type FireGate = "fired" | "cooldown" | "empty" | "no-energy" | "overheated" | "reloading";

/** Can this weapon fire now? Mutates state when it does. `ammoHave` is
 *  the matching ammo count in the inventory (creative: Infinity);
 *  `battery` the hub battery 0..1. The caller spends ammo / battery by
 *  the returned costs. dt = frame time (laser drains per second). */
export function fireWeapon(st: WeaponState, now: number, dt: number, ammoHave: number, battery: number): { gate: FireGate; ammo: number; energy: number } {
  const w = WEAPONS[st.id];
  if (!w) return { gate: "empty", ammo: 0, energy: 0 };
  if (w.kind === "laser") {
    if (st.overheated) return { gate: "overheated", ammo: 0, energy: 0 };
    const e = (w.energyPerSec ?? 0) * dt;
    if (battery < e || battery <= 0.02) return { gate: "no-energy", ammo: 0, energy: 0 };
    st.heat = Math.min(1, st.heat + (w.heatPerSec ?? 0) * dt + HEAT_COOL * dt);
    if (st.heat >= 1) st.overheated = true;
    st.lastShot = now;
    return { gate: "fired", ammo: 0, energy: e };
  }
  if (w.kind === "rocketPod" && now < st.reloadUntil) return { gate: "reloading", ammo: 0, energy: 0 };
  if (now - st.lastShot < w.cooldown) return { gate: "cooldown", ammo: 0, energy: 0 };
  if (ammoHave < 1) return { gate: "empty", ammo: 0, energy: 0 };
  st.lastShot = now;
  if (w.kind === "rocketPod") {
    st.tubes -= 1;
    if (st.tubes <= 0) { st.tubes = POD_TUBES; st.reloadUntil = now + POD_RELOAD; }
  }
  return { gate: "fired", ammo: 1, energy: 0 };
}

/** Per frame: the laser sheds heat; an overheated laser unlocks below HEAT_RESUME. */
export function coolWeapon(st: WeaponState, dt: number) {
  st.heat = Math.max(0, st.heat - HEAT_COOL * dt);
  if (st.overheated && st.heat <= HEAT_RESUME) st.overheated = false;
}

/** Aim: with a turret mount the weapons follow the mouse yaw (clamped to
 *  the turret's arc, full circle here) and pitch; without one they are
 *  LOCKED to the vehicle's forward, pitch only from the barrel (0).
 *  Returns a world direction (unit). Game convention: forward = (−sin, 0, −cos). */
export function aimDir(vehYaw: number, hasTurret: boolean, aimYaw: number, aimPitch: number): { x: number; y: number; z: number; yaw: number; pitch: number } {
  const yaw = hasTurret ? aimYaw : vehYaw;
  const pitch = hasTurret ? Math.max(-0.35, Math.min(0.9, aimPitch)) : Math.max(-0.1, Math.min(0.25, aimPitch * 0.3));
  return { x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch), yaw, pitch };
}

/** Ballistic position after t seconds (no drag). */
export function ballistic(p0: { x: number; y: number; z: number }, v0: { x: number; y: number; z: number }, grav: number, t: number) {
  return { x: p0.x + v0.x * t, y: p0.y + v0.y * t - 0.5 * grav * t * t, z: p0.z + v0.z * t };
}

/** Damage a mob takes from a weapon hit at `dist` blocks from the blast
 *  centre (0 = direct hit). Blast falls off linearly to the radius. */
export function mobDamage(w: WeaponSpec, dist = 0, laserDt = 0): number {
  if (w.kind === "laser") return w.dmg * laserDt * 10; // dmg per 0.1 s of beam
  if (dist <= 0.75) return w.dmg;
  if (w.blast <= 0 || dist > w.blast + 0.75) return 0;
  return Math.max(1, Math.round(w.dmg * (1 - (dist - 0.75) / (w.blast + 0.75)) ));
}

/** Laser heat on a block: seconds of beam before it gives way, by hardness. */
export function laserBurnTime(hard: number): number {
  return 0.35 + Math.max(0, hard) * 0.55;
}

/** Village rules: what the hit counts as. A block in a village that isn't
 *  yours is "break" (one crime per volley, not per piece); striking a
 *  villager or golem is "assault". Outside villages: nothing. */
export function crimeOf(target: "block" | "villager" | "golem" | "mob", inVillage: boolean, ownBlock = false): "break" | "assault" | null {
  if (!inVillage) return null;
  if (target === "villager" || target === "golem") return "assault";
  if (target === "block" && !ownBlock) return "break";
  return null;
}

/** HUD readout for the dashboard. */
export function weaponLabel(st: WeaponState, ammoHave: number, now: number): string {
  const w = WEAPONS[st.id];
  if (!w) return "";
  if (w.kind === "laser") return w.name + " · heat " + Math.round(st.heat * 100) + "%" + (st.overheated ? " OVERHEAT" : "");
  if (w.kind === "rocketPod" && now < st.reloadUntil) return w.name + " · reloading";
  return w.name + " · " + (Number.isFinite(ammoHave) ? ammoHave : "∞");
}
