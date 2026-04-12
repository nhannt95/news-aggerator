from src.common.models.news_site import NewsSite
from src.infrastructure.api_clients.news_source_api_client import NewsSourceApiClient


class SourceFetcher:
    def __init__(self, client: NewsSourceApiClient) -> None:
        self.client = client

    def fetch_sites(self, project_name: str | None = None) -> list[NewsSite]:
        raw_sites = self.client.get_latest_pages(project_name=project_name)
        return [
            NewsSite(
                site_id=str(item.get("site_id") or item.get("id", "")),
                name=item.get("name", ""),
                latest_page_url=item.get("latest_page_url", ""),
                domain=item.get("domain"),
                category=item.get("category"),
                language=item.get("language"),
                last_crawled_at=item.get("last_crawled_at"),
                project_name=item.get("project_name"),
                relevance_threshold=item.get("relevance_threshold", 70),
                target_languages=item.get("target_languages") or ["vi", "en"],
                active=item.get("active", True),
                fetch_method=item.get("fetch_method", "listing"),
                sitemap_url=item.get("sitemap_url"),
                listing_selector=item.get("listing_selector"),
                content_selector=item.get("content_selector"),
                article_url_pattern=item.get("article_url_pattern"),
            )
            for item in raw_sites
            if item.get("latest_page_url")
        ]
