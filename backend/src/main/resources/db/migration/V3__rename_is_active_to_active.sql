-- V3__rename_is_active_to_active.sql
-- Rename column is_Active to Active on table goals.


ALTER TABLE goals
    RENAME COLUMN is_active TO active;