import { ID } from "./blocks";
import { hash2 } from "./noise";

export const SITE_STEP = 96;

export type SiteKind = "ruin" | "camp" | "wreck" | "mine" | "shrine" | "cairn" | "outpost" | "patch";

export type Site = { x: number; z: number; y: number; kind: SiteKind };

export type SiteBrick = { dx: number; dy: number; dz: number; id: number };

function put(out: SiteBrick[], dx: number, dy: number, dz: number, id: number) {
  out.push({ dx, dy, dz, id });
}

export function siteLabel(kind: SiteKind): string {
  if (kind === "ruin") return "Ruin";
  if (kind === "camp") return "Camp";
  if (kind === "wreck") return "Wreck";
  if (kind === "mine") return "Mine";
  if (kind === "shrine") return "Shrine";
  if (kind === "cairn") return "Cairn";
  if (kind === "outpost") return "Outpost";
  return "Patch";
}

export function siteBricks(kind: SiteKind, seed: number, x: number, z: number): SiteBrick[] {
  const out: SiteBrick[] = [];
  const h = (dx: number, dz: number, salt: number) => hash2(x + dx, z + dz, seed + salt);
  if (kind === "ruin") {
    for (let dz = 0; dz < 5; dz++) {
      for (let dx = 0; dx < 5; dx++) {
        const edge = dx === 0 || dz === 0 || dx === 4 || dz === 4;
        put(out, dx, 0, dz, edge ? ID.Cobble : ID.Moss);
        if (!edge || h(dx, dz, 3) < 0.28) continue;
        const tall = 1 + (h(dx, dz, 4) > 0.5 ? 1 : 0) + (h(dx, dz, 5) > 0.8 ? 1 : 0);
        for (let dy = 1; dy <= tall; dy++) put(out, dx, dy, dz, h(dx, dz, 6) > 0.45 ? ID.Moss : ID.Cobble);
      }
    }
    put(out, 2, 1, 2, ID.Chest);
    put(out, 1, 2, 1, ID.Torch);
    put(out, 3, 1, 3, h(0, 0, 7) > 0.5 ? ID.Furnace : ID.Cobble);
    return out;
  }
  if (kind === "camp") {
    for (let dz = 0; dz < 6; dz++) {
      for (let dx = 0; dx < 6; dx++) {
        const edge = dx === 0 || dz === 0 || dx === 5 || dz === 5;
        const gate = dz === 5 && (dx === 2 || dx === 3);
        if (edge && !gate) put(out, dx, 1, dz, ID.Fence);
      }
    }
    put(out, 2, 0, 2, ID.Cobble);
    put(out, 3, 0, 2, ID.Cobble);
    put(out, 2, 1, 2, ID.Campfire);
    put(out, 1, 1, 1, ID.Chest);
    put(out, 4, 1, 1, ID.Bed);
    put(out, 4, 1, 4, ID.Torch);
    put(out, 1, 1, 4, ID.Bench);
    return out;
  }
  if (kind === "wreck") {
    for (let dz = 0; dz < 7; dz++) {
      put(out, 0, 1, dz, ID.Planks);
      put(out, 2, 1, dz, ID.Planks);
      put(out, 1, 0, dz, ID.Planks);
      if (dz === 0 || dz === 6) put(out, 1, 1, dz, ID.Planks);
    }
    put(out, 0, 2, 1, ID.Planks);
    put(out, 2, 2, 2, ID.Planks);
    put(out, 0, 2, 5, ID.Planks);
    put(out, 1, 1, 3, ID.Chest);
    put(out, 1, 2, 4, ID.Torch);
    put(out, 2, 1, 1, ID.Barrel);
    return out;
  }
  if (kind === "mine") {
    for (let dz = 0; dz < 5; dz++) {
      for (let dx = 0; dx < 5; dx++) {
        for (let dy = -8; dy <= -5; dy++) {
          const shell = dx === 0 || dz === 0 || dx === 4 || dz === 4 || dy === -8 || dy === -5;
          put(out, dx, dy, dz, shell ? ID.Cobble : ID.Air);
        }
      }
    }
    for (let dy = -7; dy <= 2; dy++) put(out, 2, dy, 2, ID.Ladder);
    put(out, 1, 1, 2, ID.Cobble);
    put(out, 3, 1, 2, ID.Cobble);
    put(out, 1, 2, 2, ID.Cobble);
    put(out, 3, 2, 2, ID.Cobble);
    put(out, 1, 3, 2, ID.Torch);
    put(out, 2, -7, 1, ID.Chest);
    put(out, 1, -6, 1, ID.Torch);
    put(out, 3, -7, 2, ID.Rail);
    put(out, 3, -7, 3, ID.Rail);
    put(out, 1, -7, 3, ID.IronOre);
    put(out, 3, -6, 1, ID.Web);
    put(out, 1, -6, 3, ID.Web);
    return out;
  }
  if (kind === "shrine") {
    for (let dz = 0; dz < 3; dz++) for (let dx = 0; dx < 3; dx++) put(out, dx, 0, dz, ID.Hard);
    put(out, 1, 1, 1, ID.Gold);
    put(out, 1, 2, 1, ID.Gold);
    put(out, 0, 1, 1, ID.Chest);
    put(out, 2, 2, 0, ID.Lantern);
    put(out, 2, 1, 2, ID.Bloom);
    put(out, 0, 1, 0, ID.Bookshelf);
    return out;
  }
  if (kind === "cairn") {
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) put(out, dx + 1, 0, dz + 1, ID.Snow);
    put(out, 1, 1, 0, ID.Stone);
    put(out, 1, 1, 2, ID.Stone);
    put(out, 0, 1, 1, ID.Stone);
    put(out, 2, 1, 1, ID.Stone);
    put(out, 1, 1, 1, ID.Chest);
    put(out, 1, 2, 1, ID.Snow);
    put(out, 1, 3, 1, ID.Snow);
    put(out, 2, 2, 2, ID.Lantern);
    return out;
  }
  if (kind === "outpost") {
    for (let dz = 0; dz < 7; dz++) {
      for (let dx = 0; dx < 7; dx++) {
        const edge = dx === 0 || dz === 0 || dx === 6 || dz === 6;
        const gate = dz === 6 && (dx === 3 || dx === 2);
        if (edge && !gate) put(out, dx, 1, dz, ID.Fence);
      }
    }
    for (const [dx, dz] of [
      [0, 0],
      [6, 0],
      [0, 6],
      [6, 6],
    ] as const) {
      put(out, dx, 1, dz, ID.Cobble);
      put(out, dx, 2, dz, ID.Cobble);
      put(out, dx, 3, dz, ID.Cobble);
    }
    put(out, 0, 4, 0, ID.Lamp);
    put(out, 3, 1, 3, ID.Chest);
    put(out, 3, 1, 2, ID.Campfire);
    put(out, 4, 1, 4, ID.Barrel);
    return out;
  }
  for (let dz = 0; dz < 5; dz++) for (let dx = 0; dx < 5; dx++) put(out, dx, 0, dz, ID.Grass);
  put(out, 0, 1, 0, ID.Hay);
  put(out, 1, 1, 0, ID.Hay);
  put(out, 3, 1, 0, ID.Pumpkin);
  put(out, 4, 1, 1, ID.Pumpkin);
  put(out, 0, 1, 3, ID.Melon);
  put(out, 1, 1, 4, ID.Melon);
  put(out, 4, 1, 3, ID.Mushroom);
  put(out, 3, 1, 4, ID.MushroomRed);
  put(out, 2, 1, 4, ID.Berry);
  put(out, 2, 1, 1, ID.Chest);
  put(out, 4, 2, 0, ID.Lantern);
  return out;
}
