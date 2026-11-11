import { describe, expect, it } from 'vitest';
import { CINCO_SEIS_GEOMETRY, generateCincoSeis, validateCincoSeis } from '../src/game';

describe('ampliación 5-6 jugadores', () => {
  it('la isla tiene 30 hexágonos en filas 3-4-5-6-5-4-3', () => {
    expect(CINCO_SEIS_GEOMETRY.hexes).toHaveLength(30);
    const rows = new Map<number, number>();
    for (const h of CINCO_SEIS_GEOMETRY.hexes) rows.set(Math.round(h.y * 100), (rows.get(Math.round(h.y * 100)) ?? 0) + 1);
    expect([...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, n]) => n)).toEqual([3, 4, 5, 6, 5, 4, 3]);
  });

  it.each(['equilibrado', 'azar'] as const)('genera tableros correctos (%s)', (style) => {
    for (let seed = 1; seed <= 40; seed++) {
      const r = generateCincoSeis(style, seed);
      expect(r.ok).toBe(true);
      if (r.ok) expect(validateCincoSeis(r.board)).toEqual([]);
    }
  });
});
