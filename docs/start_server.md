# Start Server Guide

Moi config nen dat trong `.env` hoac [settings.py](d:\Project\Python\news-aggerator\src\common\config\settings.py). Khong can hardcode host API hay Ollama trong command.

## 1. Tao file `.env`

```powershell
Copy-Item .env.example .env
```

Gia tri mau:

```env
API_HOST=127.0.0.1
API_PORT=8000

NEWS_SOURCE_API_BASE_URL=http://127.0.0.1:8000
NEWS_SOURCE_API_KEY=

SCHEDULER_API_BASE_URL=http://127.0.0.1:8000
SCHEDULER_API_KEY=

RUNTIME_CONFIG_API_BASE_URL=http://127.0.0.1:8000
RUNTIME_CONFIG_API_KEY=

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:1b
```

## 2. Cai thu vien

```powershell
pip install -r requirments.txt
```

Neu dung virtualenv trong repo:

```powershell
.\.venv\Scripts\activate
pip install -r requirments.txt
```

## 3. Start mock API server

```powershell
.\.venv\Scripts\python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
```

Endpoint de test nhanh:

- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/projects/legal_task/runtime-config`
- `http://127.0.0.1:8000/scheduler-configs`

## 4. Start Ollama

```powershell
ollama serve
```

Kiem tra model:

```powershell
ollama list
```

## 5. Chay tung project thu cong

`legal_task` la ingest:

```powershell
.\.venv\Scripts\python scripts/run_project.py --project legal_task
```

`legal_task_report` la reporting:

```powershell
.\.venv\Scripts\python scripts/run_project.py --project legal_task_report
```

`er_task`:

```powershell
.\.venv\Scripts\python scripts/run_project.py --project er_task
```

## 6. Chay scheduler

Scheduler doc lich tu mock API `/scheduler-configs`.

Dry run:

```powershell
.\.venv\Scripts\python scripts/run_scheduler.py --dry-run
```

Chay that:

```powershell
.\.venv\Scripts\python scripts/run_scheduler.py
```

Lich mock hien tai:

- `legal_task`: 0h, 6h, 12h
- `legal_task_report`: 14h
- `er_task`: moi 15 phut

## 7. Thu tu start khuyen nghi

Terminal 1:

```powershell
.\.venv\Scripts\python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
```

Terminal 2:

```powershell
ollama serve
```

Terminal 3:

```powershell
.\.venv\Scripts\python scripts/run_scheduler.py --dry-run
```

Sau khi ok, chay:

```powershell
.\.venv\Scripts\python scripts/run_scheduler.py
```

## 8. Luu y

- API hien tai dang dung mock data.
- `--input` la optional. Neu bo qua thi CLI tu dung `{}`.
- Topic/domain nen duoc define trong runtime config, task prompt, agent prompt, hoac source config.
- Scheduler dang chay theo project, khong chay theo crew.
