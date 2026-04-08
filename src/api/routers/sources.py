from fastapi import APIRouter, Query

from src.api.services.news_source_service import NewsSourceService


router = APIRouter(tags=["sources"])
service = NewsSourceService()


@router.get("/news-sites")
def get_news_sites(project_name: str | None = Query(default=None)) -> dict:
    return {"data": service.get_news_sites(project_name=project_name)}
