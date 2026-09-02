-- V2__add_foreign_keys.sql
-- Add referential integrity between child tables and goals.
-- The existing data was already consistent (created by the application),
-- so these ALTERs are safe to run on a populated database.

CREATE INDEX idx_daily_entries_goal_id ON daily_entries (goal_id);
CREATE INDEX idx_target_history_goal_id ON target_history (goal_id);

ALTER TABLE daily_entries
    ADD CONSTRAINT fk_daily_entries_goal
    FOREIGN KEY (goal_id) REFERENCES goals (id);

ALTER TABLE target_history
    ADD CONSTRAINT fk_target_history_goal
    FOREIGN KEY (goal_id) REFERENCES goals (id);
