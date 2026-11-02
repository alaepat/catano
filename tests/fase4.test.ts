import { describe, expect, it } from 'vitest';
import { HEXES, PRESETS, generateBoard } from '../src/game';
import { comentario } from '../src/lib/comentario';
import { islandName, type NameParts } from '../src/lib/islandName';
import { cleanName, isSavedBoard, type SavedBoard } from '../src/lib/saved';
import { SEQ, soundTimeline } from '../src/three/timeline';
import { analyzeBoard } from '../src/game';
import nombres from '../src/data/nombres-isla.json';

function board(seed: number) {
  const r = generateBoard(PRESETS.equilibrado, seed);
  if (!r.ok) throw new Error(r.error);
  return r.board;
}

describe('nombres de isla', () => {
  it('la misma semilla da siempre el mismo nombre', () => {
    const b = board(42);
    expect(islandName(b, 42)).toBe(islandName(b, 42));
  });

  it('siempre es "lugar + de/del..." y varía entre islas', () => {
    const names = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) {
      const n = islandName(board(seed), seed);
      expect(n).toMatch(/^\S+ (de|del) /);
      names.add(n);
    }
    expect(names.size).toBeGreaterThan(100);
  });

  it('usa las bromas del grupo cuando las hay', () => {
    const parts: NameParts = { ...(nombres as NameParts), bromas: ['de la Broma Secreta'] };
    const withJoke = Array.from({ length: 200 }, (_, seed) => islandName(board(seed + 1), seed + 1, parts));
    expect(withJoke.some((n) => n.endsWith('de la Broma Secreta'))).toBe(true);
  });
});

describe('Mis tableros', () => {
  const entry: SavedBoard = { id: 'a', name: 'Isla', date: '2026-11-02T00:00:00.000Z', mode: 'equilibrado', seed: 1, score: 90, board: board(1) };

  it('reconoce un guardado bueno y rechaza uno roto', () => {
    expect(isSavedBoard(entry)).toBe(true);
    expect(isSavedBoard(null)).toBe(false);
    expect(isSavedBoard({ ...entry, mode: 'inventado' })).toBe(false);
    expect(isSavedBoard({ ...entry, board: { ...entry.board, terrains: [] } })).toBe(false);
  });

  it('limpia los nombres', () => {
    expect(cleanName('  Isla   Bonita ', 'X')).toBe('Isla Bonita');
    expect(cleanName('   ', 'Anterior')).toBe('Anterior');
    expect(cleanName('a'.repeat(80), 'X')).toHaveLength(40);
  });
});

describe('sonidos de la animación', () => {
  it('un golpe por hexágono, uno por ficha, uno por puerto, humo y acorde final', () => {
    const b = board(7);
    const numbered = b.numbers.flatMap((n, id) => (n == null ? [] : [id]));
    const events = soundTimeline(numbered, b.ports.length, b.robber !== null, 1);
    expect(events.filter((e) => e.kind === 'tock')).toHaveLength(HEXES.length);
    expect(events.filter((e) => e.kind === 'clink')).toHaveLength(18);
    expect(events.filter((e) => e.kind === 'whoosh')).toHaveLength(9);
    expect(events.filter((e) => e.kind === 'chord')).toHaveLength(1);
    for (const e of events) expect(e.at).toBeLessThanOrEqual(SEQ.end);
  });

  it('a velocidad rápida todo suena antes', () => {
    const events = soundTimeline([0, 1], 0, false, 0.45);
    expect(Math.max(...events.map((e) => e.at))).toBeLessThanOrEqual(SEQ.end * 0.45);
  });
});

describe('comentario del análisis', () => {
  it('siempre dice algo', () => {
    for (let seed = 1; seed <= 50; seed++) expect(comentario(analyzeBoard(board(seed))).length).toBeGreaterThan(20);
  });
});
