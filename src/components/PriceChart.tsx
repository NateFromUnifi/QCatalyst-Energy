"use client";

import { useState, useMemo } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { DailyPrice, WeeklyFundamental, DailySentiment } from "@/types/database";

interface PriceChartProps {
  prices: DailyPrice[];
  fundamentals: WeeklyFundamental[];
  sentiment: DailySentiment[];
}

type Overlay = "sentiment" | "inventory" | "spread" | "dxy" | "brent";

const OVERLAY_CONFIG: { key: Overlay; label: string; color: string }[] = [
  { key: "sentiment", label: "Sentiment", color: "#a78bfa" },
  { key: "inventory", label: "Inventory \u0394", color: "#f97316" },
  { key: "spread", label: "WCS-WTI Spread", color: "#f472b6" },
  { key: "dxy", label: "DXY", color: "#34d399" },
  { key: "brent", label: "Brent", color: "#60a5fa" },
];

export default function PriceChart({
  prices,
  fundamentals,
  sentiment,
}: PriceChartProps) {
  const [activeOverlays, setActiveOverlays] = useState<Set<Overlay>>(new Set());

  const toggleOverlay = (overlay: Overlay) => {
    setActiveOverlays((prev) => {
      const next = new Set(prev);
      if (next.has(overlay)) next.delete(overlay);
      else next.add(overlay);
      return next;
    });
  };

  // Merge all data sources by date
  const chartData = useMemo(() => {
    const byDate: Record<string, Record<string, number | null>> = {};

    for (const p of prices) {
      byDate[p.date] = {
        ...byDate[p.date],
        wti: p.wti_spot,
        brent: p.brent_spot,
        spread: p.wcs_wti_spread,
        dxy: p.dxy_index,
      };
    }

    for (const f of fundamentals) {
      const d = f.week_ending;
      byDate[d] = {
        ...byDate[d],
        inventoryDelta: f.inventory_delta != null ? f.inventory_delta / 1000 : null,
      };
    }

    for (const s of sentiment) {
      byDate[s.date] = {
        ...byDate[s.date],
        sentiment: s.sentiment_score,
      };
    }

    return Object.entries(byDate)
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [prices, fundamentals, sentiment]);

  if (chartData.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-8 text-center text-gray-500">
        No price data available yet. Run the pipeline to start collecting data.
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">WTI Crude Oil Price</h2>
        <div className="flex flex-wrap gap-2">
          {OVERLAY_CONFIG.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => toggleOverlay(key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-colors ${
                activeOverlays.has(key)
                  ? "border-gray-500 bg-gray-700/50 text-gray-200"
                  : "border-gray-700 text-gray-500 hover:text-gray-300"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: activeOverlays.has(key) ? color : "#4b5563" }}
              />
              {label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            tickFormatter={(d) => {
              try { return format(parseISO(d), "MMM d"); }
              catch { return d; }
            }}
            minTickGap={40}
          />
          <YAxis
            yAxisId="price"
            stroke="#6b7280"
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            domain={["auto", "auto"]}
            tickFormatter={(v) => `$${v}`}
          />
          {(activeOverlays.has("sentiment") ||
            activeOverlays.has("inventory") ||
            activeOverlays.has("spread") ||
            activeOverlays.has("dxy")) && (
            <YAxis
              yAxisId="secondary"
              orientation="right"
              stroke="#6b7280"
              tick={{ fill: "#9ca3af", fontSize: 11 }}
            />
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelFormatter={(d) => {
              try { return format(parseISO(d as string), "MMM d, yyyy"); }
              catch { return d as string; }
            }}
            formatter={(value, name) => {
              const v = Number(value);
              if (isNaN(v)) return [String(value), String(name)];
              if (name === "wti" || name === "brent") return [`$${v.toFixed(2)}`, name === "wti" ? "WTI" : "Brent"];
              if (name === "spread") return [`$${v.toFixed(2)}`, "WCS-WTI"];
              if (name === "sentiment") return [v.toFixed(1), "Sentiment"];
              if (name === "inventoryDelta") return [`${v.toFixed(1)}M bbl`, "Inv. Delta"];
              if (name === "dxy") return [v.toFixed(2), "DXY"];
              return [String(value), String(name)];
            }}
          />
          <Legend />

          {/* Primary: WTI price */}
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="wti"
            stroke="#eab308"
            strokeWidth={2}
            dot={false}
            name="WTI"
            connectNulls
          />

          {/* Overlays */}
          {activeOverlays.has("brent") && (
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="brent"
              stroke="#60a5fa"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              name="Brent"
              connectNulls
            />
          )}
          {activeOverlays.has("sentiment") && (
            <Line
              yAxisId="secondary"
              type="monotone"
              dataKey="sentiment"
              stroke="#a78bfa"
              strokeWidth={1.5}
              dot={false}
              name="Sentiment"
              connectNulls
            />
          )}
          {activeOverlays.has("inventory") && (
            <Bar
              yAxisId="secondary"
              dataKey="inventoryDelta"
              fill="#f97316"
              opacity={0.6}
              name="Inv. Delta (M bbl)"
            />
          )}
          {activeOverlays.has("spread") && (
            <Line
              yAxisId="secondary"
              type="monotone"
              dataKey="spread"
              stroke="#f472b6"
              strokeWidth={1.5}
              dot={false}
              name="WCS-WTI"
              connectNulls
            />
          )}
          {activeOverlays.has("dxy") && (
            <Line
              yAxisId="secondary"
              type="monotone"
              dataKey="dxy"
              stroke="#34d399"
              strokeWidth={1.5}
              dot={false}
              name="DXY"
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
