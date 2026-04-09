MOCK_NEWS_SITES = [
    {
        "id": "tn-legal-1",
        "name": "Bao Thanh Nien",
        "latest_page_url": "https://thanhnien.vn/tin-moi.htm",
        "domain": "thanhnien.vn",
        "category": "legal",
        "language": "vi",
        "last_crawled_at": "2026-04-07T00:00:00+07:00",
        "project_name": "legal_task",
        "relevance_threshold": 70,
        "target_languages": ["vi", "en", "ko"],
        "active": True,

        "content_selector": "div.detail-cmain",
    },
    {
        "id": "dt-legal-1",
        "name": "Bao Dan tri",
        "latest_page_url": "https://dantri.com.vn/tin-moi-nhat.htm",
        "domain": "dantri.com.vn",
        "category": "legal",
        "language": "vi",
        "last_crawled_at": "2026-04-07T00:00:00+07:00",
        "project_name": "legal_task",
        "relevance_threshold": 70,
        "target_languages": ["vi", "en", "ko"],
        "active": True,

        "content_selector": "div.singular-content",
    },
]
