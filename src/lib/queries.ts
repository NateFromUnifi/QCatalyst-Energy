import { supabase } from "./supabase";
import { subDays, subMonths, subYears } from "date-fns";
import type {
  DailyPrice,
  WeeklyFundamental,
  DailySentiment,
  Correlation,
  TimeRange,
} from "@/types/database";

function getStartDate(range: TimeRange): string | null {
  const now = new Date();
  switch (range) {
    case "30d":
      return subDays(now, 30).toISOString().split("T")[0];
    case "90d":
      return subDays(now, 90).toISOString().split("T")[0];
    case "180d":
      return subMonths(now, 6).toISOString().split("T")[0];
    case "1y":
      return subYears(now, 1).toISOString().split("T")[0];
    case "all":
      return null;
  }
}

export async function fetchDailyPrices(
  range: TimeRange
): Promise<DailyPrice[]> {
  let query = supabase
    .from("daily_prices")
    .select("*")
    .order("date", { ascending: true });

  const start = getStartDate(range);
  if (start) query = query.gte("date", start);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchWeeklyFundamentals(
  range: TimeRange
): Promise<WeeklyFundamental[]> {
  let query = supabase
    .from("weekly_fundamentals")
    .select("*")
    .order("week_ending", { ascending: true });

  const start = getStartDate(range);
  if (start) query = query.gte("week_ending", start);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchDailySentiment(
  range: TimeRange
): Promise<DailySentiment[]> {
  let query = supabase
    .from("daily_sentiment")
    .select("*")
    .order("date", { ascending: true });

  const start = getStartDate(range);
  if (start) query = query.gte("date", start);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchCorrelations(): Promise<Correlation[]> {
  // Get the most recent computation date and return all correlations for it
  const { data, error } = await supabase
    .from("correlations")
    .select("*")
    .order("computed_date", { ascending: false })
    .limit(100);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Filter to only the latest computed_date
  const latestDate = data[0].computed_date;
  return data.filter((c) => c.computed_date === latestDate);
}

export async function fetchLatestSnapshot(): Promise<{
  price: DailyPrice | null;
  fundamental: WeeklyFundamental | null;
  sentiment: DailySentiment | null;
}> {
  const [priceRes, fundRes, sentRes] = await Promise.all([
    supabase
      .from("daily_prices")
      .select("*")
      .order("date", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("weekly_fundamentals")
      .select("*")
      .order("week_ending", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("daily_sentiment")
      .select("*")
      .order("date", { ascending: false })
      .limit(1)
      .single(),
  ]);

  return {
    price: priceRes.data,
    fundamental: fundRes.data,
    sentiment: sentRes.data,
  };
}
