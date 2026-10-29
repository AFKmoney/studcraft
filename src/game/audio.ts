/** Stud click: a short high tick, then the lower plastic body. No sample. */
export const PLACE_CLICK = [
  { freq: 1860, dur: 0.012, type: "square" as const, gain: 0.03 },
  { freq: 740, dur: 0.034, type: "triangle" as const, gain: 0.028 },
];

export function createAudio() {
  let ctx: AudioContext | null = null;
  let bus: GainNode | null = null;
  let enabled = true;
  let volume = 1;

  function ac(): AudioContext | null {
    if (!enabled || volume <= 0) return null;
    try {
      if (!ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        ctx = new Ctor();
        bus = ctx.createGain();
        bus.gain.value = volume;
        bus.connect(ctx.destination);
      }
      if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    } catch {
      return null;
    }
    return ctx;
  }

  function out(): AudioNode {
    return (bus ?? ctx!.destination) as AudioNode;
  }

  function tone(freq: number, dur: number, type: OscillatorType, gain: number) {
    const c = ac();
    if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(out());
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur: number, gain: number, freq = 800) {
    const c = ac();
    if (!c) return;
    const t = c.currentTime;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(out());
    src.start(t);
  }

  return {
    setEnabled(v: boolean) {
      enabled = v;
    },
    setVolume(v: number) {
      volume = Math.max(0, Math.min(1, v));
      if (bus && ctx) bus.gain.setTargetAtTime(volume, ctx.currentTime, 0.02);
    },
    suspend() {
      if (ctx && ctx.state === "running") void ctx.suspend().catch(() => {});
    },
    // Menu feedback: short, soft, plastic.
    uiHover() {
      tone(1320, 0.025, "sine", 0.012);
    },
    uiClick() {
      tone(760, 0.035, "square", 0.022);
      tone(1140, 0.03, "sine", 0.016);
    },
    uiOpen() {
      tone(520, 0.05, "triangle", 0.03);
      tone(780, 0.07, "triangle", 0.024);
    },
    uiClose() {
      tone(700, 0.05, "triangle", 0.026);
      tone(470, 0.07, "triangle", 0.02);
    },
    unlock() {
      ac();
    },
    place() {
      for (const n of PLACE_CLICK) tone(n.freq, n.dur, n.type, n.gain);
    },
    snap() {
      tone(680, 0.04, "square", 0.03);
    },
    mine() {
      noise(0.05, 0.04, 1200);
    },
    break() {
      noise(0.12, 0.07, 900);
      tone(160, 0.09, "triangle", 0.04);
    },
    step() {
      noise(0.03, 0.018, 400);
    },
    jump() {
      tone(280, 0.08, "sine", 0.03);
    },
    hit() {
      noise(0.08, 0.06, 600);
      tone(110, 0.12, "sawtooth", 0.03);
    },
    explode() {
      noise(0.45, 0.12, 240);
      tone(55, 0.4, "sine", 0.07);
    },
    hurt() {
      tone(140, 0.14, "sawtooth", 0.04);
    },
    rank() {
      const c = ac();
      if (!c) return;
      const t = c.currentTime;
      const notes = [523, 659, 784];
      notes.forEach((freq, i) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = "square";
        o.frequency.setValueAtTime(freq, t);
        const start = t + i * 0.07;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.setValueAtTime(0.04, start);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
        o.connect(g);
        g.connect(out());
        o.start(start);
        o.stop(start + 0.2);
      });
    },
    note(step = 0) {
      tone(440 * 2 ** (step / 12), 0.12, "square", 0.04);
    },
  };
}

export type AudioBus = ReturnType<typeof createAudio>;
