// NPC LLM runtime protocol (pure): the Bonsai 1.7B model reference, the
// messages between the game and the LLM Web Worker, and the status the
// HUD shows. The model is DOWNLOADED AT RUNTIME (browser cache/OPFS via
// wllama) — never committed: zero-assets rule.

/** prism-ml/Bonsai-1.7B-gguf, Q1_0 (248 302 272 bytes, Apache-2.0, Qwen3 base). */
export const MODEL_URL = "https://huggingface.co/prism-ml/Bonsai-1.7B-gguf/resolve/main/Bonsai-1.7B-Q1_0.gguf";
export const MODEL_BYTES = 248_302_272;
export const MODEL_NAME = "Bonsai 1.7B";
/** Prompt ≤ 600 tokens + 160 out: 2048 leaves headroom, small KV cache. */
export const N_CTX = 2048;

export type LlmPhase = "off" | "idle" | "loading" | "ready" | "busy" | "error";
export type LlmStatus = { phase: LlmPhase; progress: number; detail: string; backend: string; quests: number };

export type ToWorker =
  | { t: "load"; url: string; wasm: string; threads: number; gpu: boolean }
  | { t: "complete"; id: number; prompt: string; grammar: string; temperature: number; maxTokens: number }
  | { t: "abort"; id: number }
  | { t: "unload" };

export type FromWorker =
  | { t: "progress"; loaded: number; total: number }
  | { t: "ready"; backend: string }
  | { t: "error"; msg: string; id?: number }
  | { t: "done"; id: number; text: string; ms: number };

/** Threads for wasm: multi-thread needs cross-origin isolation; keep
 *  half the cores for the game (meshing pool, render). */
export function llmThreads(hw: number, isolated: boolean): number {
  if (!isolated) return 1;
  return Math.max(1, Math.min(8, Math.floor((hw || 2) / 2)));
}

export function statusLine(s: LlmStatus): string {
  switch (s.phase) {
    case "off":
      return "NPC AI off — procedural quests";
    case "idle":
      return "NPC AI waiting to load";
    case "loading":
      return "Loading " + MODEL_NAME + " " + Math.round(s.progress * 100) + "%";
    case "ready":
      return MODEL_NAME + " ready (" + s.backend + ")" + (s.quests ? " · " + s.quests + " quests written" : "");
    case "busy":
      return MODEL_NAME + " is writing a quest…";
    case "error":
      return "NPC AI unavailable — procedural quests" + (s.detail ? " (" + s.detail.slice(0, 60) + ")" : "");
  }
}
