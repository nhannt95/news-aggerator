from collections.abc import Callable

from src.projects.er_task.pipeline import run as run_er_task
from src.projects.legal_task.pipeline import run as run_legal_task


PROJECT_REGISTRY: dict[str, Callable[[dict], object]] = {
    "legal_task": run_legal_task,
    "er_task": run_er_task,
}
