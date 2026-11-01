// Headless proof of the desktop path without Electron: start the sidecar
// with resources/llama + resources/models, run the game's real prompt and
// grammar, validate with the game's parseLlm. Prints tokens/s.
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { Sidecar } = createRequire(import.meta.url)("../sidecar.cjs");
const { buildPrompt, grammarFor, REWARDS } = await import("../../src/game/llm/prompt.ts");
const { parseLlm } = await import("../../src/game/llm/story.ts");
const res = process.env.RES || path.join(here, "..", "resources");
const exe = process.platform === "win32" ? "llama-server.exe" : "llama-server";
const s = new Sidecar({ bin: path.join(res, process.env.LLAMA_DIR || "llama", exe), model: path.join(res, "models", "Bonsai-1.7B-Q1_0.gguf"), gpuLayers: Number(process.env.NGL ?? 99), log: (m) => console.log("[sidecar]", m) });
await s.start();
if (!s.ready) throw new Error(s.why);
const a = { types: ["kill", "fetch", "deliver"], targets: ["mob:spider", "mob:wolf", "item:iron"], items: ["iron"], locations: ["village", "canyon"], npcs: ["Chief Oda"], guilds: ["miners"], rewards: REWARDS };
const ctx = { game: [{ k: "day", v: 12, w: 1 }], npc: [{ k: "mood", v: "worried", w: 2 }], player: [{ k: "rep", v: 40, w: 2 }, { k: "coins", v: 120, w: 1 }], story: { arc: "Wolves were seen near the canyon.", npcs: ["Chief Oda"] } };
const { prompt } = buildPrompt(ctx, a);
let ok = 0;
for (let i = 0; i < 3; i++) {
  const out = await s.generate(prompt, grammarFor(a), { temperature: 0.4, maxTokens: 160 });
  const p = parseLlm(out, a);
  const t = s.lastTimings;
  console.log(p.q ? "VALID" : "INVALID " + p.errors.join(";"), out, `pp ${t.prompt_per_second.toFixed(0)} t/s, tg ${t.predicted_per_second.toFixed(1)} t/s`);
  if (p.q) ok++;
}
// crash recovery: kill the server, expect an automatic restart
s.proc.kill("SIGKILL");
for (let i = 0; i < 60 && !s.ready; i++) await new Promise((r) => setTimeout(r, 500));
await new Promise((r) => setTimeout(r, 1500));
for (let i = 0; i < 60 && !s.ready; i++) await new Promise((r) => setTimeout(r, 500));
console.log("restart after kill:", s.ready ? "OK" : "FAILED " + s.why);
s.stop();
console.log(`${ok}/3 valid`);
process.exit(ok === 3 && s.why === "" ? 0 : 1);
