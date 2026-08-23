-- Fix DB schema drift for goal creation (idempotent, additive only).
-- Run: docker exec -i wpt-pg psql -U kilo_code -d weekly_progress_db -f /dev/stdin < fix.sql

-- target_history: add period + valid_to (already in migration_manual.sql 6-7, never applied).
ALTER TABLE target_history ADD COLUMN IF NOT EXISTS valid_to DATE;
ALTER TABLE target_history ADD COLUMN IF NOT EXISTS period VARCHAR(20) NOT NULL DEFAULT 'WEEK';

-- goal_days_of_week collection table (previously referenced by Goal.daysOfWeek) is no
-- longer used by the application. Drop it to keep the schema consistent. Idempotent.
DROP TABLE IF EXISTS goal_days_of_week;
