// Estado de la app: pantalla actual, modo y opciones elegidas, último tablero y ajustes.
// Se guardan en el móvil el modo, las opciones y los ajustes (no el tablero).
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  PRESETS, generateBoard, matchPreset, setOptionResolving, surprisePreset,
  type GenOptions, type GenResult, type PresetId,
} from './game';
import { safeStorage } from './lib/storage';

export type Screen = 'inicio' | 'personalizar' | 'tablero' | 'ajustes';
export type ModeChoice = PresetId | 'personalizado' | 'sorpresa';
export type BackgroundId = 'espacio' | 'atardecer' | 'minimal';
export type AnimSpeed = 'epica' | 'rapida' | 'sin';

export interface Settings {
  background: BackgroundId;
  animSpeed: AnimSpeed;
  showPips: boolean;
}

export interface Generation {
  /** Modo con el que se generó (en Sorpresa, el que tocó). */
  mode: PresetId | 'personalizado';
  result: GenResult;
  /** Cambia en cada generación, para repetir la animación. */
  id: number;
}

interface State {
  screen: Screen;
  choice: ModeChoice;
  options: GenOptions;
  generation: Generation | null;
  settings: Settings;
  /** Avisos cuando una opción ajusta otra. */
  notes: string[];

  goTo: (screen: Screen) => void;
  /** Cambia de pantalla sin añadir entrada al historial (para el botón atrás del móvil). */
  setScreenFromHistory: (screen: Screen) => void;
  selectMode: (choice: ModeChoice) => void;
  setOption: <K extends keyof GenOptions>(key: K, value: GenOptions[K]) => void;
  clearNotes: () => void;
  generate: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;
}

const DEFAULT_SETTINGS: Settings = { background: 'espacio', animSpeed: 'epica', showPips: true };

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
        set({ generation: { mode, result: generateBoard(opts), id: (generation?.id ?? 0) + 1 } });
      },

      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

      resetAll: () => {
        safeStorage.removeItem('catan-app');
        set({ choice: 'equilibrado', options: PRESETS.equilibrado, settings: DEFAULT_SETTINGS, generation: null, notes: [] });
      },
    }),
    {
      name: 'catan-app',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ choice: s.choice, options: s.options, settings: s.settings }),
      // Si en el futuro se añaden opciones nuevas, las que falten toman su valor por defecto.
      merge: (saved, current) => {
        const s = (saved ?? {}) as Partial<State>;
        return {
          ...current,
          choice: s.choice ?? current.choice,
          options: { ...current.options, ...s.options },
          settings: { ...current.settings, ...s.settings },
        };
      },
    },
  ),
);
