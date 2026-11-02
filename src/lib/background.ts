// Qué fondo se ve en cada pantalla. En el tablero, la isla es la protagonista: por defecto el fondo pasa
// al Espacio (o a Minimal) y al volver al inicio regresa el elegido.
import type { BackgroundId, BoardBackground, Screen, Settings } from '../store';

export const BOARD_BACKGROUNDS: [BoardBackground, string][] = [
  ['espacio', 'Espacio'],
  ['minimal', 'Minimal'],
  ['mismo', 'El mismo'],
];

export function backgroundFor(screen: Screen, settings: Pick<Settings, 'background' | 'boardBackground'>): BackgroundId {
  if (screen === 'tablero' && settings.boardBackground !== 'mismo') return settings.boardBackground;
  return settings.background;
}
