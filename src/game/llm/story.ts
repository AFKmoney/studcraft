// Story director: per-save story state, the allowed-id sets from the
// real game state, the LLM → Quest mapping (validated), retry and
// procedural fallback, and background pre-generation.
import { ID } from "../blocks.ts";
import { ZONES, type ZoneId } from "../biomes.ts";
import { GUILDS, makeQuest, mobTag, validateQuest, type Quest, type QuestType } from "../society.ts";
import { buildPrompt, grammarFor, arcSentence, sanitize, REWARDS, LLM_TIMEOUT_MS, MAX_TOKENS, TEMPERATURE, type Allowed, type Context, type Fact } from "./prompt.ts";

export type StoryState = { arc: string; npcs: string[]; outcomes: { id: string; ok: boolean }[] };
export const newStory = (): StoryState => ({ arc: "", npcs: [], outcomes: [] });
export function storyFrom(d: unknown): StoryState {
  const o = d as Partial<StoryState> | undefined;
  return {
    arc: typeof o?.arc === "string" ? arcSentence(o.arc) : "",
    npcs: Array.isArray(o?.npcs) ? o.npcs.filter((n) => typeof n === "string").map(sanitize).slice(-6) : [],
    outcomes: Array.isArray(o?.outcomes) ? o.outcomes.filter((x) => x && typeof x.id === "string").slice(-12) : [],
  };
}

/** What the LLM sees about the world (pure inputs; game.ts fills it). */
export type WorldView = {
  zone: ZoneId;
  timeWord: string;
  structures: string[]; // nearby labels (already ours, not player text)
  bossUp: boolean;
  npc: { name: string; role: string; guild: string; mood: string; met: number };
  player: { level: number; coins: number; rep: number; bounty: number; jailed: number; crimes: number; guilds: string[]; rare: string[]; done: number; failed: number };
  guildsHere: string[];
};

const CRIME_TYPES: QuestType[] = ["steal", "sabotage", "pickpocket", "burgle"];
/** The rules that SHAPE the quest are enforced here (allowed types),
 *  so even a weak model cannot ignore them. */
export function allowedFor(v: WorldView, giverKind: "chief" | "guild" | "bandit"): Allowed {
  const z = ZONES[v.zone];
  let types: QuestType[];
  if (giverKind === "bandit") types = [...CRIME_TYPES];
  else if (v.player.rep <= -30) types = ["fetch", "diplomacy"]; // distrust: errands and amends only
  else if (v.player.bounty >= 20) types = giverKind === "guild" ? ["pickpocket", "steal", "fetch"] : ["diplomacy", "fetch"];
  else types = ["kill", "fetch", "find", ...(v.bossUp || v.player.level >= 5 ? (["boss"] as QuestType[]) : [])];
  if (v.player.rare.length && !types.includes("find") && giverKind !== "bandit" && v.player.rep > -30 && v.player.bounty < 20) types.push("find"); // Guide §12: the distrusted and the wanted get only what the rules allow
  const targets = [
    ...(types.includes("kill") ? z.mobs.slice(0, 4).map((m) => mobTag(m)) : []),
    ...(types.includes("boss") ? ["boss:" + z.boss.id] : []),
    ...(types.some((t) => t === "fetch" || t === "diplomacy") ? ["item:" + ID.Emerald, ...FETCH_IDS(v.zone).map((i) => "item:" + i)] : []),
    ...(types.includes("find") ? ["find:shrine", "find:mecha"] : []),
    ...types.filter((t) => CRIME_TYPES.includes(t)).map((t) => "crime:" + t),
  ];
  return { types, targets: [...new Set(targets)], items: FETCH_IDS(v.zone).map(String), locations: ["village", ...v.structures.slice(0, 4)], npcs: [v.npc.name], guilds: v.guildsHere, rewards: REWARDS };
}
function FETCH_IDS(zone: ZoneId): number[] {
  const q = makeQuest({ kind: "chief", key: "0,0", name: "x" }, zone, 1, 0, 0, ["fetch"]);
  return [q.track.what, ID.Bread, ID.Log];
}

