// Fondos intercambiables (PLAN_CATAN.md, sección 3). Todos ocupan la pantalla entera, detrás de todo.
import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import type { BackgroundId } from '../store';

export function Background({ id }: { id: BackgroundId }) {
  return (
    <motion.div
      key={id}
      className={`bg bg-${id}`}
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
    >
      {id === 'espacio' && <Stars />}
      {id === 'oceano' && <Waves />}
      {id === 'pergamino' && <Compass />}
      {id === 'bosque' && (
        <>
          <Trees />
          <Fireflies />
        </>
      )}
    </motion.div>
  );
}

/** Tres capas de olas que se desplazan despacio (el dibujo se repite, así el bucle no se nota). */
function Waves() {
  const wave = 'M0 60 Q180 22 360 60 T720 60 T1080 60 T1440 60 V140 H0 Z';
  return (
    <div className="waves">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`wave wave-${i}`}>
          <svg viewBox="0 0 1440 140" preserveAspectRatio="none">
            <path d={wave} />
          </svg>
        </div>
      ))}
    </div>
  );
}

/** Rosa de los vientos muy tenue, como en los mapas antiguos. */
function Compass() {
  return (
    <svg className="compass" viewBox="-50 -50 100 100">
      <circle r="44" fill="none" stroke="currentColor" strokeWidth="0.6" />
      <circle r="38" fill="none" stroke="currentColor" strokeWidth="0.3" strokeDasharray="1 2" />
      <path d="M0 -46 L5 0 L0 46 L-5 0 Z" fill="currentColor" />
      <path d="M-46 0 L0 5 L46 0 L0 -5 Z" fill="currentColor" opacity="0.7" />
      <path d="M-24 -24 L3 -3 L24 24 L-3 3 Z" fill="currentColor" opacity="0.4" />
      <path d="M24 -24 L3 3 L-24 24 L-3 -3 Z" fill="currentColor" opacity="0.4" />
      <text y="-30" textAnchor="middle" fontSize="9" fill="currentColor" fontFamily="Georgia, serif">
        N
      </text>
    </svg>
  );
}

/** Siluetas de pinos en dos capas. */
function Trees() {
  const row = (seed: number, base: number, height: number) => {
    let d = '';
    for (let x = -20, i = 0; x < 420; i++) {
      const w = 18 + ((i * 37 + seed) % 17);
      const h = height * (0.6 + ((i * 53 + seed) % 40) / 100);
      d += `M${x} ${base} L${x + w / 2} ${base - h} L${x + w} ${base} Z `;
      x += w * 0.7;
    }
    return `${d}M-20 ${base} H420 V200 H-20 Z`;
  };
  return (
    <svg className="trees" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice">
      <path d={row(11, 170, 90)} fill="#0b1a17" />
      <path d={row(5, 190, 70)} fill="#050d0b" />
    </svg>
  );
}

/** Luciérnagas: puntos cálidos que flotan y se encienden y apagan. */
function Fireflies() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let frame = 0;
    const flies = Array.from({ length: 28 }, () => ({
      x: Math.random(),
      y: 0.45 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.7,
      r: 1.2 + Math.random() * 1.6,
    }));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const s = t / 1000;
      for (const f of flies) {
        const x = (f.x + (reduce ? 0 : Math.sin(s * 0.2 * f.speed + f.phase) * 0.04)) * w;
        const y = (f.y + (reduce ? 0 : Math.cos(s * 0.15 * f.speed + f.phase) * 0.03)) * h;
        const glow = reduce ? 0.6 : Math.max(0, Math.sin(s * f.speed + f.phase));
        const g = ctx.createRadialGradient(x, y, 0, x, y, f.r * 6);
        g.addColorStop(0, `rgba(255, 226, 140, ${0.9 * glow})`);
        g.addColorStop(1, 'rgba(255, 226, 140, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, f.r * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce) frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="stars" />;
}

interface Star {
  x: number;
  y: number;
  r: number;
  depth: number;
  phase: number;
}

/** Campo de estrellas que parpadean y se desplazan muy despacio (tres profundidades). */
function Stars() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let stars: Star[] = [];
    let w = 0;
    let h = 0;
    let frame = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((w * h) / 4500);
      stars = Array.from({ length: count }, () => {
        const depth = Math.random();
        return { x: Math.random() * w, y: Math.random() * h, r: 0.3 + depth * 1.1, depth, phase: Math.random() * Math.PI * 2 };
      });
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const drift = reduce ? 0 : (t / 1000) * (2 + s.depth * 6);
        const y = (s.y + drift) % h;
        const twinkle = reduce ? 0.8 : 0.55 + 0.45 * Math.sin(t / 900 + s.phase);
        ctx.globalAlpha = twinkle * (0.35 + s.depth * 0.65);
        ctx.fillStyle = '#fff8ec';
        ctx.beginPath();
        ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce) frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="stars" />;
}
