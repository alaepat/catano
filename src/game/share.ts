// Convierte un tablero en un código corto (unos 30 caracteres) y al revés.
// Mismo código = mismo tablero. El primer carácter es la versión del formato.
import { TERRAINS } from './catan';
import { validateStructure } from './rules';
import type { Board, PortType, Terrain } from './types';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = BigInt(ALPHABET.length);
const VERSION = '1';
const NUMBER_CODES: (number | null)[] = [null, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12];
const PORT_CODES: PortType[] = ['generico', 'madera', 'lana', 'trigo', 'arcilla', 'mineral'];

export function encodeBoard(board: Board): string {
  // Cada campo es [valor, cuántos valores posibles tiene].
  const fields: [number, number][] = [];
  board.terrains.forEach((t) => fields.push([TERRAINS.indexOf(t), TERRAINS.length]));
  board.numbers.forEach((n) => fields.push([NUMBER_CODES.indexOf(n), NUMBER_CODES.length]));
  fields.push([board.robber === null ? 0 : board.robber + 1, board.terrains.length + 1]);
  fields.push([board.ports.length, 10]);
  board.ports.forEach((p) => {
    fields.push([p.coast, 30]);
    fields.push([PORT_CODES.indexOf(p.type), PORT_CODES.length]);
  });

  // Se empaqueta al revés para poder leerlo en orden al decodificar.
  let n = 0n;
  for (let i = fields.length - 1; i >= 0; i--) n = n * BigInt(fields[i][1]) + BigInt(fields[i][0]);

  let out = '';
  do {
    out = ALPHABET[Number(n % BASE)] + out;
    n /= BASE;
  } while (n > 0n);
  return VERSION + out;
}

/** Devuelve el tablero, o null si el código no es válido. */
export function decodeBoard(code: string): Board | null {
  const clean = code.trim();
  if (clean[0] !== VERSION || clean.length < 2) return null;

  let n = 0n;
  for (const ch of clean.slice(1)) {
    const digit = ALPHABET.indexOf(ch);
    if (digit < 0) return null;
    n = n * BASE + BigInt(digit);
  }
  const take = (size: number) => {
    const value = Number(n % BigInt(size));
    n /= BigInt(size);
    return value;
  };

  const terrains: Terrain[] = Array.from({ length: 19 }, () => TERRAINS[take(TERRAINS.length)]);
  const numbers = Array.from({ length: 19 }, () => NUMBER_CODES[take(NUMBER_CODES.length)]);
  const robberCode = take(20);
  const portCount = take(10);
  const ports = Array.from({ length: portCount }, () => {
    const coast = take(30);
    return { coast, type: PORT_CODES[take(PORT_CODES.length)] };
  });
  if (n !== 0n) return null;

  const board: Board = { terrains, numbers, ports, robber: robberCode === 0 ? null : robberCode - 1 };
  return validateStructure(board).length === 0 ? board : null;
}
