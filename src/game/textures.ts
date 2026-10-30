import * as THREE from "three";
import { ATLAS_COLS, ATLAS_ROWS, BLOCKS, ID, TILE, faceTile, type BlockDef } from "./blocks";

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

const STUD_UV = [
  [0.26, 0.26],
  [0.74, 0.26],
  [0.26, 0.74],
  [0.74, 0.74],
] as const;

function paintTop(ctx: CanvasRenderingContext2D, ox: number, oy: number, base: string, rings = false) {
  // 2×2 STUDS brick top field: pure injection-molded ABS base color + smooth radial
  // contact ambient occlusion collars around the 4 stud bases (radius ~0.148).
  // No artificial white arcs are painted so real 3D PBR lighting and shadows drive all highlights.
  const S = TILE;
  ctx.fillStyle = base;
  ctx.fillRect(ox, oy, S, S);
  if (rings) {
    ctx.strokeStyle = shade(base, -22);
    ctx.lineWidth = Math.max(2, S * 0.022);
    ctx.beginPath();
    ctx.arc(ox + S / 2, oy + S / 2, S * 0.36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ox + S / 2, oy + S / 2, S * 0.18, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const [ux, uy] of STUD_UV) {
    const cx = ox + S * ux;
    const cy = oy + S * uy;
    const grad = ctx.createRadialGradient(cx, cy, S * 0.125, cx, cy, S * 0.205);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.35, "rgba(0,0,0,0.20)");
    grad.addColorStop(0.7, "rgba(0,0,0,0.09)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, S * 0.205, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintSide(ctx: CanvasRenderingContext2D, ox: number, oy: number, base: string, cap?: string) {
  // Modular sub-brick STUDS assembly: each 1×1×1 block side is composed of 3 stacked
  // horizontal courses (top 2×2 plate y∈[0, 0.28], middle 1×2 running-bond course y∈[0.28, 0.64],
  // bottom 2×1 course y∈[0.64, 1.0]) with subtle factory ABS tint tolerance and deep cavity seams.
  const S = TILE;
  const y1 = Math.round(S * 0.28);
  const y2 = Math.round(S * 0.64);
  const midX = Math.round(S * 0.5);

  // Course 1 (middle y1..y2): two 1×2 bricks side-by-side with subtle factory ABS batch tolerance
  ctx.fillStyle = shade(base, 4);
  ctx.fillRect(ox, oy + y1, midX, y2 - y1);
  ctx.fillStyle = shade(base, -5);
  ctx.fillRect(ox + midX, oy + y1, S - midX, y2 - y1);

  // Course 0 (bottom y2..S): staggered running-bond (quinconce) 2×1 brick + corner 1×1 plates
  const q1 = Math.round(S * 0.25);
  const q3 = Math.round(S * 0.75);
  ctx.fillStyle = shade(base, -3);
  ctx.fillRect(ox, oy + y2, q1, S - y2);
  ctx.fillStyle = shade(base, 3);
  ctx.fillRect(ox + q1, oy + y2, q3 - q1, S - y2);
  ctx.fillStyle = shade(base, -6);
  ctx.fillRect(ox + q3, oy + y2, S - q3, S - y2);

  // Course 2 (top 0..y1): either the green 2×2 Grass plate (cap) or a top modular plate course
  ctx.fillStyle = cap ? cap : shade(base, 2);
  ctx.fillRect(ox, oy, S, y1);

  // Sub-brick top bevel highlights & deep horizontal/vertical cavity seams (0.1mm mechanical gap)
  ctx.fillStyle = "rgba(255,255,255,0.09)";
  ctx.fillRect(ox, oy, S, 2);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(ox, oy + y1 + 1, S, 1);
  ctx.fillRect(ox, oy + y2 + 1, S, 1);

  // Deep horizontal course cavity seams
  ctx.fillStyle = cap ? "rgba(0,0,0,0.32)" : "rgba(0,0,0,0.22)";
  ctx.fillRect(ox, oy + y1 - 1, S, 2);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(ox, oy + y2 - 1, S, 2);
  ctx.fillStyle = "rgba(0,0,0,0.20)";
  ctx.fillRect(ox, oy + S - 2, S, 2);

  // Running-bond vertical sub-brick seams
  ctx.fillStyle = "rgba(0,0,0,0.20)";
  ctx.fillRect(ox + midX - 1, oy + y1, 2, y2 - y1);
  ctx.fillRect(ox + q1 - 1, oy + y2, 2, S - y2);
  ctx.fillRect(ox + q3 - 1, oy + y2, 2, S - y2);
}

function paintBottom(ctx: CanvasRenderingContext2D, ox: number, oy: number, base: string) {
  // Underside of a 2×2 STUDS brick: recessed cavity + center anti-stud tube + 4 stud sockets.
  const S = TILE;
  ctx.fillStyle = shade(base, -10);
  ctx.fillRect(ox, oy, S, S);
  ctx.fillStyle = shade(base, -40);
  for (const [ux, uy] of STUD_UV) {
    ctx.beginPath();
    ctx.arc(ox + S * ux, oy + S * uy, S * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = shade(base, 14);
  ctx.lineWidth = S * 0.055;
  ctx.beginPath();
  ctx.arc(ox + S / 2, oy + S / 2, S * 0.22, 0, Math.PI * 2);
  ctx.stroke();
}

function paintGlass(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const S = TILE;
  ctx.clearRect(ox, oy, S, S);
  ctx.fillStyle = "rgba(214,244,248,0.24)";
  ctx.fillRect(ox, oy, S, S);
  ctx.fillStyle = "rgba(240,252,255,0.88)";
  const t = S * 0.12;
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
  if (block.id === ID.Cactus) {
    if (face === 0) {
      paintTop(ctx, ox, oy, "#2f8e3c", false);
      // Inner lighter-green vascular ring
      ctx.strokeStyle = "#5ad266";
      ctx.lineWidth = Math.max(2, S * 0.03);
      ctx.beginPath();
      ctx.arc(ox + S / 2, oy + S / 2, S * 0.28, 0, Math.PI * 2);
      ctx.stroke();
      // Deep dark-green radial Saguaro rib notches around perimeter
      ctx.fillStyle = "#164e1f";
      for (const pos of [0.22, 0.5, 0.78]) {
        ctx.fillRect(ox + S * pos - 2, oy, 4, S * 0.08);
        ctx.fillRect(ox + S * pos - 2, oy + S * 0.92, 4, S * 0.08);
        ctx.fillRect(ox, oy + S * pos - 2, S * 0.08, 4);
        ctx.fillRect(ox + S * 0.92, oy + S * pos - 2, S * 0.08, 4);
      }
      // Corner cream STUDS spine tips
      ctx.fillStyle = "#f4ebd0";
      for (const [sx, sy] of [
        [0.09, 0.09],
        [0.91, 0.09],
        [0.09, 0.91],
        [0.91, 0.91],
      ]) {
        ctx.beginPath();
        ctx.arc(ox + S * sx, oy + S * sy, S * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    if (face === 2) {
      paintBottom(ctx, ox, oy, block.bottom);
      return;
    }
    // Side face: 3-course modular STUDS green brick + deep fluted vertical cactus ribs + SNOT cream spine studs
    paintSide(ctx, ox, oy, "#287e34", "#369e44");
    // Vertical dark-green recessed flutes & bright-green raised STUDS cactus ribs
    for (const rx of [0.14, 0.38, 0.62, 0.86]) {
      ctx.fillStyle = "rgba(12, 46, 18, 0.55)";
      ctx.fillRect(ox + S * rx - 4, oy + 2, 4, S - 4);
      ctx.fillStyle = "rgba(98, 218, 110, 0.38)";
      ctx.fillRect(ox + S * rx, oy + 2, 4, S - 4);
    }
    // Protruding cream/tan STUDS spine needles at each of the 3 brick courses
    for (const cy of [0.15, 0.46, 0.82]) {
      for (const cx of [0.16, 0.50, 0.84]) {
        const px = ox + S * cx;
        const py = oy + S * cy;
        // Contact shadow under spine stud
        ctx.fillStyle = "rgba(10, 32, 14, 0.65)";
        ctx.fillRect(px - 4, py - 1, 8, 5);
        // Tan SNOT clip base + ivory spine bar
        ctx.fillStyle = "#c8b482";
        ctx.fillRect(px - 3, py - 3, 6, 5);
        ctx.fillStyle = "#f7f2e2";
        ctx.fillRect(px - 2, py - 2, 4, 3);
      }
    }
    return;
  }
  if (block.plant) {
    paintPlant(ctx, ox, oy, block.top, block.id === ID.TallGrass || block.id === ID.Reed ? "grass" : "flower");
    return;
  }
  if (block.id === ID.Furnace) {
    if (face === 0) {
      paintTop(ctx, ox, oy, block.top, false);
      // Central circular STUDS chimney exhaust grille on top plate
      ctx.fillStyle = "#26211e";
      ctx.beginPath();
      ctx.arc(ox + S / 2, oy + S / 2, S * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff6a18";
      ctx.beginPath();
      ctx.arc(ox + S / 2, oy + S / 2, S * 0.07, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (face === 2) {
      paintBottom(ctx, ox, oy, block.bottom);
      return;
    }
    paintSide(ctx, ox, oy, block.side, "#7e746b");
    // Upper stone lintel 1x2 STUDS bricks & vent grille slots
    ctx.fillStyle = "#453e39";
    ctx.fillRect(ox + S * 0.16, oy + S * 0.08, S * 0.68, S * 0.14);
    ctx.fillStyle = "#221d1a";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(ox + S * (0.21 + i * 0.16), oy + S * 0.11, S * 0.09, S * 0.08);
    }
    // Arched STUDS kiln hearth opening
    ctx.fillStyle = "#342e2a";
    ctx.fillRect(ox + S * 0.16, oy + S * 0.30, S * 0.68, S * 0.60);
    ctx.fillStyle = "#16110e";
    ctx.fillRect(ox + S * 0.22, oy + S * 0.36, S * 0.56, S * 0.50);
    ctx.beginPath();
    ctx.arc(ox + S * 0.5, oy + S * 0.42, S * 0.28, Math.PI, 0);
    ctx.fill();
    // Glowing red-orange 1x1 STUDS coal studs at the bottom of the hearth
    for (let i = 0; i < 3; i++) {
      const cx = ox + S * (0.31 + i * 0.19);
      ctx.fillStyle = i === 1 ? "#ff4e14" : "#b82810";
      ctx.fillRect(cx - S * 0.07, oy + S * 0.74, S * 0.14, S * 0.10);
      ctx.fillStyle = "#ff9824";
      ctx.beginPath();
      ctx.arc(cx, oy + S * 0.74, S * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }
    // Molded Trans-Orange & Trans-Yellow STUDS Flame plumes inside the furnace
    ctx.fillStyle = "#ff5a10";
    ctx.beginPath();
    ctx.moveTo(ox + S * 0.27, oy + S * 0.76);
    ctx.quadraticCurveTo(ox + S * 0.26, oy + S * 0.52, ox + S * 0.38, oy + S * 0.42);
    ctx.quadraticCurveTo(ox + S * 0.44, oy + S * 0.54, ox + S * 0.50, oy + S * 0.35);
    ctx.quadraticCurveTo(ox + S * 0.58, oy + S * 0.54, ox + S * 0.63, oy + S * 0.44);
    ctx.quadraticCurveTo(ox + S * 0.74, oy + S * 0.54, ox + S * 0.73, oy + S * 0.76);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffd838";
    ctx.beginPath();
    ctx.moveTo(ox + S * 0.34, oy + S * 0.76);
    ctx.quadraticCurveTo(ox + S * 0.38, oy + S * 0.58, ox + S * 0.44, oy + S * 0.50);
    ctx.quadraticCurveTo(ox + S * 0.50, oy + S * 0.42, ox + S * 0.55, oy + S * 0.50);
    ctx.quadraticCurveTo(ox + S * 0.62, oy + S * 0.58, ox + S * 0.66, oy + S * 0.76);
    ctx.closePath();
    ctx.fill();
    // Iron grate bars across the lower hearth
    ctx.fillStyle = "#2c2623";
    ctx.fillRect(ox + S * 0.20, oy + S * 0.80, S * 0.60, S * 0.05);
    return;
  }
  if (block.id === ID.Bench) {
    if (face === 0) {
      paintTop(ctx, ox, oy, block.top, false);
      // 3x3 STUDS Crafting Grid plate recessed on top of the Workbench
      const pad = S * 0.13;
      const span = S - pad * 2;
      ctx.fillStyle = "#6b3e22";
      ctx.fillRect(ox + pad - 2, oy + pad - 2, span + 4, span + 4);
      const cell = (span - 6) / 3;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const cx = ox + pad + c * (cell + 3);
          const cy = oy + pad + r * (cell + 3);
          ctx.fillStyle = (r + c) % 2 === 0 ? "#c4883c" : "#b07630";
          ctx.fillRect(cx, cy, cell, cell);
          // Miniature STUDS stud socket inside each crafting cell
          ctx.strokeStyle = "rgba(50, 26, 10, 0.55)";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(cx + cell / 2, cy + cell / 2, cell * 0.28, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      return;
    }
    if (face === 1) {
      paintSide(ctx, ox, oy, block.side, "#8d5228");
      // Reddish-brown STUDS corner timber pillars
      ctx.fillStyle = "#5c341a";
      ctx.fillRect(ox, oy, S * 0.13, S);
      ctx.fillRect(ox + S * 0.87, oy, S * 0.13, S);
      // SNOT Grey tool-holder clips
      ctx.fillStyle = "#8e959c";
      ctx.fillRect(ox + S * 0.24, oy + S * 0.30, S * 0.14, S * 0.07);
      ctx.fillRect(ox + S * 0.60, oy + S * 0.30, S * 0.14, S * 0.07);
      // Hanging STUDS Hammer (left)
      ctx.fillStyle = "#6b3e22";
      ctx.fillRect(ox + S * 0.29, oy + S * 0.36, S * 0.05, S * 0.42);
      ctx.fillStyle = "#d0d6dc";
      ctx.fillRect(ox + S * 0.20, oy + S * 0.34, S * 0.22, S * 0.11);
      // Hanging STUDS Hand-Saw (right)
      ctx.fillStyle = "#c43228";
      ctx.fillRect(ox + S * 0.61, oy + S * 0.33, S * 0.13, S * 0.10);
      ctx.fillStyle = "#d9dde2";
      ctx.beginPath();
      ctx.moveTo(ox + S * 0.62, oy + S * 0.43);
      ctx.lineTo(ox + S * 0.74, oy + S * 0.43);
      ctx.lineTo(ox + S * 0.70, oy + S * 0.78);
      ctx.lineTo(ox + S * 0.62, oy + S * 0.74);
      ctx.closePath();
      ctx.fill();
      return;
    }
  }
  if (block.id === ID.Chest || block.id === ID.ShulkerBox) {
    const isShulk = block.id === ID.ShulkerBox;
    if (face === 0) {
      paintTop(ctx, ox, oy, block.top, false);
      ctx.strokeStyle = isShulk ? "#4a3264" : "#5c3a1a";
      ctx.lineWidth = 3;
      ctx.strokeRect(ox + 5, oy + 5, S - 10, S - 10);
      return;
    }
    if (face === 1) {
      paintSide(ctx, ox, oy, block.side, block.top);
      // Deep horizontal hinged lid seam
      const lidY = Math.round(S * 0.36);
      ctx.fillStyle = "#18100a";
      ctx.fillRect(ox, oy + lidY - 2, S, 4);
      // Dark corner reinforcement brackets
      ctx.fillStyle = isShulk ? "#4a3264" : "#5c3a1a";
      ctx.fillRect(ox, oy, S * 0.11, S);
      ctx.fillRect(ox + S * 0.89, oy, S * 0.11, S);
      // Metallic Gold 1x1 STUDS Latch Plate with central stud
      ctx.fillStyle = "#b88418";
      ctx.fillRect(ox + S * 0.40, oy + lidY - S * 0.10, S * 0.20, S * 0.24);
      ctx.fillStyle = "#ffd84a";
      ctx.fillRect(ox + S * 0.42, oy + lidY - S * 0.08, S * 0.16, S * 0.20);
      ctx.fillStyle = "#22180a";
      ctx.beginPath();
      ctx.arc(ox + S * 0.5, oy + lidY + S * 0.02, S * 0.038, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
  }
  if (block.id === ID.Barrel) {
    if (face === 0) {
      paintTop(ctx, ox, oy, block.top, true);
      ctx.fillStyle = "#2a2018";
      ctx.beginPath();
      ctx.arc(ox + S * 0.5, oy + S * 0.5, S * 0.09, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (face === 1) {
      paintSide(ctx, ox, oy, block.side);
      // Iron barrel hoops
      ctx.fillStyle = "#3e4248";
      ctx.fillRect(ox, oy + S * 0.20, S, S * 0.09);
      ctx.fillRect(ox, oy + S * 0.72, S, S * 0.09);
      ctx.fillStyle = "#9aa1a8";
      for (const rx of [0.22, 0.5, 0.78]) {
        ctx.fillRect(ox + S * rx - 2, oy + S * 0.22, 4, 4);
        ctx.fillRect(ox + S * rx - 2, oy + S * 0.74, 4, 4);
      }
      return;
    }
  }
  if (block.id === ID.Bookshelf && face === 1) {
    paintSide(ctx, ox, oy, block.side, block.top);
    const colors = ["#d43228", "#1f5fbf", "#2f7d3a", "#e6b40e", "#7a4ad4", "#c45a10"];
    for (const [sy, sh] of [[0.14, 0.32], [0.54, 0.34]] as const) {
      ctx.fillStyle = "#2a180c";
      ctx.fillRect(ox + S * 0.08, oy + S * sy, S * 0.84, S * sh);
      for (let i = 0; i < 6; i++) {
        const bx = ox + S * (0.10 + i * 0.135);
        const bw = S * 0.12;
        const bh = S * (sh - 0.04);
        ctx.fillStyle = colors[(i + (sy > 0.5 ? 2 : 0)) % colors.length];
        ctx.fillRect(bx, oy + S * (sy + 0.03), bw, bh);
        // White STUDS book spine title tile
        ctx.fillStyle = "rgba(255,255,255,0.78)";
        ctx.fillRect(bx + 2, oy + S * (sy + 0.09), bw - 4, 4);
      }
    }
    return;
  }
  if (block.id === ID.TNT) {
    if (face === 0) {
      paintTop(ctx, ox, oy, "#d43228", false);
      ctx.fillStyle = "#2a2a2a";
      for (const [ux, uy] of STUD_UV) {
        ctx.beginPath();
        ctx.arc(ox + S * ux, oy + S * uy, S * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    if (face === 1) {
      paintSide(ctx, ox, oy, "#d43228");
      // Vertical dynamite stick grooves
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      for (const vx of [0.25, 0.5, 0.75]) ctx.fillRect(ox + S * vx - 1, oy, 2, S);
      // Crisp white central label band
      ctx.fillStyle = "#f4f1ea";
      ctx.fillRect(ox, oy + S * 0.34, S, S * 0.32);
      // Bold black STUDS "TNT" lettering
      ctx.fillStyle = "#1c1816";
      // T
      ctx.fillRect(ox + S * 0.14, oy + S * 0.40, S * 0.18, S * 0.05);
      ctx.fillRect(ox + S * 0.205, oy + S * 0.40, S * 0.05, S * 0.20);
      // N
      ctx.fillRect(ox + S * 0.38, oy + S * 0.40, S * 0.05, S * 0.20);
      ctx.fillRect(ox + S * 0.43, oy + S * 0.46, S * 0.06, S * 0.06);
      ctx.fillRect(ox + S * 0.49, oy + S * 0.40, S * 0.05, S * 0.20);
      // T
      ctx.fillRect(ox + S * 0.62, oy + S * 0.40, S * 0.18, S * 0.05);
      ctx.fillRect(ox + S * 0.685, oy + S * 0.40, S * 0.05, S * 0.20);
      return;
    }
  }
  if (block.id === ID.Enchanter) {
    if (face === 0) {
      paintTop(ctx, ox, oy, "#24163c", false);
      // Red STUDS diamond velvet cloth on top
      ctx.fillStyle = "#c42828";
      ctx.beginPath();
      ctx.moveTo(ox + S * 0.5, oy + S * 0.08);
      ctx.lineTo(ox + S * 0.92, oy + S * 0.5);
      ctx.lineTo(ox + S * 0.5, oy + S * 0.92);
      ctx.lineTo(ox + S * 0.08, oy + S * 0.5);
      ctx.closePath();
      ctx.fill();
      // 4 Glowing Cyan Aqua-Gem corner studs
      ctx.fillStyle = "#5ef2f2";
      for (const [ux, uy] of STUD_UV) {
        ctx.beginPath();
        ctx.arc(ox + S * ux, oy + S * uy, S * 0.10, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    if (face === 1) {
      paintSide(ctx, ox, oy, "#24163c", "#c42828");
      // Draped red cloth triangle & gold rune trim
      ctx.fillStyle = "#c42828";
      ctx.beginPath();
      ctx.moveTo(ox + S * 0.18, oy + S * 0.28);
      ctx.lineTo(ox + S * 0.82, oy + S * 0.28);
      ctx.lineTo(ox + S * 0.50, oy + S * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffd84a";
      ctx.fillRect(ox + S * 0.12, oy + S * 0.24, S * 0.76, S * 0.05);
      ctx.fillStyle = "#5ef2f2";
      ctx.fillRect(ox + S * 0.12, oy + S * 0.56, S * 0.10, S * 0.10);
      ctx.fillRect(ox + S * 0.78, oy + S * 0.56, S * 0.10, S * 0.10);
      return;
    }
  }
  if (block.id === ID.Brew && face === 1) {
    paintSide(ctx, ox, oy, block.side);
    // Blaze rod column & 2 glowing STUDS potion flasks
    ctx.fillStyle = "#ffb820";
    ctx.fillRect(ox + S * 0.45, oy + S * 0.12, S * 0.10, S * 0.62);
    ctx.fillStyle = "#e23b2f";
    ctx.fillRect(ox + S * 0.18, oy + S * 0.44, S * 0.20, S * 0.28);
    ctx.fillStyle = "#3ec8c8";
    ctx.fillRect(ox + S * 0.62, oy + S * 0.44, S * 0.20, S * 0.28);
    return;
  }
  if ((block.id === ID.Jukebox || block.id === ID.Note) && face !== 2) {
    if (face === 0 && block.id === ID.Jukebox) {
      paintTop(ctx, ox, oy, block.top, false);
      ctx.fillStyle = "#181412";
      ctx.fillRect(ox + S * 0.20, oy + S * 0.43, S * 0.60, S * 0.14);
      ctx.fillStyle = "#ffd84a";
      ctx.fillRect(ox + S * 0.44, oy + S * 0.46, S * 0.12, S * 0.08);
      return;
    }
    if (face === 1) {
      paintSide(ctx, ox, oy, block.side);
      ctx.strokeStyle = "#3a2412";
      ctx.lineWidth = 3;
      ctx.strokeRect(ox + S * 0.16, oy + S * 0.16, S * 0.68, S * 0.68);
      ctx.fillStyle = block.id === ID.Jukebox ? "#ffd84a" : "#2a180c";
      ctx.beginPath();
      ctx.arc(ox + S * 0.5, oy + S * 0.5, S * 0.14, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
  }
  if (block.id === ID.Dispenser && face === 1) {
    paintSide(ctx, ox, oy, block.side);
    ctx.fillStyle = "#221e1c";
    ctx.beginPath();
    ctx.arc(ox + S * 0.5, oy + S * 0.54, S * 0.20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e23b2f";
    ctx.fillRect(ox + S * 0.42, oy + S * 0.16, S * 0.16, S * 0.08);
    return;
  }
  if (block.id === ID.Pumpkin && face === 1) {
    paintSide(ctx, ox, oy, block.side);
    // Carved STUDS Jack-o'-Lantern style ribs & face
    ctx.fillStyle = "rgba(110, 42, 6, 0.38)";
    for (const rx of [0.22, 0.5, 0.78]) ctx.fillRect(ox + S * rx - 1, oy, 3, S);
    return;
  }
  if (block.id === ID.Melon && face === 1) {
    paintSide(ctx, ox, oy, "#3aaa4c");
    ctx.fillStyle = "#1d5526";
    for (const rx of [0.16, 0.38, 0.62, 0.84]) ctx.fillRect(ox + S * rx - 2, oy, 4, S);
    return;
  }
  if (block.id === ID.Hay && face === 1) {
    paintSide(ctx, ox, oy, block.side);
    ctx.fillStyle = "#c43228";
    ctx.fillRect(ox, oy + S * 0.28, S, S * 0.08);
    ctx.fillRect(ox, oy + S * 0.64, S, S * 0.08);
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
  if (block.id === ID.Target && face !== 2) {
    if (face === 0) paintTop(ctx, ox, oy, block.side, false);
    else paintSide(ctx, ox, oy, block.side);
    ctx.strokeStyle = "#e23b2f";
    ctx.lineWidth = Math.max(4, S * 0.075);
    ctx.beginPath();
    ctx.arc(ox + S / 2, oy + S / 2, S * 0.36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ox + S / 2, oy + S / 2, S * 0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#e23b2f";
    ctx.beginPath();
    ctx.arc(ox + S / 2, oy + S / 2, S * 0.08, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if ((block.id === ID.Daylight || block.id === ID.DaylightInv) && face === 0) {
    paintTop(ctx, ox, oy, block.top, false);
    ctx.fillStyle = block.id === ID.Daylight ? "rgba(218, 165, 32, 0.45)" : "rgba(30, 64, 145, 0.55)";
    const pad = S * 0.14;
    const cell = (S - pad * 2 - 8) / 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillRect(ox + pad + c * (cell + 4), oy + pad + r * (cell + 4), cell, cell);
      }
    }
    return;
  }
  if ((block.id === ID.Observer || block.id === ID.ObserverOn) && face === 1) {
    paintSide(ctx, ox, oy, block.side);
    ctx.fillStyle = block.id === ID.ObserverOn ? "#ff4a3a" : "#b02620";
    ctx.beginPath();
    ctx.arc(ox + S / 2, oy + S / 2, S * 0.14, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // v4.16 wood identity: wood must READ as wood inside the STUDS-brick
  // language — bark streaks on the log, plank seams + grain on planks
  // (and their slab/stairs, which share the tiles' colors).
  if (block.id === ID.Log && face === 1) {
    paintSide(ctx, ox, oy, block.side);
    ctx.lineWidth = Math.max(2, S * 0.02);
    for (const [fx, ph] of [[0.15, 0.0], [0.37, 1.7], [0.6, 3.4], [0.84, 5.1]] as const) {
      ctx.strokeStyle = "rgba(43, 24, 11, 0.55)";
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const yy = oy + (S * i) / 8;
        const xx = ox + S * fx + Math.sin(ph + i * 1.05) * S * 0.018;
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
      ctx.strokeStyle = "rgba(226, 178, 120, 0.22)";
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const yy = oy + (S * i) / 8;
        const xx = ox + S * fx + S * 0.045 + Math.sin(ph + 0.8 + i * 1.05) * S * 0.018;
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
    }
    return;
  }
  if (block.id === ID.Log && face === 0) {
    paintTop(ctx, ox, oy, block.top, true);
    ctx.strokeStyle = shade(block.top, -30);
    ctx.lineWidth = Math.max(2, S * 0.02);
    ctx.beginPath();
    ctx.arc(ox + S / 2, oy + S / 2, S * 0.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = shade(block.top, -38);
    ctx.beginPath();
    ctx.arc(ox + S / 2, oy + S / 2, S * 0.05, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if ((block.id === ID.Planks || block.id === ID.SlabPlanks || (block.id >= ID.StairsPlanks0 && block.id <= ID.StairsPlanks0 + 3)) && face !== 2) {
    if (face === 0) paintTop(ctx, ox, oy, block.top, false);
    else paintSide(ctx, ox, oy, block.side);
    ctx.fillStyle = "rgba(96, 58, 20, 0.6)";
    for (const fy of [0.27, 0.52, 0.77]) ctx.fillRect(ox + 2, oy + S * fy, S - 4, Math.max(2, S * 0.016));
    ctx.strokeStyle = "rgba(120, 76, 28, 0.35)";
    ctx.lineWidth = Math.max(1.5, S * 0.012);
    for (const [fx, fy, len] of [[0.08, 0.13, 0.3], [0.55, 0.39, 0.36], [0.18, 0.64, 0.42], [0.62, 0.88, 0.28]] as const) {
      ctx.beginPath();
      ctx.moveTo(ox + S * fx, oy + S * fy);
      ctx.lineTo(ox + S * (fx + len), oy + S * fy + S * 0.012);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(96, 58, 20, 0.55)";
    ctx.lineWidth = Math.max(2, S * 0.016);
    ctx.beginPath();
    ctx.ellipse(ox + S * 0.78, oy + S * 0.14, S * 0.045, S * 0.028, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  // v4.16 identity paints — blocks that stay cubes but must READ as what
  // they are (audit: ores were flat-tinted bricks, spawner/beacon/etc.
  // were anonymous). All deterministic, drawn over the house painters.
  if (block.name.toLowerCase().endsWith(" ore") && face !== 2) {
    // Stone body + nuggets in the ore's own accent color — the Minecraft
    // read: you spot WHAT ore it is from across the cave.
    if (face === 0) paintTop(ctx, ox, oy, "#9aa1a8", false);
    else paintSide(ctx, ox, oy, "#8e959c");
    for (const [fx, fy, s] of [[0.2, 0.25, 0.13], [0.62, 0.18, 0.1], [0.42, 0.52, 0.15], [0.74, 0.6, 0.12], [0.16, 0.74, 0.1], [0.6, 0.84, 0.09]] as const) {
      ctx.fillStyle = block.color;
      ctx.fillRect(ox + S * fx, oy + S * fy, S * s, S * s * 0.8);
      ctx.fillStyle = shade(block.color, -30);
      ctx.fillRect(ox + S * fx, oy + S * (fy + s * 0.8), S * s, S * s * 0.3);
    }
    return;
  }
  if (block.id === ID.Spawner && face !== 2) {
    paintSide(ctx, ox, oy, "#3a3f45");
    ctx.fillStyle = "#15181c";
    for (const fx of [0.12, 0.46, 0.8]) ctx.fillRect(ox + S * fx, oy + 4, S * 0.08, S - 8);
    ctx.fillRect(ox + 4, oy + S * 0.14, S - 8, S * 0.07);
    ctx.fillRect(ox + 4, oy + S * 0.79, S - 8, S * 0.07);
    ctx.fillStyle = "rgba(255, 120, 40, 0.75)";
    ctx.beginPath();
    ctx.arc(ox + S / 2, oy + S / 2, S * 0.07, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (block.id === ID.Soul && face !== 2) {
    paintSide(ctx, ox, oy, block.side);
    ctx.fillStyle = "rgba(30, 20, 14, 0.4)";
    for (const [fx, fy] of [[0.3, 0.34], [0.68, 0.3]] as const) {
      ctx.beginPath();
      ctx.ellipse(ox + S * fx, oy + S * fy, S * 0.07, S * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(ox + S * 0.5, oy + S * 0.68, S * 0.12, S * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if ((block.id === ID.EndFrame || block.id === ID.EndFrameEye) && face === 0) {
    paintTop(ctx, ox, oy, block.top, false);
    ctx.strokeStyle = "#2e4a34";
    ctx.lineWidth = Math.max(3, S * 0.05);
    ctx.beginPath();
    ctx.arc(ox + S / 2, oy + S / 2, S * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    if (block.id === ID.EndFrameEye) {
      ctx.fillStyle = "#57d977";
      ctx.beginPath();
      ctx.arc(ox + S / 2, oy + S / 2, S * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#12351c";
      ctx.beginPath();
      ctx.arc(ox + S / 2, oy + S / 2, S * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (block.id === ID.Beacon && face !== 2) {
    paintSide(ctx, ox, oy, "#2b2b33");
    ctx.fillStyle = "rgba(150, 225, 255, 0.85)";
    ctx.fillRect(ox + S * 0.3, oy + S * 0.3, S * 0.4, S * 0.4);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillRect(ox + S * 0.42, oy + S * 0.42, S * 0.16, S * 0.16);
    return;
  }
  if (block.id === ID.Conduit && face !== 2) {
    paintSide(ctx, ox, oy, block.side);
    ctx.strokeStyle = "rgba(38, 80, 88, 0.8)";
    ctx.lineWidth = Math.max(2, S * 0.03);
    for (const r of [0.34, 0.22]) {
      ctx.beginPath();
      ctx.arc(ox + S / 2, oy + S / 2, S * r, 0.6, Math.PI * 1.7);
      ctx.stroke();
    }
    ctx.fillStyle = "#e8f4f0";
    ctx.beginPath();
    ctx.arc(ox + S / 2, oy + S / 2, S * 0.08, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (block.id === ID.Banner && face === 1) {
    paintSide(ctx, ox, oy, block.side);
    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    ctx.fillRect(ox + S * 0.14, oy + 6, S * 0.16, S - 12);
    ctx.fillRect(ox + S * 0.7, oy + 6, S * 0.16, S - 12);
    ctx.fillStyle = shade(block.color, -25);
    ctx.fillRect(ox + S * 0.38, oy + S * 0.36, S * 0.24, S * 0.28);
    return;
  }
  if (block.id === ID.Piston) {
    if (face === 0) {
      paintTop(ctx, ox, oy, "#c8a878", false);
      ctx.strokeStyle = "rgba(90, 60, 30, 0.7)";
      ctx.lineWidth = Math.max(3, S * 0.045);
      ctx.strokeRect(ox + S * 0.12, oy + S * 0.12, S * 0.76, S * 0.76);
    } else if (face === 1) {
      paintSide(ctx, ox, oy, block.side);
      ctx.fillStyle = "rgba(40, 32, 26, 0.55)";
      ctx.fillRect(ox + S * 0.1, oy + S * 0.42, S * 0.8, S * 0.16);
    } else paintBottom(ctx, ox, oy, block.bottom);
    return;
  }
  if (block.id === ID.Farmland && face === 0) {
    paintTop(ctx, ox, oy, block.top, false);
    ctx.fillStyle = "rgba(40, 22, 10, 0.55)";
    for (const fy of [0.18, 0.42, 0.66, 0.9]) ctx.fillRect(ox + 3, oy + S * fy, S - 6, Math.max(2, S * 0.05));
    return;
  }
  if (face === 0) paintTop(ctx, ox, oy, block.top, block.id === ID.Log);
  else if (face === 2) paintBottom(ctx, ox, oy, block.bottom);
  else paintSide(ctx, ox, oy, block.side, block.id === ID.Grass ? block.top : undefined);
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
  glow: THREE.CanvasTexture;
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

  // Clean brick perimeter contact seam: darken each solid tile's outer 3px border
  // smoothly (multiply only, no white inner ring) so adjacent STUDS bricks have a
  // crisp physical gap without artificial white outlines on dark blocks.
  {
    const skip = new Set<number>();
    for (const block of BLOCKS) {
      if (!block || (!block.fluid && (!block.plant || block.cactus))) continue;
      for (const face of [0, 1, 2, 3] as const) {
        const t = faceTile(block.id, face);
        if (t) skip.add(t);
      }
    }
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    const W = canvas.width;
    const done = new Set<number>();
    for (const block of BLOCKS) {
      if (!block) continue;
      for (const face of [0, 1, 2, 3] as const) {
        const tile = faceTile(block.id, face);
        if (!tile || skip.has(tile) || done.has(tile)) continue;
        done.add(tile);
        const ox = (tile % ATLAS_COLS) * TILE;
        const oy = Math.floor(tile / ATLAS_COLS) * TILE;
        if (oy >= canvas.height) continue;
        for (let py = 0; py < TILE; py++) {
          for (let px = 0; px < TILE; px++) {
            const edge = Math.min(px, py, TILE - 1 - px, TILE - 1 - py);
            if (edge > 2) continue;
            const i = ((oy + py) * W + (ox + px)) * 4;
            if (d[i + 3] < 200) continue;
            const m = edge === 0 ? 0.80 : edge === 1 ? 0.91 : 0.96;
            d[i] = Math.min(255, d[i] * m);
            d[i + 1] = Math.min(255, d[i + 1] * m);
            d[i + 2] = Math.min(255, d[i + 2] * m);
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // Glow atlas: black everywhere except tiles of light-emitting blocks
  // (torches, magma, lit lamps, lanterns, beacons, conduits), wired as emissiveMap.
  const GT = 32;
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = ATLAS_COLS * GT;
  glowCanvas.height = ATLAS_ROWS * GT;
  const gtx = glowCanvas.getContext("2d");
  if (gtx) {
    gtx.fillStyle = "#000";
    gtx.fillRect(0, 0, glowCanvas.width, glowCanvas.height);
    const done = new Set<number>();
    for (const block of BLOCKS) {
      if (!block) continue;
      if (block.id === ID.Furnace) {
        const tile = faceTile(ID.Furnace, 1);
        if (tile && !done.has(tile)) {
          done.add(tile);
          const gx = (tile % ATLAS_COLS) * GT;
          const gy = Math.floor(tile / ATLAS_COLS) * GT;
          gtx.fillStyle = "#ff6a14";
          gtx.fillRect(gx + GT * 0.28, gy + GT * 0.42, GT * 0.44, GT * 0.38);
          gtx.fillStyle = "#ffe048";
          gtx.fillRect(gx + GT * 0.35, gy + GT * 0.48, GT * 0.30, GT * 0.28);
        }
        continue;
      }
      if (!(block.light > 0)) continue;
      for (const face of [0, 1, 2, 3] as const) {
        const tile = faceTile(block.id, face);
        if (!tile || done.has(tile)) continue;
        done.add(tile);
        const sx = (tile % ATLAS_COLS) * TILE;
        const sy = Math.floor(tile / ATLAS_COLS) * TILE;
        if (sy >= canvas.height) continue;
        gtx.drawImage(canvas, sx, sy, TILE, TILE, (tile % ATLAS_COLS) * GT, Math.floor(tile / ATLAS_COLS) * GT, GT, GT);
      }
    }
  }

  // High-resolution (64×64 per tile) noise-free normal & roughness maps:
  // Smooth C2-continuous molded edge chamfers and 2×2 stud base fillets with
  // zero random per-pixel hash noise, preventing specular firefly aliasing.
  const T = 64;
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
  const doneMaps = new Set<number>();
  for (const block of BLOCKS) {
    if (!block) continue;
    for (const face of [0, 1, 2, 3] as const) {
      const tile = faceTile(block.id, face);
      if (!tile || doneMaps.has(tile)) continue;
      doneMaps.add(tile);
      const col = tile % ATLAS_COLS;
      const row = Math.floor(tile / ATLAS_COLS);
      if (row >= ATLAS_ROWS) continue;
      const ox = col * T;
      const oy = row * T;
      const isGlossy =
        block.id === ID.ChromeBrick ||
        block.id === ID.MasterBrick ||
        block.id === ID.IronBlock ||
        block.id === ID.Gold ||
        block.id === ID.Diamond ||
        block.id === ID.Ice ||
        block.id === ID.IceSheet;
      const baseRough = isGlossy ? 0.20 : 0.30;
      for (let py = 0; py < T; py++) {
        for (let px = 0; px < T; px++) {
          const i = ((oy + py) * rw + (ox + px)) * 4;
          const dx = (px + 0.5) / T - 0.5;
          const dy = (py + 0.5) / T - 0.5;
          const ax = Math.abs(dx);
          const ay = Math.abs(dy);
          const edgeDist = Math.max(ax, ay);
          const u = (px + 0.5) / T;
          const v = (py + 0.5) / T;
          let rough = baseRough;
          if (edgeDist > 0.44) {
            const et = Math.min(1, (edgeDist - 0.44) / 0.06);
            rough += et * et * 0.24;
          }
          // Sub-brick course seam roughness for side faces
          if (face === 1 && !block.fluid && (!block.plant || block.cactus) && block.id !== ID.Glass) {
            const dH1 = Math.abs(v - 0.28);
            const dH2 = Math.abs(v - 0.64);
            const dV1 = v > 0.28 && v < 0.64 ? Math.abs(u - 0.5) : 1;
            const dV2 = v >= 0.64 ? Math.min(Math.abs(u - 0.25), Math.abs(u - 0.75)) : 1;
            const seamD = Math.min(dH1, dH2, dV1, dV2);
            if (seamD < 0.032) {
              rough += (1 - seamD / 0.032) * 0.16;
            }
          }
          // Nearest of the 4 studs in the 2×2 STUDS grid (±0.24, ±0.24 in -0.5..0.5 space)
          const qx = dx < 0 ? -0.24 : 0.24;
          const qy = dy < 0 ? -0.24 : 0.24;
          const sdx = dx - qx;
          const sdy = dy - qy;
          const sDist = Math.hypot(sdx, sdy);
          if (face === 0 && sDist > 0.13 && sDist < 0.19) {
            rough += 0.06;
          }
          const g = Math.max(0, Math.min(255, rough * 255));
          roughPx.data[i] = g;
          roughPx.data[i + 1] = g;
          roughPx.data[i + 2] = g;
          roughPx.data[i + 3] = 255;

          let nx = 0;
          let ny = 0;
          const nz = 1;
          if (face === 0) {
            // Smooth 4-stud base fillet for distant LOD chunks (Note: 3D studs sample tile center (0,0) where nx=ny=0)
            const groove = Math.exp(-((sDist - 0.154) * (sDist - 0.154)) / 0.0011);
            nx += (sdx / (sDist || 1)) * groove * 0.36;
            ny += -(sdy / (sDist || 1)) * groove * 0.36;
          } else if (face === 1 && !block.fluid && (!block.plant || block.cactus) && block.id !== ID.Glass) {
            // Smooth C2-continuous bevels at horizontal plate/brick course seams (v=0.28, v=0.64)
            const sH1 = v - 0.28;
            const sH2 = v - 0.64;
            if (Math.abs(sH1) < 0.045) ny += -Math.sin((sH1 / 0.045) * Math.PI) * 0.32;
            if (Math.abs(sH2) < 0.045) ny += -Math.sin((sH2 / 0.045) * Math.PI) * 0.28;
            // Running-bond vertical sub-brick bevels
            if (v > 0.28 && v < 0.64 && Math.abs(u - 0.5) < 0.04) {
              nx += Math.sin(((u - 0.5) / 0.04) * Math.PI) * 0.26;
            } else if (v >= 0.64) {
              const sV = Math.abs(u - 0.25) < Math.abs(u - 0.75) ? u - 0.25 : u - 0.75;
              if (Math.abs(sV) < 0.04) nx += Math.sin((sV / 0.04) * Math.PI) * 0.24;
            }
          }
          // Smooth molded brick perimeter chamfer
          if (edgeDist > 0.39) {
            const t = Math.min(1, (edgeDist - 0.39) / 0.11);
            const s = t * t * (3 - 2 * t) * 0.46;
            nx += Math.sign(dx) * s * (ax >= ay ? 1 : 0.35);
            ny += -Math.sign(dy) * s * (ay >= ax ? 1 : 0.35);
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
    glow: finish(glowCanvas, THREE.SRGBColorSpace),
  };
}
