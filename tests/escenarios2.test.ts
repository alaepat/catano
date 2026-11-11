import { describe, expect, it } from 'vitest';
import {
  BOOK_MAPS, GRANDE_GEOMETRY as GEO, MARAVILLAS_MAIN, TELA_TRIBE, TRIBU_MAIN, generateNavegantes, isRed,
  type Board, type MappedScenario2, type Terrain,
} from '../src/game';
import { countAdjacentPairs } from '../src/game/rules';

// Piezas de cada escenario según la lista de componentes del libro.
const BOOK: Record<MappedScenario2, { terrains: Partial<Record<Terrain, number>>; tokens: Record<number, number> }> = {
  tribu: {
    terrains: { mar: 19, desierto: 3, oro: 2, cereal: 5, colinas: 5, montanas: 5, pasto: 5, bosque: 5 },
    tokens: { 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 1 },
  },
  tela: {
    // El libro cuenta 18 de mar: las 7 casillas del borde que quedan vacías son marco.
    terrains: { mar: 25, desierto: 2, oro: 2, cereal: 5, colinas: 3, montanas: 4, pasto: 4, bosque: 4 },
    // 28 fichas: 20 en las islas grandes y 8 en las aldeas.
    tokens: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 2 },
  },
  piratas: {
    terrains: { mar: 19, desierto: 3, oro: 2, cereal: 5, colinas: 5, montanas: 5, pasto: 5, bosque: 5 },
    tokens: { 2: 1, 3: 2, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 2, 12: 1 },
  },
  maravillas: {
    terrains: { mar: 19, desierto: 3, oro: 2, cereal: 5, colinas: 5, montanas: 5, pasto: 5, bosque: 5 },
    tokens: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 1 },
  },
};

const IDS: MappedScenario2[] = ['tribu', 'tela', 'piratas', 'maravillas'];
const tally = <T extends string | number>(xs: T[]) => xs.reduce((m, x) => ({ ...m, [x]: (m[x] ?? 0) + 1 }), {} as Record<T, number>);
const tokensOf = (b: Pick<Board, 'numbers' | 'spots'>) => [
  ...b.numbers.flatMap((n) => (n == null ? [] : [n])),
  ...(b.spots ?? []).flatMap((s) => (s.n == null ? [] : [s.n])),
];
const isLand = (t: Terrain | undefined) => t !== undefined && t !== 'mar';

describe('Escenarios 5-8 (marco de 49)', () => {
  it('el marco tiene 49 hexágonos', () => expect(GEO.hexes).toHaveLength(49));

  for (const id of IDS) {
    it(`${id}: el dibujo copiado tiene las piezas del libro`, () => {
      const book = BOOK_MAPS[id];
      expect(tally(book.terrains)).toEqual(BOOK[id].terrains);
    });

    for (const style of ['equilibrado', 'azar'] as const) {
      it(`${id} (${style}) sale bien`, () => {
        for (let seed = 1; seed <= 10; seed++) {
          const r = generateNavegantes({ scenario: id, players: 4, style, extras: { oro: false, desierto: false } }, seed);
          if (!r.ok) throw new Error(`${id} ${seed}: ${r.error}`);
          const b = r.board;
          expect(b.map).toBe(id);
          expect(tally(b.terrains)).toEqual(BOOK[id].terrains);
          expect(tally(tokensOf(b))).toEqual(BOOK[id].tokens);
          expect(countAdjacentPairs(b.numbers, (x, y) => isRed(x) && isRed(y), GEO)).toBe(0);
          // Puertos: en un lado con tierra a un lado y mar (o marco) al otro, sin compartir cruce.
          for (const p of b.ports) {
            const hexes = GEO.edges[p.coast].hexes;
            expect(hexes.filter((h) => isLand(b.terrains[h]))).toHaveLength(1);
          }
          const ends = b.ports.flatMap((p) => [GEO.edges[p.coast].a, GEO.edges[p.coast].b]);
          expect(new Set(ends).size).toBe(ends.length);
          // Cruces especiales, todos distintos y junto a tierra.
          const spots = b.spots ?? [];
          expect(new Set(spots.map((s) => s.vertex)).size).toBe(spots.length);
          for (const s of spots) expect(GEO.vertices[s.vertex].hexes.some((h) => isLand(b.terrains[h]))).toBe(true);
          // Regalos, en lados distintos y que tocan tierra.
          const gifts = b.gifts ?? [];
          expect(new Set(gifts.map((g) => g.edge)).size).toBe(gifts.length);
          for (const g of gifts) expect(GEO.edges[g.edge].hexes.some((h) => isLand(b.terrains[h]))).toBe(true);
          if (b.pirate != null) expect(b.terrains[b.pirate]).toBe('mar');

          if (id === 'tribu') {
            expect(b.terrains[b.robber!]).toBe('desierto');
            expect(b.ports).toHaveLength(6);
            expect(gifts.filter((g) => g.kind === 'punto')).toHaveLength(8);
            expect(gifts.filter((g) => g.kind === 'carta')).toHaveLength(4);
            // Fuera de la isla grande no hay números.
            b.numbers.forEach((n, i) => expect(n != null).toBe(TRIBU_MAIN.includes(i)));
          }
          if (id === 'tela') {
            expect(b.numbers[b.robber!]).toBe(12);
            expect(spots.filter((s) => s.kind === 'aldea')).toHaveLength(8);
            for (const s of spots) expect(GEO.vertices[s.vertex].hexes.some((h) => TELA_TRIBE.includes(h))).toBe(true);
            expect(b.ports).toHaveLength(9);
          }
          if (id === 'piratas') {
            expect(b.robber).toBeNull();
            expect(b.terrains).toEqual(BOOK_MAPS.piratas.terrains);
            expect(b.numbers).toEqual(BOOK_MAPS.piratas.numbers);
            expect(spots).toHaveLength(12);
            expect(b.ports).toHaveLength(8);
          }
          if (id === 'maravillas') {
            expect(b.terrains[b.robber!]).toBe('desierto');
            expect(b.pirate).toBeNull();
            expect(b.ports).toHaveLength(9);
            // Lo de fuera de la isla grande, como en el libro.
            b.terrains.forEach((t, i) => {
              if (!MARAVILLAS_MAIN.includes(i)) expect(t).toBe(BOOK_MAPS.maravillas.terrains[i]);
            });
          }
        }
      });
    }
  }
});
