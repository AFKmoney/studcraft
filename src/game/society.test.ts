import { test } from "node:test";
import assert from "node:assert/strict";
import { ZONE_IDS, ZONES } from "./biomes.ts";
import * as Soc from "./society.ts";

const SEED = 1234567;

test("chief quests: deterministic, valid schema, JSON-safe, vary by village and epoch", () => {
  for (const zone of ZONE_IDS) {
    const a = Soc.chiefQuests(3, -4, zone, SEED, 0);
    assert.equal(a.length, 3);
    assert.deepEqual(Soc.chiefQuests(3, -4, zone, SEED, 0), a);
    for (const q of a) {
      assert.deepEqual(Soc.validateQuest(q), [], zone + " " + q.id);
      assert.deepEqual(JSON.parse(JSON.stringify(q)), q);
      assert.equal(q.crime, false);
      if (q.type === "kill") assert.ok(ZONES[zone].mobs.some((m) => Soc.mobTag(m) === q.track.tag));
      if (q.type === "boss") assert.equal(q.track.tag, "boss:" + ZONES[zone].boss.id);
    }
  }
  const all = new Set<string>();
  for (let gx = 0; gx < 6; gx++) for (const e of [0, 1, 2]) for (const q of Soc.chiefQuests(gx, 1, "plains", SEED, e)) all.add(q.type + q.track.tag + q.track.need);
  assert.ok(all.size > 6, "variety");
  assert.ok(Soc.chiefQuests(1, 1, "plains", SEED, 2)[0].reward.coins >= Soc.chiefQuests(1, 1, "plains", SEED, 0)[0].reward.coins - 4);
});

test("validator rejects broken quests", () => {
  const q = Soc.chiefQuests(0, 0, "desert", SEED, 0)[0];
  assert.ok(Soc.validateQuest({ ...q, type: "dance" }).length);
  assert.ok(Soc.validateQuest({ ...q, track: { ...q.track, need: 0 } }).length);
  assert.ok(Soc.validateQuest({ ...q, crime: true }).length);
  assert.ok(Soc.validateQuest(null).length);
});

test("15 guilds with halls, ranks, perks and their own missions", () => {
  assert.equal(Soc.GUILDS.length, 15);
  assert.equal(new Set(Soc.GUILDS.map((g) => g.id)).size, 15);
  for (const id of ["techno", "sorcerers", "warriors", "traders", "politicians", "thieves"]) assert.ok(Soc.GUILDS.some((g) => g.id === id));
  for (const g of Soc.GUILDS) {
    assert.equal(g.ranks.length, Soc.GUILD_RANK_XP.length);
    const qs = Soc.guildQuests(g, "5,5", "mountain", SEED, 0);
    for (const q of qs) {
      assert.deepEqual(Soc.validateQuest(q), []);
      assert.ok(g.missions.includes(q.type));
    }
    assert.deepEqual(Soc.guildEntryQuest(g, "5,5", "mountain", SEED), qs[0]);
  }
  assert.equal(Soc.guildRank(0), 0);
  assert.equal(Soc.guildRank(35), 2);
  assert.equal(Soc.guildsIn(2, 2, "desertCity", SEED).length, 2);
  assert.ok(Soc.guildsIn(2, 2, "plains", SEED).every((g) => !g.outlaw));
});

test("bandit jobs are crimes with stealth", () => {
  const qs = Soc.banditQuests(7, 7, "canyon", SEED, 1);
  for (const q of qs) {
    assert.deepEqual(Soc.validateQuest(q), []);
    assert.ok(q.crime && q.stealth > 0 && q.track.kind === "crime");
  }
  assert.ok(Soc.fencePrice(10, 0) < 10 && Soc.fencePrice(10, 300) <= 8);
});

test("reputation and bounty: seen crimes cost rep and add bounty, unseen ones only feed the bandit axis", () => {
  let s: Soc.Standing = { rep: 0, bounty: 0, banditRep: 0 };
  s = Soc.commitCrime(s, "steal", false);
  assert.deepEqual(s, { rep: 0, bounty: 0, banditRep: 1 });
  s = Soc.commitCrime(s, "steal", true);
  assert.equal(s.bounty, 15);
  assert.equal(s.rep, -5);
  assert.equal(Soc.guardReaction(s, false), "warn");
  s = Soc.commitCrime(s, "break", true);
  assert.equal(Soc.guardReaction(s, false), "arrest");
  const paid = Soc.resolveArrest(s, "pay", 100);
  assert.equal(paid.standing.bounty, 0);
  assert.equal(paid.coinsPaid, 20);
  const broke = Soc.resolveArrest(s, "pay", 3);
  assert.ok(broke.jailHours >= 1 && broke.standing.bounty === 0, "can't pay → jail");
  const fight = Soc.resolveArrest(s, "resist", 100);
  assert.ok(fight.hostile && fight.standing.bounty > s.bounty);
  assert.equal(Soc.resolveArrest({ ...s, bounty: 50 }, "jail", 0).confiscate, true);
  for (let i = 0; i < 50; i++) s = Soc.commitCrime(s, "assault", true);
  assert.equal(s.rep, Soc.REP_MIN);
  assert.ok(Soc.repPrice(10, 100) < Soc.repPrice(10, 0) && Soc.repPrice(10, -100) > 10);
});

test("guard detection: cone, range, sneaking, light and line of sight", () => {
  const g = { x: 0, z: 0, yaw: 0 }; // faces -z
  const front = { x: 0, z: -6, sneaking: false, light: 1 };
  assert.ok(Soc.detection(g, front, false) > 0.5);
  assert.equal(Soc.detection(g, { ...front, z: 6 }, false), 0, "behind");
  assert.equal(Soc.detection(g, front, true), 0, "wall");
  assert.ok(Soc.detection(g, { ...front, sneaking: true }, false) < Soc.detection(g, front, false));
  assert.ok(Soc.detection(g, { ...front, light: 0 }, false) < Soc.detection(g, front, false));
  assert.equal(Soc.detection(g, { ...front, z: -30 }, false), 0, "out of range");
  assert.ok(Soc.seenBy([g], front, () => false));
  assert.ok(!Soc.seenBy([g], { x: 0, z: -7, sneaking: true, light: 0.1 }, () => false, 0.5));
});

test("money is the existing emerald currency", () => {
  assert.ok(Soc.canPay(5, 5) && !Soc.canPay(4, 5) && !Soc.canPay(5, -1));
});
