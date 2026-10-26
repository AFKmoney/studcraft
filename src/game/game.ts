import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BLOCKS, CREATIVE_BAR, ID, def, stairsVariant } from "./blocks";
import { createAudio } from "./audio";
import { STUD_H, STUD_R, buildChunk, type Surface } from "./mesher";
import { NEIGHBORS, RECIPES, SMELT, fuelTime, matchGrid } from "./recipes";
import { DISCOVER, MOB_XP, ORE_HEAR, ORE_XP, nextPerk, rankTitle, xpNeed } from "./ranks";
import { manaMaxFor, skillById, spellsFor } from "./skills";
import { QUESTS, traderOf, tradeLevelFor, TIER_NAMES, TIER_XP, type TraderRole } from "./quests";
import { MpClient } from "./mp";
import { clearSave, deleteWorld, hasSave, listWorlds, loadLatest, loadSettings, loadWorld, writeSettings, writeWorld, type SaveV1, type WorldSlot } from "./save";
import { buildAtlas } from "./textures";
import { CS, HEIGHT, World, decorate, folkLayout, penSheep, paintEndCrystals, END_PILLARS, type Decor, type FolkSpot } from "./world";
import { stockChest } from "./loot";
import { Upscaler, upscaleScale } from "./upscale";
import { parseSeed } from "./noise";

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
  creative: boolean;
  flying: boolean;
  hammer: boolean;
  x: number;
  y: number;
  z: number;
  biome: string;
  timeLabel: string;
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
  offers: { pay: number; pn: number; out: number; on: number; payName: string; outName: string; tier: number; locked: boolean; stock: number }[];
  reputation: number;
  repWord: string;
  traderLevel: string;
  traderNext: string;
  netStatus: string;
  quests: { id: string; name: string; detail: string; n: number; need: number; done: boolean; ready: boolean; reward: string }[];
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
};

