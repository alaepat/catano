// Progreso de los logros, guardado en el móvil. `track` cuenta lo que pasa y, si se consigue un logro
// nuevo, lo pone en la cola de avisos (la muestra `LogroToast`).
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { EMPTY_PROGRESS, LOGROS, applyEvent, cleanProgress, doneIds, type LogroEvent, type Progress } from './lib/logros';
import { safeStorage } from './lib/storage';

interface LogrosState {
  progress: Progress;
  /** Logros conseguidos: id → fecha (ISO). */
  unlocked: Record<string, string>;
  /** Títulos de logros recién conseguidos, pendientes de avisar (no se guarda). */
  queue: string[];

  track: (e: LogroEvent) => void;
  clearQueue: () => void;
  reset: () => void;
}

export const useLogros = create<LogrosState>()(
  persist(
    (set, get) => ({
      progress: EMPTY_PROGRESS,
      unlocked: {},
      queue: [],

      track: (e) => {
        const { progress, unlocked, queue } = get();
        const next = applyEvent(progress, e);
        const fresh = doneIds(next).filter((id) => !unlocked[id]);
        if (!fresh.length) {
          set({ progress: next });
          return;
        }
        const now = new Date().toISOString();
        const titles = fresh.map((id) => LOGROS.find((l) => l.id === id)?.title ?? id);
        set({
          progress: next,
          unlocked: { ...unlocked, ...Object.fromEntries(fresh.map((id) => [id, now])) },
          queue: [...queue, ...titles],
        });
      },

      clearQueue: () => set({ queue: [] }),
      reset: () => set({ progress: EMPTY_PROGRESS, unlocked: {}, queue: [] }),
    }),
    {
      name: 'catan-logros',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ progress: s.progress, unlocked: s.unlocked }),
      merge: (saved, current) => {
        const s = (saved ?? {}) as Partial<LogrosState>;
        const unlocked =
          s.unlocked && typeof s.unlocked === 'object'
            ? Object.fromEntries(Object.entries(s.unlocked).filter(([, v]) => typeof v === 'string'))
            : {};
        return { ...current, progress: cleanProgress(s.progress), unlocked };
      },
    },
  ),
);
