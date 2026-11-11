// Logros: lo que se cuenta, qué hace falta para cada uno y cuáles están conseguidos.
// Todo es puro (sin estado): el almacén `logrosStore.ts` guarda el progreso y avisa de los nuevos.
import { isPreset, isSeaScenario, type GenMode, type PresetId, type Terrain } from '../game';

/** Lo que se va contando mientras se usa la app. */
export interface Progress {
  /** Tableros generados. */
  generated: number;
  /** Modos con los que se ha generado alguna vez (en Sorpresa cuenta el que tocó). */
  modes: PresetId[];
  /** Tableros en modo Caos. */
  chaos: number;
  /** Mejor y peor equilibrio visto (-1 / 101 si aún no hay ninguno). */
  bestScore: number;
  worstScore: number;
  /** Generó algún tablero de madrugada (de 1:00 a 4:59). */
  night: boolean;
  /** Terrenos de los hexágonos que se han tocado. */
  terrains: Terrain[];
  /** Fondos que se han elegido. */
  backgrounds: string[];
  /** Partidas terminadas con ganador en el marcador. */
  games: number;
  /** Mapas de Navegantes generados. */
  seas: number;
}

export type LogroEvent =
  | { type: 'generar'; mode: GenMode; score: number; hour: number }
  | { type: 'tocar'; terrain: Terrain }
  | { type: 'fondo'; id: string }
  | { type: 'partida' };

export const EMPTY_PROGRESS: Progress = {
  generated: 0,
  modes: [],
  chaos: 0,
  bestScore: -1,
  worstScore: 101,
  night: false,
  terrains: [],
  backgrounds: [],
  games: 0,
  seas: 0,
};

const ALL_MODES = 9;

/** Partidas que el grupo ya había jugado antes de usar la app (las cuenta el usuario: 45). */
export const PARTIDAS_PREVIAS = 45;

/** Partidas jugadas en total: las de antes de la app más las terminadas con el marcador. */
export const partidasJugadas = (p: Progress) => PARTIDAS_PREVIAS + p.games;
const ALL_TERRAINS = 6;

export interface Logro {
  id: string;
  title: string;
  description: string;
  /** Cuánto falta: valor actual y meta (para la barrita de progreso). */
  value: (p: Progress) => number;
  goal: number;
}

const flag = (ok: boolean) => (ok ? 1 : 0);

export const LOGROS: Logro[] = [
  { id: 'primera-isla', title: 'Primera isla', description: 'Genera tu primer tablero.', value: (p) => p.generated, goal: 1 },
  { id: 'cartografo', title: 'Cartógrafo', description: 'Genera 10 tableros.', value: (p) => p.generated, goal: 10 },
  { id: 'explorador', title: 'Explorador incansable', description: 'Genera 50 tableros.', value: (p) => p.generated, goal: 50 },
  { id: 'leyenda', title: 'Leyenda de Catan', description: 'Genera 200 tableros.', value: (p) => p.generated, goal: 200 },
  { id: 'todos-los-modos', title: 'Probador de modos', description: 'Genera una isla con cada uno de los 9 modos.', value: (p) => p.modes.length, goal: ALL_MODES },
  { id: 'caos', title: 'Caos total', description: 'Genera 10 tableros en modo Caos.', value: (p) => p.chaos, goal: 10 },
  { id: 'juez', title: 'Más justo que un juez', description: 'Consigue un tablero con equilibrio 95 o más.', value: (p) => flag(p.bestScore >= 95), goal: 1 },
  { id: 'llorar', title: 'Alguien va a llorar', description: 'Consigue un tablero con equilibrio por debajo de 50.', value: (p) => flag(p.worstScore < 50), goal: 1 },
  { id: 'noctambulo', title: 'Noctámbulo', description: 'Genera un tablero entre la 1 y las 5 de la madrugada.', value: (p) => flag(p.night), goal: 1 },
  { id: 'geologo', title: 'Geólogo', description: 'Toca un hexágono de cada terreno, desierto incluido.', value: (p) => p.terrains.length, goal: ALL_TERRAINS },
  { id: 'decorador', title: 'Decorador', description: 'Prueba 5 fondos distintos.', value: (p) => p.backgrounds.length, goal: 5 },
  { id: 'navegante', title: 'Rumbo al Nuevo mundo', description: 'Genera un mapa de Navegantes.', value: (p) => p.seas, goal: 1 },
  { id: 'a-la-mesa', title: 'A la mesa', description: 'Termina una partida con el marcador.', value: (p) => p.games, goal: 1 },
  { id: 'veterano', title: 'Veterano', description: 'Llega a 50 partidas jugadas.', value: partidasJugadas, goal: 50 },
  { id: 'centenario', title: 'Centenario', description: 'Llega a 100 partidas jugadas.', value: partidasJugadas, goal: 100 },
];

const addOnce = <T,>(list: T[], item: T): T[] => (list.includes(item) ? list : [...list, item]);

export function applyEvent(p: Progress, e: LogroEvent): Progress {
  switch (e.type) {
    case 'generar':
      return {
        ...p,
        generated: p.generated + 1,
        modes: isPreset(e.mode) ? addOnce(p.modes, e.mode) : p.modes,
        seas: p.seas + (isSeaScenario(e.mode) ? 1 : 0),
        chaos: p.chaos + (e.mode === 'caos' ? 1 : 0),
        bestScore: Math.max(p.bestScore, e.score),
        worstScore: Math.min(p.worstScore, e.score),
        night: p.night || (e.hour >= 1 && e.hour < 5),
      };
    case 'tocar':
      // El mar y el oro de Navegantes no cuentan para el Geólogo (son los 6 terrenos del Catan base).
      return e.terrain === 'mar' || e.terrain === 'oro' || e.terrain === 'niebla' ? p : { ...p, terrains: addOnce(p.terrains, e.terrain) };
    case 'fondo':
      return { ...p, backgrounds: addOnce(p.backgrounds, e.id) };
    case 'partida':
      return { ...p, games: p.games + 1 };
  }
}

export function isDone(logro: Logro, p: Progress): boolean {
  return logro.value(p) >= logro.goal;
}

/** Ids de los logros conseguidos con este progreso. */
export function doneIds(p: Progress): string[] {
  return LOGROS.filter((l) => isDone(l, p)).map((l) => l.id);
}

/** Lee un progreso guardado sin fiarse de él (versiones antiguas, datos rotos). */
export function cleanProgress(raw: unknown): Progress {
  const r = (raw ?? {}) as Partial<Record<keyof Progress, unknown>>;
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const list = <T,>(v: unknown) => (Array.isArray(v) ? (v.filter((x) => typeof x === 'string') as T[]) : []);
  return {
    generated: num(r.generated, 0),
    modes: list<PresetId>(r.modes),
    chaos: num(r.chaos, 0),
    bestScore: num(r.bestScore, -1),
    worstScore: num(r.worstScore, 101),
    night: r.night === true,
    terrains: list<Terrain>(r.terrains),
    backgrounds: list<string>(r.backgrounds),
    games: num(r.games, 0),
    seas: num(r.seas, 0),
  };
}
