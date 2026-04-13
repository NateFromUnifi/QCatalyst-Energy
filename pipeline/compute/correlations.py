"""
Compute correlation metrics for each hypothesis.

Uses scipy.stats.pearsonr for correlation coefficient and p-value.
Computes rolling windows (30d, 60d, 90d) and lagged correlations.
"""

import numpy as np
from scipy import stats
from datetime import datetime


def compute_all_correlations(data: dict) -> list[dict]:
    """
    Compute correlations for all hypotheses.

    Args:
        data: {daily_prices: [...], weekly_fundamentals: [...], daily_sentiment: [...]}
              as returned by db.fetch_for_correlation()

    Returns list of correlation row dicts ready for upsert.
    """
    today = datetime.now().strftime("%Y-%m-%d")
    results = []

    results.extend(_compute_h1(data, today))
    results.extend(_compute_h2(data, today))
    results.extend(_compute_h3(data, today))
    results.extend(_compute_h4(data, today))

    return results


def _pearson(x: list[float], y: list[float]) -> tuple[float | None, float | None, int]:
    """
    Compute Pearson R between two series.

    Returns (r, p_value, sample_size). Returns (None, None, n) if insufficient data.
    """
    # Filter to pairs where both values are not None/NaN
    pairs = [(a, b) for a, b in zip(x, y) if a is not None and b is not None
             and not np.isnan(a) and not np.isnan(b)]

    n = len(pairs)
    if n < 10:  # Need at least 10 data points for meaningful correlation
        return None, None, n

    xs, ys = zip(*pairs)
    # Check for zero variance
    if np.std(xs) == 0 or np.std(ys) == 0:
        return None, None, n

    r, p = stats.pearsonr(xs, ys)
    return round(float(r), 4), round(float(p), 6), n


def _compute_h1(data: dict, today: str) -> list[dict]:
    """
    H1: Inventory-Price Relationship.
    Test: inventory_delta vs wti_weekly_change (same week).
    """
    fundamentals = data["weekly_fundamentals"]
    prices = data["daily_prices"]

    if len(fundamentals) < 2 or not prices:
        return []

    # Build a lookup of WTI prices by date
    price_by_date = {p["date"]: p.get("wti_spot") for p in prices}

    # For each fundamental week, find the WTI price on the week_ending date
    # and compute the weekly price change
    inv_deltas = []
    price_changes = []

    for i in range(1, len(fundamentals)):
        curr = fundamentals[i]
        prev = fundamentals[i - 1]

        delta = curr.get("inventory_delta")
        curr_price = price_by_date.get(curr["week_ending"])
        prev_price = price_by_date.get(prev["week_ending"])

        if delta is not None and curr_price is not None and prev_price is not None and prev_price != 0:
            inv_deltas.append(float(delta))
            price_changes.append((float(curr_price) - float(prev_price)) / float(prev_price) * 100)

    results = []
    for window in [30, 60, 90]:
        # Use the most recent N data points based on window (approximate weeks)
        n_weeks = window // 7
        x = inv_deltas[-n_weeks:] if len(inv_deltas) > n_weeks else inv_deltas
        y = price_changes[-n_weeks:] if len(price_changes) > n_weeks else price_changes

        r, p, n = _pearson(x, y)
        results.append({
            "computed_date": today,
            "hypothesis": "H1_inventory_price",
            "indicator": "inventory_delta",
            "target": "wti_weekly_change",
            "lag_days": 0,
            "window_days": window,
            "pearson_r": r,
            "p_value": p,
            "sample_size": n,
        })

    return results


