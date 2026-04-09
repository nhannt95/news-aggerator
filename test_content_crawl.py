import asyncio

from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig

URL = "https://thanhnien.vn/viet-nam-coi-trong-va-uu-tien-hang-dau-moi-quan-he-dac-biet-voi-lao-185260409183036891.htm"
CSS_SELECTOR = "div.detail-cmain"


async def main():
    browser_config = BrowserConfig(headless=True, verbose=False)

    async with AsyncWebCrawler(config=browser_config) as crawler:
        config_css = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            css_selector=CSS_SELECTOR,
        )
        result = await crawler.arun(url=URL, config=config_css)

        print(f"Success: {result.success}")
        print(f"Error: {result.error_message}")
        print(f"HTML length: {len(result.html or '')}")
        print()

        md = getattr(result, "markdown", None)
        print(f"Markdown type: {type(md)}")

        if md is None:
            print("Markdown: None")
        elif isinstance(md, str):
            print(f"Markdown length: {len(md)}")
            print(md)
        else:
            for attr in ("raw_markdown", "fit_markdown", "markdown_with_citations"):
                val = getattr(md, attr, None)
                print(f"  {attr}: {len(val) if val else 0} chars")
            raw = getattr(md, "raw_markdown", "") or ""
            fit = getattr(md, "fit_markdown", "") or ""
            content = raw or fit
            print()
            print(content)


asyncio.run(main())
