"use client";

import { useState, useEffect, useCallback } from "react";
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

  const latestPrice = prices.length > 0 ? prices[prices.length - 1] : null;
  const prevPrice = prices.length > 1 ? prices[prices.length - 2] : null;
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

        {/* Today's snapshot */}
        <TodaySnapshot
          price={latestPrice}
          prevPrice={prevPrice}
          fundamental={latestFundamental}
          sentiment={latestSentiment}
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
            <span>Days of price data: {prices.length}</span>
            <span>Weekly fundamental rows: {fundamentals.length}</span>
            <span>Sentiment rows: {sentiment.length}</span>
            <span>Correlation entries: {correlations.length}</span>
            {lastUpdated && <span>Latest data: {lastUpdated}</span>}
          </div>
        </footer>
      </main>
    </div>
  );
}
