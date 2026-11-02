// Cómo se ven los números de las fichas: tamaño, tipo de letra y si el 6 y el 8 van en rojo (se elige en Ajustes).

export type NumberSize = 'pequeno' | 'normal' | 'grande';
export type NumberFont = 'clasica' | 'redonda' | 'moderna' | 'romana' | 'manuscrita';

export const NUMBER_SIZES: Record<NumberSize, { label: string; digit: number; disc: number }> = {
  pequeno: { label: 'Pequeños', digit: 0.8, disc: 0.92 },
  normal: { label: 'Normales', digit: 1, disc: 1 },
  grande: { label: 'Grandes', digit: 1.2, disc: 1.1 },
};

/** `scale` iguala el tamaño a la vista: cada letra es más grande o más pequeña de por sí. */
export const NUMBER_FONTS: Record<NumberFont, { label: string; family: string; weight: number; scale: number }> = {
  clasica: { label: 'Clásica', family: 'Fraunces, Georgia, serif', weight: 700, scale: 1 },
  redonda: { label: 'Redonda', family: 'Nunito, system-ui, sans-serif', weight: 800, scale: 1 },
  moderna: { label: 'Moderna', family: 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif', weight: 600, scale: 0.98 },
  romana: { label: 'Romana', family: 'Cinzel, Georgia, serif', weight: 700, scale: 0.95 },
  manuscrita: { label: 'A mano', family: 'Caveat, "Comic Sans MS", cursive', weight: 700, scale: 1.3 },
};

export interface NumberStyle {
  family: string;
  weight: number;
  /** Tamaño de las cifras (1 = normal). */
  size: number;
  /** Tamaño de la ficha redonda (1 = normal). */
  disc: number;
  /** El 6 y el 8 en rojo. */
  red: boolean;
  /** Identifica el estilo (para guardar las texturas ya dibujadas). */
  key: string;
}

export function numberStyle(size: NumberSize, font: NumberFont, red: boolean): NumberStyle {
  const s = NUMBER_SIZES[size] ?? NUMBER_SIZES.normal;
  const f = NUMBER_FONTS[font] ?? NUMBER_FONTS.clasica;
  return { family: f.family, weight: f.weight, size: s.digit * f.scale, disc: s.disc, red, key: `${font}-${size}-${red}` };
}

export const DEFAULT_NUMBER_STYLE = numberStyle('normal', 'clasica', true);

/** Primer nombre de la familia (para pedir al navegador que la cargue). */
export const firstFamily = (family: string) => family.split(',')[0].trim();
