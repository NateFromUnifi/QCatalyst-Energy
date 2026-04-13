"""
Fetch oil news headlines via RSS and score sentiment using Groq LLM.

RSS Sources:
  - OilPrice.com:         https://oilprice.com/rss/main
  - Rigzone Headlines:    https://www.rigzone.com/news/rss/rigzone_headlines.aspx
  - Rigzone Production:   https://www.rigzone.com/news/rss/rigzone_production.aspx
  - EIA Today in Energy:  https://www.eia.gov/rss/todayinenergy.xml

LLM: Groq API (llama-3.3-70b-versatile)
  Free tier: 30 RPM, 1000 RPD, 100K tokens/day
  Docs: https://console.groq.com/docs
"""

import os
import json
import requests
import feedparser
from datetime import datetime, timedelta, timezone

RSS_FEEDS = [
    "https://oilprice.com/rss/main",
    "https://www.rigzone.com/news/rss/rigzone_headlines.aspx",
    "https://www.rigzone.com/news/rss/rigzone_production.aspx",
    "https://www.eia.gov/rss/todayinenergy.xml",
]

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.3-70b-versatile"

SENTIMENT_PROMPT = """You are an energy market analyst. Score the macroeconomic sentiment \
of the following crude oil news headlines for their likely impact on WTI crude oil prices.

Use this scale:
  1 = Extreme Bearish (major demand destruction, severe oversupply, global recession signals)
  2 = Strong Bearish (OPEC+ production increases, large inventory builds, demand downgrades)
  3 = Moderate Bearish (mild oversupply signals, weakening demand indicators)
  4 = Slightly Bearish (minor negative factors, mixed-negative outlook)
  5 = Neutral (no clear directional signal, offsetting factors)
  6 = Slightly Bullish (minor positive factors, mixed-positive outlook)
  7 = Moderate Bullish (supply tightening signals, demand upgrades)
  8 = Strong Bullish (OPEC+ cuts, large inventory draws, geopolitical supply risk)
  9 = Very Bullish (significant supply disruption, strong demand surge)
  10 = Extreme Bullish (major supply crisis, war/sanctions on major producers)

Score each headline individually, then provide the average.

Headlines:
{headlines}

Respond in this exact JSON format:
{{"individual_scores": [{{"headline": "...", "score": N, "reason": "2-3 words"}}], "average_score": N.N}}"""


def fetch_headlines(max_age_hours: int = 48) -> list[str]:
    """
    Parse RSS feeds and extract recent headlines.

    Args:
        max_age_hours: Only include headlines published within this many hours.

    Returns list of headline strings.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
    headlines = []

    for feed_url in RSS_FEEDS:
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries:
                title = entry.get("title", "").strip()
                if not title:
                    continue

                # Check publication date if available
                published = entry.get("published_parsed")
                if published:
                    pub_dt = datetime(*published[:6], tzinfo=timezone.utc)
                    if pub_dt < cutoff:
                        continue

                headlines.append(title)
        except Exception as e:
            print(f"  Warning: Failed to parse {feed_url}: {e}")

    # Deduplicate while preserving order
    seen = set()
    unique = []
    for h in headlines:
        h_lower = h.lower()
        if h_lower not in seen:
            seen.add(h_lower)
            unique.append(h)

    return unique


def score_sentiment(headlines: list[str]) -> dict:
    """
    Send headlines to Groq LLM for sentiment scoring.

    Returns:
        {
            "sentiment_score": float (1-10),
            "headline_count": int,
            "headlines_raw": [{"headline": str, "score": int, "reason": str}, ...],
            "model_used": str
        }
    """
    if not headlines:
        return {
            "sentiment_score": 5.0,
            "headline_count": 0,
            "headlines_raw": [],
            "model_used": MODEL,
        }

    # Cap at 20 headlines to stay within token limits
    headlines = headlines[:20]

    # Format headlines for the prompt
    numbered = "\n".join(f"{i+1}. {h}" for i, h in enumerate(headlines))
    prompt = SENTIMENT_PROMPT.format(headlines=numbered)

    api_key = os.environ["GROQ_API_KEY"]
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
    }

    resp = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=60)
    resp.raise_for_status()

    result = resp.json()
    content = result["choices"][0]["message"]["content"]
    parsed = json.loads(content)

    return {
        "sentiment_score": round(float(parsed.get("average_score", 5.0)), 1),
        "headline_count": len(headlines),
        "headlines_raw": parsed.get("individual_scores", []),
        "model_used": MODEL,
    }


def fetch_and_score_sentiment() -> dict:
    """
    Full pipeline: fetch headlines then score them.

    Returns dict ready for Supabase insert with date included.
    """
    print("  Fetching RSS headlines...")
    headlines = fetch_headlines()
    print(f"  Found {len(headlines)} unique headlines")

    print(f"  Scoring sentiment with {MODEL}...")
    result = score_sentiment(headlines)
    result["date"] = datetime.now().strftime("%Y-%m-%d")

    print(f"  Sentiment score: {result['sentiment_score']}/10 ({result['headline_count']} headlines)")
    return result
