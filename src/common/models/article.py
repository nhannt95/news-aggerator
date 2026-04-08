from dataclasses import dataclass


@dataclass(slots=True)
class ArticleLink:
    url: str
    title: str | None
    published_at: str | None
    published_at_vn: str | None


@dataclass(slots=True)
class ArticleContent:
    url: str
    title: str | None
    published_at: str | None
    published_at_vn: str | None
    author: str | None
    description: str | None
    content_markdown: str
    metadata: dict
