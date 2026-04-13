"""
QCatalyst Energy — Daily Pipeline Orchestrator

Fetches data from all sources, scores sentiment, computes correlations,
and writes everything to Supabase.

Usage:
  python pipeline/main.py              # full daily run
  python pipeline/main.py --skip-sentiment  # skip LLM scoring (for testing)

Environment variables required:
  FRED_API_KEY, EIA_API_KEY, GROQ_API_KEY, OILPRICE_API_KEY,
  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""

import sys
import os
import argparse
from datetime import datetime

# Add project root to path so imports work from any cwd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

from fetchers.oilprice import fetch_oil_prices
from fetchers.fred import fetch_fred_prices, fetch_fred_dxy
from fetchers.eia import fetch_eia_weekly
from fetchers.sentiment import fetch_and_score_sentiment
from compute.correlations import compute_all_correlations
from db import (
    upsert_daily_prices,
    upsert_weekly_fundamentals,
    upsert_daily_sentiment,
    upsert_correlations,
    fetch_for_correlation,
)


def run_pipeline(skip_sentiment: bool = False):
    """Run the full daily data pipeline."""
    print(f"\n{'='*60}")
    print(f"QCatalyst Energy Pipeline — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    errors = []

    # Step 1: Fetch WTI, Brent, WCS from OilPriceAPI (same source = same dates)
    print("[1/5] Fetching oil prices (WTI, Brent, WCS) from OilPriceAPI...")
    try:
        oil_data = fetch_oil_prices()
        if oil_data:
            count = upsert_daily_prices([oil_data])
            spread = oil_data.get("wcs_wti_spread", "N/A")
            print(f"  -> WTI: ${oil_data.get('wti_spot')} | Brent: ${oil_data.get('brent_spot')} | WCS: ${oil_data.get('wcs_spot')}")
            print(f"  -> WCS-WTI spread: ${spread}")
            print(f"  -> Upserted {count} price row(s)\n")
        else:
            print("  -> OilPriceAPI unavailable, falling back to FRED...\n")
            # Fallback: FRED for WTI/Brent (no WCS, 1-2 day lag)
            fred_data = fetch_fred_prices(lookback_days=7)
            price_rows = [{"date": date, **values} for date, values in fred_data.items()]
            count = upsert_daily_prices(price_rows)
            print(f"  -> FRED fallback: upserted {count} price rows\n")
    except Exception as e:
        print(f"  ERROR: {e}\n")
        errors.append(f"Prices: {e}")

    # Step 2: Fetch DXY from FRED (not available on OilPriceAPI)
    print("[2/5] Fetching DXY (USD index) from FRED...")
    try:
        dxy_data = fetch_fred_dxy(lookback_days=7)
        dxy_rows = [{"date": date, "dxy_index": val} for date, val in dxy_data.items()]
        if dxy_rows:
            count = upsert_daily_prices(dxy_rows)
            print(f"  -> Upserted {count} DXY row(s)\n")
        else:
            print("  -> No new DXY data\n")
    except Exception as e:
        print(f"  ERROR: {e}\n")
        errors.append(f"FRED/DXY: {e}")

    # Step 3: Fetch EIA weekly fundamentals
    print("[3/5] Fetching EIA weekly data...")
    try:
        eia_data = fetch_eia_weekly()
        count = upsert_weekly_fundamentals(eia_data)
        print(f"  -> Upserted {count} weekly rows\n")
    except Exception as e:
        print(f"  ERROR: {e}\n")
        errors.append(f"EIA: {e}")

    # Step 4: Sentiment scoring
    if skip_sentiment:
        print("[4/5] Skipping sentiment (--skip-sentiment flag)\n")
    else:
        print("[4/5] Fetching headlines and scoring sentiment...")
        try:
            sentiment_data = fetch_and_score_sentiment()
            count = upsert_daily_sentiment(sentiment_data)
            print(f"  -> Upserted sentiment row (score: {sentiment_data['sentiment_score']})\n")
        except Exception as e:
            print(f"  ERROR: {e}\n")
            errors.append(f"Sentiment: {e}")

    # Step 5: Compute correlations
    print("[5/5] Computing correlations...")
    try:
        raw_data = fetch_for_correlation(days=90)
        correlation_rows = compute_all_correlations(raw_data)
        count = upsert_correlations(correlation_rows)
        print(f"  -> Computed and upserted {count} correlation rows\n")
    except Exception as e:
        print(f"  ERROR: {e}\n")
        errors.append(f"Correlations: {e}")

    # Summary
    print(f"{'='*60}")
    if errors:
        print(f"COMPLETED WITH {len(errors)} ERROR(S):")
        for err in errors:
            print(f"  - {err}")
        print(f"{'='*60}\n")
        sys.exit(1)
    else:
        print("ALL STEPS COMPLETED SUCCESSFULLY")
        print(f"{'='*60}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="QCatalyst Energy daily pipeline")
    parser.add_argument("--skip-sentiment", action="store_true",
                        help="Skip LLM sentiment scoring")
    args = parser.parse_args()

    run_pipeline(skip_sentiment=args.skip_sentiment)
