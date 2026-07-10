"use client";

import type { RankPoint } from "@/lib/types";

interface RankChartProps {
  data: RankPoint[];
}

export function RankChart({ data }: RankChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500">No rank history available for this domain.</p>;
  }

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const ranks = sorted.map((d) => d.rank);
  const min = Math.min(...ranks);
  const max = Math.max(...ranks);
  const range = Math.max(max - min, 1);

  const width = 640;
  const height = 200;
  const padX = 8;
  const padY = 16;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const points = sorted.map((d, i) => {
    const x = padX + (i / (sorted.length - 1 || 1)) * chartW;
    const y = padY + ((d.rank - min) / range) * chartH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <p className="mb-2 text-xs text-slate-500">Verified Tranco global rank (lower is better). Updated daily.</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[320px]" aria-hidden>
        <path d={linePath} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p) => (
          <circle key={p.date} cx={p.x} cy={p.y} r="3" fill="#6ee7b7" />
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>{sorted[0]?.date}</span>
        <span>#{min.toLocaleString()} – #{max.toLocaleString()}</span>
        <span>{sorted[sorted.length - 1]?.date}</span>
      </div>
    </div>
  );
}
