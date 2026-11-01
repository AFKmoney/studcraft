import { test } from "node:test";
import assert from "node:assert/strict";
import { BT_DATA_LEN, USB_DATA_LEN, buildBtReport, buildUsbReport, crc32, encodeFx, isDualSense, transportOf } from "./dualsense.ts";
import { pickTriggers } from "./triggerFx.ts";

test("crc32 matches the IEEE check value", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  assert.equal(crc32(new Uint8Array(0)), 0);
});

test("trigger blocks encode zone modes", () => {
  assert.deepEqual([...encodeFx({ mode: "off" })], new Array(11).fill(0));
  const fb = encodeFx({ mode: "feedback", start: 2, strength: 8 });
  assert.equal(fb[0], 0x21);
  assert.equal(fb[1] | (fb[2] << 8), 0b1111111100);
  // zone 2 strength 8 → (7) << 6
  assert.equal(fb[3] | (fb[4] << 8) | (fb[5] << 16) | (fb[6] << 24), 0b111111111111111111111111000000 | 0);
  const w = encodeFx({ mode: "weapon", start: 3, end: 6, strength: 5 });
  assert.deepEqual([...w.subarray(0, 4)], [0x25, (1 << 3) | (1 << 6), 0, 4]);
  const v = encodeFx({ mode: "vibrate", start: 0, amplitude: 1, freq: 30 });
  assert.equal(v[0], 0x26);
  assert.equal(v[1] | (v[2] << 8), 0x3ff);
  assert.equal(v[9], 30);
  const s = encodeFx({ mode: "slope", start: 1, end: 8, from: 1, to: 7 });
  assert.equal(s[0], 0x21);
  assert.equal(s[1] & 1, 0, "zone 0 is free travel");
  // clamping never throws on garbage
  assert.equal(encodeFx({ mode: "weapon", start: NaN, end: 99, strength: 99 })[0], 0x25);
});

test("USB report 0x02 layout", () => {
  const r = buildUsbReport({ mode: "feedback", start: 0, strength: 8 }, { mode: "weapon", start: 2, end: 5, strength: 8 });
  assert.equal(r.length, USB_DATA_LEN);
  assert.equal(r[0], 0x0c);
  assert.equal(r[10], 0x21);
  assert.equal(r[21], 0x25);
});

test("Bluetooth report 0x31 layout and CRC", () => {
  const r = buildBtReport({ mode: "feedback", start: 0, strength: 8 }, { mode: "off" }, 3);
  assert.equal(r.length, BT_DATA_LEN);
  assert.equal(r[0], 0x30);
  assert.equal(r[1], 0x10);
  assert.equal(r[2], 0x0c);
  assert.equal(r[12], 0x21);
  const head = new Uint8Array([0xa2, 0x31, ...r.subarray(0, 73)]);
  const crc = crc32(head);
  assert.equal(r[73] | (r[74] << 8) | (r[75] << 16) | ((r[76] << 24) >>> 0), crc | 0);
  // Seq wraps in 4 bits and changes the CRC.
  assert.equal(buildBtReport({ mode: "off" }, { mode: "off" }, 17)[0], 0x10);
  assert.notDeepEqual(buildBtReport({ mode: "off" }, { mode: "off" }, 1).subarray(73), buildBtReport({ mode: "off" }, { mode: "off" }, 2).subarray(73));
});

test("transport and device detection", () => {
  assert.equal(transportOf({ collections: [{ outputReports: [{ reportId: 0x31 }] }] }), "bt");
  assert.equal(transportOf({ collections: [{ outputReports: [{ reportId: 0x02 }] }] }), "usb");
  assert.equal(transportOf({}), null);
  assert.ok(isDualSense({ vendorId: 0x054c, productId: 0x0ce6 }));
  assert.ok(isDualSense({ vendorId: 0x054c, productId: 0x0df2 }));
  assert.ok(!isDualSense({ vendorId: 0x054c, productId: 0x09cc }));
});

test("trigger effects follow the play state", () => {
  assert.deepEqual(pickTriggers({ playing: false, held: "bow" }), { right: { mode: "off" }, left: { mode: "off" } });
  assert.equal(pickTriggers({ playing: true, held: "bow" }).left.mode, "slope");
  assert.equal(pickTriggers({ playing: true, held: "crossbow", xbSince: 9, xbCycle: 1 }).left.mode, "weapon");
  assert.equal(pickTriggers({ playing: true, held: "crossbow", xbSince: 0.2, xbCycle: 1 }).left.mode, "off");
  const gun = { auto: false, kick: 0.7, interval: 0.4, sinceShot: 5, reloading: false, empty: false, firing: false };
  assert.equal(pickTriggers({ playing: true, gun }).left.mode, "weapon");
  assert.deepEqual(pickTriggers({ playing: true, gun: { ...gun, sinceShot: 0.02 } }).left, { mode: "feedback", start: 0, strength: 8 });
  assert.equal(pickTriggers({ playing: true, gun: { ...gun, auto: true, firing: true, interval: 0.11 } }).left.mode, "vibrate");
  assert.equal(pickTriggers({ playing: true, gun: { ...gun, reloading: true } }).left.mode, "off");
  const veh = { weapon: null, speed: 1, sinceShot: 9, firing: false } as const;
  const v0 = pickTriggers({ playing: true, veh: { ...veh, speed: 0 } });
  const v1 = pickTriggers({ playing: true, veh });
  assert.ok(v1.right.mode === "feedback" && v0.right.mode === "feedback" && v1.right.strength > v0.right.strength, "accelerator stiffens with speed");
  assert.equal(v1.left.mode, "feedback");
  assert.equal(pickTriggers({ playing: true, veh: { ...veh, weapon: "cannon" } }).right.mode, "weapon");
  assert.equal(pickTriggers({ playing: true, veh: { ...veh, weapon: "cannon", sinceShot: 0.05 } }).right.mode, "feedback");
  assert.equal(pickTriggers({ playing: true, veh: { ...veh, weapon: "laser", firing: true } }).right.mode, "vibrate");
  assert.equal(pickTriggers({ playing: true, mining: 0.5 }).right.mode, "feedback");
});
