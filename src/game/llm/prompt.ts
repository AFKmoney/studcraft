// NPC LLM prompt (Bonsai 1.7B, Q1_0): LIGHT on purpose. One terse
// key=value per line, top facts only, the ALLOWED ids listed so the
// grammar can pin the output to real entities. Hard budget below.
import type { QuestType } from "../society.ts";

export const MAX_PROMPT_TOKENS = 600;
export const TEMPERATURE = 0.4;
export const MAX_TOKENS = 160;
export const ARC_WORDS = 20;
export const TOP_FACTS = 4;
export const LLM_TIMEOUT_MS = 12000;

/** ~3.2 chars/token (Qwen3 BPE on short English + ids): conservative. */
export function estimateTokens(s: string): number {
  return Math.ceil(s.length / 3.2);
}

/** Player-authored strings (item names, signs): letters, digits, space,
 *  ' and -, at most 24 chars; instruction-ish words are dropped. */
export function sanitize(s: string): string {
  return String(s ?? "")
    .replace(/[^A-Za-z0-9 '\-]/g, " ")
    .replace(/\b(ignore|system|assistant|user|prompt|instruction[s]?|json|grammar|override)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
}

export type Fact = { k: string; v: string | number; w: number };
export type Context = {
  game: Fact[];
  npc: Fact[];
  player: Fact[];
  story: { arc: string; npcs: string[] };
};
export type Allowed = {
  types: QuestType[];
  targets: string[];
  items: string[];
  locations: string[];
  npcs: string[];
  guilds: string[];
  rewards: readonly string[];
};
export const REWARDS = ["small", "fair", "rich"] as const;

const top = (fs: Fact[], n = TOP_FACTS) =>
  [...fs].sort((a, b) => b.w - a.w || a.k.localeCompare(b.k)).slice(0, n).map((f) => `${f.k}=${typeof f.v === "string" ? sanitize(f.v) : f.v}`);

export function arcSentence(s: string): string {
  return sanitize(s.replace(/[.!?].*$/, "")).length ? s.replace(/[^A-Za-z0-9 ,'\-]/g, " ").split(/\s+/).filter(Boolean).slice(0, ARC_WORDS).join(" ") : "";
}

const SYSTEM =
  "You write one quest for a voxel RPG NPC. Output ONLY JSON matching the grammar. Use ONLY ids from allowed_*. " +
  "Low rep: shady or refuse (type=refuse not allowed: pick the least risky). High bounty: crime work. Rich player: reward=rich. Rare item: tie it to the arc. " +
  "title<=6 words, description<=20 words, dialogue<=25 words, arc<=20 words continuing story.arc.";
const SHOT =
  'example={"type":"kill","target":"mob:spider","location":"village","reward":"fair","guild":"none","giver":"Chief Oda","title":"Spiders at the well","description":"Kill 4 spiders near the well.","dialogue":"They bite our children. Help us.","arc":"Oda fears the canyon nests are spreading."}';

export function buildPrompt(ctx: Context, allowed: Allowed): { prompt: string; tokens: number; lines: string[] } {
  const al = [
    "allowed_type=" + allowed.types.join("|"),
    "allowed_target=" + allowed.targets.slice(0, 8).join("|"),
    "allowed_location=" + allowed.locations.slice(0, 5).map(sanitize).join("|"),
    "allowed_giver=" + allowed.npcs.slice(0, 3).map(sanitize).join("|"),
    "allowed_guild=" + ["none", ...allowed.guilds.slice(0, 3)].join("|"),
  ];
  // fixed priority when trimming: story > npc > player > game (last dropped first)
  const blocks: string[][] = [
    ["story.arc=" + (arcSentence(ctx.story.arc) || "none"), "story.npcs=" + ctx.story.npcs.slice(0, 3).map(sanitize).join(",")],
    top(ctx.npc).map((l) => "npc." + l),
    top(ctx.player).map((l) => "player." + l),
    top(ctx.game).map((l) => "game." + l),
  ];
  const build = () => [SYSTEM, SHOT, ...al, ...blocks.flat(), "quest="].join("\n");
  let p = build();
  for (let b = blocks.length - 1; estimateTokens(p) > MAX_PROMPT_TOKENS && b >= 0; ) {
    if (blocks[b].length) blocks[b].pop();
    else b--;
    p = build();
  }
  return { prompt: p, tokens: estimateTokens(p), lines: blocks.flat() };
}

/** GBNF that pins every enum field to the allowed ids (llama.cpp syntax). */
export function grammarFor(a: Allowed): string {
  const alt = (xs: readonly string[]) => (xs.length ? xs : ["none"]).map((x) => JSON.stringify(JSON.stringify(x).slice(1, -1)).replace(/^"/, '"\\"').replace(/"$/, '\\""')).join(" | ");
  return [
    'root ::= "{" ws "\\"type\\":" ws type "," ws "\\"target\\":" ws target "," ws "\\"location\\":" ws loc "," ws "\\"reward\\":" ws reward "," ws "\\"guild\\":" ws guild "," ws "\\"giver\\":" ws giver "," ws "\\"title\\":" ws str "," ws "\\"description\\":" ws str "," ws "\\"dialogue\\":" ws str "," ws "\\"arc\\":" ws str ws "}"',
    "type ::= " + alt(a.types),
    "target ::= " + alt(a.targets),
    "loc ::= " + alt(a.locations),
    "reward ::= " + alt(a.rewards),
    "guild ::= " + alt(["none", ...a.guilds]),
    "giver ::= " + alt(a.npcs),
    'str ::= "\\"" [A-Za-z0-9 ,.!?\'\\-]{1,140} "\\""',
    "ws ::= [ ]?",
  ].join("\n");
}
