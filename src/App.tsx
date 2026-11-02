// Pantalla de prueba de la Fase 1: generar tableros y verlos en 2D.
// En la Fase 2 se sustituye por el flujo real (Inicio → Personalizar → Tablero).
import { useMemo, useState } from 'react';
import './App.css';
import { BoardSvg } from './components/BoardSvg';
import {
  PRESETS, PRESET_LABELS, analyzeBoard, decodeBoard, encodeBoard, generateBoard,
  type Board, type PresetId, type Resource,
} from './game';

const RESOURCE_LABEL: Record<Resource, string> = {
  madera: 'madera',
  lana: 'lana',
  trigo: 'trigo',
  arcilla: 'arcilla',
  mineral: 'mineral',
};

function freshBoard(preset: PresetId) {
  return generateBoard(PRESETS[preset]);
}

export default function App() {
  const [preset, setPreset] = useState<PresetId>('equilibrado');
  const [result, setResult] = useState(() => freshBoard('equilibrado'));
  const [loaded, setLoaded] = useState<Board | null>(null);
  const [showPips, setShowPips] = useState(true);
  const [codeInput, setCodeInput] = useState('');
  const [copied, setCopied] = useState(false);

  const board = loaded ?? (result.ok ? result.board : null);
  const analysis = useMemo(() => (board ? analyzeBoard(board) : null), [board]);
  const code = board ? encodeBoard(board) : '';

  const generate = (p = preset) => {
    setLoaded(null);
    setCopied(false);
    setResult(freshBoard(p));
  };

  const loadCode = () => {
    const decoded = decodeBoard(codeInput);
    if (decoded) {
      setLoaded(decoded);
      setCodeInput('');
    } else {
      alert('Ese código no es válido');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="dev">
      <header className="dev-header">
        <h1>Catan</h1>
        <p>Fase 1 · prueba del generador</p>
      </header>

      <div className="presets" role="radiogroup" aria-label="Preset">
        {(Object.keys(PRESETS) as PresetId[]).map((p) => (
          <button
            key={p}
            role="radio"
            aria-checked={preset === p}
            className={preset === p ? 'pill active' : 'pill'}
            onClick={() => {
              setPreset(p);
              generate(p);
            }}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
      </div>

      <section className="board-card">
        {board ? <BoardSvg board={board} showPips={showPips} highlight={analysis?.bestVertices.map((b) => b.vertex)} /> : <p className="error">{!result.ok && result.error}</p>}
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
              Recurso más escaso: <b>{RESOURCE_LABEL[analysis.scarcest]}</b>
            </li>
            <li>
              Recurso más abundante: <b>{RESOURCE_LABEL[analysis.richest]}</b>
            </li>
          </ul>
          <label className="toggle">
            <input type="checkbox" checked={showPips} onChange={(e) => setShowPips(e.target.checked)} />
            Mostrar puntitos
          </label>
        </section>
      )}

      {board && (
        <section className="card share">
          <span className="share-label">Código del tablero</span>
          <div className="share-row">
            <code>{code}</code>
            <button className="pill" onClick={copy}>
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <div className="share-row">
            <input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="Pega un código…" aria-label="Código de tablero" />
            <button className="pill" onClick={loadCode} disabled={!codeInput.trim()}>
              Cargar
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
