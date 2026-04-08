# Legal Projects Split

Hiện tại phần legal đã được tách thành 2 project riêng:

## 1. `legal_task`

Đây là project ingest.

Nó làm:

1. lấy source từ API
2. lấy bài mới từ trang báo
3. crawl content
4. classification
5. summary + translate nếu đủ liên quan
6. lưu vào `/processed-articles`

Chạy:

```powershell
.\.venv\Scripts\python scripts/run_project.py --project legal_task --input "{}"
```

## 2. `legal_task_report`

Đây là project report.

Nó làm:

1. gọi API `/processed-articles`
2. lấy các bài đã có `summary`
3. chỉ lấy bài `is_relevant=true`
4. chỉ lấy bài `report_generated=false`
5. chạy reporting crew
6. lưu vào `/reported-articles`
7. đánh dấu bài đã report

Chạy:

```powershell
.\.venv\Scripts\python scripts/run_project.py --project legal_task_report --input "{}"
```

## 3. Scheduler mock hiện tại

Mock scheduler config đang chia như sau:

- `legal_task`: chạy lúc `0h, 6h, 12h`
- `legal_task_report`: chạy lúc `14h`

File:
[scheduler_configs.py](d:\Project\Python\news-aggerator\src\api\mock_data\scheduler_configs.py)

## 4. Vì sao tách ra

Tách 2 project giúp:

- ingest và reporting chạy độc lập
- scheduler set lịch riêng dễ hơn
- reporting không phải chờ lúc crawl
- dễ scale và debug từng pha
