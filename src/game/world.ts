import { BLOCKS, ID, def } from "./blocks";
import { hash2, hash3, makeNoise, type Noise } from "./noise";
import { zoneFor, type ZoneId } from "./biomes";
import { SITE_STEP, siteBricks, type Site, type SiteKind } from "./sites";

export { SITE_STEP };

export const CS = 16;
export const HEIGHT = 72;
export const SEA = 26;
export const REGION = 192;
export const NETHER_X0 = 20000;
export const NETHER_X1 = 24000;

export function inNether(x: number) {
  return x >= NETHER_X0 && x < NETHER_X1;
}

/** Four End pillars. The crystal sits on the obsidian column. */
export const END_PILLARS: ReadonlyArray<readonly [number, number]> = [
  [-510, -510],
  [-498, -510],
  [-510, -498],
  [-498, -498],
];

export function paintEndCrystals(set: (x: number, y: number, z: number, id: number) => void) {
  for (const [x, z] of END_PILLARS) {
    for (let y = 49; y <= 62; y++) set(x, y, z, ID.Obsidian);
    set(x, 63, z, ID.EndCrystal);
  }
}

export type HamletSite = { x: number; z: number; y: number };

export type LandmarkKind =
  | "monument"
  | "mansion"
  | "pyramid"
  | "temple"
  | "witch_hut"
  | "castle"
  | "fortress"
  | "bastion";
export type Landmark = { x: number; z: number; y: number; kind: LandmarkKind };
export const LM_STEP = 256;

export function hamletOrigin(seed: number, rx: number, rz: number): { x: number; z: number } | null {
  const forced = rx === 0 && rz === 0;
  if (!forced && hash2(rx, rz, seed + 404) > 0.36) return null;
  const span = REGION - 96;
  const x = rx * REGION + 40 + Math.floor(hash2(rx, rz, seed + 405) * span);
  const z = rz * REGION + 40 + Math.floor(hash2(rx, rz, seed + 406) * span);
  return { x, z };
}

export class World {

