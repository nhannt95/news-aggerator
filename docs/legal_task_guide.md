# Legal Task Guide

Tài liệu này mô tả:

- cách start `legal_task`
- project sẽ chạy qua file nào, hàm nào
- dữ liệu đi từ đâu đến đâu

## 1. Mục tiêu của `legal_task`

`legal_task` dùng để:

1. lấy danh sách trang báo từ API
2. lấy các bài mới hơn `last_crawled_at`
3. crawl nội dung bài viết
4. phân loại bài viết có đúng chủ đề legal không
5. đánh giá mức độ liên quan
6. phân tích và đưa ra đề xuất
7. nếu bài viết đủ liên quan thì summary và translate
8. gọi API để lưu kết quả

## 2. Cần start gì trước

### 2.1 Start mock API server

```powershell
.\.venv\Scripts\python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
```

Mock API hiện cung cấp:

- `/news-sites`
- `/projects/{project_name}/runtime-config`
- `/scheduler-configs`
- `/processed-articles`

### 2.2 Start Ollama

```powershell
ollama serve
```

Kiểm tra model:

```powershell
ollama list
```

### 2.3 Kiểm tra `.env`

Bạn nên có:

```env
NEWS_SOURCE_API_BASE_URL=http://127.0.0.1:8000
RUNTIME_CONFIG_API_BASE_URL=http://127.0.0.1:8000
SCHEDULER_API_BASE_URL=http://127.0.0.1:8000
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1
```

## 3. Cách start `legal_task`

Chạy trực tiếp project:

```powershell
.\.venv\Scripts\python scripts/run_project.py --project legal_task --input "{}"
```

Nếu bạn muốn truyền input thêm:

```powershell
.\.venv\Scripts\python scripts/run_project.py --project legal_task --input "{\"trigger\":\"manual\"}"
```

## 4. Luồng chạy qua file nào

Khi chạy lệnh ở trên, hệ thống sẽ đi qua các file sau.

### Bước 1. Entry point script

File:
[run_project.py](d:\Project\Python\news-aggerator\scripts\run_project.py)

Hàm:
- `main()`
- `parse_args()`

Việc làm:
- đọc `--project`
- đọc `--input`
- gọi `run_project(project_name, project_input)`

### Bước 2. App runner

File:
[runner.py](d:\Project\Python\news-aggerator\src\app\runner.py)

Hàm:
- `run_project(project_name, project_input)`

Việc làm:
- lấy pipeline tương ứng từ registry

File registry:
[registry.py](d:\Project\Python\news-aggerator\src\app\registry.py)

Biến:
- `PROJECT_REGISTRY`

Với `legal_task`, registry map sang:
- `src.projects.legal_task.pipeline.run`

### Bước 3. Project pipeline

File:
[pipeline.py](d:\Project\Python\news-aggerator\src\projects\legal_task\pipeline.py)

Hàm:
- `run(project_input)`

Việc làm:
- khởi tạo `LegalTaskWorkflow`
- gọi `workflow.run()`

### Bước 4. Workflow chính

File:
[workflow.py](d:\Project\Python\news-aggerator\src\projects\legal_task\workflow.py)

Class:
- `LegalTaskWorkflow`

Hàm quan trọng:

- `run()`
  - entry point chính của workflow
  - lấy danh sách source
  - loop qua từng source
  - gom kết quả
  - gọi API lưu kết quả

- `fetch_sources()`
  - gọi `SourceFetcher.fetch_sites(project_name="legal_task")`
  - chỉ giữ source active

- `process_site(site)`
  - với từng source:
  - lấy link bài mới
  - lọc bài mới hơn `last_crawled_at`
  - crawl content từng bài
  - classify
  - reporting
  - nếu đủ liên quan thì summary + translate
  - build payload để save

- `filter_new_articles(site, articles)`
  - so sánh `article.published_at` với `site.last_crawled_at`

- `run_classification(article, source)`
  - gọi classification crew
  - đọc structured output JSON
  - fallback nếu model chưa trả JSON hợp lệ

- `run_reporting(article, source, classification_result)`
  - gọi reporting crew
  - đọc structured output JSON

- `run_summary_translation(article, source)`
  - gọi summary_translation crew
  - đọc structured output JSON
  - fallback nếu model chưa trả JSON hợp lệ

- `_result_to_dict(result)`
  - convert `CrewOutput` thành dict
  - ưu tiên `json_dict`

## 5. Source được lấy như thế nào

### API client

File:
[news_source_api_client.py](d:\Project\Python\news-aggerator\src\infrastructure\api_clients\news_source_api_client.py)

Hàm:
- `get_latest_pages(project_name=None)`

Endpoint gọi:
- `GET /news-sites?project_name=legal_task`

### Source fetcher

File:
[source_fetcher.py](d:\Project\Python\news-aggerator\src\tools\sources\source_fetcher.py)

Hàm:
- `fetch_sites(project_name=None)`

Việc làm:
- gọi API client
- map response sang model `NewsSite`

### Model source

File:
[news_site.py](d:\Project\Python\news-aggerator\src\common\models\news_site.py)

Field chính:
- `site_id`
- `name`
- `latest_page_url`
- `language`
- `last_crawled_at`
- `relevance_threshold`
- `target_languages`

## 6. Link bài mới được lấy như thế nào

