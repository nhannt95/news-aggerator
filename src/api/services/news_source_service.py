import json

from src.infrastructure.db.mysql_client import execute, fetch_all, fetch_one


class NewsSourceService:
    def get_news_sites(self, project_name: str | None = None) -> list[dict]:
        if project_name:
            return fetch_all(
                "SELECT * FROM na_news_sites WHERE project_name = %s", (project_name,)
            )
        return fetch_all("SELECT * FROM na_news_sites")

    def get_news_site(self, site_id: str) -> dict | None:
        return fetch_one("SELECT * FROM na_news_sites WHERE site_id = %s", (site_id,))

    def create_news_site(self, data: dict) -> dict:
        execute(
            """INSERT INTO na_news_sites
            (site_id, name, latest_page_url, domain, category, language,
             last_crawled_at, project_name, relevance_threshold, target_languages,
             active, listing_selector, content_selector, article_url_pattern)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (
                data["site_id"], data["name"], data["latest_page_url"],
                data.get("domain"), data.get("category"), data.get("language", "vi"),
                data.get("last_crawled_at"), data.get("project_name"),
                data.get("relevance_threshold", 70),
                json.dumps(data.get("target_languages")) if data.get("target_languages") else None,
                1 if data.get("active", True) else 0,
                data.get("listing_selector"), data.get("content_selector"),
                data.get("article_url_pattern"),
            ),
        )
        return data

    def update_news_site(self, site_id: str, data: dict) -> dict:
        execute(
            """UPDATE na_news_sites SET
                name=%s, latest_page_url=%s, domain=%s, category=%s, language=%s,
                last_crawled_at=%s, project_name=%s, relevance_threshold=%s,
                target_languages=%s, active=%s, listing_selector=%s,
                content_selector=%s, article_url_pattern=%s
            WHERE site_id=%s""",
            (
                data.get("name"), data.get("latest_page_url"),
                data.get("domain"), data.get("category"), data.get("language"),
                data.get("last_crawled_at"), data.get("project_name"),
                data.get("relevance_threshold", 70),
                json.dumps(data.get("target_languages")) if data.get("target_languages") else None,
                1 if data.get("active", True) else 0,
                data.get("listing_selector"), data.get("content_selector"),
                data.get("article_url_pattern"),
                site_id,
            ),
        )
        return data

    def delete_news_site(self, site_id: str) -> None:
        execute("DELETE FROM na_news_sites WHERE site_id = %s", (site_id,))