  // End portal: if 12 eyes placed, activate (simple check near player)
  private checkEndPortal(x: number, y: number, z: number) {
    let eyes = 0;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (Math.abs(dx) + Math.abs(dz) !== 2) continue;
        if (this.get(x + dx, y, z + dz) === ID.EndFrameEye) eyes++;
      }
    }
    if (eyes >= 12) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          this.set(x + dx, y, z + dz, ID.Portal);
        }
      }
    }
  }

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
    if (inNether(x)) return this.netherFloor(x, z);
    const e = this.noise.fbm(x * 0.005, z * 0.005);
    const h = this.noise.fbm(x * 0.016 + 40, z * 0.016);
    const ridge = Math.abs(this.noise.fbm(x * 0.01, z * 0.01 + 80) * 2 - 1);
    const base = 12 + e * 26 + h * h * 16 + (1 - ridge) * 6;
    return Math.max(8, Math.min(HEIGHT - 8, Math.floor(base)));
  }

  netherFloor(x: number, z: number): number {
    const n = this.noise.fbm((x - NETHER_X0) * 0.016, z * 0.016);
    const low = this.noise.fbm((x - NETHER_X0) * 0.004 + 8, z * 0.004);
    if (low < 0.42) return 14;
    return 20 + Math.floor(n * 12);
  }

  biomeAt(x: number, z: number): string {
    if (this.flat) return "Baseplate";
    if (inNether(x)) return "Nether";
    return this.biomeOf(x, z, this.heightAt(x, z));
  }

  /** Gameplay zone (biomes.ts) laid over the terrain biome. New zones are
   *  rolled on their own variant noise, so terrain (and saves) never change. */
  zoneAt(x: number, z: number): ZoneId | "" {
    if (this.flat) return "plains";
    const h = inNether(x) ? 0 : this.heightAt(x, z);
    const biome = inNether(x) ? "Nether" : this.biomeOf(x, z, h);
    return zoneFor(biome, h, (salt) => this.noise.fbm(x * 0.006 + salt, z * 0.006 - salt));
  }

  private biomeOf(x: number, z: number, h: number): string {
    if (h <= SEA) {
      const nearLand =
        this.heightAt(x + 5, z) > SEA ||
        this.heightAt(x - 5, z) > SEA ||
        this.heightAt(x, z + 5) > SEA ||
        this.heightAt(x, z - 5) > SEA;
      if (h <= SEA - 3 || !nearLand) return "Ocean";
      return "Shore";
    }
    const wet = this.noise.fbm(x * 0.008 + 200, z * 0.008);
    const heat = this.noise.fbm(x * 0.007 + 20, z * 0.009 + 400);
    let b: string;
    if (h >= 50 || (h >= 44 && heat < 0.46)) b = "Snow cap";
    else if (h <= SEA + 4 && wet > 0.57) b = "Fen";
    else if (heat > 0.7 && wet < 0.42 && h >= 34) b = "Ash ridge";
    else if (heat > 0.58 && wet > 0.55 && h < 46) b = "Jungle";
    else if (wet > 0.7 && heat < 0.5 && h < 42) b = "Mushroom";
    else if (heat > 0.52 && wet < 0.42 && h < 48) b = "Desert";
    else if (wet > 0.62) b = "Grove";
    else if (wet < 0.38) b = "Sand flats";
    else b = "Brick plains";
    // Variants: the same land wearing a rarer face, rolled on their own
    // noise so the base biome map (and every saved world) stays stable.
    if (b === "Grove" && this.noise.fbm(x * 0.01 + 555, z * 0.01) > 0.6) return "Flower grove";
    if ((b === "Desert" || b === "Ash ridge") && heat > 0.64 && this.noise.fbm(x * 0.009 + 777, z * 0.009) > 0.58) return "Mesa";
    if (b === "Fen" && wet > 0.68 && this.noise.fbm(x * 0.011 + 333, z * 0.011) > 0.55) return "Deep fen";
    return b;
  }

  private generate(cx: number, cz: number): Uint8Array {
    if (!this.flat && inNether(cx * CS)) return this.generateNether(cx, cz);
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
        const biome = this.biomeOf(x, z, h);
        let top: number = ID.Grass;
        let fill: number = ID.Dirt;
        if (biome === "Ocean") {
          const roll = hash2(x, z, this.seed + 15);
          top = roll > 0.72 ? ID.Gravel : roll > 0.58 ? ID.Clay : ID.Sand;
          fill = roll > 0.72 ? ID.Gravel : ID.Sand;
        } else if (biome === "Shore" || biome === "Sand flats" || biome === "Desert") {
          top = ID.Sand;
          fill = ID.Sand;
        } else if (biome === "Fen") {
          top = hash2(x, z, this.seed + 9) < 0.05 ? ID.Water : ID.Moss;
          fill = ID.Mud;
        } else if (biome === "Deep fen") {
          top = hash2(x, z, this.seed + 9) < 0.3 ? ID.Water : ID.Moss;
          fill = ID.Mud;
        } else if (biome === "Mesa") {
          top = ID.Ash;
          fill = ID.AshSoil;
        } else if (biome === "Ash ridge") {
          top = ID.Ash;
          fill = ID.AshSoil;
        } else if (biome === "Snow cap") {
          top = ID.Snow;
          fill = ID.Dirt;
        } else if (biome === "Jungle") {
          top = ID.Moss;
          fill = ID.Dirt;
        } else if (biome === "Mushroom") {
          top = ID.Moss;
          fill = ID.Mud;
        }
        if (biome === "Shore" && hash2(x, z, this.seed + 4) > 0.78) top = ID.Clay;
        for (let y = 0; y < HEIGHT; y++) {
          let id: number = ID.Air;
          if (y === 0) id = ID.Bedrock;
          else if (y > h) {
            if (y <= SEA) id = ID.Water;
          } else if (y === h) id = top;
          else if (y >= h - 3) id = fill;
          else {
            id = ID.Stone;
            if (y > 4 && y < h - 5) {
              const c = this.noise.noise3(x * 0.07, y * 0.09, z * 0.07);
              if (c > 0.73) id = ID.Air;
            }
            if (id === ID.Stone) {
              const o = hash3(x, y, z, this.seed);
              if (y < 16 && o > 0.997) id = ID.Diamond;
              else if (y < 30 && o > 0.993) id = ID.Gold;
              else if (y < 52 && o > 0.984) id = ID.IronOre;
              else if (o > 0.968) id = ID.Coal;
              if (id === ID.Stone && y < 8 && hash3(x, y, z, this.seed + 11) > 0.992) id = ID.Hard;
              if (id === ID.Stone && y < 36 && hash3(x, y, z, this.seed + 3) > 0.996) id = ID.EmeraldOre;
              if (id === ID.Stone && y >= 10 && y <= 48 && hash3(x, y, z, this.seed + 71) > 0.9952) id = ID.TinOre;
              else if (id === ID.Stone && y >= 8 && y <= 40 && hash3(x, y, z, this.seed + 72) > 0.9964) id = ID.CopperOre;
              else if (id === ID.Stone && y >= 6 && y <= 28 && hash3(x, y, z, this.seed + 73) > 0.998) id = ID.AmberOre;
              else if (id === ID.Stone && y >= 3 && y <= 18 && hash3(x, y, z, this.seed + 74) > 0.9986) id = ID.ChromeOre;
              else if (id === ID.Stone && y >= 2 && y <= 14 && hash3(x, y, z, this.seed + 75) > 0.999) id = ID.SapphireOre;
              else if (id === ID.Stone && y >= 2 && y <= 10 && hash3(x, y, z, this.seed + 76) > 0.99935) id = ID.PrismOre;
              // rare new blocks near surface
              if (id === ID.Stone && y >= h - 6 && y < h && hash3(x, y, z, this.seed + 90) > 0.997) {
                const pick = hash3(x, y, z, this.seed + 91) % 3;
                id = pick === 0 ? ID.Basalt : pick === 1 ? ID.Calcite : ID.Tuff;
              }
              // Deep tuff beds + high calcite veins ( clustered, noise-shaped ):
              // the surface speckle above stays; these give 241-243 real homes.
              if (id === ID.Stone && y <= 16 && this.noise.noise3(x * 0.09 + 31, y * 0.14, z * 0.09) > 0.64) id = ID.Tuff;
              else if (id === ID.Stone && y >= 34 && this.noise.noise3(x * 0.08 + 57, y * 0.12, z * 0.08) > 0.68) id = ID.Calcite;
              else if (id === ID.Stone && y >= 4 && y <= 12 && hash3(x, y, z, this.seed + 78) > 0.9992) id = ID.ResinOre;
              else if (id === ID.Stone && y >= 6 && y <= 24 && hash3(x, y, z, this.seed + 81) > 0.9988) id = ID.CrystalOre;
            }
            if (id === ID.Stone && y > 6 && y < h - 5) {
              const c2 = this.noise.noise3(x * 0.04 + 9, y * 0.05, z * 0.04);
              if (c2 > 0.8) id = ID.Air;
            }
          }
          // Mesa strata: banded rock under the ash cap, tuff and calcite
          // stripes every three blocks, visible in every cliff face.
          if (id === ID.Stone && biome === "Mesa" && y > 2 && y < h - 4) {
            const band = Math.floor(y / 3) % 3;
            if (band === 1) id = ID.Tuff;
            else if (band === 2) id = ID.Calcite;
          }
          data[idx(lx, y, lz)] = id;
        }
      }
    }

    if (!this.flat) {
      this.carveWorms(data, baseX, baseZ);
      this.carveRavines(data, baseX, baseZ);
      for (let lz = 0; lz < CS; lz++) {
        for (let lx = 0; lx < CS; lx++) {
          const x = baseX + lx;
          const z = baseZ + lz;
          if (this.heightAt(x, z) > SEA) continue;
          for (let y = 2; y <= SEA; y++) {
            const i = idx(lx, y, lz);
            if (data[i] === ID.Air) data[i] = ID.Water;
          }
        }
      }
    }

    if (!this.flat) {
      // Ore veins: every ore starts as scattered seed blocks in the
      // column pass; here each seed grows into its stone neighbours so
      // ores come in veins, not singles. Growth always starts from a
      // snapshot (seeds, then the first ring) so veins stay bounded -
      // letting grown cells regrow in the same scan would percolate
      // whole regions into ore. Common ores grow fatter than rare ones.
      const P: Record<number, number> = {
        [ID.Coal]: 0.3,
        [ID.IronOre]: 0.28,
        [ID.TinOre]: 0.32,
        [ID.CopperOre]: 0.32,
        [ID.Gold]: 0.2,
        [ID.Hard]: 0.18,
        [ID.CrystalOre]: 0.16,
        [ID.AmberOre]: 0.16,
        [ID.Diamond]: 0.14,
        [ID.EmeraldOre]: 0.12,
        [ID.ChromeOre]: 0.1,
        [ID.SapphireOre]: 0.1,
        [ID.ResinOre]: 0.1,
        [ID.PrismOre]: 0.1,
      };
      const DIRS = [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
      ] as const;
      for (let ring = 0; ring < 2; ring++) {
        // Snapshot the current ore cells of each kind first.
        const sources = new Map<number, [number, number, number][]>();
        for (let lz = 0; lz < CS; lz++) {
          for (let lx = 0; lx < CS; lx++) {
            for (let y = 2; y < HEIGHT - 2; y++) {
              const ore = data[idx(lx, y, lz)];
              if (P[ore] === undefined) continue;
              if (!sources.has(ore)) sources.set(ore, []);
              sources.get(ore)!.push([lx, y, lz]);
            }
          }
        }
        for (const [ore, cells] of sources) {
          const p = ring === 0 ? P[ore] : P[ore] * 0.55;
          for (const [lx, y, lz] of cells) {
            for (let d = 0; d < 6; d++) {
              const nx = lx + DIRS[d][0];
              const ny = y + DIRS[d][1];
              const nz = lz + DIRS[d][2];
              if (nx < 0 || nx >= CS || nz < 0 || nz >= CS || ny < 2 || ny >= HEIGHT - 2) continue;
              const ni = idx(nx, ny, nz);
              if (data[ni] !== ID.Stone) continue;
              if (hash3(baseX + nx, ny * 3 + d, baseZ + nz, this.seed + ore + ring * 131) > 1 - p) data[ni] = ore;
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
          const biome = this.biomeAt(x, z);
          if (!slope && (t < 0.012 || (biome === "Jungle" && t < 0.03))) {
            if (biome === "Ash ridge" || biome === "Desert" || biome === "Mesa") {
              const rate = biome === "Desert" ? 0.010 : 0.005;
              if (t < rate) {
                const rH = hash2(x, z, this.seed + 6);
                const tall = rH > 0.72 ? 4 : rH > 0.28 ? 3 : 2;
                for (let i = 1; i <= tall; i++) this.paint(data, baseX, baseZ, x, h + i, z, ID.Cactus);
              }
            } else if (biome === "Mushroom") {
              if (t < 0.01) this.paint(data, baseX, baseZ, x, h + 1, z, t < 0.005 ? ID.MushroomRed : ID.Mushroom);
            } else if (biome === "Jungle" && t > 0.992 && x >= baseX + 4 && x < baseX + CS - 4 && z >= baseZ + 4 && z < baseZ + CS - 4) {
              // jungle temple
              for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
                this.paint(data, baseX, baseZ, x + dx, h, z + dz, ID.Moss);
                for (let dy = 1; dy <= 4; dy++) {
                  const edge = Math.abs(dx) === 3 || Math.abs(dz) === 3;
                  if (edge) this.paint(data, baseX, baseZ, x + dx, h + dy, z + dz, ID.Cobble);
                }
              }
              this.paint(data, baseX, baseZ, x, h + 1, z, ID.Chest);
              this.paint(data, baseX, baseZ, x + 1, h + 1, z, ID.TNT);
            } else if (biome !== "Snow cap" && biome !== "Sand flats") this.writeTree(data, baseX, baseZ, x, h, z);
          } else if (biome === "Flower grove" && t > 0.7 && t < 0.97 && x >= baseX && x < baseX + CS && z >= baseZ && z < baseZ + CS) {
            // A whole meadow of them, not a sprinkle.
            this.paint(data, baseX, baseZ, x, h + 1, z, ID.Bloom);
          } else if (biome === "Grove" && t > 0.9 && t < 0.94 && x >= baseX && x < baseX + CS && z >= baseZ && z < baseZ + CS) {
            const y = h + 1;
            if (y < HEIGHT - 1) {
              const i = idx(x - baseX, y, z - baseZ);
              if (data[i] === ID.Air) data[i] = ID.Bloom;
            }
          } else if ((biome === "Fen" || biome === "Deep fen") && t > (biome === "Deep fen" ? 0.86 : 0.93) && t < 0.98 && x >= baseX && x < baseX + CS && z >= baseZ && z < baseZ + CS) {
            const y = h + 1;
            if (y < HEIGHT - 1) {
              const i = idx(x - baseX, y, z - baseZ);
              if (data[i] === ID.Air) data[i] = ID.Reed;
            }
          } else if (biome !== "Desert" && t > 0.94 && t < 0.97 && x >= baseX && x < baseX + CS && z >= baseZ && z < baseZ + CS) {
            const y = h + 1;
            if (y < HEIGHT - 1) {
              const i = idx(x - baseX, y, z - baseZ);
              if (data[i] === ID.Air) data[i] = t > 0.955 ? ID.Flower : ID.FlowerRed;
            }
          } else if (biome !== "Desert" && t > 0.9 && t <= 0.94 && x >= baseX && x < baseX + CS && z >= baseZ && z < baseZ + CS) {
            const y = h + 1;
            if (y < HEIGHT - 1) {
              const i = idx(x - baseX, y, z - baseZ);
              if (data[i] === ID.Air) data[i] = ID.TallGrass;
            }
          }
          if (x >= baseX && x < baseX + CS && z >= baseZ && z < baseZ + CS && !slope && h > SEA + 1) {
            const g = hash2(x, z, this.seed + 77);
            if (g < 0.012) {
              const y = h + 1;
              if (y < HEIGHT - 1) {
                const i = idx(x - baseX, y, z - baseZ);
                if (data[i] === ID.Air) {
                  const pick = hash2(x, z, this.seed + 78);
                  let plant = 0;
                  if (biome === "Brick plains" || biome === "Grove" || biome === "Flower grove") plant = pick < 0.4 ? ID.Pumpkin : pick < 0.7 ? ID.Melon : ID.Berry;
                  else if (biome === "Fen" || biome === "Deep fen" || biome === "Shore") plant = pick < 0.55 ? ID.Mushroom : ID.MushroomRed;
                  else if (biome === "Snow cap" && pick < 0.4) plant = ID.Mushroom;
                  if (plant) data[i] = plant;
                }
              }
            }
          }
        }
      }
    }

    this.decorateOcean(data, baseX, baseZ);
    this.paintCellar(data, baseX, baseZ);
    this.paintHamlet(data, baseX, baseZ);
    this.paintSites(data, baseX, baseZ);
    this.paintLandmarkLayer(data, baseX, baseZ, false);
    this.paintGate(data, baseX, baseZ);
    this.scatterCaps(data, baseX, baseZ);
    this.chunks.set(this.ck(cx, cz), data);
    return data;
  }

  private carveWorms(data: Uint8Array, baseX: number, baseZ: number) {
    const step = 28;
    const x0 = Math.floor((baseX - 80) / step) * step;
    const z0 = Math.floor((baseZ - 80) / step) * step;
    const at = (x: number, y: number, z: number) => {
      if (x < baseX || x >= baseX + CS || z < baseZ || z >= baseZ + CS || y < 2 || y >= HEIGHT - 2) return -1;
      return x - baseX + (z - baseZ) * CS + y * CS * CS;
    };
    for (let oz = z0; oz <= baseZ + CS + 80; oz += step) {
      for (let ox = x0; ox <= baseX + CS + 80; ox += step) {
        if (hash2(ox, oz, this.seed + 917) > 0.42) continue;
        let x = ox + 4 + hash2(ox, oz, this.seed + 918) * (step - 8);
        let z = oz + 4 + hash2(ox, oz, this.seed + 919) * (step - 8);
        let y = 8 + hash2(ox, oz, this.seed + 920) * 36;
        let yaw = hash2(ox, oz, this.seed + 921) * Math.PI * 2;
        let pitch = (hash2(ox, oz, this.seed + 922) - 0.5) * 0.35;
        const len = 42 + Math.floor(hash2(ox, oz, this.seed + 923) * 28);
        for (let s = 0; s < len; s++) {
          yaw += (hash3(ox, s, oz, this.seed + 924) - 0.5) * 0.9;
          pitch += (hash3(ox + 3, s, oz, this.seed + 925) - 0.5) * 0.22;
          if (pitch > 0.45) pitch = 0.45;
          if (pitch < -0.45) pitch = -0.45;
          x += Math.cos(yaw) * 1.25;
          z += Math.sin(yaw) * 1.25;
          y += Math.sin(pitch) * 0.85;
          const ix = Math.floor(x);
          const iz = Math.floor(z);
          const ceiling = this.heightAt(ix, iz) - 4;
          if (y > ceiling) y = ceiling;
          if (y < 4) y = 4;
          const iy = Math.floor(y);
          const roll = hash3(ox, s, oz, this.seed + 926);
          const rad = roll > 0.86 ? 3 : roll > 0.5 ? 2 : 1;
          // A worm running near its ceiling sometimes punches a shaft
          // to the surface: a natural cave entrance. Never under the sea.
          const entrance = iy >= ceiling - 2 && this.heightAt(ix, iz) > SEA + 2 && hash3(ox, s, oz, this.seed + 927) > 0.992;
          for (let dy = -rad; dy <= rad; dy++) {
            for (let dz = -rad; dz <= rad; dz++) {
              for (let dx = -rad; dx <= rad; dx++) {
                if (dx * dx + dy * dy + dz * dz > rad * rad + 0.2) continue;
                const cx = ix + dx;
                const cy = iy + dy;
                const cz = iz + dz;
                if (cy >= this.heightAt(cx, cz) - 3) continue;
                const i = at(cx, cy, cz);
                if (i < 0) continue;
                const cur = data[i];
                if (cur === ID.Bedrock || cur === ID.Air || cur === ID.Water || cur === ID.Lava) continue;
                data[i] = ID.Air;
              }
            }
          }
          if (entrance) {
            for (let sy = iy; sy <= this.heightAt(ix, iz); sy++) {
              const i = at(ix, sy, iz);
              if (i < 0) continue;
              const cur = data[i];
              if (cur === ID.Bedrock || cur === ID.Water || cur === ID.Lava) continue;
              data[i] = ID.Air;
            }
          }
          if (s === len - 1 && iy < 12) {
            const i = at(ix, iy, iz);
            if (i >= 0 && data[i] === ID.Air) data[i] = ID.Lava;
          }
        }
      }
    }
  }

  private carveRavines(data: Uint8Array, baseX: number, baseZ: number) {
    const step = 56;
    const x0 = Math.floor((baseX - 48) / step) * step;
    const z0 = Math.floor((baseZ - 48) / step) * step;
    const at = (x: number, y: number, z: number) => {
      if (x < baseX || x >= baseX + CS || z < baseZ || z >= baseZ + CS || y < 2 || y >= HEIGHT - 2) return -1;
      return x - baseX + (z - baseZ) * CS + y * CS * CS;
    };
    for (let oz = z0; oz <= baseZ + CS; oz += step) {
      for (let ox = x0; ox <= baseX + CS; ox += step) {
        if (hash2(ox, oz, this.seed + 640) > 0.78) continue;
        let x = ox + step * 0.5;
        let z = oz + step * 0.5;
        let yaw = hash2(ox, oz, this.seed + 641) * Math.PI * 2;
        const len = 40;
        for (let s = 0; s < len; s++) {
          yaw += (hash3(ox, s, oz, this.seed + 642) - 0.5) * 0.28;
          x += Math.cos(yaw) * 1.35;
          z += Math.sin(yaw) * 1.35;
          const ix = Math.floor(x);
          const iz = Math.floor(z);
          const open = hash2(ox, oz, this.seed + 643) > 0.45;
          const top = this.heightAt(ix, iz) - (open ? 0 : 4);
          for (let y = 8; y <= top; y++) {
            for (let dx = -1; dx <= 1; dx++) {
              const i = at(ix + dx, y, iz);
              if (i < 0) continue;
              const cur = data[i];
              if (cur === ID.Bedrock || cur === ID.Water || cur === ID.Lava) continue;
              data[i] = ID.Air;
            }
          }
        }
      }
    }
  }

  
  private generateEnd(cx: number, cz: number): Uint8Array {
    const data = new Uint8Array(CS * HEIGHT * CS);
    const baseX = cx * CS;
    const baseZ = cz * CS;
    const idx = (lx: number, y: number, lz: number) => lx + lz * CS + y * CS * CS;
    for (let lz = 0; lz < CS; lz++) {
      for (let lx = 0; lx < CS; lx++) {
        const x = baseX + lx;
        const z = baseZ + lz;
        const h = 60 + Math.floor(this.noise.fbm(x * 0.02, z * 0.02) * 8);
        for (let y = 0; y < HEIGHT; y++) {
          let id: number = ID.Air;
          if (y === 0) id = ID.Bedrock;
          else if (y <= h) id = ID.EndStone;
          data[idx(lx, y, lz)] = id;
        }
      }
    }
    return data;
  }

  /** The far Nether is zoned: wastes, basalt deltas, soul vale, crimson wilds. */
  private netherZone(x: number, z: number): string {
    const n = this.noise.fbm((x - NETHER_X0) * 0.004 + 77, z * 0.004);
    if (n < 0.36) return "Wastes";
    if (n < 0.55) return "Basalt deltas";
    if (n < 0.75) return "Soul vale";
    return "Crimson wilds";
  }

  private generateNether(cx: number, cz: number): Uint8Array {
    const data = new Uint8Array(CS * HEIGHT * CS);
    const baseX = cx * CS;
    const baseZ = cz * CS;
    const idx = (lx: number, y: number, lz: number) => lx + lz * CS + y * CS * CS;
    const ceil = 56;
    const lava = 16;
    for (let lz = 0; lz < CS; lz++) {
      for (let lx = 0; lx < CS; lx++) {
        const x = baseX + lx;
        const z = baseZ + lz;
        const floor = this.netherFloor(x, z);
        const zone = this.netherZone(x, z);
        const lavaHere = zone === "Basalt deltas" ? 13 : lava;
        const bThr = zone === "Basalt deltas" ? 0.42 : zone === "Wastes" ? 0.6 : 0.78;
        for (let y = 0; y < HEIGHT; y++) {
          let id: number = ID.Air;
          if (y === 0 || y === HEIGHT - 1) id = ID.Bedrock;
          else if (y < floor) {
            id = ID.Netherrack;
            const o = hash3(x, y, z, this.seed + 90);
            if (y > 2 && o > 0.993) id = ID.ResinOre;
            else if (y > 2 && o > 0.986) id = ID.Gold;
            // Basalt fields in the netherrack body (vanilla basalt deltas).
            if (id === ID.Netherrack && y > 2 && this.noise.noise3(x * 0.06 + 93, y * 0.1, z * 0.06) > bThr) id = ID.Basalt;
          } else if (y === floor) {
            if (zone === "Basalt deltas") id = hash2(x, z, this.seed + 5) > 0.22 ? ID.Basalt : ID.Netherrack;
            else if (zone === "Soul vale") id = hash2(x, z, this.seed + 5) > 0.16 ? ID.Soul : ID.Netherrack;
            else if (zone === "Crimson wilds") id = this.noise.fbm(x * 0.05 + 31, z * 0.05) > 0.55 ? ID.MushroomRed : ID.Netherrack;
            else id = hash2(x, z, this.seed + 5) > 0.84 ? ID.Soul : ID.Netherrack;
          }
          else if (y <= lavaHere) id = ID.Lava;
          else if (y >= ceil) id = ID.Netherrack;
          data[idx(lx, y, lz)] = id;
        }
        if (hash2(x, z, this.seed + 33) > 0.975) {
          data[idx(lx, ceil - 1, lz)] = ID.LampOn;
          if (lx + 1 < CS) data[idx(lx + 1, ceil - 1, lz)] = ID.LampOn;
        }
        // Zone landmarks: basalt pillars, pale bone spikes, crimson fungi.
        if (floor > lavaHere + 2 && floor < ceil - 8) {
          if (zone === "Basalt deltas" && hash2(x, z, this.seed + 61) > 0.93) {
            const ph = 2 + Math.floor(hash2(x, z, this.seed + 62) * 3);
            for (let y = floor + 1; y <= floor + ph; y++) data[idx(lx, y, lz)] = ID.Basalt;
          } else if (zone === "Soul vale" && hash2(x, z, this.seed + 65) > 0.97) {
            const ph = 2 + Math.floor(hash2(x, z, this.seed + 66) * 3);
            for (let y = floor + 1; y <= floor + ph; y++) data[idx(lx, y, lz)] = ID.Hard;
          } else if (zone === "Crimson wilds" && hash2(x, z, this.seed + 63) > 0.962) {
            data[idx(lx, floor + 1, lz)] = ID.Log;
            data[idx(lx, floor + 2, lz)] = ID.Log;
            data[idx(lx, floor + 3, lz)] = ID.MushroomRed;
            if (lx + 1 < CS) data[idx(lx + 1, floor + 2, lz)] = ID.MushroomRed;
            if (lx > 0) data[idx(lx - 1, floor + 2, lz)] = ID.MushroomRed;
            if (lz + 1 < CS) data[idx(lx, floor + 2, lz + 1)] = ID.MushroomRed;
            if (lz > 0) data[idx(lx, floor + 2, lz - 1)] = ID.MushroomRed;
          }
        }
      }
    }
    const ax = Math.floor(baseX / 72) * 72 + 36;
    const az = Math.floor(baseZ / 72) * 72 + 36;
    if (hash2(ax, az, this.seed + 300) < 0.5) {
      for (let x = ax - 18; x <= ax + 18; x++) {
        for (let z = az - 2; z <= az + 2; z++) this.force(data, baseX, baseZ, x, 30, z, ID.Hard);
      }
      for (let z = az - 18; z <= az + 18; z++) {
        for (let x = ax - 2; x <= ax + 2; x++) this.force(data, baseX, baseZ, x, 30, z, ID.Hard);
      }
      this.force(data, baseX, baseZ, ax, 31, az, ID.Chest);
      this.force(data, baseX, baseZ, ax + 3, 31, az, ID.Lava);
      this.force(data, baseX, baseZ, ax, 31, az + 3, ID.ResinOre);
    }
    this.paintLandmarkLayer(data, baseX, baseZ, true);
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

  private force(data: Uint8Array, baseX: number, baseZ: number, x: number, y: number, z: number, id: number) {
    if (y < 1 || y >= HEIGHT) return;
    if (x < baseX || x >= baseX + CS || z < baseZ || z >= baseZ + CS) return;
    data[x - baseX + (z - baseZ) * CS + y * CS * CS] = id;
  }

  hamletAt(rx: number, rz: number): HamletSite | null {
    const origin = hamletOrigin(this.seed, rx, rz);
    if (!origin || this.flat) return null;
    let min = 999;
    let max = 0;
    const samples: [number, number][] = [
      [0, 0],
      [29, 0],
      [0, 27],
      [29, 27],
      [15, 14],
    ];
    for (const [dx, dz] of samples) {
      const h = this.heightAt(origin.x + dx, origin.z + dz);
      min = Math.min(min, h);
      max = Math.max(max, h);
    }
    const forced = rx === 0 && rz === 0;
    if (!forced && (min <= SEA + 1 || max - min > 6)) return null;
    const y = Math.max(SEA + 2, Math.min(HEIGHT - 14, max));
    return { x: origin.x, z: origin.z, y };
  }

  nearestHamlet(x: number, z: number, rings = 3): HamletSite | null {
    const rx = Math.floor(x / REGION);
    const rz = Math.floor(z / REGION);
    let best: HamletSite | null = null;
    let bestD = Infinity;
    for (let dz = -rings; dz <= rings; dz++) {
      for (let dx = -rings; dx <= rings; dx++) {
        const site = this.hamletAt(rx + dx, rz + dz);
        if (!site) continue;
        const ddx = site.x + 15 - x;
        const ddz = site.z + 14 - z;
        const d = ddx * ddx + ddz * ddz;
        if (d < bestD) {
          bestD = d;
          best = site;
        }
      }
    }
    return best;
  }

  private paintGate(data: Uint8Array, baseX: number, baseZ: number) {
    if (this.flat) return;
    const site = this.hamletAt(0, 0);
    if (!site) return;
    let gx = 0;
    let gz = 0;
    let ground = 0;
    let found = false;
    for (let dz = 0; dz <= 20 && !found; dz += 4) {
      for (let dx = 34; dx <= 72 && !found; dx += 4) {
        const h = this.heightAt(site.x + dx, site.z + dz);
        if (h > SEA + 2 && h < HEIGHT - 8) {
          gx = site.x + dx;
          gz = site.z + dz;
          ground = h;
          found = true;
        }
      }
    }
    if (!found) return;
    if (gx + 3 < baseX || gx >= baseX + CS || gz < baseZ || gz >= baseZ + CS) return;
    for (let dy = 1; dy <= 5; dy++) {
      for (let dx = 0; dx <= 3; dx++) {
        const edge = dx === 0 || dx === 3 || dy === 1 || dy === 5;
        this.force(data, baseX, baseZ, gx + dx, ground + dy, gz, edge ? ID.Obsidian : ID.Portal);
      }
    }
    for (let dy = 1; dy <= 4; dy++) {
      this.force(data, baseX, baseZ, gx + 1, ground + dy, gz + 1, ID.Air);
      this.force(data, baseX, baseZ, gx + 2, ground + dy, gz + 1, ID.Air);
      this.force(data, baseX, baseZ, gx + 1, ground + dy, gz - 1, ID.Air);
      this.force(data, baseX, baseZ, gx + 2, ground + dy, gz - 1, ID.Air);
    }
  }

  private decorateOcean(data: Uint8Array, baseX: number, baseZ: number) {
    const idx = (lx: number, y: number, lz: number) => lx + lz * CS + y * CS * CS;
    for (let lz = 0; lz < CS; lz++) {
      for (let lx = 0; lx < CS; lx++) {
        const x = baseX + lx;
        const z = baseZ + lz;
        const h = this.heightAt(x, z);
        if (this.biomeOf(x, z, h) !== "Ocean") continue;
        if (hash2(x, z, this.seed + 880) > 0.16) continue;
        const tall = 2 + Math.floor(hash2(x, z, this.seed + 881) * 4);
        for (let i = 1; i <= tall; i++) {
          const y = h + i;
          if (y >= SEA || y >= HEIGHT - 1) break;
          const cell = data[idx(lx, y, lz)];
          if (cell !== ID.Water && cell !== ID.Air) break;
          const under = data[idx(lx, y - 1, lz)];
          if (i === 1 && under !== ID.Sand && under !== ID.Gravel && under !== ID.Clay) break;
          data[idx(lx, y, lz)] = ID.Reed;
        }
      }
    }
  }

  private paintCellar(data: Uint8Array, baseX: number, baseZ: number) {
    if (this.flat || hash2(baseX, baseZ, this.seed + 88) < 0.988) return;
    const site = this.hamletAt(Math.floor(baseX / REGION), Math.floor(baseZ / REGION));
    if (site) {
      const overlap = site.x - 1 < baseX + CS && site.x + 32 > baseX && site.z - 1 < baseZ + CS && site.z + 29 > baseZ;
      if (overlap) return;
    }
    const cx = baseX + 8;
    const cz = baseZ + 8;
    if (this.heightAt(cx, cz) < 16) return;
    const y0 = 6;
    for (let dz = 0; dz < 7; dz++) {
      for (let dx = 0; dx < 7; dx++) {
        for (let dy = 0; dy < 4; dy++) {
          const edge = dx === 0 || dz === 0 || dx === 6 || dz === 6 || dy === 0 || dy === 3;
          this.force(data, baseX, baseZ, baseX + 4 + dx, y0 + dy, baseZ + 4 + dz, edge ? ID.Cobble : ID.Air);
        }
      }
    }
    this.force(data, baseX, baseZ, baseX + 7, y0 + 1, baseZ + 7, ID.Chest);
    this.force(data, baseX, baseZ, baseX + 5, y0 + 2, baseZ + 5, ID.Torch);
  }

  private paintHamlet(data: Uint8Array, baseX: number, baseZ: number) {
    if (this.flat) return;
    const site = this.hamletAt(Math.floor(baseX / REGION), Math.floor(baseZ / REGION));
    if (!site) return;
    const x0 = Math.max(baseX, site.x - 1);
    const x1 = Math.min(baseX + CS, site.x + 32);
    const z0 = Math.max(baseZ, site.z - 1);
    const z1 = Math.min(baseZ + CS, site.z + 29);
    const yTop = Math.min(HEIGHT - 2, site.y + 8);
    for (let z = z0; z < z1; z++) {
      for (let x = x0; x < x1; x++) {
        for (let y = Math.max(1, site.y - 8); y <= yTop; y++) {
          const id = hamletBlock(x - site.x, y - site.y, z - site.z);
          if (id < 0) continue;
          this.force(data, baseX, baseZ, x, y, z, id);
        }
      }
    }
  }

  // ---- Landmarks: the big set-piece structures (battle order #2, item 5).
  // One candidate per 384-block cell, biome-gated like hamlets, painted
  // chunk-by-chunk from a pure pattern function so any chunk can rebuild
  // its slice deterministically.
  landmarkAt(gx: number, gz: number): Landmark | null {
    if (this.flat) return null;
    if (hash2(gx, gz, this.seed + 2400) < 0.28) return null;
    const x = gx * LM_STEP + 64 + Math.floor(hash2(gx, gz, this.seed + 2401) * (LM_STEP - 128));
    const z = gz * LM_STEP + 64 + Math.floor(hash2(gx, gz, this.seed + 2402) * (LM_STEP - 128));
    if (inNether(x)) return null;
    const rx = Math.floor(x / REGION);
    const rz = Math.floor(z / REGION);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ham = this.hamletAt(rx + dx, rz + dz);
        if (ham && Math.abs(ham.x + 15 - x) < 68 && Math.abs(ham.z + 14 - z) < 68) return null;
      }
    }
    const h = this.heightAt(x, z);
    const biome = this.biomeOf(x, z, h);
    if (biome === "Ocean" && h <= SEA - 2) {
      return { x, z, y: h, kind: "monument" };
    }
    if ((biome === "Desert" || biome === "Sand flats" || biome === "Mesa") && h >= SEA) {
      return { x, z, y: h, kind: "pyramid" };
    }
    if (biome === "Jungle" && h >= SEA) {
      return { x, z, y: h, kind: "temple" };
    }
    if ((biome === "Fen" || biome === "Deep fen" || biome === "Mushroom") && h >= SEA - 1) {
      return { x, z, y: Math.max(h, SEA), kind: "witch_hut" };
    }
    if ((biome === "Grove" || biome === "Flower grove") && h > SEA + 1) {
      return { x, z, y: h, kind: "mansion" };
    }
    if ((biome === "Brick plains" || biome === "Snow cap" || biome === "Ash ridge") && h > SEA + 1) {
      return { x, z, y: h, kind: hash2(gx, gz, this.seed + 2409) < 0.68 ? "castle" : "mansion" };
    }
    return null;
  }

  netherLandmarkAt(gx: number, gz: number): Landmark | null {
    if (this.flat) return null;
    if (hash2(gx, gz, this.seed + 2500) < 0.78) return null;
    const x = gx * LM_STEP + 64 + Math.floor(hash2(gx, gz, this.seed + 2501) * (LM_STEP - 128));
    const z = gz * LM_STEP + 64 + Math.floor(hash2(gx, gz, this.seed + 2502) * (LM_STEP - 128));
    if (!inNether(x)) return null;
    const kind = hash2(gx, gz, this.seed + 2503) < 0.5 ? "fortress" : "bastion";
    if (kind === "bastion") return { x, z, y: this.netherFloor(x, z), kind };
    let deck = 24;
    for (const [sx, sz] of [
      [-20, 0],
      [20, 0],
      [0, -4],
      [0, 4],
      [0, 0],
    ] as const) {
      deck = Math.max(deck, this.netherFloor(x + sx, z + sz) + 1);
    }
    return { x, z, y: Math.min(deck, 36), kind };
  }

  nearestLandmark(x: number, z: number): Landmark | null {
    const nether = inNether(x);
    const gx = Math.floor(x / LM_STEP);
    const gz = Math.floor(z / LM_STEP);
    let best: Landmark | null = null;
    let bestD = Infinity;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const lm = nether ? this.netherLandmarkAt(gx + dx, gz + dz) : this.landmarkAt(gx + dx, gz + dz);
        if (!lm) continue;
        const d = (lm.x - x) * (lm.x - x) + (lm.z - z) * (lm.z - z);
        if (d < bestD) {
          bestD = d;
          best = lm;
        }
      }
    }
    return best;
  }

  private landmarkBlock(lm: Landmark, dx: number, dy: number, dz: number): number {
    if (lm.kind === "monument") {
      // Marine Labyrinth & Ocean Monument: stepped Prismarine temple with underwater maze corridors & gold core
      const r = Math.max(Math.abs(dx), Math.abs(dz));
      if (r > 18 || dy < -3 || dy > 13) return -1;
      const spire = Math.abs(dx) === 12 && Math.abs(dz) === 12;
      if (spire && dy >= 4 && dy <= 12) return dy === 12 ? ID.LampOn : ID.Prism;
      const archPillar = Math.abs(dx) === 16 && Math.abs(dz) === 16;
      if (archPillar && dy >= -3 && dy <= 4) return dy === 4 ? ID.LampOn : ID.Prism;
      const stepH = r <= 4 ? 10 : r <= 8 ? 8 : r <= 12 ? 6 : r <= 15 ? 4 : 2;
      if (dy > stepH) return r <= 2 && dy === 11 ? ID.LampOn : -1;
      if (dy <= 0) return ID.Prism;
      // Front entrance archway
      if (dz >= 12 && Math.abs(dx) <= 1 && (dy === 1 || dy === 2 || dy === 3)) return ID.Water;
      // Outer Labyrinth ring (r between 5 and 13, dy 1..3)
      if (r >= 5 && r <= 13 && dy >= 1 && dy <= 3) {
        if (r === 13 || r === 9) {
          // Maze gates on cardinal and diagonal axes
          const gate =
            (Math.abs(dx) <= 1 && dz > 0) ||
            (Math.abs(dz) <= 1 && r === 9) ||
            (Math.abs(Math.abs(dx) - 6) <= 1 && r === 13);
          if (gate && dy <= 2) return ID.Air;
          return dy === 3 && (dx + dz) % 4 === 0 ? ID.LampOn : ID.Prism;
        }
        // Radial labyrinth partitions
        if ((dx === 0 && dz < -5) || (Math.abs(dx) === 6 && Math.abs(dz) >= 6 && Math.abs(dz) <= 8)) {
          return dy <= 2 && Math.abs(dz) === 7 ? ID.Air : ID.Prism;
        }
        if (dy === 1 && Math.abs(dx) === 10 && dz === -10) return ID.Chest;
        return ID.Air;
      }
      // Inner Gold & Sponge Sanctuary (r <= 4, dy 1..7)
      if (r <= 4 && dy >= 1 && dy <= 7) {
        if (r === 4) {
          if (dz === 4 && Math.abs(dx) <= 1 && dy <= 3) return ID.Air;
          return dy === 4 && (dx === 0 || dz === 0) ? ID.LampOn : ID.Prism;
        }
        if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1 && dy >= 2 && dy <= 4) return ID.Gold;
        if (dx === 0 && dz === 0 && dy === 5) return ID.Core;
        if ((dx === -2 || dx === 2) && dz === -2 && dy === 1) return ID.Chest;
        if (Math.abs(dx) === 3 && Math.abs(dz) === 3 && dy === 6) return ID.LampOn;
        return ID.Air;
      }
      return ID.Prism;
    }

    if (lm.kind === "pyramid") {
      // Desert Pyramid: stepped sandstone pyramid + twin entrance pylons + underground TNT trap & 4 treasure chests
      if (Math.abs(dx) > 12 || Math.abs(dz) > 13 || dy < -11 || dy > 12) return -1;
      // Underground tomb shaft & treasure vault (dy < 0)
      if (dy < 0) {
        if (Math.abs(dx) <= 4 && Math.abs(dz) <= 4) {
          const wall = Math.abs(dx) === 4 || Math.abs(dz) === 4;
          if (dy === -11) return ID.Sand;
          if (dy === -10) {
            if (wall) return ID.Hard;
            if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) return ID.TNT;
            return ID.Sand;
          }
          if (dy === -9) {
            if (wall) return ID.Hard;
            if (dx === 0 && dz === 0) return ID.Plate;
            return ID.Sand;
          }
          if (dy === -8) {
            if (wall) return ID.Hard;
            if ((Math.abs(dx) === 2 && dz === 0) || (Math.abs(dz) === 2 && dx === 0)) return ID.Chest;
            if (Math.abs(dx) === 3 && Math.abs(dz) === 3) return ID.Torch;
            return ID.Air;
          }
          if (dy >= -7 && dy <= -5) {
            if (wall) return dy === -6 ? ID.Orange : ID.Yellow;
            return ID.Air;
          }
          // Vertical drop shaft (3x3) from pyramid floor to tomb
          if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) return ID.Air;
          if (Math.abs(dx) === 2 || Math.abs(dz) === 2) return ID.Yellow;
        }
        return dy >= -3 && Math.abs(dx) <= 10 && Math.abs(dz) <= 10 ? ID.Sand : -1;
      }
      // Twin Front Pylon Towers (dz between 8 and 12, |dx| between 4 and 8)
      const inTower = dz >= 8 && dz <= 12 && Math.abs(dx) >= 4 && Math.abs(dx) <= 8;
      if (inTower && dy <= 9) {
        const tWall = dz === 8 || dz === 12 || Math.abs(dx) === 4 || Math.abs(dx) === 8;
        if (dy === 0) return ID.Yellow;
        if (dy === 9) return tWall ? ID.Orange : ID.Yellow;
        if (tWall) {
          // Orange & Blue Egyptian Ankh hieroglyph pattern on front of towers
          if (dz === 12 && Math.abs(dx) === 6 && (dy === 3 || dy === 5 || dy === 6)) return ID.Orange;
          if (dz === 12 && (Math.abs(dx) === 5 || Math.abs(dx) === 7) && dy === 5) return ID.Orange;
          if (dz === 12 && Math.abs(dx) === 6 && dy === 4) return ID.Blue;
          return dy === 7 ? ID.Orange : ID.Yellow;
        }
        return ID.Air;
      }
      // Front Entrance Vestibule (dz 9..11, |dx| <= 3, dy <= 4)
      if (dz >= 9 && dz <= 11 && Math.abs(dx) <= 3 && dy <= 4) {
        if (dy === 0) return ID.Yellow;
        if (dy === 4) return ID.Orange;
        if (Math.abs(dx) === 3 || (dz === 11 && Math.abs(dx) >= 2)) return ID.Yellow;
        return ID.Air;
      }
      // Stepped Pyramid Body
      const r = Math.max(Math.abs(dx), Math.abs(dz));
      const maxR = 11 - dy;
      if (r > maxR) return -1;
      if (dy === 0) {
        if (dx === 0 && dz === 0) return ID.Blue;
        if (Math.abs(dx) + Math.abs(dz) === 2 || (Math.abs(dx) === 2 && Math.abs(dz) === 2)) return ID.Orange;
        return ID.Yellow;
      }
      if (r === maxR) {
        if (dz === maxR && Math.abs(dx) <= 1 && dy <= 2) return ID.Air;
        if (dy === 10 && r === 1) return ID.Gold;
        return dy % 3 === 2 ? ID.Orange : ID.Yellow;
      }
      // Interior sandstone pillars & torches
      if (Math.abs(dx) === 4 && Math.abs(dz) === 4 && dy <= 5) return dy === 3 ? ID.Orange : ID.Yellow;
      if (Math.abs(dx) === 4 && Math.abs(dz) === 3 && dy === 2) return ID.Torch;
      if (dy === 1 && dx === 0 && dz === -6) return ID.PharaohGold ? ID.Gold : ID.Yellow;
      return ID.Air;
    }

    if (lm.kind === "temple") {
      // Jungle Temple: mossy cobblestone stepped sanctuary with lever puzzle & underground treasure room
      if (Math.abs(dx) > 7 || Math.abs(dz) > 9 || dy < -4 || dy > 9) return -1;
      const pickStone = (salt: number) =>
        hash3(lm.x + dx, dy + salt, lm.z + dz, this.seed + 2710) < 0.44 ? ID.Moss : ID.Cobble;
      // Underground lever & trap basement (dy -4..-1)
      if (dy < 0) {
        if (Math.abs(dx) > 5 || Math.abs(dz) > 7) return -1;
        const bWall = Math.abs(dx) === 5 || Math.abs(dz) === 7;
        if (dy === -4) return pickStone(1);
        if (bWall) return pickStone(2);
        // Puzzle wall with 3 levers on the west side
        if (dx === -4 && (dz === -2 || dz === 0 || dz === 2) && dy === -2) return ID.Lever;
        // Secret treasure alcove at back (dz === -6)
        if (dz === -5 && dx !== 0) return pickStone(3);
        if (dy === -3 && dx === -3 && dz === -6) return ID.Chest;
        if (dy === -3 && dx === 3 && dz === 4) return ID.Chest;
        if (dy === -3 && dx === 0 && dz === 2) return ID.Plate;
        if (dy === -2 && dx === 4 && dz === 2) return ID.Dispenser;
        if (dy === -2 && Math.abs(dx) === 4 && dz === -4) return ID.Torch;
        if (dx === 0 && dz === -2 && dy >= -3) return ID.Ladder;
        return ID.Air;
      }
      const inGround = Math.abs(dx) <= 6 && Math.abs(dz) <= 8;
      if (!inGround) {
        // Front entrance steps
        if (dz === 9 && Math.abs(dx) <= 2 && dy === 0) return ID.StairsCobble0;
        return -1;
      }
      if (dy === 0) {
        if (dx === 0 && dz === -2) return ID.Ladder;
        return pickStone(4);
      }
      // First tier (dy 1..4)
      if (dy <= 4) {
        const wall1 = Math.abs(dx) === 6 || Math.abs(dz) === 8;
        if (wall1) {
          if (dz === 8 && Math.abs(dx) <= 1 && dy <= 2) return ID.Air;
          if (dy === 2 && Math.abs(dz) % 3 === 0) return ID.Air;
          return pickStone(5);
        }
        if (dy === 4) {
          if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) return ID.Air;
          return pickStone(6);
        }
        if (dx === 0 && dz === -2) return ID.Ladder;
        if (dy === 1 && dx === 0 && dz === -6) return ID.Chest;
        if (dy === 2 && Math.abs(dx) === 5 && dz === 0) return ID.Torch;
        return ID.Air;
      }
      // Second stepped tier (dy 5..8, |dx| <= 4, |dz| <= 5)
      if (Math.abs(dx) <= 4 && Math.abs(dz) <= 5) {
        const wall2 = Math.abs(dx) === 4 || Math.abs(dz) === 5;
        if (dy === 8) return Math.abs(dx) <= 2 && Math.abs(dz) <= 3 ? ID.Moss : pickStone(7);
        if (wall2) {
          if (dy === 6 && (dx === 0 || dz === 0)) return ID.Air;
          return pickStone(8);
        }
        if (dy === 5 && dx === 0 && dz === 0) return ID.Gold;
        if (dy === 6 && dx === 0 && dz === 0) return ID.LampOn;
        return ID.Air;
      }
      // Overgrown jungle vines/leaves on outer roof ledge
      if (dy === 5 && Math.abs(dx) === 6 && Math.abs(dz) <= 4) return ID.Leaves;
      return -1;
    }

    if (lm.kind === "witch_hut") {
      // Swamp Witch Hut on 4 wooden log stilts with overhanging dark roof, brewing stand, enchanter & chest
      if (Math.abs(dx) > 5 || Math.abs(dz) > 6 || dy < -6 || dy > 8) return -1;
      const stilt = Math.abs(dx) === 3 && (dz === -3 || dz === 3);
      if (dy <= 0) {
        if (stilt) return ID.Log;
        if (dx === 0 && dz === 5 && dy === 0) return ID.Log;
        return -1;
      }
      // Front ladder/steps up to porch (dz === 4..5, dx === 0)
      if (dx === 0 && dz === 5 && dy >= 1 && dy <= 2) return ID.Ladder;
      if (dy === 1) {
        if (stilt) return ID.Log;
        if (Math.abs(dx) <= 3 && dz >= -3 && dz <= 4) return ID.Planks;
        return -1;
      }
      // Cabin walls & porch (dy 2..4)
      if (dy >= 2 && dy <= 4) {
        // Front porch railing at dz === 4
        if (dz === 4 && Math.abs(dx) <= 3) {
          if (dy === 2 && Math.abs(dx) >= 1) return ID.Fence;
          if (Math.abs(dx) === 3) return ID.Log;
          return ID.Air;
        }
        if (Math.abs(dx) > 3 || Math.abs(dz) > 3) return -1;
        if (stilt) return ID.Log;
        const hutWall = Math.abs(dx) === 3 || Math.abs(dz) === 3;
        if (hutWall) {
          if (dz === 3 && dx === 0 && (dy === 2 || dy === 3)) return ID.Air;
          if (dy === 3 && ((Math.abs(dx) === 3 && dz === 0) || (dz === -3 && dx === 0))) return ID.Fence;
          return ID.Planks;
        }
        // Witch Hut interior furniture
        if (dy === 2) {
          if (dx === -2 && dz === -2) return ID.Brew;
          if (dx === 2 && dz === -2) return ID.Chest;
          if (dx === 0 && dz === -2) return ID.Enchanter;
          if (dx === -2 && dz === 1) return ID.MushroomRed;
          if (dx === 2 && dz === 2) return ID.Lantern;
        }
        return ID.Air;
      }
      // Overhanging dark swamp roof (dy 5..7)
      const roofW = dy === 5 ? 4 : dy === 6 ? 3 : dy === 7 ? 1 : -1;
      if (roofW >= 0 && Math.abs(dx) <= roofW && dz >= -4 && dz <= 4) {
        if (dy === 5 && Math.abs(dx) < roofW && Math.abs(dz) < 3) return ID.Air;
        return ID.Ash;
      }
      return -1;
    }

    if (lm.kind === "castle") {
      // Grand Medieval STUDS Castle: 4 corner watchtowers, crenellated battlements, gatehouse, courtyard & royal throne room
      if (Math.abs(dx) > 13 || Math.abs(dz) > 13 || dy < -2 || dy > 13) return -1;
      if (dy < 0) return ID.Cobble;
      const inCornerTower = Math.abs(dx) >= 9 && Math.abs(dx) <= 13 && Math.abs(dz) >= 9 && Math.abs(dz) <= 13;
      if (inCornerTower) {
        const tEdge =
          Math.abs(dx) === 9 || Math.abs(dx) === 13 || Math.abs(dz) === 9 || Math.abs(dz) === 13;
        if (dy === 0 || dy === 5 || dy === 10) return ID.Stone;
        if (dy === 11) {
          return tEdge && (dx + dz) % 2 === 0 ? ID.Cobble : ID.Air;
        }
        if (dy === 12 || dy === 13) {
          if (Math.abs(dx) === 11 && Math.abs(dz) === 11) return dy === 13 ? ID.Red : ID.Yellow;
          return -1;
        }
        if (tEdge) {
          // Inner door into courtyard on ground & wall walk
          if ((dy === 1 || dy === 2 || dy === 6 || dy === 7) && Math.abs(dx) === 9 && Math.abs(dz) === 11) return ID.Air;
          if ((dy === 3 || dy === 8) && (Math.abs(dx) === 11 || Math.abs(dz) === 11)) return ID.Glass;
          return (dy + dx + dz) % 3 === 0 ? ID.Cobble : ID.Stone;
        }
        if (Math.abs(dx) === 10 && Math.abs(dz) === 10 && dy <= 10) return ID.Ladder;
        if (dy === 6 && Math.abs(dx) === 11 && Math.abs(dz) === 11) return ID.Torch;
        return ID.Air;
      }
      // Outer Curtain Walls (|dx| === 11 or |dz| === 11, dy <= 6)
      const onCurtain =
        (Math.abs(dx) >= 10 && Math.abs(dx) <= 11 && Math.abs(dz) <= 9) ||
        (Math.abs(dz) >= 10 && Math.abs(dz) <= 11 && Math.abs(dx) <= 9);
      if (onCurtain && dy <= 6) {
        // Front Gatehouse Archway (dz >= 10, |dx| <= 2)
        if (dz >= 10 && Math.abs(dx) <= 1 && dy >= 1 && dy <= 3) return ID.Air;
        if (dz >= 10 && Math.abs(dx) <= 1 && dy === 4) return ID.Fence; // STUDS Portcullis
        if (dy === 0 || dy === 5) return ID.Cobble;
        if (dy === 6) {
          const outerEdge = Math.abs(dx) === 11 || Math.abs(dz) === 11;
          return outerEdge && (dx + dz) % 2 === 0 ? ID.Stone : ID.Air;
        }
        return Math.abs(dx) === 11 || Math.abs(dz) === 11 ? ID.Stone : ID.Cobble;
      }
      // Central Royal Keep & Throne Room (|dx| <= 6, dz between -8 and 2, dy <= 9)
      const inKeep = Math.abs(dx) <= 6 && dz >= -8 && dz <= 2;
      if (inKeep && dy <= 9) {
        const kWall = Math.abs(dx) === 6 || dz === -8 || dz === 2;
        if (dy === 0) {
          if (Math.abs(dx) <= 1 && dz >= -6 && dz <= 2) return ID.Red; // Royal red carpet
          return ID.Stone;
        }
        if (dy === 8) return ID.Stone;
        if (dy === 9) return kWall && (dx + dz) % 2 === 0 ? ID.Cobble : ID.Air;
        if (kWall) {
          if (dz === 2 && Math.abs(dx) <= 1 && dy <= 3) return ID.Air;
          if ((dy === 3 || dy === 6) && (Math.abs(dx) === 6 && dz % 3 === 0)) return ID.Glass;
          if (dy >= 4 && dy <= 6 && dz === 2 && Math.abs(dx) === 3) return ID.Red; // Castle banners
          return Math.abs(dx) === 6 && (dz === -8 || dz === 2) ? ID.Cobble : ID.Stone;
        }
        // Keep interior: Golden Throne, Royal Chests, Enchanting Study & Bookshelves
        if (dy === 1) {
          if (dx === 0 && dz === -6) return ID.Gold;
          if (Math.abs(dx) === 1 && dz === -6) return ID.StairsStone0;
          if (Math.abs(dx) === 4 && dz === -6) return ID.Chest;
          if (dx === -4 && dz === -2) return ID.Enchanter;
          if (dx === -5 && (dz === -3 || dz === -2 || dz === -1)) return ID.Bookshelf;
          if (dx === 4 && dz === -2) return ID.Anvil;
          if (dx === 4 && dz === 0) return ID.Bench;
        }
        if (dy === 2 && dx === 0 && dz === -6) return ID.Gold;
        if (dy === 2 && dx === -5 && (dz === -3 || dz === -2 || dz === -1)) return ID.Bookshelf;
        if (dy === 3 && Math.abs(dx) === 5 && (dz === -5 || dz === -1)) return ID.Torch;
        return ID.Air;
      }
      // Courtyard Floor & Forge (|dx| <= 9, |dz| <= 9)
      if (Math.abs(dx) <= 9 && Math.abs(dz) <= 9) {
        if (dy === 0) {
          if (Math.abs(dx) <= 1 && dz >= 2 && dz <= 11) return ID.Cobble;
          return (dx + dz) % 5 === 0 ? ID.Cobble : ID.Stone;
        }
        if (dy === 1 && dx === -7 && dz === 6) return ID.Furnace;
        if (dy === 1 && dx === 7 && dz === 6) return ID.Barrel;
        if (dy === 1 && Math.abs(dx) === 2 && dz === 9) return ID.Lantern;
        return ID.Air;
      }
      return -1;
    }

    if (lm.kind === "mansion") {
      if (Math.abs(dx) > 10 || Math.abs(dz) > 8 || dy < -2 || dy > 11) return -1;
      const inX = Math.abs(dx) <= 9;
      const inZ = Math.abs(dz) <= 7;
      if (!inX || !inZ) return dy >= 1 && dy <= 9 ? ID.Air : -1;
      const wall = Math.abs(dx) === 9 || Math.abs(dz) === 7;
      if (dy < 0) return ID.Cobble;
      if (dy === 0) {
        if (wall) return ID.Cobble;
        if (Math.abs(dx) <= 1 && dz >= -5 && dz <= 6) return ID.Red; // Mansion red carpet hall
        return ID.Planks;
      }
      const corner = Math.abs(dx) === 9 && Math.abs(dz) === 7;
      if (dy === 8 || dy === 9 || dy === 10 || dy === 11) {
        const roofY = Math.abs(dz) >= 5 ? 8 : Math.abs(dz) >= 3 ? 9 : Math.abs(dz) >= 1 ? 10 : 11;
        if (dy === roofY) return ID.Ash;
        if (wall && Math.abs(dx) === 9 && dy < roofY) return ID.Planks;
        return dy < roofY ? ID.Air : -1;
      }
      if (dy === 4) {
        if (wall) return ID.Planks;
        if (dx >= 7 && dz === -6) return ID.Ladder;
        if (dx >= 7 && dx <= 8 && dz >= -6 && dz <= -5) return ID.Air;
        return ID.Planks;
      }
      if (wall) {
        if (corner) return ID.Log;
        if (dz === 7 && Math.abs(dx) <= 1 && dy <= 2) return ID.Air;
        if ((dy === 2 || dy === 6) && ((Math.abs(dx) === 9 && Math.abs(dz) % 3 === 0) || (Math.abs(dz) === 7 && Math.abs(dx) % 3 === 0))) return ID.Glass;
        return ID.Planks;
      }
      // Interior furniture: Grand Enchanting Library + Chests + Brewing Study
      if (dy === 1 && dx === -7 && dz === -5) return ID.Chest;
      if (dy === 1 && dx === -6 && dz === 4) return ID.Enchanter;
      if ((dy === 1 || dy === 2) && dz === 6 && dx >= -8 && dx <= -4) return ID.Bookshelf;
      if ((dy === 1 || dy === 2) && dx === -8 && dz >= 2 && dz <= 5) return ID.Bookshelf;
      if (dy === 1 && dx === 0 && dz === -3) return ID.Bench;
      if (dy === 1 && dx === 6 && dz === -5) return ID.Brew;
      if (dy === 2 && (dx === -8 || dx === 8) && dz === 0) return ID.Torch;
      if (dy === 5 && dx === 7 && dz === -5) return ID.Bed;
      if (dy === 5 && dx === -7 && dz === 5) return ID.Chest;
      if (dy === 5 && dx === 0 && dz === 0) return ID.Gold;
      if (dy === 6 && (dx === -8 || dx === 8) && dz === 0) return ID.Torch;
      if ((dx === 8 || dx === 7) && dz === -6 && dy >= 1 && dy <= 7) return ID.Ladder;
      return ID.Air;
    }
    if (lm.kind === "fortress") {
      if (Math.abs(dx) > 22 || Math.abs(dz) > 6 || dy < -18 || dy > 8) return -1;
      const tower = Math.abs(dx) >= 17;
      if (dy < 0) {
        if (dx % 8 === 0 && Math.abs(dz) <= 2) return ID.Netherrack;
        if (tower && Math.abs(dz) <= 5 && dy >= -3) return ID.Netherrack;
        return -1;
      }
      if (dy === 0) {
        if (Math.abs(dz) <= 2) return ID.Netherrack;
        if (tower && Math.abs(dz) <= 5) return ID.Netherrack;
        if (Math.abs(dx) <= 2 && Math.abs(dz) <= 4) return ID.Netherrack;
        return -1;
      }
      if (tower) {
        const shell = Math.abs(dx) === 22 || Math.abs(dz) === 5;
        if (dy === 3) {
          if (dx === 18 || dx === -18) return dz === 0 ? ID.Ladder : ID.Netherrack;
          if (Math.abs(dx) >= 18 && Math.abs(dz) <= 4) return ID.Netherrack;
          return ID.Air;
        }
        if (shell && dy <= 6) return ID.Netherrack;
        if (dy === 7) return shell && (dx + dz) % 2 === 0 ? ID.Netherrack : ID.Air;
        if (dy === 1 && Math.abs(dx) === 20 && dz === -3) return ID.Chest;
        if (dy === 1 && (dx === 18 || dx === -18) && dz === 0) return ID.Ladder;
        if (dy === 2 && (dx === 18 || dx === -18) && dz === 0) return ID.Ladder;
        if ((dy === 4 || dy === 5 || dy === 6) && (dx === 18 || dx === -18) && dz === 0) return ID.Ladder;
        if (dy === 6 && Math.abs(dx) === 20 && dz === 3) return ID.Lamp;
        return ID.Air;
      }
      if (dy === 1 && Math.abs(dz) === 2 && Math.abs(dx) > 2) return ID.Fence;
      if (dy === 1 && Math.abs(dx) === 2 && Math.abs(dz) === 4) return ID.Lamp;
      return -1;
    }
    // Bastion: a ruined basalt keep around a gold heart.
    if (Math.abs(dx) > 12 || Math.abs(dz) > 12 || dy < -2 || dy > 9) return -1;
    const ruin = hash3(lm.x + dx, dy * 7 + 31, lm.z + dz, this.seed + 2600);
    const wall = Math.abs(dx) === 12 || Math.abs(dz) === 12;
    if (dy < 0) return ID.Basalt;
    if (dy === 0) {
      if (wall) return ID.Basalt;
      return ruin < 0.06 ? ID.Lava : ID.Basalt;
    }
    const core = Math.max(Math.abs(dx), Math.abs(dz));
    if (core <= 3 && dy === 1) {
      if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) return ID.Gold;
      if (dx === 2 && dz === 2) return ID.Chest;
      return ID.Obsidian;
    }
    if (core <= 3 && dy === 2 && Math.abs(dx) <= 1 && Math.abs(dz) <= 1) return ID.Gold;
    if (wall) {
      const gate = dz === 12 && Math.abs(dx) <= 1;
      if (gate && dy <= 3) return ID.Air;
      if (dy <= 7) return ruin < 0.1 && dy >= 4 ? ID.Air : ID.Basalt;
      if (dy === 8) return ruin < 0.3 ? ID.Air : ID.Basalt;
      return -1;
    }
    if (dx === 0 && Math.abs(dz) >= 6 && Math.abs(dz) <= 10 && dy <= 3) return ID.Basalt;
    if (dz === -6 && Math.abs(dx) >= 4 && Math.abs(dx) <= 9 && dy <= 3) return ID.Basalt;
    return ID.Air;
  }

  private paintLandmarkLayer(data: Uint8Array, baseX: number, baseZ: number, nether: boolean) {
    const g0x = Math.floor((baseX - 30) / LM_STEP) - 1;
    const g1x = Math.floor((baseX + CS + 30) / LM_STEP) + 1;
    const g0z = Math.floor((baseZ - 30) / LM_STEP) - 1;
    const g1z = Math.floor((baseZ + CS + 30) / LM_STEP) + 1;
    for (let gz = g0z; gz <= g1z; gz++) {
      for (let gx = g0x; gx <= g1x; gx++) {
        const lm = nether ? this.netherLandmarkAt(gx, gz) : this.landmarkAt(gx, gz);
        if (!lm) continue;
        const rx =
          lm.kind === "fortress"
            ? 23
            : lm.kind === "monument"
              ? 19
              : lm.kind === "castle"
                ? 14
                : lm.kind === "pyramid"
                  ? 13
                  : lm.kind === "temple"
                    ? 8
                    : lm.kind === "witch_hut"
                      ? 6
                      : 13;
        const rz =
          lm.kind === "fortress"
            ? 7
            : lm.kind === "monument"
              ? 19
              : lm.kind === "castle" || lm.kind === "pyramid"
                ? 14
                : lm.kind === "temple"
                  ? 10
                  : lm.kind === "witch_hut"
                    ? 7
                    : 13;
        const dyMin =
          lm.kind === "fortress"
            ? -18
            : lm.kind === "pyramid"
              ? -11
              : lm.kind === "witch_hut"
                ? -6
                : lm.kind === "temple"
                  ? -4
                  : lm.kind === "monument"
                    ? -3
                    : -2;
        const dyMax =
          lm.kind === "monument" || lm.kind === "castle"
            ? 13
            : lm.kind === "pyramid"
              ? 12
              : lm.kind === "mansion"
                ? 11
                : lm.kind === "temple" || lm.kind === "bastion"
                  ? 9
                  : 8;
        const x0 = Math.max(baseX, lm.x - rx);
        const x1 = Math.min(baseX + CS, lm.x + rx + 1);
        const z0 = Math.max(baseZ, lm.z - rz);
        const z1 = Math.min(baseZ + CS, lm.z + rz + 1);
        for (let z = z0; z < z1; z++) {
          for (let x = x0; x < x1; x++) {
            for (let dy = dyMin; dy <= dyMax; dy++) {
              const id = this.landmarkBlock(lm, x - lm.x, dy, z - lm.z);
              if (id < 0) continue;
              this.force(data, baseX, baseZ, x, lm.y + dy, z, id);
            }
          }
        }
      }
    }
  }

  private scatterCaps(data: Uint8Array, baseX: number, baseZ: number) {
    if (this.flat) return;
    const idx = (lx: number, y: number, lz: number) => lx + lz * CS + y * CS * CS;
    for (let lz = 0; lz < CS; lz++) {
      for (let lx = 0; lx < CS; lx++) {
        const x = baseX + lx;
        const z = baseZ + lz;
        const roof = this.heightAt(x, z) - 5;
        for (let y = 4; y < roof && y < HEIGHT - 2; y++) {
          const i = idx(lx, y, lz);
          if (data[i] !== ID.Air) continue;
          const under = data[idx(lx, y - 1, lz)];
          if (under !== ID.Stone && under !== ID.Cobble && under !== ID.Moss) continue;
          if (hash3(x, y, z, this.seed + 640) < 0.9972) continue;
          data[i] = hash3(x, y, z, this.seed + 641) > 0.5 ? ID.MushroomRed : ID.Mushroom;
        }
      }
    }
  }

  private paintSites(data: Uint8Array, baseX: number, baseZ: number) {
    if (this.flat) return;
    const g0x = Math.floor((baseX - 10) / SITE_STEP) - 1;
    const g1x = Math.floor((baseX + CS + 10) / SITE_STEP) + 1;
    const g0z = Math.floor((baseZ - 10) / SITE_STEP) - 1;
    const g1z = Math.floor((baseZ + CS + 10) / SITE_STEP) + 1;
    for (let gz = g0z; gz <= g1z; gz++) {
      for (let gx = g0x; gx <= g1x; gx++) {
        const site = this.siteAt(gx, gz);
        if (!site) continue;
        if (site.x + 8 < baseX || site.x - 3 >= baseX + CS || site.z + 8 < baseZ || site.z - 3 >= baseZ + CS) continue;
        if (site.kind !== "wreck" && site.kind !== "mine" && site.kind !== "reef" && site.kind !== "dungeon") {
          const rad = site.kind === "outpost" || site.kind === "tomb" ? 6 : 5;
          const floor =
            site.kind === "cairn" ? ID.Snow : site.kind === "shrine" ? ID.Hard : site.kind === "tomb" ? ID.Sand : ID.Grass;
          for (let dz = -1; dz <= rad; dz++) {
            for (let dx = -1; dx <= rad; dx++) {
              this.force(data, baseX, baseZ, site.x + dx, site.y, site.z + dz, floor);
              for (let dy = 1; dy <= 4; dy++) this.force(data, baseX, baseZ, site.x + dx, site.y + dy, site.z + dz, ID.Air);
            }
          }
        }
        if (site.kind === "mine") {
          for (let dz = 0; dz < 5; dz++) {
            for (let dx = 0; dx < 5; dx++) {
              for (let dy = 1; dy <= 3; dy++) this.force(data, baseX, baseZ, site.x + dx, site.y + dy, site.z + dz, ID.Air);
            }
          }
        }
        if (site.kind === "dungeon") {
          for (let dz = 0; dz < 7; dz++) {
            for (let dx = 0; dx < 7; dx++) {
              for (let dy = 1; dy <= 4; dy++) this.force(data, baseX, baseZ, site.x + dx, site.y + dy, site.z + dz, ID.Air);
            }
          }
        }
        for (const brick of siteBricks(site.kind, this.seed, site.x, site.z)) {
          this.force(data, baseX, baseZ, site.x + brick.dx, site.y + brick.dy, site.z + brick.dz, brick.id);
        }
      }
    }
  }

  siteAt(gx: number, gz: number): Site | null {
    if (this.flat) return null;
    const gate = hash2(gx, gz, this.seed + 1200);
    const span = SITE_STEP - 36;
    const x = gx * SITE_STEP + 18 + Math.floor(hash2(gx, gz, this.seed + 1201) * span);
    const z = gz * SITE_STEP + 18 + Math.floor(hash2(gx, gz, this.seed + 1202) * span);
    if (inNether(x)) return null;
    const h = this.heightAt(x, z);
    const samples = [h, this.heightAt(x + 4, z), this.heightAt(x, z + 4), this.heightAt(x + 4, z + 4)];
    let min = samples[0];
    let max = samples[0];
    for (const sample of samples) {
      if (sample < min) min = sample;
      if (sample > max) max = sample;
    }
    const rx = Math.floor(x / REGION);
    const rz = Math.floor(z / REGION);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ham = this.hamletAt(rx + dx, rz + dz);
        if (!ham) continue;
        if (Math.abs(ham.x - x) < 46 && Math.abs(ham.z - z) < 46) return null;
      }
    }
    const shore = h >= SEA - 1 && h <= SEA + 1;
    const biome = this.biomeOf(x, z, h);
    const roll = hash2(gx, gz, this.seed + 1203);
    const steep = max - min > 5;
    let kind: SiteKind;
    if (biome === "Ocean") {
      if (gate > 0.86 || max - min > 7) return null;
      kind = roll < 0.6 ? "reef" : "wreck";
    } else if (gate > 0.58) return null;
    else if (shore && roll < 0.55) kind = "wreck";
    else if (h <= SEA + 1) return null;
    else if (biome === "Snow cap" && max - min <= 12) kind = roll < 0.72 ? "cairn" : "mine";
    else if (steep) return null;
    else if (biome === "Grove" || biome === "Flower grove") kind = roll < 0.34 ? "shrine" : roll < 0.62 ? "patch" : "camp";
    else if (biome === "Ash ridge" || biome === "Mesa") kind = roll < 0.55 ? "ruin" : "outpost";
    else if (biome === "Fen" || biome === "Deep fen") kind = roll < 0.5 ? "camp" : "shrine";
    else if (biome === "Desert") kind = roll < 0.5 ? "tomb" : roll < 0.78 ? "ruin" : "outpost";
    else if (biome === "Sand flats") kind = roll < 0.48 ? "ruin" : roll < 0.75 ? "outpost" : "mine";
    else if (hash2(gx, gz, this.seed + 1300) < 0.07 && h > SEA + 5 && max - min <= 8) kind = "dungeon";
    else {
      const bag: SiteKind[] = ["ruin", "camp", "mine", "outpost", "patch", "shrine"];
      kind = bag[Math.floor(roll * bag.length) % bag.length];
    }
    const y = Math.max(2, Math.min(HEIGHT - 16, h));
    return { x, z, y, kind };
  }

  nearestSite(x: number, z: number, rings = 2, kind?: SiteKind): Site | null {
    const gx = Math.floor(x / SITE_STEP);
    const gz = Math.floor(z / SITE_STEP);
    let best: Site | null = null;
    let bestD = Infinity;
    for (let dz = -rings; dz <= rings; dz++) {
      for (let dx = -rings; dx <= rings; dx++) {
        const site = this.siteAt(gx + dx, gz + dz);
        if (!site || (kind && site.kind !== kind)) continue;
        const ddx = site.x - x;
        const ddz = site.z - z;
        const d = ddx * ddx + ddz * ddz;
        if (d < bestD) {
          bestD = d;
          best = site;
        }
      }
    }
    return best;
  }

  releaseFar(cx: number, cz: number, radius: number) {
    const lim = (radius + 3) * (radius + 3);
    for (const key of this.chunks.keys()) {
      const [x, z] = key.split(",").map(Number);
      const dx = x - cx;
      const dz = z - cz;
      if (dx * dx + dz * dz > lim) this.chunks.delete(key);
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
    // Philippe's law (2026-10-30): spawning ALWAYS lands on grass —
    // never in a hole, on a beach or on bare rock. Pass 1 wants grass
    // AND gentle ground nearby; pass 2 takes any grass top; only a
    // world with no grass at all falls back to the old height rule.
    const scan = (maxR: number, gentle: boolean): { x: number; y: number; z: number } | null => {
      for (let r = 0; r <= maxR; r += 3) {
        const n = r === 0 ? 1 : 12;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + r * 0.15;
          const x = Math.round(Math.cos(a) * r);
          const z = Math.round(Math.sin(a) * r);
          const h = this.heightAt(x, z);
          if (h < SEA + 3) continue;
          if (this.get(x, h, z) !== ID.Grass) continue;
          if (gentle && Math.abs(this.heightAt(x + 4, z - 2) - h) > 3) continue;
          return { x: x + 0.5, y: h + 1.02, z: z + 0.5 };
        }
      }
      return null;
    };
    return scan(90, true) ?? scan(150, false) ?? (() => {
      const h = this.heightAt(0, 0);
      return { x: 0.5, y: h + 1.02, z: 0.5 };
    })();
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
  /** Section 22 P-C: the mechanic's hangar apron anchor (block
   *  coords + ground height) when this decor built a village —
   *  game.ts parks the display vehicle there. */
  hangar?: { x: number; y: number; z: number };
};

