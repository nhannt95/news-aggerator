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
from src.projects.legal_task.crews.classification.crew import (
    build_title_screening_crew,
)
from src.projects.legal_task.crews.summary_translation.crew import (
    build_crew as build_summary_translation_crew,
)
from src.tools.crawlers.article_content_crawler import ArticleContentCrawler
from src.tools.crawlers.latest_news_link_crawler import LatestNewsLinkCrawler
from src.tools.images.image_downloader import cleanup_images
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
    def _screen_batch(batch: list[ArticleLink], source: NewsSite) -> list[str]:
        screening_input = {
            "source": {
                "site_id": source.site_id,
                "name": source.name,
                "language": source.language,
            },
            "articles": [
                {"url": a.url, "title": a.title}
                for a in batch
            ],
        }
        raw_result = build_title_screening_crew(screening_input).kickoff(
            inputs=screening_input
        )
        structured = LegalTaskWorkflow._result_to_dict(raw_result)
        relevant_urls = structured.get("relevant_urls", [])
        if not isinstance(relevant_urls, list):
            return [a.url for a in batch]
        return relevant_urls

    @staticmethod
    def run_title_screening(
        articles: list[ArticleLink],
        source: NewsSite,
        batch_size: int = 20,
    ) -> list[str]:
        if len(articles) <= batch_size:
            return LegalTaskWorkflow._screen_batch(articles, source)

        relevant_urls: list[str] = []
        for i in range(0, len(articles), batch_size):
            batch = articles[i : i + batch_size]
            logger.info("Screening batch %d-%d / %d", i + 1, i + len(batch), len(articles))
            relevant_urls.extend(LegalTaskWorkflow._screen_batch(batch, source))
        return relevant_urls

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
    def _resolve_target_languages(source: NewsSite) -> list[str]:
        target_languages = source.target_languages or ["vi", "en", "ko"]
        return [lang for lang in target_languages if lang != source.language]

    @staticmethod
    def run_summary_translation(
        article: ArticleContent,
        source: NewsSite,
        classification: dict[str, Any],
        crew: object | None = None,
    ) -> dict[str, Any]:
        target_languages = LegalTaskWorkflow._resolve_target_languages(source)

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
            "classification": {
                "analysis": classification.get("structured_result", {}).get("reason", ""),
                "recommendation": classification.get("structured_result", {}).get("recommendation", ""),
            },
            "target_languages": target_languages,
        }
        if crew is None:
            crew = build_summary_translation_crew(summary_input)
        raw_result = crew.kickoff(
            inputs=summary_input
        )
        structured_result = LegalTaskWorkflow._result_to_dict(raw_result)

        translations = structured_result.get("translations", {})
        translations[source.language] = {
            "summary": structured_result.get("summary", ""),
            "content": article.content_markdown,
            "analysis": structured_result.get("analysis", ""),
            "recommendation": structured_result.get("recommendation", ""),
        }

        return {
            "raw_result": str(raw_result),
            "summary": structured_result.get("summary", ""),
            "analysis": structured_result.get("analysis", ""),
            "recommendation": structured_result.get("recommendation", ""),
            "translations": translations,
        }

    @staticmethod
    def run_classification(
        article: ArticleContent, source: NewsSite, crew: object | None = None,
    ) -> dict[str, Any]:
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
        if crew is None:
            crew = build_classification_crew(classification_input)
        raw_result = crew.kickoff(inputs=classification_input)
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
        link_crawler = LatestNewsLinkCrawler(
            source_urls=[site.latest_page_url],
            listing_selector=site.listing_selector,
            article_url_pattern=site.article_url_pattern,
        )
        listing_results = asyncio.run(link_crawler.extract_latest_links())

        if not listing_results:
            return []

        new_articles = self.filter_new_articles(site, listing_results[0].articles)
        if not new_articles:
            return []

        print('-------------------',new_articles)
        # Step 1: Title screening — agent filters by title
        logger.info("Title screening %d articles", len(new_articles))
        relevant_urls = self.run_title_screening(new_articles, site)
        screened_articles = [a for a in new_articles if a.url in relevant_urls]
        logger.info("Title screening passed: %d / %d", len(screened_articles), len(new_articles))
        if not screened_articles:
            return []

        # Step 2: Crawl content only for screened articles
        article_contents = asyncio.run(
            self.content_crawler.crawl_many(
                [article.url for article in screened_articles],
                content_selector=site.content_selector,
                site_id=site.site_id,
            )
        )
        for i, article in enumerate(article_contents, 1):
            print(f"\n{'='*60}")
            print(f"Bai {i}: {article.title}")
            print(f"URL: {article.url}")
            print(f"Published: {article.published_at_vn}")
            print(f"Author: {article.author}")
            print(f"{'='*60}")
            print(article.content_markdown)

        return []

        classification_crew = build_classification_crew({})
        summary_crew = build_summary_translation_crew({})

        saved_payload: list[dict[str, Any]] = []
        for article in article_contents:
            classification = self.run_classification(article, site, classification_crew)

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
                "images": article.images,
                "is_relevant": classification["is_relevant"],
                "relevance_score": classification["relevance_score"],
                "classification_result": classification["raw_result"],
                "classification_structured": classification["structured_result"],
                "report_generated": False,
            }

            if classification["is_relevant"]:
                summary_translation = self.run_summary_translation(
                    article, site, classification, summary_crew
                )
                item["summary"] = summary_translation["summary"]
                item["analysis"] = summary_translation["analysis"]
                item["recommendation"] = summary_translation["recommendation"]
                item["translations"] = summary_translation["translations"]
                item["summary_translation_result"] = summary_translation["raw_result"]

            saved_payload.append(item)

        return saved_payload

    def run(self) -> dict[str, Any]:
        sources = self.fetch_sources()
        processed_items: list[dict[str, Any]] = []

        for source in sources:
            processed_items.extend(self.process_site(source))
            break
        
        return
        save_result = {"status": "skipped", "saved_count": 0}
        if processed_items:
            save_result = self.api_client.save_processed_articles(processed_items)

            for item in processed_items:
                if item.get("images"):
                    cleanup_images(item["site_id"], item["article_url"])

        return {
            "source_count": len(sources),
            "processed_count": len(processed_items),
            "save_result": save_result,
            "items": processed_items,
        }
