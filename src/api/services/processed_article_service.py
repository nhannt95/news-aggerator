class ProcessedArticleService:
    def save_processed_articles(self, payload: list[dict]) -> dict:
        return {
            "status": "accepted",
            "saved_count": len(payload),
            "message": "Mock save completed",
        }
