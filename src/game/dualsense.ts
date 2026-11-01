// DualSense adaptive triggers over WebHID — progressive enhancement.
// Chrome/Edge on desktop and the Electron desktop shell expose navigator.hid
// (the shell grants 054c:0ce6 / 054c:0df2 in its main process, so the pad is
// picked up without a picker). Everywhere else this module reports
// "unavailable" and the pad plays exactly as before.
//
// Protocol (Linux hid-playstation structs):
//  · USB  — output report 0x02, 63 bytes with the id → 62 data bytes:
//           common[47] then 15 reserved bytes.
//  · BT   — output report 0x31, 78 bytes with the id → 77 data bytes:
//           seq_tag (seq<<4), tag 0x10, common[47], 24 reserved, CRC32 LE.
//           CRC32 runs over [0xA2, 0x31, data[0..72]].
//  common: [0] valid_flag0 (0x04 right trigger, 0x08 left trigger),
//          [10..20] RIGHT trigger block, [21..31] LEFT trigger block.
// Trigger blocks (11 bytes, mode first) use the zone-based modes:
//  0x21 feedback (per-zone strength), 0x25 weapon (section), 0x26 vibration.

export type TriggerFx =
  | { mode: "off" }
  /** constant resistance from `start` (0-9) with `strength` 1-8 */
  | { mode: "feedback"; start: number; strength: number }
  /** resistance that ramps from strength a at zone start to b at zone end (bow draw) */
  | { mode: "slope"; start: number; end: number; from: number; to: number }
  /** a wall between start (2-7) and end (start+1..8) that snaps — a trigger break */
  | { mode: "weapon"; start: number; end: number; strength: number }
  /** buzz from `start` with amplitude 1-8 at `freq` Hz (automatic fire, laser) */
  | { mode: "vibrate"; start: number; amplitude: number; freq: number };

export type DsState = "unavailable" | "off" | "ready" | "connected";
export type Transport = "usb" | "bt";

export const DS_VENDOR = 0x054c;
export const DS_PRODUCTS = [0x0ce6, 0x0df2]; // DualSense, DualSense Edge
export const USB_REPORT_ID = 0x02;
export const USB_DATA_LEN = 62;
export const BT_REPORT_ID = 0x31;
export const BT_DATA_LEN = 77;

const clampI = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number.isFinite(v) ? v : lo)));

