// Pantalla de inicio: una islita decorativa arriba, título (a gusto en Ajustes), saludo con la predicción del día
// y el botón de generar.
import { motion, type Variants } from 'motion/react';
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { Glyph } from '../components/icons';
import { GearIcon, IconButton } from '../components/ui';
import { haptic } from '../lib/haptics';
import { APP_TITLE, FEATURES } from '../lib/config';
import { useApp } from '../store';

/** Colores de los jugadores de Catan (con la ampliación 5-6). */
const COLORES = [
  { name: 'rojo', css: '#e0473a' },
  { name: 'azul', css: '#4a8fe0' },
  { name: 'blanco', css: '#f4f1ea' },
  { name: 'naranja', css: '#f08a3c' },
  { name: 'verde', css: '#5cb85c' },
  { name: 'marrón', css: '#b07a4a' },
];

/** La "predicción" del día: un color que gana y el número que más va a salir (tirando dos dados de verdad). */
function prediccion() {
  const d1 = 1 + Math.floor(Math.random() * 6);
  const d2 = 1 + Math.floor(Math.random() * 6);
  return { color: COLORES[Math.floor(Math.random() * COLORES.length)], dice: [d1, d2] as const, n: d1 + d2 };
}

/** Puntos de cada cara de un dado (en una rejilla de 3 × 3). */
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

function Dado({ value, tilt }: { value: number; tilt: number }) {
  return (
    <motion.svg
      viewBox="0 0 30 30"
      className="dado"
      initial={{ rotate: tilt * 4, scale: 0.6, opacity: 0 }}
      animate={{ rotate: tilt, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 12, delay: 1.6 }}
      aria-hidden
    >
      <rect x="1.5" y="1.5" width="27" height="27" rx="6" fill="#f6efe0" stroke="rgba(0,0,0,0.25)" />
      {PIPS[value].map(([x, y], i) => (
        <circle key={i} cx={8 + x * 7} cy={8 + y * 7} r="2.4" fill={value === 1 ? '#c8402f' : '#2a2420'} />
      ))}
    </motion.svg>
  );
}

