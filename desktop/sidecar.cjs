// Native Bonsai 1.7B Q1_0 sidecar: spawns llama-server (PrismML fork build)
// on 127.0.0.1:<free port> with the bundled GGUF, health-checks it,
// restarts it on crash (backoff), and exposes generate(prompt, grammar).
// Pure Node (no Electron import) so it is testable headless.
"use strict";
const { spawn } = require("node:child_process");
const net = require("node:net");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const RETRY_MS = [1000, 3000, 10000, 30000];

function freePort() {
  return new Promise((res, rej) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => res(p));
    });
    s.on("error", rej);
  });
}

class Sidecar {
  /** @param {{ bin: string, model: string, threads?: number, gpuLayers?: number, ctx?: number, log?: (s: string) => void }} o */
  constructor(o) {
    this.o = o;
    this.proc = null;
    this.port = 0;
    this.ready = false;
    this.why = "";
    this.failures = 0;
    this.stopped = false;
    this.log = o.log || (() => {});
  }
  async start() {
    this.stopped = false;
    if (!fs.existsSync(this.o.bin)) return this.fail("missing llama-server: " + this.o.bin, false);
    if (!fs.existsSync(this.o.model)) return this.fail("missing model: " + this.o.model, false);
    if (os.freemem() < 600 * 1024 * 1024) this.log("warning: low free memory " + Math.round(os.freemem() / 1048576) + " MB");
    this.port = await freePort();
    const threads = this.o.threads || Math.max(1, Math.min(8, Math.floor(os.cpus().length / 2)));
    const args = ["-m", this.o.model, "--host", "127.0.0.1", "--port", String(this.port), "-c", String(this.o.ctx || 2048), "-np", "1", "-t", String(threads), "-ngl", String(this.o.gpuLayers ?? 99), "--no-webui"];
    this.log("spawn " + this.o.bin + " " + args.join(" "));
    const p = spawn(this.o.bin, args, { cwd: path.dirname(this.o.bin), stdio: ["ignore", "pipe", "pipe"], windowsHide: true, env: { ...process.env, LD_LIBRARY_PATH: path.dirname(this.o.bin) + (process.env.LD_LIBRARY_PATH ? ":" + process.env.LD_LIBRARY_PATH : "") } });
    this.proc = p;
    let tail = "";
    const keep = (d) => (tail = (tail + d).slice(-2000));
    p.stdout.on("data", keep);
    p.stderr.on("data", keep);
    p.on("exit", (code, sig) => {
      if (this.proc !== p) return;
      this.proc = null;
      this.ready = false;
      if (!this.stopped) this.fail("llama-server exited " + (code ?? sig) + ": " + tail.split("\n").slice(-3).join(" | "), true);
    });
    // health: /health returns 200 once the model is loaded
    for (let i = 0; i < 240 && this.proc === p; i++) {
      try {
        const r = await fetch(`http://127.0.0.1:${this.port}/health`);
        if (r.ok) {
          this.ready = true;
          this.failures = 0;
          this.why = "";
          this.log("ready on port " + this.port);
          return;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    if (this.proc === p) {
      p.kill();
      this.fail("llama-server not healthy after 120 s", true);
    }
  }
  fail(why, retry) {
    this.ready = false;
    this.why = why.slice(0, 300);
    this.log("fail: " + this.why);
    if (!retry || this.stopped) return;
    const d = RETRY_MS[Math.min(this.failures++, RETRY_MS.length - 1)];
    setTimeout(() => !this.stopped && !this.proc && this.start(), d).unref?.();
  }
  status() {
    return { ready: this.ready, model: "Bonsai 1.7B Q1_0", why: this.why };
  }
  /** One constrained completion; a timeout kills + restarts the server. */
  async generate(prompt, grammar, o = {}) {
    if (!this.ready) throw new Error("native model not ready: " + this.why);
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), o.timeoutMs || 120000);
    try {
      const r = await fetch(`http://127.0.0.1:${this.port}/completion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: String(prompt), grammar: String(grammar), n_predict: o.maxTokens || 160, temperature: o.temperature ?? 0.4, cache_prompt: true }),
        signal: ac.signal,
      });
      if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()).slice(0, 200));
      const j = await r.json();
      this.lastTimings = j.timings;
      return j.content;
    } catch (e) {
      if (ac.signal.aborted && this.proc) this.proc.kill(); // exit handler restarts it
      throw e;
    } finally {
      clearTimeout(t);
    }
  }
  stop() {
    this.stopped = true;
    this.ready = false;
    const p = this.proc;
    this.proc = null;
    p?.kill();
  }
}

module.exports = { Sidecar, freePort };
