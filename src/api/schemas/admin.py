from pydantic import BaseModel


class RuntimeResetRequest(BaseModel):
    action: str
    reason: str | None = None
    requested_by: str | None = None
    project_name: str | None = None
    hard_restart: bool = False


class RuntimeResetResponse(BaseModel):
    status: str
    action: str
    message: str
