import { test } from "node:test";
import assert from "node:assert/strict";
import { BLOCKS, ID, def } from "./blocks.ts";
import { BOSS_CHANCE, SPECIES, SPECIES_BY_ID, ZONES, ZONE_IDS, bossRoll, seededRng, zoneFor, type BossState } from "./biomes.ts";
import { MOB_KINDS, SPECIES_LABEL, BOSS_LABEL, displayName } from "./mobNames.ts";

const known = new Set(BLOCKS.filter(Boolean).map((b) => b.id));
const idOk = (id: number) => known.has(id) && !!def(id).name;

test("every zone has >= 1 regular mob and a boss", () => {
  assert.ok(ZONE_IDS.length >= 11);
  for (const z of ZONE_IDS) {
    const zs = ZONES[z];
    assert.ok(zs.mobs.length >= 1, z);
    assert.ok(zs.boss && zs.boss.id && zs.boss.label, z);
    for (const m of zs.mobs) {
      assert.ok(m.species ? SPECIES_BY_ID.has(m.species) : (MOB_KINDS as readonly string[]).includes(m.kind ?? ""), `${z}: bad entry ${JSON.stringify(m)}`);
    }
    assert.ok(zs.mobs.some((m) => m.species), `${z} has no original species`);
  }
});

test("no Pétabrique (creeper) in any zone roster or as a boss", () => {
  for (const z of ZONE_IDS) {
    assert.ok(!ZONES[z].mobs.some((m) => m.kind === "creeper"), z);
    assert.notEqual(ZONES[z].boss.ai, "creeper");
  }
});

test("every boss and species has valid drops and a display name", () => {
  for (const z of ZONE_IDS) {
    const b = ZONES[z].boss;
    assert.ok(b.drops.length > 0 && b.drops.every(idOk), b.id);
    assert.ok((MOB_KINDS as readonly string[]).includes(b.ai), b.ai);
    assert.equal(BOSS_LABEL[b.id], b.label);
    assert.equal(displayName({ kind: b.ai, bossOf: b.id }), b.label);
  }
  const labels = new Set<string>();
  for (const s of SPECIES) {
    assert.ok(s.drops.length > 0 && s.drops.every(idOk), s.id);
    assert.ok((MOB_KINDS as readonly string[]).includes(s.ai), s.ai);
    assert.ok(SPECIES_LABEL[s.id] && !labels.has(s.label), s.id);
    labels.add(s.label);
  }
});

test("each boss has at most one SNR rule and rules are distinct (molten/weld reused)", () => {
  const rules = ZONE_IDS.map((z) => ZONES[z].boss.rule).filter(Boolean);
  assert.equal(new Set(rules).size, rules.length);
});

test("zone mapping covers the terrain biomes", () => {
  const mid = () => 0.3;
  for (const b of ["Jungle", "Desert", "Snow cap", "Ash ridge", "Mesa", "Fen", "Grove", "Brick plains"]) assert.ok(zoneFor(b, 30, mid), b);
  assert.equal(zoneFor("Ash ridge", 40, () => 0.9), "volcano");
  assert.equal(zoneFor("Desert", 30, () => 0.9), "desertCity");
  assert.equal(zoneFor("Ocean", 10, () => 0.9), "islands");
});

test("boss spawns on ~10% of zone entries (seeded RNG), with cooldown and one at a time", () => {
  const rnd = seededRng(1234);
  let spawns = 0;
  const N = 20000;
  for (let i = 0; i < N; i++) {
    const st: BossState = { lastZone: "plains", cooldown: 0 };
    if (bossRoll(st, "jungle", false, 1, rnd)) spawns++;
  }
  const rate = spawns / N;
  assert.ok(Math.abs(rate - BOSS_CHANCE) < 0.01, `rate ${rate}`);
  // no re-roll inside the same zone, cooldown blocks, a live boss blocks
  const st: BossState = { lastZone: "", cooldown: 0 };
  assert.equal(bossRoll(st, "jungle", false, 1, () => 0), "jungle");
  assert.equal(bossRoll(st, "jungle", false, 1, () => 0), "");
  assert.equal(bossRoll(st, "desert", false, 1, () => 0), "", "cooldown");
  st.cooldown = 0;
  assert.equal(bossRoll(st, "arctic", true, 1, () => 0), "", "boss alive");
  assert.ok(ID.Pellets);
});
