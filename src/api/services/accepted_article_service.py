from src.infrastructure.db.mysql_client import execute, fetch_all, fetch_one


class AcceptedArticleService:
    def save_translations(self, article_id: int, translations: dict) -> None:
        """Save translations for a processed article. Each language = 1 row."""
        for lang, trans in translations.items():
            if not isinstance(trans, dict):
                continue
            execute(
                """INSERT INTO na_accepted_article_translations
                (article_id, language, title, summary, content, analysis, recommendation)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
                ON DUPLICATE KEY UPDATE
                    title=VALUES(title), summary=VALUES(summary),
                    content=VALUES(content), analysis=VALUES(analysis),
                    recommendation=VALUES(recommendation)""",
                (
                    article_id, lang,
                    trans.get("title"),
                    trans.get("summary"),
                    trans.get("content"),
                    trans.get("analysis"),
                    trans.get("recommendation"),
                ),
            )

    def get_translations(self, article_id: int) -> list[dict]:
        return fetch_all(
            "SELECT * FROM na_accepted_article_translations WHERE article_id = %s",
            (article_id,),
        )

    def get_article_with_translations(self, article_id: int) -> dict | None:
        article = fetch_one(
            "SELECT * FROM na_processed_articles WHERE id = %s", (article_id,)
        )
        if not article:
            return None
        translations = self.get_translations(article_id)
        article["translations"] = {t["language"]: t for t in translations}
        return article
