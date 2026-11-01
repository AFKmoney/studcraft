/**
 * B19 (Philippe): LEGO-style minifig crossbow — pure geometry + animation
 * data, so the shape and the draw/fire/reload cycle are testable without
 * three.js. Model frame: stock along X (butt −X, muzzle +X), Y up,
 * prod across Z. Everything procedural.
 */
export const XB = {
  /** stock: slim bar */
  stock: { len: 0.24, h: 0.03, w: 0.028, x: -0.02 },
  /** grip block under the stock, sized for the minifig hand clip */
  grip: { w: 0.03, h: 0.062, d: 0.03, x: -0.07, y: -0.046 },
  /** prod: curved, horizontal, centred at prodX on the stock */
  prodX: 0.085,
  prodY: 0.018,
  prodHalf: 0.125, // half span along Z
  prodSweep: 0.035, // tips swept back (−X) — the curve
  prodSegs: 4,
  prodR: 0.009,
  tipR: 0.014, // rounded tip knobs
  /** nut/notch on the stock: where the drawn string rests */
  nutX: -0.025,
  stringR: 0.0028,
  bolt: { len: 0.13, r: 0.006 },
} as const;

/** Point on the prod arc for u ∈ [-1, 1] (−1 = left tip, +1 = right tip),
 *  flex ∈ [−1, 1] bends tips further back (+) or forward (−). */
export function prodPoint(u: number, flex = 0): { x: number; y: number; z: number } {
  const sweep = XB.prodSweep * (1 + 0.6 * flex);
  return { x: XB.prodX - sweep * u * u, y: XB.prodY, z: XB.prodHalf * u * (1 - 0.06 * flex) };
}

export type XbPhase = "drawn" | "fire" | "reload" | "slack";
export const XB_FIRE = 0.12; // string snap + recoil
export const XB_RELOAD = 0.55; // short cock-back after the shot
export const XB_CYCLE = XB_FIRE + XB_RELOAD;

export type XbPose = {
  phase: XbPhase;
  /** X of the string's centre (nut when drawn, near the prod when slack) */
  stringX: number;
  /** prod tip flex: +1 drawn (tips pulled back), negative = forward snap */
  flex: number;
  bolt: boolean;
  /** recoil kick 0..1 (arms + crossbow push back, muzzle up) */
  kick: number;
};

const slackX = () => prodPoint(1, 0).x - 0.004;
const ease = (t: number) => t * t * (3 - 2 * t);

/** Pose `since` seconds after the last shot (Infinity = never shot).
 *  `loaded` = an arrow is available to sit on the stock. */
export function xbPose(since: number, loaded: boolean): XbPose {
  if (since < XB_FIRE) {
    const t = since / XB_FIRE;
    // string snaps from the nut to slack in the first third, prod tips
    // overshoot forward then settle
    const s = Math.min(1, t * 3);
    return {
      phase: "fire",
      stringX: XB.nutX + (slackX() + 0.012 * Math.sin(t * Math.PI) - XB.nutX) * ease(s),
      flex: 1 - 1.5 * Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.75),
      bolt: false,
      kick: Math.sin(t * Math.PI * 0.5),
    };
  }
  if (since < XB_CYCLE && loaded) {
    const t = (since - XB_FIRE) / XB_RELOAD;
    const e = ease(t);
    return { phase: "reload", stringX: slackX() + (XB.nutX - slackX()) * e, flex: -0.3 + 1.3 * e, bolt: t > 0.7, kick: (1 - t) * (1 - t) * 0.6 };
  }
  if (!loaded) return { phase: "slack", stringX: slackX(), flex: 0, bolt: false, kick: since < XB_CYCLE ? 1 - (since - XB_FIRE) / XB_RELOAD : 0 };
  return { phase: "drawn", stringX: XB.nutX, flex: 1, bolt: true, kick: 0 };
}

/** One string half from a tip to the centre: midpoint, length, yaw about Y. */
export function stringHalf(side: 1 | -1, pose: XbPose): { x: number; y: number; z: number; len: number; yaw: number } {
  const tip = prodPoint(side, pose.flex);
  const cx = pose.stringX;
  const dx = cx - tip.x, dz = 0 - tip.z;
  return { x: (tip.x + cx) / 2, y: tip.y, z: tip.z / 2, len: Math.hypot(dx, dz), yaw: Math.atan2(-dz, dx) };
}
