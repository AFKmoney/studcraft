# StudCraft desktop (Electron + native Bonsai 1.7B Q1_0)

The game is the standalone Vite build (`dist-game/`), served to an Electron
window on `app://game/`. The NPC model is **Bonsai 1.7B Q1_0 only**. It runs
natively in `llama-server` from the **PrismML llama.cpp fork** (pinned release
`prism-b12128-d7b2896`). `sidecar.cjs` starts it on 127.0.0.1 with a random
port, checks `/health`, restarts it with backoff if it crashes or times out,
and `preload.cjs` exposes `window.studcraftNative.llm`
(`status()`, `generate(prompt, grammar, opts)`). `src/game/llm/runtime.ts`
uses that IPC bridge first. It falls back to the in-browser WASM engine only
when the bridge is absent, which means on the web build.

The model (248 MB) is **not** in git for the desktop build.
`scripts/fetch-runtime.mjs` downloads it from Hugging Face at build time and
checks its sha256 (`3d7c6c90…f7e3`). It then downloads the fork's release
asset for the platform and checks it against the GitHub asset digest. Both
end up in `desktop/resources/` (git-ignored), and electron-builder copies them
to `resources/llama` and `resources/models`.

## Windows (AMD Radeon → Vulkan) — Philippe's PC
Prerequisites: Node 22+, Git, and an up-to-date AMD Adrenalin driver (it
includes Vulkan). Nothing else is needed: the fork's `win-vulkan-x64` build
is prebuilt.

```powershell
git clone https://github.com/AFKmoney/studcraft; cd studcraft
npm ci
npx vite build --config vite.standalone.config.ts        # -> dist-game/
cd desktop
npm install
node scripts/fetch-runtime.mjs --platform win-vulkan-x64 # model + llama-server.exe (Vulkan), sha256-checked
node --experimental-strip-types scripts/smoke.mjs        # 3 quests JSON valid + t/s + crash restart
npx electron .                                           # play; HUD shows "NPC AI · Bonsai 1.7B Q1_0 (native)"
npx electron-builder --win dir                           # -> dist/win-unpacked/StudCraft.exe (Steam depot)
```

- To check the GPU: `resources\llama\llama-server.exe --list-devices` should
  show `Vulkan0: AMD Radeon …`. The sidecar passes `-ngl 99`, so every layer
  goes to the GPU. To force CPU, set `NGL=0` for the smoke test.
- If Vulkan fails (an old driver, for example), the sidecar logs the error
  and keeps retrying. Then try `--platform win-cpu-x64`, or the `win-hip-radeon-x64`
  asset (ROCm/HIP, 360 MB).
- Building from source instead of the release:
  `git clone -b prism https://github.com/PrismML-Eng/llama.cpp` then
  `cmake -B build -DGGML_VULKAN=ON -DLLAMA_CURL=OFF` (needs the Vulkan SDK)
  then `cmake --build build --config Release --target llama-server`, and copy
  `build\bin\Release\*` to `desktop\resources\llama\`.

## Linux / macOS
`node scripts/fetch-runtime.mjs` picks `ubuntu-vulkan-x64` or `macos-arm64`
(Metal) on its own. Measured on the box (Xeon, CPU only, 4 threads):
prompt about 120–134 t/s, generation about 40–45 t/s, 3/3 valid quests.
