import { BLOCKS, ID, def } from "./blocks";
import { hash2, hash3, makeNoise, type Noise } from "./noise";

export const CS = 16;
export const HEIGHT = 48;
export const SEA = 16;

export class World {
  readonly seed: number;
  readonly flat: boolean;
  readonly noise: Noise;
  readonly chunks = new Map<string, Uint8Array>();
  readonly edits = new Map<string, number>();

  constructor(seed: number, flat: boolean) {
    this.seed = seed;
    this.flat = flat;
    this.noise = makeNoise(seed);
  }

  private ck(cx: number, cz: number) {
    return cx + "," + cz;
  }

  heightAt(x: number, z: number): number {
    if (this.flat) return 4;
    const e = this.noise.fbm(x * 0.006, z * 0.006);
    const h = this.noise.fbm(x * 0.02 + 40, z * 0.02);
    const ridge = Math.abs(this.noise.fbm(x * 0.012, z * 0.012 + 80) * 2 - 1);
    const base = 8 + e * 16 + h * h * 8 + (1 - ridge) * 3;
    return Math.max(5, Math.min(HEIGHT - 10, Math.floor(base)));
  }

  biomeAt(x: number, z: number): string {
    if (this.flat) return "Baseplate";
    const h = this.heightAt(x, z);
    if (h <= SEA) return "Shore";
    if (h >= 28) return "High studs";
    const m = this.noise.fbm(x * 0.01 + 90, z * 0.01);
    if (m > 0.62) return "Grove";
    if (m < 0.36) return "Sand flats";
    return "Brick plains";
  }

