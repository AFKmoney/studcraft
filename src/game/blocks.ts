export const ID = {
  Air: 0,
  Grass: 1,
  Dirt: 2,
  Stone: 3,
  Sand: 4,
  Water: 5,
  Log: 6,
  Leaves: 7,
  Planks: 8,
  Glass: 9,
  Coal: 10,
  Gold: 11,
  Diamond: 12,
  Red: 13,
  Blue: 14,
  Yellow: 15,
  White: 16,
  Black: 17,
  Orange: 18,
  Green: 19,
  Pink: 20,
  Azure: 21,
  Bedrock: 22,
  Flower: 23,
  FlowerRed: 24,
  TallGrass: 25,
  Cobble: 26,
  IronOre: 27,
  IronBlock: 28,
  Bench: 29,
  Furnace: 30,
  Chest: 31,
  Torch: 32,
  Door: 33,
  DoorOpen: 34,
  Bed: 35,
  Farmland: 36,
  Crop: 37,
  CropRipe: 38,
  Ladder: 39,
  Lamp: 40,
  LampOn: 41,
  Dust: 42,
  Lever: 43,
  LeverOn: 44,
  Piston: 45,
  Hard: 46,
  TNT: 75,
  Fence: 76,
  Gate: 77,
  GateOpen: 78,
  Sapling: 79,
  Cactus: 80,
  Cane: 81,
  Plate: 82,
  PlateOn: 83,
  Rail: 84,
  Obsidian: 85,
  Portal: 86,
  Netherrack: 87,
  Lava: 88,
  EndStone: 89,
  EndFrame: 218,
  EndFrameEye: 219,
  DragonEgg: 220,
  EmeraldOre: 90,
  Enchanter: 91,
  Anvil: 92,
  Brew: 93,
  Ice: 94,
  Gravel: 95,
  Campfire: 96,
  Note: 97,
  Soul: 98,
  Dispenser: 99,
  Hopper: 100,
  Mud: 101,
  Moss: 102,
  Clay: 103,
  Snow: 104,
  Ash: 105,
  AshSoil: 106,
  CrystalOre: 107,
  Bloom: 108,
  Reed: 109,
  RawIron: 110,
  Ingot: 111,
  Stick: 112,
  Seeds: 113,
  Wheat: 114,
  Bucket: 115,
  WaterBucket: 116,
  Apple: 117,
  RawMeat: 118,
  Cooked: 119,
  Bread: 120,
  PickW: 121,
  PickS: 122,
  PickI: 123,
  PickG: 124,
  SwordW: 125,
  SwordS: 126,
  SwordI: 127,
  SwordG: 128,
  AxeW: 129,
  AxeI: 130,
  ShovelW: 131,
  ShovelI: 132,
  Hoe: 133,
  Helm: 134,
  PlateArmor: 135,
  Legs: 136,
  Boots: 137,
  Bow: 138,
  Arrow: 139,
  Rod: 140,
  Shears: 141,
  Bone: 142,
  Flint: 143,
  Bottle: 144,
  PotionHeal: 145,
  PotionSpeed: 146,
  PotionStr: 147,
  Fish: 148,
  Emerald: 149,
  Boat: 150,
  Cart: 151,
  Feather: 152,
  String: 153,
  Eye: 154,
  Elytra: 155,
  Totem: 156,
  Scrap: 157,
  Shield: 158,
  Milk: 159,
  Gapple: 160,
  Cookie: 161,
  Blaze: 162,
  Wart: 163,
  Powder: 164,
  Saddle: 165,
  Egg: 166,
  NetherPick: 167,
  LavaBucket: 168,
  TinOre: 47,
  CopperOre: 48,
  AmberOre: 49,
  ChromeOre: 50,
  SapphireOre: 51,
  ResinOre: 52,
  PrismOre: 53,
  Tin: 54,
  Copper: 55,
  Bronze: 56,
  Amber: 57,
  Chrome: 58,
  Sapphire: 59,
  Resin: 60,
  Prism: 61,
  MasterBrick: 62,
  PickBronze: 63,
  PickChrome: 64,
  PickPrism: 65,
  SwordBronze: 66,
  SwordSapph: 67,
  AxeBronze: 68,
  HelmChrome: 69,
  PlatePrism: 70,
  ResinBoots: 71,
  MasterPick: 72,
  ChromeBrick: 73,
  Core: 74,
  Focus: 169,
  Slime: 170,
  Fur: 171,
  Scale: 172,
  Fang: 173,
  Wisp: 174,
  Tome: 175,
  FangBlade: 176,
  FurCap: 177,
  ScaleLegs: 178,
  Crystal: 179,
  Pelt: 180,
  Shell: 181,
  Wax: 182,
  Frost: 183,
  Cinder: 184,
  Antler: 185,
  ScaleMail: 186,
  FrostCap: 187,
  CinderBlade: 188,
  AntlerBow: 189,
  WaxSeal: 190,
  IceSheet: 191,
  GravelBar: 192,
  RedTorch: 193,
  RedTorchOn: 194,
  Repeater: 195,
  Comparator: 215,
  Observer: 216,
  ObserverOn: 217,
  Pumpkin: 196,
  Melon: 197,
  Mushroom: 198,
  MushroomRed: 199,
  Hay: 200,
  Lantern: 201,
  Bookshelf: 202,
  Web: 203,
  Berry: 204,
  Barrel: 205,
  Slice: 206,
  MelonCut: 207,
  Honey: 208,
  Stew: 209,
  Pie: 210,
  Paper: 211,
  Book: 212,
  Compass: 213,
  Horn: 214,
} as const;

