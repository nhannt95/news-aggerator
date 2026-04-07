from typing import Any

from pydantic import BaseModel, Field


class SchedulerJobResponse(BaseModel):
    job_id: str
    project_name: str
    trigger_type: str = "cron"
    trigger_args: dict[str, Any] = Field(default_factory=dict)
    input_payload: dict[str, Any] = Field(default_factory=dict)
    enabled: bool = True
    timezone: str = "Asia/Ho_Chi_Minh"
