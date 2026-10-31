import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { beadSegments, weldComponentOf } from "./weld.ts";

describe("P2 welding — pure half", () => {
  it("components walk the joint graph and stop at its edge", () => {
    const welds = new Set(["a|b", "b|c", "x|y"]);
    assert.deepEqual(weldComponentOf(welds, "a").sort(), ["a", "b", "c"]);
    assert.deepEqual(weldComponentOf(welds, "c").sort(), ["a", "b", "c"]);
    assert.deepEqual(weldComponentOf(welds, "x").sort(), ["x", "y"]);
    assert.deepEqual(weldComponentOf(welds, "solo"), ["solo"]);
  });

  it("a stacked pair wears a horizontal ring at the seam height", () => {
    const lower = { sx: 0, sy: 10, sz: 0 };
    const upper = { sx: 0, sy: 11, sz: 0 };
    const segs = beadSegments(lower, upper);
    assert.equal(segs.length, 4);
    for (const s of segs) assert.equal(s.cy, 11, "ring sits at the upper brick's floor");
    // The ring traces the full 1x1 footprint perimeter.
    const xs = segs.map((s) => s.cx);
    const zs = segs.map((s) => s.cz);
    assert.ok(Math.min(...xs) <= 0.01 && Math.max(...xs) >= 0.99);
    assert.ok(Math.min(...zs) <= 0.01 && Math.max(...zs) >= 0.99);
    // Order of the pair does not matter.
    assert.deepEqual(beadSegments(upper, lower), segs);
  });

  it("a partial overlap rings the OVERLAP, not either brick", () => {
    const lower = { sx: 0, sy: 10, sz: 0 }; // studs x 0..2
    const upper = { sx: 1, sy: 11, sz: 0 }; // studs x 1..3 — 1-stud overlap
    const segs = beadSegments(lower, upper);
    const west = Math.min(...segs.map((s) => s.cx - s.sx / 2));
    const east = Math.max(...segs.map((s) => s.cx + s.sx / 2));
    assert.ok(Math.abs(west - 0.5) < 0.06, "west edge at the overlap start (0.5 blocks): " + west);
    assert.ok(Math.abs(east - 1.0) < 0.06, "east edge at the overlap end (1 block): " + east);
  });

  it("a side-by-side pair wears a vertical ring in the contact plane", () => {
    const a = { sx: 0, sy: 10, sz: 0 };
    const b = { sx: 2, sy: 10, sz: 0 };
    const segs = beadSegments(a, b);
    assert.equal(segs.length, 4);
    for (const s of segs) assert.ok(Math.abs(s.cx - 1) < 0.06, "ring lies in the x=1 contact plane");
    const top = segs.reduce((m, s) => Math.max(m, s.cy), 0);
    assert.equal(top, 11, "a bar crowns the top seam");
    // Along z the ring spans the shared face only.
    const b2 = { sx: 2, sy: 10, sz: 1 }; // half-overlap in z (studs 1..3 vs 0..2)
    const segs2 = beadSegments(a, b2);
    const zmin = Math.min(...segs2.map((s) => s.cz - s.sz / 2));
    assert.ok(zmin >= 0.44, "ring starts at the z overlap (0.5): " + zmin);
  });

  it("non-touching bricks get no bead", () => {
    assert.deepEqual(beadSegments({ sx: 0, sy: 10, sz: 0 }, { sx: 6, sy: 10, sz: 0 }), []);
    assert.deepEqual(beadSegments({ sx: 0, sy: 10, sz: 0 }, { sx: 0, sy: 13, sz: 0 }), []);
  });
});
