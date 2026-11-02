export type Terrain = 'bosque' | 'pasto' | 'cereal' | 'colinas' | 'montanas' | 'desierto';
export type Resource = 'madera' | 'lana' | 'trigo' | 'arcilla' | 'mineral';
export type PortType = 'generico' | Resource;

export interface Hex {
  id: number;
  /** Coordenadas axiales. */
  q: number;
  r: number;
  /** Centro en pantalla, en unidades de "radio de hexágono" (la y crece hacia abajo). */
  x: number;
  y: number;
  /** 0 = centro, 1 = anillo medio, 2 = costa. */
  ring: number;
  neighbors: number[];
  vertices: number[];
}

/** Cruce: donde van poblados y ciudades. */
export interface Vertex {
  id: number;
  x: number;
  y: number;
  hexes: number[];
}

/** Camino: lado entre dos cruces. Si solo toca un hexágono, es costa. */
export interface Edge {
  id: number;
  a: number;
  b: number;
  hexes: number[];
}

export interface Port {
  /** Posición en COAST_EDGES (0-29, en orden alrededor de la isla). */
  coast: number;
  type: PortType;
}

export interface Board {
  /** Terreno de cada hexágono, por id. */
  terrains: Terrain[];
  /** Número de cada hexágono (null en el desierto). */
  numbers: (number | null)[];
  /** 9 puertos, o ninguno. */
  ports: Port[];
  /** Hexágono donde empieza el ladrón, o null si empieza fuera. */
  robber: number | null;
}
