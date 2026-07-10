import { extractDomain } from "./domain";
import { analyzeSeo } from "./seo";
import { analyzeTraffic, periodStats } from "./traffic";
import type { AnalysisResult } from "./types";

export async function analyzeWebsite(input: string): Promise<AnalysisResult> {
  const domain = extractDomain(input);

  const seo = await analyzeSeo(input);
  const traffic = await analyzeTraffic(input, seo);

  return {
    domain,
    analyzedAt: new Date().toISOString(),
    traffic,
    seo,
    periods: periodStats(traffic.monthlyVisits),
  };
}
