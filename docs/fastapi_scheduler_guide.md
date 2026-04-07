# FastAPI And Scheduler Guide

This guide describes how to run the current project as:

- a worker that runs CrewAI pipelines
- a scheduler that triggers projects on schedule
- a FastAPI service that exposes runtime config, scheduler config, and reset endpoints

## 1. Required Python packages

Current `requirments.txt` should include:

```txt
crawl4ai
crewai
requests
apscheduler
fastapi
uvicorn[standard]
pydantic
python-dotenv
```

## 2. What each package is for

- `crawl4ai`: crawl listing pages and article pages
- `crewai`: build agents, tasks, and crews
- `requests`: call external config APIs
- `apscheduler`: schedule project runs
- `fastapi`: build admin/config API
- `uvicorn[standard]`: run FastAPI app
- `pydantic`: validate request and response payloads
- `python-dotenv`: load `.env` values in local development

## 3. Recommended service split

You can run this system in 2 ways.

### Option A. Single app

One FastAPI service also owns:

- config endpoints
- runtime reload/reset endpoints
- APScheduler jobs
- project execution endpoints

This is simpler for small deployments.

### Option B. Split services

- FastAPI service: admin/config API
- worker service: CrewAI project execution
- scheduler service: APScheduler only

This is better for production when workloads become heavier.

For your current setup, start with Option A or a light split:

- FastAPI service for config/reset
- scheduler process for scheduled execution

## 4. Runtime architecture

Recommended flow:

1. Frontend saves `agent/task/crew/schedule` config to database
2. FastAPI reads config from database
3. Scheduler loads schedule from FastAPI
4. Scheduler triggers `run_project(project_name, input_payload)`
5. Project pipeline loads its runtime config and executes crews
6. Frontend can call reset endpoint with `reload`

## 5. API endpoints to implement in FastAPI

### 5.1 Get project runtime config

`GET /projects/{project_name}/runtime-config`

Use this for loading:

- agents
- tasks
- crews

### 5.2 Get all runtime configs

`GET /runtime-configs`

Use this if you want to preload all projects.

### 5.3 Get scheduler configs

`GET /scheduler-configs`

Use this for APScheduler job registration.

### 5.4 Runtime reset or reload

`POST /admin/runtime/reset`

Recommended payload:

```json
{
  "action": "reload",
  "reason": "frontend updated config",
  "requested_by": "admin_1",
  "project_name": "er_task",
  "hard_restart": false
}
```

### 5.5 Optional manual project execution

`POST /projects/{project_name}/run`

Recommended payload:

```json
{
  "input_payload": {
    "topic": "emergency"
  }
}
```

This endpoint is useful for:

- test run from frontend
- debug run by admin
- rerun failed project immediately

## 6. Example FastAPI structure

Recommended backend structure:

```text
src/api/
  main.py
  schemas/
    runtime.py
    scheduler.py
    admin.py
  routers/
    runtime.py
    scheduler.py
    admin.py
    projects.py
  services/
    runtime_service.py
    scheduler_service.py
```

## 7. Example FastAPI schema design

### Runtime config response

```python
from pydantic import BaseModel


class AgentConfigResponse(BaseModel):
    agent_key: str
    role: str
    goal: str
    backstory: str
    tools: list[str] = []
    llm: str | None = None
    verbose: bool = True
    allow_delegation: bool = False
    enabled: bool = True


class TaskConfigResponse(BaseModel):
    task_key: str
    description: str
    expected_output: str
    agent_key: str
    context_task_keys: list[str] = []
    output_key: str | None = None
    enabled: bool = True


class CrewConfigResponse(BaseModel):
    crew_key: str
    process: str = "sequential"
    agent_keys: list[str] = []
    task_keys: list[str] = []
    enabled: bool = True
```

### Scheduler config response

```python
from pydantic import BaseModel, Field


class SchedulerJobResponse(BaseModel):
    job_id: str
    project_name: str
    trigger_type: str = "cron"
    trigger_args: dict = Field(default_factory=dict)
    input_payload: dict = Field(default_factory=dict)
    enabled: bool = True
    timezone: str = "Asia/Ho_Chi_Minh"
```

