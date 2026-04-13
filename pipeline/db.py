"""
Supabase write helpers for the pipeline.

Uses the service role key (not anon key) to bypass RLS for writes.
"""

import os
from supabase import create_client


def get_client():
    """Create a Supabase client with service role key for write access."""
    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def upsert_daily_prices(rows: list[dict]) -> int:
    """
    Upsert daily price rows into daily_prices table.

    Each row should have: {date, wti_spot?, brent_spot?, wcs_spot?,
    wcs_wti_spread?, dxy_index?}

    Returns count of upserted rows.
    """
    if not rows:
        return 0

    client = get_client()
    # Filter to only valid columns
    valid_cols = {"date", "wti_spot", "brent_spot", "wcs_spot", "wcs_wti_spread", "dxy_index"}
    clean_rows = [{k: v for k, v in row.items() if k in valid_cols} for row in rows]

    result = client.table("daily_prices").upsert(
        clean_rows, on_conflict="date"
    ).execute()

    return len(result.data) if result.data else 0


def upsert_weekly_fundamentals(rows: list[dict]) -> int:
    """
    Upsert weekly fundamental rows into weekly_fundamentals table.

    Each row should have: {week_ending, crude_inventories?, inventory_delta?,
    crude_production?, crude_imports?, cushing_stocks?, us_rig_count?, cftc_net_long?}

    Returns count of upserted rows.
    """
    if not rows:
        return 0

    client = get_client()
    valid_cols = {
        "week_ending", "crude_inventories", "inventory_delta", "crude_production",
        "crude_imports", "cushing_stocks", "us_rig_count", "cftc_net_long",
    }
    clean_rows = [{k: v for k, v in row.items() if k in valid_cols} for row in rows]

    result = client.table("weekly_fundamentals").upsert(
        clean_rows, on_conflict="week_ending"
    ).execute()

    return len(result.data) if result.data else 0


def upsert_daily_sentiment(row: dict) -> int:
    """
    Upsert a single daily sentiment row.

    Row should have: {date, sentiment_score, headline_count, headlines_raw, model_used}
    """
    client = get_client()
    valid_cols = {"date", "sentiment_score", "headline_count", "headlines_raw", "model_used"}
    clean = {k: v for k, v in row.items() if k in valid_cols}

    result = client.table("daily_sentiment").upsert(
        clean, on_conflict="date"
    ).execute()

    return len(result.data) if result.data else 0


def upsert_correlations(rows: list[dict]) -> int:
    """
    Upsert computed correlation rows.

    Each row should have: {computed_date, hypothesis, indicator, target,
    lag_days, window_days, pearson_r, p_value, sample_size}
    """
    if not rows:
        return 0

    client = get_client()
    valid_cols = {
        "computed_date", "hypothesis", "indicator", "target",
        "lag_days", "window_days", "pearson_r", "p_value", "sample_size",
    }
    clean_rows = [{k: v for k, v in row.items() if k in valid_cols} for row in rows]

    result = client.table("correlations").upsert(
        clean_rows, on_conflict="computed_date,hypothesis,lag_days,window_days"
    ).execute()

    return len(result.data) if result.data else 0


def fetch_for_correlation(days: int = 90) -> dict:
    """
    Fetch recent data from all tables for correlation computation.

    Returns {daily_prices: [...], weekly_fundamentals: [...], daily_sentiment: [...]}
    """
    from datetime import datetime, timedelta

    client = get_client()
    start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    prices = client.table("daily_prices").select("*").gte("date", start).order("date").execute()
    fundamentals = client.table("weekly_fundamentals").select("*").gte("week_ending", start).order("week_ending").execute()
    sentiment = client.table("daily_sentiment").select("*").gte("date", start).order("date").execute()

    return {
        "daily_prices": prices.data or [],
        "weekly_fundamentals": fundamentals.data or [],
        "daily_sentiment": sentiment.data or [],
    }
