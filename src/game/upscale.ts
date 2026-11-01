import * as THREE from "three";

/**
 * Studcraft spatial upscaler — an FSR 1-style pipeline in plain WebGL2.
 *
 *   scene ──► low-res HDR target (MSAA) ──► resolve (exposure, ACES, sRGB)
 *         ──► EASU edge-adaptive upscale to output size ──► RCAS sharpen ──► screen
 *
 * EASU reconstructs edges along their direction from a 12-tap neighbourhood, so
 * brick silhouettes and studs stay crisp instead of going soft like a bilinear
 * stretch; RCAS then restores micro-contrast with a ring-limited lobe (no halos).
 * The "fast" path skips EASU and runs RCAS straight on a bilinear fetch — one
 * full-res pass instead of two, for weak phones.
 *
 * Scale 1 renders straight to the canvas (zero overhead), exactly as before.
 */

export type UpscalePath = "easu" | "fast";

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const RESOLVE = /* glsl */ `
  uniform sampler2D tSrc;
  uniform vec2 uInSize;
  uniform float uExposure;
  uniform bool uAces;
  varying vec2 vUv;
  float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
  vec3 rrtOdt(vec3 v) {
    vec3 a = v * (v + 0.0245786) - 0.000090537;
    vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
    return a / b;
  }
  vec3 aces(vec3 color) {
    const mat3 inM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
    const mat3 outM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
    color *= uExposure / 0.6;
    color = inM * color;
    color = rrtOdt(color);
    color = outM * color;
    return clamp(color, 0.0, 1.0);
  }
  vec3 toSrgb(vec3 c) {
    return mix(pow(c, vec3(0.41666)) * 1.055 - vec3(0.055), c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308))));
  }
  void main() {
    vec3 c = texture2D(tSrc, vUv).rgb;
    // Karis bilateral HDR firefly filter: suppresses isolated sub-pixel specular spikes before upscaling
    vec2 tx = 1.0 / max(uInSize, vec2(1.0));
    vec3 n0 = texture2D(tSrc, vUv + vec2(tx.x, 0.0)).rgb;
    vec3 n1 = texture2D(tSrc, vUv - vec2(tx.x, 0.0)).rgb;
    vec3 n2 = texture2D(tSrc, vUv + vec2(0.0, tx.y)).rgb;
    vec3 n3 = texture2D(tSrc, vUv - vec2(0.0, tx.y)).rgb;
    vec3 nbMax = max(max(n0, n1), max(n2, n3));
    vec3 nbAvg = 0.25 * (n0 + n1 + n2 + n3);
    float cLum = luma(c);
    float maxLum = luma(nbMax);
    if (cLum > maxLum * 1.22 + 0.04) {
      c = mix(nbAvg, nbMax, 0.65);
    }
    if (uAces) {
      // Subtle Macro Tilt-Shift Depth-of-Field (Bokeh) at extreme horizon/foreground bands
      // Simulates a 50mm f/2.8 macro lens photographing physical STUDS bricks while keeping center crosshair 100% sharp
      float tiltBand = smoothstep(0.28, 0.49, abs(vUv.y - 0.50));
      if (tiltBand > 0.005) {
        vec2 r = tx * (1.35 * tiltBand);
        vec3 d0 = texture2D(tSrc, vUv + vec2( r.x,  r.y)).rgb * uExposure;
        vec3 d1 = texture2D(tSrc, vUv + vec2(-r.x,  r.y)).rgb * uExposure;
        vec3 d2 = texture2D(tSrc, vUv + vec2( r.x, -r.y)).rgb * uExposure;
        vec3 d3 = texture2D(tSrc, vUv + vec2(-r.x, -r.y)).rgb * uExposure;
        vec3 bokeh = 0.30 * c + 0.35 * nbAvg + 0.35 * 0.25 * (d0 + d1 + d2 + d3);
        c = mix(c, bokeh, tiltBand * 0.58);
      }
      c = aces(c);
    } else {
      c = clamp(c, 0.0, 1.0);
    }
    gl_FragColor = vec4(toSrgb(c), 1.0);
  }
`;

