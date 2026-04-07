from src.common.logging.logger import get_logger
from src.common.models.runtime_config import ServiceControlCommand


logger = get_logger(__name__)


def apply_service_control(command: ServiceControlCommand) -> dict:
    action = command.action.lower().strip()

    if action == "reload":
        logger.info("Received runtime reload request")
        return {
            "status": "accepted",
            "action": "reload",
            "message": "Runtime reload should refresh configs without restarting the process.",
        }

    if action == "restart":
        logger.warning("Received restart request")
        return {
            "status": "accepted",
            "action": "restart",
            "message": "Process restart should be delegated to your process manager.",
        }

    raise ValueError(f"Unsupported service control action: {command.action}")
