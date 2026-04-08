from fastapi import APIRouter

from src.api.services.processed_article_service import ProcessedArticleService


router = APIRouter(tags=["storage"])
service = ProcessedArticleService()


@router.post("/processed-articles")
def save_processed_articles(payload: dict) -> dict:
    items = payload.get("data", [])
    return service.save_processed_articles(items)
