# Start Server Guide

File này ghi lại các lệnh cần chạy để start server trong project hiện tại.

## 1. Cài thư viện

```powershell
pip install -r requirments.txt
```

Nếu bạn dùng virtual environment trong repo:

```powershell
.\.venv\Scripts\activate
pip install -r requirments.txt
```

## 2. Start FastAPI mock server

Server này trả về:

- runtime config mock
- scheduler config mock
- admin reset endpoint

Chạy lệnh:

```powershell
uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
```

Hoặc nếu dùng Python trong `.venv`:

```powershell
.\.venv\Scripts\python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
```

Sau khi chạy, mở:

- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/docs`

## 3. Test runtime config API

```powershell
Invoke-RestMethod http://127.0.0.1:8000/projects/legal_task/runtime-config
```

```powershell
Invoke-RestMethod http://127.0.0.1:8000/projects/er_task/runtime-config
```

## 4. Test scheduler config API

```powershell
Invoke-RestMethod http://127.0.0.1:8000/scheduler-configs
```

## 5. Start scheduler

Scheduler sẽ gọi API để lấy lịch chạy.

Chạy thật:

```powershell
python scripts/run_scheduler.py --api-base-url http://127.0.0.1:8000
```

Hoặc:

```powershell
.\.venv\Scripts\python scripts/run_scheduler.py --api-base-url http://127.0.0.1:8000
```

## 6. Test scheduler mà không chạy job thật

Chế độ này chỉ load job từ API rồi in ra màn hình:

```powershell
python scripts/run_scheduler.py --dry-run --api-base-url http://127.0.0.1:8000
```

## 7. Run project thủ công

Ví dụ chạy `er_task`:

```powershell
python scripts/run_project.py --project er_task --input "{\"topic\":\"emergency\"}"
```

Ví dụ chạy `legal_task`:

```powershell
python scripts/run_project.py --project legal_task --input "{\"topic\":\"legal\"}"
```

## 8. Nếu dùng Ollama local

Start Ollama trước, ví dụ:

```powershell
ollama serve
```

Kiểm tra model:

```powershell
ollama list
```

Nếu cần, set env:

```powershell
$env:OLLAMA_BASE_URL="http://127.0.0.1:11434"
$env:OLLAMA_MODEL="llama3.1"
```

## 9. Biến môi trường khuyến nghị

```powershell
$env:NEWS_SOURCE_API_BASE_URL="http://127.0.0.1:8000"
$env:SCHEDULER_API_BASE_URL="http://127.0.0.1:8000"
$env:RUNTIME_CONFIG_API_BASE_URL="http://127.0.0.1:8000"
$env:OLLAMA_BASE_URL="http://127.0.0.1:11434"
$env:OLLAMA_MODEL="llama3.1"
```

## 10. Thứ tự chạy khuyến nghị

Mở terminal 1:

```powershell
.\.venv\Scripts\python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
```

Mở terminal 2:

```powershell
.\.venv\Scripts\python scripts/run_scheduler.py --dry-run --api-base-url http://127.0.0.1:8000
```

Khi muốn chạy scheduler thật:

```powershell
.\.venv\Scripts\python scripts/run_scheduler.py --api-base-url http://127.0.0.1:8000
```

## 11. Lưu ý hiện tại

- API đang dùng mock data
- scheduler đã đọc được job từ mock API
- CrewAI chạy thật có thể cần chỉnh thêm quyền ghi local cache của CrewAI trên máy bạn
