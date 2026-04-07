import argparse
import asyncio
import json
from src.tools.crawlers.latest_news_link_crawler import LatestNewsLinkCrawler


DEFAULT_SOURCE_URLS = ["https://thanhnien.vn/tin-moi.htm"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Lay link bai viet moi nhat tu cac trang listing bang Crawl4AI."
    )
    parser.add_argument(
        "--source-url",
        nargs="+",
        default=DEFAULT_SOURCE_URLS,
        help="Danh sach trang moi nhat can crawl.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="So bai viet toi da moi trang. Bo qua tham so nay de lay het.",
    )
    parser.add_argument(
        "--output",
        default="thanh_nien_latest_articles.json",
        help="File JSON de luu danh sach link.",
    )
    return parser.parse_args()


async def run(source_urls: list[str], limit: int | None) -> list[dict[str, object]]:
    crawler = LatestNewsLinkCrawler(source_urls=source_urls)
    results = await crawler.extract_latest_links(limit_per_source=limit)
    return [
        {
            "source_url": item.source_url,
            "total_articles": len(item.articles),
            "articles": [
                {
                    "url": article.url,
                    "title": article.title,
                    "published_at": article.published_at,
                    "published_at_vn": article.published_at_vn,
                }
                for article in item.articles
            ],
        }
        for item in results
    ]


def main() -> None:
    args = parse_args()
    data = asyncio.run(run(source_urls=args.source_url, limit=args.limit))

    with open(args.output, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)

    total = sum(item["total_articles"] for item in data)
    print(f"Da luu {total} link bai viet vao {args.output}")


if __name__ == "__main__":
    main()
