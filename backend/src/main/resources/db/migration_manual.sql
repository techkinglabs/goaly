-- Manual schema migration for Personal Progress Tracker enhancement.
-- Required because spring.jpa.hibernate.ddl-auto=validate (no auto DDL).
-- Apply against the external PostgreSQL instance (see .env: DB_URL/DB_USER/DB_PASSWORD).
--
-- Fresh start: the app previously used weekly_entries. We drop and recreate as daily_entries.

-- 1. Drop old weekly_entries table and its unique constraint.
DROP TABLE IF EXISTS weekly_entries;

-- 2. New daily_entries table.
CREATE TABLE IF NOT EXISTS daily_entries (
    id              BIGSERIAL PRIMARY KEY,
    goal_id         BIGINT NOT NULL REFERENCES goals(id),
    entry_date      DATE NOT NULL,
    actual_value    NUMERIC(19,4) NOT NULL,
    target_value    NUMERIC(19,4) NOT NULL,
    CONSTRAINT uk_daily_entry_goal_date UNIQUE (goal_id, entry_date)
);

-- 3. Alter goals: add period + amount_per_period.
ALTER TABLE goals ADD COLUMN IF NOT EXISTS period VARCHAR(20) NOT NULL DEFAULT 'ONGOING';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS amount_per_period NUMERIC(19,4) NOT NULL DEFAULT 0;

-- 4. New target_history table.
CREATE TABLE IF NOT EXISTS target_history (
    id          BIGSERIAL PRIMARY KEY,
    goal_id     BIGINT NOT NULL REFERENCES goals(id),
    valid_from  DATE NOT NULL,
    value       NUMERIC(19,4) NOT NULL,
    CONSTRAINT uk_target_history_goal_date UNIQUE (goal_id, valid_from)
);

-- 6. Add valid_to to target_history so each target value has a date range.
--    NULL valid_to means "Forever" (the current/latest value).
ALTER TABLE target_history ADD COLUMN IF NOT EXISTS valid_to DATE;

-- Backfill: set each row's valid_to to the next row's valid_from for the same goal.
-- The most recent row (greatest valid_from) keeps valid_to = NULL (Forever).
UPDATE target_history t
SET valid_to = (
    SELECT MIN(t2.valid_from)
    FROM target_history t2
    WHERE t2.goal_id = t.goal_id
      AND t2.valid_from > t.valid_from
);

-- 7. Add period to target_history so each target change carries its own period
--    (DAY / WEEK / MONTH / YEAR). Stored value is the entered amount per that period.
--    Existing rows default to WEEK to preserve prior behaviour.
--    Alternative for a clean slate: DROP TABLE target_history; then re-run section 4.
ALTER TABLE target_history ADD COLUMN IF NOT EXISTS period VARCHAR(20) NOT NULL DEFAULT 'WEEK';

-- 8. Create goal_days_of_week collection table referenced by Goal.daysOfWeek
--    (@ElementCollection). Missing entirely from the original schema; under
--    prod (ddl-auto=validate) goals with daysOfWeek would fail. Additive + idempotent.
CREATE TABLE IF NOT EXISTS goal_days_of_week (
    goal_id BIGINT NOT NULL REFERENCES goals(id),
    day_of_week VARCHAR(20)
);
CREATE INDEX IF NOT EXISTS idx_goal_days_of_week_goal_id ON goal_days_of_week(goal_id);
