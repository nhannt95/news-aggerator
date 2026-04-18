from src.projects.legal_task.output_models import (
    ClassificationOutput,
    ReportingOutput,
    SummaryOutput,
    TitleScreeningOutput,
    TranslationOutput,
)


LEGAL_TASK_OUTPUT_MODELS = {
    "screen_titles": TitleScreeningOutput,
    "classify_articles": ClassificationOutput,
    "write_report": ReportingOutput,
    "summarize_article": SummaryOutput,
    "translate_summary": TranslationOutput,
}
