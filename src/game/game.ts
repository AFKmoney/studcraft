import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BLOCKS, CREATIVE_BAR, ID, def } from "./blocks";
import { createAudio } from "./audio";
import { STUD_H, STUD_R, buildChunk, type Surface } from "./mesher";
import { NEIGHBORS, RECIPES, SMELT, fuelTime, matchGrid } from "./recipes";
import { DISCOVER, MOB_XP, ORE_HEAR, ORE_XP, nextPerk, rankTitle, xpNeed } from "./ranks";
import { manaMaxFor, skillById, spellsFor } from "./skills";
import { QUESTS, traderOf, type TraderRole } from "./quests";
import { clearSave, deleteWorld, hasSave, listWorlds, loadLatest, loadSettings, loadWorld, writeSettings, writeWorld, type SaveV1, type WorldSlot } from "./save";
import { buildAtlas } from "./textures";
import { CS, HEIGHT, World, decorate, folkLayout, penSheep, paintEndCrystals, END_PILLARS, type Decor, type FolkSpot } from "./world";
import { parseSeed } from "./noise";

export type Phase = "title" | "play" | "pause" | "inventory" | "dead";
export type EnterKind = "play" | "survival" | "flat" | "continue";

export type Hud = {
  hotbar: { id: number; count: number }[];
  slot: number;
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
  armor: number[];
  grid: number[];
  cursor: number;
  panel: "bag" | "bench" | "furnace" | "chest" | "enchant" | "anvil" | "brew" | "trade";
  craftOut: { id: number; n: number } | null;
  furnace: { in: number; inN: number; fuel: number; fuelN: number; out: number; outN: number; cook: number };
  chest: { id: number; n: number }[];
  compass: number;
  realm: string;
  effect: string;
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
  offers: { pay: number; pn: number; out: number; on: number; payName: string; outName: string }[];
  quests: { id: string; name: string; detail: string; n: number; need: number; done: boolean; ready: boolean; reward: string }[];
  questAlert: string;
  questTrack: string;
  skills: string[];
  skillPoints: number;
  mana: number;
  manaMax: number;
  spell: string;
  spellsOn: boolean;
};

