const WORLD_KEY = "studcraft-save-v1";
const SETTINGS_KEY = "studcraft-settings-v1";

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
  folk?: { x: number; z: number; role: string }[];
  village?: { x: number; z: number } | null;
  quests?: { id: string; n: number; done: boolean }[];
};

export type SettingsSave = {
  v?: number;
  sens: number;
  radius: number;
  sound: boolean;
  studs: boolean;
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
    return !!localStorage.getItem(WORLD_KEY);
  } catch {
    return false;
  }
}

export function loadSettings(): SettingsSave | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SettingsSave;
    if (typeof data?.sens !== "number") return null;
    if (data.v !== 2) data.studs = true;
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
