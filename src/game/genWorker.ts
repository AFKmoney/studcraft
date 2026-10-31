// World-generation worker: same World class, same seed → byte-identical
// chunks. The buffer is transferred (zero-copy) back to the main thread.
import { World } from "./world";

let world: World | null = null;
type Msg = { seed: number; flat: boolean; cx: number; cz: number; id: number };
self.onmessage = (e: MessageEvent<Msg>) => {
  const { seed, flat, cx, cz, id } = e.data;
  if (!world || world.seed !== seed || world.flat !== flat) world = new World(seed, flat);
  const t = performance.now();
  const data = world.ensure(cx, cz);
  world.chunks.clear(); // keep the worker's memory flat; the main thread owns chunks
  const copy = data.slice();
  (self as unknown as Worker).postMessage({ id, cx, cz, seed, flat, data: copy, ms: performance.now() - t }, [copy.buffer]);
};
