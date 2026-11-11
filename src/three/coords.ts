// Medidas de la escena 3D. Una unidad = radio de un hexágono.
// El plano del tablero es x/z (la "y" del 2D pasa a ser "z"); la altura es y.
import { createContext, useContext } from 'react';
import { BASE_GEOMETRY, islandSeaRadius, portEdge, portLandHex, type Board, type Geometry, type Terrain } from '../game';

export const BASE_H = 0.1; // base de arena bajo cada hexágono
export const BEVEL = 0.035;
export const TILE_H = 0.16;
export const TILE_R = 0.9;
/** Altura de la cara de arriba de los hexágonos: ahí se apoyan fichas y decoración. */
export const TOP = BASE_H + BEVEL * 2 + TILE_H;
/** Radio del disco de mar (Catan base). */
export const SEA_R = 5.3;

/** Forma del tablero que se está dibujando (la ponen Board3D y la leen las piezas). */
export const GeoContext = createContext<Geometry>(BASE_GEOMETRY);
export const useGeo = () => useContext(GeoContext);

/** Radio del disco de mar: en Navegantes, lo justo para que quepa todo el marco. */
export const seaRadius = (geo: Geometry) => (geo.kind === 'isla' ? islandSeaRadius(geo) : geo.radius + 0.35);

/** Medio ancho y medio alto del tablero (con margen), para encajarlo en pantalla. */
export function boardHalf(geo: Geometry): { w: number; h: number } {
  if (geo.kind === 'isla') {
    // La de 5-6 es más alargada y gira un poco al presentarse: algo más de margen.
    const r = islandSeaRadius(geo) + (geo.id === 'base' ? 0.15 : 0.7);
    return { w: r, h: r * 0.8 };
  }
  // Margen para los barcos de los puertos que quedan sobre el marco.
  const w = Math.max(...geo.vertices.map((v) => Math.abs(v.x))) + 1.1;
  const h = Math.max(...geo.vertices.map((v) => Math.abs(v.y))) + 0.8;
  return { w, h: h * 0.8 };
}

/** Colores de los terrenos en 3D (los mismos que --bosque, --pasto... de tokens.css). */
export const TERRAIN_COLOR: Record<Terrain, string> = {
  bosque: '#2f5d3a',
  pasto: '#8dbf5a',
  cereal: '#e3b94c',
  colinas: '#c0623b',
  montanas: '#8a8d91',
  desierto: '#d9c49a',
  mar: '#3d8fbf',
  oro: '#7a6650',
};

export type XZ = readonly [number, number];

export const hexWorld = (geo: Geometry, id: number): XZ => [geo.hexes[id].x, geo.hexes[id].y];
export const vertexWorld = (geo: Geometry, id: number): XZ => [geo.vertices[id].x, geo.vertices[id].y];

/** Giro en y que hace que el eje x local apunte hacia (dx, dz). */
export const yawTowards = (dx: number, dz: number) => Math.atan2(-dz, dx);

/** Dónde va cada puerto: los dos cruces de su lado de costa, el barco y hacia dónde mira. */
export function portPlacement(geo: Geometry, board: Board, coast: number) {
  const edge = portEdge(geo, coast);
  const a = vertexWorld(geo, edge.a);
  const b = vertexWorld(geo, edge.b);
  const mx = (a[0] + b[0]) / 2;
  const mz = (a[1] + b[1]) / 2;
  // Base: hacia fuera desde el centro de la isla. Navegantes: hacia fuera de su hexágono de tierra.
  const [cx, cz] = geo.kind === 'isla' ? [0, 0] : hexWorld(geo, portLandHex(coast, board.terrains, geo));
  const len = Math.hypot(mx - cx, mz - cz);
  const out: XZ = [(mx - cx) / len, (mz - cz) / len];
  const boat: XZ = [mx + out[0] * 0.72, mz + out[1] * 0.72];
  return { a, b, out, boat, yaw: yawTowards(-out[1], out[0]) };
}

/** Número pseudoaleatorio fijo (0-1) para variar la decoración sin cambiarla en cada fotograma. */
export function jitter(id: number, k: number): number {
  const s = Math.sin(id * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