export type ToolKind = "" | "pick" | "axe" | "shovel" | "sword" | "hoe" | "bow";
export type WorkKind = "" | "bench" | "furnace" | "chest" | "bed" | "enchant" | "anvil" | "brew";

export type BlockDef = {
  id: number;
  name: string;
  solid: boolean;
  fluid: boolean;
  plant: boolean;
  glass: boolean;
  tough: boolean;
  placeable: boolean;
  hard: number;
  color: string;
  top: string;
  side: string;
  bottom: string;
  drop: number;
  need: number;
  tool: ToolKind;
  tier: number;
  maxUse: number;
  food: number;
  armor: number;
  armorSlot: number;
  torch: boolean;
  ladder: boolean;
  door: boolean;
  crop: boolean;
  dust: boolean;
  lever: boolean;
  work: WorkKind;
  light: number;
  boom: boolean;
  plate: boolean;
  rail: boolean;
  gate: boolean;
  portal: boolean;
  slip: boolean;
  fall: boolean;
  cactus: boolean;
  sapling: boolean;
  cane: boolean;
  note: boolean;
  slow: boolean;
};

function b(
  id: number,
  name: string,
  color: string,
  top: string,
  side: string,
  bottom: string,
  extra: Partial<BlockDef> = {},
): BlockDef {
  return {
    id,
    name,
    solid: true,
    fluid: false,
    plant: false,
    glass: false,
    tough: false,
    placeable: true,
    hard: 0.45,
    color,
    top,
    side,
    bottom,
    drop: 0,
    need: 0,
    tool: "",
    tier: 0,
    maxUse: 0,
    food: 0,
    armor: 0,
    armorSlot: 0,
    torch: false,
    ladder: false,
    door: false,
    crop: false,
    dust: false,
    lever: false,
    work: "",
    light: 0,
    boom: false,
    plate: false,
    rail: false,
    gate: false,
    portal: false,
    slip: false,
    fall: false,
    cactus: false,
    sapling: false,
    cane: false,
    note: false,
    slow: false,
    ...extra,
  };
}

export const BLOCKS: BlockDef[] = [];

function put(def: BlockDef) {
  BLOCKS[def.id] = def;
}

put(b(ID.Air, "Air", "#000000", "#000", "#000", "#000", { solid: false, placeable: false, hard: 0 }));
put(b(ID.Grass, "Grass", "#3aaa4c", "#3aaa4c", "#8d5a34", "#6d4426", { hard: 0.35 }));
put(b(ID.Dirt, "Dirt", "#8d5a34", "#8d5a34", "#7a4e2e", "#5c3a22", { hard: 0.35 }));
put(b(ID.Stone, "Stone", "#9aa1a8", "#a7aeb4", "#8e959c", "#7a8188", { hard: 1.45, tough: true }));
put(b(ID.Sand, "Sand", "#e4d0a2", "#ead7aa", "#d7c392", "#c6b07e", { hard: 0.3 }));
put(
  b(ID.Water, "Water", "#2f86d6", "#3b96e4", "#2a78c4", "#1d5fa3", {
    solid: false,
    fluid: true,
    hard: 0.15,
  }),
);
put(b(ID.Log, "Wood", "#6b3e22", "#a56b3c", "#6b3e22", "#4e2c18", { hard: 0.7 }));
put(b(ID.Leaves, "Leaf brick", "#2f8f3b", "#37a146", "#2a7d34", "#22662b", { hard: 0.25 }));
put(b(ID.Planks, "Plank", "#e0b15a", "#f0c36e", "#d7a44e", "#c09040", { hard: 0.55 }));
put(
  b(ID.Glass, "Window", "#d5f3f6", "#e7fbff", "#d5f3f6", "#c5e6ea", {
    glass: true,
    hard: 0.25,
  }),
);
put(b(ID.Coal, "Coal", "#2b2b2b", "#3a3a3a", "#2b2b2b", "#1a1a1a", { hard: 1.6, tough: true }));
put(b(ID.Gold, "Gold", "#f0c43a", "#ffd86a", "#e2b12e", "#c89620", { hard: 1.7, tough: true }));
put(b(ID.Diamond, "Aqua gem", "#3ec8c8", "#7ee0e0", "#2eb4b4", "#1e9494", { hard: 1.9, tough: true }));
put(b(ID.Red, "Red", "#e23b2f", "#f25a46", "#d43228", "#b02620", { hard: 0.5 }));
put(b(ID.Blue, "Blue", "#1f5fbf", "#3d7ad4", "#1b56b0", "#154890", { hard: 0.5 }));
put(b(ID.Yellow, "Yellow", "#f5c518", "#ffe14a", "#e6b40e", "#c8980a", { hard: 0.5 }));
put(b(ID.White, "White", "#f4f1ea", "#ffffff", "#e7e2d8", "#d4cec3", { hard: 0.5 }));
put(b(ID.Black, "Black", "#2a2a2a", "#3d3d3d", "#242424", "#141414", { hard: 0.5 }));
put(b(ID.Orange, "Orange", "#f07820", "#ff9340", "#e06818", "#c45610", { hard: 0.5 }));
put(b(ID.Green, "Green", "#2f7d3a", "#3d9a4a", "#286e32", "#1d5526", { hard: 0.5 }));
put(b(ID.Pink, "Pink", "#f2a2c0", "#ffc0d6", "#e48aaf", "#cc7098", { hard: 0.5 }));
put(b(ID.Azure, "Azure", "#5eb0e5", "#8accf5", "#4ea0d6", "#3a88be", { hard: 0.5 }));
put(
  b(ID.Bedrock, "Baseplate core", "#1a1a1a", "#2a2a2a", "#161616", "#101010", {
    placeable: false,
    hard: Number.POSITIVE_INFINITY,
    tough: true,
  }),
);
put(
  b(ID.Flower, "Yellow bloom", "#f5c518", "#f5c518", "#3aaa4c", "#3aaa4c", {
    solid: false,
    plant: true,
    hard: 0.05,
  }),
);
put(
  b(ID.FlowerRed, "Red bloom", "#e23b2f", "#e23b2f", "#3aaa4c", "#3aaa4c", {
    solid: false,
    plant: true,
    hard: 0.05,
  }),
);
put(
  b(ID.TallGrass, "Sprig", "#3aaa4c", "#3aaa4c", "#2f7d3a", "#2f7d3a", {
    solid: false,
    plant: true,
    hard: 0.05,
    drop: -1,
  }),
);

