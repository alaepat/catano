// Piezas de interfaz reutilizables, con el estilo minimalista de la app.
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useState, type ReactNode } from 'react';

/** Grupo de opciones en forma de chips; solo una activa. */
export function Chips<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={disabled ? 'field disabled' : 'field'}>
      <span className="field-label" id={id}>
        {label}
      </span>
      <div className="chips" role="radiogroup" aria-labelledby={id}>
        {options.map(([v, text]) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={value === v}
            disabled={disabled}
            className={value === v ? 'chip active' : 'chip'}
            onClick={() => onChange(v)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Interruptor de encendido/apagado. */
export function Switch({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={disabled ? 'switch-row disabled' : 'switch-row'}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-text">
        <span>{label}</span>
        {hint && <span className="switch-hint">{hint}</span>}
      </span>
      <span className={checked ? 'switch on' : 'switch'} aria-hidden>
        <motion.span className="switch-knob" layout transition={{ type: 'spring', stiffness: 600, damping: 35 }} />
      </span>
    </button>
  );
}

/** Botón redondo con icono (atrás, ajustes...). */
export function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="icon-btn" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

/** Sección plegable con animación de altura. */
export function Collapsible({ title, icon, children, defaultOpen = false }: { title: string; icon: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="collapsible">
      <button type="button" className="collapsible-head" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <span className="collapsible-icon">{icon}</span>
        <span className="collapsible-title">{title}</span>
        <motion.span className="chevron" animate={{ rotate: open ? 90 : 0 }} aria-hidden>
          ›
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            className="collapsible-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="collapsible-inner">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** Aviso flotante que desaparece solo. */
export function Toast({ messages, onDone }: { messages: string[]; onDone: () => void }) {
  useEffect(() => {
    if (!messages.length) return;
    const t = setTimeout(onDone, 4200);
    return () => clearTimeout(t);
  }, [messages, onDone]);

  return (
    <div className="toast-wrap" aria-live="polite">
      <AnimatePresence>
        {messages.length > 0 && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onClick={onDone}
          >
            {messages.map((m) => (
              <p key={m}>{m}</p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Flecha "atrás" dibujada (más fina que un carácter). */
export function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      {/* Engranaje de 8 dientes y círculo, los dos centrados en (12, 12). */}
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M9.96 4.89 L10.17 2.58 L13.83 2.58 L14.04 4.89 L15.59 5.53 L17.37 4.04 L19.96 6.63 L18.47 8.41 L19.11 9.96 L21.42 10.17 L21.42 13.83 L19.11 14.04 L18.47 15.59 L19.96 17.37 L17.37 19.96 L15.59 18.47 L14.04 19.11 L13.83 21.42 L10.17 21.42 L9.96 19.11 L8.41 18.47 L6.63 19.96 L4.04 17.37 L5.53 15.59 L4.89 14.04 L2.58 13.83 L2.58 10.17 L4.89 9.96 L5.53 8.41 L4.04 6.63 L6.63 4.04 L8.41 5.53 Z" />
        <circle cx="12" cy="12" r="3.1" />
      </g>
    </svg>
  );
}
