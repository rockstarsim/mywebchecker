import { extractDomain } from "./domain";
import { analyzeSeo } from "./seo";
import { analyzeTraffic, periodStats } from "./traffic";
import type { AnalysisResult } from "./types";

export async function analyzeWebsite(input: string): Promise<AnalysisResult> {
  const domain = extractDomain(input);

  const [traffic, seo] = await Promise.all([
    analyzeTraffic(input),
    analyzeSeo(input),
  ]);

  return {
    domain,
    analyzedAt: new Date().toISOString(),
    traffic,
    seo,
    periods: periodStats(traffic.monthlyVisits),
  };
}