### Reset request

```python
from pydantic import BaseModel


class RuntimeResetRequest(BaseModel):
    action: str
    reason: str | None = None
    requested_by: str | None = None
    project_name: str | None = None
    hard_restart: bool = False
```

## 8. Example FastAPI implementation skeleton

```python
from fastapi import FastAPI

app = FastAPI(title="News Aggregator Control API")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/projects/{project_name}/runtime-config")
def get_project_runtime_config(project_name: str) -> dict:
    # Load from database here
    return {
        "project_name": project_name,
        "enabled": True,
        "agents": [],
        "tasks": [],
        "crews": [],
    }


@app.get("/scheduler-configs")
def get_scheduler_configs() -> dict:
    # Load scheduler jobs from database here
    return {"data": []}


@app.post("/admin/runtime/reset")
def reset_runtime(payload: dict) -> dict:
    # Trigger reload or process-manager restart here
    return {
        "status": "accepted",
        "action": payload.get("action"),
    }
```

## 9. How scheduler should work

Current local scheduler code is here:

- `src/infrastructure/scheduler/scheduler_service.py`
- `scripts/run_scheduler.py`

Recommended scheduler behavior:

1. At process start, call `GET /scheduler-configs`
2. Register APScheduler jobs
3. Each job calls `run_project(project_name, project_input)`
4. When frontend changes schedule:
   call `POST /admin/runtime/reset` with `action=reload`
5. Scheduler reloads jobs from API

## 10. Reload vs restart

Use `reload` by default.

### Reload

Reload means:

- refetch runtime config
- refetch scheduler config
- rebuild in-memory jobs
- do not kill the process

Use this when:

- frontend edits agents
- frontend edits tasks
- frontend edits crews
- frontend edits schedule

### Restart

Restart means:

- process exits and is started again by Docker, Supervisor, NSSM, PM2, systemd, or another process manager

Use this only when:

- environment variables changed
- dependency or startup config changed
- process is unhealthy

## 11. Recommended backend database tables

Suggested tables:

- `projects`
- `project_agents`
- `project_tasks`
- `project_crews`
- `scheduler_jobs`

Possible fields:

- `projects`: `project_name`, `version`, `enabled`
- `project_agents`: `project_name`, `agent_key`, `role`, `goal`, `backstory`, `llm`, `enabled`
- `project_tasks`: `project_name`, `task_key`, `description`, `expected_output`, `agent_key`, `output_key`, `enabled`
- `project_crews`: `project_name`, `crew_key`, `process`, `enabled`
- `scheduler_jobs`: `job_id`, `project_name`, `trigger_type`, `trigger_args_json`, `input_payload_json`, `enabled`, `timezone`

## 12. Suggested run commands

Install packages:

```bash
pip install -r requirments.txt
```

Run scheduler:

```bash
python scripts/run_scheduler.py
```

Run project manually:

```bash
python scripts/run_project.py --project er_task --input "{\"topic\":\"emergency\"}"
```

Run FastAPI:

```bash
uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```

## 13. Environment variables

Recommended `.env`:

```env
NEWS_SOURCE_API_BASE_URL=http://localhost:8000
NEWS_SOURCE_API_KEY=
SCHEDULER_API_BASE_URL=http://localhost:8000
SCHEDULER_API_KEY=
RUNTIME_CONFIG_API_BASE_URL=http://localhost:8000
RUNTIME_CONFIG_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

## 14. Recommendation for your case

For your frontend-driven system:

1. Store all `agent`, `task`, `crew`, and `scheduler` configs in database
2. Build FastAPI admin/config service on top of that database
3. Let frontend edit those records
4. Frontend calls `POST /admin/runtime/reset` with `reload`
5. Worker and scheduler refresh configs without full restart

This keeps the system easier to operate than restarting the whole service after every config change.
