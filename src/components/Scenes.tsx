// Escenas ilustradas de los fondos Playa, Canoa y Camping (SVG plano, animaciones suaves con CSS).
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

const PLAYER_SHIRTS = ['#d0453b', '#3a6fd0', '#f2eee4', '#ec8a2e'];

/**
 * Camping de noche: el Volkswagen Polo blanco con el maletero abierto e iluminado (con el tablero dentro)
 * y los cuatro jugadores en sillas de playa, bajo una guirnalda de bombillas.
 */
export function Camping() {
  return (
    <svg className="scene scene-camping" viewBox="0 70 400 230" preserveAspectRatio="xMidYMax meet">
      {/* Pinos al fondo */}
      <path
        d="M-10 230 L10 150 L30 230 Z M18 230 L42 130 L66 230 Z M54 230 L74 168 L94 230 Z M300 230 L322 140 L344 230 Z M334 230 L356 120 L378 230 Z M366 230 L388 160 L410 230 Z"
        fill="#0c1a22"
      />
      {/* Guirnalda de bombillas */}
      <path d="M0 96 Q100 140 200 112 T400 100" fill="none" stroke="#2a2a38" strokeWidth="1.2" />
      <g className="bulbs" fill="#ffd27a">
        {[
          [20, 106], [52, 118], [86, 125], [120, 126], [154, 121], [188, 114], [222, 108], [256, 104], [290, 103], [324, 104], [358, 104], [390, 101],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y + 4} r="2.6" style={{ animationDelay: `${(i * 0.37) % 2.2}s` }} />
        ))}
      </g>
      {/* Hierba */}
      <path d="M0 228 Q100 220 200 226 T400 224 V300 H0 Z" fill="#12261c" />
      {/* Luz cálida del maletero sobre la hierba */}
      <ellipse cx="200" cy="262" rx="150" ry="34" fill="#ffcf85" opacity="0.14" className="trunk-glow" />

      {/* Volkswagen Polo blanco, visto desde atrás con el portón abierto */}
      <g>
        <rect x="124" y="252" width="26" height="22" rx="4" fill="#15151a" />
        <rect x="250" y="252" width="26" height="22" rx="4" fill="#15151a" />
        {/* Portón levantado */}
        <path d="M140 150 L260 150 L252 102 L148 102 Z" fill="#f4f4f0" />
        <path d="M150 144 L250 144 L245 110 L155 110 Z" fill="#26313d" />
        <circle cx="200" cy="148" r="5.5" fill="none" stroke="#9aa3ad" strokeWidth="1.4" />
        <path d="M197 145.5 L199 150 L200 147.5 L201 150 L203 145.5" fill="none" stroke="#9aa3ad" strokeWidth="1" strokeLinejoin="round" />
        {/* Techo y pilares */}
        <rect x="134" y="150" width="132" height="8" rx="3" fill="#ecece6" />
        <path d="M116 224 L134 154 L148 154 L142 224 Z" fill="#f4f4f0" />
        <path d="M284 224 L266 154 L252 154 L258 224 Z" fill="#f4f4f0" />
        {/* Maletero iluminado con el tablero dentro */}
        <rect x="142" y="158" width="116" height="66" fill="#5a3b22" />
        <rect x="142" y="158" width="116" height="66" fill="url(#trunkLight)" />
        <g transform="translate(200 196)">
          <path d="M0 -22 L19 -11 L19 11 L0 22 L-19 11 L-19 -11 Z" fill="#2c5f86" />
          <path d="M0 -14 L12 -7 L12 7 L0 14 L-12 7 L-12 -7 Z" fill="#e3b94c" />
          <path d="M0 -14 L12 -7 L0 0 Z" fill="#2f5d3a" />
          <path d="M-12 7 L0 14 L0 0 Z" fill="#c0623b" />
          <path d="M12 7 L0 0 L12 -7 Z" fill="#8dbf5a" />
          <path d="M-12 -7 L0 -14 L0 0 L-12 7 Z" fill="#8a8d91" opacity="0.9" />
        </g>
        {/* Parte de abajo: pilotos, matrícula y parachoques */}
        <path d="M112 226 Q112 218 120 218 H280 Q288 218 288 226 V258 Q288 264 282 264 H118 Q112 264 112 258 Z" fill="#f4f4f0" />
        <rect x="114" y="222" width="44" height="10" rx="4" fill="#c8352e" />
        <rect x="242" y="222" width="44" height="10" rx="4" fill="#c8352e" />
        <rect x="178" y="238" width="44" height="12" rx="2" fill="#fbfbf7" stroke="#b9bcc2" strokeWidth="1" />
        <rect x="112" y="256" width="176" height="8" rx="3" fill="#d9dad6" />
      </g>

      {/* Los cuatro jugadores en sillas de playa */}
      <Player x={46} shirt={PLAYER_SHIRTS[0]} />
      <Player x={92} shirt={PLAYER_SHIRTS[1]} />
      <Player x={308} shirt={PLAYER_SHIRTS[2]} />
      <Player x={354} shirt={PLAYER_SHIRTS[3]} />

      <defs>
        <linearGradient id="trunkLight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe3a8" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffb85c" stopOpacity="0.15" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Player({ x, shirt }: { x: number; shirt: string }) {
  return (
    <g transform={`translate(${x} 0)`}>
      {/* Silla */}
      <rect x="-15" y="214" width="30" height="38" rx="3" fill="#e9e2cf" />
      <rect x="-9" y="214" width="6" height="38" fill="#4a7fb0" />
      <rect x="3" y="214" width="6" height="38" fill="#4a7fb0" />
      <path d="M-14 252 L-18 272 M14 252 L18 272" stroke="#9aa3ad" strokeWidth="2.2" strokeLinecap="round" />
      {/* Persona */}
      <circle cx="0" cy="208" r="8" fill="#d6a57a" />
      <path d="M-8 205 Q0 194 8 205 Q4 200 0 201 Q-4 200 -8 205 Z" fill="#2a1d14" />
      <rect x="-10" y="217" width="20" height="26" rx="7" fill={shirt} />
      <rect x="-16" y="243" width="32" height="9" rx="3" fill="#cfc6b0" />
      <rect x="-9" y="250" width="7" height="20" rx="3" fill="#2b2b33" />
      <rect x="2" y="250" width="7" height="20" rx="3" fill="#2b2b33" />
    </g>
  );
}
