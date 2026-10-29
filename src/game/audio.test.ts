import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PLACE_CLICK } from "./audio.ts";

describe("place click", () => {
  it("is two synthesized tones and not an audio file", () => {
    const src = readFileSync(new URL("./audio.ts", import.meta.url), "utf8");
    assert.equal(/\.wav|\.mp3|\.ogg|decodeAudioData|fetch\(/.test(src), false);
    assert.equal(PLACE_CLICK.length, 2);
    assert.ok(PLACE_CLICK[0].dur < 0.02);
    assert.ok(PLACE_CLICK[0].freq > PLACE_CLICK[1].freq);
    assert.equal(src.includes("for (const n of PLACE_CLICK)"), true);
  });
});
