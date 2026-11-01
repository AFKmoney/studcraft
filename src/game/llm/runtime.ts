// In-game NPC model: Bonsai 1.7B Q1_0 ONLY (prism-ml/Bonsai-1.7B-gguf,
// Apache-2.0). No other model, ever. Two transports, picked automatically:
//  1. IPC  - desktop build (Electron): `window.studcraftNative.llm` talks to
//            a native llama.cpp (PrismML fork) sidecar with the GGUF bundled.
//  2. WASM - web build: wllama 3.8.1 (self-hosted in /wllama/, its llama.cpp
//            has the Q1_0 kernels, GGML type 41) + the GGUF self-hosted as
//            <=24 MB chunks in /models/bonsai/ (sha256 manifest), fetched in
//            parallel, resumable, verified, cached in OPFS (Cache API else).
// Multi-thread only when crossOriginIsolated, single-thread otherwise.
// While Bonsai downloads / loads / restarts, the story director uses the
// procedural generator (game logic, not a model). Crashes auto-retry.
import type { Llm } from "./story.ts";

export const MODEL_NAME = "Bonsai 1.7B Q1_0";
export const MODEL_DIR = "./models/bonsai/";
export const WLLAMA_JS = "./wllama/wllama.min.js";
export const WLLAMA_WASM = "./wllama/wllama.wasm";
/** One generation may not run longer than this (then the engine is reset). */
export const GEN_TIMEOUT_MS = 240000;
/** Loading the verified GGUF into the engine (download excluded). */
export const LOAD_TIMEOUT_MS = 180000;
/** Auto-retry delays after a failure/crash (last one repeats). */
export const RETRY_MS = [5000, 20000, 60000, 180000];
/** Bonsai needs ~250 MB weights + ~120 MB KV/compute at n_ctx 1024. */
export const MIN_DEVICE_GB = 2;

export type Chunk = { file: string; size: number; sha256: string };
export type Manifest = { model: string; size: number; sha256: string; chunks: Chunk[] };
export type LlmState = "off" | "idle" | "loading" | "ready" | "retrying" | "unsupported";
export type Env = { deviceMemory?: number; hasWasm: boolean; hasWorker: boolean; software?: boolean; renderer?: string; isolated?: boolean; cores?: number };
export type NativeLlm = {
  status(): Promise<{ ready: boolean; model?: string; why?: string; progress?: number }>;
  generate(prompt: string, grammar: string, o: { temperature: number; maxTokens: number; timeoutMs: number }): Promise<string>;
};

const SOFTWARE_RE = /swiftshader|llvmpipe|softpipe|software|microsoft basic render/i;
/** Software GPU adapters (SwiftShader, llvmpipe...) never get GPU layers. */
export function gpuLayers(env: Pick<Env, "software" | "renderer">): number {
  return env.software || SOFTWARE_RE.test(env.renderer ?? "") ? 0 : 99999;
}

/** Pure gate (tested): can this device try the model at all? */
export function canRun(env: Env): { ok: boolean; why: string } {
  if (!env.hasWasm || !env.hasWorker) return { ok: false, why: "no WebAssembly/Worker" };
  if (env.deviceMemory !== undefined && env.deviceMemory < MIN_DEVICE_GB) return { ok: false, why: "low memory (" + env.deviceMemory + " GB)" };
  return { ok: true, why: "" };
}

/** Threads: multi only when cross-origin isolated (SharedArrayBuffer).
 *  At most half the cores (cap 4): the renderer and the chunk workers need
 *  the rest, and llama.cpp's spin-waiting threads collapse when oversubscribed. */
export function threadsFor(env: Pick<Env, "isolated" | "cores">): number {
  if (!env.isolated) return 1;
  return Math.max(1, Math.min(4, Math.floor((env.cores ?? 2) / 2)));
}

/** Pure manifest check (tested): sizes add up, <=24 MiB each, hex hashes. */
export function checkManifest(m: Manifest): string[] {
  const e: string[] = [];
  if (!m || !Array.isArray(m.chunks) || !m.chunks.length) return ["no chunks"];
  let sum = 0;
  for (const c of m.chunks) {
    if (!/^[\w.-]+$/.test(c.file)) e.push("bad name " + c.file);
    if (!(c.size > 0) || c.size > 24 * 1024 * 1024) e.push("bad size " + c.file);
    if (!/^[0-9a-f]{64}$/.test(c.sha256)) e.push("bad sha " + c.file);
    sum += c.size;
  }
  if (sum !== m.size) e.push("sizes " + sum + " != " + m.size);
  return e;
}

export async function sha256Hex(b: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", b as BufferSource);
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([p, new Promise<T>((_, rej) => (t = setTimeout(() => rej(new Error(what + " timeout")), ms)))]).finally(() => clearTimeout(t));
}