export type TouchState = {
  moveX: number;
  moveY: number;
  jump: boolean;
  mine: boolean;
  place: boolean;
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
  swapSlots: (a: number, b: number) => void;
  assign: (id: number) => void;
  hold: (id: number) => void;
  shiftStack: (id: number) => void;
  gridTap: (i: number) => void;
  craftTake: () => void;
  craft: (id: string) => void;
  armorTap: (i: number) => void;
  furnaceTap: (part: number) => void;
  chestTap: (i: number) => void;
  enchant: () => void;
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
      tradeAt?: (i: number) => boolean;
      restockNow?: () => boolean;
      getMobNames?: () => string[];
      getArmor?: () => number[];
      give?: (id: number, n: number) => boolean;
      setInv?: (id: number, n: number) => boolean;
      mpConnect?: (url: string, room: string, name: string) => boolean;
      getMobs?: () => string[];
      getHamlet?: () => { x: number; y: number; z: number } | null;
      getChunks?: () => number;
      /** QA: stop/restart the frame loop so a capture sees a still frame. */
      hold?: (on: boolean) => void;
      getRes?: () => string;
      getMobFx?: () => { kind: string; hp: number; hurt: number; bar: boolean; amp: number; x: number; y: number; z: number; cd?: number; cool?: number }[];
      getCorpses?: () => number;
      getMobCount?: () => number;
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
    creative: true,
    flying: false,
    hammer: false,
    x: 0,
    y: 0,
    z: 0,
    biome: "",
    timeLabel: "Day",
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
  };
  const touch: TouchState = { moveX: 0, moveY: 0, jump: false, mine: false, place: false };
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
  const wxCur = { cover: 0.22, dark: 0, precip: 0, fog: 1, wind: 1 };
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
    { key: "sharpness", name: "Sharpness", max: 5, for: (d) => d.tool === "sword" || d.tool === "axe" },
    { key: "smite", name: "Smite", max: 5, for: (d) => d.tool === "sword" || d.tool === "axe" },
    { key: "bane", name: "Bane of Spiders", max: 5, for: (d) => d.tool === "sword" || d.tool === "axe" },
    { key: "fire", name: "Fire Aspect", max: 2, for: (d) => d.tool === "sword" },
    { key: "knockback", name: "Knockback", max: 2, for: (d) => d.tool === "sword" },
    { key: "looting", name: "Looting", max: 3, for: (d) => d.tool === "sword" },
    { key: "efficiency", name: "Efficiency", max: 5, for: (d) => d.tool === "pick" || d.tool === "axe" || d.tool === "shovel" },
    { key: "fortune", name: "Fortune", max: 3, for: (d) => d.tool === "pick" },
    { key: "silk", name: "Silk Touch", max: 1, for: (d) => d.tool === "pick" || d.tool === "axe" || d.tool === "shovel" },
    { key: "unbreaking", name: "Unbreaking", max: 3, for: (d) => d.maxUse > 0 },
    { key: "mending", name: "Mending", max: 1, for: (d) => d.maxUse > 0 },
    { key: "protection", name: "Protection", max: 4, for: (d) => d.armor > 0 },
    { key: "thorns", name: "Thorns", max: 3, for: (d) => d.armor > 0 },
    { key: "power", name: "Power", max: 5, for: (d) => d.tool === "bow" },
    { key: "flame", name: "Flame", max: 1, for: (d) => d.tool === "bow" },
    { key: "punch", name: "Punch", max: 2, for: (d) => d.tool === "bow" },
    { key: "infinity", name: "Infinity", max: 1, for: (d) => d.tool === "bow" },
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
  const repOut = new Map<string, boolean>();
  const repTimer = new Map<string, number>();
  let rsAcc = 0;
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
  renderer.toneMappingExposure = settings.realistic ? 1.08 : 1;
  renderer.shadowMap.enabled = settings.realistic;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x8ec8f5, 28, 72);
  const camera = new THREE.PerspectiveCamera(72, 1, 0.08, 420);
  camera.rotation.order = "YXZ";
  scene.add(camera);

  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x6d8a4e, 0.55);
  const ambient = new THREE.AmbientLight(0xffffff, 0.28);
  const sun = new THREE.DirectionalLight(0xfff4dd, 0.85);
  sun.position.set(40, 80, 20);
  sun.castShadow = settings.realistic;
  sun.shadow.mapSize.set(narrow ? 1024 : 2048, narrow ? 1024 : 2048);
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.06;
  const shadowCam = sun.shadow.camera;
  shadowCam.left = -30;
  shadowCam.right = 30;
  shadowCam.top = 30;
  shadowCam.bottom = -30;
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
          vec3 col = mix(horizonColor, topColor, pow(max(h, 0.0), 0.5));
          if (h < 0.0) col = mix(horizonColor, horizonColor * 0.55, clamp(-h * 3.0, 0.0, 1.0));
          float s = max(dot(d, normalize(sunDirection)), 0.0);
          col += sunColor * (pow(s, 350.0) * 1.4 + pow(s, 10.0) * 0.16) * uGlow;
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
  for (let i = 0; i < 4; i++) {
    const lamp = new THREE.PointLight(0xffc56b, 0, 9, 1.4);
    scene.add(lamp);
    lamps.push(lamp);
  }

  const atlases = buildAtlas();
  const atlas = atlases.color;
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  atlas.anisotropy = aniso;
  atlases.rough.anisotropy = Math.min(4, aniso);
  atlases.normal.anisotropy = Math.min(4, aniso);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envTex = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();
  scene.environment = settings.realistic ? envTex : null;
  scene.environmentIntensity = settings.realistic ? 0.35 : 1;

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
    roughness: 1,
    metalness: 0,
    roughnessMap: atlases.rough,
    normalMap: atlases.normal,
    emissiveMap: atlases.glow,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 1.15,
    vertexColors: true,
    envMapIntensity: 0.55,
  });
  const glassStd = new THREE.MeshStandardMaterial({
    map: atlas,
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    envMapIntensity: 0.7,
    vertexColors: true,
  });
  const waterTime = { value: 0 };
  const waterStd = new THREE.MeshStandardMaterial({
    map: atlas,
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    side: THREE.DoubleSide,
    envMapIntensity: 1,
    vertexColors: true,
  });
  waterStd.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vRippleUv;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\nvRippleUv = uv;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nvarying vec2 vRippleUv;")
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        vec2 wuv = vRippleUv * 6.0;
        float r1 = sin(wuv.x * 3.2 + uTime * 1.4) * cos(wuv.y * 2.6 - uTime * 0.9);
        float r2 = sin((wuv.x + wuv.y) * 2.1 - uTime * 0.6);
        normal = normalize(normal + vec3(r1, r2, 0.0) * 0.22);`,
      )
      .replace(
        "#include <opaque_fragment>",
        `float ndv = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
        float fres = pow(1.0 - ndv, 2.4);
        diffuseColor.a = mix(0.38, 0.82, fres);
        #include <opaque_fragment>`,
      );
  };
  waterStd.customProgramCacheKey = () => "studcraft-water";
  const plantStd = new THREE.MeshStandardMaterial({
    map: atlas,
    roughness: 0.86,
    metalness: 0,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    emissiveMap: atlases.glow,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 1.15,
    vertexColors: true,
    envMapIntensity: 0.15,
  });
  let opaqueMat: THREE.Material = settings.realistic ? opaqueStd : opaqueLam;
  let glassMat: THREE.Material = settings.realistic ? glassStd : glassLam;
  let waterMat: THREE.Material = settings.realistic ? waterStd : waterLam;
  let plantMat: THREE.Material = settings.realistic ? plantStd : plantLam;

  const chunkRoot = new THREE.Group();
  scene.add(chunkRoot);
  const meshes = new Map<string, THREE.Mesh[]>();
  const dirty = new Set<string>();
  const chunkTier = new Map<string, number>();

  // LOD tiers by chunk distance from the player: 0 = full (studs + AO),
  // 1 = no studs, AO kept, 2 = no studs, no AO (far silhouette chunks).
  function tierFor(d2: number) {
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

  const outlineMat = new THREE.LineBasicMaterial({ color: 0x1a120c });
  const highlight = new THREE.Group();
  highlight.add(
    new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02)), outlineMat),
  );
  const studOutline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.CylinderGeometry(STUD_R, STUD_R, STUD_H, 16)),
    outlineMat,
  );
  studOutline.position.y = 0.51 + STUD_H / 2;
  highlight.add(studOutline);
  highlight.visible = false;
  scene.add(highlight);

  const ghostMat = skin(0xffffff, { transparent: true, opacity: 0.45, depthWrite: false });
  const ghost = new THREE.Group();
  ghost.userData.keepShadow = false;
  const ghostBody = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.98, 0.98), ghostMat);
  ghost.add(ghostBody);
  const ghostStud = new THREE.Mesh(new THREE.CylinderGeometry(STUD_R, STUD_R, STUD_H, 24), ghostMat);
  ghostStud.position.y = 0.49 + STUD_H / 2;
  ghost.add(ghostStud);
  ghost.visible = false;
  scene.add(ghost);

  const boltMat = skin(0xe7f6ff);
  boltMat.emissive = new THREE.Color(0xd6f4ff);
  const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.16, 46, 0.16), boltMat);
  bolt.visible = false;
  bolt.userData.keepShadow = false;
  scene.add(bolt);

  const brickMat = skin(0xe23b2f, { depthTest: false });
  const viewBrick = new THREE.Group();
  viewBrick.userData.keepShadow = false;
  const hand = 0.32;
  viewBrick.add(new THREE.Mesh(new THREE.BoxGeometry(hand, hand, hand), brickMat));
  const handStud = new THREE.Mesh(
    new THREE.CylinderGeometry(hand * STUD_R, hand * STUD_R, hand * STUD_H, 20),
    brickMat,
  );
  handStud.position.y = hand / 2 + (hand * STUD_H) / 2;
  viewBrick.add(handStud);
  viewBrick.position.set(0.34, -0.3, -0.52);
  viewBrick.renderOrder = 999;
  camera.add(viewBrick);

  const fig = makeMinifig();
  fig.group.visible = false;
  if (plasticOn) {
    fig.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) mesh.castShadow = true;
    });
  }
  scene.add(fig.group);

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
    shadowT?: number;
    mode?: string;
    modeT?: number;
    bossT?: number;
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
    const moved = Math.hypot(m.x - v.lx, m.z - v.lz);
    v.lx = m.x;
    v.lz = m.z;
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
    for (let i = 0; i < m.legs.length; i++) {
      const part = m.legs[i];
      if (!part) continue;
      const arm = i >= 2;
      part.rotation.x = stride * (i % 2 === 0 ? 0.62 : -0.62) * v.amp + (arm ? idle : 0);
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

  /** Death: the figure topples, flashes, then pops into a puff of studs. */
  function topple(m: Mob) {
    const v = m.vis;
    if (v) {
      dropBar(v);
      if (v.blob) v.blob.visible = false;
    }
    if (m.mesh.parent !== scene || reduceMotion) {
      scene.remove(m.mesh);
      return;
    }
    const mats: THREE.Material[] = [];
    m.mesh.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of list) {
        const std = mat as THREE.MeshStandardMaterial;
        if (std.emissive) std.emissive.setHex(0x8a1010);
        mats.push(mat);
      }
    });
    corpses.push({ mesh: m.mesh, t: 0, x: m.x, y: m.y, z: m.z, mats });
    if (corpses.length > 24) scene.remove(corpses.shift()!.mesh);
  }

  function tickCorpses(dt: number) {
    for (let i = corpses.length - 1; i >= 0; i--) {
      const c = corpses[i];
      c.t += dt;
      const fall = Math.min(1, c.t / 0.38);
      c.mesh.rotation.z = (1 - (1 - fall) * (1 - fall)) * (Math.PI / 2) * 0.92;
      const base = (c.mesh.userData.baseScale ??= c.mesh.scale.x) as number;
      if (c.t > 0.55) c.mesh.scale.setScalar(base * Math.max(0.001, 1 - (c.t - 0.55) / 0.3));
      if (c.t > 0.85) {
        burst(c.x, c.y + 0.5, c.z, "#f4f1ea", 10);
        burst(c.x, c.y + 0.5, c.z, "#d8d2c4", 6);
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
    renderer.toneMappingExposure = settings.realistic ? 1.08 : 1;
    renderer.shadowMap.enabled = settings.realistic;
    scene.environment = settings.realistic ? envTex : null;
    scene.environmentIntensity = settings.realistic ? 0.35 : 1;
    sun.castShadow = settings.realistic;
    opaqueMat = settings.realistic ? opaqueStd : opaqueLam;
    glassMat = settings.realistic ? glassStd : glassLam;
    waterMat = settings.realistic ? waterStd : waterLam;
    plantMat = settings.realistic ? plantStd : plantLam;
    for (const list of meshes.values()) {
      for (const mesh of list) {
        if (mesh.renderOrder === 2) mesh.material = glassMat;
        else if (mesh.renderOrder === 1) mesh.material = waterMat;
        else if (mesh.renderOrder === 3) mesh.material = plantMat;
        else mesh.material = opaqueMat;
        mesh.castShadow = settings.realistic && mesh.renderOrder !== 1 && mesh.renderOrder !== 3;
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

  let worldTime = 0.22;
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
  let slowT = 0;
  let healAcc = 0;
  let mendAcc = 0;
  const frostIce = new Map<string, number>();
  let poisonAcc = 0;
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
  type Drop = { id: number; n: number; x: number; y: number; z: number; vy: number; mesh: THREE.Mesh };
  const drops: Drop[] = [];
  let jumpTap = -10;
  let elapsed = 0;
  const tmp = new THREE.Color();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function emit() {
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
      mods: { ...settings.mods },
    });
  }

  const pub = { phase: "title" as Phase, hasSave: hasSaveFlag };

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
    hud.found = [...found];
    hud.oxygen = oxygen;
    hud.rain = raining;
    hud.weather = wx;
    hud.armor = [...armor];
    hud.grid = [...grid];
    hud.cursor = cursor;
    hud.panel = panel;
    const matched = matchGrid(grid, panel === "bench");
    hud.craftOut = matched && matched.out ? { id: matched.out, n: matched.n } : null;
    const furn = furnaces.get(focus.x + "," + focus.y + "," + focus.z);
    hud.furnace = furn
      ? { in: furn.in, inN: furn.inN, fuel: furn.fuel, fuelN: furn.fuelN, out: furn.out, outN: furn.outN, cook: furn.cook / 5 }
      : { in: 0, inN: 0, fuel: 0, fuelN: 0, out: 0, outN: 0, cook: 0 };
    const bin = chests.get(focus.x + "," + focus.y + "," + focus.z);
    hud.chest = bin ? bin.ids.map((id, i) => ({ id, n: bin.ns[i] ?? 0 })) : Array.from({ length: 27 }, () => ({ id: 0, n: 0 }));
    const dxs = spawnPoint.x - player.x;
    const dzs = spawnPoint.z - player.z;
    hud.compass = Math.atan2(-dxs, -dzs);
    hud.realm = realm === 1 ? "Nether" : realm === 2 ? "End" : "Overworld";
    const wyrm = mobs.find((m) => m.kind === "dragon" && !m.dead);
    hud.boss = wyrm ? "End Wyrm" : raid ? "Raid — wave " + raid.wave + " of 3" : "";
    hud.bossHp = wyrm
      ? Math.max(0, Math.min(1, wyrm.hp / (wyrm.maxHp ?? wyrm.hp)))
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
      slowT > 0 ? "Tar" : "",
      fireT > 0 ? "Fire" : "",
      enchSummary(hotbar[slot]) ? "Rune" : "",
      omenT > 0 ? "Omen" : "",
      heroT > 0 ? "Hero" : "",
    ]
      .filter(Boolean)
      .join(" ");
    hud.heldEnch = enchSummary(hotbar[slot]);
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
    hud.quests = QUESTS.map((q) => {
      const prog = quests.find((p) => p.id === q.id) ?? { n: 0, done: false };
      let n = prog.n;
      let ready = !prog.done && n >= q.need;
      if (!prog.done && q.kind === "have") {
        const held = q.id === "gem" ? Math.max(inv[ID.Diamond] ?? 0, inv[ID.Prism] ?? 0) : (inv[q.what] ?? 0);
        n = Math.min(q.need, held);
        ready = held >= q.need;
      }
      if (ready && !alert) alert = q.name + " ready";
      const reward = q.reward.map(([id, count]) => count + " " + def(id).name.toLowerCase()).join(", ");
      return { id: q.id, name: q.name, detail: q.detail, n, need: q.need, done: prog.done, ready, reward };
    });
    hud.questAlert = alert;
    const readyQ = hud.quests.find((q) => q.ready);
    const openQ = hud.quests.find((q) => !q.done);
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

  function timeWord() {
    const ang = worldTime * Math.PI * 2;
    const sunH = Math.sin(ang);
    const rising = Math.cos(ang) > 0;
    if (sunH > 0.45) return "Day";
    if (sunH > 0.05) return rising ? "Morning" : "Evening";
    if (sunH > -0.35) return rising ? "Dawn" : "Dusk";
    return "Night";
  }

  let clockHeard = "";
  function noteClock() {
    if (phase !== "play" || hotbar[slot] !== ID.Clock) {
      clockHeard = "";
      return;
    }
    const word = timeWord();
    if (word === clockHeard) return;
    clockHeard = word;
    say(word);
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
    spawnPoint = { x: data.px, y: data.py, z: data.pz };
    player.x = data.px;
    player.y = data.py;
    player.z = data.pz;
    player.yaw = data.yaw;
    player.pitch = data.pitch;
    player.vx = player.vy = player.vz = 0;
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

  function surfaceToMesh(surf: Surface, material: THREE.Material, order: number) {
    if (surf.pos.length === 0) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(surf.pos, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(surf.nor, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(surf.uv, 2));
    if (surf.col.length === surf.pos.length) geo.setAttribute("color", new THREE.Float32BufferAttribute(surf.col, 3));
    if (surf.tan.length * 3 === surf.pos.length * 4) geo.setAttribute("tangent", new THREE.Float32BufferAttribute(surf.tan, 4));
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = settings.realistic && order !== 1 && order !== 3;
    mesh.receiveShadow = settings.realistic;
    mesh.renderOrder = order;
    return mesh;
  }

  function dropChunk(key: string) {
    const list = meshes.get(key);
    chunkTier.delete(key);
    if (!list) return;
    for (const mesh of list) {
      chunkRoot.remove(mesh);
      mesh.geometry.dispose();
    }
    meshes.delete(key);
  }

  function rebuild(cx: number, cz: number, key: string, tier: number) {
    dropChunk(key);
    const built = buildChunk(world, cx, cz, tier === 0 ? settings.studs : false, tier < 2);
    chunkTier.set(key, tier);
    const list: THREE.Mesh[] = [];
    for (const mesh of [
      surfaceToMesh(built.opaque, opaqueMat, 0),
      surfaceToMesh(built.glass, glassMat, 2),
      surfaceToMesh(built.water, waterMat, 1),
      surfaceToMesh(built.plant, plantMat, 3),
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
    for (const item of need) {
      if (left <= 0) break;
      const tier = tierFor(item.d);
      if (meshes.has(item.key) && !dirty.has(item.key) && chunkTier.get(item.key) === tier) continue;
      rebuild(item.cx, item.cz, item.key, tier);
      dirty.delete(item.key);
      left--;
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
    const sneaking = keys.has("ShiftLeft") || keys.has("ShiftRight");
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

  function raycast(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxD: number) {
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
      if (id !== ID.Air && dist > 0.02) return { x, y, z, nx, ny, nz, dist, id };
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
    if (id === ID.Beacon) beaconBuffs.delete(x + "," + y + "," + z);
    if (isComponent(id)) {
      const k = rsKey(x, y, z);
      comps.delete(k);
      repOut.delete(k);
      repTimer.delete(k);
      power.delete(k);
      recompute(x, y, z);
    } else if (isComponent(world.get(x, y + 1, z))) recompute(x, y, z);
    if (!creative) {
      const held = def(hotbar[slot]);
      const tier = held.tool === "pick" ? held.tier : 0;
      const canDrop = !block.need || tier >= block.need;
      if (canDrop && id === ID.Leaves) {
        if (Math.random() < 0.08) addInv(ID.Apple, 1);
        if (Math.random() < 0.12) addInv(ID.Stick, 1);
      } else if (canDrop && id === ID.TallGrass) {
        if (Math.random() < 0.4) addInv(ID.Seeds, 1);
      } else if (canDrop && (id === ID.Crop || id === ID.Crop1 || id === ID.Crop2 || id === ID.CarrotCrop || id === ID.PotatoCrop || id === ID.BeetCrop)) addInv(ID.Seeds, 1);
      else if (canDrop && id === ID.CropRipe) {
        addInv(ID.Wheat, 1);
        addInv(ID.Seeds, 1);
      } else if (canDrop && id === ID.Gravel) addInv(Math.random() < 0.14 ? ID.Flint : ID.Gravel, 1);
      else if (canDrop && block.drop !== -1) addInv(enchLvl(hotbar[slot], "silk") > 0 ? id : block.drop || id, 1);
      // Fortune: extra ore drops, rolled per level (never with Silk Touch).
      if (canDrop && block.drop !== -1 && (ORE_XP[id] ?? 0) > 0 && enchLvl(hotbar[slot], "silk") === 0) {
        const fort = held.tool === "pick" ? enchLvl(hotbar[slot], "fortune") : 0;
        for (let f = 0; f < fort; f++) if (Math.random() < 0.35) addInv(block.drop || id, 1);
      }
      if (canDrop && id === ID.PrismOre && Math.random() < 0.22) addInv(ID.Core, 1);
      const right =
        (held.tool === "pick" && (block.tough || block.need > 0)) ||
        (held.tool === "axe" && AXE_OK(id)) ||
        (held.tool === "shovel" && SHOVEL_OK(id));
      if (right) wearHeld();
      if (canDrop) gainXp(ORE_XP[id] ?? 0);
      if (canDrop && skills.has("yield") && ORE_XP[id] && Math.random() < 0.3) addInv(block.drop || id, 1);
      if (id === ID.Stone || id === ID.Cobble) oreEar(x, y, z);
    }
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
    burst(x + 0.5, y + 0.5, z + 0.5, block.color, 14);
    audio.break();
    swing = 1;
    saveDirty = true;
    mineTime = 0;
    mineKey = "";
  }

  function bumpQuest(kind: "break" | "place" | "kill", tag: string) {
    for (const q of QUESTS) {
      if (q.kind !== kind || q.tag !== tag) continue;
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
      stockChest(bin, x, y, z, world.seed, lmKind === "monument" ? "deep" : lmKind === "mansion" ? "hamlet" : lmKind ? "nether" : near ? "hamlet" : "wild");
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
      id === ID.Lamp || id === ID.LampOn ||
      id === ID.Piston || id === ID.Note || id === ID.Dispenser
    );
  }

  function isDirectional(id: number) {
    return id === ID.Repeater || id === ID.RepeaterOn || id === ID.Comparator || id === ID.ComparatorOn;
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
    // Solve to a fixpoint.
    for (let pass = 0; pass < 14; pass++) {
      let changed = false;
      for (const c of cells) {
        const k = rsKey(c.x, c.y, c.z);
        let next = 0;
        if (c.id === ID.LeverOn || c.id === ID.PlateOn) next = 15;
        else if (c.id === ID.Lever || c.id === ID.Plate) next = 0;
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
            const back = emittedToward(c.x - d[0], c.y, c.z - d[1], c.x, c.y, c.z, levels);
            const sideA = emittedToward(c.x + d[1], c.y, c.z + d[0], c.x, c.y, c.z, levels);
            const sideB = emittedToward(c.x - d[1], c.y, c.z - d[0], c.x, c.y, c.z, levels);
            next = back > 0 && back >= Math.max(sideA, sideB) ? back : 0;
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
      } else if (c.id === ID.Piston) {
        const on = inputAt(c.x, c.y, c.z, levels) > 0;
        if (on && !pistonHot.has(k)) {
          pistonHot.add(k);
          // Pistons placed with a facing comp push along their facing (the
          // repeater convention); older pistons without a comp keep the
          // original upward push.
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
  // flip their latched output after their configured delay.
  function tickRedstone(dt: number) {
    rsAcc += dt;
    while (rsAcc >= 0.1) {
      rsAcc -= 0.1;
      for (const [k, comp] of [...comps.entries()]) {
        const [x, y, z] = k.split(",").map(Number);
        const id = world.get(x, y, z);
        if (id !== ID.Repeater && id !== ID.RepeaterOn) continue;
        if (Math.hypot(x - player.x, z - player.z) > 48) continue;
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
      worldTime = 0.22;
      spawnPoint = { x: player.x, y: player.y, z: player.z };
      sinceSleep = 0;
      if (hunger > 0) health = Math.min(20, health + 4);
      say("Slept until morning");
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
    const sneaking = keys.has("ShiftLeft") || keys.has("ShiftRight");
    const held = hotbar[slot];
    const heldDef = def(held);
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
    if (held === ID.Bucket && (hit.id === ID.Water || hit.id === ID.Lava)) {
      const fill = hit.id === ID.Lava ? ID.LavaBucket : ID.WaterBucket;
      if (world.set(hit.x, hit.y, hit.z, ID.Air)) {
        markDirtyAt(hit.x, hit.z);
        spend(ID.Bucket, 1);
        addInv(fill, 1);
        audio.place();
        saveDirty = true;
      }
      return;
    }
    if (held === ID.WaterBucket || held === ID.LavaBucket) {
      const px = hit.x + hit.nx;
      const py = hit.y + hit.ny;
      const pz = hit.z + hit.nz;
      const pour = held === ID.LavaBucket ? ID.Lava : ID.Water;
      if (world.get(px, py, pz) === ID.Air && spend(held, 1)) {
        world.set(px, py, pz, pour);
        markDirtyAt(px, pz);
        addInv(ID.Bucket, 1);
        audio.place();
        saveDirty = true;
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
    if (heldDef.solid && hitsPlayer(px, py, pz)) {
      say("Can't snap a brick into yourself");
      return;
    }
    const placeId = held === ID.RedTorch ? ID.RedTorchOn : heldDef.stairs ? stairsVariant(held, facingDir()) : held;
    if (!world.set(px, py, pz, placeId)) return;
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
    if (placeId === ID.Repeater || placeId === ID.Comparator || placeId === ID.Piston) comps.set(rsKey(px, py, pz), { dir: facingDir(), delay: 1 });
    if (isComponent(placeId) || isComponent(world.get(px, py + 1, pz))) recompute(px, py, pz);
    if (held === ID.Torch) bumpQuest("place", "torch");
    burst(px + 0.5, py + 0.8, pz + 0.5, heldDef.color, 6);
    audio.place();
    swing = 1;
    saveDirty = true;
  }

  function dropItem(id: number, n: number, x: number, y: number, z: number) {
    if (!id || n <= 0) return;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), skin(def(id).color));
    mesh.position.set(x, y, z);
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

  function launchFireball(x: number, y: number, z: number, dx: number, dy: number, dz: number) {
    const len = Math.hypot(dx, dy, dz) || 1;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), skin(0xff7a2a));
    scene.add(mesh);
    shots.push({ x, y, z, vx: (dx / len) * 11, vy: (dy / len) * 11, vz: (dz / len) * 11, life: 3.6, friendly: false, mesh, fire: true });
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
      for (let dz = -4; dz <= 4; dz++) {
        for (let dx = -4; dx <= 4; dx++) {
          for (let dy = 4; dy >= -2; dy--) {
            const x = gx + dx;
            const y = gy + dy;
            const z = gz + dz;
            const id = world.get(x, y, z);
            if (!def(id).fall) continue;
            if (world.get(x, y - 1, z) !== ID.Air) continue;
            world.set(x, y, z, ID.Air);
            world.set(x, y - 1, z, id);
            markDirtyAt(x, z);
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
      if (def(world.get(bx, by, bz)).solid) dead = true;
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
        bite(s.fire ? 6 : 3);
        if (s.fire) fireT = Math.max(fireT, 3);
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

  const particles: { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; color: string }[] =
    [];
  const pgeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
  const pmat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pmesh = new THREE.InstancedMesh(pgeo, pmat, 360);
  pmesh.count = 0;
  pmesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(360 * 3), 3);
  scene.add(pmesh);
  const pdummy = new THREE.Object3D();

  function burst(x: number, y: number, z: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x,
        y,
        z,
        vx: (Math.random() - 0.5) * 3.2,
        vy: Math.random() * 3.4,
        vz: (Math.random() - 0.5) * 3.2,
        life: 0.35 + Math.random() * 0.35,
        color,
      });
    }
    if (particles.length > 340) particles.splice(0, particles.length - 340);
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
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy -= 9 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      particles[w++] = p;
    }
    particles.length = w;
    const count = Math.min(w, 360);
    pmesh.count = count;
    for (let i = 0; i < count; i++) {
      const p = particles[i];
      pdummy.position.set(p.x, p.y, p.z);
      const s = Math.max(0.2, p.life * 2.2);
      pdummy.scale.setScalar(s);
      pdummy.updateMatrix();
      pmesh.setMatrixAt(i, pdummy.matrix);
      tmp.set(p.color);
      pmesh.setColorAt(i, tmp);
    }
    pmesh.instanceMatrix.needsUpdate = true;
    if (pmesh.instanceColor) pmesh.instanceColor.needsUpdate = true;
  }

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
      mob.bodyMat?.color.setHex(traderOf(spot.role).tint);
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
      mob.bodyMat?.color.setHex(traderOf(spot.role).tint);
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
      greet("Something ancient sleeps beneath these waves…");
      const guards = mobs.filter((m) => m.kind === "guardian" && !m.dead && Math.hypot(m.x - lm.x, m.z - lm.z) < 32);
      if (!guards.some((m) => (m.maxHp ?? 0) >= 30)) {
        const elder = spawnKind("guardian", lm.x + 2, lm.z, 1.7);
        elder.hp = 32;
        elder.maxHp = 32;
      }
      for (let i = guards.length; i < 3; i++) spawnKind("guardian", lm.x - 4 + i * 3, lm.z + 4);
    } else if (lm.kind === "mansion") {
      greet("A dark mansion broods between the trees.");
      if (count("vindicator", 32) === 0) {
        spawnKind("vindicator", lm.x + 12, lm.z + 10);
        spawnKind("vindicator", lm.x - 12, lm.z - 9);
      }
      if (count("evoker", 32) === 0) spawnKind("evoker", lm.x, lm.z + 11);
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
                        ? 40
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
        plate.position.set(0, 2.25, 0);
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
                  : mob.kind === "walker" || mob.kind === "husk"
                    ? [ID.RawMeat, ID.Bone]
                    : mob.kind === "creeper"
                      ? [ID.Powder]
                      : mob.kind === "enderman"
                        ? [ID.EnderPearl]
                        : mob.kind === "blaze"
                          ? [ID.Blaze]
                          : mob.kind === "witch"
                            ? [ID.PotionHeal]
                            : mob.kind === "drowned"
                              ? [ID.RawMeat, ID.Bone]
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
                          ? [ID.Scrap]
                          : mob.kind === "phantom" || mob.kind === "parrot"
                            ? [ID.Feather]
                            : mob.kind === "dragon"
                              ? [ID.Elytra, ID.Totem, ID.Scrap]
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
                                              ? [ID.Crystal]
                                              : mob.kind === "shulker"
                                                ? [ID.ShulkerShell]
                                                : mob.kind === "pillager"
                                                  ? [ID.Arrow, ID.Arrow]
                                                  : mob.kind === "vindicator"
                                                    ? [ID.Emerald]
                                                    : mob.kind === "evoker"
                                                      ? [ID.Totem, ID.Emerald]
                                                      : mob.kind === "vex"
                                                        ? []
                                                        : mob.kind === "ravager"
                                                          ? [ID.Fur, ID.RawMeat, ID.RawMeat]
                                                          : mob.kind === "villager"
                                                            ? [ID.Emerald]
                                                            : [ID.Green];
    if (!creative) {
      for (const drop of drops) dropItem(drop, 1, mob.x, mob.y + 0.4, mob.z);
      // Looting on the held blade: bonus copies of the base drops.
      const lootLvl = def(hotbar[slot]).tool === "sword" ? enchLvl(hotbar[slot], "looting") : 0;
      for (const drop of drops) for (let f = 0; f < lootLvl; f++) if (Math.random() < 0.35) dropItem(drop, 1, mob.x, mob.y + 0.4, mob.z);
      const trophy = skills.has("trophy");
      const luck = trophy || settings.mods.generous ? 0.62 : 0.28;
      const extra: number[] = [];
      if (mob.kind === "walker" && Math.random() < luck) extra.push(ID.Fang);
      if ((mob.kind === "skelly" || mob.kind === "phantom") && Math.random() < luck) extra.push(ID.Wisp);
      if (mob.kind === "creeper" && Math.random() < luck) extra.push(ID.Slime);
      if (mob.kind === "fox" && Math.random() < luck) extra.push(ID.Pelt);
      if (mob.kind === "crab" && Math.random() < luck) extra.push(ID.Shell);
      if (mob.kind === "frog" && Math.random() < luck * 0.6) extra.push(ID.Wax);
      if (mob.kind === "wisp" && Math.random() < luck) extra.push(ID.Frost);
      if (mob.kind === "enderman" && Math.random() < luck) extra.push(ID.EnderPearl);
      if (mob.kind === "drowned" && Math.random() < luck) extra.push(ID.Copper);
      if (mob.kind === "drowned" && Math.random() < 0.22) extra.push(ID.Trident);
      if (mob.kind === "guardian" && Math.random() < luck) extra.push(ID.Crystal);
      if (mob.kind === "pillager" && Math.random() < 0.14) extra.push(ID.Crossbow);
      if (mob.kind === "pillager" && Math.random() < luck) extra.push(ID.Emerald);
      if (mob.kind === "vindicator" && Math.random() < 0.12) extra.push(ID.AxeI);
      if (mob.kind === "ravager" && Math.random() < luck) extra.push(ID.Emerald);
      if (mob.kind === "squid" && Math.random() < luck) extra.push(ID.InkSac);
      if (mob.kind === "witch" && Math.random() < luck * 0.6) extra.push(ID.Bottle);
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

  function explode(x: number, y: number, z: number, rad = 3) {
    const r = rad;
    for (let dy = -r; dy <= r; dy++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy + dz * dz > r * r + 0.4) continue;
          const id = world.get(x + dx, y + dy, z + dz);
          if (id !== ID.Air && id !== ID.Bedrock) world.set(x + dx, y + dy, z + dz, ID.Air);
        }
      }
    }
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
    burst(x, y, z, "#f07820", 28);
    burst(x, y, z, "#3aaa4c", 16);
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
  function dragonTick(m: Mob, dt: number, d: number) {
    const maxHp = m.maxHp ?? m.hp;
    const enraged = m.hp < maxHp * 0.35;
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
        launchFireball(m.x, m.y - 0.4, m.z, player.x - m.x, player.y + 0.8 - m.y, player.z - m.z);
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
          m.mesh.position.set(m.x, m.y + (settings.studs ? STUD_H : 0), m.z);
          m.mesh.rotation.y = m.yaw;
          continue;
        }
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
        if (m.kind === "wither" && m.cool <= 0 && d < 18 && phase === "play") {
          launchArrow(m.x, m.y, m.z, dx, player.y + 1 - m.y, dz, false);
          bite(2);
          m.cool = 1.8;
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
    say(
      (creative
        ? "Creative. The land does not end. Same seed, same bricks."
        : "Survival. The land does not end. Skills and mods live in the bin and the pause menu. Hounds, slimes, and a hamlet golem are out there.") +
        " Seed " +
        seedText +
        "." +
        hamletLine(),
    );
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
    const pads = navigator.getGamepads?.();
    const pad = pads ? pads[0] : null;
    let jump = keys.has("Space") || touch.jump;
    let mine = mouseMine || touch.mine;
    let place = mousePlace || touch.place;
    if (pad) {
      const dz = radial(pad.axes[0] ?? 0, pad.axes[1] ?? 0, 0.18);
      str += dz.x;
      fwd += -dz.y;
      if (pad.buttons[0]?.pressed) jump = true;
      if ((pad.buttons[7]?.value ?? 0) > 0.45) mine = true;
      if ((pad.buttons[6]?.value ?? 0) > 0.45) place = true;
    }
    const mag = Math.hypot(fwd, str);
    if (mag > 1) {
      fwd /= mag;
      str /= mag;
    }
    return {
      fwd,
      str,
      sneak: keys.has("ShiftLeft") || keys.has("ShiftRight"),
      sprint: keys.has("ControlLeft") || keys.has("ControlRight"),
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
    const stepping = wasGrounded && !flying && !sample.sneak;
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
    const hit = raycast(player.x, eyeY, player.z, rdx, rdy, rdz, reach);
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
    const blockFirst = !mob || (hit !== null && hit.dist < mobT);
    hud.targetName = "";
    hud.mine = 0;
    highlight.visible = false;
    ghost.visible = false;

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
                                    : mob.kind === "boat"
                                      ? "Boat"
                                      : "Cart";
      if (sample.first && sample.place && !prevPlace) interactMob(mob);
      // Player hits are gated by the mob's own hurt cooldown (hitCd), not by its
      // attack cooldown: sharing one timer meant a mob biting you every second
      // reset it just before your swing was checked — it could never be hit back.
      if (sample.mine && (mob.hitCd ?? 0) <= 0 && mob.kind !== "boat" && mob.kind !== "cart") {
        const blade = def(hotbar[slot]);
        let dmg = blade.tool === "sword" ? 1 + blade.tier * 2 : 1;
        if (strengthT > 0) dmg += 2;
        if (blade.tool === "sword" || blade.tool === "axe") dmg += enchLvl(hotbar[slot], "sharpness");
        if ((blade.tool === "sword" || blade.tool === "axe") && (mob.kind === "walker" || mob.kind === "skelly" || mob.kind === "drowned" || mob.kind === "wither" || mob.kind === "phantom")) dmg += enchLvl(hotbar[slot], "smite") * 2;
        if ((blade.tool === "sword" || blade.tool === "axe") && mob.kind === "spider") dmg += enchLvl(hotbar[slot], "bane") * 2;
        if (rankLv >= 18 && blade.tool === "sword") dmg += 1;
        const hostile =
          mob.kind === "walker" ||
          mob.kind === "creeper" ||
          mob.kind === "skelly" ||
          mob.kind === "spider" ||
          mob.kind === "phantom" ||
          mob.kind === "ghast" ||
          mob.kind === "piglin" ||
          mob.kind === "wisp" ||
          mob.kind === "enderman" ||
          mob.kind === "blaze" ||
          mob.kind === "witch" ||
          mob.kind === "drowned" ||
          mob.kind === "dragon";
        if (skills.has("mark") && blade.tool === "sword" && hostile) dmg += 1;
        if (player.vy < -0.2 && !player.grounded) dmg = Math.ceil(dmg * 1.5);
        if (mob.kind === "dragon" && crystalsLeft() > 0) dmg = Math.max(1, Math.ceil(dmg * 0.5));
        mob.hp -= dmg;
        if (mob.kind === "villager" || mob.kind === "golem") {
          mob.byPlayerT = 6;
          addRep(repKeyFor(mob.homeX ?? mob.x, mob.homeZ ?? mob.z), mob.kind === "villager" ? -3 : -2);
        }
        if (mob.kind === "enderman" || mob.kind === "bee") mob.mad = true;
        if (blade.tool === "sword" && enchLvl(hotbar[slot], "fire") > 0) mob.burn = Math.max(mob.burn ?? 0, 2 + enchLvl(hotbar[slot], "fire"));
        if (blade.tool === "sword" || blade.tool === "bow") wearHeld();
        mob.hitCd = 0.42;
        mob.cool = Math.max(mob.cool, 0.42); // a hit still staggers its next bite
        mob.fuse = Math.max(0, mob.fuse - 0.25);
        const kb = 0.4 + (blade.tool === "sword" ? enchLvl(hotbar[slot], "knockback") * 0.3 : 0);
        if (mob.kind !== "shulker" && mob.kind !== "dragon") shove(mob, mob.x - player.x, mob.z - player.z, kb);
        audio.hit();
        swing = 1;
        if (mob.hp <= 0) killMob(mob);
      }
    } else if (hit) {
      const block = def(hit.id);
      if (block.sign) {
        const t = signs.get(hit.x + "," + hit.y + "," + hit.z);
        hud.targetName = t ? "Sign — " + t : "Sign";
      } else hud.targetName = block.name;
      highlight.visible = true;
      highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
      studOutline.visible = settings.studs && !def(world.get(hit.x, hit.y + 1, hit.z)).solid;
      const key = hit.x + "," + hit.y + "," + hit.z;
      if (sample.mine && block.hard !== Infinity) {
        if (mineKey !== key) {
          mineKey = key;
          mineTime = 0;
        }
        mineTime += dt;
        const held = def(hotbar[slot]);
        let mult = 1;
        if (held.tool === "pick" && (block.tough || block.need > 0 || block.hard >= 1)) mult = 1 + held.tier * 1.7;
        if (held.tool === "axe" && AXE_OK(hit.id)) mult = 1 + held.tier * 1.7;
        if (held.tool === "shovel" && SHOVEL_OK(hit.id)) mult = 1 + held.tier * 1.7;
        if (hotbar[slot] === ID.Shears && (hit.id === ID.Leaves || hit.id === ID.TallGrass)) mult = 6;
        if (rankLv >= 2) mult *= 1.15;
        let need = (creative ? 0.08 : block.hard) / mult;
        const eff = enchLvl(hotbar[slot], "efficiency");
        if (eff > 0 && mult > 1) need /= 1 + 0.3 * eff;
        if (hammer && block.tough) need *= 0.38;
        hud.mine = Math.min(1, mineTime / need);
        if (mineTime >= need) breakBlock(hit.x, hit.y, hit.z);
      } else if (!sample.mine) {
        mineTime = 0;
        mineKey = "";
      }
      const held = hotbar[slot];
      if (held && def(held).placeable) {
        const px = hit.x + hit.nx;
        const py = hit.y + hit.ny;
        const pz = hit.z + hit.nz;
        const dest = world.get(px, py, pz);
        const ok =
          py > 0 &&
          py < HEIGHT - 1 &&
          (dest === ID.Air || def(dest).plant || def(dest).fluid) &&
          (!def(held).solid || !hitsPlayer(px, py, pz)) &&
          (creative || (inv[held] ?? 0) > 0);
        ghost.visible = true;
        ghost.position.set(px + 0.5, py + 0.5, pz + 0.5);
        tmp.set(ok ? def(held).color : "#e23b2f");
        ghostMat.color.copy(tmp);
        ghostMat.opacity = ok ? 0.42 : 0.28;
      }
      const placeDown = sample.place;
      if ((sample.first && placeDown && !prevPlace) || (placeDown && placeCool <= 0 && prevPlace)) {
        placeCool = 0.18;
        tryPlace(hit);
      }
    } else {
      mineTime = 0;
      mineKey = "";
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
    worldTime = (worldTime + dt / 200) % 1;
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
    deckU.uDrift.value.x += dt * 0.011 * wxCur.wind;
    deckU.uDrift.value.y += dt * 0.003 * wxCur.wind;
    const ang = worldTime * Math.PI * 2;
    const sunH = Math.sin(ang);
    const sunX = Math.cos(ang);
    const day = 0x8ec8f5;
    const hor = 0xf0a06a;
    const night = 0x10182e;
    // Atmosphere pass 2: continuous blend factors replace the binary
    // sunH > 0 switches that popped at the horizon. dayF eases day<->night,
    // duskF peaks while the sun skims the horizon (golden hour).
    const dayF = THREE.MathUtils.smoothstep(sunH, -0.08, 0.25);
    const duskF = Math.max(0, 1 - Math.abs(sunH) / 0.3);
    let fogHex = sunH > 0 ? lerpHex(hor, day, Math.min(1, sunH * 1.5)) : lerpHex(hor, night, Math.min(1, -sunH * 1.15));
    if (duskF > 0) fogHex = lerpHex(fogHex, 0xf07840, duskF * 0.22);
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
    // Continuous light grading: hemisphere eases into night blue, the sun
    // warms to deep amber at the horizon and becomes steel-blue moonlight
    // after dark (its position already parks it above the scene at night).
    hemi.color.setHex(lerpHex(0x22304e, 0xcfe6ff, dayF));
    const sunDay = lerpHex(0xffb35c, 0xfff2d2, Math.min(1, Math.max(0, sunH * 2.4)));
    sun.color.setHex(lerpHex(0x7d90bd, sunDay, dayF));
    if (settings.realistic) {
      hemi.intensity = 0.34 + dayF * 0.26;
      ambient.intensity = 0.3 + dayF * 0.05;
      sun.intensity = 0.22 + dayF * (0.35 + 0.65 * Math.min(1, Math.max(0, sunH * 1.6))) * 1.65;
      scene.environmentIntensity = 0.36 + dayF * 0.19;
      const texel = 60 / (narrow ? 1024 : 2048);
      const px = Math.round(player.x / texel) * texel;
      const py = Math.round((player.y + 1) / texel) * texel;
      const pz = Math.round(player.z / texel) * texel;
      const lift = 48;
      sun.target.position.set(px, py, pz);
      sun.position.set(px + sunX * lift, py + Math.max(12, sunH * lift + 18), pz + 14);
      sun.castShadow = sunH > -0.02;
      sun.shadow.intensity = THREE.MathUtils.clamp((sunH + 0.02) / 0.12, 0.15, 1);
      sun.shadow.camera.updateProjectionMatrix();
    } else {
      hemi.intensity = 0.3 + dayF * 0.35;
      ambient.intensity = 0.24 + dayF * 0.1;
      sun.intensity = 0.22 + dayF * 0.78;
      sun.position.set(sunX * 60, sunH * 50 + 8, 24);
      sun.castShadow = false;
    }
    if (realm === 0) sun.intensity *= 1 - wxCur.cover * 0.45;
    sunMesh.position.set(player.x + sunX * 150, player.y + sunH * 90 + 10, player.z + 30);
    moonMesh.position.set(player.x - sunX * 150, player.y - sunH * 90 + 16, player.z - 20);
    sunMesh.visible = sunH > -0.1;
    moonMesh.visible = sunH < 0.25;
    (stars.material as THREE.PointsMaterial).opacity = Math.max(0, Math.min(1, -sunH * 1.4));
    stars.position.set(player.x, 0, player.z);
    let zenHex = sunH > 0 ? lerpHex(0x2c4a73, 0x2a6ad4, Math.min(1, sunH * 1.6)) : lerpHex(0x2c4a73, 0x030612, Math.min(1, -sunH * 1.2));
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
    if (rainOn) {
      (rainLines.material as THREE.LineBasicMaterial).opacity = 0.34 * wxCur.precip * (0.35 + 0.65 * dayF);
      const fall = (21 + wxCur.wind * 5) * dt;
      const slantX = wxCur.wind * 0.55;
      const cx = camera.position.x;
      const cy = camera.position.y;
      const cz = camera.position.z;
      for (let i = 0; i < RAIN_N; i++) {
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
    }
  }

  function renderCamera(dt: number) {
    const sneak = keys.has("ShiftLeft") || keys.has("ShiftRight");
    const eye = player.y + (sneak && !flying ? EYE_SNEAK : EYE);
    const bobY = phase === "play" && player.grounded && !reduceMotion ? Math.sin(bob) * 0.045 : 0;
    camera.rotation.order = "YXZ";
    if (!settings.third || phase === "title") {
      camera.rotation.y = player.yaw;
      camera.rotation.x = player.pitch;
    }
    const baseFov = settings.fov;
    camera.fov = THREE.MathUtils.lerp(camera.fov, keys.has("ControlLeft") && phase === "play" && !flying ? baseFov + 8 : baseFov, 0.1);
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
      const backX = Math.sin(player.yaw);
      const backZ = Math.cos(player.yaw);
      let dist = 4.6;
      const aimY = player.y + 1.05;
      const camY = player.y + 2.35;
      for (let i = 1; i <= 10; i++) {
        const t = i / 10;
        const sx = player.x + backX * dist * t;
        const sy = aimY + (camY - aimY) * t;
        const sz = player.z + backZ * dist * t;
        if (solidAt(Math.floor(sx), Math.floor(sy), Math.floor(sz))) {
          dist = Math.max(1.35, dist * ((i - 1) / 10));
          break;
        }
      }
      camera.position.set(player.x + backX * dist, player.y + 1.15 + dist * 0.22, player.z + backZ * dist);
      camera.lookAt(player.x, aimY, player.z);
      fig.group.visible = true;
      fig.group.position.set(player.x, player.y + (settings.studs ? STUD_H : 0), player.z);
      const moving = Math.hypot(player.vx, player.vz) > 0.4;
      const face = moving ? Math.atan2(-player.vx, -player.vz) : player.yaw;
      fig.group.rotation.y = face;
      const swingLeg = moving ? Math.sin(bob) * 0.7 : 0;
      fig.legL.rotation.x = swingLeg;
      fig.legR.rotation.x = -swingLeg;
      fig.armL.rotation.x = -swingLeg;
      fig.armR.rotation.x = swingLeg;
      viewBrick.visible = false;
    } else {
      camera.position.set(player.x, eye + bobY, player.z);
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
    const held = hotbar[slot];
    viewBrick.visible = viewBrick.visible && !!held;
    if (held) {
      brickMat.color.set(def(held).color);
      swing = Math.max(0, swing - dt * 4);
      viewBrick.rotation.x = -0.5 * swing;
      viewBrick.position.y = -0.3 - swing * 0.08 + bobY * 0.4;
    }
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
    upscaler.path = touchMode && settings.quality === "performance" ? "fast" : "easu";
    upscaler.render(scene, camera);
  }
  // Quality ladder (Philippe's law: no lag on the A54). Manual modes
  // fix the caps; "auto" starts at the balanced profile on touch and
  // steps down under sustained load - pixel ratio, then the shadow
  // pass, then draw distance - and climbs back when frames are cheap.
  let qLevel = 0;
  let qBad = 0;
  let qGood = 0;
  let fpsShown = 0;
  function qualityCaps(): { pr: number; shadows: boolean; radius: number } {
    const q = settings.quality;
    // pr is the OUTPUT (display) density. The 3D scene itself renders at
    // pr × renderScale() and the upscaler reconstructs it to this density.
    if (q === "performance") return { pr: touchMode ? 1.25 : 1.5, shadows: false, radius: 5 };
    if (q === "balanced") return { pr: touchMode ? 1.75 : 1.75, shadows: qLevel < 2, radius: 6 };
    if (q === "high") return { pr: touchMode ? 2 : 2, shadows: true, radius: 99 };
    if (touchMode) return { pr: 1.75, shadows: qLevel < 2, radius: qLevel >= 3 ? 5 : 6 };
    return { pr: 2, shadows: qLevel < 2, radius: 99 };
  }
  function applyQuality() {
    sun.castShadow = qualityCaps().shadows && settings.realistic;
  }
  function effRadius() {
    return Math.max(3, Math.min(settings.radius, qualityCaps().radius));
  }
  let fpsAcc = 0;
  let fpsFrames = 0;
  let fpsWindow = 0;

  function frame() {
    if (!running) return;
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
        if (qBad >= 2 && qLevel < 3) { qLevel++; qBad = 0; applyQuality(); }
        else if (qGood >= 4 && qLevel > 0) { qLevel--; qGood = 0; applyQuality(); }
      }
      if (avg > 0.024 && prScale > 0.7) prScale = Math.max(0.7, prScale - 0.1);
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
    const pad = navigator.getGamepads?.()?.[0];
    if (pad && phase === "play") {
      const look = radial(pad.axes[2] ?? 0, pad.axes[3] ?? 0, 0.18);
      player.yaw -= look.x * 2.4 * dt * settings.sens;
      player.pitch -= look.y * 1.8 * dt * settings.sens;
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
      lightAcc += dt;
      if (lightAcc > 0.25) {
        lightAcc = 0;
        const found: { x: number; y: number; z: number }[] = [];
        const ox = Math.floor(player.x);
        const oy = Math.floor(player.y);
        const oz = Math.floor(player.z);
        for (let dy = -3; dy <= 3 && found.length < 4; dy++) {
          for (let dz = -6; dz <= 6 && found.length < 4; dz++) {
            for (let dx = -6; dx <= 6 && found.length < 4; dx++) {
              const id = world.get(ox + dx, oy + dy, oz + dz);
              if (def(id).light) found.push({ x: ox + dx + 0.5, y: oy + dy + 0.6, z: oz + dz + 0.5 });
            }
          }
        }
        for (let i = 0; i < lamps.length; i++) {
          const spot = found[i];
          lamps[i].intensity = spot ? 1.35 : 0;
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
  renderer.setAnimationLoop(frame);
  stream(2);
  spawnSheep();
  renderer.render(scene, camera);

  const ac = new AbortController();
  const opt = { signal: ac.signal };

  window.addEventListener(
    "keydown",
    (e) => {
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
    spawnMob: (kind: string, dx = 6, dz = 0) => {
      const kinds = ["sheep", "creeper", "cow", "walker", "pig", "chicken", "spider", "skelly", "villager", "ghast", "dragon", "horse", "phantom", "piglin", "frog", "fox", "crab", "wisp", "slime", "wolf", "golem", "wither", "enderman", "blaze", "witch", "bee", "cat", "squid", "bat", "drowned", "husk", "stray", "goat", "axolotl", "parrot", "guardian", "shulker", "pillager", "vindicator", "evoker", "vex", "ravager"];
      if (!kinds.includes(kind)) return false;
      spawnKind(kind as Mob["kind"], player.x + dx, player.z + dz);
      return true;
    },
    getMobs: () => mobs.filter((m) => !m.dead).map((m) => m.kind),
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
      " rain=" + (rainLines.visible ? "on" : "off"),
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
        phase = "play";
        audio.uiClose();
        if (!touchMode) lockPointer();
        emit();
        return;
      }
      if (phase !== "play") return;
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
      hotbar[slot] = id;
      cursor = id;
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
    craft(id) {
      const recipe = RECIPES.find((entry) => entry.id === id);
      if (!recipe) return;
      if (!gate(recipe.lvl)) return;
      if (recipe.skill && !creative && !skills.has(recipe.skill)) {
        return say("Need the " + (skillById(recipe.skill)?.name ?? "skill") + " skill");
      }
      if (recipe.skill && !creative && !skills.has(recipe.skill)) {
        return say("Need the " + (skillById(recipe.skill)?.name ?? "skill") + " skill");
      }
      if (recipe.special === "hammer" && hammer) return say("Hammer's already on your belt");
      if (!creative) {
        for (const [needId, n] of recipe.need) {
          if ((inv[needId] ?? 0) < n) return say("Need " + n + " " + def(needId).name.toLowerCase());
        }
        for (const [needId, n] of recipe.need) spend(needId, n);
      }
      give(recipe.out, recipe.n, recipe.special);
      if (!recipe.special) say(recipe.name);
      if (recipe.lvl) gainXp(2);
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
        addInv(slotId, 1);
        if (part === 0) {
          f.inN -= 1;
          if (f.inN <= 0) f.in = 0;
        } else {
          f.fuelN -= 1;
          if (f.fuelN <= 0) f.fuel = 0;
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
        addInv(id, 1);
        bin.ns[i] = n - 1;
        if (bin.ns[i] <= 0) bin.ids[i] = 0;
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
    enchant() {
      const id = hotbar[slot];
      // A held book takes any rune and becomes an enchanted book.
      if (id === ID.Book) {
        const cur = { ...(ench.get(ID.EnchBook) ?? {}) };
        if (ENCHANTS.every((e) => (cur[e.key] ?? 0) >= e.max)) return say("That book knows every rune");
        if (!spendLevels(3)) return say("Need builder level 3");
        const rolls = 1 + (Math.random() < 0.6 ? 1 : 0) + (Math.random() < 0.3 ? 1 : 0);
        const got: string[] = [];
        for (let i = 0; i < rolls; i++) {
          const e = ENCHANTS[Math.floor(Math.random() * ENCHANTS.length)];
          if ((cur[e.key] ?? 0) >= e.max) continue;
          const conf = ENCH_CONFLICTS[e.key];
          if (conf && (cur[conf] ?? 0) > 0) continue;
          cur[e.key] = (cur[e.key] ?? 0) + 1;
          got.push(e.name + (cur[e.key] > 1 ? " " + ROMAN[cur[e.key]] : ""));
        }
        if (!got.length) return say("The runes fizzle — try again");
        ench.set(ID.EnchBook, cur);
        if (!creative) spend(ID.Book, 1);
        addInv(ID.EnchBook, 1);
        hotbar[slot] = ID.EnchBook;
        say("The book glows: " + got.join(", "));
        saveDirty = true;
        emit();
        return;
      }
      const d = def(id);
      if (!id || !d.maxUse) return say("Hold a tool, weapon or armor piece");
      const pool = ENCHANTS.filter((e) => e.for(d));
      if (!pool.length) return say("Nothing can enchant that");
      const cur = { ...(ench.get(id) ?? {}) };
      if (pool.every((e) => (cur[e.key] ?? 0) >= e.max)) return say("That piece is fully enchanted");
      if (!spendLevels(3)) return say("Need builder level 3");
      const rolls = 1 + (Math.random() < 0.6 ? 1 : 0) + (Math.random() < 0.3 ? 1 : 0);
      const got: string[] = [];
      for (let i = 0; i < rolls; i++) {
        const e = pool[Math.floor(Math.random() * pool.length)];
        if ((cur[e.key] ?? 0) >= e.max) continue;
        const conf = ENCH_CONFLICTS[e.key];
        if (conf && (cur[conf] ?? 0) > 0) continue;
        cur[e.key] = (cur[e.key] ?? 0) + 1;
        got.push(e.name + (cur[e.key] > 1 ? " " + ROMAN[cur[e.key]] : ""));
      }
      if (!got.length) return say("The runes fizzle — try again");
      ench.set(id, cur);
      say("Enchanted: " + got.join(", "));
      saveDirty = true;
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
    id === ID.Bench ||
    id === ID.Chest ||
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
  return id === ID.Dirt || id === ID.Sand || id === ID.Grass || id === ID.Farmland || id === ID.Gravel || id === ID.Soul;
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

function radial(x: number, y: number, dz: number) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = (m - dz) / (1 - dz) / m;
  return { x: x * scale, y: y * scale };
}

let plasticOn = true;

// SIREN creature shading (Philippe, 2026-10-25): mob and folk surfaces
// carry NO detail textures. Their micro-surface is a small sinusoidal
// representation field evaluated per fragment in the shared creature
// program — two layers of sine waves (the SIREN trick: sin activations
// all the way down) produce per-brick tint variation, darkened stud
// seams, a satin micro-bump and a fresnel sheen. The detail costs a
// handful of sin() calls and zero bytes of storage, and every creature
// material shares ONE compiled program through skin(). Realistic mode
// only; the performance profile keeps its plain Lambert untouched.
const sirenAmt = { value: 1 };

function sirenize(mat: THREE.MeshStandardMaterial) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSirenAmt = sirenAmt;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vSirenPos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvSirenPos = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vSirenPos;
uniform float uSirenAmt;
float sirenHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.45, 37.719))) * 43758.5453); }
vec3 sirenField(vec3 p) {
  vec3 a = sin(p * 1.7 + sin(p.zxy * 2.3));
  vec3 b = sin(p * 3.1 + a * 1.4);
  return a * 0.65 + b * 0.35;
}`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
{
  vec3 scell = vSirenPos * 7.0;
  diffuseColor.rgb *= 0.93 + 0.14 * sirenHash(floor(scell));
  vec3 sf = abs(fract(scell) - 0.5);
  float seam = smoothstep(0.36, 0.5, max(sf.x, max(sf.y, sf.z)));
  diffuseColor.rgb *= 1.0 - seam * 0.16 * uSirenAmt;
  float micro = sin(vSirenPos.x * 130.0) * sin(vSirenPos.y * 130.0) * sin(vSirenPos.z * 130.0);
  diffuseColor.rgb *= 1.0 + micro * 0.03 * uSirenAmt;
}`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + (sirenHash(floor(vSirenPos * 23.0)) - 0.5) * 0.22 * uSirenAmt, 0.05, 1.0);`,
      )
      .replace(
        "#include <normal_fragment_begin>",
        `#include <normal_fragment_begin>
normal = normalize(normal + sirenField(vSirenPos * 48.0) * 0.05 * uSirenAmt);`,
      )
      .replace(
        "#include <opaque_fragment>",
        `{
  float fres = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
  outgoingLight += diffuseColor.rgb * fres * 0.16 * uSirenAmt;
}
#include <opaque_fragment>`,
      );
  };
  mat.customProgramCacheKey = () => "siren-creature-1";
  return mat;
}

function skin(
  color: number | string,
  extra: { transparent?: boolean; opacity?: number; depthWrite?: boolean; depthTest?: boolean; side?: THREE.Side } = {},
) {
  if (plasticOn) return sirenize(new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0, ...extra }));
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

function put(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.x = rx;
  mesh.castShadow = plasticOn;
  mesh.receiveShadow = plasticOn;
  parent.add(mesh);
  return mesh;
}

function studs(parent: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number, w: number, d: number, nx: number, nz: number) {
  if (nx < 1 || nz < 1) return;
  const r = Math.min(w / nx, d / nz) * 0.32;
  const h = r * (4 / 6);
  const geo = geoCyl(r, h, 10, r * 0.9);
  for (let ix = 0; ix < nx; ix++) {
    for (let iz = 0; iz < nz; iz++) {
      put(parent, geo, mat, x - w / 2 + (w / nx) * (ix + 0.5), y + h / 2, z - d / 2 + (d / nz) * (iz + 0.5));
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
  const mesh = new THREE.Mesh(geoBox(w, h, d), mat);
  mesh.position.y = -h / 2;
  mesh.castShadow = plasticOn;
  mesh.receiveShadow = plasticOn;
  pivot.add(mesh);
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
  const legL = hinge(g, pantsM, 0.075, 0.42, -0.09, 0.44, 0);
  const legR = hinge(g, pantsM, 0.075, 0.42, 0.09, 0.44, 0);
  block(g, pantsM, 0.36, 0.08, 0.22, 0, 0.48, 0);
  const torso = block(g, shirtM, 0.44, 0.4, 0.24, 0, 0.74, 0);
  torso.userData.skin = "body";
  put(g, geoBox(0.16, 0.05, 0.02), white, 0, 0.78, -0.13);
  const armR = hinge(g, shirtM, 0.05, 0.34, 0.3, 0.88, 0);
  const armL = hinge(g, shirtM, 0.05, 0.34, -0.3, 0.88, 0);
  put(armL, geoCyl(0.045, 0.07, 8), headM, 0, -0.38, 0);
  put(armR, geoCyl(0.045, 0.07, 8), headM, 0, -0.38, 0);
  put(g, geoCyl(0.15, 0.3, 16), headM, 0, 1.12, 0);
  studs(g, headM, 0, 1.27, 0, 0.18, 0.18, 1, 1);
  put(g, geoBox(0.32, 0.1, 0.18), hairM, 0, 1.22, 0.05);
  if (face === "skull") {
    put(g, geoBox(0.07, 0.07, 0.02), black, -0.06, 1.16, -0.16);
    put(g, geoBox(0.07, 0.07, 0.02), black, 0.06, 1.16, -0.16);
    put(g, geoBox(0.1, 0.03, 0.02), black, 0, 1.04, -0.16);
    put(g, geoBox(0.28, 0.025, 0.02), black, 0, 0.7, -0.13);
    put(g, geoBox(0.28, 0.025, 0.02), black, 0, 0.8, -0.13);
  } else if (face === "snout") {
    put(g, geoCyl(0.07, 0.1, 10), skin(0xf2a2c0), 0, 1.08, -0.18, Math.PI / 2);
    put(g, geoBox(0.05, 0.05, 0.02), black, -0.06, 1.18, -0.16);
    put(g, geoBox(0.05, 0.05, 0.02), black, 0.06, 1.18, -0.16);
  } else if (face === "nose") {
    put(g, geoBox(0.05, 0.05, 0.02), black, -0.06, 1.16, -0.16);
    put(g, geoBox(0.05, 0.05, 0.02), black, 0.06, 1.16, -0.16);
    put(g, geoBox(0.08, 0.03, 0.02), black, 0, 1.05, -0.16);
    put(g, geoCyl(0.055, 0.16, 10), skin(0xc47a2a), 0, 1.08, -0.2, Math.PI / 2);
  } else {
    put(g, geoBox(0.05, 0.05, 0.02), black, -0.06, 1.16, -0.16);
    put(g, geoBox(0.05, 0.05, 0.02), black, 0.06, 1.16, -0.16);
    put(g, geoBox(0.1, 0.025, 0.02), black, 0, 1.06, -0.16);
    if (face === "mad") {
      put(g, geoBox(0.07, 0.02, 0.02), black, -0.06, 1.22, -0.17);
      put(g, geoBox(0.07, 0.02, 0.02), black, 0.06, 1.22, -0.17);
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
  if (kind === "sheep") {
    const wool = skin(0xf4f1ea);
    const body = block(g, wool, 0.78, 0.4, 0.5, 0, 0.56, 0, 3, 2);
    body.userData.skin = "body";
    block(g, dark, 0.28, 0.26, 0.26, 0, 0.64, -0.4, 1, 1);
    block(g, dark, 0.12, 0.08, 0.08, 0, 0.56, -0.56);
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, dark, 0.12, 0.28, 0.12, sx * 0.22, 0.28, sz * 0.14)));
    tagWool(g, wool);
    return { group: g, legs, bodyMat: wool };
  }
  if (kind === "cow") {
    const hide = skin(0x8d5a34);
    const spot = skin(0xf4f1ea);
    const body = block(g, hide, 0.9, 0.42, 0.46, 0, 0.62, 0, 4, 2);
    body.userData.skin = "body";
    put(g, geoBox(0.16, 0.1, 0.04), spot, -0.18, 0.7, -0.22);
    put(g, geoBox(0.14, 0.12, 0.04), spot, 0.2, 0.66, 0.22);
    block(g, hide, 0.28, 0.28, 0.28, 0, 0.78, -0.46, 1, 1);
    block(g, spot, 0.16, 0.12, 0.1, 0, 0.68, -0.62);
    put(g, geoCyl(0.04, 0.16, 8), dark, -0.08, 0.96, -0.46);
    put(g, geoCyl(0.04, 0.16, 8), dark, 0.08, 0.96, -0.46);
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, dark, 0.12, 0.36, 0.12, sx * 0.28, 0.36, sz * 0.12)));
    return { group: g, legs, bodyMat: hide };
  }
  if (kind === "pig") {
    const pink = skin(0xf2a2c0);
    const body = block(g, pink, 0.7, 0.36, 0.42, 0, 0.48, 0, 3, 2);
    body.userData.skin = "body";
    block(g, pink, 0.3, 0.26, 0.26, 0, 0.56, -0.36, 1, 1);
    put(g, geoCyl(0.08, 0.08, 10), skin(0xd96a8a), 0, 0.52, -0.52, Math.PI / 2);
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, pink, 0.1, 0.22, 0.1, sx * 0.2, 0.22, sz * 0.12)));
    return { group: g, legs, bodyMat: pink };
  }
  if (kind === "chicken") {
    const white = skin(0xf7f4ee);
    const body = block(g, white, 0.32, 0.28, 0.36, 0, 0.36, 0, 2, 2);
    body.userData.skin = "body";
    put(g, geoBox(0.1, 0.08, 0.1), skin(0xe23b2f), 0, 0.54, -0.02);
    put(g, geoBox(0.08, 0.06, 0.1), skin(0xf07820), 0, 0.36, -0.24);
    put(g, geoBox(0.05, 0.16, 0.24), white, -0.19, 0.38, 0.02);
    put(g, geoBox(0.05, 0.16, 0.24), white, 0.19, 0.38, 0.02);
    put(g, geoBox(0.16, 0.12, 0.06), white, 0, 0.52, 0.2, -0.4);
    const legs = [legBox(g, skin(0xf07820), 0.06, 0.2, 0.06, -0.06, 0.2, 0), legBox(g, skin(0xf07820), 0.06, 0.2, 0.06, 0.06, 0.2, 0)];
    return { group: g, legs, bodyMat: white };
  }
  if (kind === "horse") {
    const hide = skin(0x6b3e22);
    const body = block(g, hide, 1.05, 0.38, 0.36, 0, 0.78, 0, 4, 1);
    body.userData.skin = "body";
    block(g, hide, 0.22, 0.42, 0.22, 0, 1.05, -0.48);
    block(g, hide, 0.26, 0.24, 0.36, 0, 1.28, -0.62, 1, 1);
    put(g, geoBox(0.08, 0.16, 0.2), black, 0, 1.22, -0.28);
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, hide, 0.1, 0.5, 0.1, sx * 0.28, 0.5, sz * 0.28)));
    return { group: g, legs, bodyMat: hide };
  }
  if (kind === "fox") {
    const coat = skin(0xf07820);
    const white = skin(0xf4f1ea);
    const body = block(g, coat, 0.7, 0.28, 0.32, 0, 0.42, 0, 3, 1);
    body.userData.skin = "body";
    put(g, geoBox(0.28, 0.12, 0.04), white, 0, 0.4, -0.15);
    block(g, coat, 0.22, 0.2, 0.24, 0, 0.5, -0.4, 1, 1);
    put(g, geoBox(0.06, 0.1, 0.04), white, -0.06, 0.64, -0.4);
    put(g, geoBox(0.06, 0.1, 0.04), white, 0.06, 0.64, -0.4);
    block(g, coat, 0.16, 0.16, 0.28, 0, 0.48, 0.42, 1, 1);
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, coat, 0.08, 0.22, 0.08, sx * 0.18, 0.22, sz * 0.1)));
    return { group: g, legs, bodyMat: coat };
  }
  if (kind === "frog") {
    const green = skin(0x3aaa4c);
    const body = block(g, green, 0.46, 0.2, 0.36, 0, 0.24, 0, 2, 2);
    body.userData.skin = "body";
    studs(g, skin(0xf0c43a), -0.1, 0.36, -0.08, 0.12, 0.12, 1, 1);
    studs(g, skin(0xf0c43a), 0.1, 0.36, -0.08, 0.12, 0.12, 1, 1);
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, green, 0.08, 0.12, 0.1, sx * 0.16, 0.12, sz * 0.12)));
    return { group: g, legs, bodyMat: green };
  }
  if (kind === "crab") {
    const red = skin(0xe23b2f);
    const body = block(g, red, 0.5, 0.16, 0.36, 0, 0.22, 0, 2, 2);
    body.userData.skin = "body";
    put(g, geoBox(0.14, 0.1, 0.14), red, -0.32, 0.24, -0.12);
    put(g, geoBox(0.14, 0.1, 0.14), red, 0.32, 0.24, -0.12);
    studs(g, skin(0xf4f1ea), -0.08, 0.3, -0.08, 0.08, 0.08, 1, 1);
    studs(g, skin(0xf4f1ea), 0.08, 0.3, -0.08, 0.08, 0.08, 1, 1);
    const legs = [-1, 1].flatMap((sx) => [0, 1].map((i) => legBox(g, red, 0.06, 0.1, 0.08, sx * 0.18, 0.1, -0.02 + i * 0.1)));
    return { group: g, legs, bodyMat: red };
  }
  if (kind === "wolf") {
    const coat = skin(0x8a8f98);
    const body = block(g, coat, 0.72, 0.3, 0.32, 0, 0.48, 0, 3, 1);
    body.userData.skin = "body";
    block(g, coat, 0.24, 0.22, 0.28, 0, 0.58, -0.4, 1, 1);
    put(g, geoBox(0.06, 0.12, 0.04), coat, -0.07, 0.74, -0.4);
    put(g, geoBox(0.06, 0.12, 0.04), coat, 0.07, 0.74, -0.4);
    put(g, geoBox(0.08, 0.08, 0.02), black, -0.05, 0.6, -0.55);
    put(g, geoBox(0.08, 0.08, 0.02), black, 0.05, 0.6, -0.55);
    block(g, coat, 0.1, 0.1, 0.22, 0, 0.55, 0.38);
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, coat, 0.08, 0.28, 0.08, sx * 0.18, 0.28, sz * 0.1)));
    return { group: g, legs, bodyMat: coat };
  }
  if (kind === "spider") {
    const body = block(g, dark, 0.46, 0.22, 0.36, 0, 0.32, 0.08, 2, 2);
    body.userData.skin = "body";
    block(g, dark, 0.28, 0.18, 0.24, 0, 0.28, -0.28, 1, 1);
    put(g, geoBox(0.06, 0.06, 0.02), skin(0xe23b2f), -0.06, 0.3, -0.4);
    put(g, geoBox(0.06, 0.06, 0.02), skin(0xe23b2f), 0.06, 0.3, -0.4);
    const legs: THREE.Object3D[] = [];
    for (let i = 0; i < 4; i++) {
      const z = -0.12 + i * 0.1;
      legs.push(hinge(g, dark, 0.03, 0.34, -0.24, 0.3, z));
      legs.push(hinge(g, dark, 0.03, 0.34, 0.24, 0.3, z));
    }
    return { group: g, legs, bodyMat: dark };
  }
  if (kind === "creeper") {
    const green = skin(0x3aaa4c);
    green.emissive = new THREE.Color(0x000000);
    const body = block(g, green, 0.62, 0.7, 0.4, 0, 0.58, 0, 2, 2);
    body.userData.skin = "body";
    block(g, green, 0.48, 0.36, 0.36, 0, 1.12, 0, 2, 2);
    const face = skin(0x142018);
    put(g, geoBox(0.1, 0.1, 0.03), face, -0.1, 1.2, -0.19);
    put(g, geoBox(0.1, 0.1, 0.03), face, 0.1, 1.2, -0.19);
    put(g, geoBox(0.1, 0.16, 0.03), face, 0, 1.02, -0.19);
    put(g, geoBox(0.1, 0.1, 0.03), face, -0.1, 0.9, -0.19);
    put(g, geoBox(0.1, 0.1, 0.03), face, 0.1, 0.9, -0.19);
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, green, 0.16, 0.22, 0.16, sx * 0.16, 0.22, sz * 0.08)));
    return { group: g, legs, bodyMat: green };
  }
  if (kind === "ghast") {
    const white = skin(0xf7f4ee);
    const body = block(g, white, 1.15, 1.15, 1.15, 0, 0.7, 0, 3, 3);
    body.userData.skin = "body";
    put(g, geoBox(0.16, 0.16, 0.04), black, -0.22, 0.85, -0.58);
    put(g, geoBox(0.16, 0.16, 0.04), black, 0.22, 0.85, -0.58);
    put(g, geoBox(0.28, 0.1, 0.04), black, 0, 0.5, -0.58);
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => hinge(g, white, 0.06, 0.55, sx * 0.32, 0.15, sz * 0.28)));
    return { group: g, legs, bodyMat: white };
  }
  if (kind === "phantom") {
    const wing = skin(0x3d7ad4);
    const body = block(g, wing, 0.7, 0.12, 0.28, 0, 0.3, 0, 3, 1);
    body.userData.skin = "body";
    const left = new THREE.Group();
    left.position.set(-0.36, 0.3, 0);
    put(left, geoBox(0.7, 0.05, 0.32), wing, -0.35, 0, 0);
    g.add(left);
    const right = new THREE.Group();
    right.position.set(0.36, 0.3, 0);
    put(right, geoBox(0.7, 0.05, 0.32), wing, 0.35, 0, 0);
    g.add(right);
    put(g, geoBox(0.08, 0.06, 0.02), skin(0x8ec8f5), -0.08, 0.32, -0.15);
    put(g, geoBox(0.08, 0.06, 0.02), skin(0x8ec8f5), 0.08, 0.32, -0.15);
    return { group: g, legs: [left, right], bodyMat: wing };
  }
  if (kind === "dragon") {
    const hide = skin(0x2a1848);
    const body = block(g, hide, 1.5, 0.42, 0.42, 0, 0.7, 0, 5, 2);
    body.userData.skin = "body";
    block(g, hide, 0.4, 0.36, 0.5, 0, 0.95, -0.85, 1, 1);
    put(g, geoCyl(0.05, 0.28, 8), skin(0x7a4ad4), -0.1, 1.25, -0.9);
    put(g, geoCyl(0.05, 0.28, 8), skin(0x7a4ad4), 0.1, 1.25, -0.9);
    put(g, geoBox(0.08, 0.08, 0.03), skin(0xf5c518), -0.08, 1.0, -1.1);
    put(g, geoBox(0.08, 0.08, 0.03), skin(0xf5c518), 0.08, 1.0, -1.1);
    block(g, hide, 0.28, 0.2, 0.55, 0, 0.6, 0.95, 1, 2);
    const left = new THREE.Group();
    left.position.set(-0.3, 0.85, 0);
    put(left, geoBox(1.1, 0.06, 0.55), skin(0x7a4ad4), -0.55, 0, 0);
    g.add(left);
    const right = new THREE.Group();
    right.position.set(0.3, 0.85, 0);
    put(right, geoBox(1.1, 0.06, 0.55), skin(0x7a4ad4), 0.55, 0, 0);
    g.add(right);
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, hide, 0.12, 0.4, 0.12, sx * 0.28, 0.4, sz * 0.35)));
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
    const gel = skin(0x5dce6a, { transparent: true, opacity: 0.78 });
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
    const headC = skin(0xe07a3d);
    const body = block(g, iron, 0.72, 0.72, 0.42, 0, 1.1, 0, 3, 2);
    body.userData.skin = "body";
    block(g, darkIron, 0.5, 0.16, 0.32, 0, 0.66, 0, 2, 1);
    block(g, headC, 0.4, 0.34, 0.36, 0, 1.66, 0, 2, 2);
    put(g, geoBox(0.08, 0.08, 0.03), black, -0.09, 1.7, -0.19);
    put(g, geoBox(0.08, 0.08, 0.03), black, 0.09, 1.7, -0.19);
    put(g, geoBox(0.16, 0.04, 0.03), black, 0, 1.56, -0.19);
    const legs = [
      legBox(g, darkIron, 0.18, 0.52, 0.18, -0.16, 0.52, 0),
      legBox(g, darkIron, 0.18, 0.52, 0.18, 0.16, 0.52, 0),
      hinge(g, iron, 0.08, 0.58, -0.5, 1.3, 0),
      hinge(g, iron, 0.08, 0.58, 0.5, 1.3, 0),
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
    // Tall and thin: long hinged limbs, black brick body, violet eyes.
    const blackM = skin(0x16121c);
    const legL = hinge(g, blackM, 0.09, 0.95, -0.11, 0.98, 0);
    const legR = hinge(g, blackM, 0.09, 0.95, 0.11, 0.98, 0);
    const torso = block(g, blackM, 0.42, 0.72, 0.24, 0, 1.34, 0, 2, 1);
    torso.userData.skin = "body";
    hinge(g, blackM, 0.07, 0.95, -0.28, 1.66, 0);
    hinge(g, blackM, 0.07, 0.95, 0.28, 1.66, 0);
    block(g, blackM, 0.36, 0.34, 0.34, 0, 1.9, 0, 2, 2);
    const eye = skin(0xc77dff);
    put(g, geoBox(0.09, 0.04, 0.02), eye, -0.09, 1.94, -0.18);
    put(g, geoBox(0.09, 0.04, 0.02), eye, 0.09, 1.94, -0.18);
    return { group: g, legs: [legL, legR], bodyMat: blackM };
  }
  if (kind === "blaze") {
    // Floating ember core with four swirling rods (the legs, animated).
    const core = skin(0xf07820);
    core.emissive = new THREE.Color(0x8a3400);
    const body = block(g, core, 0.36, 0.52, 0.36, 0, 0.82, 0, 2, 2);
    body.userData.skin = "body";
    const headM = skin(0xf5c518);
    headM.emissive = new THREE.Color(0x6a4a00);
    block(g, headM, 0.3, 0.3, 0.3, 0, 1.26, 0, 1, 1);
    put(g, geoBox(0.06, 0.08, 0.02), black, -0.08, 1.3, -0.16);
    put(g, geoBox(0.06, 0.08, 0.02), black, 0.08, 1.3, -0.16);
    const rodM = skin(0xffc93a);
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => hinge(g, rodM, 0.07, 0.55, sx * 0.27, 0.6, sz * 0.27)));
    return { group: g, legs, bodyMat: core };
  }
  if (kind === "bee") {
    const yellow = skin(0xf5c518);
    const body = block(g, yellow, 0.34, 0.26, 0.46, 0, 0.3, 0, 2, 2);
    body.userData.skin = "body";
    put(g, geoBox(0.36, 0.28, 0.08), black, 0, 0.3, 0.06);
    put(g, geoBox(0.36, 0.28, 0.08), black, 0, 0.3, -0.13);
    put(g, geoBox(0.05, 0.05, 0.02), black, -0.08, 0.34, -0.24);
    put(g, geoBox(0.05, 0.05, 0.02), black, 0.08, 0.34, -0.24);
    const wingM = skin(0xf7f4ee);
    const left = new THREE.Group();
    left.position.set(-0.12, 0.45, 0);
    put(left, geoBox(0.24, 0.02, 0.14), wingM, -0.12, 0, 0);
    g.add(left);
    const right = new THREE.Group();
    right.position.set(0.12, 0.45, 0);
    put(right, geoBox(0.24, 0.02, 0.14), wingM, 0.12, 0, 0);
    g.add(right);
    return { group: g, legs: [left, right], bodyMat: yellow };
  }
  if (kind === "cat") {
    const coat = skin(0xd88a3a);
    const white = skin(0xf4f1ea);
    const body = block(g, coat, 0.56, 0.24, 0.28, 0, 0.34, 0, 3, 1);
    body.userData.skin = "body";
    put(g, geoBox(0.2, 0.14, 0.04), white, 0, 0.32, -0.15);
    block(g, coat, 0.24, 0.22, 0.24, 0, 0.44, -0.36, 1, 1);
    put(g, geoBox(0.06, 0.09, 0.03), coat, -0.08, 0.6, -0.36);
    put(g, geoBox(0.06, 0.09, 0.03), coat, 0.08, 0.6, -0.36);
    put(g, geoBox(0.05, 0.05, 0.02), black, -0.06, 0.46, -0.49);
    put(g, geoBox(0.05, 0.05, 0.02), black, 0.06, 0.46, -0.49);
    put(g, geoBox(0.07, 0.07, 0.3), coat, 0, 0.48, 0.4, -0.5);
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, coat, 0.07, 0.2, 0.07, sx * 0.16, 0.2, sz * 0.2)));
    return { group: g, legs, bodyMat: coat };
  }
  if (kind === "squid") {
    const hide = skin(0x5068a8);
    const body = block(g, hide, 0.38, 0.55, 0.38, 0, 0.78, 0, 2, 2);
    body.userData.skin = "body";
    put(g, geoBox(0.4, 0.08, 0.4), skin(0x8aa8d8), 0, 0.52, 0);
    put(g, geoBox(0.07, 0.09, 0.02), skin(0xf4f1ea), -0.2, 0.62, 0);
    put(g, geoBox(0.07, 0.09, 0.02), skin(0xf4f1ea), 0.2, 0.62, 0);
    const legs = [-1, 1].flatMap((sx) =>
      [-1, 0, 1].map((sz) => legBox(g, hide, 0.07, 0.42, 0.07, sx * 0.12, 0.42, sz * 0.12)),
    );
    return { group: g, legs, bodyMat: hide };
  }
  if (kind === "bat") {
    const hide = skin(0x2a2430);
    const body = block(g, hide, 0.2, 0.22, 0.3, 0, 0.3, 0, 1, 1);
    body.userData.skin = "body";
    put(g, geoBox(0.05, 0.08, 0.03), hide, -0.06, 0.46, -0.08);
    put(g, geoBox(0.05, 0.08, 0.03), hide, 0.06, 0.46, -0.08);
    put(g, geoBox(0.04, 0.04, 0.02), skin(0xe23b2f), -0.05, 0.34, -0.16);
    put(g, geoBox(0.04, 0.04, 0.02), skin(0xe23b2f), 0.05, 0.34, -0.16);
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
    const coat = skin(0xbdb8ae);
    const darkLeg = skin(0x8a857c);
    const body = block(g, coat, 0.72, 0.38, 0.44, 0, 0.55, 0, 3, 2);
    body.userData.skin = "body";
    block(g, coat, 0.26, 0.26, 0.28, 0, 0.66, -0.38, 1, 1);
    put(g, geoBox(0.14, 0.1, 0.08), coat, 0, 0.6, -0.55);
    put(g, geoBox(0.07, 0.14, 0.05), skin(0xf4f1ea), 0, 0.47, -0.52);
    put(g, geoBox(0.05, 0.16, 0.05), skin(0x6a655c), -0.09, 0.86, -0.34);
    put(g, geoBox(0.05, 0.16, 0.05), skin(0x6a655c), 0.09, 0.86, -0.34);
    put(g, geoBox(0.1, 0.04, 0.06), coat, -0.19, 0.7, -0.38);
    put(g, geoBox(0.1, 0.04, 0.06), coat, 0.19, 0.7, -0.38);
    put(g, geoBox(0.04, 0.04, 0.02), black, -0.07, 0.7, -0.53);
    put(g, geoBox(0.04, 0.04, 0.02), black, 0.07, 0.7, -0.53);
    put(g, geoBox(0.08, 0.14, 0.06), coat, 0, 0.68, 0.26);
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, darkLeg, 0.1, 0.3, 0.1, sx * 0.22, 0.3, sz * 0.13)));
    return { group: g, legs, bodyMat: coat };
  }
  if (kind === "axolotl") {
    const pink = skin(0xf2a8c8);
    const gill = skin(0xef6a9a);
    const body = block(g, pink, 0.4, 0.22, 0.62, 0, 0.2, 0.02, 2, 3);
    body.userData.skin = "body";
    block(g, pink, 0.46, 0.2, 0.26, 0, 0.22, -0.36, 2, 1);
    put(g, geoBox(0.05, 0.05, 0.02), black, -0.13, 0.26, -0.5);
    put(g, geoBox(0.05, 0.05, 0.02), black, 0.13, 0.26, -0.5);
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) put(g, geoBox(0.05, 0.12, 0.05), gill, sx * 0.27, 0.24, -0.44 + i * 0.08);
    put(g, geoBox(0.04, 0.26, 0.3), pink, 0, 0.22, 0.44);
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, pink, 0.06, 0.1, 0.06, sx * 0.14, 0.1, sz * 0.2)));
    return { group: g, legs, bodyMat: pink };
  }
  if (kind === "parrot") {
    const green = skin(0x35b558);
    const body = block(g, green, 0.24, 0.34, 0.28, 0, 0.42, 0, 1, 1);
    body.userData.skin = "body";
    block(g, green, 0.22, 0.2, 0.22, 0, 0.68, -0.04, 1, 1);
    put(g, geoBox(0.16, 0.08, 0.03), skin(0xe23b2f), 0, 0.72, -0.16);
    put(g, geoBox(0.08, 0.07, 0.08), skin(0xd8d3c8), 0, 0.63, -0.19);
    put(g, geoBox(0.035, 0.035, 0.02), black, -0.07, 0.7, -0.16);
    put(g, geoBox(0.035, 0.035, 0.02), black, 0.07, 0.7, -0.16);
    put(g, geoBox(0.09, 0.34, 0.04), skin(0x3d7ad4), 0, 0.16, 0.18, 0.35);
    put(g, geoBox(0.04, 0.1, 0.04), skin(0x8a8f98), -0.06, 0.1, 0);
    put(g, geoBox(0.04, 0.1, 0.04), skin(0x8a8f98), 0.06, 0.1, 0);
    const left = new THREE.Group();
    left.position.set(-0.13, 0.5, 0);
    put(left, geoBox(0.26, 0.03, 0.2), green, -0.13, 0, 0);
    g.add(left);
    const right = new THREE.Group();
    right.position.set(0.13, 0.5, 0);
    put(right, geoBox(0.26, 0.03, 0.2), green, 0.13, 0, 0);
    g.add(right);
    return { group: g, legs: [left, right], bodyMat: green };
  }
  if (kind === "guardian") {
    const hide = skin(0x5f7f78);
    const spike = skin(0xd8a860);
    const body = block(g, hide, 0.72, 0.58, 0.85, 0, 0.55, 0, 3, 3);
    body.userData.skin = "body";
    put(g, geoBox(0.3, 0.3, 0.04), skin(0xf4f1ea), 0, 0.62, -0.44);
    put(g, geoBox(0.18, 0.18, 0.03), skin(0xf07820), 0, 0.62, -0.47);
    put(g, geoBox(0.08, 0.08, 0.03), black, 0, 0.62, -0.49);
    for (const sz of [-0.25, 0, 0.25]) put(g, geoBox(0.07, 0.16, 0.07), spike, 0, 0.92, sz);
    for (const sx of [-1, 1]) for (const sz of [-0.1, 0.2]) put(g, geoBox(0.07, 0.14, 0.07), spike, sx * 0.4, 0.66, sz);
    put(g, geoBox(0.05, 0.4, 0.28), hide, 0, 0.55, 0.56);
    put(g, geoBox(0.2, 0.05, 0.24), hide, -0.46, 0.4, 0.05);
    put(g, geoBox(0.2, 0.05, 0.24), hide, 0.46, 0.4, 0.05);
    return { group: g, legs: [], bodyMat: hide };
  }
  if (kind === "shulker") {
    const shell = skin(0x8a6aa8);
    const rim = skin(0x6a4a88);
    const body = block(g, shell, 0.84, 0.3, 0.84, 0, 0.15, 0, 3, 3);
    body.userData.skin = "body";
    put(g, geoBox(0.9, 0.08, 0.9), rim, 0, 0.33, 0);
    block(g, skin(0xd8c88a), 0.3, 0.26, 0.3, 0, 0.48, 0, 1, 1);
    put(g, geoBox(0.05, 0.05, 0.02), black, -0.07, 0.5, -0.16);
    put(g, geoBox(0.05, 0.05, 0.02), black, 0.07, 0.5, -0.16);
    block(g, shell, 0.78, 0.22, 0.78, 0, 0.73, 0, 3, 3);
    return { group: g, legs: [], bodyMat: shell };
  }
  if (kind === "vex") {
    // A palm-sized gremlin: pale body, mad eyes, two swept wings.
    const pale = skin(0xb8c4cc);
    const wing = skin(0xdfe9ee);
    const body = block(g, pale, 0.26, 0.34, 0.2, 0, 0.42, 0, 1, 1);
    body.userData.skin = "body";
    block(g, pale, 0.3, 0.26, 0.26, 0, 0.72, 0, 1, 1);
    put(g, geoBox(0.05, 0.07, 0.02), black, -0.07, 0.74, -0.14);
    put(g, geoBox(0.05, 0.07, 0.02), black, 0.07, 0.74, -0.14);
    put(g, geoBox(0.03, 0.3, 0.03), pale, -0.2, 0.16, 0);
    put(g, geoBox(0.03, 0.3, 0.03), pale, 0.2, 0.16, 0);
    const wL = new THREE.Group();
    const wLm = new THREE.Mesh(geoBox(0.4, 0.03, 0.2), wing);
    wLm.position.set(-0.2, 0, 0);
    wL.add(wLm);
    wL.position.set(-0.14, 0.6, 0.06);
    wL.rotation.z = 0.5;
    const wR = new THREE.Group();
    const wRm = new THREE.Mesh(geoBox(0.4, 0.03, 0.2), wing);
    wRm.position.set(0.2, 0, 0);
    wR.add(wRm);
    wR.position.set(0.14, 0.6, 0.06);
    wR.rotation.z = -0.5;
    g.add(wL, wR);
    return { group: g, legs: [wL, wR], bodyMat: pale };
  }
  if (kind === "ravager") {
    // A siege beast: shoulder-humped grey bulk, horned brow, iron nose
    // bar, saddle patch — built to read as heavy from any angle.
    const hide = skin(0x6a6f76);
    const dark = skin(0x4c5058);
    const hornM = skin(0xe8e2d4);
    const body = block(g, hide, 0.95, 0.85, 1.5, 0, 0.85, 0.05, 4, 6);
    body.userData.skin = "body";
    put(g, geoBox(0.8, 0.3, 0.7), dark, 0, 1.35, 0.28);
    put(g, geoBox(0.6, 0.1, 0.7), skin(0x8a5a34), 0, 1.53, 0.05);
    block(g, hide, 0.72, 0.62, 0.6, 0, 1.02, -0.98, 3, 2);
    put(g, geoBox(0.76, 0.16, 0.2), dark, 0, 1.3, -1.12);
    put(g, geoBox(0.06, 0.06, 0.03), black, -0.2, 1.06, -1.29);
    put(g, geoBox(0.06, 0.06, 0.03), black, 0.2, 1.06, -1.29);
    put(g, geoBox(0.4, 0.14, 0.3), dark, 0, 0.78, -1.18);
    put(g, geoBox(0.05, 0.34, 0.05), hornM, -0.48, 1.24, -0.98, -0.5);
    put(g, geoBox(0.05, 0.34, 0.05), hornM, 0.48, 1.24, -0.98, 0.5);
    put(g, geoBox(0.1, 0.42, 0.1), dark, 0, 0.62, 0.82);
    const legs: THREE.Object3D[] = [];
    for (const sx of [-1, 1])
      for (const sz of [-0.52, 0.55]) {
        const leg = legBox(g, dark, 0.2, 0.62, 0.2, sx * 0.34, 0.62, sz);
        legs.push(leg);
      }
    return { group: g, legs, bodyMat: hide };
  }
  if (kind === "wither") {
    // Three skulls on a ribbed spine — it used to fall through to the
    // white-cube fallback, a boss rendered as a blank brick.
    const bone = skin(0x1c1c24);
    const rib = skin(0x3d3d4a);
    const body = block(g, bone, 0.26, 0.9, 0.26, 0, 0.95, 0, 1, 1);
    body.userData.skin = "body";
    for (const ry of [0.72, 0.98, 1.24]) put(g, geoBox(0.62, 0.09, 0.3), rib, 0, ry, 0);
    put(g, geoBox(0.16, 0.55, 0.16), bone, 0, 0.32, 0.1);
    block(g, bone, 0.4, 0.36, 0.36, 0, 1.66, 0, 2, 2);
    block(g, bone, 0.28, 0.26, 0.26, -0.44, 1.5, 0, 1, 1);
    block(g, bone, 0.28, 0.26, 0.26, 0.44, 1.5, 0, 1, 1);
    const eyeW = skin(0xf4f1ea);
    put(g, geoBox(0.09, 0.03, 0.02), eyeW, -0.09, 1.7, -0.19);
    put(g, geoBox(0.09, 0.03, 0.02), eyeW, 0.09, 1.7, -0.19);
    put(g, geoBox(0.16, 0.04, 0.02), black, 0, 1.56, -0.19);
    put(g, geoBox(0.07, 0.03, 0.02), eyeW, -0.44, 1.54, -0.14);
    put(g, geoBox(0.07, 0.03, 0.02), eyeW, 0.44, 1.54, -0.14);
    return { group: g, legs: [], bodyMat: bone };
  }
  const fallback = skin(0xf4f1ea);
  const body = block(g, fallback, 0.4, 0.4, 0.4, 0, 0.3, 0, 2, 2);
  body.userData.skin = "body";
  return { group: g, legs: [], bodyMat: fallback };
}

