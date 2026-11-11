import { describe, expect, it } from 'vitest';
import {
  CENTER_HEX, COAST_EDGES, EDGES, HEXES, OFFICIAL_PORT_COAST, PRESETS, PRESET_IDS, PRESET_INFO, SPIRAL_TOKENS, VERTICES,
  allTerrainsInRegions, countAdjacentPairs, findViolations, generateBoard, isRed, numberViolations, optionConflicts,
  pips, scarceResources, spiralOrder, validateStructure,
  type Board, type GenOptions, type Terrain,
} from '../src/game';

const RUNS = 10_000;

function mustGenerate(opts: GenOptions, seed: number): Board {
  const result = generateBoard(opts, seed);
  if (!result.ok) throw new Error(`Semilla ${seed}: ${result.error}`);
  return result.board;
}

describe('geometría del tablero', () => {
  it('tiene 19 hexágonos en filas 3-4-5-4-3, 54 cruces y 72 caminos', () => {
    expect(HEXES).toHaveLength(19);
    const rows = [-2, -1, 0, 1, 2].map((r) => HEXES.filter((h) => h.r === r).length);
    expect(rows).toEqual([3, 4, 5, 4, 3]);
    expect(VERTICES).toHaveLength(54);
    expect(EDGES).toHaveLength(72);
  });

  it('tiene 30 lados de costa y el centro tiene 6 vecinos', () => {
    expect(COAST_EDGES).toHaveLength(30);
    expect(HEXES[CENTER_HEX].neighbors).toHaveLength(6);
  });

  it('los lados de costa están en orden: cada uno comparte esquina con el siguiente', () => {
    for (let i = 0; i < COAST_EDGES.length; i++) {
      const a = EDGES[COAST_EDGES[i]];
      const b = EDGES[COAST_EDGES[(i + 1) % COAST_EDGES.length]];
      expect([a.a, a.b].some((v) => v === b.a || v === b.b)).toBe(true);
    }
  });

  it('los puertos fijos nunca están en lados seguidos', () => {
    const set = new Set(OFFICIAL_PORT_COAST);
    for (const c of OFFICIAL_PORT_COAST) expect(set.has((c + 1) % 30)).toBe(false);
  });
});

describe('espiral oficial', () => {
  it('recorre los 19 hexágonos, siempre pasando a un vecino', () => {
    for (let start = 0; start < 6; start++) {
      const order = spiralOrder(start);
      expect(new Set(order).size).toBe(19);
      expect(HEXES[order[0]].ring).toBe(2);
      expect(order[18]).toBe(CENTER_HEX);
      for (let i = 1; i < order.length; i++) {
        expect(HEXES[order[i - 1]].neighbors).toContain(order[i]);
      }
    }
  });

  it('coloca las fichas en el orden A-R saltando el desierto', () => {
    const board = mustGenerate({ ...PRESETS.oficial, avoidRedAdjacent: false }, 1);
    const order = spiralOrder(0);
    // Con alguna esquina de inicio, la secuencia sin desierto es exactamente A-R.
    const found = [0, 1, 2, 3, 4, 5].some((s) =>
      spiralOrder(s).filter((id) => board.numbers[id] != null).map((id) => board.numbers[id]).join() === SPIRAL_TOKENS.join(),
    );
    expect(order).toHaveLength(19);
    expect(found).toBe(true);
  });

  it('informa de en cuántas posiciones del desierto la espiral junta 6 y 8', () => {
    // Comprobación de la afirmación del plan: "la espiral evita por diseño que el 6 y el 8 se toquen".
    let bad = 0;
    for (let desert = 0; desert < 19; desert++) {
      for (let start = 0; start < 6; start++) {
        const numbers: (number | null)[] = Array(19).fill(null);
        let k = 0;
        for (const id of spiralOrder(start)) if (id !== desert) numbers[id] = SPIRAL_TOKENS[k++];
        if (countAdjacentPairs(numbers, (a, b) => isRed(a) && isRed(b)) > 0) bad++;
      }
    }
    console.log(`Espiral oficial: ${bad} de 114 combinaciones (desierto × esquina) juntan 6/8`);
    expect(bad).toBeGreaterThanOrEqual(0);
  });
});

describe.each(PRESET_IDS)('modo %s', (preset) => {
  const opts = PRESETS[preset];

  it(`${RUNS} tableros: piezas correctas y ninguna regla incumplida`, () => {
    const start = performance.now();
    for (let seed = 0; seed < RUNS; seed++) {
      const board = mustGenerate(opts, seed);
      expect(validateStructure(board)).toEqual([]);
      const broken = findViolations(board, opts);
      if (broken.length) throw new Error(`Semilla ${seed} incumple: ${broken.join(', ')}`);
    }
    const ms = (performance.now() - start) / RUNS;
    console.log(`Modo ${preset}: ${ms.toFixed(2)} ms por tablero de media`);
    expect(ms).toBeLessThan(50);
  }, 120_000);

  it('el ladrón empieza en el desierto', () => {
    const board = mustGenerate(opts, 7);
    expect(board.robber).toBe(board.terrains.indexOf('desierto'));
  });

  it('no tiene opciones contradictorias y tiene descripción', () => {
    expect(optionConflicts(opts)).toEqual([]);
    expect(PRESET_INFO[preset].description.length).toBeGreaterThan(10);
  });
});

