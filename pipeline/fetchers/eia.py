"""
Fetch weekly petroleum data from the EIA API v2.

Series:
  PET.WCESTUS1.W — US Commercial Crude Oil Inventories excl. SPR (weekly, thousand bbl)
  PET.WCRFPUS2.W — US Crude Oil Field Production (weekly, thousand bbl/day)
  PET.WCRIMUS2.W — US Crude Oil Imports (weekly, thousand bbl/day)
  PET.WCESTOK1.W — Cushing OK Crude Oil Stocks (weekly, thousand bbl)

Docs: https://www.eia.gov/opendata/documentation.php
Rate limit: ~5 req/sec, ~9000 req/hour
Data publishes: Wednesdays after 10:30 AM ET
"""

import os
import requests

EIA_BASE = "https://api.eia.gov/v2/seriesid"

SERIES = {
    "crude_inventories": "PET.WCESTUS1.W",
    "crude_production": "PET.WCRFPUS2.W",
    "crude_imports": "PET.WCRIMUS2.W",
    "cushing_stocks": "PET.WCESTOK1.W",
}


def _fetch_series(series_id: str, limit: int = 5) -> list[dict]:
    """Fetch a single EIA series, return list of {period, value} dicts."""
    api_key = os.environ["EIA_API_KEY"]
    url = f"{EIA_BASE}/{series_id}"
    params = {"api_key": api_key}

    resp = requests.get(url, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    rows = data.get("response", {}).get("data", [])
    # Sort by period descending and take the most recent entries
    rows.sort(key=lambda r: r.get("period", ""), reverse=True)
    return rows[:limit]


def fetch_eia_weekly() -> list[dict]:
    """
    Fetch the latest weekly petroleum data from EIA.

    Returns a list of dicts keyed by week_ending date, each containing:
    {week_ending, crude_inventories, inventory_delta, crude_production,
     crude_imports, cushing_stocks}
    """
    # Fetch all series (latest 10 weeks each)
    all_data: dict[str, dict] = {}

    for field_name, series_id in SERIES.items():
        rows = _fetch_series(series_id, limit=10)
        for row in rows:
            period = row.get("period")
            value = row.get("value")
            if period is None or value is None:
                continue
            if period not in all_data:
                all_data[period] = {"week_ending": period}
            all_data[period][field_name] = float(value)

    # Sort by date and compute inventory_delta
    sorted_weeks = sorted(all_data.values(), key=lambda r: r["week_ending"])

    for i, week in enumerate(sorted_weeks):
        if i > 0 and "crude_inventories" in week:
            prev = sorted_weeks[i - 1].get("crude_inventories")
            if prev is not None:
                week["inventory_delta"] = week["crude_inventories"] - prev

    return sorted_weeks


def fetch_eia_history(start_date: str, end_date: str | None = None) -> list[dict]:
    """
    Fetch historical EIA data for backfill. Uses larger limit.

    Returns same format as fetch_eia_weekly but with more rows.
    """
    all_data: dict[str, dict] = {}

    for field_name, series_id in SERIES.items():
        rows = _fetch_series(series_id, limit=500)
        for row in rows:
            period = row.get("period")
            value = row.get("value")
            if period is None or value is None:
                continue
            # Filter by date range
            if period < start_date:
                continue
            if end_date and period > end_date:
                continue
            if period not in all_data:
                all_data[period] = {"week_ending": period}
            all_data[period][field_name] = float(value)

    sorted_weeks = sorted(all_data.values(), key=lambda r: r["week_ending"])

    for i, week in enumerate(sorted_weeks):
        if i > 0 and "crude_inventories" in week:
            prev = sorted_weeks[i - 1].get("crude_inventories")
            if prev is not None:
                week["inventory_delta"] = week["crude_inventories"] - prev

    return sorted_weeks
