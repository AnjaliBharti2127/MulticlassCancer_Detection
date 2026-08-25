"""Health check route.

Registered twice by ``app.main`` — once at ``/health`` and once at
``/api/v1/health`` — so both the bare path and the versioned path work.
"""

from fastapi import APIRouter, Request

from app.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check(request: Request) -> HealthResponse:
    settings = request.app.state.settings
    model_service = request.app.state.model_service

    return HealthResponse(
        status="healthy",
        service=settings.service_name,
        version=settings.service_version,
        modelLoaded=model_service.model_loaded,
    )
