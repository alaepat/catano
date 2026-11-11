// Mapas de los escenarios 5-8 de Navegantes (libro de reglas, edición 2021), en el marco grande de 49 hexágonos.
// Cada mapa se escribe columna a columna, de arriba abajo, tal como sale en el libro: '~' mar, 'B' bosque, 'P' pasto,
// 'C' cereal, 'H' colinas, 'M' montañas, 'D' desierto, 'O' oro, y el número si lo lleva ('C12' = cereal con un 12).
// Lo que el libro deja variar ("Variable Set-up") se reparte al azar; el resto queda fijo.
// Las piezas especiales (puertos de regalo, aldeas, fortalezas...) se colocan con su posición en el dibujo del libro
// (en píxeles de la página a 150 ppp) y se buscan el lado o cruce más cercano.
import { GRANDE_COLUMNS, GRANDE_GEOMETRY as GEO } from './board';
import type { GenResult } from './generator';
import { maxGroup, only, placePorts } from './mapas';
import { dealNumbers } from './reparto';
import { createRng, randomSeed, shuffle, type Rng } from './rng';
import type { Board, Gift, MapId, Port, PortType, Spot, Terrain } from './types';

type Cell = readonly [number, number];
type MapStyle = 'equilibrado' | 'azar';

const LETTER: Record<string, Terrain> = { '~': 'mar', B: 'bosque', P: 'pasto', C: 'cereal', H: 'colinas', M: 'montanas', D: 'desierto', O: 'oro' };

/** Id de la casilla `i` (desde arriba) de la columna `k`. */
export const gCell = ([k, i]: Cell): number => {
  if (i < 0 || i >= GRANDE_COLUMNS[k]) throw new Error(`Casilla fuera del marco: ${k},${i}`);
  return GRANDE_COLUMNS.slice(0, k).reduce((a, b) => a + b, 0) + i;
};

function parse(cols: string[][]): { terrains: Terrain[]; numbers: (number | null)[] } {
  if (cols.map((c) => c.length).join() !== GRANDE_COLUMNS.join()) throw new Error('Columnas mal escritas');
  const flat = cols.flat();
  return {
    terrains: flat.map((s) => LETTER[s[0]]),
    numbers: flat.map((s) => (s.length > 1 ? Number(s.slice(1)) : null)),
  };
}

/** De píxeles del dibujo del libro a coordenadas del tablero (`off`: cuánto baja ese dibujo respecto al de la página 21). */
const fromPage = (off: number, [x, y]: readonly [number, number]): [number, number] => [(x - 617.5) / 80, (y - 830 - off) / 80.83];

function nearestEdge([x, y]: [number, number]): number {
  let best = 0;
  let dist = Infinity;
  for (const e of GEO.edges) {
    const a = GEO.vertices[e.a];
    const b = GEO.vertices[e.b];
    const d = Math.hypot((a.x + b.x) / 2 - x, (a.y + b.y) / 2 - y);
    if (d < dist) [best, dist] = [e.id, d];
  }
  return best;
}

const H = Math.sqrt(3) / 2;
const DIR = { E: [1, 0], W: [-1, 0], NE: [0.5, -H], NW: [-0.5, -H], SE: [0.5, H], SW: [-0.5, H] } as const;
type Dir = keyof typeof DIR;

/** El cruce de la casilla en esa dirección (los hexágonos tienen un lado plano arriba). */
function corner(cell: Cell, dir: Dir): number {
  const h = GEO.hexes[gCell(cell)];
  const [dx, dy] = DIR[dir];
  let best = 0;
  let dist = Infinity;
  for (const v of GEO.vertices) {
    const d = Math.hypot(v.x - h.x - dx, v.y - h.y - dy);
    if (d < dist) [best, dist] = [v.id, d];
  }
  return best;
}

/** Puertos en los sitios fijos del dibujo, con los tipos al azar (el libro los pone boca abajo y les da la vuelta). */
const fixedPorts = (off: number, spots: readonly (readonly [number, number])[], types: PortType[], rng: Rng): Port[] =>
  shuffle(types, rng).map((type, i) => ({ coast: nearestEdge(fromPage(off, spots[i])), type }));

