import asyncio
from datetime import datetime
from typing import Any

from src.common.config.settings import settings
from src.common.logging.logger import get_logger
from src.common.models.article import ArticleContent, ArticleLink
from src.common.models.news_site import NewsSite
from src.infrastructure.api_clients.news_source_api_client import NewsSourceApiClient
from src.projects.legal_task.crews.classification.crew import (
    build_crew as build_classification_crew,
)
from src.projects.legal_task.crews.summary_translation.crew import (
    build_crew as build_summary_translation_crew,
)
from src.tools.crawlers.article_content_crawler import ArticleContentCrawler
from src.tools.crawlers.latest_news_link_crawler import LatestNewsLinkCrawler
from src.tools.sources.source_fetcher import SourceFetcher


logger = get_logger(__name__)

LEGAL_KEYWORDS = (
    "law",
    "legal",
    "regulation",
    "court",
    "decree",
    "policy",
    "compliance",
    "quy dinh",
    "phap ly",
    "luat",
    "nghi dinh",
    "toa an",
)


def _parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value.strip()
    if not normalized:
        return None
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None


class LegalTaskWorkflow:
    def __init__(self) -> None:
        self.api_client = NewsSourceApiClient(
            base_url=settings.resolved_news_source_api_base_url,
            api_key=settings.news_source_api_key,
        )
        self.source_fetcher = SourceFetcher(self.api_client)
        self.content_crawler = ArticleContentCrawler()

    def fetch_sources(self) -> list[NewsSite]:
        return [
            site
            for site in self.source_fetcher.fetch_sites(project_name="legal_task")
            if site.active
        ]

    @staticmethod
    def filter_new_articles(site: NewsSite, articles: list[ArticleLink]) -> list[ArticleLink]:
        last_crawled_at = _parse_iso_datetime(site.last_crawled_at)
        if last_crawled_at is None:
            return articles

        filtered: list[ArticleLink] = []
        for article in articles:
            published_at = _parse_iso_datetime(article.published_at)
            if published_at is None:
                continue
            if published_at > last_crawled_at:
                filtered.append(article)
        return filtered

    @staticmethod
    def _result_to_dict(result: Any) -> dict[str, Any]:
        if hasattr(result, "json_dict") and result.json_dict:
            return result.json_dict
        if hasattr(result, "pydantic") and result.pydantic:
            return result.pydantic.model_dump()
        if hasattr(result, "to_dict"):
            data = result.to_dict()
            if isinstance(data, dict):
                return data
        return {}

    @staticmethod
    def estimate_relevance_score(article: ArticleContent) -> int:
        haystack = " ".join(
            filter(
                None,
                [
                    article.title or "",
                    article.description or "",
                    article.content_markdown or "",
                ],
            )
        ).lower()
        score = 0
        for keyword in LEGAL_KEYWORDS:
            if keyword in haystack:
                score += 15
        return min(score, 100)

    @staticmethod
    def run_summary_translation(article: ArticleContent, source: NewsSite) -> dict[str, Any]:
        candidates = ["vi", "en", "ko"]
        if source.language in candidates:
            candidates.remove(source.language)
        target_languages = (source.target_languages or ["vi", "en", "ko"])[:]
        normalized_targets = [lang for lang in target_languages if lang != source.language]
        if len(normalized_targets) < 2:
            for language in candidates:
                if language not in normalized_targets:
                    normalized_targets.append(language)
                if len(normalized_targets) >= 2:
                    break

        summary_input = {
            "source": {
                "site_id": source.site_id,
                "name": source.name,
                "language": source.language,
            },
            "article": {
                "url": article.url,
                "title": article.title,
                "published_at": article.published_at,
                "content": article.content_markdown,
            },
            "target_languages": normalized_targets[:2],
        }
        raw_result = build_summary_translation_crew(summary_input).kickoff(
            inputs=summary_input
        )
        structured_result = LegalTaskWorkflow._result_to_dict(raw_result)

        content = article.content_markdown.strip()
        fallback_summary = content[:1200] if content else ""
        fallback_translations = {
            language: f"[{language} translation placeholder]\n{fallback_summary}"
            for language in normalized_targets[:2]
        }
        return {
            "raw_result": str(raw_result),
            "summary": structured_result.get("summary") or fallback_summary,
            "translations": structured_result.get("translations") or fallback_translations,
        }

    @staticmethod
    def run_classification(article: ArticleContent, source: NewsSite) -> dict[str, Any]:
        classification_input = {
            "source": {
                "site_id": source.site_id,
                "name": source.name,
                "language": source.language,
            },
            "article": {
                "url": article.url,
                "title": article.title,
                "published_at": article.published_at,
                "content": article.content_markdown,
            },
        }
        raw_result = build_classification_crew(classification_input).kickoff(
            inputs=classification_input
        )
        structured_result = LegalTaskWorkflow._result_to_dict(raw_result)
        relevance_score = structured_result.get("relevance_score")
        if not isinstance(relevance_score, int):
            relevance_score = LegalTaskWorkflow.estimate_relevance_score(article)
        is_relevant = structured_result.get("is_relevant")
        if not isinstance(is_relevant, bool):
            is_relevant = relevance_score >= source.relevance_threshold
        return {
            "raw_result": str(raw_result),
            "structured_result": structured_result,
            "relevance_score": relevance_score,
            "is_relevant": is_relevant,
        }

    def process_site(self, site: NewsSite) -> list[dict[str, Any]]:
        logger.info("Processing site %s", site.latest_page_url)
        link_crawler = LatestNewsLinkCrawler(source_urls=[site.latest_page_url])
        listing_results = asyncio.run(link_crawler.extract_latest_links())
        if not listing_results:
            return []

        new_articles = self.filter_new_articles(site, listing_results[0].articles)
        if not new_articles:
            return []

        article_contents = asyncio.run(
            self.content_crawler.crawl_many(
                [article.url for article in new_articles],
                extract_method=site.extract_method,
                content_selector=site.content_selector,
            )
        )

        saved_payload: list[dict[str, Any]] = []
        for article in article_contents:
            classification = self.run_classification(article, site)

            item: dict[str, Any] = {
                "project_name": "legal_task",
                "site_id": site.site_id,
                "source_language": site.language,
                "article_url": article.url,
                "title": article.title,
                "published_at": article.published_at,
                "published_at_vn": article.published_at_vn,
                "author": article.author,
                "description": article.description,
                "content_markdown": article.content_markdown,
                "is_relevant": classification["is_relevant"],
                "relevance_score": classification["relevance_score"],
                "classification_result": classification["raw_result"],
                "classification_structured": classification["structured_result"],
                "report_generated": False,
            }

            if classification["is_relevant"]:
                summary_translation = self.run_summary_translation(article, site)
                item["summary"] = summary_translation["summary"]
                item["translations"] = summary_translation["translations"]
                item["summary_translation_result"] = summary_translation["raw_result"]

            saved_payload.append(item)

        return saved_payload

    def run(self) -> dict[str, Any]:
        sources = self.fetch_sources()
        processed_items: list[dict[str, Any]] = []

        for source in sources:
            processed_items.extend(self.process_site(source))

        save_result = {"status": "skipped", "saved_count": 0}
        if processed_items:
            save_result = self.api_client.save_processed_articles(processed_items)

        return {
            "source_count": len(sources),
            "processed_count": len(processed_items),
            "save_result": save_result,
            "items": processed_items,
        }
