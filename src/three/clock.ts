// Reloj compartido de la animación: cada pieza lee "t" (segundos del guion) en cada fotograma.
import { createContext, useContext, type RefObject } from 'react';

export interface Clock {
  /** Segundos del guion (timeline.ts). Llega a SEQ.end y se queda ahí. */
  t: number;
  /** Hora real (segundos del reloj de Three) en que terminó la animación; null mientras dura. */
  doneAt: number | null;
}

export const ClockContext = createContext<RefObject<Clock> | null>(null);

export function useClock(): RefObject<Clock> {
  const clock = useContext(ClockContext);
  if (!clock) throw new Error('useClock fuera de la escena 3D');
  return clock;
}
