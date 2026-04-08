# Legal Task Guide

Tai lieu nay mo ta `legal_task` theo mo hinh hien tai.

`legal_task` chi lam ingest:

1. Lay source tu API
2. Lay bai moi hon `last_crawled_at`
3. Crawl content
4. Chay `classification`
5. Neu du lien quan thi chay `summary_translation`
6. Luu vao `/processed-articles`

`legal_task` khong chay `reporting` nua. Reporting da tach sang project [legal_task_report](d:\Project\Python\news-aggerator\src\projects\legal_task_report\workflow.py).

## 1. Cach start

Start mock API:

```powershell
.\.venv\Scripts\python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
```

Start Ollama:

```powershell
ollama serve
```

Chay project:

```powershell
.\.venv\Scripts\python scripts/run_project.py --project legal_task --input "{}"
```

## 2. File va ham duoc goi

Entry point:

- [run_project.py](d:\Project\Python\news-aggerator\scripts\run_project.py)
  - `main()`
  - `parse_args()`

Runner:

- [runner.py](d:\Project\Python\news-aggerator\src\app\runner.py)
  - `run_project(project_name, project_input)`

Registry:

- [registry.py](d:\Project\Python\news-aggerator\src\app\registry.py)
  - `PROJECT_REGISTRY`

Pipeline:

- [pipeline.py](d:\Project\Python\news-aggerator\src\projects\legal_task\pipeline.py)
  - `run(project_input)`

Workflow chinh:

- [workflow.py](d:\Project\Python\news-aggerator\src\projects\legal_task\workflow.py)
  - `LegalTaskWorkflow.run()`
  - `fetch_sources()`
  - `process_site(site)`
  - `filter_new_articles(site, articles)`
  - `run_classification(article, source)`
  - `run_summary_translation(article, source)`
  - `_result_to_dict(result)`

## 3. Source duoc lay tu dau

API client:

- [news_source_api_client.py](d:\Project\Python\news-aggerator\src\infrastructure\api_clients\news_source_api_client.py)
  - `get_latest_pages(project_name=None)`

Fetcher:

- [source_fetcher.py](d:\Project\Python\news-aggerator\src\tools\sources\source_fetcher.py)
  - `fetch_sites(project_name=None)`

Model:

- [news_site.py](d:\Project\Python\news-aggerator\src\common\models\news_site.py)

Mock API hien tai tra source cho `legal_task` tu:

- Thanh Nien
- Dan Tri

Mock data:

- [news_sites.py](d:\Project\Python\news-aggerator\src\api\mock_data\news_sites.py)

## 4. Lay link bai moi

Crawler:

- [latest_news_link_crawler.py](d:\Project\Python\news-aggerator\src\tools\crawlers\latest_news_link_crawler.py)
  - `extract_latest_links(limit_per_source=None)`
  - `extract_links_from_listing(crawler, source_url, limit=None)`
  - `crawl_article_info(crawler, url)`

Viec lam:

- vao listing page
- lay danh sach link bai viet
- lay `url`, `title`, `published_at`
- loc bai moi hon `last_crawled_at`

## 5. Lay content bai viet

Crawler:

- [article_content_crawler.py](d:\Project\Python\news-aggerator\src\tools\crawlers\article_content_crawler.py)
  - `crawl(url)`
  - `crawl_many(urls)`
  - `crawl_article(crawler, url)`

Viec lam:

- crawl tung bai viet
- lay `title`
- lay `published_at`
- lay `author`
- lay `description`
- lay `content_markdown`

## 6. Crew duoc goi trong `legal_task`

Classification:

- [classification/crew.py](d:\Project\Python\news-aggerator\src\projects\legal_task\crews\classification\crew.py)
  - `build_crew(project_input)`

Summary translation:

- [summary_translation/crew.py](d:\Project\Python\news-aggerator\src\projects\legal_task\crews\summary_translation\crew.py)
  - `build_crew(project_input)`

`legal_task` hien tai khong goi:

- [reporting/crew.py](d:\Project\Python\news-aggerator\src\projects\legal_task\crews\reporting\crew.py)

Reporting da duoc tach sang:

- [legal_task_report workflow](d:\Project\Python\news-aggerator\src\projects\legal_task_report\workflow.py)

## 7. Runtime config cua agent task crew

Provider:

- [project_runtime_provider.py](d:\Project\Python\news-aggerator\src\app\runtime\project_runtime_provider.py)
  - `load_project_runtime_config(project_name)`

API client:

- [project_runtime_api_client.py](d:\Project\Python\news-aggerator\src\infrastructure\api_clients\project_runtime_api_client.py)

Mock runtime config:

- [runtime_configs.py](d:\Project\Python\news-aggerator\src\api\mock_data\runtime_configs.py)

Builder:

- [crewai_runtime_builder.py](d:\Project\Python\news-aggerator\src\app\runtime\crewai_runtime_builder.py)
  - `build_agents_from_config(...)`
  - `build_tasks_from_config(...)`
  - `build_crew_from_runtime(...)`

Tat ca agent dang dung Ollama local qua:

- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`

## 8. Structured JSON output

Schema output:

- [output_models.py](d:\Project\Python\news-aggerator\src\projects\legal_task\output_models.py)

Registry schema:

- [output_registry.py](d:\Project\Python\news-aggerator\src\projects\legal_task\output_registry.py)

Workflow doc ket qua tu `CrewOutput.json_dict` truoc. Neu model tra sai format thi moi fallback.

## 9. Save ket qua di dau

API client:

- [news_source_api_client.py](d:\Project\Python\news-aggerator\src\infrastructure\api_clients\news_source_api_client.py)
  - `save_processed_articles(payload)`

Mock API:

- [storage.py](d:\Project\Python\news-aggerator\src\api\routers\storage.py)
- [processed_article_service.py](d:\Project\Python\news-aggerator\src\api\services\processed_article_service.py)

Endpoint:

- `POST /processed-articles`

## 10. Scheduler chay nhu the nao

`legal_task` duoc scheduler goi theo project, khong goi theo crew.

Mock scheduler config:

- [scheduler_configs.py](d:\Project\Python\news-aggerator\src\api\mock_data\scheduler_configs.py)

Lich hien tai:

- `legal_task`: 0h, 6h, 12h
- `legal_task_report`: 14h

Chay dry run:

```powershell
.\.venv\Scripts\python scripts/run_scheduler.py --dry-run
```

## 11. Dau ra chinh cua workflow

`LegalTaskWorkflow.run()` tra ve:

- `source_count`
- `processed_count`
- `save_result`
- `items`

Moi item co the co:

- `project_name`
- `site_id`
- `source_language`
- `article_url`
- `title`
- `published_at`
- `published_at_vn`
- `author`
- `description`
- `content_markdown`
- `is_relevant`
- `relevance_score`
- `classification_result`
- `classification_structured`
- `summary`
- `translations`
- `summary_translation_result`

## 12. Luu y

- Khong can truyen `topic=legal` trong command.
- Topic/domain nen nam trong prompt va runtime config.
- Neu muon reporting, chay project `legal_task_report`.
