"use client";

import { useState } from "react";
import { SearchForm } from "@/components/SearchForm";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import type { AnalysisResult } from "@/lib/types";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function handleSearch(url: string) {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              MW
            </div>
            <span className="text-xl font-bold text-white">MyWebChecker</span>
          </div>
          <p className="hidden text-sm text-slate-400 sm:block">Traffic & SEO in one search</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <section className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Check any website&apos;s
            <span className="block text-indigo-400">traffic & SEO</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
            Enter a URL for a live SEO audit and traffic estimates powered by Tranco global rank data.
          </p>
          <div className="mt-8 flex justify-center">
            <SearchForm onSearch={handleSearch} loading={loading} />
          </div>
          {error && (
            <p className="mt-4 text-red-400" role="alert">
              {error}
            </p>
          )}
        </section>

        {loading && (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-slate-400">Crawling site and fetching traffic data…</p>
          </div>
        )}

        {result && !loading && <ResultsDashboard result={result} />}
      </main>

      <footer className="border-t border-slate-800/60 py-6 text-center text-sm text-slate-500">
        MyWebChecker — Website traffic & SEO analysis
      </footer>
    </div>
  );
}
