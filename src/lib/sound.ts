// Efectos de sonido sintetizados con Web Audio (sin archivos: funciona sin internet y no pesa nada).
// El iPhone solo deja sonar audio después de un toque: por eso se llama a unlockAudio() al pulsar botones.

export type SoundKind =
  | 'swell' | 'tock' | 'clink' | 'whoosh' | 'puff' | 'chord'
  // Al tocar un hexágono, uno por terreno
  | 'beee' | 'hacha' | 'espigas' | 'ladrillo' | 'pico' | 'viento';

export interface SoundEvent {
  /** Segundos desde ahora. */
  at: number;
  kind: SoundKind;
  /** 0-1: varía un poco el tono para que no suene repetitivo. */
  pitch?: number;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

function audio(): { ctx: AudioContext; master: GainNode } | null {
  if (!ctx) {
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  return { ctx, master: master! };
}

/** Llamar dentro de un toque del usuario. */
export function unlockAudio() {
  const a = audio();
  if (a && a.ctx.state === 'suspended') void a.ctx.resume().catch(() => {});
}

function noiseBuffer(c: AudioContext): AudioBuffer {
  if (noise) return noise;
  noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

function envelope(c: AudioContext, out: AudioNode, t: number, peak: number, attack: number, decay: number): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(out);
  return g;
}

function tone(c: AudioContext, out: AudioNode, t: number, freq: number, type: OscillatorType, peak: number, attack: number, decay: number) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.connect(envelope(c, out, t, peak, attack, decay));
  o.start(t);
  o.stop(t + attack + decay + 0.05);
  return o;
}

function noiseBurst(c: AudioContext, out: AudioNode, t: number, dur: number, filter: BiquadFilterType, from: number, to: number, peak: number, attack: number) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  src.connect(f);
  f.connect(envelope(c, out, t, peak, attack, Math.max(0.01, dur - attack)));
  src.start(t);
  src.stop(t + dur + 0.05);
}

/** Balido: diente de sierra con vibrato, filtrado para que suene a garganta. */
function bleat(c: AudioContext, out: AudioNode, t: number, p: number) {
  const f0 = 360 + p * 90;
  const o = c.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.linearRampToValueAtTime(f0 * 1.06, t + 0.12);
  o.frequency.linearRampToValueAtTime(f0 * 0.9, t + 0.6);
  const lfo = c.createOscillator();
  lfo.frequency.value = 7;
  const depth = c.createGain();
  depth.gain.value = f0 * 0.07;
  lfo.connect(depth);
  depth.connect(o.frequency);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1150;
  bp.Q.value = 1.4;
  o.connect(bp);
  bp.connect(envelope(c, out, t, 0.2, 0.05, 0.6));
  o.start(t);
  lfo.start(t);
  o.stop(t + 0.75);
  lfo.stop(t + 0.75);
}

function play(c: AudioContext, out: AudioNode, t: number, e: SoundEvent) {
  const p = e.pitch ?? 0.5;
  switch (e.kind) {
    case 'swell': // zumbido espacial que crece
      noiseBurst(c, out, t, 1.6, 'lowpass', 180, 1400, 0.12, 0.9);
      tone(c, out, t, 55, 'sine', 0.18, 0.8, 1.2);
      tone(c, out, t, 82.4, 'sine', 0.08, 0.9, 1.1);
      break;
    case 'tock': // pieza de madera que se posa
      tone(c, out, t, 190 + p * 170, 'triangle', 0.32, 0.004, 0.13);
      noiseBurst(c, out, t, 0.05, 'bandpass', 1800, 1200, 0.12, 0.002);
      break;
    case 'clink': // ficha que cae
      tone(c, out, t, 1500 + p * 500, 'sine', 0.09, 0.003, 0.22);
      tone(c, out, t, (1500 + p * 500) * 2.71, 'sine', 0.03, 0.003, 0.12);
      break;
    case 'whoosh': // barco que llega
      noiseBurst(c, out, t, 0.45, 'bandpass', 500, 1800, 0.07, 0.2);
      break;
    case 'puff': // humo del ladrón
      noiseBurst(c, out, t, 0.5, 'lowpass', 900, 300, 0.16, 0.03);
      tone(c, out, t, 70, 'sine', 0.14, 0.01, 0.35);
      break;
    case 'chord': // acorde final
      [261.6, 329.6, 392, 523.3].forEach((f, i) => tone(c, out, t + i * 0.04, f, 'sine', 0.07, 0.05, 1.8));
      break;
    case 'beee': // pasto: una oveja
      bleat(c, out, t, p);
      break;
    case 'hacha': // bosque: hachazo en un tronco
      {
        const o = tone(c, out, t, 150, 'triangle', 0.38, 0.003, 0.16);
        o.frequency.exponentialRampToValueAtTime(70, t + 0.15);
      }
      noiseBurst(c, out, t, 0.09, 'bandpass', 2600, 700, 0.22, 0.002);
      tone(c, out, t + 0.005, 320 + p * 60, 'square', 0.04, 0.002, 0.06);
      break;
    case 'espigas': // campo: el viento entre el trigo
      noiseBurst(c, out, t, 0.7, 'bandpass', 2600, 4800, 0.07, 0.25);
      noiseBurst(c, out, t + 0.15, 0.55, 'highpass', 3500, 6000, 0.035, 0.2);
      break;
    case 'ladrillo': // colinas: dos ladrillos que chocan
      [0, 0.11].forEach((d, i) => {
        tone(c, out, t + d, 430 - i * 50 + p * 40, 'triangle', 0.22, 0.002, 0.07);
        noiseBurst(c, out, t + d, 0.05, 'bandpass', 1700, 1100, 0.14, 0.002);
      });
      break;
    case 'pico': // montañas: el pico contra la roca
      [0, 0.17].forEach((d, i) => {
        const f = (2000 - i * 160) * (0.95 + p * 0.1);
        const v = i ? 0.05 : 0.09;
        tone(c, out, t + d, f, 'sine', v, 0.002, 0.32);
        tone(c, out, t + d, f * 2.76, 'sine', v * 0.4, 0.002, 0.16);
        noiseBurst(c, out, t + d, 0.03, 'highpass', 3000, 5000, v, 0.001);
      });
      break;
    case 'viento': // desierto: viento seco
      noiseBurst(c, out, t, 1, 'bandpass', 380, 900, 0.09, 0.4);
      break;
  }
}

/** Programa una serie de sonidos. Devuelve una función que los corta (con un fundido rápido). */
export function playSequence(events: SoundEvent[]): () => void {
  const a = audio();
  if (!a) return () => {};
  const { ctx: c, master: m } = a;
  const bus = c.createGain();
  bus.connect(m);
  const now = c.currentTime + 0.03;
  for (const e of events) play(c, bus, now + e.at, e);
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    bus.gain.setTargetAtTime(0, c.currentTime, 0.04);
    setTimeout(() => bus.disconnect(), 400);
  };
}

export function playSound(kind: SoundKind, pitch?: number) {
  playSequence([{ at: 0, kind, pitch }]);
}
