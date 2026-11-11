// Estado de la app: pantalla actual, modo y opciones elegidas, último tablero y ajustes.
// Se guardan en el móvil el modo, las opciones, los ajustes y Mis tableros (no el último tablero).
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  DEFAULT_SEA, PRESETS, SCENARIOS, balanceScore, generateBoard, generateCincoSeis, generateNavegantes, matchPreset, setOptionResolving, usesLetters,
  surprisePreset, type CincoSeisStyle, type GenMode, type GenOptions, type GenResult, type SeaOptions,
} from './game';
import { islandName } from './lib/islandName';
import type { NumberFont, NumberSize } from './lib/numberStyle';
import { MAX_SAVED, cleanName, isSavedBoard, newSavedId, type SavedBoard } from './lib/saved';
import { safeStorage } from './lib/storage';
import { useLogros } from './logrosStore';
import { LETTER_PRESETS, isPreset, type PresetId } from './game';

export type Screen = 'inicio' | 'personalizar' | 'tablero' | 'ajustes' | 'tableros' | 'logros';
export type ModeChoice = PresetId | 'personalizado' | 'sorpresa';
/** Juego: el Catan base, la ampliación 5-6 jugadores o la expansión Navegantes. */
export type GameId = 'base' | 'cinco-seis' | 'navegantes';
export type BackgroundId = 'espacio' | 'oceano' | 'playa' | 'canoa' | 'parque' | 'mesa' | 'flotante' | 'pergamino' | 'atardecer' | 'bosque' | 'minimal';
const BACKGROUND_IDS: BackgroundId[] = ['espacio', 'oceano', 'playa', 'canoa', 'parque', 'mesa', 'flotante', 'pergamino', 'atardecer', 'bosque', 'minimal'];

/** Fondo guardado de una versión anterior: el Camping pasó a ser el Parque; uno que ya no existe vuelve al Espacio. */
function migrateBackground(id: unknown): BackgroundId {
  if (id === 'camping') return 'parque';
  return BACKGROUND_IDS.includes(id as BackgroundId) ? (id as BackgroundId) : 'espacio';
}
export type AnimSpeed = 'epica' | 'rapida' | 'sin';
/** Calidad del tablero 3D. '2d' = tablero plano (para móviles lentos o si el 3D falla). */
export type Quality = 'alta' | 'media' | 'baja' | '2d';

/** Fondo de la pantalla del tablero: uno sencillo para que la isla destaque, o 'mismo' = el de siempre. */
export type BoardBackground = 'espacio' | 'minimal' | 'mismo';

export interface Settings {
  background: BackgroundId;
  boardBackground: BoardBackground;
  animSpeed: AnimSpeed;
  showPips: boolean;
  quality: Quality;
  /** Efectos de sonido en la animación. */
  sound: boolean;
  /** Números de las fichas: tamaño, letra y si el 6 y el 8 van en rojo. */
  numberSize: NumberSize;
  numberFont: NumberFont;
  redNumbers: boolean;
  /** Título de la portada ("" = el de la app). */
  title: string;
}

export interface Generation {
  /** Modo con el que se generó (en Sorpresa, el que tocó). */
  mode: GenMode;
  result: GenResult;
  /** Cambia en cada generación, para repetir la animación. */
  id: number;
  /** Nombre de la isla ("" si la generación falló). */
  name: string;
  /** Las fichas salen con letras hasta darles la vuelta (Caos total, aunque se retoque). */
  letters: boolean;
  /** Si está en Mis tableros, su id. */
  savedId?: string;
}

interface State {
  screen: Screen;
  /** Juego elegido en "Tu isla". */
  game: GameId;
  /** Navegantes: escenario, jugadores, reparto y piezas opcionales. */
  sea: SeaOptions;
  /** 5-6 jugadores: equilibrado o al azar. */
  csStyle: CincoSeisStyle;
  choice: ModeChoice;
  /** Último modo de la rueda del que se partió: al retocar ajustes (Personalizado) se recuerda, p. ej. para las letras. */
  basePreset: PresetId;
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
  setGame: (game: GameId) => void;
  setSea: (patch: Partial<SeaOptions>) => void;
  setCsStyle: (style: CincoSeisStyle) => void;
  selectMode: (choice: ModeChoice) => void;
  setOption: <K extends keyof GenOptions>(key: K, value: GenOptions[K]) => void;
  clearNotes: () => void;
  generate: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;
  /** Guarda el tablero actual en Mis tableros, o lo quita si ya estaba. */
  toggleSaveCurrent: () => void;
  renameSaved: (id: string, name: string) => void;
  /** Cambia el nombre de la isla que se está viendo (y el guardado, si lo está). */
  renameCurrent: (name: string) => void;
  deleteSaved: (id: string) => void;
  /** Abre una isla guardada en la pantalla del tablero. */
  openSaved: (id: string) => void;
}

