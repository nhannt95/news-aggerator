-- ============================================================
-- Migration: Add department, group_name, team to na_users
-- ============================================================

USE news_aggregator;

ALTER TABLE na_users
    ADD COLUMN department VARCHAR(100) NULL AFTER name,
    ADD COLUMN group_name VARCHAR(100) NULL AFTER department,
    ADD COLUMN team       VARCHAR(100) NULL AFTER group_name;
