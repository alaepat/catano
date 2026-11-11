// Escenarios de Navegantes (libro de reglas de Catan: Navegantes, edición 2021).
// Cada escenario tiene su silueta fija (dónde hay tierra y dónde mar); dentro de ella, el libro permite
// repartir al azar terrenos y números ("Variable Set-up"). Nuevo mundo es el único con el mapa entero al azar.
import { CS_INFO } from './cincoSeis';
import { generateScenarioMap } from './mapas';
import { generateNuevoMundo, NM_GOAL, NM_INFO, NO_EXTRAS, type NuevoMundoExtras, type NuevoMundoStyle } from './navegantes';
import { PRESET_INFO, PRESET_IDS, type PresetId } from './options';
import type { GenResult } from './generator';
import { randomSeed } from './rng';
import type { ScenarioId } from './types';

export type SeaScenario = 'nuevo-mundo' | ScenarioId;

/** Con qué se generó un tablero: un modo del Catan base, el personalizado, la isla de 5-6 o un mapa de Navegantes. */
export type GenMode = PresetId | 'personalizado' | 'cinco-seis' | SeaScenario;

export const isPreset = (mode: unknown): mode is PresetId => PRESET_IDS.includes(mode as PresetId);
export type SeaPlayers = 3 | 4;

export interface ScenarioInfo {
  id: SeaScenario;
  /** Número del escenario en el libro. */
  number: number;
  label: string;
  description: string;
  /** Jugadores con mapa propio (si solo hay uno, vale para 3 y 4). */
  players: SeaPlayers[];
  /** Puntos para ganar. */
  goal: number;
  /** Datos para la ficha de "Tu isla". */
  facts: string[];
}

export const NUEVO_MUNDO: ScenarioInfo = {
  id: 'nuevo-mundo',
  number: 9,
  label: NM_INFO.label,
  description: 'El escenario de mapa al azar de Navegantes, para 3 o 4 jugadores.',
  players: [3, 4],
  goal: NM_GOAL,
  facts: [
    'Marco de 42 hexágonos: 19 de mar y 23 de tierra (sin desierto)',
    '23 fichas de número y 9 puertos entre tierra y mar',
    '+1 punto la primera vez que construyes en cada isla nueva',
    'El ladrón y el pirata empiezan fuera del tablero',
  ],
};

export const NUEVAS_COSTAS: ScenarioInfo = {
  id: 'nuevas-costas',
  number: 1,
  label: 'Rumbo a nuevas costas',
  description: 'Una isla grande como la de siempre y, al otro lado del mar, islas pequeñas con oro.',
  players: [4],
  goal: 14,
  facts: [
    'Isla grande de 19 hexágonos y 13 casillas lejanas al azar (4 de mar, 2 de oro)',
    'Las dos primeras casas, en la isla grande',
    '+2 puntos la primera vez que construyes en cada isla pequeña',
    'El ladrón empieza en el desierto y el pirata en el mar',
  ],
};

export const CUATRO_ISLAS: ScenarioInfo = {
  id: 'cuatro-islas',
  number: 2,
  label: 'Las cuatro islas',
  description: 'Cuatro islas de forma fija en un marco más pequeño. Cada uno elige dónde empezar.',
  players: [4],
  goal: 13,
  facts: [
    'Marco de 35 hexágonos con 4 islas (su forma no cambia; lo de dentro, sí)',
    'Las dos primeras casas en 1 o 2 islas: esas son "de casa"',
    '+2 puntos la primera vez que construyes en cada isla extranjera',
    'El ladrón empieza en el 12 y el pirata en el mar',
  ],
};

export const NIEBLA: ScenarioInfo = {
  id: 'niebla',
  number: 3,
  label: 'Islas de niebla',
  description: 'Dos islas conocidas y, entre ellas, un mar de niebla por descubrir.',
  players: [4],
  goal: 12,
  facts: [
    '12 casillas de niebla (?): se descubren al llegar con un barco o carretera',
    'Montón boca abajo: 2 mar, 2 oro, 2 cereal, 2 colinas, 2 montañas, 1 pasto y 1 bosque',
    'Si descubres tierra, le pones una ficha del montón y te llevas 1 carta de ese recurso',
    'El ladrón empieza en el 12. Sin puntos extra',
  ],
};

export const DESIERTO: ScenarioInfo = {
  id: 'desierto',
  number: 4,
  label: 'A través del desierto',
  description: 'Tres desiertos parten la isla grande; al otro lado y en el mar, tierras con oro.',
  players: [4],
  goal: 14,
  facts: [
    'Los 3 desiertos separan una franja pequeña (arriba a la derecha) de la isla principal',
    'Las dos primeras casas, en la isla principal',
    '+2 puntos la primera vez que construyes en la franja y en cada isla pequeña',
    'El ladrón empieza en un desierto y el pirata en el mar',
  ],
};

/** Todos los escenarios, en el orden del libro (Nuevo mundo, el de mapa al azar, primero). */
export const SCENARIOS: ScenarioInfo[] = [NUEVO_MUNDO, NUEVAS_COSTAS, CUATRO_ISLAS, NIEBLA, DESIERTO];

export const scenarioInfo = (id: SeaScenario): ScenarioInfo => SCENARIOS.find((s) => s.id === id) ?? NUEVO_MUNDO;

export const isSeaScenario = (mode: unknown): mode is SeaScenario => SCENARIOS.some((s) => s.id === mode);

export function modeLabel(mode: GenMode): string {
  if (mode === 'personalizado') return 'Personalizado';
  if (mode === 'cinco-seis') return CS_INFO.label;
  if (isSeaScenario(mode)) return scenarioInfo(mode).label;
  return PRESET_INFO[mode].label;
}

/** Puntos para ganar con un tablero de este modo (10 en el Catan base y en 5-6). */
export const modeGoal = (mode: GenMode): number => (isSeaScenario(mode) ? scenarioInfo(mode).goal : 10);

export interface SeaOptions {
  scenario: SeaScenario;
  players: SeaPlayers;
  style: NuevoMundoStyle;
  /** Solo en Nuevo mundo. */
  extras: NuevoMundoExtras;
}

export const DEFAULT_SEA: SeaOptions = { scenario: 'nuevo-mundo', players: 4, style: 'equilibrado', extras: NO_EXTRAS };

export function generateNavegantes(opts: SeaOptions, seed: number = randomSeed()): GenResult {
  switch (opts.scenario) {
    case 'nuevas-costas':
    case 'cuatro-islas':
    case 'niebla':
    case 'desierto':
      return generateScenarioMap(opts.scenario, opts.style, seed);
    default:
      return generateNuevoMundo(opts.style, seed, opts.extras);
  }
}
