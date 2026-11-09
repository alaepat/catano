import { BASE_GEOMETRY } from '../game';

// Tiempos de la animación de aparición del tablero 2D (segundos, a velocidad "épica").
export const REVEAL_TIMING = { hex: 0.07, numbersStart: 1.25, number: 0.045, portsStart: 2.0, port: 0.06, robber: 2.6 };

/** Cuánto dura la animación 2D completa a una velocidad dada (segundos). */
export function revealDuration(speed: number): number {
  return (REVEAL_TIMING.robber + 0.6) * speed;
}

/** Orden de aparición de cada hexágono del Catan base (por id): del centro hacia fuera, girando. */
export const REVEAL_INDEX: readonly number[] = BASE_GEOMETRY.revealIndex;
