// B18 (Philippe): the crossbow is held like a Lego crossbow — the minifig
// hand closes on a pistol grip UNDER the stock, the stock points straight
// ahead (level, not on the tool diagonal) and the prod spans the view
// horizontally. Pure numbers, consumed by game.ts and tested.
export const CROSSBOW_HOLD = {
  /** model +X (bolt tip) → view −Z (forward): a +90° turn about Y */
  rotY: Math.PI / 2,
  /** model units → anchor units before the shared held-item shrink */
  scale: 2.6,
  /** where the grip sits in anchor space (x right, y up, z toward the eye) */
  grip: { x: -0.2, y: -0.02, z: 0.08 },
  /** pistol grip under the stock, in model space */
  gripLocal: { x: -0.07, y: -0.075, z: 0 },
  /** third-person: level, pointing where the figure faces */
  tpRot: { x: 0, y: -Math.PI / 2, z: 0 },
};
type V = { x: number; y: number; z: number };
/** Direction of a model axis after the hold rotation (rotation about Y). */
export function holdAxis(v: V, rotY = CROSSBOW_HOLD.rotY): V {
  const c = Math.cos(rotY), s = Math.sin(rotY);
  const r = (n: number) => (Math.abs(n) < 1e-9 ? 0 : n);
  return { x: r(c * v.x + s * v.z), y: r(v.y), z: r(-s * v.x + c * v.z) };
}
