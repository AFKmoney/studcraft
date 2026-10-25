import * as THREE from "three";
import { ATLAS_COLS, ATLAS_ROWS, BLOCKS, ID, TILE, faceTile, type BlockDef } from "./blocks";

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function paintTop(ctx: CanvasRenderingContext2D, ox: number, oy: number, base: string, rings = false) {
  const S = TILE;
  const seam = Math.max(2, Math.round(S * 0.047));
  ctx.fillStyle = base;
  ctx.fillRect(ox, oy, S, S);
  const wash = ctx.createLinearGradient(ox, oy, ox, oy + S);
  wash.addColorStop(0, "rgba(255,255,255,0.14)");
  wash.addColorStop(0.45, "rgba(255,255,255,0)");
  wash.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = wash;
  ctx.fillRect(ox, oy, S, S);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  const seed = (ox * 3 + oy) | 0;
  for (let i = 0; i < 5; i++) {
    const yy = oy + ((seed + i * 19) % (S - 8)) + 4;
    ctx.beginPath();
    ctx.moveTo(ox + 6, yy);
    ctx.lineTo(ox + S - 6, yy + ((i & 1) === 0 ? 1 : 0));
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.ellipse(ox + S * 0.4, oy + S * 0.36, S * 0.2, S * 0.14, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = S * 0.045;
  ctx.beginPath();
  ctx.arc(ox + S / 2, oy + S / 2, S * 0.36, 0, Math.PI * 2);
  ctx.stroke();
  if (rings) {
    ctx.strokeStyle = shade(base, -26);
    ctx.lineWidth = Math.max(2, S * 0.02);
    ctx.beginPath();
    ctx.arc(ox + S / 2, oy + S / 2, S * 0.22, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(ox, oy, S, seam);
  ctx.fillRect(ox, oy + S - seam, S, seam);
  ctx.fillRect(ox, oy, seam, S);
  ctx.fillRect(ox + S - seam, oy, seam, S);
}

function paintSide(ctx: CanvasRenderingContext2D, ox: number, oy: number, base: string, cap?: string) {
  const S = TILE;
  ctx.fillStyle = base;
  ctx.fillRect(ox, oy, S, S);
  const wash = ctx.createLinearGradient(ox, oy, ox + S, oy + S);
  wash.addColorStop(0, "rgba(255,255,255,0.08)");
  wash.addColorStop(1, "rgba(0,0,0,0.1)");
  ctx.fillStyle = wash;
  ctx.fillRect(ox, oy, S, S);
  ctx.fillStyle = shade(base, 26);
  ctx.fillRect(ox, oy, S, S * 0.12);
  ctx.fillStyle = shade(base, -32);
  ctx.fillRect(ox, oy + S * 0.18, S, S * 0.08);
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const yy = oy + S * (0.34 + i * 0.16);
    ctx.beginPath();
    ctx.moveTo(ox + 4, yy);
    ctx.lineTo(ox + S - 4, yy);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(ox, oy + S * 0.86, S, S * 0.14);
  ctx.fillRect(ox, oy, S * 0.06, S);
  ctx.fillRect(ox + S * 0.94, oy, S * 0.06, S);
  if (cap) {
    ctx.fillStyle = cap;
    ctx.fillRect(ox, oy, S, S * 0.26);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(ox, oy, S, Math.max(2, S * 0.04));
  }
}

function paintBottom(ctx: CanvasRenderingContext2D, ox: number, oy: number, base: string) {
  const S = TILE;
  const seam = Math.max(2, Math.round(S * 0.047));
  ctx.fillStyle = shade(base, -8);
  ctx.fillRect(ox, oy, S, S);
  ctx.fillStyle = shade(base, -48);
  ctx.beginPath();
  ctx.arc(ox + S / 2, oy + S / 2, S * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = shade(base, 18);
  ctx.lineWidth = S * 0.07;
  ctx.beginPath();
  ctx.arc(ox + S / 2, oy + S / 2, S * 0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(ox, oy, S, seam);
  ctx.fillRect(ox, oy + S - seam, S, seam);
  ctx.fillRect(ox, oy, seam, S);
  ctx.fillRect(ox + S - seam, oy, seam, S);
}

function paintGlass(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const S = TILE;
  ctx.clearRect(ox, oy, S, S);
  ctx.fillStyle = "rgba(214,244,248,0.28)";
  ctx.fillRect(ox, oy, S, S);
  ctx.fillStyle = "rgba(240,252,255,0.92)";
  const t = S * 0.14;
  ctx.fillRect(ox, oy, S, t);
  ctx.fillRect(ox, oy + S - t, S, t);
  ctx.fillRect(ox, oy, t, S);
  ctx.fillRect(ox + S - t, oy, t, S);
}

function paintPlant(ctx: CanvasRenderingContext2D, ox: number, oy: number, bloom: string, kind: "flower" | "grass") {
  const S = TILE;
  ctx.clearRect(ox, oy, S, S);
  ctx.strokeStyle = "#2f7d3a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(ox + S * 0.5, oy + S * 0.92);
  ctx.lineTo(ox + S * 0.5, oy + S * 0.42);
  ctx.stroke();
  if (kind === "grass") {
    ctx.strokeStyle = "#3aaa4c";
    ctx.beginPath();
    ctx.moveTo(ox + S * 0.5, oy + S * 0.7);
    ctx.lineTo(ox + S * 0.32, oy + S * 0.4);
    ctx.moveTo(ox + S * 0.5, oy + S * 0.62);
    ctx.lineTo(ox + S * 0.7, oy + S * 0.34);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = bloom;
  ctx.beginPath();
  ctx.arc(ox + S * 0.5, oy + S * 0.36, S * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.arc(ox + S * 0.44, oy + S * 0.3, S * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

function paintSpecial(ctx: CanvasRenderingContext2D, block: BlockDef, ox: number, oy: number, face: number) {
  const S = TILE;
  if (block.id === ID.Glass) {
    paintGlass(ctx, ox, oy);
    return;
  }
  if (block.id === ID.Web) {
    ctx.clearRect(ox, oy, S, S);
    ctx.strokeStyle = "rgba(244, 241, 234, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox + 8, oy + 8);
    ctx.lineTo(ox + S - 8, oy + S - 8);
    ctx.moveTo(ox + S - 8, oy + 8);
    ctx.lineTo(ox + 8, oy + S - 8);
    ctx.moveTo(ox + S * 0.5, oy + 6);
    ctx.lineTo(ox + S * 0.5, oy + S - 6);
    ctx.moveTo(ox + 6, oy + S * 0.5);
    ctx.lineTo(ox + S - 6, oy + S * 0.5);
    ctx.stroke();
    return;
  }
  if (block.plant) {
    paintPlant(ctx, ox, oy, block.top, block.id === ID.TallGrass || block.id === ID.Reed ? "grass" : "flower");
    return;
  }
  if (block.id === ID.Moss && face === 0) {
    paintTop(ctx, ox, oy, block.top, false);
    ctx.fillStyle = "#1d5526";
    for (const [px, py] of [
      [0.2, 0.3],
      [0.55, 0.22],
      [0.72, 0.58],
      [0.35, 0.7],
    ]) {
      ctx.beginPath();
      ctx.arc(ox + S * px, oy + S * py, S * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (block.id === ID.Ash && face !== 2) {
    paintSide(ctx, ox, oy, block.side);
    ctx.fillStyle = "rgba(90, 30, 16, 0.45)";
    ctx.fillRect(ox + 4, oy + S * 0.28, S - 8, 6);
    ctx.fillRect(ox + 4, oy + S * 0.62, S - 8, 6);
    return;
  }
  if (block.id === ID.Snow && face === 0) {
    paintTop(ctx, ox, oy, block.top, false);
    ctx.fillStyle = "rgba(180, 210, 230, 0.85)";
    ctx.fillRect(ox + S * 0.18, oy + S * 0.2, 8, 8);
    ctx.fillRect(ox + S * 0.6, oy + S * 0.55, 10, 6);
    return;
  }
  if (block.id === ID.Mud) {
    paintSide(ctx, ox, oy, face === 0 ? block.top : block.side);
    ctx.fillStyle = "rgba(20, 10, 6, 0.35)";
    ctx.beginPath();
    ctx.ellipse(ox + S * 0.4, oy + S * 0.55, S * 0.16, S * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (block.id === ID.CrystalOre && face !== 2) {
    paintSide(ctx, ox, oy, block.side, face === 0 ? block.top : undefined);
    ctx.fillStyle = "#f4e8ff";
    ctx.beginPath();
    ctx.moveTo(ox + S * 0.5, oy + S * 0.22);
    ctx.lineTo(ox + S * 0.68, oy + S * 0.55);
    ctx.lineTo(ox + S * 0.32, oy + S * 0.55);
    ctx.fill();
    return;
  }
  if (block.id === ID.AshSoil && face !== 2) {
    paintSide(ctx, ox, oy, face === 0 ? block.top : block.side);
    ctx.fillStyle = "rgba(40, 16, 8, 0.4)";
    ctx.fillRect(ox + S * 0.15, oy + S * 0.4, S * 0.2, 4);
    ctx.fillRect(ox + S * 0.55, oy + S * 0.62, S * 0.22, 4);
    return;
  }
  if (block.id === ID.Clay && face === 0) {
    paintTop(ctx, ox, oy, block.top, false);
    ctx.strokeStyle = "rgba(90, 70, 58, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox + 8, oy + S * 0.35);
    ctx.lineTo(ox + S - 8, oy + S * 0.48);
    ctx.stroke();
    return;
  }
  if (block.id === ID.Pumpkin) {
    paintSide(ctx, ox, oy, face === 0 ? block.top : block.side, face === 0 ? undefined : block.top);
    ctx.strokeStyle = "rgba(90, 40, 8, 0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (face === 0) {
      ctx.moveTo(ox + S * 0.5, oy + 8);
      ctx.lineTo(ox + S * 0.5, oy + S - 8);
      ctx.moveTo(ox + 8, oy + S * 0.5);
      ctx.lineTo(ox + S - 8, oy + S * 0.5);
    } else {
      ctx.moveTo(ox + S * 0.28, oy + 6);
      ctx.lineTo(ox + S * 0.28, oy + S - 6);
      ctx.moveTo(ox + S * 0.5, oy + 6);
      ctx.lineTo(ox + S * 0.5, oy + S - 6);
      ctx.moveTo(ox + S * 0.72, oy + 6);
      ctx.lineTo(ox + S * 0.72, oy + S - 6);
    }
    ctx.stroke();
    return;
  }
  if (block.id === ID.Melon && face !== 2) {
    paintSide(ctx, ox, oy, face === 0 ? block.top : block.side);
    ctx.strokeStyle = "rgba(20, 60, 24, 0.45)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ox + 6, oy + S * 0.2);
    ctx.lineTo(ox + S - 6, oy + S * 0.8);
    ctx.moveTo(ox + S - 6, oy + S * 0.2);
    ctx.lineTo(ox + 6, oy + S * 0.8);
    ctx.stroke();
    return;
  }
  if (block.id === ID.Hay && face !== 2) {
    paintSide(ctx, ox, oy, face === 0 ? block.top : block.side);
    ctx.fillStyle = "rgba(140, 90, 20, 0.35)";
    for (let i = 0; i < 4; i++) ctx.fillRect(ox + 4, oy + 8 + i * (S / 5), S - 8, 3);
    return;
  }
  if (block.id === ID.Bookshelf && face !== 0 && face !== 2) {
    paintSide(ctx, ox, oy, block.side);
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(ox + 8, oy + 10, S - 16, 8);
    ctx.fillRect(ox + 8, oy + 26, S - 16, 8);
    ctx.fillRect(ox + 8, oy + 42, S - 16, 8);
    ctx.fillStyle = "#e23b2f";
    ctx.fillRect(ox + 10, oy + 10, 6, 8);
    ctx.fillRect(ox + 22, oy + 26, 6, 8);
    return;
  }
  if (face === 0) paintTop(ctx, ox, oy, block.top, block.id === ID.Log);
  else if (face === 2) paintBottom(ctx, ox, oy, block.bottom);
  else paintSide(ctx, ox, oy, block.side, block.id === ID.Grass ? block.top : undefined);
}

function hash01(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function finish(canvas: HTMLCanvasElement, colorSpace: THREE.ColorSpace) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = colorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export type BrickAtlases = {
  color: THREE.CanvasTexture;
  rough: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
};

export function buildAtlas(): BrickAtlases {
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_COLS * TILE;
  canvas.height = ATLAS_ROWS * TILE;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Could not build brick textures");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const block of BLOCKS) {
    if (!block) continue;
    for (const face of [0, 1, 2, 3] as const) {
      const tile = faceTile(block.id, face);
      if (!tile) continue;
      const col = tile % ATLAS_COLS;
      const row = Math.floor(tile / ATLAS_COLS);
      if (row >= ATLAS_ROWS) continue;
      paintSpecial(ctx, block, col * TILE, row * TILE, face);
    }
  }

  const T = 32;
  const rw = ATLAS_COLS * T;
  const rh = ATLAS_ROWS * T;
  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = rw;
  roughCanvas.height = rh;
  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = rw;
  normalCanvas.height = rh;
  const rctx = roughCanvas.getContext("2d", { alpha: true });
  const nctx = normalCanvas.getContext("2d", { alpha: true });
  if (!rctx || !nctx) throw new Error("Could not build brick maps");
  const roughPx = rctx.createImageData(rw, rh);
  const normalPx = nctx.createImageData(rw, rh);
  for (const block of BLOCKS) {
    if (!block) continue;
    for (const face of [0, 1, 2, 3] as const) {
      const tile = faceTile(block.id, face);
      if (!tile) continue;
      const col = tile % ATLAS_COLS;
      const row = Math.floor(tile / ATLAS_COLS);
      if (row >= ATLAS_ROWS) continue;
      const ox = col * T;
      const oy = row * T;
      for (let py = 0; py < T; py++) {
        for (let px = 0; px < T; px++) {
          const i = ((oy + py) * rw + (ox + px)) * 4;
          const nse = hash01(block.id * 17 + face * 131 + px * 13 + py * 29);
          const seam = px < 2 || py < 2 || px > T - 3 || py > T - 3;
          let rough = 0.3 + (nse - 0.5) * 0.1;
          if (seam) rough += 0.14;
          const dx = (px + 0.5) / T - 0.5;
          const dy = (py + 0.5) / T - 0.5;
          const dist = Math.hypot(dx, dy);
          if (face === 0 && dist > 0.28 && dist < 0.4) rough -= 0.08;
          const g = Math.max(0, Math.min(255, rough * 255));
          roughPx.data[i] = g;
          roughPx.data[i + 1] = g;
          roughPx.data[i + 2] = g;
          roughPx.data[i + 3] = 255;
          let nx = (nse - 0.5) * 0.05;
          let ny = (hash01(nse * 91.3) - 0.5) * 0.05;
          let nz = 1;
          if (face === 0) {
            const groove = Math.exp(-((dist - 0.34) * (dist - 0.34)) / 0.0011);
            nx += dx * groove * 0.55;
            ny += -dy * groove * 0.55;
          }
          const len = Math.hypot(nx, ny, nz) || 1;
          normalPx.data[i] = Math.max(0, Math.min(255, (nx / len) * 127 + 128));
          normalPx.data[i + 1] = Math.max(0, Math.min(255, (ny / len) * 127 + 128));
          normalPx.data[i + 2] = Math.max(0, Math.min(255, (nz / len) * 127 + 128));
          normalPx.data[i + 3] = 255;
        }
      }
    }
  }
  rctx.putImageData(roughPx, 0, 0);
  nctx.putImageData(normalPx, 0, 0);

  return {
    color: finish(canvas, THREE.SRGBColorSpace),
    rough: finish(roughCanvas, THREE.LinearSRGBColorSpace),
    normal: finish(normalCanvas, THREE.LinearSRGBColorSpace),
  };
}
