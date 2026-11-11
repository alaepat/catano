// Ajustes: título de la portada, fondo, velocidad de animación, calidad gráfica, sonido, números de las fichas
// (o sus letras) y borrar datos.
import { motion } from 'motion/react';
import { useId } from 'react';
import { isRed, pips } from '../game';
import { BackIcon, Chips, IconButton, Switch } from '../components/ui';
import { BOARD_BACKGROUNDS } from '../lib/background';
import { ANIM_SPEEDS, APP_TITLE, APP_VERSION, BACKGROUNDS, QUALITIES } from '../lib/config';
import { NUMBER_FONTS, NUMBER_SIZES, numberStyle, type NumberFont, type NumberSize, type NumberStyle } from '../lib/numberStyle';
import { playSound, unlockAudio } from '../lib/sound';
import { hasWebGL } from '../lib/webgl';
import { TITLE_MAX, useApp } from '../store';

export function Ajustes() {
  const { settings, updateSettings, resetAll } = useApp();
  const webgl = hasWebGL();
  const style = numberStyle(settings.numberSize, settings.numberFont, settings.redNumbers);

  const borrar = () => {
    if (window.confirm('¿Borrar los ajustes, las opciones y Mis tableros? Volverá todo a como estaba al principio.')) resetAll();
  };

  return (
    <div className="screen ajustes">
      <header className="topbar">
        <IconButton label="Volver" onClick={() => window.history.back()}>
          <BackIcon />
        </IconButton>
        <h1 className="topbar-title">Ajustes</h1>
        <span className="topbar-spacer" />
      </header>

      <div className="scroll">
        <h2 className="section-title">Portada</h2>
        <div className="card settings-card">
          <label className="field">
            <span className="field-label">Título</span>
            <input
              className="title-input"
              value={settings.title}
              placeholder={APP_TITLE}
              maxLength={TITLE_MAX}
              enterKeyHint="done"
              onChange={(e) => updateSettings({ title: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
          </label>
          <p className="field-hint">El que quieras. Si lo dejas vacío, vuelve a ser {APP_TITLE}. El nombre de cada isla se cambia tocándolo en el tablero.</p>
        </div>

        <h2 className="section-title">Fondo</h2>
        <div className="bg-grid" role="radiogroup" aria-label="Fondo">
          {BACKGROUNDS.map((bg) => {
            const active = settings.background === bg.id;
            return (
              <motion.button
                key={bg.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={active ? 'bg-option active' : 'bg-option'}
                whileTap={{ scale: 0.96 }}
                onClick={() => updateSettings({ background: bg.id })}
              >
                <span className="bg-preview" style={{ background: bg.preview }} />
                <span>{bg.label}</span>
              </motion.button>
            );
          })}
        </div>

        <h2 className="section-title">Tablero</h2>
        <div className="card settings-card">
          <Chips
            label="Fondo mientras ves el tablero"
            value={settings.boardBackground}
            options={BOARD_BACKGROUNDS}
            onChange={(v) => updateSettings({ boardBackground: v })}
          />
          <p className="field-hint">Para que la isla sea la protagonista. Al volver al inicio regresa tu fondo.</p>
          <Chips label="Velocidad de animación" value={settings.animSpeed} options={ANIM_SPEEDS} onChange={(v) => updateSettings({ animSpeed: v })} />
          <Chips
            label="Calidad gráfica"
            value={webgl ? settings.quality : '2d'}
            options={QUALITIES}
            onChange={(v) => updateSettings({ quality: v })}
            disabled={!webgl}
          />
          <p className="field-hint">
            {webgl
              ? 'Alta: con sombras y detalles. Si el móvil va a tirones, prueba Media o Baja. 2D: el tablero plano de siempre.'
              : 'Este móvil no puede mostrar el 3D, así que se usa el tablero 2D.'}
          </p>
          <Switch
            label="Sonidos en la animación"
            checked={settings.sound}
            onChange={(v) => {
              updateSettings({ sound: v });
              if (v) {
                unlockAudio();
                playSound('chord');
              }
            }}
          />
        </div>

        <h2 className="section-title">Números de las fichas</h2>
        <div className="card settings-card">
          <NumberPreview style={style} showPips={settings.showPips} />
          <Chips label="Tamaño" value={settings.numberSize} options={SIZE_OPTIONS} onChange={(v) => updateSettings({ numberSize: v })} />
          <FontChips value={settings.numberFont} onChange={(v) => updateSettings({ numberFont: v })} />
          <Switch
            label="Letras en vez de números"
            hint="Las fichas salen con su letra (A, B, C...) para poner los primeros poblados sin saber los números. Luego, el botón Números les da la vuelta."
            checked={settings.letters}
            onChange={(v) => updateSettings({ letters: v })}
          />
          <Switch label="El 6 y el 8 en rojo" checked={settings.redNumbers} onChange={(v) => updateSettings({ redNumbers: v })} />
          <Switch label="Mostrar puntitos de probabilidad" checked={settings.showPips} onChange={(v) => updateSettings({ showPips: v })} />
        </div>

        <h2 className="section-title">Datos</h2>
        <div className="card settings-card">
          <button type="button" className="danger-row" onClick={borrar}>
            Borrar datos guardados
          </button>
        </div>

        <p className="version">Versión {APP_VERSION}</p>
      </div>
    </div>
  );
}

const SIZE_OPTIONS = Object.entries(NUMBER_SIZES).map(([id, s]) => [id as NumberSize, s.label] as const);

/** Elegir la letra: cada botón se escribe con su propia letra. */
function FontChips({ value, onChange }: { value: NumberFont; onChange: (v: NumberFont) => void }) {
  const id = useId();
  return (
    <div className="field">
      <span className="field-label" id={id}>
        Letra
      </span>
      <div className="chips" role="radiogroup" aria-labelledby={id}>
        {(Object.keys(NUMBER_FONTS) as NumberFont[]).map((f) => {
          const font = NUMBER_FONTS[f];
          return (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={value === f}
              className={value === f ? 'chip font-chip active' : 'chip font-chip'}
              style={{ fontFamily: font.family, fontWeight: font.weight, fontSize: `${font.scale}rem` }}
              onClick={() => onChange(f)}
            >
              8 {font.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Tres fichas de muestra con el estilo elegido. */
function NumberPreview({ style, showPips }: { style: NumberStyle; showPips: boolean }) {
  return (
    <svg className="number-preview" viewBox="0 0 240 80" role="img" aria-label="Muestra de las fichas">
      {[5, 6, 11].map((n, i) => {
        const cx = 50 + i * 70;
        const red = isRed(n) && style.red;
        const color = red ? 'var(--rojo-numero)' : 'var(--tinta)';
        return (
          <g key={n}>
            <circle cx={cx} cy={40} r={30 * style.disc} fill="var(--marfil)" stroke="rgba(0,0,0,0.15)" />
            <text
              x={cx}
              y={showPips ? 37 : 41}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily={style.family}
              fontWeight={style.weight}
              fontSize={(isRed(n) ? 31 : 27) * style.size}
              fill={color}
            >
              {n}
            </text>
            {showPips && (
              <text x={cx} y={60} textAnchor="middle" fontSize={12} letterSpacing={-1.5} fill={color}>
                {'•'.repeat(pips(n))}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
