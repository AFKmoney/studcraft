// t91u (Grok Bot): firearm logic, pure and tested. Cartridges are crafted
// (casing + powder + bullet); a gun holds a magazine, fires one round per
// shot (auto weapons while the trigger is held), reloads from the
// inventory in a timed animation, kicks, flashes, and wears 1 use per shot.

export type GunSpec = {
  ammo: string; // item key in accessories ("" = none: magic)
  mag: number;
  reload: number; // s
  interval: number; // s between shots
  auto: boolean;
  dmg: number;
  speed: number; // blocks/s
  spread: number; // rad
  kick: number; // recoil 0..1
  grav: number; // projectile gravity
  energy?: boolean; // blaster bolt instead of a bullet + smoke flash
};

export const GUNS: Record<string, GunSpec> = {
  Flintlock: { ammo: "Cartridge", mag: 1, reload: 2.2, interval: 0.4, auto: false, dmg: 10, speed: 60, spread: 0.035, kick: 0.7, grav: 2 },
  Musket: { ammo: "Cartridge", mag: 1, reload: 2.8, interval: 0.5, auto: false, dmg: 13, speed: 75, spread: 0.025, kick: 0.85, grav: 2 },
  Revolver: { ammo: "Cartridge", mag: 6, reload: 2.0, interval: 0.32, auto: false, dmg: 8, speed: 80, spread: 0.02, kick: 0.55, grav: 1.5 },
  Carbine: { ammo: "Cartridge", mag: 20, reload: 1.6, interval: 0.11, auto: true, dmg: 6, speed: 95, spread: 0.014, kick: 0.3, grav: 1 },
  Rifle: { ammo: "Cartridge", mag: 5, reload: 2.2, interval: 0.75, auto: false, dmg: 15, speed: 140, spread: 0.003, kick: 0.75, grav: 0.6 },
  BlasterS: { ammo: "PowerCell", mag: 12, reload: 1.2, interval: 0.25, auto: false, dmg: 5, speed: 45, spread: 0.02, kick: 0.25, grav: 0, energy: true },
  BlasterM: { ammo: "PowerCell", mag: 20, reload: 1.4, interval: 0.16, auto: true, dmg: 6, speed: 50, spread: 0.018, kick: 0.25, grav: 0, energy: true },
  BlasterL: { ammo: "PowerCell", mag: 30, reload: 1.8, interval: 0.12, auto: true, dmg: 7, speed: 55, spread: 0.012, kick: 0.3, grav: 0, energy: true },
  Launcher: { ammo: "Firework rocket", mag: 1, reload: 2.5, interval: 0.6, auto: false, dmg: 16, speed: 28, spread: 0.01, kick: 1, grav: 3 },
  Wand: { ammo: "", mag: Infinity, reload: 0, interval: 0.55, auto: false, dmg: 5, speed: 30, spread: 0.01, kick: 0.15, grav: 0, energy: true },
};

export type GunState = { mag: number; lastShot: number; reloadUntil: number };
export const newGun = (s: GunSpec): GunState => ({ mag: s.ammo ? 0 : Infinity, lastShot: -1e9, reloadUntil: 0 });

export type FireResult = "fired" | "cooldown" | "reloading" | "empty";
/** Try to fire at time `now`; mutates `st` on success. `held` = trigger held since a previous frame. */
export function tryFire(s: GunSpec, st: GunState, now: number, held = false): FireResult {
  if (now < st.reloadUntil) return "reloading";
  if (held && !s.auto) return "cooldown";
  if (now - st.lastShot < s.interval) return "cooldown";
  if (st.mag <= 0) return "empty";
  st.mag -= 1;
  st.lastShot = now;
  return "fired";
}

/** Start a reload; returns rounds to take from the inventory (0 = nothing to do). Rounds land when the timer ends. */
export function startReload(s: GunSpec, st: GunState, now: number, have: number): number {
  if (!s.ammo || now < st.reloadUntil || st.mag >= s.mag) return 0;
  const take = Math.min(s.mag - st.mag, Math.max(0, have));
  if (take <= 0) return 0;
  st.reloadUntil = now + s.reload;
  return take;
}
export function finishReload(st: GunState, take: number) {
  st.mag += take;
}

/** Recoil curve: instant kick, ~0.18 s decay. */
export const recoilAt = (s: GunSpec, since: number) => (since < 0 ? 0 : since < 0.03 ? s.kick : s.kick * Math.max(0, 1 - (since - 0.03) / 0.18));
/** Muzzle flash visible for 50 ms; returns its scale (0 = hidden). */
export const flashAt = (since: number) => (since >= 0 && since < 0.05 ? 1 - since / 0.05 * 0.6 : 0);
/** Reload pose 0..1..0 (gun dips and tilts, then comes back). */
export const reloadPose = (s: GunSpec, st: GunState, now: number) => {
  if (now >= st.reloadUntil || s.reload <= 0) return 0;
  const p = 1 - (st.reloadUntil - now) / s.reload;
  return Math.sin(Math.min(1, Math.max(0, p)) * Math.PI);
};
/** Damage with range falloff (full to 24 blocks, 50 % at 64+). */
export const damageAt = (s: GunSpec, dist: number) => Math.max(1, Math.round(s.dmg * (dist <= 24 ? 1 : Math.max(0.5, 1 - (dist - 24) / 80))));
/** HUD ammo text. */
export const ammoLabel = (s: GunSpec, st: GunState, reserve: number, now: number) =>
  !s.ammo ? "∞" : now < st.reloadUntil ? "reloading…" : `${st.mag}/${s.mag} · ${reserve}`;
