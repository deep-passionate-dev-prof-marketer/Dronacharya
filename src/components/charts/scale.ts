/** Small chart helpers: nice ticks, linear scales, number formats. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0];
  if (min === max) max = min + 1;
  const span = max - min;
  const step0 = span / Math.max(1, count);
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) || 10 * mag;
  const start = Math.floor(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step * 0.001; v += step) out.push(Math.round(v * 1e6) / 1e6);
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}

export const linear = (d0: number, d1: number, r0: number, r1: number) => (v: number) => (d1 === d0 ? r0 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0));

export type Format = "int" | "num1" | "pct" | "min" | "score" | "hours";
export function fmt(v: number | null | undefined, f: Format = "num1"): string {
  if (v == null || !Number.isFinite(v)) return "—";
  switch (f) {
    case "int":
      return Math.round(v).toLocaleString();
    case "pct":
      return `${Math.round(v * 1000) / 10}%`;
    case "min":
      return `${Math.round(v * 10) / 10} min`;
    case "hours":
      return `${Math.round(v * 10) / 10} h`;
    case "score":
      return String(Math.round(v * 10) / 10);
    default:
      return (Math.round(v * 10) / 10).toLocaleString();
  }
}

/** Short axis label for a value (no units). */
export function axisLabel(v: number, f: Format) {
  if (f === "pct") return `${Math.round(v * 100)}%`;
  return Math.abs(v) >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v * 10) / 10);
}
