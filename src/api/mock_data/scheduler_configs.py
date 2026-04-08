MOCK_SCHEDULER_CONFIGS = [
    {
        "job_id": "er_task_every_15m",
        "project_name": "er_task",
        "trigger_type": "cron",
        "trigger_args": {"minute": "*/15"},
        "input_payload": {"topic": "emergency"},
        "enabled": True,
        "timezone": "Asia/Ho_Chi_Minh",
    },
    {
        "job_id": "legal_task_ingest",
        "project_name": "legal_task",
        "trigger_type": "cron",
        "trigger_args": {"hour": "0,6,12", "minute": 0},
        "input_payload": {},
        "enabled": True,
        "timezone": "Asia/Ho_Chi_Minh",
    },
    {
        "job_id": "legal_task_report_14h",
        "project_name": "legal_task_report",
        "trigger_type": "cron",
        "trigger_args": {"hour": 14, "minute": 0},
        "input_payload": {},
        "enabled": True,
        "timezone": "Asia/Ho_Chi_Minh",
    },
]
