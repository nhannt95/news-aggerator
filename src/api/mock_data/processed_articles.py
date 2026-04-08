MOCK_PROCESSED_ARTICLES = [
    {
        "project_name": "legal_task",
        "site_id": "tn-legal-1",
        "source_language": "vi",
        "article_url": "https://thanhnien.vn/example-legal-185250000.htm",
        "title": "Bai viet phap ly mau",
        "published_at": "2026-04-08T08:00:00+07:00",
        "published_at_vn": "08/04/2026 08:00:00 ICT",
        "author": "Mock Author",
        "description": "Mo ta bai viet phap ly mau",
        "content_markdown": "Noi dung bai viet phap ly mau",
        "is_relevant": True,
        "relevance_score": 85,
        "classification_result": "{\"is_relevant\": true}",
        "classification_structured": {
            "is_relevant": True,
            "relevance_score": 85,
            "matched_topics": ["policy", "regulation"],
            "reason": "Article discusses legal policy changes.",
            "recommendation": "Review and monitor legal implications.",
        },
        "summary": "Tom tat bai viet phap ly mau",
        "translations": {
            "en": "Sample English summary",
            "ko": "Sample Korean summary",
        },
        "summary_translation_result": "{\"summary\": \"Tom tat bai viet phap ly mau\"}",
        "report_generated": False,
    }
]

MOCK_REPORT_RESULTS: list[dict] = []
