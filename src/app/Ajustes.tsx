// Ajustes: fondo, velocidad de animación, calidad gráfica, sonido, puntitos y borrar datos.
import { motion } from 'motion/react';
import { BackIcon, Chips, IconButton, Switch } from '../components/ui';
import { ANIM_SPEEDS, APP_VERSION, BACKGROUNDS, QUALITIES } from '../lib/config';
import { playSound, unlockAudio } from '../lib/sound';
import { hasWebGL } from '../lib/webgl';
import { useApp } from '../store';

export function Ajustes() {
  const { settings, updateSettings, resetAll } = useApp();
  const webgl = hasWebGL();

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
