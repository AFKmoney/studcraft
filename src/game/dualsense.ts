// DualSense adaptive triggers over WebHID — progressive enhancement.
// Chrome/Edge on desktop expose navigator.hid; everywhere else (Firefox,
// Safari, Android, the APK WebView) this module reports "unavailable" and
// the pad plays exactly as before. The Gamepad API itself has no trigger-
// resistance channel, so WebHID is the only web route to the hardware.
//
// Protocol (USB output report 0x02, from the kernel's hid-playstation
// struct): data[0]=valid_flag0, data[1]=valid_flag1, motors at [2..3],
// then a 28-byte reserved span that carries the two 11-byte trigger
// blocks: RIGHT at data[10..20], LEFT at data[21..31] (mode byte first).
// Bluetooth uses report 0x31: a tag byte, the same common struct shifted
// by one, and a CRC32 (seeded with 0xA2) over the whole frame.
// Trigger modes: 0x00 off · 0x01 feedback [startZone 0-9, strength 0-8] ·
// 0x02 weapon [startZone (>=2), endZone, strength 0-8].

export type TriggerFx =
  | { mode: "off" }
  | { mode: "feedback"; start: number; strength: number }
  | { mode: "weapon"; start: number; end: number; strength: number };

export type DsState = "unavailable" | "off" | "ready" | "connected";

type HidDeviceLike = {
  vendorId: number;
  productId: number;
  opened: boolean;
  open: () => Promise<void>;
  close: () => Promise<void>;
  sendReport: (reportId: number, data: BufferSource) => Promise<void>;
  addEventListener: (type: string, fn: () => void) => void;
};
type HidLike = {
  requestDevice: (opts: { filters: { vendorId: number }[] }) => Promise<HidDeviceLike[]>;
  getDevices: () => Promise<HidDeviceLike[]>;
  addEventListener: (type: string, fn: (e: { device: HidDeviceLike }) => void) => void;
};

const SONY = 0x054c;
let device: HidDeviceLike | null = null;
let lastKey = "";
let lastSentAt = 0;
let seq = 0;

function hid(): HidLike | null {
  const h = (navigator as unknown as { hid?: HidLike }).hid;
  return h ?? null;
}

export function dsSupported(): boolean {
  return !!hid();
}

export function dsState(enabled: boolean): DsState {
  if (!dsSupported()) return "unavailable";
  if (device) return "connected";
  return enabled ? "ready" : "off";
}

async function attach(dev: HidDeviceLike): Promise<boolean> {
  try {
    if (!dev.opened) await dev.open();
    device = dev;
    lastKey = "";
    dev.addEventListener("disconnect", () => {
      if (device === dev) device = null;
    });
    return true;
  } catch {
    return false;
  }
}

/** Must be called from a user gesture (the Settings button click). */
export async function dsRequest(): Promise<boolean> {
  const h = hid();
  if (!h) return false;
  try {
    const devs = await h.requestDevice({ filters: [{ vendorId: SONY }] });
    for (const d of devs) if (await attach(d)) return true;
    return false;
  } catch {
    return false;
  }
}

/** Re-open an already-granted device (no gesture needed). */
export async function dsTryReconnect(): Promise<void> {
  const h = hid();
  if (!h || device) return;
  try {
    const devs = await h.getDevices();
    for (const d of devs) if (d.vendorId === SONY && (await attach(d))) return;
  } catch {
    /* not granted yet */
  }
}

export async function dsRelease(): Promise<void> {
  if (device) {
    await dsApply({ mode: "off" }, { mode: "off" }, true);
    try {
      await device.close();
    } catch {
      /* already gone */
    }
    device = null;
  }
}

function writeFx(buf: Uint8Array, at: number, fx: TriggerFx) {
  if (fx.mode === "feedback") {
    buf[at] = 0x01;
    buf[at + 1] = Math.max(0, Math.min(9, Math.round(fx.start)));
    buf[at + 2] = Math.max(0, Math.min(8, Math.round(fx.strength)));
  } else if (fx.mode === "weapon") {
    buf[at] = 0x02;
    buf[at + 1] = Math.max(2, Math.min(9, Math.round(fx.start)));
    buf[at + 2] = Math.max(0, Math.min(9, Math.round(fx.end)));
    buf[at + 3] = Math.max(0, Math.min(8, Math.round(fx.strength)));
  } else {
    buf[at] = 0x00;
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

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function commonStruct(right: TriggerFx, left: TriggerFx): Uint8Array {
  const d = new Uint8Array(47);
  d[0] = 0x04 | 0x08; // valid_flag0: right + left trigger effect sections
  writeFx(d, 10, right);
  writeFx(d, 21, left);
  return d;
}

/**
 * Apply trigger effects. Deduped by value and rate-limited — safe to call
 * every frame. Fire-and-forget: a transport failure just drops the effect.
 */
export function dsApply(right: TriggerFx, left: TriggerFx, force = false): void {
  if (!device) return;
  const key = JSON.stringify([right, left]);
  const now = performance.now();
  if (!force && (key === lastKey || now - lastSentAt < 50)) return;
  lastKey = key;
  lastSentAt = now;
  const dev = device;
  const common = commonStruct(right, left);
  // USB pads report collections with report 0x02 support; Bluetooth ones
  // use 0x31. WebHID doesn't say which transport — try USB framing first,
  // fall back to BT framing (with CRC) when the device rejects it.
  void dev
    .sendReport(0x02, common as unknown as BufferSource)
    .catch(() => {
      const data = new Uint8Array(78);
      data[0] = ((seq++ & 0x0f) << 4) | 0x01;
      data.set(common, 1);
      const crcInput = new Uint8Array(2 + 78 - 4);
      crcInput[0] = 0xa2;
      crcInput[1] = 0x31;
      crcInput.set(data.subarray(0, 78 - 4), 2);
      const crc = crc32(crcInput);
      data[74] = crc & 0xff;
      data[75] = (crc >>> 8) & 0xff;
      data[76] = (crc >>> 16) & 0xff;
      data[77] = (crc >>> 24) & 0xff;
      return dev.sendReport(0x31, data as unknown as BufferSource);
    })
    .catch(() => {
      /* pad refused both framings — effects stay off, no crash */
    });
}
