// Pantalla de prueba de la Fase 1: elegir un modo, generar tableros y verlos en 2D.
// En la Fase 2 se sustituye por el flujo real (Inicio → Personalizar → Tablero).
import { useMemo, useState } from 'react';
import './App.css';
import { BoardSvg } from './components/BoardSvg';
import { PRESETS, PRESET_IDS, PRESET_INFO, analyzeBoard, generateBoard, surprisePreset, type PresetId } from './game';

type Choice = PresetId | 'sorpresa';

function run(choice: Choice) {
  const mode = choice === 'sorpresa' ? surprisePreset() : choice;
  return { mode, result: generateBoard(PRESETS[mode]) };
}

export default function App() {
  const [choice, setChoice] = useState<Choice>('equilibrado');
  const [{ mode, result }, setRun] = useState(() => run('equilibrado'));
  const [showPips, setShowPips] = useState(true);

  const board = result.ok ? result.board : null;
  const analysis = useMemo(() => (board ? analyzeBoard(board) : null), [board]);

  const generate = (c: Choice = choice) => setRun(run(c));

  return (
    <main className="dev">
      <header className="dev-header">
        <h1>Catan</h1>
        <p>Fase 1 · prueba del generador</p>
      </header>

      <div className="modes" role="radiogroup" aria-label="Modo de generación">
        {[...PRESET_IDS, 'sorpresa' as const].map((id) => (
          <button
            key={id}
            role="radio"
            aria-checked={choice === id}
            className={choice === id ? 'mode active' : 'mode'}
            onClick={() => {
              setChoice(id);
              generate(id);
            }}
          >
            <span className="mode-emoji">{id === 'sorpresa' ? '🎲' : PRESET_INFO[id].emoji}</span>
            {id === 'sorpresa' ? 'Sorpresa' : PRESET_INFO[id].label}
          </button>
        ))}
      </div>

      <p className="mode-desc">
        {choice === 'sorpresa' && (
          <>
            Ha tocado <b>{PRESET_INFO[mode].label}</b>.{' '}
          </>
        )}
        {PRESET_INFO[mode].description}
      </p>

      <section className="board-card">
        {board ? (
          <BoardSvg board={board} showPips={showPips} highlight={analysis?.bestVertices.map((b) => b.vertex)} />
        ) : (
          <p className="error">{!result.ok && result.error}</p>
        )}
      </section>

      <button className="primary" onClick={() => generate()}>
        Otra vez
      </button>

      {analysis && (
        <section className="card stats">
          <div className="score">
            <span className="score-num">{analysis.score}</span>
            <span className="score-label">equilibrio</span>
          </div>
          <ul>
            <li>
              Mejor cruce: <b>{analysis.bestVertices[0].pips} puntitos</b> <span className="dot" /> (marcados en el mapa)
            </li>
            <li>
              Recurso más escaso: <b>{analysis.scarcest}</b>
            </li>
            <li>
              Recurso más abundante: <b>{analysis.richest}</b>
            </li>
          </ul>
          <label className="toggle">
            <input type="checkbox" checked={showPips} onChange={(e) => setShowPips(e.target.checked)} />
            Mostrar puntitos
          </label>
        </section>
      )}
    </main>
  );
}
