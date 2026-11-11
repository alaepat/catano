// Rueda de modos: los modos en círculo; se gira con el dedo (con impulso) o se toca uno para llevarlo arriba.
// El que queda arriba, junto a la marca, es el elegido. En el centro, un minitablero de ejemplo de ese modo.
import { AnimatePresence, animate, motion, useMotionValue, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import { FAVORITE_PRESETS, PRESETS, generateBoard, isPreset, type Board, type GenOptions } from '../game';
import { haptic } from '../lib/haptics';
import { playSound, unlockAudio } from '../lib/sound';
import type { ModeChoice } from '../store';
import { BoardSvg } from './BoardSvg';
import { Glyph } from './icons';

interface Props {
  modes: ModeChoice[];
  choice: ModeChoice;
  options: GenOptions;
  labels: Record<string, string>;
  sound: boolean;
  onSelect: (mode: ModeChoice) => void;
}

/** Ángulo (en grados) de -180 a 180. */
const wrap = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

export function ModeWheel({ modes, choice, options, labels, sound, onSelect }: Props) {
  const n = modes.length;
  const step = 360 / n;
  const indexOf = (m: ModeChoice) => modes.indexOf(m);
  const start = Math.max(0, indexOf(choice));
  const rotation = useMotionValue(-start * step);
  // Índice que está arriba ahora mismo (lo actualiza el giro).
  const current = useRef(indexOf(choice));
  const wheel = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  const props = useRef({ onSelect, sound, modes });
  useEffect(() => {
    props.current = { onSelect, sound, modes };
  });

  // Al girar, el modo de arriba pasa a ser el elegido (con un "toc" si hay sonido).
  useEffect(
    () =>
      rotation.on('change', (r) => {
        const { modes: list, onSelect: select, sound: withSound } = props.current;
        const idx = ((Math.round(-r / step) % list.length) + list.length) % list.length;
        if (idx === current.current) return;
        current.current = idx;
        select(list[idx]);
        if (withSound) playSound('tock', 1 + (idx % 3) * 0.06);
        haptic(6);
      }),
    [rotation, step],
  );

  // Si el modo cambia desde fuera (por ejemplo, al tocar opciones avanzadas), la rueda va hasta él.
  useEffect(() => {
    const idx = indexOf(choice);
    if (idx < 0 || idx === current.current) return;
    current.current = idx;
    const r = rotation.get();
    animate(rotation, r + wrap(-idx * step - r), { type: 'spring', stiffness: 170, damping: 24 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice]);

  const snapTo = (target: number) => {
    const snapped = Math.round(target / step) * step;
    animate(rotation, snapped, { type: 'spring', stiffness: 170, damping: 24 });
  };

  const goTo = (idx: number) => {
    const r = rotation.get();
    snapTo(r + wrap(-idx * step - r));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const el = wheel.current;
    if (!el) return;
    if (sound) unlockAudio();
    const box = el.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const angle = (x: number, y: number) => (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
    let last = angle(e.clientX, e.clientY);
    let lastTime = performance.now();
    let velocity = 0; // grados por milisegundo
    const sx = e.clientX;
    const sy = e.clientY;
    dragged.current = false;
    rotation.stop();

    const move = (ev: PointerEvent) => {
      if (!dragged.current && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      dragged.current = true;
      const a = angle(ev.clientX, ev.clientY);
      const d = wrap(a - last);
      const now = performance.now();
      velocity = velocity * 0.6 + (d / Math.max(now - lastTime, 1)) * 0.4;
      last = a;
      lastTime = now;
      rotation.set(rotation.get() + d);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!dragged.current) return;
      // Con impulso: sigue girando un poco según la velocidad del dedo y encaja en un modo.
      const fresh = performance.now() - lastTime < 80 ? velocity : 0;
      snapTo(rotation.get() + Math.max(-540, Math.min(540, fresh * 320)));
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const idx = Math.max(0, current.current);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo((idx + 1) % n);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goTo((idx - 1 + n) % n);
    else return;
    e.preventDefault();
  };

  const active = indexOf(choice);

  return (
    <div className="wheel-wrap">
      <span className="wheel-marker" aria-hidden />
      <div
        ref={wheel}
        className="wheel"
        role="radiogroup"
        aria-label="Modo de generación"
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
      >
        <div className="wheel-ring" aria-hidden />
        {modes.map((m, i) => (
          <WheelItem
            key={m}
            mode={m}
            index={i}
            step={step}
            rotation={rotation}
            active={i === active}
            label={labels[m]}
            onTap={() => {
              if (!dragged.current) goTo(i);
            }}
          />
        ))}
        <div className="wheel-center">
          <AnimatePresence initial={false}>
            <motion.div
              key={choice}
              className="wheel-preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <ModePreview mode={choice} options={options} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function WheelItem({
  mode, index, step, rotation, active, label, onTap,
}: { mode: ModeChoice; index: number; step: number; rotation: MotionValue<number>; active: boolean; label: string; onTap: () => void }) {
  // Cada modo va en su sitio del círculo, pero el icono se queda siempre derecho.
  const angle = useTransform(rotation, (r) => r + index * step);
  const upright = useTransform(angle, (a) => -a);
  return (
    <motion.div className="wheel-slot" style={{ rotate: angle }}>
      <motion.button
        type="button"
        role="radio"
        aria-checked={active}
        aria-label={label}
        tabIndex={active ? 0 : -1}
        className={['wheel-item', active && 'active', isPreset(mode) && FAVORITE_PRESETS.includes(mode) && 'fav'].filter(Boolean).join(' ')}
        style={{ rotate: upright }}
        animate={{ scale: active ? 1.18 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        onClick={onTap}
      >
        <Glyph name={mode} size={24} />
        {isPreset(mode) && FAVORITE_PRESETS.includes(mode) && (
          <span className="wheel-fav" aria-hidden>
            ★
          </span>
        )}
      </motion.button>
    </motion.div>
  );
}

// Semillas fijas: cada modo enseña siempre el mismo ejemplo.
const previews = new Map<string, Board | null>();

function previewBoard(mode: ModeChoice, options: GenOptions): Board | null {
  if (mode === 'sorpresa') return null;
  const opts = mode === 'personalizado' ? options : PRESETS[mode];
  const key = mode === 'personalizado' ? JSON.stringify(options) : mode;
  if (!previews.has(key)) {
    const result = generateBoard(opts, 1234);
    previews.set(key, result.ok ? result.board : null);
  }
  return previews.get(key) ?? null;
}

function ModePreview({ mode, options }: { mode: ModeChoice; options: GenOptions }) {
  const board = useMemo(() => previewBoard(mode, options), [mode, options]);
  if (!board) return <Glyph name={mode === 'personalizado' ? 'personalizado' : 'sorpresa'} size={64} className="wheel-preview-icon" />;
  return <BoardSvg board={board} showPips={false} />;
}
