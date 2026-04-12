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
    build_crew as build_summary_crew,
    build_translation_crew,
)
from src.api.services.accepted_article_service import AcceptedArticleService
from src.infrastructure.db.mysql_client import fetch_one
from src.tools.crawlers.article_content_crawler import ArticleContentCrawler
from src.tools.crawlers.latest_news_link_crawler import LatestNewsLinkCrawler
from src.tools.crawlers.sitemap_crawler import SitemapCrawler
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
    normalized = str(value).strip()
    if not normalized:
        return None
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(normalized)
        if dt.tzinfo is None:
            from zoneinfo import ZoneInfo
            dt = dt.replace(tzinfo=ZoneInfo("Asia/Ho_Chi_Minh"))
        return dt
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

    LANG_NAMES: dict[str, str] = {
        "vi": "Vietnamese",
        "en": "English",
        "ko": "Korean",
        "ja": "Japanese",
        "zh": "Chinese",
        "fr": "French",
        "th": "Thai",
    }

    @staticmethod
    def _resolve_target_languages(source: NewsSite) -> list[str]:
        target_languages = source.target_languages or ["vi", "en", "ko"]
        return [lang for lang in target_languages if lang != source.language]

    @staticmethod
    def _lang_label(code: str) -> str:
        return LegalTaskWorkflow.LANG_NAMES.get(code, code)

    @staticmethod
    def _run_summarize(article: ArticleContent, source_lang: str, crew: object) -> dict[str, str]:
        """Step 1: Summarize + analyze in source language."""
        content = (article.content_markdown or "")[:3000]
        lang_name = LegalTaskWorkflow._lang_label(source_lang)

        inputs = {
            "source_language": lang_name,
            "article_title": article.title or "",
            "article_content": content,
            "instruction": (
                f"Read this {lang_name} article and return JSON with:\n"
                f"- title: the article title in {lang_name}\n"
                f"- summary: 3-5 sentence summary in {lang_name}\n"
                f"- analysis: analysis of implications in {lang_name}\n"
                f"- recommendation: recommended action in {lang_name}"
            ),
        }
        raw = crew.kickoff(inputs=inputs)
        print('summarize raw', raw)
        result = LegalTaskWorkflow._result_to_dict(raw)
        return {
            "title": result.get("title") or article.title or "",
            "summary": result.get("summary", ""),
            "content": article.content_markdown,
            "analysis": result.get("analysis", ""),
            "recommendation": result.get("recommendation", ""),
        }

    @staticmethod
    def _run_translate(source_data: dict[str, str], source_lang: str, target_lang: str, crew: object) -> dict[str, str]:
        """Step 2: Translate one language at a time."""
        source_name = LegalTaskWorkflow._lang_label(source_lang)
        target_name = LegalTaskWorkflow._lang_label(target_lang)

        inputs = {
            "source_language": source_name,
            "target_language": target_name,
            "title": source_data["title"],
            "summary": source_data["summary"],
            "content": (source_data["content"] or "")[:3000],
            "analysis": source_data["analysis"],
            "recommendation": source_data["recommendation"],
            "instruction": (
                f"Translate ALL of the following from {source_name} to {target_name}.\n"
                f"Return JSON with: title, summary, content, analysis, recommendation.\n"
                f"All values must be in {target_name}."
            ),
        }
        raw = crew.kickoff(inputs=inputs)
        result = LegalTaskWorkflow._result_to_dict(raw)
        return {
            "title": result.get("title", ""),
            "summary": result.get("summary", ""),
            "content": result.get("content", ""),
            "analysis": result.get("analysis", ""),
            "recommendation": result.get("recommendation", ""),
        }

    @staticmethod
    def run_summary_translation(
        article: ArticleContent,
        source: NewsSite,
        summarize_crew: object,
        translate_crew: object,
    ) -> dict[str, Any]:
        target_languages = LegalTaskWorkflow._resolve_target_languages(source)

        # Step 1: Summarize in source language (1 agent call)
        logger.info("Summarizing article in %s", source.language)
        source_data = LegalTaskWorkflow._run_summarize(article, source.language, summarize_crew)

        print('summary', source_data)

        # Step 2: Translate per language (1 agent call each)
        translations: dict[str, dict[str, str]] = {}
        translations[source.language] = source_data

        for lang in target_languages:
            logger.info("Translating to %s", lang)
            translations[lang] = LegalTaskWorkflow._run_translate(
                source_data, source.language, lang, translate_crew
            )
            
        print('------------', translations)
        return {
            "summary": source_data["summary"],
            "analysis": source_data["analysis"],
            "recommendation": source_data["recommendation"],
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

    def _fetch_article_links(self, site: NewsSite) -> list[ArticleLink]:
        if site.fetch_method == "sitemap" and site.sitemap_url:
            logger.info("Fetching via sitemap: %s", site.sitemap_url)
            crawler = SitemapCrawler(
                sitemap_url=site.sitemap_url,
                article_url_pattern=site.article_url_pattern,
            )
            result = crawler.fetch()
            return result.articles

        logger.info("Fetching via listing: %s", site.latest_page_url)
        link_crawler = LatestNewsLinkCrawler(
            source_urls=[site.latest_page_url],
            listing_selector=site.listing_selector,
            article_url_pattern=site.article_url_pattern,
        )
        listing_results = asyncio.run(link_crawler.extract_latest_links())
        if not listing_results:
            return []
        return listing_results[0].articles

    def process_site(self, site: NewsSite) -> list[dict[str, Any]]:
        logger.info("Processing site %s (%s)", site.name, site.fetch_method)

        # 1. Fetch article links (listing or sitemap)
        all_articles = self._fetch_article_links(site)
        if not all_articles:
            logger.info("No articles found")
            return []
        logger.info("Found %d articles", len(all_articles))

        # # 2. Filter by last_crawled_at
        # new_articles = self.filter_new_articles(site, all_articles)
        # if not new_articles:
        #     logger.info("No new articles since last crawl")
        #     return []
        # logger.info("New articles: %d", len(new_articles))

        new_articles = all_articles[:1]

        # # 3. Title screening — batch titles to agent, get relevant URLs
        # logger.info("Title screening %d articles", len(new_articles))
        # relevant_urls = self.run_title_screening(new_articles, site)
        # screened_articles = [a for a in new_articles if a.url in relevant_urls]
        # logger.info("Title screening passed: %d / %d", len(screened_articles), len(new_articles))
        # if not screened_articles:
        #     return []

        screened_articles = new_articles

        # 4. Crawl content for screened articles
        article_contents = asyncio.run(
            self.content_crawler.crawl_many(
                screened_articles,
                content_selector=site.content_selector,
                site_id=site.site_id,
            )
        )

        # 5. Build crews once, reuse for all articles
        classification_crew = build_classification_crew({})
        summarize_crew = build_summary_crew({})
        translate_crew = build_translation_crew({})

        saved_payload: list[dict[str, Any]] = []

        for article in article_contents:
            # 5a. Classify — is this article relevant to the project topic?
            logger.info("Classifying: %s", article.title)
            classification = self.run_classification(article, site, classification_crew)

            if not classification["is_relevant"]:
                logger.info("Irrelevant, skipping: %s", article.url)
                continue

            # 5b. Summarize (1 agent call) → summary, analysis, recommendation
            # 5c. Translate (1 agent call per language) → en, ko, ...
            summary_translation = self.run_summary_translation(
                article, site, summarize_crew, translate_crew
            )

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
                "is_relevant": classification["is_relevant"],
                "relevance_score": classification["relevance_score"],
                "classification_result": classification["raw_result"],
                "classification_structured": classification["structured_result"],
                "images": article.images,
                "translations": summary_translation["translations"],
            }
            saved_payload.append(item)

        return saved_payload

    def run(self) -> dict[str, Any]:
        sources = self.fetch_sources()
        processed_items: list[dict[str, Any]] = []

        for source in sources:
            processed_items.extend(self.process_site(source))

        save_result = {"status": "skipped", "saved_count": 0}
        if processed_items:
            # Save to na_processed_articles (raw classification data)
            save_result = self.api_client.save_processed_articles(processed_items)

            # Save to na_accepted_article_translations (per language)
            accepted_service = AcceptedArticleService()
            for item in processed_items:
                translations = item.get("translations", {})
                if not translations:
                    continue
                row = fetch_one(
                    "SELECT id FROM na_processed_articles WHERE article_url = %s",
                    (item["article_url"],),
                )
                if row:
                    accepted_service.save_translations(row["id"], translations)

            # Cleanup local images
            for item in processed_items:
                if item.get("images"):
                    cleanup_images(item["site_id"], item["article_url"])

        return {
            "source_count": len(sources),
            "processed_count": len(processed_items),
            "save_result": save_result,
        }
