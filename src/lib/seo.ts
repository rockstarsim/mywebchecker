import { extractDomain, normalizeUrl } from "./domain";
import type { SeoData, SeoIssue } from "./types";

const FETCH_TIMEOUT_MS = 12_000;

function getMetaContent(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, "i"),
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${name}["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function getTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1]?.trim() ?? null;
}

function getHeadings(html: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (text) results.push(text);
  }
  return results;
}

function countMatches(html: string, regex: RegExp): number {
  return (html.match(regex) ?? []).length;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": "MyWebChecker/1.0 (+https://mywebchecker.vercel.app)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...(init?.headers ?? {}),
      },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

function buildIssues(data: Omit<SeoData, "score" | "issues">): { score: number; issues: SeoIssue[] } {
  const issues: SeoIssue[] = [];
  let score = 100;

  if (!data.title) {
    issues.push({ type: "error", message: "Missing page title" });
    score -= 15;
  } else if (data.title.length < 30 || data.title.length > 60) {
    issues.push({ type: "warning", message: `Title length is ${data.title.length} chars (ideal: 30–60)` });
    score -= 5;
  }

  if (!data.description) {
    issues.push({ type: "error", message: "Missing meta description" });
    score -= 15;
  } else if (data.description.length < 120 || data.description.length > 160) {
    issues.push({
      type: "warning",
      message: `Meta description is ${data.description.length} chars (ideal: 120–160)`,
    });
    score -= 5;
  }

  if (data.h1.length === 0) {
    issues.push({ type: "error", message: "No H1 heading found" });
    score -= 10;
  } else if (data.h1.length > 1) {
    issues.push({ type: "warning", message: `Multiple H1 tags found (${data.h1.length})` });
    score -= 5;
  }

  if (!data.isHttps) {
    issues.push({ type: "error", message: "Site is not served over HTTPS" });
    score -= 15;
  }

  if (!data.hasRobotsTxt) {
    issues.push({ type: "warning", message: "robots.txt not found" });
    score -= 5;
  }

  if (!data.hasSitemap) {
    issues.push({ type: "warning", message: "sitemap.xml not found" });
    score -= 5;
  }

  if (data.imagesMissingAlt > 0) {
    issues.push({
      type: "warning",
      message: `${data.imagesMissingAlt} image(s) missing alt text`,
    });
    score -= Math.min(10, data.imagesMissingAlt);
  }

  if (!data.hasStructuredData) {
    issues.push({ type: "info", message: "No JSON-LD structured data detected" });
    score -= 3;
  }

  if (data.statusCode >= 400) {
    issues.push({ type: "error", message: `Page returned HTTP ${data.statusCode}` });
    score -= 20;
  }

  if (data.responseTimeMs > 3000) {
    issues.push({ type: "warning", message: `Slow response time (${data.responseTimeMs}ms)` });
    score -= 5;
  }

  return { score: Math.max(0, score), issues };
}

export async function analyzeSeo(input: string): Promise<SeoData> {
  const url = normalizeUrl(input);
  const domain = extractDomain(input);
  const origin = new URL(url).origin;

  const start = Date.now();
  const response = await fetchWithTimeout(url);
  const responseTimeMs = Date.now() - start;
  const html = await response.text();

  const title = getTitle(html);
  const description = getMetaContent(html, "description");
  const canonical = getMetaContent(html, "canonical") ?? html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ?? null;
  const robotsMeta = getMetaContent(html, "robots");
  const ogTitle = getMetaContent(html, "og:title");
  const ogDescription = getMetaContent(html, "og:description");
  const ogImage = getMetaContent(html, "og:image");
  const h1 = getHeadings(html, "h1");
  const h2Count = getHeadings(html, "h2").length;
  const wordCount = stripHtml(html).split(" ").filter(Boolean).length;

  const imgTags = html.match(/<img\b[^>]*>/gi) ?? [];
  const imagesMissingAlt = imgTags.filter((tag) => !/\balt=["'][^"']+["']/i.test(tag)).length;

  const linkMatches = html.match(/<a\b[^>]+href=["']([^"']+)["']/gi) ?? [];
  let linksInternal = 0;
  let linksExternal = 0;
  for (const tag of linkMatches) {
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      const linkUrl = new URL(href, url);
      if (linkUrl.hostname.replace(/^www\./i, "") === domain) linksInternal++;
      else linksExternal++;
    } catch {
      linksInternal++;
    }
  }

  const hasStructuredData = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);

  let hasRobotsTxt = false;
  let hasSitemap = false;
  let sitemapUrl: string | null = null;

  try {
    const robotsRes = await fetchWithTimeout(`${origin}/robots.txt`);
    if (robotsRes.ok) {
      hasRobotsTxt = true;
      const robotsText = await robotsRes.text();
      const sitemapMatch = robotsText.match(/^Sitemap:\s*(.+)$/im);
      if (sitemapMatch?.[1]) sitemapUrl = sitemapMatch[1].trim();
    }
  } catch {
    // ignore
  }

  const sitemapCandidates = [sitemapUrl, `${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`].filter(Boolean) as string[];
  for (const candidate of sitemapCandidates) {
    try {
      const sitemapRes = await fetchWithTimeout(candidate, { method: "HEAD" });
      if (sitemapRes.ok) {
        hasSitemap = true;
        sitemapUrl = candidate;
        break;
      }
    } catch {
      // ignore
    }
  }

  const base: Omit<SeoData, "score" | "issues"> = {
    url,
    finalUrl: response.url,
    statusCode: response.status,
    responseTimeMs,
    isHttps: new URL(response.url).protocol === "https:",
    title,
    description,
    canonical,
    robotsMeta,
    ogTitle,
    ogDescription,
    ogImage,
    h1,
    h2Count,
    wordCount,
    imagesTotal: imgTags.length,
    imagesMissingAlt,
    linksInternal,
    linksExternal,
    hasStructuredData,
    hasRobotsTxt,
    hasSitemap,
    sitemapUrl,
  };

  const { score, issues } = buildIssues(base);

  return { ...base, score, issues };
}
