import { describe, expect, it } from 'vitest';
import { sliceAt, spinTarget } from '../src/lib/ruleta';

describe('ruleta', () => {
  it('sin girar, la flecha apunta al primer jugador', () => {
    expect(sliceAt(0, 4)).toBe(0);
    expect(sliceAt(1, 4)).toBe(3); // un grado en el sentido del reloj: entra el último
  });

  it('el giro cae siempre en el jugador elegido y da varias vueltas', () => {
    for (const n of [2, 3, 4, 5, 6]) {
      for (let index = 0; index < n; index++) {
        for (const jitter of [0, 0.5, 1]) {
          for (const current of [0, 137, 2000]) {
            const t = spinTarget(current, n, index, jitter);
            expect(sliceAt(t, n)).toBe(index);
            expect(t - current).toBeGreaterThan(4 * 360 - 1);
          }
        }
      }
    }
  });
});
