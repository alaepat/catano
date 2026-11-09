// Navegantes · escenario "Nuevo mundo" (libro de reglas de Catan: Navegantes, edición 2021, escenario 9).
//
// Lo oficial: en el marco de 42 hexágonos se reparten al azar 19 de mar y 23 de tierra (5 campos, 4 colinas,
// 4 montañas, 5 pastos, 5 bosques; sin desierto ni oro). En cada tierra va una ficha (23 fichas) y un 6 y un 8
// nunca pueden tocarse. Hay 9 puertos (5 de 2:1 y 4 de 3:1) en lados entre tierra y mar (o tierra y marco).
// El ladrón y el pirata empiezan fuera. Gana quien llegue a 12 puntos, y cada isla "extranjera" en la que
// alguien construye le da 1 punto extra (una vez por isla).
//
// El libro dice que, si el mapa sale feo (muchas islas pequeñas, o una isla enorme), se puede cambiar:
// el estilo "equilibrado" hace eso solo. El estilo "azar" es el reparto tal cual, con solo la regla del 6 y el 8.
import { SEA_GEOMETRY, type Geometry } from './board';
import { PORT_TYPES, RESOURCES, TERRAIN_RESOURCE, isRed } from './catan';
import type { GenResult } from './generator';
import { PRESET_INFO, type PresetId } from './options';
import { createRng, randomSeed, shuffle, type Rng } from './rng';
import { countAdjacentPairs, resourceSpread, vertexPips } from './rules';
import type { Board, Port, PortType, Terrain } from './types';

export type NuevoMundoStyle = 'equilibrado' | 'azar';

/** Con qué se generó un tablero: un modo del Catan base, el personalizado o Navegantes · Nuevo mundo. */
export type GenMode = PresetId | 'personalizado' | 'nuevo-mundo';

export const NM_INFO = {
  label: 'Nuevo mundo',
  description: 'Navegantes: islas al azar en un mar de 42 hexágonos. Barcos, pirata y 12 puntos para ganar.',
};

export function modeLabel(mode: GenMode): string {
  if (mode === 'personalizado') return 'Personalizado';
  if (mode === 'nuevo-mundo') return NM_INFO.label;
  return PRESET_INFO[mode].label;
}

/** Hexágonos de Nuevo mundo (19 de mar + 23 de tierra = 42). */
export const NM_TERRAIN_COUNTS: Partial<Record<Terrain, number>> = {
  mar: 19,
  cereal: 5,
  colinas: 4,
  montanas: 4,
  pasto: 5,
  bosque: 5,
};

/** Las 23 fichas de número de Nuevo mundo. */
export const NM_NUMBER_TOKENS = [2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 12];

/** Puntos para ganar en Nuevo mundo. */
export const NM_GOAL = 12;

const MAX_LAYOUTS = 3000;
const NUMBER_TRIES = 200;

const isLand = (t: Terrain | null | undefined) => t != null && t !== 'mar';

/** Islas: grupos de hexágonos de tierra que se tocan (cada una, lista de ids). */
export function islandsOf(terrains: readonly Terrain[], geo: Geometry = SEA_GEOMETRY): number[][] {
  const seen = new Set<number>();
  const out: number[][] = [];
  terrains.forEach((t, start) => {
    if (!isLand(t) || seen.has(start)) return;
    const island = [start];
    seen.add(start);
    for (let i = 0; i < island.length; i++) {
      for (const n of geo.hexes[island[i]].neighbors) {
        if (!seen.has(n) && isLand(terrains[n])) {
          seen.add(n);
          island.push(n);
        }
      }
    }
    out.push(island);
  });
  return out.sort((a, b) => b.length - a.length);
}

function terrainBag(): Terrain[] {
  return Object.entries(NM_TERRAIN_COUNTS).flatMap(([t, n]) => Array<Terrain>(n ?? 0).fill(t as Terrain));
}

