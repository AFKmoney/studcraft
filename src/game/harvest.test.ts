// Philippe 2026-10-31 (« la récolte ne marche plus »): the mining chips took
// the 12th STUDS piece on the last damage stage, which set the block to Air
// BEFORE breakBlock() ran, so breakBlock saw Air and nothing ever dropped.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BLOCKS, ID } from "./blocks.ts";
import { mayYield } from "./yields.ts";

test("mining chips always leave a piece for breakBlock (drops happen)", () => {
  const src = readFileSync(new URL("./game.ts", import.meta.url), "utf8");
  const call = src.match(/chipPieces\(hit\.x, hit\.y, hit\.z, left\.slice\(0, ([^)]*\)[^)]*)\)/);
  assert.ok(call, "mining chipPieces call not found");
  assert.match(call[1], /left\.length - 1/, "mining may chip the last piece again → no drop");
  // and breakBlock must still follow the chip in the same branch
  assert.ok(src.indexOf("if (mineTime >= need) breakBlock(hit.x, hit.y, hit.z);") > src.indexOf(call[0]));
});

test("base blocks yield with bare hands (and stone with a pick)", () => {
  const drop = (id: number) => { const d = BLOCKS[id].drop; return d === -1 ? 0 : d || id; };
  assert.equal(drop(ID.Grass), ID.Dirt);
  for (const id of [ID.Dirt, ID.Log, ID.Sand, ID.Planks]) {
    assert.ok(mayYield(false, BLOCKS[id].need, 0), BLOCKS[id].name);
    assert.equal(drop(id), id, BLOCKS[id].name);
  }
  assert.ok(!mayYield(false, BLOCKS[ID.Stone].need, 0) && mayYield(false, BLOCKS[ID.Stone].need, 1));
  assert.notEqual(drop(ID.Stone), 0);
});
