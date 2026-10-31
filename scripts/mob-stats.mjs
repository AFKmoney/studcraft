// Dev-only: draw calls (meshes) and triangles per mob — node scripts/mob-stats.mjs out.json
import { registerHooks } from "node:module";
registerHooks({ resolve(s, c, n) { try { return n(s, c); } catch (e) { if (s.startsWith(".")) return n(s + ".ts", c); throw e; } } });
const { buildStuds, buildSpecies } = await import("../src/game/game.ts");
const { SPECIES } = await import("../src/game/biomes.ts");
const stat = (g) => { let m = 0, t = 0; g.traverse((o) => { if (o.isMesh) { m++; const geo = o.geometry; t += (geo.index ? geo.index.count : geo.attributes.position.count) / 3; } }); return { draws: m, tris: Math.round(t) }; };
const out = {};
const KINDS = "villager,golem,pig,cow,sheep,chicken,horse,goat,wolf,fox,cat,ravager,guardian,blaze,walker,husk,drowned,skelly,stray,piglin,witch,pillager,vindicator,evoker,enderman,slime,bee,squid,bat,axolotl,parrot,frog,wisp,ghast,phantom,shulker,vex,wither,crab,spider,creeper,dragon".split(",");
for (const k of KINDS) out[k] = stat(buildStuds(k, 1).group);
for (const s of SPECIES) out[s.id] = stat(buildSpecies(s).group);
(await import("node:fs")).writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
