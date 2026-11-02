// Estado de la app: pantalla actual, modo y opciones elegidas, último tablero y ajustes.
// Se guardan en el móvil el modo, las opciones, los ajustes y Mis tableros (no el último tablero).
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  PRESETS, balanceScore, generateBoard, matchPreset, setOptionResolving, surprisePreset,
  type GenOptions, type GenResult, type PresetId,
} from './game';
import { islandName } from './lib/islandName';
import { MAX_SAVED, cleanName, isSavedBoard, newSavedId, type SavedBoard } from './lib/saved';
import { safeStorage } from './lib/storage';

export type Screen = 'inicio' | 'personalizar' | 'tablero' | 'ajustes' | 'tableros';
export type ModeChoice = PresetId | 'personalizado' | 'sorpresa';
export type BackgroundId = 'espacio' | 'oceano' | 'playa' | 'canoa' | 'camping' | 'pergamino' | 'atardecer' | 'bosque' | 'minimal';
export type AnimSpeed = 'epica' | 'rapida' | 'sin';
/** Calidad del tablero 3D. '2d' = tablero plano (para móviles lentos o si el 3D falla). */
export type Quality = 'alta' | 'media' | 'baja' | '2d';

export interface Settings {
  background: BackgroundId;
  animSpeed: AnimSpeed;
  showPips: boolean;
  quality: Quality;
  /** Efectos de sonido en la animación. */
  sound: boolean;
}

export interface Generation {
  /** Modo con el que se generó (en Sorpresa, el que tocó). */
  mode: PresetId | 'personalizado';
  result: GenResult;
  /** Cambia en cada generación, para repetir la animación. */
  id: number;
  /** Nombre de la isla ("" si la generación falló). */
  name: string;
  /** Si está en Mis tableros, su id. */
  savedId?: string;
}

interface State {
  screen: Screen;
  choice: ModeChoice;
  options: GenOptions;
  generation: Generation | null;
  settings: Settings;
  /** Avisos cuando una opción ajusta otra. */
  notes: string[];
  /** Mis tableros, el más reciente primero. */
  saved: SavedBoard[];
  /** La isla ya está a la vista: el fondo Espacio "vuela" (no se guarda). */
  flying: boolean;

  setFlying: (flying: boolean) => void;
  goTo: (screen: Screen) => void;
  /** Cambia de pantalla sin añadir entrada al historial (para el botón atrás del móvil). */
  setScreenFromHistory: (screen: Screen) => void;
  selectMode: (choice: ModeChoice) => void;
  setOption: <K extends keyof GenOptions>(key: K, value: GenOptions[K]) => void;
  clearNotes: () => void;
  generate: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;
  /** Guarda el tablero actual en Mis tableros, o lo quita si ya estaba. */
  toggleSaveCurrent: () => void;
  renameSaved: (id: string, name: string) => void;
  deleteSaved: (id: string) => void;
  /** Abre una isla guardada en la pantalla del tablero. */
  openSaved: (id: string) => void;
}

const DEFAULT_SETTINGS: Settings = { background: 'espacio', animSpeed: 'epica', showPips: true, quality: 'alta', sound: false };

export const ANIM_FACTOR: Record<AnimSpeed, number> = { epica: 1, rapida: 0.45, sin: 0 };

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      screen: 'inicio',
      choice: 'equilibrado',
      options: PRESETS.equilibrado,
      generation: null,
      settings: DEFAULT_SETTINGS,
      notes: [],
      saved: [],
      flying: false,

      setFlying: (flying) => {
        if (get().flying !== flying) set({ flying });
      },

      goTo: (screen) => {
        try {
          window.history.pushState({ screen }, '');
        } catch {
          /* sin historial */
        }
        set({ screen });
      },
      setScreenFromHistory: (screen) => set({ screen }),

      selectMode: (choice) => {
        if (choice === 'sorpresa' || choice === 'personalizado') set({ choice });
        else set({ choice, options: PRESETS[choice] });
      },

      setOption: (key, value) => {
        const { options, notes } = setOptionResolving(get().options, key, value);
        set({ options, choice: matchPreset(options), notes });
      },
      clearNotes: () => set({ notes: [] }),

      generate: () => {
        const { choice, options, generation } = get();
        const mode = choice === 'sorpresa' ? surprisePreset() : choice;
        const opts = mode === 'personalizado' ? options : PRESETS[mode];
        const result = generateBoard(opts);
        const name = result.ok ? islandName(result.board, result.seed) : '';
        set({ generation: { mode, result, id: (generation?.id ?? 0) + 1, name } });
      },

      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

      resetAll: () => {
        safeStorage.removeItem('catan-app');
        set({ choice: 'equilibrado', options: PRESETS.equilibrado, settings: DEFAULT_SETTINGS, generation: null, notes: [], saved: [] });
      },

      toggleSaveCurrent: () => {
        const { generation, saved } = get();
        if (!generation?.result.ok) return;
        if (generation.savedId) {
          const id = generation.savedId;
          set({ saved: saved.filter((s) => s.id !== id), generation: { ...generation, savedId: undefined } });
          return;
        }
        const { board, seed } = generation.result;
        const entry: SavedBoard = {
          id: newSavedId(),
          name: generation.name,
          date: new Date().toISOString(),
          mode: generation.mode,
          seed,
          score: balanceScore(board),
          board,
        };
        set({ saved: [entry, ...saved].slice(0, MAX_SAVED), generation: { ...generation, savedId: entry.id } });
      },

      renameSaved: (id, name) => {
        const { saved, generation } = get();
        const entry = saved.find((s) => s.id === id);
        if (!entry) return;
        const clean = cleanName(name, entry.name);
        set({
          saved: saved.map((s) => (s.id === id ? { ...s, name: clean } : s)),
          generation: generation?.savedId === id ? { ...generation, name: clean } : generation,
        });
      },

      deleteSaved: (id) => {
        const { saved, generation } = get();
        set({
          saved: saved.filter((s) => s.id !== id),
          generation: generation?.savedId === id ? { ...generation, savedId: undefined } : generation,
        });
      },

      openSaved: (id) => {
        const { saved, generation, goTo } = get();
        const entry = saved.find((s) => s.id === id);
        if (!entry) return;
        set({
          generation: {
            mode: entry.mode,
            result: { ok: true, board: entry.board, seed: entry.seed, attempts: 0 },
            id: (generation?.id ?? 0) + 1,
            name: entry.name,
            savedId: entry.id,
          },
        });
        goTo('tablero');
      },
    }),
    {
      name: 'catan-app',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ choice: s.choice, options: s.options, settings: s.settings, saved: s.saved }),
      // Si en el futuro se añaden opciones nuevas, las que falten toman su valor por defecto.
      merge: (saved, current) => {
        const s = (saved ?? {}) as Partial<State>;
        return {
          ...current,
          choice: s.choice ?? current.choice,
          options: { ...current.options, ...s.options },
          settings: { ...current.settings, ...s.settings },
          saved: Array.isArray(s.saved) ? s.saved.filter(isSavedBoard) : [],
        };
      },
    },
  ),
);
