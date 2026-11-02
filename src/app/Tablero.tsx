// El tablero generado (en 3D, o en 2D si se elige o si el móvil no puede), con acciones: otra vez, análisis y puntitos.

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { BoardSvg } from '../components/BoardSvg';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { BackIcon, IconButton } from '../components/ui';
import { loadBoard3D } from '../lib/board3d';
import { revealDuration } from '../lib/reveal';
import { hasWebGL } from '../lib/webgl';
import { PRESET_INFO, analyzeBoard, type Resource } from '../game';
import { ANIM_FACTOR, useApp } from '../store';

const RESOURCE_LABEL: Record<Resource, string> = {
  madera: '🌲 Madera',
  lana: '🐑 Lana',
  trigo: '🌾 Trigo',
  arcilla: '🧱 Arcilla',
  mineral: '⛰️ Mineral',
};

const Board3D = lazy(loadBoard3D);

export function Tablero() {
  const { generation, choice, settings, generate, updateSettings } = useApp();
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [failed3d, setFailed3d] = useState(false);
  // Generación cuya animación ya terminó (o se saltó tocando la pantalla).
  const [revealedId, setRevealedId] = useState<number | null>(null);

  const reduceMotion = useReducedMotion();
  const speed = reduceMotion ? 0 : ANIM_FACTOR[settings.animSpeed];
  const use3d = settings.quality !== '2d' && !failed3d && hasWebGL();
  const genId = generation?.id ?? null;
  const revealed = speed === 0 || revealedId === genId;
  const reveal = () => setRevealedId(genId);

  const board = generation?.result.ok ? generation.result.board : null;
  const analysis = useMemo(() => (board ? analyzeBoard(board) : null), [board]);
  const highlight = useMemo(
    () => (revealed && showAnalysis && analysis ? analysis.bestVertices.map((b) => b.vertex) : []),
    [revealed, showAnalysis, analysis],
  );

  // En 2D la animación dura un tiempo fijo; en 3D avisa la propia escena al terminar.
  useEffect(() => {
    if (speed === 0 || use3d || genId === null) return;
    const t = setTimeout(() => setRevealedId(genId), revealDuration(speed) * 1000);
    return () => clearTimeout(t);
  }, [genId, speed, use3d]);

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
        {board && use3d ? (
          <div className="board-3d" role="img" aria-label="Tablero de Catan en 3D" onClick={reveal}>
            <ErrorBoundary fallback={null} onError={() => setFailed3d(true)}>
              <Suspense fallback={<div className="board-loading" />}>
                <Board3D
                  board={board}
                  animKey={generation.id}
                  speed={speed}
                  skip={revealed}
                  showPips={settings.showPips}
                  highlight={highlight}
                  quality={settings.quality === '2d' ? 'alta' : settings.quality}
                  stars={settings.background === 'espacio'}
                  onDone={reveal}
                  onFail={() => setFailed3d(true)}
                />
              </Suspense>
            </ErrorBoundary>
            <AnimatePresence>
              {!revealed && (
                <motion.p
                  className="skip-hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 1.2, duration: 0.6 } }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                >
                  Toca para saltar
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        ) : board ? (
          <div className="board-wrap" onClick={reveal}>
            <BoardSvg key={generation.id} board={board} speed={speed} showPips={settings.showPips} highlight={highlight} />
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
