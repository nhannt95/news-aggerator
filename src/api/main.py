from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.api.routers.admin import router as admin_router
from src.api.routers.projects import router as projects_router
from src.api.routers.runtime import router as runtime_router
from src.api.routers.scheduler import router as scheduler_router
from src.api.routers.sources import router as sources_router
from src.api.routers.storage import router as storage_router
from src.common.config.settings import settings
from src.infrastructure.api_clients.scheduler_config_api_client import (
    SchedulerConfigApiClient,
)
from src.infrastructure.scheduler.scheduler_service import SchedulerService


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: start scheduler
    client = SchedulerConfigApiClient(
        base_url=settings.resolved_scheduler_api_base_url,
        api_key=settings.scheduler_api_key,
    )
    scheduler = SchedulerService(config_client=client)
    SchedulerService.set_instance(scheduler)
    scheduler.start()

    yield

    # Shutdown: stop scheduler
    scheduler.stop()


app = FastAPI(
    title="News Aggregator Control API",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(runtime_router)
app.include_router(scheduler_router)
app.include_router(admin_router)
app.include_router(projects_router)
app.include_router(sources_router)
app.include_router(storage_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
