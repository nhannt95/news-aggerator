from pydantic import BaseModel, Field


class TitleScreeningOutput(BaseModel):
    relevant_urls: list[str] = Field(
        default_factory=list,
        description="List of article URLs that passed the title screening.",
    )


class ClassificationOutput(BaseModel):
    is_relevant: bool = Field(description="Whether the article is relevant to the legal task.")
    relevance_score: int = Field(
        ge=0,
        le=100,
        description="Relevance score from 0 to 100.",
    )
    matched_topics: list[str] = Field(
        default_factory=list,
        description="Matched legal topics found in the article.",
    )
    reason: str = Field(description="Why the article is or is not relevant.")
    recommendation: str = Field(
        description="Recommended action based on the classification result."
    )


class ReportingOutput(BaseModel):
    analysis: str = Field(description="Analysis of the article.")
    recommendation: str = Field(description="Recommended next action.")
    risk_level: str = Field(description="Estimated risk or impact level.")
    key_points: list[str] = Field(
        default_factory=list,
        description="Important findings extracted from the article.",
    )


class TranslationItem(BaseModel):
    summary: str = Field(description="Translated summary.")
    content: str = Field(description="Translated article content.")
    analysis: str = Field(description="Translated analysis.")
    recommendation: str = Field(description="Translated recommendation.")


class SummaryTranslationOutput(BaseModel):
    summary: str = Field(description="Concise summary of the legal article in source language.")
    analysis: str = Field(description="Analysis of the article in source language.")
    recommendation: str = Field(description="Recommended action in source language.")
    translations: dict[str, TranslationItem] = Field(
        default_factory=dict,
        description="Translations keyed by language code. Each contains summary, content, analysis, recommendation.",
    )