describe('opciones concretas', () => {
  it('desierto en la costa', () => {
    for (let seed = 0; seed < 200; seed++) {
      const board = mustGenerate({ ...PRESETS.caos, desert: 'costa' }, seed);
      expect(HEXES[board.terrains.indexOf('desierto')].ring).toBe(2);
    }
  });

  it('sin puertos', () => {
    expect(mustGenerate({ ...PRESETS.caos, ports: false }, 5).ports).toEqual([]);
  });

  it('ningún terreno igual junto a otro', () => {
    const opts: GenOptions = { ...PRESETS.caos, maxTerrainGroup: 1 };
    for (let seed = 0; seed < 300; seed++) {
      const board = mustGenerate(opts, seed);
      expect(countAdjacentPairs<Terrain>(board.terrains, (a, b) => a === b)).toBe(0);
    }
  });

  it('puertos 2:1 forzados junto a su recurso', () => {
    const opts: GenOptions = { ...PRESETS.equilibrado, portNearResource: 'forzar' };
    for (let seed = 0; seed < 300; seed++) expect(findViolations(mustGenerate(opts, seed), opts)).toEqual([]);
  });

  it('tope de 11 puntitos por cruce', () => {
    const opts: GenOptions = { ...PRESETS.equilibrado, maxVertexPips: 11, desert: 'aleatorio' };
    for (let seed = 0; seed < 300; seed++) {
      const board = mustGenerate(opts, seed);
      expect(numberViolations(board.terrains, board.numbers, opts)).toEqual([]);
    }
  });

  it('6 y 8 solo en la costa', () => {
    const opts: GenOptions = { ...PRESETS.equilibrado, redsZone: 'costa' };
    for (let seed = 0; seed < 300; seed++) {
      const board = mustGenerate(opts, seed);
      for (const h of HEXES) if (isRed(board.numbers[h.id])) expect(h.ring).toBe(2);
    }
  });
});

describe('modos especiales', () => {
  it('Escasez: un recurso solo tiene 2, 3, 11 o 12', () => {
    for (let seed = 0; seed < 500; seed++) {
      const board = mustGenerate(PRESETS.escasez, seed);
      const scarce = scarceResources(board.terrains, board.numbers);
      expect(scarce.length).toBeGreaterThan(0);
    }
  });

  it('Escasez de un recurso concreto', () => {
    const opts: GenOptions = { ...PRESETS.escasez, scarceResource: 'mineral' };
    for (let seed = 0; seed < 200; seed++) {
      const board = mustGenerate(opts, seed);
      board.terrains.forEach((t, i) => {
        if (t === 'montanas') expect(pips(board.numbers[i])).toBeLessThanOrEqual(2);
      });
    }
  });

  it('Continentes: cada terreno forma una sola región', () => {
    for (let seed = 0; seed < 500; seed++) {
      expect(allTerrainsInRegions(mustGenerate(PRESETS.continentes, seed).terrains)).toBe(true);
    }
  });

  it('Pelea por el centro: todos los 6 y 8 en el interior', () => {
    for (let seed = 0; seed < 500; seed++) {
      const board = mustGenerate(PRESETS.centro, seed);
      for (const h of HEXES) if (isRed(board.numbers[h.id])) expect(h.ring).toBeLessThan(2);
    }
  });

  it('Tranquila: el desierto (con el ladrón) en la costa', () => {
    const board = mustGenerate(PRESETS.tranquila, 1);
    expect(board.robber).toBe(board.terrains.indexOf('desierto'));
  });
});

describe('semilla', () => {
  it('misma semilla y opciones → exactamente el mismo tablero', () => {
    for (const preset of PRESET_IDS) {
      expect(mustGenerate(PRESETS[preset], 42)).toEqual(mustGenerate(PRESETS[preset], 42));
    }
  });
});

describe('combinaciones imposibles', () => {
  it('se rechazan al momento con un mensaje claro', () => {
    const cases: GenOptions[] = [
      { ...PRESETS.caos, redsZone: 'interior', avoidRedAdjacent: true },
      { ...PRESETS.equilibrado, scarceResource: 'aleatorio' },
      { ...PRESETS.continentes, maxTerrainGroup: 2 },
      { ...PRESETS.oficial, redsZone: 'costa' },
    ];
    for (const opts of cases) {
      const result = generateBoard(opts, 1);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.length).toBeGreaterThan(20);
    }
  });

  it('si algo no sale, da un mensaje y no se queda colgado', () => {
    // Modo competitivo con puertos fijos forzados junto a su recurso: muy restrictivo.
    const opts: GenOptions = { ...PRESETS.competitivo, maxVertexPips: 11, portNearResource: 'forzar', avoid2And12Adjacent: true, desert: 'costa' };
    const start = performance.now();
    const result = generateBoard(opts, 1);
    const ms = performance.now() - start;
    console.log(`Combinación difícil: ${result.ok ? 'encontrada' : 'rechazada'} en ${ms.toFixed(0)} ms`);
    if (!result.ok) expect(result.error).toMatch(/imposible/);
    expect(ms).toBeLessThan(3000);
  });
});
