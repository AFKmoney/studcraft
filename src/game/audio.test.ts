import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BRICK_BREAK, PLACE_CLICK, SNAP_CLICK } from "./audio.ts";

describe("place click", () => {
  it("is two synthesized tones and not an audio file", () => {
    const src = readFileSync(new URL("./audio.ts", import.meta.url), "utf8");
    assert.equal(/\.wav|\.mp3|\.ogg|decodeAudioData|fetch\(/.test(src), false);
    assert.equal(PLACE_CLICK.length, 2);
    assert.ok(PLACE_CLICK[0].dur < 0.02);
    assert.ok(PLACE_CLICK[0].freq > PLACE_CLICK[1].freq);
    assert.equal(src.includes("for (const n of PLACE_CLICK)"), true);
  });

  it("snaps higher and shorter than the place click when a brick seats", () => {
    const src = readFileSync(new URL("./audio.ts", import.meta.url), "utf8");
    const game = readFileSync(new URL("./game.ts", import.meta.url), "utf8");
    const seat = game.slice(game.indexOf("function placeBrickNow"), game.indexOf("function tryPlaceBrick"));
    assert.equal(SNAP_CLICK.length, 1);
    assert.ok(SNAP_CLICK[0].freq > PLACE_CLICK[0].freq);
    assert.ok(SNAP_CLICK[0].dur < PLACE_CLICK[0].dur);
    assert.equal(/\.wav|\.mp3|\.ogg|decodeAudioData|fetch\(/.test(src), false);
    assert.equal(seat.includes("audio.snap()"), true);
    assert.equal(seat.includes("audio.place()"), false);
  });

  it("breaks a brick with a lower synthesized rattle", () => {
    const src = readFileSync(new URL("./audio.ts", import.meta.url), "utf8");
    const game = readFileSync(new URL("./game.ts", import.meta.url), "utf8");
    const fn = game.slice(game.indexOf("function breakBrick"), game.indexOf("structural integrity"));
    assert.ok(BRICK_BREAK.every((n) => n.freq < SNAP_CLICK[0].freq));
    assert.equal(/\.wav|\.mp3|\.ogg|decodeAudioData|fetch\(/.test(src), false);
    assert.equal(fn.includes("audio.brickBreak()"), true);
    assert.equal(fn.includes("audio.break()"), false);
  });
});
