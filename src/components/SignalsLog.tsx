"use client";

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import type {
  DailyPrice,
  WeeklyFundamental,
  DailySentiment,
  HeadlineScore,
} from "@/types/database";

interface SignalsLogProps {
  prices: DailyPrice[];
  fundamentals: WeeklyFundamental[];
  sentiment: DailySentiment[];
}

interface MergedRow {
  date: string;
  wti: number | null;
  brent: number | null;
  wcs: number | null;
  changePercent: number | null;
  inventoryDelta: number | null;
  sentimentScore: number | null;
  dxy: number | null;
  rigCount: number | null;
  headlines: HeadlineScore[] | null;
}

const PAGE_SIZE = 15;

export default function SignalsLog({
  prices,
  fundamentals,
  sentiment,
}: SignalsLogProps) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    // Build lookups
    const fundByDate: Record<string, WeeklyFundamental> = {};
    for (const f of fundamentals) {
      fundByDate[f.week_ending] = f;
    }

    const sentByDate: Record<string, DailySentiment> = {};
    for (const s of sentiment) {
      sentByDate[s.date] = s;
    }

    const priceByDate: Record<string, DailyPrice> = {};
    for (const p of prices) {
      priceByDate[p.date] = p;
    }

    // Build merged rows from prices (sorted desc)
    const sortedPrices = [...prices].sort((a, b) =>
      b.date.localeCompare(a.date)
    );

    const merged: MergedRow[] = [];
    for (let i = 0; i < sortedPrices.length; i++) {
      const curr = sortedPrices[i];
      const prev = sortedPrices[i + 1];

      const changePercent =
        curr.wti_spot != null &&
        prev?.wti_spot != null &&
        prev.wti_spot !== 0
          ? ((curr.wti_spot - prev.wti_spot) / prev.wti_spot) * 100
          : null;

      const fund = fundByDate[curr.date];
      const sent = sentByDate[curr.date];

      merged.push({
        date: curr.date,
        wti: curr.wti_spot,
        brent: curr.brent_spot,
        wcs: curr.wcs_spot,
        changePercent,
        inventoryDelta: fund?.inventory_delta ?? null,
        sentimentScore: sent?.sentiment_score ?? null,
        dxy: curr.dxy_index,
        rigCount: fund?.us_rig_count ?? null,
        headlines: (sent?.headlines_raw as HeadlineScore[] | null) ?? null,
      });
    }

    return merged;
  }, [prices, fundamentals, sentiment]);

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (rows.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-8 text-center text-gray-500">
        No signal data available yet.
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-semibold">Signals Log</h2>
        <span className="text-[10px] text-gray-500">
          Prices are daily closes, typically delayed 1–2 business days from source
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-700">
              <th className="text-left py-2 pr-4">Date</th>
              <th className="text-right py-2 px-3">WTI</th>
              <th className="text-right py-2 px-3">Brent</th>
              <th className="text-right py-2 px-3">WCS</th>
              <th className="text-right py-2 px-3">{"\u0394"}%</th>
              <th className="text-right py-2 px-3">Inv. {"\u0394"}</th>
              <th className="text-right py-2 px-3">Sent.</th>
              <th className="text-right py-2 px-3">DXY</th>
              <th className="text-right py-2 px-3">Rigs</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <>
                <tr
                  key={row.date}
                  className={`border-b border-gray-800 cursor-pointer hover:bg-gray-700/30 transition-colors ${
                    row.headlines && row.headlines.length > 0 ? "" : "cursor-default"
                  }`}
                  onClick={() =>
                    row.headlines && row.headlines.length > 0
                      ? setExpandedDate(expandedDate === row.date ? null : row.date)
                      : undefined
                  }
                >
                  <td className="py-2 pr-4 font-mono text-gray-300">
                    {(() => {
                      try { return format(parseISO(row.date), "MMM d"); }
                      catch { return row.date; }
                    })()}
                    {row.headlines && row.headlines.length > 0 && (
                      <span className="text-gray-600 ml-1">
                        {expandedDate === row.date ? "\u25BC" : "\u25B6"}
                      </span>
                    )}
                  </td>
                  <td className="text-right py-2 px-3 font-mono">
                    {row.wti != null ? `$${row.wti.toFixed(2)}` : "—"}
                  </td>
                  <td className="text-right py-2 px-3 font-mono text-gray-400">
                    {row.brent != null ? `$${row.brent.toFixed(2)}` : "—"}
                  </td>
                  <td className="text-right py-2 px-3 font-mono text-gray-400">
                    {row.wcs != null ? `$${row.wcs.toFixed(2)}` : "—"}
                  </td>
                  <td
                    className={`text-right py-2 px-3 font-mono ${
                      row.changePercent != null
                        ? row.changePercent >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                        : "text-gray-600"
                    }`}
                  >
                    {row.changePercent != null
                      ? `${row.changePercent >= 0 ? "+" : ""}${row.changePercent.toFixed(2)}`
                      : "—"}
                  </td>
                  <td
                    className={`text-right py-2 px-3 font-mono ${
                      row.inventoryDelta != null
                        ? row.inventoryDelta < 0
                          ? "text-emerald-400"
                          : "text-red-400"
                        : "text-gray-600"
                    }`}
                  >
                    {row.inventoryDelta != null
                      ? `${row.inventoryDelta > 0 ? "+" : ""}${(row.inventoryDelta / 1000).toFixed(1)}M`
                      : "—"}
                  </td>
                  <td className="text-right py-2 px-3 font-mono">
                    {row.sentimentScore != null
                      ? row.sentimentScore.toFixed(1)
                      : "—"}
                  </td>
                  <td className="text-right py-2 px-3 font-mono text-gray-400">
                    {row.dxy != null ? row.dxy.toFixed(2) : "—"}
                  </td>
                  <td className="text-right py-2 px-3 font-mono text-gray-400">
                    {row.rigCount ?? "—"}
                  </td>
                </tr>

                {/* Expanded headline detail */}
                {expandedDate === row.date && row.headlines && (
                  <tr key={`${row.date}-detail`}>
                    <td colSpan={9} className="py-2 px-4 bg-gray-900/50">
                      <div className="text-xs space-y-1.5">
                        <div className="text-gray-400 font-medium mb-2">
                          Headlines scored ({row.headlines.length})
                        </div>
                        {row.headlines.map((h, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 py-1"
                          >
                            <span
                              className={`font-mono font-bold min-w-[1.5rem] text-right ${
                                h.score >= 7
                                  ? "text-emerald-400"
                                  : h.score <= 3
                                    ? "text-red-400"
                                    : "text-gray-400"
                              }`}
                            >
                              {h.score}
                            </span>
                            <span className="text-gray-300">{h.headline}</span>
                            <span className="text-gray-600 ml-auto whitespace-nowrap">
                              {h.reason}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700/50">
          <span className="text-xs text-gray-500">
            {rows.length} rows total
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-600"
            >
              Prev
            </button>
            <span className="px-2 py-1 text-xs text-gray-500">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-600"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
