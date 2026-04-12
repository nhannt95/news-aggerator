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
CREATE TABLE na_news_sites (
    site_id       VARCHAR(50)   NOT NULL PRIMARY KEY,
    name          VARCHAR(255)  NOT NULL,
    latest_page_url VARCHAR(500) NOT NULL,
    domain        VARCHAR(255)  NULL,
    category      VARCHAR(100)  NULL,
    language      VARCHAR(10)   NULL DEFAULT 'vi',
    last_crawled_at DATETIME    NULL,
    project_name  VARCHAR(100)  NULL,
    relevance_threshold INT     NOT NULL DEFAULT 70,
    target_languages TEXT       NULL,
    active        TINYINT(1)    NOT NULL DEFAULT 1,
    listing_selector VARCHAR(255) NULL,
    content_selector VARCHAR(255) NULL,
    article_url_pattern VARCHAR(255) NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_project_name (project_name),
    INDEX idx_active (active)
) ENGINE=InnoDB;

-- ============================================================
-- 2. processed_articles - Bai viet da crawl va phan loai
-- ============================================================
CREATE TABLE na_processed_articles (
    id                      BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_name            VARCHAR(100)  NOT NULL,
    site_id                 VARCHAR(50)   NOT NULL,
    source_language         VARCHAR(10)   NULL,
    article_url             VARCHAR(500)  NOT NULL,
    title                   VARCHAR(500)  NULL,
    published_at            DATETIME      NULL,
    published_at_vn         VARCHAR(50)   NULL,
    author                  VARCHAR(255)  NULL,
    description             TEXT          NULL,

    -- Classification
    is_relevant             TINYINT(1)    NOT NULL DEFAULT 0,
    relevance_score         INT           NOT NULL DEFAULT 0,
    classification_result   TEXT          NULL,
    classification_structured TEXT        NULL,

    -- Approval
    status                  VARCHAR(20)   NOT NULL DEFAULT 'pending',
    approved_by             VARCHAR(100)  NULL,
    approved_at             DATETIME      NULL,
    approval_notes          TEXT          NULL,

    created_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_article_url (article_url(191)),
    INDEX idx_project_name (project_name),
    INDEX idx_site_id (site_id),
    INDEX idx_is_relevant (is_relevant),
    INDEX idx_published_at (published_at),

    CONSTRAINT fk_processed_articles_site
        FOREIGN KEY (site_id) REFERENCES na_news_sites(site_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================
-- 3. report_results - Ket qua bao cao tu legal_task_report
-- ============================================================
CREATE TABLE na_report_results (
    id                BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_name      VARCHAR(100)  NOT NULL,
    article_url       VARCHAR(700)  NOT NULL,
    title             VARCHAR(500)  NULL,
    summary           TEXT          NULL,
    translations      TEXT          NULL,
    report_result     TEXT          NULL,
    report_structured TEXT          NULL,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_project_name (project_name),
    INDEX idx_article_url (article_url(191))
) ENGINE=InnoDB;

-- ============================================================
-- 4. scheduler_configs - Cau hinh lich chay tu dong
-- ============================================================
CREATE TABLE na_scheduler_configs (
    job_id          VARCHAR(100)  NOT NULL PRIMARY KEY,
    project_name    VARCHAR(100)  NOT NULL,
    trigger_type    VARCHAR(20)   NOT NULL DEFAULT 'cron',
    trigger_args    TEXT          NOT NULL,
    input_payload   TEXT          NULL,
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
CREATE TABLE na_project_runtime_configs (
    project_name    VARCHAR(100)  NOT NULL PRIMARY KEY,
    version         VARCHAR(50)   NULL,
    enabled         TINYINT(1)    NOT NULL DEFAULT 1,
    require_approval TINYINT(1)   NOT NULL DEFAULT 1,
    run_status      VARCHAR(20)  NOT NULL DEFAULT 'idle',
    last_run_at     DATETIME     NULL,
    last_run_duration INT        NULL,
    metadata        TEXT          NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 6. agent_configs - Cau hinh agent trong CrewAI
-- ============================================================
CREATE TABLE na_agent_configs (
    id              BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_name    VARCHAR(100)  NOT NULL,
    agent_key       VARCHAR(100)  NOT NULL,
    role            VARCHAR(255)  NOT NULL,
    goal            TEXT          NOT NULL,
    backstory       TEXT          NOT NULL,
    tools           TEXT          NULL,
    llm             VARCHAR(100)  NULL,
    verbose         TINYINT(1)    NOT NULL DEFAULT 1,
    allow_delegation TINYINT(1)   NOT NULL DEFAULT 0,
    enabled         TINYINT(1)    NOT NULL DEFAULT 1,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_project_agent (project_name, agent_key),

    CONSTRAINT fk_agent_project
        FOREIGN KEY (project_name) REFERENCES na_project_runtime_configs(project_name)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 7. task_configs - Cau hinh task trong CrewAI
-- ============================================================
CREATE TABLE na_task_configs (
    id                BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_name      VARCHAR(100)  NOT NULL,
    task_key          VARCHAR(100)  NOT NULL,
    description       TEXT          NOT NULL,
    expected_output   TEXT          NOT NULL,
    agent_key         VARCHAR(100)  NOT NULL,
    context_task_keys TEXT          NULL,
    output_key        VARCHAR(100)  NULL,
    enabled           TINYINT(1)    NOT NULL DEFAULT 1,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_project_task (project_name, task_key),

    CONSTRAINT fk_task_project
        FOREIGN KEY (project_name) REFERENCES na_project_runtime_configs(project_name)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 8. crew_configs - Cau hinh crew trong CrewAI
-- ============================================================
CREATE TABLE na_crew_configs (
    id              BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_name    VARCHAR(100)  NOT NULL,
    crew_key        VARCHAR(100)  NOT NULL,
    process         VARCHAR(20)   NOT NULL DEFAULT 'sequential',
    agent_keys      TEXT          NULL,
    task_keys       TEXT          NULL,
    enabled         TINYINT(1)    NOT NULL DEFAULT 1,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_project_crew (project_name, crew_key),

    CONSTRAINT fk_crew_project
        FOREIGN KEY (project_name) REFERENCES na_project_runtime_configs(project_name)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 9. service_control_logs - Log cac lenh admin reset/restart
-- ============================================================
CREATE TABLE na_service_control_logs (
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
-- 10. accepted_article_translations - Chi tiet da ngon ngu
-- ============================================================
CREATE TABLE na_accepted_article_translations (
    id              BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
    article_id      BIGINT        NOT NULL,
    language        VARCHAR(10)   NOT NULL,
    title           VARCHAR(500)  NULL,
    summary         TEXT          NULL,
    content         LONGTEXT      NULL,
    analysis        TEXT          NULL,
    recommendation  TEXT          NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_article_lang (article_id, language),
    INDEX idx_article_id (article_id),

    CONSTRAINT fk_translation_processed
        FOREIGN KEY (article_id) REFERENCES na_processed_articles(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- Sample data - News Sites
-- ============================================================
INSERT INTO na_news_sites (site_id, name, latest_page_url, domain, category, language, last_crawled_at, project_name, relevance_threshold, target_languages, active, listing_selector, content_selector, article_url_pattern)
VALUES
    ('tn-legal-1', 'Bao Thanh Nien', 'https://thanhnien.vn/tin-moi.htm', 'thanhnien.vn', 'legal', 'vi', '2026-04-07 00:00:00', 'legal_task', 70, '["vi","en","ko"]', 1, 'div.box-category-middle.list__main_check', 'div.detail-cmain', '-185\\d+\\.htm$'),
    ('dt-legal-1', 'Bao Dan tri', 'https://dantri.com.vn/tin-moi-nhat.htm', 'dantri.com.vn', 'legal', 'vi', '2026-04-07 00:00:00', 'legal_task', 70, '["vi","en","ko"]', 1, 'div.article.list', 'div.singular-content', '-\\d+\\.htm$');

-- ============================================================
-- Sample data - Scheduler Configs
-- ============================================================
INSERT INTO na_scheduler_configs (job_id, project_name, trigger_type, trigger_args, input_payload, enabled, timezone)
VALUES
    ('legal_task_ingest', 'legal_task', 'cron', '{"hour": "0,6,12", "minute": 0}', '{}', 1, 'Asia/Ho_Chi_Minh'),
    ('legal_task_report_14h', 'legal_task_report', 'cron', '{"hour": 14, "minute": 0}', '{}', 1, 'Asia/Ho_Chi_Minh'),
    ('er_task_every_15m', 'er_task', 'cron', '{"minute": "*/15"}', '{"topic": "emergency"}', 1, 'Asia/Ho_Chi_Minh');

-- ============================================================
-- Sample data - Project Runtime Configs
-- ============================================================
INSERT INTO na_project_runtime_configs (project_name, version, enabled, require_approval, metadata)
VALUES
    ('legal_task', '2026-04-07.1', 1, 1, '{"description": "Legal monitoring workflow", "owner": "legal-team"}'),
    ('er_task', '2026-04-07.1', 1, 0, '{"description": "ER monitoring workflow", "owner": "ops-team"}'),
    ('legal_task_report', '2026-04-08.1', 1, 0, '{"description": "Legal reporting workflow", "owner": "legal-team"}');

-- Sample data - Agent Configs
INSERT INTO na_agent_configs (project_name, agent_key, role, goal, backstory, tools, llm, verbose, allow_delegation, enabled)
VALUES
    ('legal_task', 'title_screener', 'Legal News Title Screener', 'Quickly screen article titles to identify potentially relevant legal news.', 'Pre-filters articles by title before expensive content analysis.', '[]', 'llama3.2:1b', 1, 0, 1),
    ('legal_task', 'classifier', 'Legal News Classifier', 'Classify legal articles by relevance, topic, and urgency based on full content.', 'Performs deep classification on pre-screened articles.', '[]', 'llama3.2:1b', 1, 0, 1),
    ('legal_task', 'reporter', 'Legal Report Writer', 'Write concise legal reports from classified findings.', 'Summarizes legal developments into usable output.', '[]', 'llama3.2:1b', 1, 0, 1),
    ('legal_task', 'summary_translator', 'Legal Summary, Analysis And Translation Specialist', 'Summarize and analyze relevant legal articles, then translate into all target languages.', 'Creates concise summaries, analysis, and full multilingual outputs.', '[]', 'llama3.2:1b', 1, 0, 1),
    ('er_task', 'classifier', 'ER News Classifier', 'Classify ER articles by urgency, impact, and severity.', 'Screens emergency-response news for downstream workflows.', '[]', 'llama3.2:1b', 1, 0, 1),
    ('er_task', 'reporter', 'ER Report Writer', 'Write concise ER reports from classified findings.', 'Converts urgent article signals into operational output.', '[]', 'llama3.2:1b', 1, 0, 1),
    ('legal_task_report', 'reporter', 'Legal Report Writer', 'Write concise legal reports from summarized legal findings.', 'Produces report outputs from already processed legal articles.', '[]', 'llama3.2:1b', 1, 0, 1);

-- Sample data - Task Configs
INSERT INTO na_task_configs (project_name, task_key, description, expected_output, agent_key, context_task_keys, output_key, enabled)
VALUES
    ('legal_task', 'screen_titles', 'Review the list of article titles and select those that are potentially relevant to legal topics.', 'A TEXT list of article URLs that passed the title screening.', 'title_screener', '[]', 'title_screening_result', 1),
    ('legal_task', 'classify_articles', 'Classify the legal article by topic and urgency based on its full content.', 'A structured classification result for the article.', 'classifier', '[]', 'classification_result', 1),
    ('legal_task', 'write_report', 'Write the final legal report from classified articles.', 'A concise legal report for downstream users.', 'reporter', '["classify_articles"]', 'report_result', 1),
    ('legal_task', 'summarize_article', 'Summarize the relevant legal article. Provide analysis and recommendation.', 'A summary, analysis, and recommendation in source language.', 'summary_translator', '[]', 'summary_result', 1),
    ('legal_task', 'translate_summary', 'Translate the summary, content, analysis, and recommendation into each target language.', 'A multilingual translation package.', 'summary_translator', '["summarize_article"]', 'translation_result', 1),
    ('er_task', 'classify_articles', 'Classify crawled ER articles by urgency and severity.', 'A structured classified list of ER articles.', 'classifier', '[]', 'classification_result', 1),
    ('er_task', 'write_report', 'Write the final ER report from classified articles.', 'A concise ER report for operations teams.', 'reporter', '["classify_articles"]', 'report_result', 1),
    ('legal_task_report', 'write_report', 'Write the final legal report from provided summary, translations, and classification result.', 'A concise legal report for downstream users.', 'reporter', '[]', 'report_result', 1);

-- Sample data - Crew Configs
INSERT INTO na_crew_configs (project_name, crew_key, process, agent_keys, task_keys, enabled)
VALUES
    ('legal_task', 'title_screening', 'sequential', '["title_screener"]', '["screen_titles"]', 1),
    ('legal_task', 'classification', 'sequential', '["classifier"]', '["classify_articles"]', 1),
    ('legal_task', 'reporting', 'sequential', '["reporter"]', '["write_report"]', 1),
    ('legal_task', 'summary_translation', 'sequential', '["summary_translator"]', '["summarize_article", "translate_summary"]', 1),
    ('er_task', 'classification', 'sequential', '["classifier"]', '["classify_articles"]', 1),
    ('er_task', 'reporting', 'sequential', '["reporter"]', '["write_report"]', 1),
    ('legal_task_report', 'reporting', 'sequential', '["reporter"]', '["write_report"]', 1);
