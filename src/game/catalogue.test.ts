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
import { TechWorld } from "./teks.ts";
import { vehicleFromAssembly } from "./vehicle.ts";

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
