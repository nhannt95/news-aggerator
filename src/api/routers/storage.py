from fastapi import APIRouter, Query

from src.api.services.processed_article_service import ProcessedArticleService


router = APIRouter(tags=["storage"])
service = ProcessedArticleService()


@router.post("/processed-articles")
def save_processed_articles(payload: dict) -> dict:
    items = payload.get("data", [])
    return service.save_processed_articles(items)


@router.get("/processed-articles")
def get_processed_articles(
    project_name: str | None = Query(default=None),
    require_summary: bool = Query(default=False),
    require_relevant: bool = Query(default=False),
    report_generated: bool | None = Query(default=None),
) -> dict:
    return {
        "data": service.get_processed_articles(
            project_name=project_name,
            require_summary=require_summary,
            require_relevant=require_relevant,
            report_generated=report_generated,
        )
    }


@router.post("/reported-articles")
def save_report_results(payload: dict) -> dict:
    items = payload.get("data", [])
    return service.save_report_results(items)
