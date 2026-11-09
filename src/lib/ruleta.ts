// Cuentas de la ruleta "¿Quién empieza?". La flecha está arriba y la rueda gira en el sentido del reloj.
// El sector i ocupa de i·s a (i+1)·s grados (s = 360 / n), contando desde arriba en el sentido del reloj.

const mod = (a: number, m: number) => ((a % m) + m) % m;

/** Sector que queda bajo la flecha con la rueda girada `rotation` grados. */
export function sliceAt(rotation: number, n: number): number {
  const s = 360 / n;
  return Math.floor(mod(-rotation, 360) / s) % n;
}

/**
 * Giro final para que la flecha caiga en el sector `index`, dando al menos `turns - 1` vueltas más.
 * `jitter` (0..1) mueve el punto de parada dentro del sector, sin acercarse a los bordes.
 */
export function spinTarget(current: number, n: number, index: number, jitter = 0.5, turns = 5): number {
  const s = 360 / n;
  const inside = (0.15 + 0.7 * Math.min(Math.max(jitter, 0), 1)) * s;
  const base = mod(-(index * s + inside), 360);
  return Math.floor(current / 360) * 360 + turns * 360 + base;
}