export type TouchState = {
  moveX: number;
  moveY: number;
  jump: boolean;
  mine: boolean;
  place: boolean;
};

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
    third: boolean;
    mods: { hard: boolean; generous: boolean; peaceful: boolean; spells: boolean };
  };
  phase: Phase;
  hasSave: boolean;
  enter: (kind: EnterKind, worldId?: string) => void;
  resume: () => void;
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
  mend: () => void;
  temper: () => void;
  brew: (kind: string) => void;
  trade: (i: number) => void;
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
      getHamlet?: () => { x: number; y: number; z: number } | null;
      getChunks?: () => number;
    };
  }
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
    third: false,
    mods: {
      hard: savedSettings?.mods?.hard ?? false,
      generous: savedSettings?.mods?.generous ?? false,
      peaceful: savedSettings?.mods?.peaceful ?? false,
      spells: savedSettings?.mods?.spells ?? true,
    },
  };
  audio.setEnabled(settings.sound);
  plasticOn = settings.realistic;

  const hud: Hud = {
    hotbar: [],
    slot: 0,
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
    offers: [],
    quests: [],
    questAlert: "",
    questTrack: "",
    skills: [],
    skillPoints: 0,
    mana: 8,
    manaMax: 8,
    spell: "",
    spellsOn: true,
  };
  const touch: TouchState = { moveX: 0, moveY: 0, jump: false, mine: false, place: false };
  const listeners = new Set<() => void>();
  const keys = new Set<string>();
  let steerOverride = 0;
  let phase: Phase = "title";
  let hasSaveFlag = hasSave();
  let suppressUnlock = false;
  let wasLocked = false;
  let touchMode = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 900;
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
  let strikeIn = 14;
  let boltT = 0;
  let golemWait = 0;
  let regenAcc = 0;
  let growAcc = 0;
  let lightAcc = 0;
  const armor = [0, 0, 0, 0];
  let grid = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  let cursor = 0;
  let panel: "bag" | "bench" | "furnace" | "chest" | "enchant" | "anvil" | "brew" | "trade" = "bag";
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
  const pistonHot = new Set<string>();
  let slot = 0;
  let hotbar: number[] = [...CREATIVE_BAR];
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
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
    kind: "sheep" | "creeper" | "cow" | "walker" | "pig" | "chicken" | "spider" | "skelly" | "villager" | "ghast" | "dragon" | "horse" | "phantom" | "piglin" | "boat" | "cart" | "frog" | "fox" | "crab" | "wisp" | "slime" | "wolf" | "golem";
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
  };
  const mobs: Mob[] = [];

  function wantsShadow(obj: THREE.Object3D) {
    let cur: THREE.Object3D | null = obj;
    while (cur) {
      if (cur.userData.keepShadow === false) return false;
      cur = cur.parent;
    }
    return settings.realistic;
  }

  function relight() {
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
  let drownTick = 0;
  let saveDirty = false;
  let saveAcc = 0;
  let creeperAcc = 0;
  let walkerAcc = 0;
  let sinceSleep = 0;
  let speedT = 0;
  let strengthT = 0;
  let fireT = 0;
  let sharp = false;
  let realm = 0;
  let portalCd = 0;
  let realmsReady = false;
  let fishT = -1;
  let dragonUp = false;
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
  };
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
      mods: { ...settings.mods },
    });
  }

  const pub = { phase: "title" as Phase, hasSave: hasSaveFlag };

  function snapshot() {
    hud.hotbar = hotbar.map((id) => ({ id, count: creative ? -1 : (inv[id] ?? 0) }));
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
    hud.weather = raining ? "rain" : "clear";
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
    hud.effect = [speedT > 0 ? "Dash" : "", strengthT > 0 ? "Might" : "", fireT > 0 ? "Fire" : "", sharp ? "Rune" : ""]
      .filter(Boolean)
      .join(" ");
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
    hud.offers = trader.offers.map((o) => ({
      pay: o.pay,
      pn: o.pn,
      out: o.out,
      on: o.on,
      payName: def(o.pay).name.toLowerCase(),
      outName: def(o.out).name.toLowerCase(),
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
    hud.skills = [...skills];
    hud.skillPoints = creative ? 99 : Math.max(0, rankLv - skills.size);
    const maxMana = manaMaxFor(skills);
    hud.manaMax = maxMana;
    hud.mana = mana;
    const knownSpells = spellsFor(skills);
    hud.spell = knownSpells.length ? knownSpells[spellIx % knownSpells.length].name : "";
    hud.spellsOn = settings.mods.spells;
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
    pistonHot.clear();
    quests = QUESTS.map((q) => ({ id: q.id, n: 0, done: false }));
    traderRole = "grocer";
  }

  function resetHotbarCreative() {
    hotbar = [...CREATIVE_BAR];
    slot = 0;
  }

  function clearMobs() {
    for (const m of mobs) scene.remove(m.mesh);
    mobs.length = 0;
    for (const s of shots) scene.remove(s.mesh);
    shots.length = 0;
    for (const d of drops) scene.remove(d.mesh);
    drops.length = 0;
    mount = null;
    realm = 0;
    realmsReady = false;
    dragonUp = false;
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
    for (const f of data.furnaces ?? []) furnaces.set(f.x + "," + f.y + "," + f.z, { ...f });
    for (const c of data.chests ?? []) chests.set(c.x + "," + c.y + "," + c.z, { ids: c.ids.slice(), ns: c.ns.slice() });
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
    const r = settings.radius;
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

  function overlapAt(px: number, py: number, pz: number) {
    const minX = Math.floor(px - HW);
    const maxX = Math.floor(px + HW - 1e-4);
    const minY = Math.floor(py + 1e-4);
    const maxY = Math.floor(py + BODY - 1e-4);
    const minZ = Math.floor(pz - HW);
    const maxZ = Math.floor(pz + HW - 1e-4);
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) if (solidAt(x, y, z)) return true;
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
      player.y += 1.02;
      if (!overlapAt(player.x, player.y, player.z)) return;
      player.y -= 1.02;
    }
    if (axis === "y") {
      if (delta < 0 && player.vy < -13 && !creative && !inWaterNow()) {
        let dmg = Math.round((-player.vy - 13) * 1.5);
        if (rankLv >= 15) dmg = Math.round(dmg * 0.55);
        if (skills.has("raise")) dmg = Math.round(dmg * 0.75);
        if (dmg > 0) hurt(dmg);
      }
      if (delta > 0) player.y = Math.floor(player.y + BODY) - BODY - 1e-3;
      else {
        player.y = Math.floor(player.y) + 1 + 1e-3;
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
    if (sneaking && hotbar.includes(ID.Shield)) {
      n *= 0.35;
      if (hotbar[slot] === ID.Shield) wearHeld();
    }
    if (rankLv >= 8) n *= 0.86;
    let resist = 0;
    for (const id of armor) resist += def(id).armor;
    const dealt = Math.max(1, Math.round(n * (1 - Math.min(0.64, resist))));
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
      else if (canDrop && block.drop !== -1) addInv(block.drop || id, 1);
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

  function openPanel(next: "bag" | "bench" | "furnace" | "chest" | "enchant" | "anvil" | "brew" | "trade", x = 0, y = 0, z = 0) {
    panel = next;
    focus = { x, y, z };
    if (next === "chest") ensureChest(x + "," + y + "," + z);
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

  function recompute(x: number, y: number, z: number) {
    const R = 8;
    const powered = new Set<string>();
    const q: { x: number; y: number; z: number; d: number }[] = [];
    for (let dy = -R; dy <= R; dy++) {
      for (let dz = -R; dz <= R; dz++) {
        for (let dx = -R; dx <= R; dx++) {
          const bx = x + dx;
          const by = y + dy;
          const bz = z + dz;
          if (by < 1 || by >= HEIGHT - 1) continue;
          if (world.get(bx, by, bz) !== ID.LeverOn && world.get(bx, by, bz) !== ID.PlateOn) continue;
          for (const [ox, oy, oz] of NEIGHBORS) q.push({ x: bx + ox, y: by + oy, z: bz + oz, d: 1 });
        }
      }
    }
    while (q.length) {
      const cur = q.pop();
      if (!cur || cur.d > 15) continue;
      const key = cur.x + "," + cur.y + "," + cur.z;
      if (powered.has(key)) continue;
      if (world.get(cur.x, cur.y, cur.z) !== ID.Dust) continue;
      powered.add(key);
      for (const [ox, oy, oz] of NEIGHBORS) q.push({ x: cur.x + ox, y: cur.y + oy, z: cur.z + oz, d: cur.d + 1 });
    }
    const near = (bx: number, by: number, bz: number) => {
      for (const [ox, oy, oz] of NEIGHBORS) {
        const id = world.get(bx + ox, by + oy, bz + oz);
        if (id === ID.LeverOn || id === ID.PlateOn) return true;
        if (powered.has(bx + ox + "," + (by + oy) + "," + (bz + oz))) return true;
      }
      return false;
    };
    for (let dy = -R; dy <= R; dy++) {
      for (let dz = -R; dz <= R; dz++) {
        for (let dx = -R; dx <= R; dx++) {
          const bx = x + dx;
          const by = y + dy;
          const bz = z + dz;
          if (by < 1 || by >= HEIGHT - 1) continue;
          const id = world.get(bx, by, bz);
          if (id === ID.Lamp || id === ID.LampOn) {
            const next = near(bx, by, bz) ? ID.LampOn : ID.Lamp;
            if (next !== id && world.set(bx, by, bz, next)) markDirtyAt(bx, bz);
          }
          if (id === ID.Piston) {
            const key = bx + "," + by + "," + bz;
            const on = near(bx, by, bz);
            if (on && !pistonHot.has(key)) {
              pistonHot.add(key);
              const above = world.get(bx, by + 1, bz);
              const above2 = world.get(bx, by + 2, bz);
              if (above > 0 && above !== ID.Bedrock && above !== ID.Piston && def(above).solid && above2 === ID.Air) {
                world.set(bx, by + 1, bz, ID.Air);
                world.set(bx, by + 2, bz, above);
                markDirtyAt(bx, bz);
              }
            }
            if (!on) pistonHot.delete(key);
          }
        }
      }
    }
  }

  function useBlock(hit: { id: number; x: number; y: number; z: number }) {
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
    const block = def(hit.id);
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
    if (block.work === "bench" || block.work === "furnace" || block.work === "chest" || block.work === "enchant" || block.work === "anvil" || block.work === "brew") {
      openPanel(block.work, hit.x, hit.y, hit.z);
      return true;
    }
    return false;
  }

  function tryPlace(hit: NonNullable<ReturnType<typeof raycast>>) {
    const sneaking = keys.has("ShiftLeft") || keys.has("ShiftRight");
    const held = hotbar[slot];
    const heldDef = def(held);
    if (held === ID.Bow) return shootHeld();
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
    if (held === ID.PotionHeal || held === ID.PotionSpeed || held === ID.PotionStr || held === ID.Focus || held === ID.Milk || held === ID.Gapple) {
      return drink(held);
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
    if (!world.set(px, py, pz, held)) return;
    markDirtyAt(px, pz);
    if (!creative) spend(held, 1);
    if (held === ID.Dust || held === ID.Lever || held === ID.Lamp || held === ID.Piston) recompute(px, py, pz);
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

  function launchArrow(x: number, y: number, z: number, dx: number, dy: number, dz: number, friendly: boolean) {
    const len = Math.hypot(dx, dy, dz) || 1;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.35), skin(0xf4f1ea));
    scene.add(mesh);
    shots.push({ x, y, z, vx: (dx / len) * 18, vy: (dy / len) * 18, vz: (dz / len) * 18, life: 2.4, friendly, mesh });
  }

  function shootHeld() {
    if ((inv[ID.Arrow] ?? 0) <= 0 && !creative) return say("Need arrows");
    if (!creative) spend(ID.Arrow, 1);
    wearHeld();
    const dx = -Math.sin(player.yaw) * Math.cos(player.pitch);
    const dy = Math.sin(player.pitch);
    const dz = -Math.cos(player.yaw) * Math.cos(player.pitch);
    launchArrow(player.x, player.y + 1.4, player.z, dx, dy, dz, true);
    audio.place();
  }

  function drink(id: number) {
    if (id === ID.Milk) {
      speedT = 0;
      strengthT = 0;
      fireT = 0;
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
    // pillars in the End — crystals sit on the columns
    // painted after the air carve so the columns are not eaten
    fill(-520, 48, -520, -488, 48, -488, ID.EndStone);
    fill(-518, 49, -518, -490, 56, -490, ID.Air);
    world.set(-504, 49, -504, ID.Portal);
    world.set(-504, 50, -504, ID.Portal);
    for (let i = 0; i < 6; i++) world.set(-516 + i * 3, 49, -506, ID.PrismOre);
    paintEndCrystals((x, y, z, id) => world.set(x, y, z, id));
    for (let cz = Math.floor(468 / CS); cz <= Math.floor(508 / CS); cz++) {
      for (let cx = Math.floor(468 / CS); cx <= Math.floor(508 / CS); cx++) dirty.add(cx + "," + cz);
    }
    for (let cz = Math.floor(-520 / CS); cz <= Math.floor(-488 / CS); cz++) {
      for (let cx = Math.floor(-520 / CS); cx <= Math.floor(-488 / CS); cx++) dirty.add(cx + "," + cz);
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
      if (!dragonUp) {
        dragonUp = true;
        spawnKind("dragon", -504, -508);
      }
    }
    player.vx = player.vy = player.vz = 0;
    mount = null;
    stream(6);
    saveDirty = true;
  }

  function tickExtras(dt: number) {
    sinceSleep += dt;
    speedT = Math.max(0, speedT - dt);
    strengthT = Math.max(0, strengthT - dt);
    if (fireT > 0) {
      fireT -= dt;
      if (Math.floor(fireT * 2) !== Math.floor((fireT + dt) * 2)) hurt(1);
    }
    portalCd = Math.max(0, portalCd - dt);
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
            let hit = 4 + (strengthT > 0 ? 2 : 0);
            if (m.kind === "dragon" && crystalsLeft() > 0) hit = Math.max(1, Math.ceil(hit * 0.5));
            m.hp -= hit;
            if (m.hp <= 0) killMob(m);
            dead = true;
            audio.hit();
            break;
          }
        }
      } else if (!dead && !s.friendly && Math.hypot(player.x - s.x, player.z - s.z) < 0.6 && Math.abs(player.y + 1 - s.y) < 1.2) {
        bite(3);
        dead = true;
      }
      if (dead) scene.remove(s.mesh);
      else shots[w++] = s;
    }
    shots.length = w;
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
    for (; y >= 1; y--) if (solidAt(ix, y, iz)) return y + 1;
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

  function spawnWalker(x: number, z: number) {
    spawnKind("walker", x, z);
  }

  function spawnKind(kind: Mob["kind"], x: number, z: number, scale = 1) {
    const y = kind === "ghast" || kind === "dragon" || kind === "phantom" ? groundY(x, z) + (kind === "dragon" ? 6 : 4) : groundY(x, z);
    const body = buildLego(kind, scale);
    const mob: Mob = {
      kind,
      x,
      y,
      z,
      yaw: Math.random() * Math.PI * 2,
      hp:
        kind === "dragon"
          ? 12 + crystalsLeft() * 8
          : kind === "golem"
            ? 24
            : kind === "ghast"
              ? 10
              : kind === "slime"
                ? scale < 0.5
                  ? 2
                  : scale < 0.8
                    ? 4
                    : 10
                : kind === "walker" || kind === "wolf"
                  ? 8
                  : kind === "wisp"
                    ? 6
                    : kind === "cow"
                      ? 5
                      : kind === "frog" || kind === "crab" || kind === "sheep"
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
    scene.add(body.group);
    mobs.push(mob);
    return mob;
  }

  function interactMob(mob: Mob) {
    const held = hotbar[slot];
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
    if (held === ID.Lead && (mob.kind === "sheep" || mob.kind === "cow" || mob.kind === "pig" || mob.kind === "chicken" || mob.kind === "horse")) {
      // one lead, one mob: clear others
      for (const m of mobs) if (m !== mob) m.lead = false;
      mob.lead = !mob.lead;
      say(mob.lead ? "Hitched" : "Unhitched");
      return;
    }
    if ((mob.kind === "cow" || mob.kind === "sheep" || mob.kind === "pig") && held === ID.Wheat) {
      mob.love = 8;
      if (!creative) spend(ID.Wheat, 1);
      say("Hearts");
      return;
    }
    if (mob.kind === "chicken" && held === ID.Seeds) {
      mob.love = 8;
      if (!creative) spend(ID.Seeds, 1);
      return;
    }
    if (mob.kind === "cow" && held === ID.Bucket) {
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
      say(mob.tame ? "Good hound" : "It wants a bone");
      return;
    }
    if (mob.kind === "golem") {
      say("The hamlet golem");
      return;
    }
    if (mob.kind === "horse") {
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
    if (mob.kind === "villager") {
      traderRole = (mob.role as TraderRole) || "grocer";
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
    mob.dead = true;
    scene.remove(mob.mesh);
    const drops =
      mob.kind === "sheep"
        ? mob.sheared
          ? [ID.RawMeat]
          : [ID.White, ID.RawMeat]
        : mob.kind === "cow"
          ? [ID.RawMeat, ID.RawMeat]
          : mob.kind === "pig"
            ? [ID.RawMeat]
            : mob.kind === "chicken"
              ? [ID.Feather, ID.RawMeat]
              : mob.kind === "spider"
                ? [ID.String]
                : mob.kind === "skelly"
                  ? [ID.Bone, ID.Arrow]
                  : mob.kind === "walker"
                    ? [ID.RawMeat, ID.Bone]
                    : mob.kind === "creeper"
                      ? [ID.Powder]
                      : mob.kind === "ghast"
                        ? [ID.Blaze, ID.Powder]
                        : mob.kind === "piglin"
                          ? [ID.Scrap]
                          : mob.kind === "phantom"
                            ? [ID.Feather]
                            : mob.kind === "dragon"
                              ? [ID.Elytra, ID.Totem, ID.Scrap]
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
                                            : mob.kind === "villager"
                                              ? [ID.Emerald]
                                              : [ID.Green];
    if (!creative) {
      for (const drop of drops) dropItem(drop, 1, mob.x, mob.y + 0.4, mob.z);
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
      if ((mob.kind === "creeper" || mob.kind === "ghast") && Math.random() < luck * 0.7) extra.push(ID.Cinder);
      if ((mob.kind === "skelly" || mob.kind === "walker") && Math.random() < luck * 0.45) extra.push(ID.Antler);
      if ((skills.has("butcher") || settings.mods.generous) && (mob.kind === "sheep" || mob.kind === "cow" || mob.kind === "pig" || mob.kind === "fox" || mob.kind === "frog" || mob.kind === "wolf")) {
        extra.push(ID.RawMeat);
      }
      if (settings.mods.generous && (mob.kind === "frog" || mob.kind === "fox" || mob.kind === "crab" || mob.kind === "wisp")) extra.push(drops[0]);
      for (const drop of extra) dropItem(drop, 1, mob.x, mob.y + 0.7, mob.z);
    }
    if (mob.kind === "dragon") dragonUp = false;
    burst(mob.x, mob.y + 0.5, mob.z, drops.length ? def(drops[0]).color : "#3aaa4c", 12);
    audio.break();
    gainXp(MOB_XP[mob.kind] ?? 2);
    if (mob.kind === "walker" || mob.kind === "creeper" || mob.kind === "skelly") bumpQuest("kill", "host");
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

  function updateMobs(dt: number) {
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
        if (roll < 0.34) spawnKind("skelly", x, z);
        else if (roll < 0.6) spawnKind("spider", x, z);
        else spawnWalker(x, z);
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
        if ((biome === "Fen" || biome === "Brick plains") && alive("frog") < 2) {
          const [x, z] = spot();
          spawnKind("frog", x, z);
        }
        if (!settings.mods.peaceful && (biome === "Fen" || biome === "Brick plains") && alive("slime") < 2) {
          const [x, z] = spot();
          spawnKind("slime", x, z);
        }
        if ((biome === "Grove" || biome === "Brick plains") && alive("fox") < 2) {
          const [x, z] = spot();
          spawnKind("fox", x, z);
        }
        if ((biome === "Grove" || biome === "Brick plains") && alive("wolf") < 2) {
          const [x, z] = spot();
          spawnKind("wolf", x, z);
        }
        if ((biome === "Shore" || biome === "Sand flats" || biome === "Ash ridge") && alive("crab") < 2) {
          const [x, z] = spot();
          spawnKind("crab", x, z);
        }
        if (!settings.mods.peaceful && night && (biome === "Fen" || biome === "Grove" || biome === "Snow cap") && alive("wisp") < 2) {
          const [x, z] = spot();
          spawnKind("wisp", x, z);
        }
      }
    }
    for (const m of mobs) {
      if (m.dead) continue;
      m.cool = Math.max(0, m.cool - dt);
      const dx = player.x - m.x;
      const dz = player.z - m.z;
      const d = Math.hypot(dx, dz);
      if (m.kind === "boat" || m.kind === "cart") {
        m.mesh.position.set(m.x, m.y + (settings.studs ? STUD_H : 0), m.z);
        m.mesh.rotation.y = m.yaw;
        continue;
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
        m.kind === "creeper" || m.kind === "walker" || m.kind === "skelly" || m.kind === "spider" || m.kind === "phantom" || m.kind === "wisp" || m.kind === "slime";
      if (farHost && (d > 42 || phase !== "play")) {
        m.dead = true;
        scene.remove(m.mesh);
        continue;
      }
      if ((m.kind === "creeper" || m.kind === "phantom" || m.kind === "wisp") && !night) {
        m.dead = true;
        scene.remove(m.mesh);
        continue;
      }
      if ((m.kind === "walker" || m.kind === "skelly") && !night && realm === 0) {
        m.hp -= dt * 3;
        if (m.hp <= 0) {
          killMob(m);
          continue;
        }
      }
      const flyer = m.kind === "ghast" || m.kind === "phantom" || m.kind === "dragon";
      const piglinMad = m.kind === "piglin" && hotbar[slot] !== ID.Gold && hotbar[slot] !== ID.Ingot;
      const townGuard = m.kind === "golem" || (m.kind === "wolf" && m.tame);
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
                (o.kind === "piglin" && hotbar[slot] !== ID.Gold && hotbar[slot] !== ID.Ingot)) &&
              Math.hypot(o.x - m.x, o.z - m.z) < (m.kind === "golem" ? 16 : 11),
          )
        : undefined;
      const chase =
        !!foe ||
        flyer ||
        piglinMad ||
        ((m.kind === "creeper" || m.kind === "walker" || m.kind === "skelly" || m.kind === "spider" || m.kind === "wisp" || m.kind === "slime") &&
          d < (m.kind === "skelly" ? 18 : m.kind === "slime" ? 12 : 16));
      if (foe) m.yaw = Math.atan2(-(foe.x - m.x), -(foe.z - m.z));
      else if (m.kind === "wolf" && m.tame && d > 3.2 && d < 32) m.yaw = Math.atan2(-dx, -dz);
      else if (chase) m.yaw = Math.atan2(-dx, -dz);
      else if (mount !== m) {
        m.wander -= dt;
        if (m.wander <= 0) {
          m.wander = 1.5 + Math.random() * 3;
          m.yaw += (Math.random() - 0.5) * 2.4;
        }
      }
      if ((m.kind === "villager" || m.kind === "golem") && m.homeX !== undefined && m.homeZ !== undefined) {
        const hx = m.homeX - m.x;
        const hz = m.homeZ - m.z;
        const hd = Math.hypot(hx, hz);
        if (hd > 12) {
          m.x = m.homeX;
          m.z = m.homeZ;
          m.y = groundY(m.x, m.z);
        } else if (hd > 4.5) {
          m.yaw = Math.atan2(-hx, -hz);
        }
      }
      if (flyer) {
        const alt = m.kind === "dragon" ? 7 : 4;
        const sp = m.kind === "dragon" ? 3.4 : 2.1;
        m.x += -Math.sin(m.yaw) * sp * dt;
        m.z += -Math.cos(m.yaw) * sp * dt;
        const want = groundY(m.x, m.z) + alt;
        m.y += (want - m.y) * Math.min(1, dt * 2);
        if (m.kind !== "dragon" && m.cool <= 0 && d < 24 && phase === "play") {
          launchArrow(m.x, m.y, m.z, dx, player.y + 1 - m.y, dz, false);
          m.cool = m.kind === "ghast" ? 2.5 : 1.5;
        }
        if (m.kind === "dragon" && d < 2.8 && phase === "play" && m.cool <= 0) {
          bite(5);
          m.cool = 1.1;
          audio.hit();
        }
      } else {
        if (m.kind === "wolf" && m.tame && !foe && d > 28) {
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
        const speed = foe ? 2.7 : chase ? (m.kind === "spider" ? 3.1 : m.kind === "slime" ? 1.35 : m.kind === "walker" ? 2.15 : 2.4) : m.kind === "wolf" && m.tame && d > 4 ? 2.35 : 1.05;
        const fx = -Math.sin(m.yaw);
        const fz = -Math.cos(m.yaw);
        const nx = m.x + fx * speed * dt;
        const nz = m.z + fz * speed * dt;
        const gy = groundY(nx, nz);
        const blocked =
          solidAt(Math.floor(nx), Math.floor(gy + 0.1), Math.floor(nz)) ||
          solidAt(Math.floor(nx), Math.floor(gy + 1.1), Math.floor(nz));
        if (blocked) m.yaw += 1.4;
        else {
          m.x = nx;
          m.z = nz;
          m.y = gy;
        }
      }
      if ((m.kind === "walker" || m.kind === "spider" || m.kind === "wisp" || m.kind === "slime" || piglinMad) && d < 1.35 && phase === "play" && m.cool <= 0) {
        bite(m.kind === "wisp" || m.kind === "spider" ? 2 : m.kind === "slime" ? ((m.size ?? 1) > 0.7 ? 3 : 1) : 3);
        m.cool = 0.75;
        audio.hit();
      }
      if (foe && Math.hypot(foe.x - m.x, foe.z - m.z) < 1.7 && m.cool <= 0) {
        foe.hp -= m.kind === "golem" ? 6 : 3;
        m.cool = 0.65;
        audio.hit();
        if (foe.hp <= 0) killMob(foe);
      }
      if (m.kind === "skelly" && d < 16 && d > 3 && phase === "play" && m.cool <= 0) {
        launchArrow(m.x, m.y + 1, m.z, dx, 0.2, dz, false);
        m.cool = 1.5;
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
      const stride = Math.sin(elapsed * (m.kind === "slime" ? 6 : 8));
      for (let i = 0; i < m.legs.length; i++) {
        const part = m.legs[i];
        if (!part) continue;
        part.rotation.x = stride * (i % 2 === 0 ? 0.55 : -0.55);
      }
      const bounce = m.kind === "slime" ? Math.abs(stride) * (0.18 + (m.size ?? 1) * 0.22) : m.kind === "frog" ? Math.abs(stride) * 0.2 : Math.abs(stride) * 0.04;
      m.mesh.rotation.y = m.yaw;
      m.mesh.position.set(m.x, m.y + (settings.studs ? STUD_H : 0) + bounce, m.z);
    }
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
      folk: folkSpots.map((f) => ({ x: f.x, z: f.z, role: f.role })),
      village: villageAt,
      quests: quests.map((q) => ({ id: q.id, n: q.n, done: q.done })),
      skills: [...skills],
      mana,
      spell: spellIx,
      pets: mobs.filter((m) => m.kind === "wolf" && m.tame && !m.dead).map((m) => ({ x: m.x, z: m.z })),
    };
  }

  function saveWorld() {
    if (!sessionStarted) return;
    hasSaveFlag = writeWorld(
      { id: worldId || "main", seed, seedText, flat, creative, updated: Date.now() },
      packSave(),
    );
    saveDirty = false;
  }

  function beginPlay() {
    phase = "play";
    player.vx = player.vy = player.vz = 0;
    if (!sessionStarted) {
      player.yaw = orbit;
      player.pitch = -0.28;
    }
    sessionStarted = true;
    if (!touchMode) void canvas.requestPointerLock().catch(() => {});
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
        player.vy = 8.45;
        player.grounded = false;
        player.coyote = 0;
        audio.jump();
      }
    }

    const grippy = armor[3] === ID.ResinBoots;
    const onIce = def(world.get(Math.floor(player.x), Math.floor(player.y - 0.08), Math.floor(player.z))).slip && !grippy;
    const onSoul = def(world.get(Math.floor(player.x), Math.floor(player.y - 0.08), Math.floor(player.z))).slow;
    const speed =
      (flying ? (sample.sneak ? 4.5 : 12) : (sample.sneak ? 1.7 : sample.sprint ? 7.1 : 4.35) * (bodyWater ? 0.55 : 1)) *
      (onSoul ? 0.45 : 1) *
      (sample.sprint && rankLv >= 12 ? 1.12 : 1) *
      (speedT > 0 ? 1.35 : 1);
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
      if (headWater) {
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
                                  : mob.kind === "phantom"
                                    ? "Sleepless"
                                    : mob.kind === "boat"
                                      ? "Boat"
                                      : "Cart";
      if (sample.first && sample.place && !prevPlace) interactMob(mob);
      if (sample.mine && mob.cool <= 0 && mob.kind !== "boat" && mob.kind !== "cart") {
        const blade = def(hotbar[slot]);
        let dmg = blade.tool === "sword" ? 1 + blade.tier * 2 : 1;
        if (strengthT > 0) dmg += 2;
        if (sharp && blade.tool === "sword") dmg += 2;
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
          mob.kind === "dragon";
        if (skills.has("mark") && blade.tool === "sword" && hostile) dmg += 1;
        if (player.vy < -0.2 && !player.grounded) dmg = Math.ceil(dmg * 1.5);
        if (mob.kind === "dragon" && crystalsLeft() > 0) dmg = Math.max(1, Math.ceil(dmg * 0.5));
        mob.hp -= dmg;
        if (blade.tool === "sword" || blade.tool === "bow") wearHeld();
        mob.cool = 0.42;
        mob.fuse = Math.max(0, mob.fuse - 0.25);
        const len = Math.hypot(player.x - mob.x, player.z - mob.z) || 1;
        mob.x += ((mob.x - player.x) / len) * 0.4;
        mob.z += ((mob.z - player.z) / len) * 0.4;
        audio.hit();
        swing = 1;
        if (mob.hp <= 0) killMob(mob);
      }
    } else if (hit) {
      const block = def(hit.id);
      hud.targetName = block.name;
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
      }
      if (sample.first && sample.place && !prevPlace) {
        if (heldId === ID.Tome) castSpell();
        else if (heldId === ID.Bow) shootHeld();
        else if (heldId === ID.Eye) hopRealm(2);
        else if (heldId === ID.PotionHeal || heldId === ID.PotionSpeed || heldId === ID.PotionStr || heldId === ID.Focus || heldId === ID.Milk || heldId === ID.Gapple) drink(heldId);
        else if (def(heldId).food) eat();
      }
    }
    if (!hud.targetName && hotbar[slot]) {
      const id = hotbar[slot];
      const held = def(id);
      hud.targetName = held.maxUse ? held.name + " · " + (inv[id] ?? 0) + " left" : held.name;
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

  function sky(dt: number) {
    worldTime = (worldTime + dt / 200) % 1;
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
    renderer.setClearColor(fogHex, 1);
    const fog = scene.fog as THREE.Fog;
    fog.color.setHex(fogHex);
    const far = settings.radius * CS + 18;
    fog.near = far * 0.42;
    fog.far = far;
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
    sunMesh.position.set(player.x + sunX * 150, player.y + sunH * 90 + 10, player.z + 30);
    moonMesh.position.set(player.x - sunX * 150, player.y - sunH * 90 + 16, player.z - 20);
    sunMesh.visible = sunH > -0.1;
    moonMesh.visible = sunH < 0.25;
    (stars.material as THREE.PointsMaterial).opacity = Math.max(0, Math.min(1, -sunH * 1.4));
    stars.position.set(player.x, 0, player.z);
    const zenHex = sunH > 0 ? lerpHex(0x2c4a73, 0x2a6ad4, Math.min(1, sunH * 1.6)) : lerpHex(0x2c4a73, 0x030612, Math.min(1, -sunH * 1.2));
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
    camera.fov = THREE.MathUtils.lerp(camera.fov, keys.has("ControlLeft") && phase === "play" && !flying ? 80 : 72, 0.1);
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
  let prScale = 1;
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
      if (avg > 0.024 && prScale > 0.6) prScale = Math.max(0.6, prScale - 0.15);
      else if (avg < 0.0125 && prScale < 1) prScale = Math.min(1, prScale + 0.1);
      fpsAcc = 0;
      fpsFrames = 0;
      fpsWindow = 0;
    }
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    const pr = Math.min(window.devicePixelRatio || 1, touchMode ? 1.75 : 2) * prScale;
    if (w !== viewW || h !== viewH || pr !== viewPR) {
      viewW = w;
      viewH = h;
      viewPR = pr;
      renderer.setPixelRatio(pr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
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
      if (weatherIn <= 0) {
        raining = !raining && Math.random() < 0.45;
        weatherIn = raining ? 45 : 70 + Math.random() * 40;
      }
      if (raining) {
        strikeIn -= dt;
        if (strikeIn <= 0) {
          strikeIn = 11 + Math.random() * 16;
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
    renderer.render(scene, camera);

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
        if (phase === "inventory") {
          phase = "play";
          emit();
        } else if (phase === "pause") {
          phase = "play";
          player.vx = player.vz = 0;
          if (!touchMode) void canvas.requestPointerLock().catch(() => {});
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
      if (e.code === "KeyE" && (phase === "play" || phase === "inventory")) {
        if (phase === "inventory") phase = "play";
        else {
          const locked = document.pointerLockElement === canvas;
          if (locked) suppressUnlock = true;
          phase = "inventory";
          player.vx = player.vz = 0;
          if (locked) document.exitPointerLock();
        }
        emit();
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
        if (sessionStarted) saveWorld();
      }
    },
    opt,
  );
  window.addEventListener(
    "resize",
    () => {
      touchMode = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 900;
    },
    opt,
  );
  canvas.addEventListener("contextmenu", (e) => e.preventDefault(), opt);
  canvas.addEventListener(
    "mousedown",
    (e) => {
      if (phase !== "play" || touchMode) return;
      if (document.pointerLockElement !== canvas) {
        void canvas.requestPointerLock().catch(() => {});
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
    resume() {
      if (phase !== "pause") return;
      phase = "play";
      if (!touchMode) void canvas.requestPointerLock().catch(() => {});
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
      player.x = spawnPoint.x;
      player.y = spawnPoint.y + 0.2;
      player.z = spawnPoint.z;
      player.vx = player.vy = player.vz = 0;
      phase = "play";
      if (!touchMode) void canvas.requestPointerLock().catch(() => {});
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
    enchant() {
      if (!spendLevels(3)) return say("Need builder level 3");
      sharp = true;
      say("Sword rune set");
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
    brew(kind) {
      if (kind === "focus" && !gate(6)) return;
      const need = kind === "heal" ? ID.Apple : kind === "speed" ? ID.Wart : kind === "focus" ? ID.Amber : ID.Blaze;
      const out = kind === "heal" ? ID.PotionHeal : kind === "speed" ? ID.PotionSpeed : kind === "focus" ? ID.Focus : ID.PotionStr;
      if (!creative && (inv[ID.Bottle] ?? 0) < 1) return say("Need a bottle");
      if (!creative && (inv[need] ?? 0) < 1) return say("Need " + def(need).name.toLowerCase());
      if (!creative) {
        spend(ID.Bottle, 1);
        spend(need, 1);
      }
      addInv(out, 1);
      say(def(out).name);
      emit();
    },
    trade(i) {
      const offer = traderOf(traderRole).offers[i];
      if (!offer) return;
      if (!creative && (inv[offer.pay] ?? 0) < offer.pn) return say("Need " + offer.pn + " " + def(offer.pay).name.toLowerCase());
      if (!creative) spend(offer.pay, offer.pn);
      give(offer.out, offer.on);
      say("Traded");
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
    setRealistic(on) {
      settings.realistic = on;
      relight();
      persistSettings();
      emit();
    },
    setThird(on) {
      settings.third = on;
      emit();
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

function skin(
  color: number | string,
  extra: { transparent?: boolean; opacity?: number; depthWrite?: boolean; depthTest?: boolean; side?: THREE.Side } = {},
) {
  if (plasticOn) return new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0, ...extra });
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
    put(g, geoCyl(0.08, 0.08, 10), skin(0xe23b2f), 0, 0.52, -0.52, Math.PI / 2);
    const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => legBox(g, pink, 0.1, 0.22, 0.1, sx * 0.2, 0.22, sz * 0.12)));
    return { group: g, legs, bodyMat: pink };
  }
  if (kind === "chicken") {
    const white = skin(0xf7f4ee);
    const body = block(g, white, 0.32, 0.28, 0.36, 0, 0.36, 0, 2, 2);
    body.userData.skin = "body";
    put(g, geoBox(0.1, 0.08, 0.1), skin(0xe23b2f), 0, 0.54, -0.02);
    put(g, geoBox(0.08, 0.06, 0.1), skin(0xf07820), 0, 0.36, -0.24);
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
            : null;
  const built = figKind ?? beast(kind);
  if (scale !== 1) built.group.scale.multiplyScalar(scale);
  return built;
}
