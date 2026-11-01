import test from "node:test";
import assert from "node:assert/strict";
import { builtinModels } from "./catalogue.ts";
import { TechWorld } from "./teks.ts";
import { vehicleFromAssembly } from "./vehicle.ts";
import { driverOccluders, seatEye, viewBlocked } from "./vehView.ts";

function rigDigger() {
  const model = builtinModels().find((m) => m.name === "Rig Digger")!;
  const tech = new TechWorld();
  const A: [number, number, number] = [200, 40, 200];
  for (const mp of model.parts) tech.add(mp.id, mp.o, [A[0] + mp.dq[0], A[1] + mp.dq[1], A[2] + mp.dq[2]]);
  return vehicleFromAssembly([...tech.parts.values()], { hubChannel: "A", battery: 1, fuel: 0 }).vehicle;
}

test("B18: Rig Digger first-person driving view is clear in all 4 directions", () => {
  const v = rigDigger();
  const eye = seatEye(v)!;
  assert.ok(eye, "a seat is found");
  const hide = driverOccluders(v, eye);
  const dirs = { fwd: { x: 0, y: 0, z: -1 }, right: { x: 1, y: 0, z: 0 }, back: { x: 0, y: 0, z: 1 }, left: { x: -1, y: 0, z: 0 } };
  const before: Record<string, number> = {};
  for (const [k, d] of Object.entries(dirs)) {
    before[k] = viewBlocked(v, eye, d);
    const after = viewBlocked(v, eye, d, hide);
    assert.ok(after < 0.25, k + " still " + Math.round(after * 100) + "% blocked (was " + Math.round(before[k] * 100) + "%)");
  }
  // never hide what the driver needs: wheels and the bucket
  for (const p of v.parts) if (p.role === "wheel" || p.id === 471) assert.ok(!hide.has(p.uid));
  console.log("view blocked before:", before, "hidden parts:", hide.size, "/", v.parts.length);
});

test("B21: chase camera sits outside every part of the machine", async () => {
  const { vehChaseDistance, boxDist } = await import("./vehView.ts");
  const v = rigDigger();
  const eye = seatEye(v)!;
  const d = vehChaseDistance(v, eye);
  let far = 0;
  for (const p of v.parts) if (p.box) far = Math.max(far, Math.hypot(Math.max(Math.abs(p.box.min.x - eye.x), Math.abs(p.box.max.x - eye.x)), Math.max(Math.abs(p.box.min.y - eye.y), Math.abs(p.box.max.y - eye.y)), Math.max(Math.abs(p.box.min.z - eye.z), Math.abs(p.box.max.z - eye.z))));
  assert.ok(d > far && d > 4.2 && d <= 16, `chase ${d.toFixed(2)} vs farthest corner ${far.toFixed(2)}`);
  // the old 4.2-block over-the-shoulder pull-back ended inside the bodywork
  const back = { x: eye.x, y: eye.y + 0.28, z: eye.z + 4.2 };
  assert.ok(v.parts.some((p) => boxDist(p, back) < 1.5) || far > 4.2);
});

test("B21: parking lifts the build off a slope instead of refusing", async () => {
  const { liftToFit } = await import("./vehView.ts");
  const poses = [{ q: [0, 0, 0] as [number, number, number] }, { q: [8, -7, 0] as [number, number, number] }];
  // ground top at q.y = -4 under the second part: it fits from lift 3
  const out = liftToFit(poses, (p) => p.q[1] >= -4)!;
  assert.deepEqual(out.map((p) => p.q[1]), [3, -4]);
  assert.equal(liftToFit(poses, () => false), null);
});