  private generate(cx: number, cz: number): Uint8Array {
    const data = new Uint8Array(CS * HEIGHT * CS);
    const baseX = cx * CS;
    const baseZ = cz * CS;
    const idx = (lx: number, y: number, lz: number) => lx + lz * CS + y * CS * CS;

    for (let lz = 0; lz < CS; lz++) {
      for (let lx = 0; lx < CS; lx++) {
        const x = baseX + lx;
        const z = baseZ + lz;
        if (this.flat) {
          for (let y = 0; y < HEIGHT; y++) {
            data[idx(lx, y, lz)] = y === 0 ? ID.Bedrock : y < 4 ? ID.Stone : y === 4 ? ID.Grass : ID.Air;
          }
          continue;
        }
        const h = this.heightAt(x, z);
        const beach = h <= SEA + 1;
        for (let y = 0; y < HEIGHT; y++) {
          let id: number = ID.Air;
          if (y === 0) id = ID.Bedrock;
          else if (y > h) {
            if (y <= SEA) id = ID.Water;
          } else if (y === h) id = beach ? ID.Sand : ID.Grass;
          else if (y >= h - 3) id = beach ? ID.Sand : ID.Dirt;
          else {
            id = ID.Stone;
            if (y > 2 && y < h - 2) {
              const c = this.noise.noise3(x * 0.08, y * 0.11, z * 0.08);
              if (c > 0.78) id = ID.Air;
            }
            if (id === ID.Stone) {
              const o = hash3(x, y, z, this.seed);
              if (y < 12 && o > 0.997) id = ID.Diamond;
              else if (y < 22 && o > 0.993) id = ID.Gold;
              else if (y < 40 && o > 0.984) id = ID.IronOre;
              else if (o > 0.968) id = ID.Coal;
              if (id === ID.Stone && y < 6 && hash3(x, y, z, this.seed + 11) > 0.992) id = ID.Hard;
              if (id === ID.Stone && y < 30 && hash3(x, y, z, this.seed + 3) > 0.996) id = ID.EmeraldOre;
              if (id === ID.Stone && y >= 8 && y <= 38 && hash3(x, y, z, this.seed + 71) > 0.9952) id = ID.TinOre;
              else if (id === ID.Stone && y >= 6 && y <= 30 && hash3(x, y, z, this.seed + 72) > 0.9964) id = ID.CopperOre;
              else if (id === ID.Stone && y >= 4 && y <= 20 && hash3(x, y, z, this.seed + 73) > 0.998) id = ID.AmberOre;
              else if (id === ID.Stone && y >= 2 && y <= 14 && hash3(x, y, z, this.seed + 74) > 0.9986) id = ID.ChromeOre;
              else if (id === ID.Stone && y >= 2 && y <= 11 && hash3(x, y, z, this.seed + 75) > 0.999) id = ID.SapphireOre;
              else if (id === ID.Stone && y >= 2 && y <= 7 && hash3(x, y, z, this.seed + 76) > 0.99935) id = ID.PrismOre;
              else if (id === ID.Stone && y >= 3 && y <= 8 && hash3(x, y, z, this.seed + 78) > 0.9992) id = ID.ResinOre;
            }
          }
          data[idx(lx, y, lz)] = id;
        }
      }
    }

    if (!this.flat) {
      const veins = new Set<number>([
        ID.TinOre,
        ID.CopperOre,
        ID.AmberOre,
        ID.ChromeOre,
        ID.SapphireOre,
        ID.ResinOre,
        ID.PrismOre,
      ]);
      for (let lz = 0; lz < CS; lz++) {
        for (let lx = 0; lx < CS; lx++) {
          for (let y = 2; y < HEIGHT - 2; y++) {
            const ore = data[idx(lx, y, lz)];
            if (!veins.has(ore)) continue;
            const loose = ore === ID.TinOre || ore === ID.CopperOre ? 0.32 : ore === ID.AmberOre ? 0.58 : 0.74;
            if (lx + 1 < CS && data[idx(lx + 1, y, lz)] === ID.Stone && hash3(baseX + lx, y, baseZ + lz, this.seed + ore) > loose) {
              data[idx(lx + 1, y, lz)] = ore;
            }
            if (lz + 1 < CS && data[idx(lx, y, lz + 1)] === ID.Stone && hash3(baseX + lx, y + 3, baseZ + lz, this.seed + ore) > loose + 0.12) {
              data[idx(lx, y, lz + 1)] = ore;
            }
          }
        }
      }
      for (let z = baseZ - 5; z < baseZ + CS + 5; z++) {
        for (let x = baseX - 5; x < baseX + CS + 5; x++) {
          const h = this.heightAt(x, z);
          if (h <= SEA + 1) continue;
          const slope =
            Math.abs(this.heightAt(x + 1, z) - h) > 1 || Math.abs(this.heightAt(x, z + 1) - h) > 1;
          const t = hash2(x, z, this.seed);
          if (!slope && t < 0.012) this.writeTree(data, baseX, baseZ, x, h, z);
          else if (t > 0.94 && t < 0.97 && x >= baseX && x < baseX + CS && z >= baseZ && z < baseZ + CS) {
            const y = h + 1;
            if (y < HEIGHT - 1) {
              const i = idx(x - baseX, y, z - baseZ);
              if (data[i] === ID.Air) data[i] = t > 0.955 ? ID.Flower : ID.FlowerRed;
            }
          } else if (t > 0.9 && t <= 0.94 && x >= baseX && x < baseX + CS && z >= baseZ && z < baseZ + CS) {
            const y = h + 1;
            if (y < HEIGHT - 1) {
              const i = idx(x - baseX, y, z - baseZ);
              if (data[i] === ID.Air) data[i] = ID.TallGrass;
            }
          }
        }
      }
    }

    this.chunks.set(this.ck(cx, cz), data);
    return data;
  }

  private paint(data: Uint8Array, baseX: number, baseZ: number, x: number, y: number, z: number, id: number) {
    if (y < 1 || y >= HEIGHT) return;
    if (x < baseX || x >= baseX + CS || z < baseZ || z >= baseZ + CS) return;
    const i = x - baseX + (z - baseZ) * CS + y * CS * CS;
    const cur = data[i];
    if (id === ID.Leaves && cur === ID.Log) return;
    if (cur === ID.Air || cur === ID.Water || cur === ID.Leaves || id === ID.Log) data[i] = id;
  }

