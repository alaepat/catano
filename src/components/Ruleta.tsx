// Ruleta "¿Quién empieza?": una rueda con los jugadores de la partida. Al girar suena (o vibra)
// un "tic" en cada separación y, al pararse, se anuncia quién empieza.
import { AnimatePresence, animate, motion, useMotionValue } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { haptic } from '../lib/haptics';
import { colorHex, colorInk, type Player } from '../lib/marcador';
import { sliceAt, spinTarget } from '../lib/ruleta';
import { playSound } from '../lib/sound';
import { useApp } from '../store';

const R = 100;

function slicePath(i: number, n: number): string {
  const a0 = ((i / n) * 2 - 0.5) * Math.PI;
  const a1 = (((i + 1) / n) * 2 - 0.5) * Math.PI;
  const p = (a: number) => `${(R * Math.cos(a)).toFixed(2)} ${(R * Math.sin(a)).toFixed(2)}`;
  return `M0 0 L${p(a0)} A${R} ${R} 0 ${n === 1 ? 1 : 0} 1 ${p(a1)} Z`;
}

export function Ruleta({ players }: { players: Player[] }) {
  const sound = useApp((s) => s.settings.sound);
  const n = players.length;
  const rotation = useMotionValue(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const stop = useRef<(() => void) | null>(null);

  useEffect(() => () => stop.current?.(), []);

  const spin = () => {
    if (spinning || n < 2) return;
    const index = Math.floor(Math.random() * n);
    const target = spinTarget(rotation.get(), n, index, Math.random(), 5 + Math.floor(Math.random() * 2));
    // Una "pestaña" en cada separación entre sectores: tic al pasar por ella.
    const peg = (r: number) => Math.floor(r / (360 / n));
    let last = peg(rotation.get());
    setWinner(null);
    setSpinning(true);
    haptic(10);
    const controls = animate(rotation, target, {
      duration: 4.4,
      ease: [0.12, 0.75, 0.2, 1],
      onUpdate: (r) => {
        const now = peg(r);
        if (now !== last) {
          last = now;
          if (sound) playSound('tock', 1.4);
          else haptic(6);
        }
      },
      onComplete: () => {
        setSpinning(false);
        setWinner(players[sliceAt(target, n)] ?? null);
        haptic(25);
        if (sound) playSound('chord');
      },
    });
    stop.current = () => controls.stop();
  };

  return (
    <div className="ruleta">
      <div className="ruleta-wheel">
        <motion.svg viewBox="-104 -104 208 208" className="ruleta-disc" style={{ rotate: rotation }} aria-hidden>
          {players.map((p, i) => {
            const mid = ((i + 0.5) / n) * 360;
            const isWinner = winner?.id === p.id;
            return (
              <g key={p.id}>
                <path d={slicePath(i, n)} fill={colorHex(p.color)} stroke="#1b1822" strokeWidth={2.5} opacity={winner && !isWinner ? 0.45 : 1} />
                <text
                  transform={`rotate(${mid - 90}) translate(${R * 0.6} 0)${mid > 180 ? ' rotate(180)' : ''}`}
                  fill={colorInk(p.color)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="ruleta-name"
                >
                  {p.name.length > 9 ? `${p.name.slice(0, 8)}…` : p.name}
                </text>
              </g>
            );
          })}
          <circle r={R} fill="none" stroke="rgba(243,233,210,0.35)" strokeWidth={3} />
          <circle r={14} fill="#1b1822" stroke="var(--acento)" strokeWidth={3} />
        </motion.svg>
        <svg viewBox="-20 0 40 30" className="ruleta-pointer" aria-hidden>
          <path d="M-12 2 L12 2 L0 26 Z" fill="var(--acento)" stroke="#1b1822" strokeWidth={2.5} strokeLinejoin="round" />
        </svg>
      </div>

      <div className="ruleta-result" aria-live="polite">
        <AnimatePresence mode="wait">
          {winner ? (
            <motion.p
              key={winner.id}
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            >
              Empieza <b className="ruleta-winner" style={{ background: colorHex(winner.color), color: colorInk(winner.color) }}>
                {winner.name}
              </b>
              <span className="muted"> · luego se sigue hacia su izquierda</span>
            </motion.p>
          ) : (
            <motion.p key="wait" className="muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {spinning ? 'Girando…' : 'Que decida la suerte.'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <button type="button" className="btn-primary" disabled={spinning} onClick={spin}>
        {winner ? 'Girar otra vez' : 'Girar la ruleta'}
      </button>
    </div>
  );
}
