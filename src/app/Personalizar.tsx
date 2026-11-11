// Personalizar la generación: elegir juego (Catan, 5-6 jugadores o Navegantes), un modo de un toque y, si se quiere, retocar opciones.
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { Glyph } from '../components/icons';
import { ModeWheel } from '../components/ModeWheel';
import { BackIcon, Chips, Collapsible, IconButton, Switch, Toast } from '../components/ui';
import { CS_INFO, FAVORITE_PRESETS, PRESET_IDS, PRESET_INFO, isPreset, usesLetters, SCENARIOS, scenarioInfo, type CincoSeisStyle, type GenOptions, type SeaOptions } from '../game';
import type { GlyphName } from '../lib/glyphs';
import { loadBoard3D } from '../lib/board3d';
import { unlockAudio } from '../lib/sound';
import { hasWebGL } from '../lib/webgl';
import { useApp, type GameId, type ModeChoice } from '../store';

const MODE_CHOICES: ModeChoice[] = [...PRESET_IDS, 'sorpresa'];

function modeInfo(choice: ModeChoice) {
  if (choice === 'sorpresa') return { label: 'Sorpresa', description: 'Un modo al azar cada vez. Ni tú sabrás qué te espera.' };
  if (choice === 'personalizado') return { label: 'Personalizado', description: 'Tus propias reglas.' };
  return PRESET_INFO[choice];
}

const LABELS = Object.fromEntries([...MODE_CHOICES, 'personalizado' as const].map((m) => [m, modeInfo(m).label]));

export function Personalizar() {
  const { game, setGame, sea, setSea, csStyle, setCsStyle, choice, basePreset, options, notes, goTo, selectMode, setOption, clearNotes, generate, settings } = useApp();
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
        <GamePicker game={game} onChange={setGame} />

        {game === 'navegantes' ? (
          <NavegantesInfo sea={sea} setSea={setSea} />
        ) : game === 'cinco-seis' ? (
          <CincoSeisInfo style={csStyle} onStyle={setCsStyle} />
        ) : (
        <>
        <ModeWheel
          modes={MODE_CHOICES}
          choice={choice}
          options={options}
          labels={LABELS}
          sound={settings.sound}
          onSelect={selectMode}
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={choice}
            className="mode-info"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            aria-live="polite"
          >
            <h3 className="mode-name">
              {info.label}
              {isPreset(choice) && FAVORITE_PRESETS.includes(choice) && <span className="fav-chip">★ Favorito</span>}
            </h3>
            <p className="mode-description">
              {choice === 'personalizado' && usesLetters('personalizado', basePreset)
                ? `Tus propias reglas a partir de ${PRESET_INFO[basePreset].label}: las fichas siguen saliendo con letras.`
                : info.description}
            </p>
          </motion.div>
        </AnimatePresence>

        <h2 className="section-title">Ajustes avanzados</h2>
        {choice === 'sorpresa' ? (
          <p className="muted">En Sorpresa las reglas las pone el modo que toque. Elige otro modo para retocarlas.</p>
        ) : (
          <AdvancedOptions options={options} setOption={setOption} />
        )}
        </>
        )}
      </div>

      <div className="bottom-cta">
        <motion.button type="button" className="btn-primary btn-xl" whileTap={{ scale: 0.96 }} onClick={crear}>
          {game === 'navegantes' ? '¡Crear mapa!' : '¡Crear isla!'}
        </motion.button>
      </div>

      <Toast messages={notes} onDone={clearNotes} />
    </div>
  );
}

