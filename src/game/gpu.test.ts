import test from "node:test";
import assert from "node:assert/strict";
import { classifyRenderer, classifyContext, presetFor } from "./gpu.ts";

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

test("real-world ANGLE strings classify by the hardware they name", () => {
  // Discrete AMD (D3D11 ANGLE, incl. the hex device id Chrome appends)
  assert.equal(classifyRenderer("ANGLE (AMD, AMD Radeon RX 6600 (0x000073FF) Direct3D11 vs_5_0 ps_5_0, D3D11)").tier, "high");
  assert.equal(classifyRenderer("ANGLE (AMD, AMD Radeon RX 9070 XT Direct3D11 vs_5_0 ps_5_0, D3D11)").tier, "high");
  // Integrated AMD APU graphics
  const apu = classifyRenderer("ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001681) Direct3D11 vs_5_0 ps_5_0, D3D11)");
  assert.equal(apu.tier, "mid");
  assert.ok(!apu.software);
  // Integrated Intel
  assert.equal(classifyRenderer("ANGLE (Intel, Intel(R) UHD Graphics 770 Direct3D11 vs_5_0 ps_5_0, D3D11)").tier, "low");
  // Vulkan-flavoured SwiftShader is software
  const sw = classifyRenderer("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)");
  assert.equal(sw.tier, "software");
  assert.ok(sw.software);
});

test("caveat-fallback path trusts the renderer string (regression: real GPU stamped software)", () => {
  // The browser refused a failIfMajorPerformanceCaveat context, game.ts
  // retried, and the fallback context is the real discrete GPU — it must
  // classify as hardware, never be forced to software by the caveat flag.
  const rx = classifyContext("ANGLE (AMD, AMD Radeon RX 6600 (0x000073FF) Direct3D11 vs_5_0 ps_5_0, D3D11)", "Google Inc. (AMD)", true);
  assert.equal(rx.tier, "high");
  assert.equal(rx.software, false);
  const apu = classifyContext("ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001681) Direct3D11 vs_5_0 ps_5_0, D3D11)", "", true);
  assert.equal(apu.tier, "mid");
  assert.equal(apu.software, false);
  // A genuinely software string is still caught by the string itself.
  const sw = classifyContext("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)", "", true);
  assert.equal(sw.tier, "software");
  assert.equal(sw.software, true);
  // Only an EMPTY string lets the caveat flag speak (browser refused every
  // non-caveat context and gave no name): stamp software.
  const unknown = classifyContext("", "", true);
  assert.equal(unknown.tier, "software");
  assert.equal(unknown.software, true);
  // Empty string, no caveat: classifyRenderer's own verdict (low) stands.
  const plain = classifyContext("", "", false);
  assert.equal(plain.tier, "low");
  assert.equal(plain.software, false);
});

test("presets lower radius and drop shadows on weak/software GPUs", () => {
  const sw = presetFor("software");
  assert.ok(!sw.shadows && sw.radius <= 4 && sw.quality === "performance");
  assert.ok(presetFor("high").radius > presetFor("mid").radius && presetFor("mid").radius > presetFor("low").radius);
});
