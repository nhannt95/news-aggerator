from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class SchedulerJobConfig:
    job_id: str
    project_name: str
    trigger_type: str = "cron"
    trigger_args: dict[str, Any] = field(default_factory=dict)
    input_payload: dict[str, Any] = field(default_factory=dict)
    enabled: bool = True
    timezone: str = "Asia/Ho_Chi_Minh"