function buildLego(kind: string, scale: number): LegoBody {
  const figKind =
    kind === "villager"
      ? makeFig(0x8d5a34, 0x6b3e22, 0x4a3424, "nose")
      : kind === "walker"
        ? makeFig(0x3d5c38, 0x243028, 0x1a120c, "mad", 0x6a8a52)
        : kind === "skelly"
          ? makeFig(0xe8e0d0, 0xd4cbb8, 0xf7f4ee, "skull", 0xf4f1ea)
          : kind === "piglin"
            ? makeFig(0xf0c43a, 0x8d5a34, 0xf2a2c0, "snout", 0xf2a2c0)
            : kind === "witch"
              ? makeFig(0x4a2a6a, 0x2a1a3a, 0x14101c, "nose", 0xd8b088)
              : kind === "drowned"
                ? makeFig(0x2a6a6a, 0x1a3a4a, 0x0a2a2a, "mad", 0x7ac0a8)
                : kind === "husk"
                  ? makeFig(0x8a6a42, 0x6a5136, 0x3a2c1c, "mad", 0xb08a5a)
                  : kind === "stray"
                    ? makeFig(0x7a8a94, 0x4a565e, 0xc8d8e2, "skull", 0xdfe9ee)
                    : kind === "pillager"
                      ? makeFig(0x4a4a55, 0x35353f, 0x23232a, "mad", 0x8a8a92)
                      : kind === "vindicator"
                        ? makeFig(0x3d4a42, 0x2c362f, 0x1e2620, "mad", 0x8a8a92)
                        : kind === "evoker"
                          ? makeFig(0x23202e, 0x8a6a2c, 0x14101c, "mad", 0x8a8a92)
                          : null;
  const built = figKind ?? beast(kind);
  if (kind === "witch") {
    // Pointed hat: brim + two stacked drums taper to the tip.
    put(built.group, geoBox(0.52, 0.05, 0.52), skin(0x1a1226), 0, 1.28, 0);
    put(built.group, geoCyl(0.15, 0.2, 10), skin(0x241536), 0, 1.4, 0);
    put(built.group, geoCyl(0.08, 0.18, 10), skin(0x241536), 0, 1.58, 0);
    put(built.group, geoBox(0.3, 0.06, 0.3), skin(0xf0c43a), 0, 1.33, 0);
  }
  if (scale !== 1) built.group.scale.multiplyScalar(scale);
  return built;
}