  private writeTree(data: Uint8Array, baseX: number, baseZ: number, x: number, h: number, z: number) {
    const trunk = 4 + (Math.floor(hash2(x, z + 3, this.seed) * 97) % 3);
    for (let i = 1; i <= trunk; i++) this.paint(data, baseX, baseZ, x, h + i, z, ID.Log);
    const top = h + trunk;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx * dx + dz * dz + dy * dy * 1.25 > 6.2) continue;
          if (dx === 0 && dz === 0 && dy <= 0) continue;
          this.paint(data, baseX, baseZ, x + dx, top + dy, z + dz, ID.Leaves);
        }
      }
    }
  }

  ensure(cx: number, cz: number): Uint8Array {
    return this.chunks.get(this.ck(cx, cz)) ?? this.generate(cx, cz);
  }

  get(x: number, y: number, z: number): number {
    if (y < 0 || y >= HEIGHT) return y < 0 ? ID.Bedrock : ID.Air;
    const edit = this.edits.get(x + "," + y + "," + z);
    if (edit !== undefined) return edit;
    const cx = Math.floor(x / CS);
    const cz = Math.floor(z / CS);
    const lx = x - cx * CS;
    const lz = z - cz * CS;
    const data = this.ensure(cx, cz);
    return data[lx + lz * CS + y * CS * CS];
  }

  set(x: number, y: number, z: number, id: number): boolean {
    if (y <= 0 || y >= HEIGHT) return false;
    const prev = this.get(x, y, z);
    if (prev === id || prev === ID.Bedrock) return false;
    const cx = Math.floor(x / CS);
    const cz = Math.floor(z / CS);
    const lx = x - cx * CS;
    const lz = z - cz * CS;
    const data = this.ensure(cx, cz);
    const gen = data[lx + lz * CS + y * CS * CS];
    const key = x + "," + y + "," + z;
    if (id === gen) this.edits.delete(key);
    else this.edits.set(key, id);
    if (id === ID.Air && y + 1 < HEIGHT) {
      const above = this.get(x, y + 1, z);
      if (def(above).plant) this.set(x, y + 1, z, ID.Air);
    }
    return true;
  }

  findSpawn(): { x: number; y: number; z: number } {
    if (this.flat) return { x: 6.5, y: 5.02, z: 6.5 };
    for (let r = 0; r <= 90; r += 3) {
      const n = r === 0 ? 1 : 12;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r * 0.15;
        const x = Math.round(Math.cos(a) * r);
        const z = Math.round(Math.sin(a) * r);
        const h = this.heightAt(x, z);
        if (h < SEA + 3) continue;
        if (Math.abs(this.heightAt(x + 4, z - 2) - h) > 3) continue;
        return { x: x + 0.5, y: h + 1.02, z: z + 0.5 };
      }
    }
    const h = this.heightAt(0, 0);
    return { x: 0.5, y: h + 1.02, z: 0.5 };
  }

  clearFeet(x: number, z: number): number {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const h = this.heightAt(ix, iz);
    for (let y = h + 1; y < Math.min(HEIGHT - 1, h + 12); y++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const id = this.get(ix + dx, y, iz + dz);
          if (id === ID.Log || id === ID.Leaves || BLOCKS[id].plant) this.set(ix + dx, y, iz + dz, ID.Air);
        }
      }
    }
    return h + 1.02;
  }
}

export type FolkSpot = { x: number; z: number; role: string };
export type Decor = {
  sheep: { x: number; z: number }[];
  folk: FolkSpot[];
  village: { x: number; z: number } | null;
};

