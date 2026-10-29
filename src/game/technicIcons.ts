// Technic part icons (step 6 of the Technic relay): one PNG per part,
// rendered OFF-GAME from the part's REAL geometry (technicGeo.ts) — an icon
// is the part itself, never a drawing or a photo. The files live in
// public/icons-160/icons/ and are served as "icons/technic-<id>.png", the
// same convention as the mesher cube icons (CUBE_ICONS in cubeIcons.ts).
//
// This mapping is DERIVED from the TECHNIC registry in blocks.ts — there is
// no hand-maintained list: a part added to TECHNIC gets its icon path here
// automatically, and its PNG the next time the icon render is regenerated.
import { TECHNIC } from "./blocks";

export const TECHNIC_ICONS: Record<number, string> = Object.fromEntries(
  TECHNIC.map((id) => [id, `icons/technic-${id}.png`]),
);

/** Icon path for a Technic part id, or undefined for any other id. */
export function technicIcon(id: number): string | undefined {
  return TECHNIC_ICONS[id];
}
