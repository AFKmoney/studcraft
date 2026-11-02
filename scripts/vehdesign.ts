// Dev tool (2026-11-01): designs the built-in showroom. Each vehicle is a
// base chassis plus "intent" parts (id, orientation, target spot, tint);
// every part is placed at the legal spot NEAREST its target under the
// game's own load law (vehcheck.ts), one at a time, so the result always
// loads whole, is one component under the hub, converts, and drives.
import { checkModel } from "./vehcheck.ts";
import { orientWith } from "./vehsearch.ts";
import type { ModelPart } from "../src/game/catalogue.ts";

type Want = { id: number; o?: number; at: [number, number, number]; tint?: number; ch?: ModelPart["ch"]; r?: number; mirror?: boolean };
export const O = {
  flat: orientWith([1, 0, 0], [0, 1, 0]), // panel lying flat (normal up)
  side: 0, // panel standing along the vehicle (normal z)
  front: orientWith([0, 0, 1], [1, 0, 0]), // panel facing forward (normal x)
  fwd: 22, // guns / seats facing +x
};
function place(parts: ModelPart[], w: Want): ModelPart | null {
  const R = w.r ?? 4;
  const cands: [number, number, number, number][] = [];
  for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) for (let dz = -R; dz <= R; dz++) cands.push([dx * dx + dy * dy * 1.5 + dz * dz, w.at[0] + dx, w.at[1] + dy, w.at[2] + dz]);
  cands.sort((a, b) => a[0] - b[0]);
  for (const [, x, y, z] of cands) {
    const mp: ModelPart = { id: w.id, o: w.o ?? 0, dq: [x, y, z], ...(w.tint ? { tint: w.tint } : {}), ...(w.ch ? { ch: w.ch } : {}) };
    const c = checkModel([...parts, mp]);
    if (c.placed === parts.length + 1 && c.comp === parts.length + 1 && c.missing === 0 && c.drove > 2) return mp;
  }
  return null;
}
export function design(name: string, base: ModelPart[], wants: Want[]): { parts: ModelPart[]; skipped: string[] } {
  const parts = [...base];
  const skipped: string[] = [];
  for (const w of wants) {
    const list = w.mirror ? [w, { ...w, at: [w.at[0], w.at[1], -w.at[2]] as [number, number, number] }] : [w];
    for (const v of list) {
      const mp = place(parts, v);
      if (mp) parts.push(mp);
      else skipped.push(`${v.id}@${v.at.join(",")}`);
    }
  }
  const c = checkModel(parts);
  console.error(name.padEnd(18), parts.length, "parts drove", c.drove.toFixed(1), skipped.length ? "SKIPPED " + skipped.join(" ") : "");
  return { parts, skipped };
}