export function decorate(world: World, sx: number, sz: number): Decor {
  stampStarterMetals(world, sx, sz);
  const site = findVillageSite(world, sx, sz);
  const built = stampVillage(world, site.x, site.y, site.z);
  const sheep = [...built.sheep];
  if (world.flat) {
    stampPyramid(world, sx - 16, 4, sz + 8);
    stampPalette(world, sx + 2, 4, sz - 8);
    for (let i = 0; i < 3; i++) sheep.push({ x: sx + 3 + i * 2, z: sz + 4 });
  } else {
    const row = findPad(world, sx, sz, 5, 12);
    if (row) stampPalette(world, row.x, world.heightAt(row.x, row.z), row.z);
    sheep.push({ x: sx + 4, z: sz + 3 }, { x: sx - 3, z: sz + 5 }, { x: sx + 2, z: sz - 4 });
  }
  return { sheep, folk: built.folk, village: { x: site.x, z: site.z } };
}

function stampStarterMetals(world: World, sx: number, sz: number) {
  const x = Math.floor(sx);
  const z = Math.floor(sz);
  const y = world.flat ? 2 : Math.max(2, world.heightAt(x, z) - 6);
  const blob = (id: number, ox: number, oz: number) => {
    for (let dx = 0; dx < 2; dx++) {
      for (let dz = 0; dz < 2; dz++) {
        const cur = world.get(x + ox + dx, y, z + oz + dz);
        if (cur === ID.Stone || cur === ID.Dirt || cur === ID.Sand || world.flat) world.set(x + ox + dx, y, z + oz + dz, id);
      }
    }
  };
  blob(ID.TinOre, 3, 1);
  blob(ID.CopperOre, -4, 2);
  if (!world.flat) return;
  const row = [ID.AmberOre, ID.ChromeOre, ID.SapphireOre, ID.ResinOre, ID.PrismOre];
  for (let i = 0; i < row.length; i++) world.set(x + i, 2, z + 10, row[i]);
}

function findVillageSite(world: World, sx: number, sz: number) {
  const W = 30;
  const D = 28;
  if (world.flat) return { x: Math.floor(sx) + 14, z: Math.floor(sz) + 2, y: 4 };
  const samples: [number, number][] = [
    [0, 0],
    [W - 1, 0],
    [0, D - 1],
    [W - 1, D - 1],
    [15, 14],
    [8, 8],
    [22, 20],
  ];
  for (let r = 22; r <= 80; r += 6) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + r * 0.01;
      const x = Math.round(sx + Math.cos(a) * r);
      const z = Math.round(sz + Math.sin(a) * r);
      let min = 999;
      let max = 0;
      let wet = false;
      for (const [dx, dz] of samples) {
        const hh = world.heightAt(x + dx, z + dz);
        min = Math.min(min, hh);
        max = Math.max(max, hh);
        if (hh <= SEA + 1) wet = true;
      }
      if (!wet && max - min <= 4 && min > SEA + 2) return { x, z, y: max };
    }
  }
  const x = Math.floor(sx) + 28;
  const z = Math.floor(sz) + 4;
  let max = SEA + 3;
  for (let dx = 0; dx < W; dx += 5) {
    for (let dz = 0; dz < D; dz += 5) max = Math.max(max, world.heightAt(x + dx, z + dz), SEA + 3);
  }
  return { x, z, y: max };
}

function levelPad(world: World, x0: number, z0: number, w: number, d: number, h: number) {
  for (let x = 0; x < w; x++) {
    for (let z = 0; z < d; z++) {
      const wx = x0 + x;
      const wz = z0 + z;
      for (let y = h + 1; y <= Math.min(HEIGHT - 2, h + 12); y++) {
        const id = world.get(wx, y, wz);
        if (id !== ID.Air && id !== ID.Bedrock) world.set(wx, y, wz, ID.Air);
      }
      let y = h;
      while (y > 1) {
        const cur = world.get(wx, y, wz);
        const soft = cur === ID.Air || cur === ID.Water || cur === ID.Leaves || cur === ID.Log || def(cur).plant;
        if (!soft) break;
        world.set(wx, y, wz, y === h ? ID.Grass : ID.Dirt);
        y--;
      }
      if (world.get(wx, h, wz) !== ID.Bedrock) world.set(wx, h, wz, ID.Grass);
    }
  }
}

