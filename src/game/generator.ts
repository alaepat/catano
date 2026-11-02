// Genera un tablero aleatorio que cumple las opciones elegidas.
// Coloca terrenos, después números y después puertos. Si algo no encaja, vuelve a intentarlo
// (con un límite, para no quedarse colgado con combinaciones imposibles).
import { CENTER_HEX, COAST_EDGES, HEXES, OFFICIAL_PORT_COAST, VERTICES, spiralOrder } from './board';
import { NUMBER_TOKENS, PORT_TYPES, SPIRAL_TOKENS, TERRAIN_COUNTS, TERRAINS, isRed, pips, terrainPool } from './catan';
import type { GenOptions } from './options';
import { createRng, randInt, randomSeed, shuffle, type Rng } from './rng';
import { FAIR_SPREAD, RULE_LABELS, findViolations, groupSize, numberViolations, portFits, resourceSpread, type RuleId } from './rules';
import type { Board, Port, PortType, Terrain } from './types';

const MAX_ATTEMPTS = 300;
/** Límite de pasos en cada búsqueda con vuelta atrás. */
const NODE_LIMIT = 4000;

export type GenResult =
  | { ok: true; board: Board; seed: number; attempts: number }
  | { ok: false; seed: number; error: string };

type Stage = 'terrenos' | 'numeros' | 'puertos' | RuleId;

const STAGE_MESSAGES: Record<'terrenos' | 'numeros' | 'puertos', string> = {
  terrenos: 'No se pueden colocar los terrenos con ese límite de terrenos iguales juntos.',
  numeros: 'No hay forma de colocar los números cumpliendo todas las reglas elegidas.',
  puertos: 'No se pueden colocar los puertos como pides.',
};

export function generateBoard(opts: GenOptions, seed: number = randomSeed()): GenResult {
  const rng = createRng(seed);
  const failures = new Map<Stage, number>();
  const fail = (stage: Stage) => failures.set(stage, (failures.get(stage) ?? 0) + 1);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const terrains = placeTerrains(opts, rng);
    if (!terrains) {
      fail('terrenos');
      continue;
    }
    const numbers = opts.numberMethod === 'espiral' ? spiralNumbers(terrains, opts, rng) : placeNumbers(terrains, opts, rng);
    if (!numbers) {
      fail('numeros');
      continue;
    }
    let ports: Port[] = [];
    if (opts.ports) {
      const placed = placePorts(terrains, opts, rng);
      if (!placed) {
        fail('puertos');
        continue;
      }
      ports = placed;
    }
    const desert = terrains.indexOf('desierto');
    const board: Board = { terrains, numbers, ports, robber: opts.robberStart === 'desierto' ? desert : null };
    const broken = findViolations(board, opts);
    if (broken.length === 0) return { ok: true, board, seed, attempts: attempt };
    broken.forEach(fail);
  }

  return { ok: false, seed, error: explainFailure(failures) };
}

