from src.projects.legal_task.output_models import (
    ClassificationOutput,
    ReportingOutput,
    SummaryTranslationOutput,
)


LEGAL_TASK_OUTPUT_MODELS = {
    "classify_articles": ClassificationOutput,
    "write_report": ReportingOutput,
    "translate_summary": SummaryTranslationOutput,
}
