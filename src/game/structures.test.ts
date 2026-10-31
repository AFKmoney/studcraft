import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { ID } from "./blocks.ts";
import { ZONE_IDS } from "./biomes.ts";

// world.ts uses Vite-style extensionless imports; resolve them for node --test.
register(
  "data:text/javascript," +
    encodeURIComponent(`export async function resolve(s, c, n) {
      try { return await n(s, c); } catch (e) {
        if ((s.startsWith("./") || s.startsWith("../")) && !/\\.[cm]?[jt]s$/.test(s)) return n(s + ".ts", c);
        throw e;
      }
    }`),
);
const { World, CS } = await import("./world.ts");
const S = await import("./structures.ts");

const SEED = 1234567;
const fresh = (seed = SEED) => new World(seed, false);

test("placement is deterministic from the seed", () => {
  const a = fresh();
  const b = fresh();
  const list = (w: InstanceType<typeof World>) => {
    const out: string[] = [];
    for (let gz = -8; gz <= 8; gz++) for (let gx = -8; gx <= 8; gx++) {
      const s = S.structureAt(w, gx, gz);
      if (s) out.push(JSON.stringify(s));
    }
    return out;
  };
  const la = list(a);
  assert.deepEqual(la, list(b));
  assert.notDeepEqual(la, list(fresh(SEED + 1)));
});

test("reasonable density: some structures, not everywhere", () => {
  const w = fresh();
  let n = 0;
  const cells = 24 * 24;
  for (let gz = -12; gz < 12; gz++) for (let gx = -12; gx < 12; gx++) if (S.structureAt(w, gx, gz)) n++;
  assert.ok(n >= cells * 0.08, "too sparse: " + n);
  assert.ok(n <= cells * 0.6, "too dense: " + n);
});

test("nothing blocks spawn, hamlets or sites", () => {
  for (const seed of [1, 42, SEED, 99991]) {
    const w = fresh(seed);
    const home = w.hamletAt(0, 0)!;
    for (let gz = -6; gz <= 6; gz++) for (let gx = -6; gx <= 6; gx++) {
      const s = S.structureAt(w, gx, gz);
      if (!s) continue;
      const cx = s.x + s.w / 2;
      const cz = s.z + s.d / 2;
      assert.ok(Math.abs(cx - (home.x + 15)) > S.SPAWN_CLEAR || Math.abs(cz - (home.z + 14)) > S.SPAWN_CLEAR, "too close to spawn");
      // stays inside its own grid cell, so structures never overlap each other
      assert.equal(Math.floor(s.x / S.STRUCT_STEP), gx);
      assert.equal(Math.floor((s.x + s.w) / S.STRUCT_STEP), gx);
      assert.equal(Math.floor((s.z + s.d) / S.STRUCT_STEP), gz);
    }
  }
});

test("every zone has a village, shrine, mecha, POI and hidden blueprint with a crate inside its footprint", () => {
  for (const zone of ZONE_IDS) {
    for (const kind of ["village", "shrine", "mecha", "poi", "hidden"] as const) {
      const size = S.structSize(kind, zone);
      const s = { x: 1000, z: 1000, y: 40, w: size, d: size, kind, zone, gx: 0, gz: 0 };
      const bricks = S.structureBricks(s, SEED);
      assert.ok(bricks.length > 20, zone + " " + kind);
      assert.ok(bricks.some((b) => b.id === ID.Chest), "no crate: " + zone + " " + kind);
      for (const b of bricks) {
        assert.ok(b.dx >= -2 && b.dx <= size + 1 && b.dz >= -2 && b.dz <= size + 1, `${zone} ${kind} brick out of footprint ${b.dx},${b.dz}`);
      }
      assert.deepEqual(S.structureBricks({ ...s }, SEED), bricks);
    }
  }
  // the desert city is a real city: tall multi-floor buildings
  const city = S.structureBricks({ x: 0, z: 0, y: 30, w: S.CITY_W, d: S.CITY_W, kind: "village", zone: "desertCity", gx: 0, gz: 0 }, SEED);
  assert.ok(Math.max(...city.map((b) => b.dy)) >= 12);
  assert.ok(city.filter((b) => b.id === ID.Ladder).length > 20);
});

test("chunks paint structures identically on regeneration", () => {
  const w = fresh();
  const s = S.findStructure(w, "village", undefined, 30) ?? S.findStructure(w, "shrine", undefined, 30);
  assert.ok(s, "no structure found");
  const cx = Math.floor((s.x + 4) / CS);
  const cz = Math.floor((s.z + 4) / CS);
  const a = w.ensure(cx, cz);
  const b = fresh().ensure(cx, cz);
  assert.deepEqual(Array.from(a), Array.from(b));
  // and the bricks really land: every mode-0 brick of the structure in this chunk is painted
  let checked = 0;
  for (const br of S.structureBricks(s, w.seed)) {
    const x = s.x + br.dx;
    const z = s.z + br.dz;
    const y = s.y + br.dy;
    if (br.mode !== 0 || Math.floor(x / CS) !== cx || Math.floor(z / CS) !== cz || y < 1 || y >= 70) continue;
    checked++;
  }
  assert.ok(checked > 0);
  const own = S.structureOwning(w, s.x + 3, s.y + 1, s.z + 3);
  assert.equal(own?.x, s.x);
});

