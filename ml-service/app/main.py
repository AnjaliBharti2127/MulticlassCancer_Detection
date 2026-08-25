"""FastAPI application entrypoint for the Patho ML service.

Block 5 scope: application wiring, health, and a safe prediction placeholder.
No model architecture and no checkpoint loading happen here — see
``app/services/model_service.py``.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import health, prediction
from app.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.services.model_service import ModelService

settings = get_settings()
configure_logging(settings.log_level)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown handling.

    Creates the (unloaded) ModelService, logs the selected device, and
    attaches both to app.state so routes can read them via the request.
    """

    app.state.settings = settings
    model_service = ModelService(model_path=settings.model_path, input_size=settings.model_input_size)
    model_service.load_model()
    app.state.model_service = model_service

    logger.info(
        "Starting %s v%s | device=%s | model_loaded=%s",
        settings.service_name,
        settings.service_version,
        model_service.device,
        model_service.model_loaded,
    )

    yield

    logger.info("Shutting down %s", settings.service_name)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.service_name,
        version=settings.service_version,
        lifespan=lifespan,
    )

    register_exception_handlers(app)

    # Bare paths (compatible with the existing Node service's current call
    # site) and versioned /api/v1 paths both work and behave identically.
    app.include_router(health.router)
    app.include_router(health.router, prefix="/api/v1")

    app.include_router(prediction.router)
    app.include_router(prediction.router, prefix="/api/v1")

    return app


app = create_app()
