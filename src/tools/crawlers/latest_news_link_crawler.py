import asyncio
import re
from dataclasses import dataclass
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig

from src.common.models.article import ArticleLink
from src.common.utils.datetime_utils import normalize_to_vietnam_time


@dataclass(slots=True)
class ListingPageResult:
    source_url: str
    articles: list[ArticleLink]


class _AnchorParser(HTMLParser):
    """Parse <a> tags from HTML and collect href + text."""

    def __init__(self) -> None:
        super().__init__()
        self.links: list[dict[str, str]] = []
        self._current_href: str | None = None
        self._current_text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "a":
            attr_dict = dict(attrs)
            href = (attr_dict.get("href") or "").strip()
            if href:
                self._current_href = href
                self._current_text = []

    def handle_data(self, data: str) -> None:
        if self._current_href is not None:
            self._current_text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._current_href is not None:
            title = " ".join(self._current_text).strip()
            self.links.append({"href": self._current_href, "title": title})
            self._current_href = None
            self._current_text = []


EXCLUDED_PREFIXES = (
    "/rss",
    "/tag",
    "/tags",
    "/video",
    "/podcast",
    "/search",
)


class LatestNewsLinkCrawler:
    def __init__(
        self,
        source_urls: list[str],
        listing_selector: str | None = None,
        article_url_pattern: str | None = None,
    ) -> None:
        self.source_urls = source_urls
        self.listing_selector = listing_selector
        self.article_pattern = re.compile(article_url_pattern, re.IGNORECASE) if article_url_pattern else None
        self.browser_config = BrowserConfig(headless=True, verbose=False)

    def _build_run_config(self) -> CrawlerRunConfig:
        js_scroll = """
        await new Promise(async (resolve) => {
            let prev = 0;
            for (let i = 0; i < 10; i++) {
                window.scrollTo(0, document.body.scrollHeight);
                await new Promise(r => setTimeout(r, 1500));
                if (document.body.scrollHeight === prev) break;
                prev = document.body.scrollHeight;
            }
            resolve();
        });
        """
        if self.listing_selector:
            return CrawlerRunConfig(
                cache_mode=CacheMode.BYPASS,
                css_selector=self.listing_selector,
                js_code=js_scroll,
                verbose=False,
            )
        return CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            js_code=js_scroll,
            verbose=False,
        )

    def _is_valid_article_url(self, url: str) -> bool:
        parsed = urlparse(url)
        path = parsed.path
        if not path or path == "/":
            return False
        if path.startswith(EXCLUDED_PREFIXES):
            return False
        if self.article_pattern:
            return bool(self.article_pattern.search(path))
        # Fallback: must have extension like .htm, .html
        return bool(re.search(r"\.\w+$", path))

    def _parse_anchors_from_html(self, html: str, base_url: str) -> list[dict[str, str]]:
        parser = _AnchorParser()
        parser.feed(html)

        base_domain = urlparse(base_url).netloc
        seen: set[str] = set()
        results: list[dict[str, str]] = []

        for link in parser.links:
            href = link["href"]
            full_url = urljoin(base_url, href)
            parsed = urlparse(full_url)

            # Only same domain
            if parsed.netloc != base_domain:
                continue
            if not self._is_valid_article_url(full_url):
                continue
            if full_url in seen:
                continue

            seen.add(full_url)
            results.append({"url": full_url, "title": link["title"]})

        return results

    async def crawl_article_info(
        self,
        crawler: AsyncWebCrawler,
        url: str,
        title_from_listing: str | None = None,
    ) -> ArticleLink:
        result = await crawler.arun(
            url=url, config=CrawlerRunConfig(cache_mode=CacheMode.BYPASS, verbose=False)
        )
        if not result.success:
            return ArticleLink(
                url=url,
                title=title_from_listing,
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

        title = (
            metadata.get("title")
            or metadata.get("og:title")
            or metadata.get("twitter:title")
            or title_from_listing
            or url
        )

        return ArticleLink(
            url=getattr(result, "url", url),
            title=title.strip() if isinstance(title, str) else title,
            published_at=published_at,
            published_at_vn=published_at_vn,
        )

    async def extract_links_from_listing(
        self,
        crawler: AsyncWebCrawler,
        source_url: str,
        limit: int | None = None,
    ) -> ListingPageResult:
        run_config = self._build_run_config()
        result = await crawler.arun(url=source_url, config=run_config)
        if not result.success:
            raise RuntimeError(
                f"Khong crawl duoc trang danh sach: {result.error_message or source_url}"
            )

        if self.listing_selector and result.html:
            # Parse <a> from CSS-scoped HTML
            anchors = self._parse_anchors_from_html(result.html, source_url)
        else:
            # Fallback: use crawl4ai internal links
            internal_links = result.links.get("internal", []) if result.links else []
            anchors = []
            for link in internal_links:
                href = (link or {}).get("href", "").strip()
                if not href:
                    continue
                parsed = urlparse(href)
                if self._is_valid_article_url(href):
                    anchors.append({"url": href, "title": (link or {}).get("text", "")})

        if limit is not None:
            anchors = anchors[:limit]

        articles: list[ArticleLink] = []
        for anchor in anchors:
            articles.append(
                await self.crawl_article_info(
                    crawler, anchor["url"], anchor.get("title")
                )
            )

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