File:
[latest_news_link_crawler.py](d:\Project\Python\news-aggerator\src\tools\crawlers\latest_news_link_crawler.py)

Class:
- `LatestNewsLinkCrawler`

Hàm quan trọng:
- `extract_latest_links(limit_per_source=None)`
- `extract_links_from_listing(crawler, source_url, limit=None)`
- `crawl_article_info(crawler, url)`

Việc làm:
- crawl trang listing
- lấy link internal
- lọc link bài báo
- crawl sơ bộ để lấy `url`, `title`, `published_at`

## 7. Content bài viết được lấy như thế nào

File:
[article_content_crawler.py](d:\Project\Python\news-aggerator\src\tools\crawlers\article_content_crawler.py)

Class:
- `ArticleContentCrawler`

Hàm quan trọng:
- `crawl(url)`
- `crawl_many(urls)`
- `crawl_article(crawler, url)`

Việc làm:
- crawl từng URL bài viết
- lấy:
  - `title`
  - `published_at`
  - `author`
  - `description`
  - `content_markdown`
  - `metadata`

## 8. Crew nào được gọi trong `legal_task`

### 8.1 Classification crew

File:
[classification crew](d:\Project\Python\news-aggerator\src\projects\legal_task\crews\classification\crew.py)

Hàm:
- `build_crew(project_input)`

Mục đích:
- xác định bài có liên quan legal không
- trả JSON theo schema

Schema output:
[output_models.py](d:\Project\Python\news-aggerator\src\projects\legal_task\output_models.py)

Class:
- `ClassificationOutput`

### 8.2 Reporting crew

File:
[reporting crew](d:\Project\Python\news-aggerator\src\projects\legal_task\crews\reporting\crew.py)

Hàm:
- `build_crew(project_input)`

Mục đích:
- phân tích bài viết
- nêu đề xuất
- trả JSON theo schema

Schema:
- `ReportingOutput`

### 8.3 Summary translation crew

File:
[summary_translation crew](d:\Project\Python\news-aggerator\src\projects\legal_task\crews\summary_translation\crew.py)

Hàm:
- `build_crew(project_input)`

Mục đích:
- tóm tắt bài viết
- dịch summary sang 2 ngôn ngữ đích
- trả JSON theo schema

Schema:
- `SummaryTranslationOutput`

## 9. Runtime config của agents/tasks/crews được lấy ở đâu

Project hiện không hardcode config agent/task trong project code nữa.

Nó được lấy từ runtime config API:

File provider:
[project_runtime_provider.py](d:\Project\Python\news-aggerator\src\app\runtime\project_runtime_provider.py)

Hàm:
- `load_project_runtime_config(project_name)`

API client:
[project_runtime_api_client.py](d:\Project\Python\news-aggerator\src\infrastructure\api_clients\project_runtime_api_client.py)

Endpoint:
- `GET /projects/legal_task/runtime-config`

Mock data hiện tại:
[runtime_configs.py](d:\Project\Python\news-aggerator\src\api\mock_data\runtime_configs.py)

## 10. Agent/Crew được build như thế nào

File:
[crewai_runtime_builder.py](d:\Project\Python\news-aggerator\src\app\runtime\crewai_runtime_builder.py)

Hàm:
- `build_agents_from_config(...)`
- `build_tasks_from_config(...)`
- `build_crew_from_runtime(...)`

Việc làm:
- build `Agent` từ runtime config
- build `Task` từ runtime config
- gắn `output_json` schema cho task cuối
- build `Crew`
- tất cả agent dùng Ollama local qua:
  - `OLLAMA_BASE_URL`
  - `OLLAMA_MODEL`

## 11. Kết quả lưu đi đâu

API client:
[news_source_api_client.py](d:\Project\Python\news-aggerator\src\infrastructure\api_clients\news_source_api_client.py)

Hàm:
- `save_processed_articles(payload)`

Endpoint:
- `POST /processed-articles`

Mock API router:
[storage.py](d:\Project\Python\news-aggerator\src\api\routers\storage.py)

Mock service:
[processed_article_service.py](d:\Project\Python\news-aggerator\src\api\services\processed_article_service.py)

## 12. Dữ liệu output cuối của workflow

`LegalTaskWorkflow.run()` hiện trả về:

- `source_count`
- `processed_count`
- `save_result`
- `items`

Mỗi item có thể có:

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
- `analysis_and_recommendation`
- `reporting_structured`
- `summary`
- `translations`
- `summary_translation_result`

## 13. Mock API nào cần chạy để test

Để test `legal_task`, hiện bạn cần ít nhất các endpoint mock sau đang chạy:

- `GET /news-sites`
- `GET /projects/legal_task/runtime-config`
- `POST /processed-articles`

Tất cả đang nằm trong:
- [main.py](d:\Project\Python\news-aggerator\src\api\main.py)

## 14. Lưu ý hiện tại

- `classification`, `reporting`, `summary_translation` đã hỗ trợ structured JSON output
- workflow hiện ưu tiên đọc `json_dict`
- vẫn có fallback nếu model local không trả JSON đúng
- để production ổn hơn, prompt trong runtime config nên yêu cầu:
  - chỉ trả JSON hợp lệ
  - không thêm giải thích ngoài JSON
  - field phải đúng schema
