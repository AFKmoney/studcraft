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
import { partWorldPoint, stepVehicle, vehicleFromAssembly } from "./vehicle.ts";

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

test("Rig Digger: B lowers the boom into flat ground, C scoops out, D is the turret (B21 #12)", () => {
  const model = builtinModels().find((m) => m.name === "Rig Digger")!;
  const tech = new TechWorld();
  const bindings = new Map<number, "A" | "B" | "C" | "D">();
  for (const mp of model.parts) {
    const p = tech.add(mp.id, mp.o, [200 + mp.dq[0], 40 + mp.dq[1], 200 + mp.dq[2]]);
    if (mp.ch) bindings.set(p.uid, mp.ch);
  }
  const { vehicle: v } = vehicleFromAssembly([...tech.parts.values()], { hubChannel: "A", battery: 1, fuel: 5, bindings });
  const turret = v.joints.find((j) => Math.abs(j.axis.y) > 0.9)!;
  assert.equal(turret.channel, "D", "the vertical-axis turret must not be on B");
  for (const j of v.joints) if (j !== turret) assert.notEqual(j.channel, "D");
  const H = 8;
  const ground = () => H;
  const bucket = v.parts.find((p) => p.id === 471)!;
  const hub = v.parts.find((p) => p.id === 446)!;
  stepVehicle(v, 0.016, { throttle: 0, steer: 0, channel: "A" }, ground);
  // Hold S on B until the bucket first bites the ground (the game then
  // stops the arm there: solid ground it cannot dig blocks the joint).
  let i = 0;
  while (i++ < 120 && partWorldPoint(v, bucket, bucket.centreLocal).y - H > 0) stepVehicle(v, 0.016, { throttle: -1, steer: 0, channel: "B" }, ground);
  assert.ok(i < 120, "holding S on B puts the bucket into the ground");
  const b = partWorldPoint(v, bucket, bucket.centreLocal);
  const h = partWorldPoint(v, hub, hub.centreLocal);
  assert.ok(Math.hypot(b.x - h.x, b.z - h.z) > 4, "it bites in front of the machine, not under it");
  const before = b.y;
  for (let i = 0; i < 40; i++) stepVehicle(v, 0.016, { throttle: 1, steer: 0, channel: "C" }, ground);
  assert.ok(partWorldPoint(v, bucket, bucket.centreLocal).y > before + 1, "W on C curls the load up and out");
});

test("B26-D5: vendor prefab price is the REAL recipe cost (castMatter), never the volume oracle", async () => {
  const { castMatter, teksCastCost, SMELT_N, SMELT_COPPER } = await import("./recipes.ts");
  const { ID } = await import("./blocks.ts");
  // The divergences that made the oracle price wrong (hand-written
  // B21 recipes vs volume): seat, turret mount, rocket pod, laser.
  assert.deepEqual(castMatter(ID.CockpitSeat), { ingots: 4, copper: 0 });
  assert.equal(teksCastCost(ID.CockpitSeat).ingots, 8);
  assert.deepEqual(castMatter(ID.VehTurretMount), { ingots: 15, copper: 0 });
  assert.equal(teksCastCost(ID.VehTurretMount).ingots, 6);
  assert.deepEqual(castMatter(ID.VehRocketPod), { ingots: 6, copper: 2 });
  assert.deepEqual(castMatter(ID.VehLaser), { ingots: 4, copper: 2 });
  assert.deepEqual(castMatter(ID.CockpitCage), { ingots: 12, copper: 0 });
  assert.deepEqual(castMatter(ID.CockpitMech), { ingots: 12, copper: 0 });
  // For every sold (built-in) model: price (sum of castMatter, what
  // prefabPrice now charges) == melt return (SMELT_N + SMELT_COPPER,
  // what B25-A4 pays back) — buy → melt can never profit.
  for (const m of builtinModels()) {
    let ingots = 0, copper = 0, meltI = 0, meltC = 0;
    for (const p of m.parts) {
      const c = castMatter(p.id);
      ingots += c.ingots; copper += c.copper;
      meltI += SMELT_N[p.id] ?? 0; meltC += SMELT_COPPER[p.id] ?? 0;
    }
    assert.equal(ingots, meltI, m.name + ": vendor ingots != melt return");
    assert.equal(copper, meltC, m.name + ": vendor copper != melt return");
  }
  const buggy = builtinModels().find((m) => m.name === "Starter Buggy")!;
  const digger = builtinModels().find((m) => m.name === "Rig Digger")!;
  const sum = (m: typeof buggy) => m.parts.reduce((a, p) => { const c = castMatter(p.id); return { ingots: a.ingots + c.ingots, copper: a.copper + c.copper }; }, { ingots: 0, copper: 0 });
  assert.deepEqual(sum(buggy), { ingots: 115, copper: 10 }); // 2026-11-01 showroom: livery panels + tyres
  assert.deepEqual(sum(digger), { ingots: 160, copper: 18 });
  // Wiring guard: game.ts prefabPrice prices from castMatter.
  const { readFileSync } = await import("node:fs");
  const game = readFileSync(new URL("./game.ts", import.meta.url), "utf8");
  assert.ok(game.includes("const c = castMatter(p.id);"), "prefabPrice wired to castMatter");
  assert.equal(game.includes("teksCastCost(p.id)"), false, "oracle pricing gone from prefabPrice");
});

test("modelFromParts carries joint channels (audit 2026-10-31)", () => {
  const m = modelFromParts(
    [
      { id: HUB, o: 0, q: [0, 0, 0] },
      { id: 471, o: 1, q: [4, 0, 0], ch: "D" as const },
      { id: 472, o: 1, q: [8, 0, 0] },
    ],
    "Rig",
    "Local",
    HUB,
    0,
  );
  assert.equal(m.parts[1].ch, "D", "a saved servo keeps its role channel");
  assert.ok(!("ch" in m.parts[2]), "no phantom channel key on unbound parts");
  const back = decodeModel(encodeModel(m));
  assert.equal(back?.parts[1].ch, "D", "share codes carry channels too");
});
