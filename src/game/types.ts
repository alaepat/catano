/** `oro` = río de oro de Navegantes (da el recurso que quieras). `mar` solo en Navegantes. */
export type Terrain = 'bosque' | 'pasto' | 'cereal' | 'colinas' | 'montanas' | 'desierto' | 'mar' | 'oro' | 'niebla';

/** Escenarios de Navegantes con mapa fijo (su silueta) y reparto al azar dentro de ella. */
export type ScenarioId = 'nuevas-costas' | 'cuatro-islas' | 'niebla' | 'desierto' | 'tribu' | 'tela' | 'piratas' | 'maravillas';

/**
 * Forma del tablero: la isla del Catan base, la de 5-6 jugadores, el marco de Nuevo mundo o la silueta de un
 * escenario de Navegantes (con el número de jugadores si cambia: "cuatro-islas-3", "cuatro-islas-4"...).
 */
export type MapId = 'base' | 'cinco-seis' | 'nuevo-mundo' | ScenarioId | `${ScenarioId}-${3 | 4}`;
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
   * Catan base y 5-6: posición en la costa de su geometría (en orden alrededor de la isla).
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
  /** Navegantes: hexágono de mar donde empieza el pirata (null o sin poner: empieza fuera). */
  pirate?: number | null;
  /** Escenarios: cosas en los cruces (aldeas con número, fortalezas, casas de salida, maravillas...). */
  spots?: Spot[];
  /** Escenarios: regalos en los lados (fichas de punto y cartas de desarrollo boca abajo). */
  gifts?: Gift[];
  /** Forma del tablero (si falta, el Catan base: así se leen los tableros guardados antes de Navegantes). */
  map?: MapId;
}

/** Algo puesto en un cruce al empezar un escenario. */
export interface Spot {
  vertex: number;
  /** aldea: número de la tribu · fortaleza: pirata con 3 fichas · objetivo: cruce a alcanzar · casa: poblado de salida ·
   *  maravilla: cruce reservado · peligro: cruce prohibido al empezar. */
  kind: 'aldea' | 'fortaleza' | 'objetivo' | 'casa' | 'maravilla' | 'peligro';
  n?: number;
  color?: string;
}

/** Regalo en un lado: se lo lleva quien ponga un barco ahí. */
export interface Gift {
  edge: number;
  kind: 'punto' | 'carta';
}
