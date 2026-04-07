class ArticleRepository:
    def save_batch(self, articles: list[dict]) -> None:
        raise NotImplementedError("Implement article persistence here.")
