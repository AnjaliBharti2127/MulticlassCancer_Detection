"""Validated image prediction endpoint."""
from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from PIL import UnidentifiedImageError

from app.core.errors import ModelNotLoadedError
from app.model_integration import decode_image
from app.schemas import PredictionResponse

router = APIRouter(tags=["prediction"])
_ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/tiff", "image/x-tiff"}


@router.post("/predict", response_model=PredictionResponse)
async def predict(
    request: Request,
    slideImage: UploadFile | None = File(None),
) -> PredictionResponse:
    model_service = request.app.state.model_service
    settings = request.app.state.settings
    if not model_service.model_loaded:
        raise ModelNotLoadedError(model_service.load_error or "The prediction model is not loaded.")

    if slideImage is None:
        raise HTTPException(status_code=400, detail="A slide image is required in the slideImage field.")

    content_type = (slideImage.content_type or "").lower()
    if content_type not in _ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Only JPG/JPEG, PNG, and TIFF images are supported.")

    max_bytes = int(settings.allowed_image_size_mb * 1024 * 1024)
    image_bytes = await slideImage.read(max_bytes + 1)
    if not image_bytes:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")
    if len(image_bytes) > max_bytes:
        raise HTTPException(status_code=413, detail=f"Image exceeds {settings.allowed_image_size_mb:g} MB.")

    try:
        image = decode_image(image_bytes)
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(status_code=400, detail="The uploaded image is corrupted or unsupported.")

    prediction = model_service.predict(image)
    return PredictionResponse(prediction=prediction)