const COTTAGES: [number, number, number, number][] = [
  [1, 4, ID.Red, ID.Yellow],
  [22, 4, ID.Blue, ID.White],
  [1, 18, ID.Orange, ID.Yellow],
  [22, 18, ID.Green, ID.White],
];

function cottageBlock(lx: number, ry: number, lz: number, ox: number, oz: number, wall: number, roof: number): number {
  const x = lx - ox;
  const z = lz - oz;
  const W = 7;
  const D = 6;
  const wallH = 4;
  if (ry === 0 && x === 3 && z === -1) return ID.Planks;
  if (ry === 0 && x >= 0 && x < W && z >= 0 && z < D) return ID.Planks;
  if (ry === wallH + 1 && x >= -1 && x <= W && z >= -1 && z <= D) {
    if (Math.abs(x - 3) <= 1 && z === -1) return -1;
    return roof;
  }
  if (x < 0 || z < 0 || x >= W || z >= D || ry < 1 || ry > wallH) return -1;
  const edge = x === 0 || z === 0 || x === W - 1 || z === D - 1;
  if (!edge) {
    if (ry === 1 && x === 2 && z === 2) return ID.Chest;
    if (ry === 1 && x === 4 && z === 3) return ID.Bed;
    if (ry === 1 && x === 1 && z === 1) return ID.Bench;
    if (ry === 1 && x === 5 && z === 1) return ID.Lamp;
    return -1;
  }
  if (z === 0 && x === 3 && ry <= 2) return ID.Door;
  if (ry === 2 && (x === 0 || x === W - 1) && (z === 2 || z === 3)) return ID.Glass;
  return wall;
}

