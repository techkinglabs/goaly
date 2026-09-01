-- Fix DB schema drift for goal creation (idempotent, additive only).
-- Run: docker exec -i wpt-pg psql -U goaly_user -d weekly_progress_db -f /dev/stdin < fix.sql

-- Ensure the base goals table exists (fresh DB / migration never applied).
CREATE TABLE IF NOT EXISTS goals (
    id                BIGSERIAL PRIMARY KEY,
    name              VARCHAR(255) NOT NULL,
    unit              VARCHAR(255) NOT NULL,
    target_value      NUMERIC(19,4) NOT NULL,
    period            VARCHAR(20) NOT NULL DEFAULT 'WEEK',
    amount_per_period NUMERIC(19,4) NOT NULL DEFAULT 0,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    description       VARCHAR(1000)
);

-- Ensure target_history table exists (migration_manual.sql may never have been applied).
CREATE TABLE IF NOT EXISTS target_history (
    id          BIGSERIAL PRIMARY KEY,
    goal_id     BIGINT NOT NULL REFERENCES goals(id),
    valid_from  DATE NOT NULL,
    value       NUMERIC(19,4) NOT NULL,
    CONSTRAINT uk_target_history_goal_date UNIQUE (goal_id, valid_from)
);

-- target_history: add period + valid_to (already in migration_manual.sql 6-7, never applied).
ALTER TABLE target_history ADD COLUMN IF NOT EXISTS valid_to DATE;
ALTER TABLE target_history ADD COLUMN IF NOT EXISTS period VARCHAR(20) NOT NULL DEFAULT 'WEEK';

-- goal_days_of_week collection table (previously referenced by Goal.daysOfWeek) is no
-- longer used by the application. Drop it to keep the schema consistent. Idempotent.
DROP TABLE IF EXISTS goal_days_of_week;
