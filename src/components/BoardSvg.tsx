// Tablero en 2D (SVG). Sirve para comprobar el generador y como modo 2D de respaldo.
import { COAST_EDGES, EDGES, HEXES, VERTICES, pips, isRed, type Board, type PortType, type Terrain } from '../game';

const S = 50; // radio de un hexágono en píxeles del SVG

const TERRAIN_FILL: Record<Terrain, string> = {
  bosque: 'var(--bosque)',
  pasto: 'var(--pasto)',
  cereal: 'var(--cereal)',
  colinas: 'var(--colinas)',
  montanas: 'var(--montanas)',
  desierto: 'var(--desierto)',
};

const TERRAIN_ICON: Record<Terrain, string> = {
  bosque: '🌲',
  pasto: '🐑',
  cereal: '🌾',
  colinas: '🧱',
  montanas: '⛰️',
  desierto: '🏜️',
};

const PORT_ICON: Record<PortType, string> = {
  generico: '?',
  madera: '🌲',
  lana: '🐑',
  trigo: '🌾',
  arcilla: '🧱',
  mineral: '⛰️',
};

// Vista cuadrada que deja sitio al mar y a los puertos.
const SEA_R = S * 5.3;
const HALF = S * 5.6;
const VIEWBOX = `${-HALF} ${-HALF} ${HALF * 2} ${HALF * 2}`;

interface Props {
  board: Board;
  showPips?: boolean;
  /** Cruces a resaltar (por ejemplo, los mejores). */
  highlight?: number[];
}

export function BoardSvg({ board, showPips = true, highlight = [] }: Props) {
  return (
    <svg viewBox={VIEWBOX} role="img" aria-label="Tablero de Catan" style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Mar */}
      <circle cx={0} cy={0} r={SEA_R} fill="var(--mar)" opacity={0.55} />

      {/* Puertos */}
      {board.ports.map((port) => {
        const edge = EDGES[COAST_EDGES[port.coast]];
        const a = VERTICES[edge.a];
        const b = VERTICES[edge.b];
        const mx = ((a.x + b.x) / 2) * S;
        const my = ((a.y + b.y) / 2) * S;
        const len = Math.hypot(mx, my);
        const px = mx + (mx / len) * S * 0.75;
        const py = my + (my / len) * S * 0.75;
        return (
          <g key={port.coast}>
            <line x1={a.x * S} y1={a.y * S} x2={px} y2={py} stroke="var(--crema-suave)" strokeWidth={3} strokeLinecap="round" opacity={0.7} />
            <line x1={b.x * S} y1={b.y * S} x2={px} y2={py} stroke="var(--crema-suave)" strokeWidth={3} strokeLinecap="round" opacity={0.7} />
            <circle cx={px} cy={py} r={S * 0.34} fill="var(--marfil)" />
            <text x={px} y={py - 3} textAnchor="middle" fontSize={port.type === 'generico' ? 12 : 13} dominantBaseline="middle">
              {PORT_ICON[port.type]}
            </text>
            <text x={px} y={py + 10} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--tinta)" dominantBaseline="middle">
              {port.type === 'generico' ? '3:1' : '2:1'}
            </text>
          </g>
        );
      })}

      {/* Hexágonos */}
      {HEXES.map((hex) => {
        const terrain = board.terrains[hex.id];
        const points = hex.vertices.map((v) => `${VERTICES[v].x * S},${VERTICES[v].y * S}`).join(' ');
        const n = board.numbers[hex.id];
        const cx = hex.x * S;
        const cy = hex.y * S;
        return (
          <g key={hex.id}>
            <polygon points={points} fill={TERRAIN_FILL[terrain]} stroke="var(--tinta)" strokeWidth={3} strokeLinejoin="round" />
            <text x={cx} y={cy - S * 0.55} textAnchor="middle" fontSize={14} dominantBaseline="middle">
              {TERRAIN_ICON[terrain]}
            </text>
            {n != null && (
              <g>
                <circle cx={cx} cy={cy + 2} r={S * 0.36} fill="var(--marfil)" stroke="rgba(0,0,0,0.15)" />
                <text
                  x={cx}
                  y={cy - (showPips ? 1 : -2)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontFamily="var(--fuente-titulo)"
                  fontWeight={700}
                  fontSize={isRed(n) ? 19 : 16}
                  fill={isRed(n) ? 'var(--rojo-numero)' : 'var(--tinta)'}
                >
                  {n}
                </text>
                {showPips && (
                  <text x={cx} y={cy + 11} textAnchor="middle" fontSize={8} letterSpacing={-1} fill={isRed(n) ? 'var(--rojo-numero)' : 'var(--tinta)'}>
                    {'•'.repeat(pips(n))}
                  </text>
                )}
              </g>
            )}
            {board.robber === hex.id && (
              <g transform={`translate(${cx}, ${cy + 4})`}>
                <ellipse cx={0} cy={14} rx={9} ry={3} fill="rgba(0,0,0,0.3)" />
                <path d="M -7 13 Q -8 -2 0 -4 Q 8 -2 7 13 Z" fill="#3a3530" />
                <circle cx={0} cy={-8} r={6} fill="#3a3530" />
              </g>
            )}
          </g>
        );
      })}

      {/* Cruces resaltados */}
      {highlight.map((v) => (
        <circle key={v} cx={VERTICES[v].x * S} cy={VERTICES[v].y * S} r={7} fill="var(--acento)" stroke="var(--tinta)" strokeWidth={2} />
      ))}
    </svg>
  );
}
