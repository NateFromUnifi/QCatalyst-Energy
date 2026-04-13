# QCatalyst Energy — Product Requirements Document

> **Version:** 0.1 (Draft)
> **Author:** Natel
> **Date:** 2026-04-12
> **Status:** Ideation → Scope Lock

---

## 1. Project Overview

### 1.1 What Is This?

QCatalyst Energy is an automated quantitative dashboard that ingests public energy market data, scores daily news sentiment with an LLM, and plots derived indicators against WTI crude oil price action to identify leading correlations.

It is an end-to-end data pipeline — from raw government APIs to interactive charts — built as a learning vehicle for energy markets, futures dynamics, and quantitative analysis.

### 1.2 Goals

| Priority | Goal |
|----------|------|
| **Primary** | Learn energy/oil/gas market fundamentals through building |
| **Primary** | Learn quantitative correlation analysis and futures market mechanics |
| **Primary** | Build a portfolio-quality project demonstrating full-stack + data engineering |
| **Secondary** | Keep total cost at $0 (or under $15/year for optional domain) |

### 1.3 Non-Goals

- This is **not** a trading system. No buy/sell signals, no backtesting engine, no portfolio management.
- This is **not** a real-time system. Daily granularity only — no intraday data, no streaming.
- This is **not** a forecasting model. It surfaces correlations for human interpretation, not predictions.

---

## 2. Target Users

**Primary:** The builder (Natel) — learning quantitative energy analysis.

**Secondary:** Anyone viewing the public dashboard — recruiters, interviewers, or peers evaluating the project as a portfolio piece.

---

## 3. Core Hypotheses to Test

The dashboard is organized around testable hypotheses. Each hypothesis has a specific data requirement and a measurable correlation output.

### H1: Inventory-Price Relationship (Core)

> "EIA weekly crude oil inventory changes (draws/builds) inversely correlate with WTI weekly price changes."

- **Data:** EIA weekly commercial crude inventories (`PET.WCESTUS1.W`) vs. FRED daily WTI (`DCOILWTICO`)
- **Method:** Week-over-week inventory delta vs. week-over-week price change. Pearson correlation + rolling 30-day window.
- **Why this matters:** The EIA Weekly Petroleum Status Report (released Wednesdays 10:30 AM ET) is the single most market-moving weekly data point in oil markets. Inventory builds signal oversupply (bearish); draws signal tightening (bullish). This is the foundational relationship every energy analyst watches.

### H2: Sentiment-Price Lead (Core)

> "Aggregate daily news sentiment leads WTI price direction by 1-2 trading days."

- **Data:** LLM-scored daily sentiment (from RSS headlines) vs. next-day/next-2-day WTI price change
- **Method:** Lagged cross-correlation at 0, 1, 2, 3, and 5 day offsets. Rolling correlation windows.
- **Why this matters:** Tests whether public information in news headlines contains signal that precedes price movement, or whether markets price it in instantly (efficient market hypothesis).

### H3: Dollar-Oil Inverse (Stretch)

> "Weekly USD index (DXY) changes negatively correlate with WTI price changes."

- **Data:** FRED DXY index (`DTWEXBGS`) vs. FRED WTI (`DCOILWTICO`)
- **Method:** Weekly percentage change correlation.
- **Why this matters:** Oil is globally priced in USD. A stronger dollar makes oil more expensive for non-USD buyers, suppressing demand. This is a macro-level relationship that connects energy to broader financial markets.

### H4: WCS Spread Dynamics (Stretch)

> "The WCS-WTI differential correlates with Canadian pipeline throughput and US inventory levels."

