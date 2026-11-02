// t91u (Grok Bot): every minifig accessory from the catalogue (p.4,
// "Répertoire complet des accessoires") that the game lacked. Pure data:
// procedural part lists (boxes / cylinders, built through skin() → the
// shared SNR shader), stats, and recipes by item name. No assets.
//
// Frames: "tool"/"food"/"wear"/"item" models stand on +Y with the minifig
// grip (Ø 3.18 mm bar) low on the shaft, like the swords. Guns lie along
// +X like the B19 crossbow (butt −X, muzzle +X, pistol grip under the
// stock at GRIP), so they share CROSSBOW_HOLD in first and third person.

/** ["b", w, h, d, x, y, z, hex, rotZ?] box · ["c", r, len, x, y, z, hex, rotZ?, rTop?] cylinder (axis Y). */
export type Part = ["b", number, number, number, number, number, number, number, number?] | ["c", number, number, number, number, number, number, number?, number?];
export type AccKind = "tool" | "gun" | "food" | "wear" | "shield" | "item";
export type Acc = {
  key: string;
  name: string;
  /** catalogue row it comes from */
  cat: string;
  kind: AccKind;
  color: string;
  parts: Part[];
  tool?: "pick" | "axe" | "shovel" | "sword" | "hoe";
  tier?: number;
  maxUse?: number;
  food?: number;
  armorSlot?: number;
  light?: number;
  /** what right-click does ("" = nothing special) */
  use?: "extinguish" | "zoom" | "shout" | "radio" | "music" | "inspect" | "sweep" | "cuff";
  recipe: [string, number][];
  out?: number;
  /** gun muzzle in model space */
  muzzle?: [number, number, number];
  /** armour value when worn (default: small) */
  armor?: number;
  /** builder level needed to craft AND to wake the item's power */
  lvl?: number;
  /** the zone boss whose signature matter it is cast from (first kill drops one) */
  boss?: string;
  /** one line: what the special item does */
  power?: string;
};

const H = Math.PI / 2;
// palette
const BLK = 0x23262b, GUN = 0x3a3f46, MET = 0xb0b6be, WD = 0x7c522b, DWD = 0x4a2e16, RED = 0xc8302a, YEL = 0xf5c518;
const WHT = 0xf2efe6, GRN = 0x3aa84c, BLU = 0x2a6fd0, BRN = 0x8a5a2a, GLD = 0xd8a22e, TRB = 0x6fd0ff;
/** the minifig grip bar every hand-held accessory shares */
const grip = (hex = DWD, y = -0.11): Part => ["c", 0.019, 0.11, 0, y, 0, hex];
/** pistol grip under a gun stock (where the hand closes) */
export const GRIP = { x: -0.07, y: -0.075 };
const pgrip = (hex = BLK, x = GRIP.x): Part => ["b", 0.032, 0.07, 0.03, x, GRIP.y + 0.01, 0, hex, -0.25];

