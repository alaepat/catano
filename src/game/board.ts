// Geometría de los tableros, en coordenadas axiales (q, r):
// - Catan base: 19 hexágonos "de punta" (filas 3-4-5-4-3), 54 cruces y 72 caminos.
// - Navegantes (Nuevo mundo): el marco de 42 hexágonos "de lado plano arriba", en columnas 5-6-7-6-7-6-5,
//   como en el dibujo del libro de reglas.
import type { Edge, Hex, MapId, Vertex } from './types';

const SQRT3 = Math.sqrt(3);

/** Vecinos en orden: este, noreste, noroeste, oeste, suroeste, sureste (en pantalla). */
export const AXIAL_DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
];

const pointKey = (x: number, y: number) => `${Math.round(x * 1000)},${Math.round(y * 1000)}`;

function baseCoords(): [number, number][] {
  const coords: [number, number][] = [];
  for (let r = -2; r <= 2; r++) {
    for (let q = -2; q <= 2; q++) {
      if (Math.abs(q + r) <= 2) coords.push([q, r]);
    }
  }
  return coords;
}

/** Marco de Navegantes: 7 columnas de 5-6-7-6-7-6-5 hexágonos (42), de izquierda a derecha y de arriba abajo. */
const SEA_COLUMNS = [5, 6, 7, 6, 7, 6, 5];
function seaCoords(): [number, number][] {
  const coords: [number, number][] = [];
  SEA_COLUMNS.forEach((n, c) => {
    const q = c - 3;
    for (let j = 0; j < n; j++) coords.push([q, j - (n - 1) / 2 - q / 2 + 1 / 2]);
  });
  return coords;
}

/** `flat` = hexágonos con un lado plano arriba (si no, con una punta arriba). */
function build(coords: [number, number][], flat: boolean) {
  const center = (q: number, r: number): [number, number] => (flat ? [1.5 * q, SQRT3 * (r + q / 2)] : [SQRT3 * (q + r / 2), 1.5 * r]);
  // Centra el tablero en (0, 0).
  const cs = coords.map(([q, r]) => center(q, r));
  const mid = (k: 0 | 1) => (Math.min(...cs.map((c) => c[k])) + Math.max(...cs.map((c) => c[k]))) / 2;
  const ox = mid(0);
  const oy = mid(1);
  const index = new Map<string, number>();
  coords.forEach(([q, r], i) => index.set(`${q},${r}`, i));

  const hexes: Hex[] = [];
  const vertices: Vertex[] = [];
  const edges: Edge[] = [];
  const vertexIndex = new Map<string, number>();
  const edgeIndex = new Map<string, number>();

  coords.forEach(([q, r], id) => {
    const x = cs[id][0] - ox;
    const y = cs[id][1] - oy;

    const neighbors: number[] = [];
    for (const [dq, dr] of AXIAL_DIRS) {
      const n = index.get(`${q + dq},${r + dr}`);
      if (n !== undefined) neighbors.push(n);
    }

    const vids: number[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - (flat ? 0 : 30));
      const vx = x + Math.cos(angle);
      const vy = y + Math.sin(angle);
      const key = pointKey(vx, vy);
      let v = vertexIndex.get(key);
      if (v === undefined) {
        v = vertices.length;
        vertexIndex.set(key, v);
        vertices.push({ id: v, x: vx, y: vy, hexes: [] });
      }
      vertices[v].hexes.push(id);
      vids.push(v);
    }

    for (let i = 0; i < 6; i++) {
      const a = Math.min(vids[i], vids[(i + 1) % 6]);
      const b = Math.max(vids[i], vids[(i + 1) % 6]);
      const key = `${a}-${b}`;
      let e = edgeIndex.get(key);
      if (e === undefined) {
        e = edges.length;
        edgeIndex.set(key, e);
        edges.push({ id: e, a, b, hexes: [] });
      }
      edges[e].hexes.push(id);
    }

    const ring = flat ? Math.round(Math.hypot(x, y) / SQRT3) : Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
    hexes.push({ id, q, r, x, y, ring, neighbors, vertices: vids });
  });

  // Lados de costa, ordenados alrededor de la isla (sentido antihorario en pantalla).
  const coast = edges
    .filter((e) => e.hexes.length === 1)
    .map((e) => {
      const mx = (vertices[e.a].x + vertices[e.b].x) / 2;
      const my = (vertices[e.a].y + vertices[e.b].y) / 2;
      return { id: e.id, angle: Math.atan2(-my, mx) };
    })
    .sort((p, q) => p.angle - q.angle)
    .map((p) => p.id);

  const radius = Math.max(...vertices.map((v) => Math.hypot(v.x, v.y)));
  // Orden de aparición: del centro hacia fuera, girando.
  const revealIndex: number[] = [];
  hexes
    .slice()
    .sort((a, b) => a.ring - b.ring || Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x))
    .forEach((h, i) => (revealIndex[h.id] = i));

  return { hexes, vertices, edges, coast, index, radius, revealIndex };
}