function item(
  id: number,
  name: string,
  color: string,
  extra: Partial<BlockDef> = {},
) {
  put(b(id, name, color, color, color, color, { solid: false, placeable: false, hard: 0.1, ...extra }));
}

put(b(ID.Cobble, "Cobble", "#8e959c", "#9aa1a8", "#7e868e", "#6e767e", { hard: 1.3, tough: true, need: 1 }));
put(b(ID.IronOre, "Iron ore", "#c4b49a", "#d7c6a8", "#b4532a", "#8d5a34", { hard: 1.7, tough: true, need: 2, drop: ID.RawIron }));
put(b(ID.IronBlock, "Iron brick", "#d9dde2", "#f2f4f6", "#c5ccd3", "#aeb6be", { hard: 2.2, tough: true, need: 2 }));
put(b(ID.Bench, "Bench", "#e0b15a", "#f0c36e", "#c49040", "#a07830", { hard: 0.7, work: "bench" }));
put(b(ID.Furnace, "Kiln", "#6e645c", "#8a8076", "#5c534c", "#3e3834", { hard: 1.6, tough: true, need: 1, work: "furnace" }));
put(b(ID.Chest, "Crate", "#c4924a", "#e0b15a", "#a67c3a", "#8a6428", { hard: 0.7, work: "chest" }));
put(
  b(ID.Torch, "Torch", "#f5c518", "#ffe14a", "#c47a2a", "#8d5a34", {
    solid: false,
    hard: 0.05,
    torch: true,
    light: 1,
  }),
);
put(b(ID.Door, "Door", "#c4924a", "#e0b15a", "#a67c3a", "#8a6428", { hard: 0.6, door: true, drop: ID.Door }));
put(
  b(ID.DoorOpen, "Open door", "#c4924a", "#e0b15a", "#a67c3a", "#8a6428", {
    solid: false,
    placeable: false,
    hard: 0.6,
    door: true,
    drop: ID.Door,
  }),
);
put(b(ID.Bed, "Bunk", "#e23b2f", "#f25a46", "#f4f1ea", "#c4924a", { hard: 0.4, work: "bed" }));
put(b(ID.Farmland, "Tilled", "#6d4426", "#8d5a34", "#5c3a22", "#4a2e1a", { hard: 0.3, drop: ID.Dirt }));
put(
  b(ID.Crop, "Shoots", "#8dcc4a", "#c6e86a", "#3aaa4c", "#2f7d3a", {
    solid: false,
    plant: true,
    crop: true,
    hard: 0.05,
    drop: -1,
  }),
);
put(
  b(ID.CropRipe, "Wheat", "#e6c14a", "#f5e07a", "#c4924a", "#8d7a28", {
    solid: false,
    plant: true,
    crop: true,
    hard: 0.05,
    drop: -1,
  }),
);
put(
  b(ID.Ladder, "Ladder", "#c4924a", "#e0b15a", "#a67c3a", "#8a6428", {
    solid: false,
    hard: 0.3,
    ladder: true,
  }),
);
put(b(ID.Lamp, "Lamp", "#f4f1ea", "#fff6d0", "#e7e2d8", "#d4cec3", { hard: 0.4, light: 0 }));
put(
  b(ID.LampOn, "Lit lamp", "#ffe14a", "#fff6c2", "#f5c518", "#e6b40e", {
    solid: true,
    placeable: false,
    hard: 0.4,
    light: 1,
    drop: ID.Lamp,
  }),
);
put(
  b(ID.Dust, "Red dust", "#e23b2f", "#f25a46", "#b02620", "#8a1c18", {
    solid: false,
    hard: 0.05,
    dust: true,
  }),
);
put(
  b(ID.Lever, "Lever", "#8e959c", "#c5ccd3", "#6e645c", "#4a4038", {
    solid: false,
    hard: 0.2,
    lever: true,
  }),
);
put(
  b(ID.LeverOn, "Lever on", "#f5c518", "#ffe14a", "#6e645c", "#4a4038", {
    solid: false,
    placeable: false,
    hard: 0.2,
    lever: true,
    drop: ID.Lever,
  }),
);
put(b(ID.Piston, "Pusher", "#c5ccd3", "#e7e2d8", "#c4924a", "#8e959c", { hard: 1.2, tough: true, need: 1 }));
put(b(ID.Hard, "Kiln brick", "#2a2a2a", "#3d3d3d", "#1a1a1a", "#101010", { hard: 4.5, tough: true, need: 4 }));
put(b(ID.TNT, "Blast brick", "#e23b2f", "#f4f1ea", "#e23b2f", "#2a2a2a", { hard: 0.4, boom: true }));
put(b(ID.Fence, "Fence", "#c4924a", "#e0b15a", "#a67c3a", "#8a6428", { hard: 0.6 }));
put(b(ID.Gate, "Gate", "#c4924a", "#e0b15a", "#a67c3a", "#8a6428", { hard: 0.55, gate: true, drop: ID.Gate }));
put(
  b(ID.GateOpen, "Open gate", "#c4924a", "#e0b15a", "#a67c3a", "#8a6428", {
    solid: false,
    placeable: false,
    hard: 0.55,
    gate: true,
    drop: ID.Gate,
  }),
);
put(
  b(ID.Sapling, "Sapling", "#2f7d3a", "#3aaa4c", "#6b3e22", "#3aaa4c", {
    solid: false,
    plant: true,
    sapling: true,
    hard: 0.05,
  }),
);
put(
  b(ID.Cactus, "Spikes", "#2f7d3a", "#3aaa4c", "#1d5526", "#2f7d3a", {
    solid: false,
    plant: true,
    cactus: true,
    hard: 0.25,
  }),
);
put(
  b(ID.Cane, "Cane", "#8dcc4a", "#c6e86a", "#2f7d3a", "#3aaa4c", {
    solid: false,
    plant: true,
    cane: true,
    hard: 0.05,
  }),
);
put(
  b(ID.Plate, "Plate", "#9aa1a8", "#c5ccd3", "#8e959c", "#6e767e", {
    solid: false,
    plate: true,
    hard: 0.15,
  }),
);
put(
  b(ID.PlateOn, "Plate down", "#f5c518", "#ffe14a", "#8e959c", "#6e767e", {
    solid: false,
    placeable: false,
    plate: true,
    hard: 0.15,
    drop: ID.Plate,
  }),
);
put(
  b(ID.Rail, "Rail", "#c5ccd3", "#f2f4f6", "#8e959c", "#6e767e", {
    solid: false,
    rail: true,
    hard: 0.2,
  }),
);
put(b(ID.Obsidian, "Void brick", "#2a1848", "#3d2868", "#1a1030", "#100818", { hard: 8, tough: true, need: 4 }));
put(
  b(ID.Portal, "Gate void", "#7a4ad4", "#c084fc", "#5b32a8", "#3d2278", {
    solid: false,
    glass: true,
    portal: true,
    hard: 0.2,
    light: 0.4,
  }),
);
put(b(ID.Netherrack, "Ember brick", "#8a3030", "#a84838", "#6e2424", "#4a1818", { hard: 0.5 }));
put(
  b(ID.Lava, "Magma", "#f07820", "#ffb020", "#e23b2f", "#c45610", {
    solid: false,
    fluid: true,
    placeable: false,
    hard: 0.2,
    light: 1,
  }),
);
put(b(ID.EndStone, "Pale brick", "#efe6b8", "#f7f1cc", "#ddd4a4", "#c8be8e", { hard: 1.5, tough: true, need: 1 }));
put(b(ID.EndFrame, "End frame", "#2a1848", "#3d2868", "#1a1030", "#100818", { hard: 6, tough: true, need: 4 }));
put(b(ID.EndFrameEye, "End frame (eye)", "#7a4ad4", "#c084fc", "#2a1848", "#1a1030", { hard: 6, tough: true, need: 4, drop: ID.EndFrame }));
item(ID.DragonEgg, "Dragon egg", "#1a1030");
put(b(ID.EmeraldOre, "Trade ore", "#3aaa4c", "#7dcca0", "#8e959c", "#6e767e", { hard: 1.8, tough: true, need: 3, drop: ID.Emerald }));
put(b(ID.Enchanter, "Rune table", "#2a1848", "#7a4ad4", "#6b3e22", "#c4924a", { hard: 1.2, work: "enchant" }));
put(b(ID.Anvil, "Anvil", "#6e767e", "#c5ccd3", "#4a4038", "#2a2a2a", { hard: 2, tough: true, need: 1, work: "anvil" }));
put(b(ID.Brew, "Kettle", "#6e645c", "#8a8076", "#3d2868", "#2a2a2a", { hard: 0.8, work: "brew" }));
put(b(ID.Ice, "Ice", "#d5f3f6", "#f4fbff", "#8ec8f5", "#3b96e4", { hard: 0.35, slip: true }));
put(b(ID.Gravel, "Gravel", "#7a756c", "#948e84", "#6a655c", "#524e48", { hard: 0.35, fall: true }));
put(b(ID.Campfire, "Campfire", "#f07820", "#ffe14a", "#6b3e22", "#4e2c18", { hard: 0.4, light: 1 }));
put(b(ID.Note, "Chime", "#e0b15a", "#f0c36e", "#c4924a", "#8a6428", { hard: 0.4, note: true }));
put(b(ID.Soul, "Slow sand", "#6a5848", "#8a7460", "#4a3c30", "#3a2e24", { hard: 0.4, slow: true }));
put(b(ID.Dispenser, "Launcher", "#8e959c", "#c5ccd3", "#6e645c", "#4a4038", { hard: 1.2, tough: true, need: 1 }));
put(b(ID.Hopper, "Funnel", "#6e767e", "#aeb6be", "#4a4038", "#2a2a2a", { hard: 1.4, tough: true, need: 1 }));

