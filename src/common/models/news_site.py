from dataclasses import dataclass


@dataclass(slots=True)
class NewsSite:
    site_id: str
    name: str
    latest_page_url: str
    domain: str | None = None
    category: str | None = None
    active: bool = True