/** Elegir juego: el Catan de siempre, la ampliación de 5-6 jugadores o la expansión Navegantes. */
function GamePicker({ game, onChange }: { game: GameId; onChange: (g: GameId) => void }) {
  const items: [GameId, string, GlyphName][] = [
    ['base', 'Catan', 'isla'],
    ['cinco-seis', '5-6', 'cinco-seis'],
    ['navegantes', 'Navegantes', 'nuevo-mundo'],
  ];
  return (
    <div className="game-picker" role="radiogroup" aria-label="Juego">
      {items.map(([id, label, glyph]) => (
        <button key={id} type="button" role="radio" aria-checked={game === id} className={game === id ? 'game-opt on' : 'game-opt'} onClick={() => onChange(id)}>
          {game === id && <motion.span layoutId="game-pill" className="game-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <span className="game-label">
            <Glyph name={glyph} size={17} /> {label}
          </span>
        </button>
      ))}
    </div>
  );
}

const STYLE_OPTIONS = [
  ['equilibrado', 'Equilibrado'],
  ['azar', 'Al azar (reglas)'],
] as const;

/** Ampliación 5-6 jugadores: qué trae y cómo se reparte. */
function CincoSeisInfo({ style, onStyle }: { style: CincoSeisStyle; onStyle: (s: CincoSeisStyle) => void }) {
  return (
    <motion.div className="nm-info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="card nm-card">
        <Glyph name="cinco-seis" size={34} className="nm-glyph" />
        <h3 className="mode-name">{CS_INFO.label}</h3>
        <p className="mode-description">{CS_INFO.description}</p>
        <ul className="nm-facts">
          <li>30 hexágonos en filas 3-4-5-6-5-4-3, con 2 desiertos</li>
          <li>28 fichas de número y 11 puertos (dos de ellos de lana)</li>
          <li>Gana quien llegue a <b>10 puntos</b></li>
          <li>Fase de construcción especial: al acabar cada turno, los demás pueden construir (sin comerciar)</li>
          <li>El ladrón empieza en uno de los desiertos</li>
        </ul>
      </div>
      <h2 className="section-title">Reparto</h2>
      <Chips label="Cómo se reparte" value={style} onChange={onStyle} options={STYLE_OPTIONS} />
      <p className="muted nm-hint">
        {style === 'equilibrado'
          ? 'Sin tres terrenos iguales juntos, desiertos separados y números bien repartidos.'
          : 'Todo al azar, solo con el 6 y el 8 separados.'}
      </p>
    </motion.div>
  );
}

/** Navegantes: escenario, jugadores, ficha del escenario y cómo se reparte. */
function NavegantesInfo({ sea, setSea }: { sea: SeaOptions; setSea: (p: Partial<SeaOptions>) => void }) {
  const info = scenarioInfo(sea.scenario);
  const nuevoMundo = sea.scenario === 'nuevo-mundo';
  const fixedMap = sea.scenario === 'piratas';
  return (
    <motion.div className="nm-info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {SCENARIOS.length > 1 && (
        <Chips label="Escenario" value={sea.scenario} onChange={(scenario) => setSea({ scenario })} options={SCENARIOS.map((x) => [x.id, x.label] as const)} />
      )}
      {info.players.length > 1 && !nuevoMundo && (
        <Chips label="Jugadores" value={sea.players} onChange={(players) => setSea({ players })} options={[[3, '3 jugadores'], [4, '4 jugadores']]} />
      )}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={info.id} className="card nm-card" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          <Glyph name="nuevo-mundo" size={34} className="nm-glyph" />
          <h3 className="mode-name">{info.label}</h3>
          <p className="mode-description">{info.description}</p>
          <ul className="nm-facts">
            {info.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
            <li>
              {info.goalText ?? (
                <>
                  Gana quien llegue a <b>{info.goal} puntos</b>
                </>
              )}
            </li>
            <li>Barco: 1 madera + 1 lana</li>
          </ul>
        </motion.div>
      </AnimatePresence>
      <h2 className="section-title">{nuevoMundo ? 'Islas' : 'Reparto'}</h2>
      {fixedMap ? (
        <p className="muted nm-hint">Mapa fijo, tal cual el libro: solo los puertos cambian de una vez a otra.</p>
      ) : (
      <>
      <Chips
        label={nuevoMundo ? 'Cómo se reparten' : 'Terrenos y números'}
        value={sea.style}
        onChange={(style) => setSea({ style })}
        options={nuevoMundo ? [['equilibrado', 'Equilibradas'], ['azar', 'Al azar (reglas)']] : STYLE_OPTIONS}
      />
      <p className="muted nm-hint">
        {!nuevoMundo
          ? sea.style === 'equilibrado'
            ? 'Lo que el libro deja cambiar, al azar pero bien repartido. Lo demás, como en el libro.'
            : 'Lo que el libro deja cambiar, al azar (solo con el 6 y el 8 separados).'
          : sea.style === 'equilibrado'
            ? 'De 3 a 6 islas, ninguna gigante, cada recurso en al menos dos islas y números bien repartidos.'
            : 'Tal cual dice el libro: todo al azar, solo con el 6 y el 8 separados.'}
      </p>
      </>
      )}
      {nuevoMundo && (
        <>
          <h2 className="section-title">Piezas extra (variante)</h2>
          <Switch
            label="Ríos de oro"
            hint="Los 2 de la caja, en lugar de 2 de mar. Dan el recurso que quieras; llevan 3, 4, 10 u 11."
            checked={sea.extras.oro}
            onChange={(oro) => setSea({ extras: { ...sea.extras, oro } })}
          />
          <Switch
            label="Desiertos"
            hint="2 desiertos en lugar de 2 de mar."
            checked={sea.extras.desierto}
            onChange={(desierto) => setSea({ extras: { ...sea.extras, desierto } })}
          />
        </>
      )}
    </motion.div>
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
