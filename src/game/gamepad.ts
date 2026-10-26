// Controller support shared by the engine (gameplay) and the UI (menu navigation).
// Uses the W3C "standard" gamepad layout, which Chrome, Edge, Firefox and Safari
// (desktop + Android + iOS) expose for Xbox, PlayStation (DualShock 4 / DualSense),
// Switch Pro and most generic pads.

export const BTN = {
  A: 0, // Xbox A · PlayStation Cross
  B: 1, // Xbox B · PlayStation Circle
  X: 2, // Xbox X · PlayStation Square
  Y: 3, // Xbox Y · PlayStation Triangle
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  VIEW: 8, // Back / View / Share / Create
  START: 9, // Start / Menu / Options
  L3: 10,
  R3: 11,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
} as const;

export type PadFamily = "xbox" | "playstation" | "switch" | "generic";

export function padFamily(id: string): PadFamily {
  const s = id.toLowerCase();
  if (s.includes("054c") || s.includes("dualsense") || s.includes("dualshock") || s.includes("playstation") || s.includes("wireless controller")) return "playstation";
  if (s.includes("057e") || s.includes("pro controller") || s.includes("nintendo") || s.includes("joy-con")) return "switch";
  if (s.includes("045e") || s.includes("xbox") || s.includes("xinput")) return "xbox";
  return "generic";
}

export function padLabel(id: string) {
  const f = padFamily(id);
  if (f === "playstation") return id.toLowerCase().includes("dualsense") || id.includes("0ce6") ? "DualSense" : "PlayStation controller";
  if (f === "xbox") return "Xbox controller";
  if (f === "switch") return "Switch Pro controller";
  return "Controller";
}

/** The connected pad that was used most recently (phones often report it at a slot other than 0). */
export function activePad(): Gamepad | null {
  let pads: (Gamepad | null)[] = [];
  try {
    pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
  } catch {
    return null; // blocked by a permissions policy
  }
  let best: Gamepad | null = null;
  for (const p of pads) {
    if (!p || !p.connected || p.axes.length < 2 || p.buttons.length < 4) continue;
    if (!best || p.timestamp > best.timestamp) best = p;
  }
  return best;
}

export function btn(p: Gamepad | null, i: number, threshold = 0.45) {
  const b = p?.buttons[i];
  return !!b && (b.pressed || b.value > threshold);
}

/** Rescales a stick past its dead zone and applies a gentle response curve. */
export function stick(x: number, y: number, dead = 0.16, curve = 1.5) {
  const m = Math.hypot(x, y);
  if (m < dead) return { x: 0, y: 0, m: 0 };
  const lin = Math.min(1, (m - dead) / (1 - dead));
  const out = Math.pow(lin, curve);
  return { x: (x / m) * out, y: (y / m) * out, m: out };
}

/** True when any button or stick is being used — marks the controller as the active input. */
export function padBusy(p: Gamepad | null) {
  if (!p) return false;
  for (let i = 0; i < p.buttons.length; i++) if (p.buttons[i].pressed || p.buttons[i].value > 0.3) return true;
  for (let i = 0; i < Math.min(4, p.axes.length); i++) if (Math.abs(p.axes[i]) > 0.35) return true;
  return false;
}

/** Edge detection with "held at hand-over" suppression (a Start press that opened
 *  the pause menu must not also count as a fresh press inside it). */
export class PadEdges {
  private prev: boolean[] = [];
  private blocked = new Set<number>();
  update(p: Gamepad | null) {
    const now: boolean[] = [];
    if (p) for (let i = 0; i < p.buttons.length; i++) now[i] = btn(p, i);
    const prev = this.prev;
    for (const i of [...this.blocked]) if (!now[i]) this.blocked.delete(i);
    const blocked = new Set(this.blocked);
    this.prev = now;
    return {
      down: (i: number) => !!now[i] && !blocked.has(i),
      pressed: (i: number) => !!now[i] && !prev[i] && !blocked.has(i),
    };
  }
  /** Ignore every button currently held until it is released. */
  blockHeld(p: Gamepad | null) {
    if (!p) return;
    for (let i = 0; i < p.buttons.length; i++) if (btn(p, i)) this.blocked.add(i);
  }
}

export function rumble(p: Gamepad | null, strong: number, weak: number, ms: number) {
  const act = (p as (Gamepad & { vibrationActuator?: { playEffect?: (t: string, o: object) => Promise<unknown> } }) | null)?.vibrationActuator;
  if (!act?.playEffect) return;
  try {
    void act.playEffect("dual-rumble", { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
  } catch {
    /* unsupported effect */
  }
}
