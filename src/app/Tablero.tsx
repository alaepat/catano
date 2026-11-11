// El tablero generado (en 3D, o en 2D si se elige o si el móvil no puede), con su nombre de isla
// y las acciones: análisis, guardar, otra vez, foto y puntitos.
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BoardSvg } from '../components/BoardSvg';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { HexCard } from '../components/HexCard';
import { Glyph } from '../components/icons';
import { modeGlyph } from '../lib/glyphs';
import { Marcador } from '../components/Marcador';
import { BackIcon, IconButton, Toast } from '../components/ui';
import { LETTER_PRESETS, analyzeBoard, geometryOf, isPreset, letterLabels, modeGoal, modeLabel as labelOf, type Resource, type Terrain } from '../game';
import { backgroundFor } from '../lib/background';
import { loadBoard3D } from '../lib/board3d';
import { comentario } from '../lib/comentario';
import { FEATURES } from '../lib/config';
import { numberStyle } from '../lib/numberStyle';
import { capture2D, composePhoto, shareImage } from '../lib/photo';
import { revealDuration } from '../lib/reveal';
import { haptic } from '../lib/haptics';
import { playSound, unlockAudio, type SoundKind } from '../lib/sound';
import { hasWebGL } from '../lib/webgl';
import { useLogros } from '../logrosStore';
import { ANIM_FACTOR, useApp } from '../store';

const RESOURCE_LABEL: Record<Resource, string> = {
  madera: 'Madera',
  lana: 'Lana',
  trigo: 'Trigo',
  arcilla: 'Arcilla',
  mineral: 'Mineral',
};

const Board3D = lazy(loadBoard3D);

/** Sonido al tocar cada terreno (sin sonido, el móvil vibra un poco). */
const TERRAIN_SOUND: Record<Terrain, SoundKind> = {
  bosque: 'hacha',
  pasto: 'beee',
  cereal: 'espigas',
  colinas: 'ladrillo',
  montanas: 'pico',
  desierto: 'viento',
  mar: 'whoosh',
  oro: 'clink',
  niebla: 'whoosh',
};

