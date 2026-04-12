import re
from dataclasses import dataclass
from xml.etree import ElementTree

import httpx

from src.common.logging.logger import get_logger
from src.common.models.article import ArticleLink
from src.common.utils.datetime_utils import normalize_to_vietnam_time


logger = get_logger(__name__)

SITEMAP_NS = {
    "sm": "http://www.sitemaps.org/schemas/sitemap/0.9",
    "news": "http://www.google.com/schemas/sitemap-news/0.9",
}


@dataclass(slots=True)
class SitemapResult:
    source_url: str
    articles: list[ArticleLink]


class SitemapCrawler:
    def __init__(
        self,
        sitemap_url: str,
        article_url_pattern: str | None = None,
    ) -> None:
        self.sitemap_url = sitemap_url
        self.article_pattern = re.compile(article_url_pattern, re.IGNORECASE) if article_url_pattern else None

    def _is_valid_url(self, url: str) -> bool:
        if self.article_pattern:
            return bool(self.article_pattern.search(url))
        return True

    def fetch(self) -> SitemapResult:
        with httpx.Client(timeout=30, follow_redirects=True) as client:
            resp = client.get(self.sitemap_url)
            resp.raise_for_status()

        root = ElementTree.fromstring(resp.content)

        # Check if this is a sitemap index (contains other sitemaps)
        sitemap_locs = root.findall("sm:sitemap/sm:loc", SITEMAP_NS)
        if sitemap_locs:
            return self._fetch_sitemap_index(sitemap_locs)

        return self._parse_urlset(root)

    def _fetch_sitemap_index(self, sitemap_locs: list) -> SitemapResult:
        all_articles: list[ArticleLink] = []
        with httpx.Client(timeout=30, follow_redirects=True) as client:
            for loc_el in sitemap_locs:
                sub_url = loc_el.text.strip()
                try:
                    resp = client.get(sub_url)
                    resp.raise_for_status()
                    sub_root = ElementTree.fromstring(resp.content)
                    result = self._parse_urlset(sub_root)
                    all_articles.extend(result.articles)
                except Exception:
                    logger.warning("Failed to fetch sub-sitemap: %s", sub_url)
        return SitemapResult(source_url=self.sitemap_url, articles=all_articles)

    def _parse_urlset(self, root: ElementTree.Element) -> SitemapResult:
        articles: list[ArticleLink] = []

        for url_el in root.findall("sm:url", SITEMAP_NS):
            loc = url_el.findtext("sm:loc", namespaces=SITEMAP_NS)
            if not loc:
                continue
            loc = loc.strip()

            if not self._is_valid_url(loc):
                continue

            # Try news:publication_date first, then lastmod
            pub_date = (
                url_el.findtext("news:news/news:publication_date", namespaces=SITEMAP_NS)
                or url_el.findtext("sm:lastmod", namespaces=SITEMAP_NS)
            )
            title = url_el.findtext("news:news/news:title", namespaces=SITEMAP_NS)
            keywords_raw = url_el.findtext("news:news/news:keywords", namespaces=SITEMAP_NS)
            keywords = [k.strip() for k in keywords_raw.split(";") if k.strip()] if keywords_raw else []

            published_at, published_at_vn = normalize_to_vietnam_time(pub_date)

            articles.append(ArticleLink(
                url=loc,
                title=title,
                published_at=published_at,
                published_at_vn=published_at_vn,
                keywords=keywords,
            ))

        return SitemapResult(source_url=self.sitemap_url, articles=articles)
