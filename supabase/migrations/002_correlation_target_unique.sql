-- Allow multiple benchmarks per hypothesis by including `target` in the unique key.
-- Previously: UNIQUE(computed_date, hypothesis, lag_days, window_days)
-- Now:        UNIQUE(computed_date, hypothesis, target, lag_days, window_days)

ALTER TABLE correlations
  DROP CONSTRAINT correlations_computed_date_hypothesis_lag_days_window_days_key;

ALTER TABLE correlations
  ADD CONSTRAINT correlations_unique_with_target
  UNIQUE (computed_date, hypothesis, target, lag_days, window_days);
