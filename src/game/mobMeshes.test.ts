import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(spec, ctx, next) {
    try {
      return next(spec, ctx);
    } catch (e) {
      if (spec.startsWith(".")) return next(spec + ".ts", ctx);
      throw e;
    }
  },
});

const { buildStuds } = await import("./game.ts");
const { MOB_KINDS } = await import("./mobNames.ts");
const { MOB_REDESIGN_UNBATCHED } = await import("./mobBatch.ts");

test("every mob kind still builds a non-empty mesh", () => {
  for (const kind of MOB_KINDS) {
    const body = buildStuds(kind as never, 1);
    let meshes = 0;
    body.group.traverse((o) => { if ((o as { isMesh?: boolean }).isMesh) meshes++; });
    assert.ok(meshes > 0, `${kind} built no meshes`);
  }
});

test("redesigned kinds bypass the Minecraft-era batch templates", () => {
  for (const k of ["creeper", "skelly", "stray", "walker", "husk", "drowned"]) assert.ok(MOB_REDESIGN_UNBATCHED.has(k));
});