// EASU — Edge Adaptive Spatial Upsampling (after AMD FidelityFX FSR 1, MIT).
const EASU = /* glsl */ `
  uniform sampler2D tSrc;
  uniform vec2 uInSize;
  uniform vec2 uOutSize;
  varying vec2 vUv;

  vec3 tap(vec2 p) { return texture2D(tSrc, (p + 0.5) / uInSize).rgb; }
  float luma(vec3 c) { return c.b * 0.5 + (c.r * 0.5 + c.g); }

  void easuSet(inout vec2 dir, inout float len, vec2 pp, float w, float lA, float lB, float lC, float lD, float lE) {
    float dc = lD - lC;
    float cb = lC - lB;
    float lenX = max(abs(dc), abs(cb));
    lenX = 1.0 / max(lenX, 1.0 / 65536.0);
    float dirX = lD - lB;
    dir.x += dirX * w;
    lenX = clamp(abs(dirX) * lenX, 0.0, 1.0);
    lenX *= lenX;
    len += lenX * w;
    float ec = lE - lC;
    float ca = lC - lA;
    float lenY = max(abs(ec), abs(ca));
    lenY = 1.0 / max(lenY, 1.0 / 65536.0);
    float dirY = lE - lA;
    dir.y += dirY * w;
    lenY = clamp(abs(dirY) * lenY, 0.0, 1.0);
    lenY *= lenY;
    len += lenY * w;
  }

  void easuTap(inout vec3 aC, inout float aW, vec2 off, vec2 dir, vec2 len2, float lob, float clp, vec3 c) {
    vec2 v = vec2(off.x * dir.x + off.y * dir.y, off.x * (-dir.y) + off.y * dir.x);
    v *= len2;
    float d2 = min(v.x * v.x + v.y * v.y, clp);
    float wB = 0.4 * d2 - 1.0;
    float wA = lob * d2 - 1.0;
    wB *= wB;
    wA *= wA;
    wB = 1.5625 * wB - 0.5625;
    float w = wB * wA;
    aC += c * w;
    aW += w;
  }

  void main() {
    vec2 pp = (floor(vUv * uOutSize) + 0.5) * (uInSize / uOutSize) - 0.5;
    vec2 fp = floor(pp);
    pp -= fp;

    vec3 b = tap(fp + vec2(0.0, -1.0));
    vec3 c = tap(fp + vec2(1.0, -1.0));
    vec3 e = tap(fp + vec2(-1.0, 0.0));
    vec3 f = tap(fp);
    vec3 g = tap(fp + vec2(1.0, 0.0));
    vec3 h = tap(fp + vec2(2.0, 0.0));
    vec3 i = tap(fp + vec2(-1.0, 1.0));
    vec3 j = tap(fp + vec2(0.0, 1.0));
    vec3 k = tap(fp + vec2(1.0, 1.0));
    vec3 l = tap(fp + vec2(2.0, 1.0));
    vec3 n = tap(fp + vec2(0.0, 2.0));
    vec3 o = tap(fp + vec2(1.0, 2.0));

    float bL = luma(b), cL = luma(c), eL = luma(e), fL = luma(f), gL = luma(g), hL = luma(h);
    float iL = luma(i), jL = luma(j), kL = luma(k), lL = luma(l), nL = luma(n), oL = luma(o);

    vec2 dir = vec2(0.0);
    float len = 0.0;
    easuSet(dir, len, pp, (1.0 - pp.x) * (1.0 - pp.y), bL, eL, fL, gL, jL);
    easuSet(dir, len, pp, pp.x * (1.0 - pp.y), cL, fL, gL, hL, kL);
    easuSet(dir, len, pp, (1.0 - pp.x) * pp.y, fL, iL, jL, kL, nL);
    easuSet(dir, len, pp, pp.x * pp.y, gL, jL, kL, lL, oL);

    vec2 dir2 = dir * dir;
    float dirR = dir2.x + dir2.y;
    bool zro = dirR < 1.0 / 32768.0;
    dirR = zro ? 1.0 : inversesqrt(dirR);
    dir.x = zro ? 1.0 : dir.x;
    dir *= dirR;
    len = len * 0.5;
    len *= len;
    float stretch = (dir.x * dir.x + dir.y * dir.y) / max(abs(dir.x), abs(dir.y));
    vec2 len2 = vec2(1.0 + (stretch - 1.0) * len, 1.0 - 0.5 * len);
    float lob = 0.5 + ((1.0 / 4.0 - 0.04) - 0.5) * len;
    float clp = 1.0 / lob;

    vec3 aC = vec3(0.0);
    float aW = 0.0;
    easuTap(aC, aW, vec2(0.0, -1.0) - pp, dir, len2, lob, clp, b);
    easuTap(aC, aW, vec2(1.0, -1.0) - pp, dir, len2, lob, clp, c);
    easuTap(aC, aW, vec2(-1.0, 1.0) - pp, dir, len2, lob, clp, i);
    easuTap(aC, aW, vec2(0.0, 1.0) - pp, dir, len2, lob, clp, j);
    easuTap(aC, aW, vec2(0.0, 0.0) - pp, dir, len2, lob, clp, f);
    easuTap(aC, aW, vec2(-1.0, 0.0) - pp, dir, len2, lob, clp, e);
    easuTap(aC, aW, vec2(1.0, 1.0) - pp, dir, len2, lob, clp, k);
    easuTap(aC, aW, vec2(2.0, 1.0) - pp, dir, len2, lob, clp, l);
    easuTap(aC, aW, vec2(2.0, 0.0) - pp, dir, len2, lob, clp, h);
    easuTap(aC, aW, vec2(1.0, 0.0) - pp, dir, len2, lob, clp, g);
    easuTap(aC, aW, vec2(1.0, 2.0) - pp, dir, len2, lob, clp, o);
    easuTap(aC, aW, vec2(0.0, 2.0) - pp, dir, len2, lob, clp, n);

    vec3 mn4 = min(min(f, g), min(j, k));
    vec3 mx4 = max(max(f, g), max(j, k));
    vec3 pix = min(mx4, max(mn4, aC / max(aW, 1e-5)));
    gl_FragColor = vec4(pix, 1.0);
  }
`;

