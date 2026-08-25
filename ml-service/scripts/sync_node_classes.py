"""Generate the Node 9-class constant from model_config.json."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
config = json.loads((ROOT / "app" / "model_config.json").read_text(encoding="utf-8"))
names = config["class_names"]
if len(names) != 9 or len(set(names)) != 9:
    raise SystemExit("model_config.json must contain exactly 9 unique classes")

target = ROOT.parent / "server" / "src" / "constants" / "cancerClasses.ts"
lines = [
    "/** Auto-generated from ml-service/app/model_config.json. Do not edit manually. */",
    "export const CANCER_CLASSES = [",
    *[f'  "{name}",' for name in names],
    "] as const;",
    "",
    "export type CancerClass = (typeof CANCER_CLASSES)[number];",
    "",
]
target.write_text("\n".join(lines), encoding="utf-8")
print(f"Updated {target}")