def _compute_h2(data: dict, today: str) -> list[dict]:
    """
    H2: Sentiment-Price Lead.
    Test: sentiment_score vs wti_daily_change at lags 0, 1, 2, 3, 5.
    """
    sentiment = data["daily_sentiment"]
    prices = data["daily_prices"]

    if len(sentiment) < 10 or len(prices) < 10:
        return []

    # Build aligned daily series
    price_by_date = {}
    sorted_prices = sorted(prices, key=lambda p: p["date"])

    for i in range(1, len(sorted_prices)):
        curr = sorted_prices[i]
        prev = sorted_prices[i - 1]
        if curr.get("wti_spot") and prev.get("wti_spot") and float(prev["wti_spot"]) != 0:
            change = (float(curr["wti_spot"]) - float(prev["wti_spot"])) / float(prev["wti_spot"]) * 100
            price_by_date[curr["date"]] = change

    sent_by_date = {s["date"]: float(s["sentiment_score"]) for s in sentiment
                    if s.get("sentiment_score") is not None}

    # Sort dates
    all_dates = sorted(set(sent_by_date.keys()) & set(price_by_date.keys()))

    results = []
    for lag in [0, 1, 2, 3, 5]:
        for window in [30, 60, 90]:
            scores = []
            changes = []

            for i, date in enumerate(all_dates):
                target_idx = i + lag
                if target_idx < len(all_dates):
                    target_date = all_dates[target_idx]
                    if date in sent_by_date and target_date in price_by_date:
                        scores.append(sent_by_date[date])
                        changes.append(price_by_date[target_date])

            # Apply window
            s = scores[-window:] if len(scores) > window else scores
            c = changes[-window:] if len(changes) > window else changes

            r, p, n = _pearson(s, c)
            results.append({
                "computed_date": today,
                "hypothesis": "H2_sentiment_price",
                "indicator": "sentiment_score",
                "target": "wti_daily_change",
                "lag_days": lag,
                "window_days": window,
                "pearson_r": r,
                "p_value": p,
                "sample_size": n,
            })

    return results


def _compute_h3(data: dict, today: str) -> list[dict]:
    """
    H3: Dollar-Oil Inverse.
    Test: dxy_daily_change vs wti_daily_change (same day).
    """
    prices = data["daily_prices"]
    sorted_prices = sorted(prices, key=lambda p: p["date"])

    dxy_changes = []
    wti_changes = []

    for i in range(1, len(sorted_prices)):
        curr = sorted_prices[i]
        prev = sorted_prices[i - 1]

        curr_wti = curr.get("wti_spot")
        prev_wti = prev.get("wti_spot")
        curr_dxy = curr.get("dxy_index")
        prev_dxy = prev.get("dxy_index")

        if all(v is not None for v in [curr_wti, prev_wti, curr_dxy, prev_dxy]):
            if float(prev_wti) != 0 and float(prev_dxy) != 0:
                wti_changes.append((float(curr_wti) - float(prev_wti)) / float(prev_wti) * 100)
                dxy_changes.append((float(curr_dxy) - float(prev_dxy)) / float(prev_dxy) * 100)

    results = []
    for window in [30, 60, 90]:
        d = dxy_changes[-window:] if len(dxy_changes) > window else dxy_changes
        w = wti_changes[-window:] if len(wti_changes) > window else wti_changes

        r, p, n = _pearson(d, w)
        results.append({
            "computed_date": today,
            "hypothesis": "H3_dollar_oil",
            "indicator": "dxy_daily_change",
            "target": "wti_daily_change",
            "lag_days": 0,
            "window_days": window,
            "pearson_r": r,
            "p_value": p,
            "sample_size": n,
        })

    return results


def _compute_h4(data: dict, today: str) -> list[dict]:
    """
    H4: WCS Spread Dynamics.
    Test: wcs_wti_spread vs inventory levels (same period).
    """
    prices = data["daily_prices"]
    fundamentals = data["weekly_fundamentals"]

    if not prices or not fundamentals:
        return []

    # Build lookup for spread by date
    spread_by_date = {p["date"]: float(p["wcs_wti_spread"])
                      for p in prices if p.get("wcs_wti_spread") is not None}

    spreads = []
    inventories = []

    for f in fundamentals:
        week = f["week_ending"]
        inv = f.get("crude_inventories")
        spread = spread_by_date.get(week)

        if inv is not None and spread is not None:
            spreads.append(spread)
            inventories.append(float(inv))

    results = []
    for window in [30, 60, 90]:
        n_weeks = window // 7
        s = spreads[-n_weeks:] if len(spreads) > n_weeks else spreads
        inv = inventories[-n_weeks:] if len(inventories) > n_weeks else inventories

        r, p, n = _pearson(s, inv)
        results.append({
            "computed_date": today,
            "hypothesis": "H4_wcs_spread",
            "indicator": "wcs_wti_spread",
            "target": "crude_inventories",
            "lag_days": 0,
            "window_days": window,
            "pearson_r": r,
            "p_value": p,
            "sample_size": n,
        })

    return results
