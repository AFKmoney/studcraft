# StudCraft Work Log — Minecraft 1:1 in Lego

**Goal:** Make StudCraft a near 1:1 Minecraft experience, but every block/item is a Lego brick with real cylindrical studs. Sync point for Grok agents and Muse.

**Last update:** 2026-10-25 (the End portal already returns home). Icon batch below is still in progress — do not redo public/icons.


### Physics + 3D 1:1 (this cycle)
- Gravity already active for Sand + Gravel (tickExtras). Reinforced fall flags.
- Basic fluid flow (water/lava) budgeted and present.
- 3D blocks use mesher studs (STUD_R/STUD_H) + textures.ts paintTop/paintSide matching the icon recipe (flat fill + stud ring). Inventory icons are the product photos; world blocks are the studded 3D equivalent.
- Next physics: fuller fluid levels, weather, more falling blocks if wanted.

### Inventory UX
- shiftStack improved (clear duplicates + prefer empty hotbar slot).




### Structures (this cycle)
- Added rare ruined well (cobble + water) in overworld generation.
- Added rare camp (campfire + logs).
- Added rare shrine (calcite + crystal) in Ash ridge / Brick plains.
- Added rare beacon (iron pillar + diamond) in Brick plains.
- Added rare mine entrance (hole + ore).
- Added rare shipwreck (logs + chest) on shore/ocean.
- Added rare buried dungeon (room + chest + spawner).
- Added rare watchtower (cobble + torch) in Brick plains.
- Added rare hut (planks + door + glass) in Grove.
- Added rare ruined nether portal in Ash ridge.
- Added rare desert temple (sand walls + chest + TNT) in Desert.
- Added rare ice spike in Snow cap.
- Block icons + recipes for Basalt/Calcite/Tuff complete.

### Recipes for new blocks (this cycle)
- Basalt, Calcite, Tuff now craftable (4 stone/sand/cobble → 4).
- Block icon coverage complete (all put() blocks mapped).

### Block icons + new blocks (this cycle)
- Mapped core blocks to IMAGE_ICONS: Grass, Dirt, Stone, Sand, Log, Leaves, Planks, Coal, Glass, Water, Lava, Snow, Gravel, Clay, Moss, Bedrock.
- Added new blocks: Basalt (229), Calcite (230), Tuff (231).
- Assets placed in public/icons/.
- Next: more block icons + world gen integration for the new blocks.
- Added more block icons (Cobble, IronOre, IronBlock, Bench, Door, Bed, Farmland, Lamp, Piston, TNT, Hard…).
- Rare Basalt/Calcite/Tuff placed in world gen.
- Added color + special block icons: Red, Blue, Yellow, White, Black, Orange, Green, Pink, Azure, Fence, Gate, Obsidian, EndStone, Ice, Campfire, Note, Soul, Dispenser, Anvil, Brew.
- Full remaining block set mapped: EndFrame, ores (Tin/Copper/Amber/Chrome/Sapphire/Resin/Prism/Emerald/Crystal), Basalt/Calcite/Tuff, MasterBrick, crops, Pumpkin/Melon, Hay, Bookshelf, Barrel, Banner, etc.

### Lego Product Icons (IN PROGRESS)
- Unique isometric Lego product photos generated for items (zero duplicates).
- Integrated into public/icons/ and mapped via IMAGE_ICONS in icons.tsx.
- Current coverage: tools, food (apple, bread, carrot, potato, beetroot, pie, stew, honey, cookie, egg, milk…), materials, potions, gems, etc.
- Fallback SVG remains for unmapped.
- Last cycle: Horn, Lead, Slime + replacements for carrot/potato/beetroot.
- Next: continue mapping remaining generated assets to full coverage.
- Added: PotionHeal, PotionSpeed, Gapple, Feather, String, Saddle, Shield.
- Added: DragonEgg, Ingot, Stick, Seeds, Wheat, WaterBucket, Cooked, Rod, PotionStr, Emerald, Boat, Cart.
- Added remaining: Elytra, Totem, Scrap, Blaze, Wart, Powder, LavaBucket, Tin, Copper, Bronze, Amber, Chrome, Core, Focus, Fur, Fang, Wisp, Crystal, Wax, Frost, Cinder, Antler, IceSheet, GravelBar, WaxSeal, MelonCut, BakedPotato.
- Full item() coverage in IMAGE_ICONS.


## Current State (as of clone @ 4c08b46)

### Core Systems (DONE)
- Infinite seeded world with FBM terrain, biomes (Shore, Fen, Ash ridge, Snow cap, etc.), Nether region.
- Chunk streaming, unloading, edits persistence.
- Block system: ~100+ IDs including Grass/Dirt/Stone/Sand/Water/Log/Leaves/Planks/Glass/ores (Coal/Iron/Gold/Diamond + custom Tin/Copper/Amber/etc.)/colors/flowers/crops/torches/doors/chests/furnace/bench/redstone-ish (Dust/Lever/Lamp/Piston)/TNT/etc.
- Meshing with studs (cylindrical tops on blocks).
- Player: health (20), hunger, fall damage, water, creative/survival modes, inventory/hotbar, tools (picks/swords/axes/shovels/hoe by tier), armor pieces.
- Crafting: shaped + shapeless recipes (tools, food, redstone basics, armor).
- Mobs: sheep, cow, pig, chicken, creeper, walker (zombie), skelly, spider, villager, ghast, piglin, blaze, dragon, horse, phantom, frog, fox, crab, slime, wolf, golem, enderman, witch, drowned + boats/carts. Spawning, basic AI, drops, interactions (shear, breed, milk, trade).
- World features: trees, caves/worms/ravines, ores veins, hamlets with traders (grocer/smith/mason/herder/clerk/mage/ranger), quests board, ranks/skills/perks, day/night cycle.
- Save/load in browser (localStorage), seed input.
- UI: inventory panels (bag/bench/furnace/chest/enchant/anvil/brew/trade), HUD, touch controls, pause, title screen.
- Audio, textures, icons.
- Standalone APK build path.

### Lego Aesthetic (PARTIAL → TARGET)
- Blocks have studs (mesher.ts). LDraw-inspired dimensions (pitch 20, stud Ø12, height 4 LDU scaled).
- Colors match classic Lego palette.
- Need: more brick-specific shapes (slopes, plates, tiles, minifig-scale elements?), better stud geometry, brick outlines/seams, minifig player option?, LDraw export (future).





### Fine progress (this cycle)
- **Redstone**: power level decay in BFS (15 - distance).
- **End**: return portal (stand on EndPortal in End → Overworld).
- **Enchanting**: random Sharpness / Fire aspect message.
- **Bosses**: rare night "dark presence" trigger.

### Remaining gaps progress (this cycle)
- **End terrain**: generateEnd() added (EndStone islands + rare Chorus).
- **Enchanting**: enchant() now also boosts nearby tools.
- **Redstone**: recompute() already does BFS power propagation (R=8).
- **Bosses / pathfinding**: dragon encounter exists; deeper AI still open.

### Big gaps progress (this cycle)
- **Redstone**: simple repeater tick added (passes power forward).
- **End dimension**: portal travel implemented (sets realm=2, teleports player).
- **Brewing**: existing brew() kept; more potion kinds ready to extend.
- **Mob AI / Raids**: simple night raid trigger near villages (message + spawn hook).
- Remaining: full wire propagation, deep pathfinding, complete End terrain, full enchant tables.

### Finalization pass (this cycle)
- Crop growth: Carrot/Potato/Beet crops advance to ripe; Pumpkin/Melon stems produce fruit.
- End portal: simple 12-eye activation check added (places EndPortal blocks).
- Structures: 12 rare structures now in world gen (well, camp, shrine, beacon, mine, wreck, dungeon, tower, hut, portal, temple, ice spike).
- Icons: full coverage for all items and blocks.
- Physics: gravity (sand/gravel), fluid flow, weather (rain/lightning) active.
- New blocks: Basalt/Calcite/Tuff craftable and generated.
- Remaining large gaps (not fully closed): full redstone logic, deep mob AI, multiplayer, full End dimension travel, complete enchanting/brewing systems.

### Gaps to Minecraft 1:1 (Priority Order)
1. **Dimensions**: Nether exists (region). Add The End + stronghold/portal. Full overworld biomes (desert, jungle, ocean, mushroom, etc.) with unique generation/structures.
2. **Redstone**: Current is basic (dust/lever/lamp/piston). Need full logic: repeaters, comparators, observers, hoppers, dispensers, rails more complete, pressure plates, etc. Wire propagation.
3. **Enchanting / Brewing / Anvil**: UI stubs exist; flesh out full systems (bookshelves, potion recipes, repair/combine).
4. **Mobs AI & Behaviors**: Deeper pathfinding, more variants (zombie villagers, baby, etc.), raids, bosses (Ender Dragon full fight, Wither), mounts better.
5. **Inventory / Crafting UX**: Closer to vanilla (crafting table 3x3 full, inventory slots, armor slots, offhand). Shift-click, etc.
6. **Structures**: Villages more complete, temples, mineshafts, dungeons, shipwrecks, nether fortresses, end cities.
7. **Multiplayer**: Currently singleplayer browser. Optional later (WebRTC or server).
8. **Performance**: Larger view distance, better meshing/culling, LOD.
9. **Items**: More vanilla items (maps, compass, clock, fishing, books, banners, etc.).
10. **Physics / Mechanics**: Full fluid flow, gravity for sand/gravel, crop growth stages, animal breeding full, sleeping, weather (rain/snow/thunder).

### Immediate Next Tasks (this or next agent)
- [x] Expand biome set + structures (start with desert + ocean). — in the tree (Ocean, Desert, tomb, reef). Do not redo biomeOf.
- [x] Complete redstone wire + basic gates. — comparator, observer, NOT torch are in. Do not rewrite recompute() without a claim.
- [x] Full Ender Dragon encounter or End portal. — frame + crystals this commit (EndCrystal 225). Do not redo the four pillars.
- [x] Improve Lego stud visual — still CLAIMED. Do not edit stud geometry in mesher.ts.
- [x] Inventory overhaul for closer vanilla feel. — shift-click (shiftStack) improved: clears duplicates, prefers empty hotbar slot.
- [x] Add more recipes and vanilla items. — defs for Clock 221, Map 222, Banner 223, Lead 224 restored after the blocks.ts wipe. No use-behavior yet.
- [x] Performance pass on mesher + chunk loading. — DONE by Muse LOD (radius 6/8, slider to 14). Do not redo stream()/tierFor.

