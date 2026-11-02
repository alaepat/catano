// Pantalla de inicio: dato curioso arriba, título y bienvenida en el centro, botón de generar.
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { Glyph } from '../components/icons';
import { GearIcon, IconButton } from '../components/ui';
import datos from '../data/datos-curiosos.json';
import { datoDelDia } from '../lib/datoDelDia';
import { haptic } from '../lib/haptics';
import { APP_TITLE, FEATURES } from '../lib/config';
import { useApp } from '../store';

function saludo(date = new Date()): string {
  const h = date.getHours();
  if (h >= 6 && h < 13) return 'Buenos días, colonos';
  if (h >= 13 && h < 21) return 'Buenas tardes, colonos';
  return 'Buenas noches, colonos';
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
  const savedCount = useApp((s) => s.saved.length);
  const { peek, handlers } = usePeek();

  return (
    <motion.div className={peek ? 'screen inicio peek' : 'screen inicio'} variants={container} initial="hidden" animate="show" {...handlers}>
      <motion.div variants={item} className="inicio-top">
        <DatoCurioso />
      </motion.div>

      <div className="inicio-center">
        <motion.h1 variants={item} className="titulo">
          {APP_TITLE}
        </motion.h1>
        <motion.p variants={item} className="bienvenida">
          {saludo()}
          <span>¿Listos para una nueva isla?</span>
        </motion.p>
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

function DatoCurioso() {
  const hoy = datoDelDia(datos);
  const [texto, setTexto] = useState(hoy);
  const [open, setOpen] = useState(false);
  const taps = useRef<number[]>([]);

  const onTap = () => {
    // Opción secreta: tres toques rápidos muestran otro dato al azar.
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 700), now];
    if (taps.current.length >= 3 && datos.length > 1) {
      taps.current = [];
      const otros = datos.filter((d) => d !== texto);
      setTexto(otros[Math.floor(Math.random() * otros.length)]);
      setOpen(true);
      return;
    }
    setOpen((o) => !o);
  };

  return (
    <motion.button type="button" layout className={open ? 'dato open' : 'dato'} onClick={onTap} aria-expanded={open} transition={{ layout: { duration: 0.3, ease: [0.32, 0.72, 0, 1] } }}>
      <motion.span layout="position" className="dato-label">
        <Glyph name="idea" size={14} className="dato-glyph" /> Dato curioso del día
      </motion.span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={texto} layout="position" className="dato-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {texto}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
