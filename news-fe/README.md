# News Aggregator — Frontend + PHP API

Frontend **HTML + JS** + PHP REST API, kết nối MySQL.

## Cấu trúc

```
news-fe/
├── index.html           # Admin panel (quản lý projects, agents, tasks, sources…)
├── user.html            # News feed (xem bài viết VI/EN/KR)
├── js/
│   ├── api.js           # API client — tất cả fetch calls
│   └── app.js           # Admin: router + render + modals
├── api/
│   ├── index.php        # REST router (PHP 5.6+, MySQL via PDO)
│   └── db.php           # Kết nối DB (đọc env vars)
└── README.md
```

---

## Chạy với WAMP (khuyên dùng trên Windows)

WAMP cung cấp Apache + PHP + MySQL đóng gói sẵn, không cần cấu hình thêm.

### Bước 1 — Tạo symlink vào thư mục www

Mở **Command Prompt với quyền Admin**, chạy:

```cmd
mklink /D C:\wamp64\www\news-aggregator D:\Project\Python\news-aggerator\news-fe
```

> Nếu WAMP cài ở `C:\wamp` thay vì `C:\wamp64`, đổi đường dẫn cho phù hợp.
> Symlink giúp chỉnh code ở vị trí gốc mà không cần copy lại mỗi lần.

### Bước 2 — Khởi động WAMP

- Click icon WAMP ở system tray → **Start All Services**
- Đợi icon chuyển sang **màu xanh lá**

### Bước 3 — Mở trình duyệt

```
http://localhost/news-aggregator/
```

API sẽ tự động phục vụ tại:

```
http://localhost/news-aggregator/api/index.php?path=projects
```

### DB mặc định của WAMP

WAMP dùng `root` không có password — **khớp với mặc định của `db.php`**, không cần cấu hình gì thêm:

| Biến | Mặc định dùng cho WAMP |
|---|---|
| `DB_HOST` | `localhost` |
| `DB_PORT` | `3306` |
| `DB_NAME` | `news_aggregator` |
| `DB_USER` | `root` |
| `DB_PASS` | _(rỗng)_ |

Nếu WAMP của bạn có password khác, mở file `api/db.php` và sửa trực tiếp dòng:

```php
$pass = getenv('DB_PASS') ? getenv('DB_PASS') : 'your_password_here';
```

---

## Chạy PHP built-in server (không cần WAMP)

```bash
cd D:\Project\Python\news-aggerator\news-fe
php -S localhost:8080
```

Hoặc chạy từ bất kỳ đâu với flag `-t`:

```bash
php -S localhost:8080 -t D:\Project\Python\news-aggerator\news-fe
```

Mở trình duyệt: http://localhost:8080

PHP built-in server tự phục vụ cả file tĩnh (HTML/JS/CSS) lẫn PHP API — không cần cấu hình gì thêm.

> Chỉ phục vụ 1 request tại một thời điểm, không phù hợp production.

---

## Cấu hình Database

DB connection đọc từ environment variables (mặc định `localhost:3306`, db `news_aggregator`, user `root`):

| Biến | Mặc định | Mô tả |
|---|---|---|
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_NAME` | `news_aggregator` | Tên database |
| `DB_USER` | `root` | Username |
| `DB_PASS` | _(rỗng)_ | Password |

**Truyền env vars khi chạy:**

```bash
DB_HOST=127.0.0.1 DB_USER=myuser DB_PASS=mypass php -S localhost:8080
```

Hoặc set trước trong shell:

```bash
export DB_HOST=127.0.0.1
export DB_USER=myuser
export DB_PASS=mypass
php -S localhost:8080
```

---

## Setup Database

**Lần đầu** (tạo schema từ đầu):

```bash
mysql -u root -p < ../database/schema.sql
```

**Nếu DB đã có dữ liệu** (chạy migration thêm `project_id`):

```bash
mysql -u root -p news_aggregator < ../database/migration_add_project_id.sql
```

---

## API Endpoints

Base: `GET /api/index.php?path={route}`

### Projects

| Method | Path | Mô tả |
|---|---|---|
| GET | `projects` | Danh sách tất cả project |
| GET | `projects/{name}` | Chi tiết 1 project (kèm agents, tasks) |
| POST | `projects` | Tạo project mới |
| PUT | `projects/{name}` | Cập nhật project |
| DELETE | `projects/{name}` | Xóa project |

### Agents / Tasks / Schedulers / News Sites

| Method | Path | Mô tả |
|---|---|---|
| GET/POST | `projects/{name}/agents` | List / tạo agent |
| PUT/DELETE | `projects/{name}/agents/{key}` | Sửa / xóa agent |
| GET/POST | `projects/{name}/tasks` | List / tạo task |
| PUT/DELETE | `projects/{name}/tasks/{key}` | Sửa / xóa task |
| GET/POST | `scheduler/configs` | List / tạo scheduler |
| PUT/DELETE | `scheduler/configs/{job_id}` | Sửa / xóa scheduler |
| GET/POST | `news-sites` | List / tạo source |
| PUT/DELETE | `news-sites/{site_id}` | Sửa / xóa source |

### Email Recipients / Access Control

| Method | Path | Mô tả |
|---|---|---|
| GET/POST | `projects/{name}/email-recipients` | List / thêm recipient |
| DELETE | `projects/{name}/email-recipients/{id}` | Xóa recipient |
| GET/POST | `projects/{name}/access` | List / thêm access (Knox ID) |
| DELETE | `projects/{name}/access/{id}` | Thu hồi access |

### Articles

| Method | Path | Query params | Mô tả |
|---|---|---|---|
| GET | `articles` | `project_name`, `status`, `is_relevant`, `limit` | Danh sách bài viết |
| POST | `articles` | — | Thêm bài viết thủ công |
| PUT | `articles/{id}` | — | Duyệt / từ chối bài viết |
| DELETE | `articles/{id}` | — | Xóa bài viết |

### Logs

| Method | Path | Mô tả |
|---|---|---|
| GET | `projects/{name}/logs` | Danh sách agent run logs |
| POST | `projects/{name}/logs` | Tạo log |

---

## Hash routing (Admin)

| URL | Trang |
|---|---|
| `#dashboard` | Charts + stats tổng quan |
| `#projects` | Danh sách project + manage modal |
| `#admin-users` | Quản lý users |

Trong modal Manage Project có 8 tabs:

| Tab | Chức năng |
|---|---|
| Agents | CRUD agent CrewAI |
| Tasks | CRUD task CrewAI |
| Sources | Nguồn tin của project |
| Schedulers | Cron jobs (tự sinh job_id) |
| Emails | Knox ID nhận notification |
| Access | Knox ID được phép truy cập |
| Articles | Bài viết đã crawl — duyệt thủ công nếu `require_approval=true` |
| Logs | Agent run logs |

---

## Tech stack

- HTML + vanilla JS (no framework, no build step)
- TailwindCSS via CDN
- Chart.js via CDN
- Material Icons via CDN
- PHP 5.6+ / PDO MySQL
- MySQL 8.x, utf8mb4
