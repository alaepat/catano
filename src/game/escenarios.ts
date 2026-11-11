// Escenarios de Navegantes (libro de reglas de Catan: Navegantes, edición 2021).
// Cada escenario tiene su silueta fija (dónde hay tierra y dónde mar); dentro de ella, el libro permite
// repartir al azar terrenos y números ("Variable Set-up"). Nuevo mundo es el único con el mapa entero al azar.
import { CS_INFO } from './cincoSeis';
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

/** Todos los escenarios, en el orden del libro. */
export const SCENARIOS: ScenarioInfo[] = [NUEVO_MUNDO];

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
  return generateNuevoMundo(opts.style, seed, opts.extras);
}
