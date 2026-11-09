import { describe, expect, it } from 'vitest';
import type { PresetId } from '../src/game';
import { EMPTY_PROGRESS, LOGROS, applyEvent, cleanProgress, doneIds, type LogroEvent, type Progress } from '../src/lib/logros';

const run = (events: LogroEvent[], from: Progress = EMPTY_PROGRESS) => events.reduce(applyEvent, from);
const gen = (mode: PresetId | 'personalizado' | 'nuevo-mundo', score = 80, hour = 18): LogroEvent => ({ type: 'generar', mode, score, hour });

describe('logros', () => {
  it('al principio no hay ninguno', () => {
    expect(doneIds(EMPTY_PROGRESS)).toEqual([]);
  });

  it('el primer tablero da "Primera isla", y 10 dan "Cartógrafo"', () => {
    expect(doneIds(run([gen('equilibrado')]))).toEqual(['primera-isla']);
    const ten = run(Array.from({ length: 10 }, () => gen('oficial')));
    expect(doneIds(ten)).toContain('cartografo');
    expect(doneIds(ten)).not.toContain('explorador');
  });

  it('cuenta cada modo una sola vez; el personalizado no cuenta', () => {
    const p = run([gen('caos'), gen('caos'), gen('personalizado')]);
    expect(p.modes).toEqual(['caos']);
    expect(p.chaos).toBe(2);
  });

  it('con los 9 modos se consigue "Probador de modos"', () => {
    const modes = ['oficial', 'equilibrado', 'competitivo', 'tranquila', 'escasez', 'continentes', 'centro', 'mercaderes', 'caos'] as const;
    expect(doneIds(run(modes.map((m) => gen(m))))).toContain('todos-los-modos');
  });

  it('equilibrio alto, bajo y de madrugada', () => {
    const ids = doneIds(run([gen('caos', 96, 3), gen('caos', 40, 14)]));
    expect(ids).toEqual(expect.arrayContaining(['juez', 'llorar', 'noctambulo']));
    expect(doneIds(run([gen('caos', 80, 5)]))).not.toContain('noctambulo');
  });

  it('tocar los 6 terrenos da "Geólogo" (repetir no suma)', () => {
    const terrains = ['bosque', 'pasto', 'cereal', 'colinas', 'montanas', 'bosque'] as const;
    const p = run(terrains.map((terrain) => ({ type: 'tocar', terrain }) as LogroEvent));
    expect(p.terrains).toHaveLength(5);
    expect(doneIds(run([{ type: 'tocar', terrain: 'desierto' }], p))).toContain('geologo');
  });

  it('Navegantes: da su logro y no cuenta como modo del base; el mar no cuenta para el Geólogo', () => {
    const p = run([gen('nuevo-mundo'), { type: 'tocar', terrain: 'mar' }]);
    expect(doneIds(p)).toContain('navegante');
    expect(p.modes).toEqual([]);
    expect(p.terrains).toEqual([]);
  });

  it('partidas terminadas', () => {
    expect(doneIds(run([{ type: 'partida' }]))).toEqual(['a-la-mesa']);
  });

  it('lee bien datos guardados rotos o antiguos', () => {
    expect(cleanProgress(undefined)).toEqual(EMPTY_PROGRESS);
    expect(cleanProgress({ generated: 'x', modes: [1, 'caos'], night: 'sí' })).toEqual({ ...EMPTY_PROGRESS, modes: ['caos'] });
  });

  it('cada logro tiene id único y meta positiva', () => {
    expect(new Set(LOGROS.map((l) => l.id)).size).toBe(LOGROS.length);
    for (const l of LOGROS) expect(l.goal).toBeGreaterThan(0);
  });
});
