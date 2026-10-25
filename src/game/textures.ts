import * as THREE from "three";
import { ATLAS_COLS, ATLAS_ROWS, BLOCKS, ID, TILE, type BlockDef } from "./blocks";

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function paintTop(ctx: CanvasRenderingContext2D, ox: number, oy: number, base: string, rings = false) {
  const S = TILE;
  ctx.fillStyle = base;
  ctx.fillRect(ox, oy, S, S);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.ellipse(ox + S * 0.4, oy + S * 0.36, S * 0.2, S * 0.14, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = S * 0.055;
  ctx.beginPath();
  ctx.arc(ox + S / 2, oy + S / 2, S * 0.36, 0, Math.PI * 2);
  ctx.stroke();
  if (rings) {
    ctx.strokeStyle = shade(base, -26);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ox + S / 2, oy + S / 2, S * 0.22, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(ox, oy, S, 3);
  ctx.fillRect(ox, oy + S - 3, S, 3);
  ctx.fillRect(ox, oy, 3, S);
  ctx.fillRect(ox + S - 3, oy, 3, S);
}

function paintSide(ctx: CanvasRenderingContext2D, ox: number, oy: number, base: string, cap?: string) {
  const S = TILE;
  ctx.fillStyle = base;
  ctx.fillRect(ox, oy, S, S);
  ctx.fillStyle = shade(base, 26);
  ctx.fillRect(ox, oy, S, S * 0.12);
  ctx.fillStyle = shade(base, -32);
  ctx.fillRect(ox, oy + S * 0.18, S, S * 0.08);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(ox, oy + S * 0.86, S, S * 0.14);
  ctx.fillRect(ox, oy, S * 0.06, S);
  ctx.fillRect(ox + S * 0.94, oy, S * 0.06, S);
  if (cap) {
    ctx.fillStyle = cap;
    ctx.fillRect(ox, oy, S, S * 0.26);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(ox, oy, S, 3);
  }
}

function paintBottom(ctx: CanvasRenderingContext2D, ox: number, oy: number, base: string) {
  const S = TILE;
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
  ctx.fillRect(ox, oy, S, 3);
  ctx.fillRect(ox, oy + S - 3, S, 3);
  ctx.fillRect(ox, oy, 3, S);
  ctx.fillRect(ox + S - 3, oy, 3, S);
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
  if (face === 0) paintTop(ctx, ox, oy, block.top, block.id === ID.Log);
  else if (face === 2) paintBottom(ctx, ox, oy, block.bottom);
  else paintSide(ctx, ox, oy, block.side, block.id === ID.Grass ? block.top : undefined);
}

export function buildAtlas(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_COLS * TILE;
  canvas.height = ATLAS_ROWS * TILE;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Could not build brick textures");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const block of BLOCKS) {
    if (!block) continue;
    for (let face = 0; face < 4; face++) {
      const tile = block.id * 4 + face;
      const col = tile % ATLAS_COLS;
      const row = Math.floor(tile / ATLAS_COLS);
      paintSpecial(ctx, block, col * TILE, row * TILE, face);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}
