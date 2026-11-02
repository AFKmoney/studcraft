// Dev tool: find legal spots for one more part on a catalogue model.
import { checkModel } from "./vehcheck.ts";
import { rot } from "../src/game/teks.ts";
import type { ModelPart } from "../src/game/catalogue.ts";
export function orientWith(xTo: [number, number, number], zTo: [number, number, number]): number {
  for (let o = 0; o < 24; o++) {
    const x = rot(o, [1, 0, 0]), z = rot(o, [0, 0, 1]);
    if (x.every((v, i) => v === xTo[i]) && z.every((v, i) => v === zTo[i])) return o;
  }
  return -1;
}
export function spots(base: ModelPart[], id: number, o: number, xs: number[], ys: number[], zs: number[], minDrive = 2): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const x of xs) for (const y of ys) for (const z of zs) {
    const c = checkModel([...base, { id, o, dq: [x, y, z] }]);
    if (c.placed === base.length + 1 && c.comp === base.length + 1 && c.missing === 0 && c.drove >= minDrive) out.push([x, y, z]);
  }
  return out;
}
export const range = (a: number, b: number, s = 1) => { const r: number[] = []; for (let v = a; v <= b; v += s) r.push(v); return r; };
