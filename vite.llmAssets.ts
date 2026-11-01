import { createReadStream, existsSync, statSync, cpSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

// The NPC model engine (public/wllama: wllama 3.8.1 JS + wasm) and the
// Bonsai 1.7B Q1_0 GGUF as <=24 MB chunks (public/models/bonsai + sha256
// manifest) are not under the standalone publicDir (public/icons-160).
// Dev: serve both dirs (with Range) + COOP/COEP so the wasm can multi-thread.
// Build: copy them into the output and write Cloudflare Pages `_headers`.
const DIRS = ["wllama", "models"];
const TYPES: Record<string, string> = { ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
export const ISOLATION = { "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Embedder-Policy": "credentialless" };
export const PAGES_HEADERS = [
  "/*",
  "  Cross-Origin-Opener-Policy: same-origin",
  "  Cross-Origin-Embedder-Policy: credentialless",
  "/models/*",
  "  Cache-Control: public, max-age=31536000, immutable",
  "/models/bonsai/manifest.json",
  "  Cache-Control: no-cache",
  "/wllama/*",
  "  Cache-Control: public, max-age=86400",
  "",
].join("\n");

export function llmAssets(): Plugin {
  const pub = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");
  let outDir = "";
  return {
    name: "studcraft-llm-assets",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        for (const [k, v] of Object.entries(ISOLATION)) res.setHeader(k, v);
        const url = decodeURIComponent((req.url ?? "").split("?")[0]);
        const m = /^\/(wllama|models)\/(.+)$/.exec(url);
        if (!m || m[2].includes("..")) return next();
        const file = path.join(pub, m[1], m[2]);
        if (!existsSync(file) || !statSync(file).isFile()) return next();
        const size = statSync(file).size;
        res.setHeader("Content-Type", TYPES[path.extname(file)] ?? "application/octet-stream");
        res.setHeader("Accept-Ranges", "bytes");
        const r = /bytes=(\d+)-(\d*)/.exec(String(req.headers.range ?? ""));
        if (r) {
          const s = Number(r[1]);
          const e = r[2] ? Number(r[2]) : size - 1;
          res.statusCode = 206;
          res.setHeader("Content-Range", `bytes ${s}-${e}/${size}`);
          res.setHeader("Content-Length", String(e - s + 1));
          return req.method === "HEAD" ? res.end() : createReadStream(file, { start: s, end: e }).pipe(res);
        }
        res.setHeader("Content-Length", String(size));
        return req.method === "HEAD" ? res.end() : createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      if (!outDir) return;
      for (const d of DIRS) if (existsSync(path.join(pub, d))) cpSync(path.join(pub, d), path.join(outDir, d), { recursive: true });
      writeFileSync(path.join(outDir, "_headers"), PAGES_HEADERS);
    },
  };
}