function stampVillage(world: World, x0: number, ground: number, z0: number) {
  levelPad(world, x0, z0, 30, 28, ground);
  stampCottage(world, x0 + 1, ground, z0 + 4, ID.Red, ID.Yellow);
  stampCottage(world, x0 + 22, ground, z0 + 4, ID.Blue, ID.White);
  stampCottage(world, x0 + 1, ground, z0 + 18, ID.Orange, ID.Yellow);
  stampCottage(world, x0 + 22, ground, z0 + 18, ID.Green, ID.White);
  stampWell(world, x0 + 1, ground, z0 + 11);
  world.set(x0 + 1, ground + 3, z0 + 11, ID.Lamp);
  for (let x = 8; x <= 13; x++) {
    world.set(x0 + x, ground, z0 + 13, ID.Water);
    world.set(x0 + x, ground, z0 + 12, ID.Farmland);
    world.set(x0 + x, ground, z0 + 14, ID.Farmland);
    world.set(x0 + x, ground + 1, z0 + 12, ID.CropRipe);
    world.set(x0 + x, ground + 1, z0 + 14, ID.CropRipe);
  }
  const penX = x0 + 22;
  const penZ = z0 + 11;
  for (let x = 0; x < 7; x++) {
    for (let z = 0; z < 5; z++) {
      const edge = x === 0 || z === 0 || x === 6 || z === 4;
      if (!edge) continue;
      const gate = z === 0 && x === 3;
      if (!gate) world.set(penX + x, ground + 1, penZ + z, ID.Fence);
    }
  }
  world.set(x0 + 9, ground + 1, z0 + 19, ID.Furnace);
  world.set(x0 + 10, ground + 1, z0 + 19, ID.Anvil);
  world.set(x0 + 13, ground + 1, z0 + 8, ID.Cobble);
  world.set(x0 + 13, ground + 2, z0 + 8, ID.Cobble);
  world.set(x0 + 16, ground + 1, z0 + 8, ID.Cobble);
  world.set(x0 + 16, ground + 2, z0 + 8, ID.Planks);
  world.set(x0 + 16, ground + 3, z0 + 8, ID.Lamp);
  const posts: [number, number][] = [
    [0, 2],
    [29, 2],
    [0, 16],
    [29, 16],
  ];
  for (const [x, z] of posts) {
    if (world.get(x0 + x, ground + 1, z0 + z) === ID.Air) {
      world.set(x0 + x, ground + 1, z0 + z, ID.Cobble);
      world.set(x0 + x, ground + 2, z0 + z, ID.Torch);
    }
  }
  for (let x = 0; x < 30; x++) {
    for (const z of [2, 16]) {
      if (world.get(x0 + x, ground, z0 + z) === ID.Grass) world.set(x0 + x, ground, z0 + z, ID.Cobble);
    }
  }
  for (let z = 0; z < 28; z++) {
    if (world.get(x0 + 14, ground, z0 + z) === ID.Grass) world.set(x0 + 14, ground, z0 + z, ID.Cobble);
  }
  return {
    sheep: [
      { x: penX + 2.5, z: penZ + 2.5 },
      { x: penX + 4.5, z: penZ + 2.5 },
    ],
    folk: [
      { x: x0 + 4.5, z: z0 + 2.5, role: "grocer" },
      { x: x0 + 25.5, z: z0 + 2.5, role: "mason" },
      { x: x0 + 4.5, z: z0 + 16.5, role: "smith" },
      { x: x0 + 25.5, z: z0 + 16.5, role: "herder" },
      { x: x0 + 14.5, z: z0 + 10.5, role: "clerk" },
    ],
  };
}

