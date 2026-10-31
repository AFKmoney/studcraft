// In-browser NPC model (wllama 3.8.1 from jsDelivr, never bundled; the
// GGUF streams from Hugging Face and is cached by wllama in OPFS).
// wllama runs llama.cpp in its own Web Worker (multi-thread when the page
// is cross-origin isolated, single-thread otherwise). Everything here is
// best-effort: any failure leaves state "failed"/"unsupported" and the
// story director keeps using the procedural generator.
import type { Llm } from "./story.ts";

export const WLLAMA_VER = "3.8.1";
export const WLLAMA_JS = `https://cdn.jsdelivr.net/npm/@wllama/wllama@${WLLAMA_VER}/esm/index.min.js`;
export const WLLAMA_WASM = `https://cdn.jsdelivr.net/npm/@wllama/wllama@${WLLAMA_VER}/esm/wasm/wllama.wasm`;
/** Tried in order. Bonsai Q1_0 (GGML type 41) is in upstream llama.cpp
 *  and in wllama 3.8.1's wasm (checked: block_q1_0 kernels present).
 *  Fallback: Qwen2.5-0.5B-Instruct Q4_K_M, a standard quant. */
export const MODELS = [
  { name: "Bonsai 1.7B Q1_0", url: "https://huggingface.co/prism-ml/Bonsai-1.7B-gguf/resolve/main/Bonsai-1.7B-Q1_0.gguf", mb: 248 },
  { name: "Qwen2.5 0.5B Q4_K_M", url: "https://huggingface.co/bartowski/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf", mb: 398 },
] as const;
export const MIN_DEVICE_GB = 4;

export type LlmState = "off" | "idle" | "loading" | "ready" | "failed" | "unsupported";
export type Env = { deviceMemory?: number; hasWasm: boolean; hasWorker: boolean };

/** Pure gate (tested): can this device try the model at all? */
export function canRun(env: Env): { ok: boolean; why: string } {
  if (!env.hasWasm || !env.hasWorker) return { ok: false, why: "no WebAssembly/Worker" };
  if (env.deviceMemory !== undefined && env.deviceMemory < MIN_DEVICE_GB) return { ok: false, why: "low memory (" + env.deviceMemory + " GB)" };
  return { ok: true, why: "" };
}

type W = {
  loadModelFromUrl(u: string, o: object): Promise<void>;
  createCompletion(o: object): Promise<{ choices?: { text: string }[] } | string>;
  exit?(): Promise<void>;
};

export class NpcModel {
  state: LlmState = "idle";
  progress = 0;
  model = "";
  why = "";
  private w: W | null = null;
  private chain: Promise<unknown> = Promise.resolve();
  onChange: () => void = () => {};
  private set(s: LlmState, why = "") {
    this.state = s;
    this.why = why;
    this.onChange();
  }
  /** Background load; resolves when ready or given up. */
  async start(env: Env, importer: (u: string) => Promise<unknown> = (u) => import(/* @vite-ignore */ u)): Promise<void> {
    if (this.state === "loading" || this.state === "ready") return;
    const gate = canRun(env);
    if (!gate.ok) return this.set("unsupported", gate.why);
    this.set("loading");
    try {
      const mod = (await importer(WLLAMA_JS)) as { Wllama: new (p: object, c?: object) => W };
      const threads = Math.max(1, Math.min(4, (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 2));
      for (const m of MODELS) {
        try {
          const w = new mod.Wllama({ default: WLLAMA_WASM, "single-thread/wllama.wasm": WLLAMA_WASM, "multi-thread/wllama.wasm": WLLAMA_WASM }, { suppressNativeLog: true });
          this.progress = 0;
          await w.loadModelFromUrl(m.url, {
            n_ctx: 1024,
            n_threads: threads,
            progressCallback: ({ loaded, total }: { loaded: number; total: number }) => {
              this.progress = total ? loaded / total : 0;
              this.onChange();
            },
          });
          this.w = w;
          this.model = m.name;
          return this.set("ready");
        } catch (e) {
          this.why = String((e as Error)?.message ?? e).slice(0, 120);
        }
      }
      this.set("failed", this.why);
    } catch (e) {
      this.set("failed", String((e as Error)?.message ?? e).slice(0, 120));
    }
  }
  /** The Llm function for the director (calls are serialised). */
  llm(): Llm | null {
    if (this.state !== "ready" || !this.w) return null;
    const w = this.w;
    return (prompt, grammar, o) => {
      const run = this.chain.then(async () => {
        const r = await w.createCompletion({ prompt, grammar, temperature: o.temperature, max_tokens: o.maxTokens, stream: false });
        return typeof r === "string" ? r : r.choices?.[0]?.text ?? "";
      });
      this.chain = run.catch(() => {});
      return run;
    };
  }
  stop() {
    this.w?.exit?.().catch(() => {});
    this.w = null;
    this.set("off");
  }
  label(): string {
    if (this.state === "loading") return "NPC AI " + Math.round(this.progress * 100) + "%";
    if (this.state === "ready") return "NPC AI · " + this.model;
    if (this.state === "failed" || this.state === "unsupported") return "NPC AI off (" + this.why + ") — procedural quests";
    return "";
  }
}