export const ACCESSORIES: Acc[] = [
  // ---- Outils d'atelier (4006, 6246a, 4522, 92585, 55296) ----
  { key: "Wrench", name: "Wrench", cat: "Outils d'atelier", kind: "tool", color: "#b0b6be", parts: [grip(MET, -0.06), ["b", 0.03, 0.2, 0.016, 0, 0, 0, MET], ["b", 0.075, 0.04, 0.018, 0, 0.12, 0, MET], ["b", 0.026, 0.03, 0.02, 0, 0.145, 0, BLK]], tool: "pick", tier: 2, maxUse: 140, use: "inspect", recipe: [["Ingot", 2]] },
  { key: "Drill", name: "Drill", cat: "Outils d'atelier", kind: "tool", color: "#f5c518", parts: [grip(BLK), ["b", 0.06, 0.07, 0.15, 0, 0.0, 0.03, YEL], ["c", 0.02, 0.04, 0, 0.0, -0.065, BLK, H], ["c", 0.008, 0.1, 0, 0.0, -0.13, MET, H]], tool: "pick", tier: 3, maxUse: 320, recipe: [["Ingot", 3], ["Wisp dust", 2], ["Yellow", 1]] },
  { key: "Hammer", name: "Hammer", cat: "Outils d'atelier", kind: "tool", color: "#8e959c", parts: [grip(WD), ["c", 0.017, 0.16, 0, 0.02, 0, WD], ["b", 0.12, 0.045, 0.045, 0.01, 0.12, 0, GUN]], tool: "pick", tier: 2, maxUse: 160, recipe: [["Ingot", 2], ["Stick", 1]] },
  { key: "Crowbar", name: "Crowbar", cat: "Outils d'atelier", kind: "tool", color: "#c8302a", parts: [grip(RED), ["c", 0.014, 0.26, 0, 0.03, 0, RED], ["b", 0.06, 0.016, 0.016, 0.025, 0.165, 0, RED, 0.5]], tool: "axe", tier: 2, maxUse: 180, recipe: [["Ingot", 2], ["Red", 1]] },
  { key: "OilCan", name: "Oil can", cat: "Outils d'atelier", kind: "item", color: "#d8a22e", parts: [grip(GUN), ["c", 0.045, 0.08, 0, 0.0, 0, GLD], ["c", 0.006, 0.1, 0.04, 0.07, 0, GUN, -0.7]], use: "inspect", recipe: [["Tin", 1], ["Wax", 1]] },
  // ---- Chantier & secours (3837 3841 3836 6590 2516 3835) ----
  { key: "Broom", name: "Broom", cat: "Chantier & secours", kind: "tool", color: "#c4924a", parts: [grip(WD), ["c", 0.014, 0.3, 0, 0.0, 0, WD], ["b", 0.11, 0.07, 0.03, 0, -0.18, 0, YEL]], tool: "shovel", tier: 1, maxUse: 90, use: "sweep", recipe: [["Stick", 1], ["Grain", 2]] },
  { key: "Extinguisher", name: "Fire extinguisher", cat: "Chantier & secours", kind: "item", color: "#c8302a", parts: [grip(BLK), ["c", 0.04, 0.16, 0, 0.02, 0, RED], ["c", 0.022, 0.03, 0, 0.115, 0, BLK], ["c", 0.007, 0.08, 0.035, 0.11, 0, BLK, -1]], maxUse: 60, use: "extinguish", recipe: [["Red", 2], ["Ice", 2]] },
  { key: "Chainsaw", name: "Chainsaw", cat: "Chantier & secours", kind: "tool", color: "#e8752a", parts: [grip(BLK), ["b", 0.07, 0.08, 0.06, 0, -0.01, 0, 0xe8752a], ["b", 0.03, 0.2, 0.012, 0, 0.13, 0, MET], ["b", 0.036, 0.205, 0.006, 0, 0.13, 0, GUN]], tool: "axe", tier: 4, maxUse: 300, recipe: [["Ingot", 3], ["Orange", 1], ["Coal", 2]] },
  { key: "FireAxe", name: "Fire axe", cat: "Chantier & secours", kind: "tool", color: "#c8302a", parts: [grip(BLK), ["c", 0.016, 0.24, 0, 0.02, 0, RED], ["b", 0.1, 0.07, 0.016, 0.04, 0.12, 0, MET], ["b", 0.04, 0.03, 0.016, -0.035, 0.125, 0, MET]], tool: "axe", tier: 3, maxUse: 200, recipe: [["Ingot", 3], ["Red", 1], ["Stick", 1]] },
  // ---- Communication (3962 4349 30148 30162 30152 3069b) ----
  { key: "Walkie", name: "Walkie-talkie", cat: "Communication", kind: "item", color: "#23262b", parts: [grip(BLK, -0.06), ["b", 0.05, 0.11, 0.03, 0, 0.0, 0, BLK], ["c", 0.005, 0.07, 0.015, 0.09, 0, BLK], ["b", 0.03, 0.02, 0.005, 0, 0.02, -0.016, 0x8a8f96]], use: "radio", recipe: [["Black", 1], ["Copper", 1], ["Wisp dust", 1]] },
  { key: "Megaphone", name: "Megaphone", cat: "Communication", kind: "item", color: "#f2efe6", parts: [grip(BLK), ["c", 0.05, 0.13, 0, 0.05, 0, WHT, 0, 0.022], ["c", 0.051, 0.01, 0, 0.115, 0, RED]], use: "shout", recipe: [["White", 2], ["Wisp dust", 1]] },
  { key: "TvCamera", name: "TV camera", cat: "Communication", kind: "item", color: "#3a3f46", parts: [grip(BLK), ["b", 0.07, 0.07, 0.13, 0, 0.0, 0.01, GUN], ["c", 0.03, 0.05, 0, 0.0, -0.075, BLK, H], ["b", 0.03, 0.02, 0.05, 0, 0.045, 0.02, BLK]], use: "zoom", recipe: [["Black", 2], ["Window", 1], ["Copper", 1]] },
  { key: "Binoculars", name: "Binoculars", cat: "Communication", kind: "item", color: "#23262b", parts: [grip(BLK, -0.05), ["c", 0.022, 0.08, -0.026, 0.02, 0, BLK], ["c", 0.022, 0.08, 0.026, 0.02, 0, BLK], ["b", 0.03, 0.02, 0.02, 0, 0.02, 0, GUN]], use: "zoom", recipe: [["Black", 1], ["Window", 2]] },
  { key: "Magnifier", name: "Magnifying glass", cat: "Communication", kind: "item", color: "#6fd0ff", parts: [grip(BLK), ["c", 0.012, 0.08, 0, -0.02, 0, BLK], ["c", 0.06, 0.012, 0, 0.07, 0, GLD, H], ["c", 0.05, 0.014, 0, 0.07, 0, TRB, H]], use: "inspect", recipe: [["Window", 1], ["Gold", 1]] },
  { key: "Phone", name: "Phone", cat: "Communication", kind: "item", color: "#23262b", parts: [grip(BLK, -0.06), ["b", 0.05, 0.1, 0.012, 0, 0.0, 0, BLK], ["b", 0.042, 0.08, 0.004, 0, 0.0, -0.007, 0x2a6fd0]], use: "radio", recipe: [["Black", 1], ["Window", 1], ["Copper", 1]] },
  // ---- Contenants (3899 2343 4449 4738a 2489 61976) ----
  { key: "Mug", name: "Mug", cat: "Contenants", kind: "item", color: "#f2efe6", parts: [["c", 0.04, 0.08, 0, 0, 0, WHT], ["b", 0.02, 0.05, 0.012, 0.05, 0, 0, WHT]], recipe: [["White", 1]] },
  { key: "Goblet", name: "Goblet", cat: "Contenants", kind: "item", color: "#d8a22e", parts: [["c", 0.04, 0.05, 0, 0.04, 0, GLD, 0, 0.045], ["c", 0.01, 0.05, 0, -0.01, 0, GLD], ["c", 0.035, 0.012, 0, -0.04, 0, GLD]], recipe: [["Gold", 1]] },
  { key: "Suitcase", name: "Suitcase", cat: "Contenants", kind: "item", color: "#8a5a2a", parts: [["b", 0.16, 0.11, 0.05, 0, 0, 0, BRN], ["b", 0.05, 0.02, 0.012, 0, 0.065, 0, BLK], ["b", 0.165, 0.008, 0.052, 0, 0.0, 0, GLD]], recipe: [["Felt", 2], ["Ingot", 1]] },
  { key: "TreasureChest", name: "Treasure chest", cat: "Contenants", kind: "item", color: "#7c522b", parts: [["b", 0.16, 0.08, 0.1, 0, -0.02, 0, WD], ["c", 0.05, 0.16, 0, 0.02, 0, DWD, H], ["b", 0.02, 0.03, 0.01, 0, 0.0, -0.052, GLD]], recipe: [["Plank", 4], ["Gold", 1]] },
  { key: "Bag", name: "Bag", cat: "Contenants", kind: "item", color: "#c4924a", parts: [["c", 0.05, 0.09, 0, -0.01, 0, 0xc4924a, 0, 0.035], ["c", 0.02, 0.03, 0, 0.05, 0, 0x8a5a2a]], recipe: [["Felt", 2]] },
  // ---- Nourriture (33125 33051 33085 33057 33078 6254 14769) ----
  { key: "Croissant", name: "Croissant", cat: "Nourriture", kind: "food", color: "#e0a24a", parts: [["c", 0.03, 0.12, 0, 0, 0, 0xe0a24a, H], ["c", 0.02, 0.04, 0.075, -0.01, 0, 0xc4822a, H + 0.5], ["c", 0.02, 0.04, -0.075, -0.01, 0, 0xc4822a, H - 0.5]], food: 6, recipe: [["Grain", 2], ["Milk", 1]], out: 3 },
  { key: "Banana", name: "Banana", cat: "Nourriture", kind: "food", color: "#f5d518", parts: [["c", 0.018, 0.09, 0, 0.02, 0, YEL, -0.3], ["c", 0.018, 0.08, 0.02, -0.06, 0, YEL, 0.3], ["c", 0.008, 0.02, -0.015, 0.075, 0, DWD]], food: 4, recipe: [["Apple", 1], ["Yellow bloom", 1]] },
  { key: "TurkeyLeg", name: "Turkey leg", cat: "Nourriture", kind: "food", color: "#b4682a", parts: [["c", 0.04, 0.08, 0, 0.03, 0, 0xb4682a, 0, 0.03], ["c", 0.012, 0.06, 0, -0.04, 0, WHT], ["c", 0.018, 0.015, 0, -0.075, 0, WHT]], food: 8, recipe: [["Cooked chop", 1]] },
  { key: "HotDog", name: "Hot dog", cat: "Nourriture", kind: "food", color: "#e0b15a", parts: [["b", 0.14, 0.03, 0.045, 0, 0, 0, 0xe0b15a], ["c", 0.014, 0.16, 0, 0.018, 0, 0xc04a2a, H]], food: 7, recipe: [["Loaf", 1], ["Toy ham", 1]], out: 2 },
  { key: "IceCream", name: "Ice cream", cat: "Nourriture", kind: "food", color: "#f4b8d0", parts: [["c", 0.03, 0.08, 0, -0.03, 0, 0xd8a25a, 0, 0.003], ["c", 0.034, 0.05, 0, 0.03, 0, 0xf4b8d0]], food: 4, recipe: [["Snow", 1], ["Milk", 1], ["Sugar", 1]], out: 2 },
  { key: "Pizza", name: "Pizza", cat: "Nourriture", kind: "food", color: "#f5c518", parts: [["b", 0.14, 0.012, 0.14, 0, 0, 0, 0xe0a24a], ["b", 0.12, 0.006, 0.12, 0, 0.008, 0, 0xf5c518], ["c", 0.014, 0.004, 0.03, 0.012, 0.02, RED], ["c", 0.014, 0.004, -0.03, 0.012, -0.03, RED]], food: 9, recipe: [["Grain", 3], ["Toy ham", 1], ["Apple", 1]], out: 2 },
  // ---- Armes médiévales (3847 59 30173 3848; arc/arbalète déjà en jeu) ----
  { key: "ShortSword", name: "Short sword", cat: "Armes médiévales", kind: "tool", color: "#c5ccd3", parts: [grip(BLK), ["b", 0.11, 0.022, 0.03, 0, -0.05, 0, GUN], ["b", 0.04, 0.17, 0.016, 0, 0.05, 0, MET]], tool: "sword", tier: 2, maxUse: 120, recipe: [["Ingot", 1], ["Stick", 1]] },
  { key: "LongSword", name: "Long sword", cat: "Armes médiévales", kind: "tool", color: "#d9dde2", parts: [grip(BLK), ["b", 0.14, 0.024, 0.03, 0, -0.05, 0, GLD], ["b", 0.044, 0.28, 0.016, 0, 0.1, 0, MET], ["c", 0.02, 0.02, 0, -0.17, 0, GLD]], tool: "sword", tier: 3, maxUse: 220, recipe: [["Ingot", 2], ["Gold", 1], ["Stick", 1]] },
  { key: "Katana", name: "Katana", cat: "Armes médiévales", kind: "tool", color: "#e8ecf0", parts: [grip(BLK), ["c", 0.03, 0.01, 0, -0.05, 0, GLD], ["b", 0.026, 0.27, 0.012, 0.006, 0.09, 0, 0xe8ecf0, -0.06]], tool: "sword", tier: 4, maxUse: 260, recipe: [["Ingot", 2], ["Black", 1], ["Gold", 1]] },
  { key: "Halberd", name: "Halberd", cat: "Armes médiévales", kind: "tool", color: "#8e959c", parts: [grip(WD), ["c", 0.014, 0.4, 0, 0.06, 0, WD], ["b", 0.08, 0.08, 0.012, 0.04, 0.21, 0, MET], ["b", 0.02, 0.09, 0.012, 0, 0.29, 0, MET]], tool: "sword", tier: 3, maxUse: 200, recipe: [["Ingot", 2], ["Stick", 2]] },
  // ---- Boucliers (3846 2586 92747 75902) ----
  { key: "TriShield", name: "Triangle shield", cat: "Boucliers", kind: "shield", color: "#2a6fd0", parts: [["b", 0.15, 0.12, 0.016, 0, 0.03, 0, BLU], ["b", 0.1, 0.1, 0.016, 0, -0.03, 0, BLU, Math.PI / 4], ["b", 0.03, 0.03, 0.02, 0, 0.02, -0.006, YEL]], maxUse: 140, recipe: [["Plank", 3], ["Blue", 1]] },
  { key: "OvalShield", name: "Oval shield", cat: "Boucliers", kind: "shield", color: "#c8302a", parts: [["c", 0.08, 0.016, 0, 0, 0, RED, H], ["c", 0.025, 0.02, 0, 0, -0.004, GLD, H]], maxUse: 160, recipe: [["Plank", 3], ["Red", 1], ["Gold", 1]] },
  { key: "RoundShield", name: "Round shield", cat: "Boucliers", kind: "shield", color: "#7c522b", parts: [["c", 0.1, 0.016, 0, 0, 0, WD, H], ["c", 0.03, 0.026, 0, 0, -0.004, MET, H], ["c", 0.101, 0.008, 0, 0, 0.002, MET, H]], maxUse: 180, recipe: [["Plank", 4], ["Ingot", 1]] },
  // ---- Pirates & Western (2530 2562 2561 30132 61482) ----
  { key: "Cutlass", name: "Cutlass", cat: "Pirates & Western", kind: "tool", color: "#c5ccd3", parts: [grip(BLK), ["b", 0.06, 0.05, 0.016, 0.03, -0.06, 0, GLD], ["b", 0.05, 0.2, 0.014, 0.012, 0.07, 0, MET, -0.08]], tool: "sword", tier: 3, maxUse: 180, recipe: [["Ingot", 2], ["Gold", 1]] },
  { key: "Handcuffs", name: "Handcuffs", cat: "Pirates & Western", kind: "item", color: "#b0b6be", parts: [["c", 0.03, 0.01, -0.04, 0, 0, MET, H], ["c", 0.03, 0.01, 0.04, 0, 0, MET, H], ["b", 0.03, 0.006, 0.006, 0, 0, 0, MET]], use: "cuff", maxUse: 20, recipe: [["Ingot", 2]] },
  // ---- Sci-Fi & espace (64567 30374 92738 58247 57899 15391) ----
  { key: "Lightsaber", name: "Light sabre", cat: "Sci-Fi & espace", kind: "tool", color: "#3ef06a", parts: [grip(0x8a8f96), ["c", 0.022, 0.025, 0, -0.04, 0, BLK], ["c", 0.014, 0.3, 0, 0.12, 0, 0x6aff8a]], tool: "sword", tier: 5, maxUse: 400, light: 9, recipe: [["Chrome", 1], ["Prism", 1], ["Wisp dust", 2]] },
  // ---- Magie & musique (36752 4341 11640 25975 13808) ----
  { key: "Cauldron", name: "Cauldron", cat: "Magie & musique", kind: "item", color: "#23262b", parts: [["c", 0.07, 0.08, 0, 0, 0, BLK, 0, 0.08], ["c", 0.06, 0.006, 0, 0.04, 0, GRN], ["c", 0.012, 0.03, 0.04, -0.05, 0, BLK], ["c", 0.012, 0.03, -0.04, -0.05, 0, BLK]], recipe: [["Ingot", 5]] },
  { key: "ElectricGuitar", name: "Electric guitar", cat: "Magie & musique", kind: "item", color: "#c8302a", parts: [grip(BLK, -0.02), ["b", 0.1, 0.11, 0.02, 0, -0.08, 0, RED], ["b", 0.022, 0.18, 0.014, 0, 0.07, 0, BLK], ["b", 0.034, 0.04, 0.016, 0, 0.17, 0, BLK]], use: "music", recipe: [["Red", 2], ["Black", 1], ["Copper", 1]] },
  { key: "AcousticGuitar", name: "Acoustic guitar", cat: "Magie & musique", kind: "item", color: "#c4924a", parts: [grip(DWD, -0.02), ["c", 0.055, 0.025, 0, -0.08, 0, 0xc4924a, H], ["c", 0.045, 0.025, 0, -0.02, 0, 0xc4924a, H], ["c", 0.014, 0.027, 0, -0.05, 0, DWD, H], ["b", 0.022, 0.16, 0.014, 0, 0.08, 0, DWD]], use: "music", recipe: [["Plank", 3], ["Stick", 1]] },
  { key: "Saxophone", name: "Saxophone", cat: "Magie & musique", kind: "item", color: "#d8a22e", parts: [grip(GLD), ["c", 0.016, 0.18, 0, 0.02, 0, GLD], ["c", 0.035, 0.05, 0.025, -0.07, 0, GLD, -0.8, 0.02], ["c", 0.008, 0.04, -0.012, 0.12, 0, BLK, 0.6]], use: "music", recipe: [["Gold", 2], ["Ingot", 1]] },
  // ---- Casques & coiffes (3833 2446 2447 4485 2528) ----
  { key: "HardHat", name: "Hard hat", cat: "Casques & coiffes", kind: "wear", color: "#f5c518", parts: [["c", 0.07, 0.06, 0, 0.02, 0, YEL, 0, 0.055], ["c", 0.085, 0.01, 0, -0.012, 0, YEL]], armorSlot: 1, recipe: [["Yellow", 3]] },
  { key: "SpaceHelmet", name: "Space helmet", cat: "Casques & coiffes", kind: "wear", color: "#f2efe6", parts: [["c", 0.075, 0.09, 0, 0, 0, WHT], ["b", 0.11, 0.05, 0.02, 0, 0.0, -0.07, TRB]], armorSlot: 1, recipe: [["White", 3], ["Window", 1]] },
  { key: "Visor", name: "Visor", cat: "Casques & coiffes", kind: "wear", color: "#6fd0ff", parts: [["b", 0.13, 0.05, 0.02, 0, 0, 0, TRB], ["b", 0.02, 0.03, 0.06, -0.07, 0.01, 0.03, BLK], ["b", 0.02, 0.03, 0.06, 0.07, 0.01, 0.03, BLK]], armorSlot: 1, recipe: [["Window", 1], ["Black", 1]] },
  { key: "BaseballCap", name: "Baseball cap", cat: "Casques & coiffes", kind: "wear", color: "#2a6fd0", parts: [["c", 0.065, 0.05, 0, 0.01, 0, BLU, 0, 0.05], ["b", 0.09, 0.008, 0.06, 0, -0.012, -0.07, BLU]], armorSlot: 1, recipe: [["Blue", 2], ["Felt", 1]] },
  { key: "Bicorne", name: "Bicorne", cat: "Casques & coiffes", kind: "wear", color: "#23262b", parts: [["c", 0.06, 0.04, 0, 0, 0, BLK], ["b", 0.2, 0.06, 0.03, 0, 0.03, 0, BLK], ["b", 0.02, 0.03, 0.032, 0.04, 0.035, 0, GLD]], armorSlot: 1, recipe: [["Black", 2], ["Felt", 1], ["Gold", 1]] },
  // ---- Épaules & dos (2524 3838 64648 4498 2587 522) ----
  { key: "Backpack", name: "Backpack", cat: "Épaules & dos", kind: "wear", color: "#3aa84c", parts: [["b", 0.12, 0.13, 0.06, 0, 0, 0, GRN], ["b", 0.1, 0.05, 0.02, 0, -0.03, 0.04, 0x2e8a3e]], armorSlot: 2, recipe: [["Felt", 2], ["Green", 1]] },
  { key: "AirTanks", name: "Air tanks", cat: "Épaules & dos", kind: "wear", color: "#b0b6be", parts: [["c", 0.03, 0.15, -0.035, 0, 0, MET], ["c", 0.03, 0.15, 0.035, 0, 0, MET], ["b", 0.11, 0.02, 0.03, 0, 0.04, 0.02, BLK]], armorSlot: 2, recipe: [["Ingot", 3], ["Bottle", 2]] },
  { key: "Quiver", name: "Quiver", cat: "Épaules & dos", kind: "wear", color: "#8a5a2a", parts: [["c", 0.03, 0.17, 0, 0, 0, BRN], ["c", 0.005, 0.05, -0.01, 0.1, 0, WHT], ["c", 0.005, 0.05, 0.012, 0.1, 0, WHT]], armorSlot: 2, recipe: [["Felt", 2], ["Stick", 1]] },
  { key: "Breastplate", name: "Breastplate", cat: "Épaules & dos", kind: "wear", color: "#c5ccd3", parts: [["b", 0.14, 0.14, 0.06, 0, 0, 0, MET], ["b", 0.18, 0.03, 0.065, 0, 0.06, 0, MET], ["b", 0.03, 0.12, 0.008, 0, 0, -0.033, 0xd9dde2]], armorSlot: 2, recipe: [["Ingot", 5]] },
  { key: "Cape", name: "Cape", cat: "Épaules & dos", kind: "wear", color: "#c8302a", parts: [["b", 0.14, 0.2, 0.008, 0, -0.04, 0, RED], ["b", 0.12, 0.02, 0.03, 0, 0.065, 0.01, RED]], armorSlot: 2, recipe: [["Felt", 2], ["Red", 1]] },

  // ---- Firearms (Pirates & Western, Sci-Fi, + carbine/rifle) — see firearms.ts ----
  { key: "Flintlock", name: "Flintlock pistol", cat: "Pirates & Western", kind: "gun", color: "#7c522b", parts: [pgrip(WD, -0.1), ["c", 0.012, 0.13, -0.005, -0.04, 0, MET, H], ["b", 0.06, 0.03, 0.026, -0.07, -0.045, 0, WD], ["b", 0.02, 0.02, 0.01, -0.07, -0.022, 0, MET]], muzzle: [0.06, -0.04, 0], maxUse: 160, recipe: [["Ingot", 2], ["Plank", 1], ["Stick", 1]] },
  { key: "Musket", name: "Musket", cat: "Pirates & Western", kind: "gun", color: "#7c522b", parts: [["b", 0.24, 0.03, 0.028, -0.03, -0.05, 0, WD], ["b", 0.08, 0.05, 0.026, -0.15, -0.065, 0, WD], ["c", 0.011, 0.24, 0.05, -0.03, 0, MET, H], pgrip(WD)], muzzle: [0.17, -0.03, 0], maxUse: 240, recipe: [["Ingot", 3], ["Plank", 2]] },
  { key: "Revolver", name: "Revolver", cat: "Pirates & Western", kind: "gun", color: "#8e959c", parts: [pgrip(DWD, -0.1), ["c", 0.012, 0.11, -0.01, -0.035, 0, GUN, H], ["c", 0.022, 0.035, -0.07, -0.04, 0, GUN, H], ["b", 0.03, 0.02, 0.024, -0.095, -0.03, 0, GUN]], muzzle: [0.045, -0.035, 0], maxUse: 260, recipe: [["Ingot", 3], ["Plank", 1]] },
  { key: "Carbine", name: "Carbine", cat: "Armes à feu", kind: "gun", color: "#3a3f46", parts: [["b", 0.2, 0.04, 0.03, -0.02, -0.05, 0, GUN], ["b", 0.07, 0.05, 0.026, -0.15, -0.06, 0, BLK], ["c", 0.01, 0.12, 0.13, -0.045, 0, BLK, H], ["b", 0.03, 0.06, 0.02, 0.0, -0.095, 0, BLK, 0.15], ["b", 0.08, 0.012, 0.012, -0.02, -0.024, 0, BLK], pgrip()], muzzle: [0.19, -0.045, 0], maxUse: 500, recipe: [["Ingot", 5], ["Black", 2], ["Copper", 1]] },
  { key: "Rifle", name: "Rifle", cat: "Armes à feu", kind: "gun", color: "#7c522b", parts: [["b", 0.28, 0.035, 0.028, 0.0, -0.05, 0, WD], ["b", 0.09, 0.055, 0.026, -0.17, -0.065, 0, WD], ["c", 0.01, 0.16, 0.16, -0.04, 0, GUN, H], ["c", 0.012, 0.09, -0.01, -0.012, 0, BLK, H], ["b", 0.012, 0.02, 0.03, -0.06, -0.03, 0.02, MET], pgrip(DWD)], muzzle: [0.24, -0.04, 0], maxUse: 400, recipe: [["Ingot", 4], ["Plank", 2], ["Window", 1]] },
  { key: "BlasterS", name: "Short blaster", cat: "Sci-Fi & espace", kind: "gun", color: "#23262b", parts: [pgrip(BLK, -0.08), ["b", 0.12, 0.035, 0.03, -0.04, -0.04, 0, BLK], ["c", 0.01, 0.03, 0.035, -0.04, 0, 0x8a8f96, H]], muzzle: [0.05, -0.04, 0], maxUse: 300, recipe: [["Black", 2], ["Copper", 1], ["Wisp dust", 1]] },
  { key: "BlasterM", name: "Blaster", cat: "Sci-Fi & espace", kind: "gun", color: "#23262b", parts: [pgrip(), ["b", 0.2, 0.04, 0.03, -0.02, -0.045, 0, BLK], ["c", 0.012, 0.06, 0.11, -0.045, 0, 0x8a8f96, H], ["b", 0.05, 0.02, 0.02, -0.03, -0.018, 0, GUN]], muzzle: [0.14, -0.045, 0], maxUse: 400, recipe: [["Black", 3], ["Copper", 2], ["Wisp dust", 1]] },
  { key: "BlasterL", name: "Long blaster", cat: "Sci-Fi & espace", kind: "gun", color: "#23262b", parts: [pgrip(), ["b", 0.3, 0.04, 0.03, 0.0, -0.045, 0, BLK], ["b", 0.07, 0.05, 0.026, -0.17, -0.06, 0, GUN], ["c", 0.012, 0.06, 0.18, -0.045, 0, 0x8a8f96, H], ["c", 0.014, 0.08, -0.02, -0.012, 0, GUN, H]], muzzle: [0.21, -0.045, 0], maxUse: 500, recipe: [["Black", 4], ["Copper", 2], ["Prism", 1]] },
  { key: "Launcher", name: "Launcher", cat: "Sci-Fi & espace", kind: "gun", color: "#3aa84c", parts: [["c", 0.03, 0.3, 0.0, -0.03, 0, 0x2e8a3e, H], ["c", 0.034, 0.02, 0.15, -0.03, 0, BLK, H], pgrip(BLK, -0.02)], muzzle: [0.16, -0.03, 0], maxUse: 120, recipe: [["Ingot", 3], ["Green", 2], ["Popper powder", 1]] },
  { key: "Wand", name: "Magic wand", cat: "Magie & musique", kind: "gun", color: "#4a2e16", parts: [["c", 0.008, 0.2, 0.0, -0.04, 0, DWD, H], ["c", 0.012, 0.06, -0.09, -0.04, 0, BLK, H], ["c", 0.006, 0.02, 0.105, -0.04, 0, WHT, H], pgrip(DWD, -0.08)], muzzle: [0.11, -0.04, 0], maxUse: 150, light: 4, recipe: [["Stick", 1], ["Wisp dust", 2]] },

  // ---- ammunition (cartridge = casing + powder + bullet) ----
  { key: "Casing", name: "Brass casing", cat: "Munitions", kind: "item", color: "#d8a22e", parts: [["c", 0.012, 0.04, 0, 0, 0, GLD]], recipe: [["Copper", 1]], out: 8 },
  { key: "Bullet", name: "Bullet", cat: "Munitions", kind: "item", color: "#8e959c", parts: [["c", 0.011, 0.02, 0, 0, 0, 0x8e959c, 0, 0.004]], recipe: [["Ingot", 1]], out: 8 },
  { key: "Cartridge", name: "Cartridge", cat: "Munitions", kind: "item", color: "#d8a22e", parts: [["c", 0.012, 0.04, 0, -0.01, 0, GLD], ["c", 0.011, 0.02, 0, 0.02, 0, 0x8e959c, 0, 0.004]], recipe: [["Brass casing", 1], ["Popper powder", 1], ["Bullet", 1]], out: 2 },
  { key: "PowerCell", name: "Power cell", cat: "Munitions", kind: "item", color: "#3ec8ff", parts: [["c", 0.018, 0.05, 0, 0, 0, 0x3ec8ff], ["c", 0.01, 0.01, 0, 0.03, 0, MET]], recipe: [["Copper", 1], ["Wisp dust", 1]], out: 4 },
  // ---- 2026-11-01 (Claude): modern arsenal + rounds cast from plastic (the stud logic) ----
  // APPENDED at the end so every existing accessory keeps its id (ACC_BASE + index).
  { key: "Pistol", name: "Pistol", cat: "Armes à feu", kind: "gun", color: "#2b2f35", parts: [pgrip(BLK, -0.08), ["b", 0.13, 0.03, 0.026, -0.04, -0.04, 0, GUN], ["c", 0.007, 0.02, 0.035, -0.045, 0, BLK, H]], muzzle: [0.06, -0.04, 0], maxUse: 400, recipe: [["Plastic ingot", 3], ["Copper", 1]] },
  { key: "SMG", name: "Submachine gun", cat: "Armes à feu", kind: "gun", color: "#1b1d21", parts: [pgrip(BLK, -0.06), ["b", 0.18, 0.04, 0.03, -0.02, -0.045, 0, GUN], ["b", 0.02, 0.07, 0.02, 0.0, -0.1, 0, BLK]], muzzle: [0.14, -0.048, 0], maxUse: 600, recipe: [["Plastic ingot", 4], ["Copper", 2], ["Gear 16T", 1]] },
  { key: "Shotgun", name: "Pump shotgun", cat: "Armes à feu", kind: "gun", color: "#7c522b", parts: [pgrip(WD), ["b", 0.26, 0.035, 0.028, 0, -0.045, 0, WD], ["c", 0.012, 0.22, 0.06, -0.03, 0, GUN, H]], muzzle: [0.245, -0.038, 0], maxUse: 300, recipe: [["Plastic ingot", 4], ["Plank", 2], ["Copper", 1]] },
  { key: "Assault", name: "Assault rifle", cat: "Armes à feu", kind: "gun", color: "#3a3f46", parts: [pgrip(BLK), ["b", 0.28, 0.04, 0.03, 0, -0.05, 0, GUN], ["b", 0.025, 0.07, 0.02, -0.01, -0.1, 0, BLK]], muzzle: [0.26, -0.047, 0], maxUse: 700, recipe: [["Tempered ingot", 2], ["Plastic ingot", 3], ["Copper", 2]] },
  { key: "Sniper", name: "Sniper rifle", cat: "Armes à feu", kind: "gun", color: "#3a5530", parts: [pgrip(BLK), ["b", 0.34, 0.035, 0.028, 0.02, -0.05, 0, 0x3a5530], ["c", 0.012, 0.12, -0.04, -0.01, 0, BLK, H]], muzzle: [0.31, -0.04, 0], maxUse: 250, use: "zoom", recipe: [["Tempered ingot", 3], ["Window", 1], ["Copper", 2]] },
  { key: "StudSlug", name: "Stud slug", cat: "Munitions", kind: "item", color: "#e8dcc0", parts: [["c", 0.012, 0.012, 0, 0, 0, 0xe8dcc0], ["c", 0.007, 0.006, 0, 0.009, 0, 0xe8dcc0]], recipe: [["Plastic pellets", 1]], out: 6 },
  { key: "LightRound", name: "Light round", cat: "Munitions", kind: "item", color: "#d8a22e", parts: [["c", 0.01, 0.03, 0, -0.008, 0, GLD], ["c", 0.009, 0.014, 0, 0.014, 0, 0xe8dcc0, 0, 0.004]], recipe: [["Brass casing", 1], ["Popper powder", 1], ["Stud slug", 1]], out: 4 },
  { key: "RifleRound", name: "Rifle round", cat: "Munitions", kind: "item", color: "#d8a22e", parts: [["c", 0.011, 0.05, 0, -0.01, 0, GLD], ["c", 0.009, 0.02, 0, 0.025, 0, 0xe8dcc0, 0, 0.003]], recipe: [["Brass casing", 2], ["Popper powder", 2], ["Stud slug", 1]], out: 3 },
  { key: "Shell", name: "Shotgun shell", cat: "Munitions", kind: "item", color: "#c8302a", parts: [["c", 0.014, 0.04, 0, 0.004, 0, RED], ["c", 0.0145, 0.012, 0, -0.022, 0, GLD]], recipe: [["Brass casing", 1], ["Popper powder", 1], ["Stud slug", 3]], out: 2 },
  // ---- 2026-11-01 (Claude, Philippe: "objets spéciaux pour les boss") ----
  // One signature item per boss. Matter law: each is CAST from that boss's
  // own drops (what it is made of, how it is made) — the first kill of a
  // boss also drops one. Its power wakes only at the builder level of the
  // boss's zone (lvl), so the item is a goal, not a free win.
  { key: "LianeWhip", name: "Liane whip", cat: "Reliques de boss", kind: "tool", color: "#3f8a3a", boss: "totem-liane", lvl: 4, power: "Roots what it strikes in place for 4 s", parts: [grip(0x2e5a20), ["c", 0.012, 0.22, 0, 0.03, 0, 0x3f8a3a], ["c", 0.009, 0.1, 0.03, 0.17, 0, 0x6ac04a, -0.6], ["b", 0.03, 0.03, 0.03, 0.06, 0.21, 0, 0xa6e05a]], tool: "sword", tier: 3, maxUse: 420, recipe: [["Wax", 2], ["Crystal", 1], ["Trade gem", 1], ["Rubber band", 2]] },
  { key: "SphinxMask", name: "Sphinx mask", cat: "Reliques de boss", kind: "wear", color: "#d8b04a", boss: "sphinx-moule", lvl: 7, power: "Fire and burning cannot touch you", armorSlot: 1, armor: 0.14, parts: [["b", 0.16, 0.14, 0.15, 0, 0, 0, GLD], ["b", 0.18, 0.04, 0.16, 0, 0.07, 0, 0x1d4ed8], ["b", 0.03, 0.05, 0.02, -0.035, 0.0, -0.075, BLK], ["b", 0.03, 0.05, 0.02, 0.035, 0.0, -0.075, BLK]], recipe: [["Scarab relic", 2], ["Gold", 3], ["Scale", 2]] },
  { key: "FrostTusk", name: "Frost tusk", cat: "Reliques de boss", kind: "tool", color: "#dff0ff", boss: "mammouth-glacon", lvl: 13, power: "Freezes: the struck creature slows for 3 s, +1 damage", parts: [grip(0x6a7a8a), ["c", 0.02, 0.26, 0, 0.04, 0, 0xeaf6ff, 0, 0.004], ["b", 0.07, 0.025, 0.03, 0, -0.04, 0, 0x7ad8ff]], tool: "sword", tier: 4, maxUse: 620, recipe: [["Frost shard", 3], ["Fuzz", 2], ["Crystal", 1], ["Tempered ingot", 1]] },
  { key: "TitanMaul", name: "Titan maul", cat: "Reliques de boss", kind: "tool", color: "#2a1e1a", boss: "forge-titan", lvl: 18, power: "Sets the struck creature ablaze, +2 damage", parts: [grip(0x2a1e1a), ["c", 0.018, 0.2, 0, 0.02, 0, 0x2a1e1a], ["b", 0.13, 0.08, 0.08, 0, 0.14, 0, 0x3a2a24], ["b", 0.135, 0.02, 0.085, 0, 0.14, 0, 0xff7a1a]], tool: "axe", tier: 5, maxUse: 760, recipe: [["Ember rod", 2], ["Ember scrap", 3], ["Cinder", 2], ["Tempered ingot", 2]] },
  { key: "MeadowBell", name: "Meadow bell", cat: "Reliques de boss", kind: "item", color: "#f4f1ea", boss: "grand-meuhbloc", lvl: 2, power: "Carried: your health mends twice as fast", parts: [["c", 0.045, 0.06, 0, 0, 0, GLD, 0, 0.025], ["c", 0.012, 0.02, 0, -0.035, 0, DWD], ["b", 0.11, 0.015, 0.015, 0, 0.04, 0, 0xc8302a]], recipe: [["Gold", 2], ["Felt", 2], ["Toy ham", 1]] },
  { key: "PiggyBank", name: "Golden piggy bank", cat: "Reliques de boss", kind: "item", color: "#f2a2c0", boss: "grand-tirelire", lvl: 1, power: "Carried: every kill may shake loose a trade gem", parts: [["b", 0.1, 0.07, 0.07, 0, 0, 0, 0xf2a2c0], ["b", 0.03, 0.03, 0.03, 0.06, 0.01, 0, 0xf2a2c0], ["b", 0.04, 0.008, 0.012, 0, 0.038, 0, GLD]], recipe: [["Gold", 3], ["Trade gem", 2], ["Toy ham", 1]] },
  { key: "StrataPick", name: "Strata pick", cat: "Reliques de boss", kind: "tool", color: "#8a8f96", boss: "golem-strate", lvl: 11, power: "Mines twice as fast", parts: [grip(WD), ["c", 0.017, 0.24, 0, 0.03, 0, WD], ["b", 0.2, 0.035, 0.035, 0, 0.15, 0, 0x8a8f96], ["b", 0.05, 0.04, 0.04, 0, 0.15, 0, 0xc87a3a]], tool: "pick", tier: 5, maxUse: 1100, recipe: [["Ingot", 3], ["Copper", 3], ["Crystal", 1]] },
  { key: "JellyBoots", name: "Jelly boots", cat: "Reliques de boss", kind: "wear", color: "#7ad04a", boss: "reine-gelatine", lvl: 6, power: "Falls never hurt you", armorSlot: 4, armor: 0.1, parts: [["b", 0.08, 0.05, 0.12, -0.05, 0, 0, 0x7ad04a], ["b", 0.08, 0.05, 0.12, 0.05, 0, 0, 0x7ad04a], ["b", 0.2, 0.012, 0.13, 0, -0.03, 0, 0x4a9a2a]], recipe: [["Gel", 4], ["Mixer essence", 1], ["Mend brew", 1]] },
  { key: "RaiderCloak", name: "Raider cloak", cat: "Reliques de boss", kind: "wear", color: "#5a3a2a", boss: "chef-pilleplot", lvl: 9, power: "Guards and villagers spot you half as well", armorSlot: 2, armor: 0.12, parts: [["b", 0.2, 0.22, 0.03, 0, 0, 0.06, 0x5a3a2a], ["b", 0.22, 0.04, 0.12, 0, 0.11, 0, 0x3a2418], ["b", 0.05, 0.05, 0.01, 0, 0.06, 0.08, 0xc8302a]], recipe: [["Raider badge", 2], ["Felt", 3], ["Trade gem", 1]] },
  { key: "PressGauntlet", name: "Press gauntlet", cat: "Reliques de boss", kind: "tool", color: "#f5c518", boss: "pharaon-presse", lvl: 20, power: "Flattens: +3 damage and a crushing knock-back", parts: [["b", 0.09, 0.09, 0.1, 0, 0, 0, GLD], ["b", 0.095, 0.03, 0.105, 0, 0.05, 0, 0x1d4ed8], ["b", 0.03, 0.06, 0.04, 0.055, -0.01, 0, GLD]], tool: "sword", tier: 5, maxUse: 700, recipe: [["Scarab relic", 3], ["Gold", 3], ["Last stud", 1], ["Tempered ingot", 2]] },
  { key: "KrakenEye", name: "Kraken eye", cat: "Reliques de boss", kind: "wear", color: "#2ab0a8", boss: "kraken-bouee", lvl: 15, power: "Breathe under water for as long as you like", armorSlot: 1, armor: 0.12, parts: [["b", 0.16, 0.12, 0.15, 0, 0, 0, 0x2ab0a8], ["c", 0.04, 0.02, 0, 0.0, -0.08, 0xffe14a, H], ["c", 0.018, 0.022, 0, 0.0, -0.085, BLK, H]], recipe: [["Buoy spike", 2], ["Shell chip", 3], ["Prism", 1]] },
  { key: "PressHeart", name: "Heart of the Great Press", cat: "Reliques de boss", kind: "item", color: "#7a3ad0", boss: "dragon", lvl: 22, power: "Carried: +2 hearts of health", parts: [["b", 0.08, 0.08, 0.08, 0, 0, 0, 0x2a1a3a], ["b", 0.084, 0.02, 0.084, 0, 0.02, 0, 0xd86aff], ["b", 0.02, 0.02, 0.09, 0, -0.02, 0, 0xff5ab0]], recipe: [["Prism sentinel core", 1], ["Last stud", 1], ["Prism", 2], ["Tempered ingot", 2]] },
  { key: "TripleCore", name: "Triple core", cat: "Reliques de boss", kind: "item", color: "#3a3f46", boss: "wither", lvl: 20, power: "Carried: +2 damage to every blow", parts: [["c", 0.03, 0.03, -0.04, 0, 0, 0x3a3f46], ["c", 0.03, 0.03, 0.04, 0, 0, 0x3a3f46], ["c", 0.035, 0.035, 0, 0.03, 0, 0x5a5f66], ["c", 0.01, 0.04, 0, 0.03, -0.03, 0xff3a2a, H]], recipe: [["Weld star", 2], ["Ember scrap", 2], ["Tempered ingot", 2]] },
];

export const ACC_BY_KEY: Record<string, Acc> = Object.fromEntries(ACCESSORIES.map((a) => [a.key, a]));
/** first id of the accessory block (contiguous, Uint16 chunks) */
export const ACC_BASE = 540;
export const accId = (key: string) => ACC_BASE + ACCESSORIES.findIndex((a) => a.key === key);
