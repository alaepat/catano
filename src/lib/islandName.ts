// Nombre aleatorio para cada isla ("Bahía del Trigo Maldito"). Sale siempre el mismo para la misma semilla.
import { analyzeBoard, createRng, type Board, type Resource } from '../game';
import nombres from '../data/nombres-isla.json';

export interface NameParts {
  lugares: string[];
  detalles: string[];
  porRecurso: Record<Resource, string[]>;
  bromas: string[];
}

const pick = <T,>(list: readonly T[], r: number): T => list[Math.floor(r * list.length) % list.length];

export function islandName(board: Board, seed: number, parts: NameParts = nombres as NameParts): string {
  const rng = createRng(seed ^ 0x51a7d);
  const lugar = pick(parts.lugares, rng());
  const roll = rng();
  let detalle: string;
  if (parts.bromas.length > 0 && roll < 0.25) detalle = pick(parts.bromas, rng());
  // La mitad de las veces, el nombre habla del recurso que más abunda en esa isla.
  else if (roll < 0.6) detalle = pick(parts.porRecurso[analyzeBoard(board).richest], rng());
  else detalle = pick(parts.detalles, rng());
  return `${lugar} ${detalle}`;
}
