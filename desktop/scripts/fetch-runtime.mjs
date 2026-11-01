// Build-time: download + verify the native runtime into desktop/resources/.
//  - Bonsai-1.7B-Q1_0.gguf from Hugging Face, sha256-pinned.
//  - llama.cpp PrismML fork release (pinned tag), asset per platform,
//    sha256 checked against the GitHub release asset digest.
// Usage: node desktop/scripts/fetch-runtime.mjs [--platform win-vulkan-x64|ubuntu-vulkan-x64|ubuntu-x64|macos-arm64]
import { createHash } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, rmSync, readdirSync, cpSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const here = path.dirname(fileURLToPath(import.meta.url));
const RES = path.join(here, "..", "resources");
export const MODEL = {
  url: "https://huggingface.co/prism-ml/Bonsai-1.7B-gguf/resolve/main/Bonsai-1.7B-Q1_0.gguf",
  file: "Bonsai-1.7B-Q1_0.gguf",
  size: 248302272,
  sha256: "3d7c6c90dd98717a203adb22d5eacd2581850e40aa5327e144b97766cae5f7e3",
};
export const LLAMA_TAG = "prism-b12128-d7b2896";
const DEFAULT = { win32: "win-vulkan-x64", linux: "ubuntu-vulkan-x64", darwin: process.arch === "arm64" ? "macos-arm64" : "macos-x64" }[process.platform];
const arg = process.argv.indexOf("--platform");
const PLATFORM = arg > 0 ? process.argv[arg + 1] : DEFAULT;

async function sha256File(f) {
  const h = createHash("sha256");
  await pipeline((await import("node:fs")).createReadStream(f), h);
  return h.digest("hex");
}
async function download(url, out, size) {
  const part = out + ".part";
  const have = existsSync(part) ? statSync(part).size : 0;
  const r = await fetch(url, { headers: have ? { Range: `bytes=${have}-` } : {}, redirect: "follow" });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  await pipeline(Readable.fromWeb(r.body), createWriteStream(part, { flags: have && r.status === 206 ? "a" : "w" }));
  if (size && statSync(part).size !== size) throw new Error(`size mismatch ${out}: ${statSync(part).size} != ${size}`);
  renameSync(part, out);
}

async function model() {
  const dir = path.join(RES, "models");
  mkdirSync(dir, { recursive: true });
  const out = path.join(dir, MODEL.file);
  if (!existsSync(out) || (await sha256File(out)) !== MODEL.sha256) {
    console.log("downloading", MODEL.url);
    await download(MODEL.url, out, MODEL.size);
  }
  const got = await sha256File(out);
  if (got !== MODEL.sha256) {
    rmSync(out);
    throw new Error("model sha256 mismatch " + got);
  }
  console.log("model OK", MODEL.file, MODEL.sha256);
}

async function llama(PLATFORM, dstName) {
  const rel = await (await fetch(`https://api.github.com/repos/PrismML-Eng/llama.cpp/releases/tags/${LLAMA_TAG}`, { headers: { "User-Agent": "studcraft-build" } })).json();
  const asset = (rel.assets || []).find((a) => a.name.includes(`-bin-${PLATFORM}.`));
  if (!asset) throw new Error("no asset for " + PLATFORM + " in " + LLAMA_TAG);
  const tmp = path.join(RES, asset.name);
  console.log("llama asset", PLATFORM, "->", dstName);
  mkdirSync(RES, { recursive: true });
  if (!existsSync(tmp)) await download(asset.browser_download_url, tmp, asset.size);
  const want = String(asset.digest || "").replace(/^sha256:/, "");
  const got = await sha256File(tmp);
  if (want && got !== want) throw new Error(`llama asset sha256 mismatch ${got} != ${want}`);
  console.log("llama asset OK", asset.name, want ? "(digest verified)" : "(no digest published: sha256 " + got + ")");
  const x = path.join(RES, "llama-x");
  rmSync(x, { recursive: true, force: true });
  mkdirSync(x, { recursive: true });
  if (asset.name.endsWith(".zip")) execFileSync(process.platform === "win32" ? "tar" : "unzip", process.platform === "win32" ? ["-xf", tmp, "-C", x] : ["-q", tmp, "-d", x]);
  else execFileSync("tar", ["-xzf", tmp, "-C", x]);
  // flatten: find the dir holding llama-server(.exe)
  const find = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isFile() && /^llama-server(\.exe)?$/.test(e.name)) return d;
      if (e.isDirectory()) {
        const r = find(p);
        if (r) return r;
      }
    }
    return null;
  };
  const bin = find(x);
  if (!bin) throw new Error("llama-server not found in " + asset.name);
  const dst = path.join(RES, dstName);
  rmSync(dst, { recursive: true, force: true });
  cpSync(bin, dst, { recursive: true });
  rmSync(x, { recursive: true, force: true });
  console.log("llama-server ->", dst);
}

if (process.argv.includes("--model-only")) await model();
else if (process.argv.includes("--llama-only")) await runtimes();
else {
  await model();
  await runtimes();
}
// GPU builds also ship the matching CPU build as a hardware fallback (llama-cpu/).
async function runtimes() {
  await llama(PLATFORM, "llama");
  const cpu = { "win-vulkan-x64": "win-cpu-x64", "win-hip-radeon-x64": "win-cpu-x64", "ubuntu-vulkan-x64": "ubuntu-x64" }[PLATFORM];
  if (cpu) await llama(cpu, "llama-cpu");
  else rmSync(path.join(RES, "llama-cpu"), { recursive: true, force: true });
}
