export function fmtUsd(n: number): string {
  if (!isFinite(n) || n === 0) return "$0";
  if (n < 0.01) return `$${n.toPrecision(2)}`;
  if (n < 1000) return `$${n.toFixed(2)}`;
  return `$${compact(n)}`;
}

export function fmtEth(n: number, digits = 4): string {
  if (!isFinite(n) || n === 0) return "0";
  if (n < 0.0001) return n.toExponential(2);
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function compact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return Number.isInteger(n) ? String(n) : n.toFixed(n < 10 ? 2 : 0);
}

export function shortAddr(a: string): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
