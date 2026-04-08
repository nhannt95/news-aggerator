from src.api.mock_data.news_sites import MOCK_NEWS_SITES


class NewsSourceService:
    def get_news_sites(self, project_name: str | None = None) -> list[dict]:
        if not project_name:
            return MOCK_NEWS_SITES
        return [
            item for item in MOCK_NEWS_SITES if item.get("project_name") == project_name
        ]
