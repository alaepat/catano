import { describe, expect, it } from 'vitest';
import {
  MAX_CIUDADES, MAX_PUEBLOS, apply, blocked, durationLabel, fameTable, isMatch, newMatch, points, ranking, type Match, type Player,
} from '../src/lib/marcador';

const ana: Player = { id: 'a', name: 'Ana', color: 'rojo' };
const luis: Player = { id: 'l', name: 'Luis', color: 'azul' };

const run = (m: Match, ...steps: [string, Parameters<typeof apply>[2]][]) => steps.reduce((acc, [id, a]) => apply(acc, id, a, 1000), m);

describe('marcador', () => {
  it('cada jugador empieza con 2 pueblos (2 puntos)', () => {
    const m = newMatch([ana, luis], 0);
    expect(points(m, 'a')).toBe(2);
    expect(points(m, 'l')).toBe(2);
  });

  it('pueblo +1, ciudad +1 (sustituye al pueblo), carta +1', () => {
    let m = newMatch([ana, luis], 0);
    m = run(m, ['a', 'pueblo'], ['a', 'ciudad'], ['a', 'carta']);
    expect(points(m, 'a')).toBe(5);
    const p = m.players[0];
    expect([p.pueblos, p.ciudades, p.cartas]).toEqual([2, 1, 1]);
  });

  it('respeta las piezas de la caja', () => {
    let m = newMatch([ana, luis], 0);
    for (let i = 0; i < 10; i++) m = apply(m, 'a', 'pueblo');
    expect(m.players[0].pueblos).toBe(MAX_PUEBLOS);
    expect(blocked(m, 'a', 'pueblo')).toBeTruthy();
    for (let i = 0; i < 10; i++) m = apply(m, 'a', 'ciudad');
    expect(m.players[0].ciudades).toBe(MAX_CIUDADES);
  });

  it('no hay ciudad sin pueblo', () => {
    let m = newMatch([ana, luis], 0);
    m = run(m, ['a', 'ciudad'], ['a', 'ciudad']);
    expect(blocked(m, 'a', 'ciudad')).toBeTruthy();
    expect(apply(m, 'a', 'ciudad')).toBe(m);
  });

  it('la carretera más larga pasa de un jugador a otro (+2) y se puede quitar', () => {
    let m = newMatch([ana, luis], 0);
    m = apply(m, 'a', 'carretera');
    expect(points(m, 'a')).toBe(4);
    m = apply(m, 'l', 'carretera');
    expect(points(m, 'a')).toBe(2);
    expect(points(m, 'l')).toBe(4);
    m = apply(m, 'l', 'carretera');
    expect(m.road).toBeNull();
  });

  it('marca ganador al llegar a 10', () => {
    let m = newMatch([ana, luis], 0);
    m = run(m, ['a', 'ciudad'], ['a', 'ciudad'], ['a', 'pueblo'], ['a', 'ciudad'], ['a', 'carretera'], ['a', 'carta']);
    expect(points(m, 'a')).toBe(9);
    expect(m.winner).toBeNull();
    m = apply(m, 'a', 'ejercito', 5000);
    expect(points(m, 'a')).toBe(11);
    expect(m.winner).toBe('a');
    expect(m.endedAt).toBe(5000);
    expect(ranking(m)[0].player.id).toBe('a');
  });

  it('salón de la fama agrupa por nombre', () => {
    const wins = [
      { name: 'Ana', color: 'rojo' as const, points: 10, date: '', minutes: 60, players: 4 },
      { name: 'ana ', color: 'verde' as const, points: 11, date: '', minutes: 50, players: 4 },
      { name: 'Luis', color: 'azul' as const, points: 10, date: '', minutes: 70, players: 3 },
    ];
    expect(fameTable(wins).map((r) => [r.name, r.wins])).toEqual([
      ['Ana', 2],
      ['Luis', 1],
    ]);
  });

  it('textos de duración y validación de lo guardado', () => {
    expect(durationLabel(45)).toBe('45 min');
    expect(durationLabel(90)).toBe('1 h 30 min');
    expect(isMatch(newMatch([ana, luis]))).toBe(true);
    expect(isMatch({ players: 'x' })).toBe(false);
  });
});

describe('marcador de Navegantes', () => {
  it('va a 12 puntos y cada isla nueva da 1 punto', () => {
    let m = newMatch([ana, luis], 0, 12, true);
    expect(m.goal).toBe(12);
    m = run(m, ['a', 'isla'], ['a', 'isla']);
    expect(points(m, 'a')).toBe(4);
    expect(m.players[0].islas).toBe(2);
  });

  it('en el Catan base no hay islas nuevas', () => {
    const m = newMatch([ana, luis], 0);
    expect(blocked(m, 'a', 'isla')).not.toBeNull();
    expect(apply(m, 'a', 'isla')).toBe(m);
  });

  it('las partidas de antes (sin islas) se siguen leyendo y contando', () => {
    const old = newMatch([ana, luis], 0);
    expect(isMatch(old)).toBe(true);
    expect(points(old, 'a')).toBe(2);
  });

  it('gana al llegar a 12, no a 10', () => {
    let m = newMatch([ana, luis], 0, 12, true);
    m = run(m, ['a', 'pueblo'], ['a', 'pueblo'], ['a', 'pueblo'], ['a', 'ciudad'], ['a', 'ciudad'], ['a', 'ciudad']);
    expect(points(m, 'a')).toBe(8);
    m = run(m, ['a', 'carretera'], ['a', 'isla']);
    expect(points(m, 'a')).toBe(11);
    expect(m.winner).toBeNull();
    m = run(m, ['a', 'isla']);
    expect(m.winner).toBe('a');
  });
});
