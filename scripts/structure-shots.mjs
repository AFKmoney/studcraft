// Dev-only harness (biome-structures): headless captures of structures in the real game.
// Usage: vite dev on :5199, then `node scripts/structure-shots.mjs [zone,...]`.
import { chromium } from "playwright";
const OUT = "shots-structures";
const SEED = process.env.SEED || "1234567";
const want = process.argv[2] ? process.argv[2].split(",") : null;
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 800, height: 450 } });
p.setDefaultTimeout(240000);
p.on("pageerror", (e) => console.log("ERR", e.message));
const shot = (name) => p.screenshot({ path: `${OUT}/${name}.png`, timeout: 240000 });
const click = async (re) => { const l = p.getByRole("button", { name: re }).first(); await l.click({ timeout: 60000 }); };
await p.goto("http://127.0.0.1:5199/", { waitUntil: "domcontentloaded" });
await p.waitForSelector("text=Play", { timeout: 120000 });
await click(/^Play/);
await p.waitForTimeout(1500);
const btns = await p.locator("button").allInnerTexts();
console.log("after play:", btns.join(" | "));
if (btns.some((t) => /New world/i.test(t))) await click(/New world/i);
await p.waitForTimeout(1000);
await p.getByLabel("World seed").fill(SEED);
const modes = await p.locator("[role=radio]").allInnerTexts();
console.log("modes:", modes.join(" | "));
const cre = p.locator("[role=radio]", { hasText: /Creative/i });
if (await cre.count()) await cre.first().click();
const after = await p.locator("button").allInnerTexts();
console.log("create panel:", after.join(" | "));
await click(/Create|Start|Build|Generate|Play/i);
await p.waitForFunction(() => !!window.__controlsTest?.findStructureQa, null, { timeout: 240000 });
await p.waitForTimeout(5000);
const zones = want ?? ["jungle", "desert", "arctic", "volcano", "valley", "plains", "mountain", "swamp", "canyon", "desertCity", "islands"];
const kinds = (process.env.KINDS || "village,shrine,mecha,poi,hidden").split(",");
const found = [];
for (const zone of zones) for (const kind of kinds) {
  const s = await p.evaluate(([k, z]) => window.__controlsTest.findStructureQa(k, z), [kind, zone]);
  if (!s) { console.log("none", zone, kind); continue; }
  const cx = s.x + s.w / 2, cz = s.z + s.d / 2;
  const dist = Math.max(10, s.w * 0.9);
  const ex = cx - dist * 0.7, ez = cz - dist * 0.7;
  const ey = s.y + (kind === "hidden" ? -12 : Math.max(8, s.w * 0.45));
  const yaw = Math.atan2(-(cx - ex), -(cz - ez));
  const pitch = kind === "hidden" ? 0 : -Math.atan2(ey - s.y, dist);
  const pos = kind === "hidden" ? [s.x + 3, s.y - 13, s.z + 3] : [ex, ey, ez];
  const yaw2 = kind === "hidden" ? Math.atan2(-(cx - pos[0]), -(cz - pos[2])) : yaw;
  for (let i = 0; i < 12; i++) {
    await p.evaluate(([x, y, z, yw, pt]) => { const c = window.__controlsTest; c.setPos(x, y, z); c.setLook?.(yw, pt); c.clearMobs?.(64); }, [...pos, yaw2, pitch]);
    await p.waitForTimeout(1500);
  }
  const name = `${zone}-${kind}`;
  await shot(name);
  found.push({ name, ...s });
  console.log("shot", name, s.label, s.x, s.y, s.z);
}
console.log(JSON.stringify(found));
await b.close();
