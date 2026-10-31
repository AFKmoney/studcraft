// Vehicle catalogue (plan section 22, P-A — Muse, 2026-10-30).
//
// A vehicle MODEL is just its Teks parts list: id, orientation and a
// lattice position RELATIVE to an anchor (the hub when the build has
// one, else the min corner). Nothing else is needed to rebuild it —
// the Teks layer already turns (id, o, q) into geometry, mechanics
// and icons. Models live in a catalogue that is PERSISTENT and lives
// OUTSIDE any world save (its own localStorage key), so deleting a
// world never deletes your vehicles. Phase 1 sharing is a text code
// (encodeModel/decodeModel); there is NO server — never fake one.

export type ModelPart = { id: number; o: number; dq: [number, number, number] };
export type VehicleModel = {
  name: string;
  author: string;
  parts: ModelPart[];
  savedAt: number;
};

export const CATALOGUE_KEY = "studs.catalogue.v1";

/** Anchor a build: the hub's lattice position when present (loading
 *  puts the hub exactly where the player points), else the min
 *  corner of the bounding box. `hubId` is ID.TechHub in game terms,
 *  passed in so this module stays free of the block registry. */
export function modelFromParts(
  parts: { id: number; o: number; q: readonly number[] }[],
  name: string,
  author: string,
  hubId: number,
  savedAt: number,
): VehicleModel {
  let anchor: readonly number[] | null = null;
  for (const p of parts) if (p.id === hubId) { anchor = p.q; break; }
  if (!anchor) {
    anchor = [
      Math.min(...parts.map((p) => p.q[0])),
      Math.min(...parts.map((p) => p.q[1])),
      Math.min(...parts.map((p) => p.q[2])),
    ];
  }
  const a = anchor;
  return {
    name,
    author,
    savedAt,
    parts: parts.map((p) => ({
      id: p.id,
      o: p.o,
      dq: [p.q[0] - a[0], p.q[1] - a[1], p.q[2] - a[2]] as [number, number, number],
    })),
  };
}

/** Part counts per id — the Survival matter bill for a model. */
export function modelBill(model: VehicleModel): Map<number, number> {
  const bill = new Map<number, number>();
  for (const p of model.parts) bill.set(p.id, (bill.get(p.id) ?? 0) + 1);
  return bill;
}

export function loadCatalogue(storage?: Storage): VehicleModel[] {
  try {
    const raw = (storage ?? localStorage).getItem(CATALOGUE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as VehicleModel[];
    if (!Array.isArray(list)) return [];
    return list.filter((m) => m && typeof m.name === "string" && Array.isArray(m.parts));
  } catch {
    return [];
  }
}

export function storeCatalogue(list: VehicleModel[], storage?: Storage): void {
  try {
    (storage ?? localStorage).setItem(CATALOGUE_KEY, JSON.stringify(list));
  } catch {
    /* storage full/blocked — the catalogue is a convenience, never a crash */
  }
}

/** Insert or replace by name (a name is the model's identity). */
export function upsertModel(list: VehicleModel[], model: VehicleModel): VehicleModel[] {
  const out = list.filter((m) => m.name !== model.name);
  out.push(model);
  return out;
}

export function removeModel(list: VehicleModel[], name: string): VehicleModel[] {
  return list.filter((m) => m.name !== name);
}

/** Built-in models (section 22 P-B): shipped with the game, always
 *  in the catalogue, not deletable. The Starter Buggy's layout is the
 *  exact assembly the P5b rigs assemble and drive — proven geometry;
 *  catalogue.test.ts re-validates it headless through
 *  vehicleFromAssembly. Positions are hub-anchored lattice offsets. */
export function builtinModels(): VehicleModel[] {
  const P = (id: number, dq: [number, number, number], o = 0): ModelPart => ({ id, o, dq });
  return [
    {
      name: "Starter Buggy",
      author: "Studs Garage",
      savedAt: 0,
      parts: [
        P(378, [0, -5, -4]), P(378, [0, -5, 4]), P(378, [10, -5, -4]), P(378, [10, -5, 4]),
        P(356, [6, -7, -4]), P(356, [-6, -7, -4]), P(356, [6, -7, 4]), P(356, [-6, -7, 4]),
        P(446, [0, 0, 0]),
        P(447, [0, 7, -4]),
        P(452, [12, -1, 0]),
      ],
    },
    {
      // P5c-3: the excavator. Same base as the buggy; a turret servo
      // (o=4: its output axis points UP) carries the platform, then
      // boom / stick / bucket servos chain to the digging bucket.
      // Joints auto-bind B / C / D / D at load (catalogueLoadModel).
      name: "Rig Digger",
      author: "Studs Garage",
      savedAt: 0,
      parts: [
        P(378, [0, -5, -4]), P(378, [0, -5, 4]), P(378, [10, -5, -4]), P(378, [10, -5, 4]),
        P(356, [6, -7, -4]), P(356, [-6, -7, -4]), P(356, [6, -7, 4]), P(356, [-6, -7, 4]),
        P(446, [0, 0, 0]),
        P(447, [0, 7, -4]),
        P(452, [12, -1, 0]),
        // B16 (tester retest 2026-10-31): the four servos below sat
        // where their cells overlapped a neighbour's cells without an
        // axle-in-hole mating — TechWorld.test refused them all, so
        // the rig loaded 16/20 with a dead arm. Their positions are
        // shifted (orientations unchanged) to spots that place
        // legally AND keep the serial joint chain base→arm→bucket;
        // the "built-in models PLACE" test in catalogue.test.ts now
        // replays the real load law so this cannot regress silently.
        P(450, [-2, 12, 4], 4),
        P(454, [0, 13, 0]),
        P(450, [10, 15, -4]),
        P(454, [16, 19, 0]),
        P(450, [26, 19, 4]),
        P(379, [32, 15, 0]),
        P(450, [38, 18, -4]),
        P(471, [44, 12, 0]),
        // P5d (tester 2026-10-31 noted the builtin carried no sensor):
        // a distance sensor mirrored across from the drive motor, so
        // the flagship rig demonstrates the sensor layer too. Bind it
        // to the drive channel with sneak+use to arm obstacle stop.
        P(472, [0, 7, 4]),
      ],
    },
  ];
}

/** Share code (phase 1): base64 of the model JSON, prefixed so a
 *  pasted code is recognisable. Decoding validates the shape. */
export function encodeModel(model: VehicleModel): string {
  return "STUDS-MODEL:" + btoa(unescape(encodeURIComponent(JSON.stringify(model))));
}

export function decodeModel(code: string): VehicleModel | null {
  try {
    const body = code.trim().replace(/^STUDS-MODEL:/, "");
    const model = JSON.parse(decodeURIComponent(escape(atob(body)))) as VehicleModel;
    if (!model || typeof model.name !== "string" || !Array.isArray(model.parts)) return null;
    for (const p of model.parts) {
      if (typeof p.id !== "number" || typeof p.o !== "number" || !Array.isArray(p.dq) || p.dq.length !== 3) return null;
    }
    return model;
  } catch {
    return null;
  }
}