export function contextFor(v: WorldView, story: StoryState): Context {
  const f = (k: string, val: string | number, w: number): Fact => ({ k, v: val, w });
  return {
    game: [f("biome", ZONES[v.zone].label, 5), f("time", v.timeWord, 2), f("near", v.structures.slice(0, 3).join(","), 3), f("boss_up", v.bossUp ? 1 : 0, v.bossUp ? 4 : 1), f("guilds", v.guildsHere.join(","), 2)],
    npc: [f("name", v.npc.name, 5), f("role", v.npc.role, 5), f("guild", v.npc.guild || "none", 3), f("mood", v.npc.mood, 4), f("met", v.npc.met, 2)],
    player: [
      f("rep", v.player.rep, 6),
      f("bounty", v.player.bounty, v.player.bounty ? 6 : 1),
      f("coins", v.player.coins, 3),
      f("level", v.player.level, 3),
      f("guilds", v.player.guilds.join(",") || "none", 4),
      f("rare", v.player.rare.slice(0, 2).join(",") || "none", v.player.rare.length ? 5 : 0),
      f("jailed", v.player.jailed, v.player.jailed ? 4 : 0),
      f("crimes", v.player.crimes, v.player.crimes ? 4 : 0),
      f("quests_done", v.player.done, 2),
      f("quests_failed", v.player.failed, v.player.failed ? 3 : 0),
    ],
    story: { arc: story.arc, npcs: story.npcs },
  };
}

export type LlmQuest = { type: QuestType; target: string; location: string; reward: (typeof REWARDS)[number]; guild: string; giver: string; title: string; description: string; dialogue: string; arc: string };

