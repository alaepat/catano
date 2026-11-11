// Mapas de los escenarios 1-4 de Navegantes (montaje de 4 jugadores del libro, edición 2021).
// La silueta (dónde hay tierra, mar o niebla) es la del libro; dentro de ella, terrenos, números y puertos se
// reparten al azar como permite el apartado "Variable Set-up" de cada escenario.
//
// Las casillas se escriben como (columna, fila) en el marco: 7 columnas de izquierda a derecha y, en cada una,
// la fila crece hacia abajo (las columnas impares van medio hexágono más abajo). Ver `cellId`.
import { CUATRO_ISLAS_GEOMETRY, SEA_GEOMETRY, type Geometry } from './board';
import { NUMBER_TOKENS, PORT_TYPES } from './catan';
import type { GenResult } from './generator';
import { dealNumbers } from './reparto';
import { createRng, randomSeed, shuffle, type Rng } from './rng';
import { countAdjacentPairs, groupSize } from './rules';
import type { Board, MapId, Port, PortType, Terrain } from './types';

export type MapStyle = 'equilibrado' | 'azar';
type Cell = readonly [number, number];

/** Primera fila de cada columna del marco. */
const COL_START = [0, -1, -1, -1, -1, -1, 0];
/** Hexágonos por columna: marco grande (42) y el de Las cuatro islas (35, sin la última fila de cada columna). */
export const COLS_42 = [5, 6, 7, 6, 7, 6, 5];
export const COLS_35 = [4, 5, 6, 5, 6, 5, 4];

/** Id del hexágono de la casilla (columna, fila) en un marco. */
export function cellId(cols: readonly number[], [k, j]: Cell): number {
  const o = j - COL_START[k];
  if (o < 0 || o >= cols[k]) throw new Error(`Casilla fuera del marco: ${k},${j}`);
  return cols.slice(0, k).reduce((a, b) => a + b, 0) + o;
}
const ids = (cols: readonly number[], cells: readonly Cell[]) => cells.map((c) => cellId(cols, c));

const bag = (counts: Partial<Record<Terrain, number>>): Terrain[] =>
  Object.entries(counts).flatMap(([t, n]) => Array<Terrain>(n ?? 0).fill(t as Terrain));

/** Tierra "de verdad" (ni mar ni niebla). */
const isLand = (t: Terrain | undefined) => t != null && t !== 'mar' && t !== 'niebla';

/** El grupo más grande de terrenos iguales entre estos hexágonos (sin desierto). */
function maxGroup(terrains: readonly Terrain[], hexes: readonly number[], geo: Geometry): number {
  return Math.max(...hexes.map((h) => (terrains[h] === 'desierto' ? 0 : groupSize(terrains, h, geo))));
}

/** Islas (grupos de tierra que se tocan) entre estos hexágonos. */
export function islandsIn(terrains: readonly Terrain[], hexes: readonly number[], geo: Geometry): number[][] {
  const pool = new Set(hexes.filter((h) => isLand(terrains[h])));
  const out: number[][] = [];
  for (const start of pool) {
    if (out.some((i) => i.includes(start))) continue;
    const island = [start];
    for (let i = 0; i < island.length; i++) {
      for (const n of geo.hexes[island[i]].neighbors) if (pool.has(n) && !island.includes(n)) island.push(n);
    }
    out.push(island);
  }
  return out;
}

const distinct = (terrains: readonly Terrain[], hexes: readonly number[]) => new Set(hexes.map((h) => terrains[h])).size;

/** Lados donde puede ir un puerto: entre tierra de `land` y mar (o el marco). */
export function landSeaEdges(terrains: readonly Terrain[], land: readonly number[], geo: Geometry): number[] {
  const ok = new Set(land.filter((h) => isLand(terrains[h])));
  return geo.edges
    .filter((e) => e.hexes.filter((h) => ok.has(h)).length === 1 && e.hexes.every((h) => ok.has(h) || terrains[h] === 'mar'))
    .map((e) => e.id);
}

/**
 * 9 puertos (5 de 2:1 y 4 de 3:1) en lados entre tierra de `land` y mar. Sin compartir cruce, ni
 * hexágono de tierra ni de mar. Equilibrado: cada isla de 3 o más hexágonos tiene alguno.
 */
