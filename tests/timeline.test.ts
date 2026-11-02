import { describe, expect, it } from 'vitest';
import { HEXES } from '../src/game';
import { SEQ, ease, hexWindow, landingFlash, portWindow, progress, sequenceDuration, tokenWindow } from '../src/three/timeline';

const end = (w: { start: number; dur: number }) => w.start + w.dur;

describe('animación 3D', () => {
  it('dura unos 5-6 s en épica y unos 2-2,5 s en rápida', () => {
    expect(sequenceDuration(1)).toBeGreaterThanOrEqual(5);
    expect(sequenceDuration(1)).toBeLessThanOrEqual(6);
    expect(sequenceDuration(0.45)).toBeLessThanOrEqual(2.6);
    expect(sequenceDuration(0)).toBe(0);
  });

  it('todo termina antes del final', () => {
    const windows = [
      SEQ.light, SEQ.sea, SEQ.robber, SEQ.smoke, SEQ.approach, SEQ.tilt, SEQ.swing,
      ...HEXES.map((h) => hexWindow(h.id)),
      ...HEXES.map((h) => tokenWindow(h.id)),
      ...Array.from({ length: 9 }, (_, j) => portWindow(j)),
    ];
    for (const w of windows) expect(end(w)).toBeLessThanOrEqual(SEQ.end);
  });

  it('sigue el orden: mar, hexágonos, fichas, puertos y ladrón', () => {
    const lastHex = Math.max(...HEXES.map((h) => end(hexWindow(h.id))));
    const firstToken = Math.min(...HEXES.map((h) => tokenWindow(h.id).start));
    const lastToken = Math.max(...HEXES.map((h) => end(tokenWindow(h.id))));
    expect(SEQ.sea.start).toBeLessThan(SEQ.hex.start);
    expect(firstToken).toBeLessThan(lastHex + 0.1); // se solapan un poco para que no haya pausas
    expect(portWindow(0).start).toBeGreaterThanOrEqual(lastToken - 0.5);
    expect(SEQ.robber.start).toBeGreaterThan(portWindow(0).start);
  });

  it('el hexágono central llega el primero', () => {
    const center = HEXES.find((h) => h.ring === 0)!;
    for (const h of HEXES) expect(hexWindow(center.id).start).toBeLessThanOrEqual(hexWindow(h.id).start);
  });

  it('el avance va de 0 a 1 y no se sale', () => {
    const w = { start: 1, dur: 2 };
    expect(progress(0, w)).toBe(0);
    expect(progress(2, w)).toBe(0.5);
    expect(progress(10, w)).toBe(1);
    expect(progress(1, { start: 1, dur: 0 })).toBe(1);
  });

  it('las curvas empiezan en 0 y acaban en 1', () => {
    for (const f of Object.values(ease)) {
      expect(f(0)).toBeCloseTo(0, 6);
      expect(f(1)).toBeCloseTo(1, 6);
    }
  });

  it('el destello aparece al aterrizar y se apaga', () => {
    const w = { start: 1, dur: 1 };
    expect(landingFlash(1.5, w)).toBe(0);
    expect(landingFlash(2, w)).toBe(1);
    expect(landingFlash(3, w)).toBeLessThan(0.01);
  });
});
