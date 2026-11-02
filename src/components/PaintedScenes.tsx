// Fondos pintados (Parque y Mesa de noche): la ilustración es una imagen SVG fija (se dibuja una sola vez,
// así no gasta batería) y encima va una capa ligera con lo que se mueve. Las dos usan el mismo lienzo
// (1080 × 1920) y el mismo encuadre, así lo animado cae justo en su sitio.
import type { ReactNode } from 'react';

const VIEW = '0 0 1080 1920';

function Painted({ src, children }: { src: string; children?: ReactNode }) {
  return (
    <>
      <img className="painted" src={`${import.meta.env.BASE_URL}fondos/${src}`} alt="" decoding="async" draggable={false} />
      {children && (
        <svg className="painted-live" viewBox={VIEW} preserveAspectRatio="xMidYMax slice">
          {children}
        </svg>
      )}
    </>
  );
}

/** Parque al atardecer: unos pájaros cruzan el cielo muy despacio. */
export function Park() {
  return (
    <Painted src="parque.svg">
      <g className="birds">
        {[
          [0, 0, 1],
          [26, -10, 0.8],
          [50, 6, 0.9],
        ].map(([x, y, s], i) => (
          <path
            key={i}
            className="bird"
            d={`M${x - 8 * s} ${y} q${4 * s} ${-6 * s} ${8 * s} 0 q${4 * s} ${-6 * s} ${8 * s} 0`}
            style={{ animationDelay: `${i * 0.35}s` }}
          />
        ))}
      </g>
    </Painted>
  );
}

/** Mesa de noche: la lámpara respira, las polillas revolotean y las luces del pueblo titilan. */
export function NightTable() {
  return (
    <Painted src="mesa-noche.svg">
      <circle className="lamp-breath" cx="560" cy="1206" r="150" />
      {[0, 1, 2].map((i) => (
        <g key={i} className={`moth moth-${i}`}>
          <path d="M-3 0 q-5 -5 -8 0 q4 4 8 0 M3 0 q5 -5 8 0 q-4 4 -8 0" />
        </g>
      ))}
      {[
        [832, 1192],
        [918, 1176],
        [1008, 1168],
        [868, 1186],
      ].map(([x, y], i) => (
        <circle key={i} className="town-light" cx={x} cy={y} r="6" style={{ animationDelay: `${i * 1.3}s` }} />
      ))}
    </Painted>
  );
}
