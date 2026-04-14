"use client";

import { useMemo, useState } from "react";
import type { Correlation, HypothesisId } from "@/types/database";
import { HYPOTHESES } from "@/types/database";

interface CorrelationHeatmapProps {
  correlations: Correlation[];
  windowDays?: number;
}

interface SelectedCell {
  hypothesisId: HypothesisId;
  lag: number;
  correlation: Correlation;
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

function strengthLabel(r: number): string {
  const abs = Math.abs(r);
  if (abs < 0.1) return "Negligible";
  if (abs < 0.3) return "Weak";
  if (abs < 0.5) return "Moderate";
  if (abs < 0.7) return "Strong";
  return "Very Strong";
}

function DetailPanel({
  selected,
  showHelp,
  onToggleHelp,
}: {
  selected: SelectedCell | null;
  showHelp: boolean;
  onToggleHelp: () => void;
}) {
  const hypothesis = selected
    ? HYPOTHESES.find((h) => h.id === selected.hypothesisId)
    : null;

  return (
    <div className="w-56 shrink-0 bg-gray-800/50 rounded-lg border border-gray-700/50 p-4 relative">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">Cell Details</h3>
        <button
          onClick={onToggleHelp}
          className="w-5 h-5 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-gray-200 text-xs flex items-center justify-center transition-colors"
          title="What do these values mean?"
        >
          ?
        </button>
      </div>

      {showHelp && (
        <div className="absolute top-12 right-2 left-2 z-10 bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-xl">
          <div className="space-y-2 text-xs text-gray-300">
            <div>
              <span className="font-semibold text-gray-200">R Value</span>
              <p className="text-gray-400 mt-0.5">
                Measures the strength and direction of a linear relationship
                between two variables. Ranges from -1 (perfect inverse) to +1
                (perfect positive). 0 means no linear relationship.
              </p>
            </div>
            <div>
              <span className="font-semibold text-gray-200">P-Value</span>
              <p className="text-gray-400 mt-0.5">
                The probability this correlation occurred by random chance.
                Lower values mean higher confidence the relationship is real.
              </p>
            </div>
            <div>
              <span className="font-semibold text-gray-200">Significance</span>
              <p className="text-gray-400 mt-0.5">
                When p &lt; 0.05, the correlation is &quot;statistically
                significant&quot; — there is less than a 5% chance the result is
                due to random noise.
              </p>
            </div>
          </div>
          <button
            onClick={onToggleHelp}
            className="mt-2 text-[10px] text-gray-500 hover:text-gray-400"
          >
            Close
          </button>
        </div>
      )}

      {!selected ? (
        <p className="text-xs text-gray-500 text-center py-6">
          Click a cell to view details
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-400">
              {hypothesis?.title}
            </p>
            <p className="text-[10px] text-gray-500">
              {selected.lag === 0 ? "Same day" : `+${selected.lag}d lag`}
            </p>
          </div>

          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
              R Value
            </p>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-lg font-mono font-bold ${
                  selected.correlation.pearson_r != null
                    ? selected.correlation.pearson_r > 0
                      ? "text-emerald-400"
                      : selected.correlation.pearson_r < 0
                        ? "text-red-400"
                        : "text-gray-400"
                    : "text-gray-600"
                }`}
              >
                {selected.correlation.pearson_r != null
                  ? selected.correlation.pearson_r.toFixed(4)
                  : "N/A"}
              </span>
              {selected.correlation.pearson_r != null && (
                <span className="text-[10px] text-gray-500">
                  {strengthLabel(selected.correlation.pearson_r)}
                </span>
              )}
            </div>
          </div>

          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
              P-Value
            </p>
            <span className="text-sm font-mono text-gray-300">
              {selected.correlation.p_value != null
                ? selected.correlation.p_value.toFixed(6)
                : "N/A"}
            </span>
          </div>

          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
              Significance
            </p>
            {selected.correlation.p_value != null ? (
              selected.correlation.p_value < 0.05 ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Significant
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-700/50 px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                  Not Significant
                </span>
              )
            ) : (
              <span className="text-xs text-gray-600">N/A</span>
            )}
          </div>

          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
              Sample Size
            </p>
            <span className="text-sm font-mono text-gray-300">
              {selected.correlation.sample_size ?? "N/A"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

type Benchmark = "wti" | "brent" | "wcs";

const BENCHMARK_OPTIONS: { key: Benchmark; label: string; color: string }[] = [
  { key: "wti", label: "WTI", color: "#eab308" },
  { key: "brent", label: "Brent", color: "#60a5fa" },
  { key: "wcs", label: "WCS", color: "#f472b6" },
];

export default function CorrelationHeatmap({
  correlations,
  windowDays = 90,
}: CorrelationHeatmapProps) {
  const [selected, setSelected] = useState<SelectedCell | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [benchmark, setBenchmark] = useState<Benchmark>("wti");

  // Build a lookup: hypothesis → lag → correlation data
  // Filter by selected benchmark (H4 is benchmark-agnostic, always shown)
  const lookup = useMemo(() => {
    const map: Record<string, Record<number, Correlation>> = {};
    for (const c of correlations) {
      if (c.window_days !== windowDays) continue;
      // H4 always passes through (target is "crude_inventories")
      const isH4 = c.hypothesis === "H4_wcs_spread";
      if (!isH4 && !c.target.startsWith(benchmark)) continue;
      if (!map[c.hypothesis]) map[c.hypothesis] = {};
      map[c.hypothesis][c.lag_days] = c;
    }
    return map;
  }, [correlations, windowDays, benchmark]);

  const hasData = correlations.length > 0;

  // Get the computed_date from the correlation data
  const computedDate = useMemo(() => {
    for (const c of correlations) {
      if (c.computed_date) return c.computed_date;
    }
    return null;
  }, [correlations]);

  function handleCellClick(
    hypothesisId: HypothesisId,
    lag: number,
    correlation: Correlation
  ) {
    if (
      selected?.hypothesisId === hypothesisId &&
      selected?.lag === lag
    ) {
      setSelected(null);
    } else {
      setSelected({ hypothesisId, lag, correlation });
      setShowHelp(false);
    }
  }

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Correlation Heatmap</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Pearson R values — {windowDays}-day rolling window
            {computedDate && (
              <span className="text-gray-600"> · computed {computedDate}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Benchmark toggle */}
          <div className="flex items-center gap-1">
            {BENCHMARK_OPTIONS.map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => {
                  setBenchmark(key);
                  setSelected(null);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-colors ${
                  benchmark === key
                    ? "border-gray-500 bg-gray-700/50 text-gray-200"
                    : "border-gray-700 text-gray-500 hover:text-gray-300"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: benchmark === key ? color : "#4b5563" }}
                />
                {label}
              </button>
            ))}
          </div>

          <span className="border-l border-gray-700 h-4" />

          {/* Color legend */}
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
      </div>

      {!hasData ? (
        <div className="text-center text-gray-500 py-8">
          No correlation data yet. Need at least 10 data points to compute.
        </div>
      ) : (
        <div className="flex gap-4">
          <div className="flex-1 overflow-x-auto">
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
                      const significant = p != null && p < 0.05;
                      const isSelected =
                        selected?.hypothesisId === h.id && selected?.lag === lag;

                      return (
                        <td key={lag} className="py-1 px-1">
                          <div
                            className={`${getColor(r)} rounded-md p-2 text-center transition-colors hover:ring-1 hover:ring-gray-500 ${
                              isSelected
                                ? "ring-2 ring-blue-500"
                                : ""
                            } ${c ? "cursor-pointer" : "cursor-default"}`}
                            onClick={() => c && handleCellClick(h.id, lag, c)}
                          >
                            <div
                              className={`text-sm font-mono font-semibold ${getTextColor(r)}`}
                            >
                              {r != null ? r.toFixed(2) : "\u2014"}
                            </div>
                            {significant && (
                              <div className="text-[10px] text-yellow-400 mt-0.5">
                                *
                              </div>
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

          <DetailPanel
            selected={selected}
            showHelp={showHelp}
            onToggleHelp={() => setShowHelp(!showHelp)}
          />
        </div>
      )}

      <div className="mt-3 text-[10px] text-gray-600">
        * Statistically significant (p &lt; 0.05). Click cells for details.
      </div>
    </div>
  );
}
