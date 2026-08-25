"""Model lifecycle and inference orchestration."""
from __future__ import annotations

import math
import time
from pathlib import Path
from typing import Any

from app.core.errors import ModelNotLoadedError
from app.core.logging import get_logger
from app.model_integration import (
    CLASS_NAMES,
    UNCERTAINTY_THRESHOLD,
    IntegrationNotConfiguredError,
    build_model,
    load_checkpoint,
    read_checkpoint,
    preprocess_image,
    run_inference,
)

logger = get_logger(__name__)


class ModelService:
    def __init__(self, model_path: str, input_size: int = 224) -> None:
        self.model_path = Path(model_path)
        self.input_size = input_size
        self.model_loaded = False
        self.device = self._select_device()
        self._model: Any = None
        self.load_error: str | None = None

    @staticmethod
    def _select_device() -> str:
        try:
            import torch
            return "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            logger.warning("Could not query CUDA availability; defaulting to CPU.")
            return "cpu"

    def load_model(self) -> None:
        """Attempt startup loading without preventing the service from booting."""
        self.model_loaded = False
        self.load_error = None
        if not self.model_path.is_file():
            self.load_error = f"Checkpoint not found: {self.model_path}"
            logger.warning(self.load_error)
            return
        try:
            checkpoint = read_checkpoint(self.model_path, self.device)
            checkpoint_config = checkpoint.get("config") if isinstance(checkpoint, dict) else None
            model = build_model(checkpoint_config=checkpoint_config)
            self._model = load_checkpoint(
                model, self.model_path, self.device, checkpoint=checkpoint
            )
            if hasattr(self._model, "eval"):
                self._model.eval()
            self.model_loaded = True
            logger.info("Model loaded from %s on %s", self.model_path, self.device)
        except IntegrationNotConfiguredError as exc:
            self.load_error = str(exc)
            logger.warning("Model integration is not configured: %s", exc)
        except Exception as exc:
            self.load_error = f"Model loading failed: {exc}"
            logger.exception(self.load_error)

    def predict(self, image: Any) -> dict[str, Any]:
        if not self.model_loaded or self._model is None:
            raise ModelNotLoadedError(self.load_error or "The prediction model is not loaded.")

        started = time.perf_counter()
        tensor = preprocess_image(image, self.input_size)
        output = run_inference(self._model, tensor, self.device)
        probabilities = [float(value) for value in output.probabilities]

        if len(probabilities) != len(CLASS_NAMES):
            raise RuntimeError(f"Expected {len(CLASS_NAMES)} probabilities, got {len(probabilities)}")
        if any(not math.isfinite(value) or value < 0 or value > 1 for value in probabilities):
            raise RuntimeError("Model probabilities must be finite decimal values in [0, 1]")
        total = sum(probabilities)
        if not 0.99 <= total <= 1.01:
            raise RuntimeError(f"Model probabilities must sum to 1; got {total:.6f}")

        predicted_index = max(range(len(probabilities)), key=probabilities.__getitem__)
        confidence = probabilities[predicted_index]
        uncertain = confidence < UNCERTAINTY_THRESHOLD
        duration_ms = round((time.perf_counter() - started) * 1000)

        return {
            "predictedClass": CLASS_NAMES[predicted_index],
            "predictedIndex": predicted_index,
            "confidence": confidence,
            "uncertain": uncertain,
            "warning": "Low-confidence result; specialist review is required." if uncertain else None,
            "probabilities": [
                {"className": name, "classIndex": index, "probability": probabilities[index]}
                for index, name in enumerate(CLASS_NAMES)
            ],
            "modelName": output.model_name,
            "modelVersion": output.model_version,
            "preprocessingVersion": output.preprocessing_version,
            "inferenceDurationMs": duration_ms,
        }