const SPECIAL: PortType[] = ['madera', 'lana', 'trigo', 'arcilla', 'mineral'];
const generic = (n: number): PortType[] => Array<PortType>(n).fill('generico');

/**
 * Reparte al azar los terrenos y números de `region` (lo demás se queda como en el libro).
 * `poor`: casillas que no pueden llevar números buenos (`banned`).
 */
function shuffleRegion(
  base: { terrains: Terrain[]; numbers: (number | null)[] },
  region: number[],
  style: MapStyle,
  rng: Rng,
  poor: number[] = [],
  banned: number[] = [],
): { terrains: Terrain[]; numbers: (number | null)[] } | null {
  const balanced = style === 'equilibrado';
  const terrains = base.terrains.slice();
  const pool = shuffle(region.map((h) => base.terrains[h]), rng);
  region.forEach((h, i) => (terrains[h] = pool[i]));
  if (balanced && maxGroup(terrains, region, GEO) > 2) return null;
  const tokens = region.flatMap((h) => (base.numbers[h] == null ? [] : [base.numbers[h]!]));
  const fixed = base.numbers.map((n, i) => (region.includes(i) ? null : n));
  const land = region.filter((h) => terrains[h] !== 'desierto');
  if (land.length !== tokens.length) throw new Error('Faltan o sobran números en la zona');
  const forbid = poor.length ? (h: number, n: number) => poor.includes(h) && banned.includes(n) : undefined;
  const numbers = dealNumbers(only(terrains, region), fixed, land, tokens, GEO, rng, { balanced, forbid, maxSpread: 1.5 }, 60);
  return numbers ? { terrains, numbers } : null;
}

const pick = <T,>(xs: readonly T[], rng: Rng): T => xs[Math.floor(rng() * xs.length)];
const deserts = (terrains: readonly Terrain[]) => terrains.flatMap((t, i) => (t === 'desierto' ? [i] : []));
const cells = (list: readonly Cell[]) => list.map(gCell);
const column = (k: number, from: number, to: number): Cell[] => Array.from({ length: to - from + 1 }, (_, n) => [k, from + n] as const);

// ---------- 5 · La tribu olvidada ----------

const TRIBU = parse([
  ['D', 'H', '~', 'H', 'D', 'O'],
  ['~', '~', '~', '~', '~', '~', '~'],
  ['B11', 'C9', 'M3', 'P8', 'H10', 'C3', '~', 'B'],
  ['P10', 'H8', 'P4', 'C12', 'B5', 'P2', '~'],
  ['C6', 'B9', 'M11', 'H5', 'B6', 'M4', '~', 'P'],
  ['~', '~', '~', '~', '~', '~', '~'],
  ['O', 'M', '~', 'D', 'M', 'C'],
]);
/** Isla grande: lo único que se reparte. Las 3 casillas de abajo, sin 5, 6, 8 ni 9. */
export const TRIBU_MAIN = cells([...column(2, 0, 5), ...column(3, 0, 5), ...column(4, 0, 5)]);
const TRIBU_BOTTOM = cells([[2, 5], [3, 5], [4, 5]]);
const TRIBU_CARDS = [[258, 355], [980, 355], [258, 1315], [980, 1315]] as const;
const TRIBU_CHITS = [[190, 520], [1040, 520], [190, 865], [190, 1230], [1040, 940], [1040, 1220], [500, 1390], [740, 1390]] as const;
const TRIBU_PORTS = [[165, 415], [1075, 430], [165, 945], [1065, 840], [415, 1370], [830, 1370]] as const;

function tribu(style: MapStyle, rng: Rng): Board | null {
  const r = shuffleRegion(TRIBU, TRIBU_MAIN, style, rng, TRIBU_BOTTOM, [5, 6, 8, 9]);
  if (!r) return null;
  const gifts: Gift[] = [
    ...TRIBU_CHITS.map((p) => ({ edge: nearestEdge(fromPage(0, p)), kind: 'punto' as const })),
    ...TRIBU_CARDS.map((p) => ({ edge: nearestEdge(fromPage(0, p)), kind: 'carta' as const })),
  ];
  return {
    ...r,
    ports: fixedPorts(0, TRIBU_PORTS, [...SPECIAL, 'generico'], rng),
    robber: pick(deserts(r.terrains), rng),
    pirate: gCell([6, 2]),
    gifts,
    map: 'tribu',
  };
}

