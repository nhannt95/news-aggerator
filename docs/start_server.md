# Start Server Guide

Mọi config nên được set trong `.env` hoặc qua `src/common/config/settings.py`.
Không nên hardcode host API hay Ollama trong command.

## 1. Tạo file `.env`

Copy từ file mẫu:

```powershell
Copy-Item .env.example .env
```

Sau đó sửa `.env` theo môi trường của bạn.

Ví dụ:

```env
API_HOST=127.0.0.1
API_PORT=8000

NEWS_SOURCE_API_BASE_URL=http://127.0.0.1:8000
NEWS_SOURCE_API_KEY=

SCHEDULER_API_BASE_URL=http://127.0.0.1:8000
SCHEDULER_API_KEY=

RUNTIME_CONFIG_API_BASE_URL=http://127.0.0.1:8000
RUNTIME_CONFIG_API_KEY=

OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1
```

App hiện đã tự đọc `.env` thông qua `python-dotenv` trong [settings.py](d:\Project\Python\news-aggerator\src\common\config\settings.py).

## 2. Cài thư viện

```powershell
pip install -r requirments.txt
```

Nếu dùng virtual environment trong repo:

```powershell
.\.venv\Scripts\activate
pip install -r requirments.txt
```

## 3. Start FastAPI mock server

Server này trả về:

- runtime config mock
- scheduler config mock
- admin reset endpoint

Chạy lệnh:

```powershell
.\.venv\Scripts\python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
```

Nếu bạn đổi `API_HOST` hoặc `API_PORT` trong `.env`, hãy đổi tham số `--host` và `--port` tương ứng.

Sau khi chạy, mở:

- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/docs`

## 4. Test runtime config API

```powershell
Invoke-RestMethod http://127.0.0.1:8000/projects/legal_task/runtime-config
```

```powershell
Invoke-RestMethod http://127.0.0.1:8000/projects/er_task/runtime-config
```

## 5. Test scheduler config API

```powershell
Invoke-RestMethod http://127.0.0.1:8000/scheduler-configs
```

## 6. Start scheduler

Scheduler sẽ tự lấy `SCHEDULER_API_BASE_URL` từ `.env`.

Chạy thật:

```powershell
.\.venv\Scripts\python scripts/run_scheduler.py
```

Nếu muốn override tạm thời mới cần truyền:

```powershell
.\.venv\Scripts\python scripts/run_scheduler.py --api-base-url http://127.0.0.1:8000
```

## 7. Test scheduler mà không chạy job thật

Chế độ này chỉ load job từ API rồi in ra màn hình:

```powershell
.\.venv\Scripts\python scripts/run_scheduler.py --dry-run
```

## 8. Run project thủ công

Ví dụ chạy `er_task`:

```powershell
.\.venv\Scripts\python scripts/run_project.py --project er_task --input "{\"topic\":\"emergency\"}"
```

Ví dụ chạy `legal_task`:

```powershell
.\.venv\Scripts\python scripts/run_project.py --project legal_task --input "{\"topic\":\"legal\"}"
```

## 9. Nếu dùng Ollama local

Start Ollama trước:

```powershell
ollama serve
```

Kiểm tra model:

```powershell
ollama list
```

Model mặc định hiện tại lấy từ:

- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`

trong `.env`.

## 10. Thứ tự chạy khuyến nghị

Mở terminal 1:

```powershell
.\.venv\Scripts\python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
```

Mở terminal 2:

```powershell
.\.venv\Scripts\python scripts/run_scheduler.py --dry-run
```

Khi muốn chạy scheduler thật:

```powershell
.\.venv\Scripts\python scripts/run_scheduler.py
```

## 11. Lưu ý hiện tại

- API đang dùng mock data
- scheduler đã đọc được job từ mock API
- cấu hình host API, runtime API, scheduler API, Ollama đều nên để trong `.env`
- CrewAI chạy thật có thể cần chỉnh thêm quyền ghi local cache của CrewAI trên máy bạn