export interface Geometry {
  id: MapId;
  hexes: readonly Hex[];
  vertices: readonly Vertex[];
  edges: readonly Edge[];
  /** Hexágonos con un lado plano arriba (Navegantes) o con una punta arriba (base). */
  flat: boolean;
  /** Distancia del centro al cruce más lejano (en radios de hexágono). */
  radius: number;
  /** Orden de aparición de cada hexágono en la animación (por id). */
  revealIndex: readonly number[];
}

const built = build(baseCoords(), false);
const sea = build(seaCoords(), true);

export const BASE_GEOMETRY: Geometry = {
  id: 'base', hexes: built.hexes, vertices: built.vertices, edges: built.edges, flat: false, radius: built.radius, revealIndex: built.revealIndex,
};
export const SEA_GEOMETRY: Geometry = {
  id: 'nuevo-mundo', hexes: sea.hexes, vertices: sea.vertices, edges: sea.edges, flat: true, radius: sea.radius, revealIndex: sea.revealIndex,
};

/** Geometría de un tablero (los guardados antes de Navegantes no dicen nada: son del base). */
export function geometryOf(board: { map?: MapId }): Geometry {
  return board.map === 'nuevo-mundo' ? SEA_GEOMETRY : BASE_GEOMETRY;
}

/** Lado donde está un puerto: en el base, `coast` es la posición en la costa; en Navegantes, el id del lado. */
export function portEdge(geo: Geometry, coast: number): Edge {
  return geo.id === 'base' ? built.edges[built.coast[coast]] : geo.edges[coast];
}

export const HEXES: readonly Hex[] = built.hexes;
export const VERTICES: readonly Vertex[] = built.vertices;
export const EDGES: readonly Edge[] = built.edges;
/** Ids de los 30 caminos de costa, en orden alrededor de la isla. */
export const COAST_EDGES: readonly number[] = built.coast;
export const CENTER_HEX: number = built.index.get('0,0')!;

export function hexAt(q: number, r: number): number | undefined {
  return built.index.get(`${q},${r}`);
}

/** Hexágono de tierra al que pertenece un lado de costa. */
export function coastHexOf(coastIndex: number): number {
  return EDGES[COAST_EDGES[coastIndex]].hexes[0];
}

/**
 * Orden de la espiral oficial: empieza en una esquina exterior (0-5),
 * recorre la costa en sentido antihorario, luego el anillo medio y acaba en el centro.
 */
export function spiralOrder(startCorner: number): number[] {
  const out: number[] = [];
  for (let k = 2; k >= 1; k--) {
    const [sq, sr] = AXIAL_DIRS[(startCorner + 4) % 6];
    let q = sq * k;
    let r = sr * k;
    for (let i = 0; i < 6; i++) {
      const [dq, dr] = AXIAL_DIRS[(startCorner + i) % 6];
      for (let j = 0; j < k; j++) {
        out.push(hexAt(q, r)!);
        q += dq;
        r += dr;
      }
    }
  }
  out.push(CENTER_HEX);
  return out;
}

/**
 * Posiciones fijas de los 9 puertos en la costa (índices de COAST_EDGES),
 * repartidos con separaciones 3-3-4. Aproximación al marco de la 5.ª edición.
 */
export const OFFICIAL_PORT_COAST: readonly number[] = [0, 3, 6, 10, 13, 16, 20, 23, 26];