// RCAS — Robust Contrast Adaptive Sharpening (after AMD FidelityFX FSR 1, MIT).
const RCAS = /* glsl */ `
  uniform sampler2D tSrc;
  uniform vec2 uTexel;
  uniform float uSharp;
  varying vec2 vUv;
  float luma(vec3 c) { return c.b * 0.5 + (c.r * 0.5 + c.g); }
  void main() {
    vec3 b = texture2D(tSrc, vUv + vec2(0.0, -uTexel.y)).rgb;
    vec3 d = texture2D(tSrc, vUv + vec2(-uTexel.x, 0.0)).rgb;
    vec3 e = texture2D(tSrc, vUv).rgb;
    vec3 f = texture2D(tSrc, vUv + vec2(uTexel.x, 0.0)).rgb;
    vec3 h = texture2D(tSrc, vUv + vec2(0.0, uTexel.y)).rgb;
    vec3 mn4 = min(min(b, d), min(f, h));
    vec3 mx4 = max(max(b, d), max(f, h));
    vec3 hitMin = mn4 / (4.0 * mx4 + 1e-5);
    vec3 hitMax = (1.0 - mx4) / (4.0 * mn4 - 4.0 - 1e-5);
    vec3 lobeRGB = max(-hitMin, hitMax);
    float lobe = max(-0.1875, min(max(lobeRGB.r, max(lobeRGB.g, lobeRGB.b)), 0.0)) * uSharp;
    // Noise guard: soften the lobe on isolated single-pixel speckle (FSR RCAS_DENOISE).
    float bL = luma(b), dL = luma(d), eL = luma(e), fL = luma(f), hL = luma(h);
    float nz = 0.25 * (bL + dL + fL + hL) - eL;
    float rng = max(max(max(bL, dL), max(eL, fL)), hL) - min(min(min(bL, dL), min(eL, fL)), hL);
    nz = clamp(abs(nz) / max(rng, 1e-4), 0.0, 1.0);
    lobe *= 1.0 - 0.85 * nz;
    vec3 col = (lobe * (b + d + h + f) + e) / (4.0 * lobe + 1.0);
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

export class Upscaler {
  private renderer: THREE.WebGLRenderer;
  private quad: THREE.Mesh;
  private fsScene = new THREE.Scene();
  private fsCam = new THREE.Camera();
  private sceneRT: THREE.WebGLRenderTarget | null = null;
  private ldrRT: THREE.WebGLRenderTarget | null = null;
  private upRT: THREE.WebGLRenderTarget | null = null;
  private resolveMat: THREE.ShaderMaterial;
  private easuMat: THREE.ShaderMaterial;
  private rcasMat: THREE.ShaderMaterial;
  private hdr: boolean;
  private samples = 0;
  inW = 0;
  inH = 0;
  outW = 0;
  outH = 0;
  /** Exposure and tone curve to bake in the resolve pass (mirrors renderer settings). */
  aces = false;
  exposure = 1;
  /** 0 (off) … 1 (max). */
  sharpness = 0.5;
  path: UpscalePath = "easu";
  failed = false;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    const ext = renderer.extensions;
    this.hdr = ext.has("EXT_color_buffer_float") || ext.has("EXT_color_buffer_half_float");
    const mk = (frag: string, uniforms: Record<string, THREE.IUniform>) =>
      // snr-exempt: post-process upscale pass itself
      new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, toneMapped: false });
    this.resolveMat = mk(RESOLVE, { tSrc: { value: null }, uInSize: { value: new THREE.Vector2(1, 1) }, uExposure: { value: 1 }, uAces: { value: false } });
    this.easuMat = mk(EASU, { tSrc: { value: null }, uInSize: { value: new THREE.Vector2() }, uOutSize: { value: new THREE.Vector2() } });
    this.rcasMat = mk(RCAS, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uSharp: { value: 0.5 } });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.resolveMat);
    this.quad.frustumCulled = false;
    this.fsScene.add(this.quad);
  }

  /** out = drawing-buffer size in device pixels; scale = internal/out (0.4 … 1). */
  setSize(outW: number, outH: number, scale: number, samples: number) {
    const s = Math.max(0.35, Math.min(1, scale));
    const inW = Math.max(1, Math.round(outW * s));
    const inH = Math.max(1, Math.round(outH * s));
    if (outW === this.outW && outH === this.outH && inW === this.inW && inH === this.inH && samples === this.samples) return;
    this.outW = outW;
    this.outH = outH;
    this.inW = inW;
    this.inH = inH;
    if (this.native) {
      this.disposeTargets();
      return;
    }
    if (samples !== this.samples) this.disposeTargets();
    this.samples = samples;
    const type = this.hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
    if (!this.sceneRT) {
      this.sceneRT = new THREE.WebGLRenderTarget(inW, inH, { type, samples, depthBuffer: true, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
      this.ldrRT = new THREE.WebGLRenderTarget(inW, inH, { type: THREE.UnsignedByteType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
      this.upRT = new THREE.WebGLRenderTarget(outW, outH, { type: THREE.UnsignedByteType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    } else {
      this.sceneRT.setSize(inW, inH);
      this.ldrRT!.setSize(inW, inH);
      this.upRT!.setSize(outW, outH);
    }
  }

  get native() {
    return this.inW >= this.outW - 1 && this.inH >= this.outH - 1;
  }

  render(scene: THREE.Scene, camera: THREE.Camera) {
    const r = this.renderer;
    if (this.native || this.failed || !this.sceneRT || !this.ldrRT || !this.upRT) {
      r.setRenderTarget(null);
      r.render(scene, camera);
      return;
    }
    const prevAutoClear = r.autoClear;
    try {
      r.setRenderTarget(this.sceneRT);
      r.render(scene, camera);
      r.autoClear = true;

      this.resolveMat.uniforms.tSrc.value = this.sceneRT.texture;
      this.resolveMat.uniforms.uInSize.value.set(this.inW, this.inH);
      this.resolveMat.uniforms.uExposure.value = this.exposure;
      this.resolveMat.uniforms.uAces.value = this.aces;
      this.blit(this.resolveMat, this.ldrRT);

      const sharp = Math.pow(2, -(1 - Math.max(0, Math.min(1, this.sharpness))) * 2);
      if (this.path === "easu") {
        this.easuMat.uniforms.tSrc.value = this.ldrRT.texture;
        this.easuMat.uniforms.uInSize.value.set(this.inW, this.inH);
        this.easuMat.uniforms.uOutSize.value.set(this.outW, this.outH);
        if (this.sharpness <= 0.001) {
          this.blit(this.easuMat, null);
        } else {
          this.blit(this.easuMat, this.upRT);
          this.rcasMat.uniforms.tSrc.value = this.upRT.texture;
          this.rcasMat.uniforms.uTexel.value.set(1 / this.outW, 1 / this.outH);
          this.rcasMat.uniforms.uSharp.value = sharp;
          this.blit(this.rcasMat, null);
        }
      } else {
        // Fast path: bilinear fetch of the low-res image, sharpened at output resolution.
        this.rcasMat.uniforms.tSrc.value = this.ldrRT.texture;
        this.rcasMat.uniforms.uTexel.value.set(1 / this.outW, 1 / this.outH);
        this.rcasMat.uniforms.uSharp.value = Math.max(sharp, 0.35);
        this.blit(this.rcasMat, null);
      }
    } catch {
      // A driver that can't do this pipeline falls back to native rendering for good.
      this.failed = true;
      r.setRenderTarget(null);
      r.render(scene, camera);
    } finally {
      r.autoClear = prevAutoClear;
    }
  }

  private blit(mat: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.fsScene, this.fsCam);
  }

  private disposeTargets() {
    this.sceneRT?.dispose();
    this.ldrRT?.dispose();
    this.upRT?.dispose();
    this.sceneRT = this.ldrRT = this.upRT = null;
  }

  dispose() {
    this.disposeTargets();
    this.resolveMat.dispose();
    this.easuMat.dispose();
    this.rcasMat.dispose();
    this.quad.geometry.dispose();
  }
}

/** Internal render scale for each preset. */
export function upscaleScale(mode: string, touch: boolean, dpr: number): number {
  if (mode === "native") return 1;
  if (mode === "quality") return 0.77;
  if (mode === "balanced") return 0.67;
  if (mode === "performance") return 0.5;
  // auto: phones render at two thirds and reconstruct; hi-dpi desktops at ~77 %.
  if (touch) return 0.67;
  return dpr >= 1.5 ? 0.77 : 1;
}
