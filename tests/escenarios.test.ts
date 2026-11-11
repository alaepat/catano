import { describe, expect, it } from 'vitest';
import {
  CUATRO_ISLAS_GEOMETRY, S1_MAIN, S1_SMALL, S2_TOKENS, S3_FOG, S3_TOKENS, S4_DESERTS, S4_FOREIGN_TOKENS, S4_MAIN_TOKENS,
  NUMBER_TOKENS, S1_SMALL_TOKENS, SCENARIOS, SEA_GEOMETRY, generateNavegantes, geometryOf, isRed, landSeaEdges,
  type Board, type MappedScenario, type Terrain,
} from '../src/game';
import { countAdjacentPairs } from '../src/game/rules';

const MAPPED: MappedScenario[] = ['nuevas-costas', 'cuatro-islas', 'niebla', 'desierto'];
const count = (b: Board, t: Terrain) => b.terrains.filter((x) => x === t).length;
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b).join();
const numbersOf = (b: Board, hexes?: number[]) =>
  (hexes ?? b.terrains.map((_, i) => i)).flatMap((h) => (b.numbers[h] == null ? [] : [b.numbers[h]!]));

function gen(id: MappedScenario, style: 'equilibrado' | 'azar', seed: number): Board {
  const r = generateNavegantes({ scenario: id, players: 4, style, extras: { oro: false, desierto: false } }, seed);
  if (!r.ok) throw new Error(`${id} ${style} ${seed}: ${r.error}`);
  return r.board;
}

describe('Escenarios de Navegantes', () => {
  it('están todos en la lista, en orden del libro tras Nuevo mundo', () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual(['nuevo-mundo', ...MAPPED]);
  });

  it('Rumbo a nuevas costas: isla de 19, 10 de mar alrededor y 13 lejanas', () => {
    expect(S1_MAIN).toHaveLength(19);
    expect(S1_SMALL).toHaveLength(13);
  });

  for (const id of MAPPED) {
    for (const style of ['equilibrado', 'azar'] as const) {
      it(`${id} (${style}) sale siempre bien`, () => {
        for (let seed = 1; seed <= 12; seed++) {
          const b = gen(id, style, seed);
          const geo = geometryOf(b);
          expect(b.map).toBe(id);
          expect(b.terrains).toHaveLength(geo.hexes.length);
          // 6 y 8 nunca juntos.
          expect(countAdjacentPairs(b.numbers, (x, y) => isRed(x) && isRed(y), geo)).toBe(0);
          // 9 puertos entre tierra y mar, sin compartir cruce.
          expect(b.ports).toHaveLength(9);
          const ends = b.ports.flatMap((p) => [geo.edges[p.coast].a, geo.edges[p.coast].b]);
          expect(new Set(ends).size).toBe(18);
          const valid = new Set(landSeaEdges(b.terrains, b.terrains.map((_, i) => i), geo));
          expect(b.ports.every((p) => valid.has(p.coast))).toBe(true);
          // El pirata, en el mar; el ladrón, en tierra.
          expect(b.terrains[b.pirate!]).toBe('mar');
          expect(b.robber).not.toBeNull();
          // Toda tierra (menos el desierto) tiene número; mar y niebla, no.
          b.terrains.forEach((t, i) => {
            const needs = t !== 'mar' && t !== 'niebla' && t !== 'desierto';
            expect(b.numbers[i] != null).toBe(needs);
          });
          // El oro nunca lleva 6 ni 8.
          expect(b.terrains.some((t, i) => t === 'oro' && isRed(b.numbers[i]))).toBe(false);

          if (id === 'nuevas-costas') {
            expect(geo.hexes).toHaveLength(SEA_GEOMETRY.hexes.length);
            expect(count(b, 'mar')).toBe(14);
            expect(count(b, 'oro')).toBe(2);
            expect(b.terrains[b.robber!]).toBe('desierto');
            expect(sorted(numbersOf(b, S1_MAIN))).toBe(sorted(NUMBER_TOKENS));
            expect(sorted(numbersOf(b, S1_SMALL))).toBe(sorted(S1_SMALL_TOKENS));
            expect(b.ports.every((p) => geo.edges[p.coast].hexes.some((h) => S1_MAIN.includes(h)))).toBe(true);
          }
          if (id === 'cuatro-islas') {
            expect(geo).toBe(CUATRO_ISLAS_GEOMETRY);
            expect(geo.hexes).toHaveLength(35);
            expect(count(b, 'mar')).toBe(12);
            expect(sorted(numbersOf(b))).toBe(sorted(S2_TOKENS));
            expect(b.numbers[b.robber!]).toBe(12);
            // Bosque y pasto sin números malos.
            expect(b.terrains.some((t, i) => (t === 'bosque' || t === 'pasto') && [2, 3, 11, 12].includes(b.numbers[i]!))).toBe(false);
          }
          if (id === 'niebla') {
            expect(count(b, 'niebla')).toBe(12);
            expect(S3_FOG.every((h) => b.terrains[h] === 'niebla')).toBe(true);
            expect(count(b, 'mar')).toBe(13);
            expect(sorted(numbersOf(b))).toBe(sorted(S3_TOKENS));
            expect(b.numbers[b.robber!]).toBe(12);
          }
          if (id === 'desierto') {
            expect(S4_DESERTS.every((h) => b.terrains[h] === 'desierto')).toBe(true);
            expect(S4_DESERTS).toContain(b.robber);
            expect(count(b, 'mar')).toBe(12);
            expect(count(b, 'oro')).toBe(2);
            expect(sorted(numbersOf(b))).toBe(sorted([...S4_MAIN_TOKENS, ...S4_FOREIGN_TOKENS]));
          }
        }
      });
    }
  }
});
