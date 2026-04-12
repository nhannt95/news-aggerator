import os
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


def _ensure_env_keys() -> None:
    """CrewAI reads API keys from env vars directly."""
    if settings.openrouter_api_key and "OPENROUTER_API_KEY" not in os.environ:
        os.environ["OPENROUTER_API_KEY"] = settings.openrouter_api_key
    if settings.openai_api_key and "OPENAI_API_KEY" not in os.environ:
        os.environ["OPENAI_API_KEY"] = settings.openai_api_key


def _build_llm(model_name: str | None) -> object:
    """Build LLM based on model_name or default provider from settings.

    Model name conventions:
      - "openai/gpt-4o-mini"              → OpenAI
      - "openrouter/google/gemini-2.0..."  → OpenRouter
      - "ollama/llama3.2:1b"              → Ollama
      - "gpt-4o-mini"                     → OpenAI (auto-detect)
      - "llama3.2:1b"                     → uses LLM_PROVIDER from .env
    """
    _ensure_env_keys()
    _, _, LLM, _, _ = _require_crewai()
    chosen = (model_name or "").strip()

    # Explicit provider prefix
    if chosen.startswith("openai/"):
        return LLM(model=chosen, api_key=settings.openai_api_key)
    if chosen.startswith("openrouter/"):
        return LLM(
            model=chosen,
            api_key=settings.openrouter_api_key,
            base_url="https://openrouter.ai/api/v1",
        )
    if chosen.startswith("ollama/"):
        return LLM(
            model=chosen,
            base_url=settings.ollama_base_url,
            api_base=settings.ollama_base_url,
        )

    # Auto-detect by model name
    if chosen.startswith("gpt-") or chosen.startswith("o1") or chosen.startswith("o3"):
        return LLM(model=f"openai/{chosen}", api_key=settings.openai_api_key)

    # Fall back to provider setting
    if settings.llm_provider == "openai":
        model = chosen or settings.openai_model
        return LLM(model=f"openai/{model}", api_key=settings.openai_api_key)

    if settings.llm_provider == "openrouter":
        model = chosen or settings.openrouter_model
        return LLM(
            model=f"openrouter/{model}",
            api_key=settings.openrouter_api_key,
            base_url="https://openrouter.ai/api/v1",
        )

    # Default: Ollama
    model = chosen or settings.ollama_model
    if not model.startswith("ollama/"):
        model = f"ollama/{model}"
    return LLM(
        model=model,
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
            llm=_build_llm(config.llm),
        )
    return agents


def build_tasks_from_config(
    project_config: ProjectRuntimeConfig,
    crew_config: CrewRuntimeConfig,
    agents: dict[str, object],
    project_input: dict,
    output_model_by_task_key: dict[str, Any] | None = None,
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
        if output_model_by_task_key and config.task_key in output_model_by_task_key:
            task_kwargs["output_json"] = output_model_by_task_key[config.task_key]

        task = Task(**task_kwargs)
        built_tasks[task_key] = task
        ordered_tasks.append(task)

    return ordered_tasks


def build_crew_from_runtime(
    project_config: ProjectRuntimeConfig,
    crew_key: str,
    project_input: dict,
    output_model_by_task_key: dict[str, Any] | None = None,
) -> object:
    _, Crew, _, Process, _ = _require_crewai()

    crew_config = next(
        item for item in project_config.crews if item.enabled and item.crew_key == crew_key
    )
    agents = build_agents_from_config(project_config, crew_config)
    tasks = build_tasks_from_config(
        project_config,
        crew_config,
        agents,
        project_input,
        output_model_by_task_key=output_model_by_task_key,
    )

    process = Process.sequential
    if crew_config.process == "hierarchical" and hasattr(Process, "hierarchical"):
        process = Process.hierarchical

    return Crew(
        agents=list(agents.values()),
        tasks=tasks,
        process=process,
        verbose=True,
    )
