// Tablero en 2D (SVG). Es el modo 2D de Ajustes y el respaldo si el móvil no puede con el 3D.
// Con `speed` > 0, el tablero aparece animado: hexágonos del centro hacia fuera, números, puertos y ladrón.
import { motion } from 'motion/react';
import { geometryOf, islandSeaRadius, pips, isRed, portEdge, portLandHex, type Board, type Geometry, type Port, type Terrain } from '../game';
import { GLYPHS, type GlyphName } from '../lib/glyphs';
import { DEFAULT_NUMBER_STYLE, type NumberStyle } from '../lib/numberStyle';
import { REVEAL_TIMING as T } from '../lib/reveal';

const S = 50; // radio de un hexágono en píxeles del SVG

const TERRAIN_FILL: Record<Terrain, string> = {
  bosque: 'var(--bosque)',
  pasto: 'var(--pasto)',
  cereal: 'var(--cereal)',
  colinas: 'var(--colinas)',
  montanas: 'var(--montanas)',
  desierto: 'var(--desierto)',
  mar: '#2f76a0',
  oro: 'var(--oro)',
  niebla: '#e9edf0',
};

const TERRAIN_ICON: Record<Terrain, GlyphName> = {
  bosque: 'madera',
  pasto: 'lana',
  cereal: 'trigo',
  colinas: 'arcilla',
  montanas: 'mineral',
  desierto: 'desierto',
  mar: 'ola',
  oro: 'oro',
  niebla: 'niebla',
};

