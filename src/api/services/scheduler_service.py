from src.api.mock_data.scheduler_configs import MOCK_SCHEDULER_CONFIGS


class SchedulerConfigService:
    def get_scheduler_configs(self) -> list[dict]:
        return MOCK_SCHEDULER_CONFIGS

    def get_scheduler_config(self, job_id: str) -> dict | None:
        for item in MOCK_SCHEDULER_CONFIGS:
            if item["job_id"] == job_id:
                return item
        return None

    def create_scheduler_config(self, config: dict) -> dict:
        for item in MOCK_SCHEDULER_CONFIGS:
            if item["job_id"] == config["job_id"]:
                raise ValueError(f"Job {config['job_id']} already exists")
        MOCK_SCHEDULER_CONFIGS.append(config)
        return config

    def update_scheduler_config(self, job_id: str, config: dict) -> dict:
        for i, item in enumerate(MOCK_SCHEDULER_CONFIGS):
            if item["job_id"] == job_id:
                config["job_id"] = job_id
                MOCK_SCHEDULER_CONFIGS[i] = config
                return config
        raise ValueError(f"Job {job_id} not found")

    def delete_scheduler_config(self, job_id: str) -> None:
        for i, item in enumerate(MOCK_SCHEDULER_CONFIGS):
            if item["job_id"] == job_id:
                MOCK_SCHEDULER_CONFIGS.pop(i)
                return
        raise ValueError(f"Job {job_id} not found")
