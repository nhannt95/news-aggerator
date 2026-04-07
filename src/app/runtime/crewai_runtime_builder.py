from typing import Any

from src.common.config.settings import settings
from src.common.models.runtime_config import (
    CrewRuntimeConfig,
    ProjectRuntimeConfig,
    TaskRuntimeConfig,
)


def _require_crewai() -> tuple[Any, Any, Any, Any, Any]:
    try:
        from crewai import Agent, Crew, LLM, Process, Task
    except ImportError as exc:  # pragma: no cover
        raise ImportError("crewai is not installed.") from exc
    return Agent, Crew, LLM, Process, Task


def _normalize_ollama_model(model_name: str | None) -> str:
    chosen_model = (model_name or settings.ollama_model).strip()
    if chosen_model.startswith("ollama/"):
        return chosen_model
    return f"ollama/{chosen_model}"


def _build_ollama_llm(model_name: str | None) -> object:
    _, _, LLM, _, _ = _require_crewai()
    normalized_model = _normalize_ollama_model(model_name)
    return LLM(
        model=normalized_model,
        base_url=settings.ollama_base_url,
        api_base=settings.ollama_base_url,
    )


def build_agents_from_config(
    project_config: ProjectRuntimeConfig,
    crew_config: CrewRuntimeConfig,
) -> dict[str, object]:
    Agent, _, _, _, _ = _require_crewai()

    enabled_agents = {
        item.agent_key: item
        for item in project_config.agents
        if item.enabled and item.agent_key in crew_config.agent_keys
    }

    agents: dict[str, object] = {}
    for agent_key in crew_config.agent_keys:
        config = enabled_agents[agent_key]
        agents[agent_key] = Agent(
            role=config.role,
            goal=config.goal,
            backstory=config.backstory,
            verbose=config.verbose,
            allow_delegation=config.allow_delegation,
            llm=_build_ollama_llm(config.llm),
        )
    return agents


def build_tasks_from_config(
    project_config: ProjectRuntimeConfig,
    crew_config: CrewRuntimeConfig,
    agents: dict[str, object],
    project_input: dict,
) -> list[object]:
    _, _, _, _, Task = _require_crewai()

    task_configs: dict[str, TaskRuntimeConfig] = {
        item.task_key: item
        for item in project_config.tasks
        if item.enabled and item.task_key in crew_config.task_keys
    }

    built_tasks: dict[str, object] = {}
    ordered_tasks: list[object] = []

    for task_key in crew_config.task_keys:
        config = task_configs[task_key]
        context_tasks = [
            built_tasks[context_key]
            for context_key in config.context_task_keys
            if context_key in built_tasks
        ]

        task_kwargs = {
            "description": config.description,
            "expected_output": config.expected_output,
            "agent": agents[config.agent_key],
        }
        if context_tasks:
            task_kwargs["context"] = context_tasks

        task = Task(**task_kwargs)
        built_tasks[task_key] = task
        ordered_tasks.append(task)

    return ordered_tasks


def build_crew_from_runtime(
    project_config: ProjectRuntimeConfig,
    crew_key: str,
    project_input: dict,
) -> object:
    _, Crew, _, Process, _ = _require_crewai()

    crew_config = next(
        item for item in project_config.crews if item.enabled and item.crew_key == crew_key
    )
    agents = build_agents_from_config(project_config, crew_config)
    tasks = build_tasks_from_config(project_config, crew_config, agents, project_input)

    process = Process.sequential
    if crew_config.process == "hierarchical" and hasattr(Process, "hierarchical"):
        process = Process.hierarchical

    return Crew(
        agents=list(agents.values()),
        tasks=tasks,
        process=process,
        verbose=True,
    )
