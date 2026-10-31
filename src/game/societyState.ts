// Society state (pure, serializable): active contracts from chiefs,
// guilds and bandits, per-village standing (rep + bounty), guild
// membership/xp, the arrest verdicts. game.ts only feeds it events
// (kills, crimes, talk) and applies what it returns (items, coins,
// teleports). Quests themselves come from society.ts (seeded tables).
import { COIN, GUILDS, guildRank, commitCrime, goodDeed, resolveArrest, validateQuest, type CrimeKind, type Guild, type Quest, type Standing, type Verdict } from "./society.ts";

export type Active = { q: Quest; n: number; done: boolean };
export type SocietySave = { v: 1; active: Active[]; done: string[]; standing: Record<string, Standing>; guilds: Record<string, number>; epochs: Record<string, number> };
export type BoardRow = { id: string; name: string; detail: string; n: number; need: number; done: boolean; ready: boolean; reward: string; chainName: string; from: string; locked: boolean };
export const MAX_ACTIVE = 8;
/** Bandit standing lives on one shared axis. */
export const OUTLAWS = "*";

export class Society {
  active: Active[] = [];
  done = new Set<string>();
  standing: Record<string, Standing> = {};
  guilds: Record<string, number> = {};
  epochs: Record<string, number> = {};

  static from(d: unknown): Society {
    const s = new Society();
    const o = d as Partial<SocietySave> | undefined;
    if (!o || o.v !== 1) return s;
    s.active = (o.active ?? []).filter((a) => a && validateQuest(a.q).length === 0 && Number.isInteger(a.n)).slice(0, MAX_ACTIVE);
    s.done = new Set((o.done ?? []).filter((v) => typeof v === "string"));
    for (const [k, v] of Object.entries(o.standing ?? {})) if (v && Number.isFinite(v.rep) && Number.isFinite(v.bounty)) s.standing[k] = { rep: v.rep, bounty: Math.max(0, v.bounty), banditRep: v.banditRep ?? 0 };
    for (const [k, v] of Object.entries(o.guilds ?? {})) if (GUILDS.some((g) => g.id === k) && Number.isFinite(v)) s.guilds[k] = v;
    for (const [k, v] of Object.entries(o.epochs ?? {})) if (Number.isInteger(v)) s.epochs[k] = v;
    return s;
  }
  toJSON(): SocietySave {
    return { v: 1, active: this.active.map((a) => ({ ...a })), done: [...this.done].slice(-400), standing: { ...this.standing }, guilds: { ...this.guilds }, epochs: { ...this.epochs } };
  }

  st(key: string): Standing {
    return this.standing[key] ?? { rep: 0, bounty: 0, banditRep: 0 };
  }
  epoch(giverKey: string): number {
    return this.epochs[giverKey] ?? 0;
  }
  member(g: Guild): boolean {
    return g.id in this.guilds;
  }
  rank(g: Guild): number {
    return guildRank(this.guilds[g.id] ?? 0);
  }

