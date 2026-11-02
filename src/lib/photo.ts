// Foto del mapa para mandarla al grupo: el tablero sobre fondo espacial, con el nombre de la isla.
// En el iPhone se abre el menú de compartir (WhatsApp, Guardar imagen...); en otros sitios se descarga.

export interface PhotoInfo {
  name: string;
  subtitle: string;
  date: Date;
  /** Foto del 3D: no se recorta y los bordes se difuminan en círculo (el aura se funde con el fondo). */
  soft?: boolean;
}

const W = 1080;
const H = 1350;

/** Pasa el tablero 2D (SVG) a una imagen, resolviendo los colores var(--x) de la hoja de estilos. */
export async function capture2D(svg: SVGSVGElement, size = 1000): Promise<HTMLCanvasElement> {
  const css = getComputedStyle(document.documentElement);
  const source = new XMLSerializer()
    .serializeToString(svg)
    .replace(/var\((--[\w-]+)\)/g, (_, name: string) => css.getPropertyValue(name).trim() || '#000');
  const blob = new Blob([source.replace('<svg', `<svg width="${size}" height="${size}"`)], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    canvas.getContext('2d')!.drawImage(img, 0, 0, size, size);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Recorta los bordes transparentes (el lienzo 3D es más alto que la isla). */
function trim(source: HTMLCanvasElement): { x: number; y: number; w: number; h: number } {
  const ctx = source.getContext('2d');
  const full = { x: 0, y: 0, w: source.width, h: source.height };
  if (!ctx || !source.width || !source.height) return full;
  const { data, width, height } = ctx.getImageData(0, 0, source.width, source.height);
  let top = height;
  let bottom = -1;
  let left = width;
  let right = -1;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (data[(y * width + x) * 4 + 3] > 24) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (bottom < 0) return full;
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

/** Copia con los bordes difuminados en círculo. */
function fadeEdges(source: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(source, 0, 0);
  const r = Math.min(out.width, out.height) / 2;
  const mask = ctx.createRadialGradient(out.width / 2, out.height / 2, r * 0.84, out.width / 2, out.height / 2, r);
  mask.addColorStop(0, 'rgba(0,0,0,1)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, out.width, out.height);
  return out;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, family: string, max: number) {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px ${family}`;
    s -= 2;
  } while (ctx.measureText(text).width > max && s > 20);
}

export async function composePhoto(board: HTMLCanvasElement, info: PhotoInfo): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Fondo espacial con estrellas.
  const bg = ctx.createRadialGradient(W * 0.65, H * 0.25, 40, W * 0.5, H * 0.5, H * 0.8);
  bg.addColorStop(0, '#2b2350');
  bg.addColorStop(0.55, '#110f1f');
  bg.addColorStop(1, '#07060d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 220; i++) {
    ctx.globalAlpha = 0.25 + Math.random() * 0.6;
    ctx.fillStyle = '#fff8ec';
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, 0.6 + Math.random() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Tablero, lo más grande posible.
  const box = { x: 30, y: 230, w: W - 60, h: 1000 };
  const image = info.soft ? fadeEdges(board) : board;
  const src = info.soft ? { x: 0, y: 0, w: image.width, h: image.height } : trim(board);
  const k = Math.min(box.w / src.w, box.h / src.h);
  const dw = src.w * k;
  const dh = src.h * k;
  ctx.drawImage(image, src.x, src.y, src.w, src.h, box.x + (box.w - dw) / 2, box.y + (box.h - dh) / 2, dw, dh);

  // Textos.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f3e9d2';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 18;
  fitText(ctx, info.name, 700, 68, 'Fraunces, Georgia, serif', W - 120);
  ctx.fillText(info.name, W / 2, 130);
  ctx.fillStyle = '#e8dcc0';
  fitText(ctx, info.subtitle, 600, 36, 'Nunito, system-ui, sans-serif', W - 120);
  ctx.fillText(info.subtitle, W / 2, 190);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.6;
  ctx.font = '600 28px Nunito, system-ui, sans-serif';
  ctx.fillText(info.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }), W / 2, H - 50);
  ctx.globalAlpha = 1;

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Sin imagen'))), 'image/png'));
}

/** Abre el menú de compartir del móvil; si no hay, descarga la imagen. */
export async function shareImage(blob: Blob, name: string): Promise<'compartida' | 'descargada' | 'cancelada'> {
  const fileName = `${name.replace(/[^\p{L}\p{N} ]/gu, '').trim().replace(/\s+/g, '-') || 'isla'}.png`;
  const file = new File([blob], fileName, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return 'compartida';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelada';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'descargada';
}
