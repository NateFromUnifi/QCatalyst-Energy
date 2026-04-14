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
import { format, parseISO, differenceInDays } from "date-fns";
import type { DailyPrice, WeeklyFundamental, DailySentiment } from "@/types/database";

interface PriceChartProps {
  prices: DailyPrice[];
  fundamentals: WeeklyFundamental[];
  sentiment: DailySentiment[];
}

type Overlay = "wti" | "brent" | "wcs" | "sentiment" | "inventory" | "spread" | "dxy";

const PRICE_LINES: { key: Overlay; label: string; color: string }[] = [
  { key: "wti", label: "WTI", color: "#eab308" },
  { key: "brent", label: "Brent", color: "#60a5fa" },
  { key: "wcs", label: "WCS", color: "#f472b6" },
];

const INDICATOR_OVERLAYS: { key: Overlay; label: string; color: string }[] = [
  { key: "sentiment", label: "Sentiment", color: "#a78bfa" },
  { key: "inventory", label: "Inventory \u0394", color: "#f97316" },
  { key: "spread", label: "WCS-WTI Spread", color: "#14b8a6" },
  { key: "dxy", label: "DXY", color: "#34d399" },
];

export default function PriceChart({
  prices,
  fundamentals,
  sentiment,
}: PriceChartProps) {
  const [activeOverlays, setActiveOverlays] = useState<Set<Overlay>>(new Set(["wti"]));

  const toggleOverlay = (overlay: Overlay) => {
    setActiveOverlays((prev) => {
      const next = new Set(prev);
      if (next.has(overlay)) next.delete(overlay);
      else next.add(overlay);
      return next;
    });
  };

  // Find the latest date where all 3 benchmarks have data
  const { latestCommonDate, dataLagDays, latestDates } = useMemo(() => {
    let latestWti: string | null = null;
    let latestBrent: string | null = null;
    let latestWcs: string | null = null;

    for (let i = prices.length - 1; i >= 0; i--) {
      if (!latestWti && prices[i].wti_spot != null) latestWti = prices[i].date;
      if (!latestBrent && prices[i].brent_spot != null) latestBrent = prices[i].date;
      if (!latestWcs && prices[i].wcs_spot != null) latestWcs = prices[i].date;
      if (latestWti && latestBrent && latestWcs) break;
    }

    const dates = [latestWti, latestBrent, latestWcs].filter(Boolean) as string[];
    const commonDate = dates.length > 0 ? dates.sort()[0] : null; // earliest of the latest = common cutoff
    const today = new Date().toISOString().split("T")[0];
    const lag = commonDate ? differenceInDays(parseISO(today), parseISO(commonDate)) : null;

    return {
      latestCommonDate: commonDate,
      dataLagDays: lag,
      latestDates: { wti: latestWti, brent: latestBrent, wcs: latestWcs },
    };
  }, [prices]);

  // Merge all data sources by date, trimmed to common date
  const chartData = useMemo(() => {
    const byDate: Record<string, Record<string, number | null>> = {};

    for (const p of prices) {
      if (latestCommonDate && p.date > latestCommonDate) continue;
      byDate[p.date] = {
        ...byDate[p.date],
        wti: p.wti_spot,
        brent: p.brent_spot,
        wcs: p.wcs_spot,
        spread: p.wcs_wti_spread,
        dxy: p.dxy_index,
      };
    }

    for (const f of fundamentals) {
      const d = f.week_ending;
      if (latestCommonDate && d > latestCommonDate) continue;
      byDate[d] = {
        ...byDate[d],
        inventoryDelta: f.inventory_delta != null ? f.inventory_delta / 1000 : null,
      };
    }

    for (const s of sentiment) {
      if (latestCommonDate && s.date > latestCommonDate) continue;
      byDate[s.date] = {
        ...byDate[s.date],
        sentiment: s.sentiment_score,
      };
    }

    return Object.entries(byDate)
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [prices, fundamentals, sentiment, latestCommonDate]);

  if (chartData.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-8 text-center text-gray-500">
        No price data available yet. Run the pipeline to start collecting data.
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4">
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Crude Oil Prices
            <span className="text-xs font-normal text-gray-500 ml-2">Historical daily close</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {PRICE_LINES.map(({ key, label, color }) => (
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
            <span className="border-l border-gray-700 mx-1" />
            {INDICATOR_OVERLAYS.map(({ key, label, color }) => (
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
              if (name === "wti" || name === "brent" || name === "wcs") {
                const labels: Record<string, string> = { wti: "WTI", brent: "Brent", wcs: "WCS" };
                return [`$${v.toFixed(2)}`, labels[String(name)] ?? String(name)];
              }
              if (name === "spread") return [`$${v.toFixed(2)}`, "WCS-WTI Spread"];
              if (name === "sentiment") return [v.toFixed(1), "Sentiment"];
              if (name === "inventoryDelta") return [`${v.toFixed(1)}M bbl`, "Inv. Delta"];
              if (name === "dxy") return [v.toFixed(2), "DXY"];
              return [String(value), String(name)];
            }}
          />
          <Legend />

          {/* Price lines (toggleable) */}
          {activeOverlays.has("wti") && (
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="wti"
              stroke="#eab308"
              strokeWidth={2}
              dot={false}
              name="WTI"
              connectNulls
              animationDuration={800}
              animationEasing="ease-in-out"
            />
          )}
          {activeOverlays.has("brent") && (
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="brent"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
              name="Brent"
              connectNulls
              animationDuration={800}
              animationEasing="ease-in-out"
            />
          )}
          {activeOverlays.has("wcs") && (
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="wcs"
              stroke="#f472b6"
              strokeWidth={2}
              dot={false}
              name="WCS"
              connectNulls
              animationDuration={800}
              animationEasing="ease-in-out"
            />
          )}

          {/* Indicator overlays */}
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
              animationDuration={800}
              animationEasing="ease-in-out"
            />
          )}
          {activeOverlays.has("inventory") && (
            <Bar
              yAxisId="secondary"
              dataKey="inventoryDelta"
              fill="#f97316"
              opacity={0.6}
              name="Inv. Delta (M bbl)"
              animationDuration={800}
              animationEasing="ease-in-out"
            />
          )}
          {activeOverlays.has("spread") && (
            <Line
              yAxisId="secondary"
              type="monotone"
              dataKey="spread"
              stroke="#14b8a6"
              strokeWidth={1.5}
              dot={false}
              name="WCS-WTI"
              connectNulls
              animationDuration={800}
              animationEasing="ease-in-out"
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
              animationDuration={800}
              animationEasing="ease-in-out"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Data freshness notice */}
      <div className="mt-3 text-xs text-gray-400 bg-gray-900/50 rounded px-3 py-2 flex flex-wrap gap-x-4 gap-y-1">
        <span>
          Data through {latestCommonDate ? format(parseISO(latestCommonDate), "MMM d, yyyy") : "\u2014"}
          {dataLagDays != null && dataLagDays > 0 && (
            <span className="text-gray-500"> ({dataLagDays}d behind today)</span>
          )}
        </span>
        <span className="text-gray-600">|</span>
        <span className="text-gray-500">
          Latest: WTI {latestDates.wti ?? "\u2014"}
          {" \u00B7 "}
          Brent {latestDates.brent ?? "\u2014"}
          {" \u00B7 "}
          WCS {latestDates.wcs ?? "\u2014"}
        </span>
        <span className="text-gray-600">|</span>
        <span className="text-gray-500">
          Prices are daily closes from EIA and OilPriceAPI, typically delayed 1\u20132 business days.
        </span>
      </div>
    </div>
  );
}
