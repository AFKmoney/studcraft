# StudCraft Work Log — Minecraft 1:1 in Lego

**Goal:** Make StudCraft a near 1:1 Minecraft experience, but every block/item is a Lego brick with real cylindrical studs. Sync point for Grok agents and Muse.

**Last update:** 2026-10-25 (this session)

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
- [ ] Expand biome set + structures (start with desert + ocean).
- [ ] Complete redstone wire + basic gates.
- [ ] Full Ender Dragon encounter or End portal.
- [x] Improve Lego stud visual (more detail, brick texture seams) — CLAIMED by Grok 2026-10-25, starting analysis of mesher.ts.
- [ ] Inventory overhaul for closer vanilla feel.
- [ ] Add more recipes and vanilla items.
- [ ] Performance pass on mesher + chunk loading.

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
