const WORLD_KEY = "studcraft-save-v1";
const SETTINGS_KEY = "studcraft-settings-v1";
const INDEX_KEY = "studcraft-worlds";

export type SaveV1 = {
  v: 1;
  seed: number;
  flat: boolean;
  creative: boolean;
  edits: [number, number, number, number][];
  px: number;
  py: number;
  pz: number;
  yaw: number;
  pitch: number;
  health: number;
  hunger?: number;
  xp?: number;
  rank?: number;
  rankXp?: number;
  found?: number[];
  armor?: number[];
  hammer: boolean;
  hotbar: number[];
  inv: [number, number][];
  chests?: { x: number; y: number; z: number; ids: number[]; ns: number[] }[];
  furnaces?: {
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
  }[];
  comps?: { x: number; y: number; z: number; dir: number; delay: number }[];
  runes?: [number, string[]][];
  folk?: { x: number; z: number; role: string }[];
  village?: { x: number; z: number } | null;
  quests?: { id: string; n: number; done: boolean }[];
  skills?: string[];
  mana?: number;
  spell?: number;
  seedText?: string;
  won?: boolean;
  pets?: { x: number; z: number }[];
  fluids?: [number, number, number, number][];
};

export type SettingsSave = {
  v?: number;
  sens: number;
  radius: number;
  sound: boolean;
  studs: boolean;
  realistic?: boolean;
  mods?: { hard: boolean; generous: boolean; peaceful: boolean; spells: boolean };
};

export function loadSave(): SaveV1 | null {
  try {
    const raw = localStorage.getItem(WORLD_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveV1;
    if (!data || data.v !== 1 || !Array.isArray(data.edits)) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(save: SaveV1): boolean {
  try {
    localStorage.setItem(WORLD_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(WORLD_KEY);
  } catch {
    /* ignore */
  }
}

export function hasSave(): boolean {
  try {
    return listWorlds().length > 0;
  } catch {
    return false;
  }
}

export type WorldSlot = {
  id: string;
  seed: number;
  seedText: string;
  flat: boolean;
  creative: boolean;
  updated: number;
};

type IndexFile = { v: 1; migrated: boolean; slots: WorldSlot[] };

function slotKey(id: string) {
  return "studcraft-w-" + id;
}

function parseSave(raw: string | null): SaveV1 | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SaveV1;
    if (!data || data.v !== 1 || !Array.isArray(data.edits)) return null;
    return data;
  } catch {
    return null;
  }
}

function readIndex(): IndexFile {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (raw) {
      const data = JSON.parse(raw) as IndexFile;
      if (data && data.v === 1 && Array.isArray(data.slots)) return data;
    }
  } catch {
    /* fresh index */
  }
  const legacyRaw = localStorage.getItem(WORLD_KEY);
  const legacy = parseSave(legacyRaw);
  if (legacy && legacyRaw) {
    const slot: WorldSlot = {
      id: "main",
      seed: legacy.seed,
      seedText: legacy.seedText || String(legacy.seed),
      flat: legacy.flat,
      creative: legacy.creative,
      updated: Date.now(),
    };
    try {
      localStorage.setItem(slotKey(slot.id), legacyRaw);
    } catch {
      /* ignore */
    }
    const file: IndexFile = { v: 1, migrated: true, slots: [slot] };
    try {
      localStorage.setItem(INDEX_KEY, JSON.stringify(file));
    } catch {
      /* ignore */
    }
    return file;
  }
  const empty: IndexFile = { v: 1, migrated: true, slots: [] };
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(empty));
  } catch {
    /* ignore */
  }
  return empty;
}

function writeIndex(slots: WorldSlot[]) {
  const file: IndexFile = { v: 1, migrated: true, slots };
  localStorage.setItem(INDEX_KEY, JSON.stringify(file));
}

export function listWorlds(): WorldSlot[] {
  return readIndex()
    .slots.slice()
    .sort((a, b) => b.updated - a.updated);
}

export function loadWorld(id: string): SaveV1 | null {
  return parseSave(localStorage.getItem(slotKey(id)));
}

export function loadLatest(): { id: string; save: SaveV1 } | null {
  for (const slot of listWorlds()) {
    const save = loadWorld(slot.id);
    if (save) return { id: slot.id, save };
  }
  return null;
}

export function writeWorld(slot: WorldSlot, save: SaveV1): boolean {
  try {
    const slots = readIndex().slots.filter((s) => s.id !== slot.id);
    slots.unshift(slot);
    while (slots.length > 16) {
      const drop = slots.pop();
      if (drop) localStorage.removeItem(slotKey(drop.id));
    }
    localStorage.setItem(slotKey(slot.id), JSON.stringify(save));
    writeIndex(slots);
    localStorage.setItem(WORLD_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function deleteWorld(id: string) {
  try {
    const slots = readIndex().slots.filter((s) => s.id !== id);
    localStorage.removeItem(slotKey(id));
    if (id === "main") localStorage.removeItem(WORLD_KEY);
    writeIndex(slots);
  } catch {
    /* ignore */
  }
}

export function loadSettings(): SettingsSave | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SettingsSave;
    if (typeof data?.sens !== "number") return null;
    if (data.v !== 2 && data.v !== 3) data.studs = true;
    return data;
  } catch {
    return null;
  }
}

export function writeSettings(s: SettingsSave): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
