# MyWebChecker

Analyze any website's **traffic** (daily, weekly, monthly, yearly) and **SEO** details with a single URL search.

**Live:** [mywebchecker.vercel.app](https://mywebchecker.vercel.app)

## Features

- Traffic period breakdowns (daily / weekly / monthly / yearly) and visit trend chart
- Global rank from [Tranco](https://tranco-list.eu/) with 30-day history
- Optional provider-verified traffic via Scrappa (`SCRAPPA_API_KEY`)
- Full SEO audit from live page crawl: meta tags, headings, links, robots.txt, sitemap

## How traffic works

1. **Default (no API key):** Visit estimates are modeled from verified Tranco global rank using a published power-law formula. Rank history drives the visit trend chart.
2. **With `SCRAPPA_API_KEY`:** SimilarWeb-style provider data (bounce rate, sources, etc.) from [Scrappa](https://scrappa.co) — 500 free credits/month.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables (optional)

| Variable | Description |
|----------|-------------|
| `SCRAPPA_API_KEY` | Scrappa SimilarWeb API for provider-verified traffic |

## Deploy

```bash
npx vercel --prod
```
