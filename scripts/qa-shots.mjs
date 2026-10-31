// QA screenshots on a REAL GPU (system Chrome, non-headless).
// Usage:
//   npm run dev                      # or any deployed URL
//   node scripts/qa-shots.mjs --url http://127.0.0.1:5173/ --out qa-shots [--seed 1234567]
//   node scripts/qa-shots.mjs --url https://studcraft.pages.dev/ --out qa-prod
// Needs: npx playwright install chrome (or Google Chrome installed).
// Shoots: one village per biome, each NPC type (chief, guard, bandit,
// fence, upgrades vendor, guild master), the Foundry UI and the mobs.
// Logs the GPU renderer string (WebGL + the game's own detection).
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const URL_ = arg("url", "http://127.0.0.1:5173/");
const OUT = arg("out", "qa-shots");
const SEED = arg("seed", "1234567");
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ channel: "chrome", headless: false, args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--enable-zero-copy", "--use-angle=default"] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.setDefaultTimeout(240000);
await p.addInitScript(() => { if (!localStorage.getItem("studcraft-settings-v1")) localStorage.setItem("studcraft-settings-v1", JSON.stringify({ v: 3, sens: 1, radius: 6, sound: false, studs: true, music: 0, sfx: 0, npcLlm: false })); });
const log = [];
p.on("console", (m) => { if (/\[gpu\]/.test(m.text())) { console.log(m.text()); log.push(m.text()); } });
p.on("pageerror", (e) => console.log("ERR", e.message));
const shot = async (name) => { await p.screenshot({ path: `${OUT}/${name}.png` }); console.log("shot", name); };
const click = async (re) => { const l = p.getByRole("button", { name: re }).first(); await l.click({ timeout: 60000, force: true }); };
const T = (fn, a) => p.evaluate(fn, a);

await p.goto(URL_, { waitUntil: "domcontentloaded" });
const gl = await T(() => { const c = document.createElement("canvas").getContext("webgl2"); const x = c?.getExtension("WEBGL_debug_renderer_info"); return c ? (x ? c.getParameter(x.UNMASKED_RENDERER_WEBGL) : c.getParameter(c.RENDERER)) : "no webgl2"; });
console.log("[gpu] page WebGL renderer:", gl); log.push("webgl " + gl);
await p.waitForSelector("text=Play", { timeout: 120000 });
await click(/^Play/);
await p.waitForTimeout(1500);
if ((await p.locator("button").allInnerTexts()).some((t) => /New world/i.test(t))) await click(/New world/i);
await p.getByLabel("World seed").fill(SEED);
const cre = p.locator("[role=radio]", { hasText: /Creative/i });
if (await cre.count()) await cre.first().click();
await click(/^Create world$/);
await p.waitForFunction(() => !!window.__controlsTest?.findStructureQa, null, { timeout: 240000 });
const settle = async (ms = 2500) => { await p.waitForSelector(".sc-loading", { state: "detached", timeout: 600000 }).catch(() => {}); await p.waitForTimeout(ms); };
await settle();
const gameGpu = await T(() => window.__controlsTest.getGpuQa?.() ?? "");
console.log("[gpu] game detection:", gameGpu); log.push("game " + gameGpu);

const goLook = async (tx, ty, tz, dist = 14, up = 8) => {
  const ex = tx - dist * 0.7, ez = tz - dist * 0.7, ey = ty + up;
  const yaw = Math.atan2(-(tx - ex), -(tz - ez)), pitch = -Math.atan2(ey - ty, dist);
  for (let i = 0; i < 6; i++) { await T(([x, y, z, yw, pt]) => { const c = window.__controlsTest; c.setPos(x, y, z); c.setLook?.(yw, pt); }, [ex, ey, ez, yaw, pitch]); await p.waitForTimeout(1000); }
  await settle(1500);
};

// 1) one structure per biome
const zones = ["jungle", "desert", "arctic", "volcano", "valley", "plains", "mountain", "swamp", "canyon", "desertCity", "islands"];
for (const zone of zones) {
  const s = await T(([k, z]) => window.__controlsTest.findStructureQa(k, z), ["village", zone]);
  if (!s) { console.log("no village in", zone); continue; }
  await goLook(s.x + s.w / 2, s.y, s.z + s.d / 2, Math.max(14, s.w * 0.9), Math.max(8, s.w * 0.45));
  await shot(`biome-${zone}`);
}

// 2) NPC types (city: chief/guard/guild/outfitter; bandit camp: bandit/fence)
const npcShot = async (name, test, near) => {
  if (near) await goLook(near.x + near.w / 2, near.y, near.z + near.d / 2, 20, 10);
  const m = (await T(() => window.__controlsTest.socMobsQa?.() ?? [])).find(test);
  if (!m) return console.log("no NPC", name);
  await goLook(m.x, m.y + 1, m.z, 4, 1.5);
  await shot(`npc-${name}`);
};
const city = (await T(() => window.__controlsTest.findStructureQa("village", "desertCity"))) ?? (await T(() => window.__controlsTest.findStructureQa("village")));
await npcShot("chief", (m) => m.soc === "chief", city);
await npcShot("guard", (m) => m.soc === "guard");
await npcShot("guild-master", (m) => m.soc.startsWith("guild:"));
await npcShot("upgrades-vendor", (m) => m.role === "outfitter");
const camp = await T(() => window.__controlsTest.findStructureQa("bandit"));
await npcShot("bandit", (m) => m.soc === "bandit", camp);
await npcShot("fence", (m) => m.role === "fence" || m.soc === "fence");

// 3) Foundry UI
await T(() => window.__controlsTest.openFurnaceQa?.());
await p.waitForTimeout(2500);
await shot("foundry-ui");
await p.keyboard.press("Escape");

// 4) mobs
for (const kind of ["creeper", "spider", "skelly", "golem", "witch", "blaze", "ravager", "dragon"]) {
  await T(() => window.__controlsTest.clearMobs?.(64));
  await T((k) => window.__controlsTest.spawnMob(k, 6, 0), kind);
  await p.waitForTimeout(1500);
  const pos = await T(() => window.__controlsTest.getPos());
  await T(([x, y, z]) => window.__controlsTest.setLook?.(-Math.PI / 2, -0.1), [pos.x, pos.y, pos.z]);
  await p.waitForTimeout(800);
  await shot(`mob-${kind}`);
}
const gen = await T(() => window.__controlsTest.getGenStats?.());
console.log("gen/mesh stats", JSON.stringify(gen)); log.push("gen " + JSON.stringify(gen));
writeFileSync(`${OUT}/qa-log.txt`, log.join("\n") + "\n");
await b.close();
