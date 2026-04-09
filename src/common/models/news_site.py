from dataclasses import dataclass


@dataclass(slots=True)
class NewsSite:
    site_id: str
    name: str
    latest_page_url: str
    domain: str | None = None
    category: str | None = None
    language: str | None = None
    last_crawled_at: str | None = None
    project_name: str | None = None
    relevance_threshold: int = 70
    target_languages: list[str] | None = None
    active: bool = True
    content_selector: str | None = None
