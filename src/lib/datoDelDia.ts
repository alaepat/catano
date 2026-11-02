// El dato curioso cambia cada día y es el mismo para todos ese día.

export function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

export function datoDelDia<T>(list: readonly T[], date = new Date()): T {
  return list[dayNumber(date) % list.length];
}
