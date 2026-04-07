from src.common.logging.logger import get_logger
from src.projects.er_task.crews.classification.crew import (
    build_crew as build_classification_crew,
)
from src.projects.er_task.crews.reporting.crew import (
    build_crew as build_reporting_crew,
)


logger = get_logger(__name__)


def run(project_input: dict) -> object:
    logger.info("Running er_task pipeline")
    classification_result = build_classification_crew(project_input).kickoff(
        inputs=project_input
    )
    reporting_input = {
        **project_input,
        "classification_result": str(classification_result),
    }
    reporting_result = build_reporting_crew(reporting_input).kickoff(
        inputs=reporting_input
    )
    return {
        "classification_result": str(classification_result),
        "reporting_result": str(reporting_result),
    }
