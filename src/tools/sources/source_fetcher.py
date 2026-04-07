from src.common.models.news_site import NewsSite
from src.infrastructure.api_clients.news_source_api_client import NewsSourceApiClient


class SourceFetcher:
    def __init__(self, client: NewsSourceApiClient) -> None:
        self.client = client

    def fetch_sites(self) -> list[NewsSite]:
        raw_sites = self.client.get_latest_pages()
        return [
            NewsSite(
                site_id=str(item.get("id", "")),
                name=item.get("name", ""),
                latest_page_url=item.get("latest_page_url", ""),
                domain=item.get("domain"),
                category=item.get("category"),
                active=item.get("active", True),
            )
            for item in raw_sites
            if item.get("latest_page_url")
        ]