  /** The next quest of a list the player hasn't taken or finished. */
  next(list: readonly Quest[]): Quest | null {
    return list.find((q) => !this.done.has(q.id) && !this.active.some((a) => a.q.id === q.id)) ?? null;
  }
  accept(q: Quest): string {
    if (validateQuest(q).length) return "That contract makes no sense.";
    if (this.done.has(q.id) || this.active.some((a) => a.q.id === q.id)) return "Already taken: " + q.text.title;
    if (this.active.length >= MAX_ACTIVE) return "Your contract book is full (" + MAX_ACTIVE + ").";
    this.active.push({ q, n: 0, done: false });
    return "New contract — " + q.text.title + ": " + q.text.detail;
  }
  /** A kill or an unseen crime: count it for matching contracts. */
  bump(kind: "kill" | "crime", tag: string): Quest[] {
    const hit: Quest[] = [];
    for (const a of this.active) {
      if (a.q.track.kind !== kind || a.q.track.tag !== tag || a.n >= a.q.track.need) continue;
      a.n += 1;
      if (a.n >= a.q.track.need) hit.push(a.q);
    }
    return hit;
  }
  ready(a: Active, have: (id: number) => number): boolean {
    return a.q.track.kind === "have" ? have(a.q.track.what) >= a.q.track.need : a.n >= a.q.track.need;
  }
  rows(have: (id: number) => number, nameOf: (id: number) => string): BoardRow[] {
    return this.active.map((a) => {
      const n = a.q.track.kind === "have" ? Math.min(a.q.track.need, have(a.q.track.what)) : a.n;
      const reward = [a.q.reward.coins + " emerald", ...a.q.reward.items.map(([id, k]) => k + " " + nameOf(id).toLowerCase())].join(", ");
      return { id: "soc:" + a.q.id, name: a.q.text.title, detail: a.q.text.detail + " (" + a.q.giver.name + ")", n, need: a.q.track.need, done: false, ready: this.ready(a, have), reward, chainName: "Contracts", from: "Chiefs, guilds and fences", locked: false };
    });
  }
  /** Claim a board row: what to take, what to give, and the message.
   *  `villageKey` receives the rep (chiefs/guilds); bandit jobs raise
   *  the outlaw axis instead. */
  claim(rowId: string, have: (id: number) => number): { ok: boolean; msg: string; take: [number, number][]; give: [number, number][]; rep: number; joined?: Guild; rankUp?: Guild } {
    const id = rowId.replace(/^soc:/, "");
    const i = this.active.findIndex((a) => a.q.id === id);
    const none = { ok: false, take: [] as [number, number][], give: [] as [number, number][], rep: 0 };
    if (i < 0) return { ...none, msg: "No such contract" };
    const a = this.active[i];
    if (!this.ready(a, have)) return { ...none, msg: a.q.text.detail };
    const q = a.q;
    this.active.splice(i, 1);
    this.done.add(q.id);
    const take: [number, number][] = q.track.kind === "have" ? [[q.track.what, q.track.need]] : [];
    const give: [number, number][] = [[COIN, q.reward.coins], ...q.reward.items];
    const key = q.giver.key;
    let joined: Guild | undefined;
    let rankUp: Guild | undefined;
    if (q.giver.kind === "bandit") {
      const o = this.st(OUTLAWS);
      this.standing[OUTLAWS] = { ...o, banditRep: Math.min(100, o.banditRep + 5) };
    } else this.standing[key] = goodDeed(this.st(key), q.reward.rep);
    const g = GUILDS.find((x) => x.name === q.giver.name);
    if (g) {
      if (!this.member(g)) {
        this.guilds[g.id] = 0;
        joined = g;
      }
      const before = this.rank(g);
      this.guilds[g.id] += q.reward.guildXp;
      if (this.rank(g) > before) rankUp = g;
    }
    // a giver's next set opens once this epoch's contracts are all done
    const ep = q.id.split(":")[2];
    const gk = q.giver.kind + ":" + key + (g ? ":" + g.id : "");
    if ([0, 1, 2].every((slot) => this.done.has(`${q.giver.kind}:${key}:${ep}:${slot}`))) this.epochs[gk] = Number(ep) + 1;
    return { ok: true, msg: "Contract done: " + q.text.title, take, give, rep: q.giver.kind === "bandit" ? 0 : q.reward.rep, joined, rankUp };
  }
  epochKey(kind: string, key: string, g?: Guild): string {
    return kind + ":" + key + (g ? ":" + g.id : "");
  }
  /** A crime at a village. Seen: rep/bounty and any crime contract
   *  of that tag fails. Unseen: crime contracts count it. */
  crime(key: string, kind: CrimeKind, seen: boolean): { standing: Standing; failed: Quest[]; counted: Quest[] } {
    const next = commitCrime(this.st(key), kind, seen);
    this.standing[key] = next;
    const o = this.st(OUTLAWS);
    this.standing[OUTLAWS] = { ...o, banditRep: Math.min(100, o.banditRep + (seen ? 2 : 1)) };
    const tag = "crime:" + (kind === "break" ? "sabotage" : kind);
    if (!seen) return { standing: next, failed: [], counted: this.bump("crime", tag) };
    const failed = this.active.filter((a) => a.q.track.kind === "crime" && a.q.track.tag === tag).map((a) => a.q);
    this.active = this.active.filter((a) => !failed.includes(a.q));
    return { standing: next, failed, counted: [] };
  }
  arrest(key: string, choice: "pay" | "jail" | "resist", wallet: number): Verdict {
    const v = resolveArrest(this.st(key), choice, wallet);
    this.standing[key] = v.standing;
    return v;
  }
}
