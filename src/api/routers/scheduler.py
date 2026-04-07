from fastapi import APIRouter

from src.api.schemas.scheduler import SchedulerJobResponse
from src.api.services.scheduler_service import SchedulerConfigService


router = APIRouter(tags=["scheduler"])
service = SchedulerConfigService()


@router.get("/scheduler-configs")
def get_scheduler_configs() -> dict[str, list[SchedulerJobResponse]]:
    items = [SchedulerJobResponse(**item) for item in service.get_scheduler_configs()]
    return {"data": items}