function placePorts(terrains: readonly Terrain[], land: readonly number[], geo: Geometry, rng: Rng, balanced: boolean): Port[] | null {
  const candidates = landSeaEdges(terrains, land, geo).map((id) => geo.edges[id]);
  const islands = islandsIn(terrains, land, geo);
  for (let k = 0; k < 60; k++) {
    const chosen: number[] = [];
    const usedV = new Set<number>();
    const usedH = new Set<number>();
    for (const e of shuffle(candidates, rng)) {
      if (usedV.has(e.a) || usedV.has(e.b) || e.hexes.some((h) => usedH.has(h))) continue;
      chosen.push(e.id);
      usedV.add(e.a).add(e.b);
      e.hexes.forEach((h) => usedH.add(h));
      if (chosen.length === PORT_TYPES.length) break;
    }
    if (chosen.length < PORT_TYPES.length) continue;
    if (balanced && islands.some((isl) => isl.length >= 3 && !chosen.some((e) => geo.edges[e].hexes.some((h) => isl.includes(h))))) continue;
    const types: PortType[] = shuffle(PORT_TYPES, rng);
    return chosen.map((coast, i) => ({ coast, type: types[i] }));
  }
  return null;
}

/** El pirata, en una casilla de mar al azar (mejor si no toca la tierra donde se empieza). */
function placePirate(terrains: readonly Terrain[], start: readonly number[], geo: Geometry, rng: Rng): number {
  const sea = terrains.flatMap((t, i) => (t === 'mar' ? [i] : []));
  const home = new Set(start);
  const far = sea.filter((h) => !geo.hexes[h].neighbors.some((n) => home.has(n)));
  const pick = far.length ? far : sea;
  return pick[Math.floor(rng() * pick.length)];
}

/** Para repartir los números de una zona sin que cuente la tierra de otra (que aún no tiene números). */
const only = (terrains: readonly Terrain[], hexes: readonly number[]): Terrain[] => {
  const keep = new Set(hexes);
  return terrains.map((t, i) => (keep.has(i) ? t : 'mar'));
};

const empty = (geo: Geometry): (number | null)[] => geo.hexes.map(() => null);

interface ScenarioMap {
  map: MapId;
  geo: Geometry;
  generate: (style: MapStyle, rng: Rng) => Board | null;
}

// ---------- 1 · Rumbo a nuevas costas ----------

export const S1_MAIN = ids(COLS_42, [
  [0, 0], [0, 1], [0, 2],
  [1, -1], [1, 0], [1, 1], [1, 2],
  [2, -1], [2, 0], [2, 1], [2, 2], [2, 3],
  [3, -1], [3, 0], [3, 1], [3, 2],
  [4, 0], [4, 1], [4, 2],
]);
const S1_MAIN_SEA = SEA_GEOMETRY.hexes.filter((h) => !S1_MAIN.includes(h.id) && h.neighbors.some((n) => S1_MAIN.includes(n))).map((h) => h.id);
export const S1_SMALL = SEA_GEOMETRY.hexes.map((h) => h.id).filter((h) => !S1_MAIN.includes(h) && !S1_MAIN_SEA.includes(h));
export const S1_MAIN_POOL = bag({ desierto: 1, cereal: 4, colinas: 3, montanas: 3, pasto: 4, bosque: 4 });
export const S1_SMALL_POOL = bag({ mar: 4, oro: 2, cereal: 1, colinas: 2, montanas: 2, pasto: 1, bosque: 1 });
export const S1_SMALL_TOKENS = [2, 3, 4, 5, 6, 8, 9, 10, 11];