function findPad(world: World, sx: number, sz: number, dx: number, dz: number) {
  const len = Math.hypot(dx, dz) || 1;
  for (let i = 0; i <= 6; i++) {
    const x = Math.round(sx + (dx / len) * (len + i * 3));
    const z = Math.round(sz + (dz / len) * (len + i * 3));
    const h = world.heightAt(x, z);
    const h2 = world.heightAt(x + 5, z + 4);
    if (h > SEA + 2 && h2 > SEA + 2 && Math.abs(h - h2) <= 3) return { x, z };
  }
  return null;
}

function stampCottage(world: World, x0: number, ground: number, z0: number, wall: number, roof: number) {
  const W = 7;
  const D = 6;
  const wallH = 4;
  for (let x = 0; x < W; x++) {
    for (let z = 0; z < D; z++) {
      world.set(x0 + x, ground, z0 + z, ID.Planks);
      for (let y = 1; y <= wallH; y++) {
        const edge = x === 0 || z === 0 || x === W - 1 || z === D - 1;
        if (!edge) continue;
        const door = z === 0 && x === 3 && y <= 2;
        const window = y === 2 && (x === 0 || x === W - 1) && (z === 2 || z === 3);
        const id = door ? ID.Air : window ? ID.Glass : wall;
        if (id === ID.Air) {
          const cur = world.get(x0 + x, ground + y, z0 + z);
          if (cur !== ID.Air) world.set(x0 + x, ground + y, z0 + z, ID.Air);
        } else world.set(x0 + x, ground + y, z0 + z, id);
      }
    }
  }
  for (let x = -1; x <= W; x++) {
    for (let z = -1; z <= D; z++) {
      const inset = x === -1 || z === -1 || x === W || z === D;
      if (inset && (x < 0 || z < 0 || x >= W || z >= D)) {
        if (Math.abs(x - 3) <= 1 && z === -1) continue;
        world.set(x0 + x, ground + wallH + 1, z0 + z, roof);
      } else if (!inset) {
        world.set(x0 + x, ground + wallH + 1, z0 + z, roof);
      }
    }
  }
  world.set(x0 + 3, ground, z0 - 1, ID.Planks);
  world.set(x0 + 2, ground + 1, z0 + 2, ID.Orange);
  world.set(x0 + 4, ground + 1, z0 + 3, ID.Yellow);
}

function stampWell(world: World, x0: number, ground: number, z0: number) {
  for (let x = 0; x < 3; x++) {
    for (let z = 0; z < 3; z++) {
      const edge = x === 0 || z === 0 || x === 2 || z === 2;
      if (edge) {
        world.set(x0 + x, ground + 1, z0 + z, ID.Stone);
        world.set(x0 + x, ground + 2, z0 + z, ID.Stone);
      } else world.set(x0 + x, ground + 1, z0 + z, ID.Water);
    }
  }
}

function stampPalette(world: World, x0: number, ground: number, z0: number) {
  const colors = [ID.Red, ID.Orange, ID.Yellow, ID.Green, ID.Blue, ID.Azure, ID.Pink, ID.White, ID.Black];
  colors.forEach((c, i) => {
    world.set(x0 + i, ground + 1, z0, c);
    if (i % 2 === 0) world.set(x0 + i, ground + 2, z0, c);
  });
}

function stampPyramid(world: World, x0: number, ground: number, z0: number) {
  const colors = [ID.Red, ID.Orange, ID.Yellow, ID.Green, ID.Blue, ID.Azure];
  for (let layer = 0; layer < 6; layer++) {
    const s = 6 - layer;
    for (let x = -s; x <= s; x++) {
      for (let z = -s; z <= s; z++) {
        if (Math.abs(x) === s || Math.abs(z) === s || layer === 5) {
          world.set(x0 + x, ground + 1 + layer, z0 + z, colors[layer]);
        }
      }
    }
  }
}