function explainFailure(failures: Map<Stage, number>): string {
  const [worst] = [...failures.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['numeros'];
  const reason = worst in STAGE_MESSAGES ? STAGE_MESSAGES[worst as keyof typeof STAGE_MESSAGES] : `${RULE_LABELS[worst as RuleId]}.`;
  return `${reason} Esta combinación de opciones es imposible o casi imposible: prueba a quitar alguna regla.`;
}

// ---------- Terrenos ----------

function chooseDesert(opts: GenOptions, rng: Rng): number {
  if (opts.desert === 'centro') return CENTER_HEX;
  if (opts.desert === 'costa') {
    const coast = HEXES.filter((h) => h.ring === 2);
    return coast[randInt(rng, coast.length)].id;
  }
  return randInt(rng, HEXES.length);
}

function placeTerrains(opts: GenOptions, rng: Rng): Terrain[] | null {
  const desert = chooseDesert(opts, rng);
  const terrains: (Terrain | null)[] = Array(HEXES.length).fill(null);
  terrains[desert] = 'desierto';
  const order = HEXES.map((h) => h.id).filter((id) => id !== desert);

  if (opts.maxTerrainGroup === 0) {
    const pool = shuffle(terrainPool(), rng);
    order.forEach((id, i) => (terrains[id] = pool[i]));
    return terrains as Terrain[];
  }

  const counts: Record<Terrain, number> = { ...TERRAIN_COUNTS, desierto: 0 };
  const types = TERRAINS.filter((t) => t !== 'desierto');
  let nodes = 0;

  const place = (i: number): boolean => {
    if (i === order.length) return true;
    if (++nodes > NODE_LIMIT) return false;
    const id = order[i];
    for (const t of shuffle(types, rng)) {
      if (counts[t] === 0) continue;
      terrains[id] = t;
      if (groupSize(terrains, id) <= opts.maxTerrainGroup) {
        counts[t]--;
        if (place(i + 1)) return true;
        counts[t]++;
      }
      terrains[id] = null;
    }
    return false;
  };

  return place(0) ? (terrains as Terrain[]) : null;
}

// ---------- Números ----------

function spiralNumbers(terrains: Terrain[], opts: GenOptions, rng: Rng): (number | null)[] | null {
  for (const start of shuffle([0, 1, 2, 3, 4, 5], rng)) {
    const numbers: (number | null)[] = Array(HEXES.length).fill(null);
    let k = 0;
    for (const id of spiralOrder(start)) {
      if (terrains[id] !== 'desierto') numbers[id] = SPIRAL_TOKENS[k++];
    }
    if (numberViolations(terrains, numbers, opts).length === 0) return numbers;
  }
  return null;
}

function hasLocalNumberRules(opts: GenOptions): boolean {
  return opts.avoidRedAdjacent || opts.avoidSameAdjacent || opts.avoid2And12Adjacent || opts.maxVertexPips > 0 || opts.noRedsOnCoast;
}

/** ¿Se puede poner el número n en este hexágono sin romper ninguna regla local? */
function numberFits(id: number, n: number, numbers: (number | null)[], opts: GenOptions): boolean {
  const hex = HEXES[id];
  if (opts.noRedsOnCoast && hex.ring === 2 && isRed(n)) return false;
  for (const nb of hex.neighbors) {
    const m = numbers[nb];
    if (m == null) continue;
    if (opts.avoidRedAdjacent && isRed(n) && isRed(m)) return false;
    if (opts.avoidSameAdjacent && n === m) return false;
    if (opts.avoid2And12Adjacent && n + m === 14 && (n === 2 || n === 12)) return false;
  }
  if (opts.maxVertexPips > 0) {
    for (const v of hex.vertices) {
      // Los puntitos de los vecinos ya colocados + este número.
      let sum = pips(n);
      for (const h of vertexHexes[v]) if (h !== id) sum += pips(numbers[h]);
      if (sum > opts.maxVertexPips) return false;
    }
  }
  return true;
}

const vertexHexes = VERTICES.map((v) => v.hexes);

/**
 * Coloca primero las fichas más difíciles (6 y 8, luego 5 y 9...) eligiendo para cada una
 * un hexágono libre al azar donde encaje. Si una no cabe, deshace la anterior y prueba otro sitio.
 */
function backtrackNumbers(free: number[], numbers: (number | null)[], opts: GenOptions, rng: Rng): boolean {
  const tokens = shuffle(NUMBER_TOKENS, rng).sort((a, b) => pips(b) - pips(a));
  const used = new Set<number>();
  let nodes = 0;

  const place = (i: number): boolean => {
    if (i === tokens.length) return true;
    if (++nodes > NODE_LIMIT) return false;
    const n = tokens[i];
    // Dos fichas iguales seguidas: la segunda va en un hexágono "posterior" para no repetir casos.
    const minId = i > 0 && tokens[i - 1] === n ? numbers.indexOf(n) : -1;
    for (const id of shuffle(free, rng)) {
      if (used.has(id) || id <= minId || !numberFits(id, n, numbers, opts)) continue;
      numbers[id] = n;
      used.add(id);
      if (place(i + 1)) return true;
      used.delete(id);
      numbers[id] = null;
    }
    return false;
  };

  return place(0);
}

function placeNumbers(terrains: Terrain[], opts: GenOptions, rng: Rng): (number | null)[] | null {
  const desert = terrains.indexOf('desierto');
  const order = HEXES.map((h) => h.id).filter((id) => id !== desert);
  const local = hasLocalNumberRules(opts);

  for (let tries = 0; tries < 20; tries++) {
    const numbers: (number | null)[] = Array(HEXES.length).fill(null);
    if (local) {
      if (!backtrackNumbers(order, numbers, opts, rng)) return null;
    } else {
      const pool = shuffle(NUMBER_TOKENS, rng);
      order.forEach((id, i) => (numbers[id] = pool[i]));
    }
    if (!opts.fairResources || resourceSpread(terrains, numbers) <= FAIR_SPREAD) return numbers;
  }
  return null;
}

// ---------- Puertos ----------

/** 9 lados de costa al azar, sin dos seguidos (compartirían esquina). */
function randomPortPositions(rng: Rng): number[] | null {
  const total = COAST_EDGES.length;
  for (let t = 0; t < 50; t++) {
    const chosen = new Set<number>();
    for (const c of shuffle([...Array(total).keys()], rng)) {
      if (chosen.has((c + 1) % total) || chosen.has((c + total - 1) % total)) continue;
      chosen.add(c);
      if (chosen.size === PORT_TYPES.length) return [...chosen].sort((a, b) => a - b);
    }
  }
  return null;
}

function assignPortTypes(positions: readonly number[], terrains: Terrain[], opts: GenOptions, rng: Rng): PortType[] | null {
  const remaining = PORT_TYPES.slice();
  const types: PortType[] = [];

  const place = (i: number): boolean => {
    if (i === positions.length) return true;
    const tried = new Set<PortType>();
    for (const type of shuffle(remaining, rng)) {
      if (tried.has(type)) continue;
      tried.add(type);
      if (!portFits(type, positions[i], terrains, opts.portNearResource)) continue;
      types.push(type);
      remaining.splice(remaining.indexOf(type), 1);
      if (place(i + 1)) return true;
      remaining.push(type);
      types.pop();
    }
    return false;
  };

  return place(0) ? types : null;
}

function placePorts(terrains: Terrain[], opts: GenOptions, rng: Rng): Port[] | null {
  const tries = opts.portPositions === 'fijas' ? 1 : 20;
  for (let t = 0; t < tries; t++) {
    const positions = opts.portPositions === 'fijas' ? OFFICIAL_PORT_COAST : randomPortPositions(rng);
    if (!positions) continue;
    const types = assignPortTypes(positions, terrains, opts, rng);
    if (types) return positions.map((coast, i) => ({ coast, type: types[i] }));
  }
  return null;
}
