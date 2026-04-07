import asyncio
import re
from dataclasses import dataclass
from typing import Pattern
from urllib.parse import urlparse

from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig

from src.common.models.article import ArticleLink
from src.common.utils.datetime_utils import normalize_to_vietnam_time


ARTICLE_URL_PATTERN = re.compile(r"-185\d+(?:\.htm)?$", re.IGNORECASE)


@dataclass(slots=True)
class ListingPageResult:
    source_url: str
    articles: list[ArticleLink]


class LatestNewsLinkCrawler:
    def __init__(
        self,
        source_urls: list[str],
        article_pattern: Pattern[str] = ARTICLE_URL_PATTERN,
        excluded_prefixes: tuple[str, ...] = (
            "/rss",
            "/tag",
            "/tags",
            "/video",
            "/podcast",
            "/search",
        ),
    ) -> None:
        self.source_urls = source_urls
        self.article_pattern = article_pattern
        self.excluded_prefixes = excluded_prefixes
        self.browser_config = BrowserConfig(headless=True, verbose=False)
        self.run_config = CrawlerRunConfig(cache_mode=CacheMode.BYPASS)

    def is_article_url(self, url: str) -> bool:
        parsed = urlparse(url)
        if not parsed.netloc:
            return False

        path = parsed.path.lower()
        if not path or path == "/":
            return False
        if path.startswith(self.excluded_prefixes):
            return False
        return bool(self.article_pattern.search(path))

    @staticmethod
    def get_article_title(result: object, fallback_url: str) -> str | None:
        metadata = getattr(result, "metadata", None) or {}
        title = (
            metadata.get("title")
            or metadata.get("og:title")
            or metadata.get("twitter:title")
        )
        if title:
            return title.strip()
        return fallback_url

    async def crawl_article_info(
        self,
        crawler: AsyncWebCrawler,
        url: str,
    ) -> ArticleLink:
        result = await crawler.arun(url=url, config=self.run_config)
        if not result.success:
            return ArticleLink(
                url=url,
                title=None,
                published_at=None,
                published_at_vn=None,
            )

        metadata = result.metadata or {}
        raw_published_at = (
            metadata.get("article:published_time")
            or metadata.get("published_time")
            or metadata.get("datePublished")
            or metadata.get("pubdate")
        )
        published_at, published_at_vn = normalize_to_vietnam_time(raw_published_at)

        return ArticleLink(
            url=getattr(result, "url", url),
            title=self.get_article_title(result, url),
            published_at=published_at,
            published_at_vn=published_at_vn,
        )

    async def extract_links_from_listing(
        self,
        crawler: AsyncWebCrawler,
        source_url: str,
        limit: int | None = None,
    ) -> ListingPageResult:
        result = await crawler.arun(url=source_url, config=self.run_config)
        if not result.success:
            raise RuntimeError(
                f"Khong crawl duoc trang danh sach: {result.error_message or source_url}"
            )

        internal_links = result.links.get("internal", []) if result.links else []
        seen: set[str] = set()
        article_urls: list[str] = []

        for link in internal_links:
            href = (link or {}).get("href", "").strip()
            if not href or href in seen:
                continue
            if not self.is_article_url(href):
                continue

            seen.add(href)
            article_urls.append(href)

            if limit is not None and len(article_urls) >= limit:
                break

        articles: list[ArticleLink] = []
        for article_url in article_urls:
            articles.append(await self.crawl_article_info(crawler, article_url))

        return ListingPageResult(source_url=source_url, articles=articles)

    async def extract_latest_links(
        self,
        limit_per_source: int | None = None,
    ) -> list[ListingPageResult]:
        async with AsyncWebCrawler(config=self.browser_config) as crawler:
            tasks = [
                self.extract_links_from_listing(
                    crawler=crawler,
                    source_url=source_url,
                    limit=limit_per_source,
                )
                for source_url in self.source_urls
            ]
            return await asyncio.gather(*tasks)
