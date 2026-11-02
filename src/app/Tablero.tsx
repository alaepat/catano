// El tablero generado, con acciones: otra vez, análisis y puntitos.
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { BoardSvg } from '../components/BoardSvg';
import { revealDuration } from '../lib/reveal';
import { BackIcon, IconButton } from '../components/ui';
import { PRESET_INFO, analyzeBoard, type Resource } from '../game';
import { ANIM_FACTOR, useApp } from '../store';

const RESOURCE_LABEL: Record<Resource, string> = {
  madera: '🌲 Madera',
  lana: '🐑 Lana',
  trigo: '🌾 Trigo',
  arcilla: '🧱 Arcilla',
  mineral: '⛰️ Mineral',
};

export function Tablero() {
  const { generation, choice, settings, generate, updateSettings } = useApp();
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const speed = ANIM_FACTOR[settings.animSpeed];
  const board = generation?.result.ok ? generation.result.board : null;
  const analysis = useMemo(() => (board ? analyzeBoard(board) : null), [board]);

  // Tras la animación, aparecen los mejores cruces y se puede regenerar sin pisar la animación.
  useEffect(() => {
    setRevealed(speed === 0);
    if (speed === 0) return;
    const t = setTimeout(() => setRevealed(true), revealDuration(speed) * 1000);
    return () => clearTimeout(t);
  }, [generation?.id, speed]);

  if (!generation) return null;

  const modeLabel =
    generation.mode === 'personalizado' ? '🛠️ Personalizado' : `${PRESET_INFO[generation.mode].emoji} ${PRESET_INFO[generation.mode].label}`;

  return (
    <div className="screen tablero">
      <header className="topbar">
        <IconButton label="Volver" onClick={() => window.history.back()}>
          <BackIcon />
        </IconButton>
        <div className="topbar-title tablero-title">
          <span>{modeLabel}</span>
          {choice === 'sorpresa' && <small>Sorpresa</small>}
        </div>
        {analysis ? (
          <motion.span className="score-chip" initial={{ opacity: 0 }} animate={{ opacity: revealed ? 1 : 0 }} title="Puntuación de equilibrio">
            {analysis.score}
          </motion.span>
        ) : (
          <span className="topbar-spacer" />
        )}
      </header>

      <div className="tablero-main">
        {board ? (
          <div className="board-wrap" onClick={() => setRevealed(true)}>
            <BoardSvg
              key={generation.id}
              board={board}
              speed={speed}
              showPips={settings.showPips}
              highlight={revealed && showAnalysis ? analysis?.bestVertices.map((b) => b.vertex) : []}
            />
          </div>
        ) : (
          <div className="card error-card">
            <p>{!generation.result.ok && generation.result.error}</p>
            <button type="button" className="btn-secondary" onClick={() => window.history.back()}>
              Cambiar opciones
            </button>
          </div>
        )}

        <AnimatePresence>
          {showAnalysis && analysis && (
            <motion.section
              className="card analysis"
              initial={{ opacity: 0, y: 16, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 16, height: 0 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            >
              <div className="analysis-inner">
                <div className="analysis-score">
                  <span className="big-number">{analysis.score}</span>
                  <span className="muted">de equilibrio</span>
                </div>
                <ul>
                  <li>
                    <span className="dot" /> Mejor cruce: <b>{analysis.bestVertices[0].pips} puntitos</b>
                  </li>
                  <li>
                    Más escaso: <b>{RESOURCE_LABEL[analysis.scarcest]}</b>
                  </li>
                  <li>
                    Más abundante: <b>{RESOURCE_LABEL[analysis.richest]}</b>
                  </li>
                </ul>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <nav className="action-bar" aria-label="Acciones del tablero">
        <button type="button" className={showAnalysis ? 'action active' : 'action'} aria-pressed={showAnalysis} onClick={() => setShowAnalysis(!showAnalysis)} disabled={!board}>
          <span aria-hidden>📊</span>
          Análisis
        </button>
        <motion.button type="button" className="btn-primary action-main" whileTap={{ scale: 0.95 }} onClick={generate}>
          Otra vez
        </motion.button>
        <button
          type="button"
          className={settings.showPips ? 'action active' : 'action'}
          aria-pressed={settings.showPips}
          onClick={() => updateSettings({ showPips: !settings.showPips })}
          disabled={!board}
        >
          <span aria-hidden>••</span>
          Puntitos
        </button>
      </nav>
    </div>
  );
}