function hamletBlock(lx: number, ry: number, lz: number): number {
  for (const [ox, oz, wall, roof] of COTTAGES) {
    const id = cottageBlock(lx, ry, lz, ox, oz, wall, roof);
    if (id >= 0) return id;
  }
  const wx = lx - 1;
  const wz = lz - 11;
  if (wx >= 0 && wz >= 0 && wx <= 2 && wz <= 2) {
    const edge = wx === 0 || wz === 0 || wx === 2 || wz === 2;
    if (edge && (ry === 1 || ry === 2)) return ID.Stone;
    if (!edge && ry === 1) return ID.Water;
    if (wx === 0 && wz === 0 && ry === 3) return ID.Lamp;
  }
  if (lx >= 8 && lx <= 13) {
    if (lz === 13 && ry === 0) return ID.Water;
    if ((lz === 12 || lz === 14) && ry === 0) return ID.Farmland;
    if ((lz === 12 || lz === 14) && ry === 1) return ID.CropRipe;
  }
  const px = lx - 22;
  const pz = lz - 11;
  if (px >= 0 && pz >= 0 && px < 7 && pz < 5 && ry === 1) {
    const edge = px === 0 || pz === 0 || px === 6 || pz === 4;
    if (edge && !(pz === 0 && px === 3)) return ID.Fence;
  }
  if (lx === 12 && lz === 19 && ry === 1) return ID.Chest;
  if (lx === 11 && lz === 19 && ry === 1) return ID.Bench;
  if (lx === 14 && lz === 20 && ry === 1) return ID.Chest;
  if (lx === 16 && lz === 20 && ry === 1) return ID.Chest;
  if (lx === 9 && lz === 19 && ry === 1) return ID.Furnace;
  if (lx === 10 && lz === 19 && ry === 1) return ID.Anvil;
  if (lx === 13 && lz === 8 && (ry === 1 || ry === 2)) return ID.Cobble;
  if (lx === 16 && lz === 8 && ry === 1) return ID.Cobble;
  if (lx === 16 && lz === 8 && ry === 2) return ID.Planks;
  if (lx === 16 && lz === 8 && ry === 3) return ID.Lamp;
  if ((lx === 0 || lx === 29) && (lz === 2 || lz === 16)) {
    if (ry === 1) return ID.Cobble;
    if (ry === 2) return ID.Torch;
  }
  const inPad = lx >= 0 && lx < 30 && lz >= 0 && lz < 28;
  if (!inPad) return -1;
  if (ry > 0 && ry <= 8) return ID.Air;
  if (ry === 0) return lz === 2 || lz === 16 || lx === 14 ? ID.Cobble : ID.Grass;
  if (ry < 0 && ry >= -8) return ID.Dirt;
  return -1;
}

