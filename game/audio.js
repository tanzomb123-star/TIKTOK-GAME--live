// Synthesised sound effects (Web Audio). No audio files, so no licensing questions.
// Browsers start audio only after a click/key press; OBS Browser Source plays it straight away.

const LIMITS = {
  laser: { windowMs: 120, max: 2 },
  boom: { windowMs: 90, max: 2 },
  summon: { windowMs: 150, max: 2 },
  hit: { windowMs: 200, max: 1 },
  upgrade: { windowMs: 300, max: 1 },
  nova: { windowMs: 800, max: 1 },
  boss: { windowMs: 1000, max: 1 },
  win: { windowMs: 3000, max: 1 },
  lose: { windowMs: 3000, max: 1 },
};
const DEFAULT_LIMIT = { windowMs: 200, max: 2 };

// Keeps a crowd of viewers from turning the stream into noise.
export function createThrottle(limits) {
  const hits = new Map();
  return (name, nowMs) => {
    const { windowMs, max } = limits[name] || DEFAULT_LIMIT;
    const recent = (hits.get(name) || []).filter((t) => nowMs - t < windowMs);
    if (recent.length >= max) { hits.set(name, recent); return false; }
    recent.push(nowMs);
    hits.set(name, recent);
    return true;
  };
}

const MUTE_KEY = 'tower-live-muted';
const readMuted = () => { try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; } };
const saveMuted = (m) => { try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* ignore */ } };

export function createSfx({ volume = 0.35 } = {}) {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  const allow = createThrottle(LIMITS);
  let muted = readMuted();
  if (!AC) return { play() {}, unlock() {}, toggleMute: () => (muted = !muted), get muted() { return muted; } };

  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = muted ? 0 : volume;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp).connect(ctx.destination);

  let noiseBuf;
  const noise = () => {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    return src;
  };

  const env = (node, t, a, peak, d) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    node.connect(g).connect(master);
    return g;
  };

  const tone = (type, f0, f1, t, dur, peak = 0.3) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(o, t, 0.005, peak, dur);
    o.start(t);
    o.stop(t + dur + 0.05);
  };

  const burst = (t, dur, freq, peak) => {
    const n = noise();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(80, t + dur);
    n.connect(f);
    env(f, t, 0.004, peak, dur);
    n.start(t);
    n.stop(t + dur + 0.05);
  };

  const SOUNDS = {
    laser: (t, lvl = 0) => tone('square', 1400 + lvl * 120, 240, t, 0.12, 0.12),
    boom: (t) => { burst(t, 0.35, 2400, 0.5); tone('sine', 140, 40, t, 0.3, 0.35); },
    summon: (t, kind) => {
      const base = { soldier: 440, archer: 523, knight: 330 }[kind] || 440;
      [0, 4, 7].forEach((st, i) => tone('triangle', base * 2 ** (st / 12), base * 2 ** (st / 12), t + i * 0.05, 0.12, 0.18));
    },
    hit: (t) => { tone('sawtooth', 120, 50, t, 0.35, 0.35); burst(t, 0.2, 900, 0.3); },
    upgrade: (t) => [0, 5, 9, 12].forEach((st, i) => tone('sine', 660 * 2 ** (st / 12), 660 * 2 ** (st / 12), t + i * 0.06, 0.25, 0.2)),
    nova: (t) => { burst(t, 0.9, 6000, 0.45); tone('sine', 900, 60, t, 0.8, 0.3); },
    boss: (t) => { tone('sawtooth', 73, 73, t, 0.9, 0.25); tone('sawtooth', 110, 110, t + 0.05, 0.85, 0.18); },
    win: (t) => [0, 4, 7, 12, 16].forEach((st, i) => tone('triangle', 523 * 2 ** (st / 12), 523 * 2 ** (st / 12), t + i * 0.11, 0.35, 0.22)),
    lose: (t) => [0, -3, -6, -12].forEach((st, i) => tone('triangle', 392 * 2 ** (st / 12), 392 * 2 ** (st / 12), t + i * 0.16, 0.4, 0.2)),
  };

  return {
    play(name, arg) {
      if (muted || ctx.state !== 'running' || !SOUNDS[name]) return;
      if (!allow(name, performance.now())) return;
      SOUNDS[name](ctx.currentTime + 0.01, arg);
    },
    unlock() { if (ctx.state !== 'running') ctx.resume().catch(() => {}); },
    toggleMute() {
      muted = !muted;
      saveMuted(muted);
      master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.02);
      return muted;
    },
    get muted() { return muted; },
    get state() { return ctx.state; },
  };
}

// One shared instance so scenes don't create multiple audio contexts.
let shared;
export const sfx = () => (shared ||= createSfx());
