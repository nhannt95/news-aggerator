-- ============================================================
-- News Aggregator - Database Schema
-- Database: MySQL 8.x
-- ============================================================

CREATE DATABASE IF NOT EXISTS news_aggregator
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE news_aggregator;

-- ============================================================
-- 1. news_sites - Nguon tin tuc
-- ============================================================
CREATE TABLE news_sites (
    site_id       VARCHAR(50)   NOT NULL PRIMARY KEY,
    name          VARCHAR(255)  NOT NULL,
    latest_page_url VARCHAR(500) NOT NULL,
    domain        VARCHAR(255)  NULL,
    category      VARCHAR(100)  NULL,
    language      VARCHAR(10)   NULL DEFAULT 'vi',
    last_crawled_at DATETIME    NULL,
    project_name  VARCHAR(100)  NULL,
    relevance_threshold INT     NOT NULL DEFAULT 70,
    target_languages JSON       NULL COMMENT 'e.g. ["vi","en","ko"]',
    active        TINYINT(1)    NOT NULL DEFAULT 1,
    content_selector VARCHAR(255) NULL COMMENT 'CSS selector to extract article content',
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_project_name (project_name),
    INDEX idx_active (active)
) ENGINE=InnoDB;

-- ============================================================
-- 2. processed_articles - Bai viet da crawl va phan loai
-- ============================================================
CREATE TABLE processed_articles (
    id                      BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_name            VARCHAR(100)  NOT NULL,
    site_id                 VARCHAR(50)   NOT NULL,
    source_language         VARCHAR(10)   NULL,
    article_url             VARCHAR(700)  NOT NULL,
    title                   VARCHAR(500)  NULL,
    published_at            DATETIME      NULL,
    published_at_vn         VARCHAR(50)   NULL,
    author                  VARCHAR(255)  NULL,
    description             TEXT          NULL,
    content_markdown        LONGTEXT      NULL,

    -- Classification
    is_relevant             TINYINT(1)    NOT NULL DEFAULT 0,
    relevance_score         INT           NOT NULL DEFAULT 0,
    classification_result   TEXT          NULL COMMENT 'Raw result string from CrewAI',
    classification_structured JSON        NULL COMMENT '{"is_relevant","relevance_score","matched_topics","reason","recommendation"}',

    -- Summary, Analysis & Translation (only for relevant articles)
    summary                 TEXT          NULL,
    analysis                TEXT          NULL,
    recommendation          TEXT          NULL,
    translations            JSON          NULL COMMENT '{"en":{"summary","content","analysis","recommendation"},"ko":{...}}',
    summary_translation_result TEXT       NULL COMMENT 'Raw result string from CrewAI',

    -- Report
    report_generated        TINYINT(1)    NOT NULL DEFAULT 0,

    created_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_article_url (article_url),
    INDEX idx_project_name (project_name),
    INDEX idx_site_id (site_id),
    INDEX idx_is_relevant (is_relevant),
    INDEX idx_report_generated (report_generated),
    INDEX idx_published_at (published_at),
    INDEX idx_project_relevant_report (project_name, is_relevant, report_generated),

    CONSTRAINT fk_processed_articles_site
        FOREIGN KEY (site_id) REFERENCES news_sites(site_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================
-- 3. report_results - Ket qua bao cao tu legal_task_report
-- ============================================================
CREATE TABLE report_results (
    id                BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_name      VARCHAR(100)  NOT NULL,
    article_url       VARCHAR(700)  NOT NULL,
    title             VARCHAR(500)  NULL,
    summary           TEXT          NULL,
    translations      JSON          NULL,
    report_result     TEXT          NULL COMMENT 'Raw result string from CrewAI',
    report_structured JSON          NULL COMMENT 'Structured JSON from CrewAI output',
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_project_name (project_name),
    INDEX idx_article_url (article_url),

    CONSTRAINT fk_report_article_url
        FOREIGN KEY (article_url) REFERENCES processed_articles(article_url)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 4. scheduler_configs - Cau hinh lich chay tu dong
-- ============================================================
CREATE TABLE scheduler_configs (
    job_id          VARCHAR(100)  NOT NULL PRIMARY KEY,
    project_name    VARCHAR(100)  NOT NULL,
    trigger_type    VARCHAR(20)   NOT NULL DEFAULT 'cron' COMMENT 'cron | interval',
    trigger_args    JSON          NOT NULL COMMENT 'e.g. {"hour":8,"minute":0} or {"minutes":30}',
    input_payload   JSON          NULL,
    enabled         TINYINT(1)    NOT NULL DEFAULT 1,
    timezone        VARCHAR(50)   NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_project_name (project_name),
    INDEX idx_enabled (enabled)
) ENGINE=InnoDB;

-- ============================================================
-- 5. project_runtime_configs - Cau hinh runtime cua project
-- ============================================================
CREATE TABLE project_runtime_configs (
    project_name    VARCHAR(100)  NOT NULL PRIMARY KEY,
    version         VARCHAR(50)   NULL,
    enabled         TINYINT(1)    NOT NULL DEFAULT 1,
    metadata        JSON          NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 6. agent_configs - Cau hinh agent trong CrewAI
-- ============================================================
CREATE TABLE agent_configs (
    id              BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_name    VARCHAR(100)  NOT NULL,
    agent_key       VARCHAR(100)  NOT NULL,
    role            VARCHAR(255)  NOT NULL,
    goal            TEXT          NOT NULL,
    backstory       TEXT          NOT NULL,
    tools           JSON          NULL COMMENT '["tool1","tool2"]',
    llm             VARCHAR(100)  NULL,
    verbose         TINYINT(1)    NOT NULL DEFAULT 1,
    allow_delegation TINYINT(1)   NOT NULL DEFAULT 0,
    enabled         TINYINT(1)    NOT NULL DEFAULT 1,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_project_agent (project_name, agent_key),

    CONSTRAINT fk_agent_project
        FOREIGN KEY (project_name) REFERENCES project_runtime_configs(project_name)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 7. task_configs - Cau hinh task trong CrewAI
-- ============================================================
CREATE TABLE task_configs (
    id                BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_name      VARCHAR(100)  NOT NULL,
    task_key          VARCHAR(100)  NOT NULL,
    description       TEXT          NOT NULL,
    expected_output   TEXT          NOT NULL,
    agent_key         VARCHAR(100)  NOT NULL,
    context_task_keys JSON          NULL COMMENT '["task1","task2"]',
    output_key        VARCHAR(100)  NULL,
    enabled           TINYINT(1)    NOT NULL DEFAULT 1,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_project_task (project_name, task_key),

    CONSTRAINT fk_task_project
        FOREIGN KEY (project_name) REFERENCES project_runtime_configs(project_name)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 8. crew_configs - Cau hinh crew trong CrewAI
-- ============================================================
CREATE TABLE crew_configs (
    id              BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_name    VARCHAR(100)  NOT NULL,
    crew_key        VARCHAR(100)  NOT NULL,
    process         VARCHAR(20)   NOT NULL DEFAULT 'sequential',
    agent_keys      JSON          NULL COMMENT '["agent1","agent2"]',
    task_keys       JSON          NULL COMMENT '["task1","task2"]',
    enabled         TINYINT(1)    NOT NULL DEFAULT 1,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_project_crew (project_name, crew_key),

    CONSTRAINT fk_crew_project
        FOREIGN KEY (project_name) REFERENCES project_runtime_configs(project_name)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 9. service_control_logs - Log cac lenh admin reset/restart
-- ============================================================
CREATE TABLE service_control_logs (
    id              BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    action          VARCHAR(50)   NOT NULL,
    reason          VARCHAR(500)  NULL,
    requested_by    VARCHAR(100)  NULL,
    project_name    VARCHAR(100)  NULL,
    hard_restart    TINYINT(1)    NOT NULL DEFAULT 0,
    status          VARCHAR(50)   NOT NULL,
    message         TEXT          NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- Sample data - News Sites
-- ============================================================
INSERT INTO news_sites (site_id, name, latest_page_url, domain, category, language, last_crawled_at, project_name, relevance_threshold, target_languages, active)
VALUES
    ('tn-legal-1', 'Bao Thanh Nien', 'https://thanhnien.vn/tin-moi.htm', 'thanhnien.vn', 'legal', 'vi', '2026-04-07 00:00:00', 'legal_task', 70, '["vi","en","ko"]', 1, 'div.detail-cmain'),
    ('dt-legal-1', 'Bao Dan tri', 'https://dantri.com.vn/tin-moi-nhat.htm', 'dantri.com.vn', 'legal', 'vi', '2026-04-07 00:00:00', 'legal_task', 70, '["vi","en","ko"]', 1, 'div.singular-content');

-- ============================================================
-- Sample data - Scheduler Configs
-- ============================================================
INSERT INTO scheduler_configs (job_id, project_name, trigger_type, trigger_args, input_payload, enabled, timezone)
VALUES
    ('legal_task_cron', 'legal_task', 'cron', '{"hour": 8, "minute": 0}', '{}', 1, 'Asia/Ho_Chi_Minh'),
    ('legal_task_report_cron', 'legal_task_report', 'cron', '{"hour": 9, "minute": 0}', '{}', 1, 'Asia/Ho_Chi_Minh');
