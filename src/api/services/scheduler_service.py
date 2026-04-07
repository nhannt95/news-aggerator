from src.api.mock_data.scheduler_configs import MOCK_SCHEDULER_CONFIGS


class SchedulerConfigService:
    def get_scheduler_configs(self) -> list[dict]:
        return MOCK_SCHEDULER_CONFIGS
