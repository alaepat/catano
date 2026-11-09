export type Terrain = 'bosque' | 'pasto' | 'cereal' | 'colinas' | 'montanas' | 'desierto' | 'mar';

/** Forma del tablero: la isla del Catan base o el marco de 42 hexágonos de Navegantes (Nuevo mundo). */
export type MapId = 'base' | 'nuevo-mundo';
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
  /** Catan base: 0 = centro, 1 = anillo medio, 2 = costa. En Navegantes, la distancia al centro. */
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
  /**
   * Catan base: posición en COAST_EDGES (0-29, en orden alrededor de la isla).
   * Navegantes: id del lado (en su geometría) entre tierra y mar o marco.
   */
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
  /** Forma del tablero (si falta, el Catan base: así se leen los tableros guardados antes de Navegantes). */
  map?: MapId;
}