// ---------- chunk store (OPFS, else Cache API, else memory) ----------
export type Store = {
  get(c: Chunk): Promise<Blob | null>;
  partial(c: Chunk): Promise<Uint8Array>;
  savePartial(c: Chunk, b: Uint8Array): Promise<void>;
  put(c: Chunk, b: Uint8Array): Promise<Blob>;
  clear(): Promise<void>;
};
const CACHE_NS = "studcraft-bonsai-q1_0";
type Writable = { write(b: BufferSource): Promise<void>; close(): Promise<void> };

async function opfsStore(): Promise<Store | null> {
  try {
    const root = await (navigator.storage as StorageManager & { getDirectory(): Promise<FileSystemDirectoryHandle> }).getDirectory();
    const dir = await root.getDirectoryHandle(CACHE_NS, { create: true });
    const file = async (n: string): Promise<File | null> => {
      const h = await dir.getFileHandle(n, { create: false }).catch(() => null);
      return h ? h.getFile() : null;
    };
    const write = async (n: string, b: Uint8Array) => {
      const h = await dir.getFileHandle(n, { create: true });
      const w = await (h as FileSystemFileHandle & { createWritable(): Promise<Writable> }).createWritable();
      await w.write(b as BufferSource);
      await w.close();
    };
    return {
      // a chunk counts only if its ".ok" marker holds the manifest sha and the size matches
      async get(c) {
        const [f, ok] = await Promise.all([file(c.file), file(c.file + ".ok")]);
        if (!f || !ok || f.size !== c.size || (await ok.text()) !== c.sha256) return null;
        return f;
      },
      async partial(c) {
        const f = await file(c.file + ".part");
        return f && f.size < c.size ? new Uint8Array(await f.arrayBuffer()) : new Uint8Array(0);
      },
      async savePartial(c, b) {
        await write(c.file + ".part", b);
      },
      async put(c, b) {
        await write(c.file, b);
        await write(c.file + ".ok", new TextEncoder().encode(c.sha256));
        await dir.removeEntry(c.file + ".part").catch(() => {});
        return (await file(c.file)) ?? new Blob([b as BufferSource]);
      },
      async clear() {
        await root.removeEntry(CACHE_NS, { recursive: true }).catch(() => {});
      },
    };
  } catch {
    return null;
  }
}

async function cacheStore(): Promise<Store | null> {
  if (typeof caches === "undefined") return null;
  try {
    const cache = await caches.open(CACHE_NS);
    const key = (c: Chunk) => "/__bonsai/" + c.file + "?" + c.sha256;
    return {
      async get(c) {
        const r = await cache.match(key(c));
        const b = r ? await r.blob() : null;
        return b && b.size === c.size ? b : null;
      },
      partial: async () => new Uint8Array(0),
      savePartial: async () => {},
      async put(c, b) {
        await cache.put(key(c), new Response(b as BufferSource));
        return new Blob([b as BufferSource]);
      },
      async clear() {
        await caches.delete(CACHE_NS);
      },
    };
  } catch {
    return null;
  }
}

export function memStore(): Store {
  const parts = new Map<string, Uint8Array>();
  const done = new Map<string, Blob>();
  return {
    get: async (c) => done.get(c.file) ?? null,
    partial: async (c) => parts.get(c.file) ?? new Uint8Array(0),
    savePartial: async (c, b) => void parts.set(c.file, b.slice()),
    put: async (c, b) => {
      const bl = new Blob([b as BufferSource]);
      done.set(c.file, bl);
      return bl;
    },
    clear: async () => (parts.clear(), done.clear()),
  };
}

