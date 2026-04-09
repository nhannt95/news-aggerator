from src.projects.legal_task.output_models import (
    ClassificationOutput,
    ReportingOutput,
    SummaryTranslationOutput,
    TitleScreeningOutput,
)


LEGAL_TASK_OUTPUT_MODELS = {
    "screen_titles": TitleScreeningOutput,
    "classify_articles": ClassificationOutput,
    "write_report": ReportingOutput,
    "translate_summary": SummaryTranslationOutput,
}
