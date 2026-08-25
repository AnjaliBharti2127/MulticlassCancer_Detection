"""Small, isolated adapter for the trained 9-class Patho model.

For normal integration, edit only:
- ``app/trained_model.py``: exact architecture
- ``app/model_config.json``: exact class order and preprocessing metadata

The generic checkpoint loader, preprocessing, softmax inference, API contract,
and validation remain unchanged.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Any, Mapping

from PIL import Image

_CONFIG_PATH = Path(__file__).with_name("model_config.json")


class IntegrationNotConfiguredError(RuntimeError):
    """Raised until the real architecture/configuration are supplied."""


def _load_config() -> dict[str, Any]:
    try:
        config = json.loads(_CONFIG_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise IntegrationNotConfiguredError(f"Cannot read {_CONFIG_PATH.name}: {exc}") from exc

    names = config.get("class_names")
    if not isinstance(names, list) or len(names) != 9 or not all(isinstance(x, str) and x for x in names):
        raise IntegrationNotConfiguredError("model_config.json must contain exactly 9 non-empty class_names.")
    if len(set(names)) != 9:
        raise IntegrationNotConfiguredError("model_config.json class_names must be unique.")
    return config


MODEL_CONFIG = _load_config()
CLASS_NAMES: tuple[str, ...] = tuple(MODEL_CONFIG["class_names"])
MODEL_NAME = str(MODEL_CONFIG.get("model_name", "Patho Hybrid Classifier"))
MODEL_VERSION = str(MODEL_CONFIG.get("model_version", "unconfigured"))
PREPROCESSING_VERSION = str(MODEL_CONFIG.get("preprocessing_version", "unconfigured"))
UNCERTAINTY_THRESHOLD = float(MODEL_CONFIG.get("uncertainty_threshold", 0.70))


@dataclass(frozen=True)
class InferenceOutput:
    probabilities: list[float]
    model_name: str = MODEL_NAME
    model_version: str = MODEL_VERSION
    preprocessing_version: str = PREPROCESSING_VERSION


def build_model(checkpoint_config: Mapping[str, Any] | None = None) -> Any:
    """Build the exact architecture from the single trained-model file."""
    if not bool(MODEL_CONFIG.get("configured", False)):
        raise IntegrationNotConfiguredError(
            "Set configured=true in app/model_config.json only after adding the exact architecture and preprocessing."
        )
    from app.trained_model import create_model

    try:
        return create_model(num_classes=len(CLASS_NAMES), checkpoint_config=dict(checkpoint_config or {}))
    except NotImplementedError as exc:
        raise IntegrationNotConfiguredError(str(exc)) from exc


def _extract_state_dict(checkpoint: Any) -> Mapping[str, Any]:
    """Support common PyTorch checkpoint layouts without guessing silently."""
    if not isinstance(checkpoint, Mapping):
        raise RuntimeError("Checkpoint must be a state-dict mapping or contain one.")

    for key in ("model_state", "model_state_dict", "state_dict", "model", "net", "weights"):
        value = checkpoint.get(key)
        if isinstance(value, Mapping):
            return value

    if checkpoint and all(isinstance(key, str) for key in checkpoint.keys()):
        return checkpoint
    raise RuntimeError("No supported state dict was found in the checkpoint.")


def _strip_known_prefixes(state_dict: Mapping[str, Any]) -> dict[str, Any]:
    result = dict(state_dict)
    for prefix in ("module.", "model."):
        if result and all(key.startswith(prefix) for key in result):
            result = {key[len(prefix):]: value for key, value in result.items()}
    return result


def read_checkpoint(checkpoint_path: Path, device: str) -> Mapping[str, Any]:
    """Read a trusted local training checkpoint, including saved metadata."""
    import torch

    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)
    if not isinstance(checkpoint, Mapping):
        raise RuntimeError("Checkpoint must be a mapping containing model weights.")
    return checkpoint


def validate_checkpoint_metadata(checkpoint: Mapping[str, Any]) -> None:
    """Fail fast if the checkpoint taxonomy conflicts with the application."""
    saved_classes = checkpoint.get("classes")
    if saved_classes is not None and list(saved_classes) != list(CLASS_NAMES):
        raise RuntimeError(
            "Checkpoint class order does not match app/model_config.json. "
            f"Checkpoint: {list(saved_classes)}; configured: {list(CLASS_NAMES)}"
        )
    saved_mapping = checkpoint.get("class_to_idx")
    if isinstance(saved_mapping, Mapping):
        expected = {name: index for index, name in enumerate(CLASS_NAMES)}
        normalized = {str(key): int(value) for key, value in saved_mapping.items()}
        if normalized != expected:
            raise RuntimeError(
                "Checkpoint class_to_idx does not match the configured 9-class order. "
                f"Checkpoint: {normalized}; expected: {expected}"
            )


def load_checkpoint(
    model: Any,
    checkpoint_path: Path,
    device: str,
    checkpoint: Mapping[str, Any] | None = None,
) -> Any:
    """Load a checkpoint strictly and return an eval-ready model."""
    checkpoint = checkpoint or read_checkpoint(checkpoint_path, device)
    validate_checkpoint_metadata(checkpoint)
    state_dict = _strip_known_prefixes(_extract_state_dict(checkpoint))
    incompatible = model.load_state_dict(state_dict, strict=False)
    missing = list(getattr(incompatible, "missing_keys", []))
    unexpected = list(getattr(incompatible, "unexpected_keys", []))
    if missing or unexpected:
        raise RuntimeError(
            "Checkpoint does not exactly match the architecture. "
            f"Missing keys ({len(missing)}): {missing[:12]}; "
            f"Unexpected keys ({len(unexpected)}): {unexpected[:12]}"
        )
    model.to(device)
    model.eval()
    return model


def preprocess_image(image: Image.Image, input_size: int) -> Any:
    """Apply configured deterministic validation preprocessing."""
    from torchvision import transforms

    mean = MODEL_CONFIG.get("normalization_mean")
    std = MODEL_CONFIG.get("normalization_std")
    if not (isinstance(mean, list) and isinstance(std, list) and len(mean) == len(std) == 3):
        raise IntegrationNotConfiguredError("Set three-value normalization_mean/std in model_config.json.")

    configured_size = int(MODEL_CONFIG.get("input_size", input_size))
    if configured_size != input_size:
        raise RuntimeError(
            f"MODEL_INPUT_SIZE={input_size} conflicts with model_config.json input_size={configured_size}."
        )

    transform = transforms.Compose(
        [
            transforms.Resize((configured_size, configured_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[float(v) for v in mean], std=[float(v) for v in std]),
        ]
    )
    return transform(image.convert("RGB")).unsqueeze(0)


def run_inference(model: Any, tensor: Any, device: str) -> InferenceOutput:
    """Run inference and enforce a [batch, 9] logits contract."""
    import torch

    tensor = tensor.to(device)
    with torch.inference_mode():
        output = model(tensor)
        if isinstance(output, Mapping):
            output = output.get("logits")
        elif isinstance(output, (tuple, list)):
            output = output[0]
        if not isinstance(output, torch.Tensor):
            raise RuntimeError("Model must return logits tensor, tuple/list first tensor, or {'logits': tensor}.")
        if output.ndim != 2 or output.shape[0] != 1 or output.shape[1] != len(CLASS_NAMES):
            raise RuntimeError(
                f"Expected logits shape [1, {len(CLASS_NAMES)}], got {tuple(output.shape)}."
            )
        probabilities = torch.softmax(output, dim=1)[0].detach().cpu().tolist()
    return InferenceOutput(probabilities=[float(value) for value in probabilities])


def decode_image(image_bytes: bytes) -> Image.Image:
    """Decode supported image bytes safely and normalize to RGB."""
    with Image.open(BytesIO(image_bytes)) as image:
        image.load()
        return image.convert("RGB")
