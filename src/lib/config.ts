import type { AnimSpeed, BackgroundId } from '../store';

/** Título provisional: el usuario aún no ha decidido el nombre de la app (PLAN_CATAN.md, sección 13). */
export const APP_TITLE = 'Catan';
export const APP_VERSION = '0.2.0';

export const BACKGROUNDS: { id: BackgroundId; label: string; preview: string }[] = [
  { id: 'espacio', label: 'Espacio', preview: 'radial-gradient(circle at 30% 30%, #2b2350 0%, #0b0a14 70%)' },
  { id: 'atardecer', label: 'Atardecer', preview: 'linear-gradient(160deg, #f0a262 0%, #b0507a 50%, #2b2140 100%)' },
  { id: 'minimal', label: 'Minimal', preview: '#1e1b18' },
];

export const ANIM_SPEEDS: [AnimSpeed, string][] = [
  ['epica', 'Épica'],
  ['rapida', 'Rápida'],
  ['sin', 'Sin animación'],
];