const DEFAULT_SETTINGS: Settings = {
  background: 'espacio',
  boardBackground: 'espacio',
  animSpeed: 'epica',
  showPips: true,
  quality: 'alta',
  sound: false,
  numberSize: 'normal',
  numberFont: 'clasica',
  redNumbers: true,
  title: '',
};

/** Largo máximo del título de la portada. */
export const TITLE_MAX = 24;

export const ANIM_FACTOR: Record<AnimSpeed, number> = { epica: 1, rapida: 0.45, sin: 0 };

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      screen: 'inicio',
      game: 'base',
      sea: DEFAULT_SEA,
      csStyle: 'equilibrado',
      choice: 'equilibrado',
      basePreset: 'equilibrado',
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

      setGame: (game) => set({ game }),
      setSea: (patch) => set({ sea: { ...get().sea, ...patch } }),
      setCsStyle: (csStyle) => set({ csStyle }),

      selectMode: (choice) => {
        if (choice === 'sorpresa' || choice === 'personalizado') set({ choice });
        else set({ choice, basePreset: choice, options: PRESETS[choice] });
      },

      setOption: (key, value) => {
        const { options, notes } = setOptionResolving(get().options, key, value);
        const choice = matchPreset(options);
        set({ options, choice, notes, ...(choice === 'personalizado' ? {} : { basePreset: choice }) });
      },
      clearNotes: () => set({ notes: [] }),

      generate: () => {
        const { game, sea, csStyle, choice, basePreset, options, generation } = get();
        let mode: GenMode;
        let result: GenResult;
        let letters = false;
        if (game === 'navegantes') {
          mode = sea.scenario;
          result = generateNavegantes(sea);
        } else if (game === 'cinco-seis') {
          mode = 'cinco-seis';
          result = generateCincoSeis(csStyle);
        } else {
          const preset = choice === 'sorpresa' ? surprisePreset() : choice;
          mode = preset;
          letters = usesLetters(preset, basePreset);
          result = generateBoard(preset === 'personalizado' ? options : PRESETS[preset]);
        }
        const name = result.ok ? islandName(result.board, result.seed) : '';
        set({ generation: { mode, result, id: (generation?.id ?? 0) + 1, name, letters } });
        if (result.ok) useLogros.getState().track({ type: 'generar', mode, score: balanceScore(result.board), hour: new Date().getHours() });
      },

      updateSettings: (patch) => {
        set({ settings: { ...get().settings, ...patch } });
        if (patch.background) useLogros.getState().track({ type: 'fondo', id: patch.background });
      },

      resetAll: () => {
        safeStorage.removeItem('catan-app');
        set({ game: 'base', sea: DEFAULT_SEA, csStyle: 'equilibrado', choice: 'equilibrado', basePreset: 'equilibrado', options: PRESETS.equilibrado, settings: DEFAULT_SETTINGS, generation: null, notes: [], saved: [] });
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
          ...(generation.letters ? { letters: true } : {}),
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

      renameCurrent: (name) => {
        const { generation, renameSaved } = get();
        if (!generation) return;
        if (generation.savedId) return renameSaved(generation.savedId, name);
        set({ generation: { ...generation, name: cleanName(name, generation.name) } });
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
            letters: entry.letters ?? (isPreset(entry.mode) && LETTER_PRESETS.includes(entry.mode)),
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
      partialize: (s) => ({ game: s.game, sea: s.sea, csStyle: s.csStyle, choice: s.choice, basePreset: s.basePreset, options: s.options, settings: s.settings, saved: s.saved }),
      // Si en el futuro se añaden opciones nuevas, las que falten toman su valor por defecto.
      merge: (saved, current) => {
        const s = (saved ?? {}) as Partial<State> & { nmStyle?: string };
        const sea = (s.sea ?? {}) as Partial<SeaOptions>;
        return {
          ...current,
          game: s.game === 'navegantes' || s.game === 'cinco-seis' ? s.game : 'base',
          // Antes de los escenarios solo se guardaba el reparto de Nuevo mundo (nmStyle).
          sea: {
            scenario: SCENARIOS.some((x) => x.id === sea.scenario) ? sea.scenario! : DEFAULT_SEA.scenario,
            players: sea.players === 3 ? 3 : 4,
            style: (sea.style ?? s.nmStyle) === 'azar' ? 'azar' : 'equilibrado',
            extras: { oro: sea.extras?.oro === true, desierto: sea.extras?.desierto === true },
          },
          csStyle: s.csStyle === 'azar' ? 'azar' : 'equilibrado',
          choice: s.choice ?? current.choice,
          basePreset: isPreset(s.basePreset) ? s.basePreset : isPreset(s.choice) ? s.choice : current.basePreset,
          options: { ...current.options, ...s.options },
          settings: {
            ...current.settings,
            ...s.settings,
            background: migrateBackground(s.settings?.background ?? current.settings.background),
            title: typeof s.settings?.title === 'string' ? s.settings.title.slice(0, TITLE_MAX) : '',
          },
          saved: Array.isArray(s.saved) ? s.saved.filter(isSavedBoard) : [],
        };
      },
    },
  ),
);
