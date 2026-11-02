// Pantalla de inicio: dato curioso arriba, título y bienvenida en el centro, botón de generar.
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { useRef, useState } from 'react';
import { GearIcon, IconButton } from '../components/ui';
import datos from '../data/datos-curiosos.json';
import { datoDelDia } from '../lib/datoDelDia';
import { APP_TITLE } from '../lib/config';
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

export function Inicio() {
  const goTo = useApp((s) => s.goTo);
  const savedCount = useApp((s) => s.saved.length);

  return (
    <motion.div className="screen inicio" variants={container} initial="hidden" animate="show">
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
        <button type="button" className="pill-button" onClick={() => goTo('tableros')}>
          <span aria-hidden>📜</span> Mis tableros
          {savedCount > 0 && <span className="pill-count">{savedCount}</span>}
        </button>
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
        💡 Dato curioso del día
      </motion.span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={texto} layout="position" className="dato-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {texto}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