// ---------- 6 · Tela para Catan ----------

const TELA = parse([
  ['P10', 'B6', 'M5', 'C10', 'H8', '~'],
  ['H9', 'C2', '~', '~', 'P11', 'M4', '~'],
  ['~', '~', '~', 'O', '~', '~', 'M2', '~'],
  ['~', 'D', '~', '~', 'D', '~', '~'],
  ['C12', '~', '~', 'O', '~', '~', '~', '~'],
  ['C3', 'B12', '~', '~', 'B3', 'M9', '~'],
  ['B4', 'P6', 'H5', 'P11', 'C8', '~'],
]);
/** Las 4 islitas de la tribu (fijas, sin número propio: sus aldeas están en los cruces). */
export const TELA_TRIBE = cells([[3, 1], [2, 3], [4, 3], [3, 4]]);
export const TELA_MAIN = TELA.terrains.flatMap((t, i) => (t !== 'mar' && !TELA_TRIBE.includes(i) ? [i] : []));
/** Aldeas: a izquierda y derecha de cada islita, con su número. */
const TELA_VILLAGES: [Cell, Dir, number][] = [
  [[3, 1], 'W', 9], [[3, 1], 'E', 10], [[2, 3], 'W', 3], [[2, 3], 'E', 6],
  [[4, 3], 'W', 8], [[4, 3], 'E', 11], [[3, 4], 'W', 5], [[3, 4], 'E', 4],
];

function tela(style: MapStyle, rng: Rng): Board | null {
  const r = shuffleRegion(TELA, TELA_MAIN, style, rng);
  if (!r) return null;
  const ports = placePorts(r.terrains, TELA_MAIN, GEO, rng, style === 'equilibrado');
  if (!ports) return null;
  return {
    ...r,
    ports,
    robber: pick(r.numbers.flatMap((n, i) => (n === 12 ? [i] : [])), rng),
    pirate: gCell([3, 6]),
    spots: TELA_VILLAGES.map(([c, d, n]) => ({ vertex: corner(c, d), kind: 'aldea', n })),
    map: 'tela',
  };
}

// ---------- 7 · Las islas piratas (mapa fijo) ----------

const PIRATAS = parse([
  ['O3', 'M6', '~', '~', 'C10', 'H4'],
  ['H', '~', '~', 'P', '~', 'M5', 'B2'],
  ['C10', '~', '~', 'D', '~', 'P11', 'B8', 'P9'],
  ['~', 'M8', '~', '~', 'C6', 'H9', 'P12'],
  ['C4', '~', '~', 'D', '~', 'B3', 'P8', 'B5'],
  ['H', '~', '~', 'D', '~', 'M9', 'B10'],
  ['O11', 'M6', '~', '~', 'C4', 'H5'],
]);
/** Colores de los cuatro jugadores en el dibujo del libro. */
export const PIRATE_COLORS = { naranja: '#e8742a', azul: '#2a6fbf', blanco: '#f2efe8', rojo: '#d23a2e' } as const;
const PIRATAS_SPOTS: [Cell, Dir, Spot['kind'], keyof typeof PIRATE_COLORS][] = [
  [[0, 0], 'W', 'fortaleza', 'naranja'], [[1, 0], 'E', 'fortaleza', 'azul'], [[5, 0], 'W', 'fortaleza', 'blanco'], [[6, 0], 'E', 'fortaleza', 'rojo'],
  [[0, 1], 'SW', 'objetivo', 'naranja'], [[3, 1], 'W', 'objetivo', 'azul'], [[3, 1], 'E', 'objetivo', 'blanco'], [[6, 1], 'SE', 'objetivo', 'rojo'],
  [[0, 4], 'E', 'casa', 'naranja'], [[2, 5], 'NE', 'casa', 'azul'], [[3, 4], 'E', 'casa', 'blanco'], [[5, 5], 'NE', 'casa', 'rojo'],
];
const PIRATAS_PORTS = [[160, 1100], [290, 1300], [400, 1380], [610, 1360], [860, 1360], [980, 1290], [1080, 1135], [1060, 990]] as const;

