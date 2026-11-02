// Opciones del menú de personalización y modos de generación (PLAN_CATAN.md, sección 5.4).
import type { Resource } from './types';
import { randInt, type Rng } from './rng';

export interface GenOptions {
  /** Dónde va el desierto. */
  desert: 'centro' | 'aleatorio' | 'costa';
  /** Normal = terrenos repartidos; regiones = cada terreno forma un único bloque. */
  terrainLayout: 'normal' | 'regiones';
  /** Tamaño máximo de un grupo de terrenos iguales que se tocan. 0 = sin límite, 1 = ninguno junto. */
  maxTerrainGroup: 0 | 1 | 2 | 3;
  /** Espiral oficial A-R, o números al azar (respetando las reglas activas). */
  numberMethod: 'espiral' | 'aleatorio';
  avoidRedAdjacent: boolean;
  avoidSameAdjacent: boolean;
  avoid2And12Adjacent: boolean;
  /** Que ningún recurso quede con números mucho peores que otro. */
  fairResources: boolean;
  /** Tope de puntitos en un cruce. 0 = sin tope. */
  maxVertexPips: 0 | 11 | 12;
  /** Dónde pueden ir los 6 y 8: en cualquier sitio, solo en el interior o solo en la costa. */
  redsZone: 'cualquiera' | 'interior' | 'costa';
  /** Un recurso que solo recibe números malos (2, 3, 11, 12). */
  scarceResource: 'ninguno' | 'aleatorio' | Resource;
  ports: boolean;
  portPositions: 'fijas' | 'aleatorias';
  /** Puerto 2:1 junto a un hexágono de su mismo recurso. */
  portNearResource: 'da-igual' | 'evitar' | 'forzar';
  robberStart: 'desierto' | 'fuera';
}

export type PresetId =
  | 'oficial'
  | 'equilibrado'
  | 'competitivo'
  | 'tranquila'
  | 'escasez'
  | 'continentes'
  | 'centro'
  | 'mercaderes'
  | 'caos';

/** Base de la que parten los modos: todo apagado y al azar. */
const BASE: GenOptions = {
  desert: 'aleatorio',
  terrainLayout: 'normal',
  maxTerrainGroup: 0,
  numberMethod: 'aleatorio',
  avoidRedAdjacent: false,
  avoidSameAdjacent: false,
  avoid2And12Adjacent: false,
  fairResources: false,
  maxVertexPips: 0,
  redsZone: 'cualquiera',
  scarceResource: 'ninguno',
  ports: true,
  portPositions: 'aleatorias',
  portNearResource: 'da-igual',
  robberStart: 'desierto',
};

const EQUILIBRADO: GenOptions = {
  ...BASE,
  desert: 'centro',
  maxTerrainGroup: 2,
  avoidRedAdjacent: true,
  avoidSameAdjacent: true,
  avoid2And12Adjacent: true,
  fairResources: true,
  maxVertexPips: 12,
};

export const PRESETS: Record<PresetId, GenOptions> = {
  oficial: { ...BASE, numberMethod: 'espiral', avoidRedAdjacent: true, portPositions: 'fijas' },
  equilibrado: EQUILIBRADO,
  competitivo: {
    ...EQUILIBRADO,
    maxTerrainGroup: 1,
    maxVertexPips: 11,
    portPositions: 'fijas',
    portNearResource: 'evitar',
  },
  tranquila: { ...EQUILIBRADO, desert: 'costa', robberStart: 'fuera' },
  escasez: {
    ...BASE,
    maxTerrainGroup: 2,
    avoidRedAdjacent: true,
    avoidSameAdjacent: true,
    scarceResource: 'aleatorio',
  },
  continentes: {
    ...BASE,
    terrainLayout: 'regiones',
    avoidRedAdjacent: true,
    avoidSameAdjacent: true,
    fairResources: true,
  },
  centro: { ...BASE, desert: 'costa', avoidSameAdjacent: true, redsZone: 'interior' },
  mercaderes: { ...EQUILIBRADO, portNearResource: 'forzar' },
  caos: BASE,
};

export interface PresetInfo {
  label: string;
  emoji: string;
  /** Para qué sirve el modo, en una frase. */
  description: string;
}

export const PRESET_INFO: Record<PresetId, PresetInfo> = {
  oficial: { label: 'Oficial', emoji: '📜', description: 'Como dice el reglamento: terrenos al azar y números en espiral A-R.' },
  equilibrado: { label: 'Equilibrado', emoji: '⚖️', description: 'Justo para todos. El modo para una partida normal.' },
  competitivo: {
    label: 'Competitivo',
    emoji: '🏆',
    description: 'Equilibrio máximo: ningún terreno repetido junto, cruces de 11 puntitos como mucho y puertos lejos de su recurso.',
  },
  tranquila: { label: 'Tranquila', emoji: '☕', description: 'Equilibrado y sin ladrón al empezar. Para jugar relajados o con gente nueva.' },
  escasez: { label: 'Escasez', emoji: '📉', description: 'Un recurso al azar solo tiene números malos. Tocará negociar… o pelearse.' },
  continentes: {
    label: 'Continentes',
    emoji: '🗺️',
    description: 'Cada terreno forma una sola región. Nadie lo tiene todo cerca: hay que expandirse o comerciar.',
  },
  centro: { label: 'Pelea por el centro', emoji: '🔥', description: 'Todos los 6 y 8 en el interior. Quien domine el centro manda.' },
  mercaderes: { label: 'Mercaderes', emoji: '⚓', description: 'Cada puerto 2:1 está junto a su recurso: los puertos valen oro.' },
  caos: { label: 'Caos total', emoji: '🌪️', description: 'Sin ninguna regla. Puede salir cualquier cosa.' },
};

