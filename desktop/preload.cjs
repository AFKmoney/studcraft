"use strict";
const { contextBridge, ipcRenderer } = require("electron");
// Matches NativeLlm in src/game/llm/runtime.ts.
contextBridge.exposeInMainWorld("studcraftNative", {
  llm: {
    status: () => ipcRenderer.invoke("llm:status"),
    generate: (prompt, grammar, o) => ipcRenderer.invoke("llm:generate", String(prompt), String(grammar), o),
  },
});
