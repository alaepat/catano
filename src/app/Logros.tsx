// Pantalla de logros: cuántos llevas, y cada uno con su barrita de progreso o la fecha en que se consiguió.
import { motion } from 'motion/react';
import { BackIcon, IconButton } from '../components/ui';
import { Glyph } from '../components/icons';
import { LOGROS, isDone, partidasJugadas } from '../lib/logros';
import { useLogros } from '../logrosStore';

const fecha = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

export function Logros() {
  const progress = useLogros((s) => s.progress);
  const unlocked = useLogros((s) => s.unlocked);
  const done = LOGROS.filter((l) => unlocked[l.id] || isDone(l, progress)).length;

  return (
    <div className="screen logros">
      <header className="topbar">
        <IconButton label="Volver" onClick={() => window.history.back()}>
          <BackIcon />
        </IconButton>
        <h1 className="topbar-title">Logros</h1>
        <span className="topbar-spacer" />
      </header>

      <div className="scroll">
        <div className="card logros-summary">
          <Glyph name="medalla" size={30} className="logros-summary-icon" />
          <div>
            <p className="logros-count">
              {done} <span>de {LOGROS.length}</span>
            </p>
            <div className="logro-bar" aria-hidden>
              <span style={{ width: `${(done / LOGROS.length) * 100}%` }} />
            </div>
            <p className="logros-games">
              <b>{partidasJugadas(progress)}</b> partidas jugadas
            </p>
          </div>
        </div>

        <ul className="logro-list">
          {LOGROS.map((l, i) => {
            const date = unlocked[l.id];
            const ok = Boolean(date) || isDone(l, progress);
            const value = Math.min(l.value(progress), l.goal);
            return (
              <motion.li
                key={l.id}
                className={ok ? 'card logro done' : 'card logro'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.035, 0.4), duration: 0.35 }}
              >
                <span className="logro-icon">
                  <Glyph name="medalla" size={24} />
                </span>
                <div className="logro-text">
                  <h2>{l.title}</h2>
                  <p>{l.description}</p>
                  {ok && date && <p className="logro-date">Conseguido el {fecha(date)}</p>}
                  {!ok && l.goal > 1 && (
                    <div className="logro-progress">
                      <div className="logro-bar" aria-hidden>
                        <span style={{ width: `${(value / l.goal) * 100}%` }} />
                      </div>
                      <span>
                        {value}/{l.goal}
                      </span>
                    </div>
                  )}
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
