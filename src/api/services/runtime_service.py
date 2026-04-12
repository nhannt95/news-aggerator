from src.infrastructure.db.mysql_client import fetch_all, fetch_one


class RuntimeConfigService:
    def get_project_runtime_config(self, project_name: str) -> dict | None:
        project = fetch_one(
            "SELECT * FROM na_project_runtime_configs WHERE project_name = %s",
            (project_name,),
        )
        if not project:
            return None

        agents = fetch_all(
            "SELECT * FROM na_agent_configs WHERE project_name = %s", (project_name,)
        )
        tasks = fetch_all(
            "SELECT * FROM na_task_configs WHERE project_name = %s", (project_name,)
        )
        crews = fetch_all(
            "SELECT * FROM na_crew_configs WHERE project_name = %s", (project_name,)
        )

        return {
            "project_name": project["project_name"],
            "version": project.get("version"),
            "enabled": bool(project.get("enabled", True)),
            "metadata": project.get("metadata") or {},
            "agents": [
                {
                    "agent_key": a["agent_key"],
                    "role": a["role"],
                    "goal": a["goal"],
                    "backstory": a["backstory"],
                    "tools": a.get("tools") or [],
                    "llm": a.get("llm"),
                    "verbose": bool(a.get("verbose", True)),
                    "allow_delegation": bool(a.get("allow_delegation", False)),
                    "enabled": bool(a.get("enabled", True)),
                }
                for a in agents
            ],
            "tasks": [
                {
                    "task_key": t["task_key"],
                    "description": t["description"],
                    "expected_output": t["expected_output"],
                    "agent_key": t["agent_key"],
                    "context_task_keys": t.get("context_task_keys") or [],
                    "output_key": t.get("output_key"),
                    "enabled": bool(t.get("enabled", True)),
                }
                for t in tasks
            ],
            "crews": [
                {
                    "crew_key": c["crew_key"],
                    "process": c.get("process", "sequential"),
                    "agent_keys": c.get("agent_keys") or [],
                    "task_keys": c.get("task_keys") or [],
                    "enabled": bool(c.get("enabled", True)),
                }
                for c in crews
            ],
        }

    def get_all_project_runtime_configs(self) -> list[dict]:
        projects = fetch_all("SELECT project_name FROM na_project_runtime_configs")
        result = []
        for p in projects:
            config = self.get_project_runtime_config(p["project_name"])
            if config:
                result.append(config)
        return result
