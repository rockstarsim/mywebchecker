import type { SeoData } from "./types";

export interface MinorSiteSignals {
  waybackSnapshots: number;
  waybackMonthly: Array<{ month: string; snapshots: number }>;
  domainAgeDays: number | null;
}

export async function fetchWaybackData(domain: string): Promise<{
  total: number;
  monthly: Array<{ month: string; snapshots: number }>;
}> {
  try {
    const url = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}/*&output=json&fl=timestamp&collapse=timestamp&limit=5000`;
    const response = await fetch(url, {
      headers: { "User-Agent": "MyWebChecker/1.0" },
      cache: "no-store",
    });
    if (!response.ok) return { total: 0, monthly: [] };

    const rows = (await response.json()) as string[][];
    if (!Array.isArray(rows) || rows.length <= 1) return { total: 0, monthly: [] };

    const byMonth = new Map<string, number>();
    for (const row of rows.slice(1)) {
      const ts = row[0];
      if (!ts || ts.length < 6) continue;
      const month = `${ts.slice(0, 4)}-${ts.slice(4, 6)}`;
      byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
    }

    const monthly = [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, snapshots]) => ({ month, snapshots }));

    return { total: rows.length - 1, monthly };
  } catch {
    return { total: 0, monthly: [] };
  }
}

export async function fetchDomainAgeDays(domain: string): Promise<number | null> {
  try {
    const response = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      headers: { Accept: "application/rdap+json" },
      cache: "no-store",
    });
    if (!response.ok) return null;

    const data = await response.json();
    const events = data?.events as Array<{ eventAction?: string; eventDate?: string }> | undefined;
    const registration = events?.find((e) => e.eventAction === "registration")?.eventDate;
    if (!registration) return null;

    const registered = new Date(registration);
    if (Number.isNaN(registered.getTime())) return null;

    return Math.floor((Date.now() - registered.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

export async function collectMinorSiteSignals(domain: string): Promise<MinorSiteSignals> {
  const [wayback, domainAgeDays] = await Promise.all([
    fetchWaybackData(domain),
    fetchDomainAgeDays(domain),
  ]);

  return {
    waybackSnapshots: wayback.total,
    waybackMonthly: wayback.monthly,
    domainAgeDays,
  };
}

/** Estimate monthly visits for sites outside Tranco top 1M using observable signals. */
export function estimateMinorSiteVisits(seo: SeoData, signals: MinorSiteSignals): number {
  if (seo.statusCode >= 400) return Math.max(10, Math.round(signals.waybackSnapshots * 2));

  let score = 80;

  score += Math.min(4000, Math.log10(signals.waybackSnapshots + 1) * 900);

  if (signals.domainAgeDays != null) {
    score += Math.min(2500, signals.domainAgeDays / 45);
  }

  score += seo.score * 15;
  score += Math.min(800, seo.wordCount / 15);
  score += Math.min(400, seo.linksInternal * 4);
  score += Math.min(600, seo.linksExternal * 12);
  if (seo.hasStructuredData) score += 150;
  if (seo.hasSitemap) score += 100;
  if (seo.isHttps) score += 80;
  if (seo.h1.length > 0) score += 50;

  return Math.round(Math.max(25, Math.min(score, 75_000)));
}

export function buildMinorVisitHistory(
  monthlyVisits: number,
  waybackMonthly: Array<{ month: string; snapshots: number }>,
): Array<{ label: string; visits: number }> {
  if (waybackMonthly.length === 0) {
    const now = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const history: Array<{ label: string; visits: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      history.push({
        label: `${months[d.getMonth()]} ${d.getFullYear()}`,
        visits: monthlyVisits,
      });
    }
    return history;
  }

  const maxSnapshots = Math.max(...waybackMonthly.map((m) => m.snapshots), 1);
  return waybackMonthly.map((m) => ({
    label: m.month,
    visits: Math.round((m.snapshots / maxSnapshots) * monthlyVisits),
  }));
}