item(ID.RawIron, "Raw iron", "#d7c6a8");
item(ID.Ingot, "Ingot", "#d9dde2");
item(ID.Stick, "Stick", "#c4924a");
item(ID.Seeds, "Seeds", "#8dcc4a");
item(ID.Wheat, "Grain", "#e6c14a");
item(ID.Bucket, "Bucket", "#c5ccd3");
item(ID.WaterBucket, "Water bucket", "#3b96e4");
item(ID.Apple, "Apple", "#e23b2f", { food: 4 });
item(ID.RawMeat, "Raw chop", "#e08a7a", { food: 2 });
item(ID.Cooked, "Cooked chop", "#c47a2a", { food: 8 });
item(ID.Bread, "Loaf", "#e0b15a", { food: 6 });

function gear(id: number, name: string, color: string, tool: ToolKind, tier: number, uses: number) {
  item(id, name, color, { tool, tier, maxUse: uses });
}
gear(ID.PickW, "Wood pick", "#c4924a", "pick", 1, 40);
gear(ID.PickS, "Stone pick", "#8e959c", "pick", 2, 80);
gear(ID.PickI, "Iron pick", "#d9dde2", "pick", 3, 160);
gear(ID.PickG, "Gem pick", "#3ec8c8", "pick", 4, 400);
gear(ID.SwordW, "Wood blade", "#c4924a", "sword", 1, 40);
gear(ID.SwordS, "Stone blade", "#8e959c", "sword", 2, 80);
gear(ID.SwordI, "Iron blade", "#d9dde2", "sword", 3, 160);
gear(ID.SwordG, "Gem blade", "#3ec8c8", "sword", 4, 400);
gear(ID.AxeW, "Wood axe", "#a67c3a", "axe", 1, 40);
gear(ID.AxeI, "Iron axe", "#b8c0c8", "axe", 3, 160);
gear(ID.ShovelW, "Wood spade", "#d7b07a", "shovel", 1, 40);
gear(ID.ShovelI, "Iron spade", "#c5ccd3", "shovel", 3, 160);
gear(ID.Hoe, "Hoe", "#8d6a3a", "hoe", 1, 80);

