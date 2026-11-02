// Vehicle model checker (dev tool, 2026-11-01): replays the game's load
// law for a catalogue model (flat ground, lift ≤3, TechWorld.test per
// part, AABB component from the hub, conversion) and then drives it on
// flat ground. Used to design the built-in showroom; mirrors
// catalogue.test.ts so a model that passes here passes there.
import { TechWorld, bbox } from "../src/game/teks.ts";
import { stepVehicle, vehicleFromAssembly } from "../src/game/vehicle.ts";
import type { ModelPart } from "../src/game/catalogue.ts";

export type Check = { placed: number; total: number; comp: number; missing: number; drove: number; failed: number[] };

export function checkModel(parts: ModelPart[]): Check {
  const ground = 63;
  const solidAt = (_x: number, y: number, _z: number) => y <= ground;
  const minDqY = Math.min(...parts.map((p) => p.dq[1]));
  const groundQ = (ground + 1) * 4 - minDqY;
  let best = -1;
  let anchorY = groundQ;
  let failed: number[] = [];
  for (let lift = 0; lift <= 3; lift++) {
    const t = new TechWorld();
    let fits = 0;
    const f: number[] = [];
    parts.forEach((mp, i) => {
      const q: [number, number, number] = [mp.dq[0], groundQ + lift * 4 + mp.dq[1], mp.dq[2]];
      if (t.test(mp.id, mp.o, q, solidAt) >= 0) {
        t.add(mp.id, mp.o, q);
        fits++;
      } else f.push(i);
    });
    if (fits > best) {
      best = fits;
      anchorY = groundQ + lift * 4;
      failed = f;
    }
    if (fits === parts.length) break;
  }
  const tech = new TechWorld();
  const placedIdx = parts.map((_, i) => i).filter((i) => !failed.includes(i));
  for (const i of placedIdx) {
    const mp = parts[i];
    tech.add(mp.id, mp.o, [mp.dq[0], anchorY + mp.dq[1], mp.dq[2]]);
  }
  const all = [...tech.parts.values()];
  const boxOf = (p: (typeof all)[number]) => {
    const [lo, hi] = bbox(p.id, p.o);
    return {
      c: [(p.q[0] + (lo[0] + hi[0]) / 2) / 4, (p.q[1] + (lo[1] + hi[1]) / 2) / 4, (p.q[2] + (lo[2] + hi[2]) / 2) / 4],
      s: [(hi[0] - lo[0]) / 4, (hi[1] - lo[1]) / 4, (hi[2] - lo[2]) / 4],
    };
  };
  const boxes = new Map(all.map((p) => [p.uid, boxOf(p)]));
  const touch = (a: ReturnType<typeof boxOf>, b: ReturnType<typeof boxOf>) => [0, 1, 2].every((i) => Math.abs(a.c[i] - b.c[i]) <= (a.s[i] + b.s[i]) / 2 + 0.06);
  const hub = all.find((p) => p.id === 446);
  let comp: typeof all = [];
  if (hub) {
    const seen = new Set([hub.uid]);
    const queue = [hub.uid];
    while (queue.length) {
      const u = queue.pop()!;
      const p = all.find((x) => x.uid === u)!;
      comp.push(p);
      for (const q of all) if (!seen.has(q.uid) && touch(boxes.get(u)!, boxes.get(q.uid)!)) { seen.add(q.uid); queue.push(q.uid); }
    }
  }
  let missing = 99;
  let drove = 0;
  if (comp.length) {
    const r = vehicleFromAssembly(comp, { hubChannel: "A", battery: 1, fuel: 0 });
    missing = r.missing.length;
    if (!missing) {
      const v = r.vehicle;
      const x0 = v.pos.x, z0 = v.pos.z;
      const ground2 = () => (ground + 1);
      for (let i = 0; i < 180; i++) stepVehicle(v, 1 / 60, { throttle: 1, steer: 0, channel: "A" }, ground2);
      drove = Math.hypot(v.pos.x - x0, v.pos.z - z0);
    }
  }
  return { placed: best, total: parts.length, comp: comp.length, missing, drove, failed };
}
