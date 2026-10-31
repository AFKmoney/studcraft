#!/usr/bin/env python3
"""NumPy-only SIREN: fit an image as f(x, y) -> RGB, then compress the weights NFR-style.

Usage:
  python3 siren_fit.py --demo bricks --steps 1500
  python3 siren_fit.py --image photo.png --size 128 --hidden 96 --layers 3 --out weights.npz

Reports: parameter count, fp32 size, PSNR; then int8 (per-block 64, symmetric) for hidden/output
layers with the FIRST layer kept fp16 (its weights are scaled by omega_0 before the sine, so
quantization error there is amplified), the quantized size, and the PSNR after dequantization.
"""
import argparse, math, sys, time
import numpy as np

OMEGA = 30.0


def demo_bricks(n):
    """Procedural LEGO-like top view: coloured 2x2 bricks with round studs and soft shading."""
    y, x = np.mgrid[0:n, 0:n] / n
    cell = 0.25
    bx, by = np.floor(x / cell), np.floor(y / cell)
    palette = np.array([[0.89, 0.23, 0.18], [0.96, 0.77, 0.10], [0.15, 0.40, 0.80], [0.21, 0.66, 0.32]])
    col = palette[((bx * 3 + by * 5) % 4).astype(int)]
    sx, sy = (x % (cell / 2)) / (cell / 2) - 0.5, (y % (cell / 2)) / (cell / 2) - 0.5
    r = np.sqrt(sx ** 2 + sy ** 2)
    stud = np.clip((0.32 - r) * 40, 0, 1)[..., None]
    light = (0.85 + 0.35 * (-(sx + sy)) * stud[..., 0])[..., None]
    edge = np.minimum((x % cell) / cell, (y % cell) / cell)
    groove = np.clip(edge * 30, 0.55, 1)[..., None]
    return np.clip(col * groove * (1 - 0.15 * stud) * light + 0.25 * stud * (sx < -0.1)[..., None], 0, 1)


def load_image(path, n):
    try:
        from PIL import Image
    except ImportError:
        sys.exit("Pillow is needed for --image (pip install pillow), or use --demo bricks")
    im = Image.open(path).convert("RGB").resize((n, n))
    return np.asarray(im, dtype=np.float64) / 255.0


def init(sizes, rng):
    params = []
    for i, (a, b) in enumerate(zip(sizes[:-1], sizes[1:])):
        lim = 1.0 / a if i == 0 else math.sqrt(6.0 / a) / OMEGA
        params.append([rng.uniform(-lim, lim, (a, b)), rng.uniform(-lim, lim, (b,))])
    return params


def forward(params, x):
    acts, zs = [x], []
    h = x
    for i, (W, b) in enumerate(params):
        z = h @ W + b
        zs.append(z)
        h = z if i == len(params) - 1 else np.sin(OMEGA * z)
        acts.append(h)
    return h, acts, zs


def backward(params, acts, zs, grad_out):
    grads = [None] * len(params)
    g = grad_out
    for i in range(len(params) - 1, -1, -1):
        if i != len(params) - 1:
            g = g * OMEGA * np.cos(OMEGA * zs[i])
        grads[i] = [acts[i].T @ g, g.sum(0)]
        g = g @ params[i][0].T
    return grads


def psnr(a, b):
    mse = float(np.mean((np.clip(a, 0, 1) - b) ** 2))
    return 10 * math.log10(1.0 / max(mse, 1e-12))


def quantize_block_int8(w, block=64):
    flat = w.ravel()
    pad = (-len(flat)) % block
    f = np.concatenate([flat, np.zeros(pad)]).reshape(-1, block)
    scale = np.abs(f).max(1, keepdims=True) / 127.0
    scale[scale == 0] = 1.0
    q = np.round(f / scale).astype(np.int8)
    deq = (q * scale).ravel()[: len(flat)].reshape(w.shape)
    nbytes = q.size + scale.size * 2  # int8 values + fp16 scales
    return deq, nbytes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--demo", choices=["bricks"], default=None)
    ap.add_argument("--image", default=None)
    ap.add_argument("--size", type=int, default=64)
    ap.add_argument("--hidden", type=int, default=64)
    ap.add_argument("--layers", type=int, default=3, help="number of sine layers")
    ap.add_argument("--steps", type=int, default=1500)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--out", default=None, help="save fp32 + int8 weights (.npz)")
    a = ap.parse_args()

    img = load_image(a.image, a.size) if a.image else demo_bricks(a.size)
    n = img.shape[0]
    lin = np.linspace(-1, 1, n)
    X = np.stack(np.meshgrid(lin, lin), -1).reshape(-1, 2)
    Y = img.reshape(-1, 3)

    rng = np.random.default_rng(a.seed)
    params = init([2] + [a.hidden] * a.layers + [3], rng)
    m = [[np.zeros_like(p) for p in layer] for layer in params]
    v = [[np.zeros_like(p) for p in layer] for layer in params]
    b1, b2, eps = 0.9, 0.999, 1e-8
    t0 = time.time()
    for step in range(1, a.steps + 1):
        out, acts, zs = forward(params, X)
        grads = backward(params, acts, zs, 2 * (out - Y) / len(X))
        for li, layer in enumerate(params):
            for pi in range(2):
                g = grads[li][pi]
                m[li][pi] = b1 * m[li][pi] + (1 - b1) * g
                v[li][pi] = b2 * v[li][pi] + (1 - b2) * g * g
                mh = m[li][pi] / (1 - b1 ** step)
                vh = v[li][pi] / (1 - b2 ** step)
                layer[pi] -= a.lr * mh / (np.sqrt(vh) + eps)
        if step % max(1, a.steps // 5) == 0 or step == 1:
            print(f"step {step:5d}  PSNR {psnr(out, Y):6.2f} dB  ({time.time() - t0:.1f}s)")

    out, _, _ = forward(params, X)
    nparams = sum(W.size + b.size for W, b in params)
    fp32_bytes = nparams * 4
    p_fp32 = psnr(out, Y)

    qparams, qbytes = [], 0
    for i, (W, b) in enumerate(params):
        if i == 0:  # first layer stays fp16
            qparams.append([W.astype(np.float16).astype(np.float64), b.astype(np.float16).astype(np.float64)])
            qbytes += (W.size + b.size) * 2
        else:
            Wq, nb = quantize_block_int8(W)
            qparams.append([Wq, b.astype(np.float16).astype(np.float64)])
            qbytes += nb + b.size * 2
    outq, _, _ = forward(qparams, X)
    p_q = psnr(outq, Y)

    raw = img.size  # 8-bit RGB pixels
    print(f"\nimage {n}x{n} RGB8 = {raw} B")
    print(f"SIREN {nparams} params: fp32 {fp32_bytes} B  PSNR {p_fp32:.2f} dB")
    print(f"NFR int8 (first layer fp16): {qbytes} B ({fp32_bytes / qbytes:.2f}x smaller)  PSNR {p_q:.2f} dB")
    print("note: lossy representation; entropy-code the int8 stream (NFR ULTRA) for a further 5-10 %")
    if a.out:
        np.savez_compressed(a.out, **{f"W{i}": W for i, (W, _) in enumerate(params)},
                            **{f"b{i}": b for i, (_, b) in enumerate(params)}, omega=OMEGA)
        print("saved", a.out)


if __name__ == "__main__":
    main()
