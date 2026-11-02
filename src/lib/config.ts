import type { AnimSpeed, BackgroundId, Quality } from '../store';

/** Título provisional: el usuario aún no ha decidido el nombre de la app (PLAN_CATAN.md, sección 13). */
export const APP_TITLE = 'Catan';
export const APP_VERSION = '0.5.0';

/**
 * Partes de la app escondidas (la app es para una sola persona). El código sigue ahí:
 * para recuperarlas basta con poner true.
 */
export const FEATURES = {
  /** Botón Foto del tablero (compartir imagen). */
  foto: false,
  /** Botón Guardar y la pantalla Mis tableros. */
  guardar: false,
};

export const BACKGROUNDS: { id: BackgroundId; label: string; preview: string }[] = [
  { id: 'espacio', label: 'Espacio', preview: 'radial-gradient(circle at 30% 30%, #2b2350 0%, #0b0a14 70%)' },
  { id: 'oceano', label: 'Océano', preview: 'linear-gradient(180deg, #1b5675 0%, #0b2a3d 55%, #2c6d8c 80%, #0a2230 100%)' },
  { id: 'pergamino', label: 'Pergamino', preview: 'radial-gradient(circle at 50% 45%, #5a4029 0%, #2a1c10 85%)' },
  { id: 'atardecer', label: 'Atardecer', preview: 'linear-gradient(160deg, #f0a262 0%, #b0507a 50%, #2b2140 100%)' },
  { id: 'bosque', label: 'Bosque', preview: 'linear-gradient(180deg, #13263a 0%, #0f2420 60%, #050d0b 100%)' },
  { id: 'minimal', label: 'Minimal', preview: '#1e1b18' },
];

export const ANIM_SPEEDS: [AnimSpeed, string][] = [
  ['epica', 'Épica'],
  ['rapida', 'Rápida'],
  ['sin', 'Sin animación'],
];

export const QUALITIES: [Quality, string][] = [
  ['alta', 'Alta'],
  ['media', 'Media'],
  ['baja', 'Baja'],
  ['2d', '2D'],
];
