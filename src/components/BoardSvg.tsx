// Tablero en 2D (SVG). Es el modo 2D de Ajustes y el respaldo si el móvil no puede con el 3D.
// Con `speed` > 0, el tablero aparece animado: hexágonos del centro hacia fuera, números, puertos y ladrón.
import { motion } from 'motion/react';
import { COAST_EDGES, EDGES, HEXES, VERTICES, pips, isRed, type Board, type Terrain } from '../game';
import { GLYPHS, type GlyphName } from '../lib/glyphs';
import { REVEAL_INDEX, REVEAL_TIMING as T } from '../lib/reveal';

const S = 50; // radio de un hexágono en píxeles del SVG

const TERRAIN_FILL: Record<Terrain, string> = {
  bosque: 'var(--bosque)',
  pasto: 'var(--pasto)',
  cereal: 'var(--cereal)',
  colinas: 'var(--colinas)',
  montanas: 'var(--montanas)',
  desierto: 'var(--desierto)',
};

const TERRAIN_ICON: Record<Terrain, GlyphName> = {
  bosque: 'madera',
  pasto: 'lana',
  cereal: 'trigo',
  colinas: 'arcilla',
  montanas: 'mineral',
  desierto: 'desierto',
};

/** Color del icono sobre cada terreno: claro sobre los oscuros, oscuro sobre los claros. */
const TERRAIN_INK: Record<Terrain, string> = {
  bosque: 'var(--marfil)',
  pasto: 'var(--tinta)',
  cereal: 'var(--tinta)',
  colinas: 'var(--marfil)',
  montanas: 'var(--marfil)',
  desierto: 'var(--tinta)',
};

/** Icono (24 × 24) centrado en (x, y) con el tamaño dado. */
function SvgGlyph({ name, x, y, size, color, opacity = 1 }: { name: GlyphName; x: number; y: number; size: number; color: string; opacity?: number }) {
  return (
    <path
      d={GLYPHS[name]}
      transform={`translate(${x - size / 2} ${y - size / 2}) scale(${size / 24})`}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
    />
  );
}

// Vista cuadrada que deja sitio al mar y a los puertos.
const SEA_R = S * 5.3;
const HALF = S * 5.6;
const VIEWBOX = `${-HALF} ${-HALF} ${HALF * 2} ${HALF * 2}`;

const fromCenter = { transformBox: 'fill-box' as const, transformOrigin: 'center' };

interface Props {
  board: Board;
  showPips?: boolean;
  /** Cruces a resaltar (por ejemplo, los mejores). */
  highlight?: number[];
  /** 0 = sin animación; 1 = velocidad normal; menos de 1 = más rápido. */
  speed?: number;
  /** Hexágono ampliado (zoom), o null para ver todo. */
  focus?: number | null;
  /** Al tocar: el hexágono tocado, o null si se toca fuera de la isla. */
  onPickHex?: (hex: number | null) => void;
}

const ZOOM = 2.4;

export function BoardSvg({ board, showPips = true, highlight = [], speed = 0, focus = null, onPickHex }: Props) {
  const animate = speed > 0;
  const d = (s: number) => s * speed;
  const enter = (delay: number, from: object) =>
    animate
      ? { initial: { opacity: 0, ...from }, animate: { opacity: 1, scale: 1, y: 0, rotate: 0 }, transition: { delay: d(delay), type: 'spring' as const, stiffness: 260, damping: 18 } }
      : { initial: false as const };

  return (
    <svg
      viewBox={VIEWBOX}
      role="img"
      aria-label="Tablero de Catan"
      style={{ width: '100%', height: 'auto', display: 'block', overflow: focus === null ? 'visible' : 'hidden' }}
      onClick={(e) => {
        if (!onPickHex) return;
        // Del punto tocado (en píxeles) a coordenadas del tablero, deshaciendo el zoom.
        const svg = e.currentTarget;
        const m = svg.getScreenCTM();
        if (!m) return;
        const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
        const k = focus === null ? 1 : ZOOM;
        const fx = focus === null ? 0 : HEXES[focus].x * S;
        const fy = focus === null ? 0 : HEXES[focus].y * S;
        const x = p.x / k + fx;
        const y = p.y / k + fy;
        let hex: number | null = null;
        let best = S * 0.95;
        for (const h of HEXES) {
          const d = Math.hypot(h.x * S - x, h.y * S - y);
          if (d < best) {
            best = d;
            hex = h.id;
          }
        }
        onPickHex(hex === focus ? null : hex);
      }}
    >
      <g
        style={{
          transform: focus === null ? 'none' : `scale(${ZOOM}) translate(${-HEXES[focus].x * S}px, ${-HEXES[focus].y * S}px)`,
          transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
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
            {port.type === 'generico' ? (
              <text x={px} y={py - 3} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--tinta)" dominantBaseline="middle">
                ?
              </text>
            ) : (
              <SvgGlyph name={port.type} x={px} y={py - 4} size={13} color="var(--tinta)" />
            )}
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
            <SvgGlyph name={TERRAIN_ICON[terrain]} x={hex.x * S} y={hex.y * S - S * 0.58} size={15} color={TERRAIN_INK[terrain]} opacity={0.8} />
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
      </g>
    </svg>
  );
}
