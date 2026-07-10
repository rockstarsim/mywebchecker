export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Please enter a URL");

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (!parsed.hostname || !parsed.hostname.includes(".")) {
    throw new Error("Please enter a valid domain (e.g. example.com)");
  }

  return parsed.toString();
}

export function extractDomain(input: string): string {
  const url = normalizeUrl(input);
  const { hostname } = new URL(url);
  return hostname.replace(/^www\./i, "").toLowerCase();
}

export function parseVisitCount(value: string | number): number {
  if (typeof value === "number") return Math.round(value);

  const cleaned = value.trim().toUpperCase().replace(/,/g, "");
  const match = cleaned.match(/^([\d.]+)\s*([KMB])?$/);
  if (!match) return 0;

  const amount = parseFloat(match[1]);
  const suffix = match[2];

  switch (suffix) {
    case "K":
      return Math.round(amount * 1_000);
    case "M":
      return Math.round(amount * 1_000_000);
    case "B":
      return Math.round(amount * 1_000_000_000);
    default:
      return Math.round(amount);
  }
}

export function parsePercent(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  const parsed = parseFloat(value.replace("%", "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDuration(value: string | null | undefined): number | null {
  if (!value) return null;
  const parts = value.split(":").map((p) => parseInt(p, 10));
  if (parts.some((p) => Number.isNaN(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? null;
}

export function rankPeriodStats(rankHistory: { date: string; rank: number }[]) {
  if (rankHistory.length === 0) {
    return { current: null as number | null, weekAgo: null as number | null, monthAgo: null as number | null };
  }

  const sorted = [...rankHistory].sort((a, b) => a.date.localeCompare(b.date));
  const current = sorted.at(-1)?.rank ?? null;
  const weekAgo = sorted.length >= 7 ? sorted.at(-7)?.rank ?? null : sorted[0]?.rank ?? null;
  const monthAgo = sorted[0]?.rank ?? null;

  return { current, weekAgo, monthAgo };
}
