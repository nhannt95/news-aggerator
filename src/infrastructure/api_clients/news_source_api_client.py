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

    def get_processed_articles(
        self,
        project_name: str | None = None,
        require_summary: bool = False,
        require_relevant: bool = False,
        report_generated: bool | None = None,
    ) -> list[dict[str, Any]]:
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        params: dict[str, Any] = {}
        if project_name:
            params["project_name"] = project_name
        if require_summary:
            params["require_summary"] = "true"
        if require_relevant:
            params["require_relevant"] = "true"
        if report_generated is not None:
            params["report_generated"] = str(report_generated).lower()

        response = requests.get(
            f"{self.base_url}/processed-articles",
            headers=headers,
            params=params,
            timeout=self.timeout,
        )
        response.raise_for_status()
        payload = response.json()
        if isinstance(payload, list):
            return payload
        return payload.get("data", [])

    def save_report_results(self, payload: list[dict[str, Any]]) -> dict[str, Any]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        response = requests.post(
            f"{self.base_url}/reported-articles",
            headers=headers,
            json={"data": payload},
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.json()
