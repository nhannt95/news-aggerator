from typing import Any

from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig

from src.common.models.article import ArticleContent
from src.common.utils.datetime_utils import normalize_to_vietnam_time
from src.tools.images.image_downloader import download_images


class ArticleContentCrawler:
    def __init__(self) -> None:
        self.browser_config = BrowserConfig(headless=True, verbose=False)

    @staticmethod
    def _build_run_config(content_selector: str | None = None) -> CrawlerRunConfig:
        if content_selector:
            return CrawlerRunConfig(
                cache_mode=CacheMode.BYPASS,
                css_selector=content_selector,
            )
        return CrawlerRunConfig(cache_mode=CacheMode.BYPASS)

    @staticmethod
    def _get_markdown_text(markdown: Any) -> str:
        if markdown is None:
            return ""
        if isinstance(markdown, str):
            return markdown

        for attr in ("raw_markdown", "markdown_with_citations"):
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
        content_selector: str | None = None,
        site_id: str | None = None,
    ) -> ArticleContent:
        run_config = self._build_run_config(content_selector)
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

        raw_content = self._get_markdown_text(
            getattr(result, "markdown", None)
        ).strip()

        images: list[dict[str, str]] = []
        if site_id:
            raw_content, images = download_images(raw_content, site_id, url)

        return ArticleContent(
            url=getattr(result, "url", url),
            title=self._get_title(metadata, url),
            published_at=published_at,
            published_at_vn=published_at_vn,
            author=metadata.get("author"),
            description=metadata.get("description")
            or metadata.get("og:description")
            or metadata.get("twitter:description"),
            content_markdown=raw_content,
            metadata=metadata,
            images=images,
        )

    async def crawl(
        self,
        url: str,
        content_selector: str | None = None,
        site_id: str | None = None,
    ) -> ArticleContent:
        async with AsyncWebCrawler(config=self.browser_config) as crawler:
            return await self.crawl_article(crawler, url, content_selector, site_id)

    async def crawl_many(
        self,
        urls: list[str],
        content_selector: str | None = None,
        site_id: str | None = None,
    ) -> list[ArticleContent]:
        async with AsyncWebCrawler(config=self.browser_config) as crawler:
            results: list[ArticleContent] = []
            for url in urls:
                results.append(
                    await self.crawl_article(crawler, url, content_selector, site_id)
                )
            return results
