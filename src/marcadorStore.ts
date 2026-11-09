// Estado del marcador, guardado en el móvil: jugadores habituales, partida en curso y salón de la fama.
// La partida sobrevive a cerrar la app (y a generar otra isla).
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  GOAL, MAX_PLAYERS, apply, cleanPlayerName, isMatch, isPlayer, isWin, minutesBetween, newMatch, points,
  type Action, type Match, type Player, type PlayerColor, type Win,
} from './lib/marcador';
import { NM_GOAL } from './game/navegantes';
import { safeStorage } from './lib/storage';
import { useLogros } from './logrosStore';

const MAX_UNDO = 40;
const MAX_WINS = 200;

interface MarcadorState {
  /** Jugadores habituales (se reutilizan en cada partida). */
  roster: Player[];
  match: Match | null;
  /** Estados anteriores de la partida, para Deshacer (no se guardan en el móvil). */
  past: Match[];
  wins: Win[];

  addPlayer: (name: string, color: PlayerColor) => void;
  removePlayer: (id: string) => void;
  /** Empieza una partida. Navegantes: meta 12 e islas nuevas. */
  startMatch: (ids: string[], seafarers?: boolean) => void;
  act: (playerId: string, action: Action) => void;
  undo: () => void;
  /** Termina la partida; si hay ganador, entra en el salón de la fama. */
  finishMatch: () => void;
}

const newId = () => Math.random().toString(36).slice(2, 10);

export const useMarcador = create<MarcadorState>()(
  persist(
    (set, get) => ({
      roster: [],
      match: null,
      past: [],
      wins: [],

      addPlayer: (name, color) => {
        const clean = cleanPlayerName(name);
        const { roster } = get();
        if (!clean || roster.length >= 12) return;
        set({ roster: [...roster, { id: newId(), name: clean, color }] });
      },

      removePlayer: (id) => set({ roster: get().roster.filter((p) => p.id !== id) }),

      startMatch: (ids, seafarers = false) => {
        const players = ids.map((id) => get().roster.find((p) => p.id === id)).filter((p): p is Player => Boolean(p));
        if (players.length < 2) return;
        set({ match: newMatch(players.slice(0, MAX_PLAYERS), Date.now(), seafarers ? NM_GOAL : GOAL, seafarers), past: [] });
      },

      act: (playerId, action) => {
        const { match, past } = get();
        if (!match) return;
        const next = apply(match, playerId, action);
        if (next === match) return;
        set({ match: next, past: [...past, match].slice(-MAX_UNDO) });
      },

      undo: () => {
        const { past } = get();
        if (!past.length) return;
        set({ match: past[past.length - 1], past: past.slice(0, -1) });
      },

      finishMatch: () => {
        const { match, wins } = get();
        if (!match) return;
        const winner = match.players.find((p) => p.id === match.winner);
        if (winner) {
          const win: Win = {
            name: winner.name,
            color: winner.color,
            points: points(match, winner.id),
            date: new Date(match.endedAt ?? Date.now()).toISOString(),
            minutes: minutesBetween(match.startedAt, match.endedAt ?? Date.now()),
            players: match.players.length,
          };
          set({ wins: [win, ...wins].slice(0, MAX_WINS) });
          useLogros.getState().track({ type: 'partida' });
        }
        set({ match: null, past: [] });
      },
    }),
    {
      name: 'catan-marcador',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ roster: s.roster, match: s.match, wins: s.wins }),
      merge: (saved, current) => {
        const s = (saved ?? {}) as Partial<MarcadorState>;
        return {
          ...current,
          roster: Array.isArray(s.roster) ? s.roster.filter(isPlayer) : [],
          match: isMatch(s.match) ? s.match : null,
          wins: Array.isArray(s.wins) ? s.wins.filter(isWin) : [],
        };
      },
    },
  ),
);
