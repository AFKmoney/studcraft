// Teks part icons (step 6 of the Teks relay): one PNG per part,
// rendered OFF-GAME from the part's REAL geometry (teksGeo.ts) — an icon
// is the part itself, never a drawing or a photo. The files live in
// public/icons-160/icons/ and are served as "icons/teks-<id>.png", the
// same convention as the mesher cube icons (CUBE_ICONS in cubeIcons.ts).
//
// This mapping is DERIVED from the TEKS registry in blocks.ts — there is
// no hand-maintained list: a part added to TEKS gets its icon path here
// automatically, and its PNG the next time the icon render is regenerated.
import { TEKS } from "./blocks";

export const TEKS_ICONS: Record<number, string> = Object.fromEntries(
  TEKS.map((id) => [id, `icons/teks-${id}.png`]),
);

/** Icon path for a Teks part id, or undefined for any other id. */
export function teksIcon(id: number): string | undefined {
  return TEKS_ICONS[id];
}