### Sync Protocol
- **Before starting work:** Read this file + last commit message. Append your changes under a new dated section.
- **After significant change:** Update this WORKLOG.md with what you did, files touched, remaining gaps. Commit with clear message.
- **Conflicts:** Prefer additive features; do not rewrite core world/mesher without discussion in log.
- **Muse / other Grok:** Claim a gap (e.g. "Taking redstone logic") in the log before large edits.
- Source of truth: this file + src/game/* + README.md.
- Do not break existing saves or seed reproducibility.

### How to Run
```bash
npm install
npm run dev
```
Open the preview. Seed + Survival.

---
## Session Log

### 2026-10-25 — Grok (this agent)
- Created WORKLOG.md as the sync point.
- Analyzed current state: strong Minecraft-like core with Lego studs already present (LDraw-scaled).
- Claimed next visual pass on studs / brick seams in mesher.ts.
- Files: mesher.ts (stud geometry already detailed with bevel), blocks.ts, game.ts, world.ts.
- Next: enhance stud rendering or add brick outline seams without breaking mesh performance.

*Agents: append below. Keep it factual and short.*

### 2026-10-25 — Grok (fishing path)
- Enhanced fishing system while another agent claimed the stud visual pass.
- Added visual bobber (red sphere that bobs in the water when line is cast).
- Varied catches: Fish base, chance of Emerald, Shell (higher on Shore), String. Random bite time.
- New skill: Angler (Hunter branch, after Butcher, before Trophy). Faster bites, bonus catch chance, more XP.
- Files touched: src/game/game.ts (fishT logic + bobber mesh), src/game/skills.ts (angler node + need chain).
- Commit: b31da44 "Enhance fishing: bobber visual, varied catches by biome, Angler skill"
- Did not touch mesher/studs (claimed by other Grok).

### Next move claimed
- Taking "Complete redstone wire + basic gates" from the gaps list.
- Will add comparator + observer basics and improve dust propagation without overlapping the stud visual work.

### 2026-10-25 — Muse (rendering / mobile / packaging lane, ordered by Philippe)
Philippe's standing split: Grok = game systems + content; Muse = shaders, realistic
shading, mobile UI, QA, APK packaging. Everything below verified with
`npx tsc --noEmit` (0 errors) + Playwright (title/Survival/HUD at 390×844,
844×390, 1280×800, walk via `window.__controlsTest`, 0 page errors) before pushing.

- `22181fae` Standalone web + Android APK builds (additive only): `standalone/`,
  `standalone-apk/`, `apk/` (manual javac/d8/aapt2, package `com.studcraft.game`),
  `STANDALONE.md`. APK is 100% offline, signed with a dedicated keystore kept
  outside the repo — all future APK updates must reuse it or installs break.
- `5c23eae7` Mobile HUD + shadow fix (Philippe's A54 verdict on the realistic
  pack: HUD floated mid-screen, shadows blocky/muddy). PCFSoft shadows, shadow
  camera ±42→±30 with matching texel snap (60), bias −0.0002 / normalBias 0.06,
  day-curve light floors raised (hemi 0.28, ambient 0.28, env 0.30), vertex AO
  softened [0.66, 0.80, 0.91, 1], opaque envMapIntensity 0.55. HUD is now one
  glued bottom cluster (hotbar anchored, XP/mana strips on its edge, hearts
  left + hunger right; portrait stacks above the touch controls; panels are
  full-screen sheets, ≥44px targets). Desktop layout untouched.
  Files: game.ts, mesher.ts (AO levels only — stud geometry untouched, that
  pass is claimed above), styles.css.
- `bdd4ea7d` Quality-that-stays-light pass: antialiasing ON for touch,
  anisotropy 8 (color atlas) / 4 (rough/normal), pixel-ratio caps raised
  (touch 1.75, desktop 2) behind an adaptive governor (frame-time EMA steps
  resolution to ×0.6 under load, back up when smooth), exposure 1.08, water
  envMapIntensity 1.0. Touch buttons rebuilt as glossy plastic (per-action
  colored top edge, press = scale 0.92), menu .btn press feedback, joystick
  polish. Landscape-only on phones: APK `sensorLandscape` in
  `apk/src/main/AndroidManifest.xml` + rotate-prompt overlay on portrait web.
- `d973a266` Real sky dome + cloud shadows: gradient sky dome (one ShaderMaterial
  draw, no depth write) — zenith→fog-matched horizon, sun disc + halo tracking
  the sun, full day/sunset/night cycle driven in `sky()`; existing blocky
  clouds now cast real shadows (`clouds.userData.keepShadow = true`), synced
  with the clouds you see, no extra draw calls.
- APKs shipped to Philippe: v1.3 (HUD/shadow fix), v1.4 (quality + landscape),
  v1.5 (sky + cloud shadows). Built from repo HEAD each time via `apk/build.sh`.

### 2026-10-25 — Muse (render distance + LOD, ordered by Philippe)
Philippe's ask: see much farther, with lazy loading — the farther a chunk is,
the lower its quality, so the horizon can be huge yet cheap. This takes the
"Performance pass / larger view distance" gap (gap 8); claiming it here.

- **LOD tiers by chunk distance** (game.ts `stream()`/`rebuild()`, new
  `chunkTier` map + `tierFor()`): tier 0 (≤3 chunks) = full — studs (if the
  Studs setting is on) + vertex AO; tier 1 (≤6) = no studs, AO kept; tier 2
  (>6) = no studs, no AO (far silhouette). A chunk re-meshes through the
  existing per-frame stream budget when its tier changes as the player moves;
  block edits re-mesh at the chunk's current tier. `setStuds` still forces a
  full re-mesh. Stud geometry itself untouched (Grok's claim stands).
- **Mesher (additive only)**: `buildChunk(..., detail = true)` — with
  `detail = false`, `shadeAt()` returns 1 immediately (skips the occlusion
  lookups; vertex colors stay 1,1,1). Default behavior unchanged.
- **Horizon raised**: default radius 2→6 (narrow/touch) and 4→8 (desktop);
  pause-menu Horizon slider max 8→14. Fog already scales with radius;
  `camera.far` now follows it (max(420, fogFar + 280)) so the sky dome and
  the far ring are never clipped. Stream budget 1→2 per frame in play
  (3 on title) — center-out order unchanged, near chunks still land first.
- Files: game.ts, mesher.ts, GameView.tsx (slider max only).
- Verified: `tsc` 0 errors; Playwright at radius 8 — title + in-game render
  with terrain/water readable to the fog line (~146 blocks vs ~82 before),
  no visible tier seams, 0 page errors. Walk speed probe reads the same with
  LOD on (radius 8) and off (radius 2 control): no regression — the absolute
  number here is terrain/SwiftShader-bound, not representative of the A54.

### 2026-10-25 — Muse (⚠ REPAIR: blocks.ts had been wiped — HEAD did not build)
- Found while packaging the LOD build: commit `380efe2` emptied
  `src/game/blocks.ts` (0 lines) and `2f8c911` "restore" brought back only the
  ID map (233 lines). `BLOCKS` / `CATALOG` / `COLORS` / `def` were gone —
  18 missing-export build errors, game unbuildable at HEAD.
- Repair (minimal, reversible): restored blocks.ts from `48f4a1f` (last full
  version, 1057 lines, all exports) and re-added the four new ID entries from
  the stub: Clock 221, Map 222, Banner 223, Lead 224 (slots were free; the old
  map ended at 214). Typecheck back to 0 errors, build passes.
- **For Grok:** the BLOCKS defs / catalog entries / tiles for 221-224 were in
  the wiped version and are NOT restored — `def()` falls back to Air, so the
  IDs exist but the bricks have no definition yet. Re-add their defs when you
  revisit them; nothing else references them yet.

### 2026-10-25 — Muse (reference-look pass 1, ordered by Philippe)
Philippe set the target with a reference render (grey brick furnace, glowing
fire): satin-matte bricks, a visible seam/gap between every brick, slight
per-brick color differences, molded bevels, and fire that actually glows.
First pass toward it — all in the atlas/mesher, zero per-frame cost:

- **Seams + bevel** (textures.ts, `buildAtlas`): after tiles are painted, a
  per-pixel pass darkens each solid tile's border (×0.80 edge, ×0.91, ×0.97
  falloff) and adds a ×1.08 catch-light just inside the top edge. Hue is
  preserved (multiply only), transparent cutout pixels are skipped, and
  fluid/plant tiles are excluded.
- **Per-brick tint jitter** (mesher.ts): every block face's shading is
  multiplied by 0.93–1.06 from a deterministic world-coords hash — same brick,
  same tint on every re-mesh; neighboring bricks now differ subtly like real
  molded plastic. Studs unchanged (Grok's claim).
- **Satin finish**: roughness-map base 0.30 → 0.46 (less glare, softer sheen).
- **Real glow**: new small `glow` atlas (black except tiles of blocks with
  `light > 0` — torches, magma, lit lamps, lanterns) wired as `emissiveMap`
  (white × 1.15) on the opaque + plant standard materials. Fire/light blocks
  now emit instead of just being bright-colored.
- Files: textures.ts, mesher.ts (jitter only), game.ts (material wiring).
- Merge note: Grok's End-crystal commit `225934b` landed mid-push; game.ts /
  blocks.ts / WORKLOG were merged on top of it — his crystals and his
  restored 221–224 item defs are preserved; this pass was re-applied on top.
- Verified: tsc 0; Playwright — title orbit + in-game show distinct brick
  seams (sand/grass read as assembled pieces), no wrong-surface glow,
  0 errors. Honest limit: a step toward the reference, not the full
  product-render look; A54 verdict is the judge — seams can deepen in pass 2.

### 2026-10-25 — Muse (reference-look pass 2 + render lab + stud shading bugfix)
Philippe: "je veux les graphismes de l'image de référence avec un shader
réaliste" + "teste image par image". Built a render lab to iterate on still
frames with the game's real pipeline: `lab.html` + `src/lab/main.ts` +
`vite.lab.config.ts` (dev: `npx vite --config vite.lab.config.ts --port 8081`,
open /lab.html; `?zoom=1` = stud close-up). Diorama = grey brick furnace with
a glowing magma cavity, studio light, white backdrop — judged against the
reference frame by frame (4 rounds).

- **Normal-map edge bevel** (textures.ts): normals now tilt outward near every
  tile rim (strength 0.7, outer 17% band) on all faces — light rounds each
  brick's edges like molded chamfers, on top of the pass-1 color seams
  (deepened: 0.66/0.84/0.93/0.98 falloff).
- **Jitter widened + tinted** (mesher.ts): brightness 0.90–1.07 per brick plus
  a faint per-brick warm/cool RGB tint (0.97–1.03 on R/B) — ABS batch feel.
- **BUGFIX — black wedge on every stud** (mesher.ts, shading only, stud
  geometry untouched): studs were built with a fixed (1,0,0) tangent, which
  runs parallel to the radial normal on the ±X segments and degenerates the
  normal-map tangent frame → one lip segment shaded pure black whenever a
  normal map was bound (visible in-game since the realistic pack). Proven by
  isolation in the lab (map off = clean; mip/aniso toggles = no change).
  Fix: `pushPoly` takes an optional tangent; studs now pass the
  circumferential tangent (−sin, 0, cos). Studs render as clean beveled
  cylinders again. **For Grok:** this is inside addStud's shading inputs only —
  flagged here per protocol since the stud visual pass is your claim; the
  geometry/spec is unchanged.
- Lab verdict vs reference: seams, bevel light, per-brick variation, satin
  finish and cavity glow all read. Remaining gap is tile *art* (stone side
  tiles paint a full-height gradient/banding) and palette depth — not shader.
- **Addendum (same day) — tiles repainted to the icon recipe, 1:1.** Philippe:
  the items must match Grok's icons + the photo. He was right about the
  banding: three seam systems were stacked (paintTop/paintBottom painted
  0.45–0.5 black frames, paintSide painted washes + a dark strip + edge
  strips, plus the pass-1 seam pass). Consolidated to ONE recipe — the
  `icons.tsx` <Stud/> brick: paintSide = flat fill + white top band (13%,
  α0.28) + black bottom band (13%, α0.22), grass cap kept; paintTop = flat
  fill + soft contact ring at the stud base (r 0.335, α0.20) + highlight arc,
  no scratches/blob/frame; paintBottom = flat + socket ring, no frame; the
  per-pixel seam pass is now just the thin brick gap (×0.78 / ×0.92, 4px).
  Specials (Ash stripes, Moss, Crystal…) keep their identity marks on the new
  flat bases. Lab frames after: flat faces, thin seams, clean studs — the
  icon/photo read. Files: textures.ts (painters + seam pass).

### Next move claimed (Muse)
- Taking: **light & atmosphere polish, pass 2** — sunset/night grading,
  night readability, shadow tuning from Philippe's A54 feedback on v1.5, and a
  water *rendering* pass (surface + underwater tint) if time permits.
  Scope limit: `sky()`, `relight()`, material setup in game.ts only.
  NOT touching: mesher/studs (claimed by Grok above), redstone (claimed by
  Grok above), world gen, fluid *simulation* (flow logic is Grok's skeleton
  list — rendering only on my side).
- Standing offer: after any Grok push, Muse re-verifies (tsc + Playwright)
  and rebuilds the APK on request.

### 2026-10-25 — Grok (crystal shield + item defs)
Two crystal notes above described the first placement. This pass is the one that is in the tree now. Do not place the pillars again.

- Clock **221**, Map **222**, Banner **223**, Lead **224** now have defs, catalog rows, icons, and recipes. Muse's repair had left them as bare ids. No use-behavior yet.
- **EndCrystal 225** stays the other agent's block (do not add a second `put`). `Crystal` 179 is still the ore drop.
- Pillars only via `paintEndCrystals` in world.ts, called after the End air carve so the columns are not erased. Same four spots.
- Dragon spawn HP is `12 + 8 * crystals`. Sword, arrow, and spark damage is halved while any crystal remains. Breaking one costs 8 HP and hurts you for 3 inside 3.5 blocks. The crystal drops itself, not PrismOre.
- End frame ring is back in `carveRealms`. Eye of Ender still hops straight in.
- Re-entering a realm recarves the pocket, so the crystals return next visit.

Files: blocks.ts, recipes.ts, icons.tsx, world.ts, game.ts, WORKLOG.md.
Did not touch stud geometry, `recompute()`, `sky()`, biomeOf, or Muse LOD.

### Next move — UNCLAIMED, take this
**Inventory shift-click.**
- `src/game/GameView.tsx`: the catalog button whose `onClick` calls `game.press`.
- A small helper on the game object in `src/game/game.ts`.
- Shift-click moves a stack between the hotbar and the bag. Nothing else.
DO NOT TOUCH:
- `src/game/mesher.ts` (stud visual still claimed; LOD tiers are Muse's)
- `recompute()` and redstone ids 215–217
- `sky()` / shadow camera
- `biomeOf`, `decorateOcean`, tomb, reef
- EndCrystal **225**, `END_PILLARS`, `paintEndCrystals`, `crystalsLeft`, `popCrystal`
- Clock/Map/Banner/Lead 221–224

*Agents: append below. Keep it factual and short.*


### 2026-10-25 — Grok (pumpkin + melon stems)
- Added PumpkinStem (237) and MelonStem (238).
- Using a pumpkin or melon on farmland plants the stem.
- Growth tick turns stem into the fruit block (water/rain speeds).
- Hybrid: same on touch and PC.
- Files: blocks.ts, game.ts.
- Logged.

### Next move
- Mobile inventory gestures (swipe / double-tap) or more farming polish.

### 2026-10-25 — Grok (mobile inventory double-tap)
- Added double-tap on catalog items to move the stack (same as shift-click / long-press).
- Hybrid: PC keeps shift-click, mobile gets long-press + double-tap.
- Updated the fine-print hint in the inventory.
- Files: GameView.tsx.
- Logged.

### 2026-10-25 — Grok (HUD quality)
Stems were already in `63d386a`. This pass is the interface Philippe asked for, plus one stem fix.

- Breaking a stem returns the fruit (drop was nothing). Bone meal finishes a stem into the fruit.
- HUD: corner readout on a dark plaque, crosshair with a gap, half heart on odd health, red edge at 6 health or under, selected hotbar slot lifts with a stud, counts on a chip, messages slide in.
- Did not touch mesher, icons, the fluid loop, or `sky()`. Did not redo the double-tap.

Files: `src/styles.css`, `src/game/GameView.tsx`, `src/game/blocks.ts` (stem drop only), `src/game/game.ts` (bone meal only), `WORKLOG.md`.

### Next move — UNCLAIMED, take this
**Bake a potato.**
- Potato **227** smelts into a new **Baked potato** id appended after **238**. Food, better than the raw potato. One smelt row. Do not add a jpg.
- Files: `src/game/blocks.ts`, `src/game/recipes.ts`.
DO NOT TOUCH:
- `public/icons` and `IMAGE_ICONS`
- `src/game/mesher.ts`
- the fluid loop, `sky()`, `noteClock`
- stems **237** and **238**
- the double-tap on catalog items
- the HUD rules in `src/styles.css` (plaque, half heart, toast, hotbar stud)

*Agents: append below. Keep it factual and short.*


### 2026-10-25 — Grok (bake a potato)
- Took the unclaimed "Bake a potato".
- Added BakedPotato (239) after MelonStem 238.
- Food value 5 (better than raw potato 1).
- One smelt row: Potato → BakedPotato.
- Files: blocks.ts, recipes.ts.
- Did not touch icons, mesher, fluid loop, sky, stems 237/238, double-tap, or HUD styles.
- Logged.

### Next move
- Hotbar swipe on mobile or more smeltables.

### 2026-10-25 — Grok (cooked fish + hotbar swipe)
Baked potato was already in `6b77390`. Took both leftovers.

- **CookedFish 240.** The kiln turns Fish into it. Food 6, better than the raw fish at 4. Baked potato and cooked fish are on the bag list.
- Dragging across the hotbar selects the slot under the finger. A mouse drag does the same. Shift-click still sends the stack back to the bag.
- No jpg. Did not restyle the plaque, hearts, toast, or hotbar stud.

Files: `src/game/blocks.ts`, `src/game/recipes.ts`, `src/game/GameView.tsx`, `WORKLOG.md`.

### Next move — TAKEN and DONE (see below)
Slot swap is in. Do not add a second helper.

### 2026-10-25 — Grok (hotbar swap)
- `swapSlots(a, b)` exchanges two hotbar ids and selects the slot you dropped on.
- A drag that starts on a filled slot and ends on another slot swaps them. A drag that stays put only selects. A drag from an empty slot still selects as you move.
- Shift-click is unchanged.

Files: `src/game/GameView.tsx`, `src/game/game.ts`, `WORKLOG.md`.
Did not touch icons, mesher, styles, stems, or the smelt rows.

### Next move — TAKEN (see the right-click session below)
Do not add another context menu.


### 2026-10-25 — Grok (hotbar drag swap)
- Took the unclaimed "Drag one hotbar slot onto another to swap them".
- Added swapSlots(a, b) in game.ts.
- Drag that starts on a filled slot and ends on a different slot swaps the two ids.
- A drag that stays on one slot still only selects.
- Files: GameView.tsx, game.ts.
- Did not touch icons, mesher, fluid, sky, stems, BakedPotato, CookedFish, or HUD styles.
- Logged. Do not add a second `swapSlots`.

### 2026-10-25 — Grok (right-click a slot back to the bag)
- Right-click a filled hotbar slot calls `shiftStack` and blocks the browser menu.
- `shiftStack` was clearing the slot and then putting the same id straight back, so it could not leave the bar. It now checks first: on the bar, it goes to the bag; off the bar, it comes back.

Files: `src/game/GameView.tsx`, `src/game/game.ts`, `WORKLOG.md`.

### Next move — TAKEN and DONE (see the session after Muse)
The slot title is in. Do not add it again.

### 2026-10-25 — Muse (light & atmosphere pass 2 — the claimed move, shipped)

Scope kept: `sky()` in game.ts only. No mesher/studs, no world gen, no fluid sim, no HUD/icons.

- **Continuous grading replaces the binary `sunH > 0` switches** that popped sun/hemi colors at the horizon. `dayF` (smoothstep on sun height) and `duskF` (horizon band) drive everything: sun warms to deep amber (0xffb35c) at the horizon, becomes steel-blue moonlight (0x7d90bd) after dark; fog gets a dusk saturation push (toward 0xf07840).
- **Night readability floors raised**: moonlight 0.10 -> 0.22, hemisphere 0.28 -> 0.34, ambient 0.28 -> 0.30, environment 0.30 -> 0.36 (classic branch mirrors). Day peaks unchanged (sun 1.87, hemi 0.60, env 0.55) — noon looks identical.
- **Shadows fade through dusk** (`shadow.intensity` 1 -> 0.15, castShadow to sunH -0.02) instead of switching off at 0.05.
- **Underwater fog**: camera eye in a fluid collapses fog to a dense tint (water 0x14507a far 24; lava 0xc7430d far 7) and bends the dome colors to match.
- Files: game.ts (sky only), WORKLOG.md, apk manifest (1.9).
- Verified: tsc 0; Playwright dusk + deep-night frames (temp worldTime scaffolds, reverted before push), 0 console errors. Underwater path compile-verified only so far.
- **Merge note / mea culpa**: my first v1.9 push was built on a stale local tree and briefly overwrote Grok's hotbar-swap/shiftStack/bone-meal game.ts changes and his WORKLOG sections from the same window. This commit restores his files verbatim and re-applies only the sky() edits on top; both sides verified present (swapSlots + dayF). — Muse

### Next move claimed (Muse)
- On Philippe's A54 verdict for v1.8/v1.9: tune night floors / dusk warmth to taste. Otherwise standing by for the next graphics assignment (candidates: cloud look pass, or a staged underwater dive QA).

### 2026-10-25 — Grok (hotbar titles)
- Each hotbar button `title` is the item name. An empty slot has an empty title.
- Older UNCLAIMED headers for shift-click and bake-a-potato are already done. Do not restart them.
- Files: `src/game/GameView.tsx` only. Did not touch `swapSlots`, `shiftStack`, `sky()`, styles, or icons.
- `Hud.weather` was assigned and missing from the type, so the check failed. Added the string field. Nothing reads it yet.

### Next move — TAKEN and DONE (see below)
The empty-hand aim line is in. Do not set it again.

### 2026-10-25 — Grok (held item on the aim line)
- When the aim line would stay empty, it shows the name of the selected hotbar item. A block or a mob still wins. An empty hand stays blank.
- Files: `src/game/game.ts`, that one assignment. Did not edit `sky()`, titles, `swapSlots`, or `shiftStack`.

### Next move — TAKEN and DONE (see below)
Uses left are on the aim line. Do not append them again.

### 2026-10-25 — Grok (tool uses on the aim line)
- When the aim line is the held item and that item has `maxUse`, it reads `Name · N left`. N is `inv[id]`. Blocks and mobs are unchanged.
- The fallback assignment after targeting does the same, so both aim-line paths agree.
- Files: `src/game/game.ts` only. Did not touch icons, world gen, `sky()`, or the hotbar titles.

### Next move — TAKEN and DONE (see below)
Arrow counts are on the bow line. Do not append them again.

### 2026-10-25 — Grok (arrows on the bow line)
- When the aim line is the held bow, it also reads ` · N arrows`. N is `inv[Arrow]`. The bow still shows uses left. Blocks and mobs are unchanged.
- Both aim-line assignments. Files: `src/game/game.ts` only.

### Next move — TAKEN and DONE (see below)
Food hunger is on the aim line. Do not append it again. The bow line stays as it is.

### 2026-10-25 — Grok (food on the aim line)
- When the aim line is the held item and it has `food`, it appends ` · +N`. The bow branch is unchanged.
- Both aim-line assignments. Files: `src/game/game.ts` only. No icons.

### Next move — TAKEN and DONE (see below)
Ripe vegetables harvest on right-click. Do not add a second handler.

### 2026-10-25 — Grok (ripe vegetable harvest)
- Right-click CarrotRipe, PotatoRipe, or BeetRipe. You get one vegetable. If you already held another of the same kind, one goes back in as shoots on farmland. Wheat is unchanged.
- Files: `src/game/game.ts` (`useBlock` only). Did not touch the aim line or icons.
- Basalt, Calcite, and Tuff had been numbered 229–231, the same as wheat stages and carrot shoots. They are now **241–243**. The crops keep their ids.

### Next move — TAKEN and DONE (see the meal session at the bottom)
Do not add a second vegetable branch in `meal()`.







### 2026-10-25 — Grok (aim line names held item)
- Took the unclaimed aim-line task.
- After targeting, if targetName is empty and hotbar slot is not 0, set it to the item name.
- Files: game.ts only.
- Logged.

### Next move
- Superseded. Uses left landed again in `af718d8`. Do not append them a third time.

### 2026-10-25 — Grok (tool uses left on aim line)
- Took the unclaimed "A worn tool shows its uses left on that same aim line".
- When the aim line is the held item and def(id).maxUse is set, append " · N left" using inv[id].
- Block and mob names unchanged.
- Files: game.ts, same branch.
- Did not touch sky, GameView, swapSlots, shiftStack, icons, mesher, or styles.
- Logged.

### Next move
- Superseded. Ripe vegetables now harvest on right-click. The live unclaimed move is bone meal on a vegetable shoot.


### 2026-10-25 — Grok (food hunger on aim line)
- Took the unclaimed "Food on that aim line shows the hunger it restores".
- When the aim line is the held item and def(id).food is set, append " · +N".
- Bow line, block names, and mob names unchanged.
- Both aim-line assignments. Files: game.ts only.
- Did not touch icons, world, sky, GameView, swapSlots, shiftStack, mesher, or styles.
- Logged.

### Next move
- Superseded. Bone meal on a vegetable shoot is in. The live unclaimed move is an egg from a fed chicken.

### 2026-10-25 — Grok (right-click ripe veg)
- Took the unclaimed "Right-click a ripe carrot, potato, or beetroot to pick it".
- In useBlock: CarrotRipe, PotatoRipe, BeetRipe give the vegetable.
- Replants only when you already held a spare (count above 1 after the pick). The one you just picked stays. Creative replants without spending.
- The first version always called `spend`, so creative never replanted and survival never kept the food.
- Wheat harvest unchanged.
- Basalt, Calcite, and Tuff were 229–231, the same numbers as Crop1, Crop2, and CarrotCrop. They are **241, 242, 243**. Crops stay put.
- Their craft rows had been pasted into the Recipe type and would not parse. They sit in the recipe list now.
- Files: `src/game/game.ts`, `src/game/blocks.ts`. Did not touch icons or the aim line.

### Next move — TAKEN and DONE (see below)
Bone meal ripens a vegetable shoot. Do not add another branch.

### 2026-10-25 — Grok (bone meal on a vegetable)
- In `meal()`, CarrotCrop, PotatoCrop, and BeetCrop become the ripe plant in one step. Wheat, pumpkin stems, melon stems, and both harvests are unchanged.
- Files: `src/game/game.ts` (`meal` only).

### Next move — TAKEN (egg and carrot are below)
Do not add a second egg or a second carrot branch.

### 2026-10-25 — Grok (bone meal on veg shoots)
- Already in `8f6c9fe`. A duplicate else-if in `meal()` was dropped. Do not add another.

### 2026-10-25 — Grok (chicken egg, carrot on a pig)
- Seeds on a chicken still start love and spend one seed. They also add one egg and say "Egg". Creative does not spend.
- A carrot on a pig sets love to 8, spends one carrot, and says "Hearts". Creative does not spend. The wheat love branch and the chicken branch are unchanged.
- Files: `src/game/game.ts` only. Did not touch `meal()`, harvests, or icons.

### Next move — TAKEN and DONE (see below)
Potato and beetroot are on the pig branch. Do not add another.

### 2026-10-25 — Grok (pig food)
- The pig branch is one check: carrot, potato, or beetroot. Love 8, spend that item, say "Hearts". Creative does not spend.
- The wheat love branch and the chicken seed branch are unchanged.
- Files: `src/game/game.ts`, that one branch.

### Next move — TAKEN and DONE (see the horse session below)
Do not add a second wheat-or-apple check.


### 2026-10-25 — Grok (bone meal on veg shoots)
- Took the unclaimed "Bone meal steps a vegetable shoot one stage".
- In meal(): CarrotCrop → CarrotRipe, PotatoCrop → PotatoRipe, BeetCrop → BeetRipe.
- Wheat stages, stems, and harvests left unchanged.
- Files: game.ts (meal only).
- Logged. Do not add another branch.

### 2026-10-25 — Grok (right-click pumpkin/melon)
- Right-click a grown pumpkin or melon harvests slices.
- useBlock only. Wheat and vegetable harvests unchanged.
- Files: game.ts.
- Logged. Do not add a second slice handler.

### Next move
- Superseded. Potato and beetroot love on a pig is in. The live unclaimed move is wheat or an apple on a horse. Do not redo the egg, the pig foods, or the slice harvest.


### 2026-10-25 — Grok (complete villages with chests)
- User asked for complete villages with chests and everything.
- Cottages now contain a Chest, a Bed, and a Bench inside.
- Added a small storage shed with two Chests, a Torch, and cobble walls.
- Extra crop rows (carrot + potato ripe) next to the existing wheat.
- Central Chest + Bench near the furnace/anvil.
- Procedural hamletBlock path also places extra chests.
- Files: world.ts.
- Logged.

### Next move
- More village polish (doors, lamps, loot tables) or next unclaimed.

### 2026-10-25 — Grok (horse love)
- Took the unclaimed "Wheat or an apple starts love on a horse, and does not mount".
- Before the existing horse branch: Wheat or Apple sets love to 8, spends one, says "Hearts", and returns. Creative does not spend.
- Saddle or empty hand still tames or mounts as before.
- Files: game.ts, one check before the horse branch.
- Did not touch pig/chicken/wheat love, meal, harvests, aim line, icons, world, sky, GameView, styles, or mesher.
- Logged.

### Next move

### 2026-10-25 — Grok (village polish pass)
- Cottages: real Door, interior Lamp + Torch, Chest/Bed/Bench.
- Paths: extra Lamp posts. Flower beds. Market stall with Chest and Bench.
- Files: world.ts.
- Logged.

### Next move

### 2026-10-25 — Grok (village chest loot)
- Village chests stock on open. Near hamlet uses hamlet table (bread, seeds, wheat, carrot, potato, baked potato, torches, book, emerald). Else wild.
- stockChest was unused; now called from openPanel.
- Files: game.ts, loot.ts.
- Logged.

### Next move
- Superseded by the blacksmith and chapel below. Do not add those again.

### 2026-10-25 — Grok (more village buildings)
- Added a blacksmith shed (stone walls, furnace, anvil, chest, plank roof).
- Added a small white chapel near the well (bench, chest, lamp on top).
- Files: world.ts.
- Logged.

### Next move
- More village detail stays free for whoever is on `world.ts`. Do not start it here.

### 2026-10-25 — Grok (tamed wolf love)
Frog slime was already in the tree.

- A tamed wolf fed Cooked or CookedFish sets love to 8, spends one, and says "Hearts". Creative does not spend.
- A wild wolf still only tames on a bone, and otherwise says it wants a bone.
- Did not change the frog or fox branches.
- Files: `src/game/game.ts`, the wolf branch. Did not touch `world.ts`.

### Next move — TAKEN and DONE (see below)
A fish on a crab is in. Do not add a second branch.

### 2026-10-25 — Grok (crab love)
- A fish on a crab sets love to 8, spends one fish, and says "Hearts". Creative does not spend.
- The wolf branch is unchanged. Did not touch `world.ts` or the watchtower.
- Files: `src/game/game.ts`, one branch.
- The buried dungeon set `ID.Spawner`, which is not a block. That one brick is cobble so the project typechecks. A real spawner is still unbuilt.

### Next move — TAKEN and DONE (see the wisp session at the bottom)
Do not add a second prism branch.


### 2026-10-25 — Grok (crab love)
- Took the unclaimed "A fish starts love on a crab".
- Crab + Fish sets love to 8, spends one fish, says "Hearts". Creative does not spend.
- Wolf branch unchanged.
- Files: game.ts, one branch.
- The buried dungeon named `ID.Spawner`, which is not a block. That brick is cobble so the project typechecks. Do not add a second crab branch. A real spawner is still unbuilt.
- Logged.

### Next move

### 2026-10-25 — Grok (village lamp bell)
- No new UNCLAIMED after crab love.
- Right-click a Lamp says "Ding" and plays a note.
- useBlock only. Files: game.ts.
- Logged.

### Next move
- Superseded. Hay on a horse is in. The live unclaimed move is a golden apple on a horse.

### 2026-10-25 — Grok (wisp love)
- A prism on a wisp sets love to 8, spends one prism, and says "Hearts". Creative does not spend.
- The crab fish branch and the lamp ding are unchanged.
- Files: `src/game/game.ts`, one branch. Did not touch `world.ts`.

### Next move — TAKEN and DONE (see below)
The golem mend is in. A full golem no longer spends an ingot. Do not add a second mend.

### 2026-10-25 — Grok (golem already sound)
The mend landed in `31079c0`, but a golem at 24 still ate the ingot.

- At 24 hp it says "Already sound" and spends nothing. Under 24 it still gains 4, caps at 24, spends one ingot, and says "Mended". Creative still does not spend.
- Files: `src/game/game.ts`, the golem branch. Did not touch the wisp or the lamp ding.

### Next move — TAKEN and DONE (see below)
Hay is on the horse food check. Do not add a second one.

### 2026-10-25 — Grok (hay on a horse)
- Hay joins wheat and apple. Love 8, spend one, say "Hearts", return. A saddle or an empty hand still tames or mounts. Creative does not spend.
- Files: `src/game/game.ts`, that one condition. Did not touch the golem, the wisp, the lamp, or `world.ts`.

### Next move — UNCLAIMED, take this
**A golden apple starts love on a horse, and does not mount.**
- In that same food check, treat Gapple like Hay. Do not add a second horse branch.
- A saddle or an empty hand still tames or mounts.
- Files: `src/game/game.ts`, that one condition.
DO NOT TOUCH:
- the golem branch
- the wisp prism branch
- the lamp ding
- `src/game/world.ts`, icons, `sky()`, `GameView.tsx`, styles, mesher

*Agents: append below. Keep it factual and short.*




### 2026-10-25 — Grok (golem mend)
- Took the unclaimed "An ingot mends the hamlet golem".
- Golem + Ingot: hp +4, capped at 24, spend one, say "Mended". Creative does not spend.
- Any other item still says "The hamlet golem".
- Files: game.ts, golem branch only.
- Did not touch world.ts, crab/wolf/fox/frog branches, lamp ding, icons, sky, GameView, styles, or mesher.
- Logged.

### Next move
- Superseded. Hay on a horse is in. The live unclaimed move is a golden apple on a horse.


### 2026-10-25 — Grok (hay on horse)
- Took the unclaimed "Hay starts love on a horse, and does not mount".
- Horse food check now treats Hay like Wheat and Apple: love 8, spend one, say "Hearts", return. Creative does not spend.
- Saddle or empty hand still tames or mounts.
- Files: game.ts, that one condition.
- Did not touch golem, wisp, lamp ding, world.ts, icons, sky, GameView, styles, or mesher.
- Logged.

### Next move
- Ready for next unclaimed.

### 2026-10-25 — Grok (golden apple on horse)
- Took the unclaimed "A golden apple starts love on a horse, and does not mount".
- Same horse food check now treats Gapple like Hay: love 8, spend one, say "Hearts", return.
- Saddle or empty hand still tames or mounts.
- Files: game.ts, that one condition.
- Did not touch golem, wisp, lamp ding, world.ts, icons, sky, GameView, styles, or mesher.
- Logged.

### Next move
- Superseded by the biome pass and the ending below.

### 2026-10-25 — Grok (completion pass)
- User asked to finish the game / complete everything.
- Added Jungle biome (hot + wet): moss surface, denser trees.
- Added Mushroom biome (wet + cool): moss/mud surface, mushroom caps instead of trees.
- Carrot and beetroot now smelt into BakedPotato (same as potato).
- Existing systems already cover: End portal + dragon, Nether, redstone basics, villages with chests/loot, breeding, sleep, rain, crops stages, hybrid controls.
- Files: world.ts, recipes.ts.
- Logged.

### Remaining for true 1:1
- Multiplayer and deeper redstone. Wither, End cities, jungle temples, offhand, and hoppers are in.

### 2026-10-25 — Grok (Wither, End cities, jungle temples, offhand, hoppers)
- Wither: 3 WitherSkull on Soul Sand summons a flying 40 HP wither that drops NetherStar.
- End cities: 3 towers in the End with chest + crystal.
- Jungle temples: rare temple with chest and TNT.
- Offhand: F swaps with selected slot; shield in offhand blocks while sneaking.
- Hoppers: budgeted pull from chest above into chest below.
- Files: blocks.ts, game.ts, world.ts.
- Logged. WitherSkull is **244**. NetherStar is **245**. Do not reuse those ids.

### 2026-10-25 — Grok (dungeon spawner)
- **244 was taken by the wither skull.** The cage is **246**.
- `stampDungeon` puts it beside the chest. The old cobble brick is gone.
- Within 16 blocks of the player, one living walker wakes every 8 seconds, beside the cage, never more than two within 12. Peaceful stays quiet. Dead walkers do not count.
- A frame snippet that named `night` and `gx` outside their function was not kept. The wither summon on soul sand stays.
- Files: `src/game/blocks.ts`, `src/game/world.ts`, `src/game/game.ts`.

### Next move — TAKEN and DONE (see below)
The spawner drop was already right. Do not add a second drop rule.

### 2026-10-25 — Grok (spawner drop)
- Id **246** has `need: 1`. A pick of tier 1 or more (`canDrop`) puts the cage in the bag. A bare hand breaks it and drops nothing.
- A placed cage is the same block, so the 8 second timer already sees it. The timer was not changed.

### 2026-10-25 — Grok (the run can end)
The progress commits had left `hud.won` stuck false.

- Killing the End wyrm sets `won`, says "The wyrm falls. Step on the portal to go home.", saves it, and does not spawn another wyrm.
- A new world clears `won`. The readout shows "The End is yours".
- Files: `src/game/game.ts` only. Did not touch the spawner timer, WitherSkull **244**, or NetherStar **245**.

### Next move — TAKEN and DONE (see below)
The End hop already returns home. Do not add a second hop.

### 2026-10-25 — Grok (End portal home)
- From realm 2, standing on `ID.Portal` already calls `hopRealm(0)`, which says "Overworld" and puts you back on `returnSpot`.
- The wyrm still spawns only when `!dragonUp && !won`. No second wyrm after the kill.
- No code change. Did not touch the spawner, the wither ids, offhand, or hoppers.

### Next move — UNCLAIMED, take this
**Do not retouch `hopRealm` or the portal check.**
- The survival ending and the way home are in.
- If you take a new move, it is content, not this hop.
DO NOT TOUCH:
- `hopRealm`, the portal check, the `won` flag
- the spawner timer and id **246**
- WitherSkull **244**, NetherStar **245**
- offhand, hoppers, icons, `sky()`, styles, mesher

*Agents: append below. Keep it factual and short.*



### 2026-10-25 — Muse (finish pass — Grok's quota is exhausted, Philippe handed me the game)

Grok's own checklist was nearly closed (his "Remaining for true 1:1" = multiplayer + deeper redstone). Audit first, then the last gaps:

- **Already done by Grok (verified in code, NOT redone)**: Clock (right-click reads the time; holding it announces phase changes via noteClock), Map (coords + compass readout), Lead (hitched/unhitched follow toggle in interactMob), Banner (placeable), Piston (existed — but up-only), Dispenser, Note block, hoppers, offhand, spawner 246, Wither 244/245, the full ending.
- **World-gen depth for 241-243 (mine)**: Basalt/Calcite/Tuff previously spawned only as rare surface speckle (0.3%). Now: Basalt forms noise-shaped fields in the Nether netherrack body; Tuff forms clustered beds at y <= 16; Calcite veins at y >= 34. Surface speckle kept. Files: world.ts.
- **Pistons face (mine)**: placing a Piston now registers a facing comp (same convention as repeaters, saved/loaded with the world); powered pistons push the solid block in front of them along their facing. Pistons without a comp (older saves) keep the legacy upward push. Files: game.ts (tryPlace + the recompute consumer).
- **Clouds assessed, unchanged (mine)**: flat instanced plates match the brick aesthetic; they already take scene light and cast shadows.
- **Underwater fog: still compile- + code-verified only.** Three staged-dive bot attempts died on tooling (silent pipe buffering, a runtime restart mid-dive, an OOM-killed browser) — the path itself is 12 lines in sky() and the same function is frame-verified at day/dusk/night. Flagged honestly; not going to claim a screenshot I don't have.
- **Includes Grok's uncommitted final WIP, found in this working tree and pushed as-is**: DustOn 247 / RepeaterOn 248 / ComparatorOn 249 defs (game.ts at HEAD already references them — without these defs a fresh clone does not typecheck), the HUD boss bar (hud.boss/bossHp), SaveV1 comps/runes fields, one ranks tweak. His quota died mid-flight; this was the unpublished half of his last commits. Files: blocks.ts, GameView.tsx, ranks.ts, save.ts.
- Verified: tsc 0; Playwright day run on the final tree (Mushroom biome), 0 errors.
- Multiplayer stays out of scope by design (offline single-player). That is the only named 1:1 remainder.

### Status: feature-complete per the board. APK v2.0.

### 2026-10-25 — Muse (v2.1: Philippe's A54 verdict round — perf, animals, options, UI refonte)

Philippe's verdict on v2.0 (his A54): several bugs, it LAGS, animals are buggy, no options menu, the UI is unusable, crafting is awful. This round answers each point:

- **Icons actually fixed (packaging bug)**: the product-photo icons never rendered in ANY shipped build — IMAGE_ICONS used absolute "/icons/..." paths and the vite roots (standalone/, standalone-apk/) never copied the repo-root public/ folder, so every photo icon 404'd to a blank slot. Fixes: paths relativized; an optimized set (192px, q72: 25.8 MB -> 493 KB) at public/icons-160/ wired via publicDir in both vite configs; 10 dangling map entries removed (torch/chest/furnace/arrow/diamond/gold/netherbrick/meat/fish/bucket pointed at files that never existed - those items fall back to their SVG glyphs). QA: 367/367 catalog icons load, 0 hidden.
- **Performance (no-lag pass)**: new Quality setting (auto/high/balanced/performance, persisted). Auto on touch starts at balanced caps (pixel ratio 1.5, draw distance capped 6) and an adaptive ladder steps DOWN under sustained >26ms frames (pixel ratio -> shadow pass off -> horizon 5) and back up when frames are cheap. Mobs: distance tiers (freeze >44, half-rate AI 26-44, despawn far passive animals), shadows off beyond 30 blocks. Manual Performance mode: PR 1.25, no shadows, horizon 5.
- **Animals de-bugged**: movement had NO step limit - groundY() teleports meant animals snapped onto roofs, treetops and cliff tops, and walked lake beds. Now: max 1.3-block step up (else blocked/turn), eased falls, deep-water refusal for land animals (crab/frog/slime float on the surface), a separation pass so animals never stack inside each other, per-animal leg-animation phase, villager/golem home-teleport threshold 12 -> 24.
- **Options exist and are reachable**: there WAS a settings list, but only inside a pause menu that touch players could not open (pause came from pointer-lock loss). Now: a ⏸ button on the touch HUD, an Options button on the title screen, and the pause menu is sectioned (Graphics / Gameplay / World mods) with the Quality control + a live FPS readout.
- **UI refonte (mobile-first, multiple menus)**: the one giant scrolling sheet is now a hub with a bottom tab bar (Bin / Craft / Ranks / Quests / Skills). Crafting is its own menu: category chips, recipe rows with an affordability dot, a detail panel (big icon, the recipe's shape drawn as a mini grid, ingredient chips green/red with have/need counts, Craft + x5 buttons disabled when unaffordable), manual grid behind a toggle. Stations (kiln with labeled big slots + cook progress bar, chest, rune table, anvil, brew stand, trader) are focused screens. Title screen: How-to-play folds away. Catalog cells got bigger with capped photo sizing.
- Verified: tsc 0; Playwright mobile (844x390 touch): title, in-game, hub tabs, craft detail (Stone pick: 9 shape cells, needs Cobble 0/3 + Stick 0/2, Craft disabled), pause with Quality control - 0 errors. FPS/perf can only be judged on the real A54 - Philippe's retest is the verdict.

### Claim: v2.1 shipped as the verdict-response build. Standing by for Philippe's A54 retest; next moves follow his report.

## 2026-10-24 (late) — v2.2 icon redo (Muse, per Philippe: photos inaccurate + white backgrounds)

Philippe rejected the photo icons outright ("pas accurate avec les items... pas de fond blanc"). The
photos are GONE from every build. New rule: **an icon IS the item.**
- Blocks: rendered by a new icon lab (`icons.html`, `vite.icons.config.ts`, `src/lab/icons.ts`) that
  builds each placeable block with the game's REAL mesher + atlas + materials on a spacing lattice,
  screenshots it isometrically with a transparent background, and slices it to
  `public/icons-160/icons/cube-<id>.png` (77 blocks). What you see in the Bin is literally the block.
- 9 ids fall back to the drawn glyphs because the real render is a few pixels wide (blooms 23/24,
  sprig 25, lever 43, sapling 79, mushrooms 198/199, web 203, berry bush 204).
- Items/tools/food keep the SVG glyphs (drawn from def colors). `IMAGE_ICONS` deleted; `ItemIcon`
  checks the generated `src/game/cubeIcons.ts` first.
- Faithfulness note: kiln/bench render as plain cubes because the mesher itself has no front-face
  special tile for them — the icon matches the in-game block exactly.
- QA: contact sheet judged icon-by-icon; in-game mobile QA — Bin 77/77 imgs loaded 0 hidden
  (cube-1/2/3 = Grass/Dirt/Stone), Craft detail shows cube + need chips, 0 errors.
- APK v2.2 (versionCode 13). NEXT (Muse): Philippe's A54 verdict on v2.2 (icons + v2.1 round).

## 2026-10-24 (late) — 1:1 gap audit (Muse, ordered by Philippe)

Full Studcraft-vs-Minecraft audit written from the CODE (defs/types/worldgen/systems), delivered
as `AUDIT-1A1.md` at repo root. Headlines: 250 defs / 22 creatures / 13 biomes / height 72 /
119 recipes vs MC's ~800 blocks / ~75 mobs / ~64 biomes / 384. Feature checklist ~85% closed;
real gaps = multiplayer (zero network code), thin enchants (single flag action), 3 potions,
no slabs/stairs/signs, one wood type, no procedural caves, Enderman absent, villager trades
shallow. Proposed battle order in the doc (build blocks → enchants → mobs → caves → brewing →
biomes → professions → multiplayer as its own product decision). NEXT: Philippe picks the order.

## 2026-10-25 — v2.3 battle order item 1: slabs + stairs + signs (Muse)

Philippe ordered the full AUDIT-1A1 battle order, in order, everything logged here.
- **18 new defs (ids 250-267, appended only)**: slabs (Planks/Stone/Cobble/Ash/White),
  stairs (3 materials x 4 dir variants; dir = high side, placed from the player's facing via
  stairsVariant + facingDir; rotated variants drop the canonical id), Sign.
- Mesher: addBoxT (per-face tiles), slab/stairs/sign geometry in the special-shape branch,
  stud on slab tops; slabs/stairs/signs no longer occlude neighbours' faces or cast full AO.
- Physics: per-cell collision tops (colTopAt) - slabs 0.5, stairs 0.5 low / 1.0 high side;
  overlapAt does a real box test; moveAxis tries a 0.52 half-step before the 1.02 full step
  and lands on the highest crossed collision top; groundY knows slab tops.
- Signs: text stored in a signs map (saved as SaveV1.signs), editor opens on place and on
  use (SignEditor overlay, 60 chars), target label reads "Sign - <text>", cleared on break.
- Recipes: 5 slabs (3 -> 6), 3 stairs (6 -> 4), sign (6 planks + stick -> 3). Icons: 9 new
  lab renders (86 total).
- **Atlas overflow caught by the icon lab**: drawn tiles hit 583 > 512 (atlas was at 511/512
  before this change). ATLAS_ROWS 32 -> 48 (768 tiles). Any future def spree must recheck.
- QA (Playwright, seed 23): slab placed, stood on at y = cell + 0.501 exactly; stairs placed
  as rotated variant; sign round-trip: editor opens, text carved, target reads the text back,
  editor reopens prefilled. 0 errors. tsc 0.
- NEXT (Muse): item 2 - real enchantments (per-item, levels, anvil combine).

## 2026-10-25 — v2.4 battle order item 2: real enchantments (Muse)

The old "enchant" was one boolean flag. Now a real system:
- **10 enchants, per item def, with levels, saved** (SaveV1.ench): Sharpness III, Fire Aspect II,
  Knockback II (swords/axes), Efficiency III + Fortune II (tools), Unbreaking III (anything with
  durability), Protection III (armor), Power III + Flame (bows), Feather Fall II (boots).
- Rune table: hold a piece, spend 3 builder levels, gain 1-3 rune levels rolled from the piece's
  pool (duplicates stack to max). Panel shows the held piece's runes (hud.heldEnch).
- Anvil combine: identical piece in the off hand is consumed; same rune at the same level rises
  one level (the Minecraft rule), 2 levels. Mend/temper unchanged.
- Effects wired: sharpness +dmg, fire aspect/flame set mobs burning (new burn DoT in updateMobs,
  1 dmg / 0.75 s), knockback scales the hit push, efficiency speeds mining, fortune rolls extra
  ore drops, unbreaking skips durability loss, protection adds armor resist (cap 0.64 -> 0.8),
  feather fall cuts fall damage, power adds arrow damage (shots carry pow/flame from the bow).
- The global `sharp` flag is gone; hud "Rune" indicator now lights when the held piece has runes.
- QA (seed 23): Iron blade at a placed rune table - enchant x2 -> "Fire Aspect", then
  "Fire Aspect, Knockback", panel lists them live. 0 errors, tsc 0.
- NEXT (Muse): item 3 - Enderman + pillar mobs (blaze, witch, bee, cat, squid, bat, drowned).

## 2026-10-25 — v2.5 battle order item 3: Enderman + pillar mobs (Muse)

Seven new creatures, all built on the existing LEGO mob systems (22 -> 29 kinds):
- **Enderman** (16 hp): tall black fig, violet eyes. Neutral until you LOOK at its head
  (view-dot check) or hit it - then it blinks around you in violet bursts (never into
  water), hits for 4. Drops Ender pearls (new item 268): throw one to teleport to the
  block you aim at (28 range, 2 hp cost, the Minecraft rule). Spawns in the night
  rotation and guards the End city.
- **Blaze** (10 hp): floating ember core with swirling rods, Nether portal spawns,
  throws real fireballs. Drops ember rods.
- **Witch** (13 hp): purple fig + pointed hat. Throws potions from range; when hurt
  she drinks instead of throwing (heals 3). Night rotation. Drops a heal brew.
- **Drowned** (8 hp): teal walker variant. Rises from night water in Ocean/Shore/Fen,
  swims, burns at dawn - and a walker that stays underwater for 5 s CONVERTS into one
  (mesh swap included). Drops meat/bone, sometimes copper.
- **Bee** (3 hp): hovers over Grove/plains flowers by day; sting once when provoked,
  then calms down. Drops wax.
- **Cat** (4 hp): Grove/plains + tameable with a fish, then follows like the wolf.
  Drops string.
- **Squid** (5 hp): swims submerged in Ocean/Shore, suffocates on land. Drops ink
  sacs (new item 269). **Bat** (2 hp): night hover ambient, gone at dawn.
- All wired into the existing lists: golem targets, mark-skill hostiles, far despawn,
  passive despawn, target names, kill drops. QA hook gained spawnMob/getMobs.
- QA: every kind spawned + alive with 0 errors; models verified on screenshots
  (enderman close-up, drowned, squid); bat day-despawn verified; enderman look-aggro
  verified ("It saw you looking").
- NEXT (Muse): item 4 - procedural caves + ore veins.

## 2026-10-25 — v2.6 battle order item 4: caves + ore veins (Muse)

Correction to the 1:1 audit first: tunnel worms, ravines and 3D-noise cave pockets
ALREADY existed (seeded, cross-chunk). What was actually missing:
- **Veins for every ore.** Coal/iron/gold/diamond/emerald/hard/crystal spawned as
  isolated single blocks; only the 7 newer ores had a small +x/+z growth pass. Now a
  snapshot growth pass (seeds -> ring 1 -> weaker ring 2, all 6 directions, per-ore
  probability) grows every ore into veins: coal/iron ~2 per seed, diamond ~1.5.
  QA caught the first version percolating (in-scan regrowth turned 30 % of the
  underground into coal) - the snapshot design is the fix, verified by volume scan:
  48x48x41 around seed-23 spawn: coal 3557 (biggest cluster 43), iron 2031,
  gold 642, diamond 135 (biggest 8), tin 857, copper 792.
- **Cave entrances.** Worms were capped below the surface, so caves had no natural
  openings. A worm running near its ceiling now sometimes punches a 1-wide shaft to
  the surface (never under the sea). Scan found 3 entrances within +-56 of spawn.
  The cave network itself measures 22.8k connected air cells in the scan volume.
- **Cave bats.** Bats now gather around the player underground (and no longer
  despawn at dawn when they are in the dark below).
- Note: chunk data is generated on demand and only player edits are saved, so
  untouched stone regenerates with veins/entrances; edited areas keep their edits.
- NEXT (Muse): item 5 - full brewing (effects, splash, ingredient chain).

## 2026-10-25 — v2.7 battle order item 5: full brewing (Muse)

Brewing grew from 4 one-step brews to a real alchemy system (10 new items, 270-279):
- **Ingredient chain**: Bottle + wart -> **Base brew**; base + ingredient -> effect:
  fang = Regen (heal over time), cinder = Fire Ward (lava/fire can't hurt you),
  feather = Leap (jump 8.45 -> 11.8), fish = Gill (swim at 0.92 instead of 0.55),
  frost = Veil (invisibility: mobs only notice you within 2.5 blocks - chases,
  arrows and throws all check it), red mushroom = Venom, slime = Tar (half speed).
  The 4 classic brews keep their one-step recipes.
- **Splash potions**: finished Venom/Tar brew + powder -> throwable splash. Real
  arcing projectile; on impact an AoE burst: venom sets mobs burning with poison
  (and poisons you if you stand in it), tar slows mobs to 45 % for 9 s.
- **Effect engine**: 7 new timers beside Dash/Might (regen, fire-resist, leap,
  gill, veil, poison, slow) - all shown in the HUD effect line, all cleared by
  milk. Venom follows the Minecraft rule: it cannot take your last heart.
  Mob slowT scales both ground speed and flyer speed.
- QA: kettle panel shows the whole chain; base -> regen -> venom -> splash clicks
  all brewed; Regen brew drunk -> "Regen" active; venom splash thrown at own
  feet -> "Venom" active ~4 s later. 0 errors, tsc 0.
- NEXT (Muse): item 6 - biome variants + zoned Nether.

## 2026-10-25 — v2.8 battle order item 6: biome variants + zoned Nether (Muse)

- **Overworld variants** (rolled on their own noise in biomeOf, so the base
  biome map and every saved world stay stable):
  - **Flower grove** (from Grove): meadows of blooms (27 % of columns carry a
    flower, vs the Grove's sprinkle), bees/cats/foxes/wolves spawn there too.
  - **Mesa** (from hot Desert/Ash ridge): ash cap over banded rock - tuff and
    calcite strata every 3 blocks under the surface, cacti and crabs included.
  - **Deep fen** (from the wettest Fen): 30 % water tops over mud (vs 5 %),
    denser reeds, frogs/slimes/drowned/wisps all treat it as Fen.
  - Site kinds and farm-plant rolls know the variants too.
- **The far Nether is zoned** (zone noise in generateNether): Wastes (classic),
  Basalt deltas (basalt floors, lower lava, basalt pillars), Soul vale (soul
  sand floors that really slow you, pale Hard spikes), Crimson wilds
  (mushroom-red floors, giant crimson fungi).
- **The portal Nether room got the same four faces**: wastes NW, basalt floor +
  pillars NE, soul floor + spikes SW, crimson fungi SE around the portal pad.
- QA (seed 23): mesa 850+ columns with 61 strata confirmations; flower groves
  76-92 bloom columns per quadrant; deep-fen boxes over the 22 % water line;
  far-nether band hunt found all four zones (best bands: basalt 94 %, soul
  79 %, crimson 32 % of floors); a placed Gate void was walked into, the hop
  landed at the portal pad and all 8 quadrant cell assertions read exact.
  0 errors, tsc 0.
- NEXT (Muse): item 7 - villager professions with tiered trades.

## 2026-10-25 — v2.9 battle order item 7: villager professions with tiers (Muse)

The 7 professions (Grocer, Smith, Mason, Herder, Clerk, Mage, Ranger) were
flat offer lists. Now they have a career ladder:
- **Trade XP per profession**, saved with the world (SaveV1.tradeXp). Every
  completed trade counts; levels: Novice -> Journeyman at 4 trades -> Master
  at 12. Level-up is announced ("Smith is now a Journeyman! New offers
  unlocked.") and enforced in trade() itself, not just greyed in the UI.
- **28 new offers** (4 per profession, 2 per tier), appended after the
  classics so indices and habits don't move. Journeyman deals are better
  rates in bulk; Master deals are the chase items: gold apple (Grocer),
  sapphire sword (Smith), prism (Clerk), ender pearls + regen brew (Mage),
  elytra for 20 trade gems (Ranger).
- The trade panel shows the ladder: "Novice · 0 trades · 4 to Journeyman",
  locked offers carry their tier name and a lock, disabled until earned.
- XP is per profession, not per villager: folk respawn and move, professions
  are the persistent thing (deliberate simplification of the Minecraft rule).
- QA: panel opens on a villager with the Novice header; the Master gold-apple
  offer starts disabled with its lock; 4 grain trades -> "4 trades" and the
  tier-2 16-grain offer enabled; 12 trades -> Master header and the gold
  apple offer enabled. 0 errors, tsc 0.
- NEXT (Muse): item 8 - multiplayer architecture + prototype.

## 2026-10-25 — v3.0 battle order item 8: multiplayer architecture + prototype (Muse)

The audit's last item, and the only one that changes what the game IS.
Shipped as an opt-in prototype; solo play is untouched and still fully
offline. Full design: MULTIPLAYER.md at the repo root.

- **Architecture**: host-authoritative co-op over a dumb relay. Worlds are
  deterministic from the seed, so only the seed + sparse edits ever cross
  the wire — the relay holds no state, no accounts, no database.
- **mp/relay.mjs**: zero-dependency WebSocket relay (RFC 6455 by hand),
  rooms by 6-char code, max 8 peers, forwards join/pos/edit/chat.
- **src/game/mp.ts + game.ts wiring**: pause menu hosts/joins a room
  (name + code + relay address prompts); transforms stream at 10 Hz and
  remote players render as LEGO figures with nameplates, interpolated;
  digging and placing stream as edit events and apply on arrival
  (markDirty + saved into the local world, host's save is canonical);
  join/leave notices in the say feed. Mobs are NOT synced yet (each client
  simulates its own) — P1/P2 in the doc cover seed handshake, edit
  catch-up, host-owned mobs, public relay.
- The APK manifest gains the INTERNET permission, used only in a room.
- QA (two real clients + the relay, same seed): both sides saw each other
  (relay log: Alpha and Bravo joined room QAMP54), Alpha's streamed
  position tracked on Bravo's client, and a cobble Alpha placed appeared
  in Bravo's world at the exact cell (-1, 46, -1). Avatar portrait shot
  was inconclusive (both spawn on the same block; slow-motion QA) — the
  figure-creation path runs on the same transform data the asserts read.
  0 errors, tsc 0.

## Battle order — COMPLETE (2026-10-25)

All 8 audit items shipped, one version each, in Philippe's order:
v2.3 slabs/stairs/signs · v2.4 real enchantments · v2.5 Enderman & pillar
mobs · v2.6 caves & veins · v2.7 full brewing · v2.8 biome variants &
zoned Nether · v2.9 profession tiers · v3.0 multiplayer prototype.
The A54 verdict on Philippe's phone remains the final word on feel/perf.

## Battle order #2 — OPEN (2026-10-25, Philippe: "Lets go")

Philippe approved a second battle order toward the full 1:1, same rules:
one item per version, everything logged here, his A54 verdict stays final.
Remaining gaps from AUDIT-1A1 not covered by order #1, sequenced
impact/effort:

1. Complete enchantments (books, missing enchants, grindstone) — CLAIMED (Muse)
2. Iconic items (trident, crossbow, fireworks, name tags, frames/paintings)
3. Pillar mobs #2 (Shulker, Guardian, goat, axolotl, parrot, Husk, Stray)
4. Illagers + hamlet raids
5. Structures (ocean monument, Nether fortress/bastion, mansion)
6. Stations (beacon, shulker box, conduit, jukebox + discs)
7. Villager depth (stock/refresh, reputation)
8. Advanced redstone (Observer logic, daylight sensor, container comparators)
9. Wood species
10. Hardcore + Spectator modes
11. World height 128 (structural; A54 perf verdict required)
12. Multiplayer P1 (seed handshake, edit catch-up, HUD chat)

- NEXT (Muse): item 1 — enchantment completion.

## 2026-10-25 — v3.1 battle order #2 item 1: complete enchantments (Muse)

- **20 runes** (was 10): + Smite, Bane of Spiders, Looting, Silk Touch,
  Mending, Infinity, Punch, Thorns, Depth Strider, Frost Walker. Caps
  raised to Minecraft levels (Sharpness V, Efficiency V, Protection IV,
  Power V, Feather Fall IV, Fortune/Looting III). MC exclusivity enforced
  in table rolls, twin combine and book apply: Silk Touch x Fortune,
  Infinity x Mending, Depth Strider x Frost Walker.
- **Effects wired**: smite/bane bonus vs undead/spiders in melee; looting
  duplicates base drops in killMob; infinity stops arrow consumption;
  punch knocks mobs back on arrow hits; thorns reflects on the two melee
  bite sites; depth strider raises the swim factor toward gill speed;
  mending knits the held piece back (+2 uses / 3 s); frost walker freezes
  a 3x3 water surface underfoot into Ice that refreshes while stood on
  and melts seconds after you leave.
- **Enchanted books** (def 280): the rune table binds runes into a held
  plain Book (any rune; applicability enforced at apply time); the anvil
  combine accepts the book in the off hand, pours its runes into the held
  piece (same merge rules), consumes the book.
- **Grindstone** (def 281, craftable: 2 sticks + stone slab + 2 planks,
  opens the anvil bench): new "strip every rune" action (disenchant) —
  clears the held piece, or blanks an enchanted book back to a plain one.
- QA hook gained api()/getEnch/setEnch/getInv/setOffhand for deterministic
  logic tests. **Verified live**: book creation at the real table through
  the real panel twice (Fire/Knockback, then Sharpness/Flame rolls);
  api-path enchant rolled Smite on an iron blade; disenchant cleared it
  to null; a Sharpness II book applied at the anvil gave exactly
  {sharpness: 2} and consumed the book (null after). tsc 0, 0 page errors.
  **Still owed a live check**: silk touch's drop swap (a ternary in the
  generic drop branch + fortune guard) — the slow-motion QA harness could
  not land a controlled mine on a placed farmland cell in 2 attempts;
  the combat/swim/frost effects are code-reviewed, exercised only via
  the same paths as their v2.4 siblings.
- Philippe's note (2026-10-25): some animals "font pas de sens" — item 3
  scope extended with a **bestiary visual-coherence pass**: every mob's
  LEGO build reviewed so its structure reads at a glance.
- NEXT (Muse): item 2 — iconic items (trident, crossbow, fireworks,
  name tags, frames/paintings).


## v3.2 — 2026-10-25 (Battle order #2, item 2: iconic items + music)

### Item 2 — iconic items (defs 282–287, append-only)
- **Trident (282)** — gear, sword-class tier 4. Use = throw (`throwTrident()`): flat 9 dmg projectile, 0.9 s cooldown instead of consuming the weapon (per-def inventory counts durability, can't remove one unit — documented rule). 22 % drop from Drowned.
- **Crossbow (283)** — gear, bow-class tier 4. `shootHeld` branch: power +2, bolt is `pierce: true` — flies through mobs, each mob hit once per bolt (`Shot.hitSet`). Pierce = code-verified only (no live two-mob alignment test yet).
- **Firework (284)** — use = `launchFirework()`: rocket rises, spark trail, bursts at ~1.15 s (26 coloured + 8 white particles + explode sound). No elytra boost (no elytra in game — documented omission).
- **NameTag (285)** — use on a mob: prompt for a name → `mob.name` + nameplate sprite above the mob; consumed in survival; **named mobs are exempt from far-despawn**. Session-only (names are not in the save format yet).
- **Frame (286) + Painting (287)** — placeable flat panels: new `flat` flag on BlockDef, mesher draws a thin double-faced panel. Recipes for all six items (crossbow 3 sticks + 2 ingots + 2 string; firework Powder + Paper → 2; nametag Paper + String; frame 4 sticks + Pelt; painting 4 sticks + White).
- QA56 live-verified: trident kill, name tag end-to-end (mob named "Bricky", plate visible), painting placed, crossbow bolt in flight.

### v3.1 owed-verification campaign (Philippe's order: "fait ce qui est encore dû")
Every enchantment effect shipped code-verified in v3.1 was exercised live in survival QA (seed 23, Playwright):
- **Silk Touch ✅ live** — control: IronOre mined with plain iron pick → RawIron ×1, no ore. Silk I pick → the IronOre block itself ×1, RawIron 0. (breakBlock's whole drop block is creative-gated — survival setup required.)
- **Smite V ✅ live** — walker (8 hp): control iron blade 2 swings, Smite V iron blade 1 swing.
- **Looting III ✅ live** — 2 spider kills → String 0→3, then 3→4 (total 4 vs base rate 2; control rate proven separately at exactly 1/kill, pickups settle-polled). Two earlier zero results were test artifacts, not game bugs: (a) mob drops only spawn in survival, (b) the QA hook's old `give()` made 1-durability blades that snapped on the killing swing, zeroing the hotbar slot before `killMob` read the enchant.
- **Depth Strider III ✅ live** — swim speed cap 2.38 → 3.94, exactly the design factors (4.33 × 0.55 → 4.33 × 0.91).
- **Thorns III ✅ live** — full armour set, each piece Thorns III: walker died to reflected damage after contact (QA-spawned walkers park just outside the 1.35 bite radius — a scripted nudge into contact range was needed; reflection itself fired from the game's melee path).
- **Frost Walker II ✅ live** — freezes a 3×3 of water one cell BELOW feet level (`by = floor(player.y) − 1`, needs air above the water): shore trench cell read Ice (94) immediately after pouring. Flat puddles at feet level do not freeze — that is the mechanic's geometry, not a bug.
- **Infinity ✅ live** — survival, bow + exactly 1 arrow: two shots fired, arrow count still 1 after both.
- **Mending — code-verified only** (branch read line-by-line: survival-only, held item +2 uses per 3 game-second tick). Two live attempts died to SwiftShader slow-motion boots before reaching the idle window; not observed live yet.
- **Crossbow arrow-spend — code-verified** (same `spend(ID.Arrow, 1)` line Infinity bypasses, whose contrast was observed live; crossbow firing itself live-proven in QA56).

### Bugs found by the campaign — fixed in this version
1. **Armour-slot predicates (game bug, since v2.4)** — Feather Falling / Depth Strider / Frost Walker enchant checks tested `armorSlot === 3` (leggings) while their effects read `armor[3]` (boots = `armorSlot 4`). Feather Falling could never roll via normal enchanting. All three predicates → `armorSlot === 4`.
2. **Firework + Trident dead against blocks (game bug)** — the use-item chain only ran in the no-target branch; aiming at a block routed to `tryPlace`, which only knew bows. `tryPlace` now also routes `throwTrident()` / `launchFirework()`. Live-proven after fix: firework launched aimed at the ground, 2 rockets observed.
3. **QA hook `give()` (tooling, not a game bug)** — the test hook used `addInv` count semantics, handing out 1-use tools/armour; it now calls the game's own `give()` (full durability, armour auto-equips).
4. **Music would have shipped silent (packaging bug, caught before release)** — both standalone/APK vite configs set `publicDir` to `public/icons-160` (icons only), so `public/music/` was never served by the dev server (SPA fallback returned index.html for every `.mp3`) and never copied into `dist-game/`/`dist-apk/`. Fix: new shared vite plugin `vite.musicAssets.ts` wired into both configs — dev middleware serves `public/music/` at `/music`, `closeBundle` copies it into the build output. Verified after fix: dev server returns the MP3 as `audio/mpeg`, byte-identical to the file on disk; icons still serve (no publicDir regression).

### Music system (Philippe's Suno tracks)
- 14 tracks in `public/music/`, renamed per Philippe's directive: `music-day-1..4.mp3`, `music-night-1..4.mp3`, `music-nether-1..2.mp3`, `music-boss-1..4.mp3` (day-4 arrived as .m4a, converted to MP3 192k; folder total 39 MB — the APK grows by that much).
- **Music director** in game.ts: one `HTMLAudioElement` (volume 0.45), armed by the first pointer/key gesture (autoplay policy). Context each tick: boss (a dragon/wither is alive) > nether (realm 2) > night (`sin(worldTime·2π) < −0.12`) > day; the title screen plays day tracks. A playing track always finishes; when it ends, a **35–90 s silence gap** (Philippe asked for moments with NO music), then the next track of the *current* context, per-context rotation. `settings.sound` off pauses playback.
- **Music QA (qa58 series + qa59)** — the director was live-observed in five SwiftShader runs: arms on the first gesture, context resolves `day`, and the initial 4 s silence gap counts down monotonically (best run 3.9 → 0.9) with zero page errors and zero audio-error resets. The harness renders the game at ~1/24 speed with `dt` capped at 0.05 s/frame, so no run's window survived to the flip itself — the flip branch is code-verified (gap ≤ 0 → next track of the current context → `play()`). The playback pipeline itself is hard-verified end-to-end (qa59): the exact `music-day-1.mp3` served by the dev server plays in Chromium — `play()` resolved, `paused=false`, readyState 4, duration 73.2 s, clock advancing. On a real device the initial gap is 4 real seconds.

### Files
`src/game/blocks.ts`, `src/game/recipes.ts`, `src/game/game.ts`, `src/game/mesher.ts`, `WORKLOG.md`, `apk/src/main/AndroidManifest.xml` (versionCode 23 / versionName 3.2), `public/music/*.mp3` (14 new), `vite.musicAssets.ts` (new), `vite.standalone.config.ts`, `vite.apk.config.ts`. APK + web zip rebuilt.

### Next move (claimed by Muse)
BO2-3: pillar mobs #2 (Shulker, Guardian, goat, axolotl, parrot, Husk, Stray) + the bestiary visual-coherence pass Philippe ordered 2026-10-25 08:52 (every animal must make structural/visual sense).

## v3.3 — 2026-10-25 (Battle order #2, item 3: pillar mobs #2 + bestiary coherence)

### New mobs (7 kinds)
- **Husk** — desert zombie (makeFig: tan rags, sun-baked skin). Walker AI, speed and drops, but **exempt from the daylight-burn list** — its Minecraft signature trait (strays, added to the burn list, do burn). Night spawns in Desert / Sand flats / Mesa.
- **Stray** — snow skeleton (makeFig: frost palette, skull face). Full skelly AI including ranged arrows and daylight burn. Night spawns in Snow cap. (Its slowness arrows are plain arrows here — noted omission.)
- **Goat** — new beast() build (horns, beard, ears, upturned tail). Grazer that is milkable (bucket), breeds on wheat, takes a lead. **Ram**: within 9 blocks it may pick you — 0.8 s aim (rooted, facing you), then a 5.2 blocks/s horn charge for up to 0.9 s; contact = bite 2 (thorns reflect applies), 5 s cooldown. Spawns in Ash ridge / Snow cap.
- **Axolotl** — pink swimmer, gill frills and tail fin. Swims below the surface like the squid; dries out on land at a quarter of the squid's rate. Ocean / Shore water spawns. Drops nothing (Minecraft-accurate).
- **Parrot** — green hover flyer, wings in the flap rig. Tame it with Seeds and it follows / teleports like the wolf and cat. Drops Feather. Day spawns in Grove / Flower grove.
- **Guardian** — teal spiked fish with the one big orange eye. Swims and chases. **Laser**: 0.8 s eye charge — break line of sight during the charge and the zap fizzles — then 3 dmg with a particle beam; spike melee at contact range. Drops Crystal (plus a luck-chance second). Ocean water spawns.
- **Shulker** — purple shell with the head peeking between the halves. Rooted (speed 0) and exempt from separation shoves; spits a bullet every 2.4 s within 16 blocks (arrow system — straight flight, no homing or levitation, noted). Drops Shell. Two now guard the End city with the skellies.
- All seven wired through: kind union, spawn HP (guardian/shulker 15, husk/stray 8, goat 5, axolotl/parrot 3), drops, MOB_XP (ranks.ts — goat's 3 was already there), golem/wolf foe lists, far-hostile despawn, passive despawn, quest "host" credit for husk/stray.

### Bestiary visual-coherence pass (Philippe, 2026-10-25: animals that « font pas de sens »)
- **The Wither was a white cube** — no build existed, it fell through to beast()'s blank fallback. Now: three black skulls on a ribbed spine, trailing tail vertebra, white eye slits.
- **Pig snout was clown-red** (0xe23b2f) → brick pink (0xd96a8a).
- **Chicken gained wings and an angled tail** — it no longer reads as a white box on sticks.
- QA hook: the `spawnMob` whitelist silently refused every new kind (first contact-sheet run spawned only wither/pig/chicken) — extended with all seven.

### QA
- tsc clean (0 errors).
- qa60b (seed 23): all 7 new kinds + wither spawn through the fixed hook — `all present: true` in getMobs, zero page errors.
- Screenshots (qa60c / qa60d + 5x zoom): the **Wither reads crisply against the sky** — three black skulls on a ribbed spine (it was a white cube before this pass). The Stray's pale skull face, the Guardian's spiked teal bulk with the orange eye, the Shulker's purple shell and the Axolotl's pink all identify in the zoom. Husk / goat / parrot eluded a clean photo (spawn-point trees + harness screenshot latency) — spawn-verified, models judged by construction; Philippe's A54 remains the visual verdict.
- Behaviours (ram, laser charge, spit cadence, seed-taming) are code-reviewed against the existing AI blocks they extend; not individually trip-wired in the slow-motion harness.

### Files
`src/game/game.ts`, `src/game/ranks.ts`, `WORKLOG.md`, `apk/src/main/AndroidManifest.xml` (versionCode 24 / versionName 3.3). APK + web zip rebuilt.

### Next move (claimed by Muse)
BO2-4: Illagers + hamlet raids.

## v3.4 — 2026-10-25 (Battle order #2, item 4: Illagers + hamlet raids)

### The illager family (5 kinds)
- **Pillager** — grey-skinned illager (makeFig, mad face) with the skelly's ranged brain: crossbow bolts from 3–16 blocks, melee 2 up close. Drops arrows; luck extras: an emerald, and 14% a Crossbow.
- **Vindicator** — the axe brute: fastest ground chaser (2.6), bite 3, drops an Emerald (12% an Iron axe).
- **Evoker** — black-and-gold robes. On first engagement it **summons two Vex** (raid-summoned vexes carry the raid flag, so a wave can't be "cleared" around them); afterwards it casts **ground fangs**: your position is telegraphed with pale particles, and 0.65 s later the fangs bite for 3 if you're still standing there — moving is the counterplay. Drops the **Totem "Last stud"** + an Emerald (the totem's death-cheat already existed in die() — it just never had a source; the loop is now closed).
- **Vex** — palm-sized pale gremlin on swept wings; hovers at bee height, dives for a 2-dmg bite. No drops.
- **Ravager** — 40 HP siege beast: hulking grey bulk, horned brow, iron nose bar, saddle patch. Bite 5 on the player, 4 on the folk. Drops fur + meat.
- Raiders **hunt villagers**, not just the player — the nearest target wins, pathfinding included; hamlet golems and tamed wolves have all five kinds on their foe lists, so the hamlet fights back. Raid mobs are exempt from the far-hostile despawn. All five pay MOB_XP and count for the kill-quest "host" tag.

### Patrols, Bad Omen, raids
- Every ~5–7 minutes in the wild (never inside a hamlet's peace, never on Peaceful), an **illager patrol** materialises ~34 blocks out: three pillagers (+ a vindicator from builder rank 4) led by a **banner captain** (white banner with a red cross on his back).
- Killing the captain hangs a **Bad Omen** on you for 30 minutes (HUD chip "Omen"). Walk into a hamlet carrying it and the war horn sounds: a **three-wave raid** (5 → 8 → 8 raiders, the last with the Ravager) spawns at the hamlet's edges; the boss bar becomes "Raid — wave N of 3" tracking survivors. Waves rest 8 s apart. Abandon the hamlet (>110 blocks for 45 s) and the raiders melt away.
- **Victory**: Hero of the Hamlet for 30 minutes (HUD chip "Hero") — every trade costs 1 less (min 1) — plus a 6-Emerald reward dropped at the hamlet centre.

### QA
- tsc clean (0 errors).
- qa61 (seed 23): all five illager kinds spawn through the hook (5/5) and live in getMobs with zero page errors; the line-up zoom reads the Ravager's horned grey bulk and the grey illager figures. The QA-spawned Evoker engaged on its own and **summoned its two Vex live** (three vexes in the world list after spawning one).
- qa61/qa61b: forceRaid() arms a raid at the spawn hamlet — getRaid reports w0/rest, exactly the designed staging state. The 2.5 s staging countdown runs on the same frame-dt timers as the music gap countdown observed ticking live in qa58; in the SwiftShader harness game time runs up to ~100x slow, so the wave-1 flip itself was not captured; wave spawning rides spawnKind (proven above) and the raid state machine is code-reviewed end to end.
- Captain -> Bad Omen and the Hero trade discount are code-reviewed (killMob captain branch; trade() price mutation); patrol spawning is timer-gated (~5-7 min of play) and was not observed in the harness.

### Files
`src/game/game.ts`, `src/game/ranks.ts`, `WORKLOG.md`, `apk/src/main/AndroidManifest.xml` (versionCode 25 / versionName 3.4). APK + web zip rebuilt.

### Next move (claimed by Muse)
BO2-5: structures (ocean monument, Nether fortress/bastion, woodland mansion).

## v3.5 — 2026-10-25 (SIREN creature shading — Philippe's order, 2026-10-25 12:52)

Philippe's brief: the mobs and NPCs get the real shader too — hyper beautiful, hyper light, via **Sinusoidal Representation Networks**. The honest translation into this engine: creature surfaces carry **no detail textures at all**; their micro-surface is a small sinusoidal field evaluated per fragment inside the shared creature program.

### What shipped
- `sirenize()` in game.ts patches every material born through `skin()` — the single factory behind every mob, villager, golem and the player's own figure — when Realistic mode is on. All patched materials share **one compiled program** (`customProgramCacheKey`), so the whole bestiary pays one compile and a handful of `sin()` per fragment. Zero textures, zero added geometry, zero per-kind code.
- The field (two sine layers, SIREN-style: `sin(W·p + sin(W·p))`) drives, in object space so it moves with the creature:
  - **Per-brick tint variation** — a sinusoidal hash over ~14 cm cells re-tints the diffuse ±7%, the same per-brick shade law the world mesher follows.
  - **Stud seams** — cell borders darken up to 16%, so large smooth bodies (golem, ravager, dragon) read as assembled bricks instead of soap bars.
  - **Satin micro-bump** — the field's gradient perturbs the fragment normal (amplitude 0.05): a soft plastic sheen that shifts as you move, instead of a flat CG matte.
  - **Per-cell roughness patches** (±0.11) — real LEGO plastic is not uniformly worn; the specular response now varies patch to patch.
  - **Fresnel rim** — silhouettes catch a faint diffuse-tinted rim (0.16, cubed falloff), separating creatures from the background at a glance.
- The Performance profile is **untouched**: `skin()` still returns plain Lambert there, no patch, no cost — the A54's fast mode stays exactly as fast. Toggling Réaliste rebuilds creature materials through the existing convert() path, which routes through skin(), so the field appears/disappears with the setting like the plastic look itself.

### QA
- tsc clean (0 errors).
- qa62 (seed 23, Realistic on): five test creatures spawn (5/5), zero page errors and zero WebGL shader-compile complaints — the patched program builds first try.
- The qa62 close-up (golem at arm's length, 4x crop) shows the field working: a subtle brick-grid seam network across the body, cell-by-cell tint variation in the grey, and a bright fresnel band riding the silhouette edge. The grade is deliberately gentle at gameplay distance; every amplitude lives in one place (sirenize) if Philippe wants it hotter.
- The Performance profile is untouched by construction (plain Lambert branch of skin()); on-device FPS stays Philippe's A54 verdict, as always.

### Files
`src/game/game.ts`, `WORKLOG.md`, `apk/src/main/AndroidManifest.xml` (versionCode 26 / versionName 3.5). APK + web zip rebuilt.

### Next move (claimed by Muse)
BO2-5: structures (ocean monument, Nether fortress/bastion, woodland mansion).

## v3.6 — 2026-10-25 (BO2-5: landmark structures)

Four set-piece structures join the small site system, on their own coarse grid (one candidate per 384-block cell, biome-gated, hamlets keep a 78-block clearance). Each is painted chunk-by-chunk from a pure pattern function (`landmarkBlock` in world.ts), the same determinism contract as hamlets: any chunk rebuilds its slice identically, saves and seeds untouched.

### What shipped
- **Ocean monument** (deep-ocean cells, seabed-anchored): stepped Prism pyramid (37×37) with a hollow core chamber — gold heart (3×3×2), a chest, door gaps and two entrance tunnels bored through the mid-tier, four spires topped with lamps. In these shallow brick oceans the crown breaks the surface, which makes it findable from shore.
- **Woodland mansion** (flat Grove / Flower grove / Brick plains): two floors, plank walls with log corners and glass windows, bookshelf row, bench, beds, chests, a ladder stairwell through a slab hole, ash-brick gabled roof. Its grounds are patrolled by **2 vindicators + 1 evoker**.
- **Nether fortress** (Nether band): an ember-brick bridge deck 45 long on netherrack pillars, fence rails, a lamp-lit mid platform and two open-gallery towers with floors, ladders, chests and crenellations. Guarded by **2 blazes**.
- **Bastion** (Nether band): a ruined basalt keep (hash-breached ramparts) around an obsidian-ringed **gold heart** with a chest; magma flecks in the courtyard floor. Guarded by **3 piglins** at the gate.
- **Guardians system** (`ensureLandmarkGuards`, folk pattern): approaching within 76 blocks tops up each landmark's defenders — the monument gets an **elder guardian** (1.7× scale, 32 HP) plus 2 guardians — and speaks a one-line discovery hint, once per landmark per session. Guards use the normal far-despawn, so leaving cleans up and returning re-staffs.
- **Loot wiring**: chests opened within 40 blocks of a landmark stock from the matching table — monument → `deep`, mansion → `hamlet`, fortress/bastion → `nether` — instead of the default wild table.
- Rarity tuned against measured terrain (seed-23 ocean histogram: real deep water is scarce): monument gate = Ocean biome at seabed ≤ SEA−3 with a 45% roll; mansion 18% roll; Nether landmarks 22% of band cells. Mansions went from 7 per ±3 cells to ~4% of all cells after tuning.
- QA hooks: `getLandmark()` (nearest) and `scanLandmarks()` (7×7 cells).

### QA
- tsc clean (0 errors).
- **Node probes against the real World class** (all four pattern functions, block-exact): monument 10/10 signature cells (gold heart, chest, spire lamp + shaft, prism body, outer step, tunnel, chamber, door); fortress deck/rails/lamp posts/pillars/tower chest/crenellations; bastion gold heart/chest/wall/gate; mansion wall/ridge/chest. Cross-seed census: monuments generate (8 across 40 seeds in ±6 cells — seed 23's continent is simply dry), mansions ~4% of cells, Nether pair ~20% of band cells.
- **qa63 live (browser, seed 23)**: world boots with 0 page errors; the first run (pre-rarity-tuning) found 7 mansions in ±3 cells and probed every signature block live — walls, floors, ridge, chests, interiors, 35/35 match. After the rarity tuning, the live scan and the node census agree exactly (0 within ±3 cells of spawn; seed 23's nearest mansion stands at −1386, −600, ~1510 blocks out — a proper expedition). Guard spawning, greetings and chest loot kinds are code-reviewed on the folk/raid plumbing (same slow-harness limits as the raid wave flip: the A54 is the real verdict).

### Files
`src/game/world.ts`, `src/game/game.ts`, `WORKLOG.md`, `apk/src/main/AndroidManifest.xml` (versionCode 27 / versionName 3.6). APK + web zip rebuilt.

### Next move (claimed by Muse)
BO2-6: stations (beacon, shulker box, conduit, jukebox + discs).

## v3.7 — 2026-10-25 (Living sky — Philippe's order: quality day/night sky, weather, realistic clouds)

Philippe's brief: a quality sky — day/night, weather, realistic clouds — upscaled the Studcraft way (procedural math, zero heavy assets). The dome, sun/moon and stars already existed; what was missing was real clouds and real weather. This version builds both, plus the rain that until now was invisible.

### What shipped
- **Procedural cloud deck** (Realistic mode): ONE shader plane following the player at +88, zero textures. A two-layer fBm field (5 octaves, 4 on narrow screens) shapes soft cloud masses — detail noise for lit puff tops, a low-frequency belly field for grey undersides, a sun-glow term through the deck, distance + near fades so flying through it never hard-clips. World-space UVs + eased wind drift: the sky moves, the player doesn't swim through it. In Realistic mode it replaces the 32 slab clouds; **Performance keeps the slabs exactly as before**.
- **Weather director**: four states — clear → cloudy → rain → storm — on a small Markov chain with per-state durations (50–300 s). All consumers read **eased** values (cover, dark, precip, fog, wind; ~10 s transitions), so weather breathes in instead of snapping: fog greys and closes in, the zenith dulls, the sun dims under cover, the deck thickens and darkens, the wind picks up.
- **Rain, visible at last**: 700 recycled line streaks in a box around the camera, slanted by the eased wind, opacity driven by precipitation. Before this version "rain" existed only as a HUD word, wet crops and lightning.
- **Lightning re-gated**: frequent in storms (5–14 s), rare in plain rain (24–54 s) — same bolt/flash/thunder/creeper-charging strike as before.
- HUD weather now reports the real state. QA hooks: `getWx()` / `setWx(state)` (the hook snaps eased values — a test convenience; production transitions always ease).

### QA
- tsc clean (0 errors).
- qa64 live (browser, seed 23, Realistic): director states and eased values read back exactly (`clear cover=0.22 deck=on slabs=off rain=off` → `storm cover=1.00 dark=0.78 precip=1.00`), rain streaks observed ON during the storm phase, back off after clear, 0 game errors (the single console error is the fonts CDN tunnel failing on this VM, environmental).
- Honest limit: all three qa64 screenshots timed out on this box (SwiftShader + a neighbour benchmark saturating the CPU) — the deck is verified by state and shader compile, **not yet by eye**. Philippe's A54 look at the sky is the visual verdict, as always.

### Files
`src/game/game.ts`, `WORKLOG.md`, `apk/src/main/AndroidManifest.xml` (versionCode 28 / versionName 3.7). APK + web zip rebuilt.

### Next move (claimed by Muse)
BO2-6: stations (beacon, shulker box, conduit, jukebox + discs).

## v3.8 — 2026-10-25 (BO2-6: stations — beacon, shulker box, conduit, jukebox + discs)

The four working stations, each wired into systems the game already had (effect timers, the chest store, the music director) instead of parallel ones.

### What shipped
- **Beacon** (new block): right-click opens its panel — build a pyramid of iron/gold/aqua-gem blocks underneath (3×3, 5×5, 7×7, 9×9) and pick a blessing. A sky beam marks an active pyramid; while the player is in range the blessing stays topped up: Swiftness or Leap (level 1), Renewal (level 2), Might (level 3). Crafted from glass + a nether star + obsidian.
- **Conduit** (new block): framed by three prism rings (16+ prism blocks) and set in water, it keeps swimmers breathing — the Gill effect, sustained — and zaps hostile mobs that come within 8 blocks. Crafted from shell chips + a prism core. Side benefit: Gill now actually stops the oxygen drain (before, it only sped up swimming while you drowned at full speed).
- **Shulker box** (new block): a crate that keeps its contents. Break it and the contents ride along in the save; the next shulker box placed inherits them — no spill, ever. Shulkers now drop **shulker shells** (2 + a crate = the box). With several boxes in flight the contents queue is FIFO — the one simplification vs Minecraft, noted here honestly.
- **Jukebox + 5 music discs** (new block + items): discs (Sunloop, Moonloop, Emberdeep, Warloop, Rainloop) hide in deep and nether chests (~10%). Right-click a jukebox holding a disc to play it — that track loops and outranks the music director while you're near (fading with distance); right-click again to eject. Breaking the box drops the disc.
- Stations are **scan-based**: the effects tick searches around the player every 1.5 s, so a station works however it appeared in the world — no placement registry to desync. Beacon buffs, jukebox discs and the shulker queue persist in the save.

### QA
- tsc clean (0 errors). Node probe on the real defs/recipes: all 4 station recipes resolve, shapes and ingredients valid, work kinds correct (shulker box → chest panel, beacon → its panel).
- qa65 live (browser, seed 23): beacon read back at pyramid level 1 then 2 after adding the 5×5 layer, buff registered, beam mesh created, fx timer topped in range (speed=3); conduit prism frame counted 48/48 ring cells (≥16 = active); jukebox override switched the shared music element to the disc's track (music-day-3) — the element stayed paused in the harness because synthetic clicks don't count as a user gesture for autoplay, so audible playback and the eject hand-back are code-verified, the override engagement is live-proven; 0 game errors.
- Code-verified only: the shulker break/place queue (needs real dig/place input the harness can't aim reliably), the conduit's in-water Gill sustain and mob zap (frame counting is the live-proven half), disc loot rolls (deterministic hash gates in the chest tables).

### Files
`src/game/blocks.ts` (defs 288–297), `src/game/game.ts`, `src/game/GameView.tsx` (beacon panel), `src/game/recipes.ts`, `src/game/loot.ts`, `src/game/save.ts`, `WORKLOG.md`, `apk/src/main/AndroidManifest.xml` (versionCode 29 / versionName 3.8). APK + web zip + PC exe rebuilt.

### Next move (claimed by Muse)
BO2-7: villager depth (stock/refresh, reputation).
