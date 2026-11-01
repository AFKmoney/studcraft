// StudCraft desktop shell (Electron). Loads the standalone Vite build
// (dist-game/) and runs Bonsai 1.7B Q1_0 natively through sidecar.cjs.
// The game sees `window.studcraftNative.llm` (preload.cjs) and prefers it
// over the in-browser WASM engine.
"use strict";
const { app, BrowserWindow, ipcMain, protocol, net } = require("electron");
const { pathToFileURL } = require("node:url");
// ES-module scripts are blocked on file://, so serve the build on app://game/
protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
const path = require("node:path");
const { Sidecar } = require("./sidecar.cjs");

const res = app.isPackaged ? process.resourcesPath : path.join(__dirname, "resources");
const exe = process.platform === "win32" ? "llama-server.exe" : "llama-server";
// llama/ = GPU build (Vulkan on Windows), llama-cpu/ = CPU build used as a
// hardware fallback when the GPU build cannot start. STUDCRAFT_CPU=1 forces CPU.
const forceCpu = process.env.STUDCRAFT_CPU === "1";
const sidecar = new Sidecar({
  bin: path.join(res, forceCpu ? "llama-cpu" : "llama", exe),
  gpuLayers: forceCpu ? 0 : 99,
  backend: forceCpu ? "cpu" : "gpu",
  fallback: forceCpu ? undefined : { bin: path.join(res, "llama-cpu", exe), gpuLayers: 0 },
  model: path.join(res, "models", "Bonsai-1.7B-Q1_0.gguf"),
  log: (s) => console.log("[bonsai] " + s),
});

ipcMain.handle("llm:status", () => sidecar.status());
ipcMain.handle("llm:generate", (_e, prompt, grammar, o) => sidecar.generate(prompt, grammar, o));

app.whenReady().then(() => {
  void sidecar.start();
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    backgroundColor: "#1c140e",
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  win.setMenuBarVisibility(false);
  const root = app.isPackaged ? path.join(process.resourcesPath, "game") : path.join(__dirname, "..", "dist-game");
  protocol.handle("app", (req) => {
    const rel = decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, "") || "index.html";
    const file = path.normalize(path.join(root, rel));
    if (!file.startsWith(root)) return new Response("forbidden", { status: 403 });
    return net.fetch(pathToFileURL(file).href);
  });
  void win.loadURL("app://game/index.html");
});
app.on("window-all-closed", () => {
  sidecar.stop();
  app.quit();
});
app.on("before-quit", () => sidecar.stop());
