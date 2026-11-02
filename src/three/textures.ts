// Texturas dibujadas con canvas 2D: caras de las fichas, etiquetas de puertos y brillos.
// Se dibujan en el móvil (sin descargar nada), así funcionan sin internet.
import { CanvasTexture, SRGBColorSpace } from 'three';
import { strokeGlyph } from '../lib/glyphs';
import { isRed, pips, type PortType } from '../game';

const cache = new Map<string, CanvasTexture>();

function draw(key: string, size: number, paint: (ctx: CanvasRenderingContext2D, s: number) => void): CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  paint(ctx, size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

const TINTA = '#1e1b18';
const ROJO = '#c8402f';

/** Cara de una ficha de número. `fontsVersion` cambia cuando terminan de cargar las tipografías. */
export function tokenTexture(n: number, showPips: boolean, fontsVersion: number): CanvasTexture {
  return draw(`token-${n}-${showPips}-${fontsVersion}`, 256, (ctx, s) => {
    const c = s / 2;
    const face = ctx.createRadialGradient(c, c * 0.8, 10, c, c, c);
    face.addColorStop(0, '#fffaf0');
    face.addColorStop(1, '#efe0c0');
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(c, c, c, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,27,24,0.16)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(c, c, c * 0.86, 0, Math.PI * 2);
    ctx.stroke();

    const red = isRed(n);
    ctx.fillStyle = red ? ROJO : TINTA;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `700 ${red ? 120 : 106}px Fraunces, Georgia, serif`;
    ctx.fillText(String(n), c, showPips ? 152 : 166);
    if (showPips) {
      const count = pips(n);
      const gap = 23;
      for (let i = 0; i < count; i++) {
        ctx.beginPath();
        ctx.arc(c - ((count - 1) * gap) / 2 + i * gap, 194, 8.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}


/** Etiqueta redonda que flota sobre cada barco: recurso y cambio (2:1 o 3:1). */
export function portTexture(type: PortType, fontsVersion: number): CanvasTexture {
  return draw(`port-${type}-${fontsVersion}`, 256, (ctx, s) => {
    const c = s / 2;
    ctx.fillStyle = 'rgba(30,27,24,0.35)';
    ctx.beginPath();
    ctx.arc(c, c + 6, c - 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff8ec';
    ctx.beginPath();
    ctx.arc(c, c, c - 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (type === 'generico') {
      ctx.fillStyle = TINTA;
      ctx.font = '700 96px Fraunces, Georgia, serif';
      ctx.fillText('?', c, 104);
    } else {
      strokeGlyph(ctx, type, c, 100, 92, TINTA, 2);
    }
    ctx.fillStyle = TINTA;
    ctx.font = '800 54px Nunito, system-ui, sans-serif';
    ctx.fillText(type === 'generico' ? '3:1' : '2:1', c, 186);
  });
}

/** Brillo redondo blanco que se difumina hacia fuera (se tiñe con el color del material). */
export function glowTexture(): CanvasTexture {
  return draw('glow', 128, (ctx, s) => {
    const c = s / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

/** Punto redondo y nítido para las estrellas. */
export function dotTexture(): CanvasTexture {
  return draw('dot', 64, (ctx, s) => {
    const c = s / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

/**
 * Aura alrededor del mar, como la atmósfera de un planeta: transparente dentro,
 * más intensa justo en la orilla (en `edge`, de 0 a 1) y se apaga hacia fuera.
 */
export function auraTexture(edge: number): CanvasTexture {
  return draw(`aura-${edge.toFixed(3)}`, 512, (ctx, s) => {
    const c = s / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, 'rgba(255,233,196,0)');
    g.addColorStop(Math.max(0, edge - 0.08), 'rgba(255,233,196,0)');
    g.addColorStop(edge, 'rgba(255,236,205,0.95)');
    g.addColorStop(Math.min(1, edge + 0.08), 'rgba(140,190,255,0.45)');
    g.addColorStop(Math.min(1, edge + 0.25), 'rgba(110,150,255,0.12)');
    g.addColorStop(1, 'rgba(90,120,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}
