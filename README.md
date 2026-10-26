# Studcraft

A brick survival world. Blocks wear real cylindrical studs. The land is infinite and seeded: the same seed rebuilds the same hills, ores, cellars, and hamlets.

## Play

```bash
npm install
npm run dev
```

Open the local dev server. **Play** → pick a mode, type a seed or roll one, **Create world**. Words and numbers both work. Worlds save in this browser; **Continue** on the title screen reopens the last one.

- Settings → Graphics: quality preset, render distance, field of view, and **Upscaling** (Auto / Native / Quality / Balanced / Perf.) — the 3D view renders at a lower resolution and an FSR 1-style pass (EASU + RCAS) rebuilds sharp edges. Phones default to 67 %.
- Walk and the world keeps generating. Far chunks unload.
- Hamlets, ruins, camps, mines, wrecks, shrines, and outposts are stamped from the seed. Their crates are stocked the first time you open them. Traders appear when you get close.
- **E** opens the bin. **Skills**, **Quests**, and **Ranks** are tabs. **Q** cycles spells while you hold a tome.
- Worlds save in the browser. Copy the seed from the pause menu.
- Phones: left thumb walks (floating stick), drag the right side to look, hold the pick to mine/attack, the hand to place, the arrow to jump.

Baseplate is a flat creative pad, not the infinite terrain.