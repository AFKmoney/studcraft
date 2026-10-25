function mix(n: number): number {
  n = Math.imul(n ^ (n >>> 16), 2246822519);
  n = Math.imul(n ^ (n >>> 13), 3266489917);
  return (n >>> 0) / 4294967296;
}

export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

export function parseSeed(text: string): { seed: number; text: string } {
  const t = text.trim();
  if (!t) {
    const n = (Math.random() * 1e9) | 0;
    return { seed: n, text: String(n) };
  }
  if (/^-?\d+$/.test(t)) {
    const n = Number(t);
    if (Number.isSafeInteger(n)) return { seed: n | 0, text: String(n | 0) };
  }
  return { seed: hashSeed(t), text: t.slice(0, 48) };
}

export function hash2(x: number, z: number, seed: number): number {
  const n = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ (seed | 0);
  return mix(n);
}

export function hash3(x: number, y: number, z: number, seed: number): number {
  const n =
    Math.imul(x | 0, 374761393) ^
    Math.imul(y | 0, 668265263) ^
    Math.imul(z | 0, 1274126177) ^
    (seed | 0);
  return mix(n);
}

function fade(t: number): number {
  return t * t * (3 - 2 * t);
}

export function makeNoise(seed: number) {
  function noise2(x: number, z: number): number {
    const x0 = Math.floor(x);
    const z0 = Math.floor(z);
    const fx = x - x0;
    const fz = z - z0;
    const ux = fade(fx);
    const uz = fade(fz);
    const a = hash2(x0, z0, seed);
    const b = hash2(x0 + 1, z0, seed);
    const c = hash2(x0, z0 + 1, seed);
    const d = hash2(x0 + 1, z0 + 1, seed);
    return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
  }

  function noise3(x: number, y: number, z: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const z0 = Math.floor(z);
    const fx = fade(x - x0);
    const fy = fade(y - y0);
    const fz = fade(z - z0);
    let acc = 0;
    for (let dz = 0; dz <= 1; dz++) {
      for (let dy = 0; dy <= 1; dy++) {
        for (let dx = 0; dx <= 1; dx++) {
          const w = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz);
          acc += w * hash3(x0 + dx, y0 + dy, z0 + dz, seed ^ 0x9e3779b9);
        }
      }
    }
    return acc;
  }

  function fbm(x: number, z: number): number {
    let a = 0;
    let amp = 1;
    let f = 1;
    let sum = 0;
    for (let i = 0; i < 4; i++) {
      a += amp * noise2(x * f, z * f);
      sum += amp;
      amp *= 0.5;
      f *= 2.07;
    }
    return a / sum;
  }

  return { noise2, noise3, fbm, seed };
}

export type Noise = ReturnType<typeof makeNoise>;