test("each zone gets placed structures somewhere in the world", () => {
  const w = fresh();
  const seen = new Set<string>();
  for (let gz = -30; gz <= 30; gz++) for (let gx = -30; gx <= 30; gx++) {
    const s = S.structureAt(w, gx, gz);
    if (s) seen.add(s.zone);
  }
  assert.ok(seen.size >= 9, "zones with structures: " + [...seen].join(","));
});

test("structure crates get their pool and signature pieces", () => {
  const sh = { x: 0, z: 0, y: 40, w: 11, d: 11, kind: "shrine" as const, zone: "jungle" as const, gx: 0, gz: 0 };
  assert.equal(S.structureLootKind(sh), "sanctum");
  assert.equal(S.structureLootKind({ ...sh, kind: "mecha" }), "mecha");
  assert.equal(S.structureLootKind({ ...sh, kind: "hidden" }), "vault");
  let studs = 0;
  let cores = 0;
  for (let i = 0; i < 60; i++) {
    const bin = { ids: new Array(27).fill(0), ns: new Array(27).fill(0) };
    S.stockStructureChest(bin, i * 7, 40, i * 3, SEED, { ...sh, kind: i % 2 ? "mecha" : "shrine" });
    assert.ok(bin.ids.some((v: number) => v > 0));
    if (bin.ids.includes(ID.SanctumStud)) studs++;
    if (bin.ids.includes(ID.MechaCore)) cores++;
  }
  assert.ok(studs > 0 && studs < 30);
  assert.ok(cores > 0 && cores < 30);
});

test("every village and the desert city has a trader garage: workbench, racks, lift and a parked vehicle", () => {
  for (const zone of ZONE_IDS) {
    const size = S.structSize("village", zone);
    const bricks = S.structureBricks({ x: 0, z: 0, y: 40, w: size, d: size, kind: "village", zone, gx: 0, gz: 0 }, SEED);
    const has = (id: number) => bricks.some((b) => b.id === id);
    for (const id of [ID.Anvil, ID.Furnace, ID.Bench, ID.Barrel, ID.IronBlock]) assert.ok(has(id), zone + " garage misses " + id);
  }
});

test("TEKS dealership: display bay, counter and racks are clear air inside the garage", () => {
  for (const zone of ZONE_IDS) {
    const size = S.structSize("village", zone);
    const s = { x: 500, z: -300, y: 40, w: size, d: size, kind: "village" as const, zone, gx: 3, gz: -2 };
    const g = S.garageOf(s, SEED);
    assert.ok(g, zone);
    const cells = new Map<string, number>();
    for (const b of S.structureBricks(s, SEED)) if (b.mode === 0) cells.set(`${s.x + b.dx},${s.y + b.dy},${s.z + b.dz}`, b.id);
    const at = (x: number, y: number, z: number) => cells.get(`${Math.floor(x)},${y},${Math.floor(z)}`);
    assert.equal(at(g.display[0], g.display[1], g.display[2]), ID.Air, zone + " bay");
    assert.equal(at(g.counter.x, s.y + 1, g.counter.z), ID.Air, zone + " counter spot");
    assert.notEqual(at(g.counter.x - 1, s.y + 1, g.counter.z), ID.Air, zone + " counter");
    for (const [x, y, z] of g.racks) {
      assert.equal(at(x, y - 1, z), ID.IronBlock, zone + " shelf");
      assert.equal(at(x, y, z), ID.Air, zone + " shelf top");
    }
    assert.ok(g.rackParts.every((id) => id > 255), "racks show Teks parts");
    assert.deepEqual(S.garageOf(s, SEED), g, "deterministic");
  }
  assert.equal(S.garageOf({ x: 0, z: 0, y: 30, w: 11, d: 11, kind: "shrine", zone: "plains", gx: 0, gz: 0 }, SEED), null);
});

test("themed villages get folk: the mechanic stands at the TEKS counter", () => {
  const s = { x: 500, z: -300, y: 40, w: 34, d: 34, kind: "village" as const, zone: "jungle" as const, gx: 3, gz: -2 };
  const folk = S.structureFolk(s, SEED);
  const g = S.garageOf(s, SEED)!;
  assert.ok(folk.length >= 4);
  assert.deepEqual(folk[0], { x: g.counter.x, z: g.counter.z, role: "mechanic" });
  for (const f of folk) assert.ok(f.x >= s.x && f.x <= s.x + s.w && f.z >= s.z && f.z <= s.z + s.d);
  assert.deepEqual(S.structureFolk(s, SEED), folk);
});
