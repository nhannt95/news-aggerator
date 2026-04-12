import json
from datetime import datetime

from src.infrastructure.db.mysql_client import execute, fetch_all


def _parse_datetime(value) -> str | None:
    """Convert ISO datetime string to MySQL DATETIME format."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    s = str(value).strip()
    if not s:
        return None
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(s)
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except ValueError:
        return s[:19] if len(s) >= 19 else s


class ProcessedArticleService:
    def get_processed_articles(
        self,
        project_name: str | None = None,
        require_summary: bool = False,
        require_relevant: bool = False,
        report_generated: bool | None = None,
    ) -> list[dict]:
        conditions: list[str] = []
        params: list = []

        if project_name:
            conditions.append("project_name = %s")
            params.append(project_name)
        if require_summary:
            conditions.append("summary IS NOT NULL AND summary != ''")
        if require_relevant:
            conditions.append("is_relevant = 1")
        if report_generated is not None:
            conditions.append("report_generated = %s")
            params.append(1 if report_generated else 0)

        sql = "SELECT * FROM na_processed_articles"
        if conditions:
            sql += " WHERE " + " AND ".join(conditions)
        sql += " ORDER BY created_at DESC"

        return fetch_all(sql, tuple(params))

    def save_processed_articles(self, payload: list[dict]) -> dict:
        if not payload:
            return {"status": "skipped", "saved_count": 0}

        saved = 0
        for item in payload:
            execute(
                """INSERT INTO na_processed_articles
                (project_name, site_id, source_language, article_url, title,
                 published_at, published_at_vn, author, description,
                 is_relevant, relevance_score, classification_result,
                 classification_structured)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON DUPLICATE KEY UPDATE
                    is_relevant=VALUES(is_relevant),
                    relevance_score=VALUES(relevance_score),
                    classification_result=VALUES(classification_result),
                    classification_structured=VALUES(classification_structured)""",
                (
                    item.get("project_name"), item.get("site_id"),
                    item.get("source_language"), item.get("article_url"),
                    item.get("title"), _parse_datetime(item.get("published_at")),
                    item.get("published_at_vn"), item.get("author"),
                    item.get("description"),
                    1 if item.get("is_relevant") else 0,
                    item.get("relevance_score", 0),
                    item.get("classification_result"),
                    json.dumps(item.get("classification_structured")) if item.get("classification_structured") else None,
                ),
            )
            saved += 1

        return {"status": "accepted", "saved_count": saved}

    def save_report_results(self, payload: list[dict]) -> dict:
        if not payload:
            return {"status": "skipped", "saved_count": 0}

        saved = 0
        for item in payload:
            execute(
                """INSERT INTO na_report_results
                (project_name, article_url, title, summary, translations,
                 report_result, report_structured)
                VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                (
                    item.get("project_name"), item.get("article_url"),
                    item.get("title"), item.get("summary"),
                    json.dumps(item.get("translations")) if item.get("translations") else None,
                    item.get("report_result"),
                    json.dumps(item.get("report_structured")) if item.get("report_structured") else None,
                ),
            )
            saved += 1

        # Mark articles as report_generated
        urls = [item.get("article_url") for item in payload if item.get("article_url")]
        if urls:
            placeholders = ",".join(["%s"] * len(urls))
            execute(
                f"UPDATE na_processed_articles SET report_generated = 1 WHERE article_url IN ({placeholders})",
                tuple(urls),
            )

        return {"status": "accepted", "saved_count": saved}