function wear(id: number, name: string, color: string, slot: number) {
  item(id, name, color, { armor: slot === 2 ? 0.18 : 0.1, armorSlot: slot });
}
wear(ID.Helm, "Cap", "#d9dde2", 1);
wear(ID.PlateArmor, "Shell", "#c5ccd3", 2);
wear(ID.Legs, "Leg plates", "#aeb6be", 3);
wear(ID.Boots, "Boots", "#8e959c", 4);
item(ID.Bow, "Bow", "#c4924a", { tool: "bow" as ToolKind, tier: 1, maxUse: 80 });
item(ID.Arrow, "Arrow", "#d9dde2");
item(ID.Rod, "Rod", "#6b3e22", { maxUse: 40 });
item(ID.Shears, "Shears", "#c5ccd3", { maxUse: 80 });
item(ID.Bone, "Bone", "#f4f1ea");
item(ID.Flint, "Spark", "#f07820", { maxUse: 40 });
item(ID.Bottle, "Bottle", "#d5f3f6");
item(ID.PotionHeal, "Mend brew", "#e23b2f", { food: 0 });
item(ID.PotionSpeed, "Dash brew", "#f5c518");
item(ID.PotionStr, "Might brew", "#f07820");
item(ID.Fish, "Fish", "#e08a7a", { food: 4 });
item(ID.Emerald, "Trade gem", "#3aaa4c");
item(ID.Boat, "Boat", "#c4924a");
item(ID.Cart, "Cart", "#8e959c");
item(ID.Feather, "Feather", "#f4f1ea");
item(ID.String, "String", "#f4f1ea");
item(ID.Eye, "Seeker eye", "#7a4ad4");
item(ID.Elytra, "Glide shell", "#5eb0e5");
item(ID.Totem, "Last stud", "#f0c43a");
item(ID.Scrap, "Ember scrap", "#6e2424");
item(ID.Shield, "Shield", "#c4924a", { maxUse: 120 });
item(ID.Milk, "Milk", "#f4f1ea");
item(ID.Gapple, "Gold apple", "#f0c43a", { food: 8 });
item(ID.Cookie, "Cookie", "#c4924a", { food: 2 });
item(ID.Blaze, "Ember rod", "#f07820");
item(ID.Wart, "Wart", "#a84838");
item(ID.Powder, "Blast dust", "#2a2a2a");
item(ID.Saddle, "Saddle", "#8d5a34");
item(ID.Egg, "Egg", "#f4f1ea", { food: 2 });
gear(ID.NetherPick, "Ember pick", "#6e2424", "pick", 5, 600);
item(ID.LavaBucket, "Magma bucket", "#f07820");

