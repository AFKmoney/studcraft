// technicGeo.ts — interpret technic.ts ops into Three.js BufferGeometry.
// Pure geometry, no game.ts imports. Home-rolled merge (no examples/jsm).

import * as THREE from "three";
import { SPECS, type Op, type Spec } from "./technic.ts";

const M = 0.5; // 1 module = 0.5 block

function col(n: number) {
  return new THREE.Color(n);
}

function addBox(parts: THREE.BufferGeometry[], a: number[], b: number[], color: number) {
  const w = Math.abs(b[0] - a[0]) * M;
  const h = Math.abs(b[1] - a[1]) * M;
  const d = Math.abs(b[2] - a[2]) * M;
  if (w < 1e-4 || h < 1e-4 || d < 1e-4) return;
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(((a[0] + b[0]) / 2) * M, ((a[1] + b[1]) / 2) * M, ((a[2] + b[2]) / 2) * M);
  g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.getAttribute("position").count * 3).fill(0).map((_, i) => (i % 3 === 0 ? col(color).r : i % 3 === 1 ? col(color).g : col(color).b)), 3));
  parts.push(g);
}

function addCyl(parts: THREE.BufferGeometry[], ax: number, c: number[], r: number, len: number, color: number, segs = 12) {
  const g = new THREE.CylinderGeometry(r * M, r * M, len * M, segs);
  if (ax === 0) g.rotateZ(Math.PI / 2);
  else if (ax === 2) g.rotateX(Math.PI / 2);
  g.translate(c[0] * M, c[1] * M, c[2] * M);
  const cc = col(color);
  const arr = new Float32Array(g.getAttribute("position").count * 3);
  for (let i = 0; i < arr.length; i += 3) { arr[i] = cc.r; arr[i + 1] = cc.g; arr[i + 2] = cc.b; }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  parts.push(g);
}

function addAxle(parts: THREE.BufferGeometry[], x0: number, x1: number, color: number, stop?: number) {
  const len = Math.abs(x1 - x0);
  const mid = (x0 + x1) / 2;
  // Cross section
  addBox(parts, [x0, -0.09, -0.03], [x1, 0.09, 0.03], color);
  addBox(parts, [x0, -0.03, -0.09], [x1, 0.03, 0.09], color);
  if (stop !== undefined) {
    addBox(parts, [stop - 0.1, -0.16, -0.16], [stop + 0.1, 0.16, 0.16], 0x2a2e32);
  }
}

function addPin(parts: THREE.BufferGeometry[], x0: number, x1: number, collar: number[], color: number, ball?: boolean) {
  addCyl(parts, 0, [(x0 + x1) / 2, 0, 0], 0.22, Math.abs(x1 - x0), color, 10);
  for (const cx of collar) {
    addCyl(parts, 0, [cx, 0, 0], 0.32, 0.12, color, 10);
  }
  if (ball) addCyl(parts, 0, [x1, 0, 0], 0.28, 0.2, color, 12);
}

function addGear(parts: THREE.BufferGeometry[], n: number, z0: number, z1: number, color: number, taper?: string) {
  const pitchR = n / 16;
  const tipR = pitchR + 0.094;
  const thick = Math.abs(z1 - z0);
  addCyl(parts, 2, [0, 0, (z0 + z1) / 2], pitchR * 0.7, thick * 0.6, color, 16);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const tx = Math.cos(a) * (pitchR + 0.04);
    const ty = Math.sin(a) * (pitchR + 0.04);
    addBox(parts, [tx - 0.04, ty - 0.06, z0], [tx + 0.04, ty + 0.06, z1], color);
  }
  addCyl(parts, 2, [0, 0, (z0 + z1) / 2], 0.06, thick * 1.2, 0x1a1a1a, 8);
  if (taper === "two") {
    addCyl(parts, 2, [0, 0, z1 + thick * 0.3], pitchR * 0.65, thick * 0.4, color, 14);
  }
}

function addWorm(parts: THREE.BufferGeometry[], x0: number, x1: number, color: number) {
  const len = Math.abs(x1 - x0);
  const steps = 12;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const a = t * Math.PI * 4;
    const y = Math.cos(a) * 0.18;
    const z = Math.sin(a) * 0.18;
    addCyl(parts, 0, [x, y, z], 0.08, len / steps, color, 6);
  }
  addCyl(parts, 0, [(x0 + x1) / 2, 0, 0], 0.1, len, color, 8);
}

function addRack(parts: THREE.BufferGeometry[], x0: number, x1: number, color: number, holes: [number, string][]) {
  addBox(parts, [x0, -0.2, -0.15], [x1, 0.2, 0.15], color);
  const n = Math.floor(Math.abs(x1 - x0) * 2);
  for (let i = 0; i < n; i++) {
    const x = x0 + (i + 0.5) * ((x1 - x0) / n);
    addBox(parts, [x - 0.04, 0.15, -0.08], [x + 0.04, 0.28, 0.08], color);
  }
  for (const [hx] of holes) {
    addCyl(parts, 2, [hx, 0, 0], 0.06, 0.35, 0x1a1a1a, 6);
  }
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (!parts.length) return new THREE.BufferGeometry();
  let vtx = 0, idx = 0;
  for (const g of parts) {
    vtx += g.getAttribute("position").count;
    idx += g.getIndex()?.count ?? 0;
  }
  const pos = new Float32Array(vtx * 3);
  const nor = new Float32Array(vtx * 3);
  const col = new Float32Array(vtx * 3);
  const index = new Uint32Array(idx);
  let vo = 0, io = 0;
  for (const g of parts) {
    pos.set(g.getAttribute("position").array as Float32Array, vo * 3);
    if (g.getAttribute("normal")) nor.set(g.getAttribute("normal").array as Float32Array, vo * 3);
    if (g.getAttribute("color")) col.set(g.getAttribute("color").array as Float32Array, vo * 3);
    const pi = g.getIndex();
    if (pi) {
      for (let i = 0; i < pi.count; i++) index[io + i] = pi.getX(i) + vo;
      io += pi.count;
    }
    vo += g.getAttribute("position").count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(index, 1));
  return out;
}

