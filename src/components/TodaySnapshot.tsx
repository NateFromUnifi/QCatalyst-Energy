"use client";

import { format, parseISO } from "date-fns";
import type { DailyPrice, WeeklyFundamental, DailySentiment, TimeRange } from "@/types/database";

const RANGE_LABELS: Record<TimeRange, string> = {
  "30d": "30D",
  "90d": "90D",
  "180d": "6M",
  "1y": "1Y",
  "all": "All",
};

interface TodaySnapshotProps {
  price: DailyPrice | null;
  rangeStartPrice: DailyPrice | null;
  fundamental: WeeklyFundamental | null;
  sentiment: DailySentiment | null;
  fieldDates: Record<string, string>;
  timeRange: TimeRange;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  try {
    return format(parseISO(dateStr), "MMM d");
  } catch {
    return dateStr;
  }
}

function PriceCard({
  label,
  value,
  prevValue,
  prefix = "$",
  decimals = 2,
  date,
  priceType,
  rangeLabel,
}: {
  label: string;
  value: number | null;
  prevValue?: number | null;
  prefix?: string;
  decimals?: number;
  date?: string;
  priceType?: string;
  rangeLabel?: string;
}) {
  const change =
    value != null && prevValue != null && prevValue !== 0
      ? ((value - prevValue) / prevValue) * 100
      : null;

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          {label}
        </span>
        {priceType && (
          <span className="text-[10px] text-gray-600 uppercase">{priceType}</span>
        )}
      </div>
      <div className="text-xl font-semibold font-mono">
        {value != null ? `${prefix}${value.toFixed(decimals)}` : "\u2014"}
      </div>
      <div className="flex items-center justify-between mt-0.5">
        {change != null ? (
          <span
            className={`text-sm font-mono ${
              change >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)}%
            {rangeLabel && (
              <span className="text-[10px] text-gray-500 ml-1">{rangeLabel}</span>
            )}
          </span>
        ) : (
          <span />
        )}
        {date && (
          <span className="text-[10px] text-gray-500">{formatDate(date)}</span>
        )}
      </div>
    </div>
  );
}

export default function TodaySnapshot({
  price,
  rangeStartPrice,
  fundamental,
  sentiment,
  fieldDates,
  timeRange,
}: TodaySnapshotProps) {
  const rl = RANGE_LABELS[timeRange];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <PriceCard
        label="WTI"
        value={price?.wti_spot ?? null}
        prevValue={rangeStartPrice?.wti_spot ?? null}
        date={fieldDates.wti_spot}
        priceType="daily close"
        rangeLabel={rl}
      />
      <PriceCard
        label="Brent"
        value={price?.brent_spot ?? null}
        prevValue={rangeStartPrice?.brent_spot ?? null}
        date={fieldDates.brent_spot}
        priceType="daily close"
        rangeLabel={rl}
      />
      <PriceCard
        label="WCS"
        value={price?.wcs_spot ?? null}
        prevValue={rangeStartPrice?.wcs_spot ?? null}
        date={fieldDates.wcs_spot}
        priceType="daily close"
        rangeLabel={rl}
      />
      <PriceCard
        label="WCS-WTI Spread"
        value={price?.wcs_wti_spread ?? null}
        prefix="$"
        date={fieldDates.wcs_wti_spread}
      />
      <PriceCard
        label="DXY"
        value={price?.dxy_index ?? null}
        prevValue={rangeStartPrice?.dxy_index ?? null}
        prefix=""
        decimals={2}
        date={fieldDates.dxy_index}
        priceType="daily close"
        rangeLabel={rl}
      />
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400 uppercase tracking-wide">
            Sentiment
          </span>
          <span className="text-[10px] text-gray-600 uppercase">daily avg</span>
        </div>
        <div className="text-xl font-semibold font-mono">
          {sentiment?.sentiment_score != null
            ? `${sentiment.sentiment_score}`
            : "\u2014"}
          <span className="text-sm text-gray-500"> / 10</span>
        </div>
        <div className="flex items-center justify-end mt-0.5">
          {sentiment?.date && (
            <span className="text-[10px] text-gray-500">
              {formatDate(sentiment.date)}
            </span>
          )}
        </div>
      </div>
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400 uppercase tracking-wide">
            Inventory Delta
          </span>
          <span className="text-[10px] text-gray-600 uppercase">weekly</span>
        </div>
        <div className="text-xl font-semibold font-mono">
          {fundamental?.inventory_delta != null ? (
            <span
              className={
                fundamental.inventory_delta < 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }
            >
              {fundamental.inventory_delta > 0 ? "+" : ""}
              {(fundamental.inventory_delta / 1000).toFixed(1)}M
            </span>
          ) : (
            "\u2014"
          )}
        </div>
        <div className="flex items-center justify-end mt-0.5">
          {fundamental?.week_ending && (
            <span className="text-[10px] text-gray-500">
              w/e {formatDate(fundamental.week_ending)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
