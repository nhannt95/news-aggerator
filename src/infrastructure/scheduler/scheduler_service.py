from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from src.common.logging.logger import get_logger
from src.common.models.scheduler_config import SchedulerJobConfig
from src.infrastructure.api_clients.scheduler_config_api_client import (
    SchedulerConfigApiClient,
)


logger = get_logger(__name__)


def _run_project_job(project_name: str, project_input: dict) -> object:
    from src.app.runner import run_project

    return run_project(project_name, project_input)


class SchedulerService:
    def __init__(self, config_client: SchedulerConfigApiClient) -> None:
        self.config_client = config_client
        self.scheduler = BlockingScheduler(timezone="Asia/Ho_Chi_Minh")

    def fetch_job_configs(self) -> list[SchedulerJobConfig]:
        raw_items = self.config_client.get_scheduler_configs()
        return [
            SchedulerJobConfig(
                job_id=str(item.get("job_id") or item.get("id") or item["project_name"]),
                project_name=item["project_name"],
                trigger_type=item.get("trigger_type", "cron"),
                trigger_args=item.get("trigger_args", {}),
                input_payload=item.get("input_payload", {}),
                enabled=item.get("enabled", True),
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
        jobs = self.fetch_job_configs()
        return [
            {
                "job_id": job.job_id,
                "project_name": job.project_name,
                "trigger_type": job.trigger_type,
                "timezone": job.timezone,
                "trigger_args": str(job.trigger_args),
            }
            for job in jobs
            if job.enabled
        ]

    def start(self) -> None:
        self.sync_jobs()
        logger.info("Scheduler started")
        self.scheduler.start()
