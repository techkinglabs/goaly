-- Allow multiple daily entries per goal on the same date.
-- The chart aggregates same-day entries by summing their values.
-- The application no longer enforces one-entry-per-day, so drop the constraint.
ALTER TABLE daily_entries DROP CONSTRAINT IF EXISTS uk_daily_entry_goal_date;
