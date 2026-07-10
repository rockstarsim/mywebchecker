"use client";

import type { AnalysisResult, TrafficPeriod } from "@/lib/types";
import { RankChart } from "./RankChart";
import { VisitChart } from "./VisitChart";
import { rankPeriodStats } from "@/lib/domain";

interface ResultsDashboardProps {
  result: AnalysisResult;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const PERIOD_LABELS: Record<TrafficPeriod, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const SOURCE_LABELS: Record<string, string> = {
  scrappa: "Provider-verified traffic data (Scrappa / SimilarWeb estimates)",
  "tranco-model": "Visit estimates modeled from verified Tranco global rank",
  "site-signals": "Visit estimates for smaller sites — based on Wayback history, domain age, and page signals",
};

export function ResultsDashboard({ result }: ResultsDashboardProps) {
  const { traffic, seo, periods, domain } = result;
  const hasVisits = traffic.available && traffic.monthlyVisits != null;
  const rankStats = rankPeriodStats(traffic.rankHistory);

  return (
    <div className="w-full max-w-5xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{domain}</h2>
          <p className="text-sm text-slate-400">
            Analyzed {new Date(result.analyzedAt).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl bg-indigo-600/20 px-4 py-2 text-indigo-300">
          SEO Score: <span className="text-2xl font-bold text-white">{seo.score}</span>/100
          <p className="text-xs text-indigo-400/80">from live page crawl</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="mb-1 text-lg font-semibold text-white">Traffic & Popularity</h3>

        {hasVisits && traffic.source && (
          <p className="mb-4 text-sm text-slate-400">{SOURCE_LABELS[traffic.source]}</p>
        )}

        {!hasVisits && traffic.unavailableReason && (
          <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-slate-300">
            {traffic.unavailableReason}
          </div>
        )}

        {hasVisits && traffic.periodsDerived && (
          <p className="mb-4 text-xs text-slate-500">
            Daily, weekly, and yearly counts are derived from the monthly estimate (÷30, ÷4.33, ×12).
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(Object.keys(periods) as TrafficPeriod[]).map((period) => (
            <div key={period} className="rounded-xl bg-slate-800/60 p-4 text-center">
              <p className="text-sm text-slate-400">{PERIOD_LABELS[period]} visits</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {periods[period] != null ? formatNumber(periods[period]) : "—"}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Global Rank (Tranco)"
            value={
              rankStats.current
                ? `#${rankStats.current.toLocaleString()}`
                : traffic.globalRank
                  ? `#${traffic.globalRank.toLocaleString()}`
                  : traffic.minorSignals
                    ? "Outside top 1M"
                    : "—"
            }
          />
          <Stat
            label="Rank 7 days ago"
            value={rankStats.weekAgo ? `#${rankStats.weekAgo.toLocaleString()}` : "—"}
          />
          <Stat
            label="Rank ~30 days ago"
            value={rankStats.monthAgo ? `#${rankStats.monthAgo.toLocaleString()}` : "—"}
          />
          <Stat label="Bounce Rate" value={traffic.bounceRate != null ? `${traffic.bounceRate}%` : "—"} />
          <Stat label="Avg. Duration" value={formatDuration(traffic.avgVisitDurationSeconds)} />
          <Stat label="Pages / Visit" value={traffic.pagesPerVisit?.toFixed(1) ?? "—"} />
          {traffic.countryRank != null && (
            <Stat label="Country Rank" value={`#${traffic.countryRank.toLocaleString()}`} />
          )}
          {traffic.minorSignals && (
            <>
              <Stat
                label="Wayback Snapshots"
                value={traffic.minorSignals.waybackSnapshots.toLocaleString()}
              />
              <Stat
                label="Domain Age"
                value={
                  traffic.minorSignals.domainAgeDays != null
                    ? `${Math.floor(traffic.minorSignals.domainAgeDays / 365)}y ${Math.floor((traffic.minorSignals.domainAgeDays % 365) / 30)}m`
                    : "—"
                }
              />
            </>
          )}
        </div>

        {traffic.visitHistory.length > 0 && (
          <div className="mt-8">
            <h4 className="mb-3 text-sm font-medium text-slate-300">Visit Trend</h4>
            <VisitChart data={traffic.visitHistory} />
          </div>
        )}

        {traffic.rankHistory.length > 0 && (
          <div className="mt-8">
            <h4 className="mb-3 text-sm font-medium text-slate-300">30-Day Rank History</h4>
            <RankChart data={traffic.rankHistory} />
          </div>
        )}

        {traffic.sources && (
          <div className="mt-6">
            <h4 className="mb-3 text-sm font-medium text-slate-300">Traffic Sources</h4>
            <div className="space-y-2">
              {Object.entries(traffic.sources).map(([key, pct]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-20 text-sm capitalize text-slate-400">{key}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-12 text-right text-sm text-slate-300">{pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="mb-1 text-lg font-semibold text-white">SEO Details</h3>
        <p className="mb-4 text-sm text-slate-400">Fetched directly from the live page.</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Detail label="Page Title" value={seo.title} />
          <Detail label="Meta Description" value={seo.description} />
          <Detail label="Canonical URL" value={seo.canonical} />
          <Detail label="Final URL" value={seo.finalUrl} />
          <Detail label="H1" value={seo.h1[0] ?? "—"} />
          <Detail label="HTTP Status" value={String(seo.statusCode)} />
          <Detail label="Response Time" value={`${seo.responseTimeMs}ms`} />
          <Detail label="HTTPS" value={seo.isHttps ? "Yes" : "No"} />
          <Detail label="Word Count" value={seo.wordCount.toLocaleString()} />
          <Detail label="H2 Tags" value={String(seo.h2Count)} />
          <Detail label="Internal Links" value={String(seo.linksInternal)} />
          <Detail label="External Links" value={String(seo.linksExternal)} />
          <Detail label="Images" value={`${seo.imagesTotal} (${seo.imagesMissingAlt} missing alt)`} />
          <Detail label="robots.txt" value={seo.hasRobotsTxt ? "Found" : "Missing"} />
          <Detail label="Sitemap" value={seo.hasSitemap ? (seo.sitemapUrl ?? "Found") : "Missing"} />
          <Detail label="Structured Data" value={seo.hasStructuredData ? "Yes" : "No"} />
        </div>

        {seo.issues.length > 0 && (
          <div className="mt-6">
            <h4 className="mb-3 text-sm font-medium text-slate-300">Issues & Recommendations</h4>
            <ul className="space-y-2">
              {seo.issues.map((issue, i) => (
                <li
                  key={i}
                  className={`rounded-lg px-4 py-2 text-sm ${
                    issue.type === "error"
                      ? "bg-red-500/10 text-red-300"
                      : issue.type === "warning"
                        ? "bg-amber-500/10 text-amber-300"
                        : "bg-blue-500/10 text-blue-300"
                  }`}
                >
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-800/40 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg bg-slate-800/40 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 break-words text-sm text-slate-200">{value ?? "—"}</p>
    </div>
  );
}
