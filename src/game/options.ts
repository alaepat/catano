// Opciones del menú de personalización y presets (PLAN_CATAN.md, sección 5.4).

export interface GenOptions {
  /** Dónde va el desierto. */
  desert: 'centro' | 'aleatorio' | 'costa';
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
  noRedsOnCoast: boolean;
  ports: boolean;
  portPositions: 'fijas' | 'aleatorias';
  /** Puerto 2:1 junto a un hexágono de su mismo recurso. */
  portNearResource: 'da-igual' | 'evitar' | 'forzar';
  robberStart: 'desierto' | 'fuera';
}

export type PresetId = 'oficial' | 'equilibrado' | 'caos';

export const PRESETS: Record<PresetId, GenOptions> = {
  oficial: {
    desert: 'aleatorio',
    maxTerrainGroup: 0,
    numberMethod: 'espiral',
    avoidRedAdjacent: true,
    avoidSameAdjacent: false,
    avoid2And12Adjacent: false,
    fairResources: false,
    maxVertexPips: 0,
    noRedsOnCoast: false,
    ports: true,
    portPositions: 'fijas',
    portNearResource: 'da-igual',
    robberStart: 'desierto',
  },
  equilibrado: {
    desert: 'centro',
    maxTerrainGroup: 2,
    numberMethod: 'aleatorio',
    avoidRedAdjacent: true,
    avoidSameAdjacent: true,
    avoid2And12Adjacent: true,
    fairResources: true,
    maxVertexPips: 12,
    noRedsOnCoast: false,
    ports: true,
    portPositions: 'aleatorias',
    portNearResource: 'da-igual',
    robberStart: 'desierto',
  },
  caos: {
    desert: 'aleatorio',
    maxTerrainGroup: 0,
    numberMethod: 'aleatorio',
    avoidRedAdjacent: false,
    avoidSameAdjacent: false,
    avoid2And12Adjacent: false,
    fairResources: false,
    maxVertexPips: 0,
    noRedsOnCoast: false,
    ports: true,
    portPositions: 'aleatorias',
    portNearResource: 'da-igual',
    robberStart: 'desierto',
  },
};

export const PRESET_LABELS: Record<PresetId | 'personalizado', string> = {
  oficial: 'Oficial',
  equilibrado: 'Equilibrado',
  caos: 'Caos total',
  personalizado: 'Personalizado',
};

/** Qué preset coincide exactamente con estas opciones. */
export function matchPreset(opts: GenOptions): PresetId | 'personalizado' {
  for (const id of Object.keys(PRESETS) as PresetId[]) {
    const p = PRESETS[id];
    if ((Object.keys(p) as (keyof GenOptions)[]).every((k) => p[k] === opts[k])) return id;
  }
  return 'personalizado';
}
