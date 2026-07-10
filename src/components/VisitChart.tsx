"use client";

import type { TrafficPoint } from "@/lib/types";

interface VisitChartProps {
  data: TrafficPoint[];
}

function formatVisits(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function VisitChart({ data }: VisitChartProps) {
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.visits), 1);
  const width = 640;
  const height = 200;
  const padX = 8;
  const padY = 16;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const points = data.map((d, i) => {
    const x = padX + (i / (data.length - 1 || 1)) * chartW;
    const y = padY + chartH - (d.visits / max) * chartH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? 0} ${padY + chartH} L ${points[0]?.x ?? 0} ${padY + chartH} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[320px]" aria-hidden>
        <defs>
          <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#visitGrad)" />
        <path d={linePath} fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" />
        {points.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r="3" fill="#a5b4fc" />
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>{data[0]?.label}</span>
        <span>Peak {formatVisits(max)}/mo</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
