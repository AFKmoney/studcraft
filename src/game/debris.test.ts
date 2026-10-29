import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEBRIS_PARTS, debrisAt, debrisStuds } from "./debris.ts";

describe("technic debris", () => {
  it("picks one seeded pile of technic parts per chunk", () => {
    const a = debrisAt(7, 3, 4);
    const b = debrisAt(7, 3, 4);
    assert.deepEqual(a, b);
    assert.notDeepEqual(a, debrisAt(8, 3, 4));
    assert.ok(a.lx >= 2 && a.lx < 14 && a.lz >= 2 && a.lz < 14);
    assert.equal(a.ids.length, 3);
    for (const id of a.ids) {
      assert.ok(DEBRIS_PARTS.includes(id as (typeof DEBRIS_PARTS)[number]));
      assert.ok(id > 255);
    }
  });

  it("is bricks, not voxels, and does not come back once marked", () => {
    const spot = debrisAt(7, 3, 4);
    const x = 3 * 16 + spot.lx;
    const z = 4 * 16 + spot.lz;
    const studs = debrisStuds(7, 3, 4, 30);
    assert.deepEqual(
      studs.map((s) => [s.id, s.sx, s.sy, s.sz]),
      [
        [spot.ids[0], x * 2, 31, z * 2],
        [spot.ids[1], (x + 1) * 2, 31, z * 2],
        [spot.ids[2], x * 2, 32, z * 2],
      ],
    );
    const world = readFileSync(new URL("./world.ts", import.meta.url), "utf8");
    const game = readFileSync(new URL("./game.ts", import.meta.url), "utf8");
    assert.equal(world.includes("debrisAt"), false);
    assert.equal(game.includes("world.edits.set(mark, ID.Bedrock)"), true);
    assert.equal(game.includes("addBrick(c.id, c.x * 2, c.y, c.z * 2)"), true);
  });
});
