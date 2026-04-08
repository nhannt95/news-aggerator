from collections.abc import Callable

from src.projects.er_task.pipeline import run as run_er_task
from src.projects.legal_task.pipeline import run as run_legal_task
from src.projects.legal_task_report.pipeline import run as run_legal_task_report


PROJECT_REGISTRY: dict[str, Callable[[dict], object]] = {
    "legal_task": run_legal_task,
    "legal_task_report": run_legal_task_report,
    "er_task": run_er_task,
}
