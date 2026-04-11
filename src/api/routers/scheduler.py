from fastapi import APIRouter, HTTPException

from src.api.schemas.scheduler import SchedulerJobResponse
from src.api.services.scheduler_service import SchedulerConfigService
from src.infrastructure.scheduler.scheduler_service import SchedulerService


router = APIRouter(prefix="/scheduler", tags=["scheduler"])
config_service = SchedulerConfigService()


@router.get("/configs")
def get_scheduler_configs() -> dict:
    items = [SchedulerJobResponse(**item) for item in config_service.get_scheduler_configs()]
    return {"data": items}


@router.get("/configs/{job_id}")
def get_scheduler_config(job_id: str) -> dict:
    item = config_service.get_scheduler_config(job_id)
    if not item:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"data": SchedulerJobResponse(**item)}


@router.post("/configs")
def create_scheduler_config(payload: dict) -> dict:
    item = config_service.create_scheduler_config(payload)
    _auto_reload()
    return {"data": item, "message": "Created and scheduler reloaded"}


@router.put("/configs/{job_id}")
def update_scheduler_config(job_id: str, payload: dict) -> dict:
    item = config_service.update_scheduler_config(job_id, payload)
    _auto_reload()
    return {"data": item, "message": "Updated and scheduler reloaded"}


@router.delete("/configs/{job_id}")
def delete_scheduler_config(job_id: str) -> dict:
    config_service.delete_scheduler_config(job_id)
    _auto_reload()
    return {"message": "Deleted and scheduler reloaded"}


@router.post("/reload")
def reload_scheduler() -> dict:
    scheduler = SchedulerService.get_instance()
    if not scheduler:
        raise HTTPException(status_code=503, detail="Scheduler not running")
    return scheduler.reload()


@router.get("/jobs")
def list_running_jobs() -> dict:
    scheduler = SchedulerService.get_instance()
    if not scheduler:
        return {"data": [], "message": "Scheduler not running"}
    return {"data": scheduler.list_jobs()}


def _auto_reload() -> None:
    scheduler = SchedulerService.get_instance()
    if scheduler:
        scheduler.reload()
