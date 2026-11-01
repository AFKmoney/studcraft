// HUD overlap regressions seen in the lot-2 audit (standalone build screenshots):
// the vehicle dashboard sat on the hearts row, and the NPC-AI label sat on the quest pill.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("./GameView.tsx", import.meta.url), "utf8");

test("vehicle dashboard sits above the survival status rows", () => {
  const m = src.match(/export const VEH_DASH_BOTTOM = (\d+);/);
  assert.ok(m, "VEH_DASH_BOTTOM constant missing");
  assert.ok(Number(m![1]) >= 140, "dashboard would overlap hotbar/hearts/hunger");
  assert.match(src, /className="sc-veh-dash"[\s\S]{0,200}bottom: VEH_DASH_BOTTOM/);
});

test("NPC-AI label is not nested in the top-right HUD column", () => {
  const tr = src.indexOf('<div className="sc-hud-tr">');
  assert.ok(tr > 0);
  // find the matching close of .sc-hud-tr by depth-counting <div / </div>
  let depth = 0, i = tr, end = -1;
  const re = /<div\b|<\/div>/g; re.lastIndex = tr;
  for (let m; (m = re.exec(src)); ) { depth += m[0] === "</div>" ? -1 : 1; if (depth === 0) { end = m.index; break; } i = m.index; }
  assert.ok(end > tr, "unbalanced .sc-hud-tr");
  assert.ok(!src.slice(tr, end).includes('className="sc-llm"'), "sc-llm is inside .sc-hud-tr and overlaps the quest pill");
  assert.ok(src.includes('className="sc-llm"'), "sc-llm label removed entirely");
});
