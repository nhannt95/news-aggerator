from fastapi import APIRouter

from src.api.schemas.admin import RuntimeResetRequest, RuntimeResetResponse
from src.app.runtime.service_control import apply_service_control
from src.common.models.runtime_config import ServiceControlCommand


router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/runtime/reset", response_model=RuntimeResetResponse)
def reset_runtime(payload: RuntimeResetRequest) -> RuntimeResetResponse:
    result = apply_service_control(
        ServiceControlCommand(
            action=payload.action,
            reason=payload.reason,
            requested_by=payload.requested_by,
            project_name=payload.project_name,
            hard_restart=payload.hard_restart,
        )
    )
    return RuntimeResetResponse(**result)
