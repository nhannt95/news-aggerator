from fastapi import APIRouter

from src.api.schemas.projects import ProjectRunRequest, ProjectRunResponse


router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/{project_name}/run", response_model=ProjectRunResponse)
def run_project_endpoint(project_name: str, payload: ProjectRunRequest) -> ProjectRunResponse:
    from src.app.runner import run_project

    result = run_project(project_name, payload.input_payload)
    return ProjectRunResponse(
        project_name=project_name,
        status="accepted",
        result=str(result),
    )
