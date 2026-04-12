import time
from datetime import datetime

from src.app.registry import PROJECT_REGISTRY
from src.common.logging.logger import get_logger
from src.infrastructure.db.mysql_client import execute, fetch_one


logger = get_logger(__name__)


def _is_running(project_name: str) -> bool:
    row = fetch_one(
        "SELECT run_status FROM na_project_runtime_configs WHERE project_name = %s",
        (project_name,),
    )
    return row is not None and row.get("run_status") == "running"


def _mark_running(project_name: str) -> None:
    execute(
        "UPDATE na_project_runtime_configs SET run_status = 'running', last_run_at = %s WHERE project_name = %s",
        (datetime.now(), project_name),
    )


def _mark_idle(project_name: str, duration: int) -> None:
    execute(
        "UPDATE na_project_runtime_configs SET run_status = 'idle', last_run_duration = %s WHERE project_name = %s",
        (duration, project_name),
    )


def _mark_error(project_name: str, duration: int) -> None:
    execute(
        "UPDATE na_project_runtime_configs SET run_status = 'error', last_run_duration = %s WHERE project_name = %s",
        (duration, project_name),
    )


def run_project(project_name: str, project_input: dict) -> object:
    if project_name not in PROJECT_REGISTRY:
        raise ValueError(f"Unsupported project: {project_name}")

    if _is_running(project_name):
        logger.warning("Project %s is already running, skipping", project_name)
        return {"status": "skipped", "reason": "already running"}

    _mark_running(project_name)
    start = time.time()

    try:
        result = PROJECT_REGISTRY[project_name](project_input)
        duration = int(time.time() - start)
        _mark_idle(project_name, duration)
        logger.info("Project %s completed in %ds", project_name, duration)
        return result
    except Exception as e:
        duration = int(time.time() - start)
        _mark_error(project_name, duration)
        logger.error("Project %s failed after %ds: %s", project_name, duration, e)
        raise
