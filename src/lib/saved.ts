// "Mis tableros": islas guardadas en el móvil.
import { HEXES, PRESET_IDS, type Board, type PresetId } from '../game';

export const MAX_SAVED = 60;

export interface SavedBoard {
  id: string;
  name: string;
  /** Fecha de guardado (ISO). */
  date: string;
  mode: PresetId | 'personalizado';
  seed: number;
  score: number;
  board: Board;
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Comprueba que lo leído del móvil tiene buena pinta (por si se estropeó o es de una versión vieja). */
export function isSavedBoard(x: unknown): x is SavedBoard {
  if (!x || typeof x !== 'object') return false;
  const s = x as Partial<SavedBoard>;
  const b = s.board as Partial<Board> | undefined;
  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    typeof s.date === 'string' &&
    (s.mode === 'personalizado' || PRESET_IDS.includes(s.mode as PresetId)) &&
    isNum(s.seed) &&
    isNum(s.score) &&
    !!b &&
    Array.isArray(b.terrains) &&
    b.terrains.length === HEXES.length &&
    Array.isArray(b.numbers) &&
    b.numbers.length === HEXES.length &&
    Array.isArray(b.ports) &&
    (b.robber === null || isNum(b.robber))
  );
}

/** Nombre limpio: sin espacios sobrantes, máximo 40 letras; si queda vacío, se usa el anterior. */
export function cleanName(name: string, fallback: string): string {
  const n = name.replace(/\s+/g, ' ').trim().slice(0, 40);
  return n || fallback;
}

export function newSavedId(): string {
  return Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}
