// Section 22 P-A: catalogue model/storage tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  builtinModels,
  decodeModel,
  encodeModel,
  loadCatalogue,
  modelBill,
  modelFromParts,
  removeModel,
  storeCatalogue,
  upsertModel,
} from "./catalogue.ts";
import { TechWorld, bbox } from "./teks.ts";
import { stepVehicle, vehicleFromAssembly } from "./vehicle.ts";

const HUB = 446;
const fakeStorage = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    length: 0,
  } as Storage;
};

test("modelFromParts anchors on the hub when present", () => {
  const parts = [
    { id: 378, o: 0, q: [4, 8, 4] },
    { id: HUB, o: 2, q: [8, 8, 8] },
    { id: 356, o: 0, q: [12, 4, 8] },
  ];
  const m = modelFromParts(parts, "Buggy", "Local", HUB, 123);
  assert.equal(m.name, "Buggy");
  assert.equal(m.savedAt, 123);
  // hub becomes the origin; others are relative to it
  assert.deepEqual(m.parts[1].dq, [0, 0, 0]);
  assert.deepEqual(m.parts[0].dq, [-4, 0, -4]);
  assert.deepEqual(m.parts[2].dq, [4, -4, 0]);
});

test("modelFromParts falls back to the min corner without a hub", () => {
  const parts = [
    { id: 378, o: 0, q: [10, 6, 10] },
    { id: 378, o: 1, q: [6, 10, 14] },
  ];
  const m = modelFromParts(parts, "Frame", "Local", HUB, 0);
  assert.deepEqual(m.parts[0].dq, [4, 0, 0]);
  assert.deepEqual(m.parts[1].dq, [0, 4, 4]);
});

test("modelBill counts parts per id", () => {
  const m = modelFromParts(
    [
      { id: 356, o: 0, q: [0, 0, 0] },
      { id: 356, o: 0, q: [4, 0, 0] },
      { id: HUB, o: 0, q: [2, 2, 0] },
    ],
    "B",
    "Local",
    HUB,
    0,
  );
  const bill = modelBill(m);
  assert.equal(bill.get(356), 2);
  assert.equal(bill.get(HUB), 1);
});

test("catalogue storage round-trip + upsert/remove", () => {
  const s = fakeStorage();
  assert.deepEqual(loadCatalogue(s), []);
  const m1 = modelFromParts([{ id: HUB, o: 0, q: [0, 0, 0] }], "One", "Local", HUB, 1);
  const m2 = modelFromParts([{ id: HUB, o: 0, q: [0, 0, 0] }], "Two", "Local", HUB, 2);
  storeCatalogue(upsertModel([], m1), s);
  storeCatalogue(upsertModel(loadCatalogue(s), m2), s);
  assert.deepEqual(loadCatalogue(s).map((m) => m.name), ["One", "Two"]);
  // upsert replaces by name
  const m1b = { ...m1, savedAt: 99 };
  storeCatalogue(upsertModel(loadCatalogue(s), m1b), s);
  const list = loadCatalogue(s);
  assert.equal(list.length, 2);
  assert.equal(list.find((m) => m.name === "One")?.savedAt, 99);
  storeCatalogue(removeModel(list, "One"), s);
  assert.deepEqual(loadCatalogue(s).map((m) => m.name), ["Two"]);
});

test("built-in models convert to complete vehicles (P-B validation)", () => {
  for (const model of builtinModels()) {
    const tech = new TechWorld();
    const A: [number, number, number] = [200, 40, 200];
    for (const mp of model.parts) {
      tech.add(mp.id, mp.o, [A[0] + mp.dq[0], A[1] + mp.dq[1], A[2] + mp.dq[2]]);
    }
    const parts = [...tech.parts.values()];
    assert.equal(parts.length, model.parts.length);
    const { vehicle, missing } = vehicleFromAssembly(parts, { hubChannel: "A", battery: 1, fuel: 0 });
    assert.deepEqual(missing, [], model.name + " must be a complete vehicle");
    assert.equal(vehicle.parts.length, model.parts.length);
  }
});

