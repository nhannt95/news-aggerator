from fastapi import APIRouter, HTTPException, Query

from src.api.services.accepted_article_service import AcceptedArticleService


router = APIRouter(prefix="/accepted", tags=["accepted"])
service = AcceptedArticleService()


@router.get("/articles")
def get_accepted_articles(
    project_name: str | None = Query(default=None),
) -> dict:
    return {"data": service.get_accepted_articles(project_name)}


@router.get("/articles/{article_id}")
def get_accepted_article_detail(article_id: int) -> dict:
    detail = service.get_accepted_article_detail(article_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"data": detail}


@router.get("/articles/{article_id}/translations")
def get_translations(article_id: int) -> dict:
    return {"data": service.get_translations(article_id)}
