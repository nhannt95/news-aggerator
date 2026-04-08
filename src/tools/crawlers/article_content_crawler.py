from typing import Any

from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig

from src.common.models.article import ArticleContent
from src.common.utils.datetime_utils import normalize_to_vietnam_time


class ArticleContentCrawler:
    def __init__(self) -> None:
        self.browser_config = BrowserConfig(headless=True, verbose=False)
        self.run_config = CrawlerRunConfig(cache_mode=CacheMode.BYPASS)

    @staticmethod
    def _get_markdown_text(markdown: Any) -> str:
        if markdown is None:
            return ""
        if isinstance(markdown, str):
            return markdown

        for attr in ("fit_markdown", "raw_markdown", "markdown_with_citations"):
            value = getattr(markdown, attr, None)
            if value:
                return value

        return str(markdown)

    @staticmethod
    def _get_title(metadata: dict, fallback_url: str) -> str | None:
        title = (
            metadata.get("title")
            or metadata.get("og:title")
            or metadata.get("twitter:title")
        )
        if title:
            return title.strip()
        return fallback_url

    async def crawl_article(
        self,
        crawler: AsyncWebCrawler,
        url: str,
    ) -> ArticleContent:
        result = await crawler.arun(url=url, config=self.run_config)
        if not result.success:
            raise RuntimeError(f"Khong crawl duoc bai viet: {result.error_message or url}")

        metadata = result.metadata or {}
        raw_published_at = (
            metadata.get("article:published_time")
            or metadata.get("published_time")
            or metadata.get("datePublished")
            or metadata.get("pubdate")
        )
        published_at, published_at_vn = normalize_to_vietnam_time(raw_published_at)

        return ArticleContent(
            url=getattr(result, "url", url),
            title=self._get_title(metadata, url),
            published_at=published_at,
            published_at_vn=published_at_vn,
            author=metadata.get("author"),
            description=metadata.get("description")
            or metadata.get("og:description")
            or metadata.get("twitter:description"),
            content_markdown=self._get_markdown_text(getattr(result, "markdown", None)).strip(),
            metadata=metadata,
        )

    async def crawl(self, url: str) -> ArticleContent:
        async with AsyncWebCrawler(config=self.browser_config) as crawler:
            return await self.crawl_article(crawler, url)

    async def crawl_many(self, urls: list[str]) -> list[ArticleContent]:
        async with AsyncWebCrawler(config=self.browser_config) as crawler:
            results: list[ArticleContent] = []
            for url in urls:
                results.append(await self.crawl_article(crawler, url))
            return results
