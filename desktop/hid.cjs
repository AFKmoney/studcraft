// WebHID for the PlayStation DualSense (t106u): the game drives the adaptive
// triggers through navigator.hid. Electron has no chooser UI, so the main
// process answers it — and only for Sony DualSense / DualSense Edge pads,
// over USB or Bluetooth. Nothing else on the machine is exposed.
"use strict";

const DS_VENDOR = 0x054c;
const DS_PRODUCTS = [0x0ce6, 0x0df2];
const GAME_ORIGIN = "app://game";

const isDualSense = (d) => !!d && Number(d.vendorId) === DS_VENDOR && DS_PRODUCTS.includes(Number(d.productId));
const fromGame = (origin) => typeof origin === "string" && origin.replace(/\/+$/, "") === GAME_ORIGIN;

/** Wire the session so the game's WebHID calls see the DualSense without a picker. */
function allowDualSense(ses) {
  ses.setPermissionCheckHandler((_wc, permission, origin) => (permission === "hid" ? fromGame(origin) : true));
  ses.setDevicePermissionHandler((details) => details.deviceType === "hid" && fromGame(details.origin) && isDualSense(details.device));
  ses.on("select-hid-device", (event, details, callback) => {
    event.preventDefault();
    const pad = (details.deviceList || []).find(isDualSense);
    callback(pad ? pad.deviceId : "");
  });
}

/** Relax the triggers before the window goes away (renderer exposes __dsReset). */
function resetTriggersOnClose(win, timeoutMs = 400) {
  let done = false;
  win.on("close", (e) => {
    if (done || win.webContents.isDestroyed()) return;
    e.preventDefault();
    const finish = () => {
      if (done) return;
      done = true;
      if (!win.isDestroyed()) win.close();
    };
    setTimeout(finish, timeoutMs);
    win.webContents.executeJavaScript("window.__dsReset ? window.__dsReset() : undefined", true).then(finish, finish);
  });
  win.on("blur", () => {
    if (!win.webContents.isDestroyed()) win.webContents.executeJavaScript("window.__dsReset && window.__dsReset()", true).catch(() => {});
  });
}

module.exports = { allowDualSense, resetTriggersOnClose, isDualSense, fromGame, DS_VENDOR, DS_PRODUCTS };
