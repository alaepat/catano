// Datos del Catan base (3-4 jugadores). Ver PLAN_CATAN.md, sección 5.
import type { PortType, Resource, Terrain } from './types';

export const TERRAINS: Terrain[] = ['bosque', 'pasto', 'cereal', 'colinas', 'montanas', 'desierto'];

export const TERRAIN_COUNTS: Record<Terrain, number> = {
  bosque: 4,
  pasto: 4,
  cereal: 4,
  colinas: 3,
  montanas: 3,
  desierto: 1,
};

export const TERRAIN_RESOURCE: Record<Terrain, Resource | null> = {
  bosque: 'madera',
  pasto: 'lana',
  cereal: 'trigo',
  colinas: 'arcilla',
  montanas: 'mineral',
  desierto: null,
};

export const RESOURCES: Resource[] = ['madera', 'lana', 'trigo', 'arcilla', 'mineral'];

/** Las 18 fichas de número. */
export const NUMBER_TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

/** Fichas A-R del montaje variable oficial, en orden alfabético. */
export const SPIRAL_TOKENS = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];

/** 4 puertos 3:1 y uno 2:1 de cada recurso. */
export const PORT_TYPES: PortType[] = [
  'generico', 'generico', 'generico', 'generico',
  'madera', 'lana', 'trigo', 'arcilla', 'mineral',
];

/** Puntitos de probabilidad: 2 y 12 → 1, 6 y 8 → 5. */
export function pips(n: number | null): number {
  return n == null ? 0 : 6 - Math.abs(7 - n);
}

export function isRed(n: number | null): boolean {
  return n === 6 || n === 8;
}

/** Los 18 terrenos que no son desierto. */
export function terrainPool(): Terrain[] {
  return TERRAINS.filter((t) => t !== 'desierto').flatMap((t) => Array<Terrain>(TERRAIN_COUNTS[t]).fill(t));
}
