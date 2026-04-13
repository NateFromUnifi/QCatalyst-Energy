"""
Supabase REST API helpers for the pipeline.

Uses direct HTTP calls via requests instead of the supabase-py SDK
to avoid Python version compatibility issues.

Supabase REST API docs: https://supabase.com/docs/guides/api
"""

import os
import requests as req


def _headers():
    """Auth headers for Supabase REST API using service role key."""
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }


def _url(table: str) -> str:
    """Build REST endpoint URL for a table."""
    base = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    return f"{base}/rest/v1/{table}"


def upsert_daily_prices(rows: list[dict]) -> int:
    """Upsert daily price rows. Returns count of upserted rows."""
    if not rows:
        return 0

    valid_cols = {"date", "wti_spot", "brent_spot", "wcs_spot", "wcs_wti_spread", "dxy_index"}
    clean_rows = [{col: val for col, val in row.items() if col in valid_cols} for row in rows]

    # Tell PostgREST which columns are in the payload so it only touches those,
    # preventing WCS-only upserts from nullifying WTI/Brent/DXY (and vice versa).
    present_cols = set()
    for r in clean_rows:
        present_cols.update(r.keys())
    columns_param = ",".join(sorted(present_cols))

    resp = req.post(
        _url("daily_prices") + f"?on_conflict=date&columns={columns_param}",
        json=clean_rows, headers=_headers(), timeout=30,
    )
    if not resp.ok:
        print(f"    DB Error {resp.status_code}: {resp.text[:300]}")
        resp.raise_for_status()
    return len(resp.json())


def upsert_weekly_fundamentals(rows: list[dict]) -> int:
    """Upsert weekly fundamental rows. Returns count of upserted rows."""
    if not rows:
        return 0

    all_cols = [
        "week_ending", "crude_inventories", "inventory_delta", "crude_production",
        "crude_imports", "cushing_stocks", "us_rig_count", "cftc_net_long",
    ]
    clean_rows = [{col: row.get(col) for col in all_cols} for row in rows]

    resp = req.post(_url("weekly_fundamentals") + "?on_conflict=week_ending", json=clean_rows, headers=_headers(), timeout=30)
    if not resp.ok:
        print(f"    DB Error {resp.status_code}: {resp.text[:300]}")
        resp.raise_for_status()
    return len(resp.json())


def upsert_daily_sentiment(row: dict) -> int:
    """Upsert a single daily sentiment row."""
    valid_cols = {"date", "sentiment_score", "headline_count", "headlines_raw", "model_used"}
    clean = {k: v for k, v in row.items() if k in valid_cols}

    resp = req.post(_url("daily_sentiment") + "?on_conflict=date", json=clean, headers=_headers(), timeout=30)
    resp.raise_for_status()
    return len(resp.json())


def upsert_correlations(rows: list[dict]) -> int:
    """Upsert computed correlation rows."""
    if not rows:
        return 0

    valid_cols = {
        "computed_date", "hypothesis", "indicator", "target",
        "lag_days", "window_days", "pearson_r", "p_value", "sample_size",
    }
    clean_rows = [{k: v for k, v in row.items() if k in valid_cols} for row in rows]

    resp = req.post(_url("correlations") + "?on_conflict=computed_date,hypothesis,lag_days,window_days", json=clean_rows, headers=_headers(), timeout=30)
    resp.raise_for_status()
    return len(resp.json())


def fetch_for_correlation(days: int = 90) -> dict:
    """
    Fetch recent data from all tables for correlation computation.

    Returns {daily_prices: [...], weekly_fundamentals: [...], daily_sentiment: [...]}
    """
    from datetime import datetime, timedelta

    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    base = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }

    prices = req.get(
        f"{base}/rest/v1/daily_prices",
        params={"date": f"gte.{start}", "order": "date.asc", "select": "*"},
        headers=headers, timeout=30,
    )
    prices.raise_for_status()

    fundamentals = req.get(
        f"{base}/rest/v1/weekly_fundamentals",
        params={"week_ending": f"gte.{start}", "order": "week_ending.asc", "select": "*"},
        headers=headers, timeout=30,
    )
    fundamentals.raise_for_status()

    sentiment = req.get(
        f"{base}/rest/v1/daily_sentiment",
        params={"date": f"gte.{start}", "order": "date.asc", "select": "*"},
        headers=headers, timeout=30,
    )
    sentiment.raise_for_status()

    return {
        "daily_prices": prices.json(),
        "weekly_fundamentals": fundamentals.json(),
        "daily_sentiment": sentiment.json(),
    }
