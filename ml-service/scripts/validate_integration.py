"""Validate the 9-class integration before starting the full application."""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.model_integration import CLASS_NAMES, MODEL_CONFIG, build_model, load_checkpoint, preprocess_image, read_checkpoint, run_inference


def _node_classes(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"CANCER_CLASSES\s*=\s*\[(.*?)\]\s*as const", text, re.S)
    if not match:
        raise RuntimeError(f"Could not parse CANCER_CLASSES from {path}")
    return re.findall(r'["\']([^"\']+)["\']', match.group(1))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=Path)
    parser.add_argument(
        "--node-classes",
        type=Path,
        default=ROOT.parent / "server" / "src" / "constants" / "cancerClasses.ts",
    )
    args = parser.parse_args()

    print(f"PASS: ML class count = {len(CLASS_NAMES)}")
    if len(CLASS_NAMES) != 9:
        raise RuntimeError("Patho requires exactly 9 classes.")

    node_names = _node_classes(args.node_classes)
    if node_names != list(CLASS_NAMES):
        raise RuntimeError(
            "Node and ML class order differ.\n"
            f"ML:   {list(CLASS_NAMES)}\nNode: {node_names}"
        )
    print("PASS: Node and ML class order match exactly")

    if not args.checkpoint:
        print("INFO: no checkpoint supplied; contract-only validation complete")
        return 0

    if not bool(MODEL_CONFIG.get("configured", False)):
        raise RuntimeError("Set configured=true in app/model_config.json after inserting the exact model.")

    device = "cpu"
    checkpoint = read_checkpoint(args.checkpoint, device)
    checkpoint_config = checkpoint.get("config") if isinstance(checkpoint, dict) else None
    model = build_model(checkpoint_config=checkpoint_config)
    model = load_checkpoint(model, args.checkpoint, device, checkpoint=checkpoint)
    dummy = Image.new("RGB", (int(MODEL_CONFIG["input_size"]), int(MODEL_CONFIG["input_size"])))
    tensor = preprocess_image(dummy, int(MODEL_CONFIG["input_size"]))
    output = run_inference(model, tensor, device)
    if len(output.probabilities) != 9:
        raise RuntimeError("Inference did not return 9 probabilities.")
    print("PASS: checkpoint loads and dummy inference returns 9 probabilities")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
