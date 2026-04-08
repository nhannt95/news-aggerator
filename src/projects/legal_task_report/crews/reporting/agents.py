from src.app.runtime.crewai_runtime_builder import build_agents_from_config
from src.app.runtime.project_runtime_provider import load_project_runtime_config


def build_agents() -> dict[str, object]:
    project_config = load_project_runtime_config("legal_task_report")
    crew_config = next(item for item in project_config.crews if item.crew_key == "reporting")
    return build_agents_from_config(project_config, crew_config)
