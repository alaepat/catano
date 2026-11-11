// Letras de las fichas: en el Catan de siempre, cada ficha de número lleva una letra (A-R) por detrás.
// Con la opción "Letras", el tablero enseña las letras: así se ponen los primeros poblados sin saber los números.
import { geometryOf } from './board';
import { SPIRAL_TOKENS } from './catan';
import type { Board } from './types';

/** Letras de las fichas del Catan base para cada número (A = 5, B = 2, C = 6...). */
const BASE_LETTERS: Map<number, string[]> = (() => {
  const m = new Map<number, string[]>();
  SPIRAL_TOKENS.forEach((n, i) => m.set(n, [...(m.get(n) ?? []), String.fromCharCode(65 + i)]));
  return m;
})();

/** A, B, ..., Z, AA, AB... */
const nth = (i: number): string => (i < 26 ? String.fromCharCode(65 + i) : nth(Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26)));

/**
 * La letra de cada hexágono con número (null en el resto).
 * En el Catan base, la de la ficha de verdad (si hay dos fichas con el mismo número, cualquiera de las dos vale).
 * En los demás mapas, letras seguidas en el orden en que aparecen los hexágonos (no dicen nada del número).
 */
export function letterLabels(board: Board): (string | null)[] {
  const geo = geometryOf(board);
  const order = geo.hexes.map((h) => h.id).sort((a, b) => geo.revealIndex[a] - geo.revealIndex[b]);
  const labels: (string | null)[] = board.numbers.map(() => null);
  if (geo.id === 'base') {
    const used = new Map<number, number>();
    for (const h of order) {
      const n = board.numbers[h];
      if (n == null) continue;
      const k = used.get(n) ?? 0;
      used.set(n, k + 1);
      labels[h] = BASE_LETTERS.get(n)?.[k] ?? '?';
    }
    return labels;
  }
  let i = 0;
  for (const h of order) if (board.numbers[h] != null) labels[h] = nth(i++);
  return labels;
}
