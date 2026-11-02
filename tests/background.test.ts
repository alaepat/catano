import { describe, expect, it } from 'vitest';
import { backgroundFor } from '../src/lib/background';

describe('fondo de cada pantalla', () => {
  it('en el tablero usa el fondo del tablero', () => {
    expect(backgroundFor('tablero', { background: 'parque', boardBackground: 'espacio' })).toBe('espacio');
    expect(backgroundFor('tablero', { background: 'mesa', boardBackground: 'minimal' })).toBe('minimal');
  });
  it('con "El mismo", el tablero mantiene el fondo elegido', () => {
    expect(backgroundFor('tablero', { background: 'parque', boardBackground: 'mismo' })).toBe('parque');
  });
  it('fuera del tablero siempre se ve el fondo elegido', () => {
    for (const screen of ['inicio', 'personalizar', 'ajustes', 'tableros'] as const) {
      expect(backgroundFor(screen, { background: 'flotante', boardBackground: 'espacio' })).toBe('flotante');
    }
  });
});
