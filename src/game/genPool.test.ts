import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { GenPool, poolSize, type WorkerLike } from "./genPool.ts";
register(
  "data:text/javascript," +
    encodeURIComponent(`export async function resolve(s, c, n) {
      try { return await n(s, c); } catch (e) {
        if ((s.startsWith("./") || s.startsWith("../")) && !/\\.[cm]?[jt]s$/.test(s)) return n(s + ".ts", c);
        throw e;
      }
    }`),
);
const { World } = await import("./world.ts");
type World = InstanceType<typeof World>;

// in-process fake worker running the same code path as genWorker.ts
function fake(): WorkerLike {
  const me: WorkerLike = {
    onmessage: null,
    postMessage(m: unknown) {
      const { seed, flat, cx, cz, id } = m as { seed: number; flat: boolean; cx: number; cz: number; id: number };
      const data = new World(seed, flat).ensure(cx, cz).slice();
      queueMicrotask(() => me.onmessage?.({ data: { id, cx, cz, seed, flat, data, ms: 1 } } as MessageEvent));
    },
    terminate() {},
  };
  return me;
}

test("pool size from hardwareConcurrency", () => {
  assert.equal(poolSize(undefined), 1);
  assert.equal(poolSize(4), 2);
  assert.equal(poolSize(32), 6);
});

test("worker chunks are byte-identical to main-thread ensure and adopted once", async () => {
  const w = new World(1234, false);
  const pool = new GenPool(fake, 2);
  pool.prefetch(w, [{ cx: 0, cz: 0 }, { cx: 3, cz: -2 }]);
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(pool.stats.adopted, 2);
  const ref = new World(1234, false);
  assert.deepEqual(w.ensure(3, -2), ref.ensure(3, -2));
  assert.deepEqual(w.ensure(0, 0), ref.ensure(0, 0));
});

test("stale results (world switched) are dropped; no workers → fallback", async () => {
  const a = new World(1, false);
  const pool = new GenPool(fake, 1);
  pool.prefetch(a, [{ cx: 1, cz: 1 }]);
  const b = new World(2, false);
  pool.bind(b);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(a.has(1, 1), false);
  assert.equal(b.has(1, 1), false);
  const none = new GenPool(() => { throw new Error("no Worker"); }, 3);
  assert.equal(none.size, 0);
  none.prefetch(b, [{ cx: 0, cz: 0 }]);
  assert.ok(b.ensure(0, 0).length > 0);
});
