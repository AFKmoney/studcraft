export function createAudio() {
  let ctx: AudioContext | null = null;
  let enabled = true;

  function ac(): AudioContext | null {
    if (!enabled) return null;
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
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
    g.connect(c.destination);
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
    g.connect(c.destination);
    src.start(t);
  }

  return {
    setEnabled(v: boolean) {
      enabled = v;
    },
    unlock() {
      ac();
    },
    place() {
      tone(540, 0.06, "square", 0.035);
      tone(820, 0.05, "square", 0.02);
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
        g.connect(c.destination);
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
