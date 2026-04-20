# News Aggregator Admin (news-fe)

Frontend admin panel thuần **HTML + JS + mock data** — không cần server.

## Cấu trúc

```
news-fe/
├── index.html           # Entry point (sidebar + layout)
├── js/
│   ├── mock_data.js     # Toàn bộ dữ liệu mock (raw data)
│   ├── api.js           # API client wrapper — swap thành fetch() khi có backend
│   └── app.js           # Router + render pages + modals
└── README.md
```

## Chạy

```bash
cd news-fe
start index.html
# hoặc
python -m http.server 8080
```

## Pages

Hash routing:

| URL | Page |
|---|---|
| `#dashboard` | Charts + stats tổng |
| `#project?name=legal_task&tab=agents` | Agents |
| `#project?name=legal_task&tab=tasks` | Tasks |
| `#project?name=legal_task&tab=sources` | News Sources (per project) |
| `#project?name=legal_task&tab=schedulers` | Schedulers (per project) |
| `#project?name=legal_task&tab=emails` | Email Recipients |
| `#project?name=legal_task&tab=access` | Access Control |
| `#articles` | Articles |

## Từng project có 6 tabs

1. **Agents** — CRUD agent (role, goal, backstory, LLM)
2. **Tasks** — CRUD task (description với template vars)
3. **News Sources** — CRUD nguồn tin thuộc project
4. **Schedulers** — CRUD cron jobs thuộc project
5. **Email Recipients** — Email nhận notification per task
6. **Access Control** — Ai được truy cập project

## Cách tích hợp API thật

Tất cả data access đi qua `js/api.js`. Mỗi method có comment `// TODO:` chỉ rõ endpoint thật. Ví dụ:

**Trước (mock):**
```js
async getProjects() {
    return delay(MockData.projects);
}
```

**Sau (real API):**
```js
async getProjects() {
    const r = await fetch(`${API_BASE}/runtime-configs`);
    const j = await r.json();
    return j.data;
}
```

Chỉ cần thay thân function, `app.js` và UI không đổi.

## API methods

| Method | Endpoint thật (Python backend) |
|---|---|
| `getProjects()` | `GET /runtime-configs` |
| `getProject(name)` | `GET /projects/{name}/runtime-config` |
| `getAgents(project)` | `GET /projects/{name}/agents` (cần thêm) |
| `saveAgent(project, payload, originalKey)` | `POST/PUT /projects/{name}/agents` |
| `deleteAgent(project, key)` | `DELETE /projects/{name}/agents/{key}` |
| `getTasks(project)` | `GET /projects/{name}/tasks` (cần thêm) |
| `saveTask/deleteTask` | `POST/PUT/DELETE /projects/{name}/tasks` |
| `getSources(project)` | `GET /news-sites?project_name=` |
| `saveSource/deleteSource` | `POST/PUT/DELETE /news-sites` |
| `getSchedulers(project)` | `GET /scheduler/configs?project_name=` |
| `saveScheduler/deleteScheduler` | `POST/PUT/DELETE /scheduler/configs` |
| `getEmails/addEmail/deleteEmail` | `GET/POST/DELETE /projects/{name}/email-recipients` |
| `getAccess/grantAccess/revokeAccess` | `GET/POST/DELETE /projects/{name}/access` |
| `getArticles(filters)` | `GET /processed-articles` |

## Tech stack

- HTML + vanilla JS (no framework, no build)
- TailwindCSS via CDN
- Chart.js via CDN
- Material Icons via CDN
