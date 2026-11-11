// Tarjeta con los datos del hexágono que se ha tocado: terreno, número, puntitos y probabilidad.
import { motion } from 'motion/react';
import { TERRAIN_RESOURCE, isRed, pips, type Board, type Terrain } from '../game';

const TERRAIN_NAME: Record<Terrain, string> = {
  bosque: 'Bosque',
  pasto: 'Pasto',
  cereal: 'Campo de cereal',
  colinas: 'Colinas',
  montanas: 'Montañas',
  desierto: 'Desierto',
  mar: 'Mar',
  oro: 'Río de oro',
  niebla: 'Niebla',
};

const pct = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });

/** `label`: con las fichas boca abajo, su letra (y no se dice nada del número). */
export function HexCard({ board, hex, label, onClose }: { board: Board; hex: number; label?: string | null; onClose: () => void }) {
  const terrain = board.terrains[hex];
  const n = board.numbers[hex];
  const resource = TERRAIN_RESOURCE[terrain];
  const p = pips(n);
  const robber = board.robber === hex;

  return (
    <motion.section
      className="hex-card"
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.96 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      aria-live="polite"
    >
      <span className="hex-swatch" style={{ background: `var(--${terrain})` }} aria-hidden />
      <div className="hex-info">
        <b>{TERRAIN_NAME[terrain]}</b>
        <small>
          {resource ? `Da ${resource}` : terrain === 'mar' ? 'Aquí solo navegan los barcos' : terrain === 'oro' ? 'Da el recurso que elijas' : terrain === 'niebla' ? 'Por descubrir: al llegar, roba una casilla del montón' : 'No da nada'}
          {robber && ' · aquí empieza el ladrón'}
        </small>
        {n != null && label && <small>Ficha {label}: el número se ve al darles la vuelta</small>}
        {n != null && !label && (
          <small>
            {p} {p === 1 ? 'puntito' : 'puntitos'} · sale {pct((p / 36) * 100)} % de las tiradas
          </small>
        )}
      </div>
      {n != null && <span className={!label && isRed(n) ? 'hex-number red' : 'hex-number'}>{label ?? n}</span>}
      <button type="button" className="hex-close" onClick={onClose}>
        Ver todo
      </button>
    </motion.section>
  );
}
