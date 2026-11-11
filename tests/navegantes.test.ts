import { describe, expect, it } from 'vitest';
import {
  BASE_GEOMETRY, NM_GOAL, SEA_GEOMETRY, balanceScore, analyzeBoard, generateNuevoMundo, geometryOf, goodIslands, islandsOf, portEdge,
  validateNuevoMundo, type Board,
} from '../src/game';

describe('marco de Navegantes', () => {
  it('tiene 42 hexágonos en columnas 5-6-7-6-7-6-5, con el lado plano arriba', () => {
    expect(SEA_GEOMETRY.hexes).toHaveLength(42);
    expect(SEA_GEOMETRY.flat).toBe(true);
    const columns = new Map<number, number>();
    for (const h of SEA_GEOMETRY.hexes) columns.set(Math.round(h.x * 100), (columns.get(Math.round(h.x * 100)) ?? 0) + 1);
    expect([...columns.entries()].sort((a, b) => a[0] - b[0]).map(([, n]) => n)).toEqual([5, 6, 7, 6, 7, 6, 5]);
  });

  it('cada hexágono tiene entre 2 y 6 vecinos, y está centrado', () => {
    for (const h of SEA_GEOMETRY.hexes) {
      expect(h.neighbors.length).toBeGreaterThanOrEqual(2);
      expect(h.neighbors.length).toBeLessThanOrEqual(6);
    }
    const xs = SEA_GEOMETRY.hexes.map((h) => h.x);
    expect(Math.min(...xs) + Math.max(...xs)).toBeCloseTo(0);
  });

  it('los tableros de antes (sin "map") siguen siendo del Catan base', () => {
    expect(geometryOf({})).toBe(BASE_GEOMETRY);
    expect(geometryOf({ map: 'nuevo-mundo' })).toBe(SEA_GEOMETRY);
  });
});

describe('Nuevo mundo', () => {
  const boards: Board[] = [];
  for (let seed = 1; seed <= 40; seed++) {
    const r = generateNuevoMundo('equilibrado', seed);
    if (r.ok) boards.push(r.board);
  }

  it('siempre sale un mapa válido con las piezas oficiales', () => {
    expect(boards).toHaveLength(40);
    for (const b of boards) expect(validateNuevoMundo(b)).toEqual([]);
  });

  it('equilibrado: islas razonables', () => {
    for (const b of boards) {
      expect(goodIslands(b.terrains)).toBe(true);
      const islands = islandsOf(b.terrains);
      expect(islands.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('los puertos están entre tierra y mar y no comparten esquina', () => {
    for (const b of boards) {
      const corners = b.ports.flatMap((p) => {
        const e = portEdge(SEA_GEOMETRY, p.coast);
        return [e.a, e.b];
      });
      expect(new Set(corners).size).toBe(corners.length);
    }
  });

  it('con el reparto al azar también sale válido', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = generateNuevoMundo('azar', seed);
      expect(r.ok).toBe(true);
      if (r.ok) expect(validateNuevoMundo(r.board)).toEqual([]);
    }
  });

  it('se puede analizar y puntuar como cualquier tablero', () => {
    const b = boards[0];
    const a = analyzeBoard(b);
    expect(a.score).toBe(balanceScore(b));
    expect(a.bestVertices[0].vertex).toBeLessThan(SEA_GEOMETRY.vertices.length);
  });

  it('la misma semilla da el mismo mapa', () => {
    expect(generateNuevoMundo('equilibrado', 7)).toEqual(generateNuevoMundo('equilibrado', 7));
    expect(NM_GOAL).toBe(12);
  });
});

describe('Nuevo mundo con oro y desierto (variante)', () => {
  it.each([
    { oro: true, desierto: false },
    { oro: false, desierto: true },
    { oro: true, desierto: true },
  ])('genera mapas correctos con %o', (extras) => {
    for (const style of ['equilibrado', 'azar'] as const) {
      for (let seed = 1; seed <= 25; seed++) {
        const r = generateNuevoMundo(style, seed, extras);
        expect(r.ok).toBe(true);
        if (!r.ok) continue;
        expect(validateNuevoMundo(r.board)).toEqual([]);
        expect(r.board.terrains.filter((t) => t === 'oro')).toHaveLength(extras.oro ? 2 : 0);
        expect(r.board.terrains.filter((t) => t === 'desierto')).toHaveLength(extras.desierto ? 2 : 0);
      }
    }
  });
});
