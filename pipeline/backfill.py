"""
QCatalyst Energy — Historical Data Backfill

One-time script to load 2+ years of historical data into Supabase.
Backfills FRED daily prices and EIA weekly fundamentals.

Sentiment cannot be backfilled (no historical RSS headlines).

Usage:
  python pipeline/backfill.py                    # backfill last 2 years
  python pipeline/backfill.py --start 2022-01-01 # custom start date
"""

import sys
import os
import argparse
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

from fetchers.fred import fetch_fred_history
from fetchers.eia import fetch_eia_history
from db import upsert_daily_prices, upsert_weekly_fundamentals

BATCH_SIZE = 50


def backfill(start_date: str, end_date: str):
    """Backfill historical data from start_date to end_date."""
    print(f"\n{'='*60}")
    print(f"QCatalyst Energy — Historical Backfill")
    print(f"Range: {start_date} to {end_date}")
    print(f"{'='*60}\n")

    # Step 1: FRED daily prices
    print("[1/2] Fetching FRED historical prices...")
    print("  This may take a moment for large date ranges...")
    try:
        fred_data = fetch_fred_history(start_date, end_date)
        price_rows = [{"date": date, **values} for date, values in fred_data.items()]
        price_rows.sort(key=lambda r: r["date"])

        total = 0
        # Batch upserts to avoid payload size limits
        for i in range(0, len(price_rows), BATCH_SIZE):
            batch = price_rows[i : i + BATCH_SIZE]
            count = upsert_daily_prices(batch)
            total += count
            print(f"  -> Batch {i//BATCH_SIZE + 1}: upserted {count} rows "
                  f"({batch[0]['date']} to {batch[-1]['date']})")

        print(f"  -> Total: {total} daily price rows\n")
    except Exception as e:
        print(f"  ERROR: {e}\n")
        raise

    # Step 2: EIA weekly fundamentals
    print("[2/2] Fetching EIA historical weekly data...")
    try:
        eia_data = fetch_eia_history(start_date, end_date)

        total = 0
        for i in range(0, len(eia_data), BATCH_SIZE):
            batch = eia_data[i : i + BATCH_SIZE]
            count = upsert_weekly_fundamentals(batch)
            total += count
            print(f"  -> Batch {i//BATCH_SIZE + 1}: upserted {count} rows "
                  f"({batch[0]['week_ending']} to {batch[-1]['week_ending']})")

        print(f"  -> Total: {total} weekly fundamental rows\n")
    except Exception as e:
        print(f"  ERROR: {e}\n")
        raise

    print(f"{'='*60}")
    print("BACKFILL COMPLETE")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backfill historical energy data")
    parser.add_argument("--start", type=str,
                        default=(datetime.now() - timedelta(days=730)).strftime("%Y-%m-%d"),
                        help="Start date (YYYY-MM-DD, default: 2 years ago)")
    parser.add_argument("--end", type=str,
                        default=datetime.now().strftime("%Y-%m-%d"),
                        help="End date (YYYY-MM-DD, default: today)")
    args = parser.parse_args()

    backfill(args.start, args.end)
