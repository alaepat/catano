// Guion de la animación 3D: cuándo empieza y cuánto dura cada parte (segundos, a velocidad "épica").
// No usa Three.js, así que se puede probar con tests.
import { REVEAL_INDEX } from '../lib/reveal';

export const SEQ = {
  /** 1. Un punto de luz crece en el espacio. */
  light: { start: 0, dur: 1.1 },
  /** 2. Se forman el mar y el aura. */
  sea: { start: 0.55, dur: 0.9 },
  /** 3. Los hexágonos llegan volando, del centro hacia fuera. */
  hex: { start: 1.0, step: 0.07, dur: 0.75 },
  /** 4. Las fichas caen girando como monedas. */
  token: { start: 2.65, step: 0.045, dur: 0.6 },
  /** 5. Los barcos llegan a los puertos. */
  port: { start: 3.7, step: 0.06, dur: 0.65 },
  /** 6. Aparece el ladrón con una nube de humo. */
  robber: { start: 4.4, dur: 0.75 },
  smoke: { start: 4.35, dur: 1.1 },
  /** 7. La cámara se acerca (durante todo el rato) y se inclina al final. */
  approach: { start: 0, dur: 3.2 },
  tilt: { start: 2.2, dur: 3.1 },
  swing: { start: 0, dur: 5.3 },
  /** Fin: ya se puede tocar todo. */
  end: 5.5,
} as const;

export interface Window {
  start: number;
  dur: number;
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Avance de 0 a 1 de una parte de la animación en el instante t. */
export function progress(t: number, w: Window): number {
  if (w.dur <= 0) return t >= w.start ? 1 : 0;
  return clamp01((t - w.start) / w.dur);
}

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Curvas de suavizado: entran 0 y salen 1. */
export const ease = {
  outCubic: (x: number) => 1 - (1 - x) ** 3,
  outQuart: (x: number) => 1 - (1 - x) ** 4,
  inOutCubic: (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
  /** Se pasa un poco y vuelve: da sensación de "pop". */
  outBack: (x: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
  },
  /** Rebota al llegar, como algo que cae sobre la mesa. */
  outBounce: (x: number) => {
    const n = 7.5625;
    const d = 2.75;
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
    if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
    return n * (x -= 2.625 / d) * x + 0.984375;
  },
};

export function hexWindow(hexId: number): Window {
  return { start: SEQ.hex.start + REVEAL_INDEX[hexId] * SEQ.hex.step, dur: SEQ.hex.dur };
}

export function tokenWindow(hexId: number): Window {
  return { start: SEQ.token.start + REVEAL_INDEX[hexId] * SEQ.token.step, dur: SEQ.token.dur };
}

export function portWindow(order: number): Window {
  return { start: SEQ.port.start + order * SEQ.port.step, dur: SEQ.port.dur };
}

/** Destello de color al aterrizar: 1 justo al tocar el mar y se apaga rápido. */
export function landingFlash(t: number, w: Window): number {
  const land = w.start + w.dur;
  return t < land ? 0 : Math.exp(-(t - land) * 5);
}

/** Cuánto dura la animación 3D a una velocidad dada (1 = épica, 0 = sin animación). */
export function sequenceDuration(speed: number): number {
  return SEQ.end * speed;
}
