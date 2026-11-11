import { describe, expect, it } from 'vitest';
import { PRESETS, SPIRAL_TOKENS, generateBoard, generateCincoSeis, generateNavegantes, letterLabels, usesLetters } from '../src/game';

describe('Letras de las fichas', () => {
  it('Catan base: cada ficha lleva la letra de verdad (A-R, sin repetir)', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = generateBoard(PRESETS.equilibrado, seed);
      if (!r.ok) throw new Error(r.error);
      const labels = letterLabels(r.board);
      const used = labels.filter((l): l is string => l != null);
      expect(used.sort().join('')).toBe('ABCDEFGHIJKLMNOPQR');
      labels.forEach((l, i) => {
        if (l == null) expect(r.board.numbers[i]).toBeNull();
        else expect(SPIRAL_TOKENS[l.charCodeAt(0) - 65]).toBe(r.board.numbers[i]);
      });
    }
  });

  it('otros mapas: una letra distinta por ficha', () => {
    const boards = [
      generateCincoSeis('equilibrado', 3),
      generateNavegantes({ scenario: 'nuevo-mundo', players: 4, style: 'equilibrado', extras: { oro: true, desierto: false } }, 3),
      generateNavegantes({ scenario: 'tribu', players: 4, style: 'equilibrado', extras: { oro: false, desierto: false } }, 3),
    ];
    for (const r of boards) {
      if (!r.ok) throw new Error(r.error);
      const labels = letterLabels(r.board);
      const used = labels.filter((l) => l != null);
      expect(used).toHaveLength(r.board.numbers.filter((n) => n != null).length);
      expect(new Set(used).size).toBe(used.length);
    }
  });
});

describe('Qué tableros van con letras', () => {
  it('Caos total sí, aunque se retoque (Personalizado a partir de Caos total)', () => {
    expect(usesLetters('caos', 'caos')).toBe(true);
    expect(usesLetters('personalizado', 'caos')).toBe(true);
  });
  it('los demás modos no', () => {
    expect(usesLetters('equilibrado', 'equilibrado')).toBe(false);
    expect(usesLetters('personalizado', 'equilibrado')).toBe(false);
    expect(usesLetters('equilibrado', 'caos')).toBe(false);
  });
});
