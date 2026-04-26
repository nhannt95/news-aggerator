-- ============================================================
-- Migration: Add project_id UUID (CHAR 36) as numeric identifier
--
-- project_name (VARCHAR) vẫn là PRIMARY KEY.
-- project_id   (CHAR 36, UUID v4) là định danh chuỗi bất biến,
--              được sinh bởi MySQL UUID() hoặc PHP khi tạo mới.
--
-- Chạy trên DB đang có dữ liệu: an toàn, không xóa dữ liệu cũ.
-- ============================================================

USE news_aggregator;

-- ── Bước 1: na_project_runtime_configs ──────────────────────
ALTER TABLE na_project_runtime_configs
    ADD COLUMN project_id CHAR(36) NULL
        COMMENT 'UUID v4 project identifier'
    AFTER project_name;

-- Backfill UUID cho các project đã có
UPDATE na_project_runtime_configs
SET project_id = UUID()
WHERE project_id IS NULL;

-- Đặt NOT NULL + UNIQUE sau khi đã backfill
ALTER TABLE na_project_runtime_configs
    MODIFY COLUMN project_id CHAR(36) NOT NULL
        COMMENT 'UUID v4 project identifier',
    ADD UNIQUE KEY uq_project_id (project_id);

-- ── Bước 2: na_processed_articles ───────────────────────────
ALTER TABLE na_processed_articles
    ADD COLUMN project_id CHAR(36) NULL
        COMMENT 'References na_project_runtime_configs.project_id'
    AFTER project_name,
    ADD INDEX idx_project_id (project_id);

-- Backfill project_id cho bài viết đã có
UPDATE na_processed_articles a
    JOIN na_project_runtime_configs p ON a.project_name = p.project_name
SET a.project_id = p.project_id;

-- ── Bước 3: na_agent_run_logs (nếu đã tạo) ──────────────────
ALTER TABLE na_agent_run_logs
    ADD COLUMN project_id CHAR(36) NULL
        COMMENT 'References na_project_runtime_configs.project_id'
    AFTER project_name,
    ADD INDEX idx_arl_project_id (project_id);

UPDATE na_agent_run_logs a
    JOIN na_project_runtime_configs p ON a.project_name = p.project_name
SET a.project_id = p.project_id;

-- ── Bước 4: thêm sentinel row 'manual' vào na_news_sites ────
INSERT IGNORE INTO na_news_sites (site_id, name, latest_page_url, active)
VALUES ('manual', 'Manual Entry', 'manual', 0);

-- ── Kiểm tra kết quả ─────────────────────────────────────────
SELECT project_id, project_name FROM na_project_runtime_configs ORDER BY project_name;
