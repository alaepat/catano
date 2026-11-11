// Reparto al azar de números y puertos, común a la ampliación 5-6 y a los escenarios de Navegantes.
import type { Geometry } from './board';
import { isRed } from './catan';
import { shuffle, type Rng } from './rng';
import { countAdjacentPairs, resourceSpread, vertexPips } from './rules';
import type { Port, PortType, Terrain } from './types';

export interface DealRules {
  /** Equilibrado: sin números iguales juntos, 2 y 12 separados, tope de puntitos por cruce y reparto justo. */
  balanced: boolean;
  /** Hexágonos donde no puede ir un 6 ni un 8 (por ejemplo, el oro). */
  noRed?: (hex: number) => boolean;
  /** Otras prohibiciones (por ejemplo, "junto al desierto, nada de 5, 6, 8 ni 9"). */
  forbid?: (hex: number, n: number) => boolean;
  /** Tope de diferencia entre recursos (puntitos por hexágono). */
  maxSpread?: number;
}

/**
 * Reparte `tokens` en los hexágonos `hexes` (el resto de `fixed` se respeta). Siempre: un 6 y un 8 nunca juntos.
 * Devuelve los números de todo el tablero, o null si no lo consigue.
 */
export function dealNumbers(
  terrains: readonly Terrain[],
  fixed: readonly (number | null)[],
  hexes: readonly number[],
  tokens: readonly number[],
  geo: Geometry,
  rng: Rng,
  rules: DealRules,
  tries = 300,
): (number | null)[] | null {
  const reds = tokens.filter(isRed);
  const others = tokens.filter((n) => !isRed(n));
  const fixedRed = new Set(fixed.flatMap((n, i) => (isRed(n) ? [i] : [])));
  for (let k = 0; k < tries; k++) {
    // Primero los rojos, en sitios que no se toquen; luego el resto.
    const chosen = new Set<number>();
    for (const h of shuffle(hexes, rng)) {
      if (chosen.size === reds.length) break;
      if (rules.noRed?.(h)) continue;
      if (geo.hexes[h].neighbors.some((n) => chosen.has(n) || fixedRed.has(n))) continue;
      chosen.add(h);
    }
    if (chosen.size < reds.length) continue;
    const numbers = fixed.slice();
    const redList = shuffle(reds, rng);
    [...chosen].forEach((h, i) => (numbers[h] = redList[i]));
    if (rules.forbid) {
      const free = shuffle(hexes.filter((h) => !chosen.has(h)), rng);
      // Con prohibiciones, primero las fichas que tienen sitios vetados, cada una en un hueco donde pueda ir.
      const vetoed = (n: number) => free.some((h) => rules.forbid!(h, n));
      const rest = shuffle(others, rng).sort((a, b) => Number(vetoed(b)) - Number(vetoed(a)));
      const left = new Set(free);
      for (const n of rest) {
        const h = [...left].find((x) => !rules.forbid!(x, n)) ?? [...left][0];
        numbers[h] = n;
        left.delete(h);
      }
    } else {
      const rest = shuffle(others, rng);
      hexes.filter((h) => !chosen.has(h)).forEach((h, i) => (numbers[h] = rest[i]));
    }
    if (rules.forbid && hexes.some((h) => rules.forbid!(h, numbers[h]!))) continue;
    if (rules.balanced) {
      if (countAdjacentPairs(numbers, (a, b) => a === b, geo) > 0) continue;
      if (countAdjacentPairs(numbers, (a, b) => (a === 2 && b === 12) || (a === 12 && b === 2), geo) > 0) continue;
      if (Math.max(...vertexPips(numbers, geo)) > 12) continue;
      if (resourceSpread(terrains, numbers) > (rules.maxSpread ?? 1.0)) continue;
    }
    return numbers;
  }
  return null;
}

/** Puertos repartidos por igual alrededor de una isla (sin compartir cruce), con los tipos al azar. */
export function spreadPorts(geo: Geometry, types: readonly PortType[], rng: Rng): Port[] {
  const c = geo.coast.length;
  const offset = Math.floor(rng() * c);
  const kinds = shuffle(types, rng);
  return kinds.map((type, i) => ({ coast: (offset + Math.round((i * c) / kinds.length)) % c, type }));
}
