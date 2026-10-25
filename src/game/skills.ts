export type SkillBranch = "Miner" | "Hunter" | "Mason" | "Mage";

export type SkillNode = {
  id: string;
  branch: SkillBranch;
  name: string;
  detail: string;
  need?: string;
  rank: number;
};

export const SKILLS: SkillNode[] = [
  { id: "vein", branch: "Miner", name: "Vein sense", detail: "Ore ear reaches farther, and works before rank 6.", rank: 2 },
  { id: "yield", branch: "Miner", name: "Deep yield", detail: "Ore sometimes drops a second stud.", need: "vein", rank: 4 },
  { id: "kiln", branch: "Miner", name: "Hot kiln", detail: "Fuel burns longer.", need: "yield", rank: 6 },
  { id: "butcher", branch: "Hunter", name: "Butcher", detail: "Beasts drop an extra chop.", rank: 2 },
  { id: "angler", branch: "Hunter", name: "Angler", detail: "Faster bites and a chance at a second catch. Shore shells more often.", need: "butcher", rank: 3 },
  { id: "trophy", branch: "Hunter", name: "Trophy", detail: "Fangs, fur, and scales drop more often. Those crafts unlock.", need: "angler", rank: 4 },
  { id: "mark", branch: "Hunter", name: "Marked", detail: "Blades bite hostiles for +1 more.", need: "trophy", rank: 8 },
  { id: "joint", branch: "Mason", name: "Firm joints", detail: "Tools sometimes refuse to wear down.", rank: 2 },
  { id: "plan", branch: "Mason", name: "Blueprints", detail: "You can read every special craft in the bin.", need: "joint", rank: 6 },
  { id: "raise", branch: "Mason", name: "Raised pad", detail: "Falls hurt less, on top of the rank perk.", need: "plan", rank: 10 },
  { id: "spark", branch: "Mage", name: "Spark", detail: "Unlocks the spark spell. Craft a tome to cast.", rank: 3 },
  { id: "mend", branch: "Mage", name: "Mend", detail: "Unlocks mend. The mana pool grows.", need: "spark", rank: 6 },
  { id: "blink", branch: "Mage", name: "Blink", detail: "Unlocks blink and a deeper mana pool.", need: "mend", rank: 10 },
  { id: "scribe", branch: "Mage", name: "Scribe", detail: "Wax seals and tomes count as studied. Mana trickles faster.", need: "blink", rank: 12 },
];

export function skillById(id: string) {
  return SKILLS.find((node) => node.id === id);
}

export function manaMaxFor(known: Set<string> | string[]) {
  const has = (id: string) => (known instanceof Set ? known.has(id) : known.includes(id));
  if (has("blink") || has("scribe")) return 16;
  if (has("mend")) return 12;
  return 8;
}

export function spellsFor(known: Set<string> | string[]) {
  const has = (id: string) => (known instanceof Set ? known.has(id) : known.includes(id));
  const list: { id: string; name: string; cost: number }[] = [];
  if (has("spark")) list.push({ id: "spark", name: "Spark", cost: 3 });
  if (has("mend")) list.push({ id: "mend", name: "Mend", cost: 4 });
  if (has("blink")) list.push({ id: "blink", name: "Blink", cost: 6 });
  return list;
}
