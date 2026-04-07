from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class AgentRuntimeConfig:
    agent_key: str
    role: str
    goal: str
    backstory: str
    tools: list[str] = field(default_factory=list)
    llm: str | None = None
    verbose: bool = True
    allow_delegation: bool = False
    enabled: bool = True


@dataclass(slots=True)
class TaskRuntimeConfig:
    task_key: str
    description: str
    expected_output: str
    agent_key: str
    context_task_keys: list[str] = field(default_factory=list)
    output_key: str | None = None
    enabled: bool = True


@dataclass(slots=True)
class CrewRuntimeConfig:
    crew_key: str
    process: str = "sequential"
    agent_keys: list[str] = field(default_factory=list)
    task_keys: list[str] = field(default_factory=list)
    enabled: bool = True


@dataclass(slots=True)
class ProjectRuntimeConfig:
    project_name: str
    version: str | None = None
    enabled: bool = True
    agents: list[AgentRuntimeConfig] = field(default_factory=list)
    tasks: list[TaskRuntimeConfig] = field(default_factory=list)
    crews: list[CrewRuntimeConfig] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ServiceControlCommand:
    action: str
    reason: str | None = None
    requested_by: str | None = None
    project_name: str | None = None
    hard_restart: bool = False
