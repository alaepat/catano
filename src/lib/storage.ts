// localStorage puede fallar (modo incógnito, datos bloqueados): nunca debe romper la app.
import type { StateStorage } from 'zustand/middleware';

export const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* sin guardado: la app sigue funcionando */
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* nada */
    }
  },
};
