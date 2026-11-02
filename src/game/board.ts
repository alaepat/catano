// Geometría fija del tablero base: 19 hexágonos (filas 3-4-5-4-3), 54 cruces y 72 caminos.
// Hexágonos "de punta" (pointy-top) en coordenadas axiales (q, r).
import type { Edge, Hex, Vertex } from './types';

const SQRT3 = Math.sqrt(3);

/** Vecinos en orden: este, noreste, noroeste, oeste, suroeste, sureste (en pantalla). */
export const AXIAL_DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
];

const pointKey = (x: number, y: number) => `${Math.round(x * 1000)},${Math.round(y * 1000)}`;

function build() {
  const coords: [number, number][] = [];
  for (let r = -2; r <= 2; r++) {
    for (let q = -2; q <= 2; q++) {
      if (Math.abs(q + r) <= 2) coords.push([q, r]);
    }
  }
  const index = new Map<string, number>();
  coords.forEach(([q, r], i) => index.set(`${q},${r}`, i));

  const hexes: Hex[] = [];
  const vertices: Vertex[] = [];
  const edges: Edge[] = [];
  const vertexIndex = new Map<string, number>();
  const edgeIndex = new Map<string, number>();

  coords.forEach(([q, r], id) => {
    const x = SQRT3 * (q + r / 2);
    const y = 1.5 * r;

    const neighbors: number[] = [];
    for (const [dq, dr] of AXIAL_DIRS) {
      const n = index.get(`${q + dq},${r + dr}`);
      if (n !== undefined) neighbors.push(n);
    }

    const vids: number[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
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

    const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
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

  return { hexes, vertices, edges, coast, index };
}

const built = build();

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