/** Parse + check the raw output against the allowed sets. */
export function parseLlm(text: string, a: Allowed): { q?: LlmQuest; errors: string[] } {
  let o: Record<string, unknown>;
  try {
    const m = String(text).match(/\{[\s\S]*\}/);
    o = JSON.parse(m ? m[0] : text);
  } catch {
    return { errors: ["json"] };
  }
  const e: string[] = [];
  const str = (k: string, max: number) => (typeof o[k] === "string" && (o[k] as string).trim() && (o[k] as string).length <= max ? (o[k] as string) : (e.push(k), ""));
  const type = o.type as QuestType;
  if (!a.types.includes(type)) e.push("type");
  const target = String(o.target ?? "");
  if (!a.targets.includes(target)) e.push("target");
  else if (!targetFits(type, target)) e.push("target/type");
  if (!a.locations.includes(String(o.location))) e.push("location");
  if (!REWARDS.includes(o.reward as never)) e.push("reward");
  if (o.guild !== "none" && !a.guilds.includes(String(o.guild))) e.push("guild");
  if (!a.npcs.includes(String(o.giver))) e.push("giver");
  const title = str("title", 60);
  const description = str("description", 160);
  const dialogue = str("dialogue", 200);
  const arc = str("arc", 200);
  if (e.length) return { errors: e };
  return { q: { type, target, location: String(o.location), reward: o.reward as LlmQuest["reward"], guild: String(o.guild), giver: String(o.giver), title: sanitizeText(title), description: sanitizeText(description), dialogue: sanitizeText(dialogue), arc: arcSentence(arc) }, errors: [] };
}
const sanitizeText = (s: string) => s.replace(/[^A-Za-z0-9 ,.!?'\-]/g, "").slice(0, 200);
function targetFits(t: QuestType, target: string): boolean {
  if (t === "kill") return target.startsWith("sp:") || target.startsWith("mob:");
  if (t === "boss") return target.startsWith("boss:");
  if (t === "fetch" || t === "diplomacy") return target.startsWith("item:");
  if (t === "find") return target.startsWith("find:");
  return target === "crime:" + t;
}

/** Map a parsed LLM quest onto the real game: same Quest schema the
 *  procedural generator emits, so the board, kill hooks, crime hooks
 *  and claim all apply it. Counts/rewards stay rule-based. */
export function applyLlm(l: LlmQuest, giver: Quest["giver"], zone: ZoneId, seed: number, slot: number, epoch: number, wealth: number): Quest {
  const base = makeQuest(giver, zone, seed, slot, epoch, [l.type]);
  const track = { ...base.track };
  if (l.type === "kill" || l.type === "boss") track.tag = l.target;
  // Diplomacy too (audit 2026-10-31): the validated target is the errand —
  // leaving `what` at the procedural default made the generated text name
  // one item while the claim collected emeralds.
  if (l.type === "fetch" || l.type === "diplomacy") track.what = Number(l.target.slice(5)) || track.what;
  if (l.type === "find") {
    track.tag = l.target;
    track.what = l.target === "find:shrine" ? ID.SanctumStud : ID.MechaCore;
  }
  const mul = (l.reward === "rich" ? 1.5 : l.reward === "small" ? 0.75 : 1) * (wealth > 200 ? 1.25 : 1);
  const reward = { ...base.reward, coins: Math.max(1, Math.round(base.reward.coins * mul)) };
  // Guild givers carry the guild in the id (B21 lot 4 grammar) — building
  // the id from makeQuest alone dropped the "@guild" segment, so in a
  // two-hall city an LLM quest claimed for one guild marked the other's
  // done (audit 2026-10-31). The giver's NAME is the guild's name.
  const g = GUILDS.find((x) => x.name === giver.name);
  const id = g ? `${giver.kind}:${giver.key}@${g.id}:${epoch}:${slot}:llm` : base.id + ":llm";
  return { ...base, id, track, reward, text: { title: l.title, detail: l.description + (l.dialogue ? ' "' + l.dialogue + '"' : "") } };
}

export type Llm = (prompt: string, grammar: string, opts: { temperature: number; maxTokens: number }) => Promise<string>;
export type Gen = { quest: Quest; source: "llm" | "procedural"; arc?: string; tries: number };

/** One quest: LLM (2 tries) → validated → applied, else procedural. */
export async function generateQuest(llm: Llm | null, v: WorldView, story: StoryState, giver: Quest["giver"], giverKind: "chief" | "guild" | "bandit", procedural: () => Quest, map: { seed: number; slot: number; epoch: number }, timeoutMs = LLM_TIMEOUT_MS): Promise<Gen> {
  if (!llm) return { quest: procedural(), source: "procedural", tries: 0 };
  const a = allowedFor(v, giverKind);
  const { prompt } = buildPrompt(contextFor(v, story), a);
  const g = grammarFor(a);
  for (let tries = 1; tries <= 2; tries++) {
    try {
      const out = await Promise.race([llm(prompt, g, { temperature: TEMPERATURE, maxTokens: MAX_TOKENS }), new Promise<string>((_, rej) => setTimeout(() => rej(new Error("timeout")), timeoutMs))]);
      const p = parseLlm(out, a);
      if (!p.q) continue;
      const quest = applyLlm(p.q, giver, v.zone, map.seed, map.slot, map.epoch, v.player.coins);
      if (validateQuest(quest).length) continue;
      return { quest, source: "llm", arc: p.q.arc, tries };
    } catch {
      /* retry, then fall back */
    }
  }
  return { quest: procedural(), source: "procedural", tries: 2 };
}

/** Background pre-generation: one quest ready per giver key. */
export class Director {
  story: StoryState = newStory();
  private ready = new Map<string, Gen>();
  private busy = new Set<string>();
  llm: Llm | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  /** B21: prefetches run ONE AT A TIME. The model serves a single
   *  generation and rejects a second one while busy, so two givers
   *  prefetching together (chief + guild) burned the second one's
   *  both tries instantly and parked a procedural quest instead. */
  prefetch(key: string, make: () => Promise<Gen>) {
    if (this.ready.has(key) || this.busy.has(key)) return;
    this.busy.add(key);
    this.queue = this.queue
      .then(() => make())
      .then((g) => {
        this.ready.set(key, g);
      })
      .catch(() => {})
      .finally(() => this.busy.delete(key));
  }
  /** QA / HUD: what is queued and what is ready (with its source). */
  status(): { busy: string[]; ready: { key: string; source: Gen["source"]; title: string }[] } {
    return { busy: [...this.busy], ready: [...this.ready].map(([key, g]) => ({ key, source: g.source, title: g.quest.text.title })) };
  }
  /** Take the pre-generated quest if any (and roll the arc), else null. */
  take(key: string): Gen | null {
    const g = this.ready.get(key);
    if (!g) return null;
    this.ready.delete(key);
    if (g.arc) this.story.arc = arcSentence(g.arc);
    if (!this.story.npcs.includes(g.quest.giver.name)) this.story.npcs = [...this.story.npcs, sanitize(g.quest.giver.name)].slice(-6);
    return g;
  }
  outcome(id: string, ok: boolean) {
    this.story.outcomes = [...this.story.outcomes, { id, ok }].slice(-12);
  }
}