/** Islas razonables: ni todo un continente ni un archipiélago de migas, y recursos repartidos. */
export function goodIslands(terrains: readonly Terrain[], geo: Geometry = SEA_GEOMETRY): boolean {
  const islands = islandsOf(terrains, geo);
  if (islands.length < 3 || islands.length > 6) return false;
  if (islands[0].length < 6 || islands[0].length > 11) return false;
  if (islands.filter((i) => i.length === 1).length > 2) return false;
  // La isla grande (donde suele empezar todo el mundo) tiene al menos 4 de los 5 recursos...
  const big = new Set(islands[0].map((h) => TERRAIN_RESOURCE[terrains[h]]));
  if (RESOURCES.filter((r) => big.has(r)).length < 4) return false;
  // ...y cada recurso está en al menos 2 islas, para que merezca la pena navegar.
  return RESOURCES.every((r) => islands.filter((i) => i.some((h) => TERRAIN_RESOURCE[terrains[h]] === r)).length >= 2);
}

function placeNumbers(terrains: readonly Terrain[], style: NuevoMundoStyle, rng: Rng, geo: Geometry): (number | null)[] | null {
  const land = terrains.flatMap((t, i) => (isLand(t) ? [i] : []));
  for (let k = 0; k < NUMBER_TRIES; k++) {
    const tokens = shuffle(NM_NUMBER_TOKENS, rng);
    const numbers: (number | null)[] = terrains.map(() => null);
    land.forEach((h, i) => (numbers[h] = tokens[i]));
    if (countAdjacentPairs(numbers, (a, b) => isRed(a) && isRed(b), geo) > 0) continue;
    if (style === 'equilibrado') {
      if (countAdjacentPairs(numbers, (a, b) => a === b, geo) > 0) continue;
      if (countAdjacentPairs(numbers, (a, b) => (a === 2 && b === 12) || (a === 12 && b === 2), geo) > 0) continue;
      if (Math.max(...vertexPips(numbers, geo)) > 12) continue;
      if (resourceSpread(terrains, numbers) > 1.0) continue;
    }
    return numbers;
  }
  return null;
}

/** Lados donde puede ir un puerto: entre tierra y mar, o entre tierra y el marco. */
export function portEdges(terrains: readonly Terrain[], geo: Geometry = SEA_GEOMETRY): number[] {
  return geo.edges.filter((e) => e.hexes.filter((h) => isLand(terrains[h])).length === 1).map((e) => e.id);
}

/** El hexágono de tierra de un lado de puerto. */
export function portLandHex(edge: number, terrains: readonly Terrain[], geo: Geometry = SEA_GEOMETRY): number {
  return geo.edges[edge].hexes.find((h) => isLand(terrains[h]))!;
}

function placePorts(terrains: readonly Terrain[], style: NuevoMundoStyle, rng: Rng, geo: Geometry): Port[] | null {
  const candidates = portEdges(terrains, geo);
  const islands = islandsOf(terrains, geo);
  const islandOf = new Map<number, number>();
  islands.forEach((isl, i) => isl.forEach((h) => islandOf.set(h, i)));

  for (let k = 0; k < 40; k++) {
    const chosen: number[] = [];
    const usedVertices = new Set<number>();
    const usedHexes = new Set<number>();
    const usedSea = new Set<number>();
    const perIsland = new Map<number, number>();
    for (const e of shuffle(candidates, rng)) {
      const edge = geo.edges[e];
      const hex = portLandHex(e, terrains, geo);
      const isl = islandOf.get(hex)!;
      // Dos puertos no pueden compartir esquina, ni (para que se repartan) estar en el mismo hexágono.
      // Tampoco dos fichas sobre el mismo hexágono de mar (se taparían).
      const seaHex = edge.hexes.find((h) => h !== hex);
      if (usedVertices.has(edge.a) || usedVertices.has(edge.b) || usedHexes.has(hex)) continue;
      if (seaHex !== undefined && usedSea.has(seaHex)) continue;
      // Equilibrado: ninguna isla se queda con muchos más puertos de los que le tocan por tamaño.
      if (style === 'equilibrado' && (perIsland.get(isl) ?? 0) >= Math.ceil((islands[isl].length / 23) * 9) + 1) continue;
      chosen.push(e);
      usedVertices.add(edge.a).add(edge.b);
      usedHexes.add(hex);
      if (seaHex !== undefined) usedSea.add(seaHex);
      perIsland.set(isl, (perIsland.get(isl) ?? 0) + 1);
      if (chosen.length === PORT_TYPES.length) break;
    }
    if (chosen.length < PORT_TYPES.length) continue;
    // Equilibrado: toda isla de 3 o más hexágonos tiene algún puerto.
    if (style === 'equilibrado' && islands.some((isl, i) => isl.length >= 3 && !perIsland.get(i))) continue;
    const types: PortType[] = shuffle(PORT_TYPES, rng);
    return chosen.map((coast, i) => ({ coast, type: types[i] }));
  }
  return null;
}