export function folkLayout(x0: number, z0: number): FolkSpot[] {
  return [
    { x: x0 + 4.5, z: z0 + 2.5, role: "grocer" },
    { x: x0 + 25.5, z: z0 + 2.5, role: "mason" },
    { x: x0 + 4.5, z: z0 + 16.5, role: "smith" },
    { x: x0 + 25.5, z: z0 + 16.5, role: "herder" },
    { x: x0 + 14.5, z: z0 + 10.5, role: "clerk" },
    { x: x0 + 8.5, z: z0 + 8.5, role: "mage" },
    { x: x0 + 19.5, z: z0 + 8.5, role: "ranger" },
    { x: x0 + 32.5, z: z0 + 12.5, role: "mechanic" },
  ];
}

export function penSheep(x0: number, z0: number) {
  return [
    { x: x0 + 24.5, z: z0 + 13.5 },
    { x: x0 + 26.5, z: z0 + 13.5 },
  ];
}

export function decorate(world: World, sx: number, sz: number, town = true): Decor {
  stampStarterMetals(world, sx, sz);
  const sheep = world.flat
    ? [
        { x: sx + 3, z: sz + 4 },
        { x: sx + 5, z: sz + 4 },
        { x: sx + 7, z: sz + 4 },
      ]
    : [
        { x: sx + 4, z: sz + 3 },
        { x: sx - 3, z: sz + 5 },
        { x: sx + 2, z: sz - 4 },
      ];
  if (!town) {
    if (!world.flat) {
      const row = findPad(world, sx, sz, 5, 12);
      if (row) stampPalette(world, row.x, world.heightAt(row.x, row.z), row.z);
    }
    return { sheep, folk: [], village: null };
  }
  const site = findVillageSite(world, sx, sz);
  const built = stampVillage(world, site.x, site.y, site.z);
  if (world.flat) {
    stampPyramid(world, sx - 16, 4, sz + 8);
    stampPalette(world, sx + 2, 4, sz - 8);
  } else {
    const row = findPad(world, sx, sz, 5, 12);
    if (row) stampPalette(world, row.x, world.heightAt(row.x, row.z), row.z);
  }
  return { sheep: [...sheep, ...built.sheep], folk: built.folk, village: { x: site.x, z: site.z }, hangar: built.hangar };
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
  const show = [ID.Moss, ID.Mud, ID.Clay, ID.Snow, ID.Ash, ID.AshSoil, ID.CrystalOre, ID.Bloom, ID.Reed];
  for (let i = 0; i < show.length; i++) world.set(x + i, 5, z + 12, show[i]);
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













function stampSpike(world: World, x: number, y: number, z: number) {
  // ice spike
  for (let i = 0; i < 6; i++) {
    const r = i < 2 ? 1 : 0;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        world.set(x + dx, y + i, z + dz, ID.Ice);
      }
    }
  }
  world.set(x, y + 6, z, ID.IceSheet);
}

