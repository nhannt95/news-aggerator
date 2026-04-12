from src.app.runtime.crewai_runtime_builder import build_crew_from_runtime
from src.app.runtime.project_runtime_provider import load_project_runtime_config
from src.projects.legal_task.output_registry import LEGAL_TASK_OUTPUT_MODELS


def build_crew(project_input: dict) -> object:
    project_config = load_project_runtime_config("legal_task")
    return build_crew_from_runtime(
        project_config,
        "summary_translation",
        project_input,
        output_model_by_task_key=LEGAL_TASK_OUTPUT_MODELS,
    )


def build_translation_crew(project_input: dict) -> object:
    project_config = load_project_runtime_config("legal_task")
    return build_crew_from_runtime(
        project_config,
        "translation",
        project_input,
        output_model_by_task_key=LEGAL_TASK_OUTPUT_MODELS,
    )
