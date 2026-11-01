import { test } from "node:test";
import assert from "node:assert/strict";
import { XB, XB_CYCLE, XB_FIRE, prodPoint, stringHalf, xbPose } from "./crossbowRig.ts";

test("drawn: string at the nut, bolt shown, prod tips pulled back", () => {
  const p = xbPose(Infinity, true);
  assert.equal(p.phase, "drawn");
  assert.equal(p.stringX, XB.nutX);
  assert.ok(p.bolt);
  assert.ok(prodPoint(1, p.flex).x < prodPoint(1, 0).x);
});
test("fire snaps the string forward, hides the bolt, kicks", () => {
  const p = xbPose(XB_FIRE * 0.5, true);
  assert.equal(p.phase, "fire");
  assert.ok(!p.bolt);
  assert.ok(p.stringX > XB.nutX + 0.05);
  assert.ok(p.kick > 0.5);
  assert.ok(xbPose(XB_FIRE * 0.6, true).flex < 0, "tips flex forward on release");
});
test("reload cocks back to the nut and ends drawn", () => {
  const a = xbPose(XB_FIRE + 0.05, true), b = xbPose(XB_CYCLE - 0.01, true);
  assert.equal(a.phase, "reload");
  assert.ok(b.stringX < a.stringX);
  assert.ok(b.bolt);
  assert.equal(xbPose(XB_CYCLE + 0.01, true).phase, "drawn");
  assert.equal(xbPose(XB_CYCLE + 1, false).phase, "slack");
});
test("string halves join the tips to the centre exactly", () => {
  for (const since of [Infinity, 0.03, 0.3]) {
    const p = xbPose(since, true);
    for (const s of [1, -1] as const) {
      const h = stringHalf(s, p), tip = prodPoint(s, p.flex);
      const ex = h.x + Math.cos(h.yaw) * h.len / 2, ez = h.z - Math.sin(h.yaw) * h.len / 2;
      assert.ok(Math.abs(ex - p.stringX) < 1e-9 && Math.abs(ez) < 1e-9);
      const sx = h.x - Math.cos(h.yaw) * h.len / 2, sz = h.z + Math.sin(h.yaw) * h.len / 2;
      assert.ok(Math.abs(sx - tip.x) < 1e-9 && Math.abs(sz - tip.z) < 1e-9);
    }
  }
});
test("prod is horizontal and symmetric", () => {
  const l = prodPoint(-1), r = prodPoint(1);
  assert.equal(l.y, r.y);
  assert.equal(l.x, r.x);
  assert.equal(l.z, -r.z);
});
