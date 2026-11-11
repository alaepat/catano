// Ampliación de Catan para 5-6 jugadores: 30 hexágonos en filas 3-4-5-6-5-4-3.
// Trae 11 hexágonos más (2 de cada terreno y 1 desierto), 10 fichas de número más y 2 puertos más
// (uno 3:1 y uno 2:1 de lana). Regla nueva: la fase especial de construcción entre turnos.
import { CINCO_SEIS_GEOMETRY } from './board';
import { isRed } from './catan';
import type { GenResult } from './generator';
import { dealNumbers, spreadPorts } from './reparto';
import { createRng, randomSeed, shuffle } from './rng';
import { countAdjacentPairs, groupSize } from './rules';
import type { Board, PortType, Terrain } from './types';

export type CincoSeisStyle = 'equilibrado' | 'azar';

export const CS_TERRAIN_COUNTS: Partial<Record<Terrain, number>> = {
  bosque: 6,
  pasto: 6,
  cereal: 6,
  colinas: 5,
  montanas: 5,
  desierto: 2,
};

/** Las 28 fichas: las 18 del base y 2, 3, 4, 5, 6, 8, 9, 10, 11 y 12 de la ampliación. */
export const CS_NUMBER_TOKENS = [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12];

/** 11 puertos: 5 de 3:1 y 6 de 2:1 (dos de lana). */
export const CS_PORT_TYPES: PortType[] = [
  'generico', 'generico', 'generico', 'generico', 'generico',
  'madera', 'lana', 'lana', 'trigo', 'arcilla', 'mineral',
];

export const CS_INFO = {
  label: '5-6 jugadores',
  description: 'La isla grande de la ampliación: 30 hexágonos, 2 desiertos y 11 puertos.',
};

const MAX_LAYOUTS = 2000;

function bag(): Terrain[] {
  return Object.entries(CS_TERRAIN_COUNTS).flatMap(([t, n]) => Array<Terrain>(n ?? 0).fill(t as Terrain));
}

export function generateCincoSeis(style: CincoSeisStyle = 'equilibrado', seed: number = randomSeed()): GenResult {
  const geo = CINCO_SEIS_GEOMETRY;
  const rng = createRng(seed);
  for (let attempt = 1; attempt <= MAX_LAYOUTS; attempt++) {
    const terrains = shuffle(bag(), rng);
    if (style === 'equilibrado') {
      // Nada de 3 terrenos iguales juntos, ni los dos desiertos pegados.
      if (terrains.some((t, i) => t !== 'desierto' && groupSize(terrains, i, geo) > 2)) continue;
      if (countAdjacentPairs(terrains, (a, b) => a === 'desierto' && b === 'desierto', geo) > 0) continue;
    }
    const land = terrains.flatMap((t, i) => (t === 'desierto' ? [] : [i]));
    const numbers = dealNumbers(terrains, terrains.map(() => null), land, CS_NUMBER_TOKENS, geo, rng, { balanced: style === 'equilibrado' });
    if (!numbers) continue;
    const ports = spreadPorts(geo, CS_PORT_TYPES, rng);
    const board: Board = { terrains, numbers, ports, robber: terrains.indexOf('desierto'), map: 'cinco-seis' };
    return { ok: true, board, seed, attempts: attempt };
  }
  return { ok: false, seed, error: 'No se ha podido crear la isla de 5-6 jugadores. Prueba otra vez.' };
}

/** Comprueba que un tablero de 5-6 tiene las piezas correctas. Devuelve los fallos. */
export function validateCincoSeis(board: Board): string[] {
  const geo = CINCO_SEIS_GEOMETRY;
  const errors: string[] = [];
  if (board.terrains.length !== 30) errors.push('No hay 30 hexágonos');
  for (const [t, n] of Object.entries(CS_TERRAIN_COUNTS)) {
    const count = board.terrains.filter((x) => x === t).length;
    if (count !== n) errors.push(`Hay ${count} de ${t} (deberían ser ${n})`);
  }
  const nums = board.numbers.filter((n): n is number => n != null).sort((a, b) => a - b);
  if (nums.join() !== CS_NUMBER_TOKENS.join()) errors.push('Las fichas de número no son las correctas');
  if (countAdjacentPairs(board.numbers, (a, b) => isRed(a) && isRed(b), geo) > 0) errors.push('Hay un 6 o un 8 juntos');
  if (board.robber == null || board.terrains[board.robber] !== 'desierto') errors.push('El ladrón no está en un desierto');
  if (board.ports.length !== 11) errors.push('Tiene que haber 11 puertos');
  const used = new Set<number>();
  for (const p of board.ports) {
    const e = geo.edges[geo.coast[p.coast]];
    if (!e || e.hexes.length !== 1) errors.push('Hay un puerto fuera de la costa');
    else if (used.has(e.a) || used.has(e.b)) errors.push('Dos puertos comparten cruce');
    else used.add(e.a).add(e.b);
  }
  return errors;
}
