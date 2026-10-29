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
  cat?: "build" | "tools" | "magic" | "gear" | "food" | "redstone";
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
  r("slab-planks", "Plank slab", "3 planks → 6", [[P, 3]], ID.SlabPlanks, 6, { shape: [P, P, P], w: 3, h: 1, cat: "build" }),
  r("slab-stone", "Stone slab", "3 stone → 6", [[ID.Stone, 3]], ID.SlabStone, 6, { shape: [ID.Stone, ID.Stone, ID.Stone], w: 3, h: 1, cat: "build" }),
  r("slab-cobble", "Cobble slab", "3 cobble → 6", [[C, 3]], ID.SlabCobble, 6, { shape: [C, C, C], w: 3, h: 1, cat: "build" }),
  r("slab-ash", "Ash slab", "3 ash brick → 6", [[ID.Ash, 3]], ID.SlabAsh, 6, { shape: [ID.Ash, ID.Ash, ID.Ash], w: 3, h: 1, cat: "build" }),
  r("slab-white", "White slab", "3 white → 6", [[ID.White, 3]], ID.SlabWhite, 6, { shape: [ID.White, ID.White, ID.White], w: 3, h: 1, cat: "build" }),
  r("stairs-planks", "Plank stairs", "6 planks → 4", [[P, 6]], ID.StairsPlanks0, 4, { shape: [P, 0, 0, P, P, 0, P, P, P], w: 3, h: 3, cat: "build" }),
  r("stairs-stone", "Stone stairs", "6 stone → 4", [[ID.Stone, 6]], ID.StairsStone0, 4, { shape: [ID.Stone, 0, 0, ID.Stone, ID.Stone, 0, ID.Stone, ID.Stone, ID.Stone], w: 3, h: 3, cat: "build" }),
  r("stairs-cobble", "Cobble stairs", "6 cobble → 4", [[C, 6]], ID.StairsCobble0, 4, { shape: [C, 0, 0, C, C, 0, C, C, C], w: 3, h: 3, cat: "build" }),
  r("sign", "Sign", "6 planks + stick → 3", [[P, 6], [S, 1]], ID.Sign, 3, { shape: [P, P, P, P, P, P, 0, S, 0], w: 3, h: 3, cat: "build" }),
  r("hammer", "Brick hammer", "3 stone + 2 planks", [[ID.Stone, 3], [P, 2]], 0, 1, { special: "hammer", cat: "tools" }),
  r("basalt", "Basalt brick", "4 stone → 4", [[ID.Stone, 4]], ID.Basalt, 4, { shape: [ID.Stone, ID.Stone, ID.Stone, ID.Stone], w: 2, h: 2, cat: "build" }),
  r("calcite", "Calcite brick", "4 sand → 4", [[ID.Sand, 4]], ID.Calcite, 4, { shape: [ID.Sand, ID.Sand, ID.Sand, ID.Sand], w: 2, h: 2, cat: "build" }),
  r("tuff", "Tuff brick", "4 cobble → 4", [[ID.Cobble, 4]], ID.Tuff, 4, { shape: [C, C, C, C], w: 2, h: 2, cat: "build" }),
  r("pick-w", "Wood pick", "3 planks + 2 sticks", [[P, 3], [S, 2]], ID.PickW, 1, {
    shape: [P, P, P, 0, S, 0, 0, S, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("pick-s", "Stone pick", "3 cobble + 2 sticks", [[C, 3], [S, 2]], ID.PickS, 1, {
    shape: [C, C, C, 0, S, 0, 0, S, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("pick-i", "Iron pick", "3 ingots + 2 sticks", [[I, 3], [S, 2]], ID.PickI, 1, {
    shape: [I, I, I, 0, S, 0, 0, S, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("pick-g", "Gem pick", "3 gems + 2 sticks", [[ID.Diamond, 3], [S, 2]], ID.PickG, 1, {
    shape: [ID.Diamond, ID.Diamond, ID.Diamond, 0, S, 0, 0, S, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("sword-w", "Wood blade", "2 planks + 1 stick", [[P, 2], [S, 1]], ID.SwordW, 1, {
    shape: [P, P, S],
    w: 1,
    h: 3,
    cat: "tools",
  }),
  r("sword-s", "Stone blade", "2 cobble + 1 stick", [[C, 2], [S, 1]], ID.SwordS, 1, {
    shape: [C, C, S],
    w: 1,
    h: 3,
    cat: "tools",
  }),
  r("sword-i", "Iron blade", "2 ingots + 1 stick", [[I, 2], [S, 1]], ID.SwordI, 1, {
    shape: [I, I, S],
    w: 1,
    h: 3,
    cat: "tools",
  }),
  r("sword-g", "Gem blade", "2 gems + 1 stick", [[ID.Diamond, 2], [S, 1]], ID.SwordG, 1, {
    shape: [ID.Diamond, ID.Diamond, S],
    w: 1,
    h: 3,
    cat: "tools",
  }),
  r("axe-w", "Wood axe", "3 planks + 2 sticks", [[P, 3], [S, 2]], ID.AxeW, 1, {
    shape: [P, P, 0, P, S, 0, 0, S, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("axe-i", "Iron axe", "3 ingots + 2 sticks", [[I, 3], [S, 2]], ID.AxeI, 1, {
    shape: [I, I, 0, I, S, 0, 0, S, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("shovel-w", "Wood spade", "1 plank + 2 sticks", [[P, 1], [S, 2]], ID.ShovelW, 1, {
    shape: [P, S, S],
    w: 1,
    h: 3,
    cat: "tools",
  }),
  r("shovel-i", "Iron spade", "1 ingot + 2 sticks", [[I, 1], [S, 2]], ID.ShovelI, 1, {
    shape: [I, S, S],
    w: 1,
    h: 3,
    cat: "tools",
  }),
  r("hoe", "Hoe", "2 planks + 2 sticks", [[P, 2], [S, 2]], ID.Hoe, 1, {
    shape: [P, P, 0, 0, S, 0, 0, S, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("torch", "Torches", "1 coal + 1 stick → 4", [[ID.Coal, 1], [S, 1]], ID.Torch, 4, {
    shape: [ID.Coal, S],
    w: 1,
    h: 2,
    cat: "build",
  }),
  r("furnace", "Kiln", "8 cobble", [[C, 8]], ID.Furnace, 1, {
    shape: [C, C, C, C, 0, C, C, C, C],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("chest", "Crate", "8 planks", [[P, 8]], ID.Chest, 1, {
    shape: [P, P, P, P, 0, P, P, P, P],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("door", "Doors", "6 planks → 3", [[P, 6]], ID.Door, 3, {
    shape: [P, P, P, P, P, P],
    w: 2,
    h: 3,
    cat: "build",
  }),
  r("ladder", "Ladders", "7 sticks → 3", [[S, 7]], ID.Ladder, 3, {
    shape: [S, 0, S, S, S, S, S, 0, S],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("bed", "Bunk", "3 white + 3 planks", [[ID.White, 3], [P, 3]], ID.Bed, 1, {
    shape: [ID.White, ID.White, ID.White, P, P, P],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("bucket", "Bucket", "3 ingots", [[I, 3]], ID.Bucket, 1, {
    shape: [I, 0, I, 0, I, 0],
    w: 3,
    h: 2,
    cat: "tools",
  }),
  r("bread", "Loaf", "3 grain", [[ID.Wheat, 3]], ID.Bread, 1, {
    shape: [ID.Wheat, ID.Wheat, ID.Wheat],
    w: 3,
    h: 1,
    cat: "food",
  }),
  r("block", "Iron brick", "9 ingots", [[I, 9]], ID.IronBlock, 1, {
    shape: [I, I, I, I, I, I, I, I, I],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("ingots", "Ingots", "1 iron brick → 9", [[ID.IronBlock, 1]], I, 9, {
    shape: [ID.IronBlock],
    w: 1,
    h: 1,
    cat: "build",
  }),
  r("helm", "Cap", "5 ingots", [[I, 5]], ID.Helm, 1, {
    shape: [I, I, I, I, 0, I],
    w: 3,
    h: 2,
    cat: "gear",
  }),
  r("plate", "Shell", "8 ingots", [[I, 8]], ID.PlateArmor, 1, {
    shape: [I, 0, I, I, I, I, I, I, I],
    w: 3,
    h: 3,
    cat: "gear",
  }),
  r("legs", "Leg plates", "7 ingots", [[I, 7]], ID.Legs, 1, {
    shape: [I, I, I, I, 0, I, I, 0, I],
    w: 3,
    h: 3,
    cat: "gear",
  }),
  r("boots", "Boots", "4 ingots", [[I, 4]], ID.Boots, 1, {
    shape: [I, 0, I, I, 0, I],
    w: 3,
    h: 2,
    cat: "gear",
  }),
  r("cap-leather", "Leather cap", "5 pelts", [[ID.Pelt, 5]], ID.HelmLeather, 1, { shape: [ID.Pelt, ID.Pelt, ID.Pelt, ID.Pelt, 0, ID.Pelt], w: 3, h: 2, cat: "gear" }),
  r("shell-leather", "Leather shell", "8 pelts", [[ID.Pelt, 8]], ID.ChestLeather, 1, { shape: [ID.Pelt, 0, ID.Pelt, ID.Pelt, ID.Pelt, ID.Pelt, ID.Pelt, ID.Pelt, ID.Pelt], w: 3, h: 3, cat: "gear" }),
  r("legs-leather", "Leather legs", "7 pelts", [[ID.Pelt, 7]], ID.LegsLeather, 1, { shape: [ID.Pelt, ID.Pelt, ID.Pelt, ID.Pelt, 0, ID.Pelt, ID.Pelt, 0, ID.Pelt], w: 3, h: 3, cat: "gear" }),
  r("boots-leather", "Leather boots", "4 pelts", [[ID.Pelt, 4]], ID.BootsLeather, 1, { shape: [ID.Pelt, 0, ID.Pelt, ID.Pelt, 0, ID.Pelt], w: 3, h: 2, cat: "gear" }),
  r("dust", "Red dust", "1 red → 4", [[ID.Red, 1]], ID.Dust, 4, { shape: [ID.Red], w: 1, h: 1, cat: "build" }),
  r("lever", "Lever", "1 stick + 1 cobble", [[S, 1], [C, 1]], ID.Lever, 1, { shape: [S, C], w: 1, h: 2, cat: "build" }),
  r("lamp", "Lamp", "1 dust + 1 window", [[ID.Dust, 1], [ID.Glass, 1]], ID.Lamp, 1, { shape: [ID.Dust, ID.Glass], w: 1, h: 2, cat: "build" }),
  r("piston", "Pusher", "1 ingot + 4 cobble + 1 dust", [[I, 1], [C, 4], [ID.Dust, 1]], ID.Piston, 1, {
    shape: [C, I, C, C, ID.Dust, C],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("red-torch", "Red torch", "1 dust + 1 stick", [[ID.Dust, 1], [S, 1]], ID.RedTorch, 1, { shape: [ID.Dust, S], w: 1, h: 2, cat: "build" }),
  r("repeater", "Repeater", "2 red torches + 1 dust + 3 cobble", [[ID.RedTorch, 2], [ID.Dust, 1], [C, 3]], ID.Repeater, 1, {
    shape: [ID.RedTorch, ID.Dust, ID.RedTorch, C, C, C],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("comparator", "Comparator", "1 red torch + 1 quartz + 3 cobble", [[ID.RedTorch, 1], [ID.White, 1], [C, 3]], ID.Comparator, 1, {
    shape: [0, ID.RedTorch, 0, ID.White, 0, 0, C, C, C],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("observer", "Observer", "6 cobble + 2 dust + 1 quartz", [[C, 6], [ID.Dust, 2], [ID.White, 1]], ID.Observer, 1, {
    shape: [C, C, C, ID.Dust, ID.Dust, ID.White, C, C, C],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("hard", "Kiln brick", "4 cobble + 1 coal", [[C, 4], [ID.Coal, 1]], ID.Hard, 1, { cat: "build" }),
  r("tnt", "Blast brick", "5 blast dust + 4 sand", [[ID.Powder, 5], [ID.Sand, 4]], ID.TNT, 1, {
    shape: [ID.Powder, ID.Sand, ID.Powder, ID.Sand, ID.Powder, ID.Sand, ID.Powder, ID.Sand, ID.Powder],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("fence", "Fences", "6 sticks → 3", [[S, 6]], ID.Fence, 3, {
    shape: [S, S, S, S, S, S],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("gate", "Gate", "4 sticks + 2 planks", [[S, 4], [P, 2]], ID.Gate, 1, {
    shape: [S, P, S, S, P, S],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("sapling", "Sapling", "1 stick + 1 leaf", [[S, 1], [ID.Leaves, 1]], ID.Sapling, 1, { shape: [ID.Leaves, S], w: 1, h: 2, cat: "build" }),
  r("sensor", "Plate", "2 cobble", [[C, 2]], ID.Plate, 1, { shape: [C, C], w: 2, h: 1, cat: "build" }),
  r("rail", "Rails", "6 ingots + 1 stick → 8", [[I, 6], [S, 1]], ID.Rail, 8, {
    shape: [I, 0, I, I, S, I, I, 0, I],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("obsidian", "Void bricks", "4 kiln bricks + 1 gem", [[ID.Hard, 4], [ID.Diamond, 1]], ID.Obsidian, 2, { cat: "build" }),
  r("portal", "Gate void", "4 void bricks", [[ID.Obsidian, 4]], ID.Portal, 1, {
    shape: [ID.Obsidian, ID.Obsidian, ID.Obsidian, ID.Obsidian],
    w: 2,
    h: 2,
    cat: "magic",
  }),
  r("enchant", "Rune table", "4 void + 2 gems + 1 plank", [[ID.Obsidian, 4], [ID.Diamond, 2], [P, 1]], ID.Enchanter, 1, {
    shape: [0, P, 0, ID.Diamond, ID.Obsidian, ID.Diamond, ID.Obsidian, ID.Obsidian, ID.Obsidian],
    w: 3,
    h: 3,
    cat: "magic",
  }),
  r("anvil", "Anvil", "3 iron bricks + 4 ingots", [[ID.IronBlock, 3], [I, 4]], ID.Anvil, 1, {
    shape: [ID.IronBlock, ID.IronBlock, ID.IronBlock, 0, I, 0, I, I, I],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("grindstone", "Grindstone", "2 sticks + 1 stone slab + 2 planks", [[S, 2], [ID.SlabStone, 1], [P, 2]], ID.Grindstone, 1, {
    shape: [S, ID.SlabStone, S, P, 0, P],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("crossbow", "Crossbow", "3 sticks + 2 ingots + 2 string", [[S, 3], [I, 2], [ID.String, 2]], ID.Crossbow, 1, {
    shape: [S, I, S, ID.String, I, ID.String, 0, S, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("firework", "Firework rockets", "1 powder + 1 paper → 2", [[ID.Powder, 1], [ID.Paper, 1]], ID.Firework, 2, {
    shape: [ID.Paper, ID.Powder],
    w: 1,
    h: 2,
    cat: "tools",
  }),
  r("nametag", "Name tag", "1 paper + 1 string", [[ID.Paper, 1], [ID.String, 1]], ID.NameTag, 1, {
    shape: [ID.String, ID.Paper],
    w: 1,
    h: 2,
    cat: "tools",
  }),
  r("frame", "Item frame", "8 sticks + 1 pelt", [[S, 8], [ID.Pelt, 1]], ID.Frame, 1, {
    shape: [S, S, S, S, ID.Pelt, S, S, S, S],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("painting", "Painting", "4 sticks + 1 wool brick", [[S, 4], [ID.White, 1]], ID.Painting, 1, {
    shape: [0, S, 0, S, ID.White, S, 0, S, 0],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("brew", "Kettle", "1 ember rod + 3 cobble", [[ID.Blaze, 1], [C, 3]], ID.Brew, 1, {
    shape: [0, ID.Blaze, 0, C, C, C],
    w: 3,
    h: 2,
    cat: "magic",
  }),
  r("bow", "Arc / Bow", "3 sticks + 3 string", [[S, 3], [ID.String, 3]], ID.Bow, 1, {
    shape: [0, S, ID.String, S, 0, ID.String, 0, S, ID.String],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("arrow", "Arrows", "1 flint + 1 stick + 1 feather → 4", [[ID.Flint, 1], [S, 1], [ID.Feather, 1]], ID.Arrow, 4, {
    shape: [ID.Flint, S, ID.Feather],
    w: 1,
    h: 3,
    cat: "tools",
  }),
  r("rod", "Fishing rod", "3 sticks + 2 string", [[S, 3], [ID.String, 2]], ID.Rod, 1, {
    shape: [0, 0, S, 0, S, ID.String, S, 0, ID.String],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("shears", "Shears", "2 ingots", [[I, 2]], ID.Shears, 1, {
    shape: [0, I, I, 0],
    w: 2,
    h: 2,
    cat: "tools",
  }),
  r("welder", "Welding torch", "2 ingots + 1 spark", [[I, 2], [ID.Flint, 1]], ID.Welder, 1, {
    shape: [I, 0, 0, I, ID.Flint, 0],
    w: 2,
    h: 3,
    cat: "tools",
  }),
  r("flint", "Spark", "1 iron + 1 cobble", [[I, 1], [C, 1]], ID.Flint, 1, {
    shape: [I, C],
    w: 2,
    h: 1,
    cat: "tools",
  }),
  r("boat", "Boat", "5 planks", [[P, 5]], ID.Boat, 1, {
    shape: [P, 0, P, P, P, P],
    w: 3,
    h: 2,
    cat: "tools",
  }),
  r("cart", "Cart", "5 ingots", [[I, 5]], ID.Cart, 1, {
    shape: [I, 0, I, I, I, I],
    w: 3,
    h: 2,
    cat: "tools",
  }),
  r("shield", "Shield", "1 ingot + 6 planks", [[I, 1], [P, 6]], ID.Shield, 1, {
    shape: [P, I, P, P, P, P, 0, P, 0],
    w: 3,
    h: 3,
    cat: "gear",
  }),
  r("eye", "Seeker eye", "1 trade gem + 1 ember rod", [[ID.Emerald, 1], [ID.Blaze, 1]], ID.Eye, 1, {
    shape: [ID.Emerald, ID.Blaze],
    w: 2,
    h: 1,
    cat: "magic",
  }),
  r("elytra", "Glide shell", "4 feathers + 2 string", [[ID.Feather, 4], [ID.String, 2]], ID.Elytra, 1, {
    shape: [ID.Feather, ID.String, ID.Feather, ID.Feather, ID.String, ID.Feather],
    w: 3,
    h: 2,
    cat: "gear",
  }),
  r("camp", "Campfire", "3 sticks + 1 coal", [[S, 3], [ID.Coal, 1]], ID.Campfire, 1, {
    shape: [0, S, 0, S, ID.Coal, S],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("note", "Chime", "8 planks + 1 dust", [[P, 8], [ID.Dust, 1]], ID.Note, 1, {
    shape: [P, P, P, P, ID.Dust, P, P, P, P],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("hopper", "Funnel", "5 ingots + 1 crate", [[I, 5], [ID.Chest, 1]], ID.Hopper, 1, {
    shape: [I, 0, I, I, ID.Chest, I, 0, I, 0],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("dispenser", "Launcher", "7 cobble + 1 bow + 1 dust", [[C, 7], [ID.Bow, 1], [ID.Dust, 1]], ID.Dispenser, 1, {
    shape: [C, C, C, C, ID.Bow, C, C, ID.Dust, C],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("cookie", "Cookies", "2 grain + 1 coal", [[ID.Wheat, 2], [ID.Coal, 1]], ID.Cookie, 8, {
    shape: [ID.Wheat, ID.Coal, ID.Wheat],
    w: 3,
    h: 1,
    cat: "food",
  }),
  r("gapple", "Gold apple", "1 apple + 8 gold", [[ID.Apple, 1], [ID.Gold, 8]], ID.Gapple, 1, {
    shape: [ID.Gold, ID.Gold, ID.Gold, ID.Gold, ID.Apple, ID.Gold, ID.Gold, ID.Gold, ID.Gold],
    w: 3,
    h: 3,
    cat: "food",
  }),
  r("bottle", "Bottles", "3 windows → 3", [[ID.Glass, 3]], ID.Bottle, 3, {
    shape: [ID.Glass, 0, ID.Glass, 0, ID.Glass, 0],
    w: 3,
    h: 2,
    cat: "magic",
  }),
  r("npick", "Ember pick", "3 scrap + 1 gem pick", [[ID.Scrap, 3], [ID.PickG, 1]], ID.NetherPick, 1, { cat: "tools" }),
  r("bronze", "Bronze", "1 tin + 1 copper → 2", [[ID.Tin, 1], [ID.Copper, 1]], ID.Bronze, 2, {
    shape: [ID.Tin, ID.Copper],
    w: 2,
    h: 1,
    cat: "build",
  }),
  r("pick-b", "Bronze pick", "3 bronze + 2 sticks · level 4", [[ID.Bronze, 3], [S, 2]], ID.PickBronze, 1, {
    lvl: 4,
    shape: [ID.Bronze, ID.Bronze, ID.Bronze, 0, S, 0, 0, S, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("sword-b", "Bronze blade", "2 bronze + 1 stick · level 4", [[ID.Bronze, 2], [S, 1]], ID.SwordBronze, 1, {
    lvl: 4,
    shape: [ID.Bronze, ID.Bronze, S],
    w: 1,
    h: 3,
    cat: "tools",
  }),
  r("axe-b", "Bronze axe", "3 bronze + 2 sticks · level 4", [[ID.Bronze, 3], [S, 2]], ID.AxeBronze, 1, {
    lvl: 4,
    shape: [ID.Bronze, ID.Bronze, 0, ID.Bronze, S, 0, 0, S, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("pick-c", "Chrome pick", "3 chrome + 2 sticks · level 8", [[ID.Chrome, 3], [S, 2]], ID.PickChrome, 1, {
    lvl: 8,
    shape: [ID.Chrome, ID.Chrome, ID.Chrome, 0, S, 0, 0, S, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("helm-c", "Chrome cap", "5 chrome · level 8", [[ID.Chrome, 5]], ID.HelmChrome, 1, {
    lvl: 8,
    shape: [ID.Chrome, ID.Chrome, ID.Chrome, ID.Chrome, 0, ID.Chrome],
    w: 3,
    h: 2,
    cat: "gear",
  }),
  r("chrome-brick", "Chrome brick", "9 chrome · level 8", [[ID.Chrome, 9]], ID.ChromeBrick, 1, {
    lvl: 8,
    shape: [ID.Chrome, ID.Chrome, ID.Chrome, ID.Chrome, ID.Chrome, ID.Chrome, ID.Chrome, ID.Chrome, ID.Chrome],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("sword-sapph", "Sapphire blade", "2 sapphire + 1 stick · level 12", [[ID.Sapphire, 2], [S, 1]], ID.SwordSapph, 1, {
    lvl: 12,
    shape: [ID.Sapphire, ID.Sapphire, S],
    w: 1,
    h: 3,
    cat: "tools",
  }),
  r("boots-resin", "Grip boots", "4 resin · level 10", [[ID.Resin, 4]], ID.ResinBoots, 1, {
    lvl: 10,
    shape: [ID.Resin, 0, ID.Resin, ID.Resin, 0, ID.Resin],
    w: 3,
    h: 2,
    cat: "gear",
  }),
  r("focus", "Focus brew", "1 bottle + 1 amber · level 6", [[ID.Bottle, 1], [ID.Amber, 1]], ID.Focus, 1, {
    lvl: 6,
    shape: [ID.Amber, ID.Bottle],
    w: 1,
    h: 2,
    cat: "magic",
  }),
  r("pick-prism", "Prism pick", "3 prism + 2 sticks · level 16", [[ID.Prism, 3], [S, 2]], ID.PickPrism, 1, {
    lvl: 16,
    shape: [ID.Prism, ID.Prism, ID.Prism, 0, S, 0, 0, S, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("shell-prism", "Prism shell", "8 prism · level 16", [[ID.Prism, 8]], ID.PlatePrism, 1, {
    lvl: 16,
    shape: [ID.Prism, 0, ID.Prism, ID.Prism, ID.Prism, ID.Prism, ID.Prism, ID.Prism, ID.Prism],
    w: 3,
    h: 3,
    cat: "gear",
  }),
  r("master", "Master brick", "prism + sapphire + chrome + resin · level 22", [[ID.Prism, 1], [ID.Sapphire, 1], [ID.Chrome, 1], [ID.Resin, 1]], ID.MasterBrick, 1, {
    lvl: 22,
    shape: [ID.Prism, ID.Sapphire, ID.Chrome, ID.Resin],
    w: 2,
    h: 2,
    cat: "build",
  }),
  r("pick-master", "Master pick", "3 master bricks + 1 prism pick · level 22", [[ID.MasterBrick, 3], [ID.PickPrism, 1]], ID.MasterPick, 1, {
    lvl: 22,
    cat: "tools",
  }),
  r("fang-blade", "Fang blade", "2 fangs + 1 bone + 1 stick", [[ID.Fang, 2], [ID.Bone, 1], [S, 1]], ID.FangBlade, 1, {
    shape: [0, ID.Fang, 0, 0, ID.Fang, 0, ID.Bone, S, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("fur-cap", "Fur cap", "4 fur + 1 white", [[ID.Fur, 4], [ID.White, 1]], ID.FurCap, 1, {
    shape: [ID.Fur, ID.White, ID.Fur, ID.Fur, 0, ID.Fur],
    w: 3,
    h: 2,
    cat: "gear",
  }),
  r("scale-legs", "Scale legs", "5 scales + 2 string", [[ID.Scale, 5], [ID.String, 2]], ID.ScaleLegs, 1, {
    shape: [ID.Scale, ID.Scale, ID.Scale, ID.Scale, 0, ID.Scale, ID.String, 0, ID.String],
    w: 3,
    h: 3,
    cat: "gear",
  }),
  r("tome", "Spell tome", "1 eye + 1 wisp dust + 1 amber", [[ID.Eye, 1], [ID.Wisp, 1], [ID.Amber, 1]], ID.Tome, 1, {
    shape: [ID.Eye, ID.Wisp, ID.Amber],
    w: 3,
    h: 1,
    cat: "magic",
  }),
  r("lens", "Crystal lens", "2 crystals + 1 window", [[ID.Crystal, 2], [ID.Glass, 1]], ID.Eye, 1, { cat: "magic" }),
  r("glue", "Slime cord", "1 slime + 1 string → 4 string", [[ID.Slime, 1], [ID.String, 1]], ID.String, 4, { cat: "build" }),
  r("scale-mail", "Scale mail", "6 scales + 1 slime", [[ID.Scale, 6], [ID.Slime, 1]], ID.ScaleMail, 1, {
    shape: [ID.Scale, ID.Slime, ID.Scale, ID.Scale, ID.Scale, ID.Scale, 0, ID.Scale, 0],
    w: 3,
    h: 3,
    cat: "gear",
  }),
  r("frost-cap", "Frost cap", "4 frost + 1 fur", [[ID.Frost, 4], [ID.Fur, 1]], ID.FrostCap, 1, {
    shape: [ID.Frost, ID.Fur, ID.Frost, ID.Frost, 0, ID.Frost],
    w: 3,
    h: 2,
    cat: "gear",
  }),
  r("cinder-blade", "Cinder blade", "2 cinders + 1 fang + 1 stick", [[ID.Cinder, 2], [ID.Fang, 1], [S, 1]], ID.CinderBlade, 1, {
    shape: [0, ID.Cinder, 0, 0, ID.Cinder, 0, ID.Fang, S, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("antler-bow", "Antler bow", "2 antlers + 2 string", [[ID.Antler, 2], [ID.String, 2]], ID.AntlerBow, 1, {
    shape: [ID.Antler, ID.String, ID.Antler, ID.String],
    w: 2,
    h: 2,
    cat: "tools",
  }),
  r("wax-seal", "Wax seal", "2 wax + 1 crystal", [[ID.Wax, 2], [ID.Crystal, 1]], ID.WaxSeal, 1, {
    shape: [ID.Wax, ID.Crystal, ID.Wax],
    w: 3,
    h: 1,
    cat: "magic",
  }),
  r("tidal-blade", "Tidal trident blade", "2 guardian spikes + 1 prism + 1 stick — ocean guardian weapon", [[ID.GuardianSpike, 2], [ID.Prism, 1], [S, 1]], ID.TidalBlade, 1, {
    shape: [ID.GuardianSpike, ID.Prism, ID.GuardianSpike, 0, S, 0],
    w: 3,
    h: 2,
    cat: "tools",
  }),
  r("trident-craft", "Ocean trident", "3 guardian spikes + 2 sticks — throwable or melee sea spear", [[ID.GuardianSpike, 3], [S, 2]], ID.Trident, 1, {
    shape: [ID.GuardianSpike, ID.GuardianSpike, ID.GuardianSpike, 0, S, 0, 0, S, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("pharaoh-staff", "Sun pharaoh scepter", "2 scarab relics + 2 gold + 1 stick — desert tomb weapon that ignites foes", [[ID.PharaohGold, 2], [ID.Gold, 2], [S, 1]], ID.PharaohStaff, 1, {
    shape: [ID.Gold, ID.PharaohGold, ID.Gold, 0, ID.PharaohGold, 0, 0, S, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("witch-staff", "Covensoul blade", "2 witch essences + 1 wisp dust + 1 bone — swamp hex blade", [[ID.WitchVenom, 2], [ID.Wisp, 1], [ID.Bone, 1]], ID.WitchStaff, 1, {
    shape: [0, ID.WitchVenom, 0, ID.Wisp, ID.WitchVenom, 0, 0, ID.Bone, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("executioner-axe", "Royal executioner axe", "2 illager emblems + 2 ingots + 1 stick — heavy castle & mansion cleaver", [[ID.IllagerBadge, 2], [I, 2], [S, 1]], ID.ExecutionerAxe, 1, {
    shape: [ID.IllagerBadge, I, ID.IllagerBadge, 0, S, I, 0, S, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("void-blade", "Voidblink katana", "2 ender cores + 1 ender pearl + 1 obsidian — end-tier blade", [[ID.VoidCore, 2], [ID.EnderPearl, 1], [ID.Obsidian, 1]], ID.VoidBlade, 1, {
    shape: [0, ID.VoidCore, 0, ID.EnderPearl, ID.VoidCore, 0, 0, ID.Obsidian, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("guardian-plate", "Prismarine carapace", "4 guardian spikes + 2 scales — heavy ocean chestplate", [[ID.GuardianSpike, 4], [ID.Scale, 2]], ID.GuardianPlate, 1, {
    shape: [ID.GuardianSpike, 0, ID.GuardianSpike, ID.Scale, ID.Scale, ID.Scale, ID.GuardianSpike, ID.GuardianSpike, ID.GuardianSpike],
    w: 3,
    h: 3,
    cat: "gear",
  }),
  r("pharaoh-crown", "Nemes pharaoh crown", "2 scarab relics + 3 gold — royal desert helmet", [[ID.PharaohGold, 2], [ID.Gold, 3]], ID.PharaohCrown, 1, {
    shape: [ID.Gold, ID.PharaohGold, ID.Gold, ID.Gold, 0, ID.PharaohGold],
    w: 3,
    h: 2,
    cat: "gear",
  }),
  r("totem-craft", "Totem of undying", "1 illager emblem + 1 scarab relic + 2 gold + 1 emerald", [[ID.IllagerBadge, 1], [ID.PharaohGold, 1], [ID.Gold, 2], [ID.Emerald, 1]], ID.Totem, 1, {
    shape: [0, ID.Emerald, 0, ID.Gold, ID.IllagerBadge, ID.Gold, 0, ID.PharaohGold, 0],
    w: 3,
    h: 3,
    cat: "magic",
  }),
  r("enchanter-classic", "Enchanting table (classic)", "1 book + 2 aqua gems + 4 obsidian", [[ID.Book, 1], [ID.Diamond, 2], [ID.Obsidian, 4]], ID.Enchanter, 1, {
    shape: [0, ID.Book, 0, ID.Diamond, ID.Obsidian, ID.Diamond, ID.Obsidian, ID.Obsidian, ID.Obsidian],
    w: 3,
    h: 3,
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
  r("paper", "Paper", "3 reeds → 3", [[ID.Reed, 3]], ID.Paper, 3, { shape: [ID.Reed, ID.Reed, ID.Reed], w: 3, h: 1, cat: "build" }),
  r("book", "Book", "3 paper + 1 pelt", [[ID.Paper, 3], [ID.Pelt, 1]], ID.Book, 1, { shape: [ID.Paper, ID.Paper, ID.Paper, ID.Pelt], w: 2, h: 2, cat: "build" }),
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
  r("barrel", "Barrel", "7 planks", [[P, 7]], ID.Barrel, 1, {
    shape: [P, P, P, P, 0, P, P, 0, P],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("shulker-box", "Shulker box", "2 shulker shells + crate — keeps its contents when broken", [[ID.ShulkerShell, 2], [ID.Chest, 1]], ID.ShulkerBox, 1, {
    shape: [ID.ShulkerShell, ID.Chest, ID.ShulkerShell],
    w: 1,
    h: 3,
    cat: "build",
  }),
  r("beacon", "Beacon", "glass + nether star + obsidian — buffs on a metal pyramid", [[ID.Glass, 5], [ID.NetherStar, 1], [ID.Obsidian, 3]], ID.Beacon, 1, {
    shape: [ID.Glass, ID.Glass, ID.Glass, ID.Glass, ID.NetherStar, ID.Glass, ID.Obsidian, ID.Obsidian, ID.Obsidian],
    w: 3,
    h: 3,
    cat: "magic",
  }),
  r("conduit", "Conduit", "8 shell chips + prism core — breathe underwater", [[ID.Shell, 8], [ID.Core, 1]], ID.Conduit, 1, {
    shape: [ID.Shell, ID.Shell, ID.Shell, ID.Shell, ID.Core, ID.Shell, ID.Shell, ID.Shell, ID.Shell],
    w: 3,
    h: 3,
    cat: "magic",
  }),
  r("jukebox", "Jukebox", "8 planks + aqua gem — plays music discs", [[P, 8], [ID.Diamond, 1]], ID.Jukebox, 1, {
    shape: [P, P, P, P, ID.Diamond, P, P, P, P],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("saddle", "Saddle", "3 pelts + 1 ingot + 1 string", [[ID.Pelt, 3], [I, 1], [ID.String, 1]], ID.Saddle, 1, {
    shape: [ID.Pelt, ID.Pelt, ID.Pelt, 0, ID.String, 0, 0, I, 0],
    w: 3,
    h: 3,
    cat: "gear",
  }),
  r("daylight-sensor", "Daylight sensor", "3 windows + 3 crystals + 3 plank slabs — powers redstone by sun or moon", [[ID.Glass, 3], [ID.Crystal, 3], [ID.SlabPlanks, 3]], ID.Daylight, 1, {
    shape: [ID.Glass, ID.Glass, ID.Glass, ID.Crystal, ID.Crystal, ID.Crystal, ID.SlabPlanks, ID.SlabPlanks, ID.SlabPlanks],
    w: 3,
    h: 3,
    cat: "redstone",
  }),
  r("target-block", "Target block", "1 hay bale + 4 red dust — pulses when hit by arrows or bolts", [[ID.Hay, 1], [ID.Dust, 4]], ID.Target, 1, {
    shape: [0, ID.Dust, 0, ID.Dust, ID.Hay, ID.Dust, 0, ID.Dust, 0],
    w: 3,
    h: 3,
    cat: "redstone",
  }),
  r("axle", "Axle", "3 sticks", [[ID.Stick, 3]], ID.Axle, 1, {
    shape: [0, ID.Stick, 0, 0, ID.Stick, 0, 0, ID.Stick, 0],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("gear16", "Gear 16T", "4 sticks around a plank", [[ID.Stick, 4], [ID.Planks, 1]], ID.Gear16, 1, {
    shape: [0, ID.Stick, 0, ID.Stick, ID.Planks, ID.Stick, 0, ID.Stick, 0],
    w: 3,
    h: 3,
    cat: "build",
  }),
  r("crank", "Crank", "1 stick + 1 plank", [[ID.Stick, 1], [ID.Planks, 1]], ID.Crank, 1, {
    shape: [ID.Stick, ID.Planks],
    w: 1,
    h: 2,
    cat: "build",
  }),
  r("spring", "Spring motor", "2 planks + 1 stick", [[ID.Planks, 2], [ID.Stick, 1]], ID.Spring, 1, {
    shape: [ID.Planks, ID.Stick, ID.Planks],
    w: 3,
    h: 1,
    cat: "build",
  }),
  r("diff", "Differential", "2 gears + 1 axle", [[ID.Gear16, 2], [ID.Axle, 1]], ID.Diff, 1, {
    shape: [ID.Gear16, ID.Axle, ID.Gear16],
    w: 3,
    h: 1,
    cat: "build",
  }),
  r("rack", "Rack", "1 gear + 2 planks", [[ID.Gear16, 1], [ID.Planks, 2]], ID.Rack, 1, {
    shape: [ID.Planks, ID.Gear16, ID.Planks],
    w: 3,
    h: 1,
    cat: "build",
  }),
  r("ujoint", "Universal joint", "2 axles + 1 stick", [[ID.Axle, 2], [ID.Stick, 1]], ID.UJoint, 1, {
    shape: [ID.Axle, ID.Stick, ID.Axle],
    w: 3,
    h: 1,
    cat: "build",
  }),
  r("road", "Road wheel", "2 planks + 1 axle", [[ID.Planks, 2], [ID.Axle, 1]], ID.Road, 1, {
    shape: [ID.Planks, ID.Axle, ID.Planks],
    w: 3,
    h: 1,
    cat: "build",
  }),
  r("belt", "Conveyor", "1 axle + 2 planks", [[ID.Axle, 1], [ID.Planks, 2]], ID.Belt, 1, {
    shape: [ID.Axle, ID.Planks, ID.Planks],
    w: 1,
    h: 3,
    cat: "build",
  }),
  r("trap", "Trap", "2 sticks + 1 plank", [[ID.Stick, 2], [ID.Planks, 1]], ID.Trap, 1, {
    shape: [ID.Stick, ID.Stick, ID.Planks],
    w: 1,
    h: 3,
    cat: "build",
  }),
  r("ring", "Driving ring", "1 gear + 1 axle", [[ID.Gear16, 1], [ID.Axle, 1]], ID.Ring, 1, {
    shape: [ID.Gear16, ID.Axle],
    w: 1,
    h: 2,
    cat: "build",
  }),
  r("gear40", "Gear 40T", "2 gears 16T", [[ID.Gear16, 2]], ID.Gear40, 1, {
    shape: [ID.Gear16, ID.Gear16],
    w: 2,
    h: 1,
    cat: "build",
  }),
  r("bevel12", "Bevel 12T", "1 gear + 1 stick", [[ID.Gear16, 1], [ID.Stick, 1]], ID.Bevel12, 1, {
    shape: [ID.Stick, ID.Gear16],
    w: 1,
    h: 2,
    cat: "build",
  }),
  r("bevel20", "Bevel 20T", "1 gear + 2 sticks", [[ID.Gear16, 1], [ID.Stick, 2]], ID.Bevel20, 1, {
    shape: [ID.Gear16, ID.Stick, ID.Stick],
    w: 1,
    h: 3,
    cat: "build",
  }),
  r("actuator", "Linear actuator", "1 worm + 1 axle", [[ID.Worm, 1], [ID.Axle, 1]], ID.Actuator, 1, {
    shape: [ID.Axle, ID.Worm],
    w: 1,
    h: 2,
    cat: "build",
  }),
  r("turret", "Turntable", "2 gears + 1 axle", [[ID.Gear16, 2], [ID.Axle, 1]], ID.Turret, 1, {
    shape: [ID.Gear16, ID.Axle, ID.Gear16],
    w: 1,
    h: 3,
    cat: "build",
  }),
  r("slip", "Clutch gear 24T", "1 gear 24T + 1 axle", [[ID.Gear24, 1], [ID.Axle, 1]], ID.Slip, 1, {
    shape: [ID.Gear24, ID.Axle],
    w: 2,
    h: 1,
    cat: "build",
  }),
  r("pump", "Air pump", "1 axle + 1 gear 8T", [[ID.Axle, 1], [ID.Gear8, 1]], ID.Pump, 1, {
    shape: [ID.Axle, ID.Gear8],
    w: 1,
    h: 2,
    cat: "build",
  }),
  r("cylinder", "Air cylinder", "2 axles + 1 plank", [[ID.Axle, 2], [ID.Planks, 1]], ID.Cylinder, 1, {
    shape: [ID.Planks, ID.Axle, ID.Axle],
    w: 1,
    h: 3,
    cat: "build",
  }),
  r("valve", "Air valve", "2 sticks + 1 gear", [[ID.Stick, 2], [ID.Gear16, 1]], ID.Valve, 1, {
    shape: [ID.Stick, ID.Gear16, ID.Stick],
    w: 1,
    h: 3,
    cat: "build",
  }),
  r("tank", "Air tank", "4 planks", [[ID.Planks, 4]], ID.Tank, 1, {
    shape: [ID.Planks, ID.Planks, ID.Planks, ID.Planks],
    w: 2,
    h: 2,
    cat: "build",
  }),
  // P6 step 2 (Muse) — Kiln casting: the colour moulds. The donor brick is
  // the pigment/master: it is consumed into the melt, 4 plastic ingots
  // (smelted pellets) join it, and the mould pours 2 bricks of its colour.
  // Net +1 brick per cast; pellets come from breaking plastic (2 per colour
  // brick), so a cast costs 2 broken colour bricks + kiln fuel and time.
  r("cast-red", "Cast red bricks", "4 ingots + 1 red → 2", [[ID.PlasticIngot, 4], [ID.Red, 1]], ID.Red, 2, {
    shape: [ID.PlasticIngot, ID.PlasticIngot, ID.PlasticIngot, ID.PlasticIngot, ID.Red, 0],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("cast-orange", "Cast orange bricks", "4 ingots + 1 orange → 2", [[ID.PlasticIngot, 4], [ID.Orange, 1]], ID.Orange, 2, {
    shape: [ID.PlasticIngot, ID.PlasticIngot, ID.PlasticIngot, ID.PlasticIngot, ID.Orange, 0],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("cast-yellow", "Cast yellow bricks", "4 ingots + 1 yellow → 2", [[ID.PlasticIngot, 4], [ID.Yellow, 1]], ID.Yellow, 2, {
    shape: [ID.PlasticIngot, ID.PlasticIngot, ID.PlasticIngot, ID.PlasticIngot, ID.Yellow, 0],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("cast-green", "Cast green bricks", "4 ingots + 1 green → 2", [[ID.PlasticIngot, 4], [ID.Green, 1]], ID.Green, 2, {
    shape: [ID.PlasticIngot, ID.PlasticIngot, ID.PlasticIngot, ID.PlasticIngot, ID.Green, 0],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("cast-blue", "Cast blue bricks", "4 ingots + 1 blue → 2", [[ID.PlasticIngot, 4], [ID.Blue, 1]], ID.Blue, 2, {
    shape: [ID.PlasticIngot, ID.PlasticIngot, ID.PlasticIngot, ID.PlasticIngot, ID.Blue, 0],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("cast-azure", "Cast azure bricks", "4 ingots + 1 azure → 2", [[ID.PlasticIngot, 4], [ID.Azure, 1]], ID.Azure, 2, {
    shape: [ID.PlasticIngot, ID.PlasticIngot, ID.PlasticIngot, ID.PlasticIngot, ID.Azure, 0],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("cast-pink", "Cast pink bricks", "4 ingots + 1 pink → 2", [[ID.PlasticIngot, 4], [ID.Pink, 1]], ID.Pink, 2, {
    shape: [ID.PlasticIngot, ID.PlasticIngot, ID.PlasticIngot, ID.PlasticIngot, ID.Pink, 0],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("cast-white", "Cast white bricks", "4 ingots + 1 white → 2", [[ID.PlasticIngot, 4], [ID.White, 1]], ID.White, 2, {
    shape: [ID.PlasticIngot, ID.PlasticIngot, ID.PlasticIngot, ID.PlasticIngot, ID.White, 0],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("cast-black", "Cast black bricks", "4 ingots + 1 black → 2", [[ID.PlasticIngot, 4], [ID.Black, 1]], ID.Black, 2, {
    shape: [ID.PlasticIngot, ID.PlasticIngot, ID.PlasticIngot, ID.PlasticIngot, ID.Black, 0],
    w: 3,
    h: 2,
    cat: "build",
  }),
  // P6-2 Trempe (Muse) — the tempered moulds: same shape as cast-* but
  // the stock is tempered ingots (403, quenched in water) and the pour is
  // a TEMPERED colour brick (410-418): hard 1.5/tough, double P1 stress
  // threshold. The donor still pays the pigment.
  r("tcast-red", "Cast tempered red bricks", "4 tempered ingots + 1 red → 2 tempered", [[ID.TemperedIngot, 4], [ID.Red, 1]], ID.TRed, 2, {
    shape: [ID.TemperedIngot, ID.TemperedIngot, ID.TemperedIngot, ID.TemperedIngot, ID.Red, 0],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("tcast-orange", "Cast tempered orange bricks", "4 tempered ingots + 1 orange → 2 tempered", [[ID.TemperedIngot, 4], [ID.Orange, 1]], ID.TOrange, 2, {
    shape: [ID.TemperedIngot, ID.TemperedIngot, ID.TemperedIngot, ID.TemperedIngot, ID.Orange, 0],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("tcast-yellow", "Cast tempered yellow bricks", "4 tempered ingots + 1 yellow → 2 tempered", [[ID.TemperedIngot, 4], [ID.Yellow, 1]], ID.TYellow, 2, {
    shape: [ID.TemperedIngot, ID.TemperedIngot, ID.TemperedIngot, ID.TemperedIngot, ID.Yellow, 0],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("tcast-green", "Cast tempered green bricks", "4 tempered ingots + 1 green → 2 tempered", [[ID.TemperedIngot, 4], [ID.Green, 1]], ID.TGreen, 2, {
    shape: [ID.TemperedIngot, ID.TemperedIngot, ID.TemperedIngot, ID.TemperedIngot, ID.Green, 0],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("tcast-blue", "Cast tempered blue bricks", "4 tempered ingots + 1 blue → 2 tempered", [[ID.TemperedIngot, 4], [ID.Blue, 1]], ID.TBlue, 2, {
    shape: [ID.TemperedIngot, ID.TemperedIngot, ID.TemperedIngot, ID.TemperedIngot, ID.Blue, 0],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("tcast-azure", "Cast tempered azure bricks", "4 tempered ingots + 1 azure → 2 tempered", [[ID.TemperedIngot, 4], [ID.Azure, 1]], ID.TAzure, 2, {
    shape: [ID.TemperedIngot, ID.TemperedIngot, ID.TemperedIngot, ID.TemperedIngot, ID.Azure, 0],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("tcast-pink", "Cast tempered pink bricks", "4 tempered ingots + 1 pink → 2 tempered", [[ID.TemperedIngot, 4], [ID.Pink, 1]], ID.TPink, 2, {
    shape: [ID.TemperedIngot, ID.TemperedIngot, ID.TemperedIngot, ID.TemperedIngot, ID.Pink, 0],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("tcast-white", "Cast tempered white bricks", "4 tempered ingots + 1 white → 2 tempered", [[ID.TemperedIngot, 4], [ID.White, 1]], ID.TWhite, 2, {
    shape: [ID.TemperedIngot, ID.TemperedIngot, ID.TemperedIngot, ID.TemperedIngot, ID.White, 0],
    w: 3,
    h: 2,
    cat: "build",
  }),
  r("tcast-black", "Cast tempered black bricks", "4 tempered ingots + 1 black → 2 tempered", [[ID.TemperedIngot, 4], [ID.Black, 1]], ID.TBlack, 2, {
    shape: [ID.TemperedIngot, ID.TemperedIngot, ID.TemperedIngot, ID.TemperedIngot, ID.Black, 0],
    w: 3,
    h: 2,
    cat: "build",
  }),
  // P6 step 4 / P7 tool moulds (Muse) — tools are CAST, not tiered by
  // ore: the classic tool shapes with plastic ingots (402) as the head
  // stock pour the plastic tools (404-407, tier 2 / 120 uses); the same
  // moulds with tempered ingots (403) pour the tempered tools (419-422,
  // tier 3 / 240 uses). Sticks stay the handle, as in every tool recipe.
  r("mold-pick", "Cast plastic pick", "3 ingots + 2 sticks", [[ID.PlasticIngot, 3], [S, 2]], ID.PlasticPick, 1, {
    shape: [ID.PlasticIngot, ID.PlasticIngot, ID.PlasticIngot, 0, S, 0, 0, S, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("mold-sword", "Cast plastic blade", "2 ingots + 1 stick", [[ID.PlasticIngot, 2], [S, 1]], ID.PlasticSword, 1, {
    shape: [ID.PlasticIngot, ID.PlasticIngot, S],
    w: 1,
    h: 3,
    cat: "tools",
  }),
  r("mold-axe", "Cast plastic axe", "3 ingots + 2 sticks", [[ID.PlasticIngot, 3], [S, 2]], ID.PlasticAxe, 1, {
    shape: [ID.PlasticIngot, ID.PlasticIngot, 0, ID.PlasticIngot, S, 0, 0, S, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("mold-shovel", "Cast plastic spade", "1 ingot + 2 sticks", [[ID.PlasticIngot, 1], [S, 2]], ID.PlasticShovel, 1, {
    shape: [ID.PlasticIngot, S, S],
    w: 1,
    h: 3,
    cat: "tools",
  }),
  r("tmold-pick", "Cast tempered plastic pick", "3 tempered ingots + 2 sticks", [[ID.TemperedIngot, 3], [S, 2]], ID.TPlasticPick, 1, {
    shape: [ID.TemperedIngot, ID.TemperedIngot, ID.TemperedIngot, 0, S, 0, 0, S, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("tmold-sword", "Cast tempered plastic blade", "2 tempered ingots + 1 stick", [[ID.TemperedIngot, 2], [S, 1]], ID.TPlasticSword, 1, {
    shape: [ID.TemperedIngot, ID.TemperedIngot, S],
    w: 1,
    h: 3,
    cat: "tools",
  }),
  r("tmold-axe", "Cast tempered plastic axe", "3 tempered ingots + 2 sticks", [[ID.TemperedIngot, 3], [S, 2]], ID.TPlasticAxe, 1, {
    shape: [ID.TemperedIngot, ID.TemperedIngot, 0, ID.TemperedIngot, S, 0, 0, S, 0],
    w: 3,
    h: 3,
    cat: "tools",
  }),
  r("tmold-shovel", "Cast tempered plastic spade", "1 tempered ingot + 2 sticks", [[ID.TemperedIngot, 1], [S, 2]], ID.TPlasticShovel, 1, {
    shape: [ID.TemperedIngot, S, S],
    w: 1,
    h: 3,
    cat: "tools",
  }),
];

export const SMELT: Record<number, number> = {
  [ID.RawIron]: ID.Ingot,
  [ID.IronOre]: ID.Ingot,
  [ID.Sand]: ID.Glass,
  [ID.Cobble]: ID.Stone,
  [ID.Log]: ID.Coal,
  [ID.Clay]: ID.Hard,
  [ID.Netherrack]: ID.Ash,
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
  // P6 step 2 (Muse): the Kiln is the foundry — pellets melt down 1:1
  // into casting ingots (5 s cook each, like every SMELT row); the cost
  // of casting lives in the mould recipes above, not in the melt.
  [ID.Pellets]: ID.PlasticIngot,
};

export function fuelTime(id: number): number {
  if (id === ID.LavaBucket) return 60;
  if (id === ID.Amber) return 14;
  if (id === ID.Blaze) return 12;
  if (id === ID.Cinder) return 10;
  if (id === ID.Coal) return 8;
  if (id === ID.Hay) return 4;
  if (id === ID.Log) return 3;
  if (id === ID.Planks) return 1.5;
  if (id === ID.SlabPlanks) return 0.8;
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
