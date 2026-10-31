// Web Worker hosting wllama (llama.cpp → wasm) so the download, the model
// load and the prompt processing never touch the game's main thread.
// wllama itself runs the compute in a nested worker; this one owns the
// lifecycle and serialises requests.
import type { FromWorker, ToWorker } from "./protocol.ts";
import { N_CTX } from "./protocol.ts";

type W = import("@wllama/wllama").Wllama;
const post = (m: FromWorker) => (self as unknown as { postMessage(m: FromWorker): void }).postMessage(m);
let wl: W | null = null;
const aborts = new Map<number, AbortController>();
let chain: Promise<unknown> = Promise.resolve();

async function load(m: Extract<ToWorker, { t: "load" }>) {
  try {
    const { Wllama } = await import("@wllama/wllama");
    wl = new Wllama({ default: m.wasm }, { suppressNativeLog: true, allowOffline: true });
    await wl.loadModelFromUrl(m.url, {
      n_ctx: N_CTX,
      n_threads: m.threads,
      n_gpu_layers: m.gpu ? 99999 : 0,
      flash_attn: false, // Bonsai Q1_0: quantized K/V + FA not supported on all backends
      useCache: true,
      warmup: false,
      progressCallback: ({ loaded, total }: { loaded: number; total: number }) => post({ t: "progress", loaded, total }),
    });
    post({ t: "ready", backend: m.gpu && wl.isSupportWebGPU() ? "WebGPU" : "CPU ×" + m.threads });
  } catch (e) {
    wl = null;
    post({ t: "error", msg: String((e as Error)?.message ?? e) });
  }
}

async function complete(m: Extract<ToWorker, { t: "complete" }>) {
  if (!wl) return post({ t: "error", id: m.id, msg: "not loaded" });
  const ac = aborts.get(m.id) ?? new AbortController();
  if (ac.signal.aborted) return post({ t: "error", id: m.id, msg: "aborted" });
  const t0 = performance.now();
  try {
    const r = await wl.createCompletion({ prompt: m.prompt, grammar: m.grammar, temperature: m.temperature, max_tokens: m.maxTokens, abortSignal: ac.signal, stream: false });
    post({ t: "done", id: m.id, text: r.choices[0]?.text ?? "", ms: Math.round(performance.now() - t0) });
  } catch (e) {
    post({ t: "error", id: m.id, msg: String((e as Error)?.message ?? e) });
  } finally {
    aborts.delete(m.id);
  }
}

self.onmessage = (ev: MessageEvent<ToWorker>) => {
  const m = ev.data;
  if (m.t === "load") void load(m);
  else if (m.t === "complete") {
    aborts.set(m.id, new AbortController());
    chain = chain.then(() => complete(m)); // one at a time
  }
  else if (m.t === "abort") aborts.get(m.id)?.abort();
  else if (m.t === "unload") void wl?.exit().finally(() => (wl = null));
};
