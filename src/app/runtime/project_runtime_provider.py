from src.common.config.settings import settings
from src.app.runtime.runtime_config_loader import parse_project_runtime_config
from src.common.models.runtime_config import ProjectRuntimeConfig
from src.infrastructure.api_clients.project_runtime_api_client import (
    ProjectRuntimeApiClient,
)


def get_runtime_api_client() -> ProjectRuntimeApiClient:
    return ProjectRuntimeApiClient(
        base_url=settings.resolved_runtime_config_api_base_url,
        api_key=settings.runtime_config_api_key,
    )


def load_project_runtime_config(project_name: str) -> ProjectRuntimeConfig:
    client = get_runtime_api_client()
    payload = client.get_project_runtime_config(project_name)
    return parse_project_runtime_config(payload)
