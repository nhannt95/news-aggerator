import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.common.config.settings import settings
from src.infrastructure.api_clients.scheduler_config_api_client import (
    SchedulerConfigApiClient,
)
from src.infrastructure.scheduler.scheduler_service import SchedulerService


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run APScheduler against config API.")
    parser.add_argument(
        "--api-base-url",
        default=settings.scheduler_api_base_url or "http://127.0.0.1:8000",
        help="Scheduler config API base URL. Defaults to local mock API.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and print scheduler jobs without starting the blocking scheduler.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    client = SchedulerConfigApiClient(
        base_url=args.api_base_url,
        api_key=settings.scheduler_api_key,
    )
    service = SchedulerService(config_client=client)

    if args.dry_run:
        for job in service.list_jobs():
            print(job)
        return

    service.start()


if __name__ == "__main__":
    main()
