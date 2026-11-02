// Fondos pintados (Parque y Mesa de noche): la ilustración es una imagen fija (se dibuja una sola vez,
// así no gasta batería) y encima va una capa ligera con lo que se mueve. La capa usa el mismo tamaño
// que la imagen (852 × 1846) y el mismo encuadre, así lo animado cae justo en su sitio.
import type { ReactNode } from 'react';

const W = 852;
const H = 1846;

function Painted({ src, children }: { src: string; children?: ReactNode }) {
  return (
    <>
      <img className="painted" src={`${import.meta.env.BASE_URL}fondos/${src}`} alt="" decoding="async" draggable={false} />
      {children && (
        <svg className="painted-live" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          {children}
        </svg>
      )}
    </>
  );
}

/** Semillas que el viento arrastra por el prado: [altura, retraso en s, duración en s, tamaño]. */
const SEEDS = [
  [1150, 0, 9, 1.4],
  [1260, 2.5, 11, 1.1],
  [1380, 5, 8, 1.6],
  [1210, 7, 12, 1],
  [1480, 1.5, 10, 1.3],
  [1330, 9, 9.5, 1.2],
  [1560, 4, 11.5, 1.5],
];

/** Parque al atardecer: el sol palpita, unos pájaros cruzan el cielo y el viento arrastra semillas. */
export function Park() {
  return (
    <Painted src="parque.webp">
      <defs>
        <linearGradient id="park-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#140e2a" stopOpacity="0.5" />
          <stop offset="1" stopColor="#140e2a" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="park-sun">
          <stop offset="0" stopColor="#ffe3a0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Oscurece un poco el cielo de arriba para que el título se lea bien */}
      <rect width={W} height="900" fill="url(#park-top)" />
      <circle className="sun-glow" cx="122" cy="983" r="90" fill="url(#park-sun)" />
      <g className="birds">
        {[
          [0, 0, 1],
          [22, -9, 0.8],
          [42, 5, 0.9],
        ].map(([x, y, s], i) => (
          <path
            key={i}
            className="bird"
            d={`M${x - 7 * s} ${y} q${3.5 * s} ${-5 * s} ${7 * s} 0 q${3.5 * s} ${-5 * s} ${7 * s} 0`}
            style={{ animationDelay: `${i * 0.35}s` }}
          />
        ))}
      </g>
      {SEEDS.map(([y, delay, dur, r], i) => (
        <g key={i} transform={`translate(0 ${y})`}>
          <circle className="seed" r={r} style={{ animationDelay: `${delay}s`, animationDuration: `${dur}s` }} />
        </g>
      ))}
    </Painted>
  );
}

/** Mesa de noche: la lámpara respira, las polillas revolotean, las luces del pueblo titilan y a veces cruza una estrella fugaz. */
export function NightTable() {
  return (
    <Painted src="mesa-noche.webp">
      <defs>
        <radialGradient id="lamp-glow">
          <stop offset="0" stopColor="#e4f1ff" stopOpacity="1" />
          <stop offset="1" stopColor="#e4f1ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="shooting" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <circle className="lamp-breath" cx="410" cy="1032" r="120" fill="url(#lamp-glow)" />
      {[0, 1, 2].map((i) => (
        <g key={i} className={`moth moth-${i}`}>
          <path d="M-2.5 0 q-4 -4 -6.5 0 q3 3 6.5 0 M2.5 0 q4 -4 6.5 0 q-3 3 -6.5 0" />
        </g>
      ))}
      {[
        [697, 1019],
        [772, 1019],
        [819, 1021],
        [658, 1023],
        [737, 1018],
      ].map(([x, y], i) => (
        <circle key={i} className="town-light" cx={x} cy={y} r="5" style={{ animationDelay: `${i * 1.3}s` }} />
      ))}
      <g transform="translate(640 210) rotate(152)">
        <rect className="shooting-star" x="0" y="-0.8" width="120" height="1.6" rx="0.8" fill="url(#shooting)" />
      </g>
    </Painted>
  );
}
