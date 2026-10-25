# Studcraft — standalone builds

The game itself (`src/game/`) is self-contained: React + three.js, saves in
`localStorage`, no server, no auth. The workspace around it (TanStack Start,
Grok preview chrome) is only needed for the hosted preview. These builds take
the game on its own.

## Web (static site)

```bash
npm install
npx vite build --config vite.standalone.config.ts
# -> dist-game/  (index.html + assets, ~880 KB) — serve it from anywhere
```

## Android APK (100 % offline)

```bash
npm install
npx vite build --config vite.apk.config.ts
# -> dist-apk/  (index.html + one classic-script game.js, styles inlined)
cp dist-apk/game.js apk/src/main/assets/game.js
sed 's|<script type="module" crossorigin src="./game.js"></script>|<script src="./game.js"></script>|' \
  dist-apk/index.html > apk/src/main/assets/index.html
apk/build.sh   # javac -> d8 -> aapt2 -> sign (manual pipeline, no Gradle)
# -> apk/build/Studcraft.apk   (package com.studcraft.game)
```

Why the sed: the APK loads from `file:///android_asset/`, where ES-module
scripts are blocked by CORS — so the APK build is a single IIFE classic
script (`vite.apk.config.ts`) and `standalone-apk/main.tsx` waits for
`DOMContentLoaded` before mounting, since the script tag lands in `<head>`.

Signing key is generated on first `build.sh` run (`studcraft.keystore`,
gitignored). Keep it: future APK updates must use the same key.
