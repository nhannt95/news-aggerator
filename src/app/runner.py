from src.app.registry import PROJECT_REGISTRY


def run_project(project_name: str, project_input: dict) -> object:
    if project_name not in PROJECT_REGISTRY:
        raise ValueError(f"Unsupported project: {project_name}")
    return PROJECT_REGISTRY[project_name](project_input)