/** Fetch one chunk with Range resume (3 attempts), verify its sha256. */
async function fetchChunk(base: string, c: Chunk, store: Store, onBytes: (n: number) => void, fetcher: typeof fetch): Promise<Blob> {
  const hit = await store.get(c);
  if (hit) {
    onBytes(c.size);
    return hit;
  }
  let have = await store.partial(c);
  let counted = have.length;
  onBytes(counted);
  const reset = () => {
    onBytes(-counted);
    counted = 0;
  };
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetcher(base + c.file, have.length ? { headers: { Range: "bytes=" + have.length + "-" } } : {});
      if (!r.ok || !r.body) throw new Error("HTTP " + r.status + " " + c.file);
      if (have.length && r.status !== 206) {
        reset();
        have = new Uint8Array(0);
      }
      const buf = new Uint8Array(c.size);
      buf.set(have);
      let at = have.length;
      let lastSave = at;
      const rd = r.body.getReader();
      try {
        for (;;) {
          const { done, value } = await withTimeout(rd.read(), 30000, "stall");
          if (done) break;
          if (at + value.length > c.size) throw new Error("oversize " + c.file);
          buf.set(value, at);
          at += value.length;
          counted += value.length;
          onBytes(value.length);
          if (at - lastSave > 8 << 20) {
            lastSave = at;
            void store.savePartial(c, buf.subarray(0, at)).catch(() => {});
          }
        }
        if (at !== c.size) throw new Error("short " + c.file);
      } catch (e) {
        have = buf.slice(0, at);
        await store.savePartial(c, have).catch(() => {});
        throw e;
      }
      if ((await sha256Hex(buf)) !== c.sha256) {
        reset();
        have = new Uint8Array(0);
        await store.savePartial(c, have).catch(() => {});
        throw new Error("sha256 mismatch " + c.file);
      }
      return await store.put(c, buf).catch(() => new Blob([buf as BufferSource]));
    } catch (e) {
      if (attempt >= 2) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

/** Download (or reuse) all chunks, 3 lanes in parallel, kept in order. */
export async function fetchModel(base: string, onProgress: (f: number) => void, fetcher: typeof fetch = fetch, storeOverride?: Store): Promise<{ blob: Blob; m: Manifest }> {
  const m = (await (await fetcher(base + "manifest.json", { cache: "no-cache" })).json()) as Manifest;
  const bad = checkManifest(m);
  if (bad.length) throw new Error("manifest: " + bad[0]);
  const store = storeOverride ?? (await opfsStore()) ?? (await cacheStore()) ?? memStore();
  let got = 0;
  const bump = (n: number) => {
    got += n;
    onProgress(Math.max(0, Math.min(1, got / m.size)));
  };
  const parts: Blob[] = new Array(m.chunks.length);
  let next = 0;
  const lane = async () => {
    while (next < m.chunks.length) {
      const i = next++;
      parts[i] = await fetchChunk(base, m.chunks[i], store, bump, fetcher);
    }
  };
  await Promise.all([lane(), lane(), lane()]);
  const blob = new Blob(parts);
  if (blob.size !== m.size) throw new Error("model size " + blob.size);
  return { blob, m };
}

export async function clearModelCache() {
  await (await opfsStore())?.clear();
  await (await cacheStore())?.clear();
}

// ---------- engines ----------
type Engine = { gen(prompt: string, grammar: string, o: { temperature: number; maxTokens: number }, signal: AbortSignal): Promise<string>; exit(): Promise<void> };
type W = {
  loadModel(b: Blob[], o: object): Promise<void>;
  createCompletion(o: object): Promise<{ choices?: { text: string }[] } | string>;
  exit?(): Promise<void>;
};
export type Deps = {
  importer?: (u: string) => Promise<unknown>;
  fetcher?: typeof fetch;
  native?: NativeLlm | null;
  store?: Store;
  base?: string;
};

function nativeOf(): NativeLlm | null {
  const g = globalThis as { studcraftNative?: { llm?: NativeLlm } };
  return g.studcraftNative?.llm ?? null;
}
const abs = (u: string) => (typeof location !== "undefined" ? new URL(u, location.href).href : u);

export class NpcModel {
  state: LlmState = "idle";
  progress = 0;
  model = "";
  transport: "" | "ipc" | "wasm" = "";
  why = "";
  failures = 0;
  private eng: Engine | null = null;
  private busy = false;
  private env: Env | null = null;
  private deps: Deps = {};
  private retryT: ReturnType<typeof setTimeout> | null = null;
  private gen = 0; // bumps on stop()/restart, cancels stale loads
  onChange: () => void = () => {};
  private set(s: LlmState, why = "") {
    this.state = s;
    this.why = why;
    this.onChange();
  }
  /** Background load; resolves when ready, unsupported, or a retry is scheduled. */
  async start(env: Env, deps: Deps = {}): Promise<void> {
    if (this.state === "loading" || this.state === "ready") return;
    this.env = env;
    this.deps = deps;
    if (this.retryT) clearTimeout(this.retryT);
    this.retryT = null;
    const my = ++this.gen;
    const native = deps.native !== undefined ? deps.native : nativeOf();
    if (!native) {
      const gate = canRun(env);
      if (!gate.ok) return this.set("unsupported", gate.why);
    }
    this.progress = 0;
    this.set("loading");
    try {
      const eng = native ? await this.loadNative(native, my) : await this.loadWasm(env, deps, my);
      if (my !== this.gen) return void eng.exit().catch(() => {});
      this.eng = eng;
      this.failures = 0;
      this.model = MODEL_NAME;
      this.set("ready");
    } catch (e) {
      if (my === this.gen) this.fail(String((e as Error)?.message ?? e));
    }
  }
  private fail(why: string) {
    const eng = this.eng;
    this.eng = null;
    this.busy = false;
    void eng?.exit().catch(() => {});
    const d = RETRY_MS[Math.min(this.failures, RETRY_MS.length - 1)];
    this.failures++;
    this.set("retrying", why.slice(0, 100));
    const env = this.env;
    if (env) this.retryT = setTimeout(() => ((this.retryT = null), void this.start(env, this.deps)), d);
  }
  private async loadNative(n: NativeLlm, my: number): Promise<Engine> {
    this.transport = "ipc";
    for (let i = 0; ; i++) {
      const s = await n.status();
      if (s.ready) break;
      if (my !== this.gen) throw new Error("stopped");
      if (i > 600) throw new Error(s.why || "native not ready");
      this.progress = s.progress ?? 0;
      this.onChange();
      await new Promise((r) => setTimeout(r, 500));
    }
    return { gen: (p, g, o) => n.generate(p, g, { ...o, timeoutMs: GEN_TIMEOUT_MS }), exit: async () => {} };
  }
  private async loadWasm(env: Env, deps: Deps, my: number): Promise<Engine> {
    this.transport = "wasm";
    // memory probe: can this tab reserve a 1 GiB wasm heap at all?
    try {
      new WebAssembly.Memory({ initial: 16384, maximum: 16384 });
    } catch {
      throw new Error("cannot reserve 1 GiB wasm memory");
    }
    const { blob } = await fetchModel(deps.base ?? MODEL_DIR, (f) => ((this.progress = f * 0.95), this.onChange()), deps.fetcher ?? fetch, deps.store);
    if (my !== this.gen) throw new Error("stopped");
    const imp = deps.importer ?? ((u: string) => import(/* @vite-ignore */ abs(u)));
    const mod = (await imp(WLLAMA_JS)) as { Wllama: new (p: object, c?: object) => W };
    const wasm = abs(WLLAMA_WASM);
    const w = new mod.Wllama({ default: wasm, "single-thread/wllama.wasm": wasm, "multi-thread/wllama.wasm": wasm }, { suppressNativeLog: true });
    try {
      await withTimeout(w.loadModel([blob], { n_ctx: 1024, n_batch: 512, n_threads: threadsFor(env), n_gpu_layers: gpuLayers(env) }), LOAD_TIMEOUT_MS, "load");
    } catch (e) {
      void w.exit?.().catch(() => {});
      // a corrupt cache would fail here forever: wipe it, re-download on the next retry
      if (/gguf|magic|tensor|model/i.test(String((e as Error)?.message))) await (deps.store ? deps.store.clear() : clearModelCache()).catch(() => {});
      throw e;
    }
    this.progress = 1;
    return {
      gen: async (prompt, grammar, o, signal) => {
        const r = await w.createCompletion({ prompt, grammar, temperature: o.temperature, max_tokens: o.maxTokens, stream: false, abortSignal: signal });
        return typeof r === "string" ? r : (r.choices?.[0]?.text ?? "");
      },
      exit: async () => void (await w.exit?.()),
    };
  }
  /** The Llm function for the director. One generation at a time: a call
   *  made while busy rejects at once (the caller goes procedural instead of
   *  queueing behind a slow CPU generation). A hang or engine crash resets
   *  the engine and schedules an automatic restart. */
  llm(): Llm | null {
    if (this.state !== "ready" || !this.eng) return null;
    const eng = this.eng;
    return async (prompt, grammar, o) => {
      if (this.busy || this.eng !== eng) throw new Error("busy");
      this.busy = true;
      const ac = new AbortController();
      try {
        return await withTimeout(eng.gen(prompt, grammar, o, ac.signal), GEN_TIMEOUT_MS, "generate");
      } catch (e) {
        ac.abort();
        if (this.eng === eng) this.fail("crash: " + String((e as Error)?.message ?? e));
        throw e;
      } finally {
        if (this.eng === eng) this.busy = false;
      }
    };
  }
  stop() {
    this.gen++;
    if (this.retryT) clearTimeout(this.retryT);
    this.retryT = null;
    void this.eng?.exit().catch(() => {});
    this.eng = null;
    this.busy = false;
    this.set("off");
  }
  label(): string {
    if (this.state === "loading") return "NPC AI (Bonsai) " + Math.round(this.progress * 100) + "%";
    if (this.state === "ready") return "NPC AI · " + this.model + (this.transport === "ipc" ? " (native)" : "");
    if (this.state === "retrying") return "NPC AI restarting (" + this.why + ") — procedural quests meanwhile";
    if (this.state === "unsupported") return "NPC AI off (" + this.why + ") — procedural quests";
    return "";
  }
}
