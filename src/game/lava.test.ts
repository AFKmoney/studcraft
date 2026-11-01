import test from "node:test";
import assert from "node:assert/strict";
import { ID } from "./blocks.ts";
import { LAVA_BURN, bucketFill, bucketPour, fuelReturn, fuelTime } from "./recipes.ts";
import { gpuLayers } from "./llm/runtime.ts";
import { PREFETCH_TIMEOUT_MS } from "./llm/prompt.ts";

test("lava bucket is long-burning kiln fuel and returns the empty bucket", () => {
  assert.equal(fuelTime(ID.LavaBucket), LAVA_BURN);
  assert.ok(LAVA_BURN >= 20 && LAVA_BURN > fuelTime(ID.Coal), "burns longer than coal");
  assert.equal(fuelReturn(ID.LavaBucket), ID.Bucket);
  assert.equal(fuelReturn(ID.Coal), 0);
  assert.equal(fuelReturn(ID.Log), 0);
});

test("bucket scoops lava/water source blocks and places them back", () => {
  assert.equal(bucketFill(ID.Lava), ID.LavaBucket);
  assert.equal(bucketFill(ID.Water), ID.WaterBucket);
  assert.equal(bucketFill(ID.Stone), 0);
  assert.equal(bucketPour(ID.LavaBucket), ID.Lava);
  assert.equal(bucketPour(ID.WaterBucket), ID.Water);
  assert.equal(bucketPour(bucketFill(ID.Lava)), ID.Lava, "round trip");
});

test("software GPU adapters get 0 GPU layers; CPU pre-generation timeout is 120–240 s", () => {
  assert.equal(gpuLayers({ renderer: "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))" }), 0);
  assert.equal(gpuLayers({ renderer: "llvmpipe (LLVM 15.0.7, 256 bits)" }), 0);
  assert.equal(gpuLayers({ software: true, renderer: "whatever" }), 0);
  assert.ok(gpuLayers({ renderer: "ANGLE (NVIDIA GeForce RTX 3060)" }) > 0);
  assert.ok(PREFETCH_TIMEOUT_MS >= 120000 && PREFETCH_TIMEOUT_MS <= 240000);
});
