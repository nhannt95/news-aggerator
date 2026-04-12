from dataclasses import dataclass, field


@dataclass(slots=True)
class ArticleLink:
    url: str
    title: str | None
    published_at: str | None
    published_at_vn: str | None
    keywords: list[str] = field(default_factory=list)


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
    images: list[dict[str, str]] = field(default_factory=list)
