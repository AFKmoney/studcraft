"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { allowDualSense, isDualSense, fromGame } = require("./hid.cjs");

test("only DualSense pads from the game origin are granted", () => {
  const h = {};
  const ses = {
    setPermissionCheckHandler: (f) => (h.check = f),
    setDevicePermissionHandler: (f) => (h.device = f),
    on: (ev, f) => (h[ev] = f),
  };
  allowDualSense(ses);
  assert.equal(h.check(null, "hid", "app://game"), true);
  assert.equal(h.check(null, "hid", "https://evil.example"), false);
  assert.equal(h.device({ deviceType: "hid", origin: "app://game", device: { vendorId: 0x054c, productId: 0x0ce6 } }), true);
  assert.equal(h.device({ deviceType: "hid", origin: "app://game", device: { vendorId: 0x054c, productId: 0x0df2 } }), true);
  assert.equal(h.device({ deviceType: "hid", origin: "app://game", device: { vendorId: 0x046d, productId: 0xc52b } }), false);
  assert.equal(h.device({ deviceType: "usb", origin: "app://game", device: { vendorId: 0x054c, productId: 0x0ce6 } }), false);
  let picked = null, prevented = false;
  h["select-hid-device"]({ preventDefault: () => (prevented = true) }, { deviceList: [{ vendorId: 0x046d, productId: 1, deviceId: "kb" }, { vendorId: 0x054c, productId: 0x0ce6, deviceId: "ds" }] }, (id) => (picked = id));
  assert.ok(prevented);
  assert.equal(picked, "ds");
  h["select-hid-device"]({ preventDefault() {} }, { deviceList: [] }, (id) => (picked = id));
  assert.equal(picked, "");
  assert.ok(isDualSense({ vendorId: 1356, productId: 3302 }));
  assert.ok(fromGame("app://game/"));
});
