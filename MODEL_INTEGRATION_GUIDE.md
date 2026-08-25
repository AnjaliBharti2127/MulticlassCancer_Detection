# Patho 9-Class Model Integration

The project is prepared so the real model can be added without changing the API, Node backend, database, or frontend.

## You edit only two files

### 1. `ml-service/app/trained_model.py`
Copy or import the exact final Stage-2 architecture and implement:

```python
def create_model(num_classes: int):
    model = ExactPathoModel(num_classes=num_classes)
    return model
```

The returned model must produce logits shaped:

```text
[batch_size, 9]
```

### 2. `ml-service/app/model_config.json`
Replace the provisional values with the exact training values:

- `class_names`, in the exact `ImageFolder.class_to_idx` order
- `input_size`
- validation normalization mean/std
- model and preprocessing versions
- uncertainty threshold

Only after those values and the architecture are correct, change:

```json
"configured": true
```

## Put the checkpoint here

Default path:

```text
ml-service/models/patho_stage2_best.pth
```

Or set `MODEL_PATH` in the environment.

The loader already supports common checkpoint layouts:

- raw state dictionary
- `model_state_dict`
- `state_dict`
- `model`
- `net`
- `weights`
- DataParallel `module.` prefix

It rejects missing or unexpected keys instead of silently loading the wrong model.

## Keep the Node class order synchronized

After editing `model_config.json`, run:

```bash
cd ml-service
python scripts/sync_node_classes.py
```

This regenerates:

```text
server/src/constants/cancerClasses.ts
```

## Validate before starting the app

Contract-only check:

```bash
cd ml-service
python scripts/validate_model_integration.py
```

Full checkpoint and dummy-inference check:

```bash
python scripts/validate_model_integration.py --checkpoint models/patho_stage2_best.pth
```

The full check confirms:

- exactly 9 unique classes
- Node and ML class order match
- checkpoint matches architecture exactly
- preprocessing produces a valid tensor
- model output is `[1, 9]`
- softmax produces 9 probabilities

## Start the service

```bash
uvicorn app.main:app --reload
```

Check:

```text
GET /health
POST /api/v1/predict
```

Before integration, health reports `modelLoaded: false` and prediction returns `MODEL_NOT_LOADED`. After a valid model and checkpoint are supplied, startup loads them automatically.

## Important warning

The current nine names are provisional. Replace them using the exact training mapping. A wrong order can display the wrong cancer label even when the model output is mathematically correct.
