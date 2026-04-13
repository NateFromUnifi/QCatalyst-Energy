// TypeScript types matching the Supabase schema

export interface DailyPrice {
  id: number;
  date: string; // ISO date string YYYY-MM-DD
  wti_spot: number | null;
  brent_spot: number | null;
  wcs_spot: number | null;
  wcs_wti_spread: number | null;
  dxy_index: number | null;
  created_at: string;
}

export interface WeeklyFundamental {
  id: number;
  week_ending: string; // ISO date string YYYY-MM-DD
  crude_inventories: number | null;
  inventory_delta: number | null;
  crude_production: number | null;
  crude_imports: number | null;
  cushing_stocks: number | null;
  us_rig_count: number | null;
  cftc_net_long: number | null;
  created_at: string;
}

export interface DailySentiment {
  id: number;
  date: string; // ISO date string YYYY-MM-DD
  sentiment_score: number | null;
  headline_count: number | null;
  headlines_raw: HeadlineScore[] | null;
  model_used: string | null;
  created_at: string;
}

export interface HeadlineScore {
  headline: string;
  score: number;
  reason: string;
}

export interface Correlation {
  id: number;
  computed_date: string;
  hypothesis: HypothesisId;
  indicator: string;
  target: string;
  lag_days: number;
  window_days: number;
  pearson_r: number | null;
  p_value: number | null;
  sample_size: number | null;
  created_at: string;
}

// Hypothesis identifiers used throughout the app
export type HypothesisId =
  | "H1_inventory_price"
  | "H2_sentiment_price"
  | "H3_dollar_oil"
  | "H4_wcs_spread";

// Metadata for displaying hypothesis cards on the dashboard
export interface HypothesisMeta {
  id: HypothesisId;
  title: string;
  subtitle: string;
  description: string;
  indicator: string;
  target: string;
}

export const HYPOTHESES: HypothesisMeta[] = [
  {
    id: "H1_inventory_price",
    title: "H1: Inventory-Price",
    subtitle: "Do oil storage levels move prices?",
    description:
      "Every Wednesday, the US government reports how much crude oil is sitting in storage tanks nationwide. When inventories build up (more oil going into storage than coming out), it signals oversupply — and prices tend to drop. When inventories draw down, it signals tightening supply — and prices tend to rise. This is the most fundamental relationship in oil markets, and the single most watched weekly data point by energy traders.",
    indicator: "inventory_delta",
    target: "wti_weekly_change",
  },
  {
    id: "H2_sentiment_price",
    title: "H2: Sentiment-Price Lead",
    subtitle: "Can news headlines predict tomorrow's price?",
    description:
      "Each day, we pull oil-related headlines from industry news sites and use an AI model to score the overall mood from 1 (extremely bearish) to 10 (extremely bullish). Then we check: does today's sentiment score predict where the price goes tomorrow, or the day after? If it does, the market is slow to process public information. If not, prices already reflect the news instantly. Either answer tells us something about market efficiency.",
    indicator: "sentiment_score",
    target: "wti_daily_change",
  },
  {
    id: "H3_dollar_oil",
    title: "H3: Dollar-Oil Inverse",
    subtitle: "Does a stronger dollar push oil prices down?",
    description:
      "Oil is bought and sold globally in US dollars. When the dollar strengthens, every barrel becomes more expensive for buyers using euros, yen, or other currencies — which suppresses global demand and pushes prices down. When the dollar weakens, oil becomes cheaper for the rest of the world, boosting demand. This connects oil prices to central bank policy, interest rates, and the broader global economy.",
    indicator: "dxy_daily_change",
    target: "wti_daily_change",
  },
  {
    id: "H4_wcs_spread",
    title: "H4: WCS Spread Dynamics",
    subtitle: "Why does Canadian oil trade at a discount?",
    description:
      "Alberta produces heavy crude (WCS) that must travel through pipelines to reach refineries and export terminals. When pipelines run near full capacity, Alberta oil gets trapped — producers accept a steeper discount to find buyers. When capacity frees up, the discount narrows. The Trans Mountain pipeline expansion (TMX), completed in 2024, was designed specifically to narrow this gap by opening a Pacific coast export route. This hypothesis lets you watch infrastructure policy show up directly in pricing data.",
    indicator: "wcs_wti_spread",
    target: "inventory_delta",
  },
];

// Time range options for the dashboard
export type TimeRange = "30d" | "90d" | "180d" | "1y" | "all";