/** Siete hexágonos de terreno flotando como una islita, con un barquito dando vueltas. */
const ISLA: [number, number, string][] = [
  [0, 0, 'desierto'], [1, 0, 'bosque'], [0.5, -0.87, 'cereal'], [-0.5, -0.87, 'pasto'],
  [-1, 0, 'montanas'], [-0.5, 0.87, 'colinas'], [0.5, 0.87, 'oro'],
];
const hexPoints = (r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');

function MiniIsla() {
  const R = 17;
  const step = R * 1.78;
  return (
    <svg viewBox="-80 -62 160 124" className="mini-isla" aria-hidden>
      <defs>
        <radialGradient id="mini-mar" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4aa3d6" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#2f76a0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r="60" fill="url(#mini-mar)" />
      {[38, 48, 56].map((r, i) => (
        <motion.circle
          key={r}
          r={r}
          fill="none"
          stroke="var(--crema)"
          strokeOpacity={0.12}
          strokeDasharray="3 7"
          animate={{ rotate: i % 2 ? -360 : 360 }}
          transition={{ duration: 60 + i * 20, repeat: Infinity, ease: 'linear' }}
        />
      ))}
      {ISLA.map(([x, y, t], i) => (
        <motion.g
          key={t}
          initial={{ opacity: 0, scale: 0.3, x: x * step, y: y * step - 30 }}
          animate={{ opacity: 1, scale: 1, x: x * step, y: [y * step, y * step - 2.5, y * step] }}
          transition={{
            opacity: { delay: 0.3 + i * 0.08, duration: 0.4 },
            scale: { delay: 0.3 + i * 0.08, type: 'spring', stiffness: 300, damping: 14 },
            y: { delay: 1 + i * 0.25, duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          <polygon points={hexPoints(R)} fill={`var(--${t})`} stroke="rgba(20,16,12,0.55)" strokeWidth="1.6" />
          <polygon points={hexPoints(R * 0.62)} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        </motion.g>
      ))}
      {/* El barquito navega alrededor de la isla. */}
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="18s" repeatCount="indefinite" />
        <g transform="translate(0 -52)">
          <path d="M-7 1 H7 L4.5 5 H-4.5 Z" fill="#7b5534" />
          <path d="M0 0 V-11 L6 -2 Z" fill="#fff3dd" />
          <path d="M-0.6 0 V-12" stroke="#7b5534" strokeWidth="1.2" />
        </g>
      </g>
    </svg>
  );
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.28, delayChildren: 0.35 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
};

/** Mantener el dedo quieto este tiempo en el inicio esconde todo y deja ver solo el fondo. */
const PEEK_MS = 450;
const PEEK_SLOP = 12; // px que se puede mover el dedo sin que cuente como arrastrar

/** Mantener pulsado: mientras el dedo siga apoyado, se ve solo el fondo. Al soltar, todo vuelve. */
function usePeek() {
  const [peek, setPeek] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const start = useRef<{ id: number; x: number; y: number } | null>(null);
  const justPeeked = useRef(false);

  const stopTimer = () => window.clearTimeout(timer.current);
  useEffect(() => stopTimer, []);

  const end = () => {
    stopTimer();
    start.current = null;
    setPeek(false);
  };

  return {
    peek,
    handlers: {
      onPointerDown: (e: PointerEvent) => {
        if (start.current) {
          end(); // un segundo dedo: no es un "mantener pulsado"
          return;
        }
        justPeeked.current = false;
        start.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        stopTimer();
        timer.current = window.setTimeout(() => {
          justPeeked.current = true;
          setPeek(true);
          haptic(8);
        }, PEEK_MS);
      },
      onPointerMove: (e: PointerEvent) => {
        const s = start.current;
        if (!s || s.id !== e.pointerId || justPeeked.current) return;
        if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > PEEK_SLOP) end();
      },
      onPointerUp: end,
      onPointerCancel: end,
      onContextMenu: (e: MouseEvent) => e.preventDefault(),
      // Si se soltó después de ver el fondo, ese toque no debe pulsar ningún botón.
      onClickCapture: (e: MouseEvent) => {
        if (justPeeked.current) {
          justPeeked.current = false;
          e.preventDefault();
          e.stopPropagation();
        }
      },
    },
  };
}

export function Inicio() {
  const goTo = useApp((s) => s.goTo);
  const title = useApp((s) => s.settings.title.trim()) || APP_TITLE;
  const [hoy] = useState(prediccion);
  const savedCount = useApp((s) => s.saved.length);
  const { peek, handlers } = usePeek();

  return (
    <motion.div className={peek ? 'screen inicio peek' : 'screen inicio'} variants={container} initial="hidden" animate="show" {...handlers}>
      <motion.div variants={item} className="inicio-top">
        <MiniIsla />
      </motion.div>

      <div className="inicio-center">
        <motion.h1 variants={item} className="titulo">
          {title}
        </motion.h1>
        <motion.div variants={item} className="ornamento" aria-hidden>
          <span />
          <svg viewBox="-10 -10 20 20">
            <polygon points={hexPoints(8)} fill="none" stroke="var(--acento)" strokeWidth="1.6" />
            <circle r="2.4" fill="var(--acento)" />
          </svg>
          <span />
        </motion.div>
        <motion.p variants={item} className="bienvenida">
          <strong className="saludo">QUE TALLL SEÑOORRR</strong>
          <span>
            hoy gana el{' '}
            <b className="pred-color" style={{ color: hoy.color.css }}>
              {hoy.color.name}
            </b>{' '}
            y el número que más va a caer es el <b className="pred-num">{hoy.n}</b>
          </span>
        </motion.p>
        <motion.div variants={item} className="dados">
          <Dado value={hoy.dice[0]} tilt={-12} />
          <Dado value={hoy.dice[1]} tilt={9} />
        </motion.div>
        <motion.button
          variants={item}
          type="button"
          className="btn-primary btn-xl"
          whileTap={{ scale: 0.96 }}
          onClick={() => goTo('personalizar')}
        >
          Generar tablero
        </motion.button>
      </div>

      <motion.nav variants={item} className="inicio-bottom">
        {FEATURES.guardar && (
          <button type="button" className="pill-button" onClick={() => goTo('tableros')}>
            <Glyph name="oficial" size={18} /> Mis tableros
            {savedCount > 0 && <span className="pill-count">{savedCount}</span>}
          </button>
        )}
        <IconButton label="Logros" onClick={() => goTo('logros')}>
          <Glyph name="medalla" size={21} />
        </IconButton>
        <IconButton label="Ajustes" onClick={() => goTo('ajustes')}>
          <GearIcon />
        </IconButton>
      </motion.nav>
    </motion.div>
  );
}
