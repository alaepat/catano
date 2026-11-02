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
    </motion.div>
  );
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
