"""Central exception handling.

Every error response — expected or unexpected — is normalized to the same
envelope:

    {"success": false, "error": {"code": "...", "message": "..."}}

Internal details (stack traces, exception messages from unexpected bugs)
are never sent to the client; they are logged instead.
"""

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_logger

logger = get_logger(__name__)


class ModelNotLoadedError(Exception):
    """Raised when a prediction is requested before a model is loaded."""


def _error_body(code: str, message: str) -> dict:
    return {"success": False, "error": {"code": code, "message": message}}


def register_exception_handlers(app: FastAPI) -> None:
    """Attach all central exception handlers to the FastAPI app."""

    @app.exception_handler(ModelNotLoadedError)
    async def model_not_loaded_handler(
        request: Request, exc: ModelNotLoadedError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=_error_body(
                "MODEL_NOT_LOADED",
                "The prediction model is not loaded.",
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        logger.warning("Request validation failed: %s", exc.errors())
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_error_body(
                "VALIDATION_ERROR",
                "The request could not be validated.",
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        # Covers explicit HTTPException(...) raises as well as framework
        # errors such as unmatched routes (404) and method mismatches (405).
        code = "NOT_FOUND" if exc.status_code == status.HTTP_404_NOT_FOUND else "HTTP_ERROR"
        message = exc.detail if isinstance(exc.detail, str) else "Request failed."
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(code, message),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        # Log full detail server-side only; never leak it to the client.
        logger.exception("Unhandled exception while processing %s", request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_body(
                "INTERNAL_ERROR",
                "An unexpected error occurred.",
            ),
        )
