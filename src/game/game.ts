import * as THREE from "three";
import { ATLAS_COLS, ATLAS_ROWS, BLOCKS, CREATIVE_BAR, ID, TECHNIC, def, faceTile, stairsVariant, type BlockDef } from "./blocks";
import { TechWorld, ORIENTS, bbox as techBbox, spec as techSpec, type Part as TechPart, type Plan as TechPlan, type Target as TechTarget } from "./technic";
import { buildTechnicGeometry } from "./technicGeo";
import { createAudio } from "./audio";
import { STUD_H, STUD_OFFSETS, STUD_R, buildChunk, type Surface } from "./mesher";
import * as FS from "./fireState";
import * as TS from "./tuftState";
import * as CH from "./chipState";
import { NEIGHBORS, RECIPES, SMELT, fuelTime, matchGrid } from "./recipes";
import { DISCOVER, MOB_XP, ORE_HEAR, ORE_XP, nextPerk, rankTitle, xpNeed } from "./ranks";
import { manaMaxFor, skillById, spellsFor } from "./skills";
import { QUESTS, CHAINS, chainStepOf, questActive, traderOf, tradeLevelFor, TIER_NAMES, TIER_XP, type TraderRole } from "./quests";
import { MpClient } from "./mp";
import { clearSave, deleteWorld, hasSave, listWorlds, loadLatest, loadSettings, loadWorld, writeSettings, writeWorld, type SaveV1, type WorldSlot } from "./save";
import { buildAtlas } from "./textures";
import { CS, HEIGHT, SEA, World, decorate, folkLayout, inNether, penSheep, paintEndCrystals, END_PILLARS, type Decor, type FolkSpot } from "./world";
import { debrisAt } from "./debris";
import { stockChest } from "./loot";
import { mayYield, spillSlots } from "./yields";
import { Upscaler, upscaleScale } from "./upscale";
import { BTN, PadEdges, activePad, padBusy, padLabel, rumble, stick } from "./gamepad";
import { dsApply, dsRelease, dsRequest, dsState, dsTryReconnect, type TriggerFx } from "./dualsense";
import { parseSeed, hash3 } from "./noise";
import { MobBatchRenderer } from "./mobBatch";
import { batteryAt, remoteChAt, setRemoteChannel, springsJustSpent, stepMech, toggleValve, windSpring } from "./mechLink";

export type Phase = "title" | "play" | "pause" | "inventory" | "dead";
export type EnterKind = "play" | "survival" | "flat" | "continue";

export type Hud = {
  fps: number;
  hotbar: { id: number; count: number }[];
  slot: number;
  offhand: number;
  health: number;
  hunger: number;
  xp: number;
  xpNeed: number;
  level: number;
  rank: string;
  nextPerk: string;
  found: number[];
  oxygen: number;
  rain: boolean;
  weather: string;
  boss: string;
  bossHp: number;
  armor: number[];
  grid: number[];
  cursor: number;
  panel: "bag" | "bench" | "furnace" | "chest" | "enchant" | "anvil" | "brew" | "trade" | "beacon";
  craftOut: { id: number; n: number } | null;
  furnace: { in: number; inN: number; fuel: number; fuelN: number; out: number; outN: number; cook: number };
  chest: { id: number; n: number }[];
  compass: number;
  realm: string;
  effect: string;
  heldEnch: string;
  /** Item 13: pending enchanting-table offers (choose 1 of up to 3), or null. */
  enchOffers: { tier: number; offers: { key: string; name: string; label: string; to: number }[] } | null;
  creative: boolean;
  flying: boolean;
  hammer: boolean;
  x: number;
  y: number;
  z: number;
  biome: string;
  timeLabel: string;
  timeClock: string;
  timeTicks: number;
  timeProgress: number;
  dayCount: number;
  mine: number;
  targetName: string;
  signEdit: { x: number; y: number; z: number; text: string } | null;
  seed: number;
  seedText: string;
  flash: number;
  eyeWater: boolean;
  message: string;
  locked: boolean;
  hidden: boolean;
  inv: Record<number, number>;
  readyChunks: number;
  flat: boolean;
  trader: string;
  traderBlurb: string;
  beaconLevel: number;
  beaconBuff: string;
  bookshelves: number;
  offers: { pay: number; pn: number; out: number; on: number; payName: string; outName: string; tier: number; locked: boolean; stock: number }[];
  reputation: number;
  repWord: string;
  traderLevel: string;
  traderNext: string;
  netStatus: string;
  quests: { id: string; name: string; detail: string; n: number; need: number; done: boolean; ready: boolean; reward: string; chain?: string; chainName?: string; from?: string; step?: number; steps?: number; locked?: boolean }[];
  questAlert: string;
  questTrack: string;
  won: boolean;
  skills: string[];
  skillPoints: number;
  mana: number;
  manaMax: number;
  spell: string;
  spellsOn: boolean;
  /** In-game text prompt (naming a mob, joining a room). */
  ask: { title: string; hint: string; value: string } | null;
  /** 0..1 seconds-since-hit flash for damage direction vignette. */
  hurtDir: number;
  /** Upscaler status line for the settings screen, e.g. "1280×720 → 2560×1440". */
  renderRes: string;
  /** World is generating around the spawn — show the loading veil. */
  loading: number;
  version: string;
  /** Set when the frame loop keeps failing: the UI shows a crash screen. */
  fatal: string;
  /** Connected controller name ("" = none) and whether it is the input in use. */
  pad: string;
  padActive: boolean;
};

export type TouchState = {
  moveX: number;
  moveY: number;
  jump: boolean;
  mine: boolean;
  place: boolean;
  /** Momentary pulse from the touch "tourner" button: cycles the Technic placement variant. Consumed (reset to false) by the game loop. */
  spin: boolean;
};

export type Quality = "auto" | "high" | "balanced" | "performance";
export type Upscale = "auto" | "native" | "quality" | "balanced" | "performance";

export type GameApi = {
  canvas: HTMLCanvasElement;
  hud: Hud;
  touch: TouchState;
  settings: {
    sens: number;
    radius: number;
    sound: boolean;
    studs: boolean;
    realistic: boolean;
    quality: Quality;
    third: boolean;
    upscale: Upscale;
    sharpness: number;
    fov: number;
    showFps: boolean;
    music: number;
    sfx: number;
    haptics: boolean;
    invertY: boolean;
    deadL: number;
    deadR: number;
    adaptive: boolean;
    mods: { hard: boolean; generous: boolean; peaceful: boolean; spells: boolean };
  };
  phase: Phase;
  hasSave: boolean;
  enter: (kind: EnterKind, worldId?: string) => void;
  resume: () => void;
  pauseGame: () => void;
  setQuality: (q: Quality) => void;
  quit: () => void;
  respawn: () => void;
  toggleInventory: () => void;
  setSlot: (i: number) => void;
  clearSlot: (i: number) => void;
  swapSlots: (a: number, b: number) => void;
  assign: (id: number) => void;
  hold: (id: number) => void;
  shiftStack: (id: number) => void;
  gridTap: (i: number) => void;
  craftTake: () => void;
  craft: (id: string, times?: number) => void;
  fillGrid: (recipeId: string) => void;
  clearGrid: () => void;
  armorTap: (i: number) => void;
  furnaceTap: (part: number) => void;
  chestTap: (i: number) => void;
  chestStore: (id: number) => void;
  furnaceQuick: (id: number) => void;
  enchant: (tier?: number) => void;
  enchantOffer: (tier?: number) => void;
  enchantPick: (i: number) => void;
  enchantCancel: () => void;
  combine: () => void;
  disenchant: () => void;
  setSignText: (t: string) => void;
  cancelSignEdit: () => void;
  mend: () => void;
  temper: () => void;
  brew: (kind: string) => void;
  beacon: (buff: string) => void;
  trade: (i: number) => void;
  hostOnline: () => void;
  joinOnline: () => void;
  leaveOnline: () => void;
  claim: (id: string) => void;
  unlock: (id: string) => void;
  setMod: (key: "hard" | "generous" | "peaceful" | "spells", on: boolean) => void;
  setSeed: (text: string) => void;
  deleteSlot: (id: string) => void;
  copySeed: () => void;
  readonly slots: WorldSlot[];
  press: (id: number) => void;
  setSens: (n: number) => void;
  setRadius: (n: number) => void;
  setSound: (on: boolean) => void;
  setStuds: (on: boolean) => void;
  setRealistic: (on: boolean) => void;
  setThird: (on: boolean) => void;
  setUpscale: (u: Upscale) => void;
  setSharpness: (n: number) => void;
  setFov: (n: number) => void;
  setShowFps: (on: boolean) => void;
  setMusic: (n: number) => void;
  setSfx: (n: number) => void;
  setHaptics: (on: boolean) => void;
  setInvertY: (on: boolean) => void;
  setDead: (side: "left" | "right", v: number) => void;
  /** DualSense adaptive triggers (WebHID). Enabling triggers the browser's
   *  device picker — call from a click. State via dsState(). */
  setAdaptive: (on: boolean) => void;
  dsState: () => "unavailable" | "off" | "ready" | "connected";
  /** Resolve the in-game text prompt (replaces window.prompt). null = cancelled. */
  answer: (text: string | null) => void;
  /** Short UI feedback sound for menus. */
  uiSound: (kind: "hover" | "click" | "open" | "close") => void;
  deleteSave: () => void;
  subscribe: (fn: () => void) => () => void;
  destroy: () => void;
};

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getPos: () => { x: number; y: number; z: number };
      setKeys: (codes: string[]) => void;
      setSteer?: (v: number) => void;
      setLook?: (yaw: number, pitch: number) => void;
      setDig?: (mine: boolean, place: boolean) => void;
      getBlock?: (x: number, y: number, z: number) => number;
      put?: (x: number, y: number, z: number, id: number) => boolean;
      ignite?: (x: number, y: number, z: number) => boolean;
      burn?: (x: number, y: number, z: number) => boolean;
      meltOf?: (x: number, y: number, z: number) => number;
      setMelt?: (x: number, y: number, z: number, m: number) => boolean;
      clearMobs?: (radius: number) => number;
      fireCount?: () => number;
      auditFire?: () => { melt: string[]; burn: string[] };
      hasTuft?: (x: number, y: number, z: number) => boolean;
      tearTuft?: (x: number, y: number, z: number) => void;
      getTarget?: () => string;
      spawnMob?: (kind: string, dx?: number, dz?: number) => boolean;
      getPeers?: () => { name: string; x: number; y: number; z: number }[];
      getEnch?: (id: number) => Record<string, number> | null;
      setEnch?: (id: number, key: string, lvl: number) => boolean;
      getInv?: (id: number) => number;
      setOffhand?: (id: number) => boolean;
      api?: (name: string) => boolean;
      getShots?: () => number;
      getRockets?: () => number;
      getMusic?: () => string;
      getRaid?: () => string;
      forceRaid?: () => boolean;
      getLandmark?: () => string;
      scanLandmarks?: () => string[];
      getWx?: () => string;
      setWx?: (s: string) => boolean;
      setBlock?: (x: number, y: number, z: number, id: number) => boolean;
      getStations?: () => string;
      setStation?: (kind: string, x: number, y: number, z: number, val: string) => boolean;
      getVillage?: () => string;
      setRep?: (n: number) => boolean;
      getRank?: () => number;
      setRank?: (n: number) => boolean;
      tradeAt?: (i: number) => boolean;
      restockNow?: () => boolean;
      getMobNames?: () => string[];
      getArmor?: () => number[];
      give?: (id: number, n: number) => boolean;
      setInv?: (id: number, n: number) => boolean;
      mpConnect?: (url: string, room: string, name: string) => boolean;
      getMobs?: () => string[];
      mobAudit?: () => Record<string, { h: number; minY: number; w: number; d: number }>;
      getQuests?: () => { id: string; chain?: string; step: number; steps: number; n: number; done: boolean; active: boolean }[];
      questAudit?: () => Record<string, boolean>;
      getBoss?: () => { kind: string; hp: number; maxHp: number; shield: boolean; spawnT: number; phaseN: number; breathZones: number } | null;
      hitMob?: (kind: string, dmg: number) => boolean;
      getFx?: () => { booms: number; flames: number; smoke: number };
      boom?: (dx: number, dz: number) => void;
      breakAt?: (x: number, y: number, z: number) => number;
      toppleCount?: () => number;
      dropList?: () => { id: number; n: number }[];
      phaseNow?: () => string;
      pauseGame?: () => void;
      toggleInv?: () => void;
      getHamlet?: () => { x: number; y: number; z: number } | null;
      getChunks?: () => number;
      /** QA: stop/restart the frame loop so a capture sees a still frame. */
      hold?: (on: boolean) => void;
      getRes?: () => string;
      getMobFx?: () => { kind: string; hp: number; hurt: number; bar: boolean; amp: number; x: number; y: number; z: number; cd?: number; cool?: number }[];
      getCorpses?: () => number;
      getMobCount?: () => number;
      hurtMe?: (n: number) => boolean;
      setHeld?: (id: number) => boolean;
      setSwing?: (v: number) => boolean;
      setVm?: (v: Record<string, number>) => boolean;
      setHeldPose?: (v: Record<string, number>) => boolean;
      setMcHeld?: (v: Record<string, number>) => boolean;
      setPos?: (x: number, y: number, z: number) => boolean;
      placeBrickAt?: (id: number, sx: number, sy: number, sz: number) => boolean;
      getBricks?: () => [number, number, number, number][];
      placeTechAt?: (id: number, o: number, qx: number, qy: number, qz: number) => boolean;
      getTechnic?: () => [number, number, number, number, number, number][];
      stepTechnic?: (dt: number) => { parts: number; jammed: boolean; omegas: Record<string, number>; angles: Record<string, number> };
      spinTech?: () => number;
      getMineState?: () => { mine: number; time: number; key: string; target: string };
      getIntegrity?: () => { total: number; supported: number; stressed: string[]; falling: number; stress: Record<string, number>; sag: Record<string, number> };
      getBrickMeshY?: (sx: number, sy: number, sz: number) => number | null;
      stepBricks?: (dt: number) => { total: number; supported: number; stressed: string[]; falling: number; stress: Record<string, number> };
      weldAt?: (sx1: number, sy1: number, sz1: number, sx2: number, sy2: number, sz2: number) => boolean;
      getWelds?: () => { count: number; pairs: string[]; welded: string[] };
      plasticYieldOf?: (id: number) => number;
      stressMaxOf?: (id: number) => number;
      quenchAt?: (x: number, y: number, z: number) => boolean;
      smeltOf?: (id: number) => number;
      stageFurnace?: (x: number, y: number, z: number, inId: number, inN: number, fuelId: number, fuelN: number) => { in: number; inN: number; fuel: number; fuelN: number; out: number; outN: number; cook: number; burn: number };
      getFurnace?: (x: number, y: number, z: number) => { in: number; inN: number; fuel: number; fuelN: number; out: number; outN: number; cook: number; burn: number } | null;
      stepFurnace?: (dt: number) => boolean;
      craftOf?: (recipeId: string) => boolean;
      defOf?: (id: number) => { name: string; tool: string; tier: number; maxUse: number } | null;
    };
  }
}

export const GAME_VERSION = "4.0";

/** Primary input is a finger: no fine pointer at all, or a coarse primary pointer. */
export function isTouchDevice() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(pointer: coarse)").matches || !window.matchMedia("(any-pointer: fine)").matches;
}

const HW = 0.28;
const BODY = 1.7;
const EYE = 1.62;
const EYE_SNEAK = 1.42;

export function mount(canvas: HTMLCanvasElement): GameApi {
  const audio = createAudio();
  const narrow = window.innerWidth < 800;
  const savedSettings = loadSettings();
  const settings = {
    sens: savedSettings?.sens ?? 1,
    radius: savedSettings?.radius ?? (narrow ? 6 : 8),
    sound: savedSettings?.sound ?? true,
    studs: savedSettings?.studs ?? true,
    realistic: savedSettings?.realistic ?? true,
    quality: (savedSettings?.quality as Quality | undefined) ?? "auto",
    third: savedSettings?.third ?? false,
    upscale: (savedSettings?.upscale as Upscale | undefined) ?? "auto",
    sharpness: savedSettings?.sharpness ?? 0.5,
    fov: savedSettings?.fov ?? 72,
    showFps: savedSettings?.showFps ?? false,
    music: savedSettings?.music ?? 0.7,
    sfx: savedSettings?.sfx ?? 0.9,
    haptics: savedSettings?.haptics ?? true,
    invertY: savedSettings?.invertY ?? false,
    deadL: savedSettings?.deadL ?? 0.16,
    deadR: savedSettings?.deadR ?? 0.14,
    adaptive: savedSettings?.adaptive ?? false,
    mods: {
      hard: savedSettings?.mods?.hard ?? false,
      generous: savedSettings?.mods?.generous ?? false,
      peaceful: savedSettings?.mods?.peaceful ?? false,
      spells: savedSettings?.mods?.spells ?? true,
    },
  };
  audio.setEnabled(settings.sound);
  audio.setVolume(settings.sfx);
  plasticOn = settings.realistic;

  const hud: Hud = {
    fps: 0,
    hotbar: [],
    slot: 0,
    offhand: 0,
    health: 20,
    hunger: 20,
    xp: 0,
    xpNeed: 10,
    level: 0,
    rank: "Bricklet",
    nextPerk: "Steady hands",
    found: [],
    oxygen: 10,
    rain: false,
    weather: "clear",
    boss: "",
    bossHp: 0,
    armor: [0, 0, 0, 0],
    grid: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    cursor: 0,
    panel: "bag",
    craftOut: null,
    furnace: { in: 0, inN: 0, fuel: 0, fuelN: 0, out: 0, outN: 0, cook: 0 },
    chest: [],
    compass: 0,
    realm: "Overworld",
    effect: "",
    heldEnch: "",
    enchOffers: null,
    creative: true,
    flying: false,
    hammer: false,
    x: 0,
    y: 0,
    z: 0,
    biome: "",
    timeLabel: "Day",
    timeClock: "06:00 AM",
    timeTicks: 0,
    timeProgress: 0.22,
    dayCount: 1,
    mine: 0,
    targetName: "",
    signEdit: null as { x: number; y: number; z: number; text: string } | null,
    seed: 0,
    seedText: "",
    flash: 0,
    eyeWater: false,
    message: "",
    locked: false,
    hidden: false,
    inv: {},
    readyChunks: 0,
    flat: false,
    trader: "",
    traderBlurb: "",
    beaconLevel: 0,
    beaconBuff: "",
    bookshelves: 0,
    reputation: 0,
    repWord: "Stranger",
    offers: [],
    traderLevel: "",
    traderNext: "",
    netStatus: "",
    quests: [],
    questAlert: "",
    questTrack: "",
    won: false,
    skills: [],
    skillPoints: 0,
    mana: 8,
    manaMax: 8,
    spell: "",
    spellsOn: true,
    ask: null,
    hurtDir: 0,
    renderRes: "",
    loading: 0,
    version: GAME_VERSION,
    fatal: "",
    pad: "",
    padActive: false,
  };
  const touch: TouchState = { moveX: 0, moveY: 0, jump: false, mine: false, place: false, spin: false };
  // ── Controller (v4.0) ───────────────────────────────────────────────────
  // Gameplay layout (Xbox name · PlayStation name):
  //   LS move · RS look · A/✕ jump · RT/R2 mine-attack · LT/L2 place-use
  //   LB/L1 · RB/R1 hotbar · X/□ inventory · Y/△ swap off-hand
  //   B/○ or R3 sneak (hold) · L3 sprint (toggle) · D-pad ←/→ hotbar
  //   D-pad ↑ third person · D-pad ↓ cycle spell · View/Share hide HUD · Menu/Options pause
  // Menus are driven by the UI layer (GameView useGamepadMenu).
  const padIn = { x: 0, y: 0, lx: 0, ly: 0, jump: false, mine: false, place: false, sneak: false, sprint: false };
  const padEdges = new PadEdges();
  let padSprint = false;
  let padWasPlay = false;
  function padTick() {
    const p = activePad();
    const name = p ? padLabel(p.id) : "";
    if (name !== hud.pad) hud.pad = name;
    if (p && padBusy(p) && !hud.padActive) {
      hud.padActive = true;
      emit();
    }
    const inPlay = phase === "play" && !hud.ask && !hud.signEdit;
    // Buttons held while a menu handed control back (A on "Resume") don't leak into play.
    if (inPlay && !padWasPlay) padEdges.blockHeld(p);
    padWasPlay = inPlay;
    const e = padEdges.update(p);
    if (!p || !inPlay) {
      padIn.x = padIn.y = padIn.lx = padIn.ly = 0;
      padIn.jump = padIn.mine = padIn.place = padIn.sneak = padIn.sprint = false;
      padSprint = false;
      return;
    }
    // v4.18: per-stick dead zones, adjustable in Settings (Philippe).
    const mv = stick(p.axes[0] ?? 0, p.axes[1] ?? 0, settings.deadL, 1);
    const lk = stick(p.axes[2] ?? 0, p.axes[3] ?? 0, settings.deadR, 1.6);
    padIn.x = mv.x;
    padIn.y = -mv.y;
    padIn.lx = lk.x;
    padIn.ly = lk.y;
    padIn.jump = e.down(BTN.A);
    padIn.mine = e.down(BTN.RT);
    padIn.place = e.down(BTN.LT);
    padIn.sneak = e.down(BTN.B) || e.down(BTN.R3);
    if (e.pressed(BTN.L3)) padSprint = !padSprint;
    if (mv.m < 0.2) padSprint = false; // like a stick-click sprint: stopping ends it
    padIn.sprint = padSprint;
    if (e.pressed(BTN.START)) {
      api.pauseGame();
      return;
    }
    if (e.pressed(BTN.X)) {
      api.toggleInventory();
      return;
    }
    if (e.pressed(BTN.Y)) keys.add("KeyF"); // poll() swaps the off-hand on KeyF
    if (e.pressed(BTN.LB) || e.pressed(BTN.LEFT)) api.setSlot(slot - 1);
    if (e.pressed(BTN.RB) || e.pressed(BTN.RIGHT)) api.setSlot(slot + 1);
    if (e.pressed(BTN.UP)) {
      settings.third = !settings.third;
      emit();
    }
    if (e.pressed(BTN.DOWN)) {
      const list = spellsFor(skills);
      if (!list.length) say("Learn Spark to cast");
      else {
        spellIx = (spellIx + 1) % list.length;
        say(list[spellIx].name);
      }
    }
    if (e.pressed(BTN.VIEW)) {
      hud.hidden = !hud.hidden;
      emit();
    }
  }
  function padRumble(strong: number, weak: number, ms: number) {
    if (settings.haptics && hud.padActive) rumble(activePad(), strong, weak, ms);
  }
  function isSneaking() {
    return keys.has("ShiftLeft") || keys.has("ShiftRight") || padIn.sneak;
  }
  function isSprinting() {
    return keys.has("ControlLeft") || keys.has("ControlRight") || padIn.sprint;
  }
  const listeners = new Set<() => void>();
  const keys = new Set<string>();
  let steerOverride = 0;
  let phase: Phase = "title";
  let hasSaveFlag = hasSave();
  let suppressUnlock = false;
  let wasLocked = false;
  function lockPointer() {
    try {
      const req = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      if (req && typeof req.catch === "function") req.catch(() => {});
    } catch {
      /* pointer lock refused (iframe, user gesture missing) — drag-to-look still works */
    }
  }
  let touchMode = isTouchDevice();
  let sessionStarted = false;
  let creative = true;
  let flat = false;
  let flying = false;
  let hammer = false;
  let health = 20;
  let hunger = 20;
  let hungerEx = 0;
  let xp = 0;
  let rankLv = 0;
  const skills = new Set<string>();
  let mana = 8;
  let spellIx = 0;
  let freePlace = false; // Tab: free placement (ignore grid snap)
  let critterAcc = 0;
  let folkAcc = 0;
  const found = new Set<number>();
  let messageFor = 2200;
  let oxygen = 10;
  let raining = false;
  let weatherIn = 50;
  // Weather director (v3.7): four states with eased parameters — the sky,
  // fog, cloud deck and rain all read wxCur, never the raw state, so the
  // weather breathes instead of snapping.
  type WxState = "clear" | "cloudy" | "rain" | "storm";
  let wx: WxState = "clear";
  const WX_DEF: Record<WxState, { cover: number; dark: number; precip: number; fog: number; wind: number; dur: [number, number] }> = {
    clear: { cover: 0.22, dark: 0, precip: 0, fog: 1, wind: 1, dur: [150, 300] },
    cloudy: { cover: 0.62, dark: 0.28, precip: 0, fog: 0.92, wind: 1.4, dur: [90, 200] },
    rain: { cover: 0.88, dark: 0.55, precip: 1, fog: 0.78, wind: 1.8, dur: [80, 160] },
    storm: { cover: 1, dark: 0.78, precip: 1, fog: 0.62, wind: 2.6, dur: [50, 110] },
  };
  const wxCur = { cover: 0.22, dark: 0, precip: 0, fog: 1, wind: 1, storm: 0 };
  function advanceWx() {
    const r = Math.random();
    if (wx === "clear") wx = "cloudy";
    else if (wx === "cloudy") wx = r < 0.45 ? "rain" : r < 0.6 ? "clear" : "cloudy";
    else if (wx === "rain") wx = r < 0.25 ? "storm" : r < 0.7 ? "cloudy" : "rain";
    else wx = r < 0.6 ? "rain" : "cloudy";
    const d = WX_DEF[wx].dur;
    weatherIn = d[0] + Math.random() * (d[1] - d[0]);
  }
  let strikeIn = 14;
  let boltT = 0;
  let golemWait = 0;
  // Illager war state: a captain's death hangs a Bad Omen on the player;
  // carrying it into a hamlet starts a three-wave raid. Victory makes the
  // player Hero of the Hamlet (cheaper trades) for a while.
  let omenT = 0;
  let mechAcc = 0;
  let heroT = 0;
  let patrolT = 200;
  let raid: { cx: number; cz: number; wave: number; phase: "rest" | "fight"; t: number; total: number; awayT: number } | null = null;
  let guardT = 0;
  let lastLmKey = "";
  let regenAcc = 0;
  let growAcc = 0;
  let lightAcc = 0;
  const armor = [0, 0, 0, 0];
  let grid = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  let cursor = 0;
  let panel: "bag" | "bench" | "furnace" | "chest" | "enchant" | "anvil" | "brew" | "trade" | "beacon" = "bag";
  let invReturn: "play" | "pause" = "play"; // where closing the inventory returns to
  let focus = { x: 0, y: 0, z: 0 };
  type Furn = {
    x: number;
    y: number;
    z: number;
    in: number;
    inN: number;
    fuel: number;
    fuelN: number;
    out: number;
    outN: number;
    cook: number;
    burn: number;
  };
  const furnaces = new Map<string, Furn>();
  const chests = new Map<string, { ids: number[]; ns: number[] }>();
  // Stations (v3.8): state the blocks themselves can't carry — a beacon's
  // chosen buff, a jukebox's disc, and the contents of broken shulker
  // boxes waiting for their next placement (FIFO, like the box itself
  // would carry them; with one box in play it is exact).
  const beaconBuffs = new Map<string, string>();
  const jukeDiscs = new Map<string, number>();
  let shulkerQueue: { ids: number[]; ns: number[] }[] = [];
  const beamMeshes = new Map<string, THREE.Mesh>();
  let stationAcc = 0;
  const pistonHot = new Set<string>();
  const noteHot = new Set<string>();
  const dispenserHot = new Set<string>();
  // Redstone state: stored signal level (0-15) per component cell, facing +
  // delay for repeaters/comparators, and each repeater's latched output.
  const power = new Map<string, number>();
  const comps = new Map<string, { dir: number; delay: number }>();
  const signs = new Map<string, string>();
  // Real enchantments, per item def: { sharpness: 2, unbreaking: 1, ... }.
  const ench = new Map<number, Record<string, number>>();

  type EnchDef = { key: string; name: string; max: number; for: (d: ReturnType<typeof def>) => boolean };
  const ENCHANTS: EnchDef[] = [
    { key: "sharpness", name: "Sharpness", max: 5, for: (d) => d.tool === "sword" || d.tool === "axe" || d.id === ID.Trident },
    { key: "smite", name: "Smite", max: 5, for: (d) => d.tool === "sword" || d.tool === "axe" || d.id === ID.Trident },
    { key: "bane", name: "Bane of Spiders", max: 5, for: (d) => d.tool === "sword" || d.tool === "axe" },
    { key: "fire", name: "Fire Aspect", max: 2, for: (d) => d.tool === "sword" || d.id === ID.Trident },
    { key: "knockback", name: "Knockback", max: 2, for: (d) => d.tool === "sword" || d.id === ID.Trident },
    { key: "looting", name: "Looting", max: 3, for: (d) => d.tool === "sword" || d.id === ID.Trident },
    { key: "efficiency", name: "Efficiency", max: 5, for: (d) => d.tool === "pick" || d.tool === "axe" || d.tool === "shovel" },
    { key: "fortune", name: "Fortune", max: 3, for: (d) => d.tool === "pick" },
    { key: "silk", name: "Silk Touch", max: 1, for: (d) => d.tool === "pick" || d.tool === "axe" || d.tool === "shovel" },
    { key: "unbreaking", name: "Unbreaking", max: 3, for: (d) => d.maxUse > 0 },
    { key: "mending", name: "Mending", max: 1, for: (d) => d.maxUse > 0 },
    { key: "protection", name: "Protection", max: 4, for: (d) => d.armor > 0 },
    { key: "thorns", name: "Thorns", max: 3, for: (d) => d.armor > 0 },
    { key: "power", name: "Power", max: 5, for: (d) => d.tool === "bow" || d.id === ID.Crossbow },
    { key: "flame", name: "Flame", max: 1, for: (d) => d.tool === "bow" || d.id === ID.Crossbow },
    { key: "punch", name: "Punch", max: 2, for: (d) => d.tool === "bow" || d.id === ID.Crossbow },
    { key: "infinity", name: "Infinity", max: 1, for: (d) => d.tool === "bow" || d.id === ID.Crossbow },
    { key: "feather", name: "Feather Fall", max: 4, for: (d) => d.armorSlot === 4 },
    { key: "depth", name: "Depth Strider", max: 3, for: (d) => d.armorSlot === 4 },
    { key: "frost", name: "Frost Walker", max: 2, for: (d) => d.armorSlot === 4 },
  ];
  // Mutually exclusive pairs, the Minecraft rule.
  const ENCH_CONFLICTS: Record<string, string> = { silk: "fortune", fortune: "silk", infinity: "mending", mending: "infinity", depth: "frost", frost: "depth" };
  const ROMAN = ["", "I", "II", "III", "IV", "V"];
  function enchLvl(id: number, key: string): number {
    return ench.get(id)?.[key] ?? 0;
  }
  function enchSummary(id: number): string {
    const e = ench.get(id);
    if (!e) return "";
    return Object.entries(e)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => (ENCHANTS.find((x) => x.key === k)?.name ?? k) + (v > 1 ? " " + ROMAN[v] : ""))
      .join(", ");
  }
  // Item 13: the enchanting table's pending offers for the held piece.
  // Generated by enchantOffer (free to browse), spent by enchantPick;
  // snapshot() drops them when the held item or the panel changes.
  let enchOffersState: { itemId: number; tier: number; offers: { key: string; name: string; label: string; to: number }[] } | null = null;
  const repOut = new Map<string, boolean>();
  const repTimer = new Map<string, number>();
  const obsSeen = new Map<string, number>();
  const obsPulse = new Map<string, number>();
  let rsAcc = 0;
  let hopperAcc = 0;
  let lastDaylightLvl = -1;
  const RS_DIRS: ReadonlyArray<readonly [number, number]> = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  let slot = 0;
  let hotbar: number[] = [...CREATIVE_BAR];
  let offhand = 0;
  const inv: Record<number, number> = {};
  let message = "";
  let messageAt = 0;
  let seed = (Math.random() * 1e9) | 0;
  let seedText = String(seed);
  let worldId = "";
  let pendingSeed = seedText;
  let world = new World(seed, false);
  let spawnPoint = world.findSpawn();
  spawnPoint.y = world.clearFeet(spawnPoint.x, spawnPoint.z);
  const opening: Decor = settleTown(false);
  let sheepSpots = opening.sheep;
  let folkSpots: FolkSpot[] = opening.folk;
  let villageAt = opening.village;
  let quests: { id: string; n: number; done: boolean }[] = QUESTS.map((q) => ({ id: q.id, n: 0, done: false }));
  let traderRole: TraderRole = "grocer";
  let tradeXp: Record<string, number> = {};
  // Villager depth (v3.9): per-hamlet trade stock (keyed "hx,hz:role") and
  // reputation (keyed "hx,hz"). Stock depletes as you trade and restocks
  // twice a day; reputation moves prices, and at its worst the golems and
  // the traders themselves turn on you.
  let tradeStock: Record<string, number[]> = {};
  let reputation: Record<string, number> = {};
  let traderKeySet: string | null = null;
  let prevWorldTime = 0;
  function repKeyFor(x: number, z: number): string {
    if (villageAt && Math.hypot(x - villageAt.x, z - villageAt.z) < 100) return villageAt.x + "," + villageAt.z;
    return Math.round(x) + "," + Math.round(z);
  }
  function curTraderKey(): string {
    return traderKeySet ?? repKeyFor(player.x, player.z);
  }
  function repAtKey(key: string): number {
    return reputation[key] ?? 0;
  }
  function addRep(key: string, n: number) {
    const next = Math.max(-100, Math.min(60, (reputation[key] ?? 0) + n));
    if (next !== (reputation[key] ?? 0)) {
      reputation[key] = next;
      saveDirty = true;
    }
  }
  function repWord(rep: number): string {
    return rep >= 20 ? "Liked" : rep >= 1 ? "Known" : rep === 0 ? "Stranger" : rep >= -9 ? "Wary" : rep >= -29 ? "Suspect" : rep >= -49 ? "Disliked" : "Outcast";
  }
  function priceFor(base: number, key: string): number {
    let pn = base;
    const rep = reputation[key] ?? 0;
    if (rep >= 20) pn -= 1;
    if (rep <= -10) pn += 1;
    if (rep <= -30) pn += 1;
    if (heroT > 0) pn -= 1;
    return Math.max(1, pn);
  }
  function stockMaxFor(offer: { tier?: number; stock?: number }): number {
    return offer.stock ?? ((offer.tier ?? 1) >= 3 ? 3 : (offer.tier ?? 1) === 2 ? 5 : 8);
  }
  function stockFor(key: string): number[] {
    const offers = traderOf(key.split(":").pop() as TraderRole).offers;
    let s = tradeStock[key];
    if (!s || s.length !== offers.length) {
      const prev = s;
      s = offers.map((o, i) => prev?.[i] ?? stockMaxFor(o));
      tradeStock[key] = s;
    }
    return s;
  }
  function restockTrades() {
    for (const key of Object.keys(tradeStock)) {
      const offers = traderOf(key.split(":").pop() as TraderRole).offers;
      tradeStock[key] = offers.map((o, i) => Math.max(tradeStock[key][i] ?? 0, stockMaxFor(o)));
    }
    // Time heals: reputations drift one point toward neutral at each restock.
    for (const key of Object.keys(reputation)) {
      if (reputation[key] > 0) reputation[key] -= 1;
      else if (reputation[key] < 0) reputation[key] += 1;
    }
    saveDirty = true;
  }

  const player = {
    x: spawnPoint.x,
    y: spawnPoint.y,
    z: spawnPoint.z,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0,
    pitch: -0.2,
    grounded: false,
    coyote: 0,
  };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrow ? 1.75 : 2));
  renderer.setClearColor(0x8ec8f5, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = settings.realistic ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
  renderer.toneMappingExposure = settings.realistic ? 1.02 : 1;
  renderer.shadowMap.enabled = settings.realistic;
  renderer.shadowMap.type = THREE.PCFShadowMap; // r186 removed PCFSoft (it fell back with a warning)

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x8ec8f5, 28, 72);
  const camera = new THREE.PerspectiveCamera(72, 1, 0.08, 420);
  camera.rotation.order = "YXZ";
  scene.add(camera);

  const hemi = new THREE.HemisphereLight(0xd8eeff, 0x6b8450, 0.56);
  const ambient = new THREE.AmbientLight(0xfffaf0, 0.20);
  const sun = new THREE.DirectionalLight(0xfff5e2, 1.35);
  sun.position.set(40, 80, 20);
  sun.castShadow = settings.realistic;
  sun.shadow.mapSize.set(narrow ? 1024 : 2048, narrow ? 1024 : 2048);
  sun.shadow.bias = -0.00018;
  sun.shadow.normalBias = 0.016;
  const shadowCam = sun.shadow.camera;
  shadowCam.left = -32;
  shadowCam.right = 32;
  shadowCam.top = 32;
  shadowCam.bottom = -32;
  shadowCam.near = 0.5;
  shadowCam.far = 140;
  scene.add(hemi, ambient, sun, sun.target);
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(7, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe38a }),
  );
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(5, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xe7eef8 }),
  );
  scene.add(sunMesh, moonMesh);
  const skyU = {
    topColor: { value: new THREE.Color(0x2a6ad4) },
    horizonColor: { value: new THREE.Color(0x8ec8f5) },
    sunDirection: { value: new THREE.Vector3(0, 1, 0.2) },
    sunColor: { value: new THREE.Color(0xffe9b8) },
    uGlow: { value: 1 },
  };
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(380, 32, 15),
    new THREE.ShaderMaterial({
      uniforms: skyU,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vDir;
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 sunDirection;
        uniform vec3 sunColor;
        uniform float uGlow;
        void main() {
          vec3 d = normalize(vDir);
          float h = clamp(d.y, -1.0, 1.0);
          vec3 col = mix(horizonColor, topColor, pow(max(h, 0.0), 0.55));
          if (h < 0.0) col = mix(horizonColor, horizonColor * 0.55, clamp(-h * 3.0, 0.0, 1.0));
          float s = max(dot(d, normalize(sunDirection)), 0.0);
          col += sunColor * (pow(s, 320.0) * 1.15 + pow(s, 10.0) * 0.14) * uGlow;
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  skyDome.renderOrder = -1;
  skyDome.frustumCulled = false;
  scene.add(skyDome);
  const lamps: THREE.PointLight[] = [];
  for (let i = 0; i < 6; i++) {
    const lamp = new THREE.PointLight(0xffb85c, 0, 14, 1.45);
    scene.add(lamp);
    lamps.push(lamp);
  }

  const atlases = buildAtlas();
  const atlas = atlases.color;
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  atlas.anisotropy = aniso;
  atlases.rough.anisotropy = Math.min(4, aniso);
  atlases.normal.anisotropy = Math.min(4, aniso);
  // Build a Studio Macro HDRI + Sky-Dome PMREM environment with two crisp studio softbox
  // windows and warm table bounce so ABS plastic studs and chamfers catch realistic macro strip reflections.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envDomeGeo = new THREE.SphereGeometry(20, 24, 16);
  const envDomeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: `
      varying vec3 vP;
      void main() {
        vP = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vP;
      void main() {
        float y = vP.y;
        vec3 zenith = vec3(0.56, 0.78, 0.98);
        vec3 horizon = vec3(0.92, 0.91, 0.88);
        vec3 ground = vec3(0.38, 0.42, 0.34);
        vec3 c = y >= 0.0 ? mix(horizon, zenith, pow(y, 0.6)) : mix(horizon, ground, pow(min(1.0, -y * 1.6), 0.7));
        // Primary key studio softbox window + secondary fill softbox strip
        float sbKey = smoothstep(0.76, 0.90, dot(vP, normalize(vec3(0.45, 0.78, 0.35))));
        float sbFill = smoothstep(0.80, 0.93, dot(vP, normalize(vec3(-0.62, 0.60, -0.50))));
        c += vec3(1.0, 0.97, 0.90) * sbKey * 0.85 + vec3(0.88, 0.94, 1.0) * sbFill * 0.45;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  envScene.add(new THREE.Mesh(envDomeGeo, envDomeMat));
  const envTex = pmrem.fromScene(envScene, 0.045).texture;
  envDomeGeo.dispose();
  envDomeMat.dispose();
  pmrem.dispose();
  scene.environment = settings.realistic ? envTex : null;
  scene.environmentIntensity = settings.realistic ? 0.52 : 1;

  const opaqueLam = new THREE.MeshLambertMaterial({ map: atlas });
  const glassLam = new THREE.MeshLambertMaterial({
    map: atlas,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const waterLam = new THREE.MeshLambertMaterial({
    map: atlas,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const plantLam = new THREE.MeshLambertMaterial({
    map: atlas,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
  });
  const opaqueStd = new THREE.MeshStandardMaterial({
    map: atlas,
    roughness: 0.92,
    metalness: 0.0,
    roughnessMap: atlases.rough,
    normalMap: atlases.normal,
    normalScale: new THREE.Vector2(0.58, 0.58),
    emissiveMap: atlases.glow,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 1.25,
    vertexColors: true,
    envMapIntensity: 0.62,
  });
  const glassStd = new THREE.MeshStandardMaterial({
    map: atlas,
    roughness: 0.09,
    metalness: 0,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    envMapIntensity: 0.85,
    vertexColors: true,
  });
  const waterTime = { value: 0 };
  const waterStd = new THREE.MeshStandardMaterial({
    map: atlas,
    roughness: 0.07,
    metalness: 0,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    side: THREE.DoubleSide,
    envMapIntensity: 0.95,
    vertexColors: true,
  });
  waterStd.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vRippleUv;\nvarying vec3 vWaterWPos;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\nvRippleUv = uv;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWaterWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nvarying vec2 vRippleUv;\nvarying vec3 vWaterWPos;")
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        vec2 wuv = vRippleUv * 6.0;
        float r1 = sin(wuv.x * 3.2 + uTime * 1.4) * cos(wuv.y * 2.6 - uTime * 0.9);
        float r2 = sin((wuv.x + wuv.y) * 2.1 - uTime * 0.6);
        normal = normalize(normal + vec3(r1, r2, 0.0) * 0.16);`,
      )
      .replace(
        "#include <opaque_fragment>",
        `{
          vec3 wV = normalize(vViewPosition);
          float ndv = clamp(dot(normalize(normal), wV), 0.0, 1.0);
          // Trans-Clear / Trans-Light-Blue ABS IOR 1.54 Fresnel + internal underside anti-stud tube refraction shadow
          float fres = 0.0452 + (1.0 - 0.0452) * pow(1.0 - ndv, 4.2);
          vec2 cellUv = fract(vWaterWPos.xz - wV.xz * 0.18);
          float tubeD = abs(length(cellUv - 0.5) - 0.22);
          float tubeShadow = 1.0 - smoothstep(0.0, 0.045, tubeD) * 0.22;
          outgoingLight = outgoingLight * tubeShadow + vec3(0.85, 0.95, 1.0) * fres * 0.32;
          diffuseColor.a = mix(0.42, 0.88, fres);
        }
        #include <opaque_fragment>`,
      );
  };
  waterStd.customProgramCacheKey = () => "studcraft-water-v2";
  const plantStd = new THREE.MeshStandardMaterial({
    map: atlas,
    roughness: 0.88,
    metalness: 0,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    emissiveMap: atlases.glow,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 1.15,
    vertexColors: true,
    envMapIntensity: 0.25,
  });
  // SRN world shading on the realistic set (see sirenizeWorld below).
  sirenizeWorld(opaqueStd, 1, 1, "srn-world-opaque-3");
  sirenizeWorld(plantStd, 0.35, 0.4, "srn-world-plant-3");
  sirenizeWorld(glassStd, 0.2, 0.2, "srn-world-glass-3");
  let opaqueMat: THREE.Material = settings.realistic ? opaqueStd : opaqueLam;
  let glassMat: THREE.Material = settings.realistic ? glassStd : glassLam;
  let waterMat: THREE.Material = settings.realistic ? waterStd : waterLam;
  let plantMat: THREE.Material = settings.realistic ? plantStd : plantLam;
  // v4.16.1 realism pass 2 (Claude): molten plastic gets its OWN material —
  // no SRN sub-brick seams, no stud/normal/roughness atlas maps (the mesher
  // samples one texel of the source brick's colour), low roughness + strong
  // env reflection so the smooth-normal liquid geometry catches real wet
  // highlights. Only drawn where something is melting (empty surface = no
  // mesh = zero cost).
  // pass 4: physically based molten plastic — a satin plastic body under a
  // thin wet CLEARCOAT (sharp highlight + Fresnel sky reflection on top of
  // the colour), the way real hot ABS reads. Only molten fragments pay it.
  // v4.17: no texture — the molten field carries the brick's own colour per
  // vertex (blended across fused bricks, charred), smooth as real liquid.
  const moltenStd = new THREE.MeshPhysicalMaterial({
    roughness: 0.42,
    metalness: 0.0,
    // Char must read BLACK (Philippe's law). Measured on the rig: a black
    // dielectric seen at a grazing angle mirrors the sky (Fresnel) and the
    // charcoal pools read grey (~90/255). The world env comes from
    // scene.environment, so envMapIntensity has no effect here — the lever
    // is the base specular strength (F0) and a thinner clearcoat.
    specularIntensity: 0.35,
    clearcoat: 0.25,
    clearcoatRoughness: 0.2,
    vertexColors: true,
  });
  const moltenLam = new THREE.MeshLambertMaterial({ vertexColors: true });
  // v4.17 molten shader: the mesher writes, per vertex, brick A's colour
  // (color), brick B's colour + the signed distance dB − dA (tangent) and the
  // char amount (uv.x). The border between two fused bricks is drawn here,
  // per pixel and anti-aliased (sharp, never stair-stepped by the lattice),
  // then the burnt-plastic ramp: colour -> scorched brown -> glossy black.
  const moltenize = (mat: THREE.Material, key: string) => {
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\n#ifndef USE_TANGENT\nattribute vec4 tangent;\n#endif\nvarying vec4 vMolB;\nvarying vec2 vMolU;\nvarying vec3 vMolW;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvMolB = tangent;\nvMolU = uv;\nvMolW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
varying vec4 vMolB;
varying vec2 vMolU;
varying vec3 vMolW;
vec3 molChar(vec3 base, float c) {
  float k = clamp(c, 0.0, 1.0);
  float brown = max(0.0, 1.0 - abs(k - 0.45) / 0.35) * 0.65;
  float blk = k * k * (3.0 - 2.0 * k);
  vec3 col = base * (1.0 - brown) + base * vec3(0.42, 0.26, 0.15) * 1.6 * brown;
  return col * (1.0 - k * 0.3) * (1.0 - blk * vec3(0.94, 0.955, 0.97));
}
// SRN micro-relief of hot plastic (world space, per pixel — independent of
// the mesh resolution): irregular sag wrinkles across the faces, warped flow
// streaks, and sparse blisters; all grow with the melt.
// hash without sine (stable at large world coordinates — sin-based hashes
// lose precision there and turn into pixel snow): lattice wrapped mod 289
float molHash(vec3 p) {
  p = mod(p, 289.0);
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
float molNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(molHash(i), molHash(i + vec3(1, 0, 0)), f.x), mix(molHash(i + vec3(0, 1, 0)), molHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(molHash(i + vec3(0, 0, 1)), molHash(i + vec3(1, 0, 1)), f.x), mix(molHash(i + vec3(0, 1, 1)), molHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float molFolds(vec3 w) {
  float n = molNoise(w * 2.7);
  float a = molNoise(w * 4.1 + 17.0);
  return sin(w.y * (24.0 + 16.0 * n) + 7.0 * a) * smoothstep(0.25, 0.75, molNoise(w * 1.9 + 5.0));
}
float molFlow(vec3 w) { return sin((w.x * 0.8 + w.z * 0.6) * 31.0 + 5.0 * molNoise(w * vec3(3.0, 1.2, 3.0))) * molNoise(w * 4.0 + 3.0); }
float molPits(vec3 w) { return smoothstep(0.68, 0.88, molNoise(w * 7.0)); }
// band-limited (SRN Nyquist rule): each term fades out before its features
// get smaller than ~3 pixels, so distance or a low render scale never turns
// the relief into pixel snow. px = world size of one pixel here.
float molBand(float wavelength, float px) { return 1.0 - smoothstep(wavelength * 0.12, wavelength * 0.33, px); }`,
        )
        .replace(
          "#include <color_fragment>",
          `#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
  float molS = vMolB.a;
  float molW = max(fwidth(molS), 1e-4);
  vec3 molBase = mix(vMolB.rgb, vColor.rgb, smoothstep(-molW, molW, molS));
  float molM = clamp(vMolU.x / 0.9, 0.0, 1.0);
  // the brick is still a LEGO brick while it softens: course seams (at 1/3
  // and 2/3 of its slumped height, so they droop with it) and staggered
  // vertical joints, crisp per pixel, fading out as it liquefies
  vec3 molWN = normalize((vec4(vNormal, 0.0) * viewMatrix).xyz);
  float molSeamA = (1.0 - smoothstep(0.12, 0.6, molM)) * (1.0 - smoothstep(0.55, 0.85, abs(molWN.y)));
  float molFy = vMolU.y * 3.0;
  float molLy = 1.0 - smoothstep(0.6, 1.6, abs(fract(molFy + 0.5) - 0.5) / max(fwidth(molFy), 1e-4));
  float molOff = mod(floor(molFy), 2.0) * 0.5;
  float molUx = vMolW.x * 2.0 + molOff, molUz = vMolW.z * 2.0 + molOff;
  float molJx = 1.0 - smoothstep(0.6, 1.6, abs(fract(molUx + 0.5) - 0.5) / max(fwidth(molUx), 1e-4));
  float molJz = 1.0 - smoothstep(0.6, 1.6, abs(fract(molUz + 0.5) - 0.5) / max(fwidth(molUz), 1e-4));
  // joints follow the face's dominant horizontal axis only (no diamond grid on slopes)
  float molJ = abs(molWN.z) > abs(molWN.x) ? molJx * smoothstep(0.35, 0.6, abs(molWN.z)) : molJz * smoothstep(0.35, 0.6, abs(molWN.x));
  float molSeam = molSeamA * max(molLy, molJ * step(0.02, vMolU.y) * step(vMolU.y, 0.98));
  // creases of the folds hold soot, pits are dark, char comes in speckles
  float molPx = length(fwidth(vMolW));
  float molF = molFolds(vMolW) * molBand(0.24, molPx);
  float molCrease = molM * smoothstep(0.3, 0.95, -molF) * 0.12;
  float molSpeck = smoothstep(0.35, 0.8, molM) * molPits(vMolW * 0.7 + 11.0) * 0.6 * molBand(0.2, molPx);
  float molCh = clamp(vMolU.x + molSpeck * 0.35 + molCrease * 0.6, 0.0, 1.0);
  diffuseColor.rgb *= molChar(molBase, molCh) * (1.0 - 0.42 * molSeam) * (1.0 - molCrease);
#endif`,
        )
        .replace(
          "#include <roughnessmap_fragment>",
          `#include <roughnessmap_fragment>
  // hot plastic is wetter (sharper highlights) than the cold brick, with
  // streaks of gloss along the flow
  roughnessFactor *= mix(1.0, 0.55 + 0.25 * (0.5 + 0.5 * molFlow(vMolW) * molBand(0.2, length(fwidth(vMolW)))), clamp(vMolU.x / 0.9, 0.0, 1.0));`,
        )
        .replace(
          "#include <normal_fragment_maps>",
          `#include <normal_fragment_maps>
  {
    // relief normals from the ANALYTIC world-space gradient of the wrinkle
    // and flow waves (the slow noise that warps them is treated as locally
    // constant): continuous per pixel — screen-space derivative bumps step
    // in 2×2 blocks and read as a checkerboard
    float molM2 = clamp(vMolU.x / 0.9, 0.0, 1.0);
    float molPx2 = length(fwidth(vMolW));
    vec3 w = vMolW;
    float kf = 24.0 + 16.0 * molNoise(w * 2.7);
    float pf = w.y * kf + 7.0 * molNoise(w * 4.1 + 17.0);
    float ef = smoothstep(0.25, 0.75, molNoise(w * 1.9 + 5.0)) * molBand(0.24, molPx2);
    vec3 g = vec3(0.0, cos(pf) * ef * 0.6, 0.0);
    float pl = (w.x * 0.8 + w.z * 0.6) * 31.0 + 5.0 * molNoise(w * vec3(3.0, 1.2, 3.0));
    float el = molNoise(w * 4.0 + 3.0) * molBand(0.2, molPx2) * 0.35;
    g += vec3(0.8, 0.0, 0.6) * cos(pl) * el;
    // slope up to ~0.6 at full melt: visible wrinkles, still a liquid surface
    vec3 gv = (viewMatrix * vec4(g * (0.2 + 0.4 * molM2) * molM2, 0.0)).xyz;
    normal = normalize(normal - (gv - dot(gv, normal) * normal));
  }`,
        );
    };
    mat.customProgramCacheKey = () => key;
  };
  moltenize(moltenStd, "molten-v417g-std");
  moltenize(moltenLam, "molten-v417g-lam");
  let moltenMat: THREE.Material = settings.realistic ? moltenStd : moltenLam;

  const chunkRoot = new THREE.Group();
  scene.add(chunkRoot);
  const meshes = new Map<string, THREE.Mesh[]>();
  const dirty = new Set<string>();
  const chunkTier = new Map<string, number>();

  // LOD tiers by chunk distance from the player: 0 = full (2×2 3D studs + AO),
  // 1 = normal-mapped 2×2 studs + AO, 2 = far silhouette.
  function tierFor(d2: number) {
    // v4.12: studs (tier 0) are only readable within ~3 chunks — a 5-chunk
    // stud field was ~81 chunks × 47k triangles and 141 ms of meshing per
    // chunk. Tier 0 now covers d2<=9 (~29 chunks), tier 1 d2<=36.
    return d2 <= 9 ? 0 : d2 <= 36 ? 1 : 2;
  }

  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(280 * 3);
  for (let i = 0; i < 280; i++) {
    const th = Math.random() * Math.PI * 2;
    const ph = Math.random() * 0.7;
    const r = 200;
    starPos[i * 3] = Math.cos(th) * Math.cos(ph) * r;
    starPos[i * 3 + 1] = 30 + Math.sin(ph) * r;
    starPos[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * r;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xfff6dd, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0 }),
  );
  scene.add(stars);

  const cloudDummy = new THREE.Object3D();
  const clouds = new THREE.InstancedMesh(
    new THREE.BoxGeometry(10, 1.3, 6),
    skin(0xffffff, { transparent: true, opacity: 0.88, depthWrite: false }),
    32,
  );
  clouds.userData.keepShadow = true;
  const cloudData = Array.from({ length: 32 }, () => ({
    ox: Math.random() * 180 - 90,
    oz: Math.random() * 180 - 90,
    y: 34 + Math.random() * 10,
    s: 0.7 + Math.random() * 1.6,
  }));
  scene.add(clouds);

  // Procedural cloud deck (v3.7, Realistic mode): one shader plane, zero
  // textures — a two-layer fBm field gives soft masses with lit tops and
  // grey bellies; coverage and darkness are driven by the weather
  // director. Same law as SIREN: the detail is math, not assets.
  const deckU = {
    uDrift: { value: new THREE.Vector2(0, 0) },
    uCover: { value: 0.22 },
    uDark: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunCol: { value: new THREE.Color(0xffe9b8) },
    uDayF: { value: 1 },
    uFog: { value: new THREE.Color(0x8ec8f5) },
    uCam: { value: new THREE.Vector3() },
    uOct: { value: narrow ? 4 : 5 },
  };
  const deck = new THREE.Mesh(
    new THREE.PlaneGeometry(760, 760),
    new THREE.ShaderMaterial({
      uniforms: deckU,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        varying vec3 vWorld;
        uniform vec2 uDrift;
        uniform float uCover;
        uniform float uDark;
        uniform vec3 uSunDir;
        uniform vec3 uSunCol;
        uniform float uDayF;
        uniform vec3 uFog;
        uniform vec3 uCam;
        uniform float uOct;
        float hash21(vec2 p) {
          p = fract(p * vec2(234.34, 435.345));
          p += dot(p, p + 34.23);
          return fract(p.x * p.y);
        }
        float vnoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash21(i);
          float b = hash21(i + vec2(1.0, 0.0));
          float c = hash21(i + vec2(0.0, 1.0));
          float d = hash21(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.55;
          for (int i = 0; i < 5; i++) {
            if (float(i) >= uOct) break;
            v += a * vnoise(p);
            p = p * 2.13 + vec2(17.3, 9.1);
            a *= 0.55;
          }
          return v;
        }
        void main() {
          vec2 p = vWorld.xz * 0.006;
          float base = fbm(p + uDrift);
          float det = fbm(p * 3.7 - uDrift * 1.7);
          float n = base * 0.72 + det * 0.28;
          float t = 1.02 - uCover * 0.72;
          float alpha = smoothstep(t - 0.24, t + 0.24, n);
          if (alpha < 0.004) discard;
          float belly = fbm(p * 0.9 + 4.7 + uDrift * 0.6);
          vec3 col = mix(vec3(0.52, 0.56, 0.63), vec3(1.02), clamp(det * 1.25 - 0.08, 0.0, 1.0));
          col *= 0.82 + belly * 0.3;
          col *= 1.0 - uDark * 0.52;
          col *= 0.16 + 0.84 * uDayF;
          vec3 vd = normalize(vWorld - uCam);
          float sg = pow(max(dot(vd, normalize(uSunDir)), 0.0), 6.0);
          col += uSunCol * sg * 0.38 * uDayF * (1.0 - uDark * 0.6);
          float dist = length(vWorld - uCam);
          float fade = (1.0 - smoothstep(230.0, 370.0, dist)) * smoothstep(6.0, 26.0, dist);
          gl_FragColor = vec4(col, alpha * 0.94 * fade);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  deck.rotation.x = -Math.PI / 2;
  deck.frustumCulled = false;
  deck.renderOrder = 4;
  deck.visible = false;
  scene.add(deck);

  // Rain streaks (v3.7): recycled line segments in a box around the
  // camera — the cheapest rain that reads. Slant follows the wind.
  const RAIN_N = 700;
  const rainPos = new Float32Array(RAIN_N * 2 * 3);
  const rainOff = new Float32Array(RAIN_N * 3);
  for (let i = 0; i < RAIN_N; i++) {
    rainOff[i * 3] = Math.random() * 38 - 19;
    rainOff[i * 3 + 1] = Math.random() * 26;
    rainOff[i * 3 + 2] = Math.random() * 38 - 19;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
  const rainLines = new THREE.LineSegments(
    rainGeo,
    new THREE.LineBasicMaterial({ color: 0xaaccee, transparent: true, opacity: 0 }),
  );
  rainLines.frustumCulled = false;
  rainLines.visible = false;
  scene.add(rainLines);

  // Rain droplets (item 13 weather polish): a pooled THREE.Points spray in a
  // tighter box around the camera — the near-field particle finish the line
  // streaks lack. Recycled exactly like the streaks; the draw count follows
  // the eased precip (storm draws more), and the whole layer is invisible —
  // and skipped — when it is not raining. Streaks + droplets stay under a
  // 2000-primitive cap (700 + 900).
  const RAIN_PTS = 900;
  const rainPtPos = new Float32Array(RAIN_PTS * 3);
  const rainPtOff = new Float32Array(RAIN_PTS * 3);
  for (let i = 0; i < RAIN_PTS; i++) {
    rainPtOff[i * 3] = Math.random() * 30 - 15;
    rainPtOff[i * 3 + 1] = Math.random() * 30;
    rainPtOff[i * 3 + 2] = Math.random() * 30 - 15;
  }
  const rainPtGeo = new THREE.BufferGeometry();
  rainPtGeo.setAttribute("position", new THREE.BufferAttribute(rainPtPos, 3));
  const rainPts = new THREE.Points(
    rainPtGeo,
    new THREE.PointsMaterial({ color: 0xcfe4ff, size: 0.09, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false }),
  );
  rainPts.frustumCulled = false;
  rainPts.visible = false;
  scene.add(rainPts);
  // Live draw counts, read by the getWx QA hook.
  let rainStreaksShown = 0;
  let rainPtsShown = 0;

  const outlineMat = new THREE.LineBasicMaterial({ color: 0x1a120c });
  const highlight = new THREE.Group();
  highlight.add(
    new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02)), outlineMat),
  );
  const studOutline = new THREE.Group();
  const studOutlineGeo = new THREE.EdgesGeometry(new THREE.CylinderGeometry(STUD_R, STUD_R, STUD_H, 12));
  for (const [ox, oz] of STUD_OFFSETS) {
    const studSeg = new THREE.LineSegments(studOutlineGeo, outlineMat);
    studSeg.position.set(ox - 0.5, 0.51 + STUD_H / 2, oz - 0.5);
    studOutline.add(studSeg);
  }
  highlight.add(studOutline);
  highlight.visible = false;
  scene.add(highlight);

  // v4.14 — crumbling: a procedural crack overlay that grows over the
  // block being mined (zero texture assets: the cracks are drawn on a
  // canvas in 6 stages, and from stage 2 they follow the brick courses —
  // LEGO bricks split along their seams). Chips fly while you mine and
  // the block bursts into studded sub-bricks when it breaks.
  function makeCrackTexture(stage: number): THREE.Texture {
    const S = 256;
    const cv = document.createElement("canvas");
    cv.width = S;
    cv.height = S;
    const g = cv.getContext("2d")!;
    let seed = 1234 + stage * 777;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    g.lineCap = "round";
    const cracks = 3 + stage * 3;
    for (let c = 0; c < cracks; c++) {
      let x = S * (0.3 + rnd() * 0.4);
      let y = S * (0.3 + rnd() * 0.4);
      let ang = rnd() * Math.PI * 2;
      const steps = 4 + Math.floor(rnd() * 4) + stage * 2;
      g.strokeStyle = `rgba(22,13,8,${0.55 + stage * 0.08})`;
      g.lineWidth = Math.max(1.6, 3.2 - stage * 0.22);
      g.beginPath();
      g.moveTo(x, y);
      for (let s = 0; s < steps; s++) {
        ang += (rnd() - 0.5) * 1.15;
        const len = 9 + rnd() * 17;
        x += Math.cos(ang) * len;
        y += Math.sin(ang) * len;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    if (stage >= 2) {
      g.strokeStyle = `rgba(22,13,8,${0.38 + stage * 0.08})`;
      g.lineWidth = 2.2;
      for (const fy of [1 / 3, 2 / 3]) {
        g.beginPath();
        let x = S * 0.12;
        let y = S * fy + (rnd() - 0.5) * 8;
        g.moveTo(x, y);
        while (x < S * 0.88) {
          x += 14 + rnd() * 22;
          y += (rnd() - 0.5) * 7;
          g.lineTo(x, y);
        }
        g.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 2;
    return tex;
  }
  const crackMats: THREE.MeshBasicMaterial[] = [];
  for (let s = 0; s < 6; s++) {
    crackMats.push(
      new THREE.MeshBasicMaterial({ map: makeCrackTexture(s), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    );
  }
  const crackMesh = new THREE.Mesh(new THREE.BoxGeometry(1.006, 1.006, 1.006), crackMats[0]);
  crackMesh.visible = false;
  crackMesh.renderOrder = 3;
  scene.add(crackMesh);
  let crackStageShown = -1;
  let chipStage = -1;
  function showCrack(x: number, y: number, z: number, progress: number) {
    const stage = Math.max(0, Math.min(5, Math.floor(progress * 5.999)));
    crackMesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    if (stage !== crackStageShown) {
      crackMesh.material = crackMats[stage];
      crackStageShown = stage;
    }
    crackMesh.visible = true;
  }
  function hideCrack() {
    crackMesh.visible = false;
    crackStageShown = -1;
    chipStage = -1;
  }

  const ghostMat = skin(0xffffff, { transparent: true, opacity: 0.45, depthWrite: false });
  const ghost = new THREE.Group();
  ghost.userData.keepShadow = false;
  const ghostBody = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.98, 0.98), ghostMat);
  ghost.add(ghostBody);
  const ghostStudGeo = new THREE.CylinderGeometry(STUD_R * 0.9, STUD_R, STUD_H, 16);
  for (const [ox, oz] of STUD_OFFSETS) {
    const ghostStud = new THREE.Mesh(ghostStudGeo, ghostMat);
    ghostStud.position.set(ox - 0.5, 0.49 + STUD_H / 2, oz - 0.5);
    ghost.add(ghostStud);
  }
  ghost.visible = false;
  scene.add(ghost);
  let ghostLastId = 0;
  function updateGhostGeo(id: number) {
    if (id === ghostLastId) return;
    ghostLastId = id;
    // Clear old. Technic parts never use this block ghost: the Technic
    // layer draws its own planned-pose ghost (see the Technic section),
    // and the block ghost is force-hidden while a Technic part is held.
    while (ghost.children.length) ghost.remove(ghost.children[0]);
    ghost.add(ghostBody);
  }


  const boltMat = skin(0xe7f6ff);
  boltMat.emissive = new THREE.Color(0xd6f4ff);
  const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.16, 46, 0.16), boltMat);
  bolt.visible = false;
  bolt.userData.keepShadow = false;
  scene.add(bolt);

  const fpsSleeveMat = skin(0xe23b2f);
  const fpsSkinMat = skin(0xf3d37a);
  const viewBrick = new THREE.Group();
  viewBrick.userData.keepShadow = false;

  // Dynamic 3D LEGO Item & Multi-Part Block Builder (used by 1st-person hand, 3rd-person Minifig & world drops)
  function shiftHex(hex: number, f: number): number {
    const r = Math.min(255, Math.max(0, Math.round(((hex >> 16) & 255) * f)));
    const g = Math.min(255, Math.max(0, Math.round(((hex >> 8) & 255) * f)));
    const b = Math.min(255, Math.max(0, Math.round((hex & 255) * f)));
    return (r << 16) | (g << 8) | b;
  }

  function addStudGrid(
    parent: THREE.Group,
    w: number,
    yTop: number,
    d: number,
    nx: number,
    nz: number,
    mat: THREE.Material,
    ox = 0,
    oz = 0,
    hollow = false,
  ) {
    const sr = Number((Math.min(w / nx, d / nz) * 0.29).toFixed(4));
    const sh = Number((sr * 0.66).toFixed(4));
    const sGeo = geoCyl(Number((sr * 0.92).toFixed(4)), sh, 10, sr);
    const dimpleGeo = hollow ? geoCyl(Number((sr * 0.48).toFixed(4)), Number((sh * 0.35).toFixed(4)), 8) : null;
    const darkMat = hollow ? skin(0x181412) : null;
    for (let ix = 0; ix < nx; ix++) {
      for (let iz = 0; iz < nz; iz++) {
        const sx = ox - w / 2 + (w / nx) * (ix + 0.5);
        const sz = oz - d / 2 + (d / nz) * (iz + 0.5);
        const st = new THREE.Mesh(sGeo, mat);
        st.position.set(sx, yTop + sh / 2, sz);
        st.castShadow = false;
        st.userData.noShadow = true;
        parent.add(st);
        if (dimpleGeo && darkMat) {
          const dm = new THREE.Mesh(dimpleGeo, darkMat);
          dm.position.set(sx, yTop + sh * 0.88, sz);
          dm.castShadow = false;
          dm.userData.noShadow = true;
          parent.add(dm);
        }
      }
    }
  }

  function addBoxPart(
    parent: THREE.Group,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
  ): THREE.Mesh {
    const m = new THREE.Mesh(geoBox(w, h, d), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  function addCylPart(
    parent: THREE.Group,
    rt: number,
    rb: number,
    h: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    segs = 10,
  ): THREE.Mesh {
    const m = new THREE.Mesh(geoCyl(rt, h, segs, rb), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  function addSculptedLegoFlame(parent: THREE.Group, x: number, y: number, z: number, scale = 1, soul = false) {
    const fg = new THREE.Group();
    fg.position.set(x, y, z);
    fg.scale.setScalar(scale);
    fg.userData.legoFlame = true;
    fg.userData.baseY = y;
    fg.userData.baseScale = scale;
    const outerCol = soul ? 0x28d7ff : 0xff6200;
    const innerCol = soul ? 0xb8ffff : 0xffe438;
    const outerMat = skin(outerCol);
    outerMat.emissive = new THREE.Color(outerCol);
    outerMat.emissiveIntensity = 0.85;
    const innerMat = skin(innerCol);
    innerMat.emissive = new THREE.Color(innerCol);
    innerMat.emissiveIntensity = 1.05;

    // Base stem pin + S-curved molded LEGO flame tongues
    addCylPart(fg, 0.018, 0.022, 0.035, 0, 0.017, 0, outerMat, 8);
    const l1 = addCylPart(fg, 0.032, 0.020, 0.065, -0.006, 0.055, 0, outerMat, 10);
    l1.rotation.z = 0.22;
    const l2 = addCylPart(fg, 0.024, 0.032, 0.065, 0.008, 0.102, 0, outerMat, 10);
    l2.rotation.z = -0.26;
    const tip = addCylPart(fg, 0.005, 0.022, 0.055, -0.004, 0.148, 0, outerMat, 8);
    tip.rotation.z = 0.18;
    // Inner bright core
    addCylPart(fg, 0.016, 0.014, 0.075, 0.002, 0.072, 0.008, innerMat, 8);
    parent.add(fg);
    return fg;
  }

  function buildLegoItem3D(id: number): { group: THREE.Group; isTool: boolean; flames: THREE.Object3D[] } {
    const group = new THREE.Group();
    const flames: THREE.Object3D[] = [];
    if (!id) return { group, isTool: false, flames };
    const d = def(id);
    const baseHex = Number.parseInt(d.color.replace("#", ""), 16) || 0x8a8f96;
    const s = 0.25;
    const hs = s / 2;

    // 1. WORKSTATIONS & BESPOKE MULTI-PART LEGO BLOCKS
    if (id === ID.Furnace) {
      const darkStone = skin(0x3e4248);
      const midStone = skin(0x6c7179);
      const lightStone = skin(0x888e96);
      const cavityMat = skin(0x100a06);
      const grateMat = skin(0x262a30);
      const emberMat = skin(0xff3b10);
      emberMat.emissive = new THREE.Color(0xff2a00);
      emberMat.emissiveIntensity = 0.9;

      // Stepped dark stone base plate + hearth lip
      addBoxPart(group, s * 1.04, s * 0.18, s * 1.04, 0, -hs + s * 0.09, 0, darkStone);
      // Left, right & back masonry walls (stacked LEGO bricks)
      addBoxPart(group, s * 0.24, s * 0.62, s * 0.98, -hs + s * 0.12, s * 0.02, 0, midStone);
      addBoxPart(group, s * 0.24, s * 0.62, s * 0.98, hs - s * 0.12, s * 0.02, 0, midStone);
      addBoxPart(group, s * 0.56, s * 0.62, s * 0.34, 0, s * 0.02, hs - s * 0.17, midStone);
      // Recessed dark firebox interior
      addBoxPart(group, s * 0.54, s * 0.50, s * 0.18, 0, -s * 0.02, -hs + s * 0.26, cavityMat);
      // Arched stone lintel above firebox + ventilation slits
      addBoxPart(group, s * 0.62, s * 0.18, s * 0.26, 0, s * 0.24, -hs + s * 0.13, lightStone);
      addBoxPart(group, s * 0.44, s * 0.05, s * 0.28, -s * 0.02, s * 0.24, -hs + s * 0.13, darkStone);
      // Top cap plate + 4 LEGO studs + circular chimney exhaust ring
      addBoxPart(group, s * 1.02, s * 0.18, s * 1.02, 0, hs - s * 0.09, 0, lightStone);
      addStudGrid(group, s * 0.96, hs, s * 0.96, 2, 2, midStone, 0, 0, true);
      addCylPart(group, s * 0.22, s * 0.24, s * 0.06, 0, hs + s * 0.03, 0, darkStone, 12);
      addCylPart(group, s * 0.13, s * 0.13, s * 0.07, 0, hs + s * 0.035, 0, emberMat, 10);

      // Glowing 1×1 LEGO coal studs inside hearth
      for (const ox of [-0.042, 0, 0.042]) {
        addCylPart(group, 0.018, 0.020, 0.022, ox, -hs + s * 0.22, -hs + s * 0.14, emberMat, 10);
      }
      // Sculpted 3D LEGO Flames roaring inside the furnace mouth
      flames.push(addSculptedLegoFlame(group, 0, -hs + s * 0.22, -hs + s * 0.13, 0.42));
      flames.push(addSculptedLegoFlame(group, -0.032, -hs + s * 0.20, -hs + s * 0.15, 0.30));
      flames.push(addSculptedLegoFlame(group, 0.032, -hs + s * 0.20, -hs + s * 0.15, 0.30));

      // Iron grate bars across lower firebox opening
      for (const gx of [-0.045, -0.015, 0.015, 0.045]) {
        addBoxPart(group, 0.008, s * 0.18, 0.012, gx, -hs + s * 0.25, -hs + 0.01, grateMat);
      }
      return { group, isTool: false, flames };
    }

    if (id === ID.Bench) {
      const darkWood = skin(0x5e3819);
      const midWood = skin(0x9b6636);
      const topWood = skin(0xc88f54);
      const gridCell = skin(0x4b2c12);
      const gridStud = skin(0xdca468);
      const ironMat = skin(0x888f98);
      const clipMat = skin(0x52575e);

      // Base frame + 4 corner timber pillars
      addBoxPart(group, s * 0.94, s * 0.78, s * 0.94, 0, -s * 0.08, 0, midWood);
      for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
        addBoxPart(group, s * 0.20, s * 0.82, s * 0.20, cx * (hs - s * 0.09), -s * 0.08, cz * (hs - s * 0.09), darkWood);
      }
      // Overhanging workbench top plate
      addBoxPart(group, s * 1.06, s * 0.22, s * 1.06, 0, hs - s * 0.10, 0, topWood);
      // Recessed 3×3 LEGO Crafting Grid on top (9 dark cells + 9 miniature LEGO studs!)
      addBoxPart(group, s * 0.78, 0.008, s * 0.78, 0, hs + 0.004, 0, darkWood);
      for (let gx = -1; gx <= 1; gx++) {
        for (let gz = -1; gz <= 1; gz++) {
          const cx = gx * (s * 0.24);
          const cz = gz * (s * 0.24);
          addBoxPart(group, s * 0.20, 0.012, s * 0.20, cx, hs + 0.008, cz, gridCell);
          addCylPart(group, 0.015, 0.016, 0.016, cx, hs + 0.020, cz, gridStud, 10);
        }
      }
      // Front SNOT tool rack: grey LEGO clip + miniature 3D LEGO Hammer & Hand-Saw!
      addBoxPart(group, s * 0.76, 0.020, 0.018, 0, s * 0.12, -hs - 0.008, darkWood);
      // Mini LEGO Hammer on left
      addBoxPart(group, 0.022, 0.020, 0.022, -s * 0.20, s * 0.12, -hs - 0.016, clipMat);
      addCylPart(group, 0.009, 0.009, s * 0.42, -s * 0.20, -s * 0.02, -hs - 0.018, darkWood, 8);
      addBoxPart(group, 0.052, 0.024, 0.026, -s * 0.20, s * 0.16, -hs - 0.020, ironMat);
      // Mini LEGO Saw on right
      addBoxPart(group, 0.022, 0.020, 0.022, s * 0.18, s * 0.12, -hs - 0.016, clipMat);
      addBoxPart(group, 0.036, 0.028, 0.018, s * 0.18, s * 0.14, -hs - 0.020, topWood);
      addBoxPart(group, 0.028, s * 0.36, 0.008, s * 0.18, -s * 0.04, -hs - 0.020, ironMat);
      return { group, isTool: false, flames };
    }

    if (id === ID.Chest || id === ID.ShulkerBox) {
      const isShulker = id === ID.ShulkerBox;
      const bodyMat = skin(isShulker ? 0x7c3e96 : 0x9b622e);
      const lidMat = skin(isShulker ? 0x924eb0 : 0xb27438);
      const rimMat = skin(isShulker ? 0x4a205c : 0x422711);
      const goldMat = skin(0xf5c518);

      // Lower chest box
      addBoxPart(group, s * 0.96, s * 0.56, s * 0.88, 0, -hs + s * 0.28, 0, bodyMat);
      // Dark seam gap between box and hinged lid
      addBoxPart(group, s * 0.98, s * 0.05, s * 0.90, 0, s * 0.08, 0, rimMat);
      // Hinged upper lid + 4 top studs
      addBoxPart(group, s * 0.96, s * 0.34, s * 0.88, 0, hs - s * 0.19, 0, lidMat);
      addStudGrid(group, s * 0.86, hs - 0.005, s * 0.78, 2, 2, lidMat, 0, 0, true);
      // Protruding 1×1 gold LEGO latch plate + central gold stud
      addBoxPart(group, s * 0.22, s * 0.28, 0.026, 0, s * 0.08, -hs * 0.88 - 0.01, goldMat);
      const latchStud = addCylPart(group, 0.018, 0.018, 0.018, 0, s * 0.08, -hs * 0.88 - 0.026, goldMat, 10);
      latchStud.rotation.x = Math.PI / 2;
      return { group, isTool: false, flames };
    }

    if (id === ID.Anvil) {
      const baseMat = skin(0x3a3e45);
      const waistMat = skin(0x282b30);
      const topMat = skin(0x525760);
      addBoxPart(group, s * 0.88, s * 0.24, s * 0.72, 0, -hs + s * 0.12, 0, baseMat);
      addStudGrid(group, s * 0.80, -hs + s * 0.24, s * 0.64, 2, 2, baseMat);
      addBoxPart(group, s * 0.42, s * 0.34, s * 0.38, 0, -s * 0.04, 0, waistMat);
      addBoxPart(group, s * 1.06, s * 0.34, s * 0.64, 0, hs - s * 0.20, 0, topMat);
      addStudGrid(group, s * 0.96, hs - s * 0.03, s * 0.56, 2, 2, topMat, 0, 0, true);
      return { group, isTool: false, flames };
    }

    if (id === ID.Enchanter) {
      const obsMat = skin(0x1b1428);
      const clothMat = skin(0xc4282f);
      const goldMat = skin(0xf5c518);
      const cyanMat = skin(0x4ef2f7);
      cyanMat.emissive = new THREE.Color(0x28d7e8);
      cyanMat.emissiveIntensity = 0.75;
      const coverMat = skin(0x6e3b1e);
      const pageMat = skin(0xf5eedc);

      // Obsidian pedestal (3/4 height) + red diamond cloth + 4 glowing cyan corner studs
      addBoxPart(group, s * 0.98, s * 0.68, s * 0.98, 0, -hs + s * 0.34, 0, obsMat);
      addBoxPart(group, s * 1.02, s * 0.16, s * 1.02, 0, s * 0.10, 0, clothMat);
      addStudGrid(group, s * 0.90, s * 0.18, s * 0.90, 2, 2, cyanMat);
      // Open LEGO spellbook angled on top
      const bookG = new THREE.Group();
      bookG.position.set(0, s * 0.29, 0);
      bookG.rotation.set(-0.32, 0.45, 0);
      const lCov = new THREE.Mesh(new THREE.BoxGeometry(s * 0.36, 0.016, s * 0.46), coverMat);
      lCov.position.set(-s * 0.17, 0, 0);
      lCov.rotation.z = 0.26;
      const rCov = new THREE.Mesh(new THREE.BoxGeometry(s * 0.36, 0.016, s * 0.46), coverMat);
      rCov.position.set(s * 0.17, 0, 0);
      rCov.rotation.z = -0.26;
      const lPg = new THREE.Mesh(new THREE.BoxGeometry(s * 0.32, 0.022, s * 0.42), pageMat);
      lPg.position.set(-s * 0.15, 0.014, 0);
      lPg.rotation.z = 0.26;
      const rPg = new THREE.Mesh(new THREE.BoxGeometry(s * 0.32, 0.022, s * 0.42), pageMat);
      rPg.position.set(s * 0.15, 0.014, 0);
      rPg.rotation.z = -0.26;
      const spine = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.026, s * 0.48), goldMat);
      bookG.add(lCov, rCov, lPg, rPg, spine);
      group.add(bookG);
      return { group, isTool: false, flames };
    }

    // Technic (Claude's 1:1 layer): the held model IS the real geometry
    // from technicGeo — the same function that renders the part in the
    // world — sized proportionally for the hand (fixed size per module,
    // spec.hand tweaks the fit). The
    // old hand-modelled Technic shapes that lived here are gone: parts
    // place through the Technic layer now, never as blocks or bricks.
    if (TECHNIC_SET.has(id)) {
      const geo = techGeoOf(id);
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      const size = new THREE.Vector3();
      bb.getSize(size);
      const centre = new THREE.Vector3();
      bb.getCenter(centre);
      const mesh = new THREE.Mesh(geo, techMatSolid);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      // PROPORTIONAL hand size (Philippe, 2026-10-29): a fixed size per
      // module — 0.11 per module of the part's largest dimension, capped
      // at 0.85 so the biggest frames stay holdable. The old formula
      // normalized EVERY part to the same 0.32 max dimension (a 2-module
      // pin rendered the same length as a 15-module frame; measured in
      // the step-7 QA at 93.5 vs 45.4 px per module). spec.hand stays as
      // a per-part multiplier on top. placeHeldMinecraft applies a
      // CONSTANT pipeline factor for Technic (no re-normalization) and
      // closes the minifig hand on the part.
      const heldSize = Math.min(0.11 * maxDim, 0.85) * (techSpec(id)?.hand ?? 1);
      mesh.scale.setScalar(heldSize / maxDim);
      mesh.position.copy(centre).multiplyScalar(-mesh.scale.x);
      group.add(mesh);
      return { group, isTool: false, flames };
    }


    if (id === ID.Brew) {
      const stoneMat = skin(0x70757d);
      const rodMat = skin(0xffb82e);
      rodMat.emissive = new THREE.Color(0xff9400);
      rodMat.emissiveIntensity = 0.7;
      const potCols = [0xe23b2f, 0x4ec5f7, 0x68d854];

      // Cobblestone base plate + 4 studs
      addBoxPart(group, s * 0.96, s * 0.18, s * 0.96, 0, -hs + s * 0.09, 0, stoneMat);
      addStudGrid(group, s * 0.88, -hs + s * 0.18, s * 0.88, 2, 2, stoneMat);
      // Central glowing Blaze rod + top stud + cross manifold
      const rod = addCylPart(group, 0.020, 0.022, s * 0.76, 0, s * 0.06, 0, rodMat, 10);
      flames.push(rod);
      addBoxPart(group, s * 0.68, 0.022, 0.022, 0, s * 0.22, 0, rodMat);
      addBoxPart(group, 0.022, 0.022, s * 0.68, 0, s * 0.22, 0, rodMat);
      // 3 LEGO Potion bottles around the base
      const dirs = [[-s * 0.28, 0], [s * 0.28, 0], [0, -s * 0.28]] as const;
      dirs.forEach(([px, pz], idx) => {
        const pMat = skin(potCols[idx]);
        pMat.emissive = new THREE.Color(potCols[idx]);
        pMat.emissiveIntensity = 0.25;
        addCylPart(group, 0.032, 0.036, s * 0.28, px, -hs + s * 0.32, pz, pMat, 10);
        addCylPart(group, 0.016, 0.016, s * 0.10, px, -hs + s * 0.50, pz, skin(0xd8f0ff), 8);
        addCylPart(group, 0.019, 0.019, 0.018, px, -hs + s * 0.56, pz, rodMat, 8);
      });
      return { group, isTool: false, flames };
    }

    if (id === ID.Campfire) {
      const logMat = skin(0x5c3a1e);
      const barkMat = skin(0x422812);
      const coalMat = skin(0xff4210);
      coalMat.emissive = new THREE.Color(0xff2a00);
      coalMat.emissiveIntensity = 0.85;

      // 4 crossed LEGO logs with studs
      addBoxPart(group, s * 0.94, s * 0.18, s * 0.22, 0, -hs + s * 0.09, -s * 0.24, logMat);
      addBoxPart(group, s * 0.94, s * 0.18, s * 0.22, 0, -hs + s * 0.09, s * 0.24, logMat);
      addBoxPart(group, s * 0.22, s * 0.18, s * 0.94, -s * 0.24, -hs + s * 0.24, 0, barkMat);
      addBoxPart(group, s * 0.22, s * 0.18, s * 0.94, s * 0.24, -hs + s * 0.24, 0, barkMat);
      // Glowing ember bed + 3 sculpted LEGO flames
      addBoxPart(group, s * 0.38, s * 0.10, s * 0.38, 0, -hs + s * 0.12, 0, coalMat);
      flames.push(addSculptedLegoFlame(group, 0, -hs + s * 0.16, 0, 0.72));
      flames.push(addSculptedLegoFlame(group, -0.036, -hs + s * 0.14, 0.025, 0.48));
      flames.push(addSculptedLegoFlame(group, 0.036, -hs + s * 0.14, -0.025, 0.48));
      return { group, isTool: false, flames };
    }

    if (id === ID.Barrel) {
      const woodMat = skin(0x82542b);
      const hoopMat = skin(0x363a40);
      const bungMat = skin(0xc8963e);
      addBoxPart(group, s * 0.96, s * 0.98, s * 0.96, 0, 0, 0, woodMat);
      addBoxPart(group, s * 1.02, s * 0.12, s * 1.02, 0, s * 0.24, 0, hoopMat);
      addBoxPart(group, s * 1.02, s * 0.12, s * 1.02, 0, -s * 0.24, 0, hoopMat);
      addStudGrid(group, s * 0.90, hs, s * 0.90, 2, 2, woodMat);
      addCylPart(group, 0.026, 0.026, 0.020, 0, hs + 0.01, 0, bungMat, 10);
      return { group, isTool: false, flames };
    }

    if (id === ID.TNT) {
      const redMat = skin(0xd82e22);
      const bandMat = skin(0xf4f1ea);
      const inkMat = skin(0x1e1a18);
      const topMat = skin(0x383838);
      addBoxPart(group, s * 0.98, s * 0.98, s * 0.98, 0, 0, 0, redMat);
      addBoxPart(group, s * 1.02, s * 0.30, s * 1.02, 0, 0, 0, bandMat);
      // "TNT" micro-bars on front band
      for (const tx of [-s * 0.26, 0, s * 0.26]) {
        addBoxPart(group, 0.028, s * 0.20, 0.014, tx, 0, -hs - 0.006, inkMat);
      }
      addBoxPart(group, s * 0.96, 0.012, s * 0.96, 0, hs, 0, topMat);
      addStudGrid(group, s * 0.92, hs + 0.006, s * 0.92, 2, 2, bandMat);
      return { group, isTool: false, flames };
    }

    if (id === ID.Bookshelf) {
      const woodMat = skin(0x9b6839);
      const darkMat = skin(0x24180e);
      addBoxPart(group, s * 0.98, s * 0.20, s * 0.98, 0, -hs + s * 0.10, 0, woodMat);
      addBoxPart(group, s * 0.98, s * 0.16, s * 0.98, 0, 0, 0, woodMat);
      addBoxPart(group, s * 0.98, s * 0.20, s * 0.98, 0, hs - s * 0.10, 0, woodMat);
      addBoxPart(group, s * 0.88, s * 0.76, s * 0.88, 0, 0, 0, darkMat);
      const bookCols = [0xc4282f, 0x2e6bc4, 0x389848, 0xd89e28, 0x7c3e96];
      for (let row = 0; row < 2; row++) {
        const ry = row === 0 ? -s * 0.20 : s * 0.20;
        for (let b = 0; b < 5; b++) {
          const bx = -s * 0.34 + b * (s * 0.17);
          const bm = skin(bookCols[(b + row * 2) % bookCols.length]);
          addBoxPart(group, s * 0.14, s * 0.24, s * 0.96, bx, ry, 0, bm);
        }
      }
      addStudGrid(group, s * 0.92, hs, s * 0.92, 2, 2, woodMat);
      return { group, isTool: false, flames };
    }

    if (id === ID.Bed) {
      const woodMat = skin(0x7c522b);
      const redMat = skin(0xc92c24);
      const whiteMat = skin(0xf4f2ec);
      addBoxPart(group, s * 0.96, s * 0.18, s * 1.16, 0, -hs + s * 0.14, 0, woodMat);
      addBoxPart(group, s * 0.94, s * 0.24, s * 0.78, 0, -hs + s * 0.34, s * 0.16, redMat);
      addBoxPart(group, s * 0.90, s * 0.26, s * 0.34, 0, -hs + s * 0.36, -s * 0.38, whiteMat);
      addStudGrid(group, s * 0.86, -hs + s * 0.46, s * 0.70, 2, 2, redMat, 0, s * 0.16);
      return { group, isTool: false, flames };
    }

    if (id === ID.Beacon || id === ID.Conduit) {
      const obsMat = skin(0x1b1428);
      const coreMat = skin(0x64f6ff);
      coreMat.emissive = new THREE.Color(0x38e8ff);
      coreMat.emissiveIntensity = 0.95;
      addBoxPart(group, s * 0.96, s * 0.22, s * 0.96, 0, -hs + s * 0.11, 0, obsMat);
      const core = addBoxPart(group, s * 0.46, s * 0.46, s * 0.46, 0, s * 0.04, 0, coreMat);
      core.rotation.set(0.5, 0.5, 0.3);
      flames.push(core);
      addStudGrid(group, s * 0.88, -hs + s * 0.22, s * 0.88, 2, 2, coreMat);
      return { group, isTool: false, flames };
    }

    if (id === ID.Cactus) {
      const greenMat = skin(0x2d8a3c);
      const darkRibMat = skin(0x1b5e26);
      const lightRibMat = skin(0x46b454);
      const spineMat = skin(0xf4ebd2);
      const flowerMat = skin(0xf26498);
      const pollenMat = skin(0xffd838);
      // 3 stacked ribbed green LEGO column courses
      addBoxPart(group, s * 0.64, s * 0.34, s * 0.64, 0, -hs + s * 0.17, 0, greenMat);
      addBoxPart(group, s * 0.64, s * 0.34, s * 0.64, 0, -hs + s * 0.53, 0, darkRibMat);
      addBoxPart(group, s * 0.64, s * 0.32, s * 0.64, 0, hs - s * 0.16, 0, greenMat);
      // 4 vertical fluted LEGO rib plates
      for (const off of [-s * 0.16, s * 0.16]) {
        addBoxPart(group, s * 0.74, s * 0.96, s * 0.10, 0, 0, off, lightRibMat);
        addBoxPart(group, s * 0.10, s * 0.96, s * 0.74, off, 0, 0, lightRibMat);
      }
      // Left & Right L-shaped 3D LEGO Saguaro Side Arms with top studs
      addBoxPart(group, s * 0.32, s * 0.20, s * 0.24, s * 0.42, -s * 0.04, 0, greenMat);
      addBoxPart(group, s * 0.24, s * 0.44, s * 0.24, s * 0.50, s * 0.22, 0, lightRibMat);
      addStudGrid(group, s * 0.22, s * 0.44, s * 0.22, 1, 1, lightRibMat, s * 0.50, 0, true);

      addBoxPart(group, s * 0.32, s * 0.20, s * 0.24, -s * 0.42, -s * 0.18, 0, greenMat);
      addBoxPart(group, s * 0.24, s * 0.42, s * 0.24, -s * 0.50, s * 0.08, 0, lightRibMat);
      addStudGrid(group, s * 0.22, s * 0.29, s * 0.22, 1, 1, lightRibMat, -s * 0.50, 0, true);

      // Protruding cream LEGO spines
      for (const sy of [-s * 0.24, s * 0.18]) {
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
          addBoxPart(group, 0.022, 0.016, 0.022, sx * s * 0.36, sy, sz * s * 0.36, spineMat);
        }
      }
      // 4 top LEGO studs + blooming LEGO desert flower stud on crown
      addStudGrid(group, s * 0.60, hs, s * 0.60, 2, 2, lightRibMat, 0, 0, true);
      addCylPart(group, 0.036, 0.028, 0.024, 0, hs + 0.022, 0, flowerMat, 8);
      addCylPart(group, 0.018, 0.018, 0.016, 0, hs + 0.040, 0, pollenMat, 8);
      return { group, isTool: false, flames };
    }

    // 2. TORCHES, LANTERNS & LIGHT SOURCES
    if (id === ID.Torch || id === ID.RedTorch || id === ID.RedTorchOn) {
      const isRed = id !== ID.Torch;
      const stickMat = skin(0x7c522b);
      const collarMat = skin(isRed ? 0x8e1e18 : 0xd89e28);
      addCylPart(group, 0.024, 0.028, s * 0.95, 0, -s * 0.08, 0, stickMat, 10);
      addCylPart(group, 0.036, 0.036, 0.024, 0, -s * 0.52, 0, stickMat, 10);
      addCylPart(group, 0.032, 0.030, 0.032, 0, s * 0.36, 0, collarMat, 10);
      if (isRed) {
        const bulbMat = skin(0xff2a1e);
        bulbMat.emissive = new THREE.Color(0xff1e10);
        bulbMat.emissiveIntensity = id === ID.RedTorchOn ? 0.95 : 0.35;
        const b = addCylPart(group, 0.032, 0.032, 0.055, 0, s * 0.50, 0, bulbMat, 10);
        flames.push(b);
      } else {
        flames.push(addSculptedLegoFlame(group, 0, s * 0.38, 0, 0.72));
      }
      return { group, isTool: true, flames };
    }

    if (id === ID.Lantern) {
      const ironMat = skin(0x2d3138);
      const glowMat = skin(0xffb82e);
      glowMat.emissive = new THREE.Color(0xff8c12);
      glowMat.emissiveIntensity = 0.95;
      addBoxPart(group, s * 0.62, s * 0.14, s * 0.62, 0, -s * 0.32, 0, ironMat);
      const core = addBoxPart(group, s * 0.44, s * 0.48, s * 0.44, 0, -s * 0.02, 0, glowMat);
      flames.push(core);
      for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
        addBoxPart(group, 0.014, s * 0.50, 0.014, cx * s * 0.24, -s * 0.02, cz * s * 0.24, ironMat);
      }
      addBoxPart(group, s * 0.64, s * 0.14, s * 0.64, 0, s * 0.26, 0, ironMat);
      addCylPart(group, 0.024, 0.028, s * 0.14, 0, s * 0.38, 0, ironMat, 10);
      return { group, isTool: false, flames };
    }

    // 3. MOLDED 3D LEGO MINIFIG TOOLS & WEAPONS
    if (d.tool === "pick") {
      const handleMat = skin(0x7c522b);
      const headMat = skin(baseHex);
      const darkHead = skin(shiftHex(baseHex, 0.75));
      // Cylindrical LEGO grip + bottom pommel ring
      addCylPart(group, 0.020, 0.022, 0.34, 0, 0, 0, handleMat, 10);
      addCylPart(group, 0.028, 0.028, 0.024, 0, -0.165, 0, handleMat, 10);
      // Central head socket collar + top LEGO stud
      addBoxPart(group, 0.062, 0.056, 0.048, 0, 0.13, 0, darkHead);
      addCylPart(group, 0.018, 0.020, 0.020, 0, 0.18, 0, headMat, 10);
      // Curved left & right pickaxe arms + chisel tips
      const armL = addBoxPart(group, 0.13, 0.036, 0.034, -0.082, 0.12, 0, headMat);
      armL.rotation.z = 0.26;
      const tipL = addBoxPart(group, 0.055, 0.024, 0.026, -0.152, 0.092, 0, darkHead);
      tipL.rotation.z = 0.48;
      const armR = addBoxPart(group, 0.13, 0.036, 0.034, 0.082, 0.12, 0, headMat);
      armR.rotation.z = -0.26;
      const tipR = addBoxPart(group, 0.055, 0.024, 0.026, 0.152, 0.092, 0, darkHead);
      tipR.rotation.z = -0.48;
      return { group, isTool: true, flames };
    }

    if (d.tool === "axe") {
      const handleMat = skin(0x7c522b);
      const headMat = skin(baseHex);
      const edgeMat = skin(shiftHex(baseHex, 1.18));
      addCylPart(group, 0.020, 0.022, 0.34, 0, 0, 0, handleMat, 10);
      addCylPart(group, 0.028, 0.028, 0.024, 0, -0.165, 0, handleMat, 10);
      addBoxPart(group, 0.065, 0.062, 0.046, 0, 0.12, 0, headMat);
      addCylPart(group, 0.018, 0.020, 0.020, 0, 0.18, 0, headMat, 10);
      // Stepped LEGO axe blade on -X side + rear poll block on +X
      addBoxPart(group, 0.085, 0.11, 0.032, -0.062, 0.115, 0, headMat);
      addBoxPart(group, 0.034, 0.145, 0.018, -0.108, 0.11, 0, edgeMat);
      addBoxPart(group, 0.042, 0.046, 0.036, 0.046, 0.12, 0, headMat);
      return { group, isTool: true, flames };
    }

    if (d.tool === "shovel") {
      const handleMat = skin(0x7c522b);
      const headMat = skin(baseHex);
      addCylPart(group, 0.020, 0.022, 0.30, 0, -0.02, 0, handleMat, 10);
      addCylPart(group, 0.028, 0.028, 0.024, 0, -0.165, 0, handleMat, 10);
      addCylPart(group, 0.026, 0.024, 0.032, 0, 0.11, 0, skin(shiftHex(baseHex, 0.78)), 10);
      addBoxPart(group, 0.095, 0.115, 0.024, 0, 0.175, 0, headMat);
      addBoxPart(group, 0.068, 0.032, 0.020, 0, 0.242, 0, skin(shiftHex(baseHex, 1.15)));
      const st = addCylPart(group, 0.018, 0.018, 0.016, 0, 0.165, -0.016, headMat, 10);
      st.rotation.x = Math.PI / 2;
      return { group, isTool: true, flames };
    }

    if (d.tool === "hoe") {
      const handleMat = skin(0x7c522b);
      const headMat = skin(baseHex);
      addCylPart(group, 0.020, 0.022, 0.34, 0, 0, 0, handleMat, 10);
      addCylPart(group, 0.028, 0.028, 0.024, 0, -0.165, 0, handleMat, 10);
      addBoxPart(group, 0.060, 0.048, 0.044, 0, 0.135, 0, headMat);
      addCylPart(group, 0.018, 0.020, 0.020, 0, 0.18, 0, headMat, 10);
      const tine = addBoxPart(group, 0.115, 0.034, 0.030, -0.072, 0.128, 0, headMat);
      tine.rotation.z = 0.22;
      return { group, isTool: true, flames };
    }

    if (d.tool === "sword") {
      const isTrident = id === ID.Trident || id === ID.TidalBlade;
      if (isTrident) {
        const shaftMat = skin(id === ID.TidalBlade ? 0x165a6e : 0x2a8478);
        const headMat = skin(id === ID.TidalBlade ? 0x20d8e8 : 0x66e8dc);
        const prongMat = skin(id === ID.TidalBlade ? 0xff9a2e : 0xe8ffff);
        addCylPart(group, 0.019, 0.021, 0.38, 0, -0.01, 0, shaftMat, 10);
        addBoxPart(group, 0.14, 0.036, 0.034, 0, 0.16, 0, headMat);
        for (const px of [-0.052, 0, 0.052]) {
          addCylPart(group, 0.006, 0.014, 0.11, px, 0.225, 0, prongMat, 8);
        }
        return { group, isTool: true, flames };
      }
      const gripMat = skin(0x5c381c);
      const guardMat = skin(0xd8a22e);
      const bladeMat = skin(baseHex);
      const ridgeMat = skin(shiftHex(baseHex, 1.22));
      addCylPart(group, 0.019, 0.021, 0.11, 0, -0.11, 0, gripMat, 10);
      addCylPart(group, 0.028, 0.028, 0.026, 0, -0.172, 0, guardMat, 10);
      addBoxPart(group, 0.135, 0.032, 0.038, 0, -0.048, 0, guardMat);
      addBoxPart(group, 0.058, 0.23, 0.022, 0, 0.082, 0, bladeMat);
      addBoxPart(group, 0.024, 0.21, 0.028, 0, 0.080, 0, ridgeMat);
      const tip = addBoxPart(group, 0.040, 0.040, 0.020, 0, 0.20, 0, bladeMat);
      tip.rotation.z = Math.PI / 4;
      return { group, isTool: true, flames };
    }

    if (id === ID.Bow || id === ID.Crossbow) {
      // Rebuilt 2026-10-29 (Philippe's photo: the old bow read as a
      // beige lump). The old model was TWO short straight boxes angled
      // at 0.42 rad — a stubby chevron, no arc — plus a string cylinder
      // that was too short (0.30 for a 0.337 tip span) and offset from
      // the limb tips, so it floated detached. Now: each limb is THREE
      // segments walked along a real arc (the joints meet by
      // construction, LEGO-faceted curve), the string spans tip to tip
      // exactly, and the arrow sits on the grip.
      const woodMat = skin(0x7c522b);
      const stringMat = skin(0xe8e4dc);
      const gripMat = skin(0x4a2e16);
      const tipMat = skin(0xb0b6be);
      const fletchMat = skin(0xd82e22);
      addBoxPart(group, 0.034, 0.08, 0.036, 0.012, 0, 0, gripMat);
      const segAngles = [0.16, 0.42, 0.68];
      const segLen = 0.09;
      let tipX = 0, tipY = 0;
      for (const sign of [1, -1] as const) {
        let px = 0.012, py = sign * 0.03;
        for (const a of segAngles) {
          const dx = -Math.sin(a), dy = sign * Math.cos(a);
          const seg = addBoxPart(group, 0.026, segLen + 0.012, 0.028, px + (dx * segLen) / 2, py + (dy * segLen) / 2, 0, woodMat);
          seg.rotation.z = sign > 0 ? a : Math.PI - a;
          px += dx * segLen;
          py += dy * segLen;
        }
        addBoxPart(group, 0.030, 0.026, 0.032, px, py, 0, tipMat);
        if (sign > 0) { tipX = px; tipY = py; }
      }
      // String: one thin span, tip to tip exactly.
      addBoxPart(group, 0.006, tipY * 2, 0.006, tipX, 0, 0, stringMat);
      // Nocked LEGO arrow, resting on the grip, pointing +x.
      const arr = addCylPart(group, 0.007, 0.007, 0.30, 0.0, 0, 0, woodMat, 8);
      arr.rotation.z = Math.PI / 2;
      addBoxPart(group, 0.030, 0.024, 0.024, 0.165, 0, 0, tipMat);
      addBoxPart(group, 0.010, 0.034, 0.030, -0.135, 0, 0, fletchMat);
      addBoxPart(group, 0.030, 0.034, 0.010, -0.135, 0, 0, fletchMat);
      return { group, isTool: true, flames };
    }

    if (id === ID.Shield) {
      const woodMat = skin(0x8e5c2e);
      const ironMat = skin(0x5a6068);
      const goldMat = skin(0xf5c518);
      addBoxPart(group, 0.22, 0.30, 0.028, 0, 0, 0, woodMat);
      addBoxPart(group, 0.24, 0.028, 0.034, 0, 0.14, 0, ironMat);
      addBoxPart(group, 0.24, 0.028, 0.034, 0, -0.14, 0, ironMat);
      addBoxPart(group, 0.028, 0.30, 0.034, -0.105, 0, 0, ironMat);
      addBoxPart(group, 0.028, 0.30, 0.034, 0.105, 0, 0, ironMat);
      const boss = addCylPart(group, 0.034, 0.038, 0.024, 0, 0, -0.022, goldMat, 12);
      boss.rotation.x = Math.PI / 2;
      return { group, isTool: true, flames };
    }

    // 4. POTIONS, BUCKETS, FOOD, INGOTS & GEMS
    if (
      id === ID.Bottle ||
      id === ID.PotionHeal ||
      id === ID.PotionSpeed ||
      id === ID.PotionStr ||
      id === ID.PotionRegen ||
      id === ID.PotionFire ||
      id === ID.PotionLeap ||
      id === ID.PotionGill ||
      id === ID.PotionVeil ||
      id === ID.PotionVenom ||
      id === ID.PotionTar ||
      id === ID.SplashVenom ||
      id === ID.SplashTar ||
      id === ID.Focus ||
      id === ID.WitchVenom
    ) {
      const glassFlask = skin(0xd8f0ff);
      const liqMat = skin(baseHex);
      if (id !== ID.Bottle) {
        liqMat.emissive = new THREE.Color(baseHex);
        liqMat.emissiveIntensity = 0.35;
      }
      const corkMat = skin(0xc8963e);
      addCylPart(group, 0.068, 0.076, 0.13, 0, -0.03, 0, id === ID.Bottle ? glassFlask : liqMat, 12);
      addCylPart(group, 0.032, 0.036, 0.06, 0, 0.06, 0, glassFlask, 10);
      addCylPart(group, 0.038, 0.038, 0.028, 0, 0.10, 0, corkMat, 10);
      return { group, isTool: false, flames };
    }

    if (id === ID.Bucket || id === ID.WaterBucket || id === ID.LavaBucket || id === ID.Milk) {
      const ironMat = skin(0x8e959e);
      const darkRim = skin(0x50555c);
      addCylPart(group, 0.095, 0.072, 0.18, 0, -0.01, 0, ironMat, 12);
      addCylPart(group, 0.102, 0.102, 0.028, 0, 0.075, 0, darkRim, 12);
      const fillHex = id === ID.WaterBucket ? 0x2a7fff : id === ID.LavaBucket ? 0xff5a12 : id === ID.Milk ? 0xf8f8f4 : 0x262a30;
      const fillMat = skin(fillHex);
      if (id === ID.LavaBucket) {
        fillMat.emissive = new THREE.Color(0xff4500);
        fillMat.emissiveIntensity = 0.85;
      }
      addCylPart(group, 0.086, 0.086, 0.022, 0, 0.082, 0, fillMat, 12);
      return { group, isTool: false, flames };
    }

    if (
      id === ID.Ingot ||
      id === ID.Gold ||
      id === ID.Copper ||
      id === ID.Tin ||
      id === ID.Chrome ||
      id === ID.Resin ||
      id === ID.Scrap ||
      id === ID.PharaohGold ||
      id === ID.IllagerBadge
    ) {
      const mat = skin(baseHex);
      const topMat = skin(shiftHex(baseHex, 1.15));
      addBoxPart(group, 0.22, 0.065, 0.12, 0, -0.02, 0, mat);
      addBoxPart(group, 0.19, 0.022, 0.095, 0, 0.022, 0, topMat);
      addStudGrid(group, 0.18, 0.033, 0.09, 2, 1, topMat, 0, 0, true);
      return { group, isTool: false, flames };
    }

    if (
      id === ID.Diamond ||
      id === ID.Emerald ||
      id === ID.Sapphire ||
      id === ID.Amber ||
      id === ID.Prism ||
      id === ID.Crystal ||
      id === ID.EnderPearl ||
      id === ID.EyeOfEnder ||
      id === ID.NetherStar ||
      id === ID.GuardianSpike ||
      id === ID.VoidCore
    ) {
      const gemMat = skin(baseHex);
      gemMat.emissive = new THREE.Color(baseHex);
      gemMat.emissiveIntensity = 0.28;
      addCylPart(group, 0.075, 0.045, 0.09, 0, -0.02, 0, gemMat, 8);
      addCylPart(group, 0.048, 0.075, 0.06, 0, 0.055, 0, skin(shiftHex(baseHex, 1.25)), 8);
      addCylPart(group, 0.026, 0.028, 0.022, 0, 0.095, 0, gemMat, 10);
      return { group, isTool: false, flames };
    }

    if (d.food) {
      const foodMat = skin(baseHex);
      const rimMat = skin(shiftHex(baseHex, 0.80));
      if (id === ID.Apple || id === ID.Gapple) {
        if (id === ID.Gapple) {
          foodMat.emissive = new THREE.Color(0xffb81c);
          foodMat.emissiveIntensity = 0.35;
        }
        addCylPart(group, 0.078, 0.068, 0.13, 0, -0.01, 0, foodMat, 12);
        addCylPart(group, 0.026, 0.028, 0.022, 0, 0.065, 0, foodMat, 10);
        addBoxPart(group, 0.045, 0.016, 0.024, 0.024, 0.072, 0, skin(0x3ca842));
      } else if (id === ID.Steak || id === ID.RawMeat) {
        addBoxPart(group, 0.18, 0.065, 0.13, -0.02, 0, 0, foodMat);
        addCylPart(group, 0.022, 0.022, 0.09, 0.08, 0, 0, skin(0xf4f0e4), 8).rotation.z = Math.PI / 2;
        addStudGrid(group, 0.16, 0.032, 0.11, 2, 1, rimMat, -0.02, 0);
      } else {
        addBoxPart(group, 0.19, 0.075, 0.12, 0, 0, 0, foodMat);
        addStudGrid(group, 0.17, 0.038, 0.10, 2, 1, rimMat);
      }
      return { group, isTool: false, flames };
    }

    // 4b. ROD-LIKE ITEMS (stick, fishing rod, ember rod, bone, arrow): a LEGO
    // bar held through the hand like a tool — before v4.17 they fell through
    // to the full brick model and a stick was held as a plank block.
    if (id === ID.Stick || id === ID.Rod || id === ID.Blaze || id === ID.Bone || id === ID.Arrow) {
      const mat = skin(id === ID.Stick ? 0x8a5a2b : baseHex);
      addCylPart(group, 0.016, 0.016, 0.3, 0, 0.04, 0, mat, 10);
      if (id === ID.Rod) {
        const line = addCylPart(group, 0.004, 0.004, 0.22, 0.05, 0.12, 0, skin(0xe8e4dc), 6);
        line.rotation.z = 0.5;
      } else if (id === ID.Arrow) {
        addBoxPart(group, 0.03, 0.04, 0.03, 0, 0.2, 0, skin(0xb0b6be));
        addBoxPart(group, 0.034, 0.05, 0.008, 0, -0.1, 0, skin(0xd82e22));
      } else if (id === ID.Bone) {
        addCylPart(group, 0.03, 0.03, 0.04, 0, 0.19, 0, mat, 10);
        addCylPart(group, 0.03, 0.03, 0.04, 0, -0.11, 0, mat, 10);
      }
      return { group, isTool: true, flames };
    }

    // 4c. EVERY OTHER NON-BLOCK ITEM (string, feather, paper, dust, shells…):
    // a small 1×2 LEGO tile in the item's colour — small enough to sit in the
    // hand, never a full brick.
    if (!d.placeable) {
      const mat = skin(baseHex);
      addBoxPart(group, 0.17, 0.05, 0.1, 0, 0, 0, mat);
      addStudGrid(group, 0.15, 0.025, 0.08, 2, 1, skin(shiftHex(baseHex, 1.12)), 0, 0, true);
      return { group, isTool: false, flames };
    }

    // 5. ALL PLACEABLE WORLD BLOCKS: True 3-Course Modular LEGO Sub-Brick Assembly!
    // Renders the top 2×2 LEGO plate (with 4 hollow studs) + 2 staggered courses of 1×2 LEGO bricks with real 3D seam gaps!
    const isGrassLike = id === ID.Grass || id === ID.Snow || id === ID.Mycelium || id === ID.Podzol;
    const topHex =
      id === ID.Grass
        ? 0x52a842
        : id === ID.Snow
          ? 0xf2f6fa
          : id === ID.Mycelium
            ? 0x8a728e
            : id === ID.Podzol
              ? 0x6a4424
              : shiftHex(baseHex, 1.08);
    const bodyHex = isGrassLike ? 0x7c5432 : baseHex;
    const matTop = skin(topHex);
    const matA = skin(bodyHex);
    const matB = skin(shiftHex(bodyHex, 0.90));
    const matC = skin(shiftHex(bodyHex, 1.06));
    const seamMat = skin(shiftHex(bodyHex, 0.35));

    if (d.slab) {
      addBoxPart(group, s, s * 0.48, s, 0, -hs + s * 0.24, 0, matTop);
      addStudGrid(group, s * 0.96, -hs + s * 0.48, s * 0.96, 2, 2, matTop, 0, 0, true);
      return { group, isTool: false, flames };
    }

    if (d.stairs) {
      addBoxPart(group, s, s * 0.48, s, 0, -hs + s * 0.24, 0, matA);
      addStudGrid(group, s * 0.96, -hs + s * 0.48, s * 0.48, 2, 1, matA, 0, -s * 0.24, true);
      addBoxPart(group, s, s * 0.48, s * 0.48, 0, s * 0.24, s * 0.26, matTop);
      addStudGrid(group, s * 0.96, hs, s * 0.48, 2, 1, matTop, 0, s * 0.26, true);
      return { group, isTool: false, flames };
    }

    // Core dark seam spine (visible in the 0.1 mm gaps between stacked sub-bricks)
    addBoxPart(group, s * 0.94, s * 0.94, s * 0.94, 0, 0, 0, seamMat);

    // Bottom course (y: -hs to -hs + 0.35*s): two 1×2 bricks side by side along X
    const c1H = s * 0.34;
    const c1Y = -hs + c1H / 2;
    addBoxPart(group, s * 0.485, c1H, s * 0.99, -s * 0.255, c1Y, 0, matA);
    addBoxPart(group, s * 0.485, c1H, s * 0.99, s * 0.255, c1Y, 0, matB);

    // Middle course (y: -hs + 0.365*s to -hs + 0.715*s): two 2×1 bricks staggered along Z
    const c2H = s * 0.34;
    const c2Y = -hs + s * 0.365 + c2H / 2;
    addBoxPart(group, s * 0.99, c2H, s * 0.485, 0, c2Y, -s * 0.255, matC);
    addBoxPart(group, s * 0.99, c2H, s * 0.485, 0, c2Y, s * 0.255, matA);

    // Top course (y: hs - 0.265*s to hs): 2×2 LEGO plate + 4 bevelled hollow studs
    const c3H = s * 0.265;
    const c3Y = hs - c3H / 2;
    addBoxPart(group, s * 1.0, c3H, s * 1.0, 0, c3Y, 0, matTop);
    addStudGrid(group, s * 0.96, hs, s * 0.96, 2, 2, matTop, 0, 0, true);

    // If this block is an Ore, add protruding 3D gemstone studs on the front/side faces!
    const oreCol =
      id === ID.CoalOre
        ? 0x1e2024
        : id === ID.IronOre
          ? 0xd8af93
          : id === ID.GoldOre
            ? 0xf5c518
            : id === ID.DiamondOre
              ? 0x4ef2f7
              : id === ID.EmeraldOre
                ? 0x2ed868
                : id === ID.RedOre
                  ? 0xe8241c
                  : id === ID.LapisOre
                    ? 0x2456d8
                    : id === ID.CopperOre
                      ? 0xd87238
                      : id === ID.TinOre
                        ? 0xc4d0dc
                        : id === ID.AmberOre
                          ? 0xf59818
                          : id === ID.ChromeOre
                            ? 0xdce6f2
                            : id === ID.SapphireOre
                              ? 0x2868f5
                              : 0;
    if (oreCol) {
      const oMat = skin(oreCol);
      for (const [ox, oy] of [[-0.045, 0.02], [0.042, -0.035], [0.01, 0.048]] as const) {
        const st = addCylPart(group, 0.018, 0.020, 0.018, ox, oy, -hs - 0.008, oMat, 8);
        st.rotation.x = Math.PI / 2;
      }
    }

    return { group, isTool: false, flames };
  }

  // Held 3D LEGO Item/Block gripped inside the first-person Minifig C-clamp hand
  const heldBrickGroup = new THREE.Group();
  let heldFlames: THREE.Object3D[] = [];
  let heldIsTool = false;
  let lastHeldId = -1;
  let lastHeldPlastic = !plasticOn;
  heldBrickGroup.position.set(-0.04, 0.04, -0.08);
  heldBrickGroup.rotation.set(0.18, -0.42, 0.08);
  viewBrick.add(heldBrickGroup);

  // v4.13 first-person LEGO minifig arm: hollow C-clip hand on a wrist pin, a
  // tapered sleeve with an elbow bend, and the upper arm running off-screen.
  // Built around the hand (origin) so the held-item placements stay valid.
  const fpsArmGroup = new THREE.Group();
  const fpsSeg = (a: THREE.Vector3, b: THREE.Vector3, ra: number, rb: number, mat: THREE.Material, seg = 18) => {
    const len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rb, ra, len, seg, 1), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    fpsArmGroup.add(m);
    return m;
  };
  const fpsJoint = (p: THREE.Vector3, r: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), mat);
    m.position.copy(p);
    fpsArmGroup.add(m);
    return m;
  };
  const fpsUpperArm: THREE.Object3D[] = []; // hidden while an item is held (see placeHeldMinecraft)
  // Minifig anatomy: the wrist pin enters the back of the C, the mouth opens along
  // the forearm (away from the elbow) and the bore runs across the arm — so a
  // tool handle passes straight through the hand.
  const fpsArmDir = new THREE.Vector3(0.25, -0.3, 0.92).normalize(); // hand → elbow (elbow is nearer the camera)
  const fpsBore = new THREE.Vector3(-0.35, 0.93, 0).addScaledVector(fpsArmDir, 0.366).normalize();
  fpsBore.addScaledVector(fpsArmDir, -fpsBore.dot(fpsArmDir)).normalize();
  {
    const dir = fpsArmDir;
    const wristA = dir.clone().multiplyScalar(0.062);
    const wristB = dir.clone().multiplyScalar(0.112);
    const elbow = dir.clone().multiplyScalar(0.43);
    const shoulder = elbow.clone().add(new THREE.Vector3(0.2, -0.36, 0.18));
    fpsSeg(wristA, wristB, 0.036, 0.04, fpsSkinMat); // wrist pin
    fpsSeg(wristB.clone().addScaledVector(dir, -0.012), elbow, 0.066, 0.079, fpsSleeveMat); // forearm sleeve
    // Moulded sleeve rim where the hand pin plugs in
    const rim = fpsSeg(wristB.clone().addScaledVector(dir, -0.014), wristB.clone().addScaledVector(dir, 0.012), 0.069, 0.069, fpsSleeveMat);
    rim.scale.set(1.04, 1, 1.04);
    fpsUpperArm.push(fpsJoint(elbow, 0.079, fpsSleeveMat));
    fpsUpperArm.push(fpsSeg(elbow, shoulder, 0.079, 0.088, fpsSleeveMat)); // upper arm, mostly off-screen
  }
  // The hand: a real C-clip, mouth turned up-and-in so the held item sits in the bore.
  const fpsClaw = new THREE.Group();
  {
    const zMouth = fpsArmDir.clone().negate();
    const xAxis = new THREE.Vector3().crossVectors(fpsBore, zMouth).normalize();
    fpsClaw.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, fpsBore, zMouth));
  }
  const clawOuter = new THREE.Mesh(geoClaw(0.074, 0.084), fpsSkinMat);
  fpsClaw.add(clawOuter);
  fpsArmGroup.add(fpsClaw);
  fpsArmGroup.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = false;
      m.receiveShadow = false;
    }
  });
  viewBrick.add(fpsArmGroup);

  // Viewmodel animation state (renderCamera).
  const thirdAim = { ok: false, x: 0, y: 0, z: 0, back: 0 };
  // v4.17: the arm is rolled/turned so a tool's head leans up-LEFT toward the
  // crosshair and the hand sits lower right (Minecraft first-person logic),
  // picked from staged phone-rig photos (rx/ry/rz = base rotation).
  const vmBase = { x: 0.175, y: -0.105, z: -0.25, s: 0.56, block: 0.58, tool: 0.78, toolSpin: 0.35, rx: -0.1, ry: -0.1, rz: -0.3, lean: -0.45, grip: 0.1, mcTilt: 54, mcDepth: 15, mcTwist: 0 };
  // v4.17 held-item poses (viewBrick space), Minecraft logic: a block sits IN
  // the hand turned 45° (you see two faces and the top), a small item is held
  // flat in the clip, tools pass through the bore. Tunable by the QA hook.
  const heldPose = {
    bx: 0, by: -0.005, bz: -0.035, brx: 0.32, bry: -0.785, brz: 0.06, bs: 0.5,
    ix: 0, iy: 0, iz: -0.03, irx: 0.5, iry: -0.6, irz: 0.15, is: 0.62,
  };
  // ── v4.17 HELD ITEMS = MINECRAFT'S EXACT FIRST-PERSON CHAIN (Claude, after
  // Philippe 2026-10-28 10:07: « va checker Minecraft … les objets doivent
  // être alignés avec les mains, pas tout croche »). Vanilla, right hand:
  //   ItemInHandRenderer.applyItemArmTransform: translate(0.56, -0.52, -0.72)
  //   then the model's display transform firstperson_righthand:
  //     item/handheld + item/generated: rotation [0,-90,25], translation
  //       [1.13, 3.2, 1.13]/16, scale 0.68   (block: rotation [0,45,0], scale 0.40)
  //   applied as T · R(XYZ) · S, then the model drawn from (-0.5,-0.5,-0.5)
  //   in its 16-px sprite space (a tool sprite runs bottom-left -> top-right).
  // Our tools are 3D (handle along +Y), so each model is first mapped into
  // that sprite space (shaft on the sprite diagonal), then the vanilla chain
  // places it. THE HAND IS DERIVED FROM THE ITEM: the C-clip is put on the
  // handle with its bore ALONG the handle and the arm leaving toward the
  // lower right — so item and hand are aligned by construction (before, the
  // item was oriented on its own and stuck to a fixed hand: crossing at an
  // angle). The whole chain is scaled by MC_K about the eye: identical on
  // screen (perspective), but everything stays within ~0.35 of the eye so it
  // never pokes into walls (the viewmodel shares the world depth buffer).
  const MC_K = 0.4;
  const X_AXIS = new THREE.Vector3(1, 0, 0), Y_AXIS = new THREE.Vector3(0, 1, 0), Z_AXIS = new THREE.Vector3(0, 0, 1);
  const MC_ANCHOR = new THREE.Vector3(0.56, -0.52, -0.72);
  // StudCraft framing on top of the vanilla chain: our 3D LEGO items are much
  // chunkier than flat sprites, and the minifig hand must stay ON screen
  // holding them (vanilla hides the arm when an item is held). So the item is
  // shrunk about its grip point (angles untouched) and the arm anchor is
  // nudged up-left. Picked from phone-rig photos; QA hook setMcHeld.
  const mcTune = { size: 0.5, ax: 0.44, ay: -0.34, az: -0.72, bsize: 0.5, isize: 0.3, bx: 0.32, by: 0.0, bz: -0.72 };
  let heldKind = 0; // 0 tool, 1 block / small item
  const ARM_SCALE = 0.56 / MC_K; // the minifig arm keeps its old on-screen size
  const mcDisplay = (rot: [number, number, number], tr16: [number, number, number], sc: number) =>
    new THREE.Matrix4()
      .makeTranslation(tr16[0] / 16, tr16[1] / 16, tr16[2] / 16)
      .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(rot[0]), THREE.MathUtils.degToRad(rot[1]), THREE.MathUtils.degToRad(rot[2]), "XYZ")))
      .multiply(new THREE.Matrix4().makeScale(sc, sc, sc))
      .multiply(new THREE.Matrix4().makeTranslation(-0.5, -0.5, -0.5));
  const MC_HANDHELD = mcDisplay([0, -90, 25], [1.13, 3.2, 1.13], 0.68);
  const MC_BLOCK = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(45)).multiply(new THREE.Matrix4().makeScale(0.4, 0.4, 0.4));
  // the empty-hand pose (unchanged on screen): the old camera-space arm
  // transform expressed in the new MC anchor space
  const armRest = new THREE.Matrix4()
    .makeTranslation(MC_ANCHOR.x * MC_K, MC_ANCHOR.y * MC_K, MC_ANCHOR.z * MC_K)
    .multiply(new THREE.Matrix4().makeScale(MC_K, MC_K, MC_K))
    .invert()
    .multiply(new THREE.Matrix4().makeTranslation(0.175, -0.105, -0.25))
    .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-0.1, -0.1, -0.3, "XYZ")))
    .multiply(new THREE.Matrix4().makeScale(0.56, 0.56, 0.56));
  const clawRest = fpsClaw.quaternion.clone();
  const heldBase = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
  function restArm() {
    for (const o of fpsUpperArm) o.visible = true;
    fpsArmGroup.matrix.copy(armRest);
    fpsArmGroup.matrix.decompose(fpsArmGroup.position, fpsArmGroup.quaternion, fpsArmGroup.scale);
  }
  /** put the C-clip at `grip` (anchor space) with its bore along `bore` and its
   *  mouth toward `mouth`; the arm leaves opposite the mouth */
  function placeArm(grip: THREE.Vector3, bore: THREE.Vector3, mouth: THREE.Vector3, scale: number) {
    const y = bore.clone().normalize();
    const z = mouth.clone().addScaledVector(y, -mouth.dot(y)).normalize();
    const x = new THREE.Vector3().crossVectors(y, z).normalize();
    const want = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    fpsArmGroup.quaternion.copy(want).multiply(clawRest.clone().invert());
    fpsArmGroup.scale.setScalar(scale);
    fpsArmGroup.position.copy(grip); // the claw sits at the arm group's origin
  }
  restArm();
  const ARM_OUT = new THREE.Vector3(0.42, -0.62, 0.66).normalize(); // toward the lower-right corner, back toward the eye
  function placeHeldMinecraft(id: number, model: THREE.Object3D, isTool: boolean) {
    // with an item, only the hand + forearm show: the vanilla swing pivots at
    // the shoulder anchor and would sweep the upper arm across the screen
    for (const o of fpsUpperArm) o.visible = false;
    model.removeFromParent(); // measure the model in its own frame
    model.position.set(0, 0, 0);
    viewBrick.add(heldBrickGroup);
    heldBrickGroup.position.set(0, 0, 0);
    heldBrickGroup.quaternion.identity();
    heldBrickGroup.scale.setScalar(1);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const d = def(id);
    let M: THREE.Matrix4;
    if (TECHNIC_SET.has(id)) {
      // Technic parts (Philippe, 2026-10-29): buildLegoItem3D already
      // applied the PROPORTIONAL per-module scale, so this pipeline
      // factor is a CONSTANT — never divide by maxDim here, that is what
      // used to crush every part to the same held size. And the minifig
      // hand GRIPS the part: the clip closes on the part's body along
      // its long axis, like a tool handle — the part is held BY the
      // hand, never perched on top of it.
      const f = (11 / 16) / 0.32;
      M = MC_HANDHELD.clone()
        .multiply(new THREE.Matrix4().makeTranslation(0.5, 0.5, 0.5))
        .multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2))
        .multiply(new THREE.Matrix4().makeScale(f, f, f))
        .multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
      const longAxis = size.x >= size.y && size.x >= size.z ? new THREE.Vector3(1, 0, 0) : size.y >= size.z ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
      const grip = new THREE.Vector3(c.x, box.min.y + size.y * 0.35, c.z).applyMatrix4(M);
      const shaft = longAxis.transformDirection(M);
      const mouthT = ARM_OUT.clone().negate();
      placeArm(grip, shaft, mouthT, ARM_SCALE * 0.82);
    } else if (isTool) {
      const len = Math.max(1e-3, size.y);
      const upright = id === ID.Torch || id === ID.RedTorch || id === ID.RedTorchOn;
      // model -> sprite space: handle end at the sprite's bottom-left, shaft on the diagonal (torches stand upright)
      const f = (upright ? 13 / 16 : 15.5 / 16 * Math.SQRT2 * 0.84) / len;
      const sprite = new THREE.Matrix4()
        .makeTranslation(upright ? 0.5 : 2 / 16, 1.5 / 16, 0.5)
        .multiply(new THREE.Matrix4().makeRotationZ(upright ? -Math.PI / 6 : -Math.PI / 4)) // a torch leans 30°, tools sit on the diagonal
        .multiply(new THREE.Matrix4().makeScale(f, f, f))
        .multiply(new THREE.Matrix4().makeTranslation(-c.x, -box.min.y, -c.z));
      M = MC_HANDHELD.clone().multiply(sprite);
      const grip = new THREE.Vector3(c.x, box.min.y + len * (d.tool === "sword" ? 0.1 : 0.16), c.z).applyMatrix4(M);
      const shaft = new THREE.Vector3(0, 1, 0).transformDirection(M);
      const mouth = ARM_OUT.clone().negate();
      // clip bore sized to the handle: the minifig hand closes on it
      placeArm(grip, shaft, mouth, ARM_SCALE * 0.82);
    } else {
      // blocks: vanilla block display; small items: vanilla generated display
      const maxDim = Math.max(size.x, size.y, size.z, 1e-3);
      if (d.placeable) {
        M = MC_BLOCK.clone().multiply(new THREE.Matrix4().makeScale(1 / maxDim, 1 / maxDim, 1 / maxDim)).multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
      } else {
        const f = 11 / 16 / maxDim;
        M = MC_HANDHELD.clone()
          .multiply(new THREE.Matrix4().makeTranslation(0.5, 0.5, 0.5))
          .multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)) // our 3D item faces the camera like the sprite does
          .multiply(new THREE.Matrix4().makeScale(f, f, f))
          .multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
      }
      // the hand holds it from below: clip under the bottom, bore along an edge, mouth up
      const bottom = new THREE.Vector3(c.x, box.min.y, c.z).applyMatrix4(M);
      const edge = new THREE.Vector3(1, 0, 0).transformDirection(M);
      const up = new THREE.Vector3(0, 1, 0).transformDirection(M);
      const mouth = up.clone().multiplyScalar(1).addScaledVector(ARM_OUT, -0.35);
      const sz0 = d.placeable ? mcTune.bsize : mcTune.isize;
      const clawR = 0.084 * ARM_SCALE * 0.82 * Math.max(0.75, sz0) / sz0; // in item space (before the shrink)
      placeArm(bottom.addScaledVector(up, -clawR * 0.9), edge, mouth, ARM_SCALE * 0.82);
    }
    M.decompose(heldBrickGroup.position, heldBrickGroup.quaternion, heldBrickGroup.scale);
    heldBrickGroup.add(model);
    // shrink item AND hand about the clip (keeps them aligned)
    heldKind = isTool ? 0 : 1;
    const sz = isTool ? mcTune.size : d.placeable ? mcTune.bsize : mcTune.isize;
    const pivot = fpsArmGroup.position.clone();
    heldBrickGroup.position.sub(pivot).multiplyScalar(sz).add(pivot);
    heldBrickGroup.scale.multiplyScalar(sz);
    heldBase.pos.copy(heldBrickGroup.position);
    heldBase.quat.copy(heldBrickGroup.quaternion);
    fpsArmGroup.scale.multiplyScalar(Math.max(0.75, sz)); // the hand shrinks less: it must still read as a hand
  }
  const vm = { equip: 1, land: 0, swayX: 0, swayY: 0, lastYaw: 0, lastPitch: 0, wasGrounded: true, fallV: 0, sprint: 0, place: 0 };
  const _identityQ = new THREE.Quaternion();

  // Positioned at z = -0.27 with scale 0.56 so all 3D parts stay > camera.near (0.08) and < player HW (0.34)
  // while using full hardware Z-buffer depth testing for crisp 3D self-occlusion!
  viewBrick.scale.setScalar(0.56);
  viewBrick.position.set(0.20, -0.16, -0.27);
  camera.add(viewBrick);

  const fig = makeMinifig();
  // Minecraft proportions: the player character is exactly 1.8 blocks tall
  // (the raw minifig measures 1.29 — Philippe, 2026-10-28).
  {
    const fb = new THREE.Box3().setFromObject(fig.group);
    const fh = fb.max.y - fb.min.y;
    if (fh > 0.05) fig.group.scale.setScalar(1.8 / fh);
  }
  const figHeldGroup = new THREE.Group();
  figHeldGroup.position.set(-0.08, -0.58, -0.10);
  fig.armR.add(figHeldGroup);
  fig.group.visible = false;
  if (plasticOn) {
    fig.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && !mesh.userData.noShadow) mesh.castShadow = true;
    });
  }
  scene.add(fig.group);

  let figArmorKey = "";
  const figHelmGrp = new THREE.Group();
  const figChestGrp = new THREE.Group();
  const figLegsGrpL = new THREE.Group();
  const figLegsGrpR = new THREE.Group();
  (fig.group.userData.head ?? fig.group).add(figHelmGrp);
  fig.group.add(figChestGrp);
  fig.legL.add(figLegsGrpL);
  fig.legR.add(figLegsGrpR);

  function armorHex(id: number): number {
    if (id === ID.HelmLeather || id === ID.ChestLeather || id === ID.LegsLeather || id === ID.BootsLeather) return 0x8d542c;
    if (id === ID.HelmIron || id === ID.ChestIron || id === ID.LegsIron || id === ID.BootsIron) return 0xc8d0d8;
    if (id === ID.HelmGold || id === ID.ChestGold || id === ID.LegsGold || id === ID.BootsGold) return 0xf5c518;
    if (id === ID.HelmCrystal || id === ID.ChestCrystal || id === ID.LegsCrystal || id === ID.BootsCrystal) return 0x3ed8e8;
    if (id === ID.HelmNetherite || id === ID.ChestNetherite || id === ID.LegsNetherite || id === ID.BootsNetherite) return 0x383238;
    return 0;
  }

  function updateFigArmor() {
    const key = `${armor[0]}:${armor[1]}:${armor[2]}:${armor[3]}`;
    if (key === figArmorKey) return;
    figArmorKey = key;
    for (const grp of [figHelmGrp, figChestGrp, figLegsGrpL, figLegsGrpR]) {
      while (grp.children.length > 0) grp.remove(grp.children[0]);
    }
    if (armor[0]) {
      const m = skin(armorHex(armor[0]));
      const trim = skin(shiftHex(armorHex(armor[0]), 0.72));
      const dome = new THREE.Mesh(geoCyl(0.175, 0.16, 14), m);
      dome.position.set(0, 0.12, 0);
      const visor = new THREE.Mesh(geoBox(0.32, 0.055, 0.24), trim);
      visor.position.set(0, 0.09, -0.06);
      const crest = new THREE.Mesh(geoBox(0.06, 0.06, 0.28), trim);
      crest.position.set(0, 0.21, 0);
      figHelmGrp.add(dome, visor, crest);
    }
    if (armor[1]) {
      const m = skin(armorHex(armor[1]));
      const trim = skin(shiftHex(armorHex(armor[1]), 0.75));
      const plate = new THREE.Mesh(geoTrap(0.39, 0.46, 0.36, 0.265), m);
      plate.position.set(0, 0.74, 0);
      const pauldronL = new THREE.Mesh(geoBox(0.14, 0.11, 0.28), trim);
      pauldronL.position.set(-0.23, 0.89, 0);
      const pauldronR = new THREE.Mesh(geoBox(0.14, 0.11, 0.28), trim);
      pauldronR.position.set(0.23, 0.89, 0);
      figChestGrp.add(plate, pauldronL, pauldronR);
    }
    if (armor[2]) {
      const m = skin(armorHex(armor[2]));
      const cuisseL = new THREE.Mesh(geoBox(0.168, 0.22, 0.198), m);
      cuisseL.position.set(0, -0.14, 0);
      const cuisseR = new THREE.Mesh(geoBox(0.168, 0.22, 0.198), m);
      cuisseR.position.set(0, -0.14, 0);
      figLegsGrpL.add(cuisseL);
      figLegsGrpR.add(cuisseR);
    }
    if (armor[3]) {
      const m = skin(armorHex(armor[3]));
      const bootL = new THREE.Mesh(geoBox(0.172, 0.11, 0.24), m);
      bootL.position.set(0, -0.365, -0.02);
      const bootR = new THREE.Mesh(geoBox(0.172, 0.11, 0.24), m);
      bootR.position.set(0, -0.365, -0.02);
      figLegsGrpL.add(bootL);
      figLegsGrpR.add(bootR);
    }
  }

  type Mob = {
    burn?: number;
    burnAcc?: number;
    slowT?: number;
    byPlayerT?: number;
    name?: string;
    mad?: boolean;
    tpT?: number;
    convT?: number;
    kind: "sheep" | "creeper" | "cow" | "walker" | "pig" | "chicken" | "spider" | "skelly" | "villager" | "ghast" | "dragon" | "horse" | "phantom" | "piglin" | "boat" | "cart" | "frog" | "fox" | "crab" | "wisp" | "slime" | "wolf" | "golem" | "wither" | "enderman" | "blaze" | "witch" | "bee" | "cat" | "squid" | "bat" | "drowned" | "husk" | "stray" | "goat" | "axolotl" | "parrot" | "guardian" | "shulker" | "pillager" | "vindicator" | "evoker" | "vex" | "ravager";
    x: number;
    y: number;
    z: number;
    yaw: number;
    hp: number;
    wander: number;
    fuse: number;
    cool: number;
    dead: boolean;
    mesh: THREE.Group;
    legs: THREE.Object3D[];
    bodyMat?: THREE.MeshLambertMaterial | THREE.MeshStandardMaterial;
    love?: number;
    baby?: number;
    sheared?: number;
    tame?: boolean;
    lead?: boolean;
    role?: string;
    homeX?: number;
    homeZ?: number;
    roam?: boolean;
    size?: number;
    charged?: boolean;
    path?: { x: number; z: number }[] | null;
    pathI?: number;
    pathT?: number;
    phase?: number;
    tickAcc?: number;
    // v4.12 render interpolation: position at the previous AI tick.
    px?: number;
    py?: number;
    pz?: number;
    shadowT?: number;
    mode?: string;
    modeT?: number;
    bossT?: number;
    spawnT?: number;
    biteT?: number;
    shield?: boolean;
    phaseN?: number;
    maxHp?: number;
    captain?: boolean;
    raidMob?: boolean;
    summoned?: boolean;
    fangX?: number;
    fangZ?: number;
    hitCd?: number;
    // v4.0 presentation state (never saved)
    vis?: MobVis;
  };
  type MobVis = {
    lastHp: number;
    hpMax: number;
    hurtT: number;
    barT: number;
    kx: number;
    kz: number;
    gait: number;
    amp: number;
    lx: number;
    lz: number;
    h: number;
    mats: { mat: THREE.MeshStandardMaterial | THREE.MeshLambertMaterial; base: number }[];
    matsFor: THREE.Object3D | null;
    blob: THREE.Mesh | null;
    bar: { bg: THREE.Sprite; fill: THREE.Sprite } | null;
  };
  const mobs: Mob[] = [];
  const mobBatchRenderer = new MobBatchRenderer(scene, (hex, opts) => skin(hex, opts));
  const corpses: { mesh: THREE.Object3D; t: number; x: number; y: number; z: number; mats: THREE.Material[] }[] = [];
  // Flying and swimming kinds animate on a clock; walkers animate by distance covered.
  const FLYERS = new Set(["ghast", "phantom", "bat", "bee", "vex", "blaze", "dragon", "wither", "parrot", "wisp", "squid", "guardian"]);
  const BOSSES = new Set(["dragon", "wither"]);
  const blobGeo = new THREE.CircleGeometry(0.5, 20);
  const blobMat = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    if (g) {
      const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
      grad.addColorStop(0, "rgba(0,0,0,0.55)");
      grad.addColorStop(0.55, "rgba(0,0,0,0.28)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  })();
  const barBgMat = new THREE.SpriteMaterial({ color: 0x120c08, transparent: true, opacity: 0.78, depthWrite: false });
  const barMats = {
    hi: new THREE.SpriteMaterial({ color: 0x5bd16a, depthWrite: false }),
    mid: new THREE.SpriteMaterial({ color: 0xf5c518, depthWrite: false }),
    lo: new THREE.SpriteMaterial({ color: 0xe23b2f, depthWrite: false }),
  };
  const tmpBox = new THREE.Box3();

  function collectMats(m: Mob, v: MobVis) {
    v.mats = [];
    const seen = new Set<THREE.Material>();
    m.mesh.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || mesh === v.blob) return;
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of list) {
        if (seen.has(mat)) continue;
        seen.add(mat);
        const std = mat as THREE.MeshStandardMaterial;
        if (std.emissive) v.mats.push({ mat: std, base: std.emissive.getHex() });
      }
    });
    v.matsFor = m.mesh;
  }

  function visOf(m: Mob): MobVis {
    if (m.vis) return m.vis;
    tmpBox.setFromObject(m.mesh);
    const h = Number.isFinite(tmpBox.max.y) ? Math.max(0.4, tmpBox.max.y - m.mesh.position.y) : 1.2;
    const w = Number.isFinite(tmpBox.max.x) ? Math.max(tmpBox.max.x - tmpBox.min.x, tmpBox.max.z - tmpBox.min.z) : 0.8;
    const v: MobVis = { lastHp: m.hp, hpMax: Math.max(1, m.maxHp ?? m.hp), hurtT: 0, barT: 0, kx: 0, kz: 0, gait: m.phase ?? 0, amp: 0, lx: m.x, lz: m.z, h, mats: [], matsFor: null, blob: null, bar: null };
    if (!FLYERS.has(m.kind) && m.kind !== "boat" && m.kind !== "cart") {
      const blob = new THREE.Mesh(blobGeo, blobMat);
      blob.rotation.x = -Math.PI / 2;
      const sc = Math.min(2.6, Math.max(0.55, w * 0.95)) / (m.mesh.scale.x || 1);
      blob.scale.set(sc, sc, 1);
      blob.position.y = 0.012;
      blob.renderOrder = 1;
      blob.castShadow = blob.receiveShadow = false;
      blob.userData.noShadow = true;
      m.mesh.add(blob);
      v.blob = blob;
    }
    m.vis = v;
    return v;
  }

  /** Knockback as a short, collision-checked slide instead of a teleport. */
  function shove(m: Mob, dirX: number, dirZ: number, power: number) {
    const v = visOf(m);
    const l = Math.hypot(dirX, dirZ) || 1;
    v.kx += (dirX / l) * power * 7;
    v.kz += (dirZ / l) * power * 7;
  }

  function dropBar(v: MobVis) {
    if (!v.bar) return;
    scene.remove(v.bar.bg, v.bar.fill);
    v.bar = null;
  }

  function mobVisuals(m: Mob, dt: number, bounce: number) {
    const v = visOf(m);
    if (v.matsFor !== m.mesh) collectMats(m, v);
    // Damage taken since last frame → flash, show the health bar.
    if (m.hp < v.lastHp - 0.45) {
      v.hurtT = 0.3;
      if (!BOSSES.has(m.kind)) v.barT = 4;
    }
    if (m.hp > v.hpMax) v.hpMax = m.hp;
    v.lastHp = m.hp;
    // Knockback slide with wall checks.
    if (Math.abs(v.kx) + Math.abs(v.kz) > 0.01) {
      const nx = m.x + v.kx * dt;
      const nz = m.z + v.kz * dt;
      const fy = Math.floor(m.y + 0.5);
      if (!solidAt(Math.floor(nx), fy, Math.floor(m.z)) && !solidAt(Math.floor(nx), fy + 1, Math.floor(m.z))) m.x = nx;
      else v.kx = 0;
      if (!solidAt(Math.floor(m.x), fy, Math.floor(nz)) && !solidAt(Math.floor(m.x), fy + 1, Math.floor(nz))) m.z = nz;
      else v.kz = 0;
      const k = Math.exp(-9 * dt);
      v.kx *= k;
      v.kz *= k;
    }
    // Gait: legs swing with distance travelled, so idle mobs stand still.
    // v4.12: measured on the RENDERED position, so interpolated far mobs
    // swing their legs with the glide instead of chopping at the tick rate.
    const moved = Math.hypot(m.mesh.position.x - v.lx, m.mesh.position.z - v.lz);
    v.lx = m.mesh.position.x;
    v.lz = m.mesh.position.z;
    const dxCam = m.x - camera.position.x;
    const dzCam = m.z - camera.position.z;
    const camDistSq = dxCam * dxCam + dzCam * dzCam;
    // Frustum culling for limb/head animations when mob is behind camera (> 6m away)
    if (camDistSq > 36 && v.hurtT <= 0 && v.barT <= 0) {
      const fwdX = -Math.sin(camera.rotation.y);
      const fwdZ = -Math.cos(camera.rotation.y);
      if (dxCam * fwdX + dzCam * fwdZ < -2.5) return;
    }
    const flyer = FLYERS.has(m.kind);
    if (flyer || m.kind === "slime" || m.kind === "frog") {
      v.gait = elapsed * (m.kind === "slime" ? 6 : 8) + (m.phase ?? 0);
      v.amp = 1;
    } else if (moved < 1.5) {
      v.gait += moved * 3.3;
      const speed = dt > 0 ? moved / dt : 0;
      v.amp += (Math.min(1, speed / 2.6) - v.amp) * Math.min(1, dt * 10);
    }
    const stride = Math.sin(v.gait);
    const idle = Math.sin(elapsed * 1.7 + (m.phase ?? 0)) * 0.05 * (1 - v.amp);
    const zombiePose = m.kind === "walker" || m.kind === "husk" || m.kind === "drowned";
    for (let i = 0; i < m.legs.length; i++) {
      const part = m.legs[i];
      if (!part) continue;
      const arm = i >= 2;
      if (arm && zombiePose) {
        part.rotation.x = -1.25 + stride * (i % 2 === 0 ? 0.18 : -0.18) * v.amp + idle * 1.5;
      } else {
        part.rotation.x = stride * (i % 2 === 0 ? 0.62 : -0.62) * v.amp + (arm ? idle : 0);
      }
    }
    // Articulated LEGO Head Tracking & Dynamic Creature Parts
    const ud = m.mesh.userData;
    if (ud.collar) ud.collar.visible = !!m.tame;
    if (ud.head && camDistSq < 576) {
      const head = ud.head as THREE.Object3D;
      let targetYaw = Math.sin(elapsed * 0.9 + (m.phase ?? 0) * 2.3) * 0.22 * (1 - v.amp * 0.6);
      let targetPitch = Math.cos(elapsed * 0.7 + (m.phase ?? 0)) * 0.06;
      if (camDistSq < 110) {
        const toPlayerYaw = Math.atan2(m.x - player.x, m.z - player.z);
        let relYaw = toPlayerYaw - m.yaw;
        while (relYaw > Math.PI) relYaw -= Math.PI * 2;
        while (relYaw < -Math.PI) relYaw += Math.PI * 2;
        if (Math.abs(relYaw) < 1.35) {
          targetYaw = THREE.MathUtils.clamp(relYaw, -0.78, 0.78);
          const dy = (player.y + 1.4) - (m.y + v.h * 0.8);
          const dist2d = Math.max(0.5, Math.sqrt(camDistSq));
          targetPitch = THREE.MathUtils.clamp(-Math.atan2(dy, dist2d) * 0.65, -0.42, 0.42);
        }
      }
      if (m.kind === "goat" && (m.mode === "aim" || m.mode === "charge")) {
        targetPitch = 0.55;
      } else if ((m.kind === "sheep" || m.kind === "cow") && v.amp < 0.08 && Math.sin(elapsed * 0.45 + (m.phase ?? 0)) > 0.65) {
        targetPitch = 0.42; // Grazing grass animation
      }
      const lerpK = Math.min(1, dt * 8);
      head.rotation.y += (targetYaw - head.rotation.y) * lerpK;
      head.rotation.x += (targetPitch - head.rotation.x) * lerpK;
    }
    if (ud.tail && camDistSq < 400) {
      const tail = ud.tail as THREE.Object3D;
      const wagSpeed = m.tame ? 9.5 : 4.2;
      tail.rotation.y = Math.sin(elapsed * wagSpeed + (m.phase ?? 0)) * (m.tame ? 0.38 : 0.22 + v.amp * 0.25);
    }
    if (ud.throat && camDistSq < 256) {
      const throat = ud.throat as THREE.Object3D;
      const croak = Math.max(0, Math.sin(elapsed * 3.2 + (m.phase ?? 0) * 3));
      throat.scale.setScalar(1 + croak * 0.38);
    }
    if (ud.topShell && camDistSq < 400) {
      const topShell = ud.topShell as THREE.Object3D;
      const peek = camDistSq < 196 ? 0.22 + Math.sin(elapsed * 2.4 + (m.phase ?? 0)) * 0.06 : 0;
      topShell.position.y += ((0.73 + peek) - topShell.position.y) * Math.min(1, dt * 6);
      topShell.rotation.y = peek > 0.02 ? elapsed * 0.9 : 0;
    }
    // Hurt flash: hot red on every plastic part, fading out.
    if (v.hurtT > 0) {
      v.hurtT = Math.max(0, v.hurtT - dt);
      const k = v.hurtT / 0.3;
      const r = Math.round(0xb0 * k);
      const g = Math.round(0x14 * k);
      for (const e of v.mats) e.mat.emissive.setRGB(r / 255, g / 255, g / 255);
      if (v.hurtT === 0) {
        for (const e of v.mats) {
          const keepCharge = m.kind === "creeper" && m.charged && e.mat === m.bodyMat;
          e.mat.emissive.setHex(keepCharge ? 0x7ee0ff : e.base);
        }
      }
      // Recoil squash on the first frames of a hit.
      const sq = 1 - 0.08 * Math.sin(Math.min(1, (0.3 - v.hurtT) / 0.15) * Math.PI);
      const base = m.size && m.kind === "slime" ? m.size : m.baby && m.baby > 0 ? 0.45 : 1;
      m.mesh.scale.set(base * (2 - sq), base * sq, base * (2 - sq));
    } else if (m.mesh.scale.y !== m.mesh.scale.x) {
      m.mesh.scale.y = m.mesh.scale.x;
    }
    // Keep the contact shadow on the ground while the body bounces.
    if (v.blob) v.blob.position.y = 0.012 - bounce / (m.mesh.scale.y || 1);
    // Floating health bar after a hit.
    if (v.barT > 0) {
      v.barT -= dt;
      if (!v.bar) {
        const bg = new THREE.Sprite(barBgMat);
        const fill = new THREE.Sprite(barMats.hi);
        bg.center.set(0.5, 0.5);
        fill.center.set(0, 0.5);
        bg.renderOrder = 5;
        fill.renderOrder = 6;
        scene.add(bg, fill);
        v.bar = { bg, fill };
      }
      const frac = Math.max(0, Math.min(1, m.hp / v.hpMax));
      // Shrink when close so a point-blank bar never covers the crosshair.
      const camD = Math.hypot(camera.position.x - m.x, camera.position.z - m.z);
      const W = 0.82 * Math.max(0.42, Math.min(1, camD / 4));
      const top = m.y + (settings.studs ? STUD_H : 0) + v.h * (m.mesh.scale.y || 1) + 0.32;
      v.bar.bg.position.set(m.x, top, m.z);
      v.bar.bg.scale.set(W + 0.06, 0.13 * (W / 0.82), 1);
      // Left-anchor the fill along the camera's right vector.
      const rx = Math.cos(camera.rotation.y);
      const rz = -Math.sin(camera.rotation.y);
      v.bar.fill.position.set(m.x - rx * (W / 2), top, m.z - rz * (W / 2));
      v.bar.fill.scale.set(Math.max(0.001, W * frac), 0.075 * (W / 0.82), 1);
      v.bar.fill.material = frac > 0.6 ? barMats.hi : frac > 0.3 ? barMats.mid : barMats.lo;
      const fade = Math.min(1, v.barT / 0.5);
      v.bar.bg.material.opacity = 0.78 * fade;
      v.bar.fill.visible = fade > 0.05;
      if (v.barT <= 0) dropBar(v);
    }
  }

  /** Death: the figure unclips into a physical LEGO Brick Ragdoll disassembly! */
  function topple(m: Mob) {
    const v = m.vis;
    if (v) {
      dropBar(v);
      if (v.blob) v.blob.visible = false;
    }
    // Extract actual ABS plastic colors from the mob's LEGO parts and launch tumbling 3D bricks & plates
    const colors: string[] = [];
    const mats: THREE.Material[] = [];
    m.mesh.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of list) {
        const std = mat as THREE.MeshStandardMaterial;
        if (std.color && colors.length < 16) colors.push("#" + std.color.getHexString());
        if (std.emissive) std.emissive.setHex(0x8a1010);
        mats.push(mat);
      }
    });
    spawnMobRagdoll(m.x, m.y + 0.45, m.z, colors.length ? colors : ["#e23b2f", "#1f5fbf", "#f3d37a"], 14);
    if (m.mesh.parent !== scene || reduceMotion) {
      scene.remove(m.mesh);
      return;
    }
    // Give each direct sub-assembly child of the mob a mechanical unclipping velocity so limbs/head separate
    for (const child of m.mesh.children) {
      if (child === v?.blob) continue;
      child.userData.ragVx = (Math.random() - 0.5) * 2.4;
      child.userData.ragVy = 1.2 + Math.random() * 2.2;
      child.userData.ragVz = (Math.random() - 0.5) * 2.4;
      child.userData.ragRx = (Math.random() - 0.5) * 7.5;
      child.userData.ragRz = (Math.random() - 0.5) * 7.5;
    }
    corpses.push({ mesh: m.mesh, t: 0, x: m.x, y: m.y, z: m.z, mats });
    if (corpses.length > 24) scene.remove(corpses.shift()!.mesh);
  }

  function tickCorpses(dt: number) {
    for (let i = corpses.length - 1; i >= 0; i--) {
      const c = corpses[i];
      c.t += dt;
      // Unclip and tumble individual LEGO limbs/bricks during death ragdoll
      for (const child of c.mesh.children) {
        if (child.userData.ragVy !== undefined) {
          child.userData.ragVy -= 11.5 * dt;
          child.position.x += child.userData.ragVx * dt;
          child.position.y = Math.max(0.08, child.position.y + child.userData.ragVy * dt);
          child.position.z += child.userData.ragVz * dt;
          if (child.position.y <= 0.085 && child.userData.ragVy < 0) {
            child.userData.ragVy = -child.userData.ragVy * 0.42;
            child.userData.ragVx *= 0.68;
            child.userData.ragVz *= 0.68;
          }
          child.rotation.x += child.userData.ragRx * dt;
          child.rotation.z += child.userData.ragRz * dt;
        }
      }
      const base = (c.mesh.userData.baseScale ??= c.mesh.scale.x) as number;
      if (c.t > 0.55) c.mesh.scale.setScalar(base * Math.max(0.001, 1 - (c.t - 0.55) / 0.3));
      if (c.t > 0.85) {
        scene.remove(c.mesh);
        corpses.splice(i, 1);
      }
    }
  }

  function wantsShadow(obj: THREE.Object3D) {
    let cur: THREE.Object3D | null = obj;
    while (cur) {
      if (cur.userData.keepShadow === false) return false;
      cur = cur.parent;
    }
    return settings.realistic;
  }

  function relight() {
    applyQuality();
    plasticOn = settings.realistic;
    renderer.toneMapping = settings.realistic ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    renderer.toneMappingExposure = settings.realistic ? 1.02 : 1;
    renderer.shadowMap.enabled = settings.realistic;
    scene.environment = settings.realistic ? envTex : null;
    scene.environmentIntensity = settings.realistic ? 0.36 : 1;
    sun.castShadow = settings.realistic;
    mobBatchRenderer.setShadows(settings.realistic, settings.realistic);
    opaqueMat = settings.realistic ? opaqueStd : opaqueLam;
    glassMat = settings.realistic ? glassStd : glassLam;
    waterMat = settings.realistic ? waterStd : waterLam;
    plantMat = settings.realistic ? plantStd : plantLam;
    moltenMat = settings.realistic ? moltenStd : moltenLam;
    for (const mesh of brickMeshes.values()) {
      mesh.material = opaqueMat;
      mesh.castShadow = settings.realistic;
      mesh.receiveShadow = settings.realistic;
    }
    for (const [k, list] of meshes.entries()) {
      const tier = chunkTier.get(k) ?? 0;
      for (const mesh of list) {
        if (mesh.renderOrder === 2) mesh.material = glassMat;
        else if (mesh.renderOrder === 1) mesh.material = waterMat;
        else if (mesh.renderOrder === 3) mesh.material = plantMat;
        else if (mesh.renderOrder === 4) mesh.material = moltenMat;
        else mesh.material = opaqueMat;
        mesh.castShadow = settings.realistic && tier === 0 && (mesh.renderOrder === 0 || mesh.renderOrder === 4);
        mesh.receiveShadow = settings.realistic;
      }
    }
    const swapped = new Map<THREE.Material, THREE.Material>();
    const olds: THREE.Material[] = [];
    const convert = (mat: THREE.Material) => {
      const hit = swapped.get(mat);
      if (hit) return hit;
      const src = mat as THREE.MeshLambertMaterial & { isMeshStandardMaterial?: boolean };
      const std = (mat as unknown as THREE.MeshStandardMaterial).isMeshStandardMaterial;
      if (!src.color || src.map || (!src.isMeshLambertMaterial && !std)) return mat;
      if (settings.realistic && std) return mat;
      if (!settings.realistic && src.isMeshLambertMaterial) return mat;
      const next = skin(src.color.getHex(), {
        transparent: src.transparent,
        opacity: src.opacity,
        depthWrite: src.depthWrite,
        depthTest: src.depthTest,
        side: src.side,
      });
      if (src.emissive) next.emissive.copy(src.emissive);
      swapped.set(mat, next);
      olds.push(mat);
      return next;
    };
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material || Array.isArray(mesh.material)) return;
      if ((mesh.material as THREE.MeshLambertMaterial).map) return;
      mesh.material = convert(mesh.material);
      const cast = wantsShadow(mesh);
      mesh.castShadow = cast;
      mesh.receiveShadow = cast;
    });
    for (const mat of olds) mat.dispose();
    for (const mob of mobs) {
      mob.mesh.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.userData.skin === "body" && mesh.material && !Array.isArray(mesh.material)) {
          mob.bodyMat = mesh.material as THREE.MeshLambertMaterial;
        }
      });
      // Materials were swapped: the hurt-flash list must be rebuilt.
      if (mob.vis) {
        mob.vis.hurtT = 0;
        mob.vis.matsFor = null;
      }
    }
  }

  const MC_DAY_SECONDS = 1200; // Exact vanilla Minecraft day/night length: 20 minutes = 1,200 seconds = 24,000 ticks
  let worldDays = 1;
  let worldTime = 0.0416; // 07:00 AM morning
  let orbit = 0.4;
  let lookDx = 0;
  let lookDy = 0;
  let mouseMine = false;
  let mousePlace = false;
  let prevPlace = false;
  let prevJump = false;
  let mineTime = 0;
  let mineKey = "";
  let placeCool = 0;
  let stepTime = 0;
  let bob = 0;
  let bobAmp = 0; // v4.12: smoothed head-bob amplitude (see renderCamera)
  let swing = 0;
  let shake = 0;
  let flash = 0;
  let invuln = 0;
  let hurtAgo = 10;
  let saveWarned = 0;
  let beganAt = 0;
  let drownTick = 0;
  let saveDirty = false;
  let saveAcc = 0;
  let creeperAcc = 0;
  let walkerAcc = 0;
  let drownedAcc = 0;
  let sinceSleep = 0;
  let speedT = 0;
  let strengthT = 0;
  let regenT = 0;
  let fireResT = 0;
  let jumpT = 0;
  let gillT = 0;
  let invisT = 0;
  let poisonT = 0;
  let witherT = 0;
  let slowT = 0;
  let healAcc = 0;
  let mendAcc = 0;
  const frostIce = new Map<string, number>();
  let poisonAcc = 0;
  let witherAcc = 0;
  let fireT = 0;
  let realm = 0;
  let portalCd = 0;
  let realmsReady = false;
  let fishT = -1;
  let spawnerAcc = 0;
  let dragonUp = false;
  let cityGuarded = false;
  let won = false;
  let mount: Mob | null = null;
  let returnSpot = { x: 0, y: 80, z: 0 };
  let noteStep = 0;
  let plateKey = "";
  const fuses: { x: number; y: number; z: number; t: number }[] = [];
  type Shot = {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    friendly: boolean;
    mesh: THREE.Mesh;
    fire?: boolean;
    skull?: boolean;
    fromDragon?: boolean;
    pow?: number;
    flame?: boolean;
    punch?: number;
    trident?: boolean;
    pierce?: boolean;
    hitSet?: Set<Mob>;
    splash?: number;
  };
  const rockets: { mesh: THREE.Mesh; t: number; color: string; trail: number }[] = [];
  const shots: Shot[] = [];
  const breathZones: { x: number; y: number; z: number; t: number; puff: number; acc: number }[] = [];
  type Drop = { id: number; n: number; x: number; y: number; z: number; vy: number; mesh: THREE.Object3D };
  const drops: Drop[] = [];
  // v4.18 tree topples (Teardown gravity): a felled tree falls as ONE rigid
  // instanced group rotating about its cut base; on impact the lowest cells
  // shatter and the rest land as blocks or pickable drops.
  type Topple = {
    mesh: THREE.Mesh;
    cells: { dx: number; dy: number; dz: number; id: number }[];
    px: number; py: number; pz: number;
    axis: THREE.Vector3;
    angle: number; vel: number;
  };
  const topples: Topple[] = [];
  // The falling tree renders with the SAME stack as the standing world:
  // fallerGeo carries the per-face atlas tiles, opaqueMat is the live world
  // material (the sirenized MeshStandardMaterial in Realistic mode), and the
  // merged geometry writes the white color attribute opaqueStd requires
  // (vertexColors:true — the BUG-1 lesson). The old path (plain white Lambert
  // + flat per-instance colours) lost every texture and all the SRN shading
  // the moment the tree started to fall (Philippe, 2026-10-29).
  function toppleGeoFor(cells: { dx: number; dy: number; dz: number; id: number }[]) {
    const parts: THREE.BufferGeometry[] = [];
    for (const c of cells) {
      const part = fallerGeo(c.id).clone();
      part.translate(c.dx, c.dy + 0.5, c.dz);
      parts.push(part);
    }
    let vtx = 0;
    let idx = 0;
    for (const part of parts) {
      vtx += part.getAttribute("position").count;
      idx += part.getIndex()!.count;
    }
    const pos = new Float32Array(vtx * 3);
    const nor = new Float32Array(vtx * 3);
    const uvA = new Float32Array(vtx * 2);
    const col = new Float32Array(vtx * 3).fill(1);
    const index = new Uint32Array(idx);
    let vo = 0;
    let io = 0;
    for (const part of parts) {
      pos.set(part.getAttribute("position").array as Float32Array, vo * 3);
      nor.set(part.getAttribute("normal").array as Float32Array, vo * 3);
      uvA.set(part.getAttribute("uv").array as Float32Array, vo * 2);
      const pi = part.getIndex()!;
      for (let i = 0; i < pi.count; i++) index[io + i] = pi.getX(i) + vo;
      vo += part.getAttribute("position").count;
      io += pi.count;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uvA, 2));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(index, 1));
    return g;
  }
  let jumpTap = -10;
  let elapsed = 0;
  const tmp = new THREE.Color();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // A hold that opens a menu (crate, bench, kiln, inventory, pause…) never
  // gets its release: the touch HUD unmounts under the finger. Before this
  // fix the "place / use" hold stayed stuck ON, so closing the crate reused it
  // at once (re-opened) or kept placing blocks — menus "didn't work". Any
  // non-play phase now drops every hold, and the next press must start fresh.
  let holdLatch = false;
  function emit() {
    if (phase !== "play") {
      touch.mine = touch.place = touch.jump = false;
      mouseMine = mousePlace = false;
      holdLatch = true;
    }
    snapshot();
    listeners.forEach((fn) => fn());
  }

  function say(text: string, ms = 2200) {
    message = text;
    messageAt = performance.now();
    messageFor = ms;
    emit();
  }

  function persistSettings() {
    writeSettings({
      v: 3,
      sens: settings.sens,
      radius: settings.radius,
      sound: settings.sound,
      studs: settings.studs,
      realistic: settings.realistic,
      quality: settings.quality,
      third: settings.third,
      upscale: settings.upscale,
      sharpness: settings.sharpness,
      fov: settings.fov,
      showFps: settings.showFps,
      music: settings.music,
      sfx: settings.sfx,
      haptics: settings.haptics,
      invertY: settings.invertY,
      deadL: settings.deadL,
      deadR: settings.deadR,
      adaptive: settings.adaptive,
      mods: { ...settings.mods },
    });
  }

  const pub = { phase: "title" as Phase, hasSave: hasSaveFlag };
  let foundCacheSize = -1;
  let gridCacheKey = "";
  let gridCacheOut: { id: number; n: number } | null = null;

  function snapshot() {
    hud.fps = fpsShown;
    hud.hotbar = hotbar.map((id) => ({ id, count: creative ? -1 : (inv[id] ?? 0) }));
    hud.offhand = offhand;
    hud.slot = slot;
    hud.health = health;
    hud.hunger = hunger;
    const needXp = xpNeed(rankLv);
    hud.xp = xp;
    hud.xpNeed = needXp;
    hud.level = rankLv;
    hud.rank = rankTitle(rankLv);
    hud.nextPerk = nextPerk(rankLv)?.name ?? "";
    // v4.18 perf diet: snapshot() runs ~8×/s — don't re-spread the catalogue
    // (hundreds of ids late-game) unless it actually grew.
    if (foundCacheSize !== found.size) { foundCacheSize = found.size; hud.found = [...found]; }
    hud.oxygen = oxygen;
    hud.rain = raining;
    hud.weather = wx;
    hud.armor = [...armor];
    hud.grid = [...grid];
    hud.cursor = cursor;
    hud.panel = panel;
    // v4.18 perf diet: the recipe match only changes when the grid does.
    const gridKey = panel + "|" + grid.join(",");
    if (gridKey !== gridCacheKey) {
      gridCacheKey = gridKey;
      const matched = matchGrid(grid, panel === "bench");
      gridCacheOut = matched && matched.out ? { id: matched.out, n: matched.n } : null;
    }
    hud.craftOut = gridCacheOut;
    const furn = furnaces.get(focus.x + "," + focus.y + "," + focus.z);
    hud.furnace = furn
      ? { in: furn.in, inN: furn.inN, fuel: furn.fuel, fuelN: furn.fuelN, out: furn.out, outN: furn.outN, cook: furn.cook / 5 }
      : { in: 0, inN: 0, fuel: 0, fuelN: 0, out: 0, outN: 0, cook: 0 };
    // v4.18 perf diet: the 27-slot chest map is only read by the chest panel.
    if (panel === "chest") {
      const bin = chests.get(focus.x + "," + focus.y + "," + focus.z);
      hud.chest = bin ? bin.ids.map((id, i) => ({ id, n: bin.ns[i] ?? 0 })) : Array.from({ length: 27 }, () => ({ id: 0, n: 0 }));
    }
    const dxs = spawnPoint.x - player.x;
    const dzs = spawnPoint.z - player.z;
    hud.compass = Math.atan2(-dxs, -dzs);
    hud.realm = realm === 1 ? "Nether" : realm === 2 ? "End" : "Overworld";
    const wyrm = mobs.find((m) => m.kind === "dragon" && !m.dead);
    const witherBoss = mobs.find((m) => m.kind === "wither" && !m.dead);
    hud.boss = wyrm ? "End Wyrm" : witherBoss ? "The Wither" : raid ? "Raid — wave " + raid.wave + " of 3" : "";
    hud.bossHp = wyrm
      ? Math.max(0, Math.min(1, wyrm.hp / (wyrm.maxHp ?? wyrm.hp)))
      : witherBoss
        ? Math.max(0, Math.min(1, witherBoss.hp / (witherBoss.maxHp ?? witherBoss.hp)))
      : raid && raid.total > 0
        ? Math.max(0, Math.min(1, mobs.filter((m) => m.raidMob && !m.dead).length / raid.total))
        : 0;
    hud.effect = [
      speedT > 0 ? "Dash" : "",
      strengthT > 0 ? "Might" : "",
      regenT > 0 ? "Regen" : "",
      fireResT > 0 ? "Ward" : "",
      jumpT > 0 ? "Leap" : "",
      gillT > 0 ? "Gill" : "",
      invisT > 0 ? "Veil" : "",
      poisonT > 0 ? "Venom" : "",
      witherT > 0 ? "Wither" : "",
      slowT > 0 ? "Tar" : "",
      fireT > 0 ? "Fire" : "",
      enchSummary(hotbar[slot]) ? "Rune" : "",
      omenT > 0 ? "Omen" : "",
      heroT > 0 ? "Hero" : "",
    ]
      .filter(Boolean)
      .join(" ");
    hud.heldEnch = enchSummary(hotbar[slot]);
    if (enchOffersState && (enchOffersState.itemId !== hotbar[slot] || panel !== "enchant")) enchOffersState = null;
    hud.enchOffers = enchOffersState ? { tier: enchOffersState.tier, offers: enchOffersState.offers } : null;
    if (panel === "enchant") {
      let shelves = 0;
      for (let dy = 0; dy <= 1; dy++) {
        for (let dz = -2; dz <= 2; dz++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dz)) !== 2) continue;
            if (world.get(focus.x + dx, focus.y + dy, focus.z + dz) === ID.Bookshelf) shelves++;
          }
        }
      }
      hud.bookshelves = Math.min(15, shelves);
    }
    hud.creative = creative;
    hud.flying = flying;
    hud.hammer = hammer;
    hud.x = player.x;
    hud.y = player.y;
    hud.z = player.z;
    hud.biome = world.biomeAt(player.x, player.z);
    hud.seed = seed;
    hud.seedText = seedText;
    hud.flash = flash;
    hud.message = performance.now() - messageAt > messageFor ? "" : message;
    hud.locked = document.pointerLockElement === canvas;
    hud.inv = { ...inv };
    hud.readyChunks = meshes.size;
    hud.flat = flat;
    hud.timeLabel = timeWord();
    hud.timeClock = formatClockTime(worldTime);
    hud.timeTicks = Math.floor(worldTime * 24000);
    hud.timeProgress = worldTime;
    hud.dayCount = worldDays;
    const trader = traderOf(traderRole);
    hud.trader = trader.name;
    hud.traderBlurb = trader.blurb;
    const tXp = tradeXp[traderRole] ?? 0;
    const tLv = tradeLevelFor(tXp);
    hud.traderLevel = TIER_NAMES[tLv];
    hud.netStatus = mp.connected ? "🌐 Room " + mp.room + " · " + (mp.peers.size + 1) + " online" : "";
    hud.traderNext = tLv >= 3 ? tXp + " trades · Master" : tXp + " trades · " + (TIER_XP[tLv] - tXp) + " to " + TIER_NAMES[tLv + 1];
    const tKey = curTraderKey();
    const tStocks = stockFor(tKey + ":" + traderRole);
    hud.reputation = repAtKey(tKey);
    hud.repWord = repWord(hud.reputation);
    hud.offers = trader.offers.map((o, oi) => ({
      pay: o.pay,
      pn: priceFor(o.pn, tKey),
      out: o.out,
      on: o.on,
      payName: def(o.pay).name.toLowerCase(),
      outName: def(o.out).name.toLowerCase(),
      tier: o.tier ?? 1,
      locked: (o.tier ?? 1) > tLv,
      stock: tStocks[oi] ?? 0,
    }));
    let alert = "";
    const isDoneQ = (id: string) => quests.find((p) => p.id === id)?.done ?? false;
    hud.quests = QUESTS.map((q) => {
      const prog = quests.find((p) => p.id === q.id) ?? { n: 0, done: false };
      const active = questActive(q, isDoneQ);
      let n = prog.n;
      let ready = !prog.done && active && n >= q.need;
      if (!prog.done && active && q.kind === "have") {
        const held = q.id === "gem" ? Math.max(inv[ID.Diamond] ?? 0, inv[ID.Prism] ?? 0) : (inv[q.what] ?? 0);
        n = Math.min(q.need, held);
        ready = held >= q.need;
      }
      if (ready && !alert) alert = q.name + " ready";
      const reward = q.reward.map(([id, count]) => count + " " + def(id).name.toLowerCase()).join(", ");
      const { step, steps } = chainStepOf(q);
      const chainDef = q.chain ? CHAINS[q.chain] : undefined;
      return { id: q.id, name: q.name, detail: q.detail, n, need: q.need, done: prog.done, ready, reward, chain: q.chain, chainName: chainDef?.name, from: chainDef?.from, step, steps, locked: !prog.done && !active };
    });
    hud.questAlert = alert;
    const readyQ = hud.quests.find((q) => q.ready);
    const openQ = hud.quests.find((q) => !q.done && !q.locked);
    hud.questTrack = readyQ ? readyQ.name + " · ready" : openQ ? openQ.name + " " + openQ.n + "/" + openQ.need : "Board clear";
    hud.won = won;
    hud.skills = [...skills];
    hud.skillPoints = creative ? 99 : Math.max(0, rankLv - skills.size);
    const maxMana = manaMaxFor(skills);
    hud.manaMax = maxMana;
    hud.mana = mana;
    const knownSpells = spellsFor(skills);
    hud.spell = knownSpells.length ? knownSpells[spellIx % knownSpells.length].name : "";
    hud.spellsOn = settings.mods.spells;
    hud.hurtDir = creative ? 0 : Math.max(0, 1 - hurtAgo / 0.55);
    if (phase === "play" && performance.now() - beganAt < 15000) {
      const pcx = Math.floor(player.x / CS);
      const pcz = Math.floor(player.z / CS);
      let ready = 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (meshes.has(pcx + dx + "," + (pcz + dz))) ready++;
      hud.loading = ready >= 9 ? 0 : 1 - ready / 9;
    } else hud.loading = 0;
    pub.phase = phase;
    pub.hasSave = hasSaveFlag;
  }

  function formatClockTime(t = worldTime) {
    const totalMinutes = Math.floor(((t * 24 * 60) + 360) % 1440);
    const hours24 = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const padMin = minutes < 10 ? "0" + minutes : String(minutes);
    const ampm = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return `${hours12}:${padMin} ${ampm}`;
  }

  function timeWord(t = worldTime) {
    const ang = t * Math.PI * 2;
    const sunH = Math.sin(ang);
    const rising = Math.cos(ang) > 0;
    if (sunH > 0.45) return "Day";
    if (sunH > 0.12) return rising ? "Morning" : "Afternoon";
    if (sunH > -0.15) return rising ? "Sunrise" : "Sunset";
    if (sunH > -0.45) return rising ? "Dawn" : "Dusk";
    return sunH < -0.85 ? "Midnight" : "Night";
  }

  let clockHeard = "";
  function noteClock() {
    if (phase !== "play" || hotbar[slot] !== ID.Clock) {
      clockHeard = "";
      return;
    }
    const label = `${timeWord()} · ${formatClockTime(worldTime)} (Day ${worldDays})`;
    if (label === clockHeard) return;
    clockHeard = label;
    say(`🕒 ${label}`, 2400);
  }

  function addInv(id: number, n: number) {
    if (!id || n <= 0) return;
    inv[id] = (inv[id] ?? 0) + n;
    if (!hotbar.includes(id)) {
      const empty = hotbar.indexOf(0);
      if (empty >= 0) hotbar[empty] = id;
    }
    if (DISCOVER.has(id) && !found.has(id)) {
      found.add(id);
      if (!creative) say("Catalogued " + def(id).name, 2600);
    }
  }

  function spend(id: number, n: number) {
    if (creative) return true;
    if ((inv[id] ?? 0) < n) return false;
    inv[id] -= n;
    if (inv[id] <= 0) {
      inv[id] = 0;
      for (let i = 0; i < 9; i++) if (hotbar[i] === id) hotbar[i] = 0;
      if (cursor === id) cursor = 0;
    }
    return true;
  }

  function wearHeld() {
    const id = hotbar[slot];
    const d = def(id);
    if (!d.maxUse || creative) return;
    if (skills.has("joint") && Math.random() < 0.4) return;
    const unb = enchLvl(id, "unbreaking");
    if (unb > 0 && Math.random() < unb * 0.22) return;
    inv[id] = (inv[id] ?? 0) - 1;
    if (inv[id] <= 0) {
      inv[id] = 0;
      hotbar[slot] = 0;
      say(d.name + " snapped");
    }
  }

  function give(id: number, n: number, special?: "hammer") {
    if (special === "hammer") {
      hammer = true;
      say("Brick hammer clicks together");
      saveDirty = true;
      return;
    }
    const d = def(id);
    if (d.maxUse) {
      const bonus = !creative && rankLv >= 22 ? Math.round(d.maxUse * 0.25) : 0;
      inv[id] = d.maxUse + bonus;
      if (!hotbar.includes(id)) {
        const empty = hotbar.indexOf(0);
        if (empty >= 0) hotbar[empty] = id;
      }
    } else if (d.armorSlot) {
      const prev = armor[d.armorSlot - 1];
      if (prev) addInv(prev, 1);
      armor[d.armorSlot - 1] = id;
      say(d.name + " on");
    } else addInv(id, n);
    saveDirty = true;
  }

  function resetVitals() {
    health = 20;
    hunger = 20;
    hungerEx = 0;
    xp = 0;
    rankLv = 0;
    found.clear();
    skills.clear();
    mana = 8;
    spellIx = 0;
    oxygen = 10;
    flying = false;
    flash = 0;
    invuln = 0;
    armor[0] = armor[1] = armor[2] = armor[3] = 0;
    grid = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    cursor = 0;
    panel = "bag";
    furnaces.clear();
    chests.clear();
    beaconBuffs.clear();
    jukeDiscs.clear();
    shulkerQueue = [];
    for (const beam of beamMeshes.values()) scene.remove(beam);
    beamMeshes.clear();
    comps.clear();
    signs.clear();
    FS.clearFireState(); // v4.15
    CH.clearChips(); // v4.17
    clearBricks(); // P0
    fireAge.clear();
    fireFxDirty = true;
    ench.clear();
    power.clear();
    repOut.clear();
    repTimer.clear();
    pistonHot.clear();
    quests = QUESTS.map((q) => ({ id: q.id, n: 0, done: false }));
    traderRole = "grocer";
    tradeStock = {};
    reputation = {};
    traderKeySet = null;
  }

  function resetHotbarCreative() {
    hotbar = [...CREATIVE_BAR];
    slot = 0;
  }

  function clearMobs() {
    for (const m of mobs) {
      scene.remove(m.mesh);
      if (m.vis) dropBar(m.vis);
    }
    for (const c of corpses) scene.remove(c.mesh);
    corpses.length = 0;
    mobs.length = 0;
    mobBatchRenderer.update([], camera, elapsed, settings.studs, STUD_H);
    for (const s of shots) scene.remove(s.mesh);
    shots.length = 0;
    for (const d of drops) scene.remove(d.mesh);
    drops.length = 0;
    mount = null;
    realm = 0;
    realmsReady = false;
    dragonUp = false;
    cityGuarded = false;
    won = false;
    fuses.length = 0;
  }

  function settleTown(flatTown: boolean): Decor {
    const built = decorate(world, Math.floor(spawnPoint.x), Math.floor(spawnPoint.z), flatTown);
    if (flatTown) return built;
    const site = world.nearestHamlet(spawnPoint.x, spawnPoint.z, 4);
    if (!site) return built;
    const dist = Math.hypot(site.x + 15 - spawnPoint.x, site.z + 14 - spawnPoint.z);
    return {
      sheep: dist < 90 ? [...built.sheep, ...penSheep(site.x, site.z)] : built.sheep,
      folk: dist < 180 ? folkLayout(site.x, site.z) : [],
      village: { x: site.x, z: site.z },
    };
  }

  function bootNew(nextFlat: boolean, nextCreative: boolean) {
    for (const key of [...meshes.keys()]) dropChunk(key);
    dirty.clear();
    const parsed = parseSeed(pendingSeed);
    seed = parsed.seed;
    seedText = parsed.text;
    worldId = "w" + Date.now().toString(36) + ((Math.random() * 36) | 0).toString(36);
    flat = nextFlat;
    creative = nextCreative;
    world = new World(seed, flat);
    const s = world.findSpawn();
    s.y = world.clearFeet(s.x, s.z);
    spawnPoint = s;
    const built = settleTown(nextFlat);
    sheepSpots = built.sheep;
    folkSpots = built.folk;
    villageAt = built.village;
    player.x = s.x;
    player.y = s.y;
    player.z = s.z;
    player.vx = player.vy = player.vz = 0;
    player.yaw = 0.2;
    player.pitch = -0.25;
    resetVitals();
    hammer = false;
    worldTime = 0.0416; // 07:00 AM morning
    worldDays = 1;
    for (const k of Object.keys(inv)) delete inv[Number(k)];
    if (creative) resetHotbarCreative();
    else hotbar = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    clearMobs();
    spawnSheep();
    stream(narrow ? 6 : 10);
    saveDirty = true;
  }

  function bootSave(data: SaveV1, id: string) {
    for (const key of [...meshes.keys()]) dropChunk(key);
    dirty.clear();
    seed = data.seed;
    seedText = data.seedText || String(data.seed);
    worldId = id;
    flat = data.flat;
    creative = data.creative;
    world = new World(seed, flat);
    for (const [x, y, z, id] of data.edits) world.edits.set(x + "," + y + "," + z, id);
    // A damaged save with NaN coordinates used to drop the player into the void forever.
    const okPos = [data.px, data.py, data.pz].every((v) => typeof v === "number" && Number.isFinite(v));
    const px = okPos ? data.px : 0.5;
    const pz = okPos ? data.pz : 0.5;
    const py = okPos ? data.py : world.heightAt(Math.floor(px), Math.floor(pz)) + 2;
    spawnPoint = { x: px, y: py, z: pz };
    player.x = px;
    player.y = py;
    player.z = pz;
    player.yaw = Number.isFinite(data.yaw) ? data.yaw : 0;
    player.pitch = Number.isFinite(data.pitch) ? data.pitch : -0.2;
    player.vx = player.vy = player.vz = 0;
    worldTime = typeof data.worldTime === "number" && Number.isFinite(data.worldTime) ? ((data.worldTime % 1) + 1) % 1 : 0.0416;
    worldDays = typeof data.worldDays === "number" && Number.isFinite(data.worldDays) && data.worldDays >= 1 ? Math.floor(data.worldDays) : 1;
    health = data.health || 20;
    hunger = data.hunger ?? 20;
    found.clear();
    if (typeof data.rank === "number") {
      rankLv = data.rank;
      xp = data.rankXp ?? 0;
    } else {
      const old = data.xp ?? 0;
      rankLv = Math.min(30, Math.floor(old / 8));
      xp = Math.round(((old % 8) / 8) * xpNeed(rankLv));
    }
    for (const id of data.found ?? []) found.add(id);
    skills.clear();
    for (const id of data.skills ?? []) skills.add(id);
    mana = data.mana ?? manaMaxFor(skills);
    spellIx = data.spell ?? 0;
    oxygen = 10;
    flying = false;
    hammer = !!data.hammer;
    armor[0] = data.armor?.[0] ?? 0;
    armor[1] = data.armor?.[1] ?? 0;
    armor[2] = data.armor?.[2] ?? 0;
    armor[3] = data.armor?.[3] ?? 0;
    furnaces.clear();
    chests.clear();
    comps.clear();
    power.clear();
    repOut.clear();
    repTimer.clear();
    for (const f of data.furnaces ?? []) furnaces.set(f.x + "," + f.y + "," + f.z, { ...f });
    for (const c of data.chests ?? []) chests.set(c.x + "," + c.y + "," + c.z, { ids: c.ids.slice(), ns: c.ns.slice() });
    beaconBuffs.clear();
    for (const b of data.beacons ?? []) beaconBuffs.set(b.x + "," + b.y + "," + b.z, b.buff);
    jukeDiscs.clear();
    for (const j of data.jukeboxes ?? []) jukeDiscs.set(j.x + "," + j.y + "," + j.z, j.disc);
    shulkerQueue = (data.shulkerQueue ?? []).map((q) => ({ ids: q.ids.slice(), ns: q.ns.slice() }));
    for (const c of data.comps ?? []) comps.set(c.x + "," + c.y + "," + c.z, { dir: c.dir, delay: c.delay });
    signs.clear();
    for (const s of data.signs ?? []) signs.set(s.x + "," + s.y + "," + s.z, s.t);
    // v4.15: restore fire state (cells are validated by tickFire on load).
    FS.clearFireState();
    for (const [x, y, z, h, m] of data.fire?.heat ?? []) {
      FS.heatMap.set(FS.fkey(x, y, z), { h, m, stage: Math.floor(m * FS.MELT_STAGES) });
    }
    for (const [x, y, z, src] of data.fire?.puddles ?? []) FS.puddleSrc.set(FS.fkey(x, y, z), src);
    for (const [x, y, z] of data.fire?.cells ?? []) {
      const k = FS.fkey(x, y, z);
      FS.fireCells.add(k);
      fireAge.set(k, 0);
    }
    for (const [x, y, z, t] of data.fire?.burning ?? []) FS.burningMap.set(FS.fkey(x, y, z), t);
    fireFxDirty = true;
    // v4.16: restore torn grass tufts (presence is derived; only tears persist).
    TS.clearTufts();
    // v4.17: restore damaged (partially carved) blocks
    CH.clearChips();
    for (const [x, y, z, v] of data.chips ?? []) CH.chipMap.set(CH.ckey(x, y, z), v);
    // P0: restore the stud-grid brick layer. Technic ids found in the
    // brick layer are pre-layer saves: they migrate to the Technic
    // layer instead (conversion: convertLegacyTechBrick).
    clearBricks();
    clearTech();
    for (const [id, sx, sy, sz] of data.bricks ?? []) {
      if (TECHNIC_SET.has(id)) convertLegacyTechBrick(id, sx, sy, sz);
      else addBrick(id, sx, sy, sz);
    }
    // P2: restore welded joints — only pairs whose bricks both came back.
    for (const [ax, ay, az, bx, by, bz] of data.welds ?? []) {
      const ka = brickKey(ax, ay, az);
      const kb = brickKey(bx, by, bz);
      if (bricks.has(ka) && bricks.has(kb)) welds.add(weldKey(ka, kb));
    }
    rebuildAllBrickMeshes();
    // Technic layer restore: [id, o, qx, qy, qz, on].
    for (const [id, o, qx, qy, qz, on] of data.technic ?? []) {
      if (!TECHNIC_SET.has(id)) continue;
      const p = tech.add(id, o, [qx, qy, qz]);
      p.on = on !== 0;
    }
    techRevSeen = tech.rev;
    syncTechMeshes();
    for (const [x, y, z] of data.tufts ?? []) TS.tuftGone.add(TS.tkey(x, y, z));
    ench.clear();
    for (const [id, list] of data.ench ?? []) ench.set(id, Object.fromEntries(list));
    tradeXp = data.tradeXp ?? {};
    tradeStock = {};
    for (const [k, v] of Object.entries(data.tradeStock ?? {})) tradeStock[k] = v.slice();
    reputation = { ...(data.reputation ?? {}) };
    traderKeySet = null;
    hotbar = data.hotbar?.length === 9 ? [...data.hotbar] : [...CREATIVE_BAR];
    for (const k of Object.keys(inv)) delete inv[Number(k)];
    for (const [id, n] of data.inv ?? []) inv[id] = n;
    clearMobs();
    if (data.folk && data.folk.length) {
      folkSpots = data.folk.map((f) => ({ x: f.x, z: f.z, role: f.role }));
      villageAt = data.village ?? null;
      if (villageAt) {
        const have = new Set(folkSpots.map((f) => f.role));
        if (!have.has("mage")) folkSpots.push({ x: villageAt.x + 8.5, z: villageAt.z + 8.5, role: "mage" });
        if (!have.has("ranger")) folkSpots.push({ x: villageAt.x + 19.5, z: villageAt.z + 8.5, role: "ranger" });
      }
      sheepSpots = [
        { x: player.x + 4, z: player.z + 2 },
        { x: player.x - 3, z: player.z + 4 },
      ];
    } else {
      const origin = world.findSpawn();
      const built = decorate(world, Math.floor(origin.x), Math.floor(origin.z));
      sheepSpots = built.sheep;
      folkSpots = built.folk;
      villageAt = built.village;
    }
    const savedQ = new Map((data.quests ?? []).map((q) => [q.id, q]));
    quests = QUESTS.map((q) => {
      const s = savedQ.get(q.id);
      return { id: q.id, n: Math.min(q.need, s?.n ?? 0), done: !!s?.done };
    });
    traderRole = "grocer";
    spawnSheep();
    for (const pet of data.pets ?? []) {
      const wolf = spawnKind("wolf", pet.x, pet.z);
      wolf.tame = true;
    }
    won = !!data.won;
    if (won) dragonUp = true;
    stream(narrow ? 6 : 10);
  }

  function surfaceToMesh(surf: Surface, material: THREE.Material, order: number, tier = 0) {
    if (surf.pos.length === 0) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(surf.pos, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(surf.nor, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(surf.uv, 2));
    if (surf.col.length === surf.pos.length) geo.setAttribute("color", new THREE.Float32BufferAttribute(surf.col, 3));
    if (surf.tan.length * 3 === surf.pos.length * 4) geo.setAttribute("tangent", new THREE.Float32BufferAttribute(surf.tan, 4));
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = settings.realistic && tier === 0 && (order === 0 || order === 4);
    mesh.receiveShadow = settings.realistic;
    mesh.renderOrder = order;
    return mesh;
  }

  function dropChunk(key: string) {
    const list = meshes.get(key);
    chunkTier.delete(key);
    FS.emitters.delete(key); // v4.15: forget the chunk's heat emitters
    if (!list) return;
    for (const mesh of list) {
      chunkRoot.remove(mesh);
      mesh.geometry.dispose();
    }
    meshes.delete(key);
  }

  const debrisChunks = new Set<string>();
  function seedChunkDebris(cx: number, cz: number) {
    const key = cx + "," + cz;
    if (debrisChunks.has(key)) return;
    debrisChunks.add(key);
    if (world.flat || inNether(cx * CS)) return;
    const spot = debrisAt(world.seed, cx, cz);
    const x = cx * CS + spot.lx;
    const z = cz * CS + spot.lz;
    const mark = x + ",0," + z;
    if (world.edits.get(mark) === ID.Bedrock) return;
    const h = world.heightAt(x, z);
    if (h <= SEA || h >= HEIGHT - 3) return;
    const cells = spot.ids.map((id, i) => {
      const ox = Math.floor(hash3(cx, i, cz, world.seed + 8810) * 3) - 1;
      const oz = Math.floor(hash3(cx, i, cz, world.seed + 8811) * 3) - 1;
      return { x: x + ox, y: h + 1, z: z + oz, id };
    });
    for (const c of cells) {
      const cur = world.get(c.x, c.y, c.z);
      if (cur !== ID.Air && cur !== ID.TallGrass && cur !== ID.Flower && cur !== ID.FlowerRed && cur !== ID.Reed && cur !== ID.Bloom) return;
    }
    const seen = new Set<number>();
    for (const c of cells) {
      // Debris-site Technic finds join the Technic layer, not bricks.
      if (TECHNIC_SET.has(c.id)) {
        convertLegacyTechBrick(c.id, c.x * 2, c.y, c.z * 2);
        continue;
      }
      if (!brickSpaceFree(c.x * 2, c.y, c.z * 2)) continue;
      addBrick(c.id, c.x * 2, c.y, c.z * 2);
      seen.add(c.id);
    }
    for (const id of seen) rebuildBrickMesh(id);
    world.edits.set(mark, ID.Bedrock);
    saveDirty = true;
  }

  function rebuild(cx: number, cz: number, key: string, tier: number) {
    seedChunkDebris(cx, cz);
    dropChunk(key);
    const built = buildChunk(world, cx, cz, tier === 0 ? settings.studs : false, tier < 2);
    FS.emitters.set(key, built.emitters); // v4.15: campfires / exposed lava for the fire tick
    chunkTier.set(key, tier);
    const list: THREE.Mesh[] = [];
    for (const mesh of [
      surfaceToMesh(built.opaque, opaqueMat, 0, tier),
      surfaceToMesh(built.glass, glassMat, 2, tier),
      surfaceToMesh(built.water, waterMat, 1, tier),
      surfaceToMesh(built.plant, plantMat, 3, tier),
      surfaceToMesh(built.molten, moltenMat, 4, tier),
    ]) {
      if (!mesh) continue;
      chunkRoot.add(mesh);
      list.push(mesh);
    }
    meshes.set(key, list);
  }

  function stream(budget: number) {
    const r = effRadius();
    const cx = Math.floor(player.x / CS);
    const cz = Math.floor(player.z / CS);
    const need: { cx: number; cz: number; d: number; key: string }[] = [];
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dz * dz > r * r + 0.01) continue;
        need.push({ cx: cx + dx, cz: cz + dz, d: dx * dx + dz * dz, key: cx + dx + "," + (cz + dz) });
      }
    }
    need.sort((a, b) => a.d - b.d);
    const keep = new Set(need.map((n) => n.key));
    for (const key of meshes.keys()) if (!keep.has(key)) dropChunk(key);
    world.releaseFar(cx, cz, r);
    let left = budget;
    // v4.12: time-box meshing — a fixed count budget let two tier-0 rebuilds
    // (~140 ms each) land in one frame and stall the game. Always allow the
    // first chunk, then stop once ~6 ms of meshing is spent this call.
    const meshStart = performance.now();
    let meshed = 0;
    for (const item of need) {
      if (left <= 0) break;
      const tier = tierFor(item.d);
      if (meshes.has(item.key) && !dirty.has(item.key) && chunkTier.get(item.key) === tier) continue;
      if (meshed >= 1 && performance.now() - meshStart > 6) break;
      rebuild(item.cx, item.cz, item.key, tier);
      dirty.delete(item.key);
      left--;
      meshed++;
    }
  }

  function markDirtyAt(x: number, z: number) {
    const cx = Math.floor(x / CS);
    const cz = Math.floor(z / CS);
    const lx = x - cx * CS;
    const lz = z - cz * CS;
    dirty.add(cx + "," + cz);
    if (lx === 0) dirty.add(cx - 1 + "," + cz);
    if (lx === CS - 1) dirty.add(cx + 1 + "," + cz);
    if (lz === 0) dirty.add(cx + "," + (cz - 1));
    if (lz === CS - 1) dirty.add(cx + "," + (cz + 1));
  }

  function solidAt(x: number, y: number, z: number) {
    return def(world.get(x, y, z)).solid;
  }

  // Collision top (world Y) of the block in cell (x,y,z) for an actor whose
  // centre is at (px,pz): slabs are half height; stairs are half on the low
  // side and full on the high side (def.dir). 0 = no collision.
  function colTopAt(x: number, y: number, z: number, px: number, pz: number) {
    const d = def(world.get(x, y, z));
    if (!d.solid) return 0;
    if (d.slab) return y + 0.5;
    if (d.stairs) {
      const lx = px - x;
      const lz = pz - z;
      const high = d.dir === 0 ? lz < 0.5 : d.dir === 1 ? lx >= 0.5 : d.dir === 2 ? lz >= 0.5 : lx < 0.5;
      return y + (high ? 1 : 0.5);
    }
    return y + 1;
  }

  function overlapAt(px: number, py: number, pz: number) {
    const minX = Math.floor(px - HW);
    const maxX = Math.floor(px + HW - 1e-4);
    const minY = Math.floor(py + 1e-4);
    const maxY = Math.floor(py + BODY - 1e-4);
    const minZ = Math.floor(pz - HW);
    const maxZ = Math.floor(pz + HW - 1e-4);
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          const top = colTopAt(x, y, z, px, pz);
          if (top > 0 && py < top && py + BODY > y) return true;
        }
      }
    }
    // P0: bricks collide as exact AABBs (their box can straddle cells, so
    // scan the player footprint widened by one cell on every side).
    if (bricks.size > 0) {
      const near: Brick[] = [];
      for (let cy = minY - 1; cy <= maxY; cy++)
        for (let cz = minZ - 1; cz <= maxZ + 1; cz++)
          for (let cx = minX - 1; cx <= maxX + 1; cx++) bricksNearCell(cx, cy, cz, near);
      for (const b of near) {
        const bx = b.sx / 2;
        const bz = b.sz / 2;
        if (px + HW > bx && px - HW < bx + 1 && py + BODY > b.sy && py < b.sy + 1 && pz + HW > bz && pz - HW < bz + 1) return true;
      }
    }
    return false;
  }

  function hitsPlayer(x: number, y: number, z: number) {
    return (
      player.x + HW > x &&
      player.x - HW < x + 1 &&
      player.y + BODY > y &&
      player.y < y + 1 &&
      player.z + HW > z &&
      player.z - HW < z + 1
    );
  }

  function moveAxis(axis: "x" | "y" | "z", delta: number, allowStep: boolean) {
    if (delta === 0) return;
    player[axis] += delta;
    if (!overlapAt(player.x, player.y, player.z)) return;
    if (allowStep && axis !== "y") {
      // Try a half step first (slabs, stair treads), then a full block step.
      let stepped = false;
      for (const lift of [0.52, 1.02]) {
        player.y += lift;
        if (!overlapAt(player.x, player.y, player.z)) {
          stepped = true;
          break;
        }
        player.y -= lift;
      }
      if (stepped) return;
    }
    if (axis === "y") {
      if (delta < 0 && player.vy < -8) padRumble(Math.min(0.6, (-player.vy - 8) / 18 + 0.15), 0.25, 90); // hard landing thud
      if (delta < 0 && player.vy < -13 && !creative && !inWaterNow()) {
        let dmg = Math.round((-player.vy - 13) * 1.5);
        if (rankLv >= 15) dmg = Math.round(dmg * 0.55);
        if (skills.has("raise")) dmg = Math.round(dmg * 0.75);
        const feather = enchLvl(armor[3], "feather");
        if (feather > 0) dmg = Math.round(dmg * (1 - 0.18 * feather));
        if (dmg > 0) hurt(dmg);
      }
      if (delta > 0) player.y = Math.floor(player.y + BODY) - BODY - 1e-3;
      else {
        // Land on the highest collision top crossed this step (slab = +0.5).
        const prevY = player.y - delta;
        let land = -Infinity;
        const minX = Math.floor(player.x - HW);
        const maxX = Math.floor(player.x + HW - 1e-4);
        const minZ = Math.floor(player.z - HW);
        const maxZ = Math.floor(player.z + HW - 1e-4);
        for (let cy = Math.floor(player.y) - 1; cy <= Math.floor(prevY) + 1; cy++) {
          for (let cz = minZ; cz <= maxZ; cz++) {
            for (let cx = minX; cx <= maxX; cx++) {
              const t = colTopAt(cx, cy, cz, player.x, player.z);
              if (t > 0 && t <= prevY + 1e-3 && t > land) land = t;
            }
          }
        }
        // P0: brick tops are integers (sy + 1) — land on them too.
        if (bricks.size > 0) {
          const near: Brick[] = [];
          for (let cy = Math.floor(player.y) - 1; cy <= Math.floor(prevY) + 1; cy++)
            for (let cz = minZ - 1; cz <= maxZ + 1; cz++)
              for (let cx = minX - 1; cx <= maxX + 1; cx++) bricksNearCell(cx, cy, cz, near);
          for (const b of near) {
            const bx = b.sx / 2;
            const bz = b.sz / 2;
            if (player.x + HW <= bx || player.x - HW >= bx + 1 || player.z + HW <= bz || player.z - HW >= bz + 1) continue;
            const t = b.sy + 1;
            if (t <= prevY + 1e-3 && t > land) land = t;
          }
        }
        player.y = (land > -Infinity ? land : Math.floor(player.y) + 1) + 1e-3;
        player.grounded = true;
      }
      player.vy = 0;
    } else {
      if (delta > 0) player[axis] = Math.floor(player[axis] + HW) - HW - 1e-3;
      else player[axis] = Math.floor(player[axis] - HW) + 1 + HW + 1e-3;
      if (axis === "x") player.vx = 0;
      else player.vz = 0;
    }
  }

  function inWaterNow() {
    return def(world.get(Math.floor(player.x), Math.floor(player.y + 0.4), Math.floor(player.z))).fluid;
  }

  function hurt(n: number) {
    if (creative || n <= 0 || phase !== "play" || invuln > 0) return;
    const sneaking = isSneaking();
    if (sneaking && (hotbar.includes(ID.Shield) || offhand === ID.Shield)) {
      n *= 0.35;
      if (hotbar[slot] === ID.Shield || offhand === ID.Shield) wearHeld();
    }
    if (rankLv >= 8) n *= 0.86;
    let resist = 0;
    let prot = 0;
    for (const id of armor) {
      resist += def(id).armor;
      prot += enchLvl(id, "protection");
    }
    const dealt = Math.max(1, Math.round(n * (1 - Math.min(0.8, resist + prot * 0.03))));
    health = Math.max(0, health - dealt);
    invuln = 0.7;
    hurtAgo = 0;
    flash = 1;
    shake = Math.max(shake, 0.18);
    audio.hurt();
    padRumble(0.75, 0.4, 160);
    if (health <= 0) die();
  }

  function bite(n: number) {
    hurt(settings.mods.hard ? Math.ceil(n * 1.5) : n);
  }

  // Thorns: worn armor bites back at a melee attacker.
  function thornsHit(m: Mob) {
    let total = 0;
    for (const piece of armor) if (piece) total += enchLvl(piece, "thorns");
    if (total <= 0 || Math.random() >= 0.5) return;
    m.hp -= Math.ceil(total / 2);
    if (m.hp <= 0 && !m.dead) killMob(m);
  }

  function die() {
    if (!creative && (inv[ID.Totem] ?? 0) > 0) {
      spend(ID.Totem, 1);
      health = 10;
      invuln = 2.2;
      fireT = 0;
      say("Last stud held");
      emit();
      return;
    }
    if (!creative) spillBags();
    health = 0;
    flying = false;
    mount = null;
    phase = "dead";
    suppressUnlock = true;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    say("You crumbled. Your bricks are on the ground.");
    emit();
  }

  function raycast(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxD: number, throughFluid = false) {
    const len = Math.hypot(dx, dy, dz) || 1;
    dx /= len;
    dy /= len;
    dz /= len;
    let x = Math.floor(ox);
    let y = Math.floor(oy);
    let z = Math.floor(oz);
    const stepX = dx >= 0 ? 1 : -1;
    const stepY = dy >= 0 ? 1 : -1;
    const stepZ = dz >= 0 ? 1 : -1;
    const tDeltaX = dx === 0 ? 1e12 : Math.abs(1 / dx);
    const tDeltaY = dy === 0 ? 1e12 : Math.abs(1 / dy);
    const tDeltaZ = dz === 0 ? 1e12 : Math.abs(1 / dz);
    let tMaxX = dx === 0 ? 1e12 : (dx > 0 ? x + 1 - ox : ox - x) * tDeltaX;
    let tMaxY = dy === 0 ? 1e12 : (dy > 0 ? y + 1 - oy : oy - y) * tDeltaY;
    let tMaxZ = dz === 0 ? 1e12 : (dz > 0 ? z + 1 - oz : oz - z) * tDeltaZ;
    let nx = 0;
    let ny = 0;
    let nz = 0;
    let dist = 0;
    for (let i = 0; i < 48; i++) {
      const id = world.get(x, y, z);
      // v4.18 (Philippe): targeting passes THROUGH water/lava like Minecraft —
      // aiming into a lake targets the solid under it, so blocks are placed
      // IN the water (filling the fluid cell), never on top of it.
      if (id !== ID.Air && dist > 0.02 && !(throughFluid && def(id).fluid)) return { x, y, z, nx, ny, nz, dist, id };
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        if (tMaxX > maxD) return null;
        x += stepX;
        dist = tMaxX;
        tMaxX += tDeltaX;
        nx = -stepX;
        ny = 0;
        nz = 0;
      } else if (tMaxY < tMaxZ) {
        if (tMaxY > maxD) return null;
        y += stepY;
        dist = tMaxY;
        tMaxY += tDeltaY;
        nx = 0;
        ny = -stepY;
        nz = 0;
      } else {
        if (tMaxZ > maxD) return null;
        z += stepZ;
        dist = tMaxZ;
        tMaxZ += tDeltaZ;
        nx = 0;
        ny = 0;
        nz = -stepZ;
      }
    }
    return null;
  }

  function rayBox(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    minx: number,
    miny: number,
    minz: number,
    maxx: number,
    maxy: number,
    maxz: number,
  ) {
    const invX = dx === 0 ? 1e12 : 1 / dx;
    const invY = dy === 0 ? 1e12 : 1 / dy;
    const invZ = dz === 0 ? 1e12 : 1 / dz;
    let t1 = (minx - ox) * invX;
    let t2 = (maxx - ox) * invX;
    let tmin = Math.min(t1, t2);
    let tmax = Math.max(t1, t2);
    t1 = (miny - oy) * invY;
    t2 = (maxy - oy) * invY;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
    t1 = (minz - oz) * invZ;
    t2 = (maxz - oz) * invZ;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
    if (tmax < 0 || tmin > tmax) return null;
    const t = tmin >= 0 ? tmin : tmax;
    return t >= 0 ? t : null;
  }

  function breakBlock(x: number, y: number, z: number) {
    const id = world.get(x, y, z);
    const block = def(id);
    if (id === ID.Air || id === ID.Bedrock || block.hard === Infinity) return;
    const rmBefore = CH.removedAt(x, y, z, id); // v4.17: pieces already knocked out
    CH.setRemoved(x, y, z, id, 0); // v4.17: the damaged block is gone entirely
    world.set(x, y, z, ID.Air);
    markDirtyAt(x, z);
    netSendEdit(x, y, z, ID.Air);
    if (block.sign) signs.delete(x + "," + y + "," + z);
    if (id === ID.ShulkerBox) {
      // The box keeps its contents: move the bin into the carry queue;
      // the next shulker box placed inherits it (the generic drop below
      // still gives the empty box item itself).
      const key = x + "," + y + "," + z;
      const bin = chests.get(key);
      if (bin && bin.ids.some((v) => v > 0)) {
        shulkerQueue.push({ ids: bin.ids.slice(), ns: bin.ns.slice() });
        saveDirty = true;
      }
      chests.delete(key);
    }
    if (id === ID.Jukebox) {
      const key = x + "," + y + "," + z;
      const disc = jukeDiscs.get(key);
      if (disc) dropItem(disc, 1, x + 0.5, y + 0.8, z + 0.5);
      jukeDiscs.delete(key);
    }
    if (id === ID.Chest || id === ID.Barrel) {
      const key = x + "," + y + "," + z;
      const bin = chests.get(key);
      if (bin) {
        for (const pile of spillSlots(bin.ids, bin.ns)) dropItem(pile.id, pile.n, x + 0.5, y + 0.8, z + 0.5);
        chests.delete(key);
      }
    }
    if (id === ID.Beacon) beaconBuffs.delete(x + "," + y + "," + z);
    if (isComponent(id)) {
      const k = rsKey(x, y, z);
      comps.delete(k);
      repOut.delete(k);
      repTimer.delete(k);
      power.delete(k);
      recompute(x, y, z);
    } else if (isComponent(world.get(x, y + 1, z))) recompute(x, y, z);
    const held = def(hotbar[slot]);
    const tier = held.tool === "pick" ? held.tier : 0;
    const canDrop = mayYield(creative, block.need, tier);
    // Yields fall in both modes. Creative used to swallow every drop.
    const yieldAt = (dropId: number) => dropItem(dropId, 1, x + 0.5, y + 0.55, z + 0.5);
    if (canDrop) for (let p = 0, py = plasticYield(id); p < py; p++) yieldAt(ID.Pellets);
    if (canDrop && id === ID.Leaves) {
      if (Math.random() < 0.08) yieldAt(ID.Apple);
      if (Math.random() < 0.12) yieldAt(ID.Stick);
    } else if (canDrop && id === ID.TallGrass) {
      if (Math.random() < 0.4) yieldAt(ID.Seeds);
    } else if (canDrop && (id === ID.Crop || id === ID.Crop1 || id === ID.Crop2 || id === ID.CarrotCrop || id === ID.PotatoCrop || id === ID.BeetCrop)) yieldAt(ID.Seeds);
    else if (canDrop && id === ID.CropRipe) {
      yieldAt(ID.Wheat);
      yieldAt(ID.Seeds);
    } else if (canDrop && id === ID.Gravel) yieldAt(Math.random() < 0.14 ? ID.Flint : ID.Gravel);
    else if (canDrop && block.drop !== -1) yieldAt(enchLvl(hotbar[slot], "silk") > 0 ? id : block.drop || id);
    if (canDrop && block.drop !== -1 && (ORE_XP[id] ?? 0) > 0 && enchLvl(hotbar[slot], "silk") === 0) {
      const fort = held.tool === "pick" ? enchLvl(hotbar[slot], "fortune") : 0;
      for (let f = 0; f < fort; f++) if (Math.random() < 0.35) yieldAt(block.drop || id);
    }
    if (canDrop && id === ID.PrismOre && Math.random() < 0.22) yieldAt(ID.Core);
    if (!creative) {
      const right =
        (held.tool === "pick" && (block.tough || block.need > 0)) ||
        (held.tool === "axe" && AXE_OK(id)) ||
        (held.tool === "shovel" && SHOVEL_OK(id));
      if (right) wearHeld();
      if (canDrop) gainXp(ORE_XP[id] ?? 0);
      if (id === ID.Stone || id === ID.Cobble) oreEar(x, y, z);
    }
    if (canDrop && skills.has("yield") && ORE_XP[id] && Math.random() < 0.3) yieldAt(block.drop || id);
    if (id === ID.Log) bumpQuest("break", "log");
    if (id === ID.Moss) bumpQuest("break", "moss");
    if (id === ID.Snow) bumpQuest("break", "snow");
    if (id === ID.Ash) bumpQuest("break", "ash");
    if (id === ID.Clay) bumpQuest("break", "clay");
    if (id === ID.Cactus) bumpQuest("break", "cactus");
    if (id === ID.Reed) bumpQuest("break", "reed");
    if (id === ID.Bloom) bumpQuest("break", "bloom");
    if (id === ID.Pumpkin) bumpQuest("break", "pumpkin");
    if (id === ID.Melon) bumpQuest("break", "melon");
    if (id === ID.Mushroom || id === ID.MushroomRed) bumpQuest("break", "shroom");
    if (id === ID.Web) bumpQuest("break", "web");
    if (id === ID.EndCrystal) popCrystal(x, y, z);
    // v4.14: solids burst into studded LEGO sub-bricks (plates + 1x2s);
    // plants and glass just shatter into chips.
    if (block.plant || !block.solid) burst(x + 0.5, y + 0.5, z + 0.5, block.color, 7);
    else if (block.glass) burst(x + 0.5, y + 0.5, z + 0.5, "#dff2ff", 12);
    else if (chippable(id)) {
      // v4.17 Teardown LEGO: the block comes apart into the 1×1 LEGO bricks
      // it is made of — every piece still standing pops out, in place.
      const col = block.side || block.color;
      for (let p = 0; p < 12; p++) {
        if (rmBefore & (1 << p)) continue;
        const [cx, cy, cz] = CH.pieceCentre(p);
        spawnPiece(x + cx, y + cy, z + cz, col, (cx - 0.5) * 3.4 + (Math.random() - 0.5) * 0.8, 1.2 + cy * 2.2 + Math.random() * 1.1, (cz - 0.5) * 3.4 + (Math.random() - 0.5) * 0.8);
      }
    } else burstModularBlock(x + 0.5, y + 0.5, z + 0.5, block);
    if (id === ID.Log) tryTopple(x, y, z);
    padRumble(0.12, 0.25, 45);
    audio.break();
    swing = 1;
    saveDirty = true;
    mineTime = 0;
    mineKey = "";
    hideCrack();
  }

  // v4.18 — Teardown gravity for trees (Philippe 2026-10-28: « tu coupes un
  // arbre, il tombe, et ce qui touche au sol en premier casse »). When a log
  // is cut, the connected log+leaves component above it topples as one rigid
  // body. Philippe 2026-10-29: « que l'arbre tombe même si tu coupes en
  // haut, en bas, peu importe » — no tree-shape gates any more (no minimum
  // canopy or trunk), a cut ANYWHERE drops what is above it, and ONE
  // remaining support point does not hold it (it takes 2+). Light by
  // doctrine: one merged mesh, analytic rotation, no physics engine.
  function tryTopple(x: number, y: number, z: number) {
    const above = world.get(x, y + 1, z);
    if (above !== ID.Log && above !== ID.Leaves) return;
    const key = (cx: number, cy: number, cz: number) => cx + "," + cy + "," + cz;
    const cells: { dx: number; dy: number; dz: number; id: number }[] = [];
    const seen = new Set<string>([key(x, y + 1, z)]);
    const stack: [number, number, number][] = [[x, y + 1, z]];
    while (stack.length) {
      const [cx, cy, cz] = stack.pop()!;
      const id = world.get(cx, cy, cz);
      if (id !== ID.Log && id !== ID.Leaves) continue;
      cells.push({ dx: cx - x, dy: cy - y, dz: cz - z, id });
      if (cells.length > 320) return; // not a tree — a forest/build: leave it
      for (const [ox, oy, oz] of NEIGHBORS6) {
        const nx = cx + ox, ny = cy + oy, nz = cz + oz, k = key(nx, ny, nz);
        if (seen.has(k)) continue;
        seen.add(k);
        stack.push([nx, ny, nz]);
      }
    }
    const inTree = new Set(cells.map((c) => key(x + c.dx, y + c.dy, z + c.dz)));
    // Support rule (Philippe 2026-10-29: « il reste un stub, il tombe »):
    // count the points where the component still rests on something solid
    // outside itself. 0 or 1 = it falls; 2+ = genuinely held, leave it.
    let supports = 0;
    for (const c of cells) {
      if (c.id !== ID.Log) continue;
      const bx = x + c.dx, by = y + c.dy - 1, bz = z + c.dz;
      if (bx === x && by === y && bz === z) continue; // the cut cell (now air)
      const below = world.get(bx, by, bz);
      if (below && def(below).solid && !inTree.has(key(bx, by, bz))) supports++;
    }
    if (supports >= 2) return;
    // Fall away from the player, snapped to the nearest axis — but only if
    // the fall SWEEP is clear. The rigid trunk used to rotate straight
    // through hills and builds (Philippe, 2026-10-29: the felled wood went
    // right into clipping instead of falling clean, the other way). Test
    // the four axis directions in preference order (away, sideways,
    // sideways, toward): sweep every cell through the arc; a direction is
    // blocked if a cell would pass through a solid block outside the tree
    // or dip under the terrain surface mid-fall. All four blocked = keep
    // the preferred direction (the settle logic handles the landing).
    let ax = x + 0.5 - player.x;
    let az = z + 0.5 - player.z;
    if (Math.abs(ax) > Math.abs(az)) { ax = Math.sign(ax) || 1; az = 0; } else { az = Math.sign(az) || 1; ax = 0; }
    const sweepClear = (dx: number, dz: number) => {
      const axisV = new THREE.Vector3(dz, 0, -dx);
      const v = new THREE.Vector3();
      for (let deg = 10; deg <= 80; deg += 10) {
        const ang = (deg * Math.PI) / 180;
        for (const c of cells) {
          v.set(c.dx, c.dy, c.dz).applyAxisAngle(axisV, ang);
          const bx = Math.floor(x + 0.5 + v.x), by = Math.floor(y + v.y), bz = Math.floor(z + 0.5 + v.z);
          if (by < groundY(bx, bz)) return false;
          const bid = world.get(bx, by, bz);
          if (bid && def(bid).solid && !inTree.has(key(bx, by, bz))) return false;
        }
      }
      return true;
    };
    if (!sweepClear(ax, az)) {
      const candidates: [number, number][] = [[-az, ax], [az, -ax], [-ax, -az]];
      for (const [cdx, cdz] of candidates) {
        if (sweepClear(cdx, cdz)) { ax = cdx; az = cdz; break; }
      }
    }
    const mesh = new THREE.Mesh(toppleGeoFor(cells), opaqueMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(x + 0.5, y, z + 0.5);
    scene.add(mesh);
    for (const c of cells) {
      const wx = x + c.dx, wy = y + c.dy, wz = z + c.dz;
      CH.setRemoved(wx, wy, wz, c.id, 0);
      world.set(wx, wy, wz, ID.Air);
      netSendEdit(wx, wy, wz, ID.Air);
      markDirtyAt(wx, wz);
    }
    saveDirty = true;
    // Rotation axis: horizontal, perpendicular to the fall direction, so the
    // up vector tips toward (ax, az) as the angle grows.
    const axis = new THREE.Vector3(az, 0, -ax).normalize();
    topples.push({ mesh, cells, px: x + 0.5, py: y, pz: z + 0.5, axis, angle: 0, vel: 0 });
    say("Timber!", 1200);
  }

  const _topV = new THREE.Vector3();
  function updateTopples(dt: number) {
    for (let i = topples.length - 1; i >= 0; i--) {
      const t = topples[i];
      t.vel += dt * 2.4 * (0.35 + t.angle); // gravity bite grows as it tips
      t.angle = Math.min(t.angle + t.vel * dt, Math.PI / 2);
      t.mesh.quaternion.setFromAxisAngle(t.axis, t.angle);
      // Impact: the first cell whose underside reaches the ground.
      let hit = t.angle >= Math.PI / 2 - 0.001;
      if (!hit) {
        for (const c of t.cells) {
          _topV.set(c.dx, c.dy, c.dz).applyAxisAngle(t.axis, t.angle);
          const wy = t.py + _topV.y;
          if (wy - 0.02 <= groundY(Math.floor(t.px + _topV.x), Math.floor(t.pz + _topV.z))) { hit = true; break; }
        }
      }
      if (!hit) continue;
      // Settle: measure each cell's resting height; the lowest band touched
      // first and shatters (Philippe: « ce qui touche au sol en premier casse »).
      const placed: { c: (typeof t.cells)[0]; x: number; y: number; z: number; h: number }[] = [];
      let minH = Infinity;
      for (const c of t.cells) {
        _topV.set(c.dx, c.dy, c.dz).applyAxisAngle(t.axis, t.angle);
        const wx = Math.floor(t.px + _topV.x), wy = Math.floor(t.py + _topV.y), wz = Math.floor(t.pz + _topV.z);
        placed.push({ c, x: wx, y: wy, z: wz, h: _topV.y });
        if (_topV.y < minH) minH = _topV.y;
      }
      // Philippe (2026-10-29): the leaves fall WITH the tree and PLACE —
      // nothing vanishes. Settle lowest-first, and a cell placed during
      // THIS settle counts as support for the cells above it (before,
      // canopy cells checked support before the fallen trunk existed
      // under them, failed, and were silently dropped — in Creative
      // even the logs vanished). Any cell that still cannot place drops
      // as its own item, in BOTH modes: matter circulates, it never
      // disappears.
      placed.sort((a, b) => a.h - b.h);
      const settledCells = new Set<string>();
      let debris = 42;
      for (const p of placed) {
        const col = def(p.c.id).side || def(p.c.id).color;
        if (p.h <= minH + 0.85) {
          // Impact band: shatters visually, but the material is
          // recovered as items — logs AND leaves, both modes (before:
          // leaves vanished outright, logs dropped 35% in Survival only).
          for (let k = 0; k < 3 && debris > 0; k++, debris--) spawnPiece(p.x + 0.5, p.y + 0.5, p.z + 0.5, col, (Math.random() - 0.5) * 2.4, 1 + Math.random() * 2, (Math.random() - 0.5) * 2.4);
          dropItem(p.c.id, 1, p.x + 0.5, p.y + 0.6, p.z + 0.5);
          if (p.c.id === ID.Leaves && Math.random() < 0.05) dropItem(ID.Apple, 1, p.x + 0.5, p.y + 0.6, p.z + 0.5);
          continue;
        }
        // Fallen trunk: place logs in a horizontal line at ground level
        // so the tree lies on its side instead of standing upright.
        if (p.c.id === ID.Log) {
          const gy = Math.floor(groundY(p.x, p.z));
          const targetFree = world.get(p.x, gy, p.z) === ID.Air;
          const belowId = world.get(p.x, gy - 1, p.z);
          if (targetFree && belowId && def(belowId).solid) {
            world.set(p.x, gy, p.z, p.c.id);
            netSendEdit(p.x, gy, p.z, p.c.id);
            markDirtyAt(p.x, p.z);
            settledCells.add(p.x + "," + gy + "," + p.z);
          } else {
            dropItem(ID.Log, 1, p.x + 0.5, gy + 0.6, p.z + 0.5);
          }
          continue;
        }
        const targetFree = world.get(p.x, p.y, p.z) === ID.Air;
        const belowId = world.get(p.x, p.y - 1, p.z);
        const supported = (belowId !== ID.Air && !!def(belowId)?.solid) || settledCells.has(p.x + "," + (p.y - 1) + "," + p.z);
        if (targetFree && supported) {
          world.set(p.x, p.y, p.z, p.c.id);
          netSendEdit(p.x, p.y, p.z, p.c.id);
          markDirtyAt(p.x, p.z);
          settledCells.add(p.x + "," + p.y + "," + p.z);
        } else {
          dropItem(p.c.id, 1, p.x + 0.5, p.y + 0.6, p.z + 0.5);
        }
      }
      scene.remove(t.mesh);
      t.mesh.geometry.dispose();
      topples.splice(i, 1);
      if (Math.hypot(player.x - t.px, player.z - t.pz) < 22) padRumble(0.5, 0.3, 160); // the trunk slams down
      audio.break();
      saveDirty = true;
    }
  }

  // ---- Falling blocks: real gravity, kept light (v4.18, Philippe) ----
  // Sand / Gravel / Soul (def().fall) used to teleport one cell per tick —
  // steppy and fake. Now an unsupported one becomes a true falling entity:
  // gravity acceleration, terminal velocity, water drag, dust + a pad thud
  // on landing. One shared textured geometry per block id, a hard cap of
  // entities, sub-stepped integration so a frame hitch can't tunnel it
  // through the floor. No physics engine, no per-frame allocation.
  type Faller = { id: number; x: number; z: number; y: number; vy: number; mesh: THREE.Mesh };
  const fallers: Faller[] = [];
  const fallerGeos = new Map<number, THREE.BufferGeometry>();
  const FALL_CAP = 64;
  const FALL_G = 30;
  const FALL_TERM = -38;

  function fallerGeo(id: number) {
    let g = fallerGeos.get(id);
    if (g) return g;
    g = new THREE.BoxGeometry(0.98, 0.98, 0.98);
    const uv = g.getAttribute("uv") as THREE.BufferAttribute;
    const kinds = [1, 1, 0, 2, 1, 1] as const; // +x −x +y −y +z −z → side side top bottom side side
    for (let f = 0; f < 6; f++) {
      const tile = faceTile(id, kinds[f]);
      const c = tile % ATLAS_COLS;
      const r = Math.floor(tile / ATLAS_COLS);
      const du = 1 / ATLAS_COLS;
      const dv = 1 / ATLAS_ROWS;
      const u0 = c * du + du * 0.02;
      const u1 = (c + 1) * du - du * 0.02;
      const vTop = 1 - r * dv - dv * 0.02;
      const vBot = 1 - (r + 1) * dv + dv * 0.02;
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), vBot + uv.getY(i) * (vTop - vBot));
      }
    }
    uv.needsUpdate = true;
    fallerGeos.set(id, g);
    return g;
  }

  function spawnFaller(x: number, y: number, z: number) {
    const id = world.get(x, y, z);
    if (!def(id).fall || fallers.length >= FALL_CAP) return;
    if (def(world.get(x, y - 1, z)).solid) return; // still supported by voxel
    // BUG-3: also supported if a brick occupies the cell below
    const near: Brick[] = [];
    bricksNearCell(x, y - 1, z, near);
    for (const b of near) {
      if (b.sy === y - 1) return; // brick under it
    }
    world.set(x, y, z, ID.Air);
    markDirtyAt(x, z);
    const mesh = new THREE.Mesh(fallerGeo(id), opaqueLam);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    if (plasticOn) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    scene.add(mesh);
    fallers.push({ id, x: x + 0.5, z: z + 0.5, y, vy: 0, mesh });
  }

  function updateFallers(dt: number) {
    for (let i = fallers.length - 1; i >= 0; i--) {
      const f = fallers[i];
      const cx = Math.floor(f.x);
      const cz = Math.floor(f.z);
      const here = world.get(cx, Math.floor(f.y), cz);
      const inFluid = here === ID.Water || here === ID.Lava;
      f.vy -= (inFluid ? 9 : FALL_G) * dt;
      const term = inFluid ? -5 : FALL_TERM;
      if (f.vy < term) f.vy = term;
      // Sub-step so a hitched frame can't tunnel through a 1-block floor.
      const steps = Math.max(1, Math.ceil((Math.abs(f.vy) * dt) / 0.45));
      const sdt = dt / steps;
      let landed = false;
      for (let s = 0; s < steps && !landed; s++) {
        f.y += f.vy * sdt;
        const cellY = Math.floor(f.y);
        const voxelSolid = def(world.get(cx, cellY, cz)).solid;
        // BUG-3: also land on a brick in this cell
        let brickSolid = false;
        if (!voxelSolid) {
          const near: Brick[] = [];
          bricksNearCell(cx, cellY, cz, near);
          for (const b of near) if (b.sy === cellY) { brickSolid = true; break; }
        }
        if (voxelSolid || brickSolid) {
          const landY = cellY + 1;
          world.set(cx, landY, cz, f.id);
          markDirtyAt(cx, cz);
          burst(f.x, landY + 0.1, f.z, def(f.id).color, 5);
          if (Math.hypot(player.x - f.x, player.z - f.z) < 10) padRumble(0.12, 0.08, 40);
          landed = true;
        }
      }
      if (landed || f.y < -12) {
        scene.remove(f.mesh);
        fallers.splice(i, 1);
        continue;
      }
      f.mesh.position.set(f.x, f.y + 0.5, f.z);
    }
  }

  // ---- P0: the stud grid — offset bricks (Muse, master plan P0) --------
  // Terrain stays voxel. A plain full-cube block placed with the aim point
  // in the FAR half of the target cell (tangent axes) snaps to the stud
  // lattice instead: half-block offsets in x/z, y cell-aligned, stored in
  // this dedicated layer as a 2×2-stud BRICK. Aligned aim = classic voxel
  // placement, 100 % legacy behaviour. Bricks render as one InstancedMesh
  // per block id (box + 4 studs, atlas UVs like the fallers), collide via
  // an explicit AABB pass in overlapAt/moveAxis, and persist in the save.
  // v1 limits (WORKLOG): invisible to fire/melt/faller scans and mob
  // physics; no net sync; sand can rest-fall through a brick.
  type Brick = { id: number; sx: number; sy: number; sz: number };
  const bricks = new Map<string, Brick>(); // key "sx,sy,sz" (stud coords)
  // P2: welded joints between touching bricks — pair keys "keyA|keyB"
  // (sorted). A welded pair supports each other with NO cantilever cost
  // in computeIntegrity (see the P1 section); a welded brick refuses
  // normal mining (cut it with shears, or it never comes apart in v1).
  const welds = new Set<string>();
  let weldPrime = ""; // brick key primed by the welding torch (first click)
  let weldActAt = 0; // debounce for the torch's repeat-fire place path
  const weldKey = (a: string, b: string) => (a < b ? a + "|" + b : b + "|" + a);
  function brickWelded(key: string): boolean {
    for (const w of welds) {
      const [a, b] = w.split("|");
      if (a === key || b === key) return true;
    }
    return false;
  }
  function unweldBrick(key: string) {
    for (const w of [...welds]) {
      const [a, b] = w.split("|");
      if (a === key || b === key) welds.delete(w);
    }
    if (weldPrime === key) weldPrime = "";
  }
  function bricksTouch(a: Brick, b: Brick): boolean {
    const ox = Math.min(a.sx + 2, b.sx + 2) - Math.max(a.sx, b.sx);
    const oz = Math.min(a.sz + 2, b.sz + 2) - Math.max(a.sz, b.sz);
    if (a.sy === b.sy) return (ox === 0 && oz > 0) || (oz === 0 && ox > 0);
    if (Math.abs(a.sy - b.sy) === 1) return ox > 0 && oz > 0;
    return false;
  }
  const brickGrid = new Map<string, Set<string>>(); // voxel cell key -> brick keys
  const brickMeshes = new Map<number, THREE.InstancedMesh>();
  const brickGeos = new Map<number, THREE.BufferGeometry>();
  const TECHNIC_SET = new Set<number>(TECHNIC);

  const aimPt = { x: 0, y: 0, z: 0 }; // frame aim point (face point of the current target)

  // ---- Technic 1:1 layer (Claude's technic.ts, wired in by Muse) -----
  // Parts live in their own TechWorld on the half-module lattice (q
  // units; world blocks = q / 4). Rendering: ONE Mesh per part — parts
  // are player-placed and few — with geometry from technicGeo (module
  // units, technic.ts local frame), matrix = T(q/4) · ORIENTS[o] ·
  // S(0.5), plus the mechanics group spin about the group axis line
  // (from technic.ts step()). Meshes sync when tech.rev changes;
  // transforms rewrite every frame (one compose per part, no allocs).
  // v1 limits: no player collision with parts, no net sync (same as
  // the P0 brick layer's v1).
  const tech = new TechWorld();
  const techGroup = new THREE.Group();
  scene.add(techGroup);
  const techMeshes = new Map<number, THREE.Mesh>();
  const techGeos = new Map<number, THREE.BufferGeometry>();
  const techMatSolid = new THREE.MeshLambertMaterial({ vertexColors: true });
  const techGhostMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.45, depthWrite: false });
  const techGhostMesh = new THREE.Mesh(new THREE.BufferGeometry(), techGhostMat);
  techGhostMesh.visible = false;
  techGhostMesh.frustumCulled = false;
  techGhostMesh.userData.keepShadow = false;
  scene.add(techGhostMesh);
  let techGhostId = 0;
  let techSpin = 0; // cycles plan() variants (R key / touch "tourner" button)
  let techRevSeen = -1;

  const EMPTY_TECH_GEO = new THREE.BufferGeometry();
  function techGeoOf(id: number): THREE.BufferGeometry {
    let g = techGeos.get(id);
    if (!g) {
      // buildTechnicGeometry returns null only for an id without a spec;
      // every TECHNIC_SET id has one, so the empty fallback is unreachable
      // in play — it exists to keep the cache total.
      g = buildTechnicGeometry(id) ?? EMPTY_TECH_GEO;
      techGeos.set(id, g);
    }
    return g;
  }

  const _techR = new THREE.Matrix4();
  const _techSpinM = new THREE.Matrix4();
  const _techNeg = new THREE.Matrix4();
  const _techV = new THREE.Vector3();
  /** Pose matrix of a part (no mechanics spin): geometry is in modules,
   *  the lattice in half-modules — T(q/4) · ORIENTS[o] · S(0.5). */
  function techBaseMatrix(o: number, q: readonly number[], out: THREE.Matrix4) {
    const m = ORIENTS[o];
    _techR.set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1);
    out.makeTranslation(q[0] / 4, q[1] / 4, q[2] / 4);
    out.multiply(_techR);
    out.scale(_techV.set(0.5, 0.5, 0.5));
    return out;
  }
  /** Full render matrix: base pose, then the group's mechanics spin
   *  about its axis line (axis point comes from conns — q units). */
  function techWriteMatrix(p: TechPart, out: THREE.Matrix4) {
    techBaseMatrix(p.o, p.q, out);
    const g = tech.groups.get(p.uid);
    if (g === undefined) return;
    const ang = tech.gAngle.get(g) ?? 0;
    if (!ang) return;
    const axis = tech.gAxis.get(g);
    if (!axis) return;
    _techV.set(axis.p[0] / 4, axis.p[1] / 4, axis.p[2] / 4);
    _techSpinM.makeTranslation(_techV.x, _techV.y, _techV.z);
    _techSpinM.multiply(_techR.makeRotationAxis(axis.ax === 0 ? _techV.set(1, 0, 0) : axis.ax === 1 ? _techV.set(0, 1, 0) : _techV.set(0, 0, 1), ang));
    _techV.set(axis.p[0] / 4, axis.p[1] / 4, axis.p[2] / 4);
    _techSpinM.multiply(_techNeg.makeTranslation(-_techV.x, -_techV.y, -_techV.z));
    out.premultiply(_techSpinM);
  }

  function syncTechMeshes() {
    for (const [uid, mesh] of techMeshes) {
      if (!tech.parts.has(uid)) {
        techGroup.remove(mesh);
        techMeshes.delete(uid);
      }
    }
    for (const p of tech.parts.values()) {
      if (techMeshes.has(p.uid)) continue;
      const mesh = new THREE.Mesh(techGeoOf(p.id), techMatSolid);
      mesh.frustumCulled = false;
      mesh.matrixAutoUpdate = false;
      if (plasticOn) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
      techWriteMatrix(p, mesh.matrix);
      mesh.matrixWorldNeedsUpdate = true;
      techGroup.add(mesh);
      techMeshes.set(p.uid, mesh);
    }
  }
  function clearTech() {
    tech.clear();
    for (const mesh of techMeshes.values()) techGroup.remove(mesh);
    techMeshes.clear();
    techRevSeen = -1;
    techGhostMesh.visible = false;
  }
  /** Voxel/brick solidity for the planner, in BLOCK coords (technic.ts
   *  floors q/4 itself). Fluids and plants don't block a part. */
  function techSolidAt(x: number, y: number, z: number) {
    const id = world.get(x, y, z);
    if (id !== ID.Air && def(id).solid) return true;
    return brickCellBlocked(x, y, z);
  }
  /** World AABB (blocks) of a posed part, from technic's own bbox. */
  function techPartAabb(id: number, o: number, q: readonly number[]) {
    const [lo, hi] = techBbox(id, o);
    return {
      c: [(q[0] + (lo[0] + hi[0]) / 2) / 4, (q[1] + (lo[1] + hi[1]) / 2) / 4, (q[2] + (lo[2] + hi[2]) / 2) / 4] as [number, number, number],
      s: [(hi[0] - lo[0]) / 4, (hi[1] - lo[1]) / 4, (hi[2] - lo[2]) / 4] as [number, number, number],
    };
  }
  function techHitsPlayer(id: number, o: number, q: readonly number[]) {
    const a = techPartAabb(id, o, q);
    return (
      a.c[0] - a.s[0] / 2 < player.x + HW &&
      a.c[0] + a.s[0] / 2 > player.x - HW &&
      a.c[1] - a.s[1] / 2 < player.y + BODY &&
      a.c[1] + a.s[1] / 2 > player.y &&
      a.c[2] - a.s[2] / 2 < player.z + HW &&
      a.c[2] + a.s[2] / 2 > player.z - HW
    );
  }
  /** Power rule for technic.step(): a motor runs when it is switched on
   *  and a switched-on hub / battery box belongs to the same assembly —
   *  any connector of the box within ~5 M of any connector of the motor
   *  (conns are in q units, so 10 q), or the part centres within ~6 M
   *  (some boxes, like the hub's top, carry few connectors). */
  function techPowered(p: TechPart): boolean {
    if (p.on === false) return false;
    if (techSpec(p.id)?.drive !== "motor") return true;
    const ca = techPartAabb(p.id, p.o, p.q).c;
    for (const other of tech.parts.values()) {
      if (other.uid === p.uid || other.on === false) continue;
      if (techSpec(other.id)?.drive !== "power") continue;
      const cb = techPartAabb(other.id, other.o, other.q).c;
      if (Math.hypot((ca[0] - cb[0]) * 4, (ca[1] - cb[1]) * 4, (ca[2] - cb[2]) * 4) <= 12) return true;
      for (const a of tech.conns(p))
        for (const b of tech.conns(other))
          if (Math.hypot(a.c[0] - b.c[0], a.c[1] - b.c[1], a.c[2] - b.c[2]) <= 10 + Math.max(a.len, b.len)) return true;
    }
    return false;
  }

  function tickTechnic(dt: number) {
    // Spin input: R key (edge, consumed) + the touch "tourner" pulse.
    if (keys.has("KeyR")) {
      keys.delete("KeyR");
      techSpin++;
    }
    if (touch.spin) {
      touch.spin = false;
      techSpin++;
    }
    if (tech.parts.size === 0) return;
    tech.step(dt, techPowered);
    if (tech.rev !== techRevSeen) {
      techRevSeen = tech.rev;
      syncTechMeshes();
    }
    for (const [uid, mesh] of techMeshes) {
      const p = tech.parts.get(uid);
      if (!p) continue;
      techWriteMatrix(p, mesh.matrix);
      mesh.matrixWorldNeedsUpdate = true;
    }
  }

  function hideTechGhost() {
    techGhostMesh.visible = false;
  }
  function showTechGhost(id: number, plan: TechPlan, ok: boolean) {
    if (id !== techGhostId) {
      techGhostId = id;
      techGhostMesh.geometry = techGeoOf(id);
    }
    techBaseMatrix(plan.o, plan.q, techGhostMesh.matrix);
    techGhostMesh.matrixAutoUpdate = false;
    techGhostMesh.matrixWorldNeedsUpdate = true;
    techGhostMat.color.set(ok ? 0xffffff : 0xe23b2f);
    techGhostMat.opacity = ok ? 0.45 : 0.25;
    techGhostMesh.visible = true;
  }

  function tryPlaceTech(plan: TechPlan) {
    const held = hotbar[slot];
    if (!TECHNIC_SET.has(held)) return;
    if (!creative && (inv[held] ?? 0) <= 0) {
      say("Out of those parts");
      return;
    }
    if (techHitsPlayer(held, plan.o, plan.q)) {
      say("Can't fit a part into yourself");
      return;
    }
    const p = tech.add(held, plan.o, plan.q);
    if (!creative) spend(held, 1);
    const c = techPartAabb(p.id, p.o, p.q).c;
    burst(c[0], c[1], c[2], def(held).color, 6);
    audio.snap();
    swing = 1;
    saveDirty = true;
  }

  function breakTechPart(uid: number) {
    const p = tech.parts.get(uid);
    if (!p) return;
    const id = p.id;
    const c = techPartAabb(id, p.o, p.q).c;
    tech.remove(uid);
    // A part is a physical object: mining always returns it, in both
    // modes (no pellets — it comes back as itself, like real LEGO).
    dropItem(id, 1, c[0], c[1] + 0.25, c[2]);
    burst(c[0], c[1], c[2], def(id).color, 7);
    audio.brickBreak();
    padRumble(0.12, 0.25, 45);
    swing = 1;
    saveDirty = true;
    mineTime = 0;
    mineKey = "";
    hideCrack();
  }

  /** The crank / hub / battery switch: flips the part's `on` flag, which
   *  technic.step() (cranks) and techPowered() (motors) both read. */
  function toggleTechPart(p: TechPart) {
    p.on = p.on === false ? true : false;
    say(def(p.id).name + (p.on ? " — on" : " — off"));
    audio.place();
    saveDirty = true;
  }

  // Save conversion (Technic étape 4): a Technic part stored as a P0
  // brick sat in ONE block cell (stud coords sx, sy, sz). Re-seat it
  // with the planner, flat on the floor of its old cell; if no pose
  // fits, try the raw lattice origin; if even that collides, drop it
  // as an item — a migration never deletes a part.
  function convertLegacyTechBrick(id: number, sx: number, sy: number, sz: number) {
    const face = sy * 4;
    const plan = tech.plan(id, { kind: "face", point: [sx * 2 + 2, face, sz * 2 + 2], n: [1, 1], face }, [0, 0, 1], 0, techSolidAt);
    if (plan) {
      tech.add(id, plan.o, plan.q);
      return;
    }
    const q: [number, number, number] = [sx * 2, sy * 4, sz * 2];
    if (tech.test(id, 0, q, techSolidAt) >= 0) {
      tech.add(id, 0, q);
      return;
    }
    dropItem(id, 1, sx / 2 + 0.5, sy + 1.2, sz / 2 + 0.5);
  }

  const brickKey = (sx: number, sy: number, sz: number) => sx + "," + sy + "," + sz;
  const cellKey3 = (x: number, y: number, z: number) => x + "," + y + "," + z;

  function brickCells(b: Brick) {
    const bx = b.sx / 2;
    const bz = b.sz / 2;
    const out: string[] = [];
    for (let cx = Math.floor(bx); cx <= Math.floor(bx + 0.999); cx++)
      for (let cz = Math.floor(bz); cz <= Math.floor(bz + 0.999); cz++) out.push(cellKey3(cx, b.sy, cz));
    return out;
  }

  function addBrick(id: number, sx: number, sy: number, sz: number) {
    const b: Brick = { id, sx, sy, sz };
    const k = brickKey(sx, sy, sz);
    bricks.set(k, b);
    for (const ck of brickCells(b)) {
      let s = brickGrid.get(ck);
      if (!s) brickGrid.set(ck, (s = new Set()));
      s.add(k);
    }
    return b;
  }

  function removeBrick(key: string) {
    const b = bricks.get(key);
    if (!b) return;
    unweldBrick(key);
    bricks.delete(key);
    for (const ck of brickCells(b)) {
      const s = brickGrid.get(ck);
      if (s) {
        s.delete(key);
        if (s.size === 0) brickGrid.delete(ck);
      }
    }
    rebuildBrickMesh(b.id);
  }

  function clearBricks() {
    bricks.clear();
    welds.clear();
    weldPrime = "";
    brickGrid.clear();
    brickStress.clear();
    brickSagged.clear();
    for (const f of fallingBricks) scene.remove(f.mesh);
    fallingBricks.length = 0;
    for (const m of brickMeshes.values()) {
      scene.remove(m);
      m.dispose();
    }
    brickMeshes.clear();
  }

  function brickGeo(id: number) {
    let g = brickGeos.get(id);
    if (g) return g;
    const parts: THREE.BufferGeometry[] = [fallerGeo(id).clone()];
    // Studs wear the TOP tile, remapped like fallerGeo remaps its faces.
    const tile = faceTile(id, 0);
    const c = tile % ATLAS_COLS;
    const r = Math.floor(tile / ATLAS_COLS);
    const du = 1 / ATLAS_COLS;
    const dv = 1 / ATLAS_ROWS;
    const u0 = c * du + du * 0.08;
    const u1 = (c + 1) * du - du * 0.08;
    const vTop = 1 - r * dv - dv * 0.08;
    const vBot = 1 - (r + 1) * dv + dv * 0.08;
    for (const [ox, oz] of STUD_OFFSETS) {
      const cyl = new THREE.CylinderGeometry(STUD_R, STUD_R, STUD_H, 16);
      const uv = cyl.getAttribute("uv") as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), vBot + uv.getY(i) * (vTop - vBot));
      cyl.translate(ox - 0.5, 0.49 + STUD_H / 2, oz - 0.5);
      parts.push(cyl);
    }
    // Manual indexed merge (positions/normals/uvs + offset indices).
    let vtx = 0;
    let idx = 0;
    for (const p of parts) {
      vtx += p.getAttribute("position").count;
      idx += p.getIndex()!.count;
    }
    const pos = new Float32Array(vtx * 3);
    const nor = new Float32Array(vtx * 3);
    const uvA = new Float32Array(vtx * 2);
    // BUG-1 fix (Muse, 2026-10-29): the realistic material (opaqueStd)
    // has vertexColors:true — a geometry WITHOUT a color attribute reads
    // black per vertex and the brick renders desaturated grey (rig
    // measure qa109: Orange brick RGB 65/65/61 vs Orange voxel
    // 192/144/111, same cell, same camera). The chunk mesher writes
    // AO x tint ~ 1 for an unoccluded face, so bricks carry white —
    // exactly what a free-standing voxel face gets.
    const col = new Float32Array(vtx * 3).fill(1);
    const index = new Uint32Array(idx);
    let vo = 0;
    let io = 0;
    for (const p of parts) {
      pos.set(p.getAttribute("position").array as Float32Array, vo * 3);
      nor.set(p.getAttribute("normal").array as Float32Array, vo * 3);
      uvA.set(p.getAttribute("uv").array as Float32Array, vo * 2);
      const pi = p.getIndex()!;
      for (let i = 0; i < pi.count; i++) index[io + i] = pi.getX(i) + vo;
      vo += p.getAttribute("position").count;
      io += pi.count;
    }
    g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uvA, 2));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(index, 1));
    brickGeos.set(id, g);
    return g;
  }

  const _brickM4 = new THREE.Matrix4();
  function rebuildBrickMesh(id: number) {
    const old = brickMeshes.get(id);
    if (old) {
      scene.remove(old);
      old.dispose();
      brickMeshes.delete(id);
    }
    const list: Brick[] = [];
    for (const b of bricks.values()) if (b.id === id) list.push(b);
    if (list.length === 0) return;
    const mesh = new THREE.InstancedMesh(brickGeo(id), opaqueMat, list.length);
    list.forEach((b, i) => {
      // P1-2 sag: a stressed brick visibly sinks, proportional to its
      // accumulated stress (brickSagY lives in the P1 section below).
      _brickM4.makeTranslation(b.sx / 2 + 0.5, b.sy + 0.5 - brickSagY(brickKey(b.sx, b.sy, b.sz)), b.sz / 2 + 0.5);
      mesh.setMatrixAt(i, _brickM4);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    if (plasticOn) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    scene.add(mesh);
    brickMeshes.set(id, mesh);
  }

  function rebuildAllBrickMeshes() {
    const ids = new Set<number>();
    for (const b of bricks.values()) ids.add(b.id);
    for (const id of ids) rebuildBrickMesh(id);
  }

  function bricksNearCell(cx: number, cy: number, cz: number, out: Brick[]) {
    const s = brickGrid.get(cellKey3(cx, cy, cz));
    if (!s) return;
    for (const k of s) {
      const b = bricks.get(k);
      if (b && !out.includes(b)) out.push(b);
    }
  }

  // Does any brick's AABB intersect this voxel cell's box?
  function brickCellBlocked(cx: number, cy: number, cz: number) {
    const near: Brick[] = [];
    bricksNearCell(cx, cy, cz, near);
    for (const b of near) {
      const bx = b.sx / 2;
      const bz = b.sz / 2;
      if (bx < cx + 1 && bx + 1 > cx && bz < cz + 1 && bz + 1 > cz && b.sy < cy + 1 && b.sy + 1 > cy) return true;
    }
    return false;
  }

  function brickHitsPlayer(bx: number, by: number, bz: number) {
    return (
      player.x + HW > bx &&
      player.x - HW < bx + 1 &&
      player.y + BODY > by &&
      player.y < by + 1 &&
      player.z + HW > bz &&
      player.z - HW < bz + 1
    );
  }

  // Space check for a candidate brick at stud coords: every overlapped
  // voxel cell must be Air/plant (fluids BLOCK), no brick AABB overlap,
  // and (checked by callers that care) no player intersection.
  function brickSpaceFree(sx: number, sy: number, sz: number) {
    const cand: Brick = { id: 0, sx, sy, sz };
    const bx = sx / 2;
    const bz = sz / 2;
    for (const ck of brickCells(cand)) {
      const [cx, cy, cz] = ck.split(",").map(Number);
      const cellId = world.get(cx, cy, cz);
      if (cellId !== ID.Air && !def(cellId).plant) return false;
      if (def(cellId).fluid) return false;
    }
    const near: Brick[] = [];
    for (const ck of brickCells(cand)) {
      const [cx, cy, cz] = ck.split(",").map(Number);
      bricksNearCell(cx, cy, cz, near);
    }
    for (const b of near) {
      const ox = b.sx / 2;
      const oz = b.sz / 2;
      if (bx < ox + 1 && bx + 1 > ox && bz < oz + 1 && bz + 1 > oz && sy < b.sy + 1 && sy + 1 > b.sy) return false;
    }
    return true;
  }

  // Snap a classic destination cell to the stud lattice using the aim
  // point A on the target face: on each tangent axis the brick STARTS at
  // the stud the player points at (origin = floor(A×2)/2). Aiming at the
  // near half of the cell → origin = the cell itself (aligned → classic
  // voxel, null); aiming at the far half → origin = cell + 0.5 (the brick
  // straddles the seam). Returns stud coords or null.
  function brickSnap(px: number, py: number, pz: number, nx: number, ny: number, nz: number) {
    const snapAxis = (a: number) => Math.floor(a * 2) / 2;
    const bx = nx !== 0 ? px : snapAxis(aimPt.x);
    const bz = nz !== 0 ? pz : snapAxis(aimPt.z);
    if (bx === px && bz === pz) return null;
    return { sx: Math.round(bx * 2), sy: py, sz: Math.round(bz * 2) };
  }

  // Placement assist (Philippe, 2026-10-29, photo of his wall ledge):
  // "je veux placer une brique sur les deux studs que je pointe ou
  // juste un stud — je peux pas." When the snapped candidate is blocked
  // (a wall rises beside the ledge, the brick would clip a neighbour),
  // placement used to refuse outright. The assist now tries the 8
  // neighbouring stud positions (±1 stud per axis, straight nudges
  // first) and takes the first that fits — aiming at two exposed studs
  // lands the brick ON those studs. Used by BOTH placement paths and
  // BOTH ghost paths, so the ghost always shows what the click will do.
  // Blocked everywhere: returns the primary candidate (ghost red, click
  // falls through to classic voxel placement, exactly as before).
  function brickSnapAssist(px: number, py: number, pz: number, nx: number, ny: number, nz: number) {
    const cand = brickSnap(px, py, pz, nx, ny, nz);
    if (!cand) return null;
    const fits = (sx: number, sz: number) => brickSpaceFree(sx, cand.sy, sz) && !brickHitsPlayer(sx / 2, cand.sy, sz / 2);
    if (fits(cand.sx, cand.sz)) return cand;
    const tries: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const [ox, oz] of tries) {
      const sx = cand.sx + ox, sz = cand.sz + oz;
      if (fits(sx, sz)) return { sx, sy: cand.sy, sz };
    }
    return cand;
  }

  function brickEligible(id: number, d: BlockDef) {
    return (
      d.placeable &&
      d.solid &&
      !d.slab &&
      !d.stairs &&
      !d.sign &&
      !d.torch &&
      !d.door &&
      !d.flat &&
      !d.fall &&
      !d.plant &&
      !d.fluid &&
      !d.crop &&
      !d.rail &&
      !d.plate &&
      !d.gate &&
      !d.lever &&
      !d.ladder &&
      !d.work &&
      id !== ID.ShulkerBox &&
      id !== ID.RedTorch &&
      !isComponent(id)
    );
  }

  type BrickHit = { brick: Brick; key: string; t: number; nx: number; ny: number; nz: number };
  function raycastBricks(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxD: number): BrickHit | null {
    const len = Math.hypot(dx, dy, dz) || 1;
    dx /= len;
    dy /= len;
    dz /= len;
    let x = Math.floor(ox);
    let y = Math.floor(oy);
    let z = Math.floor(oz);
    const stepX = dx >= 0 ? 1 : -1;
    const stepY = dy >= 0 ? 1 : -1;
    const stepZ = dz >= 0 ? 1 : -1;
    const tDeltaX = dx === 0 ? 1e12 : Math.abs(1 / dx);
    const tDeltaY = dy === 0 ? 1e12 : Math.abs(1 / dy);
    const tDeltaZ = dz === 0 ? 1e12 : Math.abs(1 / dz);
    let tMaxX = dx === 0 ? 1e12 : (dx > 0 ? x + 1 - ox : ox - x) * tDeltaX;
    let tMaxY = dy === 0 ? 1e12 : (dy > 0 ? y + 1 - oy : oy - y) * tDeltaY;
    let tMaxZ = dz === 0 ? 1e12 : (dz > 0 ? z + 1 - oz : oz - z) * tDeltaZ;
    let best: BrickHit | null = null;
    const seen = new Set<string>();
    const near: Brick[] = [];
    for (let i = 0; i < 48; i++) {
      near.length = 0;
      bricksNearCell(x, y, z, near);
      for (const b of near) {
        const k = brickKey(b.sx, b.sy, b.sz);
        if (seen.has(k)) continue;
        seen.add(k);
        const bx = b.sx / 2;
        const bz = b.sz / 2;
        const t = rayBox(ox, oy, oz, dx, dy, dz, bx, b.sy, bz, bx + 1, b.sy + 1, bz + 1);
        if (t === null || t <= 0.02 || t > maxD) continue;
        if (best && t >= best.t) continue;
        // Face normal: the axis whose scaled local hit coord is largest.
        const hx = ox + dx * t;
        const hy = oy + dy * t;
        const hz = oz + dz * t;
        const lx = Math.abs((hx - (bx + 0.5)) / 0.5);
        const ly = Math.abs((hy - (b.sy + 0.5)) / 0.5);
        const lz = Math.abs((hz - (bz + 0.5)) / 0.5);
        let nx = 0;
        let ny = 0;
        let nz = 0;
        if (lx >= ly && lx >= lz) nx = hx > bx + 0.5 ? 1 : -1;
        else if (ly >= lz) ny = hy > b.sy + 0.5 ? 1 : -1;
        else nz = hz > bz + 0.5 ? 1 : -1;
        best = { brick: b, key: k, t, nx, ny, nz };
      }
      // A hit found in this cell can only be beaten by another brick whose
      // entry lies in this same cell (already checked) — once the ray's
      // exit distance from this cell passes best.t, nothing later can win.
      const exitT = Math.min(tMaxX, tMaxY, tMaxZ);
      if (best && exitT >= best.t) return best;
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        if (tMaxX > maxD) return best;
        x += stepX;
        tMaxX += tDeltaX;
      } else if (tMaxY < tMaxZ) {
        if (tMaxY > maxD) return best;
        y += stepY;
        tMaxY += tDeltaY;
      } else {
        if (tMaxZ > maxD) return best;
        z += stepZ;
        tMaxZ += tDeltaZ;
      }
    }
    return best;
  }

  // Mirror of breakBlock's yield rules against a brick (v1: no chips /
  // crack overlay — burst particles + hud.mine carry the feedback).
  function breakBrick(key: string) {
    const b = bricks.get(key);
    if (!b) return;
    const block = def(b.id);
    if (block.hard === Infinity) return;
    const bx = b.sx / 2;
    const bz = b.sz / 2;
    removeBrick(key);
    if (!creative) {
      const held = def(hotbar[slot]);
      const tier = held.tool === "pick" ? held.tier : 0;
      const canDrop = !block.need || tier >= block.need;
      const yieldAt = (dropId: number) => dropItem(dropId, 1, bx + 0.5, b.sy + 0.55, bz + 0.5);
      // P6: a broken brick yields foundry pellets too (same table as voxel).
      if (canDrop) for (let p = 0, py = plasticYield(b.id); p < py; p++) yieldAt(ID.Pellets);
      if (canDrop && block.drop !== -1) yieldAt(enchLvl(hotbar[slot], "silk") > 0 ? b.id : block.drop || b.id);
      if (canDrop && block.drop !== -1 && (ORE_XP[b.id] ?? 0) > 0 && enchLvl(hotbar[slot], "silk") === 0) {
        const fort = held.tool === "pick" ? enchLvl(hotbar[slot], "fortune") : 0;
        for (let f = 0; f < fort; f++) if (Math.random() < 0.35) yieldAt(block.drop || b.id);
      }
      const right =
        (held.tool === "pick" && (block.tough || block.need > 0)) ||
        (held.tool === "axe" && AXE_OK(b.id)) ||
        (held.tool === "shovel" && SHOVEL_OK(b.id));
      if (right) wearHeld();
      if (canDrop) gainXp(ORE_XP[b.id] ?? 0);
    }
    if (block.plant || !block.solid) burst(bx + 0.5, b.sy + 0.5, bz + 0.5, block.color, 7);
    else if (block.glass) burst(bx + 0.5, b.sy + 0.5, bz + 0.5, "#dff2ff", 12);
    else if (chippable(b.id)) {
      const col = block.side || block.color;
      for (let p = 0; p < 12; p++) {
        const [cx, cy, cz] = CH.pieceCentre(p);
        spawnPiece(bx + cx, b.sy + cy, bz + cz, col, (cx - 0.5) * 3.4 + (Math.random() - 0.5) * 0.8, 1.2 + cy * 2.2 + Math.random() * 1.1, (cz - 0.5) * 3.4 + (Math.random() - 0.5) * 0.8);
      }
    } else burstModularBlock(bx + 0.5, b.sy + 0.5, bz + 0.5, block);
    padRumble(0.12, 0.25, 45);
    audio.brickBreak();
    swing = 1;
    saveDirty = true;
    mineTime = 0;
    mineKey = "";
    hideCrack();
  }

  // ---- P1: structural integrity (Muse, master plan P1) -----------------
  // A brick holds by the studs it actually covers. Studs covered from
  // below (voxel ground quadrants + bricks underneath, per 1x1-stud
  // quadrant, cap 4): >= 1 covered = ANCHORED (was >= 2 until
  // Philippe's 2026-10-29 corner-stud recalibration — see
  // computeIntegrity). Support then propagates:
  // stacked on a supported brick (any stud overlap) inherits its
  // cantilever count; a purely horizontal side-clutch step adds 1, max 2
  // steps — the 3rd brick of a free cantilever is unsupported.
  // Unsupported bricks accumulate stress on a 0.25 s scan; at 0.75 s of
  // game time they let go and fall as real entities, re-landing as
  // bricks where they stop (or dropping as items if the spot is taken).
  // Scans are periodic, so cutting a voxel support is caught within one
  // scan. Cost: zero when no bricks exist; O(bricks^2) worst per scan
  // (brick counts are player-scale).
  // P1-2 sag: while a brick accumulates stress it visibly sinks —
  // offset = (stress / 0.75) * 0.15 blocks, linear, applied to the
  // instance matrix in rebuildBrickMesh. tickBricks rebuilds ONLY the
  // block ids whose sag state changed on that scan (stressed ids, plus
  // ids whose bricks recovered support and must rise back to 0).
  type FallingBrick = { id: number; x: number; z: number; y: number; vy: number; mesh: THREE.Mesh };
  const fallingBricks: FallingBrick[] = [];
  const brickStress = new Map<string, number>();
  const brickSagged = new Set<string>(); // brick keys currently rendered with sag > 0
  const BRICK_STRESS_MAX = 0.12; // was 0.75 — Philippe: LEGO gravity was not visible
  const BRICK_SAG_MAX = 0.15;
  // P6-2 Trempe (Muse): tempered colour bricks (410-418) are the grade
  // above plain cast bricks — they hold stress twice as long before
  // letting go, and sag against their OWN threshold (same max sag,
  // reached half as fast). One helper, read by tickBricks + brickSagY.
  const TEMPERED_STRESS_MAX = BRICK_STRESS_MAX * 2; // P6-2 invariant: tempered holds 2x plain - must track BRICK_STRESS_MAX (was a stale 1.5 literal from the 0.75 era)
  function isTemperedBrick(id: number): boolean {
    return id >= ID.TRed && id <= ID.TBlack;
  }
  function stressMaxFor(id: number): number {
    return isTemperedBrick(id) ? TEMPERED_STRESS_MAX : BRICK_STRESS_MAX;
  }
  function brickSagY(key: string): number {
    const s = brickStress.get(key) ?? 0;
    if (s <= 0) return 0;
    const b = bricks.get(key);
    const max = b ? stressMaxFor(b.id) : BRICK_STRESS_MAX;
    return Math.min(s / max, 1) * BRICK_SAG_MAX;
  }
  let integrityAcc = 0;
  let lastIntegrity = { total: 0, supported: 0, stressed: [] as string[], falling: 0 };

  function studQuadrantCovered(b: Brick, qx: number, qz: number): boolean {
    const wx = Math.floor((b.sx + qx) * 0.5 + 0.25);
    const wz = Math.floor((b.sz + qz) * 0.5 + 0.25);
    const below = world.get(wx, b.sy - 1, wz);
    if (below !== ID.Air && def(below).solid) return true;
    const near: Brick[] = [];
    bricksNearCell(wx, b.sy - 1, wz, near);
    for (const ob of near) {
      if (ob.sy !== b.sy - 1) continue;
      if (b.sx + qx >= ob.sx && b.sx + qx < ob.sx + 2 && b.sz + qz >= ob.sz && b.sz + qz < ob.sz + 2) return true;
    }
    return false;
  }

  function studsCoveredBelow(b: Brick): number {
    let n = 0;
    for (let qx = 0; qx < 2; qx++) for (let qz = 0; qz < 2; qz++) if (studQuadrantCovered(b, qx, qz)) n++;
    return n;
  }

  // Weight above a brick (count of bricks stacked on it, direct or via chain).
  // Real LEGO: 1 stud holds almost nothing, 2 studs hold a little, 3–4 hold a lot.
  function weightAbove(b: Brick, all: Brick[], seen = new Set<string>()): number {
    const k = brickKey(b.sx, b.sy, b.sz);
    if (seen.has(k)) return 0;
    seen.add(k);
    let w = 1; // itself
    for (const ob of all) {
      if (ob.sy !== b.sy + 1) continue;
      const ox = Math.min(b.sx + 2, ob.sx + 2) - Math.max(b.sx, ob.sx);
      const oz = Math.min(b.sz + 2, ob.sz + 2) - Math.max(b.sz, ob.sz);
      if (ox > 0 && oz > 0) w += weightAbove(ob, all, seen);
    }
    return w;
  }

  function maxWeightForStuds(studs: number): number {
    if (studs <= 0) return 0;
    if (studs === 1) return 2; // itself + one more (recalibrated 2026-10-29, Philippe: corner-stud builds must hold)
    if (studs === 2) return 4;
    return 99; // 3–4 studs hold a stack
  }

  function computeIntegrity() {
    const cant = new Map<string, number>();
    const all = [...bricks.values()];
    // Recalibrated 2026-10-29 (Philippe): ONE covered stud anchors the
    // brick itself — real LEGO clutch holds on a single corner stud, and
    // the old >= 2 seed made every 1-stud landing over a voxel block
    // fall within a scan (voxels can't grant support by propagation).
    // Strength still scales with coverage via maxWeightForStuds below.
    for (const b of all) if (studsCoveredBelow(b) >= 1) cant.set(brickKey(b.sx, b.sy, b.sz), 0);
    let changed = true;
    while (changed) {
      changed = false;
      for (const b of all) {
        const k = brickKey(b.sx, b.sy, b.sz);
        if (cant.has(k)) continue;
        let best = -1;
        for (const ob of all) {
          if (ob === b) continue;
          const okey = brickKey(ob.sx, ob.sy, ob.sz);
          const oc = cant.get(okey);
          if (oc === undefined) continue;
          // P2: a welded joint is a permanent bond — support crosses it
          // at the SAME cantilever count, no matter the direction, so a
          // welded run holds far past the free cantilever max of 2.
          if (welds.size > 0 && welds.has(weldKey(k, okey))) {
            best = best < 0 ? oc : Math.min(best, oc);
            continue;
          }
          const ox = Math.min(b.sx + 2, ob.sx + 2) - Math.max(b.sx, ob.sx);
          const oz = Math.min(b.sz + 2, ob.sz + 2) - Math.max(b.sz, ob.sz);
          if (ob.sy === b.sy - 1 && ox > 0 && oz > 0) best = best < 0 ? oc : Math.min(best, oc);
          else if (ob.sy === b.sy && ((ox === 0 && oz > 0) || (oz === 0 && ox > 0)) && oc + 1 <= 2)
            best = best < 0 ? oc + 1 : Math.min(best, oc + 1);
        }
        if (best >= 0) {
          cant.set(k, best);
          changed = true;
        }
      }
    }
    return cant;
  }

  function detachBrick(key: string) {
    const b = bricks.get(key);
    if (!b) return;
    removeBrick(key);
    brickStress.delete(key);
    brickSagged.delete(key);
    if (fallingBricks.length >= FALL_CAP) {
      dropItem(b.id, 1, b.sx / 2 + 0.5, b.sy + 0.55, b.sz / 2 + 0.5);
      return;
    }
    const mesh = new THREE.Mesh(brickGeo(b.id), opaqueLam);
    mesh.position.set(b.sx / 2 + 0.5, b.sy + 0.5, b.sz / 2 + 0.5);
    if (plasticOn) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    scene.add(mesh);
    fallingBricks.push({ id: b.id, x: b.sx / 2, z: b.sz / 2, y: b.sy, vy: 0, mesh });
    burst(b.sx / 2 + 0.5, b.sy + 0.4, b.sz / 2 + 0.5, def(b.id).color, 6);
    audio.break();
    saveDirty = true;
  }

  function updateFallingBricks(dt: number) {
    for (let i = fallingBricks.length - 1; i >= 0; i--) {
      const f = fallingBricks[i];
      f.vy -= FALL_G * dt;
      if (f.vy < FALL_TERM) f.vy = FALL_TERM;
      const steps = Math.max(1, Math.ceil((Math.abs(f.vy) * dt) / 0.45));
      const sdt = dt / steps;
      let landY = -1;
      for (let s = 0; s < steps && landY < 0; s++) {
        const prevY = f.y;
        f.y += f.vy * sdt;
        const cy = Math.floor(f.y);
        const probe: Brick = { id: f.id, sx: Math.round(f.x * 2), sy: cy, sz: Math.round(f.z * 2) };
        for (const ck of brickCells(probe)) {
          const [cx, , cz] = ck.split(",").map(Number);
          if (def(world.get(cx, cy, cz)).solid) {
            landY = cy + 1;
            break;
          }
          const near: Brick[] = [];
          bricksNearCell(cx, cy, cz, near);
          bricksNearCell(cx, cy - 1, cz, near);
          for (const ob of near) {
            const ox = Math.min(f.x + 1, ob.sx / 2 + 1) - Math.max(f.x, ob.sx / 2);
            const oz = Math.min(f.z + 1, ob.sz / 2 + 1) - Math.max(f.z, ob.sz / 2);
            if (ox > 0 && oz > 0 && ob.sy + 1 <= prevY + 0.001 && ob.sy + 1 > f.y) {
              landY = ob.sy + 1;
              break;
            }
          }
          if (landY >= 0) break;
        }
      }
      if (landY >= 0) {
        const sx = Math.round(f.x * 2);
        const sz = Math.round(f.z * 2);
        scene.remove(f.mesh);
        fallingBricks.splice(i, 1);
        if (brickSpaceFree(sx, landY, sz) && !brickHitsPlayer(f.x, landY, f.z)) {
          addBrick(f.id, sx, landY, sz);
          rebuildBrickMesh(f.id);
        } else dropItem(f.id, 1, f.x + 0.5, landY + 0.55, f.z + 0.5);
        burst(f.x + 0.5, landY + 0.1, f.z + 0.5, def(f.id).color, 5);
        saveDirty = true;
        continue;
      }
      if (f.y < -12) {
        scene.remove(f.mesh);
        fallingBricks.splice(i, 1);
        continue;
      }
      f.mesh.position.set(f.x + 0.5, f.y + 0.5, f.z + 0.5);
    }
  }

  function tickBricks(dt: number) {
    if (fallingBricks.length) updateFallingBricks(dt);
    if (bricks.size === 0) {
      if (brickStress.size) brickStress.clear();
      if (brickSagged.size) brickSagged.clear();
      lastIntegrity = { total: 0, supported: 0, stressed: [], falling: fallingBricks.length };
      return;
    }
    integrityAcc += dt;
    if (integrityAcc < 0.25) return;
    const step = integrityAcc;
    integrityAcc = 0;
    const cant = computeIntegrity();
    const stressed: string[] = [];
    const sagIds = new Set<number>(); // ids to rebuild for sag changes only
    const allBricks = [...bricks.values()];
    for (const b of allBricks) {
      const k = brickKey(b.sx, b.sy, b.sz);
      // Weight overload: too much on 1–2 studs → treat as unsupported (real LEGO)
      const studs = studsCoveredBelow(b);
      if (studs > 0 && studs <= 2) {
        const w = weightAbove(b, allBricks);
        if (w > maxWeightForStuds(studs)) {
          cant.delete(k); // force stress / fall
        }
      }
      if (cant.has(k)) {
        brickStress.delete(k);
        if (brickSagged.delete(k)) sagIds.add(b.id); // recovered: rise back to 0
        continue;
      }
      const s = (brickStress.get(k) ?? 0) + step;
      brickStress.set(k, s);
      stressed.push(k);
      if (s >= stressMaxFor(b.id)) detachBrick(k);
      else {
        brickSagged.add(k);
        sagIds.add(b.id); // sag grew this scan
      }
    }
    for (const id of sagIds) rebuildBrickMesh(id);
    lastIntegrity = { total: bricks.size, supported: cant.size, stressed, falling: fallingBricks.length };
  }

  // P2: welding torch action on the aimed brick. First click primes a
  // brick, second click on a TOUCHING brick seals the joint. Clicking
  // the primed brick again cancels. The place path repeat-fires while
  // the button is held, so real actions are debounced to one per
  // 350 ms — a held button can prime but never prime+cancel itself.
  function weldAction(bh: BrickHit) {
    const now = performance.now();
    if (now - weldActAt < 350) return;
    weldActAt = now;
    const k = bh.key;
    const b = bh.brick;
    if (!weldPrime) {
      weldPrime = k;
      burst(b.sx / 2 + 0.5, b.sy + 0.9, b.sz / 2 + 0.5, "#ffb347", 5);
      say("Weld primed — tap a touching brick to seal the joint");
      swing = 1;
      return;
    }
    if (weldPrime === k) {
      weldPrime = "";
      say("Weld cancelled");
      return;
    }
    const a = bricks.get(weldPrime);
    if (!a) {
      weldPrime = k;
      say("Weld primed — tap a touching brick to seal the joint");
      return;
    }
    if (!bricksTouch(a, b)) {
      say("Too far apart — welded bricks must touch");
      return;
    }
    const wk = weldKey(weldPrime, k);
    if (welds.has(wk)) {
      weldPrime = "";
      say("Already welded");
      return;
    }
    welds.add(wk);
    weldPrime = "";
    wearHeld();
    burst((a.sx + b.sx) / 4 + 0.5, b.sy + 0.7, (a.sz + b.sz) / 4 + 0.5, "#ffcf5e", 10);
    audio.place();
    swing = 1;
    saveDirty = true;
    say("Welded — that joint holds for good");
  }

  function placeBrickNow(id: number, sx: number, sy: number, sz: number) {
    // Plants in overlapped cells are cleared (classic placement overwrites
    // them via world.set; the brick layer has to do it explicitly).
    for (const ck of brickCells({ id, sx, sy, sz })) {
      const [cx, cy, cz] = ck.split(",").map(Number);
      const cid = world.get(cx, cy, cz);
      if (cid !== ID.Air && def(cid).plant) {
        world.set(cx, cy, cz, ID.Air);
        markDirtyAt(cx, cz);
      }
    }
    addBrick(id, sx, sy, sz);
    rebuildBrickMesh(id);
    if (!creative) spend(id, 1);
    burst(sx / 2 + 0.5, sy + 0.8, sz / 2 + 0.5, def(id).color, 6);
    audio.snap();
    swing = 1;
    saveDirty = true;
  }

  // Placement against a brick face (the voxel tryPlace can't express a
  // half-offset target): food + generic placement only, v1.
  function tryPlaceBrick(bh: BrickHit) {
    const held = hotbar[slot];
    if (TECHNIC_SET.has(held)) return; // Technic parts place through the Technic layer only
    // P2: the welding torch never places — it welds the aimed brick.
    if (held === ID.Welder) {
      weldAction(bh);
      return;
    }
    const heldDef = def(held);
    if (heldDef.food) {
      eat();
      return;
    }
    if (!held || !heldDef.placeable) {
      say(held ? "That doesn't place" : "Empty hand");
      return;
    }
    if (!creative && (inv[held] ?? 0) <= 0) {
      say("Out of those bricks");
      return;
    }
    const b = bh.brick;
    // Destination cell: the voxel cell just beyond the struck face.
    const dx = Math.floor(b.sx / 2 + 0.5 + bh.nx * 1.01);
    const dy = Math.floor(b.sy + 0.5 + bh.ny * 1.01);
    const dz = Math.floor(b.sz / 2 + 0.5 + bh.nz * 1.01);
    if (brickEligible(held, heldDef)) {
      const cand = brickSnapAssist(dx, dy, dz, bh.nx, bh.ny, bh.nz);
      if (cand && brickSpaceFree(cand.sx, cand.sy, cand.sz) && !brickHitsPlayer(cand.sx / 2, cand.sy, cand.sz / 2)) {
        placeBrickNow(held, cand.sx, cand.sy, cand.sz);
        return;
      }
    }
    // Classic voxel placement against the brick face.
    if (dy <= 0 || dy >= HEIGHT - 1) return;
    const dest = world.get(dx, dy, dz);
    const destDef = def(dest);
    if (dest !== ID.Air && !destDef.plant && !destDef.fluid) return;
    if (brickCellBlocked(dx, dy, dz)) return;
    if (heldDef.solid && hitsPlayer(dx, dy, dz)) {
      say("Can't snap a brick into yourself");
      return;
    }
    if (!world.set(dx, dy, dz, held)) return;
    CH.setRemoved(dx, dy, dz, held, 0);
    markDirtyAt(dx, dz);
    netSendEdit(dx, dy, dz, held);
    if (!creative) spend(held, 1);
    burst(dx + 0.5, dy + 0.8, dz + 0.5, heldDef.color, 6);
    audio.place();
    swing = 1;
    saveDirty = true;
  }

  function bumpQuest(kind: "break" | "place" | "kill", tag: string) {
    const isDone = (id: string) => quests.find((p) => p.id === id)?.done ?? false;
    for (const q of QUESTS) {
      if (q.kind !== kind || q.tag !== tag) continue;
      if (!questActive(q, isDone)) continue;
      const prog = quests.find((p) => p.id === q.id);
      if (!prog || prog.done || prog.n >= q.need) continue;
      prog.n += 1;
      saveDirty = true;
      if (prog.n >= q.need) say(q.name + " is ready to claim");
    }
  }

  function hamletLine() {
    const site = world.nearestHamlet(player.x, player.z, 4) ?? (villageAt ? { x: villageAt.x, y: 0, z: villageAt.z } : null);
    if (!site) return "";
    const dx = site.x + 15 - player.x;
    const dz = site.z + 14 - player.z;
    if (Math.hypot(dx, dz) < 22) return " A hamlet sits around you.";
    const dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? "east" : "west") : dz > 0 ? "south" : "north";
    return " A hamlet sits " + dir + ".";
  }

  function castSpell() {
    if (!settings.mods.spells) return say("Spellcraft is off. Pause and tick the mod.");
    const list = spellsFor(skills);
    if (!list.length) return say("Learn Spark in the skill tree");
    const spell = list[spellIx % list.length];
    if (!creative && mana < spell.cost) return say("Need " + spell.cost + " mana");
    if (!creative) mana -= spell.cost;
    if (spell.id === "mend") {
      health = Math.min(20, health + 5);
      say("Mended");
    } else if (spell.id === "blink") {
      const dist = 5;
      const nx = player.x - Math.sin(player.yaw) * dist;
      const nz = player.z - Math.cos(player.yaw) * dist;
      const ny = player.y;
      const prev = { x: player.x, y: player.y, z: player.z };
      player.x = nx;
      player.z = nz;
      if (overlapAt(player.x, player.y, player.z)) {
        player.x = prev.x;
        player.y = prev.y;
        player.z = prev.z;
        if (!creative) mana += spell.cost;
        return say("The blink hits a brick");
      }
      player.y = ny;
      burst(player.x, player.y + 1, player.z, "#b48cff", 12);
      say("Blink");
    } else {
      let best: Mob | null = null;
      let bestD = 7;
      const lx = -Math.sin(player.yaw);
      const lz = -Math.cos(player.yaw);
      for (const m of mobs) {
        if (m.dead) continue;
        const host =
          m.kind === "walker" ||
          m.kind === "creeper" ||
          m.kind === "skelly" ||
          m.kind === "spider" ||
          m.kind === "phantom" ||
          m.kind === "ghast" ||
          m.kind === "piglin" ||
          m.kind === "wisp" ||
          m.kind === "dragon";
        if (!host) continue;
        const dx = m.x - player.x;
        const dz = m.z - player.z;
        const d = Math.hypot(dx, dz);
        if (d > bestD || d < 0.2) continue;
        if ((dx / d) * lx + (dz / d) * lz < 0.35) continue;
        best = m;
        bestD = d;
      }
      if (!best) return say("The spark fizzles");
      best.hp -= best.kind === "dragon" && crystalsLeft() > 0 ? 3 : 5;
      burst(best.x, best.y + 0.6, best.z, "#f5c518", 10);
      audio.hit();
      if (best.hp <= 0) killMob(best);
      else say("Spark");
    }
    swing = 1;
    saveDirty = true;
    emit();
  }

  function eat() {
    const id = hotbar[slot];
    const food = def(id).food;
    if (!food) return false;
    if (!creative && hunger >= 20) {
      say("Too full");
      return true;
    }
    if (!spend(id, 1)) return false;
    hunger = Math.min(20, hunger + food);
    if (health < 20 && food >= 6) health = Math.min(20, health + 1);
    audio.place();
    if (id === ID.Core) {
      gainXp(8);
      say("The core hums");
      return true;
    }
    say("Ate");
    return true;
  }

  function ensureChest(key: string) {
    let bin = chests.get(key);
    if (!bin) {
      bin = { ids: Array(27).fill(0), ns: Array(27).fill(0) };
      chests.set(key, bin);
    }
    return bin;
  }

  function ensureFurnace(key: string, x: number, y: number, z: number) {
    let f = furnaces.get(key);
    if (!f) {
      f = { x, y, z, in: 0, inN: 0, fuel: 0, fuelN: 0, out: 0, outN: 0, cook: 0, burn: 0 };
      furnaces.set(key, f);
    }
    return f;
  }

  function openPanel(next: "bag" | "bench" | "furnace" | "chest" | "enchant" | "anvil" | "brew" | "trade" | "beacon", x = 0, y = 0, z = 0) {
    panel = next;
    focus = { x, y, z };
    if (next === "beacon") {
      hud.beaconLevel = pyramidLevel(x, y, z);
      hud.beaconBuff = beaconBuffs.get(x + "," + y + "," + z) ?? "";
    }
    if (next === "chest") {
      const bin = ensureChest(x + "," + y + "," + z);
      const rx = Math.floor(x / 192);
      const rz = Math.floor(z / 192);
      const site = world.hamletAt(rx, rz);
      const near = site && Math.hypot(x - site.x, z - site.z) < 48;
      const lm = world.nearestLandmark(x, z);
      const lmKind = lm && Math.hypot(x - lm.x, z - lm.z) < 40 ? lm.kind : null;
      const lootPool =
        lmKind === "monument" ||
        lmKind === "mansion" ||
        lmKind === "pyramid" ||
        lmKind === "temple" ||
        lmKind === "witch_hut" ||
        lmKind === "castle"
          ? lmKind
          : lmKind
            ? "nether"
            : near
              ? "hamlet"
              : "wild";
      stockChest(bin, x, y, z, world.seed, lootPool);
    }
    if (next === "furnace") ensureFurnace(x + "," + y + "," + z, x, y, z);
    if (phase !== "inventory") {
      const locked = document.pointerLockElement === canvas;
      if (locked) suppressUnlock = true;
      phase = "inventory";
      player.vx = player.vz = 0;
      if (locked) document.exitPointerLock();
    }
    emit();
  }

  // ── Redstone engine ──────────────────────────────────────────────
  // Signal levels are STORED per cell (0-15) and solved to a fixpoint
  // over the neighbourhood of the edit. Dust loses 1 level per step,
  // repeaters refresh to 15 after their delay (1-4 ticks, set by
  // right-click), comparators pass their back input when it beats the
  // sides, and red torches are inverters: on unless the block under
  // them is powered.
  function rsKey(x: number, y: number, z: number) {
    return x + "," + y + "," + z;
  }

  function isComponent(id: number) {
    return (
      id === ID.Dust || id === ID.DustOn ||
      id === ID.Lever || id === ID.LeverOn ||
      id === ID.Plate || id === ID.PlateOn ||
      id === ID.RedTorch || id === ID.RedTorchOn ||
      id === ID.Repeater || id === ID.RepeaterOn ||
      id === ID.Comparator || id === ID.ComparatorOn ||
      id === ID.Observer || id === ID.ObserverOn ||
      id === ID.Daylight || id === ID.DaylightInv ||
      id === ID.Target ||
      id === ID.Lamp || id === ID.LampOn ||
      id === ID.Piston || id === ID.Note || id === ID.Dispenser ||
      id === ID.Door || id === ID.DoorOpen ||
      id === ID.Gate || id === ID.GateOpen ||
      id === ID.TNT
    );
  }

  function containerSignalAt(x: number, y: number, z: number): number {
    const id = world.get(x, y, z);
    const key = x + "," + y + "," + z;
    if (id === ID.Chest || id === ID.Barrel || id === ID.ShulkerBox) {
      const bin = chests.get(key);
      if (!bin) return 0;
      let total = 0;
      let slotsUsed = 0;
      for (let i = 0; i < bin.ids.length; i++) {
        if (bin.ids[i] > 0 && (bin.ns[i] ?? 0) > 0) {
          slotsUsed++;
          total += Math.min(64, bin.ns[i]);
        }
      }
      if (slotsUsed === 0) return 0;
      return Math.min(15, 1 + Math.floor((total / (27 * 64)) * 14));
    }
    if (id === ID.Furnace) {
      const f = furnaces.get(key);
      if (!f) return 0;
      const total = (f.in ? f.inN : 0) + (f.fuel ? f.fuelN : 0) + (f.out ? f.outN : 0);
      if (total <= 0) return 0;
      return Math.min(15, 1 + Math.floor((total / (3 * 64)) * 14));
    }
    if (id === ID.Jukebox) {
      const disc = jukeDiscs.get(key);
      if (!disc) return 0;
      return Math.min(15, Math.max(1, (disc - ID.DiscA + 1) * 3));
    }
    return -1;
  }

  // What cell (fx,fy,fz) emits toward the adjacent cell (tx,ty,tz),
  // reading levels from `levels` (the stored map or a working copy).
  function emittedToward(fx: number, fy: number, fz: number, tx: number, ty: number, tz: number, levels: Map<string, number>) {
    const id = world.get(fx, fy, fz);
    if (id === ID.RedTorchOn) {
      // A torch never powers the block it stands on (its support).
      if (tx === fx && tz === fz && ty === fy - 1) return 0;
      return 15;
    }
    if (id === ID.LeverOn || id === ID.PlateOn) return 15;
    if (id === ID.Daylight || id === ID.DaylightInv || id === ID.Target) {
      return levels.get(rsKey(fx, fy, fz)) ?? 0;
    }
    if (id === ID.Observer || id === ID.ObserverOn) {
      const k = rsKey(fx, fy, fz);
      if ((obsPulse.get(k) ?? 0) <= 0) return 0;
      const c = comps.get(k);
      if (!c) return 15;
      const d = RS_DIRS[c.dir];
      if (fx + d[0] === tx && fz + d[1] === tz && fy === ty) return 15;
      return 0;
    }
    if (id === ID.Dust || id === ID.DustOn) return levels.get(rsKey(fx, fy, fz)) ?? 0;
    if (id === ID.Repeater || id === ID.RepeaterOn) {
      const c = comps.get(rsKey(fx, fy, fz));
      if (!c) return 0;
      const d = RS_DIRS[c.dir];
      if (fx + d[0] === tx && fz + d[1] === tz && fy === ty) return repOut.get(rsKey(fx, fy, fz)) ? 15 : 0;
      return 0;
    }
    if (id === ID.Comparator || id === ID.ComparatorOn) {
      const c = comps.get(rsKey(fx, fy, fz));
      if (!c) return 0;
      const d = RS_DIRS[c.dir];
      if (fx + d[0] === tx && fz + d[1] === tz && fy === ty) return levels.get(rsKey(fx, fy, fz)) ?? 0;
      return 0;
    }
    return 0;
  }

  function inputAt(x: number, y: number, z: number, levels: Map<string, number>) {
    let best = 0;
    for (const [ox, oy, oz] of NEIGHBORS) {
      const v = emittedToward(x + ox, y + oy, z + oz, x, y, z, levels);
      if (v > best) best = v;
    }
    return best;
  }

  function recompute(cx: number, cy: number, cz: number) {
    const R = 17;
    type Cell = { x: number; y: number; z: number; id: number };
    const cells: Cell[] = [];
    for (let dy = -R; dy <= R; dy++) {
      for (let dz = -R; dz <= R; dz++) {
        for (let dx = -R; dx <= R; dx++) {
          const bx = cx + dx;
          const by = cy + dy;
          const bz = cz + dz;
          if (by < 1 || by >= HEIGHT - 1) continue;
          const id = world.get(bx, by, bz);
          if (isComponent(id)) cells.push({ x: bx, y: by, z: bz, id });
        }
      }
    }
    // Prune stored levels for cells in range that are gone.
    for (const k of [...power.keys()]) {
      const [px, py, pz] = k.split(",").map(Number);
      if (Math.abs(px - cx) <= R && Math.abs(py - cy) <= R && Math.abs(pz - cz) <= R && !cells.some((c) => c.x === px && c.y === py && c.z === pz)) power.delete(k);
    }
    if (!cells.length) return;
    const levels = new Map<string, number>();
    for (const c of cells) levels.set(rsKey(c.x, c.y, c.z), power.get(rsKey(c.x, c.y, c.z)) ?? 0);
    const sunElev = Math.sin(worldTime * Math.PI * 2);
    const daySig = Math.round(Math.max(0, sunElev) * 15 * (1 - wxCur.dark * 0.4));
    const nightSig = Math.round(Math.max(0, -sunElev) * 15);
    // Solve to a fixpoint.
    for (let pass = 0; pass < 14; pass++) {
      let changed = false;
      for (const c of cells) {
        const k = rsKey(c.x, c.y, c.z);
        let next = 0;
        if (c.id === ID.LeverOn || c.id === ID.PlateOn) next = 15;
        else if (c.id === ID.Lever || c.id === ID.Plate) next = 0;
        else if (c.id === ID.Daylight) next = daySig;
        else if (c.id === ID.DaylightInv) next = nightSig;
        else if (c.id === ID.Target) next = (obsPulse.get(k) ?? 0) > 0 ? 15 : 0;
        else if (c.id === ID.Observer || c.id === ID.ObserverOn) next = (obsPulse.get(k) ?? 0) > 0 ? 15 : 0;
        else if (c.id === ID.RedTorch || c.id === ID.RedTorchOn) {
          // Inverter: lit unless its support block is powered.
          next = inputAt(c.x, c.y - 1, c.z, levels) > 0 ? 0 : 15;
        } else if (c.id === ID.Dust || c.id === ID.DustOn) {
          next = Math.max(0, inputAt(c.x, c.y, c.z, levels) - 1);
        } else if (c.id === ID.Repeater || c.id === ID.RepeaterOn) {
          next = repOut.get(k) ? 15 : 0;
        } else if (c.id === ID.Comparator || c.id === ID.ComparatorOn) {
          const comp = comps.get(k);
          if (comp) {
            const d = RS_DIRS[comp.dir];
            const bx = c.x - d[0];
            const bz = c.z - d[1];
            const contSig = containerSignalAt(bx, c.y, bz);
            const back = contSig >= 0 ? contSig : emittedToward(bx, c.y, bz, c.x, c.y, c.z, levels);
            const sideA = emittedToward(c.x + d[1], c.y, c.z + d[0], c.x, c.y, c.z, levels);
            const sideB = emittedToward(c.x - d[1], c.y, c.z - d[0], c.x, c.y, c.z, levels);
            const maxSide = Math.max(sideA, sideB);
            if (comp.delay === 2) {
              // Subtract mode
              next = Math.max(0, back - maxSide);
            } else {
              // Compare mode
              next = back > 0 && back >= maxSide ? back : 0;
            }
          }
        }
        if ((levels.get(k) ?? 0) !== next) {
          levels.set(k, next);
          changed = true;
        }
      }
      if (!changed) break;
    }
    // Commit stored levels + reflect state into block variants.
    for (const c of cells) {
      const k = rsKey(c.x, c.y, c.z);
      const lvl = levels.get(k) ?? 0;
      power.set(k, lvl);
      let want = 0;
      if ((c.id === ID.Dust || c.id === ID.DustOn)) want = lvl > 0 ? ID.DustOn : ID.Dust;
      else if ((c.id === ID.RedTorch || c.id === ID.RedTorchOn)) want = lvl > 0 ? ID.RedTorchOn : ID.RedTorch;
      else if ((c.id === ID.Repeater || c.id === ID.RepeaterOn)) want = repOut.get(k) ? ID.RepeaterOn : ID.Repeater;
      else if ((c.id === ID.Comparator || c.id === ID.ComparatorOn)) want = lvl > 0 ? ID.ComparatorOn : ID.Comparator;
      else if ((c.id === ID.Observer || c.id === ID.ObserverOn)) want = (obsPulse.get(k) ?? 0) > 0 ? ID.ObserverOn : ID.Observer;
      if (want && want !== c.id && world.set(c.x, c.y, c.z, want)) {
        markDirtyAt(c.x, c.z);
        c.id = want;
      }
    }
    // Consumers.
    for (const c of cells) {
      const k = rsKey(c.x, c.y, c.z);
      if (c.id === ID.Lamp || c.id === ID.LampOn) {
        const next = inputAt(c.x, c.y, c.z, levels) > 0 ? ID.LampOn : ID.Lamp;
        if (next !== c.id && world.set(c.x, c.y, c.z, next)) markDirtyAt(c.x, c.z);
      } else if (c.id === ID.Door || c.id === ID.DoorOpen) {
        const on = inputAt(c.x, c.y, c.z, levels) > 0;
        const next = on ? ID.DoorOpen : ID.Door;
        if (next !== c.id && world.set(c.x, c.y, c.z, next)) markDirtyAt(c.x, c.z);
      } else if (c.id === ID.Gate || c.id === ID.GateOpen) {
        const on = inputAt(c.x, c.y, c.z, levels) > 0;
        const next = on ? ID.GateOpen : ID.Gate;
        if (next !== c.id && world.set(c.x, c.y, c.z, next)) markDirtyAt(c.x, c.z);
      } else if (c.id === ID.TNT) {
        const on = inputAt(c.x, c.y, c.z, levels) > 0;
        if (on && !fuses.some((f) => f.x === c.x && f.y === c.y && f.z === c.z)) {
          fuses.push({ x: c.x, y: c.y, z: c.z, t: 2.1 });
          audio.place();
          say("Redstone ignited TNT!");
        }
      } else if (c.id === ID.Piston) {
        const on = inputAt(c.x, c.y, c.z, levels) > 0;
        if (on && !pistonHot.has(k)) {
          pistonHot.add(k);
          const comp = comps.get(k);
          const d = comp ? RS_DIRS[comp.dir] : null;
          const tx = d ? c.x + d[0] : c.x;
          const ty = d ? c.y : c.y + 1;
          const tz = d ? c.z + d[1] : c.z;
          const bx = d ? tx + d[0] : c.x;
          const by = d ? ty : c.y + 2;
          const bz = d ? tz + d[1] : c.z;
          const front = world.get(tx, ty, tz);
          const beyond = world.get(bx, by, bz);
          if (front > 0 && front !== ID.Bedrock && front !== ID.Piston && def(front).solid && beyond === ID.Air) {
            world.set(tx, ty, tz, ID.Air);
            world.set(bx, by, bz, front);
            markDirtyAt(c.x, c.z);
            if (bx !== c.x || bz !== c.z) markDirtyAt(bx, bz);
          }
        }
        if (!on) pistonHot.delete(k);
      } else if (c.id === ID.Note) {
        const lvl = inputAt(c.x, c.y, c.z, levels);
        if (lvl > 0 && !noteHot.has(k)) {
          noteHot.add(k);
          audio.note(lvl);
        }
        if (lvl === 0) noteHot.delete(k);
      } else if (c.id === ID.Dispenser) {
        const on = inputAt(c.x, c.y, c.z, levels) > 0;
        if (on && !dispenserHot.has(k)) {
          dispenserHot.add(k);
          // Fire away from the strongest input side.
          let bx = 0;
          let bz = 0;
          let best = 0;
          for (const [ox, oy, oz] of NEIGHBORS) {
            if (oy !== 0) continue;
            const v = emittedToward(c.x + ox, c.y, c.z + oz, c.x, c.y, c.z, levels);
            if (v > best) {
              best = v;
              bx = -ox;
              bz = -oz;
            }
          }
          if (bx || bz) launchArrow(c.x + 0.5, c.y + 0.6, c.z + 0.5, bx, 0.12, bz, false);
        }
        if (!on) dispenserHot.delete(k);
      }
    }
  }

  // One redstone tick = 0.1 s. Repeaters sample their back input and
  // flip their latched output after their configured delay; Observers
  // watch the cell in front of them and emit a 2-tick pulse when it changes;
  // Daylight sensors refresh when solar power shifts; Hoppers transfer items.
  // ================= v4.15: fire simulation (ignite, spread, melt) =====
  // 0.25 s steps over SPARSE state only (fireCells / burningMap / heatMap /
  // emitters): with nothing burning, this is a no-op — Philippe's law (A1
  // performance even on cheap devices) holds by construction. Plastic MELTS
  // (heat -> sag in the mesher -> glossy puddle); wood BURNS and spreads.
  const NEVER_HEAT = new Set<number>([ID.Bedrock, ID.Stone, ID.Cobble, ID.Obsidian, ID.Glass, ID.Dirt, ID.Grass, ID.Sand, ID.Gravel, ID.Soul, ID.Farmland, ID.IronBlock, ID.Gold, ID.Diamond, ID.Hard, ID.Lava, ID.Water, ID.Fire, ID.Melted,
    // v4.15 audit (Philippe's scope law — only what would REALLY melt may
    // melt): every ore/rock, metal machine and fixture, special relic and
    // organic ground block the registry audit caught in the melt set.
    ID.Coal, ID.IronOre, ID.Furnace, ID.Lamp, ID.LampOn, ID.Piston, ID.TinOre, ID.CopperOre, ID.AmberOre, ID.ChromeOre, ID.SapphireOre, ID.ResinOre, ID.PrismOre, ID.MasterBrick, ID.ChromeBrick, ID.TNT, ID.Netherrack, ID.EndStone, ID.EmeraldOre, ID.Enchanter, ID.Anvil, ID.Brew, ID.Dispenser, ID.Hopper, ID.Mud, ID.Moss, ID.Clay, ID.Ash, ID.AshSoil, ID.CrystalOre, ID.Pumpkin, ID.Melon, ID.Hay, ID.Observer, ID.ObserverOn, ID.EndFrame, ID.EndFrameEye, ID.EndCrystal, ID.Basalt, ID.Calcite, ID.Tuff, ID.Spawner, ID.Grindstone, ID.ShulkerBox, ID.Beacon, ID.Conduit, ID.Target, ID.GuardianSpike, ID.PharaohGold, ID.WitchVenom, ID.IllagerBadge, ID.VoidCore, ID.TidalBlade, ID.PharaohStaff, ID.WitchStaff, ID.ExecutionerAxe, ID.VoidBlade, ID.GuardianPlate, ID.PharaohCrown, ID.CoalOre, ID.GoldOre, ID.DiamondOre, ID.LapisOre, ID.RedOre, ID.Mycelium, ID.Podzol]);
  const NEIGHBORS6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;
  function isPlastic(id: number) {
    if (!id || NEVER_HEAT.has(id)) return false;
    const d = def(id);
    if (!d.solid || d.glass || d.fluid || d.plant) return false;
    if (d.slab || d.stairs || d.sign || d.flat || d.door || d.gate || d.torch || d.dust || d.lever || d.plate || d.rail || d.cactus) return false;
    if (AXE_OK(id)) return false; // wood burns instead of melting
    return true;
  }
  // P6 · La Fonderie (Muse): plastic yield of a broken block. The plastic
  // family IS isPlastic (the v4.15 melt family — no second registry):
  // colour bricks are the rich feedstock (2 pellets), every other plastic
  // solid gives 1, non-plastic gives 0 and keeps its normal drop only.
  // Pellets spawn IN ADDITION to the normal drop in v1 (no economy
  // regression); the Kiln casting step is P6 step 2.
  function plasticYield(id: number): number {
    if (!isPlastic(id)) return 0;
    return COLORS_OK(id) || isTemperedBrick(id) ? 2 : 1;
  }
  // P6-2 Trempe (Muse): quench ONE held plastic ingot in the targeted
  // water cell. The water is dipped in, never consumed. Returns false
  // (and spends nothing) when the held item is not an ingot or the aim
  // is not water. The right-click path and the QA hook share this.
  function quenchHeldAt(hit: { id: number; x: number; y: number; z: number } | null): boolean {
    if (!hit || hit.id !== ID.Water) return false;
    if (!spend(ID.PlasticIngot, 1)) return false;
    addInv(ID.TemperedIngot, 1);
    audio.place();
    say("Quenched — tempered ingot", 1600);
    saveDirty = true;
    return true;
  }
  function flamOf(id: number) {
    if (id === ID.Leaves) return 1;
    if (id === ID.Hay) return 0.9; // dry hay goes up fast (audit fix: it melted!)
    if (id === ID.Coal) return 0.6; // a coal block is fuel — it burns, never melts
    if (id === ID.Log) return 0.35;
    if (id === ID.Bookshelf) return 0.7;
    if (AXE_OK(id)) return 0.5;
    return 0;
  }
  const fireAge = new Map<string, number>();
  // v4.16.1 Minecraft-style fire (Claude, Philippe: « comme dans Minecraft
  // pis réaliste, pas du feu flottant dans le vide — les façades doivent
  // brûler »): a fire cell may only exist where it has something to hold
  // on to — solid ground under it, or a flammable block on one of its 6
  // faces. That second rule is what lets fire CLIMB a wooden façade or run
  // along a hedge, and it is also the rule that forbids floating fire.
  function fuelAround(x: number, y: number, z: number) {
    let best = 0;
    for (const [ox, oy, oz] of NEIGHBORS6) best = Math.max(best, flamOf(world.get(x + ox, y + oy, z + oz)));
    return best;
  }
  function canHoldFire(x: number, y: number, z: number) {
    const here = world.get(x, y, z);
    if (here !== ID.Air && !def(here).plant) return false;
    return def(world.get(x, y - 1, z)).solid || fuelAround(x, y, z) > 0;
  }
  function igniteAt(x: number, y: number, z: number) {
    if (!canHoldFire(x, y, z)) return false;
    if (!world.set(x, y, z, ID.Fire)) return false;
    const k = FS.fkey(x, y, z);
    FS.fireCells.add(k);
    fireAge.set(k, 0);
    fireFxDirty = true;
    markDirtyAt(x, z);
    saveDirty = true;
    return true;
  }
  function startBurning(x: number, y: number, z: number) {
    const f = flamOf(world.get(x, y, z));
    if (!f || FS.burningMap.has(FS.fkey(x, y, z))) return false;
    FS.burningMap.set(FS.fkey(x, y, z), (2.5 + Math.random() * 3.5) / f);
    fireFxDirty = true;
    saveDirty = true;
    return true;
  }
  // v4.15: a bucket of water drowns fire in a 3x3x3 splash — Fire cells go
  // out, burning blocks stop, hot plastic stops cooking (its slump stays:
  // melted plastic does not un-melt). Called by the bucket pour handler.
  function douseArea(cx: number, cy: number, cz: number) {
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const x = cx + dx, y = cy + dy, z = cz + dz, k = FS.fkey(x, y, z);
      if (FS.fireCells.has(k)) {
        world.set(x, y, z, ID.Air);
        FS.fireCells.delete(k);
        fireAge.delete(k);
        markDirtyAt(x, z);
      }
      if (FS.burningMap.delete(k)) markDirtyAt(x, z);
      const st = FS.heatMap.get(k);
      if (st) {
        st.h = 0;
        if (st.m <= 0) FS.heatMap.delete(k);
      }
    }
    fireFxDirty = true;
    saveDirty = true;
  }
  let fireAcc = 0;
  function tickFire(dt: number) {
    fireAcc += dt;
    if (fireAcc < 0.25) return;
    const step = fireAcc;
    fireAcc = 0;
    if (!FS.fireCells.size && !FS.burningMap.size && !FS.heatMap.size && !FS.emitters.size) return;
    // -- fire cells: validate, age, douse.
    for (const k of [...FS.fireCells]) {
      const [x, y, z] = FS.funkey(k);
      if (world.get(x, y, z) !== ID.Fire) {
        FS.fireCells.delete(k);
        fireAge.delete(k);
        fireFxDirty = true;
        continue;
      }
      let wet = raining && world.heightAt(x, z) <= y + 1;
      if (!wet) {
        for (const [ox, oy, oz] of NEIGHBORS6) {
          if (world.get(x + ox, y + oy, z + oz) === ID.Water) { wet = true; break; }
        }
      }
      const below = world.get(x, y - 1, z);
      const eternal =
        below === ID.Lava ||
        world.get(x + 1, y, z) === ID.Lava || world.get(x - 1, y, z) === ID.Lava ||
        world.get(x, y, z + 1) === ID.Lava || world.get(x, y, z - 1) === ID.Lava;
      const age = (fireAge.get(k) ?? 0) + step;
      fireAge.set(k, age);
      // Fuel decides how long a fire cell lives (Minecraft): beside or on
      // a flammable block it burns as long as there is wood to eat; on bare
      // solid ground it flickers out; with neither it is gone at once — the
      // fuel just burnt away, and fire never hangs in the air.
      const fuel = fuelAround(x, y, z);
      const grounded = def(below).solid;
      const limit = eternal ? Infinity : fuel > 0 ? 14 : grounded ? 6 : 0;
      if (wet || age > limit) {
        world.set(x, y, z, ID.Air);
        FS.fireCells.delete(k);
        fireAge.delete(k);
        markDirtyAt(x, z);
        fireFxDirty = true;
        saveDirty = true;
      }
    }
    // -- heat: cool everything a touch, then melt from stored heat.
    for (const [k, e] of [...FS.heatMap]) {
      const [x, y, z] = FS.funkey(k);
      if (!isPlastic(world.get(x, y, z))) {
        FS.heatMap.delete(k);
        continue;
      }
      e.h = Math.max(0, e.h - 0.045);
      // Calm, liquid slump (Philippe: "fondre tranquillement comme un
      // liquide") — a full melt takes ~8 s at full heat, not ~4.
      if (e.h > 0.5) e.m = Math.min(1, e.m + (e.h - 0.5) * 0.06);
      const st = Math.floor(e.m * FS.MELT_STAGES);
      if (st !== e.stage) {
        e.stage = st;
        markDirtyAt(x, z);
        fireFxDirty = true; // melting blocks gain/lose their flame licks here
      }
      if (e.m >= 1) {
        const srcId = world.get(x, y, z);
        if (srcId === ID.Ice || srcId === ID.Snow) {
          world.set(x, y, z, ID.Water); // ice + snow melt into water, not plastic
        } else {
          // v4.17 Teardown melt: the last piece is gone — the cell empties
          // and the molten plastic RUNS DOWN to pool on the first support
          // under it (inside a hole in a wall it pools on the brick below).
          CH.setRemoved(x, y, z, srcId, 0);
          let py = y;
          while (py > 1 && y - py < 10 && world.get(x, py - 1, z) === ID.Air) py--;
          const sup = world.get(x, py - 1, z);
          world.set(x, y, z, ID.Air);
          if (sup !== ID.Melted && def(sup).solid && world.get(x, py, z) === ID.Air) {
            world.set(x, py, z, ID.Melted);
            FS.puddleSrc.set(FS.fkey(x, py, z), srcId);
          }
          if (py !== y) markDirtyAt(x, z);
          // whatever only hung on this block now falls (Teardown physics)
          collapseAround(x, y, z, 4, { n: 24 });
        }
        // NO burst here (Philippe's law): melting plastic slumps quietly
        // into its puddle — it never pops debris onto itself.
        FS.heatMap.delete(k);
        markDirtyAt(x, z);
        saveDirty = true;
      } else if (e.h <= 0 && e.m <= 0) {
        FS.heatMap.delete(k);
      }
    }
    // -- burning cells count down and are consumed.
    for (const [k, t0] of [...FS.burningMap]) {
      const t = t0 - step;
      if (t > 0) {
        FS.burningMap.set(k, t);
        // v4.18: live fires throw the odd ember (near fires only — budget).
        if (Math.random() < 0.1) {
          const [ex, ey, ez] = FS.funkey(k);
          if (Math.hypot(ex - player.x, ez - player.z) < 24) burst(ex + 0.5, ey + 1.1, ez + 0.5, "#ff9a3c", 1);
        }
        continue;
      }
      FS.burningMap.delete(k);
      fireFxDirty = true;
      const [x, y, z] = FS.funkey(k);
      if (flamOf(world.get(x, y, z))) {
        world.set(x, y, z, ID.Air);
        markDirtyAt(x, z);
        saveDirty = true;
        igniteAt(x, y, z); // the fire carries on in the freed cell if it has ground or fuel next to it
      }
    }
    // -- Minecraft-style spread: each fire cell eats its flammable faces
    //    and throws new fire into nearby air that touches fuel — strongest
    //    upward, so a burning façade goes up the wall and across the roof.
    //    Bounded: one spread attempt per fire cell per 0.25 s tick.
    if (FS.fireCells.size) {
      const kf = step / 0.25;
      for (const k of [...FS.fireCells]) {
        const [x, y, z] = FS.funkey(k);
        for (const [ox, oy, oz] of NEIGHBORS6) {
          const nid = world.get(x + ox, y + oy, z + oz);
          const f = flamOf(nid);
          if (f && Math.random() < f * 0.09 * kf) startBurning(x + ox, y + oy, z + oz);
        }
        if (FS.fireCells.size >= 360) continue; // keep the blaze within the flame pool
        const dx = Math.floor(Math.random() * 3) - 1;
        const dz = Math.floor(Math.random() * 3) - 1;
        const r = Math.random();
        const dy = r < 0.45 ? 1 : r < 0.6 ? 2 : r < 0.8 ? 0 : -1; // fire climbs
        if (!dx && !dy && !dz) continue;
        const tx = x + dx, ty = y + dy, tz = z + dz;
        if (world.get(tx, ty, tz) !== ID.Air) continue;
        const enc = fuelAround(tx, ty, tz); // only air that touches fuel catches
        if (enc && Math.random() < enc * 0.35 * kf * (dy > 0 ? 1.4 : 1)) igniteAt(tx, ty, tz);
      }
    }
    // -- sources radiate heat + ignition.
    const radiate = (sx: number, sy: number, sz: number, strength: number, canIgnite: boolean, radius: number) => {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dz = -radius; dz <= radius; dz++) {
            if (!dx && !dy && !dz) continue;
            const nx = sx + dx;
            const ny = sy + dy;
            const nz = sz + dz;
            const id = world.get(nx, ny, nz);
            if (!id || id === ID.Fire) continue;
            const dist = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
            const fall = 1 - (dist / (radius + 1)) * 0.55;
            if (isPlastic(id)) {
              const k2 = FS.fkey(nx, ny, nz);
              let e = FS.heatMap.get(k2);
              if (!e) {
                if (FS.heatMap.size > 4000) continue;
                e = { h: 0, m: 0, stage: 0 };
                FS.heatMap.set(k2, e);
              }
              e.h = Math.min(1, e.h + 0.16 * strength * fall);
              // v4.17: remember WHERE the heat comes from (block -> source),
              // so the melt eats the side that faces the flames first.
              const w = strength * fall;
              e.sx = (e.sx ?? 0) * 0.92 - dx * w;
              e.sy = (e.sy ?? 0) * 0.92 - dy * w;
              e.sz = (e.sz ?? 0) * 0.92 - dz * w;
            } else if (canIgnite && flamOf(id)) {
              if (Math.random() < flamOf(id) * 0.055 * strength * fall) startBurning(nx, ny, nz);
            }
          }
        }
      }
    };
    for (const k of FS.fireCells) {
      const [x, y, z] = FS.funkey(k);
      radiate(x, y, z, 1, true, 2);
    }
    for (const k of FS.burningMap.keys()) {
      const [x, y, z] = FS.funkey(k);
      radiate(x, y, z, 0.8, true, 1);
    }
    for (const k of FS.allEmitters()) {
      const [x, y, z] = FS.funkey(k);
      const id = world.get(x, y, z);
      if (id === ID.Campfire) radiate(x, y, z, 0.34, false, 1);
      else if (id === ID.Lava) radiate(x, y, z, 1.25, true, 2);
    }
  }
  // ================= end v4.15 fire simulation =================

  function tickRedstone(dt: number) {
    rsAcc += dt;
    hopperAcc += dt;
    if (hopperAcc >= 0.8) {
      hopperAcc = 0;
      const px = Math.floor(player.x);
      const py = Math.floor(player.y);
      const pz = Math.floor(player.z);
      for (let dy = -5; dy <= 5; dy++) {
        for (let dz = -10; dz <= 10; dz++) {
          for (let dx = -10; dx <= 10; dx++) {
            const hx = px + dx;
            const hy = py + dy;
            const hz = pz + dz;
            if (world.get(hx, hy, hz) !== ID.Hopper) continue;
            if (inputAt(hx, hy, hz, power) > 0) continue; // Redstone locks hoppers
            const aboveId = world.get(hx, hy + 1, hz);
            const belowId = world.get(hx, hy - 1, hz);
            let moved = false;
            if (aboveId === ID.Furnace && (belowId === ID.Chest || belowId === ID.Barrel || belowId === ID.ShulkerBox)) {
              const f = furnaces.get(hx + "," + (hy + 1) + "," + hz);
              if (f && f.out > 0 && f.outN > 0) {
                const bin = ensureChest(hx + "," + (hy - 1) + "," + hz);
                const slotI = bin.ids.findIndex((id, i) => id === f.out || (bin.ns[i] ?? 0) === 0);
                if (slotI >= 0) {
                  bin.ids[slotI] = f.out;
                  bin.ns[slotI] = (bin.ns[slotI] ?? 0) + 1;
                  f.outN -= 1;
                  if (f.outN <= 0) f.out = 0;
                  moved = true;
                }
              }
            } else if ((aboveId === ID.Chest || aboveId === ID.Barrel || aboveId === ID.ShulkerBox) && (belowId === ID.Chest || belowId === ID.Barrel || belowId === ID.ShulkerBox)) {
              const src = chests.get(hx + "," + (hy + 1) + "," + hz);
              if (src) {
                const sIdx = src.ids.findIndex((id, i) => id > 0 && (src.ns[i] ?? 0) > 0);
                if (sIdx >= 0) {
                  const item = src.ids[sIdx];
                  const dst = ensureChest(hx + "," + (hy - 1) + "," + hz);
                  const dIdx = dst.ids.findIndex((id, i) => id === item || (dst.ns[i] ?? 0) === 0);
                  if (dIdx >= 0) {
                    dst.ids[dIdx] = item;
                    dst.ns[dIdx] = (dst.ns[dIdx] ?? 0) + 1;
                    src.ns[sIdx] -= 1;
                    if (src.ns[sIdx] <= 0) src.ids[sIdx] = 0;
                    moved = true;
                  }
                }
              }
            }
            if (moved) {
              saveDirty = true;
              recompute(hx, hy - 1, hz);
            }
          }
        }
      }
    }
    while (rsAcc >= 0.1) {
      rsAcc -= 0.1;
      const sunElev = Math.sin(worldTime * Math.PI * 2);
      const dayLvl = Math.round(Math.max(0, sunElev) * 15);
      if (dayLvl !== lastDaylightLvl) {
        lastDaylightLvl = dayLvl;
        recompute(Math.floor(player.x), Math.floor(player.y), Math.floor(player.z));
      }
      for (const [k, left] of [...obsPulse.entries()]) {
        const [x, y, z] = k.split(",").map(Number);
        if (left <= 1) {
          obsPulse.delete(k);
          recompute(x, y, z);
        } else {
          obsPulse.set(k, left - 1);
        }
      }
      for (const [k, comp] of [...comps.entries()]) {
        const [x, y, z] = k.split(",").map(Number);
        const id = world.get(x, y, z);
        if (Math.hypot(x - player.x, z - player.z) > 48) continue;
        if (id === ID.Observer || id === ID.ObserverOn) {
          const d = RS_DIRS[comp.dir];
          const watched = world.get(x - d[0], y, z - d[1]);
          const prev = obsSeen.get(k);
          obsSeen.set(k, watched);
          if (prev !== undefined && prev !== watched) {
            obsPulse.set(k, 2);
            recompute(x, y, z);
          }
          continue;
        }
        if (id !== ID.Repeater && id !== ID.RepeaterOn) continue;
        const d = RS_DIRS[comp.dir];
        const want = emittedToward(x - d[0], y, z - d[1], x, y, z, power) > 0;
        const cur = repOut.get(k) ?? false;
        if (want === cur) {
          repTimer.delete(k);
          continue;
        }
        const left = (repTimer.get(k) ?? comp.delay) - 1;
        if (left <= 0) {
          repOut.set(k, want);
          repTimer.delete(k);
          recompute(x, y, z);
        } else repTimer.set(k, left);
      }
    }
  }

  function facingDir() {
    const fx = -Math.sin(player.yaw);
    const fz = -Math.cos(player.yaw);
    if (Math.abs(fx) > Math.abs(fz)) return fx > 0 ? 1 : 3;
    return fz > 0 ? 2 : 0;
  }

  function useBlock(hit: { id: number; x: number; y: number; z: number }) {
    if (hit.id === ID.Repeater || hit.id === ID.RepeaterOn) {
      const k = rsKey(hit.x, hit.y, hit.z);
      const comp = comps.get(k) ?? { dir: facingDir(), delay: 1 };
      comp.delay = (comp.delay % 4) + 1;
      comps.set(k, comp);
      say("Repeater delay " + comp.delay);
      audio.place();
      saveDirty = true;
      return true;
    }
    if (hit.id === ID.Comparator || hit.id === ID.ComparatorOn) {
      const k = rsKey(hit.x, hit.y, hit.z);
      const comp = comps.get(k) ?? { dir: facingDir(), delay: 1 };
      comp.delay = comp.delay === 2 ? 1 : 2;
      comps.set(k, comp);
      recompute(hit.x, hit.y, hit.z);
      say(comp.delay === 2 ? "Comparator: subtract mode" : "Comparator: compare mode");
      audio.place();
      saveDirty = true;
      return true;
    }
    if (hit.id === ID.Daylight || hit.id === ID.DaylightInv) {
      const next = hit.id === ID.Daylight ? ID.DaylightInv : ID.Daylight;
      if (world.set(hit.x, hit.y, hit.z, next)) {
        markDirtyAt(hit.x, hit.z);
        recompute(hit.x, hit.y, hit.z);
        say(next === ID.DaylightInv ? "Night sensor mode" : "Daylight sensor mode");
        audio.place();
        saveDirty = true;
      }
      return true;
    }
    if (hit.id === ID.Lamp) {
      say("Ding");
      audio.note(12);
      return true;
    }
    if (hit.id === ID.CropRipe) {
      world.set(hit.x, hit.y, hit.z, ID.Air);
      if (!creative) {
        addInv(ID.Wheat, 1);
        addInv(ID.Seeds, 1);
      }
      if (world.get(hit.x, hit.y - 1, hit.z) === ID.Farmland && (creative || spend(ID.Seeds, 1))) {
        world.set(hit.x, hit.y, hit.z, ID.Crop);
        say("Replanted");
      } else say("Harvested");
      markDirtyAt(hit.x, hit.z);
      audio.break();
      saveDirty = true;
      return true;
    }
    if (hit.id === ID.CarrotRipe || hit.id === ID.PotatoRipe || hit.id === ID.BeetRipe) {
      const item = hit.id === ID.CarrotRipe ? ID.Carrot : hit.id === ID.PotatoRipe ? ID.Potato : ID.Beetroot;
      const shoot = hit.id === ID.CarrotRipe ? ID.CarrotCrop : hit.id === ID.PotatoRipe ? ID.PotatoCrop : ID.BeetCrop;
      world.set(hit.x, hit.y, hit.z, ID.Air);
      if (!creative) addInv(item, 1);
      const soil = world.get(hit.x, hit.y - 1, hit.z) === ID.Farmland;
      const spare = creative || (inv[item] ?? 0) > 1;
      if (soil && spare && (creative || spend(item, 1))) {
        world.set(hit.x, hit.y, hit.z, shoot);
        say("Replanted");
      } else say("Harvested");
      markDirtyAt(hit.x, hit.z);
      audio.break();
      saveDirty = true;
      return true;
    }
    if (hit.id === ID.Pumpkin || hit.id === ID.Melon) {
      const slice = hit.id === ID.Pumpkin ? ID.Slice : ID.MelonCut;
      world.set(hit.x, hit.y, hit.z, ID.Air);
      if (!creative) addInv(slice, 4);
      say("Harvested");
      markDirtyAt(hit.x, hit.z);
      audio.break();
      saveDirty = true;
      return true;
    }
    const block = def(hit.id);
    if (block.sign) {
      hud.signEdit = { x: hit.x, y: hit.y, z: hit.z, text: signs.get(hit.x + "," + hit.y + "," + hit.z) ?? "" };
      emit();
      return true;
    }
    if (block.door || block.gate) {
      const next = hit.id === ID.Door || hit.id === ID.Gate ? (hit.id === ID.Door ? ID.DoorOpen : ID.GateOpen) : hit.id === ID.DoorOpen ? ID.Door : ID.Gate;
      if (world.set(hit.x, hit.y, hit.z, next)) markDirtyAt(hit.x, hit.z);
      audio.place();
      return true;
    }
    if (block.lever) {
      const next = hit.id === ID.Lever ? ID.LeverOn : ID.Lever;
      if (world.set(hit.x, hit.y, hit.z, next)) markDirtyAt(hit.x, hit.z);
      recompute(hit.x, hit.y, hit.z);
      audio.place();
      return true;
    }
    if (hit.id === ID.Crank || hit.id === ID.CrankOn) {
      const on = hit.id === ID.Crank;
      if (world.set(hit.x, hit.y, hit.z, on ? ID.CrankOn : ID.Crank)) markDirtyAt(hit.x, hit.z);
      say(on ? "Cranking" : "Stopped");
      audio.place();
      return true;
    }
    if (hit.id === ID.Clutch || hit.id === ID.ClutchOpen) {
      const open = hit.id === ID.Clutch;
      if (world.set(hit.x, hit.y, hit.z, open ? ID.ClutchOpen : ID.Clutch)) markDirtyAt(hit.x, hit.z);
      say(open ? "Free" : "Engaged");
      audio.place();
      return true;
    }
    if (hit.id === ID.Spring) {
      windSpring(hit.x, hit.y, hit.z);
      say("Wound");
      audio.place();
      return true;
    }
    if (hit.id === ID.Ring || hit.id === ID.RingLo) {
      const low = hit.id === ID.Ring;
      if (world.set(hit.x, hit.y, hit.z, low ? ID.RingLo : ID.Ring)) markDirtyAt(hit.x, hit.z);
      say(low ? "Ratio 2" : "Ratio 1");
      audio.place();
      return true;
    }
    if (hit.id === ID.Valve) {
      const on = toggleValve(hit.x, hit.y, hit.z);
      say(on ? "Air on" : "Air off");
      audio.place();
      return true;
    }
    if (hit.id === ID.Remote) {
      const ch = remoteChAt(hit.x, hit.y, hit.z);
      const next = ch >= 4 ? 1 : ch + 1;
      setRemoteChannel(hit.x, hit.y, hit.z, next);
      say("Remote channel " + next);
      audio.place();
      return true;
    }
    if (hit.id === ID.Battery) {
      const e = Math.round(batteryAt(hit.x, hit.y, hit.z));
      say("Battery " + e + "%");
      return true;
    }
    if (block.work === "bed") {
      const night = Math.sin(worldTime * Math.PI * 2) < 0.15;
      if (!night) {
        say("Too bright to sleep");
        return true;
      }
      const hostile = mobs.some((m) => !m.dead && (m.kind === "walker" || m.kind === "creeper") && Math.hypot(m.x - player.x, m.z - player.z) < 8);
      if (hostile) {
        say("Not with those nearby");
        return true;
      }
      worldTime = 0.0416;
      worldDays++;
      spawnPoint = { x: player.x, y: player.y, z: player.z };
      sinceSleep = 0;
      if (hunger > 0) health = Math.min(20, health + 4);
      say(`Slept until morning · Day ${worldDays}`);
      saveDirty = true;
      return true;
    }
    if (block.note) {
      noteStep = (noteStep + 2) % 24;
      audio.note(noteStep);
      return true;
    }
    if (hit.id === ID.Dispenser) {
      launchArrow(hit.x + 0.5, hit.y + 0.6, hit.z + 0.5, -Math.sin(player.yaw), 0, -Math.cos(player.yaw), false);
      return true;
    }
    if (hit.id === ID.Jukebox) {
      const key = hit.x + "," + hit.y + "," + hit.z;
      const inside = jukeDiscs.get(key);
      if (inside) {
        jukeDiscs.delete(key);
        addInv(inside, 1);
        say("Ejected " + def(inside).name);
        saveDirty = true;
        return true;
      }
      const heldId = hotbar[slot];
      if (heldId >= ID.DiscA && heldId <= ID.DiscE) {
        if (!creative) spend(heldId, 1);
        jukeDiscs.set(key, heldId);
        say("Now playing: " + def(heldId).name);
        saveDirty = true;
        return true;
      }
      say("It wants a music disc");
      return true;
    }
    if (block.work === "bench" || block.work === "furnace" || block.work === "chest" || block.work === "enchant" || block.work === "anvil" || block.work === "brew" || block.work === "beacon") {
      openPanel(block.work, hit.x, hit.y, hit.z);
      return true;
    }
    return false;
  }

  function tryPlace(hit: NonNullable<ReturnType<typeof raycast>>) {
    const sneaking = isSneaking();
    const held = hotbar[slot];
    const heldDef = def(held);
    if (TECHNIC_SET.has(held)) return; // Technic parts place through the Technic layer only
    if (held === ID.Bow || held === ID.Crossbow) return shootHeld();
    if (held === ID.Trident) return throwTrident();
    if (held === ID.Firework) return launchFirework();
    if (hit.id === ID.Soul && held === ID.WitherSkull && (creative || (inv[ID.WitherSkull] ?? 0) >= 3)) {
      if (!creative) spend(ID.WitherSkull, 3);
      spawnKind("wither", hit.x + 0.5, hit.z + 0.5);
      say("Wither summoned");
      return;
    }
    if (held === ID.Clock) return say(timeWord());
    if (held === ID.Map) {
      const x = Math.floor(player.x);
      const z = Math.floor(player.z);
      const yaw = ((player.yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
      const dir = dirs[Math.round(yaw / (Math.PI / 4)) % 8];
      return say(`${x}, ${Math.floor(player.y)}, ${z} · ${dir}`);
    }
    if (held === ID.Tome) return castSpell();
    if (held === ID.Flint && hit.id === ID.TNT) {
      fuses.push({ x: hit.x, y: hit.y, z: hit.z, t: 2.1 });
      wearHeld();
      say("Fuse");
      return;
    }
    if (held === ID.Bone) return meal(hit);
    if (held === ID.Shears && hit.id === ID.Leaves) {
      breakBlock(hit.x, hit.y, hit.z);
      wearHeld();
      return;
    }
    if (held === ID.Rod && (hit.id === ID.Water || def(world.get(hit.x + hit.nx, hit.y + hit.ny, hit.z + hit.nz)).fluid)) {
      fishT = 0;
      say("Line out");
      return;
    }
    if (held === ID.Eye) {
      hopRealm(2);
      return;
    }
    if (held === ID.Boat) return launchRide("boat", hit);
    if (held === ID.Cart) return launchRide("cart", hit);
    if (held === ID.PotionHeal || held === ID.PotionSpeed || held === ID.PotionStr || held === ID.Focus || held === ID.Milk || held === ID.Gapple || held === ID.PotionRegen || held === ID.PotionFire || held === ID.PotionLeap || held === ID.PotionGill || held === ID.PotionVeil || held === ID.PotionVenom || held === ID.PotionTar) {
      return drink(held);
    }
    if (held === ID.SplashVenom || held === ID.SplashTar) {
      throwSplash(held);
      return;
    }
    if (held === ID.EnderPearl) {
      pearlHop();
      return;
    }
    if (!sneaking && useBlock(hit)) return;
    if (heldDef.tool === "hoe" && (hit.id === ID.Dirt || hit.id === ID.Grass) && world.get(hit.x, hit.y + 1, hit.z) === ID.Air) {
      if (world.set(hit.x, hit.y, hit.z, ID.Farmland)) {
        markDirtyAt(hit.x, hit.z);
        wearHeld();
        audio.place();
        saveDirty = true;
      }
      return;
    }
    if (held === ID.Seeds) {
      const tx = hit.id === ID.Farmland ? hit.x : hit.x + hit.nx;
      const ty = hit.id === ID.Farmland ? hit.y + 1 : hit.y + hit.ny;
      const tz = hit.id === ID.Farmland ? hit.z : hit.z + hit.nz;
      if (world.get(tx, ty, tz) === ID.Air && world.get(tx, ty - 1, tz) === ID.Farmland && spend(ID.Seeds, 1)) {
        world.set(tx, ty, tz, ID.Crop);
        markDirtyAt(tx, tz);
        audio.place();
        saveDirty = true;
      }
      return;
    }
    if (held === ID.Carrot || held === ID.Potato || held === ID.Beetroot || held === ID.Pumpkin || held === ID.Melon) {
      const tx = hit.id === ID.Farmland ? hit.x : hit.x + hit.nx;
      const ty = hit.id === ID.Farmland ? hit.y + 1 : hit.y + hit.ny;
      const tz = hit.id === ID.Farmland ? hit.z : hit.z + hit.nz;
      const plant =
        held === ID.Carrot ? ID.CarrotCrop :
        held === ID.Potato ? ID.PotatoCrop :
        held === ID.Beetroot ? ID.BeetCrop :
        held === ID.Pumpkin ? ID.PumpkinStem :
        ID.MelonStem;
      if (world.get(tx, ty, tz) === ID.Air && world.get(tx, ty - 1, tz) === ID.Farmland && spend(held, 1)) {
        world.set(tx, ty, tz, plant);
        markDirtyAt(tx, tz);
        audio.place();
        saveDirty = true;
      }
      return;
    }
    if (held === ID.PlasticIngot) {
      // P6-2 Trempe (Muse): dip the ingot in water to quench it. The
      // main target passes through fluids, so like the bucket this does
      // its own fluid-inclusive cast. Water is never consumed.
      const fh = hit.id === ID.Water || hit.id === ID.Lava
        ? hit
        : raycast(player.x, player.y + EYE, player.z, -Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), -Math.cos(player.yaw) * Math.cos(player.pitch), 6, false);
      if (fh && quenchHeldAt(fh)) return;
      if (fh && fh.id === ID.Water) return;
    }
    if (held === ID.Bucket) {
      // v4.18: the main target now passes through fluids (for placing IN
      // water), so scooping does its own fluid-inclusive cast.
      const fh = hit.id === ID.Water || hit.id === ID.Lava
        ? hit
        : raycast(player.x, player.y + EYE, player.z, -Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), -Math.cos(player.yaw) * Math.cos(player.pitch), 6, false);
      if (fh && (fh.id === ID.Water || fh.id === ID.Lava)) {
        const fill = fh.id === ID.Lava ? ID.LavaBucket : ID.WaterBucket;
        if (world.set(fh.x, fh.y, fh.z, ID.Air)) {
          markDirtyAt(fh.x, fh.z);
          spend(ID.Bucket, 1);
          addInv(fill, 1);
          audio.place();
          saveDirty = true;
        }
        return;
      }
    }
    if (held === ID.WaterBucket || held === ID.LavaBucket) {
      const px = hit.x + hit.nx;
      const py = hit.y + hit.ny;
      const pz = hit.z + hit.nz;
      const pour = held === ID.LavaBucket ? ID.Lava : ID.Water;
      if (pour === ID.Water && world.get(px, py, pz) === ID.Fire && spend(held, 1)) {
        // Bucket straight onto flames: no water cell left, the fire drowns.
        douseArea(px, py, pz);
        addInv(ID.Bucket, 1);
        audio.place();
        saveDirty = true;
      } else if (world.get(px, py, pz) === ID.Air && spend(held, 1)) {
        world.set(px, py, pz, pour);
        markDirtyAt(px, pz);
        addInv(ID.Bucket, 1);
        audio.place();
        saveDirty = true;
        if (pour === ID.Water) douseArea(px, py, pz); // the splash puts out what's around
      }
      return;
    }
    if (held === ID.Spark) {
      // v4.15: strike a Spark — a flammable block catches; anything else
      // gets a ground fire on the struck face.
      if (startBurning(hit.x, hit.y, hit.z)) {
        spend(ID.Spark, 1);
        audio.place();
      } else if (igniteAt(hit.x + hit.nx, hit.y + hit.ny, hit.z + hit.nz)) {
        spend(ID.Spark, 1);
        audio.place();
      }
      return;
    }
    if (heldDef.food) {
      eat();
      return;
    }
    if (!held || !heldDef.placeable) {
      say(held ? "That doesn't place" : "Empty hand");
      return;
    }
    if (!creative && (inv[held] ?? 0) <= 0) {
      say("Out of those bricks");
      return;
    }
    const px = hit.x + hit.nx;
    const py = hit.y + hit.ny;
    const pz = hit.z + hit.nz;
    if (py <= 0 || py >= HEIGHT - 1) return;
    const dest = world.get(px, py, pz);
    const destDef = def(dest);
    if (dest !== ID.Air && !destDef.plant && !destDef.fluid) return;
    // P0 stud grid: an eligible full cube aimed at the far half of the
    // target cell snaps into the brick layer at a half-stud offset.
    // Fluids block brick placement even though classic placement allows
    // filling them (brickSpaceFree enforces it).
    if (brickEligible(held, heldDef)) {
      const cand = brickSnapAssist(px, py, pz, hit.nx, hit.ny, hit.nz);
      if (cand && brickSpaceFree(cand.sx, cand.sy, cand.sz) && !brickHitsPlayer(cand.sx / 2, cand.sy, cand.sz / 2)) {
        placeBrickNow(held, cand.sx, cand.sy, cand.sz);
        return;
      }
    }
    if (brickCellBlocked(px, py, pz)) return; // a snapped brick already occupies part of this cell
    if (heldDef.solid && hitsPlayer(px, py, pz)) {
      say("Can't snap a brick into yourself");
      return;
    }
    const placeId = held === ID.RedTorch ? ID.RedTorchOn : heldDef.stairs ? stairsVariant(held, facingDir()) : held;
    if (!world.set(px, py, pz, placeId)) return;
    CH.setRemoved(px, py, pz, placeId, 0); // v4.17: a freshly placed block is whole
    markDirtyAt(px, pz);
    netSendEdit(px, py, pz, placeId);
    if (heldDef.sign) {
      hud.signEdit = { x: px, y: py, z: pz, text: "" };
      emit();
    }
    if (placeId === ID.ShulkerBox && shulkerQueue.length > 0) {
      const savedBin = shulkerQueue.shift()!;
      chests.set(px + "," + py + "," + pz, { ids: savedBin.ids.slice(), ns: savedBin.ns.slice() });
      say("The shulker box kept its contents");
    }
    if (!creative) spend(held, 1);
    if (placeId === ID.Repeater || placeId === ID.Comparator || placeId === ID.Piston || placeId === ID.Observer) {
      const dir = facingDir();
      comps.set(rsKey(px, py, pz), { dir, delay: 1 });
      if (placeId === ID.Observer) {
        const d = RS_DIRS[dir];
        obsSeen.set(rsKey(px, py, pz), world.get(px - d[0], py, pz - d[1]));
      }
    }
    if (isComponent(placeId) || isComponent(world.get(px, py + 1, pz))) recompute(px, py, pz);
    if (held === ID.Torch) bumpQuest("place", "torch");
    burst(px + 0.5, py + 0.8, pz + 0.5, heldDef.color, 6);
    audio.place();
    swing = 1;
    saveDirty = true;
  }

  function dropItem(id: number, n: number, x: number, y: number, z: number) {
    if (!id || n <= 0) return;
    const { group: mesh } = buildLegoItem3D(id);
    mesh.scale.setScalar(0.92);
    mesh.position.set(x, y, z);
    if (plasticOn) {
      mesh.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });
    }
    scene.add(mesh);
    drops.push({
      id,
      n,
      x,
      y,
      z,
      vy: 2 + Math.random(),
      mesh,
    });
  }

  function spillBags() {
    for (const [id, n] of Object.entries(inv)) if (n > 0) dropItem(Number(id), n, player.x + (Math.random() - 0.5), player.y + 0.5, player.z + (Math.random() - 0.5));
    for (const k of Object.keys(inv)) delete inv[Number(k)];
    hotbar = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      if (armor[i]) dropItem(armor[i], 1, player.x, player.y + 0.8, player.z);
      armor[i] = 0;
    }
  }

  function launchArrow(x: number, y: number, z: number, dx: number, dy: number, dz: number, friendly: boolean, pow = 0, flame = false, punch = 0, pierce = false) {
    const len = Math.hypot(dx, dy, dz) || 1;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.35), skin(0xf4f1ea));
    scene.add(mesh);
    shots.push({ x, y, z, vx: (dx / len) * 18, vy: (dy / len) * 18, vz: (dz / len) * 18, life: 2.4, friendly, mesh, pow, flame, punch, pierce });
  }

  function launchFireball(x: number, y: number, z: number, dx: number, dy: number, dz: number, fromDragon = false) {
    const len = Math.hypot(dx, dy, dz) || 1;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), skin(0xff7a2a));
    scene.add(mesh);
    shots.push({ x, y, z, vx: (dx / len) * 11, vy: (dy / len) * 11, vz: (dz / len) * 11, life: 3.6, friendly: false, mesh, fire: true, fromDragon });
  }

  function launchSkull(x: number, y: number, z: number, dx: number, dy: number, dz: number) {
    const len = Math.hypot(dx, dy, dz) || 1;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), skin(0x2a2733));
    scene.add(mesh);
    shots.push({ x, y, z, vx: (dx / len) * 13, vy: (dy / len) * 13, vz: (dz / len) * 13, life: 3.6, friendly: false, mesh, skull: true });
  }

  function launchSplash(x: number, y: number, z: number, dx: number, dy: number, dz: number, splash: number) {
    const len = Math.hypot(dx, dy, dz) || 1;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), skin(splash === ID.SplashVenom ? 0x3aaa4c : 0x4a3424));
    scene.add(mesh);
    shots.push({ x, y, z, vx: (dx / len) * 13, vy: (dy / len) * 13, vz: (dz / len) * 13, life: 2.2, friendly: true, mesh, splash });
  }

  function throwSplash(id: number) {
    if (!creative) {
      if ((inv[id] ?? 0) <= 0) return say("Nothing to throw");
      spend(id, 1);
    }
    const dx = -Math.sin(player.yaw) * Math.cos(player.pitch);
    const dy = Math.sin(player.pitch);
    const dz = -Math.cos(player.yaw) * Math.cos(player.pitch);
    launchSplash(player.x, player.y + 1.5, player.z, dx, dy + 0.25, dz, id);
    audio.place();
  }

  function applySplash(id: number, x: number, y: number, z: number) {
    const venom = id === ID.SplashVenom;
    burst(x, y, z, venom ? "#3aaa4c" : "#4a3424", 14);
    for (const m of mobs) {
      if (m.dead || m.kind === "boat" || m.kind === "cart") continue;
      if (Math.hypot(m.x - x, m.z - z) < 2.8 && Math.abs(m.y + 0.6 - y) < 2.2) {
        if (venom) m.burn = Math.max(m.burn ?? 0, 6);
        else m.slowT = Math.max(m.slowT ?? 0, 9);
      }
    }
    if (Math.hypot(player.x - x, player.z - z) < 2.4 && Math.abs(player.y + 1 - y) < 2.2) {
      if (venom) poisonT = Math.max(poisonT, 12);
      else slowT = Math.max(slowT, 8);
    }
    audio.hit();
  }

  // ── Multiplayer prototype (see MULTIPLAYER.md) ──────────────────────
  const mp = new MpClient();
  mp.onSay = (text) => say(text);
  mp.onEdit = (x, y, z, block) => {
    if (world.set(x, y, z, block)) {
      markDirtyAt(x, z);
      saveDirty = true;
    }
  };
  type RemoteFig = { body: LegoBody; tx: number; ty: number; tz: number };
  const remotes = new Map<string, RemoteFig>();
  let posAcc = 0;
  let mpName = "";

  function nameSprite(name: string): THREE.Sprite {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.font = "bold 34px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 7;
      ctx.strokeStyle = "rgba(10, 10, 16, 0.85)";
      const label = name.slice(0, 16);
      ctx.strokeText(label, 128, 42);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, 128, 42);
    }
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
    spr.scale.set(1.7, 0.42, 1);
    spr.position.set(0, 2.2, 0);
    return spr;
  }

  function tickNet(dt: number) {
    if (mp.connected) {
      posAcc += dt;
      if (posAcc >= 0.1) {
        posAcc = 0;
        mp.sendPos(player.x, player.y, player.z, player.yaw, player.pitch);
      }
    }
    for (const [id, p] of mp.peers) {
      if (p.y < -100) continue; // no transform received yet
      let r = remotes.get(id);
      if (!r) {
        const body = buildLego("villager", 1);
        body.group.add(nameSprite(p.name));
        scene.add(body.group);
        body.group.position.set(p.x, p.y, p.z);
        r = { body, tx: p.x, ty: p.y, tz: p.z };
        remotes.set(id, r);
      }
      r.tx = p.x;
      r.ty = p.y;
      r.tz = p.z;
      const g = r.body.group;
      const k = 1 - Math.exp(-12 * dt);
      g.position.x += (r.tx - g.position.x) * k;
      g.position.y += (r.ty - g.position.y) * k;
      g.position.z += (r.tz - g.position.z) * k;
      g.rotation.y = p.yaw + Math.PI;
    }
    for (const [id, r] of remotes) {
      if (!mp.peers.has(id)) {
        scene.remove(r.body.group);
        remotes.delete(id);
      }
    }
  }

  function netSendEdit(x: number, y: number, z: number, block: number) {
    if (mp.connected) mp.sendEdit(x, y, z, block);
  }

  function clearRemotes() {
    for (const r of remotes.values()) scene.remove(r.body.group);
    remotes.clear();
  }

  // In-game text prompt. window.prompt broke pointer lock, froze the frame loop and
  // looked like a browser error on phones.
  let askResolve: ((v: string | null) => void) | null = null;
  function askText(title: string, hint: string, value = ""): Promise<string | null> {
    if (askResolve) askResolve(null);
    hud.ask = { title, hint, value };
    if (document.pointerLockElement === canvas) {
      suppressUnlock = true;
      document.exitPointerLock();
    }
    keys.clear();
    mouseMine = mousePlace = false;
    emit();
    return new Promise((res) => {
      askResolve = res;
    });
  }

  async function startOnline(hosting: boolean) {
    if (mp.connected) return say("Already online — leave first");
    if (!mpName) {
      mpName = ((await askText("Your brick name", "Shown above your head to other players", "Brick")) ?? "").trim().slice(0, 16);
      if (!mpName) return;
    }
    let room = "";
    if (hosting) {
      room = Math.random().toString(36).slice(2, 8).toUpperCase();
    } else {
      room = ((await askText("Room code", "Six letters, from the host's pause menu")) ?? "").trim().toUpperCase();
      if (!room) return;
    }
    const url = ((await askText("Relay address", "The relay server everyone connects through", "ws://127.0.0.1:8799")) ?? "").trim();
    if (!url) return;
    mp.connect(url, room, mpName);
    say(hosting ? "Hosting room " + room + " — share the code" : "Joining room " + room);
  }

  function shootHeld() {
    if ((inv[ID.Arrow] ?? 0) <= 0 && !creative) return say("Need arrows");
    // Infinity: the quiver never empties while you hold one arrow.
    if (!creative && enchLvl(hotbar[slot], "infinity") === 0) spend(ID.Arrow, 1);
    wearHeld();
    const dx = -Math.sin(player.yaw) * Math.cos(player.pitch);
    const dy = Math.sin(player.pitch);
    const dz = -Math.cos(player.yaw) * Math.cos(player.pitch);
    const bowId = hotbar[slot];
    // A crossbow hits harder and its bolt punches through the first mob.
    const cross = bowId === ID.Crossbow;
    launchArrow(player.x, player.y + 1.4, player.z, dx, dy, dz, true, enchLvl(bowId, "power") + (cross ? 2 : 0), enchLvl(bowId, "flame") > 0, enchLvl(bowId, "punch"), cross);
    audio.place();
  }

  let tridentCd = 0;
  function throwTrident() {
    if (tridentCd > 0) return;
    tridentCd = 0.9;
    wearHeld();
    const dx = -Math.sin(player.yaw) * Math.cos(player.pitch);
    const dy = Math.sin(player.pitch);
    const dz = -Math.cos(player.yaw) * Math.cos(player.pitch);
    const len = Math.hypot(dx, dy, dz) || 1;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.8), skin(0x2a9a86));
    scene.add(mesh);
    shots.push({ x: player.x, y: player.y + 1.4, z: player.z, vx: (dx / len) * 17, vy: (dy / len) * 17, vz: (dz / len) * 17, life: 2.6, friendly: true, mesh, trident: true });
    audio.place();
  }

  const FIREWORK_COLORS = ["#e85a4a", "#f5c518", "#3ec8c8", "#e85ad4", "#7ab648"];
  function launchFirework() {
    if (!creative && (inv[ID.Firework] ?? 0) <= 0) return say("No rockets");
    if (!creative) spend(ID.Firework, 1);
    const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.14), skin(0xe85a4a));
    mesh.position.set(player.x, player.y + 1.2, player.z);
    scene.add(mesh);
    rockets.push({ mesh, t: 0, color, trail: 0 });
    audio.place();
  }

  function pearlHop() {
    if (!creative) {
      if ((inv[ID.EnderPearl] ?? 0) <= 0) return say("No pearls");
      spend(ID.EnderPearl, 1);
    }
    const dx = -Math.sin(player.yaw) * Math.cos(player.pitch);
    const dy = Math.sin(player.pitch);
    const dz = -Math.cos(player.yaw) * Math.cos(player.pitch);
    const hit = raycast(player.x, player.y + 1.6, player.z, dx, dy, dz, 28);
    let tx = player.x + dx * 9;
    let tz = player.z + dz * 9;
    if (hit) {
      tx = hit.x + hit.nx + 0.5;
      tz = hit.z + hit.nz + 0.5;
    }
    burst(player.x, player.y + 1, player.z, "#2a9a86", 10);
    player.x = tx;
    player.z = tz;
    player.y = groundY(tx, tz);
    player.vy = 0;
    burst(player.x, player.y + 1, player.z, "#2a9a86", 10);
    if (!creative) hurt(2);
    audio.place();
    saveDirty = true;
  }

  function drink(id: number) {
    if (id === ID.Milk) {
      speedT = 0;
      strengthT = 0;
      fireT = 0;
      regenT = 0;
      fireResT = 0;
      jumpT = 0;
      gillT = 0;
      invisT = 0;
      poisonT = 0;
      witherT = 0;
      slowT = 0;
      if (!creative) spend(id, 1);
      say("Cleared");
      return;
    }
    if (id === ID.PotionHeal) {
      health = Math.min(20, health + 8);
      if (!creative) spend(id, 1);
      say("Mended");
      return;
    }
    if (id === ID.PotionSpeed) {
      speedT = 45;
      if (!creative) spend(id, 1);
      say("Dash");
      return;
    }
    if (id === ID.PotionStr) {
      strengthT = 45;
      if (!creative) spend(id, 1);
      say("Might");
      return;
    }
    if (id === ID.Gapple) {
      health = Math.min(20, health + 6);
      hunger = Math.min(20, hunger + 8);
      fireT = 0;
      if (!creative) spend(id, 1);
      say("Gold apple");
      return;
    }
    if (id === ID.PotionRegen) {
      regenT = 30;
      if (!creative) spend(id, 1);
      say("Regen");
      return;
    }
    if (id === ID.PotionFire) {
      fireResT = 150;
      fireT = 0;
      if (!creative) spend(id, 1);
      say("Fire ward");
      return;
    }
    if (id === ID.PotionLeap) {
      jumpT = 60;
      if (!creative) spend(id, 1);
      say("Leap");
      return;
    }
    if (id === ID.PotionGill) {
      gillT = 150;
      if (!creative) spend(id, 1);
      say("Gills");
      return;
    }
    if (id === ID.PotionVeil) {
      invisT = 60;
      if (!creative) spend(id, 1);
      say("Veiled");
      return;
    }
    if (id === ID.PotionVenom) {
      poisonT = 20;
      if (!creative) spend(id, 1);
      say("Venom — why would you drink that?");
      return;
    }
    if (id === ID.PotionTar) {
      slowT = 30;
      if (!creative) spend(id, 1);
      say("Tarred");
      return;
    }
    if (id === ID.Focus) {
      speedT = Math.max(speedT, 18);
      gainXp(6);
      if (!creative) spend(id, 1);
      say("Focus");
    }
  }

  function growTree(x: number, y: number, z: number) {
    world.set(x, y, z, ID.Air);
    const h = 4 + ((Math.random() * 2) | 0);
    for (let i = 0; i < h; i++) world.set(x, y + i, z, ID.Log);
    for (let dy = -1; dy <= 2; dy++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (Math.abs(dx) + Math.abs(dz) > 3) continue;
          if (dx === 0 && dz === 0 && dy < 1) continue;
          if (world.get(x + dx, y + h - 1 + dy, z + dz) === ID.Air) world.set(x + dx, y + h - 1 + dy, z + dz, ID.Leaves);
        }
      }
    }
    markDirtyAt(x, z);
  }

  function meal(hit: { id: number; x: number; y: number; z: number }) {
    const id = hit.id;
    if (id === ID.Crop || id === ID.Crop1 || id === ID.Crop2) {
      const next = id === ID.Crop ? ID.Crop1 : id === ID.Crop1 ? ID.Crop2 : ID.CropRipe;
      world.set(hit.x, hit.y, hit.z, next);
    } else if (id === ID.CarrotCrop || id === ID.PotatoCrop || id === ID.BeetCrop) {
      const next = id === ID.CarrotCrop ? ID.CarrotRipe : id === ID.PotatoCrop ? ID.PotatoRipe : ID.BeetRipe;
      world.set(hit.x, hit.y, hit.z, next);
    } else if (id === ID.PumpkinStem) world.set(hit.x, hit.y, hit.z, ID.Pumpkin);
    else if (id === ID.MelonStem) world.set(hit.x, hit.y, hit.z, ID.Melon);
    else if (id === ID.Sapling) growTree(hit.x, hit.y, hit.z);
    else if (id === ID.Cane && world.get(hit.x, hit.y + 1, hit.z) === ID.Air) world.set(hit.x, hit.y + 1, hit.z, ID.Cane);
    else if (id === ID.Grass || id === ID.Dirt) {
      if (world.get(hit.x, hit.y + 1, hit.z) === ID.Air) world.set(hit.x, hit.y + 1, hit.z, Math.random() < 0.5 ? ID.Flower : ID.TallGrass);
    } else return say("Nothing to feed");
    if (!creative) spend(ID.Bone, 1);
    markDirtyAt(hit.x, hit.z);
    audio.place();
  }

  function launchRide(kind: "boat" | "cart", hit: { x: number; y: number; z: number; nx: number; ny: number; nz: number }) {
    const x = hit.x + hit.nx + 0.5;
    const y = hit.y + hit.ny;
    const z = hit.z + hit.nz + 0.5;
    if (!creative) spend(hotbar[slot], 1);
    const body = buildLego(kind, 1);
    const mob: Mob = {
      kind,
      x,
      y: y + 0.2,
      z,
      yaw: player.yaw,
      hp: 20,
      wander: 99,
      fuse: 0,
      cool: 0,
      dead: false,
      mesh: body.group,
      legs: body.legs,
      tame: true,
    };
    scene.add(body.group);
    mobs.push(mob);
    mount = mob;
    say(kind === "boat" ? "Boat" : "Cart");
  }

  function carveRealms() {
    if (realmsReady) return;
    realmsReady = true;
    const fill = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number) => {
      for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) world.set(x, y, z, id);
    };
    fill(468, 28, 468, 508, 28, 508, ID.Netherrack);
    fill(470, 29, 470, 506, 40, 506, ID.Air);
    fill(468, 41, 468, 508, 41, 508, ID.Netherrack);
    for (let i = 0; i < 8; i++) world.set(480 + ((i * 3) % 12) - 6, 29, 490, ID.Lava);
    for (let i = 0; i < 14; i++) {
      const rx = 474 + ((i * 5) % 28);
      const rz = 474 + ((i * 7) % 26);
      world.set(rx, 29, rz, ID.ResinOre);
      world.set(rx + 1, 29, rz, ID.ResinOre);
    }
    world.set(488, 29, 488, ID.Portal);
    world.set(488, 30, 488, ID.Portal);
    // Four zones around the portal: wastes north-west (the classic floor),
    // basalt pillars north-east, slow soul sand south-west, crimson fungi
    // south-east. The portal pad itself stays plain netherrack.
    const qhash = (x: number, z: number) => {
      const s = Math.sin(x * 41.3 + z * 289.1) * 24634.6345;
      return s - Math.floor(s);
    };
    for (let x = 470; x <= 506; x++) {
      for (let z = 470; z <= 506; z++) {
        if (Math.abs(x - 488) <= 1 && Math.abs(z - 488) <= 1) continue;
        const quad = (x < 488 ? 0 : 1) + (z < 488 ? 0 : 2);
        if (quad === 1) world.set(x, 28, z, ID.Basalt);
        else if (quad === 2) world.set(x, 28, z, ID.Soul);
        else if (quad === 3 && qhash(x, z) > 0.72) world.set(x, 28, z, ID.MushroomRed);
      }
    }
    for (const [px, pz, ph] of [[494, 476, 5], [500, 482, 7], [503, 473, 4]] as const) {
      for (let y = 29; y < 29 + ph; y++) world.set(px, y, pz, ID.Basalt);
    }
    for (const [px, pz, ph] of [[476, 496, 3], [482, 501, 4]] as const) {
      for (let y = 29; y < 29 + ph; y++) world.set(px, y, pz, ID.Hard);
    }
    for (const [fx, fz] of [[496, 496], [502, 500], [493, 503]] as const) {
      world.set(fx, 29, fz, ID.Log);
      world.set(fx, 30, fz, ID.Log);
      world.set(fx, 31, fz, ID.MushroomRed);
      world.set(fx + 1, 30, fz, ID.MushroomRed);
      world.set(fx - 1, 30, fz, ID.MushroomRed);
      world.set(fx, 30, fz + 1, ID.MushroomRed);
      world.set(fx, 30, fz - 1, ID.MushroomRed);
    }
    // Overworld End portal frame near origin offset
    const fx = 180, fz = 180, fy = 32;
    const ring = [
      [-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],
      [2,-1],[2,0],[2,1],[2,2],
      [1,2],[0,2],[-1,2],[-2,2],
      [-2,1],[-2,0],[-2,-1]
    ];
    for (const [ox, oz] of ring) {
      world.set(fx + ox, fy, fz + oz, ID.EndFrame);
      world.set(fx + ox, fy - 1, fz + oz, ID.Obsidian);
    }
    // ── The End: a floating island with real terrain, not a slab ──
    // Domed pale island (flat arena in the middle for the pillars and
    // the gate), a causeway west to a platform holding an End city:
    // two hollow towers with ladders, loot chests and lantern light.
    const ECX = -504;
    const ECZ = -504;
    const ehash = (x: number, z: number) => {
      const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
      return s - Math.floor(s);
    };
    const endTop = (x: number, z: number) => {
      const dx = x - ECX;
      const dz = z - ECZ;
      const r = Math.hypot(dx, dz);
      const wob = Math.sin(x * 0.35) * Math.cos(z * 0.33) * 1.7 * Math.min(1, Math.max(0, (r - 14) / 10));
      const rr = r + wob;
      if (Math.abs(dz) <= 3 && dx <= 0) return { h: 48, rr }; // west causeway, flush with the gate plateau
      if (rr < 15) return { h: 48, rr };
      let h = 48 + Math.round(2.2 * Math.sin(x * 0.16 + 1.7) * Math.cos(z * 0.14 + 0.4));
      if (rr > 33) h -= Math.round((rr - 33) * 0.55);
      return { h, rr };
    };
    for (let x = ECX - 46; x <= ECX + 46; x++) {
      for (let z = ECZ - 46; z <= ECZ + 46; z++) {
        const { h, rr } = endTop(x, z);
        if (rr > 42) continue;
        let bottom = h;
        for (let y = h; y >= 34; y--) {
          if (rr + (h - y) * 1.9 >= 42.5) break;
          world.set(x, y, z, ID.EndStone);
          bottom = y;
        }
        for (let y = h + 1; y <= 68; y++) if (world.get(x, y, z) !== ID.Air) world.set(x, y, z, ID.Air);
        for (let y = 10; y < bottom; y++) if (world.get(x, y, z) !== ID.Air) world.set(x, y, z, ID.Air);
        // void blooms: pale stalks with dark crystal-cluster heads
        if (rr > 16 && rr < 37 && Math.abs(z - ECZ) > 5) {
          const gx = Math.floor(x / 7);
          const gz = Math.floor(z / 7);
          if (x === gx * 7 + 3 && z === gz * 7 + 3 && ehash(gx, gz) > 0.45) {
            const tall = 3 + Math.floor(ehash(z, x) * 3);
            for (let y = h + 1; y <= h + tall; y++) world.set(x, y, z, ID.EndStone);
            world.set(x, h + tall + 1, z, ID.EndFrame);
            world.set(x + 1, h + tall, z, ID.EndFrame);
            world.set(x, h + tall, z + 1, ID.EndFrame);
          }
        }
        if (rr < 30 && ehash(x * 3 + 1, z * 5 + 2) > 0.996) world.set(x, h, z, ID.PrismOre);
      }
    }
    // City platform west, joined by the causeway bridge.
    fill(-568, 45, -518, -546, 48, -490, ID.EndStone);
    fill(-568, 49, -518, -546, 64, -490, ID.Air);
    for (let y = 10; y < 45; y++) for (let z = -518; z <= -490; z++) for (let x = -568; x <= -546; x++) if (world.get(x, y, z) !== ID.Air) world.set(x, y, z, ID.Air);
    fill(-546, 48, -506, -543, 48, -502, ID.EndStone);
    fill(-546, 49, -506, -543, 52, -502, ID.Air);
    // Towers: hollow, floored, ladder shafts, a chest at the top.
    const tower = (x0: number, z0: number, w: number, top: number, floors: number[]) => {
      const x1 = x0 + w - 1;
      const z1 = z0 + w - 1;
      for (let y = 49; y <= top; y++) {
        for (let x = x0; x <= x1; x++) {
          for (let z = z0; z <= z1; z++) {
            const edge = x === x0 || x === x1 || z === z0 || z === z1;
            const corner = (x === x0 || x === x1) && (z === z0 || z === z1);
            if (floors.includes(y)) {
              if (y === top && x === x0 + 1 && z === z0 + 1) continue; // roof hatch over the ladder shaft
              world.set(x, y, z, ID.EndStone);
              continue;
            }
            if (!edge) continue;
            if (corner) world.set(x, y, z, ID.EndFrame);
            else if (y % 6 === 2 && (x === Math.floor((x0 + x1) / 2) || z === Math.floor((z0 + z1) / 2))) world.set(x, y, z, ID.Air);
            else world.set(x, y, z, ID.EndStone);
          }
        }
      }
      world.set(x1, 49, Math.floor((z0 + z1) / 2), ID.Air);
      world.set(x1, 50, Math.floor((z0 + z1) / 2), ID.Air);
      for (let y = 49; y < top; y++) world.set(x0 + 1, y, z0 + 1, ID.Ladder);
      world.set(x0 + 2, top, z0 + 2, ID.Lantern);
    };
    tower(-566, -512, 9, 64, [54, 59, 64]);
    tower(-556, -498, 7, 58, [53, 58]);
    // City loot — filled once; a looted chest stays looted.
    const cityLoot = (x: number, y: number, z: number, loot: [number, number][]) => {
      world.set(x, y, z, ID.Chest);
      const key = x + "," + y + "," + z;
      if (!chests.has(key)) {
        const bin = ensureChest(key);
        loot.forEach(([id, n], i) => {
          bin.ids[i] = id;
          bin.ns[i] = n;
        });
      }
    };
    cityLoot(-562, 65, -508, [[ID.Diamond, 3], [ID.Prism, 2], [ID.PotionHeal, 2], [ID.Totem, 1], [ID.Scrap, 3]]);
    cityLoot(-553, 59, -495, [[ID.Gapple, 2], [ID.Scrap, 4], [ID.Blaze, 2], [ID.Arrow, 12]]);
    world.set(-504, 49, -504, ID.Portal);
    world.set(-504, 50, -504, ID.Portal);
    for (let i = 0; i < 6; i++) world.set(-516 + i * 3, 49, -506, ID.PrismOre);
    // pillars last — crystals sit on the columns, never eaten by carves
    paintEndCrystals((x, y, z, id) => world.set(x, y, z, id));
    // End city towers
    for (const [tx, tz] of [[-530, -530], [-470, -530], [-500, -470]]) {
      for (let y = 49; y <= 64; y++) {
        for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
          const edge = Math.abs(dx) === 2 || Math.abs(dz) === 2;
          if (edge || y === 64) world.set(tx + dx, y, tz + dz, y === 64 ? ID.EndStone : ID.Obsidian);
        }
      }
      world.set(tx, 62, tz, ID.Chest);
      world.set(tx + 1, 62, tz, ID.EndCrystal);
    }
    for (let cz = Math.floor(468 / CS); cz <= Math.floor(508 / CS); cz++) {
      for (let cx = Math.floor(468 / CS); cx <= Math.floor(508 / CS); cx++) dirty.add(cx + "," + cz);
    }
    for (let cz = Math.floor(-552 / CS); cz <= Math.floor(-456 / CS); cz++) {
      for (let cx = Math.floor(-572 / CS); cx <= Math.floor(-456 / CS); cx++) dirty.add(cx + "," + cz);
    }
  }

  function crystalsLeft() {
    let n = 0;
    for (const [x, z] of END_PILLARS) if (world.get(x, 63, z) === ID.EndCrystal) n++;
    return n;
  }

  function popCrystal(x: number, y: number, z: number) {
    const left = crystalsLeft();
    const wyrm = mobs.find((m) => m.kind === "dragon" && !m.dead);
    if (wyrm) {
      wyrm.hp -= 8;
      if (wyrm.hp <= 0) killMob(wyrm);
      else say(left + " crystals left. The wyrm weakens.");
    } else say(left ? left + " crystals still on the pillars" : "The pillars are dark");
    if (Math.hypot(player.x - (x + 0.5), player.z - (z + 0.5)) < 3.5) hurt(3);
    burst(x + 0.5, y + 1.2, z + 0.5, "#e85ad4", 16);
  }

  function hopRealm(to: number) {
    if (portalCd > 0) return;
    carveRealms();
    portalCd = 1.4;
    if (to === 0) {
      player.x = returnSpot.x;
      player.y = returnSpot.y;
      player.z = returnSpot.z;
      realm = 0;
      say("Overworld");
    } else if (to === 1) {
      if (realm === 0) returnSpot = { x: player.x, y: player.y, z: player.z };
      player.x = 488.5;
      player.y = 31;
      player.z = 486.5;
      realm = 1;
      say("Nether");
      if (mobs.filter((m) => m.kind === "ghast" && !m.dead).length < 1) spawnKind("ghast", 500, 496);
      if (mobs.filter((m) => m.kind === "blaze" && !m.dead).length < 2) {
        spawnKind("blaze", 480, 492);
        spawnKind("blaze", 497, 479);
      }
      if (mobs.filter((m) => m.kind === "piglin" && !m.dead).length < 2) {
        spawnKind("piglin", 478, 480);
        spawnKind("piglin", 496, 500);
      }
    } else {
      if (realm === 0) returnSpot = { x: player.x, y: player.y, z: player.z };
      player.x = -504.5;
      player.y = 51;
      player.z = -500.5;
      realm = 2;
      say("The End");
      if (!dragonUp && !won) {
        dragonUp = true;
        spawnKind("dragon", -504, -508);
      }
      if (!cityGuarded) {
        cityGuarded = true;
        spawnKind("skelly", -556, -500);
        spawnKind("skelly", -560, -516);
        spawnKind("skelly", -548, -504);
        spawnKind("shulker", -552, -508);
        spawnKind("shulker", -544, -512);
      }
      if (mobs.filter((m) => m.kind === "enderman" && !m.dead).length < 2) {
        spawnKind("enderman", -530, -530);
        spawnKind("enderman", -478, -472);
      }
    }
    player.vx = player.vy = player.vz = 0;
    mount = null;
    stream(6);
    saveDirty = true;
  }

  function tickSpawners(dt: number) {
    if (phase !== "play" || settings.mods.peaceful) return;
    spawnerAcc += dt;
    if (spawnerAcc < 8) return;
    const gx = Math.floor(player.x);
    const gy = Math.floor(player.y);
    const gz = Math.floor(player.z);
    let sx = 0;
    let sy = 0;
    let sz = 0;
    let found = false;
    for (let dy = -8; dy <= 8 && !found; dy++) {
      for (let dz = -16; dz <= 16 && !found; dz++) {
        for (let dx = -16; dx <= 16; dx++) {
          if (dx * dx + dy * dy + dz * dz > 256) continue;
          if (world.get(gx + dx, gy + dy, gz + dz) !== ID.Spawner) continue;
          sx = gx + dx;
          sy = gy + dy;
          sz = gz + dz;
          found = true;
          break;
        }
      }
    }
    if (!found) {
      spawnerAcc = 0;
      return;
    }
    let awake = 0;
    for (const m of mobs) {
      if (m.dead || m.kind !== "walker") continue;
      if (Math.hypot(m.x - player.x, m.z - player.z) < 12) awake++;
    }
    if (awake >= 2) {
      spawnerAcc = 8;
      return;
    }
    spawnerAcc = 0;
    const mob = spawnKind("walker", sx + 0.5, sz + 1.5);
    mob.y = sy;
    mob.mesh.position.set(mob.x, sy, mob.z);
  }

  function tickExtras(dt: number) {
    sinceSleep += dt;
    speedT = Math.max(0, speedT - dt);
    strengthT = Math.max(0, strengthT - dt);
    regenT = Math.max(0, regenT - dt);
    fireResT = Math.max(0, fireResT - dt);
    jumpT = Math.max(0, jumpT - dt);
    gillT = Math.max(0, gillT - dt);
    invisT = Math.max(0, invisT - dt);
    slowT = Math.max(0, slowT - dt);
    omenT = Math.max(0, omenT - dt);
    heroT = Math.max(0, heroT - dt);
    raidTick(dt);
    guardT = Math.max(0, guardT - dt);
    if (guardT <= 0) {
      guardT = 4;
      ensureLandmarkGuards();
    }
    stationTick(dt);
    mechAcc += dt;
    if (mechAcc >= 0.1) {
      const step = mechAcc;
      mechAcc = 0;
      const gx = Math.floor(player.x);
      const gy = Math.floor(player.y);
      const gz = Math.floor(player.z);
      const cells: { x: number; y: number; z: number }[] = [];
      const mech = new Set<number>([
        ID.Axle, ID.Gear8, ID.Gear16, ID.Gear24, ID.Gear40, ID.Bevel12, ID.Bevel20, ID.Actuator, ID.Turret, ID.Slip, ID.Pump, ID.Cylinder, ID.Valve, ID.Tank, ID.Crank, ID.CrankOn, ID.Clutch, ID.ClutchOpen,
        ID.Worm, ID.Cam, ID.Pulley, ID.Wheel, ID.Mill, ID.Spring, ID.Diff, ID.Rack, ID.UJoint, ID.Road, ID.Belt, ID.Trap, ID.Ring, ID.RingLo, ID.MotorM, ID.MotorL, ID.MotorXL, ID.Battery, ID.TechHub, ID.Remote,
      ]);
      for (let dy = -3; dy <= 3; dy++) {
        for (let dz = -6; dz <= 6; dz++) {
          for (let dx = -6; dx <= 6; dx++) {
            const x = gx + dx;
            const y = gy + dy;
            const z = gz + dz;
            if (mech.has(world.get(x, y, z))) cells.push({ x, y, z });
          }
        }
      }
      if (cells.length) {
        const edits = stepMech(world.get.bind(world), cells, {
          axle: ID.Axle, g8: ID.Gear8, g16: ID.Gear16, g24: ID.Gear24, g40: ID.Gear40, b12: ID.Bevel12, b20: ID.Bevel20, act: ID.Actuator, turret: ID.Turret, slip: ID.Slip, pump: ID.Pump, cyl: ID.Cylinder, valve: ID.Valve, tank: ID.Tank, motorM: ID.MotorM, motorL: ID.MotorL, motorXL: ID.MotorXL, battery: ID.Battery, hub: ID.TechHub, remote: ID.Remote,
          crank: ID.Crank, crankOn: ID.CrankOn, clutch: ID.Clutch, clutchOpen: ID.ClutchOpen,
          worm: ID.Worm, cam: ID.Cam, pulley: ID.Pulley, wheel: ID.Wheel, mill: ID.Mill, spring: ID.Spring, diff: ID.Diff, rack: ID.Rack, ujoint: ID.UJoint, road: ID.Road, belt: ID.Belt, trap: ID.Trap, ring: ID.Ring, ringLo: ID.RingLo,
          water: ID.Water, door: ID.Door, doorOpen: ID.DoorOpen, gate: ID.Gate, gateOpen: ID.GateOpen,
        }, step);
        for (const e of edits) {
          if (world.set(e.x, e.y, e.z, e.id)) markDirtyAt(e.x, e.z);
        }
        if (springsJustSpent().length) say("Spring spent");
      }
    }
    if (fireResT > 0) fireT = 0;
    if (regenT > 0) {
      healAcc += dt;
      while (healAcc >= 2) {
        healAcc -= 2;
        health = Math.min(20, health + 1);
      }
    }
    if (poisonT > 0) {
      poisonT = Math.max(0, poisonT - dt);
      poisonAcc += dt;
      while (poisonAcc >= 1.2) {
        poisonAcc -= 1.2;
        // Venom never quite kills, the Minecraft rule.
        if (health > 1) hurt(1);
      }
    }
    if (witherT > 0) {
      witherT = Math.max(0, witherT - dt);
      witherAcc += dt;
      while (witherAcc >= 1) {
        witherAcc -= 1;
        // Wither decay keeps the same house rule: it withers, it does not finish you.
        if (health > 1) hurt(1);
      }
    }
    for (let i = breathZones.length - 1; i >= 0; i--) {
      const zn = breathZones[i];
      zn.t -= dt;
      if (zn.t <= 0) {
        breathZones.splice(i, 1);
        continue;
      }
      zn.puff -= dt;
      if (zn.puff <= 0) {
        zn.puff = 0.45;
        burst(zn.x, zn.y, zn.z, "#b45ae8", 3);
      }
      if (!creative && Math.hypot(player.x - zn.x, player.z - zn.z) < 2.4 && Math.abs(player.y + 1 - zn.y) < 2) {
        zn.acc += dt;
        while (zn.acc >= 0.8) {
          zn.acc -= 0.8;
          hurt(1);
        }
      }
    }
    if (fireT > 0) {
      fireT -= dt;
      if (Math.floor(fireT * 2) !== Math.floor((fireT + dt) * 2)) hurt(1);
    }
    // Mending: a held mending piece slowly knits itself back together.
    if (!creative) {
      const heldId = hotbar[slot];
      if (heldId && def(heldId).maxUse > 0 && enchLvl(heldId, "mending") > 0 && (inv[heldId] ?? 0) < def(heldId).maxUse) {
        mendAcc += dt;
        if (mendAcc >= 3) {
          mendAcc = 0;
          inv[heldId] = Math.min(def(heldId).maxUse, (inv[heldId] ?? 0) + 2);
        }
      }
    }
    // Frost Walker: boots freeze the water surface underfoot; it melts back.
    const frostLvl = enchLvl(armor[3], "frost");
    if (frostLvl > 0 && !flying && phase === "play") {
      const feet = world.get(Math.floor(player.x), Math.floor(player.y), Math.floor(player.z));
      if (feet !== ID.Water) {
        const by = Math.floor(player.y) - 1;
        for (let ox = -1; ox <= 1; ox++)
          for (let oz = -1; oz <= 1; oz++) {
            const bx = Math.floor(player.x) + ox;
            const bz = Math.floor(player.z) + oz;
            if (world.get(bx, by, bz) === ID.Water && world.get(bx, by + 1, bz) === ID.Air) {
              world.set(bx, by, bz, ID.Ice);
              markDirtyAt(bx, bz);
              frostIce.set(bx + "," + by + "," + bz, 4 + frostLvl * 2);
            } else if (world.get(bx, by, bz) === ID.Ice && frostIce.has(bx + "," + by + "," + bz)) {
              // Standing on your own ice keeps it frozen.
              frostIce.set(bx + "," + by + "," + bz, 4 + frostLvl * 2);
            }
          }
      }
    }
    if (frostIce.size) {
      for (const [k, t] of [...frostIce]) {
        const nt = t - dt;
        if (nt > 0) {
          frostIce.set(k, nt);
          continue;
        }
        frostIce.delete(k);
        const [fx, fy, fz] = k.split(",").map(Number);
        if (world.get(fx, fy, fz) === ID.Ice) {
          world.set(fx, fy, fz, ID.Water);
          markDirtyAt(fx, fz);
        }
      }
    }
    portalCd = Math.max(0, portalCd - dt);
    tickSpawners(dt);
    if (fishT >= 0) {
      fishT += dt;
      if (fishT > 3.2) {
        fishT = -1;
        addInv(Math.random() < 0.7 ? ID.Fish : ID.Emerald, 1);
        if (Math.random() < 0.15) addInv(ID.String, 1);
        wearHeld();
        say("Bite");
        gainXp(2);
      }
    }
    for (let i = fuses.length - 1; i >= 0; i--) {
      fuses[i].t -= dt;
      if (fuses[i].t <= 0) {
        const f = fuses[i];
        fuses.splice(i, 1);
        if (world.get(f.x, f.y, f.z) === ID.TNT) world.set(f.x, f.y, f.z, ID.Air);
        explode(f.x, f.y, f.z);
      }
    }
    const gx = Math.floor(player.x);
    const gy = Math.floor(player.y);
    const gz = Math.floor(player.z);
    if ((elapsed * 4) % 1 < dt * 4) {
      // Gravity spawner: unsupported `fall` blocks (sand, gravel, soul)
      // become real falling entities — see updateFallers. The old code
      // teleported them one cell per tick; this only spawns now.
      for (let dz = -5; dz <= 5; dz++) {
        for (let dx = -5; dx <= 5; dx++) {
          for (let dy = 8; dy >= -2; dy--) {
            const x = gx + dx;
            const y = gy + dy;
            const z = gz + dz;
            if (def(world.get(x, y, z)).fall) spawnFaller(x, y, z);
          }
        }
      }
      // budgeted hopper: chest above -> hopper -> chest below
      let hopBudget = 6;
      const hgx = Math.floor(player.x);
      const hgy = Math.floor(player.y);
      const hgz = Math.floor(player.z);
      for (let dz = -4; dz <= 4 && hopBudget > 0; dz++) {
        for (let dx = -4; dx <= 4 && hopBudget > 0; dx++) {
          const x = hgx + dx;
          const y = hgy;
          const z = hgz + dz;
          if (world.get(x, y, z) !== ID.Hopper) continue;
          if (world.get(x, y + 1, z) === ID.Chest && world.get(x, y - 1, z) === ID.Chest) {
            const src = ensureChest(x + "," + (y + 1) + "," + z);
            const dst = ensureChest(x + "," + (y - 1) + "," + z);
            const from = src.ids.findIndex((id, i) => id > 0 && (src.ns[i] ?? 0) > 0);
            if (from >= 0) {
              const id = src.ids[from];
              const into = dst.ids.findIndex((oid, i) => oid === id || (dst.ns[i] ?? 0) === 0);
              if (into >= 0) {
                dst.ids[into] = id;
                dst.ns[into] = (dst.ns[into] ?? 0) + 1;
                src.ns[from] -= 1;
                if (src.ns[from] <= 0) src.ids[from] = 0;
                hopBudget--;
              }
            }
          }
        }
      }
      // budgeted fluid flow (mobile-friendly: limited cells per tick)
      let fluidBudget = 36; // slightly higher for fuller levels
      for (let dz = -5; dz <= 5 && fluidBudget > 0; dz++) {
        for (let dx = -5; dx <= 5 && fluidBudget > 0; dx++) {
          for (let dy = 3; dy >= -2 && fluidBudget > 0; dy--) {
            const x = gx + dx;
            const y = gy + dy;
            const z = gz + dz;
            const id = world.get(x, y, z);
            if (id !== ID.Water && id !== ID.Lava) continue;
            const below = world.get(x, y - 1, z);
            if (below === ID.Air) {
              world.set(x, y - 1, z, id);
              markDirtyAt(x, z);
              fluidBudget--;
              continue;
            }
            // sideways only if blocked below
            if (below !== ID.Air && below !== id) {
              const sides = [[1,0],[-1,0],[0,1],[0,-1]];
              for (const [sx, sz] of sides) {
                if (fluidBudget <= 0) break;
                if (world.get(x + sx, y, z + sz) === ID.Air && world.get(x + sx, y - 1, z + sz) !== ID.Air) {
                  world.set(x + sx, y, z + sz, id);
                  markDirtyAt(x + sx, z + sz);
                  fluidBudget--;
                  break;
                }
              }
            }
          }
        }
      }
      for (let dz = -5; dz <= 5; dz++) {
        for (let dx = -5; dx <= 5; dx++) {
          for (let dy = -2; dy <= 3; dy++) {
            const x = gx + dx;
            const y = gy + dy;
            const z = gz + dz;
            if (world.get(x, y, z) !== ID.Cane) continue;
            let h = 1;
            while (world.get(x, y - h, z) === ID.Cane) h++;
            if (h >= 3) continue;
            if (world.get(x, y + 1, z) !== ID.Air) continue;
            if (Math.random() < 0.25) {
              world.set(x, y + 1, z, ID.Cane);
              markDirtyAt(x, z);
            }
          }
        }
      }
    }
    const under = world.get(gx, gy - 1, gz);
    const plateHere = world.get(gx, Math.floor(player.y + 0.05), gz);
    let nextPlate = "";
    if (def(plateHere).plate || def(under).plate) {
      const py = def(plateHere).plate ? Math.floor(player.y + 0.05) : gy - 1;
      nextPlate = gx + "," + py + "," + gz;
      if (world.get(gx, py, gz) === ID.Plate) {
        world.set(gx, py, gz, ID.PlateOn);
        markDirtyAt(gx, gz);
        recompute(gx, py, gz);
      }
    }
    if (plateKey && plateKey !== nextPlate) {
      const [px, py, pz] = plateKey.split(",").map(Number);
      if (world.get(px, py, pz) === ID.PlateOn) {
        world.set(px, py, pz, ID.Plate);
        markDirtyAt(px, pz);
        recompute(px, py, pz);
      }
      plateKey = "";
    }
    if (nextPlate) plateKey = nextPlate;
    if (world.get(gx, gy, gz) === ID.Portal || world.get(gx, gy + 1, gz) === ID.Portal) hopRealm(realm === 0 ? 1 : 0);
    for (const [ox, , oz] of NEIGHBORS) {
      if (world.get(gx + ox, gy, gz + oz) === ID.Cactus || world.get(gx + ox, gy + 1, gz + oz) === ID.Cactus) {
        hurt(1);
        break;
      }
    }
    const feet = world.get(gx, gy, gz);
    if (feet === ID.Lava || world.get(gx, gy + 1, gz) === ID.Lava) {
      fireT = Math.max(fireT, 4);
      hurt(2);
    }
    if (
      feet === ID.Fire ||
      world.get(gx, gy + 1, gz) === ID.Fire ||
      FS.burningMap.has(FS.fkey(gx, gy, gz)) ||
      FS.burningMap.has(FS.fkey(gx, gy + 1, gz))
    ) {
      fireT = Math.max(fireT, 2.5);
    }
    let w = 0;
    for (const s of shots) {
      s.life -= dt;
      s.vy -= 6 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      s.mesh.position.set(s.x, s.y, s.z);
      let dead = s.life <= 0;
      const bx = Math.floor(s.x);
      const by = Math.floor(s.y);
      const bz = Math.floor(s.z);
      const hitBlockId = world.get(bx, by, bz);
      if (def(hitBlockId).solid) {
        dead = true;
        if (s.skull) burst(s.x, s.y, s.z, "#3a3548", 10);
        if (s.fromDragon && breathZones.length < 6) {
          const wyrm = mobs.find((mm) => mm.kind === "dragon" && !mm.dead);
          if (wyrm && wyrm.hp < (wyrm.maxHp ?? wyrm.hp) * 0.65) breathZones.push({ x: bx + 0.5, y: by + 1.2, z: bz + 0.5, t: 6, puff: 0, acc: 0 });
        }
        if (s.fire) {
          // v4.15: a fireball sets the world alight — the struck block
          // catches, or a ground fire starts on one of its faces.
          if (!startBurning(bx, by, bz)) {
            for (const [ox, oy, oz] of NEIGHBORS6) {
              if (igniteAt(bx + ox, by + oy, bz + oz)) break;
            }
          }
        }
        if (hitBlockId === ID.Target) {
          obsPulse.set(rsKey(bx, by, bz), 8);
          recompute(bx, by, bz);
          audio.note(16);
          say("Bullseye!", 1200);
        }
      }
      if (!dead && s.friendly) {
        for (const m of mobs) {
          if (m.dead || m.kind === "boat" || m.kind === "cart") continue;
          if (Math.hypot(m.x - s.x, m.z - s.z) < 0.7 && Math.abs(m.y + 0.6 - s.y) < 1) {
            if (s.splash) {
              dead = true;
              break;
            }
            if (s.pierce) {
              s.hitSet ??= new Set();
              if (s.hitSet.has(m)) continue;
              s.hitSet.add(m);
            }
            let hit = s.trident ? 9 : 4 + (strengthT > 0 ? 2 : 0) + (s.pow ?? 0);
            if (m.kind === "dragon" && crystalsLeft() > 0) hit = Math.max(1, Math.ceil(hit * 0.5));
            if (m.kind === "wither" && ((m.spawnT ?? 0) > 0 || m.shield)) {
              if (m.shield && (m.spawnT ?? 0) <= 0) burst(s.x, s.y, s.z, "#9a97ad", 5);
              hit = 0;
            }
            m.hp -= hit;
            if (m.kind === "villager" || m.kind === "golem") {
              m.byPlayerT = 6;
              addRep(repKeyFor(m.homeX ?? m.x, m.homeZ ?? m.z), m.kind === "villager" ? -3 : -2);
            }
            if (s.punch && m.kind !== "shulker" && m.kind !== "dragon") shove(m, s.vx, s.vz, 0.4 + 0.5 * s.punch);
            if (m.kind === "enderman" || m.kind === "bee") m.mad = true;
            if (s.flame) m.burn = Math.max(m.burn ?? 0, 4);
            if (m.hp <= 0) killMob(m);
            audio.hit();
            if (!s.pierce) {
              dead = true;
              break;
            }
          }
        }
      } else if (!dead && !s.friendly && Math.hypot(player.x - s.x, player.z - s.z) < 0.6 && Math.abs(player.y + 1 - s.y) < 1.2) {
        if (s.skull) {
          bite(4);
          witherT = Math.max(witherT, 8);
        } else {
          bite(s.fire ? 6 : 3);
          if (s.fire) fireT = Math.max(fireT, 3);
        }
        dead = true;
      }
      if (dead && s.splash) applySplash(s.splash, s.x, s.y, s.z);
      if (dead) scene.remove(s.mesh);
      else shots[w++] = s;
    }
    shots.length = w;
    // Firework rockets: climb, trail sparks, burst.
    tridentCd = Math.max(0, tridentCd - dt);
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.t += dt;
      r.trail -= dt;
      r.mesh.position.y += 10.5 * dt;
      if (r.trail <= 0) {
        r.trail = 0.07;
        burst(r.mesh.position.x, r.mesh.position.y - 0.3, r.mesh.position.z, "#ffd76a", 1);
      }
      if (r.t >= 1.15) {
        burst(r.mesh.position.x, r.mesh.position.y, r.mesh.position.z, r.color, 26);
        burst(r.mesh.position.x, r.mesh.position.y, r.mesh.position.z, "#ffffff", 8);
        audio.explode();
        scene.remove(r.mesh);
        rockets.splice(i, 1);
      }
    }
    w = 0;
    for (const d of drops) {
      d.vy -= 12 * dt;
      d.y += d.vy * dt;
      const gy0 = groundY(d.x, d.z);
      if (d.y < gy0) {
        d.y = gy0;
        d.vy = 0;
      }
      const hx = Math.floor(d.x);
      const hy = Math.floor(d.y);
      const hz = Math.floor(d.z);
      if (world.get(hx, hy, hz) === ID.Hopper) {
        const below = world.get(hx, hy - 1, hz);
        if (below === ID.Chest) {
          const bin = ensureChest(hx + "," + (hy - 1) + "," + hz);
          const slotI = bin.ids.findIndex((id, i) => id === d.id || (bin.ns[i] ?? 0) === 0);
          if (slotI >= 0) {
            bin.ids[slotI] = d.id;
            bin.ns[slotI] = (bin.ns[slotI] ?? 0) + d.n;
            scene.remove(d.mesh);
            continue;
          }
        }
      }
      d.mesh.position.set(d.x, d.y + 0.2, d.z);
      d.mesh.rotation.y += dt * 2;
      const dist = Math.hypot(player.x - d.x, player.z - d.z);
      if (phase === "play" && dist < 1.4 && Math.abs(player.y - d.y) < 2) {
        addInv(d.id, d.n);
        scene.remove(d.mesh);
        audio.place();
        continue;
      }
      if (dist < 4 && phase === "play") {
        d.x += ((player.x - d.x) / (dist || 1)) * dt * 3;
        d.z += ((player.z - d.z) / (dist || 1)) * dt * 3;
      }
      drops[w++] = d;
    }
    drops.length = w;
  }

  function pickBlock(id: number) {
    if (!def(id).placeable) return;
    const have = hotbar.indexOf(id);
    if (have >= 0) slot = have;
    else hotbar[slot] = id;
    emit();
  }

  // 3D Molded LEGO Sub-Brick (1×2 brick with 2 studs) & Plate (2×2 plate with 4 studs) Ragdoll/Debris System:
  // Replaces generic unlit cubes with real 3D studded LEGO sub-pieces that spin, bounce off terrain, and clatter!
  type DebrisPiece = {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    rx: number;
    ry: number;
    rz: number;
    vrx: number;
    vry: number;
    vrz: number;
    life: number;
    maxLife: number;
    scale: number;
    color: string;
    isPlate: boolean;
    piece?: boolean; // v4.17: a 1×1 LEGO brick knocked out of a block (Teardown)
  };
  const particles: DebrisPiece[] = [];

  function buildStuddedSubPieceGeo(w: number, h: number, d: number, nx: number, nz: number): THREE.BufferGeometry {
    const parts: THREE.BufferGeometry[] = [new THREE.BoxGeometry(w, h, d)];
    const sr = Math.min(w / nx, d / nz) * 0.31;
    const sh = sr * 0.68;
    for (let ix = 0; ix < nx; ix++) {
      for (let iz = 0; iz < nz; iz++) {
        const cyl = new THREE.CylinderGeometry(sr * 0.92, sr, sh, 10);
        cyl.translate(-w / 2 + (w / nx) * (ix + 0.5), h / 2 + sh / 2, -d / 2 + (d / nz) * (iz + 0.5));
        parts.push(cyl);
      }
    }
    let totalVerts = 0;
    let totalIdx = 0;
    for (const p of parts) {
      totalVerts += p.attributes.position.count;
      totalIdx += p.index ? p.index.count : 0;
    }
    const posArr = new Float32Array(totalVerts * 3);
    const nrmArr = new Float32Array(totalVerts * 3);
    const idxArr = new Uint16Array(totalIdx);
    let vOff = 0;
    let iOff = 0;
    for (const p of parts) {
      const pos = p.attributes.position as THREE.BufferAttribute;
      const nrm = p.attributes.normal as THREE.BufferAttribute;
      posArr.set(pos.array as Float32Array, vOff * 3);
      nrmArr.set(nrm.array as Float32Array, vOff * 3);
      if (p.index) {
        const ix = p.index.array;
        for (let k = 0; k < ix.length; k++) idxArr[iOff + k] = ix[k] + vOff;
        iOff += ix.length;
      }
      vOff += pos.count;
      p.dispose();
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
    merged.setAttribute("normal", new THREE.BufferAttribute(nrmArr, 3));
    merged.setIndex(new THREE.BufferAttribute(idxArr, 1));
    return merged;
  }

  const pgeoBrick1x2 = buildStuddedSubPieceGeo(0.24, 0.13, 0.12, 2, 1);
  const pgeoPlate2x2 = buildStuddedSubPieceGeo(0.22, 0.065, 0.22, 2, 2);
  const pmat = skin(0xffffff);
  const pmesh = new THREE.InstancedMesh(pgeoBrick1x2, pmat, 360);
  pmesh.count = 0;
  pmesh.frustumCulled = false; // v4.17 fix: an empty InstancedMesh caches an empty bounding sphere and is culled forever
  pmesh.castShadow = settings.realistic;
  pmesh.receiveShadow = settings.realistic;
  pmesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(360 * 3), 3);
  scene.add(pmesh);

  const plateMesh = new THREE.InstancedMesh(pgeoPlate2x2, pmat, 240);
  plateMesh.count = 0;
  plateMesh.frustumCulled = false; // v4.17 fix: an empty InstancedMesh caches an empty bounding sphere and is culled forever
  plateMesh.castShadow = settings.realistic;
  plateMesh.receiveShadow = settings.realistic;
  plateMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(240 * 3), 3);
  scene.add(plateMesh);
  const pdummy = new THREE.Object3D();
  // v4.17 Teardown LEGO: the pieces knocked out of blocks are real 1×1 LEGO
  // bricks (one stud), at the exact size they had inside the block — a
  // block is 2 × 2 of them, 3 courses high.
  const PIECE_MAX = 320;
  const pgeoPiece = buildStuddedSubPieceGeo(0.47, 0.31, 0.47, 1, 1);
  const pieceMesh = new THREE.InstancedMesh(pgeoPiece, pmat, PIECE_MAX);
  pieceMesh.count = 0;
  pieceMesh.frustumCulled = false; // v4.17 fix: an empty InstancedMesh caches an empty bounding sphere and is culled forever
  pieceMesh.castShadow = settings.realistic;
  pieceMesh.receiveShadow = settings.realistic;
  pieceMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PIECE_MAX * 3), 3);
  scene.add(pieceMesh);
  function spawnPiece(x: number, y: number, z: number, color: string, vx: number, vy: number, vz: number) {
    const life = 2.4 + Math.random() * 1.4; // they land and lie there a moment (Teardown rubble), then go
    particles.push({
      x, y, z, vx, vy, vz,
      rx: (Math.random() - 0.5) * 0.4, ry: Math.random() * Math.PI * 2, rz: (Math.random() - 0.5) * 0.4,
      vrx: (Math.random() - 0.5) * 9, vry: (Math.random() - 0.5) * 9, vrz: (Math.random() - 0.5) * 9,
      life, maxLife: life, scale: 1, color, isPlate: false, piece: true,
    });
    if (particles.length > 520) particles.splice(0, particles.length - 520);
  }

  function burst(x: number, y: number, z: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const life = 0.5 + Math.random() * 0.3;
      particles.push({
        x: x + (Math.random() - 0.5) * 0.28,
        y: y + (Math.random() - 0.5) * 0.28,
        z: z + (Math.random() - 0.5) * 0.28,
        vx: (Math.random() - 0.5) * 3.6,
        vy: 0.9 + Math.random() * 2.0,
        vz: (Math.random() - 0.5) * 3.6,
        rx: Math.random() * Math.PI * 2,
        ry: Math.random() * Math.PI * 2,
        rz: Math.random() * Math.PI * 2,
        vrx: (Math.random() - 0.5) * 5.5,
        vry: (Math.random() - 0.5) * 5.5,
        vrz: (Math.random() - 0.5) * 5.5,
        life,
        maxLife: life,
        scale: 0.72 + Math.random() * 0.32,
        color,
        isPlate: i % 3 === 0,
      });
    }
    if (particles.length > 420) particles.splice(0, particles.length - 420);
  }

  // Granular Modular Block Destruction: ejects the actual 2×2 top plate and running-bond 1×2 / 2×1 sub-bricks
  function burstModularBlock(x: number, y: number, z: number, block: ReturnType<typeof def>) {
    const topCol = block.top || block.color;
    const sideCol = block.side || block.color;
    // 1. Eject the top 2×2 LEGO plate (e.g. green grass plate on Grass blocks)
    for (let i = 0; i < 2; i++) {
      const life = 0.7 + Math.random() * 0.3;
      particles.push({
        x: x + (Math.random() - 0.5) * 0.32,
        y: y + 0.26,
        z: z + (Math.random() - 0.5) * 0.32,
        vx: (Math.random() - 0.5) * 3.2,
        vy: 1.3 + Math.random() * 1.6,
        vz: (Math.random() - 0.5) * 3.2,
        rx: (Math.random() - 0.5) * 0.5,
        ry: Math.random() * Math.PI * 2,
        rz: (Math.random() - 0.5) * 0.5,
        vrx: (Math.random() - 0.5) * 5,
        vry: (Math.random() - 0.5) * 5,
        vrz: (Math.random() - 0.5) * 5,
        life,
        maxLife: life,
        scale: 1.05,
        color: topCol,
        isPlate: true,
      });
    }
    // 2. Eject the 6 running-bond 1×2 and 2×1 sub-bricks from courses 0 & 1
    for (let i = 0; i < 8; i++) {
      const life = 0.7 + Math.random() * 0.35;
      particles.push({
        x: x + (Math.random() - 0.5) * 0.42,
        y: y + (i < 4 ? 0.0 : -0.22),
        z: z + (Math.random() - 0.5) * 0.42,
        vx: (Math.random() - 0.5) * 3.8,
        vy: 1.0 + Math.random() * 1.9,
        vz: (Math.random() - 0.5) * 3.8,
        rx: (Math.random() - 0.5) * 0.8,
        ry: (i % 2) * (Math.PI / 2) + (Math.random() - 0.5) * 0.4,
        rz: (Math.random() - 0.5) * 0.8,
        vrx: (Math.random() - 0.5) * 5.5,
        vry: (Math.random() - 0.5) * 5.5,
        vrz: (Math.random() - 0.5) * 5.5,
        life,
        maxLife: life,
        scale: 1.0,
        color: sideCol,
        isPlate: false,
      });
    }
    if (particles.length > 420) particles.splice(0, particles.length - 420);
  }

  // Mob Brick Ragdoll Disassembly: scatters larger constituent 1×2 LEGO bricks & 2×2 plates on death/explosion
  function spawnMobRagdoll(x: number, y: number, z: number, colors: string[], count: number) {
    for (let i = 0; i < count; i++) {
      const life = 1.05 + Math.random() * 0.55;
      const ang = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const spd = 1.8 + Math.random() * 2.8;
      particles.push({
        x: x + Math.cos(ang) * 0.18,
        y: y + (Math.random() - 0.3) * 0.45,
        z: z + Math.sin(ang) * 0.18,
        vx: Math.cos(ang) * spd,
        vy: 2.2 + Math.random() * 3.2,
        vz: Math.sin(ang) * spd,
        rx: Math.random() * Math.PI * 2,
        ry: Math.random() * Math.PI * 2,
        rz: Math.random() * Math.PI * 2,
        vrx: (Math.random() - 0.5) * 12,
        vry: (Math.random() - 0.5) * 12,
        vrz: (Math.random() - 0.5) * 12,
        life,
        maxLife: life,
        scale: 1.12,
        color: colors[i % colors.length],
        isPlate: i % 3 === 0,
      });
    }
    if (particles.length > 420) particles.splice(0, particles.length - 420);
  }

  let heardAt = 0;

  function gainXp(n: number) {
    if (creative || n <= 0) return;
    xp += Math.floor(n);
    let ups = 0;
    let perk = "";
    while (rankLv < 30 && xp >= xpNeed(rankLv)) {
      xp -= xpNeed(rankLv);
      rankLv += 1;
      ups += 1;
      const hit = nextPerk(rankLv - 1);
      if (hit && hit.level === rankLv) perk = hit.name;
    }
    if (ups) {
      audio.rank();
      say(perk ? rankTitle(rankLv) + " — " + perk : rankTitle(rankLv) + ". Level " + rankLv, 3400);
      flash = 1;
      burst(player.x, player.y + 1.1, player.z, "#f5c518", 16);
    }
    saveDirty = true;
  }

  function spendLevels(n: number) {
    if (creative) return true;
    if (rankLv < n) return false;
    rankLv -= n;
    saveDirty = true;
    return true;
  }

  function gate(lvl?: number) {
    if (!lvl || creative || rankLv >= lvl) return true;
    say("Need builder level " + lvl);
    return false;
  }

  function oreEar(x: number, y: number, z: number) {
    if ((rankLv < 6 && !skills.has("vein")) || creative) return;
    const now = performance.now();
    if (now - heardAt < 7000) return;
    const rad = skills.has("vein") ? 7 : 4;
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dz = -rad; dz <= rad; dz++) {
        for (let dx = -rad; dx <= rad; dx++) {
          const name = ORE_HEAR[world.get(x + dx, y + dy, z + dz)];
          if (!name) continue;
          heardAt = now;
          say("You hear " + name);
          return;
        }
      }
    }
  }

  function updateParticles(dt: number) {
    let w = 0;
    let bCount = 0;
    let pCount = 0;
    let kCount = 0;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy -= 22 * dt; // physics rework: debris falls HEAVY, never floats
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.rx += p.vrx * dt;
      p.ry += p.vry * dt;
      p.rz += p.vrz * dt;
      // Physical terrain bounce for unclipped LEGO bricks & plates.
      // A melt puddle's visual surface is ~0.28 high, not a full block:
      // rest debris ON the liquid, never floating at full-block height.
      const gBase = groundY(p.x, p.z);
      const onPuddle = world.get(Math.floor(p.x), Math.round(gBase - 1), Math.floor(p.z)) === ID.Melted;
      const gy = onPuddle ? gBase - 0.7 : gBase + (settings.studs ? STUD_H : 0) + (p.piece ? 0.155 : 0.05);
      if (p.y < gy && p.vy < 0) {
        p.y = gy;
        p.vy = -p.vy * 0.32;
        p.vx *= 0.72;
        p.vz *= 0.72;
        p.vrx *= 0.65;
        p.vry *= 0.75;
        p.vrz *= 0.65;
        if (Math.abs(p.vy) < 0.6) {
          p.vy = 0;
          p.rx = Math.round(p.rx / (Math.PI / 2)) * (Math.PI / 2);
          p.rz = Math.round(p.rz / (Math.PI / 2)) * (Math.PI / 2);
          p.vrx = 0;
          p.vrz = 0;
        }
      }
      particles[w++] = p;
      const fade = Math.min(1, p.life / Math.min(p.piece ? 0.45 : 0.25, p.maxLife));
      pdummy.position.set(p.x, p.y, p.z);
      pdummy.rotation.set(p.rx, p.ry, p.rz);
      pdummy.scale.setScalar(p.scale * fade);
      pdummy.updateMatrix();
      tmp.set(p.color);
      if (p.piece) {
        if (kCount < PIECE_MAX) {
          pieceMesh.setMatrixAt(kCount, pdummy.matrix);
          pieceMesh.setColorAt(kCount, tmp);
          kCount++;
        }
      } else if (p.isPlate && pCount < 240) {
        plateMesh.setMatrixAt(pCount, pdummy.matrix);
        plateMesh.setColorAt(pCount, tmp);
        pCount++;
      } else if (bCount < 360) {
        pmesh.setMatrixAt(bCount, pdummy.matrix);
        pmesh.setColorAt(bCount, tmp);
        bCount++;
      }
    }
    particles.length = w;
    pmesh.count = bCount;
    plateMesh.count = pCount;
    pieceMesh.count = kCount;
    pieceMesh.instanceMatrix.needsUpdate = true;
    if (pieceMesh.instanceColor) pieceMesh.instanceColor.needsUpdate = true;
    pmesh.instanceMatrix.needsUpdate = true;
    plateMesh.instanceMatrix.needsUpdate = true;
    if (pmesh.instanceColor) pmesh.instanceColor.needsUpdate = true;
    if (plateMesh.instanceColor) plateMesh.instanceColor.needsUpdate = true;
  }

  // ================= v4.15: SRN fire FX (flames + smoke) =================
  // Every flame and every smoke puff in the world is ONE instanced shader
  // mesh each: the animation (flicker, tongues, rise, dissipation) is pure
  // sine-field math in the shaders (zero textures, zero per-frame CPU) —
  // game.ts only rewrites the instance lists when the fire set changes.
  const FIRE_MAX = 512;
  const SMOKE_PER = 4;
  const SMOKE_MAX = FIRE_MAX * SMOKE_PER;
  const fireFxVert = `
    attribute vec3 aPos; attribute float aPhase; attribute float aScale; attribute vec3 aDir;
    uniform float uTime; varying vec2 vUv; varying float vPhase;
    void main(){
      vUv = uv; vPhase = aPhase;
      float ly = position.y + 0.5;
      vec3 toCam = cameraPosition - aPos; toCam.y = 0.0;
      // aDir != 0: a FACE SHEET lying flat on a burning façade (Minecraft
      // side fire); aDir == 0: a free flame turning to the camera.
      vec3 fwd = dot(aDir, aDir) > 0.0 ? aDir : normalize(toCam + vec3(0.001, 0.0, 0.0));
      vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
      float sway = sin(uTime * 3.1 + aPhase * 23.0 + ly * 2.6) * 0.07 * ly;
      vec3 wp = aPos + right * (position.x * aScale + sway) + vec3(0.0, ly * 1.05 * aScale, 0.0);
      gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
    }`;
  const fireFxFrag = `
    precision highp float;
    varying vec2 vUv; varying float vPhase;
    uniform float uTime;
    float sn(vec2 p){ return sin(p.x) * sin(p.y); }
    float snoise(vec2 p){
      float v = 0.0; float a = 0.55;
      for(int i = 0; i < 4; i++){ v += a * sn(p); p = vec2(p.y * 1.7 + p.x * 0.6, p.x * 1.3 - p.y * 0.4) * 1.6; a *= 0.55; }
      return v;
    }
    void main(){
      float t = uTime;
      vec2 uv = vUv;
      float rise = uv.y;
      vec2 fp = vec2(uv.x * 6.8 + vPhase * 31.0, uv.y * 9.5 - t * 3.1 + vPhase * 17.0);
      float n = snoise(fp) * 0.5 + 0.5;
      float n2 = snoise(fp * 2.3 + vec2(3.7, 1.3) - vec2(0.0, t * 1.7)) * 0.5 + 0.5;
      // Physics rework (Philippe: flames read as flat "cards"): ragged
      // silhouette — noise eats the width, the edge is crisp not feathered,
      // and erosion punches real gaps between tongues.
      float w = mix(0.46, 0.05, pow(rise, 1.25)) * (0.85 + 0.3 * sin(t * 9.0 + vPhase * 41.0)) * (0.62 + 0.62 * n2);
      float d = abs(uv.x - 0.5 + (n - 0.5) * 0.42 * rise);
      float body = smoothstep(w, w - 0.15, d);
      float lick = smoothstep(0.35, 0.9, n2 + (1.0 - rise) * 0.55);
      float a = clamp(body * (0.35 + lick), 0.0, 1.0) * (0.9 + 0.18 * sin(t * 13.0 + vPhase * 57.0));
      a *= smoothstep(0.10, 0.42, n + (1.0 - rise) * 0.38);
      a *= 1.0 - smoothstep(0.72, 1.0, rise) * 0.9;
      if (a < 0.012) discard;
      float heat = clamp((1.0 - rise) * 0.75 + n * 0.38, 0.0, 1.0);
      vec3 col = mix(vec3(0.85, 0.16, 0.02), vec3(1.0, 0.45, 0.05), smoothstep(0.05, 0.45, heat));
      col = mix(col, vec3(1.0, 0.83, 0.25), smoothstep(0.45, 0.75, heat));
      col = mix(col, vec3(1.0, 0.98, 0.88), smoothstep(0.62, 0.92, heat));
      gl_FragColor = vec4(col * (1.45 + heat * 1.25), a * 0.92);
    }`;
  const smokeVert = `
    attribute vec3 aPos; attribute float aPhase; attribute float aScale;
    uniform float uTime; varying vec2 vUv; varying float vPhase; varying float vLife;
    void main(){
      vUv = uv; vPhase = aPhase;
      float lt = fract(uTime / 4.2 + aPhase);
      vLife = lt;
      vec3 center = aPos + vec3(
        sin(aPhase * 40.0 + uTime * 0.7 + lt * 2.2) * 0.38 * (0.4 + lt),
        lt * 4.3 * aScale,
        cos(aPhase * 31.0 + lt * 1.9) * 0.32 * (0.4 + lt));
      float sz = aScale * mix(0.55, 2.3, lt);
      vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
      vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
      vec3 wp = center + right * position.x * sz + up * position.y * sz;
      gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
    }`;
  const smokeFrag = `
    precision highp float;
    varying vec2 vUv; varying float vPhase; varying float vLife;
    uniform float uTime;
    float sn(vec2 p){ return sin(p.x) * sin(p.y); }
    float snoise(vec2 p){
      float v = 0.0; float a = 0.55;
      for(int i = 0; i < 4; i++){ v += a * sn(p); p = vec2(p.y * 1.7 + p.x * 0.6, p.x * 1.3 - p.y * 0.4) * 1.6; a *= 0.55; }
      return v;
    }
    void main(){
      float d = length(vUv - 0.5) * 2.0;
      float n = snoise(vUv * 6.0 + vPhase * 19.0 + vec2(0.0, -uTime * 0.15)) * 0.5 + 0.5;
      float a = smoothstep(1.0, 0.25, d + n * 0.45) * sin(3.14159 * vLife) * 0.23;
      if (a < 0.004) discard;
      gl_FragColor = vec4(mix(vec3(0.13, 0.13, 0.14), vec3(0.33, 0.33, 0.35), n), a);
    }`;
  function makeFxMesh(max: number, vert: string, frag: string, additive: boolean) {
    const plane = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = plane.index;
    geo.setAttribute("position", plane.getAttribute("position"));
    geo.setAttribute("uv", plane.getAttribute("uv"));
    const pos = new Float32Array(max * 3);
    const phase = new Float32Array(max);
    const scale = new Float32Array(max);
    const dir = new Float32Array(max * 3);
    geo.setAttribute("aDir", new THREE.InstancedBufferAttribute(dir, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aPos", new THREE.InstancedBufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phase, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aScale", new THREE.InstancedBufferAttribute(scale, 1).setUsage(THREE.DynamicDrawUsage));
    geo.instanceCount = 0;
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = additive ? 7 : 8;
    scene.add(mesh);
    return { geo, mat, pos, phase, scale, dir, count: 0 };
  }
  const flameFx = makeFxMesh(FIRE_MAX, fireFxVert, fireFxFrag, true);
  const smokeFx = makeFxMesh(SMOKE_MAX, smokeVert, smokeFrag, false);
  function fxHash(k: string) {
    let h = 2166136261;
    for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619);
    return ((h >>> 0) % 1000) / 1000;
  }
  function fxPush(fx: typeof flameFx, x: number, y: number, z: number, phase: number, scale: number, dx = 0, dz = 0) {
    if (fx.count >= fx.pos.length / 3) return;
    const i = fx.count++;
    fx.pos[i * 3] = x;
    fx.pos[i * 3 + 1] = y;
    fx.pos[i * 3 + 2] = z;
    fx.phase[i] = phase;
    fx.scale[i] = scale;
    fx.dir[i * 3] = dx;
    fx.dir[i * 3 + 1] = 0;
    fx.dir[i * 3 + 2] = dz;
  }
  function fxCommit(fx: typeof flameFx) {
    fx.geo.instanceCount = fx.count;
    (fx.geo.getAttribute("aPos") as THREE.BufferAttribute).needsUpdate = true;
    (fx.geo.getAttribute("aPhase") as THREE.BufferAttribute).needsUpdate = true;
    (fx.geo.getAttribute("aScale") as THREE.BufferAttribute).needsUpdate = true;
    (fx.geo.getAttribute("aDir") as THREE.BufferAttribute).needsUpdate = true;
    fx.count = 0;
  }
  let fireFxDirty = true;
  // v4.18: transient explosion emitters (fireball + smoke column + dust ring),
  // aged in updateFireFx and folded into the same instanced sync.
  const boomFx: { x: number; y: number; z: number; r: number; age: number }[] = [];
  function syncFireFx() {
    // v4.16.1 Minecraft-style flames (Claude): every flame is ANCHORED to
    // a surface — nothing floats. A fire cell on solid ground burns tall
    // from the ground; a fire cell beside fuel lays a flat sheet on each
    // flammable face it touches; a burning block wears sheets on its own
    // exposed faces (the façade burns) and a crown on an open top.
    const SIDE4 = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
    const fuelAt = (x: number, y: number, z: number) => flamOf(world.get(x, y, z)) > 0;
    const openAt = (x: number, y: number, z: number) => {
      const id = world.get(x, y, z);
      return id === ID.Air || id === ID.Fire || def(id).plant;
    };
    for (const k of FS.fireCells) {
      const [x, y, z] = FS.funkey(k);
      const h = fxHash(k);
      if (def(world.get(x, y - 1, z)).solid) fxPush(flameFx, x + 0.5, y + 0.02, z + 0.5, h, 1);
      for (const [ox, oz] of SIDE4) {
        // a flammable block on this side: the sheet lies on ITS face,
        // turned outward into this fire cell
        if (fuelAt(x + ox, y, z + oz)) fxPush(flameFx, x + 0.5 + ox * 0.46, y - 0.02, z + 0.5 + oz * 0.46, h + 0.13 * (ox + 2 * oz), 0.95, -ox, -oz);
      }
    }
    for (const k of FS.burningMap.keys()) {
      const [x, y, z] = FS.funkey(k);
      const h = fxHash(k) + 0.37;
      for (const [ox, oz] of SIDE4) {
        if (!openAt(x + ox, y, z + oz)) continue;
        if (FS.fireCells.has(FS.fkey(x + ox, y, z + oz))) continue; // that fire cell already dresses this face
        fxPush(flameFx, x + 0.5 + ox * 0.54, y - 0.02, z + 0.5 + oz * 0.54, h + 0.21 * (ox + 2 * oz), 0.85, ox, oz);
      }
      if (openAt(x, y + 1, z)) fxPush(flameFx, x + 0.5, y + 0.98, z + 0.5, h + 0.5, 0.8);
    }
    // Melting plastic BURNS as it liquefies (Philippe: "que ça brûle plus"):
    // low flames hugging the exposed foot of the slumping mass and a small
    // crown on its (lowered) top — on the surface, never inside the block.
    for (const [k, st] of FS.heatMap) {
      if (st.m < 0.5) continue;
      const [x, y, z] = FS.funkey(k);
      const h = fxHash(k) + 0.61;
      let n = 0;
      for (const [ox, oz] of SIDE4) {
        if (n >= 2 || !openAt(x + ox, y, z + oz)) continue;
        fxPush(flameFx, x + 0.5 + ox * 0.6, y - 0.02, z + 0.5 + oz * 0.6, h + 0.19 * (ox + 2 * oz), 0.55, ox, oz);
        n++;
      }
      if (openAt(x, y + 1, z)) fxPush(flameFx, x + 0.5, y + 1 - 0.8 * st.m, z + 0.5, h + 0.4, 0.45);
    }
    // v4.18: explosion fireballs — a fat, short-lived flame cluster.
    for (const b of boomFx) {
      if (b.age >= 0.45) continue;
      const h = fxHash("boom" + b.x + "," + b.z);
      fxPush(flameFx, b.x, b.y - 0.4, b.z, h, 2.7);
      fxPush(flameFx, b.x + 0.7, b.y - 0.5, b.z + 0.3, h + 0.33, 1.9);
      fxPush(flameFx, b.x - 0.6, b.y - 0.5, b.z - 0.5, h + 0.66, 1.7);
    }
    fxCommit(flameFx);
    // Smoke: fires, burning blocks, campfires, exposed lava.
    const puff = (x: number, y: number, z: number, k: string, s: number) => {
      const h = fxHash(k);
      for (let i = 0; i < SMOKE_PER; i++) fxPush(smokeFx, x, y, z, (h + i / SMOKE_PER) % 1, s);
    };
    for (const k of FS.fireCells) {
      const [x, y, z] = FS.funkey(k);
      puff(x + 0.5, y + 1.15, z + 0.5, k, 1);
    }
    for (const k of FS.burningMap.keys()) {
      const [x, y, z] = FS.funkey(k);
      puff(x + 0.5, y + 1.25, z + 0.5, k, 0.9);
    }
    for (const [k, st] of FS.heatMap) {
      if (st.m < 0.3) continue;
      const [x, y, z] = FS.funkey(k);
      puff(x + 0.5, y + 1.2, z + 0.5, k, 0.7);
    }
    for (const k of FS.allEmitters()) {
      const [x, y, z] = FS.funkey(k);
      const id = world.get(x, y, z);
      if (id === ID.Campfire) puff(x + 0.5, y + 1.0, z + 0.5, k, 0.8);
      else if (id === ID.Lava) puff(x + 0.5, y + 1.05, z + 0.5, k, 1.1);
    }
    // v4.18: explosion smoke — a fat column over the crater, dust at the rim.
    for (const b of boomFx) {
      puff(b.x, b.y + 0.8, b.z, "boomc" + b.x + "," + b.z, 3.1);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + b.x;
        puff(b.x + Math.cos(a) * b.r * 0.85, b.y - 0.2, b.z + Math.sin(a) * b.r * 0.85, "boomr" + i + "," + b.x, 1.4);
      }
    }
    fxCommit(smokeFx);
    fireFxDirty = false;
  }
  let fxLastT = 0;
  function updateFireFx() {
    const t = performance.now() / 1000;
    flameFx.mat.uniforms.uTime.value = t;
    smokeFx.mat.uniforms.uTime.value = t;
    if (boomFx.length) {
      const dt = Math.min(0.1, fxLastT ? t - fxLastT : 0.016);
      for (let i = boomFx.length - 1; i >= 0; i--) {
        boomFx[i].age += dt;
        if (boomFx[i].age > 7) boomFx.splice(i, 1);
      }
      fireFxDirty = true;
    }
    fxLastT = t;
    if (fireFxDirty) syncFireFx();
  }
  // ================= end v4.15 fire FX =================

  function groundY(x: number, z: number) {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    let y = Math.min(HEIGHT - 2, world.heightAt(ix, iz) + 8);
    for (; y >= 1; y--) {
      const d = def(world.get(ix, y, iz));
      if (d.solid) return y + (d.slab ? 0.5 : 1);
    }
    return 5;
  }

  function spawnSheep() {
    for (const spot of sheepSpots) spawnKind("sheep", spot.x, spot.z);
    const baseX = sheepSpots[0]?.x ?? player.x + 6;
    const baseZ = sheepSpots[0]?.z ?? player.z;
    spawnKind("cow", baseX, baseZ - 4);
    spawnKind("cow", player.x - 5, player.z - 2);
    spawnKind("pig", player.x + 3, player.z - 5);
    spawnKind("chicken", player.x - 2, player.z + 6);
    spawnKind("chicken", player.x + 2, player.z + 7);
    spawnKind("horse", player.x - 8, player.z + 3);
    spawnKind("frog", player.x + 6, player.z + 8);
    spawnKind("fox", player.x - 6, player.z - 7);
    spawnKind("crab", player.x + 11, player.z - 3);
    spawnKind("wolf", player.x - 9, player.z + 9);
    if (!settings.mods.peaceful) spawnKind("slime", player.x + 14, player.z + 5);
    spawnFolk();
  }

  function spawnFolk() {
    for (const spot of folkSpots) {
      const mob = spawnKind("villager", spot.x, spot.z);
      mob.role = spot.role;
      mob.homeX = spot.x;
      mob.homeZ = spot.z;
      mob.bodyMat?.color.setHex(traderOf(spot.role as TraderRole).tint);
      decorateVillagerRole(mob.mesh, spot.role as TraderRole);
    }
    if (villageAt) {
      const mob = spawnKind("golem", villageAt.x + 14.5, villageAt.z + 8.5);
      mob.homeX = villageAt.x + 14.5;
      mob.homeZ = villageAt.z + 8.5;
      golemWait = 45;
    }
  }

  function ensureRoamingFolk() {
    if (flat) return;
    for (let i = mobs.length - 1; i >= 0; i--) {
      const mob = mobs[i];
      if (!mob.roam || mob.kind !== "villager" || mob.homeX === undefined || mob.homeZ === undefined) continue;
      if (mob.dead || Math.hypot(mob.homeX - player.x, mob.homeZ - player.z) > 150) {
        scene.remove(mob.mesh);
        mobs.splice(i, 1);
      }
    }
    const site = world.nearestHamlet(player.x, player.z, 2);
    if (!site) return;
    if (Math.hypot(site.x + 15 - player.x, site.z + 14 - player.z) > 72) return;
    golemWait = Math.max(0, golemWait - 2.5);
    const gx = site.x + 14.5;
    const gz = site.z + 8.5;
    const hasGolem = mobs.some((m) => m.kind === "golem" && !m.dead && Math.hypot(m.x - gx, m.z - gz) < 48);
    if (!hasGolem && golemWait <= 0) {
      const mob = spawnKind("golem", gx, gz);
      mob.homeX = gx;
      mob.homeZ = gz;
      mob.roam = true;
      golemWait = 45;
    }
    const live = mobs.filter((m) => m.kind === "villager" && !m.dead);
    if (live.length >= 21) return;
    for (const spot of folkLayout(site.x, site.z)) {
      if (live.some((m) => m.homeX !== undefined && m.homeZ !== undefined && Math.hypot(m.homeX - spot.x, m.homeZ - spot.z) < 3)) continue;
      const mob = spawnKind("villager", spot.x, spot.z);
      mob.role = spot.role;
      mob.homeX = spot.x;
      mob.homeZ = spot.z;
      mob.roam = true;
      mob.bodyMat?.color.setHex(traderOf(spot.role as TraderRole).tint);
      decorateVillagerRole(mob.mesh, spot.role as TraderRole);
      live.push(mob);
    }
  }

  // ---- Illager patrols and hamlet raids ----
  function attachBanner(mob: Mob) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.5, 0.07), new THREE.MeshLambertMaterial({ color: 0x5a4632 }));
    pole.position.set(0, 2.2, 0.24);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.05), new THREE.MeshLambertMaterial({ color: 0xf2ead8 }));
    flag.position.set(0.2, 2.65, 0.24);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.06), new THREE.MeshLambertMaterial({ color: 0x8a2f2a }));
    cross.position.set(0.2, 2.65, 0.24);
    g.add(pole, flag, cross);
    mob.mesh.add(g);
  }

  function spawnPatrol() {
    const ang = Math.random() * Math.PI * 2;
    const px = player.x + Math.sin(ang) * 34;
    const pz = player.z + Math.cos(ang) * 34;
    const cap = spawnKind("pillager", px, pz);
    cap.captain = true;
    attachBanner(cap);
    spawnKind("pillager", px + 2, pz + 1);
    spawnKind("pillager", px - 2, pz - 1);
    if (rankLv >= 4) spawnKind("vindicator", px + 1, pz - 2);
  }

  function spawnRaidWave(n: number) {
    if (!raid) return;
    const comp: Mob["kind"][] =
      n === 1
        ? ["pillager", "pillager", "pillager", "vindicator", "vindicator"]
        : n === 2
          ? ["pillager", "pillager", "pillager", "vindicator", "vindicator", "evoker", "vex", "vex"]
          : ["pillager", "pillager", "pillager", "vindicator", "vindicator", "vindicator", "evoker", "ravager"];
    const pts: [number, number][] = [
      [raid.cx + 25, raid.cz],
      [raid.cx - 25, raid.cz],
      [raid.cx, raid.cz + 25],
      [raid.cx, raid.cz - 25],
    ];
    comp.forEach((kind, i) => {
      const [px, pz] = pts[i % pts.length];
      const mob = spawnKind(kind, px + (Math.random() - 0.5) * 4, pz + (Math.random() - 0.5) * 4);
      mob.raidMob = true;
    });
    raid.total = comp.length;
    raid.wave = n;
    raid.phase = "fight";
    say("Raid wave " + n + " — " + comp.length + " raiders!");
  }

  function startRaid(cx: number, cz: number) {
    raid = { cx, cz, wave: 0, phase: "rest", t: 2.5, total: 0, awayT: 0 };
    omenT = 0;
    say("A war horn echoes — the illagers are coming for the hamlet!");
  }

  function endRaid(victory: boolean) {
    if (!raid) return;
    if (victory) {
      heroT = 1800;
      addRep(repKeyFor(raid.cx, raid.cz), 15);
      dropItem(ID.Emerald, 6, raid.cx, groundY(raid.cx, raid.cz) + 1, raid.cz);
      say("The hamlet stands! The folk name you Hero of the Hamlet — trades run cheaper for a while.");
    } else {
      for (const m of mobs)
        if (m.raidMob && !m.dead) {
          m.dead = true;
          scene.remove(m.mesh);
        }
      say("The raiders melt away into the wild.");
    }
    raid = null;
  }

  function raidTick(dt: number) {
    if (phase !== "play" || realm !== 0) return;
    patrolT -= dt;
    if (patrolT <= 0) {
      patrolT = 280 + Math.random() * 160;
      if (!settings.mods.peaceful && !raid) {
        const near = world.nearestHamlet(player.x, player.z, 2);
        const nearC = near ? Math.hypot(near.x + 15 - player.x, near.z + 14 - player.z) : 999;
        if (nearC > 42) spawnPatrol();
      }
    }
    if (!raid && omenT > 0 && !settings.mods.peaceful) {
      const site = world.nearestHamlet(player.x, player.z, 2);
      if (site && Math.hypot(site.x + 15 - player.x, site.z + 14 - player.z) < 30) startRaid(site.x + 15, site.z + 14);
    }
    if (!raid) return;
    const dc = Math.hypot(raid.cx - player.x, raid.cz - player.z);
    if (dc > 110) {
      raid.awayT += dt;
      if (raid.awayT > 45) {
        endRaid(false);
        return;
      }
    } else raid.awayT = 0;
    if (raid.phase === "rest") {
      raid.t -= dt;
      if (raid.t <= 0) spawnRaidWave(raid.wave + 1);
    } else if (!mobs.some((m) => m.raidMob && !m.dead)) {
      if (raid.wave >= 3) endRaid(true);
      else {
        raid.phase = "rest";
        raid.t = 8;
        say("Wave " + raid.wave + " broken — but horns sound again in the distance…");
      }
    }
  }

  // Landmark guardians: each set-piece structure keeps its own defenders,
  // topped up whenever the player wanders close (folk pattern).
  function ensureLandmarkGuards() {
    if (flat || phase !== "play" || realm === 2) return;
    const lm = world.nearestLandmark(player.x, player.z);
    if (!lm) return;
    if (Math.hypot(lm.x - player.x, lm.z - player.z) > 76) return;
    const key = lm.kind + "@" + lm.x + "," + lm.z;
    const greet = (msg: string) => {
      if (lastLmKey !== key) {
        lastLmKey = key;
        say(msg, 3600);
      }
    };
    const count = (kind: Mob["kind"], rad: number) => mobs.filter((m) => m.kind === kind && !m.dead && Math.hypot(m.x - lm.x, m.z - lm.z) < rad).length;
    if (lm.kind === "monument") {
      greet("Marine Labyrinth — Guardians patrol the prismarine halls beneath the waves…");
      const guards = mobs.filter((m) => m.kind === "guardian" && !m.dead && Math.hypot(m.x - lm.x, m.z - lm.z) < 32);
      if (!guards.some((m) => (m.maxHp ?? 0) >= 30)) {
        const elder = spawnKind("guardian", lm.x + 2, lm.z, 1.7);
        elder.hp = 32;
        elder.maxHp = 32;
      }
      for (let i = guards.length; i < 4; i++) spawnKind("guardian", lm.x - 6 + i * 4, lm.z + 6);
    } else if (lm.kind === "pyramid") {
      greet("Desert Pyramid — Pharaoh Mummies guard the sunken treasure vault below!");
      if (count("husk", 32) < 2) {
        spawnKind("husk", lm.x - 4, lm.z + 10);
        spawnKind("husk", lm.x + 4, lm.z + 10);
        const pharaoh = spawnKind("husk", lm.x, lm.z - 3, 1.22);
        pharaoh.hp = 18;
        pharaoh.maxHp = 18;
      }
    } else if (lm.kind === "temple") {
      greet("Jungle Temple — Mossy traps and bone archers guard the lever vault!");
      if (count("skelly", 30) === 0) {
        spawnKind("skelly", lm.x - 3, lm.z + 6);
        spawnKind("skelly", lm.x + 3, lm.z - 4);
      }
      if (count("spider", 30) === 0) spawnKind("spider", lm.x, lm.z + 3);
    } else if (lm.kind === "witch_hut") {
      greet("Swamp Witch Hut — Potions bubble inside the stilt cabin…");
      if (count("witch", 28) === 0) {
        spawnKind("witch", lm.x, lm.z + 3);
      }
      if (count("slime", 28) === 0) spawnKind("slime", lm.x + 5, lm.z - 3, 0.85);
    } else if (lm.kind === "castle") {
      greet("Royal LEGO Fortress — Illager knights & crossbowmen hold the battlements!");
      if (count("pillager", 34) < 2) {
        spawnKind("pillager", lm.x - 4, lm.z + 11);
        spawnKind("pillager", lm.x + 4, lm.z + 11);
      }
      if (count("vindicator", 34) === 0) {
        spawnKind("vindicator", lm.x, lm.z + 5);
        spawnKind("vindicator", lm.x, lm.z - 4);
      }
    } else if (lm.kind === "mansion") {
      greet("Woodland Mansion — Vindicators and an Evoker guard the library.");
      if (count("vindicator", 32) === 0) {
        spawnKind("vindicator", lm.x + 10, lm.z + 8);
        spawnKind("vindicator", lm.x - 10, lm.z - 7);
      }
      if (count("evoker", 32) === 0) spawnKind("evoker", lm.x, lm.z + 9);
    } else if (lm.kind === "fortress") {
      greet("An ember-brick fortress spans the lava sea.");
      if (count("blaze", 36) === 0) {
        spawnKind("blaze", lm.x - 8, lm.z);
        spawnKind("blaze", lm.x + 8, lm.z);
      }
    } else {
      greet("A basalt bastion — and piglins guard its gold.");
      if (count("piglin", 32) === 0) {
        spawnKind("piglin", lm.x, lm.z + 15);
        spawnKind("piglin", lm.x + 4, lm.z + 15);
        spawnKind("piglin", lm.x - 4, lm.z + 15);
      }
    }
  }

  // ---- Stations (v3.8): beacon pyramids, conduit frames ----------------
  // Stations are player-built, so instead of a fragile placement registry
  // the tick simply scans the blocks around the player every 1.5 s —
  // a station works however it got into the world.
  const PYRAMID_BLOCKS = new Set<number>([ID.IronBlock, ID.Gold, ID.Diamond]);
  function pyramidLevel(x: number, y: number, z: number): number {
    let level = 0;
    for (let l = 1; l <= 4; l++) {
      let full = true;
      for (let dz = -l; dz <= l && full; dz++)
        for (let dx = -l; dx <= l; dx++)
          if (!PYRAMID_BLOCKS.has(world.get(x + dx, y - l, z + dz))) {
            full = false;
            break;
          }
      if (!full) break;
      level = l;
    }
    return level;
  }
  function prismFrameCount(x: number, y: number, z: number): number {
    // The three axis rings at Chebyshev distance 2 (the conduit frame).
    let n = 0;
    for (let a = -2; a <= 2; a++)
      for (let b = -2; b <= 2; b++) {
        if (Math.max(Math.abs(a), Math.abs(b)) !== 2) continue;
        if (world.get(x + a, y + b, z + 2) === ID.Prism) n++;
        if (world.get(x + a, y + 2, z + b) === ID.Prism) n++;
        if (world.get(x + 2, y + a, z + b) === ID.Prism) n++;
      }
    return n;
  }
  const BUFF_NEED: Record<string, number> = { speed: 1, jump: 1, regen: 2, strength: 3 };
  const CONDUIT_FOES = new Set(["walker", "creeper", "spider", "skelly", "stray", "husk", "drowned", "witch", "blaze", "ghast", "enderman", "guardian", "pillager", "vindicator", "evoker", "vex", "ravager", "slime", "phantom", "piglin", "wither", "dragon"]);
  function stationTick(dt: number) {
    stationAcc += dt;
    if (stationAcc < 1.5) return;
    stationAcc = 0;
    if (phase !== "play") return;
    const px = Math.floor(player.x);
    const py = Math.floor(player.y);
    const pz = Math.floor(player.z);
    const seenBeams = new Set<string>();
    for (let y = py - 8; y <= py + 8; y++)
      for (let z = pz - 24; z <= pz + 24; z++)
        for (let x = px - 24; x <= px + 24; x++) {
          const id = world.get(x, y, z);
          if (id === ID.Beacon) {
            const key = x + "," + y + "," + z;
            const level = pyramidLevel(x, y, z);
            if (level > 0) {
              seenBeams.add(key);
              let beam = beamMeshes.get(key);
              if (!beam) {
                beam = new THREE.Mesh(
                  new THREE.BoxGeometry(0.55, 64, 0.55),
                  new THREE.MeshBasicMaterial({ color: 0x9ae8e0, transparent: true, opacity: 0.3, depthWrite: false }),
                );
                beam.userData.keepShadow = false;
                scene.add(beam);
                beamMeshes.set(key, beam);
              }
              beam.position.set(x + 0.5, y + 32, z + 0.5);
              const buff = beaconBuffs.get(key);
              if (buff && level >= (BUFF_NEED[buff] ?? 1) && Math.hypot(player.x - x, player.z - z) <= 20 + level * 10 && Math.abs(player.y - y) <= 24) {
                if (buff === "speed") speedT = Math.max(speedT, 3);
                else if (buff === "jump") jumpT = Math.max(jumpT, 3);
                else if (buff === "regen") regenT = Math.max(regenT, 3);
                else if (buff === "strength") strengthT = Math.max(strengthT, 3);
              }
            }
          } else if (id === ID.Conduit) {
            const wet =
              world.get(x, y + 1, z) === ID.Water || world.get(x, y - 1, z) === ID.Water || world.get(x + 1, y, z) === ID.Water || world.get(x - 1, y, z) === ID.Water;
            if (!wet || prismFrameCount(x, y, z) < 16) continue;
            if (Math.hypot(player.x - x, player.y - y, player.z - z) <= 32 && inWaterNow()) gillT = Math.max(gillT, 3);
            for (const m of mobs) {
              if (m.dead || !CONDUIT_FOES.has(m.kind)) continue;
              if (Math.hypot(m.x - x, m.y - y, m.z - z) <= 8) {
                m.hp -= 2;
                if (m.hp <= 0) killMob(m);
              }
            }
          }
        }
    for (const [key, beam] of beamMeshes) {
      if (seenBeams.has(key)) continue;
      const [bx, by, bz] = key.split(",").map(Number);
      if (world.get(bx, by, bz) !== ID.Beacon || Math.hypot(player.x - bx, player.z - bz) > 40) {
        scene.remove(beam);
        beamMeshes.delete(key);
      }
    }
  }

  function spawnWalker(x: number, z: number) {
    spawnKind("walker", x, z);
  }

  function spawnKind(kind: Mob["kind"], x: number, z: number, scale = 1) {
    const y = kind === "ghast" || kind === "dragon" || kind === "phantom" || kind === "wither" || kind === "blaze" ? groundY(x, z) + (kind === "dragon" ? 6 : kind === "wither" ? 5 : 4) : groundY(x, z);
    const body = buildLego(kind, scale);
    const mob: Mob = {
      kind,
      x,
      y,
      z,
      yaw: Math.random() * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
      hp:
        kind === "dragon"
          ? 140 + crystalsLeft() * 15
          : kind === "enderman"
            ? 16
            : kind === "ravager"
              ? 40
              : kind === "guardian" || kind === "shulker"
                ? 15
                : kind === "pillager" || kind === "vindicator" || kind === "evoker"
                  ? 12
                  : kind === "vex"
                    ? 7
              : kind === "witch"
              ? 13
              : kind === "blaze"
                ? 10
                : kind === "bat"
                  ? 2
                  : kind === "golem"
                    ? 24
                    : kind === "ghast"
                      ? 10
                      : kind === "wither"
                        ? 120
                        : kind === "slime"
                        ? scale < 0.5
                          ? 2
                          : scale < 0.8
                            ? 4
                            : 10
                        : kind === "walker" || kind === "wolf" || kind === "drowned" || kind === "husk" || kind === "stray"
                          ? 8
                          : kind === "wisp"
                            ? 6
                            : kind === "cow" || kind === "squid" || kind === "goat"
                              ? 5
                              : kind === "frog" || kind === "crab" || kind === "sheep" || kind === "bee" || kind === "axolotl" || kind === "parrot"
                                ? 3
                                : 4,
      wander: 1,
      fuse: 0,
      cool: 0,
      dead: false,
      mesh: body.group,
      legs: body.legs,
      bodyMat: body.bodyMat,
      love: 0,
      baby: 0,
      sheared: 0,
      tame: false,
      size: kind === "slime" ? scale : 1,
    };
    if (kind === "dragon") {
      mob.maxHp = mob.hp;
      mob.mode = "circle";
      mob.modeT = 4;
    }
    if (kind === "wither") {
      mob.maxHp = mob.hp;
      mob.spawnT = 3;
      mob.phaseN = 0;
    }
    scene.add(body.group);
    mobs.push(mob);
    return mob;
  }

  function interactMob(mob: Mob) {
    const held = hotbar[slot];
    if (held === ID.NameTag && mob.kind !== "boat" && mob.kind !== "cart") {
      void askText("Name this brick friend", "A named mob never despawns", mob.name ?? "").then((answer) => {
        const name = (answer ?? "").trim().slice(0, 20);
        if (!name || mob.dead) return;
        if (!creative && (inv[ID.NameTag] ?? 0) <= 0) return say("Need a name tag");
        mob.name = name;
        const plate = nameSprite(name);
        const nb = new THREE.Box3().setFromObject(mob.mesh);
        plate.position.set(0, (nb.max.y - nb.min.y || 1.8) + 0.45, 0);
        mob.mesh.add(plate);
        if (!creative) spend(ID.NameTag, 1);
        say("Named " + name + " — it will stay");
      });
      return;
    }
    if (mob.kind === "sheep" && held === ID.Shears && !(mob.sheared && mob.sheared > 0)) {
      dropItem(ID.White, 2, mob.x, mob.y + 0.5, mob.z);
      mob.sheared = 45;
      mob.mesh.traverse((obj) => {
        if (obj.userData.wool) obj.visible = false;
      });
      wearHeld();
      say("Shorn");
      return;
    }
    if (held === ID.Lead && (mob.kind === "sheep" || mob.kind === "cow" || mob.kind === "pig" || mob.kind === "chicken" || mob.kind === "horse" || mob.kind === "goat")) {
      // one lead, one mob: clear others
      for (const m of mobs) if (m !== mob) m.lead = false;
      mob.lead = !mob.lead;
      say(mob.lead ? "Hitched" : "Unhitched");
      return;
    }
    if ((mob.kind === "cow" || mob.kind === "sheep" || mob.kind === "pig" || mob.kind === "goat") && held === ID.Wheat) {
      mob.love = 8;
      if (!creative) spend(ID.Wheat, 1);
      say("Hearts");
      return;
    }
    if (mob.kind === "pig" && (held === ID.Carrot || held === ID.Potato || held === ID.Beetroot)) {
      mob.love = 8;
      if (!creative) spend(held, 1);
      say("Hearts");
      return;
    }
    if (mob.kind === "chicken" && held === ID.Seeds) {
      mob.love = 8;
      if (!creative) spend(ID.Seeds, 1);
      addInv(ID.Egg, 1);
      say("Egg");
      return;
    }
    if (mob.kind === "parrot" && held === ID.Seeds) {
      mob.tame = true;
      if (!creative) spend(ID.Seeds, 1);
      say("Parrot tamed — it will follow you");
      return;
    }
    if ((mob.kind === "cow" || mob.kind === "goat") && held === ID.Bucket) {
      if (!creative) spend(ID.Bucket, 1);
      addInv(ID.Milk, 1);
      say("Milk");
      return;
    }
    if (mob.kind === "wolf") {
      if (!mob.tame && held === ID.Bone) {
        if (!creative) spend(ID.Bone, 1);
        mob.tame = true;
        say("The hound follows");
        saveDirty = true;
        return;
      }
      if (mob.tame && (held === ID.Cooked || held === ID.CookedFish)) {
        mob.love = 8;
        if (!creative) spend(held, 1);
        say("Hearts");
        return;
      }
      say(mob.tame ? "Good hound" : "It wants a bone");
      return;
    }
    if (mob.kind === "golem") {
      if (held === ID.Ingot) {
        if ((mob.hp ?? 0) >= 24) {
          say("Already sound");
          return;
        }
        mob.hp = Math.min(24, (mob.hp ?? 0) + 4);
        if (!creative) spend(ID.Ingot, 1);
        say("Mended");
        return;
      }
      say("The hamlet golem");
      return;
    }
    if (mob.kind === "fox" && held === ID.Berry) {
      mob.love = 8;
      if (!creative) spend(ID.Berry, 1);
      say("Hearts");
      return;
    }
    if (mob.kind === "frog" && held === ID.Slime) {
      mob.love = 8;
      if (!creative) spend(ID.Slime, 1);
      say("Hearts");
      return;
    }
    if (mob.kind === "crab" && held === ID.Fish) {
      mob.love = 8;
      if (!creative) spend(ID.Fish, 1);
      say("Hearts");
      return;
    }
    if (mob.kind === "wisp" && held === ID.Prism) {
      mob.love = 8;
      if (!creative) spend(ID.Prism, 1);
      say("Hearts");
      return;
    }
    if (mob.kind === "horse") {
      if (held === ID.Wheat || held === ID.Apple || held === ID.Hay || held === ID.Gapple) {
        mob.love = 8;
        if (!creative) spend(held, 1);
        say("Hearts");
        return;
      }
      if (!mob.tame) {
        mob.tame = true;
        if (held === ID.Saddle && !creative) spend(ID.Saddle, 1);
        say("Tamed");
      } else {
        mount = mob;
        say("Riding. Sneak to hop off.");
      }
      return;
    }
    if (mob.kind === "cat" && held === ID.Fish && !mob.tame) {
      if (!creative) spend(ID.Fish, 1);
      mob.tame = true;
      burst(mob.x, mob.y + 0.6, mob.z, "#e23b2f", 6);
      say("Tamed");
      return;
    }
    if (mob.kind === "villager") {
      traderRole = (mob.role as TraderRole) || "grocer";
      traderKeySet = repKeyFor(mob.homeX ?? mob.x, mob.homeZ ?? mob.z);
      openPanel("trade");
      return;
    }
    if (mob.kind === "piglin" && (held === ID.Gold || held === ID.Ingot)) {
      if (!creative) spend(held, 1);
      const loot = [ID.Scrap, ID.Obsidian, ID.PotionHeal, ID.Gravel, ID.String, ID.EndStone, ID.Blaze];
      dropItem(loot[(Math.random() * loot.length) | 0], 1, mob.x, mob.y + 0.6, mob.z);
      say("Barter");
      return;
    }
    if ((mob.kind === "boat" || mob.kind === "cart") && mount !== mob) {
      mount = mob;
      say("Sneak to hop off");
    }
  }

  function spawnCreeper(x: number, z: number) {
    spawnKind("creeper", x, z);
  }

  function killMob(mob: Mob) {
    if (mob.dead) return;
    mob.dead = true;
    topple(mob);
    if ((mob.byPlayerT ?? 0) > 0) {
      if (mob.kind === "villager") addRep(repKeyFor(mob.homeX ?? mob.x, mob.homeZ ?? mob.z), -20);
      else if (mob.kind === "golem") addRep(repKeyFor(mob.homeX ?? mob.x, mob.homeZ ?? mob.z), -10);
    }
    if (mob.kind === "dragon") {
      world.set(-504, 51, -504, ID.DragonEgg);
      markDirtyAt(-504, -504);
    }
    const drops =
      mob.kind === "sheep"
        ? mob.sheared
          ? [ID.RawMeat]
          : [ID.White, ID.RawMeat]
        : mob.kind === "cow"
          ? [ID.RawMeat, ID.RawMeat]
          : mob.kind === "pig" || mob.kind === "goat"
            ? [ID.RawMeat]
            : mob.kind === "chicken"
              ? [ID.Feather, ID.RawMeat]
              : mob.kind === "spider"
                ? [ID.String]
                : mob.kind === "skelly" || mob.kind === "stray"
                  ? [ID.Bone, ID.Arrow]
                  : mob.kind === "walker"
                    ? [ID.RawMeat, ID.Bone]
                    : mob.kind === "husk"
                      ? [ID.PharaohGold, ID.Bone]
                      : mob.kind === "creeper"
                        ? [ID.Powder]
                        : mob.kind === "enderman"
                          ? [ID.EnderPearl, ID.VoidCore]
                          : mob.kind === "blaze"
                            ? [ID.Blaze]
                            : mob.kind === "witch"
                              ? [ID.WitchVenom, ID.PotionHeal]
                              : mob.kind === "drowned"
                                ? [ID.RawMeat, ID.Copper]
                                : mob.kind === "bee"
                                  ? [ID.Wax]
                                  : mob.kind === "cat"
                                    ? [ID.String]
                                    : mob.kind === "squid"
                                      ? [ID.InkSac]
                                      : mob.kind === "bat" || mob.kind === "axolotl"
                                        ? []
                                        : mob.kind === "ghast"
                          ? [ID.Blaze, ID.Powder]
                          : mob.kind === "piglin"
                            ? [ID.Scrap, ID.Gold]
                            : mob.kind === "phantom" || mob.kind === "parrot"
                              ? [ID.Feather]
                              : mob.kind === "dragon"
                                ? [ID.Elytra, ID.Totem, ID.Scrap, ID.VoidCore]
                                : mob.kind === "wither"
                                  ? [ID.NetherStar]
                                  : mob.kind === "frog"
                                  ? [ID.Slime]
                                  : mob.kind === "fox"
                                    ? [ID.Fur, ID.RawMeat]
                                    : mob.kind === "crab"
                                      ? [ID.Scale]
                                      : mob.kind === "wisp"
                                        ? [ID.Wisp]
                                        : mob.kind === "slime"
                                          ? (mob.size ?? 1) <= 0.5
                                            ? [ID.Slime]
                                            : []
                                          : mob.kind === "wolf"
                                            ? [ID.Bone]
                                            : mob.kind === "golem"
                                              ? [ID.Ingot]
                                              : mob.kind === "guardian"
                                                ? [ID.GuardianSpike, ID.Crystal]
                                                : mob.kind === "shulker"
                                                  ? [ID.ShulkerShell, ID.VoidCore]
                                                  : mob.kind === "pillager"
                                                    ? [ID.IllagerBadge, ID.Arrow]
                                                    : mob.kind === "vindicator"
                                                      ? [ID.IllagerBadge, ID.Emerald]
                                                      : mob.kind === "evoker"
                                                        ? [ID.Totem, ID.IllagerBadge, ID.Emerald]
                                                        : mob.kind === "vex"
                                                          ? [ID.Wisp]
                                                          : mob.kind === "ravager"
                                                            ? [ID.IllagerBadge, ID.Fur, ID.RawMeat]
                                                            : mob.kind === "villager"
                                                              ? [ID.Emerald]
                                                              : [ID.Green];
    if (!creative) {
      for (const drop of drops) dropItem(drop, 1, mob.x, mob.y + 0.4, mob.z);
      // P6: every mob is a plastic toy — foundry pellets on every kill,
      // 1 guaranteed + 50% a second (hard cap 2 per kill, by construction).
      for (let p = 0, pn = 1 + (Math.random() < 0.5 ? 1 : 0); p < pn; p++) dropItem(ID.Pellets, 1, mob.x, mob.y + 0.4, mob.z);
      // Looting on the held blade: bonus copies of the base drops.
      const lootLvl = def(hotbar[slot]).tool === "sword" ? enchLvl(hotbar[slot], "looting") : 0;
      for (const drop of drops) for (let f = 0; f < lootLvl; f++) if (Math.random() < 0.35) dropItem(drop, 1, mob.x, mob.y + 0.4, mob.z);
      const trophy = skills.has("trophy");
      const luck = trophy || settings.mods.generous ? 0.62 : 0.38;
      const extra: number[] = [];
      if (mob.kind === "walker" && Math.random() < luck) extra.push(ID.Fang);
      if (mob.kind === "husk" && Math.random() < luck) extra.push(ID.PharaohGold);
      if ((mob.kind === "skelly" || mob.kind === "stray" || mob.kind === "phantom") && Math.random() < luck) extra.push(ID.Wisp);
      if (mob.kind === "creeper" && Math.random() < luck) extra.push(ID.Slime);
      if (mob.kind === "fox" && Math.random() < luck) extra.push(ID.Pelt);
      if (mob.kind === "crab" && Math.random() < luck) extra.push(ID.Shell);
      if (mob.kind === "frog" && Math.random() < luck * 0.6) extra.push(ID.Wax);
      if (mob.kind === "wisp" && Math.random() < luck) extra.push(ID.Frost);
      if (mob.kind === "enderman" && Math.random() < luck) extra.push(ID.VoidCore);
      if (mob.kind === "drowned" && Math.random() < luck) extra.push(ID.GuardianSpike);
      if (mob.kind === "drowned" && Math.random() < 0.25) extra.push(ID.Trident);
      if (mob.kind === "guardian" && Math.random() < luck) extra.push(ID.GuardianSpike);
      if (mob.kind === "pillager" && Math.random() < 0.18) extra.push(ID.Crossbow);
      if ((mob.kind === "pillager" || mob.kind === "vindicator" || mob.kind === "evoker") && Math.random() < luck) extra.push(ID.IllagerBadge);
      if (mob.kind === "vindicator" && Math.random() < 0.16) extra.push(ID.AxeI);
      if (mob.kind === "ravager" && Math.random() < luck) extra.push(ID.Emerald);
      if (mob.kind === "squid" && Math.random() < luck) extra.push(ID.InkSac);
      if (mob.kind === "witch" && Math.random() < luck) extra.push(ID.WitchVenom);
      if ((mob.kind === "creeper" || mob.kind === "ghast") && Math.random() < luck * 0.7) extra.push(ID.Cinder);
      if ((mob.kind === "skelly" || mob.kind === "walker") && Math.random() < luck * 0.45) extra.push(ID.Antler);
      if ((skills.has("butcher") || settings.mods.generous) && (mob.kind === "sheep" || mob.kind === "cow" || mob.kind === "pig" || mob.kind === "fox" || mob.kind === "frog" || mob.kind === "wolf")) {
        extra.push(ID.RawMeat);
      }
      if (settings.mods.generous && (mob.kind === "frog" || mob.kind === "fox" || mob.kind === "crab" || mob.kind === "wisp")) extra.push(drops[0]);
      for (const drop of extra) dropItem(drop, 1, mob.x, mob.y + 0.7, mob.z);
      if (mob.captain) {
        omenT = 1800;
        say("The captain falls — a Bad Omen settles over you. Steer clear of hamlets.", 4200);
      }
    }
    if (mob.kind === "dragon") {
      won = true;
      dragonUp = true;
      say("The wyrm falls. Step on the portal to go home.", 6400);
      saveDirty = true;
    }
    burst(mob.x, mob.y + 0.5, mob.z, drops.length ? def(drops[0]).color : "#3aaa4c", 12);
    padRumble(0.3, 0.2, 70); // kill thump
    audio.break();
    gainXp(MOB_XP[mob.kind] ?? 2);
    if (mob.kind === "walker" || mob.kind === "creeper" || mob.kind === "skelly" || mob.kind === "husk" || mob.kind === "stray" || mob.kind === "pillager" || mob.kind === "vindicator" || mob.kind === "evoker" || mob.kind === "vex" || mob.kind === "ravager") bumpQuest("kill", "host");
    if (mob.kind === "spider") bumpQuest("kill", "spider");
    if (mob.kind === "frog") bumpQuest("kill", "frog");
    if (mob.kind === "fox") bumpQuest("kill", "fox");
    if (mob.kind === "crab") bumpQuest("kill", "crab");
    if (mob.kind === "wisp") bumpQuest("kill", "wisp");
    if (mob.kind === "slime") bumpQuest("kill", "slime");
    if (mob.kind === "slime" && (mob.size ?? 1) > 0.5) {
      const next = (mob.size ?? 1) * 0.62;
      spawnKind("slime", mob.x + 0.45, mob.z + 0.2, next);
      spawnKind("slime", mob.x - 0.45, mob.z - 0.2, next);
    }
    if (mob.kind === "golem") golemWait = 45;
    saveDirty = true;
  }

  // ================= v4.17 Teardown LEGO =================
  // A block can be eaten PIECE BY PIECE (12 × 1×1 LEGO bricks, see
  // chipState). Explosions carve by distance, mining knocks pieces off the
  // face being hit, and whatever is left hanging collapses. Bounded and
  // event-driven only: nothing runs per frame except the debris pool.
  function chippable(id: number) {
    if (!id || id === ID.Bedrock || id === ID.Melted || id === ID.Fire) return false;
    const d = def(id);
    if (!d.solid || d.glass || d.fluid || d.plant || d.hard === Infinity) return false;
    if (d.slab || d.stairs || d.sign || d.flat || d.door || d.gate || d.torch || d.dust || d.lever || d.plate || d.rail || d.cactus || d.fruit || d.ladder) return false;
    return true;
  }
  /** Knock `pieces` out of the block at (x,y,z); returns true if nothing is left. */
  function chipPieces(x: number, y: number, z: number, pieces: number[], push: (p: number) => [number, number, number], debrisBudget: { n: number }) {
    const id = world.get(x, y, z);
    if (!chippable(id) || !pieces.length) return false;
    let rm = CH.removedAt(x, y, z, id);
    const col = def(id).side || def(id).color;
    for (const p of pieces) {
      if (rm & (1 << p)) continue;
      rm |= 1 << p;
      if (debrisBudget.n > 0) {
        debrisBudget.n--;
        const [cx, cy, cz] = CH.pieceCentre(p);
        const [vx, vy, vz] = push(p);
        spawnPiece(x + cx, y + cy, z + cz, col, vx, vy, vz);
      }
    }
    if (rm === CH.FULL) {
      CH.setRemoved(x, y, z, id, 0);
      world.set(x, y, z, ID.Air);
      netSendEdit(x, y, z, ID.Air);
    } else CH.setRemoved(x, y, z, id, rm);
    markDirtyAt(x, z);
    saveDirty = true;
    return rm === CH.FULL;
  }
  // Structural collapse: after a blast, every solid cell in a bounded box
  // that is no longer connected (face to face) to the box's walls/floor —
  // i.e. to the rest of the world — falls as LEGO rubble. A flood fill over
  // at most (2R+1)^3 cells, once per explosion.
  function collapseAround(cx: number, cy: number, cz: number, R: number, debrisBudget: { n: number }) {
    const S = 2 * R + 1;
    const seen = new Uint8Array(S * S * S);
    const idx = (x: number, y: number, z: number) => (x - cx + R) + S * ((z - cz + R) + S * (y - cy + R));
    const solidAt = (x: number, y: number, z: number) => {
      const id = world.get(x, y, z);
      if (!id || !def(id).solid || def(id).fluid) return false;
      const rm = CH.removedAt(x, y, z, id);
      return rm !== CH.FULL;
    };
    const queue: number[] = [];
    for (let y = cy - R; y <= cy + R; y++) for (let z = cz - R; z <= cz + R; z++) for (let x = cx - R; x <= cx + R; x++) {
      const edge = x === cx - R || x === cx + R || z === cz - R || z === cz + R || y === cy - R || y === cy + R;
      if (!edge || !solidAt(x, y, z)) continue;
      seen[idx(x, y, z)] = 1;
      queue.push(x, y, z);
    }
    for (let q = 0; q < queue.length; q += 3) {
      const x = queue[q], y = queue[q + 1], z = queue[q + 2];
      for (const [ox, oy, oz] of NEIGHBORS6) {
        const nx = x + ox, ny = y + oy, nz = z + oz;
        if (nx < cx - R || nx > cx + R || ny < cy - R || ny > cy + R || nz < cz - R || nz > cz + R) continue;
        const i = idx(nx, ny, nz);
        if (seen[i] || !solidAt(nx, ny, nz)) continue;
        seen[i] = 1;
        queue.push(nx, ny, nz);
      }
    }
    let fell = 0;
    for (let y = cy - R + 1; y < cy + R; y++) for (let z = cz - R + 1; z < cz + R; z++) for (let x = cx - R + 1; x < cx + R; x++) {
      if (seen[idx(x, y, z)] || !solidAt(x, y, z)) continue;
      const id = world.get(x, y, z);
      if (id === ID.Bedrock || fell >= 160) continue;
      fell++;
      const col = def(id).side || def(id).color;
      // v4.18: a collapsed block is not vaporized — most of them land as
      // pickable drops among the rubble (the rest is the debris below).
      if (!creative && def(id).drop !== -1 && Math.random() < 0.6) dropItem(def(id).drop || id, 1, x + 0.5, y + 0.4, z + 0.5);
      // the hanging block breaks into its pieces as it drops
      for (let k = 0; k < 3 && debrisBudget.n > 0; k++) {
        debrisBudget.n--;
        const p = Math.floor(Math.random() * 12);
        const [px, py, pz] = CH.pieceCentre(p);
        spawnPiece(x + px, y + py, z + pz, col, (Math.random() - 0.5) * 1.6, -1 - Math.random() * 2, (Math.random() - 0.5) * 1.6);
      }
      CH.setRemoved(x, y, z, id, 0);
      world.set(x, y, z, ID.Air);
      netSendEdit(x, y, z, ID.Air);
      markDirtyAt(x, z);
    }
    if (fell) saveDirty = true;
    return fell;
  }

  function explode(x: number, y: number, z: number, rad = 3) {
    const r = rad;
    const ex = x + 0.5, ey = y + 0.5, ez = z + 0.5;
    const budget = { n: 90 };
    // Teardown carving: each LEGO piece goes if it is inside the (ragged)
    // blast radius — blocks on the rim lose only the pieces facing the blast.
    for (let dy = -r - 1; dy <= r + 1; dy++) {
      for (let dz = -r - 1; dz <= r + 1; dz++) {
        for (let dx = -r - 1; dx <= r + 1; dx++) {
          const bx = x + dx, by = y + dy, bz = z + dz;
          const id = world.get(bx, by, bz);
          if (id === ID.Air || id === ID.Bedrock) continue;
          if (!chippable(id)) {
            // plants, glass, fluids-adjacent props: whole-block as before
            if (dx * dx + dy * dy + dz * dz <= r * r + 0.4 && !def(id).fluid) world.set(bx, by, bz, ID.Air);
            continue;
          }
          const gone: number[] = [];
          for (let p = 0; p < 12; p++) {
            const [cx, cy, cz] = CH.pieceCentre(p);
            const d = Math.hypot(bx + cx - ex, by + cy - ey, bz + cz - ez);
            if (d < r * (0.78 + 0.42 * Math.random())) gone.push(p);
          }
          if (!gone.length) continue;
          chipPieces(bx, by, bz, gone, (p) => {
            const [cx, cy, cz] = CH.pieceCentre(p);
            const vx = bx + cx - ex, vy = by + cy - ey, vz = bz + cz - ez;
            const d = Math.hypot(vx, vy, vz) || 1;
            const k = 2 + 7 * Math.max(0, 1 - d / (r + 1));
            return [(vx / d) * k, (vy / d) * k + 3.2, (vz / d) * k];
          }, budget);
        }
      }
    }
    collapseAround(x, y, z, r + 5, budget);
    const c0x = Math.floor((x - r) / CS);
    const c1x = Math.floor((x + r) / CS);
    const c0z = Math.floor((z - r) / CS);
    const c1z = Math.floor((z + r) / CS);
    for (let cz = c0z; cz <= c1z; cz++) for (let cx = c0x; cx <= c1x; cx++) dirty.add(cx + "," + cz);
    const d = Math.hypot(player.x - x, player.y + 1 - y, player.z - z);
    if (d < 5.5 && phase === "play") {
      const k = (1 - d / 5.5) * 9;
      hurt(Math.round((1 - d / 5.5) * 10));
      player.vx += ((player.x - x) / (d || 1)) * k;
      player.vz += ((player.z - z) / (d || 1)) * k;
      player.vy += 5;
    }
    boomFx.push({ x: x + 0.5, y: y + 0.6, z: z + 0.5, r, age: 0 });
    if (boomFx.length > 4) boomFx.splice(0, boomFx.length - 4);
    burst(x, y, z, "#f07820", 30); // fireball sparks; the rubble is the real LEGO pieces above
    if (d < 16) padRumble(Math.max(0.15, 0.9 - d / 16), 0.4, 200); // felt through the pad, fades with distance
    shake = 0.55;
    audio.explode();
    saveDirty = true;
  }

  function lightning() {
    const a = Math.random() * Math.PI * 2;
    const dist = 7 + Math.random() * 18;
    const x = player.x + Math.cos(a) * dist;
    const z = player.z + Math.sin(a) * dist;
    const y = groundY(x, z);
    bolt.position.set(x, y + 22, z);
    bolt.visible = true;
    boltT = 0.18;
    flash = Math.max(flash, 0.55);
    audio.explode();
    if (Math.hypot(player.x - x, player.z - z) < 3.4) hurt(5);
    const turned: Mob[] = [];
    for (const m of mobs) {
      if (m.dead) continue;
      if (Math.hypot(m.x - x, m.z - z) > 3.2) continue;
      if (m.kind === "creeper") {
        m.charged = true;
        m.bodyMat?.emissive.setHex(0x7ee0ff);
        say("Charged fuse");
      } else if (m.kind === "pig") turned.push(m);
      else if (m.kind !== "golem" && m.kind !== "villager" && !(m.kind === "wolf" && m.tame)) {
        m.hp -= 4;
        if (m.hp <= 0) killMob(m);
      }
    }
    for (const m of turned) {
      if (m.dead) continue;
      m.dead = true;
      scene.remove(m.mesh);
      spawnWalker(m.x, m.z);
      say("The stud changed");
    }
  }

  // ── Pathfinding ─────────────────────────────────────────────────
  // A* over surface cells. A cell is walkable when the mob's own
  // movement test passes there (headroom at surface +0.1/+1.1), the
  // climb from the current cell is at most ~1 brick and the drop at
  // most ~3. Falls back to plain steering when no route exists.
  function lineClear(x0: number, z0: number, x1: number, z1: number, baseY: number) {
    const dist = Math.hypot(x1 - x0, z1 - z0);
    const steps = Math.max(1, Math.ceil(dist / 0.7));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const sx = x0 + (x1 - x0) * t;
      const sz = z0 + (z1 - z0) * t;
      const gy = groundY(sx, sz);
      if (Math.abs(gy - baseY) > 1.6) return false;
      if (solidAt(Math.floor(sx), Math.floor(gy + 0.1), Math.floor(sz)) || solidAt(Math.floor(sx), Math.floor(gy + 1.1), Math.floor(sz))) return false;
    }
    return true;
  }

  function findPath(sx: number, sz: number, tx: number, tz: number): { x: number; z: number }[] | null {
    const S = { x: Math.floor(sx), z: Math.floor(sz) };
    const T = { x: Math.floor(tx), z: Math.floor(tz) };
    if (Math.abs(T.x - S.x) > 26 || Math.abs(T.z - S.z) > 26) return null;
    if (S.x === T.x && S.z === T.z) return [];
    type Node = { x: number; z: number; gy: number; g: number; f: number; parent: string | null };
    const nodes = new Map<string, Node>();
    const closed = new Set<string>();
    const start: Node = { x: S.x, z: S.z, gy: groundY(S.x + 0.5, S.z + 0.5), g: 0, f: Math.hypot(T.x - S.x, T.z - S.z), parent: null };
    nodes.set(S.x + "," + S.z, start);
    const open: Node[] = [start];
    let expansions = 0;
    while (open.length && expansions++ < 750) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
      const cur = open.splice(bi, 1)[0];
      const ck = cur.x + "," + cur.z;
      if (closed.has(ck)) continue;
      closed.add(ck);
      if (cur.x === T.x && cur.z === T.z) {
        const path: { x: number; z: number }[] = [];
        let n: Node | undefined = cur;
        while (n && n.parent) {
          path.push({ x: n.x, z: n.z });
          n = nodes.get(n.parent);
        }
        path.reverse();
        return path;
      }
      for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
        const nx = cur.x + ox;
        const nz = cur.z + oz;
        const nk = nx + "," + nz;
        if (closed.has(nk)) continue;
        const gy = groundY(nx + 0.5, nz + 0.5);
        if (gy - cur.gy > 1.3 || cur.gy - gy > 3.4) continue;
        if (solidAt(nx, Math.floor(gy + 0.1), nz) || solidAt(nx, Math.floor(gy + 1.1), nz)) continue;
        if (ox !== 0 && oz !== 0) {
          const g1 = groundY(nx + 0.5, cur.z + 0.5);
          const g2 = groundY(cur.x + 0.5, nz + 0.5);
          if (Math.abs(g1 - cur.gy) > 1.3 || Math.abs(g2 - cur.gy) > 1.3) continue;
          if (solidAt(nx, Math.floor(g1 + 0.1), cur.z) || solidAt(cur.x, Math.floor(g2 + 0.1), nz)) continue;
        }
        const g = cur.g + (ox !== 0 && oz !== 0 ? 1.41 : 1) + Math.max(0, gy - cur.gy) * 1.5;
        const ex = nodes.get(nk);
        if (ex && ex.g <= g) continue;
        const node: Node = { x: nx, z: nz, gy, g, f: g + Math.hypot(T.x - nx, T.z - nz), parent: ck };
        nodes.set(nk, node);
        open.push(node);
      }
    }
    return null;
  }

  // ── The End wyrm ────────────────────────────────────────────────
  // Circles the player, rains fireballs, then swoops in to bite.
  // Living crystals mend it, so the pillars come first. Under 35%
  // health it enrages: faster, meaner, swoops twice as often.
  function witherTick(m: Mob, dt: number, d: number) {
    const maxHp = m.maxHp ?? m.hp;
    // Summoning: it rises, untouchable, gathering itself — then it bursts.
    if ((m.spawnT ?? 0) > 0) {
      m.spawnT = (m.spawnT ?? 0) - dt;
      m.y += dt * 0.55;
      if ((m.spawnT ?? 0) <= 0) {
        explode(Math.floor(m.x), Math.floor(m.y), Math.floor(m.z), 3);
        say("The Wither rages!");
      }
      return;
    }
    // Phase 2: the shell — ranged damage turns aside, melee still bites.
    if (!m.shield && m.hp <= maxHp * 0.5) {
      m.shield = true;
      m.phaseN = 1;
      burst(m.x, m.y + 1, m.z, "#8f8fa8", 18);
      say("The Wither's shell turns arrows aside — get in close!");
    }
    m.bossT = (m.bossT ?? 0) - dt;
    m.biteT = Math.max(0, (m.biteT ?? 0) - dt);
    const gy = groundY(m.x, m.z);
    let wantY = gy + 4;
    let sp = 2.2;
    let targetYaw = Math.atan2(-(player.x - m.x), -(player.z - m.z));
    if (m.mode === "charge") {
      m.modeT = (m.modeT ?? 0) - dt;
      wantY = player.y + 0.9;
      sp = 8.5;
      if ((m.modeT ?? 0) <= 0) m.mode = "hover";
    } else {
      m.mode = "hover";
      if (m.shield && (m.bossT ?? 0) <= 0 && d < 15 && d > 3 && phase === "play") {
        m.bossT = 6;
        m.mode = "charge";
        m.modeT = 0.85;
      }
    }
    let diff = targetYaw - m.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const turn = 2.2 * dt;
    m.yaw += Math.max(-turn, Math.min(turn, diff));
    const advance = m.mode === "charge" || d > 5 ? 1 : 0.2;
    m.x += -Math.sin(m.yaw) * sp * dt * advance;
    m.z += -Math.cos(m.yaw) * sp * dt * advance;
    m.y += (wantY - m.y) * Math.min(1, dt * 2);
    if (m.cool <= 0 && phase === "play" && d < 19) {
      launchSkull(m.x, m.y + 0.5, m.z, player.x - m.x, player.y + 0.9 - m.y, player.z - m.z);
      if (m.shield) launchSkull(m.x, m.y + 0.5, m.z, player.x - m.x + 1.7, player.y + 0.9 - m.y, player.z - m.z + 1.7);
      m.cool = m.shield ? 1.5 : 1.9;
      audio.note(3);
    }
    if (d < 2.7 && phase === "play" && (m.biteT ?? 0) <= 0) {
      bite(m.shield ? 7 : 5);
      if (m.shield) witherT = Math.max(witherT, 5);
      m.biteT = 1.1;
      audio.hit();
    }
  }

  function dragonTick(m: Mob, dt: number, d: number) {
    const maxHp = m.maxHp ?? m.hp;
    const enraged = m.hp < maxHp * 0.35;
    if ((m.phaseN ?? 0) === 0 && m.hp < maxHp * 0.5) {
      m.phaseN = 1;
      say("The End Wyrm falters!");
    }
    if ((m.phaseN ?? 0) === 1 && enraged) {
      m.phaseN = 2;
      say("The End Wyrm rages!");
    }
    if (crystalsLeft() > 0 && phase === "play") m.hp = Math.min(maxHp, m.hp + 1.1 * dt);
    m.modeT = (m.modeT ?? 0) - dt;
    m.bossT = (m.bossT ?? 0) - dt;
    const gy = groundY(m.x, m.z);
    let wantY = gy + 8;
    let sp = enraged ? 4.6 : 3.4;
    let targetYaw: number;
    if (m.mode === "swoop") {
      targetYaw = Math.atan2(-(player.x - m.x), -(player.z - m.z));
      wantY = player.y + 1.0;
      sp = enraged ? 6.6 : 5.4;
      if (d < 3.2 || (m.modeT ?? 0) <= 0) {
        m.mode = "climb";
        m.modeT = 1.4;
      }
    } else if (m.mode === "climb") {
      targetYaw = Math.atan2(-(m.x - player.x), -(m.z - player.z));
      wantY = gy + 13;
      sp = 4.4;
      if ((m.modeT ?? 0) <= 0) {
        m.mode = "circle";
        m.modeT = enraged ? 3.2 : 5.5;
      }
    } else {
      m.mode = "circle";
      const ang = Math.atan2(m.z - player.z, m.x - player.x) + dt * 0.45;
      const ox = player.x + Math.cos(ang) * 11;
      const oz = player.z + Math.sin(ang) * 11;
      targetYaw = Math.atan2(-(ox - m.x), -(oz - m.z));
      if ((m.modeT ?? 0) <= 0 && phase === "play" && d < 26) {
        m.mode = "swoop";
        m.modeT = 2.4;
      }
      if ((m.bossT ?? 0) <= 0 && phase === "play" && d < 30) {
        m.bossT = enraged ? 2.3 : 3.4;
        launchFireball(m.x, m.y - 0.4, m.z, player.x - m.x, player.y + 0.8 - m.y, player.z - m.z, true);
        audio.note(4);
      }
    }
    let diff = targetYaw - m.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const turn = (enraged ? 2.4 : 1.7) * dt;
    m.yaw += Math.max(-turn, Math.min(turn, diff));
    m.x += -Math.sin(m.yaw) * sp * dt;
    m.z += -Math.cos(m.yaw) * sp * dt;
    m.y += (wantY - m.y) * Math.min(1, dt * (m.mode === "swoop" ? 3.2 : 1.8));
    if (d < 2.9 && phase === "play" && m.cool <= 0) {
      bite(enraged ? 7 : 5);
      m.cool = 1.1;
      audio.hit();
    }
  }

  function updateMobs(dt: number) {
    const baseDt = dt;
    tickCorpses(dt);
    const ang = worldTime * Math.PI * 2;
    const night = Math.sin(ang) < -0.12;
    if (phase === "play" && !creative && night && !settings.mods.peaceful) {
      creeperAcc += dt;
      const alive = mobs.filter((m) => m.kind === "creeper" && !m.dead).length;
      if (creeperAcc > (settings.mods.hard ? 6 : 10) && alive < (settings.mods.hard ? 3 : 2)) {
        creeperAcc = 0;
        const a = Math.random() * Math.PI * 2;
        const dist = 14 + Math.random() * 8;
        spawnCreeper(player.x + Math.cos(a) * dist, player.z + Math.sin(a) * dist);
      }
      const walkers = mobs.filter((m) => m.kind === "walker" && !m.dead).length;
      walkerAcc += dt;
      if (walkerAcc > (settings.mods.hard ? 5 : 8) && walkers < (settings.mods.hard ? 4 : 3)) {
        walkerAcc = 0;
        const a = Math.random() * Math.PI * 2;
        const dist = 12 + Math.random() * 8;
        const x = player.x + Math.cos(a) * dist;
        const z = player.z + Math.sin(a) * dist;
        const roll = Math.random();
        if (roll < 0.3) spawnKind("skelly", x, z);
        else if (roll < 0.52) spawnKind("spider", x, z);
        else if (roll < 0.62) spawnKind("witch", x, z);
        else if (roll < 0.7) spawnKind("enderman", x, z);
        else spawnWalker(x, z);
      }
      // The drowned rise from night water near wet biomes.
      drownedAcc += dt;
      if (drownedAcc > 9) {
        drownedAcc = 0;
        const biome = world.biomeAt(player.x, player.z);
        if ((biome === "Ocean" || biome === "Shore" || biome === "Fen" || biome === "Deep fen") && mobs.filter((m) => m.kind === "drowned" && !m.dead).length < 2) {
          const a = Math.random() * Math.PI * 2;
          const dist = 10 + Math.random() * 8;
          const x = player.x + Math.cos(a) * dist;
          const z = player.z + Math.sin(a) * dist;
          if (def(world.get(Math.floor(x), Math.floor(groundY(x, z)), Math.floor(z))).fluid) spawnKind("drowned", x, z);
        }
      }
      if (sinceSleep > 420 && mobs.filter((m) => m.kind === "phantom" && !m.dead).length < 1) {
        spawnKind("phantom", player.x + 8, player.z - 6);
      }
    }
    if (phase === "play") {
      folkAcc += dt;
      if (folkAcc > 2.5) {
        folkAcc = 0;
        ensureRoamingFolk();
      }
      critterAcc += dt;
      if (critterAcc > 9) {
        critterAcc = 0;
        const biome = world.biomeAt(player.x, player.z);
        const alive = (kind: Mob["kind"]) => mobs.filter((m) => m.kind === kind && !m.dead).length;
        const spot = () => {
          const a = Math.random() * Math.PI * 2;
          const dist = 8 + Math.random() * 10;
          return [player.x + Math.cos(a) * dist, player.z + Math.sin(a) * dist] as const;
        };
        if ((biome === "Fen" || biome === "Deep fen" || biome === "Brick plains") && alive("frog") < 2) {
          const [x, z] = spot();
          spawnKind("frog", x, z);
        }
        if (!settings.mods.peaceful && (biome === "Fen" || biome === "Deep fen" || biome === "Brick plains") && alive("slime") < 2) {
          const [x, z] = spot();
          spawnKind("slime", x, z);
        }
        if ((biome === "Grove" || biome === "Flower grove" || biome === "Brick plains") && alive("fox") < 2) {
          const [x, z] = spot();
          spawnKind("fox", x, z);
        }
        if ((biome === "Grove" || biome === "Flower grove" || biome === "Brick plains") && alive("wolf") < 2) {
          const [x, z] = spot();
          spawnKind("wolf", x, z);
        }
        if ((biome === "Shore" || biome === "Sand flats" || biome === "Ash ridge" || biome === "Mesa") && alive("crab") < 2) {
          const [x, z] = spot();
          spawnKind("crab", x, z);
        }
        if (!settings.mods.peaceful && night && (biome === "Fen" || biome === "Deep fen" || biome === "Grove" || biome === "Flower grove" || biome === "Snow cap") && alive("wisp") < 2) {
          const [x, z] = spot();
          spawnKind("wisp", x, z);
        }
        if (!night && (biome === "Grove" || biome === "Flower grove" || biome === "Brick plains") && alive("bee") < 3) {
          const [x, z] = spot();
          spawnKind("bee", x, z);
        }
        if ((biome === "Grove" || biome === "Flower grove" || biome === "Brick plains") && alive("cat") < 2) {
          const [x, z] = spot();
          spawnKind("cat", x, z);
        }
        if (night && alive("bat") < 2) {
          const [x, z] = spot();
          spawnKind("bat", x, z);
        }
        // Underground the bats come to you: when the surface is far
        // above the player's head, keep a few bats around in the dark.
        if (groundY(player.x, player.z) > player.y + 5 && alive("bat") < 3) {
          const [x, z] = spot();
          const bat = spawnKind("bat", x, z);
          bat.y = player.y + 1.5 + Math.random() * 2;
          bat.mesh.position.set(bat.x, bat.y, bat.z);
        }
        if ((biome === "Ocean" || biome === "Shore") && alive("squid") < 3) {
          const [x, z] = spot();
          if (def(world.get(Math.floor(x), Math.floor(groundY(x, z)), Math.floor(z))).fluid) spawnKind("squid", x, z);
        }
        if ((biome === "Ash ridge" || biome === "Snow cap") && alive("goat") < 2) {
          const [x, z] = spot();
          spawnKind("goat", x, z);
        }
        if (!night && (biome === "Grove" || biome === "Flower grove") && alive("parrot") < 2) {
          const [x, z] = spot();
          spawnKind("parrot", x, z);
        }
        if ((biome === "Ocean" || biome === "Shore") && alive("axolotl") < 3) {
          const [x, z] = spot();
          if (def(world.get(Math.floor(x), Math.floor(groundY(x, z)), Math.floor(z))).fluid) spawnKind("axolotl", x, z);
        }
        if (!settings.mods.peaceful && biome === "Ocean" && alive("guardian") < 2) {
          const [x, z] = spot();
          if (def(world.get(Math.floor(x), Math.floor(groundY(x, z)), Math.floor(z))).fluid) spawnKind("guardian", x, z);
        }
        if (!settings.mods.peaceful && night && (biome === "Desert" || biome === "Sand flats" || biome === "Mesa") && alive("husk") < 2) {
          const [x, z] = spot();
          spawnKind("husk", x, z);
        }
        if (!settings.mods.peaceful && night && biome === "Snow cap" && alive("stray") < 2) {
          const [x, z] = spot();
          spawnKind("stray", x, z);
        }
      }
    }
    for (const m of mobs) {
      if (m.dead) continue;
      m.cool = Math.max(0, m.cool - dt);
      if (m.hitCd) m.hitCd = Math.max(0, m.hitCd - dt);
      const dx = player.x - m.x;
      const dz = player.z - m.z;
      const d = Math.hypot(dx, dz);
      // A veiled player is simply not seen beyond arm's reach.
      const seen = invisT <= 0 || d < 2.5;
      if ((m.slowT ?? 0) > 0) m.slowT = (m.slowT ?? 0) - dt;
      if ((m.byPlayerT ?? 0) > 0) m.byPlayerT = (m.byPlayerT ?? 0) - dt;
      if (m.kind === "boat" || m.kind === "cart") {
        m.mesh.position.set(m.x, m.y + (settings.studs ? STUD_H : 0), m.z);
        m.mesh.rotation.y = m.yaw;
        continue;
      }
      // Perf tiers: passive animals far away despawn, mid-range ones
      // freeze between thinks, far ones stop thinking entirely. Near
      // animals always run at full rate.
      dt = baseDt;
      // Fire Aspect / Flame burn: 1 dmg per 0.75s while burn lasts.
      if ((m.burn ?? 0) > 0) {
        m.burn = (m.burn ?? 0) - dt;
        m.burnAcc = (m.burnAcc ?? 0) + dt;
        if (m.burnAcc >= 0.75) {
          m.burnAcc = 0;
          m.hp -= 1;
          burst(m.x, m.y + 1, m.z, "#ff7a2a", 3);
          if (m.hp <= 0) {
            killMob(m);
            continue;
          }
        }
      }
      if (d > 44 && m.kind !== "dragon" && m.kind !== "wither" && m.kind !== "ghast") {
        const passive = m.kind === "sheep" || m.kind === "cow" || m.kind === "pig" || m.kind === "chicken" || m.kind === "fox" || m.kind === "crab" || m.kind === "frog" || m.kind === "cat" || m.kind === "bee" || m.kind === "squid" || m.kind === "bat" || m.kind === "goat" || m.kind === "axolotl" || m.kind === "parrot";
        if (d > 64 && passive && !m.tame && !m.lead && !m.name && !(m.baby && m.baby > 0) && m.homeX === undefined) {
          m.dead = true;
          scene.remove(m.mesh);
          continue;
        }
        m.mesh.position.set(m.x, m.y + (settings.studs ? STUD_H : 0), m.z);
        m.mesh.rotation.y = m.yaw;
        continue;
      }
      if (d > 26) {
        m.tickAcc = (m.tickAcc ?? 0) + baseDt;
        if (m.tickAcc < 0.066) {
          // v4.12: interpolate between AI ticks — applying a 15 Hz step raw
          // reads as a visible judder. Glide the mesh (and its gait, which
          // follows the rendered position) across the tick interval.
          const a = Math.min(1, (m.tickAcc ?? 0) / 0.066);
          const px = m.px ?? m.x;
          const py = m.py ?? m.y;
          const pz = m.pz ?? m.z;
          const vis = visOf(m);
          const stride = Math.sin(vis.gait);
          const bounce =
            m.kind === "slime"
              ? Math.abs(stride) * (0.18 + (m.size ?? 1) * 0.22)
              : m.kind === "frog"
                ? Math.abs(stride) * 0.2
                : FLYERS.has(m.kind)
                  ? Math.abs(stride) * 0.04
                  : Math.abs(stride) * 0.05 * vis.amp;
          m.mesh.position.set(px + (m.x - px) * a, py + (m.y - py) * a + (settings.studs ? STUD_H : 0) + bounce, pz + (m.z - pz) * a);
          m.mesh.rotation.y = m.yaw;
          mobVisuals(m, baseDt, bounce);
          continue;
        }
        m.px = m.x;
        m.py = m.y;
        m.pz = m.z;
        dt = Math.min(m.tickAcc, 0.12);
        m.tickAcc = 0;
      }
      // Distant animals stop casting shadows (a real cost per mob).
      m.shadowT = (m.shadowT ?? 0) - dt;
      if (m.shadowT <= 0) {
        m.shadowT = 0.8;
        const wantShadow = d < 30;
        if ((m.mesh.userData.shadowOn ?? true) !== wantShadow) {
          m.mesh.userData.shadowOn = wantShadow;
          m.mesh.traverse((o) => {
            if ((o as THREE.Mesh).isMesh && !o.userData.noShadow) o.castShadow = wantShadow;
          });
        }
      }
      if ((m.love ?? 0) > 0) {
        m.love = (m.love ?? 0) - dt;
        const mate = mobs.find((o) => o !== m && !o.dead && o.kind === m.kind && (o.love ?? 0) > 0 && Math.hypot(o.x - m.x, o.z - m.z) < 2.6);
        if (mate) {
          m.love = 0;
          mate.love = 0;
          const baby = spawnKind(m.kind, (m.x + mate.x) / 2, (m.z + mate.z) / 2, 0.45);
          baby.baby = 50;
        }
      }
      if ((m.sheared ?? 0) > 0) {
        m.sheared = (m.sheared ?? 0) - dt;
        if ((m.sheared ?? 0) <= 0) {
          m.mesh.traverse((obj) => {
            if (obj.userData.wool) obj.visible = true;
          });
        }
      }
      const farHost =
        m.kind === "creeper" || m.kind === "walker" || m.kind === "skelly" || m.kind === "spider" || m.kind === "phantom" || m.kind === "wisp" || m.kind === "slime" || m.kind === "enderman" || m.kind === "witch" || m.kind === "drowned" || m.kind === "husk" || m.kind === "stray" || m.kind === "guardian" || m.kind === "pillager" || m.kind === "vindicator" || m.kind === "evoker" || m.kind === "vex" || m.kind === "ravager";
      if (farHost && !m.raidMob && (d > 42 || phase !== "play")) {
        m.dead = true;
        scene.remove(m.mesh);
        continue;
      }
      if ((m.kind === "creeper" || m.kind === "phantom" || m.kind === "wisp") && !night) {
        m.dead = true;
        scene.remove(m.mesh);
        continue;
      }
      // Surface bats vanish at dawn; cave bats keep the dark.
      if (m.kind === "bat" && !night && groundY(m.x, m.z) <= m.y + 5) {
        m.dead = true;
        scene.remove(m.mesh);
        continue;
      }
      if ((m.kind === "walker" || m.kind === "skelly" || m.kind === "drowned" || m.kind === "stray") && !night && realm === 0) {
        m.hp -= dt * 3;
        if (m.hp <= 0) {
          killMob(m);
          continue;
        }
      }
      // Enderman: calm until you look at it or strike it - then it
      // blinks around you in violet bursts. Never blinks into water.
      if (m.kind === "enderman" && phase === "play") {
        if (!m.mad && d < 30) {
          const lx = -Math.sin(player.yaw) * Math.cos(player.pitch);
          const ly = Math.sin(player.pitch);
          const lz = -Math.cos(player.yaw) * Math.cos(player.pitch);
          const vx = m.x - player.x;
          const vy = m.y + 2 - (player.y + 1.6);
          const vz = m.z - player.z;
          const vl = Math.hypot(vx, vy, vz) || 1;
          if ((vx / vl) * lx + (vy / vl) * ly + (vz / vl) * lz > 0.995) {
            m.mad = true;
            audio.hit();
            say("It saw you looking", 2200);
          }
        }
        m.tpT = (m.tpT ?? 2) - dt;
        if (m.tpT <= 0) {
          m.tpT = m.mad ? 1.1 + Math.random() * 1.4 : 5 + Math.random() * 6;
          const a = Math.random() * Math.PI * 2;
          const dist = m.mad ? 4 + Math.random() * 6 : 6 + Math.random() * 8;
          const tx = (m.mad ? player.x : m.x) + Math.cos(a) * dist;
          const tz = (m.mad ? player.z : m.z) + Math.sin(a) * dist;
          if (!def(world.get(Math.floor(tx), Math.floor(groundY(tx, tz)), Math.floor(tz))).fluid) {
            burst(m.x, m.y + 1.2, m.z, "#c77dff", 8);
            m.x = tx;
            m.z = tz;
            m.y = groundY(tx, tz);
            m.path = null;
            burst(m.x, m.y + 1.2, m.z, "#c77dff", 8);
          }
        }
      }
      // A walker that stays under water becomes a drowned.
      if (m.kind === "walker") {
        if (def(world.get(Math.floor(m.x), Math.floor(m.y), Math.floor(m.z))).fluid) {
          m.convT = (m.convT ?? 0) + dt;
          if (m.convT > 5) {
            m.kind = "drowned";
            const body = buildLego("drowned", 1);
            scene.remove(m.mesh);
            m.mesh = body.group;
            m.legs = body.legs;
            m.bodyMat = body.bodyMat;
            scene.add(body.group);
            burst(m.x, m.y + 0.6, m.z, "#2a6a6a", 10);
          }
        } else m.convT = 0;
      }
      // Goat: every so often it picks a target, faces it for a beat
      // (mode "aim", speed forced to 0), then charges horn-first.
      if (m.kind === "goat" && phase === "play" && seen) {
        if (m.mode === "aim") {
          m.wander = 1.5;
          m.yaw = Math.atan2(-dx, -dz);
          m.modeT = (m.modeT ?? 0) - dt;
          if ((m.modeT ?? 0) <= 0) {
            m.mode = "charge";
            m.modeT = 0.9;
          }
        } else if (m.mode === "charge") {
          m.wander = 1.5;
          m.modeT = (m.modeT ?? 0) - dt;
          if (d < 1.25 && m.cool <= 0) {
            bite(2);
            thornsHit(m);
            audio.hit();
            m.cool = 5;
            m.mode = undefined;
          } else if ((m.modeT ?? 0) <= 0) {
            m.mode = undefined;
            m.cool = 3.5;
          }
        } else if (m.cool <= 0 && d < 9 && d > 2.5 && Math.random() < dt * 0.25) {
          m.mode = "aim";
          m.modeT = 0.8;
        }
      }
      // Shulker: rooted to its block, it spits a bullet at anything
      // that wanders within range of the End city walls.
      if (m.kind === "shulker" && phase === "play" && seen && m.cool <= 0 && d < 16) {
        launchArrow(m.x, m.y + 0.6, m.z, dx, player.y + 1.2 - (m.y + 0.6), dz, false);
        burst(m.x, m.y + 0.7, m.z, "#c77dff", 4);
        m.cool = 2.4;
      }
      // Guardian: it charges its eye beam for a beat, then zaps —
      // break line of sight during the charge and you are safe.
      if (m.kind === "guardian" && phase === "play" && seen) {
        if (m.mode === "laser") {
          m.yaw = Math.atan2(-dx, -dz);
          m.modeT = (m.modeT ?? 0) - dt;
          if ((m.modeT ?? 0) <= 0) {
            m.mode = undefined;
            m.cool = 2.8;
            if (d < 15 && lineClear(m.x, m.z, player.x, player.z, m.y)) {
              for (let s = 1; s <= 4; s++) burst(m.x + (dx * s) / 5, m.y + 0.6 + ((player.y + 1 - (m.y + 0.6)) * s) / 5, m.z + (dz * s) / 5, "#7ee0d8", 3);
              bite(3);
              audio.hit();
            }
          }
        } else if (m.cool <= 0 && d < 13 && d > 2) {
          m.mode = "laser";
          m.modeT = 0.8;
        }
      }
      const flyer = m.kind === "ghast" || m.kind === "phantom" || m.kind === "dragon" || m.kind === "wither" || m.kind === "blaze";
      const piglinMad = m.kind === "piglin" && hotbar[slot] !== ID.Gold && hotbar[slot] !== ID.Ingot;
      const townGuard = m.kind === "golem" || (m.kind === "wolf" && m.tame);
      // A hamlet that hates you (reputation -30 or worse) sends its golem.
      const golemMad = m.kind === "golem" && phase === "play" && repAtKey(repKeyFor(m.homeX ?? m.x, m.homeZ ?? m.z)) <= -30 && d < 14;
      const foe = townGuard
        ? mobs.find(
            (o) =>
              o !== m &&
              !o.dead &&
              (o.kind === "creeper" ||
                o.kind === "walker" ||
                o.kind === "skelly" ||
                o.kind === "spider" ||
                o.kind === "wisp" ||
                o.kind === "phantom" ||
                o.kind === "slime" ||
                o.kind === "enderman" ||
                o.kind === "witch" ||
                o.kind === "drowned" ||
                o.kind === "husk" ||
                o.kind === "stray" ||
                o.kind === "pillager" ||
                o.kind === "vindicator" ||
                o.kind === "evoker" ||
                o.kind === "vex" ||
                o.kind === "ravager" ||
                (o.kind === "piglin" && hotbar[slot] !== ID.Gold && hotbar[slot] !== ID.Ingot)) &&
              Math.hypot(o.x - m.x, o.z - m.z) < (m.kind === "golem" ? 16 : 11),
          )
        : undefined;
      // Raiders hunt the folk as well as the player: whichever is closer.
      const prey =
        (m.kind === "pillager" || m.kind === "vindicator" || m.kind === "ravager") && phase === "play"
          ? mobs
              .filter((o) => o.kind === "villager" && !o.dead && Math.hypot(o.x - m.x, o.z - m.z) < 20)
              .sort((a, b) => Math.hypot(a.x - m.x, a.z - m.z) - Math.hypot(b.x - m.x, b.z - m.z))[0]
          : undefined;
      const chase =
        !!foe ||
        !!prey ||
        flyer ||
        piglinMad ||
        ((m.kind === "enderman" || m.kind === "bee") && !!m.mad && d < 20 && seen) ||
        ((m.kind === "witch" || m.kind === "drowned") && d < 15 && seen) ||
        ((m.kind === "creeper" || m.kind === "walker" || m.kind === "skelly" || m.kind === "spider" || m.kind === "wisp" || m.kind === "slime" || m.kind === "husk" || m.kind === "stray") &&
          d < (m.kind === "skelly" || m.kind === "stray" ? 18 : m.kind === "slime" ? 12 : 16) &&
          seen) ||
        (m.kind === "guardian" && d < 16 && seen) ||
        ((m.kind === "pillager" || m.kind === "vindicator" || m.kind === "ravager" || m.kind === "evoker") && d < 18 && seen) ||
        (m.kind === "vex" && d < 20 && seen) ||
        golemMad;
      if (foe) m.yaw = Math.atan2(-(foe.x - m.x), -(foe.z - m.z));
      else if (prey) m.yaw = Math.atan2(-(prey.x - m.x), -(prey.z - m.z));
      else if ((m.kind === "wolf" || m.kind === "cat" || m.kind === "parrot") && m.tame && d > 3.2 && d < 32) m.yaw = Math.atan2(-dx, -dz);
      else if (chase) m.yaw = Math.atan2(-dx, -dz);
      else if (mount !== m) {
        m.wander -= dt;
        if (m.wander <= 0) {
          m.wander = 1.5 + Math.random() * 3;
          m.yaw += (Math.random() - 0.5) * 2.4;
        }
      }
      // Real pathfinding: chasing ground mobs route around walls and
      // terrain with A* instead of steering blindly into them.
      if (!flyer && chase && phase === "play") {
        const txp = foe ? foe.x : prey ? prey.x : player.x;
        const tzp = foe ? foe.z : prey ? prey.z : player.z;
        m.pathT = (m.pathT ?? 0) - dt;
        if (m.pathT <= 0) {
          m.pathT = 0.5;
          if (lineClear(m.x, m.z, txp, tzp, m.y)) m.path = null;
          else {
            const last = m.path && m.path.length ? m.path[m.path.length - 1] : null;
            const stale = !m.path || (m.pathI ?? 0) >= m.path.length || (last ? Math.hypot(last.x + 0.5 - txp, last.z + 0.5 - tzp) > 3 : false);
            if (stale) {
              m.path = findPath(m.x, m.z, txp, tzp);
              m.pathI = 0;
            }
          }
        }
        if (m.path && (m.pathI ?? 0) < m.path.length) {
          const wp = m.path[m.pathI ?? 0];
          if (Math.hypot(wp.x + 0.5 - m.x, wp.z + 0.5 - m.z) < 0.7) m.pathI = (m.pathI ?? 0) + 1;
          else m.yaw = Math.atan2(-(wp.x + 0.5 - m.x), -(wp.z + 0.5 - m.z));
        }
      }
      if ((m.kind === "villager" || m.kind === "golem") && m.homeX !== undefined && m.homeZ !== undefined) {
        const hx = m.homeX - m.x;
        const hz = m.homeZ - m.z;
        const hd = Math.hypot(hx, hz);
        if (hd > 24) {
          m.x = m.homeX;
          m.z = m.homeZ;
          m.y = groundY(m.x, m.z);
        } else if (hd > 4.5) {
          m.yaw = Math.atan2(-hx, -hz);
        }
      }
      if (flyer && m.kind === "dragon") {
        dragonTick(m, dt, d);
      } else if (flyer && m.kind === "wither") {
        witherTick(m, dt, d);
      } else if (flyer) {
        const alt = m.kind === "dragon" ? 7 : 4;
        const sp = (m.kind === "dragon" ? 3.4 : 2.1) * ((m.slowT ?? 0) > 0 ? 0.45 : 1);
        m.x += -Math.sin(m.yaw) * sp * dt;
        m.z += -Math.cos(m.yaw) * sp * dt;
        const want = groundY(m.x, m.z) + alt;
        m.y += (want - m.y) * Math.min(1, dt * 2);
        if (m.kind !== "dragon" && m.kind !== "wither" && m.cool <= 0 && d < 24 && phase === "play" && seen) {
          if (m.kind === "blaze") {
            launchFireball(m.x, m.y + 0.4, m.z, dx, player.y + 1 - m.y, dz);
            m.cool = 2.2;
          } else {
            launchArrow(m.x, m.y, m.z, dx, player.y + 1 - m.y, dz, false);
            m.cool = m.kind === "ghast" ? 2.5 : 1.5;
          }
        }
        if (m.kind === "dragon" && d < 2.8 && phase === "play" && m.cool <= 0) {
          bite(5);
          m.cool = 1.1;
          audio.hit();
        }
      } else {
        if ((m.kind === "wolf" || m.kind === "cat" || m.kind === "parrot") && m.tame && !foe && d > 28) {
          m.x = player.x + Math.sin(player.yaw) * 1.6;
          m.z = player.z + Math.cos(player.yaw) * 1.6;
          m.y = groundY(m.x, m.z);
        }
        if (m.lead && d > 2.2) {
          m.yaw = Math.atan2(-(player.x - m.x), -(player.z - m.z));
          const sp = 2.1;
          m.x += -Math.sin(m.yaw) * sp * dt;
          m.z += -Math.cos(m.yaw) * sp * dt;
          m.y = groundY(m.x, m.z);
        }
        const speed = (m.kind === "shulker" ? 0 : m.kind === "goat" && m.mode === "aim" ? 0 : m.kind === "goat" && m.mode === "charge" ? 5.2 : foe ? 2.7 : chase ? (m.kind === "spider" ? 3.1 : m.kind === "slime" ? 1.35 : m.kind === "vindicator" ? 2.6 : m.kind === "ravager" ? 2.35 : m.kind === "pillager" ? 2.15 : m.kind === "evoker" ? 2.0 : m.kind === "walker" || m.kind === "husk" ? 2.15 : 2.4) : ((m.kind === "wolf" || m.kind === "cat" || m.kind === "parrot") && m.tame && d > 4) ? 2.35 : m.kind === "bee" || m.kind === "bat" || m.kind === "parrot" ? 1.7 : 1.05) * ((m.slowT ?? 0) > 0 ? 0.45 : 1);
        const fx = -Math.sin(m.yaw);
        const fz = -Math.cos(m.yaw);
        const nx = m.x + fx * speed * dt;
        const nz = m.z + fz * speed * dt;
        const gy = groundY(nx, nz);
        // Water: land animals refuse deep water instead of walking
        // the lake bed. Swimmers (crab, frog, slime) ride the surface.
        const swimmer = m.kind === "crab" || m.kind === "frog" || m.kind === "slime" || m.kind === "squid" || m.kind === "drowned" || m.kind === "axolotl" || m.kind === "guardian";
        let floorY = gy;
        let inWater = false;
        if (def(world.get(Math.floor(nx), Math.floor(gy), Math.floor(nz))).fluid) {
          let top = Math.floor(gy);
          while (def(world.get(Math.floor(nx), top, Math.floor(nz))).fluid) top++;
          if (top - gy >= 1) {
            inWater = true;
            floorY = top;
            // Squid, axolotls and guardians swim below the surface, not on it.
            if (m.kind === "squid" || m.kind === "axolotl" || m.kind === "guardian") floorY = top - 1;
          }
        }
        const blocked =
          solidAt(Math.floor(nx), Math.floor(gy + 0.1), Math.floor(nz)) ||
          solidAt(Math.floor(nx), Math.floor(gy + 1.1), Math.floor(nz)) ||
          (!inWater && floorY - m.y > 1.3) ||
          (inWater && !swimmer);
        // Bees and bats hover: they ease toward a height above the
        // ground and ignore the walking rules entirely.
        const hover = m.kind === "bee" || m.kind === "bat" || m.kind === "parrot" || m.kind === "vex";
        if (hover) {
          m.x = nx;
          m.z = nz;
          const target = gy + (m.kind === "bee" || m.kind === "vex" ? 1.25 : m.kind === "parrot" ? 1.5 : 2.1) + Math.sin(elapsed * 2.2 + (m.phase ?? 0)) * 0.25;
          m.y += (target - m.y) * Math.min(1, dt * 3);
          if (m.kind === "bat") m.yaw += (Math.random() - 0.5) * 3 * dt;
        } else if (blocked) m.yaw += 1.4;
        else {
          m.x = nx;
          m.z = nz;
          // One-block steps snap up; drops ease down, so animals
          // never teleport off cliffs, onto roofs or into treetops.
          m.y = floorY < m.y ? Math.max(floorY, m.y - 13 * dt) : floorY;
        }
        // A squid out of water suffocates.
        if (m.kind === "squid" && !inWater) {
          m.hp -= dt * 2;
          if (m.hp <= 0) {
            killMob(m);
            continue;
          }
        }
        // An axolotl out of water dries out, four times slower.
        if (m.kind === "axolotl" && !inWater) {
          m.hp -= dt * 0.5;
          if (m.hp <= 0) {
            killMob(m);
            continue;
          }
        }
      }
      if ((m.kind === "walker" || m.kind === "spider" || m.kind === "wisp" || m.kind === "slime" || m.kind === "drowned" || m.kind === "husk" || m.kind === "vindicator" || m.kind === "ravager" || m.kind === "pillager" || m.kind === "evoker" || piglinMad) && d < 1.35 && phase === "play" && m.cool <= 0) {
        bite(m.kind === "ravager" ? 5 : m.kind === "wisp" || m.kind === "spider" || m.kind === "pillager" || m.kind === "evoker" ? 2 : m.kind === "slime" ? ((m.size ?? 1) > 0.7 ? 3 : 1) : 3);
        thornsHit(m);
        m.cool = 0.75;
        audio.hit();
      }
      if (m.kind === "guardian" && d < 1.6 && phase === "play" && m.cool <= 0) {
        bite(2);
        thornsHit(m);
        m.cool = 0.9;
        audio.hit();
      }
      if (m.kind === "enderman" && m.mad && d < 1.6 && phase === "play" && m.cool <= 0) {
        bite(4);
        thornsHit(m);
        m.cool = 0.8;
        audio.hit();
      }
      if (m.kind === "bee" && m.mad && d < 1.1 && phase === "play" && m.cool <= 0) {
        bite(1);
        m.cool = 1;
        m.mad = false;
        audio.hit();
      }
      if (m.kind === "golem" && golemMad && d < 1.7 && phase === "play" && m.cool <= 0) {
        bite(4);
        thornsHit(m);
        m.cool = 0.9;
        audio.hit();
      }
      if (foe && Math.hypot(foe.x - m.x, foe.z - m.z) < 1.7 && m.cool <= 0) {
        foe.hp -= m.kind === "golem" ? 6 : 3;
        m.cool = 0.65;
        audio.hit();
        if (foe.hp <= 0) killMob(foe);
      }
      if (prey && Math.hypot(prey.x - m.x, prey.z - m.z) < 1.7 && m.cool <= 0) {
        prey.hp -= m.kind === "ravager" ? 4 : m.kind === "vindicator" ? 3 : 2;
        m.cool = 0.75;
        audio.hit();
        if (prey.hp <= 0) killMob(prey);
      }
      if ((m.kind === "skelly" || m.kind === "stray" || m.kind === "pillager") && d < 16 && d > 3 && phase === "play" && m.cool <= 0 && seen) {
        launchArrow(m.x, m.y + 1, m.z, dx, 0.2, dz, false);
        m.cool = 1.5;
      }
      if (m.kind === "witch" && phase === "play" && m.cool <= 0) {
        if (m.hp < 7 && Math.random() < 0.5) {
          // The hag drinks instead of throwing when she is hurt.
          m.hp = Math.min(13, m.hp + 3);
          m.cool = 2.6;
          burst(m.x, m.y + 1.2, m.z, "#3aaa4c", 6);
        } else if (d < 14 && d > 3 && seen) {
          launchArrow(m.x, m.y + 1.2, m.z, dx, 0.25, dz, false);
          m.cool = 1.9;
        }
      }
      if (m.kind === "evoker" && phase === "play") {
        if (m.mode === "fang") {
          m.modeT = (m.modeT ?? 0) - dt;
          if (m.modeT <= 0) {
            m.mode = undefined;
            const fx = m.fangX ?? player.x;
            const fz = m.fangZ ?? player.z;
            burst(fx, groundY(fx, fz) + 0.6, fz, "#d7e6ee", 10);
            if (Math.hypot(fx - player.x, fz - player.z) < 1.8) bite(3);
          }
        } else if (m.cool <= 0) {
          if (!m.summoned && d < 16 && seen) {
            m.summoned = true;
            const v1 = spawnKind("vex", m.x + 1.5, m.z);
            const v2 = spawnKind("vex", m.x - 1.5, m.z);
            if (m.raidMob) {
              v1.raidMob = true;
              v2.raidMob = true;
            }
            burst(m.x, m.y + 1.2, m.z, "#9aa8ff", 8);
            m.cool = 2.4;
          } else if (d < 15 && d > 3 && seen) {
            m.mode = "fang";
            m.modeT = 0.65;
            m.fangX = player.x;
            m.fangZ = player.z;
            burst(m.fangX, groundY(m.fangX, m.fangZ) + 0.4, m.fangZ, "#d7e6ee", 4);
            m.cool = 2.2;
          }
        }
      }
      if (m.kind === "vex" && d < 1.5 && phase === "play" && m.cool <= 0) {
        bite(2);
        m.cool = 0.8;
        audio.hit();
      }
      if (m.kind === "creeper" && d < 2.15 && phase === "play") {
        m.fuse += dt;
        if (m.bodyMat) m.bodyMat.emissive.setHex(Math.sin(m.fuse * 24) > 0 ? 0xffffff : 0x000000);
        if (m.fuse > 1.2) {
          m.dead = true;
          spawnMobRagdoll(m.x, m.y + 0.6, m.z, ["#3aaa4c", "#329842", "#101a12", "#6aff7a"], 22);
          scene.remove(m.mesh);
          explode(Math.round(m.x), Math.round(m.y), Math.round(m.z), m.charged ? 5 : 3);
        }
      } else if (m.fuse > 0) {
        m.fuse = Math.max(0, m.fuse - dt * 2);
        if (m.bodyMat) m.bodyMat.emissive.setHex(m.charged ? 0x7ee0ff : 0x000000);
      }
      const vis = visOf(m);
      const stride = Math.sin(vis.gait);
      const bounce =
        m.kind === "slime"
          ? Math.abs(stride) * (0.18 + (m.size ?? 1) * 0.22)
          : m.kind === "frog"
            ? Math.abs(stride) * 0.2
            : FLYERS.has(m.kind)
              ? Math.abs(stride) * 0.04
              : Math.abs(Math.sin(vis.gait)) * 0.05 * vis.amp;
      mobVisuals(m, dt, bounce);
      m.mesh.rotation.y = m.yaw;
      m.mesh.position.set(m.x, m.y + (settings.studs ? STUD_H : 0) + bounce, m.z);
    }
    // Separation: animals never stack inside each other.
    for (let i = 0; i < mobs.length; i++) {
      const a = mobs[i];
      if (a.dead || a.kind === "boat" || a.kind === "cart") continue;
      for (let j = i + 1; j < mobs.length; j++) {
        const b = mobs[j];
        if (b.dead || b.kind === "boat" || b.kind === "cart") continue;
        const sx = b.x - a.x;
        const sz = b.z - a.z;
        const d2 = sx * sx + sz * sz;
        if (d2 > 0.36 || d2 === 0) continue;
        const dist = Math.sqrt(d2);
        const push = ((0.6 - dist) / dist) * 0.5;
        // A shulker is rooted to its block: it never gets shoved.
        if (a.kind !== "shulker") {
          a.x -= sx * push;
          a.z -= sz * push;
        }
        if (b.kind !== "shulker") {
          b.x += sx * push;
          b.z += sz * push;
        }
      }
    }
    // Nothing walks into the player's body (it hid the mob from the crosshair).
    for (const a of mobs) {
      if (a.dead || a === mount || a.kind === "boat" || a.kind === "cart" || a.kind === "shulker" || a.kind === "dragon") continue;
      if (Math.abs(a.y - player.y) > 1.6) continue;
      const px = a.x - player.x;
      const pz = a.z - player.z;
      const d2 = px * px + pz * pz;
      if (d2 >= 0.42 || d2 < 1e-6) continue;
      const dist = Math.sqrt(d2);
      const k = (0.65 - dist) / dist;
      const nx = a.x + px * k;
      const nz = a.z + pz * k;
      const fy = Math.floor(a.y + 0.5);
      if (!solidAt(Math.floor(nx), fy, Math.floor(nz))) {
        a.x = nx;
        a.z = nz;
      }
    }
    // Compact: dead mobs used to stay in the list forever, so every despawned
    // night mob was iterated (and filtered) each frame for the rest of the session.
    let w = 0;
    for (let i = 0; i < mobs.length; i++) {
      const m = mobs[i];
      if (m.dead) {
        if (m.vis) dropBar(m.vis);
        if (mount === m) mount = null;
        continue;
      }
      mobs[w++] = m;
    }
    mobs.length = w;
    mobBatchRenderer.update(mobs, camera, elapsed, settings.studs, STUD_H);
  }

  function packSave(): SaveV1 {
    const edits: [number, number, number, number][] = [];
    let n = 0;
    for (const [key, id] of world.edits) {
      if (n++ > 24000) break;
      const [x, y, z] = key.split(",").map(Number);
      edits.push([x, y, z, id]);
    }
    const invList: [number, number][] = [];
    for (const [id, count] of Object.entries(inv)) if (count > 0) invList.push([Number(id), count]);
    return {
      v: 1,
      seed,
      seedText,
      flat,
      creative,
      edits,
      px: player.x,
      py: player.y,
      pz: player.z,
      yaw: player.yaw,
      pitch: player.pitch,
      health,
      hunger,
      xp,
      rank: rankLv,
      rankXp: xp,
      found: [...found],
      armor: [...armor],
      hammer,
      hotbar: [...hotbar],
      inv: invList,
      chests: [...chests.entries()].map(([key, bin]) => {
        const [x, y, z] = key.split(",").map(Number);
        return { x, y, z, ids: bin.ids.slice(), ns: bin.ns.slice() };
      }),
      furnaces: [...furnaces.values()].map((f) => ({ ...f })),
      comps: [...comps.entries()].map(([key, c]) => {
        const [x, y, z] = key.split(",").map(Number);
        return { x, y, z, dir: c.dir, delay: c.delay };
      }),
      signs: [...signs.entries()].map(([key, t]) => {
        const [x, y, z] = key.split(",").map(Number);
        return { x, y, z, t };
      }),
      fire: {
        heat: [...FS.heatMap.entries()].map(([key, e]) => {
          const [x, y, z] = key.split(",").map(Number);
          return [x, y, z, e.h, e.m] as [number, number, number, number, number];
        }),
        puddles: [...FS.puddleSrc.entries()].map(([key, src]) => {
          const [x, y, z] = key.split(",").map(Number);
          return [x, y, z, src] as [number, number, number, number];
        }),
        cells: [...FS.fireCells].map((key) => key.split(",").map(Number) as [number, number, number]),
        burning: [...FS.burningMap.entries()].map(([key, t]) => {
          const [x, y, z] = key.split(",").map(Number);
          return [x, y, z, t] as [number, number, number, number];
        }),
      },
      tufts: [...TS.tuftGone].map((key) => key.split(",").map(Number) as [number, number, number]),
      chips: [...CH.chipMap.entries()].map(([key, v]) => {
        const [x, y, z] = key.split(",").map(Number);
        return [x, y, z, v] as [number, number, number, number];
      }),
      bricks: [...bricks.values()].map((b) => [b.id, b.sx, b.sy, b.sz] as [number, number, number, number]),
      technic: [...tech.parts.values()].map((p) => [p.id, p.o, p.q[0], p.q[1], p.q[2], p.on === false ? 0 : 1] as [number, number, number, number, number, number]),
      welds: [...welds].map((w) => {
        const [a, b] = w.split("|");
        const [ax, ay, az] = a.split(",").map(Number);
        const [bx, by, bz] = b.split(",").map(Number);
        return [ax, ay, az, bx, by, bz] as [number, number, number, number, number, number];
      }),
      beacons: [...beaconBuffs.entries()].map(([key, buff]) => {
        const [x, y, z] = key.split(",").map(Number);
        return { x, y, z, buff };
      }),
      jukeboxes: [...jukeDiscs.entries()].map(([key, disc]) => {
        const [x, y, z] = key.split(",").map(Number);
        return { x, y, z, disc };
      }),
      shulkerQueue: shulkerQueue.map((q) => ({ ids: q.ids.slice(), ns: q.ns.slice() })),
      ench: [...ench.entries()].map(([id, e]) => [id, Object.entries(e)] as [number, [string, number][]]),
      tradeXp: { ...tradeXp },
      tradeStock: Object.fromEntries(Object.entries(tradeStock).map(([k, v]) => [k, v.slice()])),
      reputation: { ...reputation },
      folk: folkSpots.map((f) => ({ x: f.x, z: f.z, role: f.role })),
      village: villageAt,
      quests: quests.map((q) => ({ id: q.id, n: q.n, done: q.done })),
      skills: [...skills],
      mana,
      spell: spellIx,
      won,
      worldTime,
      worldDays,
      pets: mobs.filter((m) => m.kind === "wolf" && m.tame && !m.dead).map((m) => ({ x: m.x, z: m.z })),
    };
  }

  function saveWorld() {
    if (!sessionStarted) return;
    const ok = writeWorld(
      { id: worldId || "main", seed, seedText, flat, creative, updated: Date.now() },
      packSave(),
    );
    if (ok) hasSaveFlag = true;
    else if (performance.now() - saveWarned > 60000) {
      // Used to fail silently when browser storage filled up — progress just vanished.
      saveWarned = performance.now();
      say("Couldn't save — browser storage is full. Drop an old world from the title screen.", 6000);
    }
    saveDirty = false;
  }

  function beginPlay() {
    beganAt = performance.now();
    phase = "play";
    player.vx = player.vy = player.vz = 0;
    if (!sessionStarted) {
      player.yaw = orbit;
      player.pitch = -0.28;
    }
    sessionStarted = true;
    if (!touchMode) lockPointer();
    say((flat ? "Baseplate" : creative ? "Creative" : "Survival") + " · seed " + seedText + "." + hamletLine(), 4200);
    emit();
  }

  function poll(first: boolean) {
    let fwd = 0;
    let str = 0;
    if (keys.has("KeyF")) {
      const tmp = offhand;
      offhand = hotbar[slot];
      hotbar[slot] = tmp;
      keys.delete("KeyF");
      emit();
    }
    if (keys.has("KeyW") || keys.has("ArrowUp")) fwd += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) fwd -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) str += 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) str -= 1;
    if (steerOverride) str += -steerOverride;
    fwd += touch.moveY;
    str += touch.moveX;
    str += padIn.x;
    fwd += padIn.y;
    const jump = keys.has("Space") || touch.jump || padIn.jump;
    let mine = mouseMine || touch.mine || padIn.mine;
    let place = mousePlace || touch.place || padIn.place;
    if (holdLatch) {
      if (!mine && !place) holdLatch = false;
      else mine = place = false;
    }
    const mag = Math.hypot(fwd, str);
    if (mag > 1) {
      fwd /= mag;
      str /= mag;
    }
    return {
      fwd,
      str,
      sneak: isSneaking(),
      sprint: isSprinting(),
      jump,
      mine,
      place,
      first,
    };
  }

  function physics(dt: number, sample: ReturnType<typeof poll>) {
    if (phase !== "play") return;
    const wasGrounded = player.grounded;
    if (wasGrounded) player.coyote = 0.14;
    else player.coyote -= dt;
    const eyeY = player.y + (sample.sneak && !flying ? EYE_SNEAK : EYE);
    const headWater = def(world.get(Math.floor(player.x), Math.floor(eyeY), Math.floor(player.z))).fluid;
    const bodyWater = inWaterNow();
    hud.eyeWater = headWater;

    if (sample.first && sample.jump && !prevJump && creative) {
      if (elapsed - jumpTap < 0.28) flying = !flying;
      jumpTap = elapsed;
    }
    const jumpEdge = sample.first && sample.jump && !prevJump;
    prevJump = sample.jump;

    const fxBlock = Math.floor(player.x);
    const fyBlock = Math.floor(player.y);
    const fzBlock = Math.floor(player.z);
    const onLadder =
      def(world.get(fxBlock, fyBlock, fzBlock)).ladder || def(world.get(fxBlock, fyBlock + 1, fzBlock)).ladder;

    if (!creative) flying = false;
    if (flying) {
      const up = (sample.jump ? 1 : 0) - (sample.sneak ? 1 : 0);
      player.vy = up * 8;
    } else if (bodyWater) {
      player.vy -= 8 * dt;
      if (player.vy < -2.4) player.vy = -2.4;
      if (sample.jump) player.vy = 4.2;
    } else if (onLadder) {
      if (sample.jump) player.vy = 3.5;
      else if (sample.sneak) player.vy = -3.2;
      else player.vy = Math.max(-1.1, player.vy - 10 * dt);
    } else {
      player.vy -= 28 * dt;
      if (player.vy < -32) player.vy = -32;
      if (jumpEdge && player.coyote > 0) {
        player.vy = jumpT > 0 ? 11.8 : 8.45;
        player.grounded = false;
        player.coyote = 0;
        audio.jump();
      }
    }

    const grippy = armor[3] === ID.ResinBoots;
    const onIce = def(world.get(Math.floor(player.x), Math.floor(player.y - 0.08), Math.floor(player.z))).slip && !grippy;
    const onSoul = def(world.get(Math.floor(player.x), Math.floor(player.y - 0.08), Math.floor(player.z))).slow;
    const speed =
      (flying ? (sample.sneak ? 4.5 : 12) : (sample.sneak ? 1.7 : sample.sprint ? 7.1 : 4.35) * (bodyWater ? (gillT > 0 ? 0.92 : Math.min(0.92, 0.55 + 0.12 * enchLvl(armor[3], "depth"))) : 1)) *
      (onSoul ? 0.45 : 1) *
      (sample.sprint && rankLv >= 12 ? 1.12 : 1) *
      (speedT > 0 ? 1.35 : 1) *
      (slowT > 0 ? 0.5 : 1);
    const gliding = !flying && !player.grounded && (inv[ID.Elytra] ?? 0) > 0 && sample.jump && player.vy < 0;
    if (gliding) player.vy = Math.max(player.vy, -1.5);
    const fx = -Math.sin(player.yaw);
    const fz = -Math.cos(player.yaw);
    const rx = Math.cos(player.yaw);
    const rz = -Math.sin(player.yaw);
    const wantX = (fx * sample.fwd + rx * sample.str) * speed;
    const wantZ = (fz * sample.fwd + rz * sample.str) * speed;
    const k = 1 - Math.exp((onIce ? -2.4 : -14) * dt);
    player.vx += (wantX - player.vx) * k;
    player.vz += (wantZ - player.vz) * k;

    const ox = player.x;
    const oy = player.y;
    const oz = player.z;
    player.grounded = false;
    // v4.18 (Philippe): stepping also applies while swimming — at the
    // surface your feet ride ~0.4 under the bank's top, and without the
    // step assist you could NEVER climb out of the water onto a shore.
    const stepping = (wasGrounded || bodyWater) && !flying && !sample.sneak;
    moveAxis("x", player.vx * dt, stepping);
    moveAxis("z", player.vz * dt, stepping);
    if (sample.sneak && wasGrounded && !flying) {
      const under = world.get(Math.floor(player.x), Math.floor(player.y - 0.08), Math.floor(player.z));
      if (!def(under).solid) {
        player.x = ox;
        player.y = oy;
        player.z = oz;
        player.vx = 0;
        player.vz = 0;
      }
    }
    moveAxis("y", player.vy * dt, false);

    if (player.y < -6) die();
    if (!creative && phase === "play") {
      if (headWater && gillT <= 0) {
        oxygen = Math.max(0, oxygen - dt * (rankLv >= 10 ? 0.7 : 1.15));
        if (oxygen <= 0) {
          drownTick += dt;
          if (drownTick > 0.7) {
            drownTick = 0;
            hurt(2);
          }
        }
      } else {
        oxygen = Math.min(10, oxygen + dt * 2.5);
        drownTick = 0;
      }
      hurtAgo += dt;
      if (health > 0 && health < 20 && hurtAgo > 6 && !headWater) health = Math.min(20, health + dt * 0.45);
    } else oxygen = 10;

    const moving = Math.hypot(player.vx, player.vz) > 0.8 && player.grounded;
    if (moving) {
      stepTime += dt;
      bob += dt * (sample.sprint ? 12 : 8);
      if (stepTime > 0.42) {
        stepTime = 0;
        audio.step();
      }
    } else stepTime = 0;

    invuln = Math.max(0, invuln - dt);
    const reach = creative ? 8 : 5.6;
    const rdx = -Math.sin(player.yaw) * Math.cos(player.pitch);
    const rdy = Math.sin(player.pitch);
    const rdz = -Math.cos(player.yaw) * Math.cos(player.pitch);
    // third person: aim along the camera ray (it is parallel to the look
    // direction and passes through the crosshair), reach measured from the eye
    const tp = settings.third && thirdAim.ok;
    const rox = tp ? thirdAim.x : player.x;
    const roy = tp ? thirdAim.y : eyeY;
    const roz = tp ? thirdAim.z : player.z;
    const hit = tp ? raycast(thirdAim.x, thirdAim.y, thirdAim.z, rdx, rdy, rdz, reach + thirdAim.back, true) : raycast(player.x, eyeY, player.z, rdx, rdy, rdz, reach, true);
    // P0: bricks are a separate layer — raycast them too; the nearer of
    // (voxel hit, brick hit) owns the crosshair this frame.
    const bHit = bricks.size > 0 ? raycastBricks(rox, roy, roz, rdx, rdy, rdz, reach + (tp ? thirdAim.back : 0)) : null;
    const useBrick = !!bHit && (!hit || bHit.t < hit.dist);
    // Technic layer: its own DDA raycast on the half-module lattice (t
    // comes back in q units — /4 = blocks). The nearest of voxel /
    // brick / Technic owns the crosshair this frame.
    const tHit = tech.parts.size > 0 ? tech.raycast([rox * 4, roy * 4, roz * 4], [rdx, rdy, rdz], (reach + (tp ? thirdAim.back : 0)) * 4) : null;
    const tDist = tHit ? tHit.t / 4 : Infinity;
    const useTech = !!tHit && tDist <= (hit ? hit.dist : Infinity) && tDist <= (bHit ? bHit.t : Infinity);
    if (useBrick && bHit) {
      aimPt.x = rox + rdx * bHit.t;
      aimPt.y = roy + rdy * bHit.t;
      aimPt.z = roz + rdz * bHit.t;
    } else if (hit) {
      aimPt.x = rox + rdx * hit.dist;
      aimPt.y = roy + rdy * hit.dist;
      aimPt.z = roz + rdz * hit.dist;
    }
    let mobT = 99;
    let mob: Mob | null = null;
    for (const m of mobs) {
      if (m.dead) continue;
      const t = rayBox(
        player.x,
        eyeY,
        player.z,
        rdx,
        rdy,
        rdz,
        m.x - 0.4,
        m.y,
        m.z - 0.4,
        m.x + 0.4,
        m.y + 1.25,
        m.z + 0.4,
      );
      if (t !== null && t < mobT && t < reach) {
        mobT = t;
        mob = m;
      }
    }
    const nearBlock = Math.min(hit ? hit.dist : Infinity, bHit ? bHit.t : Infinity, tDist);
    const blockFirst = !mob || nearBlock < mobT;
    hud.targetName = "";
    hud.mine = 0;
    highlight.visible = false;
    ghost.visible = false;
    // Technic placement preview: while a Technic part is held, the
    // planner (technic.ts plan()) owns the ghost — against the nearest
    // target, whichever layer it belongs to. The plan is executed
    // after the aim chain below; the block ghost is force-hidden
    // whenever a Technic part is held.
    hideTechGhost();
    let techPlanNow: TechPlan | null = null;
    const heldTechId = hotbar[slot];
    if (TECHNIC_SET.has(heldTechId) && blockFirst) {
      const look: [number, number, number] = [rdx, rdy, rdz];
      let tgt: TechTarget | null = null;
      if (useTech && tHit) tgt = { kind: "part", uid: tHit.uid, point: tHit.point, n: tHit.n, cell: tHit.cell };
      else if (useBrick && bHit) {
        const bk = bHit.brick;
        const ax = bHit.nx !== 0 ? 0 : bHit.ny !== 0 ? 1 : 2;
        const sg = ax === 0 ? bHit.nx : ax === 1 ? bHit.ny : bHit.nz;
        const mb = ax === 0 ? bk.sx / 2 : ax === 1 ? bk.sy : bk.sz / 2;
        tgt = { kind: "face", point: [aimPt.x * 4, aimPt.y * 4, aimPt.z * 4], n: [ax as 0 | 1 | 2, sg], face: sg > 0 ? (mb + 1) * 4 : mb * 4 };
      } else if (hit) {
        const ax = hit.nx !== 0 ? 0 : hit.ny !== 0 ? 1 : 2;
        const sg = ax === 0 ? hit.nx : ax === 1 ? hit.ny : hit.nz;
        const mb = ax === 0 ? hit.x : ax === 1 ? hit.y : hit.z;
        tgt = { kind: "face", point: [aimPt.x * 4, aimPt.y * 4, aimPt.z * 4], n: [ax as 0 | 1 | 2, sg], face: sg > 0 ? (mb + 1) * 4 : mb * 4 };
      }
      if (tgt) {
        techPlanNow = tech.plan(heldTechId, tgt, look, techSpin, techSolidAt);
        if (techPlanNow) {
          const ok = (creative || (inv[heldTechId] ?? 0) > 0) && !techHitsPlayer(heldTechId, techPlanNow.o, techPlanNow.q);
          showTechGhost(heldTechId, techPlanNow, ok);
        }
      }
    }

    if (!blockFirst && mob) {
      hud.targetName =
        mob.kind === "sheep"
          ? "Stud sheep"
          : mob.kind === "cow"
            ? "Grazer"
            : mob.kind === "walker"
              ? "Night stud"
              : mob.kind === "creeper"
                ? "Fuse brick"
                : mob.kind === "pig"
                  ? "Oink brick"
                  : mob.kind === "chicken"
                    ? "Cluck"
                    : mob.kind === "spider"
                      ? "Crawler"
                      : mob.kind === "skelly"
                        ? "Bone stud"
                        : mob.kind === "frog"
                          ? "Hop stud"
                          : mob.kind === "fox"
                            ? "Brush stud"
                            : mob.kind === "crab"
                              ? "Pinch stud"
                              : mob.kind === "wisp"
                                ? "Wisp"
                                : mob.kind === "slime"
                                  ? "Slime brick"
                                  : mob.kind === "wolf"
                                    ? mob.tame
                                      ? "Hound"
                                      : "Wild hound"
                                    : mob.kind === "golem"
                                      ? "Hamlet golem"
                                      : mob.kind === "villager"
                          ? traderOf(mob.role).name
                          : mob.kind === "horse"
                            ? "Steed"
                            : mob.kind === "ghast"
                              ? "Floater"
                              : mob.kind === "dragon"
                                ? "End wyrm"
                                : mob.kind === "piglin"
                                  ? "Barter stud"
                                  : mob.kind === "enderman"
                                    ? "Tall dark"
                                    : mob.kind === "blaze"
                                      ? "Ember swirl"
                                      : mob.kind === "witch"
                                        ? "Hag"
                                        : mob.kind === "drowned"
                                          ? "Drowned"
                                          : mob.kind === "bee"
                                            ? "Bee"
                                            : mob.kind === "cat"
                                              ? "Cat"
                                              : mob.kind === "squid"
                                                ? "Squid"
                                                : mob.kind === "bat"
                                                  ? "Bat"
                                                  : mob.kind === "phantom"
                                      ? "Sleepless"
                                      : mob.kind === "husk"
                                        ? "Pharaoh mummy"
                                        : mob.kind === "stray"
                                          ? "Frost archer"
                                          : mob.kind === "guardian"
                                            ? (mob.maxHp ?? 0) >= 30
                                              ? "Elder guardian"
                                              : "Sea guardian"
                                            : mob.kind === "pillager"
                                              ? "Crossbow illager"
                                              : mob.kind === "vindicator"
                                                ? "Royal vindicator"
                                                : mob.kind === "evoker"
                                                  ? "Arch-evoker"
                                                  : mob.kind === "ravager"
                                                    ? "Siege ravager"
                                                    : mob.kind === "vex"
                                                      ? "Vex imp"
                                                      : mob.kind === "shulker"
                                                        ? "Shulker"
                                                        : mob.kind === "boat"
                                                          ? "Boat"
                                                          : "Cart";
      if (sample.first && sample.place && !prevPlace) interactMob(mob);
      // Player hits are gated by the mob's own hurt cooldown (hitCd), not by its
      // attack cooldown: sharing one timer meant a mob biting you every second
      // reset it just before your swing was checked — it could never be hit back.
      if (sample.mine && (mob.hitCd ?? 0) <= 0 && mob.kind !== "boat" && mob.kind !== "cart") {
        const heldWeaponId = hotbar[slot];
        const blade = def(heldWeaponId);
        let dmg =
          blade.tool === "sword"
            ? 1 + blade.tier * 2
            : blade.tool === "axe"
              ? 1 + blade.tier * 2
              : heldWeaponId === ID.Trident
                ? 7
                : 1;
        if (strengthT > 0) dmg += 2;
        if (blade.tool === "sword" || blade.tool === "axe" || heldWeaponId === ID.Trident) dmg += enchLvl(heldWeaponId, "sharpness");
        if ((blade.tool === "sword" || blade.tool === "axe" || heldWeaponId === ID.Trident) && (mob.kind === "walker" || mob.kind === "skelly" || mob.kind === "drowned" || mob.kind === "husk" || mob.kind === "stray" || mob.kind === "wither" || mob.kind === "phantom")) dmg += enchLvl(heldWeaponId, "smite") * 2;
        if ((blade.tool === "sword" || blade.tool === "axe") && mob.kind === "spider") dmg += enchLvl(heldWeaponId, "bane") * 2;
        if ((heldWeaponId === ID.TidalBlade || heldWeaponId === ID.Trident) && (mob.kind === "guardian" || mob.kind === "drowned" || inWaterNow())) dmg += 3;
        if (rankLv >= 18 && blade.tool === "sword") dmg += 1;
        const hostile =
          mob.kind === "walker" ||
          mob.kind === "creeper" ||
          mob.kind === "skelly" ||
          mob.kind === "husk" ||
          mob.kind === "stray" ||
          mob.kind === "spider" ||
          mob.kind === "phantom" ||
          mob.kind === "ghast" ||
          mob.kind === "piglin" ||
          mob.kind === "wisp" ||
          mob.kind === "enderman" ||
          mob.kind === "blaze" ||
          mob.kind === "witch" ||
          mob.kind === "drowned" ||
          mob.kind === "guardian" ||
          mob.kind === "pillager" ||
          mob.kind === "vindicator" ||
          mob.kind === "evoker" ||
          mob.kind === "ravager" ||
          mob.kind === "dragon";
        if (skills.has("mark") && blade.tool === "sword" && hostile) dmg += 1;
        if (player.vy < -0.2 && !player.grounded) dmg = Math.ceil(dmg * 1.5);
        if (mob.kind === "dragon" && crystalsLeft() > 0) dmg = Math.max(1, Math.ceil(dmg * 0.5));
        if (mob.kind === "wither" && (mob.spawnT ?? 0) > 0) dmg = 0;
        mob.hp -= dmg;
        if (dmg > 0) padRumble(0.3, 0.15, 55);
        if (mob.kind === "villager" || mob.kind === "golem") {
          mob.byPlayerT = 6;
          addRep(repKeyFor(mob.homeX ?? mob.x, mob.homeZ ?? mob.z), mob.kind === "villager" ? -3 : -2);
        }
        if (mob.kind === "enderman" || mob.kind === "bee") mob.mad = true;
        if ((blade.tool === "sword" || heldWeaponId === ID.Trident) && enchLvl(heldWeaponId, "fire") > 0) mob.burn = Math.max(mob.burn ?? 0, 2 + enchLvl(heldWeaponId, "fire"));
        if (heldWeaponId === ID.PharaohStaff || heldWeaponId === ID.CinderBlade) mob.burn = Math.max(mob.burn ?? 0, 4);
        if (heldWeaponId === ID.WitchStaff) {
          mob.burn = Math.max(mob.burn ?? 0, 3);
          mob.slowT = Math.max(mob.slowT ?? 0, 5);
        }
        if (blade.tool === "sword" || blade.tool === "axe" || blade.tool === "bow" || heldWeaponId === ID.Trident) wearHeld();
        mob.hitCd = 0.42;
        padRumble(0.25, 0.45, 60);
        mob.cool = Math.max(mob.cool, 0.42); // a hit still staggers its next bite
        mob.fuse = Math.max(0, mob.fuse - 0.25);
        const kb = 0.4 + (blade.tool === "sword" ? enchLvl(hotbar[slot], "knockback") * 0.3 : 0);
        if (mob.kind !== "shulker" && mob.kind !== "dragon") shove(mob, mob.x - player.x, mob.z - player.z, kb);
        audio.hit();
        swing = 1;
        if (mob.hp <= 0) killMob(mob);
      }
    } else if (useTech && tHit) {
      // Technic: the crosshair is on a placed part.
      const tpart = tech.parts.get(tHit.uid)!;
      const block = def(tpart.id);
      const tspec = techSpec(tpart.id);
      hud.targetName = block.name + (tspec?.drive ? (tpart.on === false ? " · off" : " · on") : "");
      const aabb = techPartAabb(tpart.id, tpart.o, tpart.q);
      highlight.visible = !hud.hidden;
      highlight.position.set(aabb.c[0], aabb.c[1], aabb.c[2]);
      highlight.scale.set(Math.max(aabb.s[0], 0.05), Math.max(aabb.s[1], 0.05), Math.max(aabb.s[2], 0.05));
      studOutline.visible = false;
      const key = "T:" + tHit.uid;
      if (sample.mine && block.hard !== Infinity) {
        if (mineKey !== key) {
          mineKey = key;
          mineTime = 0;
        }
        mineTime += dt;
        // Parts are hand-breakable plastic: hardness x the standard rate.
        const need = creative ? 0.05 : block.hard * 1.5;
        hud.mine = Math.min(1, mineTime / Math.max(need, 0.01));
        hideCrack(); // no crack overlay on parts — hud.mine carries it, like bricks
        if (mineTime >= need) breakTechPart(tHit.uid);
      } else if (!sample.mine) {
        mineTime = 0;
        mineKey = "";
        hideCrack();
      }
      // Place button on a part: with a Technic part in hand, the
      // planner pre-pass above owns placement; with anything else in
      // hand, a drive part (crank / motor / hub / battery) toggles.
      if (!TECHNIC_SET.has(hotbar[slot]) && tspec?.drive && sample.first && sample.place && !prevPlace) {
        toggleTechPart(tpart);
      }
    } else if (useBrick && bHit) {
      // P0: the crosshair is on a snapped brick.
      const bk = bHit.brick;
      const block = def(bk.id);
      hud.targetName = brickWelded(bHit.key) ? block.name + " · welded" : block.name;
      highlight.visible = !hud.hidden;
      highlight.position.set(bk.sx / 2 + 0.5, bk.sy + 0.5, bk.sz / 2 + 0.5);
      highlight.scale.set(1, 1, 1);
      studOutline.visible = false;
      const key = "B:" + bHit.key;
      if (sample.mine && block.hard !== Infinity && brickWelded(bHit.key) && hotbar[slot] !== ID.Shears) {
        // P2: a welded brick cannot be mined apart — cut the joint with
        // shears (normal mining then works and drops the weld), or melt
        // it in the foundry loop (P6). Everything else just sparks.
        if (mineKey !== key) say("Welded solid — cut it with shears");
        mineKey = key;
        mineTime = 0;
        hud.mine = 0;
        hideCrack();
      } else if (sample.mine && block.hard !== Infinity) {
        if (mineKey !== key) {
          mineKey = key;
          mineTime = 0;
        }
        mineTime += dt;
        const held = def(hotbar[slot]);
        // Same Minecraft mining model as voxel blocks (v4.18), against the brick's def.
        const cls = AXE_OK(bk.id) ? "axe" : SHOVEL_OK(bk.id) ? "shovel" : block.tough || block.need > 0 ? "pick" : "";
        const rightTool = cls !== "" && held.tool === cls;
        const TIER_SPEED = [1, 2, 4, 6, 8, 9];
        const speed = rightTool ? (TIER_SPEED[held.tier] ?? 1) : 1;
        const pickTier = held.tool === "pick" ? held.tier : 0;
        const canHarvest = !block.need || pickTier >= block.need;
        const slowRate = cls === "pick" && (!rightTool || !canHarvest);
        let need = creative ? 0.05 : (block.hard * (slowRate ? 5 : 1.5)) / speed;
        const eff = enchLvl(hotbar[slot], "efficiency");
        if (eff > 0 && rightTool) need = (block.hard * (slowRate ? 5 : 1.5)) / (speed + eff * eff + 1);
        if (rankLv >= 2) need /= 1.15;
        if (hammer && block.tough) need *= 0.38;
        hud.mine = Math.min(1, mineTime / Math.max(need, 0.01));
        hideCrack(); // v1: no crack overlay on bricks — hud.mine + sound carry it
        if (mineTime >= need) breakBrick(bHit.key);
      } else if (!sample.mine) {
        mineTime = 0;
        mineKey = "";
        hideCrack();
      }
      const heldId = hotbar[slot];
      if (heldId && def(heldId).placeable) {
        const hd = def(heldId);
        const dx = Math.floor(bk.sx / 2 + 0.5 + bHit.nx * 1.01);
        const dy = Math.floor(bk.sy + 0.5 + bHit.ny * 1.01);
        const dz = Math.floor(bk.sz / 2 + 0.5 + bHit.nz * 1.01);
        const cand = brickEligible(heldId, hd) ? brickSnapAssist(dx, dy, dz, bHit.nx, bHit.ny, bHit.nz) : null;
        if (cand) {
          const ok = brickSpaceFree(cand.sx, cand.sy, cand.sz) && !brickHitsPlayer(cand.sx / 2, cand.sy, cand.sz / 2) && (creative || (inv[heldId] ?? 0) > 0);
          updateGhostGeo(heldId);
          ghost.visible = true;
          ghost.position.set(cand.sx / 2 + 0.5, cand.sy + 0.5, cand.sz / 2 + 0.5);
          tmp.set(ok ? hd.color : "#e23b2f");
          ghostMat.color.copy(tmp);
          ghostMat.opacity = ok ? 0.42 : 0.28;
        } else {
          const dest = world.get(dx, dy, dz);
          const ok =
            dy > 0 &&
            dy < HEIGHT - 1 &&
            (dest === ID.Air || def(dest).plant || def(dest).fluid) &&
            !brickCellBlocked(dx, dy, dz) &&
            (!hd.solid || !hitsPlayer(dx, dy, dz)) &&
            (creative || (inv[heldId] ?? 0) > 0);
          ghost.visible = true;
          ghost.position.set(dx + 0.5, dy + 0.5, dz + 0.5);
          tmp.set(ok ? hd.color : "#e23b2f");
          ghostMat.color.copy(tmp);
          ghostMat.opacity = ok ? 0.42 : 0.28;
        }
      }
      const placeDown = sample.place;
      if ((sample.first && placeDown && !prevPlace) || (placeDown && placeCool <= 0 && prevPlace)) {
        placeCool = 0.18;
        tryPlaceBrick(bHit);
      }
    } else if (hit) {
      const block = def(hit.id);
      if (block.sign) {
        const t = signs.get(hit.x + "," + hit.y + "," + hit.z);
        hud.targetName = t ? "Sign — " + t : "Sign";
      } else hud.targetName = block.name;
      // F1 (clean screenshot mode, like Minecraft) also hides the block outline
      highlight.visible = !hud.hidden;
      highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
      highlight.scale.set(1, 1, 1);
      studOutline.visible = !hud.hidden && settings.studs && !def(world.get(hit.x, hit.y + 1, hit.z)).solid;
      const key = hit.x + "," + hit.y + "," + hit.z;
      // v4.16 — tufts tear FIRST: punching the top of a grass block strips
      // the tuft growing between its studs — instant, by hand, like MC
      // tall grass — and never touches the block underneath. The tear is
      // remembered (and saved); the next punch digs the block itself.
      if (sample.mine && hit.ny === 1 && hit.id === ID.Grass && TS.hasTuftAt(world, hit.x, hit.y + 1, hit.z)) {
        TS.tearTuft(hit.x, hit.y + 1, hit.z);
        markDirtyAt(hit.x, hit.z);
        burst(hit.x + 0.5, hit.y + 1.2, hit.z + 0.5, "#3aaa4c", 6);
        if (!creative && Math.random() < 0.3) dropItem(ID.Seeds, 1, hit.x + 0.5, hit.y + 1.35, hit.z + 0.5);
        mineKey = "";
        mineTime = 0;
        hideCrack();
      } else if (sample.mine && block.hard !== Infinity) {
        if (mineKey !== key) {
          mineKey = key;
          mineTime = 0;
          chipStage = -1;
          crackStageShown = -1;
        }
        mineTime += dt;
        const held = def(hotbar[slot]);
        // v4.18 — mining reworked on Minecraft's exact model (Philippe
        // 2026-10-28: « la résistance des blocs retravaillée selon l'outil,
        // comme dans Minecraft »): break seconds = hardness × rate / speed,
        // rate 1.5 (the ÷30 tick rate) normally, rate 5 (÷100) when the
        // block REQUIRES a pick and you lack the right class — or your pick
        // tier is too low to harvest it (that slow break drops nothing,
        // gated in breakBlock). Tool class comes from the block: axe
        // blocks, shovel blocks, pick blocks. Tier speeds are MC's:
        // hand 1, wood 2, stone 4, iron 6, diamond 8.
        const cls = AXE_OK(hit.id) ? "axe" : SHOVEL_OK(hit.id) ? "shovel" : block.tough || block.need > 0 ? "pick" : "";
        const rightTool = cls !== "" && held.tool === cls;
        const TIER_SPEED = [1, 2, 4, 6, 8, 9];
        let speed = rightTool ? (TIER_SPEED[held.tier] ?? 1) : 1;
        if (hotbar[slot] === ID.Shears && (hit.id === ID.Leaves || hit.id === ID.TallGrass || hit.id === ID.Web)) speed = 8;
        const pickTier = held.tool === "pick" ? held.tier : 0;
        const canHarvest = !block.need || pickTier >= block.need;
        const slowRate = cls === "pick" && (!rightTool || !canHarvest);
        let need = creative ? 0.05 : (block.hard * (slowRate ? 5 : 1.5)) / speed;
        const eff = enchLvl(hotbar[slot], "efficiency");
        if (eff > 0 && rightTool) need = (block.hard * (slowRate ? 5 : 1.5)) / (speed + eff * eff + 1);
        if (rankLv >= 2) need /= 1.15;
        if (hammer && block.tough) need *= 0.38;
        hud.mine = Math.min(1, mineTime / Math.max(need, 0.01));
        // v4.14 — the block visibly crumbles: crack overlay grows with
        // progress, and each new damage stage knocks chips off the face.
        const dmgStage = Math.floor(hud.mine * 6);
        if (dmgStage > chipStage) {
          if (chipStage >= 0) {
            if (chippable(hit.id)) {
              // v4.17 Teardown LEGO: each damage stage knocks the two
              // outermost LEGO pieces off the face being hit — the block
              // visibly comes apart brick by brick as you mine it.
              const rm = CH.removedAt(hit.x, hit.y, hit.z, hit.id);
              const depth = (p: number) => {
                const [ix, iy, iz] = CH.pieceCoords(p);
                return hit.nx > 0 ? 1 - ix : hit.nx < 0 ? ix : hit.ny > 0 ? 2 - iy : hit.ny < 0 ? iy : hit.nz > 0 ? 1 - iz : iz;
              };
              const left: number[] = [];
              for (let p = 0; p < 12; p++) if (!(rm & (1 << p))) left.push(p);
              left.sort((a, b) => depth(a) - depth(b) || Math.random() - 0.5);
              chipPieces(hit.x, hit.y, hit.z, left.slice(0, 2), () => [
                hit.nx * 2.2 + (Math.random() - 0.5) * 1.4,
                1.6 + hit.ny * 1.5 + Math.random() * 1.2,
                hit.nz * 2.2 + (Math.random() - 0.5) * 1.4,
              ], { n: 2 });
            } else {
              burst(
                hit.x + 0.5 + hit.nx * 0.55 + (Math.random() - 0.5) * 0.3,
                hit.y + 0.5 + hit.ny * 0.55 + (Math.random() - 0.5) * 0.3,
                hit.z + 0.5 + hit.nz * 0.55 + (Math.random() - 0.5) * 0.3,
                block.side || block.color,
                3,
              );
            }
          }
          chipStage = dmgStage;
        }
        showCrack(hit.x, hit.y, hit.z, hud.mine);
        if (mineTime >= need) breakBlock(hit.x, hit.y, hit.z);
      } else if (!sample.mine) {
        mineTime = 0;
        mineKey = "";
        hideCrack();
      }
      const held = hotbar[slot];
      if (held && def(held).placeable) {
        const px = hit.x + hit.nx;
        const py = hit.y + hit.ny;
        const pz = hit.z + hit.nz;
        // P0: when the aim snaps to the stud lattice, the ghost shows the BRICK.
        const cand = !freePlace && brickEligible(held, def(held)) ? brickSnapAssist(px, py, pz, hit.nx, hit.ny, hit.nz) : null;
        if (cand) {
          const ok = brickSpaceFree(cand.sx, cand.sy, cand.sz) && !brickHitsPlayer(cand.sx / 2, cand.sy, cand.sz / 2) && (creative || (inv[held] ?? 0) > 0);
          updateGhostGeo(held);
          ghost.visible = true;
          ghost.position.set(cand.sx / 2 + 0.5, cand.sy + 0.5, cand.sz / 2 + 0.5);
          tmp.set(ok ? def(held).color : "#e23b2f");
          ghostMat.color.copy(tmp);
          ghostMat.opacity = ok ? 0.42 : 0.28;
        } else {
          const dest = world.get(px, py, pz);
          const ok =
            py > 0 &&
            py < HEIGHT - 1 &&
            (dest === ID.Air || def(dest).plant || def(dest).fluid) &&
            !brickCellBlocked(px, py, pz) &&
            (!def(held).solid || !hitsPlayer(px, py, pz)) &&
            (creative || (inv[held] ?? 0) > 0);
          ghost.visible = true;
          ghost.position.set(px + 0.5, py + 0.5, pz + 0.5);
          tmp.set(ok ? def(held).color : "#e23b2f");
          ghostMat.color.copy(tmp);
          ghostMat.opacity = ok ? 0.42 : 0.28;
        }
      }
      const placeDown = sample.place;
      if ((sample.first && placeDown && !prevPlace) || (placeDown && placeCool <= 0 && prevPlace)) {
        placeCool = 0.18;
        tryPlace(hit);
      }
    } else {
      mineTime = 0;
      mineKey = "";
      hideCrack();
      const heldId = hotbar[slot];
      if (heldId) {
        const held = def(heldId);
        hud.targetName = held.maxUse ? held.name + " · " + (inv[heldId] ?? 0) + " left" : held.name;
        if (heldId === ID.Bow || heldId === ID.Crossbow) hud.targetName += " · " + (inv[ID.Arrow] ?? 0) + " arrows";
        else if (held.food) hud.targetName += " · +" + held.food;
      }
      if (sample.first && sample.place && !prevPlace) {
        if (heldId === ID.Tome) castSpell();
        else if (heldId === ID.Bow || heldId === ID.Crossbow) shootHeld();
        else if (heldId === ID.Trident) throwTrident();
        else if (heldId === ID.Firework) launchFirework();
        else if (heldId === ID.Eye) hopRealm(2);
        else if (heldId === ID.PotionHeal || heldId === ID.PotionSpeed || heldId === ID.PotionStr || heldId === ID.Focus || heldId === ID.Milk || heldId === ID.Gapple || heldId === ID.PotionRegen || heldId === ID.PotionFire || heldId === ID.PotionLeap || heldId === ID.PotionGill || heldId === ID.PotionVeil || heldId === ID.PotionVenom || heldId === ID.PotionTar) drink(heldId);
        else if (heldId === ID.SplashVenom || heldId === ID.SplashTar) throwSplash(heldId);
        else if (heldId === ID.EnderPearl) pearlHop();
        else if (def(heldId).food) eat();
      }
    }
    // Technic: execute the planned placement (pre-pass above) on the
    // same place-button cadence as blocks/bricks; the block ghost never
    // shows while a Technic part is held.
    if (TECHNIC_SET.has(hotbar[slot])) ghost.visible = false;
    if (techPlanNow) {
      const placeDown = sample.place;
      if ((sample.first && placeDown && !prevPlace) || (placeDown && placeCool <= 0 && prevPlace)) {
        placeCool = 0.18;
        tryPlaceTech(techPlanNow);
      }
    }
    if (!hud.targetName && hotbar[slot]) {
      const id = hotbar[slot];
      const held = def(id);
      hud.targetName = held.maxUse ? held.name + " · " + (inv[id] ?? 0) + " left" : held.name;
      if (id === ID.Bow) hud.targetName += " · " + (inv[ID.Arrow] ?? 0) + " arrows";
      else if (held.food) hud.targetName += " · +" + held.food;
    }
    if (sample.place) placeCool -= dt;
    else placeCool = 0;
    prevPlace = sample.place;

    if (!creative && phase === "play") {
      const moving = Math.hypot(player.vx, player.vz) > 0.5;
      hungerEx += dt * (sample.sprint && moving ? 0.28 : moving ? 0.1 : 0.025) * (rankLv >= 4 ? 0.78 : 1);
      if (bodyWater) hungerEx += dt * 0.05;
      if (hungerEx > 4) {
        hungerEx = 0;
        if (hunger > 0) hunger -= 1;
      }
      if (settings.mods.spells) {
        const maxMana = manaMaxFor(skills);
        mana = Math.min(maxMana, mana + dt * (skills.has("scribe") ? 1.35 : skills.has("blink") ? 1.15 : 0.65));
      }
      regenAcc += dt;
      if (hunger >= 18 && health < 20 && regenAcc > 1.4) {
        health += 1;
        regenAcc = 0;
      }
      if (hunger <= 0 && regenAcc > 2.5) {
        hurt(1);
        regenAcc = 0;
      }
    }
    if (mount && !mount.dead) {
      const sp = mount.kind === "horse" ? 8.4 : mount.kind === "boat" ? 6.2 : 7.2;
      if (sample.str) mount.yaw -= sample.str * dt * 1.7;
      const drive = mount.kind === "cart" ? 1 : sample.fwd;
      const fx = -Math.sin(mount.yaw);
      const fz = -Math.cos(mount.yaw);
      const nx = mount.x + fx * drive * sp * dt;
      const nz = mount.z + fz * drive * sp * dt;
      const onRail = def(world.get(Math.floor(mount.x), Math.floor(mount.y - 0.05), Math.floor(mount.z))).rail;
      if (mount.kind !== "cart" || onRail || Math.abs(drive) > 0) {
        if (!solidAt(Math.floor(nx), Math.floor(mount.y + 0.4), Math.floor(nz))) {
          mount.x = nx;
          mount.z = nz;
          mount.y = groundY(nx, nz);
        }
      }
      player.x = mount.x;
      player.y = mount.y + 0.2;
      player.z = mount.z;
      player.vx = 0;
      player.vz = 0;
      player.vy = 0;
      player.grounded = true;
      if (sample.sneak) {
        mount = null;
        player.y += 1.1;
      }
    }

    if (Math.hypot(sample.fwd, sample.str) > 0.2 && player.grounded) {
      /* bob advanced above */
    }
  }

  // ---- Music director -------------------------------------------------
  // Philippe's Suno loops, by context. Menu + day share the day list; the
  // Nether and boss fights have their own. Tracks alternate with random
  // silence gaps between them (35-90 s) - the game breathes. A playing
  // track always finishes; the list is re-picked when the next one starts.
  const MUSIC_LISTS: Record<string, string[]> = {
    day: ["./music/music-day-1.mp3", "./music/music-day-2.mp3", "./music/music-day-3.mp3", "./music/music-day-4.mp3"],
    night: ["./music/music-night-1.mp3", "./music/music-night-2.mp3", "./music/music-night-3.mp3", "./music/music-night-4.mp3"],
    nether: ["./music/music-nether-1.mp3", "./music/music-nether-2.mp3"],
    boss: ["./music/music-boss-1.mp3", "./music/music-boss-2.mp3", "./music/music-boss-3.mp3", "./music/music-boss-4.mp3"],
  };
  const musicEl = new Audio();
  const musicBase = () => 0.45 * settings.music;
  musicEl.volume = musicBase();
  musicEl.preload = "auto";
  let musicArmed = false; // browsers refuse audio before the first gesture
  let musicGap = 4; // first track starts soon after the first tap
  let musicCtx = "";
  const musicIdx: Record<string, number> = { day: 0, night: 0, nether: 0, boss: 0 };
  window.addEventListener("pointerdown", () => { musicArmed = true; }, { capture: true });
  window.addEventListener("keydown", () => { musicArmed = true; }, { capture: true });
  musicEl.addEventListener("ended", () => { musicGap = 35 + Math.random() * 55; });
  musicEl.addEventListener("error", () => { musicGap = 20; });
  function musicContext(): string {
    if (phase === "play") {
      if (mobs.some((m) => !m.dead && (m.kind === "dragon" || m.kind === "wither"))) return "boss";
      if (realm === 2) return "nether";
      return Math.sin(worldTime * Math.PI * 2) < -0.12 ? "night" : "day";
    }
    return "day"; // title screen runs the day list
  }
  // Jukebox (v3.8): a placed disc outranks the context director while the
  // player is near its jukebox — the track loops, fading with distance.
  const DISC_TRACKS: Record<number, string> = {
    [ID.DiscA]: "./music/music-day-3.mp3",
    [ID.DiscB]: "./music/music-night-2.mp3",
    [ID.DiscC]: "./music/music-nether-1.mp3",
    [ID.DiscD]: "./music/music-boss-2.mp3",
    [ID.DiscE]: "./music/music-day-1.mp3",
  };
  function activeJukebox(): { disc: number; dist: number } | null {
    let best: { disc: number; dist: number } | null = null;
    for (const [key, disc] of jukeDiscs) {
      const [x, y, z] = key.split(",").map(Number);
      if (world.get(x, y, z) !== ID.Jukebox) continue;
      const dist = Math.hypot(player.x - (x + 0.5), player.y - y, player.z - (z + 0.5));
      if (dist <= 42 && (!best || dist < best.dist)) best = { disc, dist };
    }
    return best;
  }
  function musicTick(dt: number) {
    if (!musicEl.loop && Math.abs(musicEl.volume - musicBase()) > 0.01) musicEl.volume = musicBase();
    if (!settings.sound || settings.music <= 0) {
      if (!musicEl.paused) musicEl.pause();
      return;
    }
    const jb = phase === "play" ? activeJukebox() : null;
    if (jb) {
      const src = DISC_TRACKS[jb.disc];
      musicEl.loop = true;
      musicEl.volume = musicBase() * Math.max(0.12, 1 - jb.dist / 46);
      if (!musicEl.src.endsWith(src.slice(1))) musicEl.src = src;
      if (musicEl.paused && musicArmed) musicEl.play().catch(() => {});
      return;
    }
    if (musicEl.loop) {
      musicEl.loop = false;
      musicEl.volume = musicBase();
      if (!musicEl.paused) musicEl.pause();
      musicGap = 2;
    }
    if (!musicEl.paused) return; // a track is playing: let it finish
    if (!musicArmed) return;
    musicCtx = musicContext();
    musicGap -= dt;
    if (musicGap > 0) return;
    const list = MUSIC_LISTS[musicCtx];
    const src = list[musicIdx[musicCtx] % list.length];
    musicIdx[musicCtx]++;
    musicEl.src = src;
    musicEl.play().catch(() => { musicGap = 6; });
  }

  function sky(dt: number) {
    const step = dt / MC_DAY_SECONDS;
    const nextTime = (worldTime + step) % 1;
    if (nextTime < worldTime) {
      worldDays++;
      saveDirty = true;
    }
    worldTime = nextTime;

    // Villager restock (v3.9): twice a day, morning and afternoon.
    for (const mark of [0.04, 0.3]) {
      const crossed = (prevWorldTime < mark && worldTime >= mark) || (worldTime < prevWorldTime && (mark >= prevWorldTime || mark < worldTime));
      if (crossed) restockTrades();
    }
    prevWorldTime = worldTime;
    musicTick(dt);
    // Weather director easing (v3.7): live values trail the state over
    // ~10 s, and the cloud deck drifts with the eased wind.
    const wxDef = WX_DEF[wx];
    const wk = 1 - Math.exp(-dt * 0.22);
    wxCur.cover += (wxDef.cover - wxCur.cover) * wk;
    wxCur.dark += (wxDef.dark - wxCur.dark) * wk;
    wxCur.precip += (wxDef.precip - wxCur.precip) * wk;
    wxCur.fog += (wxDef.fog - wxCur.fog) * wk;
    wxCur.wind += (wxDef.wind - wxCur.wind) * wk;
    wxCur.storm += ((wx === "storm" ? 1 : 0) - wxCur.storm) * wk;
    deckU.uDrift.value.x += dt * 0.011 * wxCur.wind;
    deckU.uDrift.value.y += dt * 0.003 * wxCur.wind;
    const ang = worldTime * Math.PI * 2;
    const sunH = Math.sin(ang);
    const sunX = Math.cos(ang);
    const isSunrise = sunX >= 0;

    // Smooth C1 continuous celestial interpolation (v4.11)
    // dayF smoothly eases day<->night across the horizon without any popping.
    // goldenF peaks during sunrise and sunset transitions.
    const dayF = THREE.MathUtils.smoothstep(sunH, -0.10, 0.25);
    const goldenF = Math.max(0, 1 - Math.abs(sunH) / 0.26);

    const nightFog = lerpHex(0x050a18, 0x0c1b33, Math.max(0, (sunH + 1) * 0.5));
    const twilightGlow = isSunrise ? 0xfba472 : 0xf56230;
    let fogHex = lerpHex(nightFog, 0x8ec8f5, dayF);
    if (goldenF > 0.01) {
      fogHex = lerpHex(fogHex, twilightGlow, goldenF * 0.38);
    }
    if (realm === 0 && wxCur.dark > 0.01) fogHex = lerpHex(fogHex, 0x87919c, wxCur.dark * 0.55);
    renderer.setClearColor(fogHex, 1);
    const fog = scene.fog as THREE.Fog;
    fog.color.setHex(fogHex);
    const far = effRadius() * CS + 18;
    fog.near = far * 0.42;
    fog.far = far;
    if (realm === 0) {
      fog.near *= wxCur.fog;
      fog.far *= wxCur.fog;
    }
    // Underwater: when the camera's eye block is a fluid, collapse the fog
    // into a dense tint (the dome colors are bent to match below).
    const eyeDef = def(world.get(Math.floor(camera.position.x), Math.floor(camera.position.y), Math.floor(camera.position.z)));
    const submerged = !!eyeDef.fluid;
    const uwHex = eyeDef.id === ID.Lava ? 0xc7430d : 0x14507a;
    if (submerged) {
      fog.color.setHex(uwHex);
      renderer.setClearColor(uwHex, 1);
      fog.near = 0.5;
      fog.far = eyeDef.id === ID.Lava ? 7 : 24;
    }
    const camFar = Math.max(420, far + 280);
    if (camera.far !== camFar) {
      camera.far = camFar;
      camera.updateProjectionMatrix();
    }
    // Continuous light grading: hemisphere eases into deep nocturnal blue, the sun
    // warms to rich amber at the horizon and becomes cool silver-blue moonlight
    // after dark with genuine nocturnal contrast.
    const hemiDay = 0xd4ebff;
    const hemiNight = 0x16243c;
    const hemiSunset = 0xffc488;
    let hemiSky = lerpHex(hemiNight, hemiDay, dayF);
    if (goldenF > 0.01) hemiSky = lerpHex(hemiSky, hemiSunset, goldenF * 0.28);
    hemi.color.setHex(hemiSky);
    hemi.groundColor.setHex(lerpHex(0x08101a, 0x6b8450, dayF));

    const middaySun = 0xfff8ee;
    const goldenSun = isSunrise ? 0xffb068 : 0xff7c38;
    const sunDayCol = lerpHex(goldenSun, middaySun, Math.min(1, Math.max(0, sunH * 2.2)));
    const moonCol = 0x82a5dc;
    sun.color.setHex(lerpHex(moonCol, sunDayCol, dayF));
    ambient.color.setHex(lerpHex(0x18243a, 0xfff6ea, dayF));

    const lightX = sunH >= -0.02 ? sunX : -sunX;
    const lightY = sunH >= -0.02 ? Math.max(0.22, sunH) : Math.max(0.28, -sunH * 0.85);
    srnLightU.uSunDir.value.set(lightX, lightY, 0.32).normalize();
    srnLightU.uSunCol.value.copy(sun.color);
    srnLightU.uSkyCol.value.copy(hemi.color);
    srnLightU.uDayF.value = dayF;
    if (settings.realistic) {
      hemi.intensity = 0.16 + dayF * 0.44;
      ambient.intensity = 0.08 + dayF * 0.16;
      sun.intensity = 0.22 + dayF * (0.42 + 0.68 * Math.min(1, Math.max(0, sunH * 1.6))) * 1.68;
      scene.environmentIntensity = 0.10 + dayF * 0.38;
      renderer.toneMappingExposure = 0.94 + dayF * 0.10;
      const texel = 60 / (narrow ? 1024 : 2048);
      const px = Math.round(player.x / texel) * texel;
      const py = Math.round((player.y + 1) / texel) * texel;
      const pz = Math.round(player.z / texel) * texel;
      const lift = 48;
      sun.target.position.set(px, py, pz);
      sun.position.set(px + lightX * lift, py + Math.max(14, lightY * lift + 14), pz + 16);
      sun.castShadow = true;
      sun.shadow.intensity = sunH >= -0.02
        ? THREE.MathUtils.clamp((sunH + 0.02) / 0.12, 0.25, 1)
        : THREE.MathUtils.clamp((-sunH - 0.02) / 0.18, 0.22, 0.62);
    } else {
      hemi.intensity = 0.22 + dayF * 0.42;
      ambient.intensity = 0.16 + dayF * 0.16;
      sun.intensity = 0.18 + dayF * 0.82;
      sun.position.set(lightX * 60, lightY * 50 + 8, 24);
      sun.castShadow = false;
    }
    if (realm === 0) sun.intensity *= 1 - wxCur.cover * 0.45;
    sunMesh.position.set(player.x + sunX * 150, player.y + sunH * 90 + 10, player.z + 30);
    moonMesh.position.set(player.x - sunX * 150, player.y - sunH * 90 + 16, player.z - 20);
    sunMesh.visible = sunH > -0.1;
    moonMesh.visible = sunH < 0.25;
    (stars.material as THREE.PointsMaterial).opacity = Math.max(0, Math.min(1, -sunH * 1.4));
    stars.position.set(player.x, 0, player.z);

    const nightZen = lerpHex(0x02040c, 0x091224, Math.max(0, (sunH + 1) * 0.5));
    const dayZen = 0x1b6fd8;
    const twilightZen = isSunrise ? 0x224878 : 0x362c5c;
    let zenHex = lerpHex(nightZen, dayZen, dayF);
    if (goldenF > 0.01) {
      zenHex = lerpHex(zenHex, twilightZen, goldenF * 0.35);
    }
    if (realm === 0 && wxCur.dark > 0.01) zenHex = lerpHex(zenHex, 0x59636e, wxCur.dark * 0.5);
    if (submerged) {
      skyU.topColor.value.setHex(lerpHex(uwHex, 0x000000, 0.35));
      skyU.horizonColor.value.setHex(uwHex);
    } else {
      skyU.topColor.value.setHex(zenHex);
      skyU.horizonColor.value.setHex(fogHex);
    }
    skyU.sunDirection.value.set(sunX, sunH, 0.18).normalize();
    skyU.uGlow.value = THREE.MathUtils.clamp(sunH * 1.8 + 0.25, 0, 1);
    skyDome.position.set(player.x, player.y, player.z);
    // Cloud deck + rain (v3.7). The deck replaces the slab clouds in
    // Realistic mode; Performance keeps the slabs untouched.
    clouds.visible = !settings.realistic;
    const deckOn = settings.realistic && realm === 0 && !submerged;
    deck.visible = deckOn;
    if (deckOn) {
      deck.position.set(player.x, player.y + 88, player.z);
      deckU.uCover.value = wxCur.cover;
      deckU.uDark.value = wxCur.dark;
      deckU.uDayF.value = dayF;
      deckU.uSunDir.value.copy(skyU.sunDirection.value);
      deckU.uSunCol.value.copy(skyU.sunColor.value);
      deckU.uCam.value.copy(camera.position);
    }
    const rainOn = realm === 0 && !submerged && wxCur.precip > 0.03;
    rainLines.visible = rainOn;
    rainPts.visible = rainOn;
    if (rainOn) {
      // Item 13: density follows the eased precip, and a storm draws denser
      // (full budget vs rain's 70%) and falls faster than plain rain.
      const dens = Math.min(1, wxCur.precip * (0.7 + 0.55 * wxCur.storm));
      const fallBoost = 1 + 0.45 * wxCur.storm;
      (rainLines.material as THREE.LineBasicMaterial).opacity = 0.34 * wxCur.precip * (0.35 + 0.65 * dayF);
      const fall = (21 + wxCur.wind * 5) * fallBoost * dt;
      const slantX = wxCur.wind * 0.55;
      const cx = camera.position.x;
      const cy = camera.position.y;
      const cz = camera.position.z;
      rainStreaksShown = Math.round(RAIN_N * dens);
      rainGeo.setDrawRange(0, rainStreaksShown * 2);
      for (let i = 0; i < rainStreaksShown; i++) {
        let oy = rainOff[i * 3 + 1] - fall * (0.85 + (i % 7) * 0.04);
        if (oy < -3) oy += 29;
        rainOff[i * 3 + 1] = oy;
        const ox = rainOff[i * 3];
        const oz = rainOff[i * 3 + 2];
        const j = i * 6;
        rainPos[j] = cx + ox;
        rainPos[j + 1] = cy + oy;
        rainPos[j + 2] = cz + oz;
        rainPos[j + 3] = cx + ox + slantX;
        rainPos[j + 4] = cy + oy - 1.15;
        rainPos[j + 5] = cz + oz + slantX * 0.3;
      }
      (rainGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      // Droplet spray: faster than the streaks, drifts sideways with the
      // wind, recycled in its own box around the camera.
      rainPtsShown = Math.round(RAIN_PTS * dens);
      rainPtGeo.setDrawRange(0, rainPtsShown);
      (rainPts.material as THREE.PointsMaterial).opacity = 0.55 * wxCur.precip * (0.35 + 0.65 * dayF);
      const fallP = (30 + wxCur.wind * 7) * fallBoost * dt;
      const driftX = wxCur.wind * 1.5 * dt;
      for (let i = 0; i < rainPtsShown; i++) {
        let oy = rainPtOff[i * 3 + 1] - fallP * (0.85 + (i % 5) * 0.06);
        if (oy < -4) oy += 34;
        rainPtOff[i * 3 + 1] = oy;
        let ox = rainPtOff[i * 3] + driftX;
        if (ox > 15) ox -= 30;
        rainPtOff[i * 3] = ox;
        const j = i * 3;
        rainPtPos[j] = cx + ox;
        rainPtPos[j + 1] = cy + oy;
        rainPtPos[j + 2] = cz + rainPtOff[i * 3 + 2];
      }
      (rainPtGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    } else {
      rainStreaksShown = 0;
      rainPtsShown = 0;
    }
  }

  /** v4.13: first-person arm motion — equip, breathing, walk figure-8, look lag,
   *  attack arc, landing dip and sprint carry. All offsets are in camera space. */
  function animateViewmodel(dt: number) {
    const k = reduceMotion ? 0.35 : 1;
    const grounded = player.grounded;
    if (!grounded) vm.fallV = Math.min(vm.fallV, player.vy);
    if (grounded && !vm.wasGrounded && vm.fallV < -3) vm.land = Math.min(1, -vm.fallV / 14);
    if (grounded) vm.fallV = 0;
    vm.wasGrounded = grounded;
    vm.land = Math.max(0, vm.land - dt * 3.2);
    vm.equip = Math.max(0, vm.equip - dt * 3.2);
    const moving = Math.hypot(player.vx, player.vz) > 0.8 && grounded;
    vm.sprint += ((isSprinting() && moving ? 1 : 0) - vm.sprint) * Math.min(1, dt * 6);
    // Look lag: the arm trails behind fast turns, then springs back.
    let dYaw = player.yaw - vm.lastYaw;
    while (dYaw > Math.PI) dYaw -= Math.PI * 2;
    while (dYaw < -Math.PI) dYaw += Math.PI * 2;
    const dPitch = player.pitch - vm.lastPitch;
    vm.lastYaw = player.yaw;
    vm.lastPitch = player.pitch;
    const tx = THREE.MathUtils.clamp(dYaw * 1.6, -0.09, 0.09);
    const ty = THREE.MathUtils.clamp(dPitch * 1.6, -0.07, 0.07);
    vm.swayX += (tx - vm.swayX) * Math.min(1, dt * 10);
    vm.swayY += (ty - vm.swayY) * Math.min(1, dt * 10);
    // Attack arc: fast strike, eased recovery. p goes 0 → 1 over the swing.
    const p = 1 - swing;
    const arc = swing > 0 ? Math.sin(Math.min(1, p * 1.35) * Math.PI) : 0;
    const strike = swing > 0 ? Math.sin(Math.min(1, p * 2.2) * Math.PI * 0.5) * (1 - p) : 0;
    const eq = vm.equip * vm.equip * (3 - 2 * vm.equip);
    const walkX = Math.sin(bob) * 0.016 * bobAmp * (1 + vm.sprint * 0.8);
    const walkY = -Math.abs(Math.cos(bob)) * 0.02 * bobAmp * (1 + vm.sprint * 0.8);
    const breathe = Math.sin(elapsed * 1.8) * 0.004 * (1 - bobAmp);
    const landY = -Math.sin(vm.land * Math.PI) * 0.06 * vm.land;
    // Minecraft's attack swing (ItemInHandRenderer.applyItemArmAttackTransform),
    // around the arm anchor, p = 0 -> 1 over the swing:
    //   translate(-0.4·sin(√p·π), 0.2·sin(√p·2π), -0.2·sin(p·π))
    //   rotY(45 - 20·sin(p²·π)) · rotZ(-20·sin(√p·π)) · rotX(-80·sin(√p·π)) · rotY(-45)
    const sw = swing > 0 ? p : 0;
    const sq = Math.sqrt(sw);
    const fA = Math.sin(sw * sw * Math.PI), gA = Math.sin(sq * Math.PI);
    const D2R = Math.PI / 180;
    const holding = heldBrickGroup.visible && lastHeldId > 0;
    const swT = holding ? 0.35 : 0.5; // holding: the hand stays put, the item does the chop; bare hand: half travel (see the !holding branch below)
    const ax = (holding ? (heldKind ? mcTune.bx : mcTune.ax) : MC_ANCHOR.x) - 0.4 * gA * swT + (walkX + vm.swayX * 0.5 + vm.sprint * 0.03) * 2.2 * k;
    const ay = (holding ? (heldKind ? mcTune.by : mcTune.ay) : MC_ANCHOR.y) + 0.2 * Math.sin(sq * Math.PI * 2) * swT + (walkY + breathe + landY - vm.swayY * 0.4 - vm.sprint * 0.05) * 2.2 * k - eq * 0.6;
    const az = (holding ? (heldKind ? mcTune.bz : mcTune.az) : MC_ANCHOR.z) - 0.2 * Math.sin(sw * Math.PI);
    viewBrick.scale.setScalar(MC_K);
    viewBrick.position.set(ax * MC_K, ay * MC_K, az * MC_K);
    const qa = new THREE.Quaternion()
      .setFromAxisAngle(Y_AXIS, (45 - 20 * fA) * D2R)
      .multiply(new THREE.Quaternion().setFromAxisAngle(Z_AXIS, -20 * gA * D2R))
      .multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, -80 * gA * D2R * 0.7))
      .multiply(new THREE.Quaternion().setFromAxisAngle(Y_AXIS, -45 * D2R));
    // small look-lag / sprint / bob tilt on top (no effect at rest)
    qa.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler((-vm.sprint * 0.2 - vm.swayY * 0.4) * k, vm.swayX * 0.6 * k, (walkX * 0.8 + vm.sprint * 0.1) * k, "XYZ")));
    if (!holding) {
      // Bare hand (Philippe, 2026-10-29, photo in a tunnel): the FULL
      // Minecraft attack pivot rotates the whole viewmodel up to -56
      // degrees and drags the anchor toward the centre — with a chunky
      // LEGO forearm that puts the sleeve's open end dead centre, and
      // mining retriggers the swing on every hit, so tunnelling meant
      // digging blind behind your own arm. The held-item path avoided
      // this with a wrist motion; the bare hand gets the same respect:
      // the swing is damped to 45% of the rotation (and half the
      // translation, via swT above) — the strike still reads, the fist
      // stays in the lower-right quadrant where an arm belongs.
      viewBrick.quaternion.copy(_identityQ).slerp(qa, 0.45);
      fpsClaw.quaternion.copy(clawRest);
    } else {
      // holding: the swing is a WRIST motion — the hand (clip) and the item
      // turn together about the grip, the forearm stays put (pivoting the
      // whole arm swept the forearm and its open end across the screen)
      viewBrick.quaternion.identity();
      const g = fpsArmGroup.position;
      heldBrickGroup.quaternion.copy(qa).multiply(heldBase.quat);
      heldBrickGroup.position.copy(heldBase.pos).sub(g).applyQuaternion(qa).add(g);
      const aq = fpsArmGroup.quaternion;
      fpsClaw.quaternion.copy(aq).invert().multiply(qa).multiply(aq).multiply(clawRest);
    }
    void arc; void strike; void heldIsTool;
  }

  function renderCamera(dt: number) {
    const sneak = isSneaking();
    const eye = player.y + (sneak && !flying ? EYE_SNEAK : EYE);
    // v4.12: fade the head-bob in/out — the old hard grounded gate made the
    // camera tremble whenever the physics step flickered at low frame rates.
    const bobTarget = phase === "play" && player.grounded && !reduceMotion && Math.hypot(player.vx, player.vz) > 0.4 ? 1 : 0;
    bobAmp += (bobTarget - bobAmp) * Math.min(1, dt * 9);
    const bobY = Math.sin(bob) * 0.045 * bobAmp;
    camera.rotation.order = "YXZ";
    if (!settings.third || phase === "title") {
      camera.rotation.y = player.yaw;
      camera.rotation.x = player.pitch;
    }
    const baseFov = settings.fov;
    camera.fov = THREE.MathUtils.lerp(camera.fov, isSprinting() && phase === "play" && !flying ? baseFov + 8 : baseFov, 0.1);
    camera.updateProjectionMatrix();
    if (phase === "title") {
      if (!reduceMotion) orbit += dt * 0.15;
      const dist = 22;
      camera.position.set(
        spawnPoint.x + Math.sin(orbit) * dist,
        spawnPoint.y + 11,
        spawnPoint.z + Math.cos(orbit) * dist,
      );
      camera.lookAt(spawnPoint.x, spawnPoint.y + 1.5, spawnPoint.z);
      fig.group.visible = false;
      viewBrick.visible = false;
    } else if (settings.third) {
      // v4.17 aim fix: over-the-shoulder camera ALIGNED with the look direction
      // (it used to lookAt the player's back, so the crosshair sat on the
      // minifig while the targeted block was elsewhere). The target ray is
      // cast from this camera (see thirdAim), so crosshair = target, exactly.
      const cp = Math.cos(player.pitch);
      const fx = -Math.sin(player.yaw) * cp, fy = Math.sin(player.pitch), fz = -Math.cos(player.yaw) * cp;
      const rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
      const ex = player.x, ey = player.y + EYE, ez = player.z;
      const want = 4.2, sh = 0.62, up = 0.28;
      let dist = want;
      for (let i = 1; i <= 14; i++) {
        const t = i / 14;
        const sx = ex - fx * want * t + rx * sh * t, sy = ey - fy * want * t + up * t, sz = ez - fz * want * t + rz * sh * t;
        if (solidAt(Math.floor(sx), Math.floor(sy), Math.floor(sz))) {
          dist = Math.max(0.6, want * ((i - 1.5) / 14));
          break;
        }
      }
      const k = dist / want;
      camera.position.set(ex - fx * dist + rx * sh * k, ey - fy * dist + up * k, ez - fz * dist + rz * sh * k);
      camera.rotation.order = "YXZ";
      camera.rotation.y = player.yaw;
      camera.rotation.x = player.pitch;
      camera.rotation.z = 0;
      thirdAim.ok = true;
      thirdAim.x = camera.position.x; thirdAim.y = camera.position.y; thirdAim.z = camera.position.z;
      thirdAim.back = Math.hypot(camera.position.x - ex, camera.position.y - ey, camera.position.z - ez);
      fig.group.visible = true;
      updateFigArmor();
      fig.group.position.set(player.x, player.y + (settings.studs ? STUD_H : 0), player.z);
      const moving = Math.hypot(player.vx, player.vz) > 0.4;
      const face = moving ? Math.atan2(-player.vx, -player.vz) : player.yaw;
      fig.group.rotation.y = face;
      const figHead = fig.group.userData.head as THREE.Object3D | undefined;
      if (figHead) {
        figHead.rotation.x = THREE.MathUtils.clamp(player.pitch * 0.6, -0.5, 0.5);
        figHead.rotation.y = moving ? THREE.MathUtils.clamp(player.yaw - face, -0.65, 0.65) : 0;
      }
      const swingLeg = Math.sin(bob) * 0.7 * bobAmp;
      fig.legL.rotation.x = swingLeg;
      fig.legR.rotation.x = -swingLeg;
      fig.armL.rotation.x = -swingLeg;
      fig.armR.rotation.x = swingLeg - swing * 0.95;
      viewBrick.visible = false;
    } else {
      camera.position.set(player.x, eye + bobY, player.z);
      thirdAim.ok = false;
      fig.group.visible = false;
      viewBrick.visible = phase === "play";
    }
    shake = Math.max(0, shake - dt * 1.4);
    if (shake > 0) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
    }
    flash = Math.max(0, flash - dt * 1.6);
    hud.flash = flash;
    const held = hotbar[slot] || 0;
    if (held !== lastHeldId || plasticOn !== lastHeldPlastic) {
      if (held !== lastHeldId) vm.equip = 1;
      lastHeldId = held;
      lastHeldPlastic = plasticOn;
      heldBrickGroup.clear();
      figHeldGroup.clear();
      heldFlames = [];
      if (!held) restArm();
      if (held) {
        const built1 = buildLegoItem3D(held);
        heldIsTool = built1.isTool;
        heldFlames = built1.flames;
        heldBrickGroup.add(built1.group);
        placeHeldMinecraft(held, built1.group, heldIsTool);

        const built3 = buildLegoItem3D(held);
        if (built3.isTool) {
          built3.group.scale.setScalar(1.35);
          built3.group.rotation.set(Math.PI / 2, Math.PI / 2, 0);
        } else {
          built3.group.scale.setScalar(1.1);
          built3.group.rotation.set(0.2, -0.4, 0);
        }
        if (plasticOn) {
          built3.group.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.isMesh) m.castShadow = true;
          });
        }
        figHeldGroup.add(built3.group);
      }
    }
    heldBrickGroup.visible = !!held;
    figHeldGroup.visible = !!held;
    // Animate internal 3D LEGO flames on held Furnace, Campfire, Torch, Lantern, Brew Stand, or Beacon
    for (let fi = 0; fi < heldFlames.length; fi++) {
      const fl = heldFlames[fi];
      const baseS = (fl.userData.baseScale as number) || 1;
      const pulse = 1 + Math.sin(elapsed * 14 + fi * 2.1) * 0.12 + Math.cos(elapsed * 23 + fi) * 0.06;
      fl.scale.set(baseS * (1 + (pulse - 1) * 0.5), baseS * pulse, baseS * (1 + (pulse - 1) * 0.5));
      fl.rotation.y = Math.sin(elapsed * 6 + fi) * 0.25;
    }
    swing = Math.max(0, swing - dt * 3.4);
    animateViewmodel(dt);
    for (const c of cloudData) {
      c.ox += dt * 1.4;
      if (c.ox > 100) c.ox = -100;
    }
    for (let i = 0; i < cloudData.length; i++) {
      const c = cloudData[i];
      cloudDummy.position.set(player.x + c.ox, c.y, player.z + c.oz);
      cloudDummy.scale.set(c.s, 1, c.s * 0.75);
      cloudDummy.rotation.set(0, 0, 0);
      cloudDummy.updateMatrix();
      clouds.setMatrixAt(i, cloudDummy.matrix);
    }
    clouds.instanceMatrix.needsUpdate = true;
  }

  const timer = new THREE.Timer();
  timer.connect(document);
  let emitAcc = 0;
  let running = true;
  let viewW = 0;
  let viewH = 0;
  let viewPR = 0;
  /** Dynamic resolution: trims the internal render scale when frames run long (auto upscale only). */
  let prScale = 1;
  let idleTick = 0;
  const upscaler = new Upscaler(renderer);
  function renderScale() {
    const base = upscaleScale(settings.upscale, touchMode, window.devicePixelRatio || 1);
    return settings.upscale === "auto" ? base * prScale : base;
  }
  function msaaSamples() {
    if (settings.quality === "performance") return 0;
    if (settings.quality === "high") return 4;
    return touchMode ? 2 : 4;
  }
  function present() {
    upscaler.aces = renderer.toneMapping === THREE.ACESFilmicToneMapping;
    upscaler.exposure = renderer.toneMappingExposure;
    upscaler.sharpness = settings.sharpness;
    // v4.18 perf: on touch, the EASU chain is the most expensive full-screen
    // pass in the game — Auto quality takes the fast path (Philippe's A54
    // lag report); EASU stays for explicit High or desktop.
    upscaler.path = touchMode && (settings.quality === "performance" || settings.upscale === "auto") ? "fast" : "easu";
    upscaler.render(scene, camera);
  }
  // Quality ladder (Philippe's law, 2026-10-25: Realistic is the normal
  // path — it is the default, and the Performance preset is a manual
  // escape hatch for old phones only). Under sustained load "auto" gives
  // up INTERNAL RESOLUTION first (the upscaler trims to 50 % before
  // anything else moves), then shadows get CHEAPER (smaller map, shorter
  // shadow distance), and only as a last resort do shadows switch off
  // and the draw distance trim. It climbs back when frames are cheap.
  let qLevel = 0;
  let qBad = 0;
  let qGood = 0;
  let fpsShown = 0;
  function qualityCaps(): { pr: number; shadows: boolean; cheapShadows: boolean; radius: number } {
    const q = settings.quality;
    // pr is the OUTPUT (display) density. The 3D scene itself renders at
    // pr × renderScale() and the upscaler reconstructs it to this density.
    if (q === "performance") return { pr: touchMode ? 1.25 : 1.5, shadows: false, cheapShadows: false, radius: 5 };
    if (q === "balanced") return { pr: touchMode ? 1.75 : 1.75, shadows: qLevel < 3, cheapShadows: qLevel === 2, radius: 6 };
    if (q === "high") return { pr: touchMode ? 2 : 2, shadows: true, cheapShadows: false, radius: 99 };
    if (touchMode) return { pr: 1.75, shadows: qLevel < 3, cheapShadows: qLevel === 2, radius: qLevel >= 3 ? 5 : 6 };
    return { pr: 2, shadows: qLevel < 3, cheapShadows: qLevel === 2, radius: 99 };
  }
  function applyQuality() {
    const caps = qualityCaps();
    sun.castShadow = caps.shadows && settings.realistic;
    // Cheap-shadow profile: quarter-size map (512 touch / 1024 desktop)
    // and a tighter shadow camera, instead of no shadows at all.
    const size = caps.cheapShadows ? (touchMode ? 512 : 1024) : narrow ? 1024 : 2048;
    if (sun.shadow.mapSize.x !== size) {
      sun.shadow.mapSize.set(size, size);
      if (sun.shadow.map) {
        sun.shadow.map.dispose();
        (sun.shadow as { map: unknown }).map = null;
      }
    }
    const ext = caps.cheapShadows ? 20 : 30;
    const sc = sun.shadow.camera;
    if (sc.left !== -ext) {
      sc.left = -ext;
      sc.right = ext;
      sc.top = ext;
      sc.bottom = -ext;
      sc.far = caps.cheapShadows ? 90 : 140;
      sc.updateProjectionMatrix();
    }
  }
  function effRadius() {
    return Math.max(3, Math.min(settings.radius, qualityCaps().radius));
  }
  let fpsAcc = 0;
  let fpsFrames = 0;
  let fpsWindow = 0;

  // One bad frame must not freeze the game silently: log the first error, keep
  // going, and only surface a crash screen if every frame keeps failing.
  let frameErrors = 0;
  function frame() {
    if (!running) return;
    try {
      frameBody();
      frameErrors = 0;
    } catch (err) {
      frameErrors++;
      if (frameErrors === 1) console.error("Studcraft frame error", err);
      if (frameErrors > 90) {
        running = false;
        renderer.setAnimationLoop(null);
        try {
          saveWorld();
        } catch {
          /* already broken */
        }
        hud.fatal = err instanceof Error ? err.message : String(err);
        listeners.forEach((fn) => fn());
      }
    }
  }

  // P6 step 2 (Muse): the Kiln tick, extracted verbatim from frameBody
  // so the QA rig can advance it deterministically (stepFurnace hook —
  // the stepBricks precedent: rig frames run far slower than game time,
  // so a 5 s cook would otherwise take minutes of wall time to observe).
  function tickFurnaces(dt: number) {
    for (const f of furnaces.values()) {
      if (Math.hypot(f.x - player.x, f.z - player.z) > 20) continue;
      if (f.burn > 0) f.burn -= dt;
      const product = SMELT[f.in];
      const can = !!product && f.inN > 0 && (f.out === 0 || f.out === product) && f.outN < 64 && product !== f.in;
      if (f.burn <= 0 && can && f.fuelN > 0 && fuelTime(f.fuel) > 0) {
        f.burn = fuelTime(f.fuel) * (skills.has("kiln") ? 1.6 : 1);
        f.fuelN -= 1;
        if (f.fuelN <= 0) f.fuel = 0;
        saveDirty = true;
      }
      if (f.burn > 0 && can) {
        f.cook += dt;
        if (f.cook >= 5) {
          f.cook = 0;
          f.inN -= 1;
          if (f.inN <= 0) f.in = 0;
          f.out = product;
          f.outN += 1;
          gainXp(product === ID.Ingot || product === ID.Tin || product === ID.Copper || product === ID.Amber || product === ID.Chrome || product === ID.Sapphire || product === ID.Resin || product === ID.Prism ? 2 : 1);
          saveDirty = true;
        }
      } else if (f.cook > 0) f.cook = Math.max(0, f.cook - dt * 2);
    }
  }

  function frameBody() {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    elapsed += dt;
    waterTime.value = elapsed;
    fpsAcc += dt;
    fpsFrames += 1;
    fpsWindow += dt;
    if (fpsWindow >= 1.5) {
      const avg = fpsAcc / Math.max(1, fpsFrames);
      fpsShown = Math.round(1 / Math.max(avg, 0.001));
      if (settings.quality === "auto" || settings.quality === "balanced") {
        if (avg > 0.026) { qBad++; qGood = 0; }
        else if (avg < 0.0125) { qGood++; qBad = 0; }
        else { qBad = 0; qGood = 0; }
        // Resolution reaches its 50 % floor BEFORE the ladder may touch
        // shadows (a fixed upscale mode counts as already floored).
        const resFloored = settings.upscale !== "auto" || prScale <= 0.51;
        if (qBad >= 2 && qLevel < 3 && resFloored) { qLevel++; qBad = 0; applyQuality(); }
        else if (qGood >= 4 && qLevel > 0) { qLevel--; qGood = 0; applyQuality(); }
      }
      if (avg > 0.024 && prScale > 0.5) prScale = Math.max(0.5, prScale - 0.1);
      else if (avg < 0.0125 && prScale < 1) prScale = Math.min(1, prScale + 0.05);
      fpsAcc = 0;
      fpsFrames = 0;
      fpsWindow = 0;
    }
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    const pr = Math.min(window.devicePixelRatio || 1, qualityCaps().pr);
    if (w !== viewW || h !== viewH || pr !== viewPR) {
      viewW = w;
      viewH = h;
      viewPR = pr;
      renderer.setPixelRatio(pr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    {
      const ow = renderer.domElement.width;
      const oh = renderer.domElement.height;
      upscaler.setSize(ow, oh, renderScale(), msaaSamples());
      const res = upscaler.native ? ow + "×" + oh + " native" : upscaler.inW + "×" + upscaler.inH + " → " + ow + "×" + oh;
      if (hud.renderRes !== res) hud.renderRes = res;
    }

    player.yaw -= lookDx * 0.0022 * settings.sens;
    player.pitch -= lookDy * 0.0022 * settings.sens;
    player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch));
    lookDx = 0;
    lookDy = 0;
    padTick();
    if (phase === "play" && (padIn.lx || padIn.ly)) {
      player.yaw -= padIn.lx * 3.1 * dt * settings.sens;
      player.pitch -= padIn.ly * (settings.invertY ? -1 : 1) * 2.3 * dt * settings.sens;
      player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch));
    }

    sky(dt);
    noteClock();
    if (phase === "play") {
      tickExtras(dt);
      weatherIn -= dt;
      if (weatherIn <= 0) advanceWx();
      raining = wx === "rain" || wx === "storm";
      if (raining) {
        strikeIn -= dt;
        if (strikeIn <= 0) {
          strikeIn = wx === "storm" ? 5 + Math.random() * 9 : 24 + Math.random() * 30;
          lightning();
        }
      }
      if (boltT > 0) {
        boltT -= dt;
        bolt.visible = boltT > 0;
      }
      if (!creative) {
        growAcc += dt;
        if (growAcc > 8) {
          growAcc = 0;
          const gx = Math.floor(player.x);
          const gz = Math.floor(player.z);
          for (let dz = -5; dz <= 5; dz++) {
            for (let dx = -5; dx <= 5; dx++) {
              for (let dy = -2; dy <= 2; dy++) {
                const x = gx + dx;
                const y = Math.floor(player.y) + dy;
                const z = gz + dz;
                const cur = world.get(x, y, z);
                const isWheat = cur === ID.Crop || cur === ID.Crop1 || cur === ID.Crop2;
                const isVeg = cur === ID.CarrotCrop || cur === ID.PotatoCrop || cur === ID.BeetCrop;
                const isStem = cur === ID.PumpkinStem || cur === ID.MelonStem;
                if (!isWheat && !isVeg && !isStem) continue;
                if (world.get(x, y - 1, z) !== ID.Farmland) continue;
                let wet = raining;
                for (const [ox, , oz] of NEIGHBORS) if (world.get(x + ox, y - 1, z + oz) === ID.Water) wet = true;
                if (Math.random() < (wet ? 0.7 : 0.4)) {
                  let next: number = cur;
                  if (cur === ID.Crop) next = ID.Crop1;
                  else if (cur === ID.Crop1) next = ID.Crop2;
                  else if (cur === ID.Crop2) next = ID.CropRipe;
                  else if (cur === ID.CarrotCrop) next = ID.CarrotRipe;
                  else if (cur === ID.PotatoCrop) next = ID.PotatoRipe;
                  else if (cur === ID.BeetCrop) next = ID.BeetRipe;
                  else if (cur === ID.PumpkinStem) next = ID.Pumpkin;
                  else if (cur === ID.MelonStem) next = ID.Melon;
                  if (next !== cur) {
                    world.set(x, y, z, next);
                    markDirtyAt(x, z);
                  }
                }
              }
            }
          }
        }
      }
      tickRedstone(dt);
      tickFire(dt);
      tickFurnaces(dt);
      lightAcc += dt;
      if (lightAcc > 0.16) {
        lightAcc = 0;
        const foundLamps: { x: number; y: number; z: number; power: number }[] = [];
        const heldLight = Math.max(def(hotbar[slot]).light, def(offhand).light);
        if (heldLight > 0) {
          foundLamps.push({
            x: player.x - Math.sin(player.yaw) * 0.45,
            y: player.y + 1.35,
            z: player.z - Math.cos(player.yaw) * 0.45,
            power: heldLight * 0.95,
          });
        }
        const ox = Math.floor(player.x);
        const oy = Math.floor(player.y);
        const oz = Math.floor(player.z);
        for (let dy = -3; dy <= 3 && foundLamps.length < lamps.length; dy++) {
          for (let dz = -7; dz <= 7 && foundLamps.length < lamps.length; dz++) {
            for (let dx = -7; dx <= 7 && foundLamps.length < lamps.length; dx++) {
              const id = world.get(ox + dx, oy + dy, oz + dz);
              const l = def(id).light;
              if (l) foundLamps.push({ x: ox + dx + 0.5, y: oy + dy + 0.65, z: oz + dz + 0.5, power: l });
            }
          }
        }
        for (let i = 0; i < lamps.length; i++) {
          const spot = foundLamps[i];
          lamps[i].intensity = spot ? 1.65 * Math.min(1.2, spot.power) : 0;
          if (spot) lamps[i].position.set(spot.x, spot.y, spot.z);
        }
      }
    }
    if (phase !== "pause" && phase !== "inventory" && phase !== "dead") updateMobs(dt);
    tickNet(dt);
    let acc = dt;
    let first = true;
    let guard = 0;
    while (acc > 0 && guard++ < 5) {
      const step = Math.min(acc, 1 / 60);
      const sample = poll(first);
      physics(step, sample);
      first = false;
      acc -= step;
    }
    // Touch jump/mine are level-triggered by the DOM; don't clear them here.
    updateParticles(dt);
    updateFireFx();
    updateTopples(dt);
    updateFallers(dt);
    tickBricks(dt);
    tickTechnic(dt);
    // DualSense adaptive triggers (v4.18): R2 stiffens as the block cracks
    // while you mine; L2 gets a weapon "wall" while a bow is in hand.
    if (settings.adaptive) {
      const mining = phase === "play" && mineTime > 0 && hud.mine > 0;
      const right: TriggerFx = mining ? { mode: "feedback", start: 1, strength: Math.round(1 + hud.mine * 7) } : { mode: "off" };
      const heldNow = hotbar[slot];
      const left: TriggerFx = phase === "play" && (heldNow === ID.Bow || heldNow === ID.Crossbow) ? { mode: "weapon", start: 3, end: 8, strength: 7 } : { mode: "off" };
      dsApply(right, left);
    }
    renderCamera(dt);
    stream(phase === "title" ? 3 : 2);
    // Behind a pause/inventory panel the world barely moves: redraw at a quarter
    // rate (the canvas keeps its last image), saving battery and GPU for the UI.
    const idle = phase === "pause" || phase === "inventory" || phase === "dead";
    if (!idle || idleTick++ % 4 === 0) present();

    if (sessionStarted && phase === "play") {
      saveAcc += dt;
      if (saveDirty && saveAcc > 8) {
        saveAcc = 0;
        saveWorld();
      }
    }
    emitAcc += dt;
    if (emitAcc > 0.12) {
      emitAcc = 0;
      snapshot();
      listeners.forEach((fn) => fn());
    }
  }

  applyQuality();
  if (settings.adaptive) void dsTryReconnect();
  renderer.setAnimationLoop(frame);
  stream(2);
  spawnSheep();
  renderer.render(scene, camera);

  const ac = new AbortController();
  const opt = { signal: ac.signal };

  window.addEventListener(
    "keydown",
    (e) => {
      if (hud.padActive) {
        hud.padActive = false;
        emit();
      }
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (typing) return;
      if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
      const fresh = !keys.has(e.code) && !e.repeat;
      keys.add(e.code);
      if (e.code === "Escape") {
        e.preventDefault();
        if (hud.ask) {
          api.answer(null);
          return;
        }
        if (phase === "inventory") {
          api.toggleInventory();
        } else if (phase === "pause") {
          phase = "play";
          player.vx = player.vz = 0;
          if (!touchMode) lockPointer();
          emit();
        } else if (phase === "play" && document.pointerLockElement !== canvas) {
          phase = "pause";
          emit();
        }
        return;
      }
      if (!fresh || phase === "dead") return;
      if (e.code === "KeyQ" && phase === "play") {
        const list = spellsFor(skills);
        if (!list.length) say("Learn Spark to cast");
        else {
          spellIx = (spellIx + 1) % list.length;
          say(list[spellIx].name);
        }
        emit();
      }
      if (e.code === "Tab" && phase === "play") {
        e.preventDefault();
        freePlace = !freePlace;
        say(freePlace ? "Free place" : "Snap place");
        emit();
      }
      if (e.code === "KeyE" && (phase === "play" || phase === "inventory") && !hud.ask && !hud.signEdit) {
        api.toggleInventory();
      }
      if (e.code === "F5" && phase === "play") {
        settings.third = !settings.third;
        emit();
      }
      if (e.code === "F1") {
        hud.hidden = !hud.hidden;
        emit();
      }
      if (e.code.startsWith("Digit") && phase === "play") {
        const n = Number(e.code.slice(5));
        if (n >= 1 && n <= 9) {
          slot = n - 1;
          emit();
        }
      }
    },
    opt,
  );
  window.addEventListener("keyup", (e) => keys.delete(e.code), opt);
  const leavePad = () => {
    if (!hud.padActive) return;
    hud.padActive = false;
    emit();
  };
  window.addEventListener("pointerdown", leavePad, { ...opt, passive: true });
  window.addEventListener("mousemove", (e) => (Math.abs(e.movementX) + Math.abs(e.movementY) > 4 ? leavePad() : undefined), { ...opt, passive: true });
  window.addEventListener(
    "gamepadconnected",
    (e) => {
      hud.pad = padLabel(e.gamepad.id);
      say(hud.pad + " connected", 2600);
    },
    opt,
  );
  window.addEventListener(
    "gamepaddisconnected",
    (e) => {
      const left = padLabel(e.gamepad.id);
      hud.pad = activePad() ? padLabel(activePad()!.id) : "";
      if (!hud.pad) hud.padActive = false;
      // Losing the controller mid-game should not leave the player walking.
      padIn.x = padIn.y = padIn.lx = padIn.ly = 0;
      if (phase === "play") phase = "pause";
      say(left + " disconnected", 3000);
    },
    opt,
  );
  window.addEventListener("blur", () => keys.clear(), opt);
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        keys.clear();
        mouseMine = false;
        mousePlace = false;
        touch.mine = touch.place = touch.jump = false;
        touch.moveX = touch.moveY = 0;
        if (sessionStarted) saveWorld();
        // Phones keep <audio> playing in the background; and a hidden tab should
        // come back to a pause menu, not to a mob mid-swing.
        if (!musicEl.paused) musicEl.pause();
        audio.suspend();
        if (phase === "play") {
          phase = "pause";
          emit();
        }
      }
    },
    opt,
  );
  // Closing the tab or swiping the app away: write the world one last time.
  window.addEventListener(
    "pagehide",
    () => {
      if (sessionStarted) saveWorld();
    },
    opt,
  );
  window.addEventListener(
    "resize",
    () => {
      touchMode = isTouchDevice();
    },
    opt,
  );
  canvas.addEventListener("contextmenu", (e) => e.preventDefault(), opt);
  canvas.addEventListener(
    "mousedown",
    (e) => {
      if (phase !== "play" || touchMode) return;
      if (document.pointerLockElement !== canvas) {
        lockPointer();
        return;
      }
      if (e.button === 0) mouseMine = true;
      if (e.button === 2) mousePlace = true;
      if (e.button === 1) {
        e.preventDefault();
        const eye = player.y + EYE;
        const hit = raycast(
          player.x,
          eye,
          player.z,
          -Math.sin(player.yaw) * Math.cos(player.pitch),
          Math.sin(player.pitch),
          -Math.cos(player.yaw) * Math.cos(player.pitch),
          8,
        );
        if (hit) pickBlock(hit.id);
      }
    },
    opt,
  );
  window.addEventListener(
    "mouseup",
    (e) => {
      if (e.button === 0) mouseMine = false;
      if (e.button === 2) mousePlace = false;
    },
    opt,
  );
  document.addEventListener(
    "mousemove",
    (e) => {
      if (document.pointerLockElement !== canvas) return;
      lookDx += e.movementX;
      lookDy += e.movementY;
    },
    opt,
  );
  const activePointers = new Map<number, { x: number; y: number }>();
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (phase !== "play") return;
      if (e.pointerType === "mouse" && document.pointerLockElement === canvas) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture?.(e.pointerId);
    },
    opt,
  );
  canvas.addEventListener(
    "pointermove",
    (e) => {
      const p = activePointers.get(e.pointerId);
      if (!p) return;
      lookDx += e.clientX - p.x;
      lookDy += e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
    },
    opt,
  );
  const endPointer = (e: PointerEvent) => activePointers.delete(e.pointerId);
  canvas.addEventListener("pointerup", endPointer, opt);
  canvas.addEventListener("pointercancel", endPointer, opt);
  window.addEventListener(
    "wheel",
    (e) => {
      if (phase !== "play") return;
      e.preventDefault();
      const dir = Math.sign(e.deltaY);
      slot = (slot + dir + 9) % 9;
      emit();
    },
    { ...opt, passive: false },
  );
  document.addEventListener(
    "pointerlockchange",
    () => {
      const locked = document.pointerLockElement === canvas;
      if (locked) activePointers.clear();
      if (wasLocked && !locked && phase === "play" && !suppressUnlock && !touchMode) phase = "pause";
      wasLocked = locked;
      suppressUnlock = false;
      emit();
    },
    opt,
  );

  window.__controlsTest = {
    getYaw: () => player.yaw,
    getSpeed: () => Math.hypot(player.vx, player.vz),
    getPos: () => ({ x: player.x, y: player.y, z: player.z }),
    // v4.17 QA hook (Claude): place the camera for staged photos. Inert in play.
    setPos: (x: number, y: number, z: number) => { player.x = x; player.y = y; player.z = z; player.vx = player.vz = 0; return true; },
    // P0 QA hooks: place/list stud-grid bricks directly (inert in play).
    placeBrickAt: (id: number, sx: number, sy: number, sz: number) => {
      if (!brickSpaceFree(sx, sy, sz)) return false;
      addBrick(id, sx, sy, sz);
      rebuildBrickMesh(id);
      saveDirty = true;
      return true;
    },
    getBricks: () => [...bricks.values()].map((b) => [b.id, b.sx, b.sy, b.sz] as [number, number, number, number]),
    // Technic QA hooks: place a part on the lattice (planner-free: the
    // pose must pass tech.test), list the layer in save format, and
    // step the mechanics deterministically (the stepBricks precedent —
    // rig frames run far slower than game time).
    placeTechAt: (id: number, o: number, qx: number, qy: number, qz: number) => {
      if (!TECHNIC_SET.has(id)) return false;
      if (tech.test(id, o, [qx, qy, qz], techSolidAt) < 0) return false;
      tech.add(id, o, [qx, qy, qz]);
      saveDirty = true;
      return true;
    },
    getTechnic: () => [...tech.parts.values()].map((p) => [p.id, p.o, p.q[0], p.q[1], p.q[2], p.on === false ? 0 : 1] as [number, number, number, number, number, number]),
    stepTechnic: (dt: number) => {
      tickTechnic(dt);
      const omegas: Record<string, number> = {};
      for (const [g, w] of tech.gOmega) omegas[g] = w;
      const angles: Record<string, number> = {};
      for (const [g, a] of tech.gAngle) angles[g] = a;
      return { parts: tech.parts.size, jammed: tech.jammed, omegas, angles };
    },
    spinTech: () => ++techSpin,
    // P0 QA witness (qa99b11): mining progress on the current target —
    // key "B:…" = brick branch, voxel key = classic branch, "" = no mining.
    getMineState: () => ({ mine: hud.mine, time: mineTime, key: mineKey, target: hud.targetName }),
    // P1 QA hook: fresh integrity classification on demand (inert in play).
    getIntegrity: () => {
      const cant = computeIntegrity();
      const stressed: string[] = [];
      for (const b of bricks.values()) {
        const k = brickKey(b.sx, b.sy, b.sz);
        if (!cant.has(k)) stressed.push(k);
      }
      return {
        total: bricks.size,
        supported: cant.size,
        stressed,
        falling: fallingBricks.length,
        stress: Object.fromEntries(brickStress),
        sag: Object.fromEntries([...brickStress.keys()].map((k) => [k, brickSagY(k)])),
      };
    },
    // P1-2 QA witness: the ACTUAL instance-matrix Y of a brick (sag is
    // only real if the rendered matrix moved, not just the stress map).
    getBrickMeshY: (sx: number, sy: number, sz: number) => {
      const b = bricks.get(brickKey(sx, sy, sz));
      if (!b) return null;
      const mesh = brickMeshes.get(b.id);
      if (!mesh) return null;
      let idx = -1;
      let i = 0;
      for (const ob of bricks.values()) {
        if (ob.id !== b.id) continue;
        if (ob === b) {
          idx = i;
          break;
        }
        i++;
      }
      if (idx < 0) return null;
      const m = new THREE.Matrix4();
      mesh.getMatrixAt(idx, m);
      return m.elements[13];
    },
    // P2 QA hooks: weld two touching bricks directly + read the joint
    // set back (inert in play — the torch path is weldAction).
    weldAt: (sx1: number, sy1: number, sz1: number, sx2: number, sy2: number, sz2: number) => {
      const a = bricks.get(brickKey(sx1, sy1, sz1));
      const b = bricks.get(brickKey(sx2, sy2, sz2));
      if (!a || !b || !bricksTouch(a, b)) return false;
      welds.add(weldKey(brickKey(sx1, sy1, sz1), brickKey(sx2, sy2, sz2)));
      saveDirty = true;
      return true;
    },
    // P6 QA hook: the foundry yield table itself (inert in play).
    plasticYieldOf: (id: number) => plasticYield(id),
    // P6-2 QA hooks (inert in play): the temper grade table, and the
    // quench exercised through the SAME quenchHeldAt the right-click
    // path uses, aimed at a staged cell.
    stressMaxOf: (id: number) => stressMaxFor(id),
    quenchAt: (x: number, y: number, z: number) => {
      const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
      return quenchHeldAt({ id: world.get(fx, fy, fz), x: fx, y: fy, z: fz });
    },
    // P6 step 2 QA hooks (inert in play): the SMELT gate table, a furnace
    // staged through the same ensureFurnace the panel uses, a snapshot
    // witness, a deterministic tick of the REAL tickFurnaces (the
    // stepBricks precedent), and the real api.craft path by recipe id.
    smeltOf: (id: number) => SMELT[id] ?? 0,
    stageFurnace: (x: number, y: number, z: number, inId: number, inN: number, fuelId: number, fuelN: number) => {
      const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
      const f = ensureFurnace(fx + "," + fy + "," + fz, fx, fy, fz);
      f.in = inId; f.inN = inN; f.fuel = fuelId; f.fuelN = fuelN; f.out = 0; f.outN = 0; f.cook = 0; f.burn = 0;
      saveDirty = true;
      return { in: f.in, inN: f.inN, fuel: f.fuel, fuelN: f.fuelN, out: f.out, outN: f.outN, cook: f.cook, burn: f.burn };
    },
    getFurnace: (x: number, y: number, z: number) => {
      const f = furnaces.get(Math.floor(x) + "," + Math.floor(y) + "," + Math.floor(z));
      if (!f) return null;
      return { in: f.in, inN: f.inN, fuel: f.fuel, fuelN: f.fuelN, out: f.out, outN: f.outN, cook: f.cook, burn: f.burn };
    },
    stepFurnace: (dt: number) => {
      tickFurnaces(Math.max(0, Math.min(dt, 6)));
      return true;
    },
    craftOf: (recipeId: string) => {
      api.craft(recipeId, 1);
      return true;
    },
    // P6 step 4 QA hook (inert in play): the registry def of an item —
    // tool kind, tier and uses — read straight from BLOCKS via def().
    defOf: (id: number) => {
      const d = BLOCKS[id];
      if (!d) return null;
      return { name: d.name, tool: d.tool, tier: d.tier, maxUse: d.maxUse };
    },
    getWelds: () => {
      const welded = new Set<string>();
      for (const w of welds) {
        const [a, b] = w.split("|");
        welded.add(a);
        welded.add(b);
      }
      return { count: welds.size, pairs: [...welds], welded: [...welded] };
    },
    // One evaluate can advance brick stress and the fall. The rig's frames
    // are ~700× slower than game time, so waiting on requestAnimationFrame
    // never reaches the 0.75 s let-go. Cap keeps one call from tunneling.
    stepBricks: (dt: number) => {
      const capped = Math.max(0, Math.min(dt, 2));
      const before = fallingBricks.length;
      tickBricks(capped);
      if (fallingBricks.length > before) updateFallingBricks(capped);
      const cant = computeIntegrity();
      const stressed: string[] = [];
      for (const b of bricks.values()) {
        const k = brickKey(b.sx, b.sy, b.sz);
        if (!cant.has(k)) stressed.push(k);
      }
      return { total: bricks.size, supported: cant.size, stressed, falling: fallingBricks.length, stress: Object.fromEntries(brickStress) };
    },
    setKeys: (codes: string[]) => {
      keys.clear();
      for (const code of codes) keys.add(code);
    },
    setSteer: (v: number) => {
      steerOverride = v;
    },
    setLook: (yaw: number, pitch: number) => {
      player.yaw = yaw;
      player.pitch = pitch;
    },
    setDig: (mine: boolean, place: boolean) => {
      mouseMine = mine;
      mousePlace = place;
    },
    getBlock: (x: number, y: number, z: number) => world.get(Math.floor(x), Math.floor(y), Math.floor(z)),
    // v4.15 fire QA hooks
    put: (x: number, y: number, z: number, id: number) => {
      const ok = world.set(Math.floor(x), Math.floor(y), Math.floor(z), id);
      markDirtyAt(Math.floor(x), Math.floor(z));
      return ok;
    },
    ignite: (x: number, y: number, z: number) => igniteAt(Math.floor(x), Math.floor(y), Math.floor(z)),
    burn: (x: number, y: number, z: number) => startBurning(Math.floor(x), Math.floor(y), Math.floor(z)),
    meltOf: (x: number, y: number, z: number) => FS.meltAt(Math.floor(x), Math.floor(y), Math.floor(z)),
    // v4.16.1 fusion QA hook: stage a melt value directly (the mesher's
    // fusion geometry reads meltAt + world state only, so QA can stage
    // slump / support-sink / merged-pool scenes deterministically
    // without tending live fires in the crash-prone SwiftShader rig).
    setMelt: (x: number, y: number, z: number, m: number, sx?: number, sy?: number, sz?: number) => {
      const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
      const cm = Math.max(0, Math.min(1, m));
      FS.heatMap.set(FS.fkey(fx, fy, fz), { h: 0, m: cm, stage: Math.floor(cm * FS.MELT_STAGES), sx, sy, sz });
      markDirtyAt(fx, fz);
      saveDirty = true;
      return true;
    },
    // v4.16.1 pass 2 QA hook (Claude): clear the mobs around the player so
    // melt photos are not blocked by a wandering cow. Inert in normal play.
    clearMobs: (radius: number) => {
      let n = 0;
      for (const m of mobs) {
        if (m.dead || Math.hypot(m.x - player.x, m.z - player.z) > radius) continue;
        m.dead = true;
        scene.remove(m.mesh);
        n++;
      }
      return n;
    },
    fireCount: () => FS.fireCells.size + FS.burningMap.size,
    auditFire: () => {
      const melt: string[] = [], burn: string[] = [];
      for (let id = 1; id < 512; id++) {
        const d = def(id);
        if (!d || !d.solid) continue;
        if (isPlastic(id)) melt.push(id + ":" + (d.name || "?"));
        else if (flamOf(id) > 0) burn.push(id + ":" + (d.name || "?"));
      }
      return { melt, burn };
    },
    // v4.16 tuft QA hooks (coords = the AIR cell above the grass block)
    hasTuft: (x: number, y: number, z: number) => TS.hasTuftAt(world, Math.floor(x), Math.floor(y), Math.floor(z)),
    tearTuft: (x: number, y: number, z: number) => {
      TS.tearTuft(Math.floor(x), Math.floor(y), Math.floor(z));
      markDirtyAt(Math.floor(x), Math.floor(z));
    },
    getTarget: () => hud.targetName,
    getHamlet: () => {
      const site = world.nearestHamlet(player.x, player.z, 4);
      return site ? { x: site.x, y: site.y, z: site.z } : null;
    },
    getChunks: () => world.chunks.size,
    hold: (on: boolean) => renderer.setAnimationLoop(on ? null : frame),
    getRes: () => hud.renderRes,
    getMobFx: () =>
      mobs
        .filter((m) => !m.dead && Math.hypot(m.x - player.x, m.z - player.z) < 8)
        .map((m) => ({ kind: m.kind, hp: m.hp, hurt: m.vis?.hurtT ?? 0, bar: !!m.vis?.bar, amp: m.vis?.amp ?? 0, x: m.x, y: m.y, z: m.z, cd: m.hitCd ?? 0, cool: m.cool })),
    getCorpses: () => corpses.length,
    getMobCount: () => mobs.length,
    setHeld: (id: number) => {
      hotbar[slot] = id;
      emit();
      return true;
    },
    setVm: (v: Record<string, number>) => {
      Object.assign(vmBase, v);
      lastHeldId = -1; // rebuild the held item at the new scale
      return true;
    },
    setMcHeld: (v: Record<string, number>) => {
      Object.assign(mcTune, v);
      lastHeldId = -1;
      return true;
    },
    setHeldPose: (v: Record<string, number>) => {
      Object.assign(heldPose, v);
      lastHeldId = -1;
      return true;
    },
    setSwing: (v: number) => {
      swing = v;
      return true;
    },
    hurtMe: (n: number) => {
      invuln = 0;
      hurt(n);
      return true;
    },
    spawnMob: (kind: string, dx = 6, dz = 0) => {
      const kinds = ["sheep", "creeper", "cow", "walker", "pig", "chicken", "spider", "skelly", "villager", "ghast", "dragon", "horse", "phantom", "piglin", "frog", "fox", "crab", "wisp", "slime", "wolf", "golem", "wither", "enderman", "blaze", "witch", "bee", "cat", "squid", "bat", "drowned", "husk", "stray", "goat", "axolotl", "parrot", "guardian", "shulker", "pillager", "vindicator", "evoker", "vex", "ravager"];
      if (!kinds.includes(kind)) return false;
      spawnKind(kind as Mob["kind"], player.x + dx, player.z + dz);
      return true;
    },
    getMobs: () => mobs.filter((m) => !m.dead).map((m) => m.kind),
    mobAudit: () => {
      const kinds = ["sheep", "creeper", "cow", "walker", "pig", "chicken", "spider", "skelly", "villager", "ghast", "dragon", "horse", "phantom", "piglin", "frog", "fox", "crab", "wisp", "slime", "wolf", "golem", "wither", "enderman", "blaze", "witch", "bee", "cat", "squid", "bat", "drowned", "husk", "stray", "goat", "axolotl", "parrot", "guardian", "shulker", "pillager", "vindicator", "evoker", "vex", "ravager"];
      const out: Record<string, { h: number; minY: number; w: number; d: number }> = {};
      const box = new THREE.Box3();
      for (const k of kinds) {
        const b = buildLego(k, 1);
        box.setFromObject(b.group);
        out[k] = { h: +(box.max.y - box.min.y).toFixed(2), minY: +box.min.y.toFixed(2), w: +(box.max.x - box.min.x).toFixed(2), d: +(box.max.z - box.min.z).toFixed(2) };
      }
      const fig = makeMinifig();
      box.setFromObject(fig.group);
      out.__player = { h: +(box.max.y - box.min.y).toFixed(2), minY: +box.min.y.toFixed(2), w: +(box.max.x - box.min.x).toFixed(2), d: +(box.max.z - box.min.z).toFixed(2) };
      return out;
    },
    getQuests: () => {
      const isDone = (id: string) => quests.find((p) => p.id === id)?.done ?? false;
      return QUESTS.map((q) => {
        const { step, steps } = chainStepOf(q);
        const prog = quests.find((p) => p.id === q.id) ?? { n: 0, done: false };
        return { id: q.id, chain: q.chain, step, steps, n: prog.n, done: prog.done, active: questActive(q, isDone) };
      });
    },
    questAudit: () => {
      const byId = (id: string) => QUESTS.find((q) => q.id === id)!;
      const none = () => false;
      const doneExcept = (keepOpen: string) => (id: string) => id !== keepOpen;
      const only = (...ids: string[]) => (id: string) => ids.includes(id);
      return {
        fresh_only_openers_active: ["logs", "wheat", "hunt", "moss"].every((id) => questActive(byId(id), none)) && ["torches", "tin", "masterbrick", "gourds", "frogs", "snow", "pages"].every((id) => !questActive(byId(id), none)),
        finale_locked_until_all_prior_done: !questActive(byId("masterbrick"), only("logs", "torches", "tin", "gem", "wisps", "tome", "crystal", "seal")) && questActive(byId("masterbrick"), doneExcept("masterbrick")),
        mid_chain_unlock: questActive(byId("tin"), only("logs", "torches")) && !questActive(byId("gem"), only("logs", "torches")),
        every_quest_in_a_chain: QUESTS.every((q) => !!q.chain && !!CHAINS[q.chain!]),
        chain_sizes: QUESTS.length === 38,
      };
    },
    getBoss: () => {
      const b = mobs.find((m) => BOSSES.has(m.kind) && !m.dead);
      if (!b) return null;
      return { kind: b.kind, hp: Math.round(b.hp), maxHp: b.maxHp ?? b.hp, shield: !!b.shield, spawnT: +(b.spawnT ?? 0).toFixed(2), phaseN: b.phaseN ?? 0, breathZones: breathZones.length };
    },
    hitMob: (kind: string, dmg: number) => {
      const m = mobs.find((x) => x.kind === kind && !x.dead);
      if (!m) return false;
      m.hp -= dmg;
      if (m.hp <= 0) killMob(m);
      return true;
    },
    getFx: () => ({ booms: boomFx.length, flames: flameFx.geo.instanceCount, smoke: smokeFx.geo.instanceCount }),
    boom: (dx: number, dz: number) => {
      explode(Math.floor(player.x + dx), Math.floor(player.y + 1), Math.floor(player.z + dz), 3);
    },
    breakAt: (x: number, y: number, z: number) => { breakBlock(x, y, z); return world.get(x, y, z); },
    toppleCount: () => topples.length,
    dropList: () => drops.map((d) => ({ id: d.id, n: d.n })),
    phaseNow: () => phase,
    pauseGame: () => api.pauseGame(),
    toggleInv: () => api.toggleInventory(),
    getPeers: () => [...mp.peers.values()].map((p) => ({ name: p.name, x: p.x, y: p.y, z: p.z })),
    getEnch: (id: number) => ench.get(id) ?? null,
    setEnch: (id: number, key: string, lvl: number) => {
      const cur = { ...(ench.get(id) ?? {}) };
      if (lvl > 0) cur[key] = lvl;
      else delete cur[key];
      ench.set(id, cur);
      return true;
    },
    getInv: (id: number) => inv[id] ?? 0,
    setOffhand: (id: number) => {
      offhand = id;
      return true;
    },
    api: (name: string) => {
      const fn = (api as unknown as Record<string, unknown>)[name];
      if (typeof fn !== "function") return false;
      (fn as () => void)();
      return true;
    },
    getShots: () => shots.length,
    getRockets: () => rockets.length,
    getMusic: () => musicCtx + "|" + (musicEl.paused ? "paused" : "playing") + "|" + (musicEl.src.split("/").pop() ?? "") + "|gap=" + musicGap.toFixed(1),
    getRaid: () =>
      "omen=" + Math.ceil(omenT) + " hero=" + Math.ceil(heroT) + " raid=" + (raid ? "w" + raid.wave + "/" + raid.phase + " alive=" + mobs.filter((m) => m.raidMob && !m.dead).length : "-"),
    forceRaid: () => {
      const site = world.nearestHamlet(player.x, player.z, 8);
      if (!site || raid) return false;
      startRaid(site.x + 15, site.z + 14);
      return true;
    },
    getLandmark: () => {
      const lm = world.nearestLandmark(player.x, player.z);
      return lm ? lm.kind + "@" + lm.x + "," + lm.z + " y=" + lm.y + " d=" + Math.round(Math.hypot(lm.x - player.x, lm.z - player.z)) : "-";
    },
    getWx: () =>
      wx +
      " cover=" + wxCur.cover.toFixed(2) +
      " dark=" + wxCur.dark.toFixed(2) +
      " precip=" + wxCur.precip.toFixed(2) +
      " deck=" + (deck.visible ? "on" : "off") +
      " slabs=" + (clouds.visible ? "on" : "off") +
      " rain=" + (rainLines.visible ? "on" : "off") +
      " streaks=" + rainStreaksShown +
      " pts=" + rainPtsShown,
    setWx: (s: string) => {
      if (s !== "clear" && s !== "cloudy" && s !== "rain" && s !== "storm") return false;
      wx = s;
      weatherIn = 600;
      // Test hook: snap the eased values so QA doesn't wait out the
      // (deliberately slow) production transitions.
      const d = WX_DEF[s];
      wxCur.cover = d.cover;
      wxCur.dark = d.dark;
      wxCur.precip = d.precip;
      wxCur.fog = d.fog;
      wxCur.wind = d.wind;
      wxCur.storm = s === "storm" ? 1 : 0;
      return true;
    },
    getVillage: () =>
      "key=" + curTraderKey() + " rep=" + repAtKey(curTraderKey()) + " word=" + repWord(repAtKey(curTraderKey())) +
      " offers=" + hud.offers.map((o) => o.pn + "x" + o.stock).join(","),
    setRep: (n: number) => {
      // Test hook: set the current hamlet's reputation directly.
      reputation[curTraderKey()] = n;
      saveDirty = true;
      emit();
      return true;
    },
    getRank: () => rankLv,
    setRank: (n: number) => {
      // Test hook: set the builder rank directly (the setRep precedent) —
      // lets QA exercise level-gated paths (boss moulds) in Survival
      // without farming XP. Inert in play.
      rankLv = Math.max(0, Math.min(30, Math.floor(n)));
      xp = 0;
      saveDirty = true;
      emit();
      return true;
    },
    tradeAt: (i: number) => {
      api.trade(i);
      return true;
    },
    restockNow: () => {
      // Test hook: the twice-a-day restock, on demand.
      restockTrades();
      emit();
      return true;
    },
    setBlock: (x: number, y: number, z: number, id: number) => {
      // Test hook: direct world edit (stations are scan-based, so they
      // pick these up exactly like player-placed blocks).
      world.set(Math.floor(x), Math.floor(y), Math.floor(z), id);
      markDirtyAt(Math.floor(x), Math.floor(z));
      return true;
    },
    getStations: () => {
      const px = Math.floor(player.x);
      const py = Math.floor(player.y);
      const pz = Math.floor(player.z);
      let beacon = "";
      let conduit = "";
      for (let y = py - 10; y <= py + 10; y++)
        for (let z = pz - 26; z <= pz + 26; z++)
          for (let x = px - 26; x <= px + 26; x++) {
            const id = world.get(x, y, z);
            if (id === ID.Beacon && !beacon) beacon = "L" + pyramidLevel(x, y, z) + " buff=" + (beaconBuffs.get(x + "," + y + "," + z) ?? "-") + " beams=" + beamMeshes.size;
            if (id === ID.Conduit && !conduit) conduit = "frame=" + prismFrameCount(x, y, z);
          }
      return (
        "beacon[" + beacon + "] conduit[" + conduit + "] juke=" + [...jukeDiscs.entries()].map(([k, d]) => k + ":" + d).join(",") +
        " queue=" + shulkerQueue.length +
        " fx speed=" + speedT.toFixed(0) + " str=" + strengthT.toFixed(0) + " regen=" + regenT.toFixed(0) + " jump=" + jumpT.toFixed(0) + " gill=" + gillT.toFixed(0) + " oxy=" + oxygen.toFixed(1)
      );
    },
    setStation: (kind: string, x: number, y: number, z: number, val: string) => {
      // Test hook: beacon buff / jukebox disc state without panel input.
      const key = Math.floor(x) + "," + Math.floor(y) + "," + Math.floor(z);
      if (kind === "buff") beaconBuffs.set(key, val);
      else if (kind === "disc") jukeDiscs.set(key, Number(val));
      else if (kind === "eject") jukeDiscs.delete(key);
      else return false;
      saveDirty = true;
      return true;
    },
    scanLandmarks: () => {
      const out: string[] = [];
      const gx = Math.floor(player.x / 384);
      const gz = Math.floor(player.z / 384);
      for (let dz = -3; dz <= 3; dz++)
        for (let dx = -3; dx <= 3; dx++) {
          const lm = world.landmarkAt(gx + dx, gz + dz) ?? world.netherLandmarkAt(gx + dx, gz + dz);
          if (lm) out.push(lm.kind + "@" + lm.x + "," + lm.z + " y=" + lm.y + " d=" + Math.round(Math.hypot(lm.x - player.x, lm.z - player.z)));
        }
      return out;
    },
    getMobNames: () => mobs.filter((m) => m.name).map((m) => m.name as string),
    getArmor: () => [...armor],
    give: (id: number, n: number) => {
      give(id, n);
      return true;
    },
    setInv: (id: number, n: number) => {
      inv[id] = n;
      return true;
    },
    mpConnect: (url: string, room: string, name: string) => {
      mp.connect(url, room, name);
      return true;
    },
  };

  function enterWorld(kind: EnterKind, id?: string) {
    audio.unlock();
    if (kind === "continue") {
      const save = id ? loadWorld(id) : loadLatest()?.save;
      const slotId = id || loadLatest()?.id || "";
      if (!save || !slotId) {
        say("No world in the bin yet");
        return;
      }
      bootSave(save, slotId);
      beginPlay();
      return;
    }
    if (kind === "survival") {
      bootNew(false, false);
      beginPlay();
      return;
    }
    if (kind === "flat") {
      bootNew(true, true);
      beginPlay();
      return;
    }
    bootNew(false, true);
    beginPlay();
  }

  const api: GameApi = {
    canvas,
    hud,
    touch,
    settings,
    get phase() {
      return pub.phase;
    },
    get hasSave() {
      return pub.hasSave;
    },
    get slots() {
      return listWorlds();
    },
    enter(kind, id) {
      try {
        enterWorld(kind, id);
      } catch (err) {
        console.error("Studcraft could not open the world", err);
        phase = "title";
        say("That world couldn't be opened — it may be from a newer version or damaged.", 6000);
      }
    },
    pauseGame() {
      if (phase !== "play") return;
      phase = "pause";
      emit();
    },
    resume() {
      if (phase !== "pause") return;
      phase = "play";
      if (!touchMode) lockPointer();
      emit();
    },
    quit() {
      saveWorld();
      phase = "title";
      flying = false;
      player.vx = player.vz = 0;
      suppressUnlock = true;
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      emit();
    },
    respawn() {
      health = 20;
      hunger = 20;
      oxygen = 10;
      flying = false;
      fireT = 0;
      poisonT = 0;
      witherT = 0;
      slowT = 0;
      mount = null;
      invuln = 2;
      flash = 0;
      shake = 0;
      player.x = spawnPoint.x;
      player.y = spawnPoint.y + 0.2;
      player.z = spawnPoint.z;
      player.vx = player.vy = player.vz = 0;
      phase = "play";
      if (!touchMode) lockPointer();
      emit();
    },
    toggleInventory() {
      if (phase === "inventory") {
        for (let i = 0; i < 9; i++) {
          if (grid[i]) addInv(grid[i], 1);
          grid[i] = 0;
        }
        panel = "bag";
        // Opened from the pause menu → closing returns to pause, not the game
        // (Philippe 2026-10-28: pause → Inventory "ouvre rien" — the open
        // guard below used to reject every phase except "play").
        phase = invReturn;
        audio.uiClose();
        if (phase === "play" && !touchMode) lockPointer();
        emit();
        return;
      }
      if (phase !== "play" && phase !== "pause") return;
      invReturn = phase === "pause" ? "pause" : "play";
      panel = "bag";
      const locked = document.pointerLockElement === canvas;
      if (locked) suppressUnlock = true;
      phase = "inventory";
      player.vx = player.vz = 0;
      if (locked) document.exitPointerLock();
      audio.uiOpen();
      emit();
    },
    setSlot(i) {
      slot = (i + 9) % 9;
      emit();
    },
    swapSlots(a, b) {
      a = (a + 9) % 9;
      b = (b + 9) % 9;
      if (a === b) return;
      const tmp = hotbar[a];
      hotbar[a] = hotbar[b];
      hotbar[b] = tmp;
      slot = b;
      emit();
    },
    assign(id) {
      if (!creative && (inv[id] ?? 0) <= 0) {
        say("You don't have that");
        return;
      }
      // already on the bar: just select that slot (no duplicates, like Minecraft)
      const at = hotbar.indexOf(id);
      if (at >= 0) {
        slot = at;
        cursor = id;
        emit();
        return;
      }
      hotbar[slot] = id;
      cursor = id;
      // the target moves on to the next EMPTY slot, so tapping items fills the bar
      for (let k = 1; k < 9; k++) {
        const j = (slot + k) % 9;
        if (!hotbar[j]) {
          slot = j;
          break;
        }
      }
      emit();
    },
    clearSlot(i) {
      i = (i + 9) % 9;
      hotbar[i] = 0;
      emit();
    },
    hold(id) {
      if (!creative && (inv[id] ?? 0) <= 0) return;
      cursor = cursor === id ? 0 : id;
      emit();
    },
    gridTap(i) {
      if (grid[i]) {
        addInv(grid[i], 1);
        grid[i] = 0;
      } else if (cursor && (creative || (inv[cursor] ?? 0) > 0)) {
        if (!creative) inv[cursor] -= 1;
        grid[i] = cursor;
      }
      emit();
    },
    craftTake() {
      const matched = matchGrid(grid, panel === "bench");
      if (!matched) {
        say("That pattern isn't a recipe");
        return;
      }
      const gated = RECIPES.find((rec) => rec.out === matched.out && (rec.lvl || rec.skill));
      if (gated && !gate(gated.lvl)) return;
      if (gated?.skill && !creative && !skills.has(gated.skill)) {
        return say("Need the " + (skillById(gated.skill)?.name ?? "skill") + " skill");
      }
      if (matched.out === 0) {
        for (let i = 0; i < 9; i++) if (matched.used[i]) grid[i] = 0;
        give(0, 1, "hammer");
        emit();
        return;
      }
      for (let i = 0; i < 9; i++) if (matched.used[i]) grid[i] = 0;
      give(matched.out, matched.n);
      say(def(matched.out).name);
      emit();
    },
    craft(id, times = 1) {
      const recipe = RECIPES.find((entry) => entry.id === id);
      if (!recipe) return;
      if (!gate(recipe.lvl)) return;
      if (recipe.skill && !creative && !skills.has(recipe.skill)) {
        return say("Need the " + (skillById(recipe.skill)?.name ?? "skill") + " skill");
      }
      if (recipe.special === "hammer" && hammer) return say("Hammer's already on your belt");
      const maxBatch = recipe.special || def(recipe.out).maxUse || def(recipe.out).armorSlot ? 1 : Math.max(1, Math.min(64, times));
      let crafted = 0;
      for (let t = 0; t < maxBatch; t++) {
        if (!creative) {
          for (const [needId, n] of recipe.need) {
            if ((inv[needId] ?? 0) < n) {
              if (crafted === 0) say("Need " + n + " " + def(needId).name.toLowerCase());
              break;
            }
          }
          let canAfford = true;
          for (const [needId, n] of recipe.need) {
            if ((inv[needId] ?? 0) < n) canAfford = false;
          }
          if (!canAfford) break;
          for (const [needId, n] of recipe.need) spend(needId, n);
        }
        give(recipe.out, recipe.n, recipe.special);
        crafted++;
        if (recipe.special) break;
      }
      if (crafted > 0) {
        if (!recipe.special) say(crafted > 1 ? `${recipe.name} ×${crafted * recipe.n}` : recipe.name);
        if (recipe.lvl) gainXp(2 * crafted);
        audio.place();
      }
      emit();
    },
    fillGrid(recipeId) {
      const recipe = RECIPES.find((entry) => entry.id === recipeId);
      if (!recipe || !recipe.shape || !recipe.w || !recipe.h) return;
      const span = panel === "bench" ? 3 : 2;
      if (recipe.w > span || recipe.h > span) {
        say("Needs a 3×3 Crafting Bench");
        return;
      }
      for (let i = 0; i < 9; i++) {
        if (grid[i]) {
          if (!creative) addInv(grid[i], 1);
          grid[i] = 0;
        }
      }
      for (let y = 0; y < recipe.h; y++) {
        for (let x = 0; x < recipe.w; x++) {
          const item = recipe.shape[x + y * recipe.w] || 0;
          if (!item) continue;
          if (creative || (inv[item] ?? 0) > 0) {
            if (!creative) spend(item, 1);
            grid[x + y * 3] = item;
          }
        }
      }
      audio.uiClick();
      emit();
    },
    clearGrid() {
      for (let i = 0; i < 9; i++) {
        if (grid[i]) {
          if (!creative) addInv(grid[i], 1);
          grid[i] = 0;
        }
      }
      emit();
    },
    armorTap(i) {
      const id = armor[i] ?? 0;
      if (!id) return;
      armor[i] = 0;
      addInv(id, 1);
      emit();
    },
    furnaceTap(part) {
      const f = ensureFurnace(focus.x + "," + focus.y + "," + focus.z, focus.x, focus.y, focus.z);
      if (part === 2) {
        if (f.out && f.outN > 0) {
          addInv(f.out, f.outN);
          f.out = 0;
          f.outN = 0;
        }
        emit();
        return;
      }
      const slotId = part === 0 ? f.in : f.fuel;
      const slotN = part === 0 ? f.inN : f.fuelN;
      if (cursor && (creative || (inv[cursor] ?? 0) > 0)) {
        if (part === 1 && fuelTime(cursor) <= 0) return say("That isn't fuel");
        if (part === 0 && !SMELT[cursor]) return say("The kiln won't take that");
        if (slotId && slotId !== cursor) return;
        if (!creative) inv[cursor] -= 1;
        if (part === 0) {
          f.in = cursor;
          f.inN = slotN + 1;
        } else {
          f.fuel = cursor;
          f.fuelN = slotN + 1;
        }
      } else if (slotN > 0) {
        addInv(slotId, slotN); // a tap takes the whole stack back
        if (part === 0) {
          f.inN = 0;
          f.in = 0;
        } else {
          f.fuelN = 0;
          f.fuel = 0;
        }
      }
      saveDirty = true;
      emit();
    },
    chestTap(i) {
      const bin = ensureChest(focus.x + "," + focus.y + "," + focus.z);
      const id = bin.ids[i] ?? 0;
      const n = bin.ns[i] ?? 0;
      if (cursor && (creative || (inv[cursor] ?? 0) > 0)) {
        if (id && id !== cursor) return;
        if (!creative) inv[cursor] -= 1;
        bin.ids[i] = cursor;
        bin.ns[i] = n + 1;
      } else if (n > 0) {
        // Minecraft: a tap takes the whole stack
        addInv(id, n);
        bin.ns[i] = 0;
        bin.ids[i] = 0;
      }
      saveDirty = true;
      emit();
    },
    // v4.17 fix: tapping a bag item in the crate moves its whole stack in
    // (topping up matching stacks first, 64 per cell) — it used to REPLACE the
    // active hotbar slot instead and store nothing.
    chestStore(id) {
      if (!id) return;
      const bin = ensureChest(focus.x + "," + focus.y + "," + focus.z);
      let left = creative ? 64 : (inv[id] ?? 0);
      if (left <= 0) return say("You don't have that");
      const moved0 = left;
      for (let pass = 0; pass < 2 && left > 0; pass++) {
        for (let i = 0; i < bin.ids.length && left > 0; i++) {
          const same = bin.ids[i] === id && (bin.ns[i] ?? 0) > 0;
          const free = !bin.ids[i] || (bin.ns[i] ?? 0) <= 0;
          if (pass === 0 ? !same : !free) continue; // top up first, then empty cells
          const base = same ? (bin.ns[i] ?? 0) : 0;
          const k = Math.min(64 - base, left);
          if (k <= 0) continue;
          bin.ids[i] = id;
          bin.ns[i] = base + k;
          left -= k;
        }
      }
      if (left === moved0) return say("The crate is full");
      if (!creative) {
        inv[id] -= moved0 - left;
        if ((inv[id] ?? 0) <= 0) for (let i = 0; i < 9; i++) if (hotbar[i] === id) hotbar[i] = 0;
      }
      saveDirty = true;
      emit();
    },
    // v4.17 fix: tapping a bag item at the kiln routes its whole stack
    // (smeltable -> input, else fuel -> fuel slot), like a shift-click.
    furnaceQuick(id) {
      if (!id) return;
      const f = ensureFurnace(focus.x + "," + focus.y + "," + focus.z, focus.x, focus.y, focus.z);
      const have = creative ? 64 : (inv[id] ?? 0);
      if (have <= 0) return say("You don't have that");
      const toIn = !!SMELT[id] && (!f.in || f.in === id);
      const toFuel = !toIn && fuelTime(id) > 0 && (!f.fuel || f.fuel === id);
      if (!toIn && !toFuel) return say(SMELT[id] || fuelTime(id) > 0 ? "That slot is busy" : "The kiln won't take that");
      const cur = toIn ? f.inN : f.fuelN;
      const k = Math.min(have, 64 - cur);
      if (k <= 0) return say("That slot is full");
      if (toIn) { f.in = id; f.inN = cur + k; } else { f.fuel = id; f.fuelN = cur + k; }
      if (!creative) {
        inv[id] -= k;
        if ((inv[id] ?? 0) <= 0) for (let i = 0; i < 9; i++) if (hotbar[i] === id) hotbar[i] = 0;
      }
      saveDirty = true;
      emit();
    },
    setSignText(t: string) {
      const at = hud.signEdit;
      if (!at) return;
      const key = at.x + "," + at.y + "," + at.z;
      const clean = t.trim().slice(0, 60);
      if (clean) signs.set(key, clean);
      else signs.delete(key);
      hud.signEdit = null;
      saveDirty = true;
      emit();
    },
    cancelSignEdit() {
      hud.signEdit = null;
      emit();
    },
    enchant(tier = 3) {
      enchOffersState = null;
      const chosenTier = Math.max(1, Math.min(3, Math.round(tier)));
      const shelves = hud.bookshelves || 0;
      const needShelves = chosenTier === 3 ? 6 : chosenTier === 2 ? 2 : 0;
      if (!creative && shelves < needShelves) {
        return say(`Tier ${ROMAN[chosenTier]} requires ${needShelves} Bookshelves around the Enchanting Table (have ${shelves})`);
      }
      const id = hotbar[slot];
      // A held book takes any rune and becomes an enchanted book.
      if (id === ID.Book) {
        const cur = { ...(ench.get(ID.EnchBook) ?? {}) };
        if (ENCHANTS.every((e) => (cur[e.key] ?? 0) >= e.max)) return say("That book knows every rune");
        if (!spendLevels(chosenTier)) return say("Need builder level " + chosenTier);
        const rolls = chosenTier;
        const got: string[] = [];
        for (let i = 0; i < rolls; i++) {
          const e = ENCHANTS[Math.floor(Math.random() * ENCHANTS.length)];
          if ((cur[e.key] ?? 0) >= e.max) continue;
          const conf = ENCH_CONFLICTS[e.key];
          if (conf && (cur[conf] ?? 0) > 0) continue;
          const boost = chosenTier === 3 && shelves >= 10 && cur[e.key] === undefined ? Math.min(e.max, 2) : 1;
          cur[e.key] = Math.min(e.max, (cur[e.key] ?? 0) + boost);
          got.push(e.name + (cur[e.key] > 1 ? " " + ROMAN[cur[e.key]] : ""));
        }
        if (!got.length) return say("The runes fizzle — try again");
        ench.set(ID.EnchBook, cur);
        if (!creative) spend(ID.Book, 1);
        addInv(ID.EnchBook, 1);
        hotbar[slot] = ID.EnchBook;
        burst(focus.x + 0.5, focus.y + 1.1, focus.z + 0.5, "#ba6eff", 14);
        say("The book glows: " + got.join(", "));
        saveDirty = true;
        emit();
        return;
      }
      const d = def(id);
      if (!id || (!d.maxUse && !d.armor)) return say("Hold a tool, weapon, armor piece, or book");
      const pool = ENCHANTS.filter((e) => e.for(d));
      if (!pool.length) return say("Nothing can enchant that");
      const cur = { ...(ench.get(id) ?? {}) };
      if (pool.every((e) => (cur[e.key] ?? 0) >= e.max)) return say("That piece is fully enchanted");
      if (!spendLevels(chosenTier)) return say("Need builder level " + chosenTier);
      const rolls = chosenTier === 3 ? 2 + (Math.random() < 0.65 ? 1 : 0) : chosenTier === 2 ? 1 + (Math.random() < 0.75 ? 1 : 0) : 1;
      const got: string[] = [];
      for (let i = 0; i < rolls; i++) {
        const candidates = pool.filter((e) => {
          if ((cur[e.key] ?? 0) >= e.max) return false;
          const conf = ENCH_CONFLICTS[e.key];
          return !(conf && (cur[conf] ?? 0) > 0);
        });
        if (!candidates.length) break;
        const e = candidates[Math.floor(Math.random() * candidates.length)];
        const addLv = chosenTier === 3 && shelves >= 8 && Math.random() < 0.55 ? 2 : 1;
        cur[e.key] = Math.min(e.max, (cur[e.key] ?? 0) + addLv);
        got.push(e.name + (cur[e.key] > 1 ? " " + ROMAN[cur[e.key]] : ""));
      }
      if (!got.length) return say("The runes fizzle — try again");
      ench.set(id, cur);
      burst(focus.x + 0.5, focus.y + 1.1, focus.z + 0.5, "#5ce0d2", 16);
      say(`Tier ${ROMAN[chosenTier]} Enchanted: ` + got.join(", "));
      saveDirty = true;
      emit();
    },
    // Item 13 — UI of choice: reveal up to three DISTINCT rune offers for
    // the held piece (free to browse); the player picks one and only then
    // pays the tier's level cost. Same pool, shelf gates, conflict rule and
    // boost odds as the classic roll — the roll is replaced by a choice.
    enchantOffer(tier = 3) {
      const id = hotbar[slot];
      // A held book keeps the classic instant bind — it takes any rune.
      if (id === ID.Book) return api.enchant(tier);
      const chosenTier = Math.max(1, Math.min(3, Math.round(tier)));
      const shelves = hud.bookshelves || 0;
      const needShelves = chosenTier === 3 ? 6 : chosenTier === 2 ? 2 : 0;
      if (!creative && shelves < needShelves) {
        return say(`Tier ${ROMAN[chosenTier]} requires ${needShelves} Bookshelves around the Enchanting Table (have ${shelves})`);
      }
      const d = def(id);
      if (!id || (!d.maxUse && !d.armor)) return say("Hold a tool, weapon, armor piece, or book");
      const pool = ENCHANTS.filter((e) => e.for(d));
      if (!pool.length) return say("Nothing can enchant that");
      const cur = ench.get(id) ?? {};
      if (pool.every((e) => (cur[e.key] ?? 0) >= e.max)) return say("That piece is fully enchanted");
      const shuffled = pool.slice();
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const taken = new Set<string>();
      const offers: { key: string; name: string; label: string; to: number }[] = [];
      for (const e of shuffled) {
        if (offers.length >= 3) break;
        if ((cur[e.key] ?? 0) >= e.max || taken.has(e.key)) continue;
        const conf = ENCH_CONFLICTS[e.key];
        if (conf && ((cur[conf] ?? 0) > 0 || taken.has(conf))) continue;
        // The level is decided now, with the classic boost odds, so the
        // button shows exactly what the pick will grant.
        const addLv = chosenTier === 3 && shelves >= 8 && Math.random() < 0.55 ? 2 : 1;
        const to = Math.min(e.max, (cur[e.key] ?? 0) + addLv);
        offers.push({ key: e.key, name: e.name, label: e.name + (to > 1 ? " " + ROMAN[to] : ""), to });
        taken.add(e.key);
      }
      if (!offers.length) return say("Every remaining rune conflicts with one it already carries");
      enchOffersState = { itemId: id, tier: chosenTier, offers };
      say(`Tier ${ROMAN[chosenTier]} — the table offers ${offers.length} rune${offers.length > 1 ? "s" : ""}: choose one`);
      emit();
    },
    enchantPick(i: number) {
      const st = enchOffersState;
      if (!st) return;
      const offer = st.offers[i];
      if (!offer || hotbar[slot] !== st.itemId) {
        enchOffersState = null;
        emit();
        return;
      }
      const e = ENCHANTS.find((x) => x.key === offer.key);
      if (!e) {
        enchOffersState = null;
        emit();
        return;
      }
      const cur = { ...(ench.get(st.itemId) ?? {}) };
      if ((cur[e.key] ?? 0) >= e.max) {
        enchOffersState = null;
        return say("That rune is already maxed");
      }
      const conf = ENCH_CONFLICTS[e.key];
      if (conf && (cur[conf] ?? 0) > 0) {
        enchOffersState = null;
        return say("That rune now conflicts with one it already carries");
      }
      if (!spendLevels(st.tier)) return say("Need builder level " + st.tier);
      cur[e.key] = Math.max(cur[e.key] ?? 0, Math.min(e.max, offer.to));
      ench.set(st.itemId, cur);
      enchOffersState = null;
      burst(focus.x + 0.5, focus.y + 1.1, focus.z + 0.5, "#5ce0d2", 16);
      say(`Tier ${ROMAN[st.tier]} Enchanted: ` + offer.label);
      saveDirty = true;
      emit();
    },
    enchantCancel() {
      if (!enchOffersState) return;
      enchOffersState = null;
      emit();
    },
    combine() {
      const heldId = hotbar[slot];
      const sacId = offhand;
      if (!heldId || !def(heldId).maxUse) return say("Hold the piece to keep");
      // An enchanted book in the off hand pours its runes into the piece.
      if (sacId === ID.EnchBook) {
        const book = ench.get(ID.EnchBook) ?? {};
        if (!Object.keys(book).length) return say("That book carries no runes");
        const a = { ...(ench.get(heldId) ?? {}) };
        let changed = false;
        for (const e of ENCHANTS) {
          const bv = book[e.key] ?? 0;
          if (!bv || !e.for(def(heldId))) continue;
          const conf = ENCH_CONFLICTS[e.key];
          if (conf && (a[conf] ?? 0) > 0) continue;
          const av = a[e.key] ?? 0;
          if (av === 0) {
            a[e.key] = bv;
            changed = true;
          } else if (av === bv && av < e.max) {
            a[e.key] = av + 1;
            changed = true;
          }
        }
        if (!changed) return say("None of the book's runes fit that piece");
        if (!spendLevels(2)) return say("Need builder level 2");
        ench.set(heldId, a);
        ench.delete(ID.EnchBook);
        offhand = 0;
        say("Book applied: " + (enchSummary(heldId) || "runes merged"));
        saveDirty = true;
        emit();
        return;
      }
      if (!sacId || sacId !== heldId) return say("Put an identical piece in your off hand");
      const a = { ...(ench.get(heldId) ?? {}) };
      const b = ench.get(sacId) ?? {};
      let changed = false;
      for (const e of ENCHANTS) {
        const bv = b[e.key] ?? 0;
        if (!bv) continue;
        const av = a[e.key] ?? 0;
        if (av === 0) {
          a[e.key] = bv;
          changed = true;
        } else if (av === bv && av < e.max) {
          a[e.key] = av + 1;
          changed = true;
        }
      }
      if (!changed && !Object.keys(b).length) return say("The off-hand piece carries no runes");
      if (!changed) return say("No rune can rise — already stronger or maxed");
      if (!spendLevels(2)) return say("Need builder level 2");
      ench.set(heldId, a);
      offhand = 0;
      say("Combined: " + (enchSummary(heldId) || "runes merged"));
      saveDirty = true;
      emit();
    },
    disenchant() {
      const id = hotbar[slot];
      if (id === ID.EnchBook) {
        ench.delete(ID.EnchBook);
        hotbar[slot] = ID.Book;
        if ((inv[ID.EnchBook] ?? 0) > 0) {
          inv[ID.EnchBook] = (inv[ID.EnchBook] ?? 1) - 1;
          addInv(ID.Book, 1);
        }
        say("The book is blank again");
        saveDirty = true;
        emit();
        return;
      }
      if (!id || !ench.get(id)) return say("Hold an enchanted piece");
      ench.delete(id);
      say("Runes stripped clean");
      saveDirty = true;
      emit();
    },
    mend() {
      const id = hotbar[slot];
      const d = def(id);
      if (!d.maxUse) return say("Hold a worn tool");
      if (!creative && (inv[ID.Ingot] ?? 0) < 1) return say("Need an ingot");
      if (!creative) spend(ID.Ingot, 1);
      inv[id] = d.maxUse;
      if (!hotbar.includes(id)) hotbar[slot] = id;
      say("Mended");
      emit();
    },
    temper() {
      const id = hotbar[slot];
      const d = def(id);
      if (!d.maxUse) return say("Hold a tool");
      const cap = d.maxUse + Math.round(d.maxUse * 0.5);
      if ((inv[id] ?? 0) >= cap) return say("Already tempered");
      if (!spendLevels(1)) return say("Need 1 level");
      inv[id] = Math.min(cap, (inv[id] ?? 0) + Math.round(d.maxUse * 0.35));
      if (!hotbar.includes(id)) hotbar[slot] = id;
      say("Tempered");
      emit();
    },
    beacon(buff: string) {
      if (world.get(focus.x, focus.y, focus.z) !== ID.Beacon) return;
      const level = pyramidLevel(focus.x, focus.y, focus.z);
      hud.beaconLevel = level;
      if (!buff) return;
      if (level < (BUFF_NEED[buff] ?? 1)) return say("The pyramid is too small for that blessing");
      beaconBuffs.set(focus.x + "," + focus.y + "," + focus.z, buff);
      hud.beaconBuff = buff;
      say("Beacon blessing: " + buff);
      saveDirty = true;
      emit();
    },
    brew(kind) {
      if (kind === "focus" && !gate(6)) return;
      // from = the vessel item, need = the ingredient, out = the result.
      // Classics go bottle -> brew in one step; chain brews start from a
      // base brew; splashes finish a finished brew with powder.
      const R: Record<string, { from: number; need: number; out: number }> = {
        heal: { from: ID.Bottle, need: ID.Apple, out: ID.PotionHeal },
        speed: { from: ID.Bottle, need: ID.Wart, out: ID.PotionSpeed },
        focus: { from: ID.Bottle, need: ID.Amber, out: ID.Focus },
        might: { from: ID.Bottle, need: ID.Blaze, out: ID.PotionStr },
        base: { from: ID.Bottle, need: ID.Wart, out: ID.BaseBrew },
        regen: { from: ID.BaseBrew, need: ID.Fang, out: ID.PotionRegen },
        fireward: { from: ID.BaseBrew, need: ID.Cinder, out: ID.PotionFire },
        leap: { from: ID.BaseBrew, need: ID.Feather, out: ID.PotionLeap },
        gill: { from: ID.BaseBrew, need: ID.Fish, out: ID.PotionGill },
        veil: { from: ID.BaseBrew, need: ID.Frost, out: ID.PotionVeil },
        venom: { from: ID.BaseBrew, need: ID.MushroomRed, out: ID.PotionVenom },
        tar: { from: ID.BaseBrew, need: ID.Slime, out: ID.PotionTar },
        splashvenom: { from: ID.PotionVenom, need: ID.Powder, out: ID.SplashVenom },
        splashtar: { from: ID.PotionTar, need: ID.Powder, out: ID.SplashTar },
      };
      const r = R[kind];
      if (!r) return;
      if (!creative && (inv[r.from] ?? 0) < 1) return say("Need " + def(r.from).name.toLowerCase());
      if (!creative && (inv[r.need] ?? 0) < 1) return say("Need " + def(r.need).name.toLowerCase());
      if (!creative) {
        spend(r.from, 1);
        spend(r.need, 1);
      }
      addInv(r.out, 1);
      say(def(r.out).name);
      emit();
    },
    trade(i) {
      const offer = traderOf(traderRole).offers[i];
      if (!offer) return;
      const key = curTraderKey();
      const rep = repAtKey(key);
      if (rep <= -50) return say("This hamlet won't trade with you — your name is mud here. Earn it back: quests, patience, and keeping the folk safe.");
      const tier = offer.tier ?? 1;
      const before = tradeLevelFor(tradeXp[traderRole] ?? 0);
      if (tier > before) return say("Locked — this " + traderOf(traderRole).name.toLowerCase() + " is a " + TIER_NAMES[before] + ". Trade more to reach " + TIER_NAMES[tier] + ".");
      const stocks = stockFor(key + ":" + traderRole);
      if (!creative && (stocks[i] ?? 0) <= 0) return say("Out of stock — the folk restock morning and afternoon.");
      const pn = priceFor(offer.pn, key);
      if (!creative && (inv[offer.pay] ?? 0) < pn) return say("Need " + pn + " " + def(offer.pay).name.toLowerCase());
      if (!creative) {
        spend(offer.pay, pn);
        stocks[i] -= 1;
      }
      give(offer.out, offer.on);
      tradeXp[traderRole] = (tradeXp[traderRole] ?? 0) + 1;
      if (rep < 30) addRep(key, 1);
      const after = tradeLevelFor(tradeXp[traderRole]);
      if (after > before) say(traderOf(traderRole).name + " is now a " + TIER_NAMES[after] + "! New offers unlocked.");
      else say("Traded");
      saveDirty = true;
      emit();
    },
    hostOnline() {
      void startOnline(true);
      emit();
    },
    joinOnline() {
      void startOnline(false);
      emit();
    },
    leaveOnline() {
      mp.close();
      clearRemotes();
      say("Left the room");
      emit();
    },
    unlock(id) {
      const node = skillById(id);
      if (!node || skills.has(id)) return;
      if (node.need && !skills.has(node.need)) return say("Learn " + (skillById(node.need)?.name ?? "the earlier node") + " first");
      if (!creative && rankLv < node.rank) return say("Need builder level " + node.rank);
      if (!creative && skills.size >= rankLv) return say("No skill points. Rank up.");
      skills.add(id);
      mana = Math.max(mana, 0);
      say(node.name);
      saveDirty = true;
      emit();
    },
    setMod(key, on) {
      settings.mods[key] = on;
      persistSettings();
      const label = key === "hard" ? "Hard nights" : key === "generous" ? "Generous parts" : key === "peaceful" ? "Peaceful bricks" : "Spellcraft";
      say(on ? label + " on" : label + " off");
      emit();
    },
    claim(id) {
      const q = QUESTS.find((entry) => entry.id === id);
      const prog = quests.find((entry) => entry.id === id);
      if (!q || !prog) return;
      if (prog.done) return say("Already claimed");
      if (!questActive(q, (id) => quests.find((p) => p.id === id)?.done ?? false))
        return say("Locked — finish the earlier steps of " + (q.chain ? CHAINS[q.chain].name : "this line") + " first");
      if (q.kind === "have") {
        if (q.id === "gem") {
          const use = (inv[ID.Diamond] ?? 0) > 0 ? ID.Diamond : (inv[ID.Prism] ?? 0) > 0 ? ID.Prism : 0;
          if (!use && !creative) return say("Need an aqua gem or a prism");
          if (use && !creative) spend(use, 1);
        } else if (!creative && (inv[q.what] ?? 0) < q.need) {
          return say("Need " + q.need + " " + def(q.what).name.toLowerCase());
        } else if (!creative && !q.keep) spend(q.what, q.need);
      } else if (prog.n < q.need) return say(q.detail);
      prog.done = true;
      prog.n = q.need;
      addRep(repKeyFor(player.x, player.z), 5);
      const before = rankLv;
      for (const [rid, rn] of q.reward) give(rid, rn);
      gainXp(q.xp);
      if (rankLv === before) say("Claimed " + q.name);
      emit();
    },
    press(id) {
      if (!COLORS_OK(id)) return;
      if (creative) {
        addInv(id, 1);
        hotbar[slot] = id;
        say("Stamped");
        return;
      }
      const sources = [ID.Dirt, ID.Stone, ID.Sand, ID.Grass, ID.Log, ID.Planks, ID.Leaves, ...COLOR_IDS];
      for (const src of sources) {
        if (src === id) continue;
        if ((inv[src] ?? 0) > 0) {
          inv[src] -= 1;
          addInv(id, 1);
          saveDirty = true;
          say("Pressed a " + def(id).name.toLowerCase() + " brick");
          return;
        }
      }
      say("Need a spare brick to press");
    },
    shiftStack(id) {
      if (!id) return;
      if (!creative && (inv[id] ?? 0) <= 0) return say("You don't have that");
      const on = hotbar.indexOf(id);
      if (on >= 0) {
        for (let i = 0; i < 9; i++) if (hotbar[i] === id) hotbar[i] = 0;
        say(def(id).name + " back in the bag");
      } else {
        const empty = hotbar.indexOf(0);
        const at = empty >= 0 ? empty : slot;
        hotbar[at] = id;
        slot = at;
        say(def(id).name + " on the bar");
      }
      saveDirty = true;
      emit();
    },
    setSens(n) {
      settings.sens = n;
      persistSettings();
      emit();
    },
    setRadius(n) {
      settings.radius = n;
      persistSettings();
      emit();
    },
    setSound(on) {
      settings.sound = on;
      audio.setEnabled(on);
      persistSettings();
      emit();
    },
    setStuds(on) {
      settings.studs = on;
      for (const key of meshes.keys()) dirty.add(key);
      persistSettings();
      emit();
    },
    setQuality(q) {
      settings.quality = q;
      qLevel = 0;
      qBad = 0;
      qGood = 0;
      applyQuality();
      persistSettings();
      emit();
    },
    setRealistic(on) {
      settings.realistic = on;
      relight();
      persistSettings();
      emit();
    },
    setThird(on) {
      settings.third = on;
      persistSettings();
      emit();
    },
    setUpscale(u) {
      settings.upscale = u;
      prScale = 1;
      persistSettings();
      emit();
    },
    setSharpness(n) {
      settings.sharpness = Math.max(0, Math.min(1, n));
      persistSettings();
      emit();
    },
    setFov(n) {
      settings.fov = Math.max(55, Math.min(100, Math.round(n)));
      persistSettings();
      emit();
    },
    setShowFps(on) {
      settings.showFps = on;
      persistSettings();
      emit();
    },
    setMusic(n) {
      settings.music = Math.max(0, Math.min(1, n));
      persistSettings();
      emit();
    },
    setSfx(n) {
      settings.sfx = Math.max(0, Math.min(1, n));
      audio.setVolume(settings.sfx);
      persistSettings();
      emit();
    },
    setHaptics(on) {
      settings.haptics = on;
      persistSettings();
      emit();
    },
    setDead(side, v) {
      const c = Math.max(0.02, Math.min(0.4, v));
      if (side === "left") settings.deadL = c;
      else settings.deadR = c;
      persistSettings();
      emit();
    },
    setAdaptive(on) {
      settings.adaptive = on;
      persistSettings();
      emit();
      if (on) void dsRequest().then(() => emit());
      else void dsRelease();
    },
    dsState() {
      return dsState(settings.adaptive);
    },
    setInvertY(on) {
      settings.invertY = on;
      persistSettings();
      emit();
    },
    answer(text) {
      const resolve = askResolve;
      askResolve = null;
      hud.ask = null;
      if (phase === "play" && !touchMode) lockPointer();
      emit();
      resolve?.(text);
    },
    uiSound(kind) {
      if (!settings.sound) return;
      audio.unlock();
      if (kind === "hover") audio.uiHover();
      else if (kind === "click") audio.uiClick();
      else if (kind === "open") audio.uiOpen();
      else audio.uiClose();
    },
    deleteSave() {
      if (worldId) deleteWorld(worldId);
      else clearSave();
      hasSaveFlag = listWorlds().length > 0;
      emit();
    },
    setSeed(text) {
      pendingSeed = text;
    },
    deleteSlot(id) {
      deleteWorld(id);
      hasSaveFlag = listWorlds().length > 0;
      emit();
    },
    copySeed() {
      const text = seedText || String(seed);
      const done = () => say("Seed copied");
      const fail = () => say("Seed " + text);
      if (navigator.clipboard?.writeText) void navigator.clipboard.writeText(text).then(done, fail);
      else fail();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    destroy() {
      running = false;
      renderer.setAnimationLoop(null);
      ac.abort();
      // Music kept playing after the game unmounted (route change, hot reload).
      musicEl.pause();
      musicEl.removeAttribute("src");
      audio.suspend();
      upscaler.dispose();
      timer.dispose();
      for (const key of [...meshes.keys()]) dropChunk(key);
      atlas.dispose();
      opaqueMat.dispose();
      glassMat.dispose();
      waterMat.dispose();
      plantMat.dispose();
      moltenStd.dispose();
      moltenLam.dispose();
      mobBatchRenderer.dispose();
      renderer.dispose();
      if (window.__controlsTest) delete window.__controlsTest;
    },
  };

  snapshot();
  return api;
}

const COLOR_IDS: number[] = [ID.Red, ID.Orange, ID.Yellow, ID.Green, ID.Blue, ID.Azure, ID.Pink, ID.White, ID.Black];
function COLORS_OK(id: number) {
  return COLOR_IDS.includes(id);
}
function AXE_OK(id: number) {
  return (
    id === ID.Log ||
    id === ID.Planks ||
    id === ID.SlabPlanks ||
    id === ID.StairsPlanks0 ||
    id === ID.StairsPlanks1 ||
    id === ID.StairsPlanks2 ||
    id === ID.StairsPlanks3 ||
    id === ID.Bench ||
    id === ID.Chest ||
    id === ID.Barrel ||
    id === ID.Bookshelf ||
    id === ID.Jukebox ||
    id === ID.Sign ||
    id === ID.Banner ||
    id === ID.Campfire ||
    id === ID.Door ||
    id === ID.DoorOpen ||
    id === ID.Ladder ||
    id === ID.Bed ||
    id === ID.Fence ||
    id === ID.Gate ||
    id === ID.GateOpen ||
    id === ID.Note
  );
}
function SHOVEL_OK(id: number) {
  return (
    id === ID.Dirt ||
    id === ID.Sand ||
    id === ID.Grass ||
    id === ID.Farmland ||
    id === ID.Gravel ||
    id === ID.GravelBar ||
    id === ID.Soul ||
    id === ID.Mud ||
    id === ID.Clay ||
    id === ID.Snow ||
    id === ID.AshSoil ||
    id === ID.Moss
  );
}

function lerpHex(a: number, b: number, t: number) {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const r = ar + (br - ar) * t;
  const g = ag + (bg - ag) * t;
  const bl = ab + (bb - ab) * t;
  return ((r | 0) << 16) | ((g | 0) << 8) | (bl | 0);
}

let plasticOn = true;

const srnLightU = {
  uSunDir: { value: new THREE.Vector3(0.45, 0.82, 0.35).normalize() },
  uSunCol: { value: new THREE.Color(0xfff5e0) },
  uSkyCol: { value: new THREE.Color(0xd4ebff) },
  uDayF: { value: 1.0 },
};

// Band-Limited Physical SIREN (Sinusoidal Representation Network) for Mobs & Minifigs:
// Uses a coupled 2-layer sinusoidal representation with analytic Gaussian Nyquist
// band-limiting so minifigs and creatures exhibit smooth injection-molded ABS satin
// sheen, subtle part-line seams, and light-coupled subsurface scattering without
// high-frequency aliasing or unlit night-time glow.
const sirenAmt = { value: 1 };

function sirenize(mat: THREE.MeshStandardMaterial) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSirenAmt = sirenAmt;
    shader.uniforms.uSunDir = srnLightU.uSunDir;
    shader.uniforms.uSunCol = srnLightU.uSunCol;
    shader.uniforms.uSkyCol = srnLightU.uSkyCol;
    shader.uniforms.uDayF = srnLightU.uDayF;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vSirenPos;\nvarying vec3 vSirenWPos;\nvarying vec3 vSirenWNrm;")
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>
#ifdef USE_INSTANCING
vSirenWNrm = normalize(mat3(modelMatrix) * (mat3(instanceMatrix) * objectNormal));
#else
vSirenWNrm = normalize(mat3(modelMatrix) * objectNormal);
#endif`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vSirenPos = position;
#ifdef USE_INSTANCING
vSirenWPos = (modelMatrix * (instanceMatrix * vec4(position, 1.0))).xyz;
#else
vSirenWPos = (modelMatrix * vec4(position, 1.0)).xyz;
#endif`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vSirenPos;
varying vec3 vSirenWPos;
varying vec3 vSirenWNrm;
uniform float uSirenAmt;
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform vec3 uSkyCol;
uniform float uDayF;
float gFigSubH;
float sirenHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.45, 37.719))) * 43758.5453); }
vec3 sirenFieldBand(vec3 p, float atten) {
  vec3 a = sin(p * 1.7 + sin(p.zxy * 2.3));
  vec3 b = cos(p * 3.1 + a * 1.4);
  return (a * 0.55 + b * 0.45) * atten;
}`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
{
  vec3 scell = vSirenPos * 6.0;
  gFigSubH = sirenHash(floor(scell));
  diffuseColor.rgb *= 0.975 + 0.05 * gFigSubH;
  vec3 sf = abs(fract(scell) - 0.5);
  float seam = smoothstep(0.43, 0.5, max(sf.x, max(sf.y, sf.z)));
  diffuseColor.rgb *= 1.0 - seam * 0.09 * uSirenAmt;
}`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor * 0.78 + (sirenHash(floor(vSirenPos * 16.0)) - 0.5) * 0.05 * uSirenAmt, 0.20, 0.68);`,
      )
      .replace(
        "#include <normal_fragment_begin>",
        `#include <normal_fragment_begin>
{
  vec3 fw = fwidth(vSirenPos * 24.0);
  float atten = exp(-1.8 * dot(fw, fw));
  vec3 microScratch = sirenFieldBand(vSirenPos * 28.0, atten) * 0.018;
  normal = normalize(normal + microScratch * uSirenAmt);
}`,
      )
      .replace(
        "#include <opaque_fragment>",
        `{
  vec3 vDir = normalize(vViewPosition);
  vec3 nV = normalize(normal);
  vec3 nW = normalize(vSirenWNrm);
  float ndv = clamp(dot(nV, vDir), 0.0, 1.0);
  // True ABS plastic IOR = 1.54 -> Schlick F0 = 0.0452
  float fres = 0.0452 + (1.0 - 0.0452) * pow(1.0 - ndv, 4.5);
  float litLuma = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
  float lightGate = clamp(litLuma * 2.3, 0.0, 1.0);
  // Analytical Studio Softbox HDRI reflection + warm back-lit ABS Subsurface Scattering
  vec3 viewW = normalize(cameraPosition - vSirenWPos);
  vec3 reflW = reflect(-viewW, nW);
  float sbKey = smoothstep(0.72, 0.90, dot(reflW, normalize(vec3(0.45, 0.78, 0.35))));
  float sbFill = smoothstep(0.76, 0.92, dot(reflW, normalize(vec3(-0.62, 0.60, -0.50))));
  vec3 studioSpec = (vec3(1.0, 0.98, 0.92) * sbKey * 0.36 + vec3(0.86, 0.93, 1.0) * sbFill * 0.20) * fres * lightGate;
  float sunBack = clamp(dot(-viewW, uSunDir) * 0.5 + 0.5, 0.0, 1.0);
  vec3 sss = pow(max(diffuseColor.rgb, vec3(0.02)), vec3(0.82)) * (1.0 - ndv) * (0.09 + 0.08 * sunBack) * lightGate;
  outgoingLight += (studioSpec + sss) * uSirenAmt;
}
#include <opaque_fragment>`,
      );
  };
  mat.customProgramCacheKey = () => "siren-creature-v5";
  return mat;
}

// Band-Limited Coupled 2-Layer Physical SIREN + Modular Sub-Brick Partitioning
// for Hyper-Realistic Macro LEGO ABS Plastic Bricks (v4.5):
//   1. Sub-Brick Running-Bond Partitioning (Zero extra polygons):
//      Every 1×1×1 block is mathematically partitioned into 3 horizontal courses
//      (y = 0.36, y = 0.72) and staggered running-bond vertical joints (1×2 bricks,
//      2×1 bricks, and a top 2×2 plate). Each sub-piece receives its own deterministic
//      hash `gSrnSubH = srnHashW(cell, course, subPiece)` for factory ABS tint tolerance,
//      satin roughness variation, and mechanical assembly micro-tilt (`gSrnTiltW`).
//   2. Stud-Aware Bevel Masking (`srnOnStud`) & Deep 3D Cavity Seams (`gSrnSeam`):
//      True 3D cylindrical studs protrude in silhouette without being sliced by block seams,
//      while inter-piece course joints carve deep analytical bevel normals and Cavity AO.
//   3. Macro ABS Optics (IOR 1.54 -> F0 = 0.0452, Analytical Studio Softbox HDRI,
//      Anisotropic Circular Micro-Scratches, Thick-Wall SSS & Trans-Clear Tube Refraction).
const srnWorldAmt = { value: 1 };

function sirenizeWorld(mat: THREE.MeshStandardMaterial, seamScale: number, reliefScale: number, cacheKey: string) {
  const seamU = { value: seamScale };
  const reliefU = { value: reliefScale };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSrnAmt = srnWorldAmt;
    shader.uniforms.uSrnSeam = seamU;
    shader.uniforms.uSrnRelief = reliefU;
    shader.uniforms.uSunDir = srnLightU.uSunDir;
    shader.uniforms.uSunCol = srnLightU.uSunCol;
    shader.uniforms.uSkyCol = srnLightU.uSkyCol;
    shader.uniforms.uDayF = srnLightU.uDayF;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vSrnPos;\nvarying vec3 vSrnNrm;")
      .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\nvSrnNrm = normalize(mat3(modelMatrix) * objectNormal);")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvSrnPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vSrnPos;
varying vec3 vSrnNrm;
uniform float uSrnAmt;
uniform float uSrnSeam;
uniform float uSrnRelief;
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform vec3 uSkyCol;
uniform float uDayF;
float gSrnF;
float gSrnSeam;
float gSrnH;
float gSrnSubH;
float gSrnScratch;
float gSrnEdgeSSS;
vec3 gSrnBevelW;
vec3 gSrnMicroNrmW;
float srnHashW(vec3 c) { return fract(sin(dot(c, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
{
  vec3 srnCell = floor(vSrnPos + vec3(0.0002, -0.14, 0.0002));
  gSrnH = srnHashW(srnCell);
  gSrnSubH = gSrnH;

  // Coupled 2-Layer Sinusoidal Representation Network (SIREN) with Analytic Nyquist Band-Limiting
  vec3 srnFwPos = fwidth(vSrnPos);
  float srnBand1 = exp(-12.0 * dot(srnFwPos, srnFwPos));
  float srnBand2 = exp(-160.0 * dot(srnFwPos, srnFwPos));

  vec3 srnL1 = sin(vSrnPos * 2.4 + gSrnH * 6.28318);
  vec3 srnL2Phase = vSrnPos.yzx * 4.8 + srnL1 * 1.35;
  vec3 srnL2 = sin(srnL2Phase) * srnBand1;
  gSrnF = dot(srnL2, vec3(0.38, 0.34, 0.28));

  // Circular micro-scratch field (only glints inside specular highlights)
  vec3 srnScratchP = vSrnPos * 26.0 + sin(vSrnPos.zxy * 19.0) * 1.6;
  gSrnScratch = sin(srnScratchP.x + cos(srnScratchP.y - srnScratchP.z)) * srnBand2;

  // Analytic derivative of Layer-2 + high-frequency satin ABS mold micro-field (zero dFdx noise)
  vec3 srnSatinPhase = vSrnPos * 18.0 + srnL1.yzx * 1.8;
  gSrnMicroNrmW = (cos(srnL2Phase) * 0.012 * srnBand1 + cos(srnSatinPhase) * 0.016 * srnBand2) * uSrnRelief * uSrnAmt;

  vec3 srnNrmW = normalize(vSrnNrm);
  vec3 srnAn = abs(srnNrmW);
  vec3 srnFp = fract(vSrnPos);

  // Detect whether fragment belongs to one of the 4 cylindrical 3D studs on top of a brick
  vec2 qCenter = vec2(srnFp.x < 0.5 ? 0.26 : 0.74, srnFp.z < 0.5 ? 0.26 : 0.74);
  vec2 sVec = srnFp.xz - qCenter;
  float sDist = length(sVec);
  vec2 sDir = sVec / (sDist + 0.0001);
  bool srnOnStud = (srnFp.y > 0.0004 && srnFp.y < 0.135 && sDist < 0.185);

  gSrnSeam = 0.0;
  gSrnBevelW = vec3(0.0);
  gSrnEdgeSSS = 0.0;

  if (srnOnStud) {
    // 3D Stud Surface: never slice the stud with the y=0 block boundary seam!
    float studIdx = (srnFp.x < 0.5 ? 0.0 : 1.0) + (srnFp.z < 0.5 ? 0.0 : 2.0);
    gSrnSubH = srnHashW(srnCell + vec3(studIdx * 3.7, 9.1, 0.0));
    diffuseColor.rgb *= 1.0 + ((gSrnH - 0.5) * 0.038 + gSrnF * 0.012) * uSrnAmt;
    if (srnNrmW.y > 0.75) {
      // Top cap of the 3D stud: radial crown bevel + central injection-mold gate dimple
      float crownRim = smoothstep(0.102, 0.148, sDist);
      gSrnBevelW.xz += sDir * crownRim * (0.32 * uSrnSeam * uSrnAmt);
      float gateDimple = sin(sDist * 88.0) * smoothstep(0.055, 0.01, sDist) * srnBand2;
      gSrnBevelW.xz += sDir * gateDimple * (0.07 * uSrnRelief * uSrnAmt);
      gSrnEdgeSSS = crownRim * 0.85;
    } else {
      // Cylindrical side wall of the 3D stud: deep base collar AO near y=0 and warm rim translucency
      float baseAO = 1.0 - smoothstep(0.001, 0.036, srnFp.y);
      diffuseColor.rgb *= 1.0 - baseAO * 0.22 * uSrnSeam * uSrnAmt;
      gSrnEdgeSSS = smoothstep(0.035, 0.11, srnFp.y) * 0.75;
    }
  } else {
    // Modular Sub-Brick Partitioning: 3 horizontal courses (y=0.36, y=0.72) + running-bond vertical joints
    float srnCourse = srnFp.y < 0.36 ? 0.0 : (srnFp.y < 0.72 ? 1.0 : 2.0);
    float srnU = srnAn.x > 0.5 ? srnFp.z : srnFp.x;
    float srnSubIdx = 0.0;
    if (srnAn.y < 0.5) {
      if (srnCourse == 1.0) {
        srnSubIdx = srnU < 0.5 ? 0.0 : 1.0;
      } else if (srnCourse == 0.0) {
        srnSubIdx = srnU < 0.25 ? 0.0 : (srnU < 0.75 ? 1.0 : 2.0);
      } else {
        srnSubIdx = 3.0;
      }
    }
    gSrnSubH = srnHashW(srnCell * 2.17 + vec3(srnCourse * 7.3, srnSubIdx * 13.7, 1.9));
    float srnSubH2 = srnHashW(srnCell * 3.91 + vec3(srnSubIdx * 5.1, srnCourse * 11.3, 4.7));

    // Per-sub-piece factory ABS color tolerance & subtle warm/cool pigment shift
    vec3 srnTintShift = vec3(1.0 + (gSrnSubH - 0.5) * 0.052, 1.0 + (gSrnSubH - 0.5) * 0.044, 1.0 + (srnSubH2 - 0.5) * 0.048);
    diffuseColor.rgb *= mix(vec3(1.0), srnTintShift + gSrnF * 0.014, uSrnAmt * clamp(uSrnSeam, 0.0, 1.0));

    // Per-sub-piece mechanical assembly micro-tilt (0.35° - 0.75° play between clipped LEGO pieces)
    vec3 srnTiltW = vec3(gSrnSubH - 0.5, srnSubH2 - 0.5, (gSrnH - 0.5)) * (0.046 * uSrnSeam * uSrnAmt * srnBand1);

    // Outer 1×1×1 voxel perimeter seam & chamfer
    vec3 srnMask = step(srnAn, vec3(0.5));
    vec3 srnBd = min(srnFp, 1.0 - srnFp) + (1.0 - srnMask) * 10.0;
    float srnB = min(srnBd.x, min(srnBd.y, srnBd.z));
    float srnFw = clamp(fwidth(srnB), 0.0005, 0.06);
    float srnFadeSeam = clamp(1.0 - srnFw * 11.0, 0.0, 1.0);
    gSrnSeam = (1.0 - smoothstep(0.0, 0.024 + srnFw * 1.15, srnB)) * srnFadeSeam;

    vec3 srnEdgeSign = sign(srnFp - 0.5);
    vec3 srnEdgeRamp = smoothstep(0.44, 0.50, abs(srnFp - 0.5)) * srnMask;
    gSrnBevelW = srnEdgeSign * srnEdgeRamp * (0.36 * uSrnSeam * uSrnAmt) + srnTiltW;
    gSrnEdgeSSS = max(srnEdgeRamp.x, max(srnEdgeRamp.y, srnEdgeRamp.z));

    // Sub-Brick Running-Bond Cavity Seams on Side Faces (y=0.36, y=0.72 and staggered u joints)
    if (srnAn.y < 0.5 && uSrnSeam > 0.5) {
      float dC1 = srnFp.y - 0.36;
      float dC2 = srnFp.y - 0.72;
      float hDist = min(abs(dC1), abs(dC2));
      float hSign = abs(dC1) < abs(dC2) ? sign(dC1) : sign(dC2);
      float hSeam = (1.0 - smoothstep(0.0, 0.018 + srnFw, hDist)) * srnFadeSeam;
      gSrnBevelW.y += -hSign * hSeam * (0.28 * uSrnSeam * uSrnAmt);

      float vDist = 10.0;
      float vSign = 0.0;
      if (srnCourse == 1.0) {
        vDist = abs(srnU - 0.5);
        vSign = sign(srnU - 0.5);
      } else if (srnCourse == 0.0) {
        float dQ1 = srnU - 0.25;
        float dQ2 = srnU - 0.75;
        vDist = min(abs(dQ1), abs(dQ2));
        vSign = abs(dQ1) < abs(dQ2) ? sign(dQ1) : sign(dQ2);
      }
      float vSeam = (1.0 - smoothstep(0.0, 0.016 + srnFw, vDist)) * srnFadeSeam;
      vec3 uAxis = srnAn.x > 0.5 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
      gSrnBevelW += -uAxis * (vSign * vSeam * 0.24 * uSrnSeam * uSrnAmt);

      float subCavity = max(hSeam, vSeam * 0.85);
      gSrnSeam = max(gSrnSeam, subCavity);
      gSrnEdgeSSS = max(gSrnEdgeSSS, subCavity * 0.55);
    }

    if (srnNrmW.y > 0.75) {
      // Top flat plate of the brick: 4 stud base contact AO rings & fillet normals
      float collar = exp(-((sDist - 0.148) * (sDist - 0.148)) / 0.00042);
      diffuseColor.rgb *= 1.0 - collar * 0.20 * uSrnSeam * uSrnAmt;
      gSrnBevelW.xz += sDir * collar * (0.26 * uSrnSeam * uSrnAmt);
      if (sDist < 0.145) {
        // For distant LOD chunks where 3D studs fade out, synthesize smooth 3D stud rim relief
        float lodRim = exp(-((sDist - 0.132) * (sDist - 0.132)) / 0.00035);
        gSrnBevelW.xz += sDir * lodRim * (0.24 * uSrnSeam * uSrnAmt);
        gSrnEdgeSSS = max(gSrnEdgeSSS, lodRim * 0.65);
      }
    }

    // Deep physical inter-brick & sub-brick Cavity AO
    diffuseColor.rgb *= 1.0 - gSrnSeam * 0.24 * uSrnSeam * uSrnAmt;
  }
}`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
{
  // Molded ABS satin roughness (0.22..0.54) with per-sub-brick finger/mold variance & Toksvig AA
  vec3 dNdx = dFdx(vSrnNrm);
  vec3 dNdy = dFdy(vSrnNrm);
  float geomAa = clamp((dot(dNdx, dNdx) + dot(dNdy, dNdy)) * 0.65, 0.0, 0.30);
  float fingerMatte = (gSrnSubH - 0.5) * 0.048 + gSrnF * 0.028;
  roughnessFactor = clamp(roughnessFactor * 0.38 + 0.09 + (fingerMatte + gSrnSeam * 0.16) * uSrnAmt + geomAa, 0.22, 0.80);
}`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
{
  // Apply band-limited analytical SIREN micro-normal + sub-brick bevels + per-piece tilt in view space
  float srnFade = clamp(26.0 / (1.0 + length(vViewPosition)), 0.12, 1.0);
  vec3 srnPerturbV = mat3(viewMatrix) * (gSrnBevelW + gSrnMicroNrmW);
  normal = normalize(normal + srnPerturbV * srnFade);
}`,
      )
      .replace(
        "#include <opaque_fragment>",
        `{
  // Macro Toy Photography ABS Optics (IOR = 1.54 -> F0 = 0.0452):
  //   - Analytical Studio HDRI Softbox reflections on chamfers, sub-brick tilts & 3D studs
  //   - Circular anisotropic micro-scratches inside specular highlights
  //   - Thick-wall warm ABS Subsurface Scattering (SSS) on back-lit studs & edges
  //   - Trans-Clear underside anti-stud coupling tube shadow on transparent blocks
  vec3 srnV = normalize(vViewPosition);
  vec3 srnN = normalize(normal);
  vec3 srnNrmW = normalize(vSrnNrm);
  float srnNdv = clamp(dot(srnN, srnV), 0.0, 1.0);
  float srnFresnel = 0.0452 + (1.0 - 0.0452) * pow(1.0 - srnNdv, 4.6);

  float srnLitLuma = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
  float srnLightGate = clamp(srnLitLuma * 2.4, 0.0, 1.0);

  // World-space reflection vector perturbed by sub-brick bevels & per-piece tilt
  vec3 srnViewW = normalize(cameraPosition - vSrnPos);
  vec3 srnPerturbNrmW = normalize(srnNrmW + (gSrnBevelW + gSrnMicroNrmW) * 0.85);
  vec3 srnReflW = reflect(-srnViewW, srnPerturbNrmW);

  // Analytical Studio Light Dome: Key Softbox + Rim Fill Strip + Sky Dome
  float sbKey = smoothstep(0.68, 0.90, dot(srnReflW, normalize(vec3(0.45, 0.78, 0.35))));
  float sbFill = smoothstep(0.74, 0.93, dot(srnReflW, normalize(vec3(-0.62, 0.60, -0.50))));
  float sbBounce = smoothstep(-0.1, 0.5, -srnReflW.y) * 0.12;
  float scratchGlint = 1.0 + gSrnScratch * 0.22;
  vec3 studioSoftbox = (vec3(1.0, 0.98, 0.92) * sbKey * 0.42 + vec3(0.86, 0.94, 1.0) * sbFill * 0.24 + uSkyCol * sbBounce) * scratchGlint;
  float srnSkyAlign = clamp(srnReflW.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 srnCoatCol = (mix(uSkyCol, uSunCol, 0.35 * uDayF) * (0.55 * srnFresnel * srnSkyAlign) + studioSoftbox * (0.45 + 0.55 * srnFresnel)) * srnLightGate;

  // Thick-wall ABS Subsurface Scattering (SSS): warm internal glow on back-lit studs & thin edges
  float srnSunWrap = clamp(dot(srnNrmW, uSunDir) * 0.5 + 0.5, 0.0, 1.0);
  float srnBackLit = pow(clamp(dot(-srnViewW, uSunDir) * 0.5 + 0.5, 0.0, 1.0), 2.4);
  vec3 srnWarmTint = pow(max(diffuseColor.rgb, vec3(0.02)), vec3(0.78)) * vec3(1.12, 0.98, 0.86);
  float srnSssFactor = (gSrnEdgeSSS * 0.14 + (1.0 - srnNdv) * 0.07) * (0.32 + 0.42 * srnSunWrap + 0.46 * srnBackLit);
  vec3 srnSSS = srnWarmTint * srnSssFactor * srnLightGate;

  // Trans-Clear / Refractive blocks (glassStd has uSrnSeam == 0.2): render internal shadow of
  // the underside anti-stud coupling tube (paintBottom) and chromatic edge dispersion!
  if (uSrnSeam > 0.15 && uSrnSeam < 0.25) {
    vec2 refrUv = fract(vSrnPos.xz - srnViewW.xz * 0.22);
    float antiTube = abs(length(refrUv - 0.5) - 0.22);
    float tubeRing = 1.0 - smoothstep(0.0, 0.042, antiTube) * 0.28;
    outgoingLight *= tubeRing;
    outgoingLight += vec3(0.88, 0.96, 1.04) * srnFresnel * 0.35 * srnLightGate;
  }

  outgoingLight += (srnSSS + srnCoatCol) * uSrnAmt;
}
#include <opaque_fragment>`,
      );
  };
  mat.customProgramCacheKey = () => cacheKey + "-siren-v6";
  return mat;
}

function skin(
  color: number | string,
  extra: { transparent?: boolean; opacity?: number; depthWrite?: boolean; depthTest?: boolean; side?: THREE.Side } = {},
) {
  if (plasticOn) return sirenize(new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0.0, ...extra }));
  return new THREE.MeshLambertMaterial({ color, ...extra });
}

function makeMinifig() {
  const fig = makeFig(0xe23b2f, 0x1f5fbf, 0x241c16, "smile");
  return { group: fig.group, legL: fig.legs[0], legR: fig.legs[1], armL: fig.legs[3], armR: fig.legs[2] };
}

const figGeo = new Map<string, THREE.BufferGeometry>();

function geoBox(w: number, h: number, d: number) {
  const k = "b" + w + ":" + h + ":" + d;
  let g = figGeo.get(k);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    figGeo.set(k, g);
  }
  return g;
}

function geoCyl(r: number, h: number, n = 12, rb = r) {
  const k = "c" + r + ":" + rb + ":" + h + ":" + n;
  let g = figGeo.get(k);
  if (!g) {
    g = new THREE.CylinderGeometry(r, rb, h, n);
    figGeo.set(k, g);
  }
  return g;
}

// Authentic tapered LEGO Minifig trapezoidal torso (narrower at neck collar, wider at waist)
function geoTrap(topW: number, botW: number, h: number, d: number) {
  const k = "trap:" + topW + ":" + botW + ":" + h + ":" + d;
  let g = figGeo.get(k);
  if (!g) {
    g = new THREE.BoxGeometry(botW, h, d);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const ratio = topW / botW;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > 0) {
        pos.setX(i, pos.getX(i) * ratio);
      }
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    figGeo.set(k, g);
  }
  return g;
}

// Authentic 45° LEGO slope brick for creature feet & brick-built snouts
function geoSlope(w: number, h: number, d: number) {
  const k = "slope:" + w + ":" + h + ":" + d;
  let g = figGeo.get(k);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      // Taper the top-front edge (-Z is forward in mob local space)
      if (pos.getY(i) > 0 && pos.getZ(i) < 0) {
        pos.setY(i, pos.getY(i) * 0.25);
      }
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    figGeo.set(k, g);
  }
  return g;
}

// Open 270° C-Clamp LEGO Minifig Hand
// v4.13: a real minifig hand — a hollow C-clip (annular sector, ~90° mouth) with
// rounded LEGO edges, extruded along Y like the old cylinder slice so every
// existing caller keeps its orientation (mouth faces +Z, axis along Y).
function geoClaw(r = 0.058, h = 0.068) {
  const k = "claw2:" + r + ":" + h;
  let g = figGeo.get(k);
  if (!g) {
    const inner = r * 0.62;
    const half = Math.PI * 0.25; // half of the mouth opening
    const bevel = Math.min(h * 0.16, r * 0.12);
    const sh = new THREE.Shape();
    // Shape in XY; mouth centred on +Y here, mapped to +Z after the rotation below.
    const a0 = Math.PI / 2 + half;
    const a1 = Math.PI / 2 - half + Math.PI * 2;
    sh.absarc(0, 0, r - bevel, a0, a1, false);
    sh.absarc(0, 0, inner + bevel, a1, a0, true);
    sh.closePath();
    g = new THREE.ExtrudeGeometry(sh, { depth: h - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 18 });
    g.translate(0, 0, -(h - bevel * 2) / 2);
    g.rotateX(-Math.PI / 2); // extrude axis Z → Y, shape +Y → -Z
    g.rotateY(Math.PI); // mouth back to +Z
    g.computeVertexNormals();
    figGeo.set(k, g);
  }
  return g;
}

function put(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0, noShadow = false) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.x = rx;
  if (noShadow) {
    mesh.castShadow = false;
    mesh.userData.noShadow = true;
  } else {
    mesh.castShadow = plasticOn;
  }
  mesh.receiveShadow = plasticOn;
  parent.add(mesh);
  return mesh;
}

// Pierced / hollow safety stud on top of LEGO Minifig heads
function hollowStud(parent: THREE.Object3D, mat: THREE.Material, darkMat: THREE.Material, x: number, y: number, z: number, r = 0.086, h = 0.062) {
  put(parent, geoCyl(r * 0.94, h, 12, r), mat, x, y + h / 2, z, 0, true);
  put(parent, geoCyl(r * 0.56, h * 0.35, 10), darkMat, x, y + h - h * 0.14, z, 0, true);
}

// Translucent refractive Trans-Neon / Trans-Red / Trans-Purple 1×1 LEGO tile material for mob eyes
function transTile(color: number, glowHex: number) {
  const mat = skin(color, { transparent: true, opacity: 0.88 });
  mat.emissive = new THREE.Color(glowHex);
  if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
    (mat as THREE.MeshStandardMaterial).roughness = 0.08;
    (mat as THREE.MeshStandardMaterial).emissiveIntensity = 0.85;
  }
  return mat;
}

function studs(parent: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number, w: number, d: number, nx: number, nz: number) {
  if (nx < 1 || nz < 1) return;
  const r = Number((Math.min(w / nx, d / nz) * 0.32).toFixed(4));
  const h = Number((r * (4 / 6)).toFixed(4));
  const geo = geoCyl(Number((r * 0.92).toFixed(4)), h, 10, r);
  for (let ix = 0; ix < nx; ix++) {
    for (let iz = 0; iz < nz; iz++) {
      put(parent, geo, mat, x - w / 2 + (w / nx) * (ix + 0.5), y + h / 2, z - d / 2 + (d / nz) * (iz + 0.5), 0, true);
    }
  }
}

function block(parent: THREE.Object3D, mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, nx = 0, nz = 0) {
  const mesh = put(parent, geoBox(w, h, d), mat, x, y, z);
  if (nx > 0) studs(parent, mat, x, y + h / 2, z, w, d, nx, nz || nx);
  return mesh;
}

function hinge(parent: THREE.Object3D, mat: THREE.Material, r: number, h: number, x: number, y: number, z: number) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  const mesh = new THREE.Mesh(geoCyl(r, h, 10), mat);
  mesh.position.y = -h / 2;
  mesh.castShadow = plasticOn;
  mesh.receiveShadow = plasticOn;
  pivot.add(mesh);
  parent.add(pivot);
  return pivot;
}

function legBox(parent: THREE.Object3D, mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  // Rounded hip hinge barrel nesting directly inside body underside socket with zero gap
  const bR = Math.min(w, d) * 0.48;
  const bH = Math.min(w, d) * 0.92;
  const hipHinge = new THREE.Mesh(geoCyl(bR, bH, 10), mat);
  hipHinge.rotation.z = Math.PI / 2;
  hipHinge.position.set(0, 0, 0);
  hipHinge.castShadow = false;
  hipHinge.userData.noShadow = true;
  pivot.add(hipHinge);
  // Upper brick leg column
  const mesh = new THREE.Mesh(geoBox(w, h * 0.76, d), mat);
  mesh.position.y = -(h * 0.38);
  mesh.castShadow = plasticOn;
  mesh.receiveShadow = plasticOn;
  pivot.add(mesh);
  // Sloped 1×2 LEGO foot brick at the bottom with a front toe stud
  const footH = Math.max(0.06, h * 0.28);
  const footD = d * 1.28;
  const foot = new THREE.Mesh(geoSlope(w * 1.04, footH, footD), mat);
  foot.position.set(0, -h + footH * 0.5, -d * 0.14);
  foot.castShadow = plasticOn;
  foot.receiveShadow = plasticOn;
  pivot.add(foot);
  parent.add(pivot);
  return pivot;
}

type FigFace = "smile" | "mad" | "skull" | "snout" | "nose";
type LegoBody = { group: THREE.Group; legs: THREE.Object3D[]; bodyMat: THREE.MeshStandardMaterial | THREE.MeshLambertMaterial };

function makeFig(shirt: number, pants: number, hairCol: number, face: FigFace, headCol = 0xf3d37a): LegoBody {
  const g = new THREE.Group();
  const shirtM = skin(shirt);
  const pantsM = skin(pants);
  const headM = skin(headCol);
  const hairM = skin(hairCol);
  const black = skin(0x1a120c);
  const white = skin(0xf7f4ee);
  const beltM = skin(0x3a2616);
  const goldM = skin(0xf5c518);

  // 1. T-Pelvis Hip Assembly, Molded Belt Buckle & Central Hinge Axle (Zero Gap to Torso)
  block(g, pantsM, 0.41, 0.065, 0.22, 0, 0.49, 0); // Waist hip plate (y: 0.4575 .. 0.5225)
  put(g, geoBox(0.415, 0.032, 0.228), beltM, 0, 0.515, 0, 0, true); // Leather waist belt
  put(g, geoBox(0.075, 0.042, 0.018), goldM, 0, 0.515, -0.116, 0, true); // Belt buckle
  block(g, pantsM, 0.065, 0.15, 0.20, 0, 0.40, 0); // Vertical T-bar between legs
  const hipAxle = put(g, geoCyl(0.042, 0.38, 10), pantsM, 0, 0.42, 0, 0, true);
  hipAxle.rotation.z = Math.PI / 2;

  // 2. Articulated Hinged LEGO Minifig Legs (hip barrel nests directly into pelvis underside)
  const makeMinifigLeg = (lx: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(lx, 0.42, 0);
    // Rounded upper hip barrel
    const barrel = put(pivot, geoCyl(0.088, 0.155, 12), pantsM, 0, 0, 0, 0, true);
    barrel.rotation.z = Math.PI / 2;
    // Main leg shaft
    put(pivot, geoBox(0.155, 0.31, 0.185), pantsM, 0, -0.18, 0);
    // Protruding front foot toe-block
    put(pivot, geoBox(0.158, 0.085, 0.225), pantsM, 0, -0.375, -0.02);
    // Two authentic anti-stud socket holes on the back of the leg (+Z)
    put(pivot, geoCyl(0.038, 0.016, 8), black, 0, -0.13, 0.09, Math.PI / 2, true);
    put(pivot, geoCyl(0.038, 0.016, 8), black, 0, -0.27, 0.09, Math.PI / 2, true);
    g.add(pivot);
    return pivot;
  };
  const legL = makeMinifigLeg(-0.115);
  const legR = makeMinifigLeg(0.115);

  // 3. Tapered Trapezoidal LEGO Torso (y: 0.52 .. 0.94 rests flush on hip plate 0.5225)
  const torso = put(g, geoTrap(0.35, 0.43, 0.42, 0.23), shirtM, 0, 0.73, 0);
  torso.userData.skin = "body";
  put(g, geoBox(0.16, 0.05, 0.018), white, 0, 0.89, -0.116, 0, true); // Collar undershirt V
  put(g, geoBox(0.022, 0.28, 0.016), black, 0, 0.71, -0.116, 0, true); // Tunic placket seam
  put(g, geoBox(0.085, 0.075, 0.016), beltM, -0.105, 0.77, -0.116, 0, true); // Chest pocket print
  put(g, geoCyl(0.092, 0.07, 12), headM, 0, 0.96, 0, 0, true); // Neck post
  put(g, geoCyl(0.105, 0.018, 12), black, 0, 0.945, 0, 0, true); // Crisp neck collar shadow ring

  // 4. Curved Cylindrical Arms with Shoulder Sockets tucked flush into Torso (Zero Gap)
  const makeMinifigArm = (side: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.195, 0.88, 0);
    pivot.rotation.z = -side * 0.11; // Slight outward flare matching tapered torso
    // Rounded shoulder ball tucked into torso cavity
    const sh = put(pivot, geoCyl(0.056, 0.09, 10), shirtM, 0, -0.02, 0, 0, true);
    sh.rotation.z = Math.PI / 2;
    // Upper & forearm angled segments
    put(pivot, geoCyl(0.052, 0.18, 10, 0.056), shirtM, side * 0.035, -0.11, 0.01, -0.10);
    put(pivot, geoCyl(0.048, 0.16, 10, 0.052), shirtM, side * 0.042, -0.25, -0.015, 0.18);
    // Wrist pin
    put(pivot, geoCyl(0.034, 0.055, 8), headM, side * 0.042, -0.34, -0.035, 0.22, true);
    // Open 270° C-Clamp LEGO Hand oriented to grip forward
    const clawGrp = new THREE.Group();
    clawGrp.position.set(side * 0.042, -0.39, -0.055);
    clawGrp.rotation.x = Math.PI / 2 + 0.22;
    clawGrp.rotation.z = Math.PI / 2;
    put(clawGrp, geoClaw(0.056, 0.066), headM, 0, 0, 0, 0, true);
    pivot.add(clawGrp);
    g.add(pivot);
    return pivot;
  };
  const armR = makeMinifigArm(1);
  const armL = makeMinifigArm(-1);

  // 5. Articulated Cylindrical LEGO Head Group (y: 0.955 sits flush on neck collar ring 0.945 with Zero Gap)
  const head = new THREE.Group();
  head.position.set(0, 0.955, 0);
  g.add(head);
  g.userData.head = head;

  put(head, geoCyl(0.154, 0.035, 16, 0.122), headM, 0, -0.005, 0, 0, true); // Bottom chin bevel
  put(head, geoCyl(0.154, 0.23, 18), headM, 0, 0.125, 0); // Main cylindrical head
  put(head, geoCyl(0.124, 0.035, 16, 0.154), headM, 0, 0.255, 0, 0, true); // Top brow bevel
  hollowStud(head, headM, black, 0, 0.272, 0, 0.088, 0.062); // Pierced safety stud
  // Molded hairpiece / cap with sideburns & back nape
  put(head, geoBox(0.32, 0.09, 0.24), hairM, 0, 0.24, 0.02);
  put(head, geoBox(0.31, 0.16, 0.08), hairM, 0, 0.14, 0.125, 0, true);

  // 6. Pad-Printed Glossy Ink Face Details (attached to articulated head)
  if (face === "skull") {
    put(head, geoBox(0.068, 0.068, 0.02), black, -0.058, 0.15, -0.152, 0, true);
    put(head, geoBox(0.068, 0.068, 0.02), black, 0.058, 0.15, -0.152, 0, true);
    put(head, geoBox(0.032, 0.042, 0.02), black, 0, 0.09, -0.154, 0, true);
    put(head, geoBox(0.11, 0.028, 0.02), black, 0, 0.04, -0.152, 0, true);
    put(g, geoBox(0.26, 0.025, 0.02), black, 0, 0.70, -0.122, 0, true);
    put(g, geoBox(0.26, 0.025, 0.02), black, 0, 0.79, -0.122, 0, true);
  } else if (face === "snout") {
    put(head, geoCyl(0.068, 0.095, 10), skin(0xf2a2c0), 0, 0.08, -0.175, Math.PI / 2, true);
    put(head, geoBox(0.024, 0.032, 0.02), black, -0.025, 0.08, -0.222, 0, true);
    put(head, geoBox(0.024, 0.032, 0.02), black, 0.025, 0.08, -0.222, 0, true);
    put(head, geoBox(0.048, 0.048, 0.02), black, -0.06, 0.17, -0.152, 0, true);
    put(head, geoBox(0.048, 0.048, 0.02), black, 0.06, 0.17, -0.152, 0, true);
    put(head, geoBox(0.018, 0.018, 0.022), white, -0.066, 0.18, -0.154, 0, true);
    put(head, geoBox(0.018, 0.018, 0.022), white, 0.052, 0.18, -0.154, 0, true);
  } else if (face === "nose") {
    put(head, geoBox(0.048, 0.048, 0.02), black, -0.058, 0.16, -0.152, 0, true);
    put(head, geoBox(0.048, 0.048, 0.02), black, 0.058, 0.16, -0.152, 0, true);
    put(head, geoBox(0.018, 0.018, 0.022), white, -0.064, 0.17, -0.154, 0, true);
    put(head, geoBox(0.018, 0.018, 0.022), white, 0.052, 0.17, -0.154, 0, true);
    put(head, geoBox(0.14, 0.024, 0.022), hairM, 0, 0.205, -0.154, 0, true); // Unibrow
    put(head, geoBox(0.08, 0.026, 0.02), black, 0, 0.045, -0.152, 0, true);
    put(head, geoCyl(0.05, 0.14, 10), skin(0xc47a2a), 0, 0.08, -0.19, Math.PI / 2, true);
  } else {
    // Classic LEGO Minifig Eyes + White Specular Catchlights + Smile/Brow
    put(head, geoBox(0.046, 0.048, 0.02), black, -0.056, 0.155, -0.152, 0, true);
    put(head, geoBox(0.046, 0.048, 0.02), black, 0.056, 0.155, -0.152, 0, true);
    put(head, geoBox(0.016, 0.016, 0.022), white, -0.062, 0.165, -0.154, 0, true);
    put(head, geoBox(0.016, 0.016, 0.022), white, 0.050, 0.165, -0.154, 0, true);
    put(head, geoBox(0.095, 0.024, 0.02), black, 0, 0.06, -0.152, 0, true);
    put(head, geoBox(0.024, 0.024, 0.02), black, -0.052, 0.072, -0.148, 0, true);
    put(head, geoBox(0.024, 0.024, 0.02), black, 0.052, 0.072, -0.148, 0, true);
    if (face === "mad") {
      put(head, geoBox(0.068, 0.022, 0.022), black, -0.058, 0.205, -0.155, 0, true);
      put(head, geoBox(0.068, 0.022, 0.022), black, 0.058, 0.205, -0.155, 0, true);
    }
  }
  return { group: g, legs: [legL, legR, armR, armL], bodyMat: shirtM };
}

function tagWool(group: THREE.Group, mat: THREE.Material) {
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.material === mat) mesh.userData.wool = true;
  });
}

function beast(kind: string): LegoBody {
  const g = new THREE.Group();
  const dark = skin(0x2a241c);
  const black = skin(0x1a120c);
  const white = skin(0xf7f4ee);
  if (kind === "sheep") {
    const wool = skin(0xf4f1ea);
    const woolPlate = skin(0xe8e4dc);
    const faceSkin = skin(0xd8b8a0);
    const body = block(g, wool, 0.78, 0.30, 0.50, 0, 0.54, 0, 0, 0);
    body.userData.skin = "body";
    // Modular top & side LEGO wool plates with studs + fluffy tail
    block(g, woolPlate, 0.76, 0.11, 0.48, 0, 0.745, 0, 3, 2);
    put(g, geoBox(0.68, 0.22, 0.56), woolPlate, 0, 0.55, 0);
    put(g, geoSlope(0.18, 0.16, 0.14), wool, 0, 0.56, 0.30, Math.PI, true);
    // Articulated LEGO Sheep Head with wool crown, horizontal pupils & floppy ears
    const head = new THREE.Group();
    head.position.set(0, 0.64, -0.32);
    g.add(head);
    g.userData.head = head;
    block(head, faceSkin, 0.26, 0.24, 0.26, 0, 0, -0.04, 0, 0);
    block(head, wool, 0.28, 0.10, 0.24, 0, 0.14, -0.02, 2, 1);
    put(head, geoSlope(0.18, 0.11, 0.12), skin(0xe8c4b8), 0, -0.06, -0.20, 0, true);
    put(head, geoBox(0.08, 0.05, 0.12), faceSkin, -0.16, 0.02, -0.02, 0, true);
    put(head, geoBox(0.08, 0.05, 0.12), faceSkin, 0.16, 0.02, -0.02, 0, true);
    put(head, geoBox(0.065, 0.045, 0.02), white, -0.08, 0.03, -0.172, 0, true);
    put(head, geoBox(0.065, 0.045, 0.02), white, 0.08, 0.03, -0.172, 0, true);
    put(head, geoBox(0.04, 0.035, 0.022), black, -0.085, 0.03, -0.175, 0, true);
    put(head, geoBox(0.04, 0.035, 0.022), black, 0.085, 0.03, -0.175, 0, true);
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, dark, 0.12, 0.39, 0.12, sx * 0.22, 0.39, sz * 0.14)));
    tagWool(g, wool);
    tagWool(g, woolPlate);
    return { group: g, legs, bodyMat: wool };
  }
  if (kind === "cow") {
    const hide = skin(0x784828);
    const spot = skin(0xf4f1ea);
    const udder = skin(0xf2a8c0);
    const body = block(g, hide, 0.9, 0.34, 0.48, 0, 0.58, 0, 0, 0);
    body.userData.skin = "body";
    block(g, hide, 0.88, 0.11, 0.46, 0, 0.805, 0, 4, 2);
    // Brick-built piebald white patches + pink udder
    put(g, geoBox(0.26, 0.12, 0.48), spot, -0.16, 0.806, 0, 0, true);
    put(g, geoBox(0.24, 0.22, 0.50), spot, 0.18, 0.62, 0, 0, true);
    put(g, geoBox(0.24, 0.09, 0.22), udder, 0.12, 0.38, 0, 0, true);
    // Articulated LEGO Cow Head with horns, ears & tan muzzle
    const head = new THREE.Group();
    head.position.set(0, 0.74, -0.31);
    g.add(head);
    g.userData.head = head;
    block(head, hide, 0.28, 0.28, 0.28, 0, 0.02, -0.04, 1, 1);
    put(head, geoSlope(0.20, 0.13, 0.14), skin(0xe8d0b8), 0, -0.06, -0.22, 0, true);
    put(head, geoBox(0.032, 0.032, 0.02), black, -0.05, -0.05, -0.29, 0, true);
    put(head, geoBox(0.032, 0.032, 0.02), black, 0.05, -0.05, -0.29, 0, true);
    put(head, geoBox(0.06, 0.05, 0.02), white, -0.09, 0.05, -0.182, 0, true);
    put(head, geoBox(0.06, 0.05, 0.02), white, 0.09, 0.05, -0.182, 0, true);
    put(head, geoBox(0.038, 0.045, 0.022), black, -0.09, 0.05, -0.185, 0, true);
    put(head, geoBox(0.038, 0.045, 0.022), black, 0.09, 0.05, -0.185, 0, true);
    put(head, geoCyl(0.036, 0.15, 8), spot, -0.13, 0.19, -0.02, -0.2, true);
    put(head, geoCyl(0.036, 0.15, 8), spot, 0.13, 0.19, -0.02, -0.2, true);
    put(head, geoBox(0.09, 0.05, 0.05), hide, -0.18, 0.08, -0.02, 0, true);
    put(head, geoBox(0.09, 0.05, 0.05), hide, 0.18, 0.08, -0.02, 0, true);
    // Articulated tail
    const tail = new THREE.Group();
    tail.position.set(0, 0.72, 0.22);
    put(tail, geoBox(0.06, 0.28, 0.06), hide, 0, -0.12, 0.04, 0.25, true);
    put(tail, geoBox(0.08, 0.09, 0.08), spot, 0, -0.26, 0.08, 0, true);
    g.add(tail);
    g.userData.tail = tail;
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, dark, 0.12, 0.41, 0.12, sx * 0.28, 0.41, sz * 0.12)));
    return { group: g, legs, bodyMat: hide };
  }
  if (kind === "pig") {
    const pink = skin(0xf2a2c0);
    const pinkPlate = skin(0xe894b4);
    const snoutM = skin(0xd96a8a);
    const body = block(g, pink, 0.7, 0.26, 0.42, 0, 0.44, 0, 0, 0);
    body.userData.skin = "body";
    block(g, pinkPlate, 0.68, 0.10, 0.40, 0, 0.62, 0, 3, 2);
    // Articulated LEGO Pig Head with 3D cylindrical snout, nostrils & floppy ears
    const head = new THREE.Group();
    head.position.set(0, 0.54, -0.28);
    g.add(head);
    g.userData.head = head;
    block(head, pink, 0.30, 0.26, 0.26, 0, 0.02, -0.04, 2, 1);
    put(head, geoCyl(0.082, 0.085, 10), snoutM, 0, -0.02, -0.19, Math.PI / 2, true);
    put(head, geoBox(0.026, 0.036, 0.02), black, -0.03, -0.02, -0.235, 0, true);
    put(head, geoBox(0.026, 0.036, 0.02), black, 0.03, -0.02, -0.235, 0, true);
    put(head, geoBox(0.06, 0.05, 0.02), white, -0.085, 0.05, -0.172, 0, true);
    put(head, geoBox(0.06, 0.05, 0.02), white, 0.085, 0.05, -0.172, 0, true);
    put(head, geoBox(0.038, 0.045, 0.022), black, -0.085, 0.05, -0.175, 0, true);
    put(head, geoBox(0.038, 0.045, 0.022), black, 0.085, 0.05, -0.175, 0, true);
    put(head, geoBox(0.05, 0.10, 0.09), pinkPlate, -0.165, 0.08, -0.05, 0.2, true);
    put(head, geoBox(0.05, 0.10, 0.09), pinkPlate, 0.165, 0.08, -0.05, 0.2, true);
    // Curly brick tail
    const tail = new THREE.Group();
    tail.position.set(0, 0.50, 0.20);
    put(tail, geoBox(0.06, 0.08, 0.08), snoutM, 0, 0.02, 0.04, 0.4, true);
    g.add(tail);
    g.userData.tail = tail;
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, pink, 0.1, 0.31, 0.1, sx * 0.2, 0.31, sz * 0.12)));
    return { group: g, legs, bodyMat: pink };
  }
  if (kind === "chicken") {
    const red = skin(0xe23b2f);
    const beak = skin(0xf07820);
    const body = block(g, white, 0.32, 0.26, 0.36, 0, 0.34, 0, 2, 2);
    body.userData.skin = "body";
    put(g, geoBox(0.05, 0.16, 0.24), white, -0.185, 0.36, 0.02, 0, true);
    put(g, geoBox(0.05, 0.16, 0.24), white, 0.185, 0.36, 0.02, 0, true);
    put(g, geoSlope(0.16, 0.14, 0.12), white, 0, 0.48, 0.20, Math.PI, true);
    const head = new THREE.Group();
    head.position.set(0, 0.46, -0.14);
    g.add(head);
    g.userData.head = head;
    block(head, white, 0.18, 0.22, 0.18, 0, 0.06, 0, 1, 1);
    put(head, geoBox(0.05, 0.09, 0.13), red, 0, 0.20, 0, 0, true); // Comb crest
    put(head, geoSlope(0.11, 0.07, 0.12), beak, 0, 0.04, -0.14, 0, true); // Beak
    put(head, geoBox(0.06, 0.07, 0.06), red, 0, -0.02, -0.11, 0, true); // Wattle
    put(head, geoBox(0.035, 0.035, 0.02), black, -0.06, 0.09, -0.092, 0, true);
    put(head, geoBox(0.035, 0.035, 0.02), black, 0.06, 0.09, -0.092, 0, true);
    const legs = [legBox(g, beak, 0.06, 0.21, 0.06, -0.06, 0.21, 0), legBox(g, beak, 0.06, 0.21, 0.06, 0.06, 0.21, 0)];
    return { group: g, legs, bodyMat: white };
  }
  if (kind === "horse") {
    const hide = skin(0x6b3e22);
    const saddle = skin(0x9a4820);
    const blaze = skin(0xf4f1ea);
    const body = block(g, hide, 1.05, 0.38, 0.38, 0, 0.78, 0, 4, 2);
    body.userData.skin = "body";
    // Molded LEGO saddle & stirrups
    put(g, geoBox(0.36, 0.09, 0.42), saddle, 0, 0.99, 0, 0, true);
    // Articulated neck + head group
    const head = new THREE.Group();
    head.position.set(0, 0.96, -0.28);
    g.add(head);
    g.userData.head = head;
    put(head, geoBox(0.22, 0.38, 0.22), hide, 0, 0.14, -0.06, -0.35);
    block(head, hide, 0.24, 0.22, 0.34, 0, 0.32, -0.18, 1, 1);
    put(head, geoSlope(0.18, 0.14, 0.18), hide, 0, 0.28, -0.40, 0, true);
    put(head, geoBox(0.07, 0.06, 0.26), blaze, 0, 0.39, -0.24, 0, true); // White forehead blaze
    put(head, geoBox(0.07, 0.32, 0.08), black, 0, 0.20, 0.08, -0.35, true); // Dark mane
    put(head, geoBox(0.05, 0.10, 0.05), hide, -0.08, 0.46, -0.08, 0, true);
    put(head, geoBox(0.05, 0.10, 0.05), hide, 0.08, 0.46, -0.08, 0, true);
    put(head, geoBox(0.045, 0.045, 0.02), black, -0.122, 0.34, -0.22, 0, true);
    put(head, geoBox(0.045, 0.045, 0.02), black, 0.122, 0.34, -0.22, 0, true);
    // Flowing tail
    const tail = new THREE.Group();
    tail.position.set(0, 0.88, 0.16);
    put(tail, geoBox(0.10, 0.38, 0.12), black, 0, -0.16, 0.06, 0.3, true);
    g.add(tail);
    g.userData.tail = tail;
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, hide, 0.11, 0.59, 0.11, sx * 0.28, 0.59, sz * 0.28)));
    return { group: g, legs, bodyMat: hide };
  }
  if (kind === "fox") {
    const coat = skin(0xf07820);
    const body = block(g, coat, 0.68, 0.26, 0.32, 0, 0.40, 0, 3, 1);
    body.userData.skin = "body";
    put(g, geoBox(0.28, 0.14, 0.12), white, 0, 0.36, -0.20, 0, true); // Fluffy white chest bib
    // Articulated LEGO Fox Head
    const head = new THREE.Group();
    head.position.set(0, 0.48, -0.33);
    g.add(head);
    g.userData.head = head;
    block(head, coat, 0.26, 0.20, 0.24, 0, 0.02, -0.04, 1, 1);
    put(head, geoSlope(0.12, 0.09, 0.16), white, 0, -0.03, -0.22, 0, true);
    put(head, geoBox(0.04, 0.04, 0.03), black, 0, -0.01, -0.30, 0, true); // Wet black nose stud
    put(head, geoBox(0.07, 0.12, 0.04), coat, -0.09, 0.16, -0.04, 0, true);
    put(head, geoBox(0.07, 0.12, 0.04), coat, 0.09, 0.16, -0.04, 0, true);
    put(head, geoBox(0.04, 0.07, 0.02), black, -0.09, 0.16, -0.062, 0, true);
    put(head, geoBox(0.04, 0.07, 0.02), black, 0.09, 0.16, -0.062, 0, true);
    put(head, geoBox(0.045, 0.04, 0.02), black, -0.075, 0.03, -0.162, 0, true);
    put(head, geoBox(0.045, 0.04, 0.02), black, 0.075, 0.03, -0.162, 0, true);
    // Articulated bushy tail with white tip
    const tail = new THREE.Group();
    tail.position.set(0, 0.44, 0.15);
    block(tail, coat, 0.16, 0.16, 0.24, 0, 0.02, 0.12, 1, 1);
    put(tail, geoBox(0.14, 0.14, 0.12), white, 0, 0.02, 0.28, 0, true);
    g.add(tail);
    g.userData.tail = tail;
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, black, 0.08, 0.27, 0.08, sx * 0.18, 0.27, sz * 0.1)));
    return { group: g, legs, bodyMat: coat };
  }
  if (kind === "frog") {
    const green = skin(0x3aaa4c);
    const croakSac = skin(0xf4d47c);
    const body = block(g, green, 0.46, 0.20, 0.38, 0, 0.24, 0, 2, 2);
    body.userData.skin = "body";
    const throat = put(g, geoBox(0.28, 0.10, 0.16), croakSac, 0, 0.17, -0.14, 0, true);
    g.userData.throat = throat;
    const eyeM = transTile(0xf5d442, 0x6a5200);
    put(g, geoBox(0.11, 0.10, 0.11), green, -0.12, 0.38, -0.08, 0, true);
    put(g, geoBox(0.11, 0.10, 0.11), green, 0.12, 0.38, -0.08, 0, true);
    put(g, geoBox(0.07, 0.06, 0.03), eyeM, -0.12, 0.39, -0.14, 0, true);
    put(g, geoBox(0.07, 0.06, 0.03), eyeM, 0.12, 0.39, -0.14, 0, true);
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, green, 0.08, 0.14, 0.1, sx * 0.16, 0.14, sz * 0.12)));
    return { group: g, legs, bodyMat: green };
  }
  if (kind === "crab") {
    const red = skin(0xe23b2f);
    const shell = skin(0xc42b20);
    const body = block(g, red, 0.5, 0.16, 0.36, 0, 0.22, 0, 2, 2);
    body.userData.skin = "body";
    put(g, geoBox(0.42, 0.05, 0.28), shell, 0, 0.31, 0, 0, true);
    // Open C-clamp pincers + eye stalks
    put(g, geoBox(0.15, 0.10, 0.16), red, -0.32, 0.24, -0.14);
    put(g, geoBox(0.15, 0.10, 0.16), red, 0.32, 0.24, -0.14);
    put(g, geoClaw(0.06, 0.065), red, -0.32, 0.24, -0.24, Math.PI / 2, true);
    put(g, geoClaw(0.06, 0.065), red, 0.32, 0.24, -0.24, Math.PI / 2, true);
    put(g, geoCyl(0.025, 0.09, 8), white, -0.09, 0.34, -0.12, 0, true);
    put(g, geoCyl(0.025, 0.09, 8), white, 0.09, 0.34, -0.12, 0, true);
    put(g, geoBox(0.04, 0.04, 0.04), black, -0.09, 0.39, -0.12, 0, true);
    put(g, geoBox(0.04, 0.04, 0.04), black, 0.09, 0.39, -0.12, 0, true);
    const legs = [-1, 1].flatMap((sx) => [0, 1].map((i) => legBox(g, red, 0.06, 0.14, 0.08, sx * 0.18, 0.14, -0.02 + i * 0.1)));
    return { group: g, legs, bodyMat: red };
  }
  if (kind === "wolf") {
    const coat = skin(0x8a8f98);
    const ruff = skin(0xb0b5be);
    const body = block(g, coat, 0.72, 0.28, 0.32, 0, 0.48, 0, 3, 1);
    body.userData.skin = "body";
    block(g, ruff, 0.32, 0.34, 0.28, 0, 0.52, -0.22, 1, 1);
    // Red LEGO Tamed Collar with Golden Tag (shown automatically when m.tame is true)
    const collar = new THREE.Group();
    put(collar, geoBox(0.30, 0.32, 0.07), skin(0xe23b2f), 0, 0.52, -0.34, 0, true);
    put(collar, geoBox(0.06, 0.06, 0.04), skin(0xf5c518), 0, 0.35, -0.36, 0, true);
    collar.visible = false;
    g.add(collar);
    g.userData.collar = collar;
    // Articulated LEGO Wolf Head
    const head = new THREE.Group();
    head.position.set(0, 0.58, -0.38);
    g.add(head);
    g.userData.head = head;
    block(head, coat, 0.26, 0.24, 0.26, 0, 0, -0.06, 1, 1);
    put(head, geoSlope(0.14, 0.10, 0.16), ruff, 0, -0.04, -0.24, 0, true);
    put(head, geoBox(0.045, 0.04, 0.03), black, 0, -0.01, -0.32, 0, true);
    put(head, geoBox(0.07, 0.12, 0.04), coat, -0.08, 0.16, -0.04, 0, true);
    put(head, geoBox(0.07, 0.12, 0.04), coat, 0.08, 0.16, -0.04, 0, true);
    put(head, geoBox(0.06, 0.05, 0.02), white, -0.07, 0.03, -0.192, 0, true);
    put(head, geoBox(0.06, 0.05, 0.02), white, 0.07, 0.03, -0.192, 0, true);
    put(head, geoBox(0.038, 0.045, 0.022), black, -0.07, 0.03, -0.195, 0, true);
    put(head, geoBox(0.038, 0.045, 0.022), black, 0.07, 0.03, -0.195, 0, true);
    // Articulated wagging tail
    const tail = new THREE.Group();
    tail.position.set(0, 0.54, 0.34);
    put(tail, geoBox(0.10, 0.10, 0.26), coat, 0, 0, 0.12, -0.25);
    g.add(tail);
    g.userData.tail = tail;
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, coat, 0.08, 0.34, 0.08, sx * 0.18, 0.34, sz * 0.1)));
    return { group: g, legs, bodyMat: coat };
  }
  if (kind === "spider") {
    const carapace = skin(0x1f1916);
    const body = block(g, dark, 0.48, 0.24, 0.42, 0, 0.34, 0.12, 2, 2);
    body.userData.skin = "body";
    block(g, carapace, 0.28, 0.18, 0.22, 0, 0.29, -0.16, 1, 1);
    const head = new THREE.Group();
    head.position.set(0, 0.28, -0.28);
    g.add(head);
    g.userData.head = head;
    block(head, dark, 0.28, 0.20, 0.22, 0, 0, -0.06, 1, 1);
    // Chelicerae fangs + 8 glowing Trans-Red LEGO tile eyes
    put(head, geoSlope(0.06, 0.09, 0.08), carapace, -0.055, -0.06, -0.19, 0, true);
    put(head, geoSlope(0.06, 0.09, 0.08), carapace, 0.055, -0.06, -0.19, 0, true);
    const redEye = transTile(0xff2a22, 0x990a06);
    put(head, geoBox(0.065, 0.065, 0.028), redEye, -0.065, 0.02, -0.175, 0, true);
    put(head, geoBox(0.065, 0.065, 0.028), redEye, 0.065, 0.02, -0.175, 0, true);
    put(head, geoBox(0.042, 0.042, 0.026), redEye, -0.118, 0.04, -0.168, 0, true);
    put(head, geoBox(0.042, 0.042, 0.026), redEye, 0.118, 0.04, -0.168, 0, true);
    const legs: THREE.Object3D[] = [];
    for (let i = 0; i < 4; i++) {
      const z = -0.12 + i * 0.1;
      const lL = hinge(g, dark, 0.034, 0.34, -0.24, 0.3, z);
      lL.rotation.z = 0.52;
      const lR = hinge(g, dark, 0.034, 0.34, 0.24, 0.3, z);
      lR.rotation.z = -0.52;
      legs.push(lL, lR);
    }
    return { group: g, legs, bodyMat: dark };
  }
  if (kind === "creeper") {
    // Brick-Built LEGO Creeper: continuous zero-gap stacked ABS courses, articulated turntable head, sloped feet & Trans-Neon Green 1×1 tile eyes!
    const green = skin(0x3aaa4c);
    green.emissive = new THREE.Color(0x000000);
    const greenCourse = skin(0x329842);
    // Continuous zero-gap 3-course stack + hip baseplate
    block(g, green, 0.44, 0.06, 0.26, 0, 0.22, 0, 0, 0); // Hip baseplate (y: 0.19 .. 0.25)
    const body = block(g, green, 0.44, 0.22, 0.26, 0, 0.36, 0, 0, 0); // Course 1 (y: 0.25 .. 0.47)
    body.userData.skin = "body";
    block(g, greenCourse, 0.44, 0.22, 0.26, 0, 0.58, 0, 0, 0); // Course 2 (y: 0.47 .. 0.69)
    block(g, green, 0.44, 0.20, 0.26, 0, 0.79, 0, 2, 1); // Course 3 (y: 0.69 .. 0.89)
    // Turntable neck joint + Articulated 2×2 LEGO Head block with 4 top studs (y: 0.89 .. 0.925)
    put(g, geoCyl(0.14, 0.035, 12), skin(0x1f5c28), 0, 0.9075, 0, 0, true);
    const head = new THREE.Group();
    head.position.set(0, 0.905, 0);
    g.add(head);
    g.userData.head = head;
    block(head, green, 0.44, 0.40, 0.40, 0, 0.20, 0, 2, 2);
    const face = skin(0x101a12);
    const neonEye = transTile(0x6aff7a, 0x1e8a2c);
    put(head, geoBox(0.105, 0.105, 0.025), face, -0.10, 0.28, -0.202, 0, true);
    put(head, geoBox(0.105, 0.105, 0.025), face, 0.10, 0.28, -0.202, 0, true);
    put(head, geoBox(0.072, 0.072, 0.032), neonEye, -0.10, 0.28, -0.208, 0, true);
    put(head, geoBox(0.072, 0.072, 0.032), neonEye, 0.10, 0.28, -0.208, 0, true);
    put(head, geoBox(0.10, 0.14, 0.028), face, 0, 0.13, -0.202, 0, true);
    put(head, geoBox(0.08, 0.11, 0.028), face, -0.09, 0.06, -0.202, 0, true);
    put(head, geoBox(0.08, 0.11, 0.028), face, 0.09, 0.06, -0.202, 0, true);
    // 4 Legs tucking directly into the hip baseplate with zero gap
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, green, 0.16, 0.22, 0.18, sx * 0.15, 0.22, sz * 0.12)));
    return { group: g, legs, bodyMat: green };
  }
  if (kind === "ghast") {
    const tearM = transTile(0x7ae8ff, 0x226888);
    const redEye = transTile(0xff3b2f, 0x8a1008);
    const body = block(g, white, 1.15, 1.15, 1.15, 0, 0.7, 0, 3, 3);
    body.userData.skin = "body";
    put(g, geoBox(0.20, 0.16, 0.04), black, -0.24, 0.86, -0.58, 0, true);
    put(g, geoBox(0.20, 0.16, 0.04), black, 0.24, 0.86, -0.58, 0, true);
    put(g, geoBox(0.13, 0.09, 0.048), redEye, -0.24, 0.86, -0.585, 0, true);
    put(g, geoBox(0.13, 0.09, 0.048), redEye, 0.24, 0.86, -0.585, 0, true);
    // Translucent cyan LEGO tear tracks under eyes + wailing mouth
    put(g, geoBox(0.06, 0.22, 0.042), tearM, -0.24, 0.66, -0.582, 0, true);
    put(g, geoBox(0.06, 0.22, 0.042), tearM, 0.24, 0.66, -0.582, 0, true);
    put(g, geoBox(0.28, 0.18, 0.04), black, 0, 0.48, -0.58, 0, true);
    const legs = [-1, 0, 1].flatMap((sx) => [-1, 1].map((sz) => hinge(g, white, 0.058, 0.58, sx * 0.34, 0.15, sz * 0.30)));
    return { group: g, legs, bodyMat: white };
  }
  if (kind === "phantom") {
    const wing = skin(0x3d7ad4);
    const bone = skin(0xd8d2c4);
    const body = block(g, wing, 0.7, 0.14, 0.28, 0, 0.3, 0, 3, 1);
    body.userData.skin = "body";
    put(g, geoBox(0.52, 0.04, 0.32), bone, 0, 0.25, 0, 0, true); // Exposed skeletal ribs
    const left = new THREE.Group();
    left.position.set(-0.36, 0.3, 0);
    put(left, geoBox(0.72, 0.05, 0.32), wing, -0.36, 0, 0);
    put(left, geoBox(0.68, 0.06, 0.06), bone, -0.34, 0.01, -0.14, 0, true);
    g.add(left);
    const right = new THREE.Group();
    right.position.set(0.36, 0.3, 0);
    put(right, geoBox(0.72, 0.05, 0.32), wing, 0.36, 0, 0);
    put(right, geoBox(0.68, 0.06, 0.06), bone, 0.34, 0.01, -0.14, 0, true);
    g.add(right);
    const glowEye = transTile(0x7aff9a, 0x2a8844);
    put(g, geoBox(0.08, 0.06, 0.025), glowEye, -0.08, 0.32, -0.15, 0, true);
    put(g, geoBox(0.08, 0.06, 0.025), glowEye, 0.08, 0.32, -0.15, 0, true);
    return { group: g, legs: [left, right], bodyMat: wing };
  }
  if (kind === "dragon") {
    const hide = skin(0x231636);
    const spine = skin(0x7a4ad4);
    const body = block(g, hide, 0.44, 0.44, 1.5, 0, 0.7, 0, 2, 5); // v4.13: torso runs head-to-tail
    body.userData.skin = "body";
    for (const sz of [-0.45, -0.15, 0.15, 0.45]) {
      put(g, geoSlope(0.10, 0.16, 0.16), spine, 0, 0.98, sz, Math.PI, true);
    }
    const head = new THREE.Group();
    head.position.set(0, 0.90, -0.75);
    g.add(head);
    g.userData.head = head;
    block(head, hide, 0.42, 0.34, 0.48, 0, 0.04, -0.14, 2, 2);
    put(head, geoSlope(0.34, 0.16, 0.28), hide, 0, -0.02, -0.46, 0, true);
    put(head, geoBox(0.32, 0.08, 0.26), spine, 0, -0.12, -0.44, 0.18, true); // Lower hinged dragon jaw
    put(head, geoCyl(0.05, 0.28, 8), spine, -0.12, 0.32, -0.12, -0.35, true);
    put(head, geoCyl(0.05, 0.28, 8), spine, 0.12, 0.32, -0.12, -0.35, true);
    const wyrmEye = transTile(0xe07aff, 0x8a24b4);
    put(head, geoBox(0.085, 0.085, 0.032), wyrmEye, -0.10, 0.09, -0.385, 0, true);
    put(head, geoBox(0.085, 0.085, 0.032), wyrmEye, 0.10, 0.09, -0.385, 0, true);
    const tail = new THREE.Group();
    tail.position.set(0, 0.62, 0.72);
    block(tail, hide, 0.28, 0.2, 0.58, 0, 0, 0.28, 1, 2);
    put(tail, geoSlope(0.09, 0.14, 0.16), spine, 0, 0.16, 0.28, Math.PI, true);
    g.add(tail);
    g.userData.tail = tail;
    const left = new THREE.Group();
    left.position.set(-0.21, 0.85, 0);
    put(left, geoBox(1.15, 0.06, 0.58), spine, -0.56, 0, 0);
    g.add(left);
    const right = new THREE.Group();
    right.position.set(0.21, 0.85, 0);
    put(right, geoBox(1.15, 0.06, 0.58), spine, 0.56, 0, 0);
    g.add(right);
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, hide, 0.12, 0.4, 0.12, sx * 0.14, 0.52, sz * 0.48)));
    legs.push(left, right);
    g.scale.setScalar(1.35);
    return { group: g, legs, bodyMat: hide };
  }
  if (kind === "wisp") {
    const glow = skin(0xb48cff, { transparent: true, opacity: 0.86 });
    glow.emissive = new THREE.Color(0x7a4ad4);
    const body = block(g, glow, 0.36, 0.36, 0.36, 0, 0.4, 0, 2, 2);
    body.userData.skin = "body";
    return { group: g, legs: [], bodyMat: glow };
  }
  if (kind === "slime") {
    // Translucent Trans-Neon Green LEGO Slime with visible inner solid core brick!
    const gel = skin(0x5dce6a, { transparent: true, opacity: 0.68 });
    const innerCore = skin(0x2a8838);
    put(g, geoBox(0.46, 0.38, 0.46), innerCore, 0, 0.42, 0);
    const body = block(g, gel, 0.85, 0.7, 0.85, 0, 0.45, 0, 2, 2);
    body.userData.skin = "body";
    put(g, geoBox(0.1, 0.1, 0.04), black, -0.16, 0.55, -0.43);
    put(g, geoBox(0.1, 0.1, 0.04), black, 0.16, 0.55, -0.43);
    put(g, geoBox(0.22, 0.06, 0.04), black, 0, 0.38, -0.43);
    return { group: g, legs: [], bodyMat: gel };
  }
  if (kind === "golem") {
    const iron = skin(0xc5ccd3);
    const darkIron = skin(0x6e767e);
    const vineM = skin(0x3a8c3e);
    const headC = skin(0xd6cfc2);
    const body = block(g, iron, 0.72, 0.72, 0.42, 0, 1.1, 0, 3, 2);
    body.userData.skin = "body";
    block(g, darkIron, 0.5, 0.16, 0.32, 0, 0.66, 0, 2, 1);
    // Overgrown LEGO moss & vine plates + red poppy on shoulder
    put(g, geoBox(0.18, 0.46, 0.44), vineM, -0.22, 1.14, 0, 0, true);
    put(g, geoBox(0.08, 0.08, 0.08), skin(0xe23b2f), -0.26, 1.50, -0.10, 0, true);
    const head = new THREE.Group();
    head.position.set(0, 1.48, 0);
    g.add(head);
    g.userData.head = head;
    block(head, headC, 0.4, 0.36, 0.36, 0, 0.18, 0, 2, 2);
    put(head, geoCyl(0.045, 0.14, 8), darkIron, 0, 0.14, -0.21, Math.PI / 2, true); // Iron nose
    const rubyEye = transTile(0xff3b2f, 0x88140c);
    put(head, geoBox(0.085, 0.085, 0.032), rubyEye, -0.09, 0.22, -0.19, 0, true);
    put(head, geoBox(0.085, 0.085, 0.032), rubyEye, 0.09, 0.22, -0.19, 0, true);
    put(head, geoBox(0.16, 0.04, 0.03), black, 0, 0.08, -0.19, 0, true);
    const legs = [
      legBox(g, darkIron, 0.18, 0.52, 0.18, -0.16, 0.52, 0),
      legBox(g, darkIron, 0.18, 0.52, 0.18, 0.16, 0.52, 0),
      hinge(g, iron, 0.085, 0.68, -0.43, 1.36, 0), // v4.13: shoulders seated on the torso (was a 6 cm gap)
      hinge(g, iron, 0.085, 0.68, 0.43, 1.36, 0),
    ];
    return { group: g, legs, bodyMat: iron };
  }
  if (kind === "boat") {
    const wood = skin(0xc4924a);
    const body = block(g, wood, 0.7, 0.16, 1.15, 0, 0.16, 0, 2, 4);
    body.userData.skin = "body";
    put(g, geoBox(0.06, 0.18, 1.05), wood, -0.36, 0.28, 0);
    put(g, geoBox(0.06, 0.18, 1.05), wood, 0.36, 0.28, 0);
    return { group: g, legs: [], bodyMat: wood };
  }
  if (kind === "cart") {
    const iron = skin(0x8e959c);
    const body = block(g, iron, 0.62, 0.28, 0.82, 0, 0.36, 0, 2, 3);
    body.userData.skin = "body";
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const wheel = put(g, geoCyl(0.14, 0.08, 10), dark, sx * 0.36, 0.14, sz * 0.28);
        wheel.rotation.z = Math.PI / 2;
      }
    }
    return { group: g, legs: [], bodyMat: iron };
  }
  if (kind === "enderman") {
    // Tall brick-built Enderman: hinged Technic limbs, C-clamp hands, articulated 2×2 studded head, and glowing Trans-Purple 1×1 tile eyes!
    const blackM = skin(0x16121c);
    const legL = hinge(g, blackM, 0.085, 0.95, -0.11, 0.98, 0);
    const legR = hinge(g, blackM, 0.085, 0.95, 0.11, 0.98, 0);
    const torso = block(g, blackM, 0.42, 0.72, 0.24, 0, 1.34, 0, 2, 1);
    torso.userData.skin = "body";
    const armL = hinge(g, blackM, 0.068, 0.95, -0.28, 1.66, 0);
    const armR = hinge(g, blackM, 0.068, 0.95, 0.28, 1.66, 0);
    put(armL, geoClaw(0.055, 0.065), blackM, 0, -0.96, 0, Math.PI / 2, true);
    put(armR, geoClaw(0.055, 0.065), blackM, 0, -0.96, 0, Math.PI / 2, true);
    const head = new THREE.Group();
    head.position.set(0, 1.72, 0);
    g.add(head);
    g.userData.head = head;
    block(head, blackM, 0.38, 0.36, 0.36, 0, 0.18, 0, 2, 2);
    const eye = transTile(0xd98aff, 0x8a2be2);
    put(head, geoBox(0.105, 0.052, 0.028), eye, -0.095, 0.20, -0.185, 0, true);
    put(head, geoBox(0.105, 0.052, 0.028), eye, 0.095, 0.20, -0.185, 0, true);
    return { group: g, legs: [legL, legR, armR, armL], bodyMat: blackM };
  }
  if (kind === "blaze") {
    const core = skin(0xf07820);
    core.emissive = new THREE.Color(0x8a3400);
    const body = block(g, core, 0.36, 0.52, 0.36, 0, 0.82, 0, 2, 2);
    body.userData.skin = "body";
    const headM = skin(0xf5c518);
    headM.emissive = new THREE.Color(0x6a4a00);
    const head = new THREE.Group();
    head.position.set(0, 1.11, 0);
    g.add(head);
    g.userData.head = head;
    block(head, headM, 0.32, 0.32, 0.32, 0, 0.16, 0, 2, 2);
    const blazeEye = transTile(0xfff08a, 0xc47800);
    put(head, geoBox(0.07, 0.08, 0.028), blazeEye, -0.08, 0.19, -0.165, 0, true);
    put(head, geoBox(0.07, 0.08, 0.028), blazeEye, 0.08, 0.19, -0.165, 0, true);
    const rodM = transTile(0xffc93a, 0x995800);
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => hinge(g, rodM, 0.068, 0.58, sx * 0.28, 0.64, sz * 0.28)));
    return { group: g, legs, bodyMat: core };
  }
  if (kind === "bee") {
    const yellow = skin(0xf5c518);
    const body = block(g, yellow, 0.34, 0.26, 0.46, 0, 0.3, 0, 2, 2);
    body.userData.skin = "body";
    put(g, geoBox(0.36, 0.28, 0.08), black, 0, 0.3, 0.06, 0, true);
    put(g, geoBox(0.36, 0.28, 0.08), black, 0, 0.3, -0.11, 0, true);
    put(g, geoBox(0.06, 0.08, 0.025), black, -0.08, 0.32, -0.235, 0, true);
    put(g, geoBox(0.06, 0.08, 0.025), black, 0.08, 0.32, -0.235, 0, true);
    put(g, geoBox(0.03, 0.08, 0.06), black, -0.06, 0.42, -0.24, 0.4, true); // Antennae
    put(g, geoBox(0.03, 0.08, 0.06), black, 0.06, 0.42, -0.24, 0.4, true);
    put(g, geoCyl(0.022, 0.09, 6), black, 0, 0.28, 0.27, Math.PI / 2, true); // Stinger
    const wingM = skin(0xe8f6ff, { transparent: true, opacity: 0.76 });
    const left = new THREE.Group();
    left.position.set(-0.12, 0.45, 0);
    put(left, geoBox(0.26, 0.02, 0.16), wingM, -0.13, 0, 0, 0, true);
    g.add(left);
    const right = new THREE.Group();
    right.position.set(0.12, 0.45, 0);
    put(right, geoBox(0.26, 0.02, 0.16), wingM, 0.13, 0, 0, 0, true);
    g.add(right);
    return { group: g, legs: [left, right], bodyMat: yellow };
  }
  if (kind === "cat") {
    const coat = skin(0xd88a3a);
    const body = block(g, coat, 0.56, 0.24, 0.28, 0, 0.34, 0, 3, 1);
    body.userData.skin = "body";
    put(g, geoBox(0.2, 0.14, 0.04), white, 0, 0.32, -0.15, 0, true);
    // Red LEGO Tamed Cat Collar with Gold Bell
    const collar = new THREE.Group();
    put(collar, geoBox(0.25, 0.23, 0.06), skin(0xe23b2f), 0, 0.41, -0.24, 0, true);
    put(collar, geoCyl(0.032, 0.04, 8), skin(0xf5c518), 0, 0.28, -0.26, 0, true);
    collar.visible = false;
    g.add(collar);
    g.userData.collar = collar;
    const head = new THREE.Group();
    head.position.set(0, 0.44, -0.26);
    g.add(head);
    g.userData.head = head;
    block(head, coat, 0.24, 0.22, 0.24, 0, 0, -0.04, 1, 1);
    put(head, geoSlope(0.11, 0.08, 0.10), white, 0, -0.04, -0.18, 0, true);
    put(head, geoBox(0.035, 0.03, 0.02), skin(0xf296b4), 0, -0.02, -0.232, 0, true); // Pink nose
    put(head, geoBox(0.06, 0.09, 0.04), coat, -0.08, 0.15, -0.04, 0, true);
    put(head, geoBox(0.06, 0.09, 0.04), coat, 0.08, 0.15, -0.04, 0, true);
    const catEye = transTile(0x52e868, 0x186e24);
    put(head, geoBox(0.055, 0.048, 0.022), catEye, -0.065, 0.03, -0.162, 0, true);
    put(head, geoBox(0.055, 0.048, 0.022), catEye, 0.065, 0.03, -0.162, 0, true);
    const tail = new THREE.Group();
    tail.position.set(0, 0.44, 0.15);
    put(tail, geoBox(0.07, 0.07, 0.30), coat, 0, 0.04, 0.14, -0.45);
    g.add(tail);
    g.userData.tail = tail;
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, coat, 0.07, 0.22, 0.07, sx * 0.16, 0.22, sz * 0.2)));
    return { group: g, legs, bodyMat: coat };
  }
  if (kind === "squid") {
    const hide = skin(0x4662a4);
    const trim = skin(0x82a6dc);
    const body = block(g, hide, 0.38, 0.56, 0.38, 0, 0.78, 0, 2, 2);
    body.userData.skin = "body";
    put(g, geoBox(0.42, 0.08, 0.42), trim, 0, 0.52, 0, 0, true);
    put(g, geoSlope(0.12, 0.22, 0.22), trim, -0.22, 0.90, 0, 0, true); // Side mantle fins
    put(g, geoSlope(0.12, 0.22, 0.22), trim, 0.22, 0.90, 0, 0, true);
    put(g, geoBox(0.07, 0.09, 0.02), white, -0.20, 0.62, -0.08, 0, true);
    put(g, geoBox(0.07, 0.09, 0.02), white, 0.20, 0.62, -0.08, 0, true);
    put(g, geoBox(0.04, 0.05, 0.024), black, -0.202, 0.62, -0.09, 0, true);
    put(g, geoBox(0.04, 0.05, 0.024), black, 0.202, 0.62, -0.09, 0, true);
    const legs = [-1, 1].flatMap((sx) =>
      [-1, 0, 1].map((sz) => legBox(g, hide, 0.07, 0.5, 0.07, sx * 0.12, 0.5, sz * 0.12)),
    );
    return { group: g, legs, bodyMat: hide };
  }
  if (kind === "bat") {
    const hide = skin(0x2a2430);
    const body = block(g, hide, 0.2, 0.22, 0.3, 0, 0.3, 0, 1, 1);
    body.userData.skin = "body";
    put(g, geoBox(0.06, 0.10, 0.03), hide, -0.06, 0.47, -0.08, 0, true);
    put(g, geoBox(0.06, 0.10, 0.03), hide, 0.06, 0.47, -0.08, 0, true);
    const batEye = transTile(0xff3b2f, 0x88120a);
    put(g, geoBox(0.042, 0.042, 0.022), batEye, -0.05, 0.34, -0.16, 0, true);
    put(g, geoBox(0.042, 0.042, 0.022), batEye, 0.05, 0.34, -0.16, 0, true);
    const left = new THREE.Group();
    left.position.set(-0.1, 0.34, 0);
    put(left, geoBox(0.42, 0.03, 0.2), hide, -0.21, 0, 0);
    g.add(left);
    const right = new THREE.Group();
    right.position.set(0.1, 0.34, 0);
    put(right, geoBox(0.42, 0.03, 0.2), hide, 0.21, 0, 0);
    g.add(right);
    return { group: g, legs: [left, right], bodyMat: hide };
  }
  if (kind === "goat") {
    const coat = skin(0xd4cfc4);
    const darkLeg = skin(0x7c766d);
    const hornM = skin(0x5a554c);
    const body = block(g, coat, 0.72, 0.38, 0.44, 0, 0.55, 0, 3, 2);
    body.userData.skin = "body";
    put(g, geoBox(0.08, 0.14, 0.06), coat, 0, 0.68, 0.20, -0.3, true);
    // Articulated LEGO Goat Head (pitches down when aiming/charging!)
    const head = new THREE.Group();
    head.position.set(0, 0.66, -0.31);
    g.add(head);
    g.userData.head = head;
    block(head, coat, 0.26, 0.26, 0.28, 0, 0, -0.04, 1, 1);
    put(head, geoSlope(0.16, 0.12, 0.14), coat, 0, -0.04, -0.22, 0, true);
    put(head, geoBox(0.07, 0.15, 0.05), white, 0, -0.17, -0.18, 0, true); // Goat beard
    put(head, geoBox(0.055, 0.20, 0.055), hornM, -0.085, 0.20, 0.02, -0.35, true); // Swept horns
    put(head, geoBox(0.055, 0.20, 0.055), hornM, 0.085, 0.20, 0.02, -0.35, true);
    put(head, geoBox(0.10, 0.04, 0.06), coat, -0.18, 0.04, -0.02, 0, true);
    put(head, geoBox(0.10, 0.04, 0.06), coat, 0.18, 0.04, -0.02, 0, true);
    put(head, geoBox(0.045, 0.045, 0.02), black, -0.08, 0.04, -0.182, 0, true);
    put(head, geoBox(0.045, 0.045, 0.02), black, 0.08, 0.04, -0.182, 0, true);
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, darkLeg, 0.1, 0.36, 0.1, sx * 0.22, 0.36, sz * 0.13)));
    return { group: g, legs, bodyMat: coat };
  }
  if (kind === "axolotl") {
    const pink = skin(0xf2a8c8);
    const gill = skin(0xe8568c);
    const fin = skin(0xf6bfd8, { transparent: true, opacity: 0.85 });
    const body = block(g, pink, 0.4, 0.22, 0.62, 0, 0.2, 0.02, 2, 3);
    body.userData.skin = "body";
    const head = new THREE.Group();
    head.position.set(0, 0.22, -0.34);
    g.add(head);
    g.userData.head = head;
    block(head, pink, 0.44, 0.20, 0.26, 0, 0, -0.04, 2, 1);
    put(head, geoBox(0.05, 0.05, 0.02), black, -0.13, 0.03, -0.172, 0, true);
    put(head, geoBox(0.05, 0.05, 0.02), black, 0.13, 0.03, -0.172, 0, true);
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        put(head, geoBox(0.08, 0.045, 0.04), gill, sx * 0.26, 0.04 + (i - 1) * 0.065, -0.02, 0, true);
      }
    }
    const tail = new THREE.Group();
    tail.position.set(0, 0.22, 0.32);
    put(tail, geoBox(0.05, 0.24, 0.34), fin, 0, 0, 0.16, 0, true);
    g.add(tail);
    g.userData.tail = tail;
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, pink, 0.06, 0.09, 0.06, sx * 0.14, 0.09, sz * 0.2)));
    return { group: g, legs, bodyMat: pink };
  }
  if (kind === "parrot") {
    const red = skin(0xe23b2f);
    const blue = skin(0x2868d8);
    const yellow = skin(0xf5c518);
    const body = block(g, red, 0.24, 0.34, 0.26, 0, 0.42, 0, 1, 1);
    body.userData.skin = "body";
    const head = new THREE.Group();
    head.position.set(0, 0.60, -0.02);
    g.add(head);
    g.userData.head = head;
    block(head, red, 0.22, 0.20, 0.22, 0, 0.08, 0, 1, 1);
    put(head, geoSlope(0.06, 0.11, 0.14), yellow, 0, 0.22, 0.02, Math.PI, true); // Feather crest
    put(head, geoSlope(0.09, 0.09, 0.10), skin(0x2a241c), 0, 0.04, -0.14, 0, true); // Curved beak
    put(head, geoBox(0.055, 0.055, 0.02), white, -0.08, 0.09, -0.105, 0, true);
    put(head, geoBox(0.055, 0.055, 0.02), white, 0.08, 0.09, -0.105, 0, true);
    put(head, geoBox(0.032, 0.032, 0.022), black, -0.08, 0.09, -0.108, 0, true);
    put(head, geoBox(0.032, 0.032, 0.022), black, 0.08, 0.09, -0.108, 0, true);
    put(g, geoBox(0.10, 0.34, 0.04), blue, 0, 0.16, 0.18, 0.35, true);
    put(g, geoBox(0.04, 0.26, 0.04), yellow, -0.06, 0.13, 0, 0, true); // feet reach the body (were floating)
    put(g, geoBox(0.04, 0.26, 0.04), yellow, 0.06, 0.13, 0, 0, true);
    const left = new THREE.Group();
    left.position.set(-0.13, 0.5, 0);
    put(left, geoBox(0.24, 0.04, 0.2), blue, -0.12, 0, 0);
    put(left, geoBox(0.12, 0.042, 0.18), yellow, -0.06, 0, 0, 0, true);
    g.add(left);
    const right = new THREE.Group();
    right.position.set(0.13, 0.5, 0);
    put(right, geoBox(0.24, 0.04, 0.2), blue, 0.12, 0, 0);
    put(right, geoBox(0.12, 0.042, 0.18), yellow, 0.06, 0, 0, 0, true);
    g.add(right);
    return { group: g, legs: [left, right], bodyMat: red };
  }
  if (kind === "guardian") {
    const hide = skin(0x528278);
    const spike = skin(0xf07820);
    const eyeGlow = transTile(0xff8824, 0x993800);
    const body = block(g, hide, 0.72, 0.58, 0.85, 0, 0.55, 0, 3, 3);
    body.userData.skin = "body";
    put(g, geoBox(0.34, 0.30, 0.04), white, 0, 0.58, -0.44, 0, true);
    put(g, geoBox(0.18, 0.18, 0.032), eyeGlow, 0, 0.58, -0.46, 0, true);
    put(g, geoBox(0.08, 0.08, 0.036), black, 0, 0.58, -0.48, 0, true);
    for (const sz of [-0.25, 0, 0.25]) put(g, geoBox(0.08, 0.18, 0.08), spike, 0, 0.92, sz, 0, true);
    for (const sx of [-1, 1]) for (const sz of [-0.15, 0.2]) put(g, geoBox(0.16, 0.08, 0.08), spike, sx * 0.42, 0.62, sz, 0, true);
    const tail = new THREE.Group();
    tail.position.set(0, 0.55, 0.42);
    put(tail, geoBox(0.14, 0.22, 0.28), hide, 0, 0, 0.14);
    put(tail, geoBox(0.05, 0.42, 0.24), spike, 0, 0, 0.36, 0, true);
    g.add(tail);
    g.userData.tail = tail;
    return { group: g, legs: [], bodyMat: hide };
  }
  if (kind === "shulker") {
    const shell = skin(0x8a6aa8);
    const rim = skin(0x6a4a88);
    const body = block(g, shell, 0.84, 0.32, 0.84, 0, 0.16, 0, 0, 0);
    body.userData.skin = "body";
    put(g, geoBox(0.88, 0.08, 0.88), rim, 0, 0.33, 0, 0, true);
    const head = new THREE.Group();
    head.position.set(0, 0.46, 0);
    g.add(head);
    g.userData.head = head;
    block(head, skin(0xe8d898), 0.30, 0.26, 0.30, 0, 0, 0, 1, 1);
    put(head, geoBox(0.055, 0.055, 0.02), black, -0.07, 0.03, -0.155, 0, true);
    put(head, geoBox(0.055, 0.055, 0.02), black, 0.07, 0.03, -0.155, 0, true);
    // Articulated upper Shulker shell that lifts & rotates when player is near!
    const topShell = new THREE.Group();
    topShell.position.set(0, 0.73, 0);
    block(topShell, shell, 0.82, 0.26, 0.82, 0, 0, 0, 3, 3);
    put(topShell, geoBox(0.86, 0.07, 0.86), rim, 0, -0.12, 0, 0, true);
    g.add(topShell);
    g.userData.topShell = topShell;
    return { group: g, legs: [], bodyMat: shell };
  }
  if (kind === "vex") {
    const pale = skin(0x98b4c8);
    const wing = transTile(0xd4f0ff, 0x3a6e8c);
    const body = block(g, pale, 0.26, 0.34, 0.2, 0, 0.42, 0, 1, 1);
    body.userData.skin = "body";
    const head = new THREE.Group();
    head.position.set(0, 0.60, 0);
    g.add(head);
    g.userData.head = head;
    block(head, pale, 0.28, 0.26, 0.26, 0, 0.12, 0, 1, 1);
    const vexEye = transTile(0xff3b2f, 0x99140a);
    put(head, geoBox(0.06, 0.05, 0.024), vexEye, -0.07, 0.14, -0.135, 0, true);
    put(head, geoBox(0.06, 0.05, 0.024), vexEye, 0.07, 0.14, -0.135, 0, true);
    // Tiny iron sword held in right hand
    put(g, geoBox(0.04, 0.28, 0.02), skin(0xc8d0d8), 0.15, 0.42, -0.14, 0.45, true);
    const wL = new THREE.Group();
    put(wL, geoBox(0.42, 0.03, 0.22), wing, -0.21, 0, 0, 0, true);
    wL.position.set(-0.14, 0.6, 0.06);
    wL.rotation.z = 0.5;
    const wR = new THREE.Group();
    put(wR, geoBox(0.42, 0.03, 0.22), wing, 0.21, 0, 0, 0, true);
    wR.position.set(0.14, 0.6, 0.06);
    wR.rotation.z = -0.5;
    g.add(wL, wR);
    return { group: g, legs: [wL, wR], bodyMat: pale };
  }
  if (kind === "ravager") {
    const hide = skin(0x6a6f76);
    const dark = skin(0x42464e);
    const hornM = skin(0xe8e2d4);
    const goldM = skin(0xf5c518);
    const body = block(g, hide, 0.95, 0.85, 1.5, 0, 0.85, 0.05, 4, 6);
    body.userData.skin = "body";
    put(g, geoBox(0.84, 0.28, 0.72), dark, 0, 1.35, 0.28);
    put(g, geoBox(0.64, 0.12, 0.72), skin(0x8a5228), 0, 1.53, 0.05);
    put(g, geoBox(0.98, 0.14, 0.14), dark, 0, 0.95, -0.35, 0, true); // Iron harness chains
    const head = new THREE.Group();
    head.position.set(0, 1.02, -0.76);
    g.add(head);
    g.userData.head = head;
    block(head, hide, 0.72, 0.62, 0.56, 0, 0, -0.22, 3, 2);
    put(head, geoBox(0.76, 0.16, 0.22), dark, 0, 0.26, -0.38, 0, true);
    const ravEye = transTile(0xff4228, 0x991808);
    put(head, geoBox(0.08, 0.07, 0.03), ravEye, -0.20, 0.06, -0.51, 0, true);
    put(head, geoBox(0.08, 0.07, 0.03), ravEye, 0.20, 0.06, -0.51, 0, true);
    put(head, geoBox(0.14, 0.12, 0.04), goldM, 0, -0.16, -0.52, 0, true); // Golden nose ring
    put(head, geoBox(0.08, 0.36, 0.08), hornM, -0.41, 0.20, -0.24, -0.5, true);
    put(head, geoBox(0.08, 0.36, 0.08), hornM, 0.41, 0.20, -0.24, -0.5, true);
    const legs: THREE.Object3D[] = [];
    for (const sx of [-1, 1])
      for (const sz of [-0.52, 0.55]) {
        const leg = legBox(g, dark, 0.22, 0.62, 0.22, sx * 0.34, 0.62, sz);
        legs.push(leg);
      }
    return { group: g, legs, bodyMat: hide };
  }
  if (kind === "wither") {
    const bone = skin(0x1c1c24);
    const rib = skin(0x363644);
    const body = block(g, bone, 0.26, 0.9, 0.26, 0, 0.95, 0, 1, 1);
    body.userData.skin = "body";
    for (const ry of [0.72, 0.98, 1.24]) put(g, geoBox(0.64, 0.09, 0.32), rib, 0, ry, 0);
    put(g, geoBox(0.76, 0.10, 0.22), rib, 0, 1.44, 0); // Shoulder crossbar
    put(g, geoBox(0.16, 0.55, 0.16), bone, 0, 0.32, 0.1, 0.25);
    const eyeW = transTile(0x88f0ff, 0x2488a8);
    const head = new THREE.Group();
    head.position.set(0, 1.48, 0);
    g.add(head);
    g.userData.head = head;
    block(head, bone, 0.40, 0.36, 0.36, 0, 0.18, 0, 2, 2);
    put(head, geoBox(0.09, 0.05, 0.025), eyeW, -0.09, 0.22, -0.185, 0, true);
    put(head, geoBox(0.09, 0.05, 0.025), eyeW, 0.09, 0.22, -0.185, 0, true);
    put(head, geoBox(0.18, 0.05, 0.025), black, 0, 0.08, -0.185, 0, true);
    block(g, bone, 0.28, 0.26, 0.26, -0.44, 1.54, 0, 1, 1);
    block(g, bone, 0.28, 0.26, 0.26, 0.44, 1.54, 0, 1, 1);
    put(g, geoBox(0.07, 0.04, 0.025), eyeW, -0.44, 1.58, -0.135, 0, true);
    put(g, geoBox(0.07, 0.04, 0.025), eyeW, 0.44, 1.58, -0.135, 0, true);
    return { group: g, legs: [], bodyMat: bone };
  }
  const fallback = skin(0xf4f1ea);
  const body = block(g, fallback, 0.4, 0.4, 0.4, 0, 0.3, 0, 2, 2);
  body.userData.skin = "body";
  return { group: g, legs: [], bodyMat: fallback };
}

// Attach 3D LEGO Role Hats, Aprons, Packs, Spectacles & Held Tools to Hamlet NPC Villagers ("PNJ")
function decorateVillagerRole(group: THREE.Group, role?: TraderRole) {
  if (!role || group.userData.roleDecorated) return;
  group.userData.roleDecorated = true;
  const head = (group.userData.head as THREE.Object3D | undefined) ?? group;
  const hy = head === group ? 0 : -1.0;
  const goldM = skin(0xf5c518);
  const darkM = skin(0x231c16);
  const woodM = skin(0x7c522b);
  const ironM = skin(0xa7aeb4);
  if (role === "grocer") {
    // Farmer Straw Hat + Green Bib Overalls + Held Golden Wheat Sheaf
    put(head, geoCyl(0.27, 0.032, 14), skin(0xe8c455), 0, 1.27 + hy, 0, 0, true);
    put(head, geoCyl(0.165, 0.11, 12), skin(0xd9b244), 0, 1.33 + hy, 0, 0, true);
    put(head, geoCyl(0.17, 0.028, 12), skin(0xc83228), 0, 1.29 + hy, 0, 0, true);
    put(group, geoBox(0.28, 0.26, 0.245), skin(0x2f7d38), 0, 0.68, 0, 0, true);
    put(group, geoBox(0.06, 0.24, 0.06), skin(0xf0c43a), 0.28, 0.50, -0.14, 0.45, true);
  } else if (role === "smith") {
    // Blacksmith Iron Forging Helmet + Visor + Leather Apron + Held 3D LEGO Hammer
    put(head, geoCyl(0.175, 0.14, 12), skin(0x3a3e46), 0, 1.28 + hy, 0, 0, true);
    put(head, geoBox(0.26, 0.06, 0.06), ironM, 0, 1.25 + hy, -0.15, 0, true);
    put(group, geoBox(0.32, 0.32, 0.245), skin(0x3b2618), 0, 0.67, 0, 0, true);
    put(group, geoCyl(0.018, 0.26, 8), woodM, 0.28, 0.50, -0.15, 0.4, true);
    put(group, geoBox(0.08, 0.055, 0.13), ironM, 0.28, 0.58, -0.22, 0, true);
  } else if (role === "mason") {
    // Red LEGO Construction Hard-Hat + Stone Belt + Held Bricklayer Chisel
    put(head, geoCyl(0.18, 0.11, 12), skin(0xe23b2f), 0, 1.29 + hy, 0, 0, true);
    put(head, geoBox(0.22, 0.03, 0.12), skin(0xe23b2f), 0, 1.25 + hy, -0.14, 0, true);
    put(group, geoBox(0.42, 0.07, 0.25), skin(0x5c3818), 0, 0.55, 0, 0, true);
    put(group, geoBox(0.07, 0.07, 0.04), goldM, 0, 0.55, -0.13, 0, true);
    put(group, geoCyl(0.018, 0.22, 8), ironM, 0.28, 0.50, -0.14, 0.45, true);
  } else if (role === "herder") {
    // Wide-Brimmed Rancher Hat + Wool Mantle + Tall Shepherd Crook Staff
    put(head, geoCyl(0.25, 0.034, 12), skin(0x5c3818), 0, 1.27 + hy, 0, 0, true);
    put(head, geoBox(0.26, 0.10, 0.26), skin(0x6b3e22), 0, 1.33 + hy, 0, 0, true);
    put(group, geoBox(0.46, 0.10, 0.26), skin(0xf4f1ea), 0, 0.89, 0, 0, true);
    put(group, geoCyl(0.02, 0.85, 8), woodM, 0.29, 0.56, -0.12, 0.12, true);
    put(group, geoBox(0.08, 0.06, 0.04), goldM, 0.29, 0.98, -0.16, 0, true);
  } else if (role === "clerk") {
    // Scholarly Gold Spectacles + Blue Tunic Medallion + Held Red LEGO Tome
    put(head, geoBox(0.068, 0.056, 0.024), goldM, -0.058, 1.16 + hy, -0.158, 0, true);
    put(head, geoBox(0.068, 0.056, 0.024), goldM, 0.058, 1.16 + hy, -0.158, 0, true);
    put(head, geoBox(0.04, 0.018, 0.026), goldM, 0, 1.16 + hy, -0.16, 0, true);
    put(head, geoCyl(0.17, 0.08, 12), skin(0x1f4e9e), 0, 1.28 + hy, 0, 0, true);
    put(group, geoBox(0.07, 0.07, 0.03), goldM, 0, 0.78, -0.125, 0, true);
    put(group, geoBox(0.09, 0.14, 0.12), skin(0xb82820), -0.28, 0.50, -0.12, 0.3, true);
  } else if (role === "mage") {
    // Tall Pointed Purple Wizard Hat + Mystic Cape + Glowing Crystal Staff
    put(head, geoBox(0.48, 0.04, 0.48), skin(0x4b1d8c), 0, 1.27 + hy, 0, 0, true);
    put(head, geoCyl(0.15, 0.18, 10), skin(0x5e2ca5), 0, 1.37 + hy, 0, 0, true);
    put(head, geoCyl(0.08, 0.18, 8), skin(0x5e2ca5), 0, 1.54 + hy, 0, 0, true);
    put(head, geoBox(0.05, 0.05, 0.03), goldM, 0, 1.36 + hy, -0.15, 0, true);
    put(group, geoBox(0.40, 0.52, 0.04), skin(0x3a1468), 0, 0.66, 0.135, 0, true);
    put(group, geoCyl(0.02, 0.88, 8), woodM, 0.29, 0.56, -0.13, 0.15, true);
    const orb = transTile(0x64f5e8, 0x24b8a8);
    put(group, geoBox(0.09, 0.09, 0.09), orb, 0.29, 1.01, -0.19, 0, true);
  } else if (role === "ranger") {
    // Forest Hood with Red Feather Plume + Back Quiver + Held 3D LEGO Bow
    put(head, geoBox(0.34, 0.12, 0.28), skin(0x1d5526), 0, 1.28 + hy, 0, 0, true);
    put(head, geoBox(0.03, 0.14, 0.06), skin(0xe23b2f), 0.14, 1.38 + hy, -0.04, -0.25, true);
    put(group, geoCyl(0.055, 0.28, 8), skin(0x6b3e22), 0.08, 0.76, 0.15, 0.15, true);
    put(group, geoBox(0.03, 0.30, 0.12), woodM, 0.28, 0.50, -0.16, 0.3, true);
  } else {
    put(head, geoBox(0.34, 0.06, 0.26), darkM, 0, 1.27 + hy, 0, 0, true);
  }
}

export function buildLego(kind: string, scale: number): LegoBody {
  const figKind =
    kind === "villager"
      ? makeFig(0x8d5a34, 0x6b3e22, 0x4a3424, "nose")
      : kind === "walker"
        ? makeFig(0x286e78, 0x283268, 0x1e3c20, "mad", 0x5ea252)
        : kind === "skelly"
          ? makeFig(0xe8e0d0, 0xd4cbb8, 0xf7f4ee, "skull", 0xf4f1ea)
          : kind === "piglin"
            ? makeFig(0x7a4222, 0x4a2a18, 0xf2a2c0, "snout", 0xf2a2c0)
            : kind === "witch"
              ? makeFig(0x4a2a6a, 0x223824, 0x14101c, "nose", 0xd8b088)
              : kind === "drowned"
                ? makeFig(0x2a6a6a, 0x1a3a4a, 0x164a3a, "mad", 0x6ac0a8)
                : kind === "husk"
                  ? makeFig(0xc8ad78, 0x9e8252, 0x1d4ed8, "mad", 0x8a6438)
                  : kind === "stray"
                    ? makeFig(0x627c8c, 0x3e505c, 0xc8e4f0, "skull", 0xdff0f7)
                    : kind === "pillager"
                      ? makeFig(0x483224, 0x2c3038, 0x23232a, "nose", 0x90969e)
                      : kind === "vindicator"
                        ? makeFig(0x2e3840, 0x22282e, 0x1e2620, "nose", 0x90969e)
                        : kind === "evoker"
                          ? makeFig(0x1e1a2b, 0x161420, 0x14101c, "nose", 0x90969e)
                          : null;
  const built = figKind ?? beast(kind);
  const g = built.group;
  const head = (g.userData.head as THREE.Object3D | undefined) ?? g;
  const hy = head === g ? 0 : -1.0;
  const goldM = skin(0xf5c518);
  const ironM = skin(0xb0b8c2);
  const darkIron = skin(0x424750);
  const woodM = skin(0x7c522b);

  if (kind === "walker") {
    // Zombie: tattered chest armor plate, asymmetric torn pauldron & glowing green eyes
    const zEye = transTile(0x52ff68, 0x146e20);
    put(head, geoBox(0.05, 0.045, 0.024), zEye, -0.056, 1.155 + hy, -0.155, 0, true);
    put(head, geoBox(0.05, 0.045, 0.024), zEye, 0.056, 1.155 + hy, -0.155, 0, true);
    put(g, geoBox(0.16, 0.10, 0.24), skin(0x425238), -0.16, 0.89, 0, 0, true);
    put(g, geoBox(0.32, 0.08, 0.245), skin(0x3a2818), 0, 0.56, 0, 0, true);
  } else if (kind === "skelly" || kind === "stray") {
    // Skeleton / Frost Stray: 3D LEGO Bow gripped in right hand + back arrow quiver (+ Ice Crown on Stray)
    const bowCol = kind === "stray" ? skin(0x7ae2ff) : woodM;
    put(g, geoBox(0.032, 0.34, 0.14), bowCol, 0.28, 0.52, -0.18, 0.25, true);
    put(g, geoCyl(0.008, 0.34, 6), skin(0xf4f1ea), 0.28, 0.52, -0.11, 0.25, true);
    put(g, geoCyl(0.05, 0.26, 8), skin(0x6b3e22), -0.09, 0.78, 0.15, -0.2, true);
    if (kind === "stray") {
      const iceM = transTile(0x7cf0ff, 0x1e88a8);
      put(head, geoBox(0.36, 0.10, 0.30), skin(0x4a6a7c), 0, 1.28 + hy, 0, 0, true);
      put(head, geoBox(0.05, 0.12, 0.05), iceM, -0.11, 1.36 + hy, -0.08, 0, true);
      put(head, geoBox(0.05, 0.14, 0.05), iceM, 0, 1.38 + hy, -0.10, 0, true);
      put(head, geoBox(0.05, 0.12, 0.05), iceM, 0.11, 1.36 + hy, -0.08, 0, true);
    }
  } else if (kind === "husk") {
    // Pharaoh Mummy: Egyptian Royal Blue & Gold Nemes Headdress + Uraeus Cobra + Linen Bandages + Golden Scepter
    put(head, geoBox(0.40, 0.12, 0.32), skin(0x1d4ed8), 0, 1.28 + hy, 0.02, 0, true);
    put(head, geoBox(0.42, 0.045, 0.33), goldM, 0, 1.25 + hy, 0.02, 0, true);
    put(head, geoBox(0.10, 0.22, 0.10), skin(0x1d4ed8), -0.17, 1.08 + hy, -0.04, 0, true);
    put(head, geoBox(0.10, 0.22, 0.10), skin(0x1d4ed8), 0.17, 1.08 + hy, -0.04, 0, true);
    put(head, geoBox(0.11, 0.04, 0.11), goldM, -0.17, 1.06 + hy, -0.04, 0, true);
    put(head, geoBox(0.11, 0.04, 0.11), goldM, 0.17, 1.06 + hy, -0.04, 0, true);
    put(head, geoBox(0.055, 0.10, 0.05), goldM, 0, 1.34 + hy, -0.15, 0, true); // Golden cobra uraeus
    put(g, geoBox(0.38, 0.05, 0.245), skin(0xe8dec2), 0, 0.78, 0, 0, true);
    put(g, geoBox(0.38, 0.05, 0.245), skin(0xd8cca8), 0, 0.64, 0, 0, true);
    put(g, geoCyl(0.02, 0.44, 8), goldM, 0.28, 0.54, -0.16, 0.35, true);
    put(g, geoBox(0.08, 0.08, 0.08), transTile(0xffd84a, 0xd88800), 0.28, 0.74, -0.24, 0, true);
  } else if (kind === "drowned") {
    // Drowned: Glowing Cyan Eyes + Seaweed Shoulder Wraps + Held 3-Pronged 3D LEGO Trident!
    const seaEye = transTile(0x4ef2f7, 0x128898);
    put(head, geoBox(0.05, 0.048, 0.024), seaEye, -0.056, 1.155 + hy, -0.155, 0, true);
    put(head, geoBox(0.05, 0.048, 0.024), seaEye, 0.056, 1.155 + hy, -0.155, 0, true);
    put(g, geoBox(0.16, 0.12, 0.25), skin(0x1f5c38), -0.15, 0.88, 0, 0, true);
    put(g, geoCyl(0.02, 0.52, 8), skin(0x2a8478), 0.28, 0.54, -0.16, 0.35, true);
    put(g, geoBox(0.14, 0.04, 0.04), skin(0x66e8dc), 0.28, 0.76, -0.25, 0, true);
    for (const px of [-0.05, 0, 0.05]) {
      put(g, geoCyl(0.008, 0.11, 6), skin(0xe8ffff), 0.28 + px, 0.83, -0.28, 0.35, true);
    }
  } else if (kind === "piglin") {
    // Piglin: Golden Horned Helmet + Flopped Ears + Ivory Tusks + Gold Belt + Held Golden LEGO Sword!
    put(head, geoCyl(0.175, 0.12, 12), goldM, 0, 1.28 + hy, 0, 0, true);
    put(head, geoBox(0.04, 0.10, 0.04), skin(0xf7f4ee), -0.18, 1.32 + hy, -0.02, 0, true);
    put(head, geoBox(0.04, 0.10, 0.04), skin(0xf7f4ee), 0.18, 1.32 + hy, -0.02, 0, true);
    put(head, geoBox(0.06, 0.16, 0.10), skin(0xf2a2c0), -0.19, 1.12 + hy, 0, 0.1, true);
    put(head, geoBox(0.06, 0.16, 0.10), skin(0xf2a2c0), 0.19, 1.12 + hy, 0, -0.1, true);
    put(head, geoBox(0.026, 0.06, 0.026), skin(0xf7f4ee), -0.055, 1.07 + hy, -0.21, 0, true);
    put(head, geoBox(0.026, 0.06, 0.026), skin(0xf7f4ee), 0.055, 1.07 + hy, -0.21, 0, true);
    put(g, geoBox(0.42, 0.07, 0.245), goldM, 0, 0.56, 0, 0, true);
    put(g, geoBox(0.06, 0.34, 0.025), goldM, 0.28, 0.58, -0.18, 0.45, true);
    put(g, geoBox(0.13, 0.035, 0.04), skin(0xc99812), 0.28, 0.45, -0.12, 0, true);
  } else if (kind === "witch") {
    // Pointed hat: brim + two stacked drums taper to the tip + nose wart + glowing potion bottle in hand
    put(head, geoBox(0.52, 0.05, 0.52), skin(0x1a1226), 0, 1.28 + hy, 0, 0, true);
    put(head, geoCyl(0.15, 0.2, 10), skin(0x241536), 0, 1.4 + hy, 0, 0, true);
    put(head, geoCyl(0.08, 0.18, 8), skin(0x241536), 0, 1.58 + hy, 0, 0, true);
    put(head, geoBox(0.3, 0.06, 0.3), skin(0x3aaa4c), 0, 1.33 + hy, 0, 0, true);
    put(head, geoBox(0.08, 0.07, 0.03), goldM, 0, 1.33 + hy, -0.16, 0, true);
    put(head, geoCyl(0.022, 0.022, 8), skin(0x52a842), 0.02, 1.09 + hy, -0.26, Math.PI / 2, true);
    const potM = transTile(0xba6eff, 0x732ab5);
    put(g, geoCyl(0.06, 0.12, 8), potM, 0.28, 0.48, -0.16, 0, true);
  } else if (kind === "pillager") {
    // Pillager: Dark Iron Shoulder Pauldrons + Silver Belt Buckle + Held 3D LEGO Crossbow
    put(g, geoBox(0.48, 0.09, 0.26), darkIron, 0, 0.89, 0, 0, true);
    put(g, geoBox(0.42, 0.065, 0.245), skin(0x231a12), 0, 0.56, 0, 0, true);
    put(g, geoBox(0.07, 0.07, 0.03), ironM, 0, 0.56, -0.13, 0, true);
    put(g, geoBox(0.05, 0.06, 0.28), woodM, 0.28, 0.50, -0.18, 0, true);
    put(g, geoBox(0.26, 0.035, 0.04), darkIron, 0.28, 0.52, -0.30, 0, true);
  } else if (kind === "vindicator") {
    // Vindicator: Silver-Trimmed Vest + Held 3D LEGO Iron Battle-Axe
    put(g, geoBox(0.10, 0.36, 0.245), ironM, 0, 0.72, 0, 0, true);
    put(g, geoCyl(0.02, 0.42, 8), woodM, 0.28, 0.55, -0.16, 0.38, true);
    put(g, geoBox(0.13, 0.14, 0.035), ironM, 0.28, 0.72, -0.25, 0, true);
  } else if (kind === "evoker") {
    // Evoker: Gold-Trimmed Robe + Golden Mantle + Held Glowing Totem of Undying
    put(g, geoBox(0.46, 0.10, 0.26), goldM, 0, 0.89, 0, 0, true);
    put(g, geoBox(0.12, 0.40, 0.245), goldM, 0, 0.72, 0, 0, true);
    put(g, geoBox(0.10, 0.16, 0.08), goldM, 0.28, 0.52, -0.16, 0, true);
    put(g, geoBox(0.18, 0.05, 0.06), transTile(0x36e868, 0x148834), 0.28, 0.54, -0.17, 0, true);
  }

  alignQuadruped(built, kind);
  // MINECRAFT proportions (Philippe, 2026-10-28: "tous les mobs sont petits
  // comparer a minecraft, corrige ca, compare tout a minecraft"). Every model
  // was built ~1.2-1.55x small (humanoids 1.29 vs MC 1.95, player fig 1.29 vs
  // 1.8 — measured by the mobAudit QA hook). Normalize each kind to its exact
  // Minecraft height in blocks, scaling every direct child about the group
  // origin (the death ragdoll unclips direct children, so no wrapper group).
  // Ground kinds are also re-grounded (feet exactly on the origin); flyers
  // and swimmers keep their authored hover offset. boat/cart untouched.
  const mcTarget = MC_HEIGHT[kind];
  if (mcTarget) {
    const box = new THREE.Box3().setFromObject(built.group);
    const h = box.max.y - box.min.y;
    if (h > 0.05) {
      const f = mcTarget / h;
      if (Math.abs(f - 1) > 0.02 || (!MC_FLOATING.has(kind) && box.min.y !== 0)) {
        for (const c of [...built.group.children]) {
          c.scale.multiplyScalar(f);
          c.position.multiplyScalar(f);
          if (!MC_FLOATING.has(kind)) c.position.y -= box.min.y * f;
        }
      }
    }
  }
  if (scale !== 1) built.group.scale.multiplyScalar(scale);
  return built;
}

// Minecraft heights in blocks (hitbox height of the living creature; the
// camera eye is already MC-exact at 1.62). Flyers whose visual span is not
// their hitbox height (phantom wingspan, ghast tentacles) are normalized on
// total height as built. wisp/crab are Studcraft originals, sized to their
// closest MC analogues (allay / cave spider).
const MC_HEIGHT: Record<string, number> = {
  sheep: 1.3, creeper: 1.7, cow: 1.4, walker: 1.95, pig: 0.9, chicken: 0.7,
  spider: 0.5, skelly: 1.99, villager: 1.95, ghast: 4, dragon: 4, horse: 1.6,
  piglin: 1.95, frog: 0.5, fox: 0.7, crab: 0.5, wisp: 0.7, slime: 1.5,
  wolf: 0.85, golem: 2.7, wither: 3.5, enderman: 2.9, blaze: 1.8, witch: 1.95,
  bee: 0.45, cat: 0.7, squid: 0.8, bat: 0.55, drowned: 1.95, husk: 1.95,
  stray: 1.99, goat: 1.3, axolotl: 0.4, parrot: 0.9, guardian: 0.85,
  shulker: 1, pillager: 1.95, vindicator: 1.95, evoker: 1.95, vex: 0.8,
  ravager: 2.2,
};
// Kinds whose model origin is not the ground (fly, swim, hover by design).
const MC_FLOATING = new Set(["ghast", "phantom", "bat", "bee", "vex", "blaze", "dragon", "wither", "parrot", "wisp", "squid", "guardian"]);

// v4.13 anatomy fix: these beasts were modelled with the torso long across X
// while they face and walk along -Z — they moved broadside, with the head on the
// narrow flank and legs hanging off the sides. Turn the torso 90° so its length
// runs head-to-tail, slide head/tail to the new ends and plant every leg under
// the body. Head, tail and leg pivots are moved but never rotated, so the gait
// (legs swing on X) and head-look (Y) keep working unchanged.
const BROADSIDE = new Set(["sheep", "cow", "pig", "horse", "fox", "wolf", "cat", "goat"]);
function alignQuadruped(built: LegoBody, kind: string) {
  if (!BROADSIDE.has(kind)) return;
  const g = built.group;
  let body: THREE.Mesh | null = null;
  g.traverse((o) => {
    if (!body && (o as THREE.Mesh).isMesh && o.userData.skin === "body") body = o as THREE.Mesh;
  });
  const bm = body as THREE.Mesh | null;
  if (!bm) return;
  const params = (bm.geometry as THREE.BoxGeometry).parameters;
  if (!params || !(params.width > params.depth * 1.15)) return;
  const hw = params.width / 2; // old half-length along X → new half-length along Z
  const hd = params.depth / 2; // old half-depth along Z → new half-width along X
  const head = g.userData.head as THREE.Object3D | undefined;
  const tail = g.userData.tail as THREE.Object3D | undefined;
  const legSet = new Set(built.legs);
  const rot = new THREE.Matrix4().makeRotationY(Math.PI / 2);
  for (const c of [...g.children]) {
    if (c === head || c === tail) {
      const z = c.position.z;
      // Only parts attached at the old narrow face move out to the new ends.
      if (Math.abs(z) < (hd + hw) / 2) c.position.z = z + Math.sign(z || (c === head ? -1 : 1)) * (hw - hd);
      continue;
    }
    if (legSet.has(c)) {
      const box = new THREE.Box3().setFromObject(c);
      const lw = Math.max(0.04, (box.max.x - box.min.x) / 2);
      const ld = Math.max(0.04, (box.max.z - box.min.z) / 2);
      const ox = c.position.x;
      const oz = c.position.z;
      const nx = Math.sign(oz || ox) * Math.min(Math.abs(oz) || Math.abs(ox), hd - lw - 0.01);
      const nz = Math.sign(ox || oz) * Math.min(Math.abs(ox), hw - ld - 0.02);
      c.position.set(nx, c.position.y, nz);
      continue;
    }
    // Classify by where the part actually sits (a group like the tamed collar
    // lives at the origin but its bricks hang off the old front face).
    const cb = new THREE.Box3().setFromObject(c, true);
    const z = Number.isFinite(cb.min.z) ? (cb.min.z + cb.max.z) / 2 : c.position.z;
    if (Math.abs(z) > hd + 0.005) {
      // Decoration on the old front/back face (tail slope, chest bib, collar):
      // keep its orientation, carry it to the new front/back face at the same offset.
      c.position.z += Math.sign(z) * (hw - hd);
      continue;
    }
    c.applyMatrix4(rot);
  }
}
