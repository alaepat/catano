// Mis tableros: las islas guardadas. Tocar una la abre; se pueden renombrar y borrar.
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { BoardSvg } from '../components/BoardSvg';
import { BackIcon, IconButton } from '../components/ui';
import { Glyph } from '../components/icons';
import { modeLabel } from '../game';
import { unlockAudio } from '../lib/sound';
import type { SavedBoard } from '../lib/saved';
import { useApp } from '../store';

const fecha = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

export function MisTableros() {
  const saved = useApp((s) => s.saved);

  return (
    <div className="screen tableros">
      <header className="topbar">
        <IconButton label="Volver" onClick={() => window.history.back()}>
          <BackIcon />
        </IconButton>
        <h1 className="topbar-title">Mis tableros</h1>
        <span className="topbar-spacer" />
      </header>

      <div className="scroll">
        {saved.length === 0 ? (
          <div className="card empty-card">
            <span aria-hidden className="empty-icon">
              <Glyph name="oficial" size={40} />
            </span>
            <p>Aún no has guardado ninguna isla.</p>
            <p className="muted">Cuando salga un tablero que te guste, pulsa Guardar y aparecerá aquí.</p>
          </div>
        ) : (
          <ul className="saved-list">
            <AnimatePresence initial={false}>
              {saved.map((s) => (
                <SavedItem key={s.id} entry={s} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}

function SavedItem({ entry }: { entry: SavedBoard }) {
  const { openSaved, renameSaved, deleteSaved, settings } = useApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.name);
  const mode = modeLabel(entry.mode);

  const open = () => {
    if (editing) return;
    if (settings.sound) unlockAudio();
    openSaved(entry.id);
  };
  const save = () => {
    renameSaved(entry.id, draft);
    setEditing(false);
  };
  const borrar = () => {
    if (window.confirm(`¿Borrar «${entry.name}» de Mis tableros?`)) deleteSaved(entry.id);
  };

  return (
    <motion.li
      layout
      className="card saved-item"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0, padding: 0 }}
      transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
    >
      <button type="button" className="saved-thumb" onClick={open} aria-label={`Abrir ${entry.name}`}>
        <BoardSvg board={entry.board} showPips={false} />
      </button>
      <div className="saved-info">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <input
              className="saved-input"
              value={draft}
              maxLength={40}
              autoFocus
              aria-label="Nombre de la isla"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setDraft(entry.name);
                  setEditing(false);
                }
              }}
            />
          </form>
        ) : (
          <button type="button" className="saved-name" onClick={open}>
            {entry.name}
          </button>
        )}
        <span className="saved-meta">
          {mode} · {fecha(entry.date)}
        </span>
        <span className="saved-meta">Equilibrio {entry.score}</span>
      </div>
      <div className="saved-actions">
        <IconButton
          label="Renombrar"
          onClick={() => {
            setDraft(entry.name);
            setEditing(true);
          }}
        >
          <Glyph name="lapiz" size={18} />
        </IconButton>
        <IconButton label="Borrar" onClick={borrar}>
          <Glyph name="papelera" size={18} />
        </IconButton>
      </div>
    </motion.li>
  );
}
