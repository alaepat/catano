import { HEXES } from '../game';

// Tiempos de la animación de aparición del tablero 2D (segundos, a velocidad "épica").
export const REVEAL_TIMING = { hex: 0.07, numbersStart: 1.25, number: 0.045, portsStart: 2.0, port: 0.06, robber: 2.6 };

/** Cuánto dura la animación 2D completa a una velocidad dada (segundos). */
export function revealDuration(speed: number): number {
  return (REVEAL_TIMING.robber + 0.6) * speed;
}

/** Orden de aparición de cada hexágono (por id): del centro hacia fuera, girando. Lo usan el 2D y el 3D. */
export const REVEAL_INDEX: readonly number[] = (() => {
  const order = HEXES.slice().sort((a, b) => a.ring - b.ring || Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));
  const index: number[] = [];
  order.forEach((h, i) => (index[h.id] = i));
  return index;
})();