put(b(ID.TinOre, "Tin ore", "#b7c4b0", "#d5ddd0", "#8e959c", "#6e767e", { hard: 1.5, tough: true, need: 1 }));
put(b(ID.CopperOre, "Copper ore", "#c46a32", "#e07a3d", "#8e959c", "#6e767e", { hard: 1.55, tough: true, need: 1 }));
put(b(ID.AmberOre, "Amber ore", "#e6a322", "#ffbf3a", "#8e959c", "#6e767e", { hard: 1.7, tough: true, need: 2 }));
put(b(ID.ChromeOre, "Chrome ore", "#9aa8b2", "#e8eef2", "#7a8188", "#5c646c", { hard: 1.9, tough: true, need: 3 }));
put(b(ID.SapphireOre, "Sapphire ore", "#1a3a8a", "#2456d6", "#8e959c", "#6e767e", { hard: 2, tough: true, need: 3 }));
put(b(ID.ResinOre, "Resin ore", "#5a1848", "#c43a8a", "#3a1028", "#2a0c1c", { hard: 1.8, tough: true, need: 3 }));
put(b(ID.PrismOre, "Prism ore", "#b48cff", "#f4e8ff", "#6e5a9a", "#3a2858", { hard: 2.4, tough: true, need: 4 }));
put(b(ID.MasterBrick, "Master brick", "#f5c518", "#ffe14a", "#e23b2f", "#b02620", { hard: 5, tough: true, need: 4 }));
put(b(ID.ChromeBrick, "Chrome brick", "#d5dee6", "#f4f7fa", "#b7c4ce", "#8e9aa6", { hard: 2.4, tough: true, need: 3 }));
item(ID.Tin, "Tin", "#d5ddd0");
item(ID.Copper, "Copper", "#e07a3d");
item(ID.Bronze, "Bronze", "#cd7f32");
item(ID.Amber, "Amber", "#ffbf3a");
item(ID.Chrome, "Chrome", "#e8eef2");
item(ID.Sapphire, "Sapphire", "#2456d6");
item(ID.Resin, "Resin", "#c43a8a");
item(ID.Prism, "Prism", "#f4e8ff");
item(ID.Core, "Stud core", "#ffe14a", { food: 4 });
item(ID.Focus, "Focus brew", "#ffbf3a");
gear(ID.PickBronze, "Bronze pick", "#cd7f32", "pick", 3, 220);
gear(ID.PickChrome, "Chrome pick", "#e8eef2", "pick", 4, 320);
gear(ID.PickPrism, "Prism pick", "#b48cff", "pick", 5, 700);
gear(ID.MasterPick, "Master pick", "#f5c518", "pick", 6, 1000);
gear(ID.SwordBronze, "Bronze blade", "#cd7f32", "sword", 3, 200);
gear(ID.SwordSapph, "Sapphire blade", "#2456d6", "sword", 5, 360);
gear(ID.AxeBronze, "Bronze axe", "#a86b28", "axe", 3, 200);
wear(ID.HelmChrome, "Chrome cap", "#e8eef2", 1);
wear(ID.PlatePrism, "Prism shell", "#b48cff", 2);
wear(ID.ResinBoots, "Grip boots", "#c43a8a", 4);
BLOCKS[ID.HelmChrome].armor = 0.16;
BLOCKS[ID.PlatePrism].armor = 0.26;
BLOCKS[ID.ResinBoots].armor = 0.12;

put(b(ID.Mud, "Mud", "#4a3424", "#5c4030", "#3a2818", "#2a1c12", { hard: 0.4 }));
put(b(ID.Moss, "Moss", "#2f6a32", "#3f8a44", "#4a3428", "#3a281c", { hard: 0.4 }));
put(b(ID.Clay, "Clay", "#b7a090", "#d2c2b0", "#a09080", "#8a7868", { hard: 0.45 }));
put(b(ID.Snow, "Snow", "#f4f7fb", "#ffffff", "#e4eaf2", "#d0d8e4", { hard: 0.25 }));
put(b(ID.Ash, "Ash brick", "#c45a32", "#e07a48", "#a84828", "#7a3018", { hard: 0.7, tough: true }));
put(b(ID.AshSoil, "Ash soil", "#a84828", "#c45a32", "#6a3018", "#4a2010", { hard: 0.4 }));
put(b(ID.CrystalOre, "Crystal ore", "#d8c8ff", "#f4e8ff", "#8e959c", "#6e767e", { hard: 1.8, tough: true, need: 2, drop: ID.Crystal }));
put(
  b(ID.Bloom, "Bloom", "#f2a2c0", "#ffc0d6", "#3aaa4c", "#2f7d3a", {
    solid: false,
    plant: true,
    hard: 0.05,
    drop: -1,
  }),
);
put(
  b(ID.Reed, "Reed", "#6a8a3a", "#c6e86a", "#3a5a22", "#2a4018", {
    solid: false,
    plant: true,
    hard: 0.05,
  }),
);
item(ID.Slime, "Slime", "#3aaa4c");
item(ID.Fur, "Fur", "#c47a2a");
item(ID.Scale, "Scale", "#3b96e4");
item(ID.Fang, "Fang", "#f4f1ea");
item(ID.Wisp, "Wisp dust", "#b48cff");
item(ID.Tome, "Spell tome", "#7a4ad4");
item(ID.Crystal, "Crystal", "#f4e8ff");
item(ID.Pelt, "Pelt", "#8d5a34");
item(ID.Shell, "Shell chip", "#f4e0c0");
item(ID.Wax, "Wax", "#f0c040");
item(ID.Frost, "Frost shard", "#c8e8ff");
item(ID.Cinder, "Cinder", "#e23b2f");
item(ID.Antler, "Antler", "#e8d0a8");
item(ID.IceSheet, "Packed ice", "#d6e8f4");
item(ID.GravelBar, "Pebble", "#9a9084");
gear(ID.FangBlade, "Fang blade", "#f4f1ea", "sword", 4, 280);
gear(ID.CinderBlade, "Cinder blade", "#e23b2f", "sword", 4, 260);
gear(ID.AntlerBow, "Antler bow", "#e8d0a8", "bow", 2, 240);
wear(ID.FurCap, "Fur cap", "#c47a2a", 1);
wear(ID.ScaleLegs, "Scale legs", "#3b96e4", 3);
wear(ID.ScaleMail, "Scale mail", "#3b96e4", 2);
wear(ID.FrostCap, "Frost cap", "#c8e8ff", 1);
item(ID.WaxSeal, "Wax seal", "#f0c040");
BLOCKS[ID.FurCap].armor = 0.14;
BLOCKS[ID.ScaleLegs].armor = 0.16;
BLOCKS[ID.ScaleMail].armor = 0.22;
BLOCKS[ID.FrostCap].armor = 0.18;

