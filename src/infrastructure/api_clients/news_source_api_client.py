from typing import Any

import requests


class NewsSourceApiClient:
    def __init__(self, base_url: str, api_key: str | None = None, timeout: int = 30) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout

    def get_latest_pages(self, project_name: str | None = None) -> list[dict[str, Any]]:
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        params = {}
        if project_name:
            params["project_name"] = project_name

        response = requests.get(
            f"{self.base_url}/news-sites",
            headers=headers,
            params=params,
            timeout=self.timeout,
        )
        response.raise_for_status()
        payload = response.json()
        if isinstance(payload, list):
            return payload
        return payload.get("data", [])

    def save_processed_articles(self, payload: list[dict[str, Any]]) -> dict[str, Any]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        response = requests.post(
            f"{self.base_url}/processed-articles",
            headers=headers,
            json={"data": payload},
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.json()
