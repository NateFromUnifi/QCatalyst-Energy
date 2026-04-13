-- QCatalyst Energy — Initial Database Schema
-- Run this in the Supabase SQL Editor to create all tables

-- Daily price data from FRED + Alberta Open Data
CREATE TABLE daily_prices (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date        DATE NOT NULL UNIQUE,
    wti_spot    NUMERIC(8,2),        -- USD/bbl (FRED: DCOILWTICO)
    brent_spot  NUMERIC(8,2),        -- USD/bbl (FRED: DCOILBRENTEU)
    wcs_spot    NUMERIC(8,2),        -- USD/bbl (Alberta Open Data / OilPriceAPI)
    wcs_wti_spread NUMERIC(8,2),     -- WCS - WTI (typically negative)
    dxy_index   NUMERIC(8,4),        -- USD index (FRED: DTWEXBGS)
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly fundamental data from EIA + Baker Hughes + CFTC
CREATE TABLE weekly_fundamentals (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    week_ending         DATE NOT NULL UNIQUE,
    crude_inventories   NUMERIC(12,0),   -- thousand barrels (EIA: PET.WCESTUS1.W)
    inventory_delta     NUMERIC(10,0),   -- week-over-week change in thousand barrels
    crude_production    NUMERIC(10,1),   -- thousand bbl/day (EIA: PET.WCRFPUS2.W)
    crude_imports       NUMERIC(10,1),   -- thousand bbl/day (EIA: PET.WCRIMUS2.W)
    cushing_stocks      NUMERIC(12,0),   -- thousand barrels (EIA: PET.WCESTOK1.W)
    us_rig_count        INTEGER,         -- Baker Hughes weekly count
    cftc_net_long       INTEGER,         -- CFTC COT net non-commercial contracts
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Daily LLM sentiment scores from RSS headlines
CREATE TABLE daily_sentiment (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date            DATE NOT NULL UNIQUE,
    sentiment_score NUMERIC(3,1),       -- 1.0 (extreme bearish) to 10.0 (extreme bullish)
    headline_count  INTEGER,            -- how many headlines were scored
    headlines_raw   JSONB,              -- full headlines + individual scores for audit
    model_used      TEXT,               -- e.g. 'llama-3.3-70b-versatile'
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Computed correlation results (updated daily by pipeline)
CREATE TABLE correlations (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    computed_date   DATE NOT NULL,
    hypothesis      TEXT NOT NULL,       -- e.g. 'H1_inventory_price'
    indicator       TEXT NOT NULL,       -- e.g. 'inventory_delta'
    target          TEXT NOT NULL,       -- e.g. 'wti_weekly_change'
    lag_days        INTEGER NOT NULL,    -- 0 = same period, 1 = next day, etc.
    window_days     INTEGER NOT NULL,    -- rolling window size (30, 60, 90)
    pearson_r       NUMERIC(5,4),       -- correlation coefficient (-1 to +1)
    p_value         NUMERIC(8,6),       -- statistical significance
    sample_size     INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(computed_date, hypothesis, lag_days, window_days)
);

-- Indexes for common query patterns
CREATE INDEX idx_daily_prices_date ON daily_prices(date DESC);
CREATE INDEX idx_weekly_fundamentals_week ON weekly_fundamentals(week_ending DESC);
CREATE INDEX idx_daily_sentiment_date ON daily_sentiment(date DESC);
CREATE INDEX idx_correlations_latest ON correlations(computed_date DESC, hypothesis);
