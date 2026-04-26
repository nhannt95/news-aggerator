-- ============================================================
-- Addendum: New tables for Admin / Access Control / Email
-- Run AFTER the main database/schema.sql
-- Không dùng FOREIGN KEY để tránh lỗi 1215.
-- ============================================================

USE news_aggregator;

CREATE TABLE IF NOT EXISTS na_users (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    email        VARCHAR(191) NOT NULL,
    name         VARCHAR(255) NOT NULL,
    role         ENUM('admin','editor','viewer') NOT NULL DEFAULT 'viewer',
    status       ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uq_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS na_project_access (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    project_name VARCHAR(100) NOT NULL,
    user_id      INT NOT NULL,
    role         ENUM('admin','editor','viewer') NOT NULL DEFAULT 'viewer',
    granted_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_access (project_name, user_id),
    INDEX idx_project (project_name),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS na_email_recipients (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    project_name   VARCHAR(100) NOT NULL,
    task_key       VARCHAR(100),
    email          VARCHAR(255) NOT NULL,
    recipient_type ENUM('user','group','department') NOT NULL DEFAULT 'user',
    name           VARCHAR(255),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_project_task (project_name, task_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agent run logs — lưu lịch sử chạy từng agent theo project
CREATE TABLE IF NOT EXISTS na_agent_run_logs (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_name VARCHAR(100)  NOT NULL,
    agent_key    VARCHAR(100)  NOT NULL,
    task_key     VARCHAR(100)  NULL,
    run_id       VARCHAR(100)  NULL,
    status       ENUM('running','success','error','cancelled') NOT NULL DEFAULT 'running',
    started_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at  DATETIME      NULL,
    duration_ms  INT           NULL,
    log_text     LONGTEXT      NULL,
    error_msg    TEXT          NULL,
    INDEX idx_project      (project_name),
    INDEX idx_project_agent (project_name, agent_key),
    INDEX idx_status       (status),
    INDEX idx_started      (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample users
INSERT IGNORE INTO na_users (email, name, role, status) VALUES
('admin@synthetica.com',   'Trần Admin',    'admin',  'active'),
('legal@synthetica.com',   'Legal Manager', 'editor', 'active'),
('analyst@synthetica.com', 'Data Analyst',  'viewer', 'active'),
('ops@synthetica.com',     'Ops Lead',      'editor', 'inactive');
