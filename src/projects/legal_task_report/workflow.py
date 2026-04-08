from typing import Any

from src.common.config.settings import settings
from src.common.logging.logger import get_logger
from src.infrastructure.api_clients.news_source_api_client import NewsSourceApiClient
from src.projects.legal_task_report.crews.reporting.crew import (
    build_crew as build_reporting_crew,
)


logger = get_logger(__name__)


class LegalTaskReportWorkflow:
    def __init__(self) -> None:
        self.api_client = NewsSourceApiClient(
            base_url=settings.resolved_news_source_api_base_url,
            api_key=settings.news_source_api_key,
        )

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

    def fetch_pending_articles(self) -> list[dict[str, Any]]:
        return self.api_client.get_processed_articles(
            project_name="legal_task",
            require_summary=True,
            require_relevant=True,
            report_generated=False,
        )

    def run_reporting(self, article: dict[str, Any]) -> dict[str, Any]:
        reporting_input = {
            "article": {
                "url": article["article_url"],
                "title": article.get("title"),
                "published_at": article.get("published_at"),
                "summary": article.get("summary"),
                "translations": article.get("translations", {}),
            },
            "classification_result": article.get("classification_structured", {}),
        }
        result = build_reporting_crew(reporting_input).kickoff(inputs=reporting_input)
        return {
            "raw_result": str(result),
            "structured_result": self._result_to_dict(result),
        }

    def run(self) -> dict[str, Any]:
        pending_articles = self.fetch_pending_articles()
        report_payload: list[dict[str, Any]] = []

        for article in pending_articles:
            reporting = self.run_reporting(article)
            report_payload.append(
                {
                    "project_name": "legal_task_report",
                    "article_url": article["article_url"],
                    "title": article.get("title"),
                    "summary": article.get("summary"),
                    "translations": article.get("translations", {}),
                    "report_result": reporting["raw_result"],
                    "report_structured": reporting["structured_result"],
                }
            )

        save_result = {"status": "skipped", "saved_count": 0}
        if report_payload:
            save_result = self.api_client.save_report_results(report_payload)

        return {
            "pending_count": len(pending_articles),
            "reported_count": len(report_payload),
            "save_result": save_result,
            "items": report_payload,
        }
