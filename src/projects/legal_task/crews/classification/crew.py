from src.app.runtime.crewai_runtime_builder import build_crew_from_runtime
from src.app.runtime.project_runtime_provider import load_project_runtime_config


def build_crew(project_input: dict) -> object:
    project_config = load_project_runtime_config("legal_task")
    return build_crew_from_runtime(project_config, "classification", project_input)