- **Data:** WCS price (Alberta Open Data / OilPriceAPI) minus WTI, vs. CER pipeline throughput data and Cushing OK inventory levels (`PET.WCESTUS1.W` Cushing subset)
- **Method:** Rolling correlation of spread width against throughput utilization.
- **Why this matters:** The WCS discount is driven by takeaway capacity constraints — a uniquely Canadian dynamic reshaped by the TMX pipeline expansion in 2024. Understanding this teaches infrastructure-driven pricing.

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions (Cron)                     │
│                  Daily @ 4:30 PM ET (21:30 UTC)             │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  EIA API     │  │  FRED API    │  │  RSS Feeds         │ │
│  │  (weekly     │  │  (daily WTI, │  │  (OilPrice.com,    │ │
│  │  inventories,│  │  Brent, DXY) │  │   Rigzone,         │ │
│  │  production) │  │              │  │   EIA Today)        │ │
│  └──────┬──────┘  └──────┬───────┘  └─────────┬──────────┘ │
│         │                │                     │            │
│         │                │              ┌──────▼──────────┐ │
│         │                │              │  Groq LLM API   │ │
│         │                │              │  (Llama 3.3 70B)│ │
│         │                │              │  Sentiment 1-10 │ │
│         │                │              └──────┬──────────┘ │
│         │                │                     │            │
│         └────────┬───────┴─────────────────────┘            │
│                  │                                          │
│          ┌───────▼────────┐                                 │
│          │   Supabase     │                                 │
│          │   (PostgreSQL) │                                 │
│          └───────┬────────┘                                 │
└──────────────────┼──────────────────────────────────────────┘
                   │
          ┌────────▼────────┐
          │   Next.js App   │
          │   (Vercel)      │
          │                 │
          │  ┌────────────┐ │
          │  │ Price Chart │ │
          │  │ + Overlays  │ │
          │  ├────────────┤ │
          │  │ Correlation │ │
          │  │ Heatmap     │ │
          │  ├────────────┤ │
          │  │ Signals Log │ │
          │  ├────────────┤ │
          │  │ Data Health │ │
          │  └────────────┘ │
          └─────────────────┘
```

---

## 5. Data Sources — Verified

### 5.1 Price Data

| Data Point | Source | Series / Endpoint | Frequency | Cost |
|---|---|---|---|---|
| WTI Spot Price | FRED API | `DCOILWTICO` | Daily | Free |
| Brent Spot Price | FRED API | `DCOILBRENTEU` | Daily | Free |
| WCS Price | Alberta Open Data | [energyprices.csv](https://open.alberta.ca/dataset/energy-prices) | Daily | Free |
| WCS Price (API) | OilPriceAPI | `WCS_CRUDE_USD` | Daily | Free (1K req/mo) |
| USD Index (DXY) | FRED API | `DTWEXBGS` | Daily | Free |

**FRED API:**
- Key: Free at https://research.stlouisfed.org/useraccount/apikeys
- Endpoint: `https://api.stlouisfed.org/fred/series/observations?series_id=DCOILWTICO&api_key={KEY}&file_type=json`
- Rate limit: 120 requests/minute
- Note: `file_type=json` required — default is XML

### 5.2 Fundamental / Supply Data

| Data Point | Source | Series ID | Frequency | Cost |
|---|---|---|---|---|
| US Crude Inventories (excl. SPR) | EIA API v2 | `PET.WCESTUS1.W` | Weekly (Wed) | Free |
| US Crude Production | EIA API v2 | `PET.WCRFPUS2.W` | Weekly (Wed) | Free |
| US Crude Imports | EIA API v2 | `PET.WCRIMUS2.W` | Weekly (Wed) | Free |
| Cushing OK Stocks | EIA API v2 | `PET.WCESTOK1.W` | Weekly (Wed) | Free |
| US Rig Count | Baker Hughes | Excel download | Weekly (Fri) | Free |
| Net Speculative Positioning | CFTC COT | Bulk CSV | Weekly (Fri) | Free |

**EIA API v2:**
- Key: Free at https://www.eia.gov/opendata/
- Endpoint: `https://api.eia.gov/v2/seriesid/{SERIES_ID}?api_key={KEY}`
- Rate limit: ~5 req/sec, ~9,000 req/hour
- Weekly data publishes Wednesdays after 10:30 AM ET

### 5.3 Sentiment Data