function stampTemple(world: World, x: number, y: number, z: number) {
  // small desert temple
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      if (Math.abs(dx) === 2 || Math.abs(dz) === 2) {
        world.set(x + dx, y, z + dz, ID.Sand);
        world.set(x + dx, y + 1, z + dz, ID.Sand);
      }
    }
  }
  world.set(x, y, z, ID.Chest);
  world.set(x, y + 1, z, ID.Sand);
  world.set(x + 1, y, z, ID.TNT);
  world.set(x - 1, y, z, ID.TNT);
}

function stampPortal(world: World, x: number, y: number, z: number) {
  // ruined nether portal frame
  for (let i = 0; i < 4; i++) {
    world.set(x, y + i, z, ID.Obsidian);
    world.set(x + 3, y + i, z, ID.Obsidian);
  }
  world.set(x + 1, y, z, ID.Obsidian);
  world.set(x + 2, y, z, ID.Obsidian);
  world.set(x + 1, y + 4, z, ID.Obsidian);
  world.set(x + 2, y + 4, z, ID.Obsidian);
  // missing some blocks to look ruined
  world.set(x + 1, y + 2, z, ID.Air);
}

function stampHut(world: World, x: number, y: number, z: number) {
  // tiny hut
  for (let dx = 0; dx <= 2; dx++) {
    for (let dz = 0; dz <= 2; dz++) {
      world.set(x + dx, y, z + dz, ID.Planks);
      world.set(x + dx, y + 2, z + dz, ID.Planks);
    }
  }
  world.set(x + 1, y + 1, z, ID.Door);
  world.set(x + 1, y + 1, z + 1, ID.Air);
  world.set(x, y + 1, z + 1, ID.Glass);
  world.set(x + 2, y + 1, z + 1, ID.Glass);
}

