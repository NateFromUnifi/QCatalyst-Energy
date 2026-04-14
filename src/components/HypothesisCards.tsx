"use client";

import { useMemo } from "react";
import { HYPOTHESES } from "@/types/database";
import type { Correlation } from "@/types/database";

interface HypothesisCardsProps {
  correlations: Correlation[];
}

function getSignificanceBadge(
  r: number | null,
  p: number | null,
  n: number | null
) {
  if (r == null || n == null || n < 10) {
    return {
      label: "Insufficient data",
      className: "bg-gray-700 text-gray-400",
    };
  }
  if (p != null && p < 0.05) {
    return {
      label: "Significant",
      className: "bg-emerald-900/60 text-emerald-300",
    };
  }
  return {
    label: "Not significant",
    className: "bg-yellow-900/40 text-yellow-400",
  };
}

function getCorrelationLabel(r: number | null): string {
  if (r == null) return "—";
  const abs = Math.abs(r);
  let strength = "";
  if (abs < 0.1) strength = "Negligible";
  else if (abs < 0.3) strength = "Weak";
  else if (abs < 0.5) strength = "Moderate";
  else if (abs < 0.7) strength = "Strong";
  else strength = "Very strong";

  const direction = r > 0 ? "positive" : "negative";
  return `${strength} ${direction}`;
}

export default function HypothesisCards({
  correlations,
}: HypothesisCardsProps) {
  // Get the best (most significant) correlation for each hypothesis at 90d window
  const bestByHypothesis = useMemo(() => {
    const map: Record<string, Correlation> = {};
    for (const c of correlations) {
      if (c.window_days !== 90) continue;
      const existing = map[c.hypothesis];
      if (
        !existing ||
        (c.p_value != null &&
          (existing.p_value == null || c.p_value < existing.p_value))
      ) {
        map[c.hypothesis] = c;
      }
    }
    return map;
  }, [correlations]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {HYPOTHESES.map((h) => {
        const best = bestByHypothesis[h.id];
        const r = best?.pearson_r ?? null;
        const p = best?.p_value ?? null;
        const n = best?.sample_size ?? null;
        const badge = getSignificanceBadge(r, p, n);

        return (
          <div
            key={h.id}
            className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-5"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-100">{h.title}</h3>
                <p className="text-sm text-blue-400">{h.subtitle}</p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${badge.className}`}
              >
                {badge.label}
              </span>
            </div>

            <p className="text-sm text-gray-400 leading-relaxed mb-3">
              {h.description}
            </p>

            <div className="flex items-center gap-4 pt-2 border-t border-gray-700/50">
              <div>
                <span className="text-xs text-gray-500">Pearson R</span>
                <div className="text-lg font-mono font-semibold">
                  {r != null ? r.toFixed(3) : "\u2014"}
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Strength</span>
                <div className="text-sm text-gray-300">
                  {getCorrelationLabel(r)}
                </div>
              </div>
              {n != null && (
                <div>
                  <span className="text-xs text-gray-500">Samples</span>
                  <div className="text-sm text-gray-300">{n}</div>
                </div>
              )}
              {best?.computed_date && (
                <div className="ml-auto">
                  <span className="text-xs text-gray-500">Computed</span>
                  <div className="text-sm text-gray-500">{best.computed_date}</div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
