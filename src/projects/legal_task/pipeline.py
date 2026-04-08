from src.common.logging.logger import get_logger
from src.projects.legal_task.workflow import LegalTaskWorkflow


logger = get_logger(__name__)


def run(project_input: dict) -> object:
    logger.info("Running legal_task pipeline")
    workflow = LegalTaskWorkflow()
    return workflow.run()
