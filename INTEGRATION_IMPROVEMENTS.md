# Integration-readiness improvements

- One JSON file now controls all nine class names and model metadata.
- One Python file contains only the trained architecture.
- Generic strict checkpoint loading supports common PyTorch formats.
- Automatic DataParallel prefix cleanup is included.
- Deterministic preprocessing is configuration-driven.
- Output shape is enforced as `[1, 9]`.
- Softmax and decimal probability conversion are centralized.
- A sync command generates the Node class constant from the ML configuration.
- A validator catches class-order, checkpoint, preprocessing, and output-shape mistakes before startup.
- Existing APIs and `MODEL_NOT_LOADED` behavior remain unchanged.
