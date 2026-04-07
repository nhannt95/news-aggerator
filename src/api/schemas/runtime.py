from typing import Any

from pydantic import BaseModel, Field


class AgentConfigResponse(BaseModel):
    agent_key: str
    role: str
    goal: str
    backstory: str
    tools: list[str] = Field(default_factory=list)
    llm: str | None = None
    verbose: bool = True
    allow_delegation: bool = False
    enabled: bool = True


class TaskConfigResponse(BaseModel):
    task_key: str
    description: str
    expected_output: str
    agent_key: str
    context_task_keys: list[str] = Field(default_factory=list)
    output_key: str | None = None
    enabled: bool = True


class CrewConfigResponse(BaseModel):
    crew_key: str
    process: str = "sequential"
    agent_keys: list[str] = Field(default_factory=list)
    task_keys: list[str] = Field(default_factory=list)
    enabled: bool = True


class ProjectRuntimeConfigResponse(BaseModel):
    project_name: str
    version: str | None = None
    enabled: bool = True
    metadata: dict[str, Any] = Field(default_factory=dict)
    agents: list[AgentConfigResponse] = Field(default_factory=list)
    tasks: list[TaskConfigResponse] = Field(default_factory=list)
    crews: list[CrewConfigResponse] = Field(default_factory=list)
