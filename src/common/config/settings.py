from dataclasses import dataclass
import os


@dataclass(slots=True)
class Settings:
    news_source_api_base_url: str = os.getenv("NEWS_SOURCE_API_BASE_URL", "")
    news_source_api_key: str = os.getenv("NEWS_SOURCE_API_KEY", "")
    scheduler_api_base_url: str = os.getenv("SCHEDULER_API_BASE_URL", "")
    scheduler_api_key: str = os.getenv("SCHEDULER_API_KEY", "")
    runtime_config_api_base_url: str = os.getenv("RUNTIME_CONFIG_API_BASE_URL", "")
    runtime_config_api_key: str = os.getenv("RUNTIME_CONFIG_API_KEY", "")
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "llama3.1")


settings = Settings()
