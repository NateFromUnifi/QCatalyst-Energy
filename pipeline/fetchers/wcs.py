"""
Fetch WCS (Western Canadian Select) price data.

Primary: OilPriceAPI (free tier, 1000 req/month)
  Docs: https://docs.oilpriceapi.com

Fallback: Alberta Open Data CSV
  URL: https://open.alberta.ca/dataset/energy-prices
"""

import os
import requests
import csv
import io
from datetime import datetime

OILPRICE_API_BASE = "https://api.oilpriceapi.com/v1/prices/latest"
ALBERTA_CSV_URL = (
    "https://open.alberta.ca/dataset/6dc97b50-5bbb-482d-8dd5-c9b23cd770dc"
    "/resource/05caae97-5ccb-43d5-8c31-a59ec86df2f2/download/energyprices.csv"
)


def fetch_wcs_price() -> dict | None:
    """
    Fetch the latest WCS price. Tries OilPriceAPI first, falls back to Alberta CSV.

    Returns {date: str, wcs_spot: float} or None if both fail.
    """
    result = _try_oilprice_api()
    if result:
        return result

    print("  OilPriceAPI failed, trying Alberta Open Data CSV...")
    return _try_alberta_csv()


def _try_oilprice_api() -> dict | None:
    """Fetch WCS from OilPriceAPI."""
    api_key = os.environ.get("OILPRICE_API_KEY")
    if not api_key:
        print("  No OILPRICE_API_KEY set, skipping OilPriceAPI")
        return None

    try:
        headers = {"Authorization": f"Token {api_key}"}
        params = {"by_code": "WCS_CRUDE_USD"}
        resp = requests.get(OILPRICE_API_BASE, headers=headers, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        price_data = data.get("data", {})
        price = price_data.get("price")
        created_at = price_data.get("created_at", "")

        if price is not None:
            # Extract date from ISO timestamp
            date = created_at[:10] if created_at else datetime.now().strftime("%Y-%m-%d")
            return {"date": date, "wcs_spot": float(price)}
    except Exception as e:
        print(f"  OilPriceAPI error: {e}")

    return None


def _try_alberta_csv() -> dict | None:
    """Fetch the latest WCS price from Alberta Open Data CSV."""
    try:
        resp = requests.get(ALBERTA_CSV_URL, timeout=30)
        resp.raise_for_status()

        reader = csv.DictReader(io.StringIO(resp.text))
        rows = list(reader)

        if not rows:
            return None

        # Get the most recent row (last row in CSV)
        latest = rows[-1]

        # Column names vary — look for WCS-related columns
        date = None
        wcs_price = None

        for key, value in latest.items():
            key_lower = key.lower().strip()
            if "date" in key_lower:
                date = value.strip()
            if "wcs" in key_lower and value.strip():
                try:
                    wcs_price = float(value.strip())
                except ValueError:
                    continue

        if date and wcs_price:
            return {"date": date, "wcs_spot": wcs_price}

    except Exception as e:
        print(f"  Alberta CSV error: {e}")

    return None