BLOCKS[ID.Stone].drop = ID.Cobble;
BLOCKS[ID.Stone].need = 1;
BLOCKS[ID.Grass].drop = ID.Dirt;
BLOCKS[ID.Leaves].drop = -1;
BLOCKS[ID.Coal].need = 1;
BLOCKS[ID.Gold].need = 2;
BLOCKS[ID.Gold].drop = ID.Gold;
BLOCKS[ID.Diamond].need = 3;
BLOCKS[ID.Sand].fall = true;

put(
  b(ID.RedTorch, "Red torch", "#e23b2f", "#f25a46", "#6b3e22", "#4e2c18", {
    solid: false,
    hard: 0.05,
    torch: true,
  }),
);
put(
  b(ID.RedTorchOn, "Lit red torch", "#ff5a4a", "#ffe14a", "#e23b2f", "#6b3e22", {
    solid: false,
    placeable: false,
    hard: 0.05,
    torch: true,
    light: 0.55,
    drop: ID.RedTorch,
  }),
);
put(
  b(ID.Repeater, "Repeater", "#8e959c", "#e23b2f", "#6e645c", "#4a4038", {
    solid: false,
    hard: 0.2,
    dust: true,
  }),
);
put(
  b(ID.Comparator, "Comparator", "#8e959c", "#e23b2f", "#4a4038", "#2a2218", {
    solid: false,
    hard: 0.2,
    dust: true,
  }),
);
put(
  b(ID.Observer, "Observer", "#6e767e", "#c5ccd3", "#4a4038", "#2a2218", {
    hard: 0.4,
    solid: true,
  }),
);
put(
  b(ID.ObserverOn, "Observer pulse", "#f5c518", "#ffe14a", "#4a4038", "#2a2218", {
    hard: 0.4,
    solid: true,
    drop: ID.Observer,
  }),
);
put(b(ID.Pumpkin, "Pumpkin", "#e07a20", "#f07820", "#c45a10", "#8d3e08", { hard: 0.45 }));
put(b(ID.Melon, "Melon", "#3aaa4c", "#2f7d3a", "#c45a32", "#8d3e18", { hard: 0.5 }));
put(
  b(ID.Mushroom, "Mushroom", "#e8d8c8", "#f4f1ea", "#e23b2f", "#8d5a34", {
    solid: false,
    plant: true,
    hard: 0.05,
  }),
);
put(
  b(ID.MushroomRed, "Red cap", "#e23b2f", "#f25a46", "#f4f1ea", "#8d5a34", {
    solid: false,
    plant: true,
    hard: 0.05,
  }),
);
put(b(ID.Hay, "Hay bale", "#e6c14a", "#f5e07a", "#c4924a", "#8d6a28", { hard: 0.4 }));
put(
  b(ID.Lantern, "Lantern", "#f0c43a", "#ffe14a", "#c47a2a", "#6e645c", {
    solid: false,
    hard: 0.2,
    torch: true,
    light: 1,
  }),
);
put(b(ID.Bookshelf, "Shelf", "#c4924a", "#e0b15a", "#8d3e18", "#6b3e22", { hard: 0.7, note: true }));
put(
  b(ID.Web, "Web", "#f4f1ea", "#ffffff", "#d9dde2", "#c5ccd3", {
    solid: false,
    plant: true,
    hard: 0.25,
    drop: ID.String,
  }),
);
put(
  b(ID.Berry, "Berry bush", "#e23b2f", "#f25a46", "#2f7d3a", "#1d5526", {
    solid: false,
    plant: true,
    hard: 0.05,
  }),
);
put(b(ID.Barrel, "Barrel", "#8d5a34", "#a56b3c", "#6b3e22", "#4e2c18", { hard: 0.7, work: "chest" }));
item(ID.Slice, "Pumpkin slice", "#f07820", { food: 3 });
item(ID.MelonCut, "Melon slice", "#e23b2f", { food: 2 });
item(ID.Honey, "Honey", "#f0c43a", { food: 5 });
item(ID.Stew, "Stew", "#c45a32", { food: 8 });
item(ID.Pie, "Pie", "#e0b15a", { food: 8 });
item(ID.Paper, "Paper", "#f4f1ea");
item(ID.Book, "Book", "#8d3e18");
item(ID.Compass, "Compass", "#e23b2f");
item(ID.Horn, "Horn", "#e8d0a8");