const NUEVAS_COSTAS: ScenarioMap = {
  map: 'nuevas-costas',
  geo: SEA_GEOMETRY,
  generate(style, rng) {
    const geo = SEA_GEOMETRY;
    const balanced = style === 'equilibrado';
    const terrains: Terrain[] = geo.hexes.map(() => 'mar');
    shuffle(S1_MAIN_POOL, rng).forEach((t, i) => (terrains[S1_MAIN[i]] = t));
    shuffle(S1_SMALL_POOL, rng).forEach((t, i) => (terrains[S1_SMALL[i]] = t));
    if (balanced && maxGroup(terrains, S1_MAIN, geo) > 2) return null;
    if (balanced && countAdjacentPairs(terrains, (a, b) => a === 'oro' && b === 'oro', geo) > 0) return null;
    // Islas pequeñas: al menos dos, para que haya a dónde navegar.
    if (islandsIn(terrains, S1_SMALL, geo).length < 2) return null;
    const mainLand = S1_MAIN.filter((h) => terrains[h] !== 'desierto');
    const smallLand = S1_SMALL.filter((h) => isLand(terrains[h]));
    const main = dealNumbers(only(terrains, S1_MAIN), empty(geo), mainLand, NUMBER_TOKENS, geo, rng, { balanced }, 40);
    if (!main) return null;
    const numbers = dealNumbers(terrains, main, smallLand, S1_SMALL_TOKENS, geo, rng, { balanced, noRed: (h) => terrains[h] === 'oro', maxSpread: 3 }, 40);
    if (!numbers) return null;
    const ports = placePorts(terrains, S1_MAIN, geo, rng, balanced);
    if (!ports) return null;
    const robber = S1_MAIN.find((h) => terrains[h] === 'desierto')!;
    return { terrains, numbers, ports, robber, pirate: placePirate(terrains, S1_MAIN, geo, rng), map: 'nuevas-costas' };
  },
};

// ---------- 2 · Las cuatro islas ----------

export const S2_ISLANDS = ([
  [[0, 0], [0, 1], [1, -1], [1, 0], [1, 1], [2, -1], [2, 0]],
  [[0, 3], [1, 3], [2, 3], [2, 4]],
  [[4, -1], [4, 0], [5, -1], [6, 0]],
  [[3, 1], [4, 2], [4, 3], [5, 1], [5, 2], [5, 3], [6, 2], [6, 3]],
] as Cell[][]).map((cells) => ids(COLS_35, cells));
const S2_LAND = S2_ISLANDS.flat();
export const S2_POOL = bag({ cereal: 5, colinas: 4, montanas: 4, pasto: 5, bosque: 5 });
export const S2_TOKENS = [2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12];

const CUATRO_ISLAS: ScenarioMap = {
  map: 'cuatro-islas',
  geo: CUATRO_ISLAS_GEOMETRY,
  generate(style, rng) {
    const geo = CUATRO_ISLAS_GEOMETRY;
    const balanced = style === 'equilibrado';
    const terrains: Terrain[] = geo.hexes.map(() => 'mar');
    shuffle(S2_POOL, rng).forEach((t, i) => (terrains[S2_LAND[i]] = t));
    if (balanced && (maxGroup(terrains, S2_LAND, geo) > 2 || S2_ISLANDS.some((isl) => distinct(terrains, isl) < 3))) return null;
    // El libro: que el bosque y el pasto no se queden con números muy malos.
    const poor = (h: number, n: number) => (terrains[h] === 'bosque' || terrains[h] === 'pasto') && [2, 3, 11, 12].includes(n);
    const numbers = dealNumbers(terrains, empty(geo), S2_LAND, S2_TOKENS, geo, rng, { balanced, forbid: poor, maxSpread: 1.2 }, 60);
    if (!numbers) return null;
    const ports = placePorts(terrains, S2_LAND, geo, rng, balanced);
    if (!ports) return null;
    const robber = numbers.indexOf(12);
    return { terrains, numbers, ports, robber, pirate: placePirate(terrains, [], geo, rng), map: 'cuatro-islas' };
  },
};

// ---------- 3 · Islas de niebla ----------

export const S3_ISLANDS = ([
  [[0, 0], [0, 1], [1, -1], [1, 0], [2, -1], [2, 0], [3, -1]],
  [[2, 5], [3, 4], [4, 4], [4, 5], [5, 2], [5, 3], [5, 4], [6, 2], [6, 3], [6, 4]],
] as Cell[][]).map((cells) => ids(COLS_42, cells));
const S3_LAND = S3_ISLANDS.flat();
export const S3_FOG = ids(COLS_42, [[0, 3], [0, 4], [1, 2], [1, 3], [2, 2], [2, 3], [3, 1], [3, 2], [4, 1], [5, -1], [5, 0], [6, 0]]);
export const S3_POOL = bag({ cereal: 3, colinas: 3, montanas: 3, pasto: 4, bosque: 4 });
export const S3_TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 12];

