// t92u: minifig outfits on society NPCs resolve to real catalogue pieces
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ACCESSORIES } from "./accessories.ts";
import { DEDICATED_WEAPONS } from "./weaponModels.ts";

const src = readFileSync(new URL("./game.ts", import.meta.url), "utf8");
const block = src.slice(src.indexOf("export const OUTFITS"), src.indexOf("export function outfitFor"));
const rows = [...block.matchAll(/^\s+"?([\w:]+)"?: \{([^}]*)\}/gm)].map((m) => ({ soc: m[1], body: m[2] }));

test("every guild except the sorcerers (wizard kit) wears a minifig outfit", () => {
  const ids = ["techno", "warriors", "traders", "politicians", "thieves", "rangers", "mechanics", "alchemists", "miners", "explorers", "builders", "smiths", "assassins"];
  for (const id of ids) assert.ok(rows.some((r) => r.soc === "guild:" + id), id);
  for (const s of ["guard", "chief", "fence", "outfitter"]) assert.ok(rows.some((r) => r.soc === s), s);
});
test("every held piece is a catalogue accessory; weapons use dedicated builds", () => {
  const keys = new Set(ACCESSORIES.map((a) => a.key));
  for (const r of rows) for (const m of r.body.matchAll(/(right|left): "(\w+)"/g)) {
    assert.ok(keys.has(m[2]), r.soc + " " + m[2]);
    const a = ACCESSORIES.find((x) => x.key === m[2])!;
    if (a.cat === "Armes médiévales" || a.kind === "gun") assert.ok(DEDICATED_WEAPONS.includes(m[2]) || a.key.startsWith("Blaster"), m[2]);
  }
});
test("head and back pieces cover the catalogue's helmets and shoulder rows", () => {
  const heads = new Set([...block.matchAll(/head: "(\w+)"/g)].map((m) => m[1]));
  const backs = new Set([...block.matchAll(/"(backpack|airtanks|quiver|cape|breastplate)"/g)].map((m) => m[1]));
  for (const h of ["hardhat", "spacehelmet", "knight", "cap", "bicorne"]) assert.ok(heads.has(h), h);
  for (const b of ["backpack", "airtanks", "quiver", "cape", "breastplate"]) assert.ok(backs.has(b), b);
  for (const h of heads) assert.ok(src.includes(`hd === "${h}"`), "builder for " + h);
});