/** Encode one 11-byte trigger block. */
export function encodeFx(fx: TriggerFx): Uint8Array {
  const b = new Uint8Array(11);
  const zones = (strengthAt: (i: number) => number, mode: number) => {
    let active = 0;
    let force = 0;
    for (let i = 0; i < 10; i++) {
      const s = strengthAt(i);
      if (s <= 0) continue;
      active |= 1 << i;
      force += ((s - 1) & 7) * 2 ** (3 * i);
    }
    b[0] = mode;
    b[1] = active & 0xff;
    b[2] = (active >> 8) & 0xff;
    for (let k = 0; k < 4; k++) b[3 + k] = Math.floor(force / 2 ** (8 * k)) & 0xff;
  };
  switch (fx.mode) {
    case "feedback": {
      const st = clampI(fx.start, 0, 9);
      const s = clampI(fx.strength, 0, 8);
      if (s === 0) return b;
      zones((i) => (i >= st ? s : 0), 0x21);
      return b;
    }
    case "slope": {
      const st = clampI(fx.start, 0, 8);
      const en = clampI(fx.end, st + 1, 9);
      const a = clampI(fx.from, 1, 8);
      const z = clampI(fx.to, 1, 8);
      zones((i) => (i < st ? 0 : i >= en ? z : Math.round(a + ((z - a) * (i - st)) / (en - st))), 0x21);
      return b;
    }
    case "weapon": {
      const st = clampI(fx.start, 2, 7);
      const en = clampI(fx.end, st + 1, 8);
      const s = clampI(fx.strength, 0, 8);
      if (s === 0) return b;
      const z = (1 << st) | (1 << en);
      b[0] = 0x25;
      b[1] = z & 0xff;
      b[2] = (z >> 8) & 0xff;
      b[3] = s - 1;
      return b;
    }
    case "vibrate": {
      const st = clampI(fx.start, 0, 9);
      const amp = clampI(fx.amplitude, 0, 8);
      const hz = clampI(fx.freq, 1, 255);
      if (amp === 0) return b;
      zones((i) => (i >= st ? amp : 0), 0x26);
      b[9] = hz;
      return b;
    }
    default:
      return b; // mode 0x00 = off
  }
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** Standard CRC-32 (IEEE, reflected), optionally continuing from `seed` state. */
export function crc32(bytes: Uint8Array, seed = 0xffffffff): number {
  let c = seed >>> 0;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function commonStruct(right: TriggerFx, left: TriggerFx): Uint8Array {
  const d = new Uint8Array(47);
  d[0] = 0x04 | 0x08; // valid_flag0: right + left trigger effect sections
  d.set(encodeFx(right), 10);
  d.set(encodeFx(left), 21);
  return d;
}

/** USB output report 0x02 payload (without the report id). */
export function buildUsbReport(right: TriggerFx, left: TriggerFx): Uint8Array {
  const d = new Uint8Array(USB_DATA_LEN);
  d.set(commonStruct(right, left), 0);
  return d;
}

/** Bluetooth output report 0x31 payload (without the report id), CRC included. */
export function buildBtReport(right: TriggerFx, left: TriggerFx, seq: number): Uint8Array {
  const d = new Uint8Array(BT_DATA_LEN);
  d[0] = (seq & 0x0f) << 4;
  d[1] = 0x10; // DS_OUTPUT_TAG
  d.set(commonStruct(right, left), 2);
  const head = new Uint8Array(2 + BT_DATA_LEN - 4);
  head[0] = 0xa2;
  head[1] = BT_REPORT_ID;
  head.set(d.subarray(0, BT_DATA_LEN - 4), 2);
  const crc = crc32(head);
  d[73] = crc & 0xff;
  d[74] = (crc >>> 8) & 0xff;
  d[75] = (crc >>> 16) & 0xff;
  d[76] = (crc >>> 24) & 0xff;
  return d;
}

type HidCollection = { outputReports?: { reportId: number }[] };
type HidDeviceLike = {
  vendorId: number;
  productId: number;
  opened: boolean;
  collections?: HidCollection[];
  open: () => Promise<void>;
  close: () => Promise<void>;
  sendReport: (reportId: number, data: BufferSource) => Promise<void>;
  receiveFeatureReport?: (reportId: number) => Promise<DataView>;
};
type HidLike = {
  requestDevice: (opts: { filters: { vendorId: number; productId?: number }[] }) => Promise<HidDeviceLike[]>;
  getDevices: () => Promise<HidDeviceLike[]>;
  addEventListener: (type: string, fn: (e: { device: HidDeviceLike }) => void) => void;
};

/** Which framing a device speaks — from its HID descriptor when exposed. */
export function transportOf(dev: { collections?: HidCollection[] }): Transport | null {
  const ids = new Set<number>();
  for (const c of dev.collections ?? []) for (const r of c.outputReports ?? []) ids.add(r.reportId);
  if (ids.has(BT_REPORT_ID)) return "bt";
  if (ids.has(USB_REPORT_ID)) return "usb";
  return null;
}

export const isDualSense = (d: { vendorId: number; productId: number }) => d.vendorId === DS_VENDOR && DS_PRODUCTS.includes(d.productId);

let device: HidDeviceLike | null = null;
let transport: Transport | null = null;
let lastKey = "";
let lastSentAt = 0;
let seq = 0;
let listening = false;

function hid(): HidLike | null {
  if (typeof navigator === "undefined") return null;
  return (navigator as unknown as { hid?: HidLike }).hid ?? null;
}

export function dsSupported(): boolean {
  return !!hid();
}

export function dsState(enabled: boolean): DsState {
  if (!dsSupported()) return "unavailable";
  if (device) return "connected";
  return enabled ? "ready" : "off";
}

function listen(h: HidLike) {
  if (listening) return;
  listening = true;
  h.addEventListener("disconnect", (e) => {
    if (e.device === device) {
      device = null;
      transport = null;
    }
  });
  // Plugged in (or paired) mid-game: the Electron shell has already granted it.
  h.addEventListener("connect", (e) => {
    if (!device && isDualSense(e.device)) void attach(e.device);
  });
}

async function attach(dev: HidDeviceLike): Promise<boolean> {
  try {
    if (!dev.opened) await dev.open();
    transport = transportOf(dev);
    // Over Bluetooth the pad starts in "simple" mode and ignores 0x31 until
    // the calibration feature report has been read once.
    if (transport !== "usb") await dev.receiveFeatureReport?.(0x05).catch(() => undefined);
    device = dev;
    lastKey = "";
    return true;
  } catch {
    return false;
  }
}

const FILTERS = DS_PRODUCTS.map((productId) => ({ vendorId: DS_VENDOR, productId }));

/** Opens the browser picker — must run from a user gesture. In Electron the shell answers it. */
export async function dsRequest(): Promise<boolean> {
  const h = hid();
  if (!h) return false;
  listen(h);
  if (device) return true;
  await dsTryReconnect();
  if (device) return true;
  try {
    const devs = await h.requestDevice({ filters: FILTERS });
    for (const d of devs) if (await attach(d)) return true;
    return false;
  } catch {
    return false;
  }
}

/** Re-open an already-granted device (no gesture needed; Electron grants on its own). */
export async function dsTryReconnect(): Promise<boolean> {
  const h = hid();
  if (!h) return false;
  listen(h);
  if (device) return true;
  try {
    const devs = await h.getDevices();
    for (const d of devs) if (isDualSense(d) && (await attach(d))) return true;
  } catch {
    /* not granted yet */
  }
  return false;
}

const OFF: TriggerFx = { mode: "off" };

/** Triggers back to neutral (pause, focus loss, quit). Device stays open. */
export function dsReset(): Promise<void> {
  return dsApply(OFF, OFF, true);
}

export async function dsRelease(): Promise<void> {
  if (!device) return;
  await dsReset();
  try {
    await device.close();
  } catch {
    /* already gone */
  }
  device = null;
  transport = null;
}

async function send(dev: HidDeviceLike, right: TriggerFx, left: TriggerFx) {
  const bt = () => dev.sendReport(BT_REPORT_ID, buildBtReport(right, left, seq++) as unknown as BufferSource);
  const usb = () => dev.sendReport(USB_REPORT_ID, buildUsbReport(right, left) as unknown as BufferSource);
  if (transport === "bt") return bt();
  if (transport === "usb") return usb();
  // Descriptor not exposed: try USB framing, learn from what the pad accepts.
  try {
    await usb();
    transport = "usb";
  } catch {
    await bt();
    transport = "bt";
  }
}

/**
 * Apply trigger effects. Deduped by value and rate-limited (the caller runs
 * every frame, so a change dropped here goes out a frame later). A transport
 * failure just drops the effect — never throws.
 */
export function dsApply(right: TriggerFx, left: TriggerFx, force = false): Promise<void> {
  if (!device) return Promise.resolve();
  const key = JSON.stringify([right, left]);
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (!force && (key === lastKey || now - lastSentAt < 30)) return Promise.resolve();
  lastKey = key;
  lastSentAt = now;
  return send(device, right, left).catch(() => {
    lastKey = ""; // retry next frame
  });
}
