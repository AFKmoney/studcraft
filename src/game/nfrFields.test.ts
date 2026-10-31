import { test } from "node:test";
import assert from "node:assert/strict";
import { NFR_FIELDS, NFR_REPORT, type NfrLayer } from "./nfrFields.ts";

const deq = (l: NfrLayer) => (l.w ? l.w : l.q!.map((v, k) => v * l.s![Math.floor(k / 64)]));
function evalField(name: string, x: number, y: number) {
  const f = NFR_FIELDS[name];
  const H = f.hidden;
  const [L1, L2, L3] = f.layers.map((l) => ({ w: deq(l), b: l.b }));
  const h1 = Array.from({ length: H }, (_, i) => Math.sin(30 * (L1.w[i * 2] * x + L1.w[i * 2 + 1] * y + L1.b[i])));
  const h2 = Array.from({ length: H }, (_, i) => Math.sin(30 * (L2.b[i] + h1.reduce((s, v, j) => s + L2.w[i * H + j] * v, 0))));
  return Array.from({ length: f.ch }, (_, c) => L3.b[c] + h2.reduce((s, v, j) => s + L3.w[c * H + j] * v, 0));
}

test("NFR fields: shapes, int8 range, compact size, fitted quality", () => {
  for (const [name, f] of Object.entries(NFR_FIELDS)) {
    const H = f.hidden;
    assert.equal(f.layers.length, 3, name);
    assert.equal(f.layers[0].w!.length, 2 * H);
    assert.equal(f.layers[1].q!.length, H * H);
    assert.equal(f.layers[2].q!.length, H * f.ch);
    for (const l of f.layers.slice(1)) assert.ok(l.q!.every((v) => Number.isInteger(v) && v >= -127 && v <= 127));
    const r = NFR_REPORT[name as keyof typeof NFR_REPORT];
    assert.ok(r.bytes_int8 < r.pixels_bytes, `${name} ${r.bytes_int8} B`);
    assert.ok(r.psnr_int8 > 15, `${name} PSNR ${r.psnr_int8}`);
  }
});

test("NFR luminance fields are mean-normalised (palette-preserving detail ≈ 1)", () => {
  for (const [name, f] of Object.entries(NFR_FIELDS)) {
    if (f.ch !== 1) continue;
    let s = 0, n = 0;
    for (let y = -1; y <= 1; y += 0.1) for (let x = -1; x <= 1; x += 0.1) { s += evalField(name, x, y)[0] * 2; n++; }
    assert.ok(Math.abs(s / n - 1) < 0.15, `${name} mean ${s / n}`);
  }
  const rgb = evalField("dragon", 0, 0);
  assert.ok(rgb.every((v) => v > -0.3 && v < 1.3));
});
