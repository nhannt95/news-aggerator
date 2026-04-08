from src.app.runtime.crewai_runtime_builder import build_tasks_from_config
from src.app.runtime.project_runtime_provider import load_project_runtime_config
from src.projects.legal_task.output_registry import LEGAL_TASK_OUTPUT_MODELS


def build_tasks(agents: dict[str, object], project_input: dict) -> list[object]:
    project_config = load_project_runtime_config("legal_task_report")
    crew_config = next(item for item in project_config.crews if item.crew_key == "reporting")
    return build_tasks_from_config(
        project_config,
        crew_config,
        agents,
        project_input,
        output_model_by_task_key=LEGAL_TASK_OUTPUT_MODELS,
    )