function piratas(_style: MapStyle, rng: Rng): Board {
  return {
    terrains: PIRATAS.terrains.slice(),
    numbers: PIRATAS.numbers.slice(),
    ports: fixedPorts(10, PIRATAS_PORTS, [...SPECIAL, ...generic(3)], rng),
    robber: null,
    pirate: gCell([0, 3]),
    spots: PIRATAS_SPOTS.map(([c, d, kind, color]) => ({ vertex: corner(c, d), kind, color: PIRATE_COLORS[color] })),
    map: 'piratas',
  };
}

// ---------- 8 · Las maravillas de Catan ----------

const MARAVILLAS = parse([
  ['M5', '~', 'P11', 'P2', '~', 'C5'],
  ['~', 'B3', '~', 'B8', 'C9', '~', 'B4'],
  ['H8', 'P9', '~', '~', 'H10', '~', '~', 'O6'],
  ['M3', 'C4', 'M6', 'P5', 'H4', 'D', '~'],
  ['M12', 'C6', 'H11', 'C10', 'P3', 'B9', 'D', '~'],
  ['~', '~', '~', 'B11', '~', 'D', '~'],
  ['O8', 'H2', '~', 'M10', '~', '~'],
]);
export const MARAVILLAS_MAIN = cells([
  [0, 2], [0, 3], [1, 3], [1, 4], [2, 0], [2, 1], [2, 4], ...column(3, 0, 4), ...column(4, 0, 5), [5, 3], [6, 3],
]);
/** Las dos casillas junto a los desiertos: sin 6 ni 8. */
const MARAVILLAS_NEAR_DESERT = cells([[3, 4], [4, 5]]);
const MARAVILLAS_SPOTS: [Cell, Dir, Spot['kind'], string?][] = [
  [[3, 4], 'SW', 'maravilla', '#7a2a2a'], [[3, 4], 'SE', 'maravilla', '#7a2a2a'], [[4, 5], 'E', 'maravilla', '#7a2a2a'],
  [[4, 5], 'SW', 'maravilla', '#7a2a2a'], [[4, 5], 'SE', 'maravilla', '#7a2a2a'],
  [[1, 1], 'SW', 'maravilla', '#7d3a96'], [[0, 2], 'NE', 'maravilla', '#7d3a96'],
  [[1, 1], 'W', 'peligro'], [[2, 2], 'W', 'peligro'], [[0, 2], 'NW', 'peligro'], [[0, 2], 'E', 'peligro'],
];
const MARAVILLAS_PORTS = [[380, 445], [610, 315], [830, 430], [520, 605], [820, 715], [160, 815], [830, 955], [290, 1030], [460, 1015]] as const;

function maravillas(style: MapStyle, rng: Rng): Board | null {
  const r = shuffleRegion(MARAVILLAS, MARAVILLAS_MAIN, style, rng, MARAVILLAS_NEAR_DESERT, [6, 8]);
  if (!r) return null;
  return {
    ...r,
    ports: fixedPorts(7, MARAVILLAS_PORTS, [...SPECIAL, ...generic(4)], rng),
    robber: pick(deserts(r.terrains), rng),
    pirate: null,
    spots: MARAVILLAS_SPOTS.map(([c, d, kind, color]) => ({ vertex: corner(c, d), kind, color })),
    map: 'maravillas',
  };
}

const MAPS2 = { tribu, tela, piratas, maravillas } as const;
export type MappedScenario2 = keyof typeof MAPS2;
export const isMappedScenario2 = (id: string): id is MappedScenario2 => id in MAPS2;

/** El tablero tal cual lo dibuja el libro (para comprobar que está bien copiado). */
export const BOOK_MAPS: Record<MappedScenario2, { terrains: Terrain[]; numbers: (number | null)[] }> = {
  tribu: TRIBU, tela: TELA, piratas: PIRATAS, maravillas: MARAVILLAS,
};

export function generateScenarioMap2(id: MappedScenario2, style: MapStyle = 'equilibrado', seed: number = randomSeed()): GenResult {
  const rng = createRng(seed);
  for (let attempt = 1; attempt <= 4000; attempt++) {
    const board = MAPS2[id](style, rng);
    if (board) return { ok: true, board: { ...board, map: id as MapId }, seed, attempts: attempt };
  }
  return { ok: false, seed, error: 'No se ha podido crear el mapa. Prueba otra vez.' };
}