export function technicGeo(id: number): THREE.BufferGeometry {
  const spec = SPECS.get(id);
  if (!spec) return new THREE.BufferGeometry();
  const parts: THREE.BufferGeometry[] = [];
  for (const op of spec.ops) {
    switch (op.k) {
      case "box": addBox(parts, op.a, op.b, op.col); break;
      case "cyl": addCyl(parts, op.ax, op.c, op.r, op.len, op.col); break;
      case "tube": addCyl(parts, op.ax, op.c, op.r, op.len, op.col); break;
      case "axle": addAxle(parts, op.x0, op.x1, op.col, op.stop); break;
      case "pin": addPin(parts, op.x0, op.x1, op.collar, op.col, op.ball); break;
      case "gear": addGear(parts, op.n, op.z0, op.z1, op.col, op.taper); break;
      case "worm": addWorm(parts, op.x0, op.x1, op.col); break;
      case "rack": addRack(parts, op.x0, op.x1, op.col, op.holes); break;
      case "sphere": {
        const g = new THREE.SphereGeometry(op.r * M, 10, 8);
        g.translate(op.c[0] * M, op.c[1] * M, op.c[2] * M);
        const cc = col(op.col);
        const arr = new Float32Array(g.getAttribute("position").count * 3);
        for (let i = 0; i < arr.length; i += 3) { arr[i] = cc.r; arr[i + 1] = cc.g; arr[i + 2] = cc.b; }
        g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
        parts.push(g);
        break;
      }
      case "helix": {
        const steps = Math.max(8, Math.floor(op.turns * 8));
        for (let i = 0; i < steps; i++) {
          const t = i / steps;
          const along = op.c[op.ax] + (op.len * t - op.len / 2);
          const a = t * op.turns * Math.PI * 2;
          const off = [0, 0, 0];
          const ax1 = (op.ax + 1) % 3;
          const ax2 = (op.ax + 2) % 3;
          off[op.ax] = along;
          off[ax1] = op.c[ax1] + Math.cos(a) * op.r;
          off[ax2] = op.c[ax2] + Math.sin(a) * op.r;
          addCyl(parts, op.ax, off, op.tr, op.len / steps, op.col, 6);
        }
        break;
      }
      case "blade": {
        for (let i = 0; i < op.n; i++) {
          const a = (i / op.n) * Math.PI * 2 + op.pitch;
          const x = Math.cos(a) * (op.r0 + op.r1) / 2;
          const y = Math.sin(a) * (op.r0 + op.r1) / 2;
          addBox(parts, [x - op.w0 / 2, y - op.t / 2, op.z], [x + op.w1 / 2, y + op.t / 2, op.z + 0.05], op.col);
        }
        break;
      }
      case "shell": {
        const segs = 8;
        for (let i = 0; i < segs; i++) {
          const a = op.a0 + (op.a1 - op.a0) * (i / segs);
          const x = (op.x0 + op.x1) / 2;
          const y = op.y + Math.cos(a) * op.r;
          const z = op.z + Math.sin(a) * op.r;
          addBox(parts, [op.x0, y - 0.04, z - 0.04], [op.x1, y + 0.04, z + 0.04], op.col);
        }
        break;
      }
      case "lathe": {
        for (let i = 0; i < op.pts.length - 1; i++) {
          const [r0, z0] = op.pts[i];
          const [r1, z1] = op.pts[i + 1];
          const r = (r0 + r1) / 2;
          const z = (z0 + z1) / 2;
          const c = [...op.c] as number[];
          c[op.ax] += z;
          addCyl(parts, op.ax, c, r, Math.abs(z1 - z0), op.col, 10);
        }
        break;
      }
      case "studs": {
        for (const x of op.xs) for (const y of op.ys) {
          addCyl(parts, 2, [x, y, op.z], 0.12, 0.08, op.col, 8);
        }
        break;
      }
      case "arm": {
        const dx = op.d[0], dy = op.d[1];
        const steps = 6;
        for (let i = 0; i < steps; i++) {
          const t = (i + 0.5) / steps;
          addCyl(parts, 0, [dx * op.len * t, dy * op.len * t, 0], op.r * 0.5, op.len / steps, op.col, 6);
        }
        break;
      }
      case "dot": {
        addCyl(parts, op.ax, op.c, op.r, 0.04, op.col, 8);
        break;
      }
      case "plate": {
        // Approximate plate as a thin box spanning the segments
        let minX = 99, maxX = -99, minY = 99, maxY = -99;
        for (const [[x0, y0], [x1, y1]] of op.segs) {
          minX = Math.min(minX, x0, x1); maxX = Math.max(maxX, x0, x1);
          minY = Math.min(minY, y0, y1); maxY = Math.max(maxY, y0, y1);
        }
        addBox(parts, [minX - 0.4, minY - 0.4, op.z0], [maxX + 0.4, maxY + 0.4, op.z1], op.col);
        for (const [hx, hy] of op.holes) {
          addCyl(parts, 2, [hx, hy, (op.z0 + op.z1) / 2], 0.06, Math.abs(op.z1 - op.z0) * 1.2, 0x1a1a1a, 6);
        }
        break;
      }
      default: break;
    }
  }
  return merge(parts);
}

export function technicSpec(id: number): Spec | undefined {
  return SPECS.get(id);
}
