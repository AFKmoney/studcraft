import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CATALOG, ID, TECHNIC } from "./blocks.ts";

describe("inventory", () => {
  it("lists every technic part in its own bin", () => {
    assert.equal(TECHNIC.length, 90);
    const listed: number[] = CATALOG;
    for (const id of TECHNIC) assert.equal(listed.includes(id), true);
    assert.equal(listed.includes(ID.CrankOn), false);
    assert.equal(listed.includes(ID.ClutchOpen), false);
    assert.equal(listed.includes(ID.RingLo), false);
    assert.equal(listed.includes(ID.PlasticAxe), true);
    assert.equal(listed.includes(ID.TPlasticShovel), true);
    assert.equal(listed.includes(ID.TBlack), true);
  });
});
