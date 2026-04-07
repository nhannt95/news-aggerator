from dataclasses import dataclass


@dataclass(slots=True)
class ArticleLink:
    url: str
    title: str | None
    published_at: str | None
    published_at_vn: str | None