test("built-in models PLACE under the game's own placement law (B16)", () => {
  // The conversion tests add() parts unconditionally — but the game
  // LOADS a model through TechWorld.test() (catalogueLoadModel): a
  // part whose cells collide with a neighbour's without an
  // axle-in-hole mating is refused and becomes a hologram. The Rig
  // Digger shipped with 4 unplaceable servos exactly that way
  // (tester retest, 2026-10-31: 16 placed, 4 holograms, arm dead).
  // This replays the load faithfully: flat ground, the game's
  // grounding rule (lowest part on the surface, lift ≤3, best fit),
  // then the game's component rule (AABB touch from the hub).
  for (const model of builtinModels()) {
    const ground = 63;
    const solidAt = (_x: number, y: number, _z: number) => y <= ground;
    const minDqY = Math.min(...model.parts.map((p) => p.dq[1]));
    const groundQ = (ground + 1) * 4 - minDqY;
    let best = -1;
    let anchorY = groundQ;
    for (let lift = 0; lift <= 3; lift++) {
      const t = new TechWorld();
      let fits = 0;
      for (const mp of model.parts) {
        const q: [number, number, number] = [mp.dq[0], groundQ + lift * 4 + mp.dq[1], mp.dq[2]];
        if (t.test(mp.id, mp.o, q, solidAt) >= 0) {
          t.add(mp.id, mp.o, q);
          fits++;
        }
      }
      if (fits > best) {
        best = fits;
        anchorY = groundQ + lift * 4;
      }
      if (fits === model.parts.length) break;
    }
    assert.equal(best, model.parts.length, model.name + ": every part must place on flat ground");
    const tech = new TechWorld();
    for (const mp of model.parts) tech.add(mp.id, mp.o, [mp.dq[0], anchorY + mp.dq[1], mp.dq[2]]);
    const parts = [...tech.parts.values()];
    const boxOf = (p: (typeof parts)[number]) => {
      const [lo, hi] = bbox(p.id, p.o);
      return {
        c: [(p.q[0] + (lo[0] + hi[0]) / 2) / 4, (p.q[1] + (lo[1] + hi[1]) / 2) / 4, (p.q[2] + (lo[2] + hi[2]) / 2) / 4],
        s: [(hi[0] - lo[0]) / 4, (hi[1] - lo[1]) / 4, (hi[2] - lo[2]) / 4],
      };
    };
    const boxes = new Map(parts.map((p) => [p.uid, boxOf(p)]));
    const touch = (a: ReturnType<typeof boxOf>, b: ReturnType<typeof boxOf>) =>
      [0, 1, 2].every((i) => Math.abs(a.c[i] - b.c[i]) <= (a.s[i] + b.s[i]) / 2 + 0.06);
    const hub = parts.find((p) => p.id === 446);
    assert.ok(hub, model.name + " has a hub");
    const seen = new Set([hub.uid]);
    const queue = [hub.uid];
    const comp: typeof parts = [];
    while (queue.length) {
      const u = queue.pop()!;
      const p = parts.find((x) => x.uid === u)!;
      comp.push(p);
      for (const q of parts) {
        if (!seen.has(q.uid) && touch(boxes.get(u)!, boxes.get(q.uid)!)) {
          seen.add(q.uid);
          queue.push(q.uid);
        }
      }
    }
    assert.equal(comp.length, parts.length, model.name + ": the placed set is one component under the hub");
    const { missing } = vehicleFromAssembly(comp, { hubChannel: "A", battery: 1, fuel: 0 });
    assert.deepEqual(missing, [], model.name + ": the hub component converts to a vehicle");
  }
});

test("the Rig Digger converts with a 4-servo joint chain (P5c-3)", () => {
  const model = builtinModels().find((m) => m.name === "Rig Digger")!;
  assert.ok(model, "Rig Digger is a built-in");
  const tech = new TechWorld();
  const A: [number, number, number] = [200, 40, 200];
  for (const mp of model.parts) tech.add(mp.id, mp.o, [A[0] + mp.dq[0], A[1] + mp.dq[1], A[2] + mp.dq[2]]);
  const parts = [...tech.parts.values()];
  // Servo uids in model order: turret, boom, stick, bucket.
  const servoUids = parts.filter((p) => p.id === 450).map((p) => p.uid);
  assert.equal(servoUids.length, 4);
  const bindings = new Map([
    [servoUids[0], "B" as const],
    [servoUids[1], "C" as const],
    [servoUids[2], "D" as const],
    [servoUids[3], "D" as const],
  ]);
  const { vehicle: v, missing } = vehicleFromAssembly(parts, { bindings, hubChannel: "A", battery: 1, fuel: 0 });
  assert.deepEqual(missing, []);
  assert.equal(v.joints.length, 4, "four servo joints: " + JSON.stringify(v.joints.map((j) => [j.kind, j.channel, j.group, j.parentGroup])));
  assert.ok(v.joints.every((j) => j.kind === "servo"));
  const bucket = v.parts.find((p) => p.id === 471)!;
  assert.ok(bucket, "the digging bucket is aboard");
  assert.equal(bucket.group, Math.max(...v.joints.map((j) => j.group)), "the bucket rides the deepest subgroup");
  // Channel discipline: commanding C swings only the boom joint.
  for (let i = 0; i < 60; i++) stepVehicle(v, 1 / 60, { throttle: 1, steer: 0, channel: "C" }, () => 0);
  const boom = v.joints.find((j) => j.channel === "C")!;
  assert.ok(boom.angle > 1.2, "boom swung on C: " + boom.angle);
  for (const j of v.joints) if (j !== boom) assert.equal(j.angle, 0, "other joints stay put");
});

test("share code round-trips and rejects junk", () => {
  const m = modelFromParts(
    [
      { id: HUB, o: 3, q: [4, 4, 4] },
      { id: 356, o: 0, q: [8, 0, 4] },
    ],
    "Mon Véhicule",
    "Local",
    HUB,
    42,
  );
  const code = encodeModel(m);
  assert.ok(code.startsWith("STUDS-MODEL:"));
  assert.deepEqual(decodeModel(code), m);
  assert.equal(decodeModel("not a code"), null);
  assert.equal(decodeModel("STUDS-MODEL:%%%"), null);
  assert.equal(decodeModel(""), null);
});
