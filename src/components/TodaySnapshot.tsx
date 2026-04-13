"use client";

import type { DailyPrice, WeeklyFundamental, DailySentiment } from "@/types/database";

interface TodaySnapshotProps {
  price: DailyPrice | null;
  prevPrice: DailyPrice | null;
  fundamental: WeeklyFundamental | null;
  sentiment: DailySentiment | null;
}

function PriceCard({
  label,
  value,
  prevValue,
  prefix = "$",
  decimals = 2,
}: {
  label: string;
  value: number | null;
  prevValue?: number | null;
  prefix?: string;
  decimals?: number;
}) {
  const change =
    value != null && prevValue != null && prevValue !== 0
      ? ((value - prevValue) / prevValue) * 100
      : null;

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
      <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="text-xl font-semibold font-mono">
        {value != null ? `${prefix}${value.toFixed(decimals)}` : "—"}
      </div>
      {change != null && (
        <div
          className={`text-sm font-mono mt-0.5 ${
            change >= 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {change >= 0 ? "+" : ""}
          {change.toFixed(2)}%
        </div>
      )}
    </div>
  );
}

export default function TodaySnapshot({
  price,
  prevPrice,
  fundamental,
  sentiment,
}: TodaySnapshotProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <PriceCard
        label="WTI"
        value={price?.wti_spot ?? null}
        prevValue={prevPrice?.wti_spot ?? null}
      />
      <PriceCard
        label="Brent"
        value={price?.brent_spot ?? null}
        prevValue={prevPrice?.brent_spot ?? null}
      />
      <PriceCard
        label="WCS"
        value={price?.wcs_spot ?? null}
        prevValue={prevPrice?.wcs_spot ?? null}
      />
      <PriceCard
        label="WCS-WTI Spread"
        value={price?.wcs_wti_spread ?? null}
        prefix="$"
      />
      <PriceCard
        label="DXY"
        value={price?.dxy_index ?? null}
        prevValue={prevPrice?.dxy_index ?? null}
        prefix=""
        decimals={2}
      />
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
          Sentiment
        </div>
        <div className="text-xl font-semibold font-mono">
          {sentiment?.sentiment_score != null
            ? `${sentiment.sentiment_score}`
            : "—"}
          <span className="text-sm text-gray-500"> / 10</span>
        </div>
      </div>
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
          Inventory Delta
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
            "—"
          )}
        </div>
      </div>
    </div>
  );
}
