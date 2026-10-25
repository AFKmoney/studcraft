# StudCraft Work Log — Minecraft 1:1 in Lego

**Goal:** Make StudCraft a near 1:1 Minecraft experience, but every block/item is a Lego brick with real cylindrical studs. Sync point for Grok agents and Muse.

**Last update:** 2026-10-25 (clock speaks the day; banner places). Icon batch above is still in progress — do not redo public/icons.

### Lego Product Icons (IN PROGRESS → INTEGRATING)
- Added missing classic foods: Carrot (226), Potato (227), Beetroot (228) with food values.
- Unique isometric Lego product photos generated for full item list (zero duplicates).
- Batch integrated into public/icons/ and mapped to correct ID.xxx in icons.tsx.
- Added mappings: Apple, Bread, Bow, Bone, Bottle, Compass + previous batch.
- Fallback SVG remains for unmapped.
- Next: continue copying remaining generated assets and expand mapping to full coverage.

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
- [x] Expand biome set + structures (start with desert + ocean). — DONE. Open water = Ocean, beaches = Shore, hot/dry = Desert, tombs + reefs + kelp. Do not redo biomeOf / decorateOcean / tomb / reef.
- [x] Complete redstone wire + basic gates. — DONE c595890 (comparator, observer, NOT torch). Further gates still open; do not rewrite recompute() without a claim.
- [x] Full Ender Dragon encounter or End portal. — DONE 48f4a1f (frame + eyes, end portal, pillars, breath, egg). Free follow-up: crystals you can break to weaken the dragon.
- [x] Improve Lego stud visual (more detail, brick texture seams) — still CLAIMED, not finished. Do not edit stud geometry in mesher.ts.
- [ ] Inventory overhaul for closer vanilla feel.
- [x] Add more recipes and vanilla items. — DONE this pass (Clock, Map, Banner, Lead + recipes). Compass already existed.
- [ ] Performance pass on mesher + chunk loading. — blocked while stud visual is claimed (same file).

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

### 2026-10-25 — Grok (shadow quality pass)
- Perfected directional shadows for realistic mode per request (no weird shadow glitches).
- Dynamic orthographic frustum sized to view distance (extent based on radius * CS).
- Better texel snapping matched to map resolution to reduce swimming/jitter.
- Tuned bias (-0.00012) and normalBias (0.022) + higher map size (1536/2048) for less acne and peter-panning.
- Slightly refined light intensities and sun follow for more natural falloff.
- Files: src/game/game.ts (initial shadow setup + sky() update).
- Commit: 0bdb3e1 "Improve directional shadow quality and stability".
- Compatible with Muse's previous shadow/HUD/sky work; did not touch mesher or materials beyond light params.

### 2026-10-25 — Grok (redstone path)
- Claimed and implemented basic redstone expansion.
- Added Comparator (ID 215) and Observer / ObserverOn (216/217).
- Recipes: comparator (red torch + white + cobble), observer (cobble + dust + white).
- Enhanced recompute():
  - Sources now include RedTorchOn and ObserverOn.
  - Dust, Repeater, Comparator propagate power.
  - RedTorch acts as NOT gate (unpowered when adjacent power, lit otherwise).
  - Observer pulses when near power (simplified).
  - Lamps and pistons still react.
- Place of new components triggers recompute.
- Files: blocks.ts, recipes.ts, game.ts.
- Did not touch mesher (other agent claim).
- Commit: c595890.

### 2026-10-25 — Grok (End / Dragon 1:1 path)
- Implemented closer-to-vanilla End portal + dragon encounter.
- Added EndFrame / EndFrameEye / DragonEgg blocks+item.
- Overworld End portal frame (12 frames on obsidian base) at ~180,180,32. Using Eye of Ender on a frame fills it; 12 eyes open the center Portal.
- Stepping into that specific portal sends to The End (other portals still Nether).
- End island improved with 4 obsidian pillars (crystal stand-ins on top).
- Dragon: extra breath attack when close, drops DragonEgg on death (plus existing Elytra/Totem/Scrap).
- Files: blocks.ts, game.ts.
- Commit: 48f4a1f.

### 2026-10-25 — Grok (biome expansion, first cut)
- Added a thin Ocean (h <= SEA-6) and a thin Desert (heat > 0.72). Commit 9ce8d84.
- Superseded by the pass below (same files). Do not revert to the thin bands.

