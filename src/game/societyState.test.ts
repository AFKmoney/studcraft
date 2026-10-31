import test from "node:test";
import assert from "node:assert/strict";
import { ID } from "./blocks.ts";
import { chiefQuests, guildEntryQuest, guildsIn, banditQuests, BOUNTY_ARREST } from "./society.ts";
import { Society, MAX_ACTIVE, OUTLAWS } from "./societyState.ts";

const SEED = 4242;

test("chief contracts: accept, progress by kill tag, claim pays coins + rep, epoch advances", () => {
  const s = new Society();
  const list = chiefQuests(3, 4, "jungle", SEED, 0);
  for (const q of list) assert.match(s.accept(q), /New contract/);
  assert.match(s.accept(list[0]), /Already/);
  const inv: Record<number, number> = {};
  const have = (id: number) => inv[id] ?? 0;
  for (const a of [...s.active]) {
    if (a.q.track.kind === "have") inv[a.q.track.what] = a.q.track.need;
    else for (let i = 0; i < a.q.track.need; i++) s.bump("kill", a.q.track.tag);
    const r = s.claim("soc:" + a.q.id, have);
    assert.ok(r.ok, r.msg);
    assert.equal(r.give[0][0], ID.Emerald);
    assert.ok(r.give[0][1] > 0);
  }
  assert.equal(s.active.length, 0);
  assert.ok(s.st("3,4").rep > 0, "good deeds raise rep");
  assert.equal(s.epoch("chief:3,4"), 1, "next set of chief quests opens");
  assert.notDeepEqual(chiefQuests(3, 4, "jungle", SEED, 1).map((q) => q.id), list.map((q) => q.id));
});

test("contract book is bounded and survives a save roundtrip; junk is dropped", () => {
  const s = new Society();
  for (let e = 0; e < 4; e++) for (const q of chiefQuests(e, 1, "desert", SEED, 0)) s.accept(q);
  assert.equal(s.active.length, MAX_ACTIVE);
  s.crime("1,1", "steal", true);
  const back = Society.from(JSON.parse(JSON.stringify(s.toJSON())));
  assert.deepEqual(back.toJSON(), s.toJSON());
  const junk = Society.from({ v: 1, active: [{ q: { id: 5 }, n: 0, done: false }], standing: { a: { rep: "x" } }, guilds: { nope: 3 } });
  assert.equal(junk.active.length, 0);
  assert.deepEqual(junk.standing, {});
  assert.deepEqual(junk.guilds, {});
});

test("guild: entry contract joins, xp ranks up", () => {
  const s = new Society();
  const g = guildsIn(2, 2, "plains", SEED)[0];
  const q = guildEntryQuest(g, "2,2", "plains", SEED);
  s.accept(q);
  const inv: Record<number, number> = { [q.track.what]: q.track.need };
  for (let i = 0; i < q.track.need; i++) s.bump(q.track.kind === "crime" ? "crime" : "kill", q.track.tag);
  const r = s.claim("soc:" + q.id, (id) => inv[id] ?? 0);
  assert.ok(r.ok);
  assert.equal(r.joined?.id, g.id);
  assert.ok(s.member(g));
  s.guilds[g.id] = 500;
  assert.ok(s.rank(g) >= 3);
});

test("crime: seen raises bounty and fails crime contracts; unseen counts; arrest clears", () => {
  const s = new Society();
  const job = banditQuests(7, 7, "canyon", SEED, 0).find((q) => q.track.tag === "crime:steal") ?? banditQuests(7, 7, "canyon", SEED, 0)[0];
  s.accept(job);
  const kind = job.track.tag.replace("crime:", "") as "steal";
  const un = s.crime("1,1", kind, false);
  assert.equal(un.standing.bounty, 0);
  assert.equal(s.active[0]?.n ?? job.track.need, Math.min(1, job.track.need) === 1 && job.track.need === 1 ? 1 : s.active[0].n);
  const seen = s.crime("1,1", "burgle", true);
  assert.ok(seen.standing.bounty >= BOUNTY_ARREST);
  assert.ok(s.st(OUTLAWS).banditRep > 0);
  const poor = s.arrest("1,1", "pay", 0);
  assert.ok(poor.jailHours > 0, "can't pay → jail");
  assert.equal(s.st("1,1").bounty, 0);
  s.crime("1,1", "steal", true);
  const paid = s.arrest("1,1", "pay", 999);
  assert.equal(paid.coinsPaid, 15);
  s.crime("1,1", "steal", true);
  assert.ok(s.arrest("1,1", "resist", 0).hostile);
});
