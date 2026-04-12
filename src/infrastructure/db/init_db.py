import re
from pathlib import Path

import pymysql

from src.common.config.settings import settings
from src.common.logging.logger import get_logger


logger = get_logger(__name__)

SCHEMA_PATH = Path(__file__).resolve().parents[3] / "database" / "schema.sql"

TABLES = [
    "na_news_sites",
    "na_processed_articles",
    "na_report_results",
    "na_scheduler_configs",
    "na_project_runtime_configs",
    "na_agent_configs",
    "na_task_configs",
    "na_crew_configs",
    "na_service_control_logs",
    "na_accepted_article_translations",
]


def _ensure_database() -> None:
    conn = pymysql.connect(
        host=settings.mysql_host,
        port=settings.mysql_port,
        user=settings.mysql_user,
        password=settings.mysql_password,
        charset="utf8mb4",
    )
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{settings.mysql_database}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
    finally:
        conn.close()


def _get_existing_tables(conn: pymysql.Connection) -> set[str]:
    with conn.cursor() as cursor:
        cursor.execute("SHOW TABLES")
        return {row[0] for row in cursor.fetchall()}


def init_db() -> None:
    _ensure_database()

    conn = pymysql.connect(
        host=settings.mysql_host,
        port=settings.mysql_port,
        user=settings.mysql_user,
        password=settings.mysql_password,
        database=settings.mysql_database,
        charset="utf8mb4",
    )
    try:
        existing = _get_existing_tables(conn)
        missing = [t for t in TABLES if t not in existing]

        if not missing:
            logger.info("All tables exist, skipping init")
            return

        logger.info("Missing tables: %s — running schema.sql", missing)
        schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")

        # Remove everything before first CREATE TABLE
        idx = schema_sql.upper().find("CREATE TABLE")
        if idx == -1:
            logger.error("No CREATE TABLE found in schema.sql")
            return

        raw = schema_sql[idx:]

        # Remove SQL comments (-- ...)
        lines = [line for line in raw.splitlines() if not line.strip().startswith("--")]
        clean_sql = "\n".join(lines)

        # Split by ;\n (semicolon followed by newline)
        statements = re.split(r";\s*\n", clean_sql)

        with conn.cursor() as cursor:
            for i, stmt in enumerate(statements):
                stmt = stmt.strip()
                if not stmt:
                    continue
                try:
                    cursor.execute(stmt)
                    conn.commit()
                except pymysql.err.IntegrityError:
                    pass
                except Exception as e:
                    logger.warning("Statement %d failed: %s\n%s", i + 1, e, stmt[:100])

        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error("Database init failed: %s", e)
        raise
    finally:
        conn.close()