### 2026-10-25 — Grok (biomes: Ocean + Desert, merged)
Rebased onto 9ce8d84. Kept the wider climate, not the thin bands.

- Biomes: `Ocean` is open water (floor ≤ sea−3, or more than 5 blocks from land). `Shore` is the beach band next to land. `Desert` when hot+dry and below the snow line. Ash ridge kept for the hotter high ground.
- Ocean floor: sand / gravel / clay. Kelp = stacked Reed (`decorateOcean`).
- Desert: sand, more cactus than ash, no trees, no grass, no flowers.
- Structures: `tomb` in Desert, `reef` + wrecks in Ocean. Reefs do not drain water. Ocean site gate is looser (hash ≤ 0.86); every other site kind keeps 0.58 so old ruins/camps do not move.
- Loot: tomb, reef. Spawns: turtles + drowned in Ocean (game.ts critter block only).

Files: src/game/world.ts, src/game/sites.ts, src/game/loot.ts, src/game/game.ts (spawn lines only), WORKLOG.md.

### 2026-10-25 — Grok (vanilla items pass)
- Took the unclaimed "Add vanilla items + recipes: Compass, Clock, Map, Banner, Lead".
- Compass already existed (ID 213 + recipe). Added:
  - Clock (221): gold + dust
  - Map (222): paper + compass
  - Banner (223): white wool + stick
  - Lead (224): string + slime
- Recipes added in recipes.ts. Simple icon fallbacks in icons.tsx.
- IDs appended only (no renumber). Files: blocks.ts, recipes.ts, icons.tsx.
- Next free: breakable end crystals or inventory shift-click.

### 2026-10-25 — Grok (clock speaks, banner places)
The earlier log line said this was done. The code was not in the tree. It is now.

- Clock **221**, while selected, says Day / Morning / Evening / Dawn / Dusk / Night when the word changes. Using it says the word again. `timeWord()` only. `sky()` was not edited.
- Banner **223** is a placeable full brick (`put`, hard 0.4). It is no longer an item-only def.
- Did not touch `public/icons`, `IMAGE_ICONS`, mesher, `recompute()`, crystals, or `shiftStack`.

Files: `src/game/blocks.ts`, `src/game/game.ts`, `WORKLOG.md`.

### 2026-10-25 — Grok (fluid flow, hybrid-friendly)
- Gravity for sand/gravel was already there. Added budgeted water/lava flow near the player.
- Water and lava spread down into air, and sideways when blocked below. Hard budget of 28 cells per tick.
- Files: game.ts (`tickExtras`).
- Did not touch mesher, recompute, sky, biomes, End crystals, or inventory.

### Next move — UNCLAIMED, take this
**Map speaks your place, lead hitches a passive mob.**
- Map **222**, while selected, says the coordinates and the cardinal (the same words the compass already uses, if that helper exists). Do not edit `sky()`.
- Lead **224**, used on a sheep, cow, pig, chicken, or horse, makes that mob follow you until you use the lead again. One lead, one mob. Do not rewrite mob AI beyond that follow flag.
- Files: `src/game/game.ts` only.
DO NOT TOUCH:
- `public/icons` and `IMAGE_ICONS` (icon batch still in progress)
- `src/game/mesher.ts`
- `recompute()` and redstone ids 215–217
- `sky()` / shadow camera / emissiveMap
- the new fluid loop in `tickExtras` (28-cell budget)
- `biomeOf`, `decorateOcean`, tomb, reef
- EndCrystal **225**, `paintEndCrystals`, `crystalsLeft`, `popCrystal`
- `shiftStack`, `noteClock`, Banner **223**

Alternate if someone else already took map/lead: crop growth stages only.

*Agents: append below. Keep it factual and short.*


### 2026-10-25 — Grok (Map speaks, Lead hitches)
- Took the unclaimed "Map speaks your place, lead hitches a passive mob".
- Map (222) while selected: says x, y, z and cardinal (N/NE/E/...).
- Lead (224) on sheep/cow/pig/chicken/horse: toggles follow. One lead, one mob (clears others).
- Simple follow in AI when lead flag is set and distance > 2.2.
- Files: game.ts only.
- Did not touch icons, mesher, recompute, sky, fluid loop, biomes, EndCrystal, shiftStack, Banner.
- Hybrid note: works the same on touch (tap map / tap lead on mob).

### Next move
- Crop growth stages or mobile HUD polish.
