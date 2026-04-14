"""
Fetch crude oil benchmark prices from OilPriceAPI.

Pulls WTI, Brent, and WCS from the same source so all three
benchmarks are available on the same dates.

API: https://docs.oilpriceapi.com
Free tier: 50 requests/month (3 per daily run = ~63/month on weekdays)

NOTE: The API's `created_at` is when the API *ingested* the price,
not the actual trading day. On weekends/holidays the API echoes stale
Friday prices with a fresh timestamp. We guard against this by
rejecting dates that fall on weekends.

Codes:
  WTI_CRUDE_USD   — West Texas Intermediate daily close
  BRENT_CRUDE_USD — Brent crude daily close
  WCS_CRUDE_USD   — Western Canadian Select daily close
"""

import os
import requests
from datetime import datetime, timedelta

OILPRICE_API_BASE = "https://api.oilpriceapi.com/v1/prices/latest"

BENCHMARKS = {
    "wti_spot": "WTI_CRUDE_USD",
    "brent_spot": "BRENT_CRUDE_USD",
    "wcs_spot": "WCS_CRUDE_USD",
}


def fetch_oil_prices() -> dict | None:
    """
    Fetch latest WTI, Brent, and WCS prices from OilPriceAPI.

    Returns {date, wti_spot, brent_spot, wcs_spot, wcs_wti_spread}
    or None if the API key is missing or all requests fail.
    """
    api_key = os.environ.get("OILPRICE_API_KEY")
    if not api_key:
        print("  No OILPRICE_API_KEY set, skipping OilPriceAPI")
        return None

    headers = {"Authorization": f"Token {api_key}"}
    result: dict[str, float | str | None] = {}
    date = None

    for field, code in BENCHMARKS.items():
        try:
            resp = requests.get(
                OILPRICE_API_BASE,
                headers=headers,
                params={"by_code": code},
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json().get("data", {})
            price = data.get("price")
            created = data.get("created_at", "")

            if price is not None:
                result[field] = float(price)
                # Use the earliest date across benchmarks for consistency
                price_date = created[:10] if created else None
                if price_date and (date is None or price_date < date):
                    date = price_date

            print(f"  {code}: ${price}")
        except Exception as e:
            print(f"  {code}: error — {e}")
            result[field] = None

    if not any(v is not None for k, v in result.items() if k != "date"):
        return None

    # Guard: if the API returned a weekend date, roll back to Friday.
    # The API's created_at can be a weekend timestamp echoing stale data.
    if date:
        dt = datetime.strptime(date, "%Y-%m-%d")
        weekday = dt.weekday()  # 5 = Saturday, 6 = Sunday
        if weekday == 5:
            date = (dt - timedelta(days=1)).strftime("%Y-%m-%d")
            print(f"  [date guard] API date was Saturday, rolled back to Friday: {date}")
        elif weekday == 6:
            date = (dt - timedelta(days=2)).strftime("%Y-%m-%d")
            print(f"  [date guard] API date was Sunday, rolled back to Friday: {date}")

    result["date"] = date or datetime.now().strftime("%Y-%m-%d")

    # Also guard against today's date if the market hasn't closed yet.
    # The pipeline runs at 4:30 PM ET but the API may already show today's
    # date with yesterday's stale price. If today's price is identical to
    # the previous available price, this is handled by upsert (same date = overwrite).

    # Compute WCS-WTI spread if both are available
    wti = result.get("wti_spot")
    wcs = result.get("wcs_spot")
    if wti is not None and wcs is not None:
        result["wcs_wti_spread"] = round(float(wcs) - float(wti), 2)

    return result


def fetch_oil_price_history(code: str = "WCS_CRUDE_USD") -> list[dict]:
    """
    Fetch historical prices for a single benchmark code.

    Returns list of {date, price} dicts, newest first.
    Uses 1 API request (returns up to 100 data points).
    """
    api_key = os.environ.get("OILPRICE_API_KEY")
    if not api_key:
        return []

    headers = {"Authorization": f"Token {api_key}"}
    try:
        resp = requests.get(
            "https://api.oilpriceapi.com/v1/prices",
            headers=headers,
            params={"by_code": code},
            timeout=30,
        )
        resp.raise_for_status()
        prices = resp.json().get("data", {}).get("prices", [])

        seen = set()
        results = []
        for p in prices:
            date = p.get("created_at", "")[:10]
            if date and date not in seen:
                seen.add(date)
                results.append({"date": date, "price": p["price"]})

        return results
    except Exception as e:
        print(f"  OilPriceAPI history error: {e}")
        return []
