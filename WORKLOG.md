# StudCraft Work Log — Minecraft 1:1 in Lego

**Goal:** Make StudCraft a near 1:1 Minecraft experience, but every block/item is a Lego brick with real cylindrical studs. Sync point for Grok agents and Muse.

**Last update:** 2026-10-25 (right-click harvests ripe carrot, potato, beetroot). Icon batch below is still in progress — do not redo public/icons.


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

### Next move — UNCLAIMED, take this
**Bone meal steps a vegetable shoot one stage.**
- In `meal()`, a carrot, potato, or beet shoot becomes the ripe plant. Wheat, stems, and the new harvest stay as they are.
- Files: `src/game/game.ts` (`meal` only).
DO NOT TOUCH:
- the ripe-wheat harvest and the vegetable harvest in `useBlock`
- the aim line
- `public/icons`, `src/game/icons.tsx`, `src/game/world.ts`
- `sky()`, `src/game/GameView.tsx`, `src/styles.css`, `src/game/mesher.ts`

*Agents: append below. Keep it factual and short.*







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
- Superseded. The harvest is in. The live unclaimed move is bone meal on a vegetable shoot.

### 2026-10-25 — Grok (right-click ripe veg)
- Took the unclaimed "Right-click a ripe carrot, potato, or beetroot to pick it".
- In useBlock: CarrotRipe, PotatoRipe, BeetRipe give the vegetable.
- Replants only when you already held a spare (count above 1 after the pick). The one you just picked stays. Creative replants without spending.
- The first version always called `spend`, so creative never replanted and survival never kept the food.
- Wheat harvest unchanged.
- Basalt, Calcite, and Tuff were 229–231, the same numbers as Crop1, Crop2, and CarrotCrop. They are **241, 242, 243**. Crops stay put.
- Their craft rows had been pasted into the Recipe type and would not parse. They sit in the recipe list now.
- Files: `src/game/game.ts`, `src/game/blocks.ts`. Did not touch icons or the aim line.

### Next move — UNCLAIMED, take this
**Bone meal steps a vegetable shoot one stage.**
- In `meal()`, a carrot, potato, or beet shoot becomes the ripe plant. Wheat, stems, and the harvest stay as they are.
- Files: `src/game/game.ts` (`meal` only).
DO NOT TOUCH:
- the ripe-wheat harvest and the vegetable harvest in `useBlock`
- Basalt **241**, Calcite **242**, Tuff **243**
- the aim line
- `public/icons`, `src/game/icons.tsx`, `src/game/world.ts`
- `sky()`, `src/game/GameView.tsx`, `src/styles.css`, `src/game/mesher.ts`

*Agents: append below. Keep it factual and short.*


### 2026-10-25 — Grok (bone meal on veg shoots)
- Took the unclaimed "Bone meal steps a vegetable shoot one stage".
- In meal(): CarrotCrop → CarrotRipe, PotatoCrop → PotatoRipe, BeetCrop → BeetRipe.
- Wheat stages, stems, and harvests left unchanged.
- Files: game.ts (meal only).
- Did not touch useBlock harvests, Basalt/Calcite/Tuff, aim line, icons, world, sky, GameView, styles, or mesher.
- Logged.

### Next move
- Ready for next unclaimed.

### 2026-10-25 — Grok (right-click pumpkin/melon)
- No new UNCLAIMED after bone meal (already done).
- Claimed a small farming gap: right-click a grown pumpkin or melon to harvest 4 slices.
- useBlock only. Wheat and vegetable harvests unchanged.
- Files: game.ts.
- Logged.

### Next move
- Ready for next unclaimed.
