// GPU detection (PR integration): classify the WebGL renderer string,
// flag software rasterisers, and pick quality presets from the tier.
// Pure — game.ts feeds it the string from WEBGL_debug_renderer_info.

export type GpuTier = "software" | "low" | "mid" | "high";
export type GpuInfo = { renderer: string; vendor: string; tier: GpuTier; software: boolean };

const SOFTWARE = /swiftshader|llvmpipe|softpipe|lavapipe|microsoft basic render|basic render driver|\bsoftware\b|mesa offscreen|google swiftshader/i;
const HIGH = /rtx|radeon rx ?[5-9]\d{3}|rx ?7\d{2}0|radeon pro w|quadro|tesla|a\d{3,4}\b|apple m[1-9] (pro|max|ultra)|arc a[57]\d{2}|gtx 1(07|08)0|titan/i;
const MID = /gtx|radeon rx|radeon r9|apple m[1-9]|apple gpu|iris xe|arc|adreno \(tm\) (6[5-9]\d|7\d\d)|mali-g7[1-9]|mali-g[6-9]\d\d|radeon(tm)? graphics|radeon vega/i;
const LOW = /intel.*(hd|uhd)|mali|adreno|powervr|videocore|tegra|apple a\d/i;

export function classifyRenderer(renderer: string, vendor = ""): GpuInfo {
  const s = (renderer || "") + " " + (vendor || "");
  const software = SOFTWARE.test(s);
  const tier: GpuTier = software ? "software" : HIGH.test(s) ? "high" : MID.test(s) ? "mid" : LOW.test(s) ? "low" : renderer ? "mid" : "low";
  return { renderer: renderer || "unknown", vendor: vendor || "", tier, software };
}

/**
 * Final verdict for a created context. The renderer string is the source of
 * truth in ALL paths: when the browser refuses a failIfMajorPerformanceCaveat
 * context and game.ts retries without the flag, the fallback context on a
 * multi-GPU Windows machine is very often the REAL discrete GPU (the browser
 * hands back its default adapter, not a software rasteriser) — so the caveat
 * flag must never override a string that names actual hardware. The flag may
 * only speak when the string is empty (nothing better to go on: the browser
 * refused every non-caveat context, so stamp software); with a string
 * present, classifyRenderer's own verdict stands, caveat or not.
 */
export function classifyContext(renderer: string, vendor: string, perfCaveat: boolean): GpuInfo {
  const info = classifyRenderer(renderer, vendor);
  if (renderer) return info;
  return perfCaveat ? { ...info, software: true, tier: "software" as const } : info;
}

export type Preset = { quality: "performance" | "balanced" | "high" | "auto"; radius: number; shadows: boolean };
export function presetFor(tier: GpuTier, narrow = false): Preset {
  if (tier === "software") return { quality: "performance", radius: 4, shadows: false };
  if (tier === "low") return { quality: "performance", radius: narrow ? 5 : 6, shadows: false };
  if (tier === "mid") return { quality: "balanced", radius: narrow ? 6 : 8, shadows: true };
  return { quality: "high", radius: narrow ? 8 : 10, shadows: true };
}

export const SOFTWARE_HINT =
  "Your browser is rendering on the CPU (software). Turn on hardware acceleration in the browser settings, and on Windows pick the high-performance GPU for your browser in Settings → System → Display → Graphics.";

/** Read the unmasked renderer from a live WebGL context. */
export function readGl(gl: WebGLRenderingContext | WebGL2RenderingContext): { renderer: string; vendor: string } {
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  const vendor = String(ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR));
  return { renderer, vendor };
}
