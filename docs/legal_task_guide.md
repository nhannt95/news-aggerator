# Legal Task Guide

Tai lieu nay mo ta `legal_task` theo mo hinh hien tai.

## API Endpoints

### Sources & Storage
```
GET  /news-sites?project_name=
GET  /processed-articles?project_name=&require_summary=&require_relevant=&report_generated=
POST /processed-articles
POST /reported-articles
```

### Scheduler (CRUD + auto reload)
```
GET    /scheduler/configs              — Xem tat ca config
GET    /scheduler/configs/{job_id}     — Xem 1 config
POST   /scheduler/configs              — Tao job moi → auto reload scheduler
PUT    /scheduler/configs/{job_id}     — Sua job → auto reload scheduler
DELETE /scheduler/configs/{job_id}     — Xoa job → auto reload scheduler
POST   /scheduler/reload               — Reload scheduler thu cong
GET    /scheduler/jobs                  — Xem jobs dang chay + next_run_time
```

### Runtime & Admin
```
GET  /projects/{project_name}/runtime-config
GET  /runtime-configs
POST /admin/runtime/reset
POST /projects/{project_name}/run
```

---

## Workflow `legal_task`

1. Lay source tu API (`GET /news-sites?project_name=legal_task`)
2. Crawl trang listing voi `listing_selector` (CSS selector)
3. Loc link bai viet theo `article_url_pattern` (regex)
4. Loc bai moi hon `last_crawled_at`
5. **Title screening** — Agent `title_screener` nhan batch titles, tra list URLs hop le
6. Crawl content chi nhung bai da qua title screening (voi `content_selector`)
7. Download hinh jpg/png, strip link khoi markdown
8. **Content classification** — Agent `classifier` phan loai tung bai theo content
9. Neu relevant: **Summary + Analysis + Translation** sang tat ca target languages
10. Luu vao `POST /processed-articles`
11. Xoa hinh local sau khi save thanh cong

`legal_task` khong chay `reporting`. Reporting da tach sang project `legal_task_report`.

---

## Cach chay

### Cach 1: Chay tay

```powershell
# Start API server
.\.venv\Scripts\python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload

# Start Ollama
ollama serve

# Chay project
.\.venv\Scripts\python scripts/run_project.py --project legal_task
```

### Cach 2: Scheduler tu dong

Khi start FastAPI server, scheduler **tu dong chay kem** (BackgroundScheduler).
Khong can start rieng.

```powershell
# Chi can start server — scheduler chay background
.\.venv\Scripts\python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000
```

Scheduler se tu goi `run_project("legal_task", {})` theo lich da cau hinh.
**Cung 1 ham `run_project()`**, chi khac ai trigger.

### So sanh

| | Chay tay | Scheduler |
|---|---|---|
| Trigger | Ban go lenh | Tu dong theo lich |
| Ham goi | `run_project("legal_task", {})` | `run_project("legal_task", {})` |
| Ket qua | Giong nhau | Giong nhau |

---

## Scheduler Config

### Lich hien tai (mock data)

| Job ID | Project | Lich chay | Mo ta |
|---|---|---|---|
| `legal_task_ingest` | legal_task | 0h, 6h, 12h | Crawl + classify + translate |
| `legal_task_report_14h` | legal_task_report | 14h | Tao report tu bai da xu ly |
| `er_task_every_15m` | er_task | Moi 15 phut | ER monitoring |

### Doi lich qua API

```bash
# Xem lich hien tai
curl http://localhost:8000/scheduler/configs

# Sua legal_task chay moi 2 tieng
curl -X PUT http://localhost:8000/scheduler/configs/legal_task_ingest \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "legal_task_ingest",
    "project_name": "legal_task",
    "trigger_type": "cron",
    "trigger_args": {"hour": "*/2", "minute": 0},
    "enabled": true,
    "timezone": "Asia/Ho_Chi_Minh"
  }'
# → Scheduler tu dong reload, khong can restart server

# Tam dung 1 job
curl -X PUT http://localhost:8000/scheduler/configs/er_task_every_15m \
  -H "Content-Type: application/json" \
  -d '{"enabled": false, ...}'

# Xem jobs dang chay va next_run_time
curl http://localhost:8000/scheduler/jobs
```

### Trigger types

| Type | trigger_args | Vi du |
|---|---|---|
| `cron` | `{"hour": 8, "minute": 0}` | Moi ngay luc 8:00 |
| `cron` | `{"hour": "0,6,12", "minute": 0}` | 3 lan/ngay |
| `cron` | `{"hour": "*/2", "minute": 0}` | Moi 2 tieng |
| `cron` | `{"minute": "*/15"}` | Moi 15 phut |
| `interval` | `{"minutes": 30}` | Moi 30 phut |
| `interval` | `{"hours": 1}` | Moi 1 tieng |

---

## Cau hinh nguon tin (NewsSite)

Moi source co 3 CSS/regex config:

| Field | Y nghia | Vi du Thanh Nien | Vi du Dan Tri |
|---|---|---|---|
| `listing_selector` | Vung danh sach bai tren trang tin moi | `div.box-category-middle.list__main_check` | `div.article.list` |
| `article_url_pattern` | Regex loc URL bai viet (bo category links) | `-185\d+\.htm$` | `-\d+\.htm$` |
| `content_selector` | Vung noi dung bai viet | `div.detail-cmain` | `div.singular-content` |

