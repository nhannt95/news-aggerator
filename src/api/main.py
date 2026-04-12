from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.api.routers.accepted import router as accepted_router
from src.api.routers.admin import router as admin_router
from src.api.routers.projects import router as projects_router
from src.api.routers.runtime import router as runtime_router
from src.api.routers.scheduler import router as scheduler_router
from src.api.routers.sources import router as sources_router
from src.api.routers.storage import router as storage_router
from src.infrastructure.db.init_db import init_db
from src.infrastructure.scheduler.scheduler_service import SchedulerService


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: init database
    init_db()

    # Startup: start scheduler (reads directly from DB)
    scheduler = SchedulerService()
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
app.include_router(accepted_router)
app.include_router(projects_router)
app.include_router(sources_router)
app.include_router(storage_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
