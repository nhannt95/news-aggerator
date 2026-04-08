from src.common.logging.logger import get_logger
from src.projects.legal_task_report.workflow import LegalTaskReportWorkflow


logger = get_logger(__name__)


def run(project_input: dict) -> object:
    logger.info("Running legal_task_report pipeline")
    workflow = LegalTaskReportWorkflow()
    return workflow.run()
