-- V4__align_schema_with_domain_design.sql
-- Goal no longer owns target_value/period/amount_per_period (moved to TargetHistory).
-- TargetHistory.value is renamed to target_value.

ALTER TABLE target_history
    RENAME COLUMN value TO target_value;

ALTER TABLE goals
    DROP COLUMN IF EXISTS target_value,
    DROP COLUMN IF EXISTS period,
    DROP COLUMN IF EXISTS amount_per_period;
