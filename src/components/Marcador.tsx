// Marcador de puntos dentro del tablero: tira de jugadores, hoja para sumar puntos,
// preparación de la partida, celebración al llegar a 10 y salón de la fama.
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  MAX_CIUDADES, MAX_PLAYERS, MAX_PUEBLOS, MIN_PLAYERS, PLAYER_COLORS, blocked, colorHex, colorInk, durationLabel, fameTable,
  minutesBetween, points, ranking, type Action, type Match, type PlayerColor,
} from '../lib/marcador';
import { useMarcador } from '../marcadorStore';
import { CardIcon, CheckIcon, CityIcon, CloseIcon, CrownIcon, HouseIcon, MoreIcon, PlusIcon, RoadIcon, ScoreIcon, ShieldIcon, UndoIcon } from './icons';

type Open = { kind: 'setup' } | { kind: 'menu' } | { kind: 'player'; id: string } | null;

export function Marcador({ visible }: { visible: boolean }) {
  const match = useMarcador((s) => s.match);
  const [open, setOpen] = useState<Open>(null);
  // La celebración sale una vez por ganador (si se deshace y se vuelve a ganar, sale otra vez).
  const [celebrated, setCelebrated] = useState<string | null>(match?.winner ?? null);
  const winner = match?.winner ?? null;
  const showWin = Boolean(match && winner && celebrated !== winner);

  useEffect(() => {
    if (!winner) setCelebrated(null);
  }, [winner]);
  // Al ganar alguien se cierra la hoja abierta, para que se vea bien la celebración.
  useEffect(() => {
    if (showWin) setOpen(null);
  }, [showWin]);

  return (
    <>
      {/* El hueco está siempre reservado, para que el tablero no salte al aparecer. */}
      <div className="score-slot">
      <AnimatePresence initial={false}>
        {visible && (
          <motion.div
            className="score-strip"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {match ? (
              <>
                <div className="score-players">
                  {match.players.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={match.winner === p.id ? 'score-player winner' : 'score-player'}
                      aria-label={`${p.name}: ${points(match, p.id)} puntos`}
                      onClick={() => setOpen({ kind: 'player', id: p.id })}
                    >
                      <span className="score-coin" style={{ background: colorHex(p.color), color: colorInk(p.color) }}>
                        <motion.b key={points(match, p.id)} initial={{ scale: 1.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
                          {points(match, p.id)}
                        </motion.b>
                        {(match.road === p.id || match.army === p.id) && (
                          <span className="score-badges">
                            {match.road === p.id && <RoadIcon size={11} />}
                            {match.army === p.id && <ShieldIcon size={11} />}
                          </span>
                        )}
                      </span>
                      <span className="player-name">{p.name}</span>
                    </button>
                  ))}
                </div>
                <button type="button" className="score-more" aria-label="Opciones del marcador" onClick={() => setOpen({ kind: 'menu' })}>
                  <MoreIcon size={20} />
                </button>
              </>
            ) : (
              <button type="button" className="score-start" onClick={() => setOpen({ kind: 'setup' })}>
                <ScoreIcon size={16} /> Marcador
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      <Sheet open={open?.kind === 'setup'} onClose={() => setOpen(null)} title="¿Quién juega?">
        <Setup onStart={() => setOpen(null)} />
      </Sheet>
      <Sheet open={open?.kind === 'menu'} onClose={() => setOpen(null)} title="Partida">
        {match && <MatchMenu match={match} onClose={() => setOpen(null)} />}
      </Sheet>
      <Sheet open={open?.kind === 'player'} onClose={() => setOpen(null)}>
        {match && open?.kind === 'player' && <PlayerPanel match={match} id={open.id} onClose={() => setOpen(null)} />}
      </Sheet>

      {createPortal(
      <AnimatePresence>
        {showWin && match && winner && (
          <Victory
            match={match}
            onKeep={() => setCelebrated(winner)}
            onFinish={() => {
              setCelebrated(winner);
              useMarcador.getState().finishMatch();
            }}
          />
        )}
      </AnimatePresence>,
      document.body,
      )}
    </>
  );
}

/** Hoja que sube desde abajo, con fondo oscuro que la cierra al tocarlo. */
function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Se pinta directamente en la página (fuera del tablero) para quedar por encima de todo.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="sheet-grabber" aria-hidden />
            {title && <h2 className="sheet-title">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Setup({ onStart }: { onStart: () => void }) {
  const { roster, wins, addPlayer, removePlayer, startMatch } = useMarcador();
  const [chosen, setChosen] = useState<string[]>(() => roster.slice(0, 4).map((p) => p.id));
  const [name, setName] = useState('');
  const used = new Set(roster.filter((p) => chosen.includes(p.id)).map((p) => p.color));
  const firstFree = PLAYER_COLORS.find((c) => !used.has(c.id))?.id ?? 'rojo';
  const [color, setColor] = useState<PlayerColor>(firstFree);
  const fame = useMemo(() => fameTable(wins).slice(0, 5), [wins]);
  // Dos jugadores elegidos con el mismo color confundirían el marcador.
  const clash = new Set(roster.filter((p) => chosen.includes(p.id)).map((p) => p.color)).size < chosen.length;

  const toggle = (id: string) =>
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= MAX_PLAYERS ? c : [...c, id]));

  const add = () => {
    if (!name.trim()) return;
    addPlayer(name, color);
    setName('');
    const after = useMarcador.getState().roster;
    const added = after[after.length - 1];
    if (added && chosen.length < MAX_PLAYERS) setChosen((c) => [...c, added.id]);
    const nextUsed = new Set([...used, color]);
    setColor(PLAYER_COLORS.find((c) => !nextUsed.has(c.id))?.id ?? color);
  };

  return (
    <div className="setup">
      {roster.length > 0 && (
        <ul className="roster">
          {roster.map((p) => {
            const on = chosen.includes(p.id);
            return (
              <li key={p.id}>
                <button type="button" className={on ? 'roster-row on' : 'roster-row'} aria-pressed={on} onClick={() => toggle(p.id)}>
                  <span className="player-dot big" style={{ background: colorHex(p.color) }} />
                  <span className="roster-name">{p.name}</span>
                  <span className="roster-check">{on && <CheckIcon size={18} />}</span>
                </button>
                <button type="button" className="roster-remove" aria-label={`Quitar a ${p.name}`} onClick={() => {
                  setChosen((c) => c.filter((x) => x !== p.id));
                  removePlayer(p.id);
                }}>
                  <CloseIcon size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form
        className="add-player"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={roster.length ? 'Otro jugador' : 'Nombre del primer jugador'} maxLength={16} aria-label="Nombre" />
        <div className="color-pick" role="radiogroup" aria-label="Color">
          {PLAYER_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={color === c.id}
              aria-label={c.label}
              className={color === c.id ? 'color-swatch on' : 'color-swatch'}
              style={{ background: c.hex }}
              onClick={() => setColor(c.id)}
            />
          ))}
        </div>
        <button type="submit" className="btn-secondary add-btn" disabled={!name.trim()}>
          <PlusIcon size={18} /> Añadir
        </button>
      </form>

      {clash && <p className="setup-warn">Hay dos jugadores con el mismo color.</p>}

      <button
        type="button"
        className="btn-primary setup-start"
        disabled={chosen.length < MIN_PLAYERS}
        onClick={() => {
          startMatch(roster.filter((p) => chosen.includes(p.id)).map((p) => p.id));
          onStart();
        }}
      >
        {chosen.length < MIN_PLAYERS ? `Elige al menos ${MIN_PLAYERS} jugadores` : `Empezar partida · ${chosen.length} jugadores`}
      </button>

      {fame.length > 0 && <Fame rows={fame} />}
    </div>
  );
}

function Fame({ rows }: { rows: { name: string; color: PlayerColor; wins: number }[] }) {
  return (
    <section className="fame">
      <h3>
        <CrownIcon size={16} /> Salón de la fama
      </h3>
      <ol>
        {rows.map((r) => (
          <li key={r.name}>
            <span className="player-dot" style={{ background: colorHex(r.color) }} />
            <span>{r.name}</span>
            <b>
              {r.wins} {r.wins === 1 ? 'victoria' : 'victorias'}
            </b>
          </li>
        ))}
      </ol>
    </section>
  );
}

const ACTIONS: { action: Action; label: string; icon: ReactNode }[] = [
  { action: 'pueblo', label: 'Pueblo', icon: <HouseIcon size={26} /> },
  { action: 'ciudad', label: 'Pueblo → ciudad', icon: <CityIcon size={26} /> },
  { action: 'carretera', label: 'Carretera más larga', icon: <RoadIcon size={26} /> },
  { action: 'ejercito', label: 'Gran ejército', icon: <ShieldIcon size={26} /> },
  { action: 'carta', label: 'Carta de punto', icon: <CardIcon size={26} /> },
];

function PlayerPanel({ match, id, onClose }: { match: Match; id: string; onClose: () => void }) {
  const { act, undo, past } = useMarcador();
  const p = match.players.find((x) => x.id === id);
  if (!p) return null;
  const total = points(match, id);
  const holder = (who: string | null) => match.players.find((x) => x.id === who)?.name;

  const hint = (a: Action): string => {
    switch (a) {
      case 'pueblo':
        return `+1 · tiene ${p.pueblos} de ${MAX_PUEBLOS}`;
      case 'ciudad':
        return `+1 · tiene ${p.ciudades} de ${MAX_CIUDADES}`;
      case 'carretera':
        return match.road === id ? 'La tiene · tocar para quitar' : match.road ? `+2 · se la quitas a ${holder(match.road)}` : '+2';
      case 'ejercito':
        return match.army === id ? 'Lo tiene · tocar para quitar' : match.army ? `+2 · se lo quitas a ${holder(match.army)}` : '+2';
      case 'carta':
        return `+1 · tiene ${p.cartas}`;
    }
  };

  return (
    <div className="player-panel">
      <header className="player-head">
        <span className="player-dot big" style={{ background: colorHex(p.color) }} />
        <h2>{p.name}</h2>
        <motion.span key={total} className="player-total" initial={{ scale: 1.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
          {total}
          <small>/{match.goal}</small>
        </motion.span>
      </header>
      <div className="action-grid">
        {ACTIONS.map(({ action, label, icon }) => {
          const why = blocked(match, id, action);
          const active = (action === 'carretera' && match.road === id) || (action === 'ejercito' && match.army === id);
          return (
            <motion.button
              key={action}
              type="button"
              whileTap={{ scale: 0.95 }}
              className={active ? 'score-action active' : 'score-action'}
              disabled={Boolean(why)}
              title={why ?? undefined}
              onClick={() => act(id, action)}
            >
              {icon}
              <b>{label}</b>
              <small>{why ?? hint(action)}</small>
            </motion.button>
          );
        })}
        <button type="button" className="score-action subtle" disabled={!past.length} onClick={undo}>
          <UndoIcon size={26} />
          <b>Deshacer</b>
          <small>{past.length ? 'El último cambio' : 'Nada que deshacer'}</small>
        </button>
      </div>
      <button type="button" className="btn-secondary sheet-done" onClick={onClose}>
        Listo
      </button>
    </div>
  );
}

function MatchMenu({ match, onClose }: { match: Match; onClose: () => void }) {
  const { undo, past, finishMatch, wins } = useMarcador();
  const [confirm, setConfirm] = useState(false);
  const fame = useMemo(() => fameTable(wins).slice(0, 5), [wins]);
  const minutes = minutesBetween(match.startedAt, Date.now());

  return (
    <div className="match-menu">
      <p className="muted">
        {match.players.length} jugadores · jugando desde hace {durationLabel(minutes)} · gana quien llegue a {match.goal}
      </p>
      <button type="button" className="btn-secondary" disabled={!past.length} onClick={undo}>
        <UndoIcon size={18} /> Deshacer el último cambio
      </button>
      {confirm ? (
        <div className="confirm-row">
          <span>¿Terminar la partida?{match.winner ? '' : ' Nadie ha ganado aún.'}</span>
          <button type="button" className="btn-secondary" onClick={() => setConfirm(false)}>
            No
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              finishMatch();
              onClose();
            }}
          >
            Sí, terminar
          </button>
        </div>
      ) : (
        <button type="button" className="btn-secondary" onClick={() => setConfirm(true)}>
          Terminar partida
        </button>
      )}
      {fame.length > 0 && <Fame rows={fame} />}
    </div>
  );
}

function Victory({ match, onKeep, onFinish }: { match: Match; onKeep: () => void; onFinish: () => void }) {
  const winner = match.players.find((p) => p.id === match.winner)!;
  const rows = ranking(match);
  const minutes = minutesBetween(match.startedAt, match.endedAt ?? Date.now());

  return (
    <motion.div className="victory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Confetti />
      <motion.div
        className="victory-card"
        initial={{ scale: 0.8, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
      >
        <CrownIcon size={40} className="victory-crown" />
        <h2>
          ¡{winner.name} gana!
        </h2>
        <p className="muted">
          {points(match, winner.id)} puntos · {durationLabel(minutes)} de partida
        </p>
        <ol className="victory-ranking">
          {rows.map(({ player, points: pts }) => (
            <li key={player.id}>
              <span className="player-dot" style={{ background: colorHex(player.color) }} />
              <span>{player.name}</span>
              <b>{pts}</b>
            </li>
          ))}
        </ol>
        <button type="button" className="btn-primary" onClick={onFinish}>
          Apuntar la victoria
        </button>
        <button type="button" className="btn-secondary" onClick={onKeep}>
          Seguir jugando
        </button>
      </motion.div>
    </motion.div>
  );
}

const CONFETTI_COLORS = ['#e0a458', '#f3e9d2', '#d0453b', '#3a6fd0', '#3f9a4a', '#ec8a2e', '#8dbf5a'];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        duration: 2.4 + Math.random() * 1.8,
        drift: (Math.random() - 0.5) * 160,
        spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
      })),
    [],
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((c, i) => (
        <i
          key={i}
          style={{
            left: `${c.left}%`,
            width: c.w,
            height: c.h,
            background: c.color,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.duration}s`,
            ['--drift' as string]: `${c.drift}px`,
            ['--spin' as string]: `${c.spin}deg`,
          }}
        />
      ))}
    </div>
  );
}

