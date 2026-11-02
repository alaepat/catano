// Tablero en 2D (SVG). Se usa hasta que llegue la escena 3D y como modo 2D de respaldo.
// Con `speed` > 0, el tablero aparece animado: hexágonos del centro hacia fuera, números, puertos y ladrón.
import { motion } from 'motion/react';
import { COAST_EDGES, EDGES, HEXES, VERTICES, pips, isRed, type Board, type PortType, type Terrain } from '../game';
import { REVEAL_TIMING as T } from '../lib/reveal';

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

/** Orden de aparición: del centro hacia fuera, girando. */
const REVEAL_INDEX: number[] = (() => {
  const order = HEXES.slice().sort((a, b) => a.ring - b.ring || Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));
  const index: number[] = [];
  order.forEach((h, i) => (index[h.id] = i));
  return index;
})();


const fromCenter = { transformBox: 'fill-box' as const, transformOrigin: 'center' };

interface Props {
  board: Board;
  showPips?: boolean;
  /** Cruces a resaltar (por ejemplo, los mejores). */
  highlight?: number[];
  /** 0 = sin animación; 1 = velocidad normal; menos de 1 = más rápido. */
  speed?: number;
}

export function BoardSvg({ board, showPips = true, highlight = [], speed = 0 }: Props) {
  const animate = speed > 0;
  const d = (s: number) => s * speed;
  const enter = (delay: number, from: object) =>
    animate
      ? { initial: { opacity: 0, ...from }, animate: { opacity: 1, scale: 1, y: 0, rotate: 0 }, transition: { delay: d(delay), type: 'spring' as const, stiffness: 260, damping: 18 } }
      : { initial: false as const };

  return (
    <svg viewBox={VIEWBOX} role="img" aria-label="Tablero de Catan" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
      {/* Mar */}
      <motion.circle
        cx={0}
        cy={0}
        r={SEA_R}
        fill="var(--mar)"
        style={fromCenter}
        initial={animate ? { opacity: 0, scale: 0.6 } : false}
        animate={{ opacity: 0.55, scale: 1 }}
        transition={{ duration: d(0.9), ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Puertos */}
      {board.ports.map((port, j) => {
        const edge = EDGES[COAST_EDGES[port.coast]];
        const a = VERTICES[edge.a];
        const b = VERTICES[edge.b];
        const mx = ((a.x + b.x) / 2) * S;
        const my = ((a.y + b.y) / 2) * S;
        const len = Math.hypot(mx, my);
        const px = mx + (mx / len) * S * 0.75;
        const py = my + (my / len) * S * 0.75;
        return (
          <motion.g key={port.coast} style={fromCenter} {...enter(T.portsStart + j * T.port, { scale: 0.3 })}>
            <line x1={a.x * S} y1={a.y * S} x2={px} y2={py} stroke="var(--crema-suave)" strokeWidth={3} strokeLinecap="round" opacity={0.7} />
            <line x1={b.x * S} y1={b.y * S} x2={px} y2={py} stroke="var(--crema-suave)" strokeWidth={3} strokeLinecap="round" opacity={0.7} />
            <circle cx={px} cy={py} r={S * 0.34} fill="var(--marfil)" />
            <text x={px} y={py - 3} textAnchor="middle" fontSize={port.type === 'generico' ? 12 : 13} dominantBaseline="middle">
              {PORT_ICON[port.type]}
            </text>
            <text x={px} y={py + 10} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--tinta)" dominantBaseline="middle">
              {port.type === 'generico' ? '3:1' : '2:1'}
            </text>
          </motion.g>
        );
      })}

      {/* Hexágonos */}
      {HEXES.map((hex) => {
        const terrain = board.terrains[hex.id];
        const points = hex.vertices.map((v) => `${VERTICES[v].x * S},${VERTICES[v].y * S}`).join(' ');
        return (
          <motion.g key={hex.id} style={fromCenter} {...enter(REVEAL_INDEX[hex.id] * T.hex, { scale: 0.2, rotate: -40 })}>
            <polygon points={points} fill={TERRAIN_FILL[terrain]} stroke="var(--tinta)" strokeWidth={3} strokeLinejoin="round" />
            <text x={hex.x * S} y={hex.y * S - S * 0.55} textAnchor="middle" fontSize={14} dominantBaseline="middle">
              {TERRAIN_ICON[terrain]}
            </text>
          </motion.g>
        );
      })}

      {/* Números */}
      {HEXES.map((hex) => {
        const n = board.numbers[hex.id];
        if (n == null) return null;
        const cx = hex.x * S;
        const cy = hex.y * S;
        const red = isRed(n);
        return (
          <motion.g key={hex.id} style={fromCenter} {...enter(T.numbersStart + REVEAL_INDEX[hex.id] * T.number, { y: -40, scale: 1.4 })}>
            <circle cx={cx} cy={cy + 2} r={S * 0.36} fill="var(--marfil)" stroke="rgba(0,0,0,0.15)" />
            <text
              x={cx}
              y={cy - (showPips ? 1 : -2)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="var(--fuente-titulo)"
              fontWeight={700}
              fontSize={red ? 19 : 16}
              fill={red ? 'var(--rojo-numero)' : 'var(--tinta)'}
            >
              {n}
            </text>
            {showPips && (
              <text x={cx} y={cy + 11} textAnchor="middle" fontSize={8} letterSpacing={-1} fill={red ? 'var(--rojo-numero)' : 'var(--tinta)'}>
                {'•'.repeat(pips(n))}
              </text>
            )}
          </motion.g>
        );
      })}

      {/* Ladrón */}
      {board.robber !== null && (
        <g transform={`translate(${HEXES[board.robber].x * S}, ${HEXES[board.robber].y * S + 4})`}>
          <motion.g style={fromCenter} {...enter(T.robber, { y: -30, scale: 0.4 })}>
            <ellipse cx={0} cy={14} rx={9} ry={3} fill="rgba(0,0,0,0.3)" />
            <path d="M -7 13 Q -8 -2 0 -4 Q 8 -2 7 13 Z" fill="#3a3530" />
            <circle cx={0} cy={-8} r={6} fill="#3a3530" />
          </motion.g>
        </g>
      )}

      {/* Cruces resaltados */}
      {highlight.map((v) => (
        <circle key={v} cx={VERTICES[v].x * S} cy={VERTICES[v].y * S} r={7} fill="var(--acento)" stroke="var(--tinta)" strokeWidth={2} />
      ))}
    </svg>
  );
}
