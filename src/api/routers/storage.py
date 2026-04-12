import logging

from fastapi import APIRouter, HTTPException, Query

from src.api.services.processed_article_service import ProcessedArticleService


logger = logging.getLogger(__name__)
router = APIRouter(tags=["storage"])
service = ProcessedArticleService()


@router.post("/processed-articles")
def save_processed_articles(payload: dict) -> dict:
    items = payload.get("data", [])
    try:
        return service.save_processed_articles(items)
    except Exception as e:
        logger.error("save_processed_articles failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


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