function stampTower(world: World, x: number, y: number, z: number) {
  // small watchtower
  for (let i = 0; i < 5; i++) {
    world.set(x, y + i, z, ID.Cobble);
    world.set(x + 1, y + i, z, ID.Cobble);
  }
  world.set(x, y + 5, z, ID.Planks);
  world.set(x + 1, y + 5, z, ID.Planks);
  world.set(x, y + 6, z, ID.Torch);
}

function stampDungeon(world: World, x: number, y: number, z: number) {
  // small buried room
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      for (let dy = -1; dy <= 1; dy++) {
        world.set(x + dx, y + dy, z + dz, ID.Air);
      }
    }
  }
  world.set(x, y, z, ID.Chest);
  world.set(x + 1, y, z, ID.Spawner);
}

function stampWreck(world: World, x: number, y: number, z: number) {
  // small shipwreck: logs + chest
  world.set(x, y, z, ID.Log);
  world.set(x + 1, y, z, ID.Log);
  world.set(x + 2, y, z, ID.Log);
  world.set(x + 1, y + 1, z, ID.Chest);
  world.set(x, y, z + 1, ID.Planks);
  world.set(x + 2, y, z - 1, ID.Planks);
}

function stampMine(world: World, x: number, y: number, z: number) {
  // small mine entrance: hole + ore nearby
  world.set(x, y, z, ID.Air);
  world.set(x, y - 1, z, ID.Air);
  world.set(x + 1, y, z, ID.Cobble);
  world.set(x - 1, y, z, ID.Cobble);
  world.set(x, y, z + 1, ID.Cobble);
  world.set(x, y - 2, z, ID.IronOre);
  world.set(x + 1, y - 2, z, ID.Coal);
}

