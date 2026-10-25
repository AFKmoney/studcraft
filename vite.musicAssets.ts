import { createReadStream, existsSync, statSync, cpSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

// public/music/ is NOT covered by the standalone/APK builds' publicDir
// (that points at public/icons-160, which only carries the icon set), so
// without this plugin the music would silently never reach the dev server,
// dist-game/ or dist-apk/ — the game would play its whole life in silence.
// Dev: serve public/music/ at /music. Build: copy it into the output dir.
export function musicAssets(): Plugin {
  const rootDir = path.dirname(fileURLToPath(import.meta.url));
  const musicDir = path.join(rootDir, "public", "music");
  let outDir = "";
  return {
    name: "studcraft-music-assets",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use("/music", (req, res, next) => {
        const name = decodeURIComponent((req.url ?? "").split("?")[0].replace(/^\/+/, ""));
        const file = path.join(musicDir, name);
        if (!name || name.includes("..") || !existsSync(file) || !statSync(file).isFile()) return next();
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Length", String(statSync(file).size));
        if (req.method === "HEAD") return res.end();
        createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      if (outDir && existsSync(musicDir)) {
        cpSync(musicDir, path.join(outDir, "music"), { recursive: true });
      }
    },
  };
}
