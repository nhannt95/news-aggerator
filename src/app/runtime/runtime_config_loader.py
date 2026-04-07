from src.common.models.runtime_config import (
    AgentRuntimeConfig,
    CrewRuntimeConfig,
    ProjectRuntimeConfig,
    TaskRuntimeConfig,
)


def parse_project_runtime_config(payload: dict) -> ProjectRuntimeConfig:
    return ProjectRuntimeConfig(
        project_name=payload["project_name"],
        version=payload.get("version"),
        enabled=payload.get("enabled", True),
        agents=[
            AgentRuntimeConfig(
                agent_key=item["agent_key"],
                role=item["role"],
                goal=item["goal"],
                backstory=item["backstory"],
                tools=item.get("tools", []),
                llm=item.get("llm"),
                verbose=item.get("verbose", True),
                allow_delegation=item.get("allow_delegation", False),
                enabled=item.get("enabled", True),
            )
            for item in payload.get("agents", [])
        ],
        tasks=[
            TaskRuntimeConfig(
                task_key=item["task_key"],
                description=item["description"],
                expected_output=item["expected_output"],
                agent_key=item["agent_key"],
                context_task_keys=item.get("context_task_keys", []),
                output_key=item.get("output_key"),
                enabled=item.get("enabled", True),
            )
            for item in payload.get("tasks", [])
        ],
        crews=[
            CrewRuntimeConfig(
                crew_key=item["crew_key"],
                process=item.get("process", "sequential"),
                agent_keys=item.get("agent_keys", []),
                task_keys=item.get("task_keys", []),
                enabled=item.get("enabled", True),
            )
            for item in payload.get("crews", [])
        ],
        metadata=payload.get("metadata", {}),
    )
