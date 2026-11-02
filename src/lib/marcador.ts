// Marcador de puntos de Catan: reglas puras (sin pantalla), fáciles de probar.
//
// Puntos de cada jugador:
//   pueblo = 1 · ciudad = 2 (sustituye a un pueblo) · carta de punto de victoria = 1
//   carretera más larga = 2 · gran ejército = 2 (solo los tiene un jugador a la vez)

export type PlayerColor = 'rojo' | 'azul' | 'blanco' | 'naranja' | 'verde' | 'marron';

/** Colores de las piezas de Catan. `ink` = color del texto encima (oscuro sobre los colores claros). */
export const PLAYER_COLORS: { id: PlayerColor; label: string; hex: string; ink: string }[] = [
  { id: 'rojo', label: 'Rojo', hex: '#d0453b', ink: '#fff8ec' },
  { id: 'azul', label: 'Azul', hex: '#3a6fd0', ink: '#fff8ec' },
  { id: 'blanco', label: 'Blanco', hex: '#f2eee4', ink: '#1e1b18' },
  { id: 'naranja', label: 'Naranja', hex: '#ec8a2e', ink: '#1e1b18' },
  { id: 'verde', label: 'Verde', hex: '#3f9a4a', ink: '#fff8ec' },
  { id: 'marron', label: 'Marrón', hex: '#8a5a36', ink: '#fff8ec' },
];

export const colorHex = (c: PlayerColor) => PLAYER_COLORS.find((p) => p.id === c)?.hex ?? '#ccc';
export const colorInk = (c: PlayerColor) => PLAYER_COLORS.find((p) => p.id === c)?.ink ?? '#1e1b18';

/** Piezas que trae cada color en la caja. */
export const MAX_PUEBLOS = 5;
export const MAX_CIUDADES = 4;
/** Cartas de punto de victoria que hay en el mazo de desarrollo. */
export const MAX_CARTAS = 5;
export const GOAL = 10;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
}

export interface MatchPlayer extends Player {
  pueblos: number;
  ciudades: number;
  cartas: number;
}

export interface Match {
  players: MatchPlayer[];
  /** Quién tiene la carretera más larga / el gran ejército (id), o nadie. */
  road: string | null;
  army: string | null;
  goal: number;
  startedAt: number;
  /** Quién ha llegado a la meta (se fija al llegar y ya no cambia, salvo con Deshacer). */
  winner: string | null;
  endedAt: number | null;
}

export type Action = 'pueblo' | 'ciudad' | 'carretera' | 'ejercito' | 'carta';

export interface Win {
  name: string;
  color: PlayerColor;
  points: number;
  date: string;
  /** Minutos que duró la partida. */
  minutes: number;
  players: number;
}

export function newMatch(players: Player[], now = Date.now(), goal = GOAL): Match {
  return {
    // Se empieza con 2 pueblos colocados.
    players: players.map((p) => ({ ...p, pueblos: 2, ciudades: 0, cartas: 0 })),
    road: null,
    army: null,
    goal,
    startedAt: now,
    winner: null,
    endedAt: null,
  };
}

export function points(m: Match, id: string): number {
  const p = m.players.find((x) => x.id === id);
  if (!p) return 0;
  return p.pueblos + p.ciudades * 2 + p.cartas + (m.road === id ? 2 : 0) + (m.army === id ? 2 : 0);
}

/** Por qué no se puede hacer una acción (o null si se puede). */
export function blocked(m: Match, id: string, action: Action): string | null {
  const p = m.players.find((x) => x.id === id);
  if (!p) return 'Ese jugador no está en la partida';
  switch (action) {
    case 'pueblo':
      return p.pueblos >= MAX_PUEBLOS ? `Ya tiene los ${MAX_PUEBLOS} pueblos en el tablero` : null;
    case 'ciudad':
      if (p.ciudades >= MAX_CIUDADES) return `Ya tiene las ${MAX_CIUDADES} ciudades`;
      return p.pueblos === 0 ? 'Necesita un pueblo para convertirlo en ciudad' : null;
    case 'carta':
      return p.cartas >= MAX_CARTAS ? `Solo hay ${MAX_CARTAS} cartas de punto en el mazo` : null;
    default:
      return null;
  }
}

/** Aplica una acción. La carretera y el ejército pasan a este jugador (o se le quitan si ya los tenía). */
export function apply(m: Match, id: string, action: Action, now = Date.now()): Match {
  if (blocked(m, id, action)) return m;
  let next: Match = m;
  const edit = (f: (p: MatchPlayer) => MatchPlayer) => ({ ...m, players: m.players.map((p) => (p.id === id ? f(p) : p)) });
  switch (action) {
    case 'pueblo':
      next = edit((p) => ({ ...p, pueblos: p.pueblos + 1 }));
      break;
    case 'ciudad':
      next = edit((p) => ({ ...p, pueblos: p.pueblos - 1, ciudades: p.ciudades + 1 }));
      break;
    case 'carta':
      next = edit((p) => ({ ...p, cartas: p.cartas + 1 }));
      break;
    case 'carretera':
      next = { ...m, road: m.road === id ? null : id };
      break;
    case 'ejercito':
      next = { ...m, army: m.army === id ? null : id };
      break;
  }
  if (!next.winner && points(next, id) >= next.goal) next = { ...next, winner: id, endedAt: now };
  return next;
}

/** Jugadores de más a menos puntos. */
export function ranking(m: Match): { player: MatchPlayer; points: number }[] {
  return m.players.map((player) => ({ player, points: points(m, player.id) })).sort((a, b) => b.points - a.points);
}

export function minutesBetween(from: number, to: number): number {
  return Math.max(1, Math.round((to - from) / 60000));
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

/** Victorias por persona (por nombre), de más a menos. */
export function fameTable(wins: Win[]): { name: string; color: PlayerColor; wins: number }[] {
  const map = new Map<string, { name: string; color: PlayerColor; wins: number }>();
  for (const w of wins) {
    const key = w.name.trim().toLowerCase();
    const entry = map.get(key) ?? { name: w.name, color: w.color, wins: 0 };
    entry.wins += 1;
    entry.color = w.color;
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name));
}

export function cleanPlayerName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, 16);
}

export function isPlayer(x: unknown): x is Player {
  const p = x as Player;
  return Boolean(p && typeof p.id === 'string' && typeof p.name === 'string' && PLAYER_COLORS.some((c) => c.id === p.color));
}

export function isMatch(x: unknown): x is Match {
  const m = x as Match;
  return Boolean(
    m &&
      Array.isArray(m.players) &&
      m.players.every((p) => isPlayer(p) && Number.isFinite(p.pueblos) && Number.isFinite(p.ciudades) && Number.isFinite(p.cartas)) &&
      typeof m.startedAt === 'number' &&
      typeof m.goal === 'number',
  );
}

export function isWin(x: unknown): x is Win {
  const w = x as Win;
  return Boolean(w && typeof w.name === 'string' && typeof w.points === 'number' && typeof w.date === 'string');
}
