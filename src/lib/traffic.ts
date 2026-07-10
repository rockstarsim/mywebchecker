import { extractDomain, parseDuration, parsePercent, parseVisitCount } from "./domain";
import {
  buildMinorVisitHistory,
  collectMinorSiteSignals,
  estimateMinorSiteVisits,
} from "./minor-site";
import type { RankPoint, SeoData, TrafficData, TrafficPoint, TrafficSources } from "./types";

interface ScrappaResponse {
  success?: boolean;
  domain?: string;
  global_rank?: number;
  country_rank?: number;
  monthly_visits?: string | number;
  bounce_rate?: string | number;
  avg_visit_duration?: string;
  pages_per_visit?: number;
  traffic_sources?: Record<string, string | number>;
}

interface TrancoResponse {
  ranks?: Array<{ date: string; rank: number }>;
}

interface SiterankResponse {
  rank?: number;
}

/** Power-law model calibrated to public rank/traffic benchmarks (Tranco rank → monthly visits). */
export function monthlyVisitsFromRank(rank: number): number {
  if (rank <= 0) return 0;
  return Math.round(50_000_000 / Math.pow(rank, 0.75));
}

function parseSources(raw: Record<string, string | number> | undefined): TrafficSources | null {
  if (!raw) return null;
  return {
    direct: parsePercent(raw.direct) ?? 0,
    search: parsePercent(raw.search) ?? 0,
    referral: parsePercent(raw.referral) ?? 0,
    social: parsePercent(raw.social) ?? 0,
    paid: parsePercent(raw.paid) ?? 0,
  };
}

function buildVisitHistory(rankHistory: RankPoint[]): TrafficPoint[] {
  return rankHistory.map((r) => ({
    label: r.date,
    visits: monthlyVisitsFromRank(r.rank),
    period: "monthly",
  }));
}

async function fetchTrancoRanks(domain: string): Promise<RankPoint[]> {
  try {
    const response = await fetch(
      `https://tranco-list.eu/api/ranks/domain/${encodeURIComponent(domain)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return [];
    const data = (await response.json()) as TrancoResponse;
    return (data.ranks ?? [])
      .filter((r) => typeof r.rank === "number" && r.rank > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

async function fetchSiterank(domain: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://siterank.redirect2.me/api/rank.json?domain=${encodeURIComponent(domain)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as SiterankResponse;
    return typeof data.rank === "number" && data.rank > 0 ? data.rank : null;
  } catch {
    return null;
  }
}

async function resolveRankHistory(domain: string): Promise<RankPoint[]> {
  const tranco = await fetchTrancoRanks(domain);
  if (tranco.length > 0) return tranco;

  const rank = await fetchSiterank(domain);
  if (rank == null) return [];

  const today = new Date().toISOString().slice(0, 10);
  return [{ date: today, rank }];
}

async function fetchScrappaTraffic(domain: string, rankHistory: RankPoint[]): Promise<TrafficData | null> {
  const apiKey = process.env.SCRAPPA_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(`https://scrappa.co/api/similarweb?domain=${encodeURIComponent(domain)}`, {
      headers: {
        Accept: "application/json",
        "X-API-KEY": apiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = (await response.json()) as ScrappaResponse;
    if (!data.success && !data.monthly_visits) return null;

    const monthlyVisits = parseVisitCount(data.monthly_visits ?? 0);
    if (monthlyVisits <= 0) return null;

    const globalRank = data.global_rank ?? rankHistory.at(-1)?.rank ?? null;

    return {
      domain,
      available: true,
      unavailableReason: null,
      globalRank,
      countryRank: data.country_rank ?? null,
      monthlyVisits,
      bounceRate: parsePercent(data.bounce_rate),
      avgVisitDurationSeconds: parseDuration(data.avg_visit_duration),
      pagesPerVisit: data.pages_per_visit ?? null,
      sources: parseSources(data.traffic_sources),
      visitHistory: buildVisitHistory(rankHistory),
      rankHistory,
      source: "scrappa",
      periodsDerived: true,
      minorSignals: null,
    };
  } catch {
    return null;
  }
}

function buildTrancoModelTraffic(domain: string, rankHistory: RankPoint[]): TrafficData | null {
  const globalRank = rankHistory.at(-1)?.rank ?? null;
  if (globalRank == null) return null;

  const monthlyVisits = monthlyVisitsFromRank(globalRank);
  if (monthlyVisits <= 0) return null;

  return {
    domain,
    available: true,
    unavailableReason: null,
    globalRank,
    countryRank: null,
    monthlyVisits,
    bounceRate: null,
    avgVisitDurationSeconds: null,
    pagesPerVisit: null,
    sources: null,
    visitHistory: buildVisitHistory(rankHistory),
    rankHistory,
    source: "tranco-model",
    periodsDerived: true,
    minorSignals: null,
  };
}

async function buildMinorSiteTraffic(domain: string, seo: SeoData): Promise<TrafficData> {
  const signals = await collectMinorSiteSignals(domain);
  const monthlyVisits = estimateMinorSiteVisits(seo, signals);
  const visitHistory = buildMinorVisitHistory(monthlyVisits, signals.waybackMonthly).map((p) => ({
    label: p.label,
    visits: p.visits,
    period: "monthly" as const,
  }));

  return {
    domain,
    available: true,
    unavailableReason: null,
    globalRank: null,
    countryRank: null,
    monthlyVisits,
    bounceRate: null,
    avgVisitDurationSeconds: null,
    pagesPerVisit: null,
    sources: null,
    visitHistory,
    rankHistory: [],
    source: "site-signals",
    periodsDerived: true,
    minorSignals: {
      waybackSnapshots: signals.waybackSnapshots,
      domainAgeDays: signals.domainAgeDays,
      inTrancoTopList: false,
    },
  };
}

export async function analyzeTraffic(input: string, seo: SeoData): Promise<TrafficData> {
  const domain = extractDomain(input);
  const rankHistory = await resolveRankHistory(domain);

  const scrappa = await fetchScrappaTraffic(domain, rankHistory);
  if (scrappa) return scrappa;

  const modeled = buildTrancoModelTraffic(domain, rankHistory);
  if (modeled) return modeled;

  return buildMinorSiteTraffic(domain, seo);
}

export function periodStats(monthlyVisits: number | null): Record<"daily" | "weekly" | "monthly" | "yearly", number | null> {
  if (monthlyVisits == null || monthlyVisits <= 0) {
    return { daily: null, weekly: null, monthly: null, yearly: null };
  }
  return {
    daily: Math.round(monthlyVisits / 30),
    weekly: Math.round(monthlyVisits / 4.33),
    monthly: monthlyVisits,
    yearly: Math.round(monthlyVisits * 12),
  };
}
