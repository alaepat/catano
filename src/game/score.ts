// Puntuación de equilibrio (0-100) y análisis del tablero.
import { geometryOf } from './board';
import { RESOURCES, isRed } from './catan';
import { countAdjacentPairs, resourceSpread, resourceStats, vertexPips } from './rules';
import type { Board, Resource } from './types';

/**
 * 100 = muy equilibrado. Resta puntos por:
 * - cada pareja de 6/8 juntos (-15)
 * - cada pareja de números iguales juntos (-5)
 * - cada puntito del mejor cruce por encima de 11 (-6)
 * - diferencia entre recursos por encima de 0,5 puntitos/hexágono (-12 por puntito)
 * - parejas de terrenos iguales juntos por encima de 3 (-2 cada una)
 */
export function balanceScore(board: Board): number {
  const geo = geometryOf(board);
  let score = 100;
  score -= 15 * countAdjacentPairs(board.numbers, (a, b) => isRed(a) && isRed(b), geo);
  score -= 5 * countAdjacentPairs(board.numbers, (a, b) => a === b, geo);
  score -= 6 * Math.max(0, Math.max(...vertexPips(board.numbers, geo)) - 11);
  score -= 12 * Math.max(0, resourceSpread(board.terrains, board.numbers) - 0.5);
  const sameTerrain = countAdjacentPairs(board.terrains, (a, b) => a === b && a !== 'desierto' && a !== 'mar', geo);
  score -= 2 * Math.max(0, sameTerrain - 3);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export interface BoardAnalysis {
  score: number;
  /** Los mejores cruces: id y puntitos. */
  bestVertices: { vertex: number; pips: number }[];
  /** El recurso con menos puntitos en total. */
  scarcest: Resource;
  /** El recurso con más puntitos en total. */
  richest: Resource;
}

export function analyzeBoard(board: Board, topVertices = 3): BoardAnalysis {
  const vp = vertexPips(board.numbers, geometryOf(board));
  const bestVertices = vp
    .map((pips, vertex) => ({ vertex, pips }))
    .sort((a, b) => b.pips - a.pips)
    .slice(0, topVertices);
  const stats = resourceStats(board.terrains, board.numbers);
  const byPips = RESOURCES.slice().sort((a, b) => stats[a].pips - stats[b].pips);
  return { score: balanceScore(board), bestVertices, scarcest: byPips[0], richest: byPips[byPips.length - 1] };
}
