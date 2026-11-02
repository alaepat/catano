// Comprobaciones de las reglas de montaje. Cada regla dice si el tablero la incumple.
import { CENTER_HEX, COAST_EDGES, HEXES, VERTICES, coastHexOf } from './board';
import { NUMBER_TOKENS, PORT_TYPES, RESOURCES, TERRAINS, TERRAIN_COUNTS, TERRAIN_RESOURCE, isRed, pips } from './catan';
import type { GenOptions } from './options';
import type { Board, Resource, Terrain } from './types';

/** Diferencia máxima permitida (en puntitos por hexágono) entre el mejor y el peor recurso. */
export const FAIR_SPREAD = 1.0;

export type RuleId =
  | 'desierto'
  | 'ladron'
  | 'grupo-terreno'
  | 'rojos-juntos'
  | 'iguales-juntos'
  | '2-12-juntos'
  | 'tope-cruce'
  | 'rojos-costa'
  | 'reparto-justo'
  | 'puerto-recurso';

export const RULE_LABELS: Record<RuleId, string> = {
  desierto: 'El desierto no está donde se pidió',
  ladron: 'El ladrón no empieza donde se pidió',
  'grupo-terreno': 'Demasiados terrenos iguales juntos',
  'rojos-juntos': 'Hay un 6 o un 8 tocando otro 6 u 8',
  'iguales-juntos': 'Hay dos números iguales juntos',
  '2-12-juntos': 'El 2 y el 12 están juntos',
  'tope-cruce': 'Algún cruce supera el tope de puntitos',
  'rojos-costa': 'Hay un 6 u 8 en la costa',
  'reparto-justo': 'Algún recurso tiene números mucho peores que otro',
  'puerto-recurso': 'Los puertos 2:1 no respetan la opción elegida',
};

type Cell<T> = readonly (T | null)[];