export function generateNuevoMundo(style: NuevoMundoStyle = 'equilibrado', seed: number = randomSeed()): GenResult {
  const geo = SEA_GEOMETRY;
  const rng = createRng(seed);
  for (let attempt = 1; attempt <= MAX_LAYOUTS; attempt++) {
    const terrains = shuffle(terrainBag(), rng);
    if (style === 'equilibrado' && !goodIslands(terrains, geo)) continue;
    // Con el reparto tal cual, al menos que no salga todo pegado ni todo migas sueltas (casi nunca pasa).
    if (style === 'azar' && islandsOf(terrains, geo).length < 2) continue;
    const numbers = placeNumbers(terrains, style, rng, geo);
    if (!numbers) continue;
    const ports = placePorts(terrains, style, rng, geo);
    if (!ports) continue;
    const board: Board = { terrains, numbers, ports, robber: null, map: 'nuevo-mundo' };
    return { ok: true, board, seed, attempts: attempt };
  }
  return { ok: false, seed, error: 'No se ha podido crear un Nuevo mundo. Prueba otra vez.' };
}

/** Comprueba que un mapa de Nuevo mundo tiene las piezas correctas. Devuelve los fallos. */
export function validateNuevoMundo(board: Board): string[] {
  const geo = SEA_GEOMETRY;
  const errors: string[] = [];
  if (board.map !== 'nuevo-mundo') errors.push('No es un mapa de Nuevo mundo');
  if (board.terrains.length !== geo.hexes.length) errors.push('No hay 42 hexágonos');
  for (const [t, n] of Object.entries(NM_TERRAIN_COUNTS)) {
    const count = board.terrains.filter((x) => x === t).length;
    if (count !== n) errors.push(`Hay ${count} de ${t} (deberían ser ${n})`);
  }
  board.terrains.forEach((t, i) => {
    if (isLand(t) !== (board.numbers[i] != null)) errors.push(`El hexágono ${i} ${isLand(t) ? 'no tiene' : 'tiene'} número`);
  });
  const nums = board.numbers.filter((n): n is number => n != null).sort((a, b) => a - b);
  if (nums.join() !== NM_NUMBER_TOKENS.join()) errors.push('Las fichas de número no son las correctas');
  if (countAdjacentPairs(board.numbers, (a, b) => isRed(a) && isRed(b), geo) > 0) errors.push('Hay un 6 o un 8 juntos');
  if (board.robber !== null) errors.push('El ladrón debe empezar fuera');
  const valid = new Set(portEdges(board.terrains, geo));
  if (board.ports.length !== PORT_TYPES.length) errors.push('Tiene que haber 9 puertos');
  if (board.ports.some((p) => !valid.has(p.coast))) errors.push('Hay un puerto que no está entre tierra y mar');
  if ([...board.ports.map((p) => p.type)].sort().join() !== [...PORT_TYPES].sort().join()) errors.push('Los tipos de puerto no son los correctos');
  return errors;
}
