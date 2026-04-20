// Helpers for golf scoring math

export type ScoreRow = {
  hole_number: number;
  strokes: number | null;
  par: number;
};

export function totalStrokes(rows: ScoreRow[]): number {
  return rows.reduce((s, r) => s + (r.strokes ?? 0), 0);
}

export function totalParPlayed(rows: ScoreRow[]): number {
  return rows.filter((r) => r.strokes != null).reduce((s, r) => s + r.par, 0);
}

export function toPar(rows: ScoreRow[]): number {
  const played = rows.filter((r) => r.strokes != null);
  const strokes = played.reduce((s, r) => s + (r.strokes ?? 0), 0);
  const par = played.reduce((s, r) => s + r.par, 0);
  return strokes - par;
}

export function holesPlayed(rows: ScoreRow[]): number {
  return rows.filter((r) => r.strokes != null).length;
}

export function formatToPar(n: number): string {
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `${n}`;
}

export function toParColorClass(n: number): string {
  if (n < 0) return "text-under-par";
  if (n > 0) return "text-over-par";
  return "text-even-par";
}

/** Stableford points relative to par. Net not handled here. */
export function stablefordPoints(strokes: number, par: number): number {
  const diff = strokes - par;
  // 2 = par, 3 = birdie, 4 = eagle, 5 = albatross, 1 = bogey, 0 = double+
  if (diff <= -3) return 5;
  if (diff === -2) return 4;
  if (diff === -1) return 3;
  if (diff === 0) return 2;
  if (diff === 1) return 1;
  return 0;
}

export function holeLabel(strokes: number, par: number): string {
  const d = strokes - par;
  if (d <= -3) return "ALBATROSS";
  if (d === -2) return "EAGLE";
  if (d === -1) return "BIRDIE";
  if (d === 0) return "PAR";
  if (d === 1) return "BOGEY";
  if (d === 2) return "DOUBLE";
  return `+${d}`;
}

/** Standard PGA-style 18 hole par layout (par 72) */
export const DEFAULT_PARS_18 = [4, 4, 3, 5, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 5];