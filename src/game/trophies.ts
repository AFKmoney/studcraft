// Trophies (2026-11-01, Claude) — pure and tested. The game counts what the
// player DOES (mined, built, killed, crafted, traded, drove…) in a small
// persisted stats map; a trophy is earned the moment its stat reaches the
// goal. Three tiers per line so there is always a next goal in sight.

export type Stat =
  | "mined" | "placed" | "kills" | "bosses" | "crafted" | "smelted" | "trades" | "quests"
  | "vehicles" | "drive" | "shots" | "teks" | "days" | "deaths" | "fished" | "reputation";

export type Tier = "bronze" | "silver" | "gold";
export type Trophy = { id: string; name: string; desc: string; stat: Stat; goal: number; tier: Tier; xp: number };

const LINES: [Stat, string, string, [number, number, number], [string, string, string]][] = [
  ["mined", "Breaker", "Break {n} blocks", [50, 1000, 10000], ["Chipper", "Quarryman", "Mountain eater"]],
  ["placed", "Builder", "Place {n} bricks", [50, 1000, 10000], ["Stacker", "Architect", "Master builder"]],
  ["kills", "Hunter", "Defeat {n} creatures", [10, 150, 1000], ["First blood", "Monster hunter", "Legend of the wilds"]],
  ["bosses", "Slayer", "Defeat {n} bosses", [1, 5, 15], ["Boss down", "Boss breaker", "Bane of titans"]],
  ["crafted", "Maker", "Craft {n} items", [20, 300, 2000], ["Tinkerer", "Artisan", "Grand maker"]],
  ["smelted", "Founder", "Pour {n} kiln outputs", [10, 200, 1500], ["First pour", "Foundry hand", "Master founder"]],
  ["trades", "Trader", "Trade {n} times", [5, 60, 400], ["Haggler", "Merchant", "Tycoon"]],
  ["quests", "Hero", "Finish {n} quests and contracts", [3, 30, 150], ["Helping hand", "Village hero", "Living legend"]],
  ["vehicles", "Driver", "Own {n} vehicles", [1, 4, 12], ["First wheels", "Garage regular", "Collector"]],
  ["drive", "Road", "Drive {n} blocks", [200, 5000, 50000], ["Joyride", "Road tripper", "Cross-country"]],
  ["shots", "Marksman", "Fire {n} rounds", [25, 500, 5000], ["Trigger finger", "Gunslinger", "Sharpshooter"]],
  ["teks", "Engineer", "Assemble {n} Teks parts", [10, 200, 2000], ["Pin pusher", "Engineer", "Chief engineer"]],
  ["days", "Survivor", "Live through {n} days", [3, 30, 100], ["Settled in", "Old hand", "Ageless"]],
  ["fished", "Angler", "Reel in {n} catches", [5, 60, 300], ["Nibble", "Angler", "Sea whisperer"]],
  ["reputation", "Honour", "Reach {n} reputation in a village", [10, 40, 90], ["Known face", "Respected", "Beloved"]],
];

const TIERS: Tier[] = ["bronze", "silver", "gold"];
const XP: Record<Tier, number> = { bronze: 25, silver: 120, gold: 500 };

export const TROPHIES: Trophy[] = LINES.flatMap(([stat, line, desc, goals, names]) =>
  goals.map((goal, i) => ({ id: stat + ":" + i, name: names[i], desc: (goal === 1 ? desc.replace(/\{n\} (\w+)/, (_m, w: string) => "1 " + (w.endsWith("sses") ? w.slice(0, -2) : w.replace(/s$/, ""))) : desc.replace("{n}", goal.toLocaleString("en-US"))) + " (" + line + ")", stat, goal, tier: TIERS[i], xp: XP[TIERS[i]] })),
);

export type Stats = Partial<Record<Stat, number>>;

/** Add to a stat ("max" stats like reputation/days keep the highest value). */
export function bump(stats: Stats, s: Stat, n = 1, max = false): void {
  const cur = stats[s] ?? 0;
  stats[s] = max ? Math.max(cur, n) : cur + n;
}

/** Trophies newly earned by `stats` that `have` does not hold yet. */
export function newlyEarned(stats: Stats, have: ReadonlySet<string>): Trophy[] {
  return TROPHIES.filter((t) => !have.has(t.id) && (stats[t.stat] ?? 0) >= t.goal);
}

/** HUD rows: every trophy with progress 0..1, earned first per line. */
export function trophyRows(stats: Stats, have: ReadonlySet<string>) {
  return TROPHIES.map((t) => ({ id: t.id, name: t.name, desc: t.desc, tier: t.tier, earned: have.has(t.id), value: Math.min(stats[t.stat] ?? 0, t.goal), goal: t.goal }));
}

/** Sanitise persisted stats (unknown keys / bad numbers dropped). */
export function statsFrom(d: unknown): Stats {
  const out: Stats = {};
  if (!d || typeof d !== "object") return out;
  const keys = new Set(TROPHIES.map((t) => t.stat));
  for (const [k, v] of Object.entries(d as Record<string, unknown>)) if (keys.has(k as Stat) && typeof v === "number" && Number.isFinite(v) && v >= 0) out[k as Stat] = Math.floor(v);
  return out;
}
