from src.api.mock_data.runtime_configs import MOCK_RUNTIME_CONFIGS


class RuntimeConfigService:
    def get_project_runtime_config(self, project_name: str) -> dict | None:
        return MOCK_RUNTIME_CONFIGS.get(project_name)

    def get_all_project_runtime_configs(self) -> list[dict]:
        return list(MOCK_RUNTIME_CONFIGS.values())
