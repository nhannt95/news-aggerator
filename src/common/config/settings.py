from dataclasses import dataclass
import os

from dotenv import load_dotenv


load_dotenv()


@dataclass(slots=True)
class Settings:
    api_host: str = os.getenv("API_HOST", "127.0.0.1")
    api_port: int = int(os.getenv("API_PORT", "8000"))
    news_source_api_base_url: str = os.getenv("NEWS_SOURCE_API_BASE_URL", "")
    news_source_api_key: str = os.getenv("NEWS_SOURCE_API_KEY", "")
    scheduler_api_base_url: str = os.getenv("SCHEDULER_API_BASE_URL", "")
    scheduler_api_key: str = os.getenv("SCHEDULER_API_KEY", "")
    runtime_config_api_base_url: str = os.getenv("RUNTIME_CONFIG_API_BASE_URL", "")
    runtime_config_api_key: str = os.getenv("RUNTIME_CONFIG_API_KEY", "")
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "llama3.2:1b")

    @property
    def local_api_base_url(self) -> str:
        return f"http://{self.api_host}:{self.api_port}"

    @property
    def resolved_news_source_api_base_url(self) -> str:
        return self.news_source_api_base_url or self.local_api_base_url

    @property
    def resolved_scheduler_api_base_url(self) -> str:
        return self.scheduler_api_base_url or self.local_api_base_url

    @property
    def resolved_runtime_config_api_base_url(self) -> str:
        return self.runtime_config_api_base_url or self.local_api_base_url


settings = Settings()