| Source | RSS URL | Update Freq | Character |
|---|---|---|---|
| OilPrice.com | `https://oilprice.com/rss/main` | Multiple/day | Opinionated, directional |
| Rigzone Headlines | `https://www.rigzone.com/news/rss/rigzone_headlines.aspx` | Daily | Industry-focused |
| Rigzone Production | `https://www.rigzone.com/news/rss/rigzone_production.aspx` | Daily | Supply-focused |
| EIA Today in Energy | `https://www.eia.gov/rss/todayinenergy.xml` | Weekdays | Data-driven, neutral |

**LLM Processing:**
- Service: Groq API (free, no credit card)
- Model: `llama-3.3-70b-versatile`
- Free limits: 30 RPM, 1,000 RPD, 100K tokens/day
- Console: https://console.groq.com

---

## 6. Database Schema (Supabase / PostgreSQL)

### 6.1 `daily_prices`

```sql
CREATE TABLE daily_prices (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date        DATE NOT NULL UNIQUE,
    wti_spot    NUMERIC(8,2),        -- USD/bbl
    brent_spot  NUMERIC(8,2),        -- USD/bbl
    wcs_spot    NUMERIC(8,2),        -- USD/bbl
    wcs_wti_spread NUMERIC(8,2),     -- WCS - WTI (typically negative)
    dxy_index   NUMERIC(8,4),        -- USD index
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.2 `weekly_fundamentals`

```sql
CREATE TABLE weekly_fundamentals (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    week_ending         DATE NOT NULL UNIQUE,
    crude_inventories   NUMERIC(12,0),   -- thousand barrels
    inventory_delta     NUMERIC(10,0),   -- week-over-week change
    crude_production    NUMERIC(10,1),   -- thousand bbl/day
    crude_imports       NUMERIC(10,1),   -- thousand bbl/day
    cushing_stocks      NUMERIC(12,0),   -- thousand barrels
    us_rig_count        INTEGER,
    cftc_net_long       INTEGER,         -- net non-commercial contracts
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.3 `daily_sentiment`

```sql
CREATE TABLE daily_sentiment (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date            DATE NOT NULL UNIQUE,
    sentiment_score NUMERIC(3,1),       -- 1.0 (extreme bearish) to 10.0 (extreme bullish)
    headline_count  INTEGER,            -- how many headlines scored
    headlines_raw   JSONB,              -- stored for auditability
    model_used      TEXT,               -- e.g. 'llama-3.3-70b-versatile'
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.4 `correlations` (computed)

```sql
CREATE TABLE correlations (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    computed_date   DATE NOT NULL,
    hypothesis      TEXT NOT NULL,       -- e.g. 'H1_inventory_price'
    indicator       TEXT NOT NULL,       -- e.g. 'inventory_delta'
    target          TEXT NOT NULL,       -- e.g. 'wti_weekly_change'
    lag_days        INTEGER NOT NULL,    -- 0 = same period, 1 = next day, etc.
    window_days     INTEGER NOT NULL,    -- rolling window size
    pearson_r       NUMERIC(5,4),       -- correlation coefficient
    p_value         NUMERIC(8,6),       -- statistical significance
    sample_size     INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(computed_date, hypothesis, lag_days, window_days)
);
```

---

## 7. Pipeline Specification (GitHub Actions)

### 7.1 Schedule

```yaml
on:
  schedule:
    # Weekdays at 4:30 PM ET (21:30 UTC) — after markets close and EIA publishes
    - cron: '30 21 * * 1-5'
  workflow_dispatch: # manual trigger for testing
```

### 7.2 Pipeline Steps

```
Step 1: Fetch price data
  ├── FRED API → WTI, Brent, DXY (today's close)
  └── OilPriceAPI or Alberta Open Data → WCS (today's close)

Step 2: Fetch fundamentals (conditional — only on Wednesdays/Fridays)
  ├── EIA API → inventories, production, imports (Wednesday)
  ├── Baker Hughes → rig count (Friday)
  └── CFTC → COT positioning data (Friday)

Step 3: Fetch & score sentiment
  ├── Parse RSS feeds → extract headlines from last 24h
  ├── Send headlines to Groq API with calibrated prompt
  └── Store score + raw headlines

Step 4: Write to Supabase
  ├── UPSERT into daily_prices
  ├── UPSERT into weekly_fundamentals (if Wed/Fri)
  └── UPSERT into daily_sentiment

Step 5: Compute correlations
  ├── Pull last 90 days of data from Supabase
  ├── Compute rolling correlations for each hypothesis
  └── UPSERT into correlations table
```

### 7.3 Sentiment Prompt (Calibrated)

```
You are an energy market analyst. Score the macroeconomic sentiment 
of the following crude oil news headlines for their likely impact on 
WTI crude oil prices.

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
{
  "individual_scores": [{"headline": "...", "score": N, "reason": "2-3 words"}],
  "average_score": N.N
}
```

---

## 8. Frontend — Dashboard Specification

### 8.1 Technology

- **Framework:** Next.js 14+ (App Router)
- **Hosting:** Vercel (free tier)
- **Charts:** Recharts or Lightweight Charts (TradingView open source)
- **Styling:** Tailwind CSS
- **Data fetching:** Supabase JS client (direct from browser, read-only)

### 8.2 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  QCatalyst Energy                        Last updated: ...  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─── PRICE CHART (Main) ──────────────────────────────┐   │
│  │  WTI daily line chart (primary Y axis)               │   │
│  │  Toggleable overlays:                                │   │
│  │    □ Sentiment score (secondary Y axis, 1-10)        │   │
│  │    □ Inventory delta (bar chart overlay)              │   │
│  │    □ WCS-WTI spread (secondary Y axis)               │   │
│  │    □ DXY index (secondary Y axis, inverted)          │   │
│  │  Time range selector: 30d / 90d / 180d / 1Y / All   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─── CORRELATION HEATMAP ─────┐ ┌─── TODAY'S SNAPSHOT ──┐ │
│  │                             │ │                        │ │
│  │  Rows: Indicators           │ │  WTI:    $XX.XX (▲/▼)  │ │
│  │  Cols: Lag (0d, 1d, 2d, 5d) │ │  Brent:  $XX.XX (▲/▼)  │ │
│  │  Cells: Pearson R value     │ │  WCS:    $XX.XX (▲/▼)  │ │
│  │  Color: Red(-) to Green(+)  │ │  Spread: -$X.XX        │ │
│  │                             │ │  Sentiment: X.X / 10   │ │
│  │  This IS the centerpiece    │ │  Inventory: +/- X.X M  │ │
│  │  of the project.            │ │  Rig Count: XXXX       │ │
│  │                             │ │                        │ │
│  └─────────────────────────────┘ └────────────────────────┘ │
│                                                             │
│  ┌─── SIGNALS LOG (Table) ─────────────────────────────────┐│
│  │  Date | WTI | Δ% | Inv Δ | Sent. | DXY | Rig | Notes  ││
│  │  ─────┼─────┼────┼───────┼───────┼─────┼─────┼─────── ││
│  │  4/11 | 61  | -2 | -2.1M | 6.2   | 100 | 580 |        ││
│  │  4/10 | 62  | +1 | —     | 5.8   | 101 | —   |        ││
│  │  ...                                                    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─── DATA HEALTH ─────────────────────────────────────────┐│
│  │  Pipeline last ran: 2026-04-11 21:30 UTC ✓              ││
│  │  Days of data: 142 | Missing days: 3                    ││
│  │  Sentiment model: llama-3.3-70b-versatile               ││
│  │  Source status: EIA ✓ | FRED ✓ | Groq ✓ | WCS ✓        ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Key Interactions

- **Toggle overlays** on the price chart to visually compare indicators against WTI
- **Hover on correlation heatmap** cells to see R value, p-value, and sample size
- **Click a signals log row** to see that day's headlines and individual sentiment scores
- **Time range selector** adjusts both the price chart and correlation computations

---

## 9. Phased Build Plan

### Phase 1: Foundation (Week 1-2)

**Goal:** Data flows from APIs → Supabase → basic chart.

- [ ] Set up Supabase project, create tables (Section 6)
- [ ] Register API keys: EIA, FRED, Groq
- [ ] Build Python pipeline script:
  - Fetch WTI + Brent from FRED
  - Fetch EIA weekly inventories + production
  - Write to Supabase
- [ ] Set up GitHub Actions cron (manual trigger first, then schedule)
- [ ] Backfill historical data:
  - FRED daily WTI/Brent (2+ years via API)
  - EIA weekly inventories (2+ years via API)
- [ ] Scaffold Next.js app on Vercel
- [ ] Build basic price chart (WTI line over time)

**Milestone:** Chart shows 2 years of WTI price with inventory overlay.

### Phase 2: Sentiment Engine (Week 3-4)

**Goal:** LLM sentiment scoring is live and plotted.

- [ ] Build RSS feed parser (OilPrice.com, Rigzone, EIA)
- [ ] Build Groq sentiment scoring with calibrated prompt (Section 7.3)
- [ ] Add `daily_sentiment` pipeline step
- [ ] Add sentiment overlay to price chart
- [ ] Build signals log table
- [ ] Add headline drill-down (click row → see scored headlines)

**Milestone:** Dashboard shows daily sentiment scores overlaid on WTI price.

### Phase 3: Correlation Engine (Week 5-6)

**Goal:** Quantitative analysis is computed and displayed.

- [ ] Build correlation computation in Python:
  - Pearson R with scipy
  - Rolling windows (30d, 60d, 90d)
  - Lagged correlations (0, 1, 2, 3, 5 day offsets)
  - P-value computation
- [ ] Build correlation heatmap component
- [ ] Add H1 (inventory-price) correlation
- [ ] Add H2 (sentiment-price) lagged correlation
- [ ] Write up hypothesis results as dashboard annotations

**Milestone:** Correlation heatmap shows R values for all indicator-lag combinations.

### Phase 4: Extended Data (Week 7-8)

**Goal:** Broader data coverage and stretch hypotheses.

- [ ] Add WCS price data (Alberta Open Data + OilPriceAPI)
- [ ] Add WCS-WTI spread to dashboard
- [ ] Add DXY (USD index) from FRED
- [ ] Add Baker Hughes rig count ingestion
- [ ] Add CFTC COT net positioning
- [ ] Add H3 (DXY-oil) and H4 (WCS spread) to correlation heatmap
- [ ] Build "Today's Snapshot" card

**Milestone:** Full dashboard with all 4 hypotheses testable.

### Phase 5: Polish & Documentation (Week 9-10)

**Goal:** Portfolio-ready.

- [ ] Data health status panel
- [ ] Error handling and alerting (GitHub Actions notifications on failure)
- [ ] Mobile-responsive layout
- [ ] Add methodology page explaining each hypothesis
- [ ] Write README with architecture diagram
- [ ] Custom domain (optional, ~$12)

**Milestone:** Live, public, portfolio-ready dashboard.

---

## 10. Cost Summary

| Component | Service | Tier | Cost |
|---|---|---|---|
| Pipeline automation | GitHub Actions | Free (public repo) | $0 |
| Price data | FRED API | Free | $0 |
| Fundamental data | EIA API v2 | Free | $0 |
| WCS data | Alberta Open Data | Free | $0 |
| WCS data (backup) | OilPriceAPI | Free (1K req/mo) | $0 |
| Rig counts | Baker Hughes | Free (download) | $0 |
| CFTC positioning | CFTC.gov | Free (CSV) | $0 |
| News sentiment | RSS feeds | Free | $0 |
| LLM scoring | Groq | Free (1K RPD) | $0 |
| Database | Supabase | Free (500MB) | $0 |
| Frontend hosting | Vercel | Free | $0 |
| Domain (optional) | Any registrar | — | ~$12/yr |
| **Total** | | | **$0** |

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Supabase auto-pauses after 7d inactivity | Pipeline writes fail silently | Daily cron constitutes activity; add heartbeat SELECT as backup |
| GitHub Actions disables cron after 60d no repo activity | Pipeline stops running | Set calendar reminder to push a commit every 50 days; or use `workflow_dispatch` to re-enable |
| RSS feeds change URLs or shut down | Sentiment pipeline breaks | Monitor for empty feed responses; alert on 0 headlines |
| Groq free tier limits change | LLM scoring breaks | Abstract LLM call behind interface; swap to Gemini or local model |
| FRED/EIA API deprecation | Price/fundamental data stops | Both are government-funded and stable; low risk but monitor |
| LLM sentiment scores are uncalibrated | Correlation analysis is meaningless | Use anchored prompt (Section 7.3), store individual headline scores for audit, compare against keyword baseline |
| Small sample size (early days) | Correlations are statistically insignificant | Backfill 2+ years of price/inventory data; sentiment starts from day 1 with no backfill (document this limitation) |
| WCS data inconsistency across sources | Spread calculations are noisy | Cross-validate Alberta Open Data vs. OilPriceAPI; flag discrepancies |

---

## 12. Learning Outcomes

By building this project, you will develop working knowledge of:

**Energy Markets:**
- How EIA inventory reports move crude oil prices
- The mechanics of WTI vs. WCS pricing and what drives the Canadian discount
- The role of OPEC+, rig counts, and speculative positioning in oil markets
- Contango vs. backwardation and what futures curve shape signals

**Quantitative Analysis:**
- Pearson correlation and its limitations (linear only, sensitive to outliers)
- Lagged cross-correlation for identifying leading indicators
- Rolling window analysis and why stationarity matters
- P-values and sample size requirements for statistical significance
- The difference between correlation and causation in financial data

**Technical Skills:**
- Building automated data pipelines with GitHub Actions
- Working with government APIs (EIA, FRED) and their data formats
- LLM prompt engineering for structured output (sentiment scoring)
- PostgreSQL schema design for time-series data
- Full-stack development with Next.js, Supabase, and Vercel
- Data visualization for financial applications

---

## 13. Future Expansion Ideas (Post-MVP)

These are explicitly out of scope for the initial build but worth noting:

- **Futures curve visualization:** Plot WTI futures term structure (contango/backwardation)
- **Inventory surprise tracking:** Compare actual EIA numbers to Bloomberg/Investing.com consensus
- **Crack spread monitoring:** Track 3-2-1 crack spread as a refining demand indicator
- **OPEC+ compliance tracker:** Track actual production vs. quota commitments
- **Natural gas extension:** Add Henry Hub pricing and storage data (same architecture)
- **Backtesting framework:** Test if historical correlations would have predicted direction
- **Email/Slack alerts:** Notify when correlation regimes shift or extremes are hit

---

## Appendix A: API Reference Quick Sheet

### FRED

```bash
# Daily WTI spot
curl "https://api.stlouisfed.org/fred/series/observations?series_id=DCOILWTICO&api_key=YOUR_KEY&file_type=json&observation_start=2024-01-01&sort_order=desc&limit=5"
```

### EIA

```bash
# Weekly crude inventories
curl "https://api.eia.gov/v2/seriesid/PET.WCESTUS1.W?api_key=YOUR_KEY"
```

### Groq

```bash
curl -X POST "https://api.groq.com/openai/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "Score these headlines..."}],
    "temperature": 0.1,
    "response_format": {"type": "json_object"}
  }'
```

### Supabase

```bash
# Insert daily price row
curl -X POST "https://YOUR_PROJECT.supabase.co/rest/v1/daily_prices" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-04-12", "wti_spot": 61.50, "brent_spot": 65.20}'
```

### RSS Feeds

```
OilPrice.com:         https://oilprice.com/rss/main
Rigzone Headlines:    https://www.rigzone.com/news/rss/rigzone_headlines.aspx
Rigzone Production:   https://www.rigzone.com/news/rss/rigzone_production.aspx
EIA Today in Energy:  https://www.eia.gov/rss/todayinenergy.xml
```
