// What the DualSense triggers should feel like right now — a pure function
// of the play state, so it is unit-tested without a pad.
// Controls: R2 = mine / vehicle fire (or accelerator in an unarmed vehicle),
// L2 = place / bow, crossbow and guns / vehicle brake.
import type { TriggerFx } from "./dualsense";

export type TrigGun = { auto: boolean; kick: number; interval: number; sinceShot: number; reloading: boolean; empty: boolean; firing: boolean };
export type TrigVeh = {
  /** weapon kind of the first mounted arm, or null for an unarmed vehicle */
  weapon: "cannon" | "goldCannon" | "laser" | "rocketPod" | null;
  /** |speed| / top speed, 0..1 */
  speed: number;
  sinceShot: number;
  firing: boolean;
  overheated?: boolean;
};
export type TrigCtx = {
  playing: boolean;
  mining?: number; // 0..1 crack progress while R2 mines, 0 when not mining
  held?: "bow" | "crossbow" | null;
  /** seconds since the crossbow fired; < cycle while it cocks back */
  xbSince?: number;
  xbCycle?: number;
  gun?: TrigGun | null;
  veh?: TrigVeh | null;
};

export const OFF: TriggerFx = { mode: "off" };
const RECOIL_S = 0.09;

function gunFx(g: TrigGun): TriggerFx {
  if (g.reloading || g.empty) return OFF;
  // The kick of each shot: the trigger slams to full resistance for a beat.
  if (g.sinceShot < RECOIL_S) return { mode: "feedback", start: 0, strength: 8 };
  if (g.auto && g.firing) return { mode: "vibrate", start: 2, amplitude: 5 + Math.round(g.kick * 3), freq: Math.round(Math.min(40, Math.max(6, 1 / Math.max(0.025, g.interval)))) };
  // Semi-auto: a trigger break — heavier for hard-kicking guns.
  return { mode: "weapon", start: 3, end: 6, strength: Math.max(3, Math.min(8, Math.round(3 + g.kick * 6))) };
}

function vehFireFx(v: TrigVeh): TriggerFx {
  if (v.overheated) return OFF;
  switch (v.weapon) {
    case "laser":
      return v.firing ? { mode: "vibrate", start: 1, amplitude: 4, freq: 35 } : { mode: "feedback", start: 2, strength: 2 };
    case "rocketPod":
      if (v.sinceShot < RECOIL_S) return { mode: "feedback", start: 0, strength: 7 };
      return v.firing ? { mode: "vibrate", start: 2, amplitude: 5, freq: 3 } : { mode: "weapon", start: 3, end: 6, strength: 5 };
    case "cannon":
    case "goldCannon": {
      const heavy = v.weapon === "goldCannon";
      if (v.sinceShot < (heavy ? 0.18 : 0.12)) return { mode: "feedback", start: 0, strength: 8 };
      return { mode: "weapon", start: heavy ? 4 : 3, end: heavy ? 8 : 7, strength: heavy ? 8 : 6 };
    }
    default:
      return OFF;
  }
}

export function pickTriggers(c: TrigCtx): { right: TriggerFx; left: TriggerFx } {
  if (!c.playing) return { right: OFF, left: OFF };
  if (c.veh) {
    const v = c.veh;
    const sp = Math.max(0, Math.min(1, v.speed));
    // Accelerator: light, firmer as the machine speeds up. Brake: a firm pedal.
    const right: TriggerFx = v.weapon ? vehFireFx(v) : { mode: "feedback", start: 1, strength: 1 + Math.round(sp * 4) };
    const left: TriggerFx = { mode: "feedback", start: 1, strength: 3 + Math.round(sp * 5) };
    return { right, left };
  }
  const right: TriggerFx = c.mining && c.mining > 0 ? { mode: "feedback", start: 1, strength: Math.round(1 + Math.min(1, c.mining) * 7) } : OFF;
  let left: TriggerFx = OFF;
  if (c.gun) left = gunFx(c.gun);
  else if (c.held === "bow") left = { mode: "slope", start: 1, end: 8, from: 1, to: 7 }; // string tension builds
  else if (c.held === "crossbow") {
    const cocking = (c.xbSince ?? 1e9) < (c.xbCycle ?? 0);
    left = cocking ? OFF : { mode: "weapon", start: 4, end: 6, strength: 8 }; // stiff latch that snaps
  }
  return { right, left };
}
