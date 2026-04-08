from typing import Any

from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig

from src.common.models.article import ArticleContent
from src.common.utils.datetime_utils import normalize_to_vietnam_time


class ArticleContentCrawler:
    def __init__(self) -> None:
        self.browser_config = BrowserConfig(headless=True, verbose=False)

    def _build_run_config(
        self,
        extract_method: str = "fit_markdown",
        content_selector: str | None = None,
    ) -> CrawlerRunConfig:
        if extract_method == "css_selector" and content_selector:
            return CrawlerRunConfig(
                cache_mode=CacheMode.BYPASS,
                css_selector=content_selector,
            )
        return CrawlerRunConfig(cache_mode=CacheMode.BYPASS)

    @staticmethod
    def _get_markdown_text(markdown: Any, extract_method: str = "fit_markdown") -> str:
        if markdown is None:
            return ""
        if isinstance(markdown, str):
            return markdown

        if extract_method == "fit_markdown":
            order = ("fit_markdown", "raw_markdown", "markdown_with_citations")
        else:
            order = ("raw_markdown", "fit_markdown", "markdown_with_citations")

        for attr in order:
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
        extract_method: str = "fit_markdown",
        content_selector: str | None = None,
    ) -> ArticleContent:
        run_config = self._build_run_config(extract_method, content_selector)
        result = await crawler.arun(url=url, config=run_config)
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
            content_markdown=self._get_markdown_text(
                getattr(result, "markdown", None), extract_method
            ).strip(),
            metadata=metadata,
        )

    async def crawl(
        self,
        url: str,
        extract_method: str = "fit_markdown",
        content_selector: str | None = None,
    ) -> ArticleContent:
        async with AsyncWebCrawler(config=self.browser_config) as crawler:
            return await self.crawl_article(
                crawler, url, extract_method, content_selector
            )

    async def crawl_many(
        self,
        urls: list[str],
        extract_method: str = "fit_markdown",
        content_selector: str | None = None,
    ) -> list[ArticleContent]:
        async with AsyncWebCrawler(config=self.browser_config) as crawler:
            results: list[ArticleContent] = []
            for url in urls:
                results.append(
                    await self.crawl_article(
                        crawler, url, extract_method, content_selector
                    )
                )
            return results
