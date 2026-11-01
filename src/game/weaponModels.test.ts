// t92u: every dedicated weapon builds a sane, SNR-routed, detailed model
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { DEDICATED_WEAPONS, buildWeapon, weaponBounds, type Finish } from "./weaponModels.ts";
import { ACCESSORIES } from "./accessories.ts";

for (const key of DEDICATED_WEAPONS) {
  test(`weapon model ${key}`, () => {
    const made = new Set<THREE.Material>();
    const fin: Finish[] = [];
    const b = buildWeapon(key, (hex, f) => { const m = new THREE.MeshStandardMaterial({ color: hex }); made.add(m); if (f) fin.push(f); return m; })!;
    assert.ok(b, "builder");
    let meshes = 0, tris = 0;
    b.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      meshes++;
      assert.ok(made.has(m.material as THREE.Material), "every material comes from M (SNR path)");
      const pos = m.geometry.getAttribute("position");
      for (let i = 0; i < pos.count * 3; i++) assert.ok(Number.isFinite((pos.array as Float32Array)[i]));
      tris += (m.geometry.index ? m.geometry.index.count : pos.count) / 3;
    });
    assert.ok(meshes >= 8, "detailed build (" + meshes + " meshes)");
    assert.ok(tris > 200 && tris < 20000, "triangle budget " + tris);
    const bb = weaponBounds(b), sz = bb.getSize(new THREE.Vector3());
    assert.ok(Math.max(sz.x, sz.y) < 0.62 && Math.max(sz.x, sz.y) > 0.1, "size " + sz.x.toFixed(3) + "×" + sz.y.toFixed(3));
    const acc = ACCESSORIES.find((a) => a.key === key)!;
    if (acc.kind === "gun") {
      assert.deepEqual(b.muzzle, acc.muzzle, "flash sits on the muzzle");
      assert.ok(bb.max.x >= b.muzzle![0] - 0.01 && bb.max.x - b.muzzle![0] < 0.1, "muzzle at the front (bayonet may lead)");
      assert.ok(bb.containsPoint(new THREE.Vector3(-0.07, -0.09, 0)) || key !== "Carbine", "hand grip inside the build");
    } else {
      assert.ok(bb.max.y > 0.1 && bb.min.y < -0.15, "blade up, hilt down");
    }
    assert.ok(fin.includes("metal") || fin.includes("blued") || fin.includes("glow"));
  });
}