export function def(id: number): BlockDef {
  return BLOCKS[id] ?? BLOCKS[ID.Air];
}

export const ATLAS_COLS = 16;
export const ATLAS_ROWS = 32;
export const TILE = 128;

const TILE_OF = new Uint16Array(512);
let tileSlot = 0;
for (let id = 1; id < BLOCKS.length; id++) {
  const block = BLOCKS[id];
  if (!block) continue;
  const drawn =
    block.placeable ||
    block.fluid ||
    block.solid ||
    block.plant ||
    block.glass ||
    block.torch ||
    block.dust ||
    block.lever ||
    block.door ||
    block.gate ||
    block.plate ||
    block.rail ||
    block.cactus ||
    block.ladder;
  if (!drawn) continue;
  TILE_OF[id] = ++tileSlot;
}

export function faceTile(id: number, face: 0 | 1 | 2 | 3): number {
  return (TILE_OF[id] || 0) * 4 + face;
}

export const CATALOG = [
  ID.Grass,
  ID.Dirt,
  ID.Stone,
  ID.Cobble,
  ID.Sand,
  ID.Mud,
  ID.Moss,
  ID.Clay,
  ID.Snow,
  ID.Ash,
  ID.AshSoil,
  ID.CrystalOre,
  ID.Log,
  ID.Leaves,
  ID.Planks,
  ID.Glass,
  ID.Water,
  ID.Coal,
  ID.IronOre,
  ID.Gold,
  ID.Diamond,
  ID.TinOre,
  ID.CopperOre,
  ID.AmberOre,
  ID.ChromeOre,
  ID.SapphireOre,
  ID.ResinOre,
  ID.PrismOre,
  ID.Tin,
  ID.Copper,
  ID.Bronze,
  ID.Amber,
  ID.Chrome,
  ID.Sapphire,
  ID.Resin,
  ID.Prism,
  ID.Core,
  ID.MasterBrick,
  ID.ChromeBrick,
  ID.PickBronze,
  ID.PickChrome,
  ID.PickPrism,
  ID.MasterPick,
  ID.SwordBronze,
  ID.SwordSapph,
  ID.AxeBronze,
  ID.HelmChrome,
  ID.PlatePrism,
  ID.ResinBoots,
  ID.Focus,
  ID.Slime,
  ID.Fur,
  ID.Scale,
  ID.Fang,
  ID.Wisp,
  ID.Crystal,
  ID.Tome,
  ID.FangBlade,
  ID.FurCap,
  ID.ScaleLegs,
  ID.Pelt,
  ID.Shell,
  ID.Wax,
  ID.Frost,
  ID.Cinder,
  ID.Antler,
  ID.ScaleMail,
  ID.FrostCap,
  ID.CinderBlade,
  ID.AntlerBow,
  ID.WaxSeal,
  ID.IceSheet,
  ID.GravelBar,
  ID.IronBlock,
  ID.Bench,
  ID.Furnace,
  ID.Chest,
  ID.Torch,
  ID.Door,
  ID.Bed,
  ID.Ladder,
  ID.Lamp,
  ID.Dust,
  ID.Lever,
  ID.Piston,
  ID.RedTorch,
  ID.Repeater,
  ID.Comparator,
  ID.Observer,
  ID.Hard,
  ID.Farmland,
  ID.Red,
  ID.Orange,
  ID.Yellow,
  ID.Green,
  ID.Blue,
  ID.Azure,
  ID.Pink,
  ID.White,
  ID.Black,
  ID.Flower,
  ID.FlowerRed,
  ID.TallGrass,
  ID.Stick,
  ID.Ingot,
  ID.Seeds,
  ID.Apple,
  ID.Bread,
  ID.Cooked,
  ID.PickW,
  ID.PickS,
  ID.PickI,
  ID.PickG,
  ID.SwordW,
  ID.SwordI,
  ID.AxeW,
  ID.ShovelW,
  ID.Hoe,
  ID.Bucket,
  ID.Helm,
  ID.PlateArmor,
  ID.Bow,
  ID.Arrow,
  ID.Rod,
  ID.Shears,
  ID.Flint,
  ID.Boat,
  ID.Cart,
  ID.Shield,
  ID.TNT,
  ID.Fence,
  ID.Gate,
  ID.Sapling,
  ID.Rail,
  ID.Obsidian,
  ID.Portal,
  ID.EndFrame,
  ID.DragonEgg,
  ID.Enchanter,
  ID.Anvil,
  ID.Brew,
  ID.Campfire,
  ID.Ice,
  ID.Gravel,
  ID.Pumpkin,
  ID.Melon,
  ID.Mushroom,
  ID.MushroomRed,
  ID.Hay,
  ID.Lantern,
  ID.Bookshelf,
  ID.Web,
  ID.Berry,
  ID.Barrel,
  ID.Slice,
  ID.MelonCut,
  ID.Honey,
  ID.Stew,
  ID.Pie,
  ID.Paper,
  ID.Book,
  ID.Compass,
  ID.Horn,
];

export const COLORS = [ID.Red, ID.Orange, ID.Yellow, ID.Green, ID.Blue, ID.Azure, ID.Pink, ID.White, ID.Black];

export const CREATIVE_BAR = [
  ID.Grass,
  ID.Dirt,
  ID.Cobble,
  ID.Planks,
  ID.Log,
  ID.Glass,
  ID.Torch,
  ID.Bench,
  ID.Furnace,
];
