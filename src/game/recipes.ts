import { ID } from "./blocks";

export type Recipe = {
  id: string;
  name: string;
  detail: string;
  need: [number, number][];
  out: number;
  n: number;
  special?: "hammer";
  shape?: number[];
  w?: number;
  h?: number;
  lvl?: number;
  skill?: string;
  cat?: "build" | "tools" | "magic" | "gear" | "food";
};

const P = ID.Planks;
const S = ID.Stick;
const C = ID.Cobble;
const I = ID.Ingot;

function r(
  id: string,
  name: string,
  detail: string,
  need: [number, number][],
  out: number,
  n: number,
  extra: Partial<Recipe> = {},
): Recipe {
  return { id, name, detail, need, out, n, ...extra };
}

export const RECIPES: Recipe[] = [
  r("planks", "Planks", "1 wood → 4", [[ID.Log, 1]], P, 4, { shape: [ID.Log], w: 1, h: 1, cat: "build" }),
  r("sticks", "Sticks", "2 planks → 4", [[P, 2]], S, 4, { shape: [P, P], w: 1, h: 2, cat: "build" }),
  r("bench", "Bench", "4 planks", [[P, 4]], ID.Bench, 1, { shape: [P, P, P, P], w: 2, h: 2, cat: "build" }),
  r("hammer", "Brick hammer", "3 stone + 2 planks", [[ID.Stone, 3], [P, 2]], 0, 1, { special: "hammer", cat: "tools" }),
  r("glass", "Windows", "2 sand → 2", [[ID.Sand, 2]], ID.Glass, 2, { cat: "build" }),
  r("pick-w", "Wood pick", "3 planks + 2 sticks", [[P, 3], [S, 2]], ID.PickW, 1, {
    shape: [P, P, P, 0, S, 0, 0, S, 0],
    w: 3,
    h: 3,
  }),
  r("pick-s", "Stone pick", "3 cobble + 2 sticks", [[C, 3], [S, 2]], ID.PickS, 1, {
    shape: [C, C, C, 0, S, 0, 0, S, 0],
    w: 3,
    h: 3,
  }),
  r("pick-i", "Iron pick", "3 ingots + 2 sticks", [[I, 3], [S, 2]], ID.PickI, 1, {
    shape: [I, I, I, 0, S, 0, 0, S, 0],
    w: 3,
    h: 3,
  }),
  r("pick-g", "Gem pick", "3 gems + 2 sticks", [[ID.Diamond, 3], [S, 2]], ID.PickG, 1),
  r("sword-w", "Wood blade", "2 planks + 1 stick", [[P, 2], [S, 1]], ID.SwordW, 1, {
    shape: [P, P, S],
    w: 1,
    h: 3,
  }),
  r("sword-s", "Stone blade", "2 cobble + 1 stick", [[C, 2], [S, 1]], ID.SwordS, 1),
  r("sword-i", "Iron blade", "2 ingots + 1 stick", [[I, 2], [S, 1]], ID.SwordI, 1),
  r("sword-g", "Gem blade", "2 gems + 1 stick", [[ID.Diamond, 2], [S, 1]], ID.SwordG, 1),
  r("axe-w", "Wood axe", "3 planks + 2 sticks", [[P, 3], [S, 2]], ID.AxeW, 1, {
    shape: [P, P, 0, P, S, 0, 0, S, 0],
    w: 3,
    h: 3,
  }),
  r("axe-i", "Iron axe", "3 ingots + 2 sticks", [[I, 3], [S, 2]], ID.AxeI, 1),
  r("shovel-w", "Wood spade", "1 plank + 2 sticks", [[P, 1], [S, 2]], ID.ShovelW, 1, {
    shape: [P, S, S],
    w: 1,
    h: 3,
  }),
  r("shovel-i", "Iron spade", "1 ingot + 2 sticks", [[I, 1], [S, 2]], ID.ShovelI, 1),
  r("hoe", "Hoe", "2 planks + 2 sticks", [[P, 2], [S, 2]], ID.Hoe, 1),
  r("torch", "Torches", "1 coal + 1 stick → 4", [[ID.Coal, 1], [S, 1]], ID.Torch, 4, {
    shape: [ID.Coal, S],
    w: 1,
    h: 2,
  }),
  r("furnace", "Kiln", "8 cobble", [[C, 8]], ID.Furnace, 1),
  r("chest", "Crate", "8 planks", [[P, 8]], ID.Chest, 1),
  r("door", "Doors", "6 planks → 3", [[P, 6]], ID.Door, 3),
  r("ladder", "Ladders", "7 sticks → 3", [[S, 7]], ID.Ladder, 3),
  r("bed", "Bunk", "3 white + 3 planks", [[ID.White, 3], [P, 3]], ID.Bed, 1),
  r("bucket", "Bucket", "3 ingots", [[I, 3]], ID.Bucket, 1),
  r("bread", "Loaf", "3 grain", [[ID.Wheat, 3]], ID.Bread, 1),
  r("block", "Iron brick", "9 ingots", [[I, 9]], ID.IronBlock, 1),
  r("ingots", "Ingots", "1 iron brick → 9", [[ID.IronBlock, 1]], I, 9),
  r("helm", "Cap", "5 ingots", [[I, 5]], ID.Helm, 1),
  r("plate", "Shell", "8 ingots", [[I, 8]], ID.PlateArmor, 1),
  r("legs", "Leg plates", "7 ingots", [[I, 7]], ID.Legs, 1),
  r("boots", "Boots", "4 ingots", [[I, 4]], ID.Boots, 1),
  r("dust", "Red dust", "1 red → 4", [[ID.Red, 1]], ID.Dust, 4),
  r("lever", "Lever", "1 stick + 1 cobble", [[S, 1], [C, 1]], ID.Lever, 1),
  r("lamp", "Lamp", "1 dust + 1 window", [[ID.Dust, 1], [ID.Glass, 1]], ID.Lamp, 1),
  r("piston", "Pusher", "1 ingot + 4 cobble + 1 dust", [[I, 1], [C, 4], [ID.Dust, 1]], ID.Piston, 1),
  r("red-torch", "Red torch", "1 dust + 1 stick", [[ID.Dust, 1], [S, 1]], ID.RedTorch, 1),
  r("repeater", "Repeater", "2 red torches + 1 dust + 3 cobble", [[ID.RedTorch, 2], [ID.Dust, 1], [C, 3]], ID.Repeater, 1),
  r("comparator", "Comparator", "1 red torch + 1 quartz + 3 cobble", [[ID.RedTorch, 1], [ID.White, 1], [C, 3]], ID.Comparator, 1),
  r("observer", "Observer", "6 cobble + 2 dust + 1 quartz", [[C, 6], [ID.Dust, 2], [ID.White, 1]], ID.Observer, 1),
  r("hard", "Kiln brick", "4 cobble + 1 coal", [[C, 4], [ID.Coal, 1]], ID.Hard, 1),
  r("tnt", "Blast brick", "4 dust + 1 blast dust", [[ID.Dust, 4], [ID.Powder, 1]], ID.TNT, 1),
  r("fence", "Fences", "6 sticks → 3", [[S, 6]], ID.Fence, 3),
  r("gate", "Gate", "4 sticks + 2 planks", [[S, 4], [P, 2]], ID.Gate, 1),
  r("sapling", "Sapling", "1 stick + 1 leaf", [[S, 1], [ID.Leaves, 1]], ID.Sapling, 1),
  r("sensor", "Plate", "2 cobble", [[C, 2]], ID.Plate, 1),
  r("rail", "Rails", "6 ingots + 1 stick → 8", [[I, 6], [S, 1]], ID.Rail, 8),
  r("obsidian", "Void bricks", "4 kiln bricks + 1 gem", [[ID.Hard, 4], [ID.Diamond, 1]], ID.Obsidian, 2),
  r("portal", "Gate void", "4 void bricks", [[ID.Obsidian, 4]], ID.Portal, 1),
  r("enchant", "Rune table", "4 void + 2 gems + 1 plank", [[ID.Obsidian, 4], [ID.Diamond, 2], [P, 1]], ID.Enchanter, 1),
  r("anvil", "Anvil", "3 iron bricks + 4 ingots", [[ID.IronBlock, 3], [I, 4]], ID.Anvil, 1),
  r("brew", "Kettle", "1 ember rod + 3 cobble", [[ID.Blaze, 1], [C, 3]], ID.Brew, 1),
  r("bow", "Bow", "3 sticks + 3 string", [[S, 3], [ID.String, 3]], ID.Bow, 1),
  r("arrow", "Arrows", "1 flint + 1 stick + 1 feather → 4", [[ID.Flint, 1], [S, 1], [ID.Feather, 1]], ID.Arrow, 4),
  r("rod", "Fishing rod", "3 sticks + 2 string", [[S, 3], [ID.String, 2]], ID.Rod, 1),
  r("shears", "Shears", "2 ingots", [[I, 2]], ID.Shears, 1),
  r("flint", "Spark", "1 iron + 1 cobble", [[I, 1], [C, 1]], ID.Flint, 1),
  r("boat", "Boat", "5 planks", [[P, 5]], ID.Boat, 1),
  r("cart", "Cart", "5 ingots", [[I, 5]], ID.Cart, 1),
  r("shield", "Shield", "1 ingot + 6 planks", [[I, 1], [P, 6]], ID.Shield, 1),
  r("eye", "Seeker eye", "1 trade gem + 1 ember rod", [[ID.Emerald, 1], [ID.Blaze, 1]], ID.Eye, 1),
  r("elytra", "Glide shell", "4 feathers + 2 string", [[ID.Feather, 4], [ID.String, 2]], ID.Elytra, 1),
  r("camp", "Campfire", "3 sticks + 1 coal", [[S, 3], [ID.Coal, 1]], ID.Campfire, 1),
  r("note", "Chime", "8 planks + 1 dust", [[P, 8], [ID.Dust, 1]], ID.Note, 1),
  r("hopper", "Funnel", "5 ingots + 1 crate", [[I, 5], [ID.Chest, 1]], ID.Hopper, 1),
  r("dispenser", "Launcher", "7 cobble + 1 bow + 1 dust", [[C, 7], [ID.Bow, 1], [ID.Dust, 1]], ID.Dispenser, 1),
  r("cookie", "Cookies", "2 grain + 1 coal", [[ID.Wheat, 2], [ID.Coal, 1]], ID.Cookie, 8),
  r("gapple", "Gold apple", "1 apple + 8 gold", [[ID.Apple, 1], [ID.Gold, 8]], ID.Gapple, 1),
  r("bottle", "Bottles", "3 windows → 3", [[ID.Glass, 3]], ID.Bottle, 3),
  r("npick", "Ember pick", "3 scrap + 1 gem pick", [[ID.Scrap, 3], [ID.PickG, 1]], ID.NetherPick, 1),
  r("bronze", "Bronze", "1 tin + 1 copper → 2", [[ID.Tin, 1], [ID.Copper, 1]], ID.Bronze, 2),
  r("pick-b", "Bronze pick", "3 bronze + 2 sticks · level 4", [[ID.Bronze, 3], [S, 2]], ID.PickBronze, 1, {
    lvl: 4,
    shape: [ID.Bronze, ID.Bronze, ID.Bronze, 0, S, 0, 0, S, 0],
    w: 3,
    h: 3,
  }),
  r("sword-b", "Bronze blade", "2 bronze + 1 stick · level 4", [[ID.Bronze, 2], [S, 1]], ID.SwordBronze, 1, {
    lvl: 4,
    shape: [ID.Bronze, ID.Bronze, S],
    w: 1,
    h: 3,
  }),
  r("axe-b", "Bronze axe", "3 bronze + 2 sticks · level 4", [[ID.Bronze, 3], [S, 2]], ID.AxeBronze, 1, { lvl: 4 }),
  r("pick-c", "Chrome pick", "3 chrome + 2 sticks · level 8", [[ID.Chrome, 3], [S, 2]], ID.PickChrome, 1, {
    lvl: 8,
    shape: [ID.Chrome, ID.Chrome, ID.Chrome, 0, S, 0, 0, S, 0],
    w: 3,
    h: 3,
  }),
  r("helm-c", "Chrome cap", "5 chrome · level 8", [[ID.Chrome, 5]], ID.HelmChrome, 1, { lvl: 8 }),
  r("chrome-brick", "Chrome brick", "9 chrome · level 8", [[ID.Chrome, 9]], ID.ChromeBrick, 1, { lvl: 8 }),
  r("sword-sapph", "Sapphire blade", "2 sapphire + 1 stick · level 12", [[ID.Sapphire, 2], [S, 1]], ID.SwordSapph, 1, {
    lvl: 12,
  }),
  r("boots-resin", "Grip boots", "4 resin · level 10", [[ID.Resin, 4]], ID.ResinBoots, 1, { lvl: 10 }),
  r("focus", "Focus brew", "1 bottle + 1 amber · level 6", [[ID.Bottle, 1], [ID.Amber, 1]], ID.Focus, 1, { lvl: 6 }),
  r("pick-prism", "Prism pick", "3 prism + 2 sticks · level 16", [[ID.Prism, 3], [S, 2]], ID.PickPrism, 1, { lvl: 16 }),
  r("shell-prism", "Prism shell", "8 prism · level 16", [[ID.Prism, 8]], ID.PlatePrism, 1, { lvl: 16 }),
  r("master", "Master brick", "prism + sapphire + chrome + resin · level 22", [[ID.Prism, 1], [ID.Sapphire, 1], [ID.Chrome, 1], [ID.Resin, 1]], ID.MasterBrick, 1, {
    lvl: 22,
  }),
  r("pick-master", "Master pick", "3 master bricks + 1 prism pick · level 22", [[ID.MasterBrick, 3], [ID.PickPrism, 1]], ID.MasterPick, 1, {
    lvl: 22,
  }),
  r("fang-blade", "Fang blade", "2 fangs + 1 bone + 1 stick · Trophy", [[ID.Fang, 2], [ID.Bone, 1], [S, 1]], ID.FangBlade, 1, {
    skill: "trophy",
    cat: "tools",
  }),
  r("fur-cap", "Fur cap", "4 fur + 1 white · Trophy", [[ID.Fur, 4], [ID.White, 1]], ID.FurCap, 1, { skill: "trophy", cat: "gear" }),
  r("scale-legs", "Scale legs", "5 scales + 2 string · Trophy", [[ID.Scale, 5], [ID.String, 2]], ID.ScaleLegs, 1, {
    skill: "trophy",
    cat: "gear",
  }),
  r("tome", "Spell tome", "1 eye + 1 wisp dust + 1 amber · Spark", [[ID.Eye, 1], [ID.Wisp, 1], [ID.Amber, 1]], ID.Tome, 1, {
    skill: "spark",
    cat: "magic",
  }),
  r("lens", "Crystal lens", "2 crystals + 1 window", [[ID.Crystal, 2], [ID.Glass, 1]], ID.Eye, 1, { cat: "magic" }),
  r("glue", "Slime cord", "1 slime + 1 string → 4 string", [[ID.Slime, 1], [ID.String, 1]], ID.String, 4, { cat: "build" }),
  r("scale-mail", "Scale mail", "6 scales + 1 slime · Trophy", [[ID.Scale, 6], [ID.Slime, 1]], ID.ScaleMail, 1, {
    skill: "trophy",
    cat: "gear",
  }),
  r("frost-cap", "Frost cap", "4 frost + 1 fur · Trophy", [[ID.Frost, 4], [ID.Fur, 1]], ID.FrostCap, 1, {
    skill: "trophy",
    cat: "gear",
  }),
  r("cinder-blade", "Cinder blade", "2 cinders + 1 fang + 1 stick · Trophy", [[ID.Cinder, 2], [ID.Fang, 1], [S, 1]], ID.CinderBlade, 1, {
    skill: "trophy",
    cat: "tools",
  }),
  r("antler-bow", "Antler bow", "2 antlers + 2 string · Trophy", [[ID.Antler, 2], [ID.String, 2]], ID.AntlerBow, 1, {
    skill: "trophy",
    cat: "tools",
  }),
  r("wax-seal", "Wax seal", "2 wax + 1 crystal · Spark", [[ID.Wax, 2], [ID.Crystal, 1]], ID.WaxSeal, 1, {
    skill: "spark",
    cat: "magic",
  }),
  r("packed-ice", "Packed ice", "4 frost shards", [[ID.Frost, 4]], ID.IceSheet, 1, { cat: "build" }),
  r("loaf", "Camp loaf", "3 grain", [[ID.Wheat, 3]], ID.Bread, 1, { cat: "food" }),
  r("cookie", "Ash cookie", "2 grain + 1 cinder", [[ID.Wheat, 2], [ID.Cinder, 1]], ID.Cookie, 4, { cat: "food" }),
  r("slices", "Pumpkin slices", "1 pumpkin → 4", [[ID.Pumpkin, 1]], ID.Slice, 4, { shape: [ID.Pumpkin], w: 1, h: 1, cat: "food" }),
  r("melon-cut", "Melon slices", "1 melon → 6", [[ID.Melon, 1]], ID.MelonCut, 6, { shape: [ID.Melon], w: 1, h: 1, cat: "food" }),
  r("honey", "Honey", "1 wax + 1 bottle", [[ID.Wax, 1], [ID.Bottle, 1]], ID.Honey, 1, {
    shape: [ID.Wax, ID.Bottle],
    w: 1,
    h: 2,
    cat: "food",
  }),
  r("stew", "Stew", "1 mushroom + 1 red cap + 1 grain", [[ID.Mushroom, 1], [ID.MushroomRed, 1], [ID.Wheat, 1]], ID.Stew, 1, {
    shape: [ID.Mushroom, ID.MushroomRed, ID.Wheat],
    w: 1,
    h: 3,
    cat: "food",
  }),
  r("pie", "Pie", "1 slice + 1 egg + 1 grain", [[ID.Slice, 1], [ID.Egg, 1], [ID.Wheat, 1]], ID.Pie, 1, {
    shape: [ID.Slice, ID.Egg, ID.Wheat],
    w: 1,
    h: 3,
    cat: "food",
  }),
  r("paper", "Paper", "3 reeds → 3", [[ID.Reed, 3]], ID.Paper, 3, { shape: [ID.Reed, ID.Reed, ID.Reed], w: 1, h: 3, cat: "build" }),
  r("book", "Book", "3 paper", [[ID.Paper, 3]], ID.Book, 1, { shape: [ID.Paper, ID.Paper, ID.Paper], w: 1, h: 3, cat: "build" }),
  r("shelf", "Shelf", "6 planks + 3 books", [[ID.Planks, 6], [ID.Book, 3]], ID.Bookshelf, 1, {
    shape: [P, P, P, ID.Book, ID.Book, ID.Book, P, P, P],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("hay", "Hay bale", "9 grain", [[ID.Wheat, 9]], ID.Hay, 1, {
    shape: [ID.Wheat, ID.Wheat, ID.Wheat, ID.Wheat, ID.Wheat, ID.Wheat, ID.Wheat, ID.Wheat, ID.Wheat],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("grain", "Grain from hay", "1 bale → 9", [[ID.Hay, 1]], ID.Wheat, 9, { shape: [ID.Hay], w: 1, h: 1, cat: "food" }),
  r("lantern", "Lantern", "1 ingot + 1 torch", [[I, 1], [ID.Torch, 1]], ID.Lantern, 1, {
    shape: [I, ID.Torch],
    w: 1,
    h: 2,
    cat: "build",
  }),
  r("compass", "Compass", "4 ingots + 1 red dust", [[I, 4], [ID.Dust, 1]], ID.Compass, 1, {
    shape: [0, I, 0, I, ID.Dust, I, 0, I, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("clock", "Clock", "4 gold + 1 red dust", [[ID.Gold, 4], [ID.Dust, 1]], ID.Clock, 1, {
    shape: [0, ID.Gold, 0, ID.Gold, ID.Dust, ID.Gold, 0, ID.Gold, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("map", "Map", "8 paper around a compass", [[ID.Paper, 8], [ID.Compass, 1]], ID.Map, 1, {
    shape: [ID.Paper, ID.Paper, ID.Paper, ID.Paper, ID.Compass, ID.Paper, ID.Paper, ID.Paper, ID.Paper],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("banner", "Banner", "6 white + 1 stick", [[ID.White, 6], [S, 1]], ID.Banner, 1, {
    shape: [ID.White, ID.White, ID.White, ID.White, ID.White, ID.White, 0, S, 0],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("lead", "Lead", "4 string + 1 slime", [[ID.String, 4], [ID.Slime, 1]], ID.Lead, 2, {
    shape: [ID.String, ID.String, 0, ID.String, ID.Slime, 0, 0, 0, ID.String],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("web", "Web", "4 string", [[ID.String, 4]], ID.Web, 1, {
    shape: [ID.String, ID.String, ID.String, ID.String],
    w: 2,
    h: 2,
    cat: "build",
  }),
  r("barrel", "Barrel", "7 planks", [[P, 7]], ID.Barrel, 1, { cat: "build" }),
];

export const SMELT: Record<number, number> = {
  [ID.RawIron]: ID.Ingot,
  [ID.IronOre]: ID.Ingot,
  [ID.Sand]: ID.Glass,
  [ID.Cobble]: ID.Stone,
  [ID.RawMeat]: ID.Cooked,
  [ID.TinOre]: ID.Tin,
  [ID.CopperOre]: ID.Copper,
  [ID.AmberOre]: ID.Amber,
  [ID.ChromeOre]: ID.Chrome,
  [ID.SapphireOre]: ID.Sapphire,
  [ID.ResinOre]: ID.Resin,
  [ID.PrismOre]: ID.Prism,
  [ID.Potato]: ID.BakedPotato,
  [ID.Fish]: ID.CookedFish,
};

export function fuelTime(id: number): number {
  if (id === ID.Coal) return 8;
  if (id === ID.Hay) return 4;
  if (id === ID.Amber) return 14;
  if (id === ID.Log) return 3;
  if (id === ID.Planks) return 1.5;
  if (id === ID.Stick) return 0.8;
  if (id === ID.Leaves) return 0.4;
  return 0;
}

const NEIGHBORS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
] as const;

export function matchGrid(cells: number[], bench: boolean): { out: number; n: number; used: boolean[] } | null {
  for (const recipe of RECIPES) {
    if (!recipe.shape || !recipe.w || !recipe.h) continue;
    if ((recipe.w > 2 || recipe.h > 2) && !bench) continue;
    const variants = [recipe.shape];
    if (recipe.w > 1) {
      const flip: number[] = [];
      for (let y = 0; y < recipe.h; y++) {
        for (let x = recipe.w - 1; x >= 0; x--) flip.push(recipe.shape[x + y * recipe.w] || 0);
      }
      variants.push(flip);
    }
    const span = bench ? 3 : 2;
    for (const shape of variants) {
      for (let oy = 0; oy <= span - recipe.h; oy++) {
        for (let ox = 0; ox <= span - recipe.w; ox++) {
          const used = Array(9).fill(false);
          let ok = true;
          for (let y = 0; y < 3 && ok; y++) {
            for (let x = 0; x < 3 && ok; x++) {
              const idx = x + y * 3;
              const inside = x >= ox && x < ox + recipe.w && y >= oy && y < oy + recipe.h;
              const expect = inside ? shape[x - ox + (y - oy) * recipe.w] || 0 : 0;
              if ((cells[idx] || 0) !== expect) ok = false;
              else if (expect) used[idx] = true;
            }
          }
          if (ok && used.some(Boolean)) return { out: recipe.out, n: recipe.n, used };
        }
      }
    }
  }
  return null;
}

export { NEIGHBORS };