export function Tablero() {
  const { generation, choice, settings, generate, updateSettings, toggleSaveCurrent, setFlying, renameCurrent } = useApp();
  const sound = settings.sound;
  const trackLogro = useLogros((s) => s.track);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [failed3d, setFailed3d] = useState(false);
  const [toast, setToast] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  // Generación cuya animación ya terminó (o se saltó tocando la pantalla).
  const [revealedId, setRevealedId] = useState<number | null>(null);
  // Hexágono tocado (zoom), recordando de qué generación es para que se olvide al crear otra isla.
  const [picked, setPicked] = useState<{ gen: number; hex: number } | null>(null);
  // Con la opción de letras: generación a la que ya se le ha dado la vuelta a las fichas.
  const [flippedId, setFlippedId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [confirmFlip, setConfirmFlip] = useState(false);
  const cancelName = useRef(false);
  const capture3D = useRef<(() => HTMLCanvasElement) | null>(null);
  const wrap2D = useRef<HTMLDivElement>(null);
  const slot3D = useRef<HTMLDivElement>(null);

  const reduceMotion = useReducedMotion();
  const speed = reduceMotion ? 0 : ANIM_FACTOR[settings.animSpeed];
  const use3d = settings.quality !== '2d' && !failed3d && hasWebGL();
  const genId = generation?.id ?? null;
  const revealed = speed === 0 || revealedId === genId;
  const reveal = () => setRevealedId(genId);
  const clearToast = useCallback(() => setToast([]), []);
  const focus = revealed && picked && picked.gen === genId ? picked.hex : null;
  const board = generation?.result.ok ? generation.result.board : null;
  const pick = useCallback(
    (hex: number | null) => {
      setPicked(hex === null || genId === null ? null : { gen: genId, hex });
      const terrain = hex === null ? undefined : board?.terrains[hex];
      if (!terrain) return;
      if (sound) {
        unlockAudio();
        playSound(TERRAIN_SOUND[terrain], Math.random());
      } else haptic(12);
      trackLogro({ type: 'tocar', terrain });
    },
    [genId, board, sound, trackLogro],
  );
  const numbers = useMemo(
    () => numberStyle(settings.numberSize, settings.numberFont, settings.redNumbers),
    [settings.numberSize, settings.numberFont, settings.redNumbers],
  );
  const analysis = useMemo(() => (board ? analyzeBoard(board) : null), [board]);
  // Caos total: las fichas salen con su letra. Hasta darles la vuelta, ni números ni análisis
  // (que delataría los mejores sitios).
  const lettersMode = Boolean(generation && isPreset(generation.mode) && LETTER_PRESETS.includes(generation.mode));
  const lettersOn = lettersMode && Boolean(board) && flippedId !== genId;
  const labels = useMemo(() => (lettersOn && board ? letterLabels(board) : null), [lettersOn, board]);
  const analysisOn = showAnalysis && !lettersOn;
  const highlight = useMemo(
    () => (revealed && analysisOn && analysis ? analysis.bestVertices.map((b) => b.vertex) : []),
    [revealed, analysisOn, analysis],
  );

  // Con la isla a la vista, el fondo Espacio empieza a "volar"; al salir, se para.
  const shown = revealed && Boolean(board);
  useEffect(() => {
    setFlying(shown);
    return () => setFlying(false);
  }, [shown, setFlying]);

  // En 2D la animación dura un tiempo fijo; en 3D avisa la propia escena al terminar.
  useEffect(() => {
    if (speed === 0 || use3d || genId === null) return;
    const t = setTimeout(() => setRevealedId(genId), revealDuration(speed) * 1000);
    return () => clearTimeout(t);
  }, [genId, speed, use3d]);

  if (!generation) return null;

  const modeLabel = labelOf(generation.mode);
  const saved = Boolean(generation.savedId);

  const otraVez = () => {
    if (settings.sound) unlockAudio();
    generate();
  };

  const darLaVuelta = () => {
    setConfirmFlip(false);
    setFlippedId(genId);
    if (settings.sound) {
      unlockAudio();
      playSound('chord');
    } else haptic(20);
    setToast(['¡Fichas a la vista!']);
  };

  const guardar = () => {
    toggleSaveCurrent();
    setToast([saved ? 'Quitada de Mis tableros' : 'Guardada en Mis tableros']);
  };

  const foto = async () => {
    if (!analysis || busy) return;
    setBusy(true);
    try {
      let image: HTMLCanvasElement | null = null;
      if (use3d) image = capture3D.current?.() ?? null;
      else {
        const svg = wrap2D.current?.querySelector('svg');
        if (svg) image = await capture2D(svg);
      }
      if (!image) throw new Error('Sin tablero');
      const blob = await composePhoto(image, {
        name: generation.name,
        subtitle: `${modeLabel} · Equilibrio ${analysis.score}`,
        date: new Date(),
        soft: use3d,
      });
      const result = await shareImage(blob, generation.name);
      if (result === 'descargada') setToast(['Foto descargada']);
    } catch (e) {
      console.error(e);
      setToast(['No se ha podido hacer la foto. Prueba otra vez.']);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen tablero">
      <header className="topbar">
        <IconButton label="Volver" onClick={() => window.history.back()}>
          <BackIcon />
        </IconButton>
        <div className="topbar-title tablero-title">
          <span>
            <Glyph name={modeGlyph(generation.mode)} size={18} className="title-glyph" />
            {modeLabel}
          </span>
          {choice === 'sorpresa' && !saved && <small>Sorpresa</small>}
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
        {board && editingName ? (
          <input
            className="island-name island-name-input"
            aria-label="Nombre de la isla"
            defaultValue={generation.name}
            maxLength={40}
            autoFocus
            enterKeyHint="done"
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') {
                cancelName.current = true;
                e.currentTarget.blur();
              }
            }}
            onBlur={(e) => {
              if (!cancelName.current) renameCurrent(e.currentTarget.value);
              cancelName.current = false;
              setEditingName(false);
            }}
          />
        ) : board ? (
          // El nombre de la isla aparece al terminar la animación (su hueco está reservado para que nada salte).
          // Tocándolo se le puede poner el nombre que se quiera.
          <motion.h2
            key={generation.id}
            className="island-name"
            initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
            animate={revealed ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 8, filter: 'blur(6px)' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => revealed && setEditingName(true)}
            title="Toca para cambiar el nombre"
          >
            {generation.name}
          </motion.h2>
        ) : null}

        {board && lettersOn && revealed && (
          <motion.p className="letters-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Poned los primeros poblados y luego tocad <b>Números</b>
          </motion.p>
        )}

        {/* Marcador de puntos: aparece con el nombre de la isla. */}
        {board && <Marcador visible={revealed} seafarers={geometryOf(board).kind === 'mar'} goal={modeGoal(generation.mode)} />}

        {board && use3d ? (
          // El hueco marca dónde se encaja la isla; el lienzo 3D va detrás de todo, a pantalla completa.
          <div className="board-3d" ref={slot3D}>
            <div className="board-3d-canvas" role="img" aria-label={`Tablero de Catan en 3D: ${generation.name}`} onClick={reveal}>
            <ErrorBoundary fallback={null} onError={() => setFailed3d(true)}>
              <Suspense fallback={<div className="board-loading" />}>
                <Board3D
                  board={board}
                  labels={labels}
                  animKey={generation.id}
                  speed={speed}
                  skip={revealed}
                  showPips={settings.showPips}
                  numberStyle={numbers}
                  highlight={highlight}
                  quality={settings.quality === '2d' ? 'alta' : settings.quality}
                  stars={backgroundFor('tablero', settings) === 'espacio'}
                  sound={settings.sound}
                  focus={focus}
                  onPick={pick}
                  slotRef={slot3D}
                  captureRef={capture3D}
                  onDone={reveal}
                  onFail={() => setFailed3d(true)}
                />
              </Suspense>
            </ErrorBoundary>
            </div>
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
          <div className="board-wrap" ref={wrap2D} onClick={reveal}>
            <BoardSvg
              key={generation.id}
              board={board}
              labels={labels}
              speed={speed}
              showPips={settings.showPips}
              numberStyle={numbers}
              highlight={highlight}
              focus={focus}
              onPickHex={revealed ? pick : undefined}
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
          {analysisOn && analysis && (
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
              <p className="analysis-comment">{comentario(analysis)}</p>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {board && focus !== null && <HexCard key={focus} board={board} hex={focus} label={labels?.[focus]} onClose={() => pick(null)} />}
      </AnimatePresence>

      <Toast messages={toast} onDone={clearToast} />

      {/* Antes de dar la vuelta a las fichas, una preguntita. */}
      <AnimatePresence>
        {confirmFlip && lettersOn && (
          <motion.div
            className="confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmFlip(false)}
          >
            <motion.div
              className="confirm-card"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-flip-title"
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="confirm-emoji" aria-hidden>
                🤨
              </span>
              <h2 id="confirm-flip-title">¿Seguro que ya pusieron todos los pueblos, pillín!!??</h2>
              <p className="muted">Al darles la vuelta se ven los números de todas las fichas.</p>
              <div className="confirm-actions">
                <button type="button" className="btn-secondary" onClick={() => setConfirmFlip(false)}>
                  Todavía no
                </button>
                <motion.button type="button" className="btn-primary" whileTap={{ scale: 0.95 }} onClick={darLaVuelta} autoFocus>
                  ¡Sí, dale la vuelta!
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className={FEATURES.foto && FEATURES.guardar ? 'action-bar five' : 'action-bar'} aria-label="Acciones del tablero">
        <button type="button" className={analysisOn ? 'action active' : 'action'} aria-pressed={analysisOn} onClick={() => setShowAnalysis(!showAnalysis)} disabled={!board || lettersOn}>
          <Glyph name="analisis" size={20} />
          Análisis
        </button>
        {FEATURES.guardar && (
          <button type="button" className={saved ? 'action active' : 'action'} aria-pressed={saved} onClick={guardar} disabled={!board}>
            <Glyph name="estrella" size={20} fill={saved ? 'currentColor' : 'none'} />
            {saved ? 'Guardada' : 'Guardar'}
          </button>
        )}
        <motion.button type="button" className="btn-primary action-main" whileTap={{ scale: 0.95 }} onClick={otraVez}>
          Otra vez
        </motion.button>
        {FEATURES.foto && (
          <button type="button" className="action" onClick={foto} disabled={!board || !revealed || busy}>
            <Glyph name="camara" size={20} />
            Foto
          </button>
        )}
        {lettersOn ? (
          <motion.button type="button" className="action flip-action" onClick={() => setConfirmFlip(true)} disabled={!revealed} whileTap={{ scale: 0.92 }}>
            <span aria-hidden className="flip-glyph">
              A<i>→</i>8
            </span>
            Números
          </motion.button>
        ) : (
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
        )}
      </nav>
    </div>
  );
}
