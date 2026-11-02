// Personalizar la generación: elegir un modo de un toque y, si se quiere, retocar opciones.
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { Glyph } from '../components/icons';
import { BackIcon, Chips, Collapsible, IconButton, Switch, Toast } from '../components/ui';
import { PRESET_IDS, PRESET_INFO, type GenOptions } from '../game';
import { loadBoard3D } from '../lib/board3d';
import { unlockAudio } from '../lib/sound';
import { hasWebGL } from '../lib/webgl';
import { useApp, type ModeChoice } from '../store';

const MODE_CHOICES: ModeChoice[] = [...PRESET_IDS, 'sorpresa'];

function modeInfo(choice: ModeChoice) {
  if (choice === 'sorpresa') return { label: 'Sorpresa', description: 'Un modo al azar cada vez. Ni tú sabrás qué te espera.' };
  if (choice === 'personalizado') return { label: 'Personalizado', description: 'Tus propias reglas.' };
  return PRESET_INFO[choice];
}

export function Personalizar() {
  const { choice, options, notes, goTo, selectMode, setOption, clearNotes, generate, settings } = useApp();
  const info = modeInfo(choice);

  // Descarga la escena 3D mientras se eligen opciones, para que la isla salga sin esperas.
  useEffect(() => {
    if (settings.quality !== '2d' && hasWebGL()) void loadBoard3D().catch(() => {});
  }, [settings.quality]);

  const crear = () => {
    if (settings.sound) unlockAudio();
    generate();
    goTo('tablero');
  };

  return (
    <div className="screen personalizar">
      <header className="topbar">
        <IconButton label="Volver" onClick={() => window.history.back()}>
          <BackIcon />
        </IconButton>
        <h1 className="topbar-title">Tu isla</h1>
        <span className="topbar-spacer" />
      </header>

      <div className="scroll">
        <h2 className="section-title">Modo</h2>
        <div className="mode-grid" role="radiogroup" aria-label="Modo de generación">
          {MODE_CHOICES.map((id) => {
            const m = modeInfo(id);
            const active = choice === id;
            return (
              <motion.button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                className={active ? 'mode-card active' : 'mode-card'}
                whileTap={{ scale: 0.96 }}
                onClick={() => selectMode(id)}
              >
                <Glyph name={id} size={26} className="mode-card-icon" />
                <span className="mode-card-label">{m.label}</span>
              </motion.button>
            );
          })}
          {choice === 'personalizado' && (
            <div className="mode-card active custom" role="radio" aria-checked>
              <Glyph name="personalizado" size={26} className="mode-card-icon" />
              <span className="mode-card-label">Personalizado</span>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={choice}
            className="mode-description"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {info.description}
          </motion.p>
        </AnimatePresence>

        <h2 className="section-title">Ajustes avanzados</h2>
        {choice === 'sorpresa' ? (
          <p className="muted">En Sorpresa las reglas las pone el modo que toque. Elige otro modo para retocarlas.</p>
        ) : (
          <AdvancedOptions options={options} setOption={setOption} />
        )}
      </div>

      <div className="bottom-cta">
        <motion.button type="button" className="btn-primary btn-xl" whileTap={{ scale: 0.96 }} onClick={crear}>
          ¡Crear isla!
        </motion.button>
      </div>

      <Toast messages={notes} onDone={clearNotes} />
    </div>
  );
}

type SetOption = <K extends keyof GenOptions>(key: K, value: GenOptions[K]) => void;

function AdvancedOptions({ options: o, setOption }: { options: GenOptions; setOption: SetOption }) {
  return (
    <div className="advanced">
      <Collapsible title="Terrenos" icon={<Glyph name="isla" size={20} />}>
        <Chips label="Desierto" value={o.desert} onChange={(v) => setOption('desert', v)} options={[['centro', 'Centro'], ['aleatorio', 'Al azar'], ['costa', 'Costa']]} />
        <Chips
          label="Distribución"
          value={o.terrainLayout}
          onChange={(v) => setOption('terrainLayout', v)}
          options={[['normal', 'Repartidos'], ['regiones', 'Regiones']]}
        />
        <Chips
          label="Terrenos iguales juntos (máximo)"
          value={o.maxTerrainGroup}
          onChange={(v) => setOption('maxTerrainGroup', v)}
          options={[[0, 'Sin límite'], [3, '3'], [2, '2'], [1, 'Ninguno']]}
        />
      </Collapsible>

      <Collapsible title="Números" icon={<Glyph name="sorpresa" size={20} />}>
        <Chips
          label="Colocación"
          value={o.numberMethod}
          onChange={(v) => setOption('numberMethod', v)}
          options={[['aleatorio', 'Al azar'], ['espiral', 'Espiral oficial']]}
        />
        <Switch label="6 y 8 separados" checked={o.avoidRedAdjacent} onChange={(v) => setOption('avoidRedAdjacent', v)} />
        <Switch label="Números iguales separados" checked={o.avoidSameAdjacent} onChange={(v) => setOption('avoidSameAdjacent', v)} />
        <Switch label="2 y 12 separados" checked={o.avoid2And12Adjacent} onChange={(v) => setOption('avoid2And12Adjacent', v)} />
        <Switch
          label="Reparto justo"
          hint="Ningún recurso con números mucho peores que otro"
          checked={o.fairResources}
          onChange={(v) => setOption('fairResources', v)}
        />
        <Chips
          label="Tope de puntitos por cruce"
          value={o.maxVertexPips}
          onChange={(v) => setOption('maxVertexPips', v)}
          options={[[0, 'Sin tope'], [12, '12'], [11, '11']]}
        />
        <Chips
          label="Dónde van los 6 y 8"
          value={o.redsZone}
          onChange={(v) => setOption('redsZone', v)}
          options={[['cualquiera', 'Donde sea'], ['interior', 'Interior'], ['costa', 'Costa']]}
        />
        <Chips
          label="Escasez (solo 2, 3, 11 o 12)"
          value={o.scarceResource}
          onChange={(v) => setOption('scarceResource', v)}
          options={[
            ['ninguno', 'Ninguna'],
            ['aleatorio', 'Al azar'],
            ['madera', 'Madera'],
            ['lana', 'Lana'],
            ['trigo', 'Trigo'],
            ['arcilla', 'Arcilla'],
            ['mineral', 'Mineral'],
          ]}
        />
      </Collapsible>

      <Collapsible title="Puertos" icon={<Glyph name="mercaderes" size={20} />}>
        <Switch label="Puertos" checked={o.ports} onChange={(v) => setOption('ports', v)} />
        <Chips
          label="Posición"
          value={o.portPositions}
          disabled={!o.ports}
          onChange={(v) => setOption('portPositions', v)}
          options={[['fijas', 'Fijas'], ['aleatorias', 'Al azar']]}
        />
        <Chips
          label="Puerto 2:1 junto a su recurso"
          value={o.portNearResource}
          disabled={!o.ports}
          onChange={(v) => setOption('portNearResource', v)}
          options={[['da-igual', 'Da igual'], ['evitar', 'Evitar'], ['forzar', 'Siempre']]}
        />
      </Collapsible>

      <Collapsible title="Ladrón" icon={<Glyph name="ladron" size={20} />}>
        <Chips label="Empieza en" value={o.robberStart} onChange={(v) => setOption('robberStart', v)} options={[['desierto', 'El desierto'], ['fuera', 'Fuera del tablero']]} />
      </Collapsible>
    </div>
  );
}
