from src.api.mock_data.processed_articles import (
    MOCK_PROCESSED_ARTICLES,
    MOCK_REPORT_RESULTS,
)


class ProcessedArticleService:
    def get_processed_articles(
        self,
        project_name: str | None = None,
        require_summary: bool = False,
        require_relevant: bool = False,
        report_generated: bool | None = None,
    ) -> list[dict]:
        items = MOCK_PROCESSED_ARTICLES[:]
        if project_name:
            items = [item for item in items if item.get("project_name") == project_name]
        if require_summary:
            items = [item for item in items if item.get("summary")]
        if require_relevant:
            items = [item for item in items if item.get("is_relevant") is True]
        if report_generated is not None:
            items = [
                item
                for item in items
                if bool(item.get("report_generated", False)) == report_generated
            ]
        return items

    def save_processed_articles(self, payload: list[dict]) -> dict:
        MOCK_PROCESSED_ARTICLES.extend(payload)
        return {
            "status": "accepted",
            "saved_count": len(payload),
            "message": "Mock save completed",
        }

    def save_report_results(self, payload: list[dict]) -> dict:
        MOCK_REPORT_RESULTS.extend(payload)
        reported_urls = {item.get("article_url") for item in payload}
        for item in MOCK_PROCESSED_ARTICLES:
            if item.get("article_url") in reported_urls:
                item["report_generated"] = True
        return {
            "status": "accepted",
            "saved_count": len(payload),
            "message": "Mock report save completed",
        }
