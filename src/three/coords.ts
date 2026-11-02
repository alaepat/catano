// Medidas de la escena 3D. Una unidad = radio de un hexágono.
// El plano del tablero es x/z (la "y" del 2D pasa a ser "z"); la altura es y.
import { COAST_EDGES, EDGES, HEXES, VERTICES, type Terrain } from '../game';

export const BASE_H = 0.1; // base de arena bajo cada hexágono
export const BEVEL = 0.035;
export const TILE_H = 0.16;
export const TILE_R = 0.9;
/** Altura de la cara de arriba de los hexágonos: ahí se apoyan fichas y decoración. */
export const TOP = BASE_H + BEVEL * 2 + TILE_H;
/** Radio del disco de mar. */
export const SEA_R = 5.3;

/** Colores de los terrenos en 3D (los mismos que --bosque, --pasto... de tokens.css). */
export const TERRAIN_COLOR: Record<Terrain, string> = {
  bosque: '#2f5d3a',
  pasto: '#8dbf5a',
  cereal: '#e3b94c',
  colinas: '#c0623b',
  montanas: '#8a8d91',
  desierto: '#d9c49a',
};

export type XZ = readonly [number, number];

export const hexWorld = (id: number): XZ => [HEXES[id].x, HEXES[id].y];
export const vertexWorld = (id: number): XZ => [VERTICES[id].x, VERTICES[id].y];

/** Giro en y que hace que el eje x local apunte hacia (dx, dz). */
export const yawTowards = (dx: number, dz: number) => Math.atan2(-dz, dx);

/** Dónde va cada puerto: los dos cruces de su lado de costa, el barco y hacia dónde mira. */
export function portPlacement(coast: number) {
  const edge = EDGES[COAST_EDGES[coast]];
  const a = vertexWorld(edge.a);
  const b = vertexWorld(edge.b);
  const mx = (a[0] + b[0]) / 2;
  const mz = (a[1] + b[1]) / 2;
  const len = Math.hypot(mx, mz);
  const out: XZ = [mx / len, mz / len];
  const boat: XZ = [mx + out[0] * 0.72, mz + out[1] * 0.72];
  return { a, b, out, boat, yaw: yawTowards(-out[1], out[0]) };
}

/** Número pseudoaleatorio fijo (0-1) para variar la decoración sin cambiarla en cada fotograma. */
export function jitter(id: number, k: number): number {
  const s = Math.sin(id * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
