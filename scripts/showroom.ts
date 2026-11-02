// Dev tool: run `node --experimental-strip-types scripts/showroom.ts` to
// regenerate the built-in showroom parts (printed as JSON on stdout).
import { design, O } from "./vehdesign.ts";
import type { ModelPart } from "../src/game/catalogue.ts";
const P = (id: number, dq: [number, number, number], o = 0, extra: Partial<ModelPart> = {}): ModelPart => ({ id, o, dq, ...extra });
const chassis = (motor: ModelPart[] = [P(447, [0, 7, -4])], wheels: number[] = [-4, 12]) => [
  P(378, [0, -5, -4]), P(378, [0, -5, 4]), P(378, [10, -5, -4]), P(378, [10, -5, 4]),
  P(446, [0, 0, 0]), ...motor, P(452, [12, -1, 0]),
  ...wheels.flatMap((x) => [P(362, [x, -8, -7]), P(362, [x, -8, 7])]),
];
const C = { yellow: 0xf5c518, red: 0xd22b20, blue: 0x2a62d6, green: 0x3f9b3a, lime: 0x8fd42c, orange: 0xf28a1c, white: 0xf4f4f4, black: 0x2d2f33, cyan: 0x2ac0d8, army: 0x5f6b3a, gold: 0xd9a520, purple: 0x7a4ad0 };
const skirts = (tint: number, y = -1) => ({ id: 445, o: O.side, at: [4, y, 9] as [number, number, number], tint, mirror: true });
const strip = (tint: number, x: number, y: number) => ({ id: 443, o: O.side, at: [x, y, 9] as [number, number, number], tint, mirror: true });
const out: Record<string, ModelPart[]> = {};
const D = (name: string, base: ModelPart[], wants: Parameters<typeof design>[2]) => (out[name] = design(name, base, wants).parts);

D("Starter Buggy", chassis(), [
  { id: 647, o: O.fwd, at: [0, 11, 0] }, { id: 640, o: O.fwd, at: [0, 5, 3] },
  skirts(C.yellow), { id: 445, o: O.flat, at: [12, 4, 0], tint: C.yellow },
]);
D("Scout Kart", chassis(), [
  { id: 645, o: O.fwd, at: [0, 11, 0] },
  strip(C.lime, 4, -2), { id: 439, o: O.front, at: [17, -2, 0], tint: C.lime },
]);
D("Gold Gunner", chassis(), [
  { id: 647, o: O.fwd, at: [0, 11, 0] }, { id: 641, o: 4, at: [-4, 1, 7] },
  skirts(C.black), strip(C.gold, 4, 3),
]);
D("Laser Runner", chassis(), [
  { id: 645, o: O.fwd, at: [0, 11, 0] }, { id: 642, o: O.fwd, at: [0, 5, 3] },
  { id: 445, o: O.flat, at: [14, 3, 0], tint: C.cyan }, strip(C.cyan, 6, -2), strip(C.white, 6, 0),
]);
D("Rocket Rover", chassis(), [
  { id: 647, o: O.fwd, at: [0, 11, 0] }, { id: 643, o: 4, at: [-4, 1, 7] },
  skirts(C.red), strip(C.white, 4, 3),
]);
D("Turret Truck", chassis(), [
  { id: 646, o: O.fwd, at: [0, 11, 0] }, { id: 644, o: O.fwd, at: [0, 5, 10] },
  skirts(C.army), { id: 457, o: O.side, at: [-6, 4, 9], tint: C.army, mirror: true },
]);
D("Hauler Cab", chassis(undefined, [-6, 4, 14]), [
  { id: 646, o: O.fwd, at: [6, 11, 0] },
  { id: 445, o: O.flat, at: [-6, 4, 0], tint: C.orange }, skirts(C.orange), strip(C.white, 4, 3),
]);
D("Mech Strider", chassis(), [
  { id: 648, o: O.fwd, at: [0, 11, 0] }, { id: 640, o: O.fwd, at: [0, 5, 3] },
  skirts(C.yellow), strip(C.black, 4, 2), strip(C.black, 4, -4),
]);
D("Twin Motor Racer", chassis([P(447, [0, 7, -4]), P(447, [0, 7, 4])]), [
  { id: 645, o: O.fwd, at: [0, 11, 0] },
  { id: 445, o: O.flat, at: [14, 3, 0], tint: C.red }, skirts(C.red, -3), { id: 397, o: O.side, at: [-8, 8, 0], tint: C.red },
  strip(C.white, 6, 1),
]);
D("Sensor Patrol", chassis(), [
  { id: 472, at: [0, 7, 4] }, { id: 646, o: O.fwd, at: [0, 11, 0] }, { id: 642, o: 4, at: [-4, 1, 7] },
  skirts(C.blue), strip(C.white, 4, 3),
]);
D("Heavy Lifter XL", chassis([P(449, [0, 9, -4])]), [
  { id: 647, o: O.fwd, at: [-4, 15, -4] },
  { id: 445, o: O.front, at: [20, 0, 0], tint: C.yellow, r: 5 }, skirts(C.yellow), { id: 458, o: O.side, at: [2, 6, 10], tint: C.yellow, mirror: true },
]);
console.log(JSON.stringify(out));
