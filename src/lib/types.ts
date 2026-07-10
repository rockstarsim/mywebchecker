export type TrafficPeriod = "daily" | "weekly" | "monthly" | "yearly";

export interface TrafficPoint {
  label: string;
  visits: number;
  period: TrafficPeriod;
}

export interface RankPoint {
  date: string;
  rank: number;
}

export interface TrafficSources {
  direct: number;
  search: number;
  referral: number;
  social: number;
  paid: number;
}

export interface TrafficData {
  domain: string;
  available: boolean;
  unavailableReason: string | null;
  globalRank: number | null;
  countryRank: number | null;
  monthlyVisits: number | null;
  bounceRate: number | null;
  avgVisitDurationSeconds: number | null;
  pagesPerVisit: number | null;
  sources: TrafficSources | null;
  visitHistory: TrafficPoint[];
  rankHistory: RankPoint[];
  source: "scrappa" | "tranco-model" | null;
  periodsDerived: boolean;
}

export interface SeoIssue {
  type: "error" | "warning" | "info";
  message: string;
}

export interface SeoData {
  url: string;
  finalUrl: string;
  statusCode: number;
  responseTimeMs: number;
  isHttps: boolean;
  title: string | null;
  description: string | null;
  canonical: string | null;
  robotsMeta: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  h1: string[];
  h2Count: number;
  wordCount: number;
  imagesTotal: number;
  imagesMissingAlt: number;
  linksInternal: number;
  linksExternal: number;
  hasStructuredData: boolean;
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
  sitemapUrl: string | null;
  score: number;
  issues: SeoIssue[];
}

export interface AnalysisResult {
  domain: string;
  analyzedAt: string;
  traffic: TrafficData;
  seo: SeoData;
  periods: Record<TrafficPeriod, number | null>;
}
