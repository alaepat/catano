// Comentario con gracia para el análisis del tablero.
import type { BoardAnalysis, Resource } from '../game';

const ESCASO: Record<Resource, string> = {
  madera: 'La madera escasea: los caminos van a salir caros.',
  lana: 'Pocas ovejas: las cartas de desarrollo serán un lujo.',
  trigo: 'Poco trigo: las ciudades van a costar sudor.',
  arcilla: 'La arcilla va a valer oro.',
  mineral: 'Poco mineral: quien tenga montañas manda.',
};

export function comentario(a: BoardAnalysis): string {
  let base: string;
  if (a.score >= 90) base = 'Más justo que un juez. Aquí nadie podrá quejarse.';
  else if (a.score >= 80) base = 'Bastante equilibrado. Las quejas, al final de la partida.';
  else if (a.score >= 65) base = 'Hay alguna ventaja escondida: el primero en elegir sonríe.';
  else base = 'Alguien va a llorar. Que empiece el que perdió la última.';
  return `${base} ${ESCASO[a.scarcest]}`;
}
