/** What a broken chest or barrel spills. Empty slots stay out. */
export function spillSlots(ids: number[], ns: number[]): { id: number; n: number }[] {
  const out: { id: number; n: number }[] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i] ?? 0;
    const n = ns[i] ?? 0;
    if (id > 0 && n > 0) out.push({ id, n });
  }
  return out;
}

/** Creative ignores the pick tier. Survival still respects it. */
export function mayYield(creative: boolean, need: number, pickTier: number): boolean {
  return creative || need <= 0 || pickTier >= need;
}
