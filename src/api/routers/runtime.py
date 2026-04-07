from fastapi import APIRouter, HTTPException

from src.api.schemas.runtime import ProjectRuntimeConfigResponse
from src.api.services.runtime_service import RuntimeConfigService


router = APIRouter(tags=["runtime"])
service = RuntimeConfigService()


@router.get(
    "/projects/{project_name}/runtime-config",
    response_model=ProjectRuntimeConfigResponse,
)
def get_project_runtime_config(project_name: str) -> ProjectRuntimeConfigResponse:
    payload = service.get_project_runtime_config(project_name)
    if payload is None:
        raise HTTPException(status_code=404, detail="Project runtime config not found")
    return ProjectRuntimeConfigResponse(**payload)


@router.get("/runtime-configs")
def get_all_runtime_configs() -> dict:
    return {"data": service.get_all_project_runtime_configs()}
