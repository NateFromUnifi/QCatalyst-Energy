"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  DailyPrice,
  WeeklyFundamental,
  DailySentiment,
  Correlation,
  TimeRange,
} from "@/types/database";
import {
  fetchDailyPrices,
  fetchWeeklyFundamentals,
  fetchDailySentiment,
  fetchCorrelations,
} from "@/lib/queries";
import Header from "@/components/Header";
import TimeRangeSelector from "@/components/TimeRangeSelector";
import TodaySnapshot from "@/components/TodaySnapshot";
import PriceChart from "@/components/PriceChart";
import CorrelationHeatmap from "@/components/CorrelationHeatmap";
import HypothesisCards from "@/components/HypothesisCards";
import SignalsLog from "@/components/SignalsLog";

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("90d");
  const [prices, setPrices] = useState<DailyPrice[]>([]);
  const [fundamentals, setFundamentals] = useState<WeeklyFundamental[]>([]);
  const [sentiment, setSentiment] = useState<DailySentiment[]>([]);
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (range: TimeRange) => {
    setLoading(true);
    setError(null);
    try {
      const [p, f, s, c] = await Promise.all([
        fetchDailyPrices(range),
        fetchWeeklyFundamentals(range),
        fetchDailySentiment(range),
        fetchCorrelations(),
      ]);
      setPrices(p);
      setFundamentals(f);
      setSentiment(s);
      setCorrelations(c);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      setError(message);
      console.error("Data fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(timeRange);
  }, [timeRange, loadData]);

  // Build a "latest snapshot" by scanning backward for the most recent
  // non-null value per field (data lands on different dates per source)
  const { latestPrice, fieldDates } = useMemo(() => {
    if (prices.length === 0) return { latestPrice: null, fieldDates: {} as Record<string, string> };
    const snapshot: Partial<DailyPrice> = { date: prices[prices.length - 1].date };
    const dates: Record<string, string> = {};
    const fields = ["wti_spot", "brent_spot", "wcs_spot", "wcs_wti_spread", "dxy_index"] as const;
    for (const field of fields) {
      for (let i = prices.length - 1; i >= 0; i--) {
        if (prices[i][field] != null) {
          (snapshot as Record<string, unknown>)[field] = prices[i][field];
          dates[field] = prices[i].date;
          break;
        }
      }
    }
    return { latestPrice: snapshot as DailyPrice, fieldDates: dates };
  }, [prices]);

  // "Previous" price = first non-null value in the selected range
  // so the % change reflects the full timeframe movement
  const rangeStartPrice = useMemo(() => {
    if (prices.length < 2) return null;
    const snapshot: Partial<DailyPrice> = {};
    const fields = ["wti_spot", "brent_spot", "wcs_spot", "dxy_index"] as const;
    for (const field of fields) {
      for (let i = 0; i < prices.length; i++) {
        if (prices[i][field] != null) {
          (snapshot as Record<string, unknown>)[field] = prices[i][field];
          break;
        }
      }
    }
    return snapshot as DailyPrice;
  }, [prices]);

  const latestFundamental =
    fundamentals.length > 0 ? fundamentals[fundamentals.length - 1] : null;
  const latestSentiment =
    sentiment.length > 0 ? sentiment[sentiment.length - 1] : null;

  const lastUpdated = latestPrice?.date ?? null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header lastUpdated={lastUpdated} />

      <main className="flex-1 px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Time range + loading state */}
        <div className="flex items-center justify-between">
          <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
          {loading && (
            <span className="text-xs text-gray-500 animate-pulse">
              Loading data...
            </span>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 text-sm text-red-300">
            {error}
            {error.includes("supabase") && (
              <span className="block text-xs text-red-400 mt-1">
                Make sure your Supabase URL and anon key are set in .env.local
              </span>
            )}
          </div>
        )}

        {/* Latest available data snapshot */}
        <TodaySnapshot
          price={latestPrice}
          rangeStartPrice={rangeStartPrice}
          fundamental={latestFundamental}
          sentiment={latestSentiment}
          fieldDates={fieldDates}
          timeRange={timeRange}
        />

        {/* Price chart */}
        <PriceChart
          prices={prices}
          fundamentals={fundamentals}
          sentiment={sentiment}
        />

        {/* Hypothesis cards */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Hypotheses Under Test</h2>
          <HypothesisCards correlations={correlations} />
        </div>

        {/* Correlation heatmap */}
        <CorrelationHeatmap correlations={correlations} />

        {/* Signals log */}
        <SignalsLog
          prices={prices}
          fundamentals={fundamentals}
          sentiment={sentiment}
        />

        {/* Data health footer */}
        <footer className="border-t border-gray-800 pt-4 pb-8">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
            <span>Price rows: {prices.length}</span>
            <span>Fundamental rows: {fundamentals.length}</span>
            <span>Sentiment rows: {sentiment.length}</span>
            <span>Correlation entries: {correlations.length}</span>
            {lastUpdated && <span>Most recent data date: {lastUpdated}</span>}
            <span>Prices are daily closes, delayed 1–2 business days</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
