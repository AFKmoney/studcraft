import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mayYield, spillSlots } from "./yields.ts";

describe("break yields", () => {
  it("spills a chest and skips empty slots", () => {
    const piles = spillSlots([2, 0, 117], [3, 1, 0]);
    assert.deepEqual(piles, [{ id: 2, n: 3 }]);
  });

  it("lets creative drop a block that needs a pick", () => {
    assert.equal(mayYield(true, 2, 0), true);
    assert.equal(mayYield(false, 2, 0), false);
    assert.equal(mayYield(false, 2, 2), true);
    assert.equal(mayYield(false, 0, 0), true);
  });
});
