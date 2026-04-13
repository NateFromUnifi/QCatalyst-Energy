"""
Fetch daily price data from the FRED API.

Series:
  DCOILWTICO  — WTI Crude Oil Spot Price (daily, USD/bbl)
  DCOILBRENTEU — Brent Crude Oil Spot Price (daily, USD/bbl)
  DTWEXBGS    — Trade Weighted US Dollar Index (daily)

Docs: https://fred.stlouisfed.org/docs/api/fred/series_observations.html
Rate limit: 120 requests/minute
"""

import os
import requests
from datetime import datetime, timedelta

FRED_BASE = "https://api.stlouisfed.org/fred/series/observations"

SERIES = {
    "wti_spot": "DCOILWTICO",
    "brent_spot": "DCOILBRENTEU",
    "dxy_index": "DTWEXBGS",
}


def fetch_fred_prices(lookback_days: int = 7) -> dict:
    """
    Fetch the latest available values for WTI, Brent, and DXY from FRED.

    Returns a dict keyed by date string (YYYY-MM-DD), each value being a dict
    of {wti_spot, brent_spot, dxy_index} with floats or None.
    """
    api_key = os.environ["FRED_API_KEY"]
    start_date = (datetime.now() - timedelta(days=lookback_days)).strftime("%Y-%m-%d")

    # Fetch all series
    raw: dict[str, dict[str, float]] = {}

    for field_name, series_id in SERIES.items():
        params = {
            "series_id": series_id,
            "api_key": api_key,
            "file_type": "json",
            "observation_start": start_date,
            "sort_order": "desc",
        }
        resp = requests.get(FRED_BASE, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        for obs in data.get("observations", []):
            date = obs["date"]
            value = obs["value"]
            if value == ".":  # FRED uses "." for missing data
                continue
            if date not in raw:
                raw[date] = {}
            raw[date][field_name] = float(value)

    return raw


def fetch_fred_history(start_date: str, end_date: str | None = None) -> dict:
    """
    Fetch historical FRED data for backfill.

    Args:
        start_date: YYYY-MM-DD
        end_date: YYYY-MM-DD (defaults to today)

    Returns same format as fetch_fred_prices.
    """
    api_key = os.environ["FRED_API_KEY"]
    if end_date is None:
        end_date = datetime.now().strftime("%Y-%m-%d")

    raw: dict[str, dict[str, float]] = {}

    for field_name, series_id in SERIES.items():
        params = {
            "series_id": series_id,
            "api_key": api_key,
            "file_type": "json",
            "observation_start": start_date,
            "observation_end": end_date,
            "sort_order": "asc",
        }
        resp = requests.get(FRED_BASE, params=params, timeout=60)
        resp.raise_for_status()
        data = resp.json()

        for obs in data.get("observations", []):
            date = obs["date"]
            value = obs["value"]
            if value == ".":
                continue
            if date not in raw:
                raw[date] = {}
            raw[date][field_name] = float(value)

    return raw
