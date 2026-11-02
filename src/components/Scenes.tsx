// Escenas ilustradas de los fondos Playa y Canoa (SVG plano, animaciones suaves con CSS).
// Van abajo de la pantalla, para que el centro quede libre para el tablero.

/** Playa al atardecer: sol bajo, mar con brillos, orilla con espuma y palmeras. */
export function Beach() {
  return (
    <svg className="scene scene-beach" viewBox="0 0 400 420" preserveAspectRatio="xMidYMax slice">
      <circle cx="200" cy="176" r="50" fill="#ffd79a" opacity="0.95" />
      <circle cx="200" cy="176" r="86" fill="#ffc37a" opacity="0.16" />
      {/* Mar */}
      <rect x="0" y="170" width="400" height="140" fill="#3a6f8f" />
      <rect x="0" y="170" width="400" height="40" fill="#5a8fa8" opacity="0.5" />
      <g className="sun-glints" fill="#ffe2b0">
        <rect x="170" y="182" width="60" height="2.5" rx="1.2" />
        <rect x="160" y="196" width="80" height="2.5" rx="1.2" opacity="0.8" />
        <rect x="150" y="212" width="100" height="3" rx="1.5" opacity="0.6" />
        <rect x="136" y="232" width="128" height="3" rx="1.5" opacity="0.4" />
      </g>
      {/* Orilla: la espuma va y viene */}
      <g className="shore">
        <path d="M-40 300 Q20 284 80 296 T200 292 T320 298 T440 290 V330 H-40 Z" fill="#cfe7ea" opacity="0.7" />
      </g>
      <path d="M0 304 Q60 292 130 300 T260 298 T400 302 V420 H0 Z" fill="#e8c792" />
      <path d="M0 340 Q100 326 200 336 T400 332 V420 H0 Z" fill="#dcb47a" />
      {/* Palmeras */}
      <Palm x={34} y={360} scale={1.15} flip={false} />
      <Palm x={372} y={380} scale={0.9} flip />
    </svg>
  );
}

function Palm({ x, y, scale, flip }: { x: number; y: number; scale: number; flip: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`} className="palm" fill="#2b2a3a">
      <path d="M-4 0 C0 -60 10 -120 28 -170 L33 -168 C18 -118 8 -60 4 0 Z" />
      <g transform="translate(30 -170)">
        <path d="M0 0 C-30 -18 -62 -8 -78 18 C-52 0 -28 -2 0 4 Z" />
        <path d="M0 0 C-20 -34 -48 -42 -70 -30 C-44 -28 -20 -16 0 2 Z" />
        <path d="M0 0 C14 -36 44 -46 70 -34 C44 -26 22 -14 2 2 Z" />
        <path d="M0 0 C34 -14 66 -2 80 26 C56 6 30 2 0 4 Z" />
        <path d="M0 0 C6 -30 2 -56 -12 -70 C4 -48 4 -26 -2 2 Z" />
      </g>
    </g>
  );
}

/** Canoa que lidera los mares: se mece sobre olas que pasan, al amanecer. */
export function Canoe() {
  const wave = 'M0 40 Q90 18 180 40 T360 40 T540 40 T720 40 V120 H0 Z';
  return (
    <div className="scene scene-canoe">
      <div className="canoe-sea">
        <div className="canoe-wave canoe-wave-back">
          <svg viewBox="0 0 720 120" preserveAspectRatio="none">
            <path d={wave} />
          </svg>
        </div>
        <svg className="canoe" viewBox="-80 -70 160 90">
          {/* Remero */}
          <circle cx="8" cy="-46" r="6" fill="#1b2433" />
          <path d="M2 -40 Q8 -42 14 -40 L16 -14 H0 Z" fill="#1b2433" />
          <path d="M-14 -50 L34 4" stroke="#1b2433" strokeWidth="2.5" strokeLinecap="round" className="paddle" />
          {/* Canoa */}
          <path d="M-72 -14 Q-60 4 0 6 Q60 4 72 -14 Q60 -8 0 -8 Q-60 -8 -72 -14 Z" fill="#7a4a2a" />
          <path d="M-70 -14 Q-60 -8 0 -8 Q60 -8 70 -14" fill="none" stroke="#c8935a" strokeWidth="1.6" />
          <path d="M-72 -14 L-80 -22 M72 -14 L80 -22" stroke="#7a4a2a" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <div className="canoe-wave canoe-wave-front">
          <svg viewBox="0 0 720 120" preserveAspectRatio="none">
            <path d={wave} />
          </svg>
        </div>
      </div>
    </div>
  );
}
