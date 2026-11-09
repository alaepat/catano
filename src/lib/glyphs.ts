// Trazos de los iconos propios (cuadrícula de 24 × 24, solo líneas, sin relleno).
// El mismo dibujo sirve para la pantalla (SVG), el tablero 2D y las etiquetas del 3D (canvas, con Path2D).
// Los nombres de los modos coinciden con sus ids, para poder usar <Glyph name={modo} />.

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;

export const GLYPHS = {
  // Recursos y terrenos
  madera: 'M12 3 6.5 11h3L6 16h12l-3.5-5h3L12 3Z M12 16v5',
  lana: 'M5 12.5C5 10 7.2 8 11 8s6 2 6 4.5-2.2 4-6 4-6-1.5-6-4Z M17 10.5h1.2a2 2 0 0 1 0 4H17 M8 16.3V20 M14 16.3V20',
  trigo:
    'M12 21V4 M12 9c-2 0-3-1.2-3-3 2 0 3 1.2 3 3Z M12 9c2 0 3-1.2 3-3-2 0-3 1.2-3 3Z M12 13c-2 0-3-1.2-3-3 2 0 3 1.2 3 3Z M12 13c2 0 3-1.2 3-3-2 0-3 1.2-3 3Z M12 17c-2 0-3-1.2-3-3 2 0 3 1.2 3 3Z M12 17c2 0 3-1.2 3-3-2 0-3 1.2-3 3Z',
  arcilla: 'M4.5 6.5h15v11h-15Z M4.5 10.2h15 M4.5 13.8h15 M10 6.5v3.7 M14.5 10.2v3.6 M9 13.8v3.7',
  mineral: 'M2.5 19 9.5 7l3.6 6.2L15.5 10l6 9H2.5Z M7.6 10.3 9.5 7l1.9 3.3',
  desierto: `M3 16.5c3-3 6-3 9 0s6 3 9 0 M3 20h18 ${circle(16, 8, 2.5)}`,

  // Modos
  oficial: 'M7 3.5h7l4 4v13H7Z M14 3.5v4h4 M9.5 12h6 M9.5 15.5h6',
  equilibrado: 'M12 4v16 M8 20h8 M5 7h14 M5 7l-3 6a3 3 0 0 0 6 0L5 7Z M19 7l-3 6a3 3 0 0 0 6 0l-3-6Z',
  competitivo: 'M8 4h8v5a4 4 0 0 1-8 0V4Z M8 6H5a3 3 0 0 0 3 4 M16 6h3a3 3 0 0 1-3 4 M12 13v4 M9 20h6 M10 17h4v3h-4Z',
  tranquila: 'M5 10h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5v-4Z M16 11h1.5a2.5 2.5 0 0 1 0 5h-2 M8.5 4.5c0 1 1 1.5 1 2.5 M12 4.5c0 1 1 1.5 1 2.5',
  escasez: 'M4 6l6 6 3.5-3.5L20 15 M20 10v5h-5',
  continentes: 'M4 6.5 9 4.5l6 2 5-2v13l-5 2-6-2-5 2v-13Z M9 4.5v13 M15 6.5v13',
  centro: `${circle(12, 12, 9)} ${circle(12, 12, 4.5)} ${circle(12, 12, 0.6)}`,
  mercaderes: `${circle(12, 6, 2)} M12 8v12 M8 11h8 M5 14a7 7 0 0 0 14 0 M5 14l-1.5 1.5 M19 14l1.5 1.5`,
  caos: 'M3.5 5h17 M5.5 9h12 M8 13h9 M9.5 17h5 M11 20.5h2',
  sorpresa: `M6 4.5h12A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5Z ${circle(8.6, 8.6, 0.7)} ${circle(15.4, 8.6, 0.7)} ${circle(12, 12, 0.7)} ${circle(8.6, 15.4, 0.7)} ${circle(15.4, 15.4, 0.7)}`,
  personalizado: `M4 7h9 M17 7h3 M4 17h3 M11 17h9 ${circle(15, 7, 2)} ${circle(9, 17, 2)}`,

  // Interfaz
  'nuevo-mundo': 'M3 15.5h18l-2.6 4.5H5.6L3 15.5Z M12 15.5V3.5 M12 4.5l6.5 9H12 M12 6.5 7 13.5h5',
  ola: 'M3 9.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0 M3 14.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0',
  idea: 'M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z',
  analisis: 'M5 20V11 M12 20V5 M19 20v-6',
  isla: 'M4 19c2-1.5 5-2 8-2s6 .5 8 2 M12 17c0-4 1-7 2-9 M14 8c-1.5-2-4-2.5-6-1 M14 8c1-2 3.5-3 6-2 M14 8c0 2 1 3.5 3 4',
  ladron: 'M12 3c-3 0-5 3-5 6v2c0 1.5-1 3-2 4l1 6h12l1-6c-1-1-2-2.5-2-4V9c0-3-2-6-5-6Z M9.5 11h5',
  estrella: 'm12 3.5 2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z',
  camara: `M4 8.5A1.5 1.5 0 0 1 5.5 7h2L9 5h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z ${circle(12, 13, 3)}`,
  lapiz: 'M4 20h4L19 9l-4-4L4 16v4Z M13.5 6.5l4 4',
  papelera: 'M4 7h16 M9 7V4.5h6V7 M6 7l1 13h10l1-13 M10 11v5 M14 11v5',
  medalla: `M8 2.5 10.6 9.2 M16 2.5 13.4 9.2 M8 2.5h8 ${circle(12, 15, 5.8)} ${circle(12, 15, 2.6)}`,
} as const;

export type GlyphName = keyof typeof GLYPHS;

/** Dibuja un icono en un canvas: centrado en (x, y) y de `size` píxeles de lado. */
export function strokeGlyph(ctx: CanvasRenderingContext2D, name: GlyphName, x: number, y: number, size: number, color: string, weight = 1.9) {
  const k = size / 24;
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(k, k);
  ctx.lineWidth = weight;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.stroke(new Path2D(GLYPHS[name]));
  ctx.restore();
}