export const PRESET_IDS = Object.keys(PRESETS) as PresetId[];

/** Modo sorpresa: uno de los modos al azar. */
export function surprisePreset(rng: Rng = Math.random): PresetId {
  return PRESET_IDS[randInt(rng, PRESET_IDS.length)];
}

/** Qué modo coincide exactamente con estas opciones. */
export function matchPreset(opts: GenOptions): PresetId | 'personalizado' {
  for (const id of PRESET_IDS) {
    const p = PRESETS[id];
    if ((Object.keys(p) as (keyof GenOptions)[]).every((k) => p[k] === opts[k])) return id;
  }
  return 'personalizado';
}

/**
 * Combinaciones de opciones que nunca pueden cumplirse a la vez.
 * El menú debe impedirlas; el generador las rechaza al momento con este mensaje.
 */
export function optionConflicts(o: GenOptions): string[] {
  const out: string[] = [];
  if (o.redsZone === 'interior' && o.avoidRedAdjacent) {
    out.push('Con los 6 y 8 en el interior tienen que poder tocarse: en las 7 casillas interiores solo caben 3 sin tocarse.');
  }
  if (o.scarceResource !== 'ninguno' && o.fairResources) {
    out.push('"Escasez" y "reparto justo" se contradicen: elige solo una.');
  }
  if (o.terrainLayout === 'regiones' && o.maxTerrainGroup > 0) {
    out.push('Con regiones los terrenos iguales van juntos: quita el límite de terrenos iguales juntos.');
  }
  if (o.numberMethod === 'espiral' && (o.scarceResource !== 'ninguno' || o.redsZone !== 'cualquiera')) {
    out.push('La espiral oficial pone los números en un orden fijo: no puede elegir dónde van los 6 y 8 ni crear escasez.');
  }
  return out;
}

/**
 * Cambia una opción y, si choca con otra, ajusta la otra para que la combinación sea posible.
 * Devuelve las opciones nuevas y frases que explican qué se ha ajustado (para avisar al usuario).
 */
export function setOptionResolving<K extends keyof GenOptions>(
  current: GenOptions,
  key: K,
  value: GenOptions[K],
): { options: GenOptions; notes: string[] } {
  const o: GenOptions = { ...current, [key]: value };
  const notes: string[] = [];

  // 6 y 8 en el interior ↔ 6 y 8 separados
  if (o.redsZone === 'interior' && o.avoidRedAdjacent) {
    if (key === 'avoidRedAdjacent') {
      o.redsZone = 'cualquiera';
      notes.push('Los 6 y 8 ya pueden ir en cualquier sitio: en el interior no caben separados.');
    } else {
      o.avoidRedAdjacent = false;
      notes.push('Con los 6 y 8 en el interior tienen que poder tocarse: he quitado "6 y 8 separados".');
    }
  }
  // Escasez ↔ reparto justo
  if (o.scarceResource !== 'ninguno' && o.fairResources) {
    if (key === 'fairResources') {
      o.scarceResource = 'ninguno';
      notes.push('He quitado la escasez: no puede ir con el reparto justo.');
    } else {
      o.fairResources = false;
      notes.push('He quitado el reparto justo: no puede ir con la escasez.');
    }
  }
  // Regiones ↔ límite de terrenos iguales juntos
  if (o.terrainLayout === 'regiones' && o.maxTerrainGroup > 0) {
    if (key === 'maxTerrainGroup') {
      o.terrainLayout = 'normal';
      notes.push('Terrenos repartidos de nuevo: las regiones no pueden tener límite de iguales juntos.');
    } else {
      o.maxTerrainGroup = 0;
      notes.push('Con regiones los terrenos iguales van juntos: he quitado el límite.');
    }
  }
  // Espiral oficial ↔ zona de 6/8 o escasez
  if (o.numberMethod === 'espiral' && (o.scarceResource !== 'ninguno' || o.redsZone !== 'cualquiera')) {
    if (key === 'numberMethod') {
      o.scarceResource = 'ninguno';
      o.redsZone = 'cualquiera';
      notes.push('La espiral oficial tiene un orden fijo: he quitado la escasez y la zona de los 6 y 8.');
    } else {
      o.numberMethod = 'aleatorio';
      notes.push('Números al azar: la espiral oficial no puede elegir dónde van.');
    }
  }
  return { options: o, notes };
}
