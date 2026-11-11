import type { AnimSpeed, BackgroundId, Quality } from '../store';

/** Nombre de la app (elegido por el usuario el 2026-11-11). */
export const APP_TITLE = 'Cataniciño';
export const APP_VERSION = '0.18.3';

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
  {
    id: 'aurora',
    label: 'Aurora',
    preview:
      'radial-gradient(ellipse 80% 40% at 30% 25%, rgba(70, 225, 175, 0.55), transparent 70%), radial-gradient(ellipse 70% 40% at 75% 40%, rgba(150, 100, 235, 0.5), transparent 70%), #07101f',
  },
  {
    id: 'bruma',
    label: 'Bruma dorada',
    preview:
      'radial-gradient(circle at 30% 70%, rgba(255, 200, 120, 0.5) 0 6%, transparent 7%), radial-gradient(circle at 70% 40%, rgba(255, 200, 120, 0.4) 0 4%, transparent 5%), radial-gradient(circle at 50% 35%, #4a3218 0%, #1c130b 75%)',
  },
  {
    id: 'lavanda',
    label: 'Lavanda',
    preview:
      'radial-gradient(ellipse 70% 50% at 25% 25%, rgba(240, 150, 200, 0.45), transparent 70%), radial-gradient(ellipse 70% 50% at 80% 65%, rgba(170, 140, 255, 0.4), transparent 70%), #2a2140',
  },
  { id: 'parque', label: 'Parque', preview: `center 78% / cover url(${import.meta.env.BASE_URL}fondos/parque.webp), #5b3b6c` },
  { id: 'mesa', label: 'Mesa de noche', preview: `center 70% / cover url(${import.meta.env.BASE_URL}fondos/mesa-noche.webp), #05070d` },
  { id: 'flotante', label: 'Mesa en el espacio', preview: `center 62% / cover url(${import.meta.env.BASE_URL}fondos/mesa-espacio-mini.webp), #161447` },
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
