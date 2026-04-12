import json

from src.infrastructure.db.mysql_client import execute, fetch_all, fetch_one


class SchedulerConfigService:
    def get_scheduler_configs(self) -> list[dict]:
        return fetch_all("SELECT * FROM na_scheduler_configs")

    def get_scheduler_config(self, job_id: str) -> dict | None:
        return fetch_one("SELECT * FROM na_scheduler_configs WHERE job_id = %s", (job_id,))

    def create_scheduler_config(self, config: dict) -> dict:
        execute(
            """INSERT INTO na_scheduler_configs
            (job_id, project_name, trigger_type, trigger_args, input_payload, enabled, timezone)
            VALUES (%s,%s,%s,%s,%s,%s,%s)""",
            (
                config["job_id"], config["project_name"],
                config.get("trigger_type", "cron"),
                json.dumps(config.get("trigger_args", {})),
                json.dumps(config.get("input_payload", {})),
                1 if config.get("enabled", True) else 0,
                config.get("timezone", "Asia/Ho_Chi_Minh"),
            ),
        )
        return config

    def update_scheduler_config(self, job_id: str, config: dict) -> dict:
        execute(
            """UPDATE na_scheduler_configs SET
                project_name=%s, trigger_type=%s, trigger_args=%s,
                input_payload=%s, enabled=%s, timezone=%s
            WHERE job_id=%s""",
            (
                config.get("project_name"), config.get("trigger_type", "cron"),
                json.dumps(config.get("trigger_args", {})),
                json.dumps(config.get("input_payload", {})),
                1 if config.get("enabled", True) else 0,
                config.get("timezone", "Asia/Ho_Chi_Minh"),
                job_id,
            ),
        )
        return config

    def delete_scheduler_config(self, job_id: str) -> None:
        execute("DELETE FROM na_scheduler_configs WHERE job_id = %s", (job_id,))
