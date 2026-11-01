// Save-format guard: existing block ids are FROZEN. Worlds store raw Uint16
// ids, so renumbering an ID (or re-using a slot) silently turns saved trees,
// ground, chests… into other blocks. New ids may be added; existing ones
// may never move. If a rename is intentional, update the snapshot by hand.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BLOCKS, ID } from "./blocks.ts";

const snap = JSON.parse(readFileSync(new URL("./blockIds.snapshot.json", import.meta.url), "utf8")) as { ID: Record<string, number>; names: Record<string, string> };

test("every frozen ID keeps its number", () => {
  for (const [k, v] of Object.entries(snap.ID)) assert.equal((ID as Record<string, number>)[k], v, `ID.${k} moved`);
});

test("every frozen slot still holds a block (no id re-used or dropped)", () => {
  for (const id of Object.keys(snap.names)) assert.ok(BLOCKS[Number(id)], `block ${id} (${snap.names[id]}) vanished`);
});

test("ids are unique", () => {
  const seen = new Map<number, string>();
  for (const [k, v] of Object.entries(ID)) {
    if (seen.has(v as number)) continue; // aliases of one id are allowed
    seen.set(v as number, k);
  }
  for (const b of BLOCKS) if (b) assert.equal(BLOCKS[b.id], b);
});
