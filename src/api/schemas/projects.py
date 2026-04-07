from typing import Any

from pydantic import BaseModel, Field


class ProjectRunRequest(BaseModel):
    input_payload: dict[str, Any] = Field(default_factory=dict)


class ProjectRunResponse(BaseModel):
    project_name: str
    status: str
    result: str
