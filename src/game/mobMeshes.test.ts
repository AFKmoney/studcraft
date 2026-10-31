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

test("every original species builds a mesh with legs and a head", async () => {
  const { buildSpecies } = await import("./game.ts");
  const { SPECIES } = await import("./biomes.ts");
  for (const spec of SPECIES) {
    const body = buildSpecies(spec);
    let meshes = 0;
    body.group.traverse((o) => { if ((o as { isMesh?: boolean }).isMesh) meshes++; });
    assert.ok(meshes >= 8, `${spec.id}: ${meshes} meshes`);
    assert.ok(body.legs.length >= 2 && body.group.userData.head, spec.id);
  }
});

test("v2 hero mobs are built from bevelled/curved parts, not minifig boxes", async () => {
  const { buildStuds } = await import("./game.ts");
  for (const kind of ["creeper", "walker", "husk", "drowned", "dragon"]) {
    const body = buildStuds(kind, 1);
    const types = new Set<string>();
    body.group.traverse((o) => { const m = o as { isMesh?: boolean; geometry?: { type: string } }; if (m.isMesh && m.geometry) types.add(m.geometry.type); });
    assert.ok([...types].some((t) => t !== "BoxGeometry" && t !== "CylinderGeometry"), `${kind}: ${[...types]}`);
  }
  assert.equal(buildStuds("walker", 1).legs.length, 4, "walker keeps legL, legR, armR, armL");
});
