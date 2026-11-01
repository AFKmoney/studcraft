import test from "node:test";
import assert from "node:assert/strict";
import { CROSSBOW_HOLD, holdAxis } from "./heldPose.ts";

test("B18 crossbow hold: stock level and forward, prod horizontal, grip under the stock", () => {
  const fwd = holdAxis({ x: 1, y: 0, z: 0 });
  assert.deepEqual(fwd, { x: 0, y: 0, z: -1 }, "bolt tip points straight ahead (−Z), level");
  const prod = holdAxis({ x: 0, y: 0, z: 1 });
  assert.equal(prod.y, 0);
  assert.equal(Math.abs(prod.x), 1, "prod spans the view horizontally");
  assert.deepEqual(holdAxis({ x: 0, y: 1, z: 0 }), { x: 0, y: 1, z: 0 }, "up stays up (no diagonal tilt)");
  assert.ok(CROSSBOW_HOLD.gripLocal.y < 0, "grip below the stock");
});
