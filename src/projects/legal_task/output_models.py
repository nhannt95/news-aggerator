from pydantic import BaseModel, Field


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


class SummaryTranslationOutput(BaseModel):
    summary: str = Field(description="Concise summary of the legal article.")
    translations: dict[str, str] = Field(
        default_factory=dict,
        description="Translations of the summary keyed by language code.",
    )