function stampBeacon(world: World, x: number, y: number, z: number) {
  // small beacon pillar of iron block + diamond top
  for (let i = 0; i < 3; i++) world.set(x, y + i, z, ID.IronBlock);
  world.set(x, y + 3, z, ID.Diamond);
}

function stampShrine(world: World, x: number, y: number, z: number) {
  // small 3x3 shrine of calcite + center crystal
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      world.set(x + dx, y, z + dz, ID.Calcite);
    }
  }
  world.set(x, y + 1, z, ID.CrystalOre);
  world.set(x, y + 2, z, ID.EndCrystal);
}

function stampCamp(world: World, x: number, y: number, z: number) {
  // small camp: campfire + logs around
  world.set(x, y, z, ID.Campfire);
  world.set(x + 1, y, z, ID.Log);
  world.set(x - 1, y, z, ID.Log);
  world.set(x, y, z + 1, ID.Log);
  world.set(x, y, z - 1, ID.Log);
}

function stampRuinedWell(world: World, x: number, y: number, z: number) {
  // small 3x3 well of cobble + water
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      if (Math.abs(dx) + Math.abs(dz) === 2) continue;
      world.set(x + dx, y, z + dz, ID.Cobble);
      if (dx === 0 && dz === 0) world.set(x, y - 1, z, ID.Water);
    }
  }
  world.set(x, y + 1, z, ID.Cobble);
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
  world.set(x0 + 12, ground + 1, z0 + 19, ID.Chest);
  world.set(x0 + 11, ground + 1, z0 + 19, ID.Bench);
  // extra crop rows
  for (let x = 8; x <= 13; x++) {
    world.set(x0 + x, ground, z0 + 15, ID.Farmland);
    world.set(x0 + x, ground + 1, z0 + 15, ID.CarrotRipe);
    world.set(x0 + x, ground, z0 + 16, ID.Farmland);
    world.set(x0 + x, ground + 1, z0 + 16, ID.PotatoRipe);
  }
  // small storage shed
  const sx = x0 + 14;
  const sz = z0 + 20;
  for (let x = 0; x < 5; x++) for (let z = 0; z < 4; z++) {
    world.set(sx + x, ground, sz + z, ID.Planks);
    for (let y = 1; y <= 3; y++) {
      const edge = x === 0 || z === 0 || x === 4 || z === 3;
      if (edge && !(z === 0 && x === 2 && y <= 2)) world.set(sx + x, ground + y, sz + z, ID.Cobble);
    }
  }
  world.set(sx + 1, ground + 1, sz + 1, ID.Chest);
  world.set(sx + 3, ground + 1, sz + 1, ID.Chest);
  world.set(sx + 2, ground + 2, sz + 2, ID.Torch);
  // blacksmith shed
  const bx = x0 + 8;
  const bz = z0 + 18;
  for (let x = 0; x < 5; x++) for (let z = 0; z < 4; z++) {
    world.set(bx + x, ground, bz + z, ID.Cobble);
    for (let y = 1; y <= 3; y++) {
      const edge = x === 0 || z === 0 || x === 4 || z === 3;
      if (edge && !(z === 0 && x === 2 && y <= 2)) world.set(bx + x, ground + y, bz + z, ID.Stone);
    }
    if (x > 0 && x < 4 && z > 0 && z < 3) world.set(bx + x, ground + 4, bz + z, ID.Planks);
  }
  world.set(bx + 1, ground + 1, bz + 1, ID.Furnace);
  world.set(bx + 3, ground + 1, bz + 1, ID.Anvil);
  world.set(bx + 2, ground + 1, bz + 2, ID.Chest);
  // small chapel near well
  const cx = x0 + 4;
  const cz = z0 + 10;
  for (let x = 0; x < 4; x++) for (let z = 0; z < 5; z++) {
    world.set(cx + x, ground, cz + z, ID.Planks);
    for (let y = 1; y <= 4; y++) {
      const edge = x === 0 || z === 0 || x === 3 || z === 4;
      if (edge && !(z === 0 && x === 1 && y <= 2)) world.set(cx + x, ground + y, cz + z, ID.White);
    }
  }
  world.set(cx + 1, ground + 1, cz + 2, ID.Bench);
  world.set(cx + 2, ground + 1, cz + 3, ID.Chest);
  world.set(cx + 1, ground + 5, cz + 2, ID.Lamp);
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
  // path lamps
  for (const [x, z] of [[7, 2], [21, 2], [7, 16], [21, 16], [14, 8], [14, 20]]) {
    world.set(x0 + x, ground + 1, z0 + z, ID.Cobble);
    world.set(x0 + x, ground + 2, z0 + z, ID.Lamp);
  }
  // flower beds
  for (let i = 0; i < 4; i++) {
    world.set(x0 + 6 + i, ground, z0 + 6, ID.Farmland);
    world.set(x0 + 6 + i, ground + 1, z0 + 6, i % 2 ? ID.Flower : ID.FlowerRed);
  }
  // small market stall
  const mx = x0 + 15;
  const mz = z0 + 10;
  for (let x = 0; x < 4; x++) {
    world.set(mx + x, ground, mz, ID.Planks);
    world.set(mx + x, ground + 2, mz, ID.Planks);
  }
  world.set(mx, ground + 1, mz, ID.Log);
  world.set(mx + 3, ground + 1, mz, ID.Log);
  world.set(mx + 1, ground + 1, mz, ID.Chest);
  world.set(mx + 2, ground + 1, mz, ID.Bench);
  // ── Mechanic's hangar-garage (section 22 P-C) ──────────────────
  // An annex east of the village pad: levelled yard, a wide-open
  // stone workshop (no door — vehicles roll in), work corner inside,
  // lamps on the apron. The display vehicle is game-side (Teks parts
  // are not voxel blocks); the apron anchor goes back in the return.
  const hx = x0 + 30;
  const hz = z0 + 4;
  levelPad(world, hx, hz, 16, 18, ground);
  for (let x = 0; x < 16; x++) {
    for (let z = 0; z < 18; z++) world.set(hx + x, ground, hz + z, ID.Cobble);
  }
  for (let x = 4; x < 16; x++) {
    for (let z = 2; z < 16; z++) {
      const edgeX = x === 4 || x === 15;
      const edgeZ = z === 2 || z === 15;
      if (!edgeX && !edgeZ) continue;
      // The west wall is the vehicle door: 6 wide, 4 tall, wide open.
      if (x === 4 && z >= 6 && z <= 11) continue;
      for (let y = 1; y <= 5; y++) world.set(hx + x, ground + y, hz + z, ID.Stone);
    }
  }
  for (let x = 3; x < 17; x++) {
    for (let z = 1; z < 17; z++) world.set(hx + x, ground + 6, hz + z, ID.Planks);
  }
  world.set(hx + 14, ground + 1, hz + 4, ID.Furnace);
  world.set(hx + 14, ground + 1, hz + 6, ID.Anvil);
  world.set(hx + 14, ground + 1, hz + 12, ID.Chest);
  world.set(hx + 13, ground + 1, hz + 12, ID.Chest);
  world.set(hx + 14, ground + 1, hz + 9, ID.Bench);
  world.set(hx + 5, ground + 1, hz + 3, ID.Cobble);
  world.set(hx + 5, ground + 2, hz + 3, ID.Lamp);
  world.set(hx + 5, ground + 1, hz + 14, ID.Cobble);
  world.set(hx + 5, ground + 2, hz + 14, ID.Lamp);
  world.set(hx + 1, ground + 1, hz + 5, ID.Cobble);
  world.set(hx + 1, ground + 2, hz + 5, ID.Lamp);
  world.set(hx + 1, ground + 1, hz + 12, ID.Cobble);
  world.set(hx + 1, ground + 2, hz + 12, ID.Lamp);
  return {
    sheep: penSheep(x0, z0),
    folk: folkLayout(x0, z0),
    hangar: { x: hx + 8, y: ground, z: hz + 9 },
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
        const id = door ? ID.Door : window ? ID.Glass : wall;
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
  world.set(x0 + 2, ground + 1, z0 + 2, ID.Chest);
  world.set(x0 + 4, ground + 1, z0 + 3, ID.Bed);
  world.set(x0 + 1, ground + 1, z0 + 1, ID.Bench);
  world.set(x0 + 5, ground + 1, z0 + 1, ID.Lamp);
  world.set(x0 + 3, ground + 2, z0 + 4, ID.Torch);
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