/** Tamaño del grupo de terrenos iguales conectados que incluye este hexágono. */
export function groupSize(terrains: Cell<Terrain>, start: number): number {
  const t = terrains[start];
  if (t == null) return 0;
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) {
    const h = stack.pop()!;
    for (const n of HEXES[h].neighbors) {
      if (!seen.has(n) && terrains[n] === t) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return seen.size;
}

/** El grupo más grande de terrenos iguales (sin contar el desierto). */
export function largestTerrainGroup(terrains: Cell<Terrain>): number {
  let max = 0;
  terrains.forEach((t, i) => {
    if (t && t !== 'desierto') max = Math.max(max, groupSize(terrains, i));
  });
  return max;
}

/** Cuántas parejas de hexágonos vecinos cumplen la condición (ambos con valor). */
export function countAdjacentPairs<T>(values: Cell<T>, match: (a: T, b: T) => boolean): number {
  let count = 0;
  for (const hex of HEXES) {
    const a = values[hex.id];
    if (a == null) continue;
    for (const n of hex.neighbors) {
      const b = values[n];
      if (n > hex.id && b != null && match(a, b)) count++;
    }
  }
  return count;
}

/** Puntitos de cada cruce. */
export function vertexPips(numbers: Cell<number>): number[] {
  return VERTICES.map((v) => v.hexes.reduce((sum, h) => sum + pips(numbers[h]), 0));
}

export interface ResourceStat {
  pips: number;
  hexes: number;
  /** Puntitos por hexágono. */
  avg: number;
}

export function resourceStats(terrains: Cell<Terrain>, numbers: Cell<number>): Record<Resource, ResourceStat> {
  const stats = Object.fromEntries(RESOURCES.map((r) => [r, { pips: 0, hexes: 0, avg: 0 }])) as Record<Resource, ResourceStat>;
  terrains.forEach((t, i) => {
    const res = t ? TERRAIN_RESOURCE[t] : null;
    if (!res) return;
    stats[res].pips += pips(numbers[i]);
    stats[res].hexes++;
  });
  for (const r of RESOURCES) stats[r].avg = stats[r].hexes ? stats[r].pips / stats[r].hexes : 0;
  return stats;
}

/** Diferencia de puntitos por hexágono entre el mejor y el peor recurso. */
export function resourceSpread(terrains: Cell<Terrain>, numbers: Cell<number>): number {
  const avgs = Object.values(resourceStats(terrains, numbers)).map((s) => s.avg);
  return Math.max(...avgs) - Math.min(...avgs);
}

const sameAdjacent = (a: number, b: number) => a === b;
const redAdjacent = (a: number, b: number) => isRed(a) && isRed(b);
const twoTwelveAdjacent = (a: number, b: number) => (a === 2 && b === 12) || (a === 12 && b === 2);

/** Reglas que dependen solo de terrenos y números. */
export function numberViolations(terrains: Cell<Terrain>, numbers: Cell<number>, opts: GenOptions): RuleId[] {
  const out: RuleId[] = [];
  if (opts.avoidRedAdjacent && countAdjacentPairs(numbers, redAdjacent) > 0) out.push('rojos-juntos');
  if (opts.avoidSameAdjacent && countAdjacentPairs(numbers, sameAdjacent) > 0) out.push('iguales-juntos');
  if (opts.avoid2And12Adjacent && countAdjacentPairs(numbers, twoTwelveAdjacent) > 0) out.push('2-12-juntos');
  if (opts.maxVertexPips > 0 && Math.max(...vertexPips(numbers)) > opts.maxVertexPips) out.push('tope-cruce');
  if (opts.noRedsOnCoast && HEXES.some((h) => h.ring === 2 && isRed(numbers[h.id]))) out.push('rojos-costa');
  if (opts.fairResources && resourceSpread(terrains, numbers) > FAIR_SPREAD) out.push('reparto-justo');
  return out;
}

/**
 * ¿Puede ir este puerto aquí? "Junto a su recurso" = el hexágono de tierra
 * al que pertenece el lado de costa produce ese recurso.
 */
export function portFits(type: Board['ports'][number]['type'], coast: number, terrains: Cell<Terrain>, mode: GenOptions['portNearResource']): boolean {
  if (type === 'generico' || mode === 'da-igual') return true;
  const t = terrains[coastHexOf(coast)];
  const near = t != null && TERRAIN_RESOURCE[t] === type;
  return mode === 'forzar' ? near : !near;
}

/** Todas las reglas activas que el tablero incumple. Lista vacía = tablero válido. */
export function findViolations(board: Board, opts: GenOptions): RuleId[] {
  const out: RuleId[] = [];
  const desert = board.terrains.indexOf('desierto');
  if (opts.desert === 'centro' && desert !== CENTER_HEX) out.push('desierto');
  if (opts.desert === 'costa' && HEXES[desert]?.ring !== 2) out.push('desierto');
  if (board.robber !== (opts.robberStart === 'desierto' ? desert : null)) out.push('ladron');
  if (opts.maxTerrainGroup > 0 && largestTerrainGroup(board.terrains) > opts.maxTerrainGroup) out.push('grupo-terreno');
  out.push(...numberViolations(board.terrains, board.numbers, opts));
  if (opts.ports && board.ports.some((p) => !portFits(p.type, p.coast, board.terrains, opts.portNearResource))) {
    out.push('puerto-recurso');
  }
  return out;
}

const sortedCopy = <T>(items: readonly T[]) => items.slice().sort();

/** Comprueba que el tablero tiene las piezas correctas del Catan base. Devuelve los fallos. */
export function validateStructure(board: Board): string[] {
  const errors: string[] = [];
  if (board.terrains.length !== HEXES.length) errors.push('No hay 19 hexágonos');
  for (const t of TERRAINS) {
    const count = board.terrains.filter((x) => x === t).length;
    if (count !== TERRAIN_COUNTS[t]) errors.push(`Hay ${count} de ${t} (deberían ser ${TERRAIN_COUNTS[t]})`);
  }
  const desert = board.terrains.indexOf('desierto');
  if (board.numbers[desert] != null) errors.push('El desierto tiene número');
  const nums = board.numbers.filter((n): n is number => n != null);
  if (sortedCopy(nums).join() !== sortedCopy(NUMBER_TOKENS).join()) errors.push('Las fichas de número no son las correctas');
  if (board.robber !== null && board.robber !== desert) errors.push('El ladrón no empieza en el desierto');
  if (board.ports.length !== 0 && board.ports.length !== PORT_TYPES.length) errors.push('Tiene que haber 9 puertos o ninguno');
  if (board.ports.length) {
    if (sortedCopy(board.ports.map((p) => p.type)).join() !== sortedCopy(PORT_TYPES).join()) errors.push('Los tipos de puerto no son los correctos');
    const coasts = board.ports.map((p) => p.coast);
    if (new Set(coasts).size !== coasts.length || coasts.some((c) => c < 0 || c >= COAST_EDGES.length)) {
      errors.push('Posiciones de puerto no válidas');
    }
  }
  return errors;
}
