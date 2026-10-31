// Main-thread side of the NPC LLM: spawns the wllama Web Worker, tracks
// download/load progress for the HUD, and exposes an `Llm` function the
// story Director calls. Any failure (no Worker, no wasm, offline, OOM,
// file:// APK) lands in phase "error" and the Director falls back to the
// procedural quests — the game never waits on the model.
import wasmUrl from "@wllama/wllama/esm/wasm/wllama.wasm?url";
import type { Llm } from "./story.ts";
import { MODEL_URL, llmThreads, type FromWorker, type LlmStatus, type ToWorker } from "./protocol.ts";

export class NpcLlm {
  status: LlmStatus = { phase: "idle", progress: 0, detail: "", backend: "", quests: 0 };
  onChange: (s: LlmStatus) => void = () => {};
  private w: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, { res: (s: string) => void; rej: (e: Error) => void }>();

  private set(p: Partial<LlmStatus>) {
    this.status = { ...this.status, ...p };
    this.onChange(this.status);
  }
  get ready(): boolean {
    return this.status.phase === "ready" || this.status.phase === "busy";
  }

  /** Start download + load (idempotent). */
  start(url = MODEL_URL) {
    if (this.w || this.status.phase === "loading") return;
    if (typeof Worker === "undefined" || typeof WebAssembly === "undefined" || location.protocol === "file:") return this.set({ phase: "error", detail: "no Worker/wasm here" });
    try {
      this.w = new Worker(new URL("./llm.worker.ts", import.meta.url), { type: "module", name: "npc-llm" });
    } catch (e) {
      return this.set({ phase: "error", detail: String((e as Error).message ?? e) });
    }
    this.w.onmessage = (ev: MessageEvent<FromWorker>) => this.onMsg(ev.data);
    this.w.onerror = (e) => this.fail(e.message || "worker crashed");
    this.set({ phase: "loading", progress: 0, detail: "" });
    const wasm = new URL(wasmUrl, location.href).href;
    const gpu = typeof navigator !== "undefined" && "gpu" in navigator;
    const msg: ToWorker = { t: "load", url, wasm, threads: llmThreads(navigator.hardwareConcurrency, globalThis.crossOriginIsolated === true), gpu };
    this.w.postMessage(msg);
  }

  private onMsg(m: FromWorker) {
    if (m.t === "progress") this.set({ progress: m.total ? Math.min(1, m.loaded / m.total) : 0 });
    else if (m.t === "ready") {
      this.set({ phase: "ready", progress: 1, backend: m.backend });
      console.info("[llm] ready", m.backend);
    } else if (m.t === "error" && m.id === undefined) this.fail(m.msg);
    else if (m.t === "error" || m.t === "done") {
      const p = this.pending.get(m.id!);
      this.pending.delete(m.id!);
      if (!this.pending.size && this.status.phase === "busy") this.set({ phase: "ready" });
      if (m.t === "done") p?.res(m.text);
      else p?.rej(new Error(m.msg));
    }
  }
  private fail(msg: string) {
    console.warn("[llm] unavailable:", msg);
    for (const p of this.pending.values()) p.rej(new Error(msg));
    this.pending.clear();
    this.w?.terminate();
    this.w = null;
    this.set({ phase: "error", detail: msg });
  }

  /** The Director's LLM: rejects if not ready (→ procedural). */
  llm: Llm = (prompt, grammar, opts) => {
    if (!this.w || !this.ready) return Promise.reject(new Error("llm not ready"));
    const id = ++this.seq;
    this.set({ phase: "busy" });
    return new Promise<string>((res, rej) => {
      this.pending.set(id, { res, rej });
      this.w!.postMessage({ t: "complete", id, prompt, grammar, temperature: opts.temperature, maxTokens: opts.maxTokens } satisfies ToWorker);
    });
  };
  abortAll() {
    for (const id of this.pending.keys()) this.w?.postMessage({ t: "abort", id } satisfies ToWorker);
  }
  /** Settings toggle off: free the model memory. */
  stop() {
    this.abortAll();
    this.w?.postMessage({ t: "unload" } satisfies ToWorker);
    const w = this.w;
    setTimeout(() => w?.terminate(), 500);
    this.w = null;
    for (const p of this.pending.values()) p.rej(new Error("llm off"));
    this.pending.clear();
    this.set({ phase: "off", progress: 0, detail: "" });
  }
  wrote() {
    this.set({ quests: this.status.quests + 1 });
  }
}