### Cach tim CSS selector

1. Mo trang bao trong Chrome
2. F12 → Inspect Element
3. Tim vung chua danh sach bai → copy class
4. Noi cac class bang dau `.` (vi du: `class="box-category-middle list__main_check"` → `div.box-category-middle.list__main_check`)

### Cach tim article_url_pattern

Mo 1 bai viet bat ky, nhin phan cuoi URL:

| Trang | URL mau | Pattern |
|---|---|---|
| Thanh Nien | `...-185260409183036891.htm` | `-185\d+\.htm$` |
| Dan Tri | `...-20260411080000.htm` | `-\d+\.htm$` |
| VnExpress | `...-4567890.html` | `-\d+\.html$` |
| Tuoi Tre | `...-20260411.htm` | `-\d+\.htm$` |

Ky hieu regex: `\d` = chu so, `\d+` = nhieu chu so, `\.` = dau cham, `$` = ket thuc URL.

---

## Translation & Multi-language

Moi bai viet relevant se duoc:

1. **Summary** — tom tat bang ngon ngu goc
2. **Analysis** — phan tich tac dong
3. **Recommendation** — de xuat hanh dong
4. **Translate** — tat ca 4 truong (summary, content, analysis, recommendation) sang moi target language

Object `translations` chua **tat ca ngon ngu ke ca goc**:

```json
{
  "translations": {
    "vi": {
      "summary": "Tom tat goc",
      "content": "Noi dung goc",
      "analysis": "Phan tich goc",
      "recommendation": "De xuat goc"
    },
    "en": {
      "summary": "English summary",
      "content": "English content",
      "analysis": "English analysis",
      "recommendation": "English recommendation"
    },
    "ko": { "..." }
  }
}
```

Cau hinh `target_languages` trong `news_sites`. Vi du site tieng Viet: `["vi", "en", "ko"]` → agent translate sang en va ko, vi la goc tu lay tu ket qua.

---

## File va ham chinh

### Entry point
- `scripts/run_project.py` → `run_project(project_name, project_input)`
- `src/app/registry.py` → `PROJECT_REGISTRY`

### Workflow
- `src/projects/legal_task/workflow.py`
  - `LegalTaskWorkflow.run()`
  - `fetch_sources()`
  - `process_site(site)`
  - `filter_new_articles(site, articles)`
  - `run_title_screening(articles, source, batch_size=20)`
  - `run_classification(article, source)`
  - `run_summary_translation(article, source, classification)`

### Crawlers
- `src/tools/crawlers/latest_news_link_crawler.py` — Crawl listing page, parse `<a>` trong CSS selector
- `src/tools/crawlers/article_content_crawler.py` — Crawl content tung bai
- `src/tools/images/image_downloader.py` — Download hinh, strip links khoi markdown

### CrewAI Crews (legal_task)
- `title_screening` — Agent: `title_screener`, Task: `screen_titles`
- `classification` — Agent: `classifier`, Task: `classify_articles`
- `summary_translation` — Agent: `summary_translator`, Tasks: `summarize_article`, `translate_summary`

### Runtime config
- `src/api/mock_data/runtime_configs.py` — Cau hinh agents, tasks, crews
- `src/app/runtime/crewai_runtime_builder.py` — Build CrewAI tu config
- Tat ca agent dung Ollama local: `OLLAMA_BASE_URL` + `OLLAMA_MODEL`
- Moi agent co the set `llm` rieng trong runtime config

### Output models
- `src/projects/legal_task/output_models.py`
  - `TitleScreeningOutput` — `{ relevant_urls: [...] }`
  - `ClassificationOutput` — `{ is_relevant, relevance_score, matched_topics, reason, recommendation }`
  - `SummaryTranslationOutput` — `{ summary, analysis, recommendation, translations: {...} }`

---

## Dau ra cua workflow

`LegalTaskWorkflow.run()` tra ve:

```json
{
  "source_count": 2,
  "processed_count": 5,
  "save_result": {"status": "accepted", "saved_count": 5},
  "items": [
    {
      "project_name": "legal_task",
      "site_id": "tn-legal-1",
      "source_language": "vi",
      "article_url": "https://...",
      "title": "...",
      "published_at": "...",
      "published_at_vn": "...",
      "author": "...",
      "description": "...",
      "content_markdown": "... (stripped links & images)",
      "images": [{"original_url": "...", "local_path": "...", "size_bytes": 12345}],
      "is_relevant": true,
      "relevance_score": 85,
      "classification_result": "...",
      "classification_structured": {"..."},
      "summary": "...",
      "analysis": "...",
      "recommendation": "...",
      "translations": {"vi": {"..."}, "en": {"..."}, "ko": {"..."}},
      "summary_translation_result": "...",
      "report_generated": false
    }
  ]
}
```

---

## Luu y

- `--input` la optional. Neu khong truyen, CLI se tu dung `{}`.
- Title screening chia batch 20 titles/lan de tranh overload model nho.
- Neu muon reporting, chay project `legal_task_report`.
- Images duoc download ve `storage/images/{site_id}/{article_hash}/`, xoa sau khi save thanh cong.
- Doi lich scheduler qua API, khong can restart server.
