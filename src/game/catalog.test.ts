import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BLOCKS, CATALOG, CATALOG_EXCLUDED, ID, TECHNIC } from "./blocks.ts";

describe("inventory", () => {
  it("lists every technic part in its own bin", () => {
    assert.equal(TECHNIC.length, 99);
    const listed: number[] = CATALOG;
    for (const id of TECHNIC) assert.equal(listed.includes(id), true);
    assert.equal(listed.includes(ID.CrankOn), false);
    assert.equal(listed.includes(ID.ClutchOpen), false);
    assert.equal(listed.includes(ID.RingLo), false);
    assert.equal(listed.includes(ID.PlasticAxe), true);
    assert.equal(listed.includes(ID.TPlasticShovel), true);
    assert.equal(listed.includes(ID.TBlack), true);
  });

  // BUG-4 permanent invariant: the Creative catalogue is derived from the
  // registry. A def can never again be defined-but-invisible: every defined
  // def is either in CATALOG or explicitly excluded as a world state form.
  it("catalogue covers the whole registry, exactly once, no orphans", () => {
    const listed = new Set(CATALOG);
    assert.equal(listed.size, CATALOG.length, "CATALOG has duplicates");
    for (const id of CATALOG) {
      assert.ok(BLOCKS[id], `CATALOG orphan: id ${id} has no def`);
      assert.ok(!(id in CATALOG_EXCLUDED), `id ${id} is both catalogued and excluded`);
    }
    for (const d of BLOCKS) {
      if (!d) continue;
      const inCatalog = listed.has(d.id);
      const excluded = d.id in CATALOG_EXCLUDED;
      assert.ok(
        inCatalog !== excluded,
        `def ${d.id} (${d.name}) must be in CATALOG xor CATALOG_EXCLUDED (catalog=${inCatalog}, excluded=${excluded})`,
      );
    }
    for (const key of Object.keys(CATALOG_EXCLUDED)) {
      const id = Number(key);
      assert.ok(BLOCKS[id], `CATALOG_EXCLUDED orphan: id ${id} has no def`);
    }
  });

  it("includes the items BUG-4 proved were missing", () => {
    // Reed feeds the Paper recipe and a break quest; Bloom a break quest;
    // EmeraldOre ("Trade ore") is an ore like every other catalogued ore.
    assert.equal(CATALOG.includes(ID.Reed), true);
    assert.equal(CATALOG.includes(ID.Bloom), true);
    assert.equal(CATALOG.includes(ID.EmeraldOre), true);
  });
});
