import { ID } from "./blocks.ts";

// P8 dissolution (master plan §10, Philippe's migration rule): an
// equipment tier that a MOULDED equivalent fully supersedes leaves
// the game — no recipe, no Creative catalogue entry, no trader or
// quest source. Copies already inside a save convert to plastic
// pellets at their melt yield when the save loads: matter never
// disappears, it just changes system.
//
// Superseded today (the moulded tool is strictly better):
// - Stone tier (T2, 80 uses) → cast plastic tools (T2, 120 uses).
// - Iron tier (T3, 160 uses) → tempered plastic tools (T3, 240).
// Kept: Wood (the starter craft — basic crafting stays), and
// Gem/Bronze/Chrome/Prism/Master tiers (no moulded equivalent yet;
// they dissolve when P7's composition moulds land).
// Yields: T2 → 6 pellets, T3 → 12 pellets (the plastic value of the
// moulded successor, grandfathered — a one-time conversion, not a
// farm: the items can no longer be obtained anywhere).
export const DISSOLVED: ReadonlyMap<number, number> = new Map([
  [ID.PickS, 6],
  [ID.SwordS, 6],
  [ID.PickI, 12],
  [ID.SwordI, 12],
  [ID.AxeI, 12],
  [ID.ShovelI, 12],
]);

export function dissolvedYield(id: number): number {
  return DISSOLVED.get(id) ?? 0;
}
