// t80u upscale shader audit (Grok Bot): every material constructed in src
// must go through the shared SNR path (sirenize / sirenizeWorld / skin) or
// carry an explicit `snr-exempt: <reason>` note on its line or just above.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const MAT = /new THREE\.(Mesh\w*Material|ShaderMaterial|RawShaderMaterial|SpriteMaterial|PointsMaterial|Line\w*Material)\(/;
const PATH = /\b(sirenize|sirenizeWorld|skin)\(/;

function files(d: string): string[] {
  return readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx?$/.test(f) && !/\.test\.ts$/.test(f) ? [p] : [];
  });
}

export function auditViolations(): string[] {
  const bad: string[] = [];
  for (const f of files(ROOT)) {
    const lines = readFileSync(f, "utf8").split("\n");
    const src = lines.join("\n");
    lines.forEach((ln, i) => {
      if (!MAT.test(ln)) return;
      if (PATH.test(ln)) return;
      const above = lines.slice(Math.max(0, i - 3), i + 1).join("\n");
      if (/snr-exempt:\s*\S/.test(above)) return;
      const v = /(?:const|let)\s+(\w+)\s*=\s*new THREE\./.exec(ln)?.[1];
      if (v && new RegExp(`\\b(sirenize|sirenizeWorld)\\(${v}\\b`).test(src)) return;
      bad.push(`${f.slice(ROOT.length)}:${i + 1}`);
    });
  }
  return bad;
}

test("every material uses the shared SNR shader path or is explicitly exempt", () => {
  const bad = auditViolations();
  assert.deepEqual(bad, [], "un-audited materials:\n" + bad.join("\n"));
});
test("the shared SNR path is actually used for world, tech and figures", () => {
  const g = readFileSync(join(ROOT, "game/game.ts"), "utf8");
  for (const m of ["opaqueStd", "plantStd", "glassStd", "techMatStd"]) assert.match(g, new RegExp(`sirenizeWorld\\(${m}\\b`));
  assert.match(g, /function skin\([\s\S]{0,200}sirenize\(/);
});
