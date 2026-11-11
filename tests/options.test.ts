import { describe, expect, it } from 'vitest';
import { PRESETS, PRESET_IDS, matchPreset, optionConflicts, setOptionResolving, type GenOptions } from '../src/game';
import { datoDelDia } from '../src/lib/datoDelDia';

// Todos los valores posibles de cada opción.
const VALUES: { [K in keyof GenOptions]: GenOptions[K][] } = {
  desert: ['centro', 'aleatorio', 'costa'],
  terrainLayout: ['normal', 'regiones'],
  maxTerrainGroup: [0, 1, 2, 3],
  numberMethod: ['espiral', 'aleatorio'],
  avoidRedAdjacent: [true, false],
  avoidSameAdjacent: [true, false],
  avoid2And12Adjacent: [true, false],
  fairResources: [true, false],
  maxVertexPips: [0, 11, 12],
  redsZone: ['cualquiera', 'interior', 'costa'],
  scarceResource: ['ninguno', 'aleatorio', 'madera', 'lana', 'trigo', 'arcilla', 'mineral'],
  ports: [true, false],
  portPositions: ['fijas', 'aleatorias'],
  portNearResource: ['da-igual', 'evitar', 'forzar'],
};

describe('cambiar opciones sin crear combinaciones imposibles', () => {
  it('desde cualquier modo, cambiar cualquier opción deja una combinación posible', () => {
    for (const id of PRESET_IDS) {
      for (const key of Object.keys(VALUES) as (keyof GenOptions)[]) {
        for (const value of VALUES[key]) {
          const { options } = setOptionResolving(PRESETS[id], key, value as never);
          expect(optionConflicts(options)).toEqual([]);
          // La opción que el usuario tocó se respeta siempre.
          expect(options[key]).toBe(value);
        }
      }
    }
  });

  it('avisa cuando ajusta otra opción', () => {
    const { options, notes } = setOptionResolving(PRESETS.equilibrado, 'scarceResource', 'aleatorio');
    expect(options.fairResources).toBe(false);
    expect(notes).toHaveLength(1);
  });

  it('volver a los valores de un modo lo reconoce', () => {
    const { options } = setOptionResolving(PRESETS.equilibrado, 'maxVertexPips', 11);
    expect(matchPreset(options)).toBe('personalizado');
    expect(matchPreset(setOptionResolving(options, 'maxVertexPips', 12).options)).toBe('equilibrado');
  });
});

describe('dato curioso del día', () => {
  const list = ['a', 'b', 'c'];
  it('es el mismo durante todo el día y cambia al siguiente', () => {
    const morning = datoDelDia(list, new Date(2026, 10, 2, 8, 0));
    const night = datoDelDia(list, new Date(2026, 10, 2, 23, 59));
    const tomorrow = datoDelDia(list, new Date(2026, 10, 3, 8, 0));
    expect(morning).toBe(night);
    expect(tomorrow).not.toBe(morning);
  });
});