const NIEBLA: ScenarioMap = {
  map: 'niebla',
  geo: SEA_GEOMETRY,
  generate(style, rng) {
    const geo = SEA_GEOMETRY;
    const balanced = style === 'equilibrado';
    const terrains: Terrain[] = geo.hexes.map(() => 'mar');
    shuffle(S3_POOL, rng).forEach((t, i) => (terrains[S3_LAND[i]] = t));
    S3_FOG.forEach((h) => (terrains[h] = 'niebla'));
    if (balanced && (maxGroup(terrains, S3_LAND, geo) > 2 || S3_ISLANDS.some((isl) => distinct(terrains, isl) < 4))) return null;
    const numbers = dealNumbers(terrains, empty(geo), S3_LAND, S3_TOKENS, geo, rng, { balanced, maxSpread: 1.3 }, 60);
    if (!numbers) return null;
    const ports = placePorts(terrains, S3_LAND, geo, rng, balanced);
    if (!ports) return null;
    const robber = numbers.indexOf(12);
    return { terrains, numbers, ports, robber, pirate: placePirate(terrains, S3_LAND, geo, rng), map: 'niebla' };
  },
};

// ---------- 4 · A través del desierto ----------

export const S4_MAIN = ids(COLS_42, [
  [0, 1], [1, -1], [1, 0], [1, 1], [2, -1], [2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [3, 2], [4, 1], [4, 2], [4, 3], [5, 1], [5, 2], [6, 2],
]);
export const S4_DESERTS = ids(COLS_42, [[4, 0], [5, 0], [6, 1]]);
export const S4_FOREIGN = ids(COLS_42, [[4, -1], [5, -1], [6, 0], [0, 3], [0, 4], [2, 4], [2, 5], [4, 5], [5, 4], [6, 4]]);
export const S4_MAIN_POOL = bag({ cereal: 2, colinas: 4, montanas: 2, pasto: 4, bosque: 5 });
export const S4_MAIN_TOKENS = [3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
export const S4_FOREIGN_POOL = bag({ oro: 2, cereal: 3, colinas: 1, montanas: 3, pasto: 1 });
export const S4_FOREIGN_TOKENS = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];

const DESIERTO: ScenarioMap = {
  map: 'desierto',
  geo: SEA_GEOMETRY,
  generate(style, rng) {
    const geo = SEA_GEOMETRY;
    const balanced = style === 'equilibrado';
    const terrains: Terrain[] = geo.hexes.map(() => 'mar');
    shuffle(S4_MAIN_POOL, rng).forEach((t, i) => (terrains[S4_MAIN[i]] = t));
    S4_DESERTS.forEach((h) => (terrains[h] = 'desierto'));
    shuffle(S4_FOREIGN_POOL, rng).forEach((t, i) => (terrains[S4_FOREIGN[i]] = t));
    if (balanced && maxGroup(terrains, S4_MAIN, geo) > 2) return null;
    if (balanced && countAdjacentPairs(terrains, (a, b) => a === 'oro' && b === 'oro', geo) > 0) return null;
    const main = dealNumbers(only(terrains, S4_MAIN), empty(geo), S4_MAIN, S4_MAIN_TOKENS, geo, rng, { balanced, maxSpread: 1.6 }, 40);
    if (!main) return null;
    const numbers = dealNumbers(terrains, main, S4_FOREIGN, S4_FOREIGN_TOKENS, geo, rng, { balanced, noRed: (h) => terrains[h] === 'oro', maxSpread: 3 }, 40);
    if (!numbers) return null;
    const ports = placePorts(terrains, S4_MAIN, geo, rng, balanced);
    if (!ports) return null;
    const robber = S4_DESERTS[Math.floor(rng() * S4_DESERTS.length)];
    return { terrains, numbers, ports, robber, pirate: placePirate(terrains, S4_MAIN, geo, rng), map: 'desierto' };
  },
};

export const SCENARIO_MAPS = { 'nuevas-costas': NUEVAS_COSTAS, 'cuatro-islas': CUATRO_ISLAS, niebla: NIEBLA, desierto: DESIERTO } as const;
export type MappedScenario = keyof typeof SCENARIO_MAPS;

const MAX_TRIES = 4000;

export function generateScenarioMap(id: MappedScenario, style: MapStyle = 'equilibrado', seed: number = randomSeed()): GenResult {
  const rng = createRng(seed);
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    const board = SCENARIO_MAPS[id].generate(style, rng);
    if (board) return { ok: true, board, seed, attempts: attempt };
  }
  return { ok: false, seed, error: 'No se ha podido crear el mapa. Prueba otra vez.' };
}
