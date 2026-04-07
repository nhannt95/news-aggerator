# Runtime Config And Scheduler API Contracts

This document defines the backend API contracts that the Python app expects.

## 1. Project Runtime Config API

Use this API when `agent`, `task`, and `crew` definitions are stored in the database and loaded dynamically at runtime.

### Endpoint

`GET /projects/{project_name}/runtime-config`

### Example response

```json
{
  "project_name": "er_task",
  "version": "2026-04-07.1",
  "enabled": true,
  "metadata": {
    "description": "ER monitoring workflow",
    "owner": "ops-team"
  },
  "agents": [
    {
      "agent_key": "classifier",
      "role": "ER News Classifier",
      "goal": "Classify ER articles by urgency, impact, and incident type.",
      "backstory": "Screens emergency-response news for downstream workflows.",
      "tools": ["latest_news_link_crawler"],
      "llm": "gpt-4o-mini",
      "verbose": true,
      "allow_delegation": false,
      "enabled": true
    },
    {
      "agent_key": "reporter",
      "role": "ER Report Writer",
      "goal": "Write concise operational reports.",
      "backstory": "Converts classified ER findings into report-ready output.",
      "tools": [],
      "llm": "gpt-4o-mini",
      "verbose": true,
      "allow_delegation": false,
      "enabled": true
    }
  ],
  "tasks": [
    {
      "task_key": "classify_articles",
      "description": "Classify crawled ER articles by urgency and severity.",
      "expected_output": "A structured classified list of ER articles.",
      "agent_key": "classifier",
      "context_task_keys": [],
      "output_key": "classification_result",
      "enabled": true
    },
    {
      "task_key": "write_report",
      "description": "Write the final ER report from classified articles.",
      "expected_output": "A concise ER report for operations teams.",
      "agent_key": "reporter",
      "context_task_keys": ["classify_articles"],
      "output_key": "report_result",
      "enabled": true
    }
  ],
  "crews": [
    {
      "crew_key": "classification",
      "process": "sequential",
      "agent_keys": ["classifier"],
      "task_keys": ["classify_articles"],
      "enabled": true
    },
    {
      "crew_key": "reporting",
      "process": "sequential",
      "agent_keys": ["reporter"],
      "task_keys": ["write_report"],
      "enabled": true
    }
  ]
}
```

### Notes

- `project_name` must match your local project folder name such as `legal_task` or `er_task`.
- `agent_key`, `task_key`, and `crew_key` must be unique within a project.
- `context_task_keys` lists upstream tasks whose output should be injected before running the current task.
- Prefer storing prompts and task templates in DB if frontend will edit them.

## 2. Get All Runtime Configs

### Endpoint

`GET /runtime-configs`

### Example response

```json
{
  "data": [
    {
      "project_name": "legal_task",
      "version": "2026-04-07.1",
      "enabled": true,
      "agents": [],
      "tasks": [],
      "crews": []
    },
    {
      "project_name": "er_task",
      "version": "2026-04-07.1",
      "enabled": true,
      "agents": [],
      "tasks": [],
      "crews": []
    }
  ]
}
```

## 3. Scheduler Config API

### Endpoint

`GET /scheduler-configs`

### Example response

```json
{
  "data": [
    {
      "job_id": "er_task_every_15m",
      "project_name": "er_task",
      "trigger_type": "cron",
      "trigger_args": {
        "minute": "*/15"
      },
      "input_payload": {
        "topic": "emergency"
      },
      "enabled": true,
      "timezone": "Asia/Ho_Chi_Minh"
    },
    {
      "job_id": "legal_task_6am",
      "project_name": "legal_task",
      "trigger_type": "cron",
      "trigger_args": {
        "hour": 6,
        "minute": 0
      },
      "input_payload": {
        "topic": "legal"
      },
      "enabled": true,
      "timezone": "Asia/Ho_Chi_Minh"
    }
  ]
}
```

### Supported trigger types

- `cron`
- `interval`

### Example `interval`

```json
{
  "job_id": "er_task_every_10m",
  "project_name": "er_task",
  "trigger_type": "interval",
  "trigger_args": {
    "minutes": 10
  },
  "input_payload": {},
  "enabled": true,
  "timezone": "Asia/Ho_Chi_Minh"
}
```

## 4. Runtime Reset API

This should be triggered by frontend when an admin presses reset or publish.

Recommended behavior:

- Use `reload` for config refresh without killing the process
- Use `restart` only when process-level reboot is required

### Endpoint

`POST /admin/runtime/reset`

### Example request

```json
{
  "action": "reload",
  "reason": "frontend updated task and agent definitions",
  "requested_by": "admin_user_1",
  "project_name": "er_task",
  "hard_restart": false
}
```

### Example response

```json
{
  "status": "accepted",
  "action": "reload",
  "message": "Runtime reload scheduled"
}
```

### Restart response example

```json
{
  "status": "accepted",
  "action": "restart",
  "message": "Process restart delegated to process manager"
}
```

## 5. Recommendation

Do not restart the whole service every time frontend changes an agent or task.

Preferred order:

1. Save config to database
2. Frontend calls reset API with `action=reload`
3. Backend refreshes in-memory project config
4. Scheduler and next runs use the new config

Only do full restart if:

- dependency wiring changed
- environment variables changed
- worker got into broken state
