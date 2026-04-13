"use client";

import { useMemo } from "react";
import type { Correlation, HypothesisId } from "@/types/database";
import { HYPOTHESES } from "@/types/database";

interface CorrelationHeatmapProps {
  correlations: Correlation[];
  windowDays?: number;
}

const LAG_COLUMNS = [0, 1, 2, 3, 5];

function getColor(r: number | null): string {
  if (r == null) return "bg-gray-800";
  // Diverging scale: red (negative) → gray (0) → green (positive)
  const abs = Math.abs(r);
  if (abs < 0.1) return "bg-gray-700";
  if (r > 0) {
    if (abs < 0.2) return "bg-emerald-900/50";
    if (abs < 0.3) return "bg-emerald-800/60";
    if (abs < 0.4) return "bg-emerald-700/70";
    if (abs < 0.5) return "bg-emerald-600/80";
    return "bg-emerald-500/90";
  } else {
    if (abs < 0.2) return "bg-red-900/50";
    if (abs < 0.3) return "bg-red-800/60";
    if (abs < 0.4) return "bg-red-700/70";
    if (abs < 0.5) return "bg-red-600/80";
    return "bg-red-500/90";
  }
}

function getTextColor(r: number | null): string {
  if (r == null) return "text-gray-600";
  const abs = Math.abs(r);
  if (abs < 0.1) return "text-gray-500";
  return "text-white";
}

export default function CorrelationHeatmap({
  correlations,
  windowDays = 90,
}: CorrelationHeatmapProps) {
  // Build a lookup: hypothesis → lag → correlation data
  const lookup = useMemo(() => {
    const map: Record<string, Record<number, Correlation>> = {};
    for (const c of correlations) {
      if (c.window_days !== windowDays) continue;
      if (!map[c.hypothesis]) map[c.hypothesis] = {};
      map[c.hypothesis][c.lag_days] = c;
    }
    return map;
  }, [correlations, windowDays]);

  const hasData = correlations.length > 0;

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Correlation Heatmap</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Pearson R values — {windowDays}-day rolling window
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500/80" />
            <span>Negative</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gray-700" />
            <span>None</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500/80" />
            <span>Positive</span>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="text-center text-gray-500 py-8">
          No correlation data yet. Need at least 10 data points to compute.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-4 w-48">
                  Indicator
                </th>
                {LAG_COLUMNS.map((lag) => (
                  <th
                    key={lag}
                    className="text-center text-xs text-gray-400 font-medium pb-2 px-2 w-20"
                  >
                    {lag === 0 ? "Same day" : `+${lag}d lag`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HYPOTHESES.map((h) => (
                <tr key={h.id}>
                  <td className="text-sm text-gray-300 py-1 pr-4">
                    <div className="font-medium">{h.title}</div>
                    <div className="text-xs text-gray-500">{h.subtitle}</div>
                  </td>
                  {LAG_COLUMNS.map((lag) => {
                    const c = lookup[h.id]?.[lag];
                    const r = c?.pearson_r ?? null;
                    const p = c?.p_value ?? null;
                    const n = c?.sample_size ?? null;
                    const significant = p != null && p < 0.05;

                    return (
                      <td key={lag} className="py-1 px-1">
                        <div
                          className={`${getColor(r)} rounded-md p-2 text-center cursor-default transition-colors hover:ring-1 hover:ring-gray-500`}
                          title={
                            r != null
                              ? `R: ${r.toFixed(4)}\np-value: ${p?.toFixed(6)}\nSamples: ${n}\n${significant ? "Statistically significant (p < 0.05)" : "Not significant"}`
                              : "Insufficient data"
                          }
                        >
                          <div className={`text-sm font-mono font-semibold ${getTextColor(r)}`}>
                            {r != null ? r.toFixed(2) : "—"}
                          </div>
                          {significant && (
                            <div className="text-[10px] text-yellow-400 mt-0.5">*</div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 text-[10px] text-gray-600">
        * Statistically significant (p &lt; 0.05). Hover over cells for details.
      </div>
    </div>
  );
}
