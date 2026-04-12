from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from src.common.logging.logger import get_logger
from src.common.models.scheduler_config import SchedulerJobConfig
from src.infrastructure.db.mysql_client import fetch_all


logger = get_logger(__name__)


def _run_project_job(project_name: str, project_input: dict) -> object:
    from src.app.runner import run_project

    return run_project(project_name, project_input)


class SchedulerService:
    _instance: "SchedulerService | None" = None

    def __init__(self) -> None:
        self.scheduler = BackgroundScheduler(timezone="Asia/Ho_Chi_Minh")

    @classmethod
    def get_instance(cls) -> "SchedulerService | None":
        return cls._instance

    @classmethod
    def set_instance(cls, instance: "SchedulerService") -> None:
        cls._instance = instance

    def fetch_job_configs(self) -> list[SchedulerJobConfig]:
        raw_items = fetch_all("SELECT * FROM na_scheduler_configs")
        return [
            SchedulerJobConfig(
                job_id=str(item.get("job_id") or item["project_name"]),
                project_name=item["project_name"],
                trigger_type=item.get("trigger_type", "cron"),
                trigger_args=item.get("trigger_args", {}),
                input_payload=item.get("input_payload", {}),
                enabled=bool(item.get("enabled", True)),
                timezone=item.get("timezone", "Asia/Ho_Chi_Minh"),
            )
            for item in raw_items
            if item.get("project_name")
        ]

    @staticmethod
    def _build_trigger(job: SchedulerJobConfig):
        if job.trigger_type == "interval":
            return IntervalTrigger(timezone=job.timezone, **job.trigger_args)
        return CronTrigger(timezone=job.timezone, **job.trigger_args)

    def sync_jobs(self) -> None:
        for job in self.scheduler.get_jobs():
            job.remove()

        jobs = self.fetch_job_configs()
        for job in jobs:
            if not job.enabled:
                continue

            self.scheduler.add_job(
                func=_run_project_job,
                trigger=self._build_trigger(job),
                id=job.job_id,
                replace_existing=True,
                kwargs={
                    "project_name": job.project_name,
                    "project_input": job.input_payload,
                },
            )
            logger.info("Scheduled job %s for project %s", job.job_id, job.project_name)

    def list_jobs(self) -> list[dict[str, str]]:
        return [
            {
                "job_id": job.id,
                "next_run": str(job.next_run_time) if job.next_run_time else None,
            }
            for job in self.scheduler.get_jobs()
        ]

    def reload(self) -> dict:
        self.sync_jobs()
        jobs = self.list_jobs()
        logger.info("Scheduler reloaded: %d jobs", len(jobs))
        return {"status": "reloaded", "job_count": len(jobs)}

    def start(self) -> None:
        self.sync_jobs()
        self.scheduler.start()
        logger.info("Scheduler started (background)")

    def stop(self) -> None:
        self.scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