/** Color del icono sobre cada terreno: claro sobre los oscuros, oscuro sobre los claros. */
const TERRAIN_INK: Record<Terrain, string> = {
  bosque: 'var(--marfil)',
  pasto: 'var(--tinta)',
  cereal: 'var(--tinta)',
  colinas: 'var(--marfil)',
  montanas: 'var(--marfil)',
  desierto: 'var(--tinta)',
  mar: '#cfe6f2',
  oro: 'var(--tinta)',
  niebla: '#7d8a93',
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

/** Vista del SVG: en una isla, cuadrada con sitio para el mar y los puertos; en Navegantes, ajustada al marco. */
function viewBoxOf(geo: Geometry): string {
  if (geo.kind === 'isla') {
    const half = (islandSeaRadius(geo) + 0.3) * S;
    return `${-half} ${-half} ${half * 2} ${half * 2}`;
  }
  const pad = S * 0.62;
  const w = Math.max(...geo.vertices.map((v) => Math.abs(v.x))) * S + pad;
  const h = Math.max(...geo.vertices.map((v) => Math.abs(v.y))) * S + pad;
  return `${-w} ${-h} ${w * 2} ${h * 2}`;
}

/** Dónde va la ficha de un puerto (px, py) y los dos cruces de su lado. */
function portSpot(geo: Geometry, board: Board, port: Port) {
  const edge = portEdge(geo, port.coast);
  const a = geo.vertices[edge.a];
  const b = geo.vertices[edge.b];
  const mx = ((a.x + b.x) / 2) * S;
  const my = ((a.y + b.y) / 2) * S;
  if (geo.kind === 'isla') {
    const len = Math.hypot(mx, my);
    return { a, b, px: mx + (mx / len) * S * 0.75, py: my + (my / len) * S * 0.75 };
  }
  // Navegantes: hacia fuera de su hexágono de tierra, sobre el mar.
  const land = geo.hexes[portLandHex(port.coast, board.terrains, geo)];
  const dx = mx - land.x * S;
  const dy = my - land.y * S;
  const len = Math.hypot(dx, dy);
  // Sobre el marco (lado sin vecino) queda algo más pegado, para no salirse.
  const k = portEdge(geo, port.coast).hexes.length === 1 ? 0.34 : 0.42;
  return { a, b, px: mx + (dx / len) * S * k, py: my + (dy / len) * S * k };
}

const fromCenter = { transformBox: 'fill-box' as const, transformOrigin: 'center' };

interface Props {
  board: Board;
  showPips?: boolean;
  /** Cómo se ven los números de las fichas. */
  numberStyle?: NumberStyle;
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

export function BoardSvg({ board, showPips = true, numberStyle = DEFAULT_NUMBER_STYLE, highlight = [], speed = 0, focus = null, onPickHex }: Props) {
  const geo = geometryOf(board);
  const HEXES = geo.hexes;
  const VERTICES = geo.vertices;
  const REVEAL_INDEX = geo.revealIndex;
  const sea = geo.kind === 'mar';
  // Con más hexágonos que el base, aparecen más deprisa para acabar a la vez.
  const step = T.hex * Math.min(1, 19 / HEXES.length);
  const numberStep = T.number * Math.min(1, 18 / Math.max(1, board.numbers.filter((n) => n != null).length));
  const animate = speed > 0;
  const d = (s: number) => s * speed;
  const enter = (delay: number, from: object) =>
    animate
      ? { initial: { opacity: 0, ...from }, animate: { opacity: 1, scale: 1, y: 0, rotate: 0 }, transition: { delay: d(delay), type: 'spring' as const, stiffness: 260, damping: 18 } }
      : { initial: false as const };

  // Puertos.
  const portsLayer = board.ports.map((port, j) => {
    const { a, b, px, py } = portSpot(geo, board, port);
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
  });

  return (
    <svg
      viewBox={viewBoxOf(geo)}
      role="img"
      aria-label={sea ? 'Mapa de Navegantes' : 'Tablero de Catan'}
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
      {/* Mar: el disco del Catan base, o el marco de Navegantes (todos los hexágonos con un borde grueso). */}
      {sea ? (
        <motion.g initial={animate ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: d(0.9) }}>
          {HEXES.map((hex) => (
            <polygon
              key={hex.id}
              points={hex.vertices.map((v) => `${VERTICES[v].x * S},${VERTICES[v].y * S}`).join(' ')}
              fill="var(--mar)"
              stroke="var(--mar)"
              strokeWidth={S * 0.9}
              strokeLinejoin="round"
            />
          ))}
        </motion.g>
      ) : (
      <motion.circle
        cx={0}
        cy={0}
        r={islandSeaRadius(geo) * S}
        fill="var(--mar)"
        style={fromCenter}
        initial={animate ? { opacity: 0, scale: 0.6 } : false}
        animate={{ opacity: 0.55, scale: 1 }}
        transition={{ duration: d(0.9), ease: [0.22, 1, 0.36, 1] }}
      />
      )}

      {!sea && portsLayer}

      {/* Hexágonos */}
      {HEXES.map((hex) => {
        const terrain = board.terrains[hex.id];
        const points = hex.vertices.map((v) => `${VERTICES[v].x * S},${VERTICES[v].y * S}`).join(' ');
        return (
          <motion.g key={hex.id} style={fromCenter} {...enter(REVEAL_INDEX[hex.id] * step, { scale: 0.2, rotate: -40 })}>
            <polygon
              points={points}
              fill={TERRAIN_FILL[terrain]}
              stroke={terrain === 'mar' ? 'rgba(10,30,45,0.55)' : 'var(--tinta)'}
              strokeWidth={terrain === 'mar' ? 1.5 : 3}
              strokeLinejoin="round"
            />
            <SvgGlyph
              name={TERRAIN_ICON[terrain]}
              x={hex.x * S}
              y={terrain === 'mar' || terrain === 'niebla' ? hex.y * S : hex.y * S - S * 0.58}
              size={terrain === 'mar' ? 22 : terrain === 'niebla' ? 30 : 15}
              color={TERRAIN_INK[terrain]}
              opacity={terrain === 'mar' ? 0.35 : 0.8}
            />
          </motion.g>
        );
      })}

      {/* En Navegantes los puertos van encima del mar. */}
      {sea && portsLayer}

      {/* Números */}
      {HEXES.map((hex) => {
        const n = board.numbers[hex.id];
        if (n == null) return null;
        const cx = hex.x * S;
        const cy = hex.y * S;
        const red = isRed(n) && numberStyle.red;
        return (
          <motion.g key={hex.id} style={fromCenter} {...enter(T.numbersStart + REVEAL_INDEX[hex.id] * numberStep, { y: -40, scale: 1.4 })}>
            <circle cx={cx} cy={cy + 2} r={S * 0.36 * numberStyle.disc} fill="var(--marfil)" stroke="rgba(0,0,0,0.15)" />
            <text
              x={cx}
              y={cy - (showPips ? 1 : -2)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily={numberStyle.family}
              fontWeight={numberStyle.weight}
              fontSize={(isRed(n) ? 19 : 16) * numberStyle.size}
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

      {/* Pirata (Navegantes): un barco negro sobre su casilla de mar. */}
      {board.pirate != null && (
        <g transform={`translate(${HEXES[board.pirate].x * S}, ${HEXES[board.pirate].y * S})`}>
          <motion.g style={fromCenter} {...enter(T.robber, { y: -30, scale: 0.4 })}>
            <circle r={S * 0.42} fill="#1d1a18" stroke="var(--marfil)" strokeWidth={2} />
            <SvgGlyph name="nuevo-mundo" x={0} y={0} size={26} color="var(--marfil)" />
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
