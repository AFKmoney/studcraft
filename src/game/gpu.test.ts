import test from "node:test";
import assert from "node:assert/strict";
import { classifyRenderer, presetFor } from "./gpu.ts";

test("software rasterisers are flagged", () => {
  for (const r of ["Google SwiftShader", "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)", "llvmpipe (LLVM 15.0.7, 256 bits)", "ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0)", "Mesa software renderer"]) {
    const g = classifyRenderer(r);
    assert.ok(g.software, r);
    assert.equal(g.tier, "software");
  }
});

test("hardware tiers", () => {
  assert.equal(classifyRenderer("ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)").tier, "high");
  assert.equal(classifyRenderer("ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11)").tier, "high");
  assert.equal(classifyRenderer("Apple M2").tier, "mid");
  assert.equal(classifyRenderer("ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11)").tier, "low");
  assert.equal(classifyRenderer("Mali-G52 MC2").tier, "low");
  for (const r of ["ANGLE (NVIDIA, NVIDIA GeForce RTX 3070)", "Intel(R) Iris(R) Xe Graphics"]) assert.ok(!classifyRenderer(r).software);
  assert.equal(classifyRenderer("").tier, "low");
});

test("presets lower radius and drop shadows on weak/software GPUs", () => {
  const sw = presetFor("software");
  assert.ok(!sw.shadows && sw.radius <= 4 && sw.quality === "performance");
  assert.ok(presetFor("high").radius > presetFor("mid").radius && presetFor("mid").radius > presetFor("low").radius);
});
