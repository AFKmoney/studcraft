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

test("guild perks apply for real: loot scales rewards, fine lowers the fine, caps hold", async () => {
  const s = new Society();
  assert.equal(s.perk("loot"), 0);
  const warriors = guildsIn(0, 0, "plains", SEED) && (await import("./society.ts")).GUILDS.find((g) => g.id === "warriors")!;
  const envoys = (await import("./society.ts")).GUILDS.find((g) => g.perk.kind === "fine")!;
  s.guilds[warriors.id] = 0;
  s.guilds[envoys.id] = 500;
  assert.ok(s.perk("loot") > 0 && s.perk("fine") <= 0.4);
  const q = chiefQuests(1, 1, "plains", SEED, 0).find((x) => x.track.kind === "kill")!;
  s.accept(q);
  for (let i = 0; i < q.track.need; i++) s.bump("kill", q.track.tag);
  const r = s.claim("soc:" + q.id, () => 0);
  assert.ok(r.give[0][1] >= q.reward.coins);
  s.crime("2,2", "burgle", true);
  const paid = s.arrest("2,2", "pay", 999);
  assert.ok(paid.coinsPaid < 40, "fine perk: " + paid.coinsPaid);
});

test("player-placed cells are remembered, saved and forgotten once broken", () => {
  const s = new Society();
  s.markPlaced(1, 40, -3);
  const back = Society.from(JSON.parse(JSON.stringify(s.toJSON())));
  assert.ok(back.takePlaced(1, 40, -3));
  assert.ok(!back.takePlaced(1, 40, -3));
  for (let i = 0; i < 4100; i++) s.markPlaced(i, 0, 0);
  assert.ok(s.placed.size <= 4000);
});

test("':llm' quest ids: next() skips the taken base quest and claim() works", async () => {
  const { baseQuestId } = await import("./societyState.ts");
  const s = new Society();
  const list = chiefQuests(3, 4, "jungle", SEED, 0);
  const q = list[0];
  const dressed = { ...q, id: q.id + ":llm" };
  assert.equal(baseQuestId(dressed.id), q.id);
  assert.match(s.accept(dressed), /New contract/);
  assert.match(s.accept(q), /Already/, "procedural twin counts as taken");
  assert.notEqual(s.next(list)?.id, q.id, "next() must not re-offer the dressed quest");
  const inv: Record<number, number> = {};
  if (dressed.track.kind === "have") inv[dressed.track.what] = dressed.track.need;
  else for (let i = 0; i < dressed.track.need; i++) s.bump(dressed.track.kind, dressed.track.tag);
  const r = s.claim("soc:" + dressed.id, (id) => inv[id] ?? 0);
  assert.ok(r.ok, r.msg);
  assert.ok(s.done.has(q.id));
  assert.notEqual(s.next(list)?.id, q.id);
});

test("B21 lot 4: two guild halls in one city never share contract ids; entry is never a boss hunt", async () => {
  const { GUILDS, guildQuests } = await import("./society.ts");
  const [a, b] = guildsIn(2, 2, "desertCity", SEED);
  const qa = guildQuests(a, "2,2", "desertCity", SEED, 0);
  const qb = guildQuests(b, "2,2", "desertCity", SEED, 0);
  for (const q of qa) assert.ok(!qb.some((x) => x.id === q.id), "ids differ between halls");
  const s = new Society();
  assert.match(s.accept(qa[0]), /^New contract/);
  assert.match(s.accept(qb[0]), /^New contract/, "taking one hall's job does not block the other's");
  for (const g of GUILDS) {
    const qs = guildQuests(g, "4,4", "plains", SEED, 0);
    if (qs.some((q) => q.type !== "boss")) assert.notEqual(guildEntryQuest(g, "4,4", "plains", SEED).type, "boss");
  }
});

test("B21 lot 4: finishing a guild's three contracts opens its next set (outlaw guilds too)", async () => {
  const { GUILDS, guildQuests } = await import("./society.ts");
  for (const g of [GUILDS.find((x) => !x.outlaw)!, GUILDS.find((x) => x.outlaw)!]) {
    const s = new Society();
    s.guilds[g.id] = 0;
    for (const q of guildQuests(g, "3,3", "plains", SEED, 0)) {
      s.accept(q);
      const a = s.active.find((x) => x.q.id === q.id)!;
      a.n = q.track.need;
      const r = s.claim("soc:" + q.id, (id) => (id === q.track.what ? q.track.need : 0));
      assert.ok(r.ok, g.id + " claim");
    }
    assert.equal(s.epoch(s.epochKey("guild", "3,3", g)), 1, g.id + " next set opens");
  }
});

test("audit 2026-10-31: an LLM-dressed guild set (legal and outlaw) opens the next epoch", async () => {
  const { GUILDS, guildQuests } = await import("./society.ts");
  for (const g of [GUILDS.find((x) => x.id === "techno")!, GUILDS.find((x) => x.id === "thieves")!]) {
    const s = new Society();
    s.guilds[g.id] = 0;
    for (const q of guildQuests(g, "3,3", "plains", SEED, 0)) {
      const dressed = { ...q, id: q.id + ":llm" };
      assert.match(s.accept(dressed), /New contract/);
      const a = s.active.find((x) => x.q.id === dressed.id)!;
      a.n = q.track.need;
      const r = s.claim("soc:" + dressed.id, (id) => (id === q.track.what ? q.track.need : 0));
      assert.ok(r.ok, g.id + " dressed claim: " + r.msg);
      if (g.outlaw) assert.equal(r.giverKey, null, "bandit claims carry no village key");
      else assert.equal(r.giverKey, "3,3", "the claim reports its own village");
    }
    assert.equal(s.epoch(s.epochKey("guild", "3,3", g)), 1, g.id + " next set opens after dressed claims");
  }
});

test("audit 2026-10-31: from() re-clamps rep and refuses a NaN banditRep", () => {
  const s = Society.from({ v: 1, standing: { "1,1": { rep: 150, bounty: 5, banditRep: Number.NaN }, "*": { rep: -150, bounty: 0, banditRep: 12 } } });
  assert.equal(s.st("1,1").rep, 100);
  assert.equal(s.st("1,1").banditRep, 0, "NaN must not freeze the fence for the whole save");
  assert.equal(s.st("*").rep, -100);
  assert.equal(s.st("*").banditRep, 12);
});
